/**
 * AdminSubmissionsList
 * Shows submitted and rejected submissions for a block.
 * One row per student (latest). "Review" only available for submitted ones.
 * "Withdraw Feedback" for finalized reviews (approved / rejected).
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  Button, Badge, Spinner, ModalDialog, ActionRow, Form,
} from '@openedx/paragon';
import { Search } from '@openedx/paragon/icons';
import { adminSubmissionsApi } from '../../services/api';
import { useTasStore } from '../../store/tasStore';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';

interface Props {
  onView: (submissionId: string) => void;
}

const FEEDBACK_BADGE: Record<string, string> = {
  pending: 'secondary',
  approved: 'success',
  rejected: 'danger',
};

const STATUS_BADGE: Record<string, string> = {
  submitted: 'primary',
  rejected: 'danger',
};

const FINALIZED_FEEDBACK = new Set(['approved', 'rejected']);

const WITHDRAW_ERROR_FALLBACK = 'Failed to withdraw feedback. Please try again.';

/** URL keys for submission list filters (do not touch course_id / student_id or sort_*). */
const FILTER_PARAM_KEYS = [
  'college',
  'university',
  'partner',
  'email',
  'submitted_after',
  'submitted_before',
] as const;

type SortBy = 'submitted_at' | 'resubmission_count';
type SortDir = 'asc' | 'desc';

const DEFAULT_SORT_BY: SortBy = 'submitted_at';
const DEFAULT_SORT_DIR: SortDir = 'desc';

function parseSortBy(value: string | null): SortBy {
  return value === 'resubmission_count' ? 'resubmission_count' : DEFAULT_SORT_BY;
}

function parseSortDir(value: string | null): SortDir {
  return value === 'asc' ? 'asc' : DEFAULT_SORT_DIR;
}

/**
 * Sort filtered submissions. Tie-break always uses numeric submission id.
 * TODO: once backend list sorting is supported, forward sort_by / sort_dir to
 * adminSubmissionsApi.list and skip this client-side sort (keep header UI).
 */
function sortSubmissions(rows: any[], sortBy: SortBy, sortDir: SortDir): any[] {
  const dir = sortDir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'submitted_at') {
      const aTime = a.submission_date ? new Date(a.submission_date).getTime() : NaN;
      const bTime = b.submission_date ? new Date(b.submission_date).getTime() : NaN;
      const aValid = !Number.isNaN(aTime);
      const bValid = !Number.isNaN(bTime);
      if (!aValid && !bValid) cmp = 0;
      else if (!aValid) cmp = 1; // nulls last
      else if (!bValid) cmp = -1;
      else cmp = aTime - bTime;
    } else {
      const aCount = Number(a.resubmission_count ?? 0);
      const bCount = Number(b.resubmission_count ?? 0);
      cmp = aCount - bCount;
    }
    if (cmp !== 0) return cmp * dir;
    return Number(a.id) - Number(b.id);
  });
}

/** Prefer backend detail/message; include HTTP status when available. */
function formatWithdrawError(error: unknown): string {
  const response = (error as { response?: { status?: number; data?: unknown } })?.response;
  const status = response?.status;
  const data = response?.data;
  let detail: string | undefined;

  if (data && typeof data === 'object') {
    const body = data as { detail?: unknown; message?: unknown };
    if (typeof body.detail === 'string' && body.detail.trim()) {
      detail = body.detail.trim();
    } else if (typeof body.message === 'string' && body.message.trim()) {
      detail = body.message.trim();
    }
  } else if (typeof data === 'string' && data.trim()) {
    detail = data.trim().slice(0, 200);
  }

  if (status && detail) {
    return `Withdraw failed (${status}): ${detail}`;
  }
  if (status) {
    return `Withdraw failed (${status}). Please try again.`;
  }
  if (detail) {
    return detail;
  }
  return WITHDRAW_ERROR_FALLBACK;
}

function distinctSortedOptions(values: Array<string | null | undefined>): string[] {
  const set = new Set<string>();
  values.forEach((v) => {
    const trimmed = (v ?? '').trim();
    if (trimmed) set.add(trimmed);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/** Inclusive calendar-day range on submission_date ISO strings. */
function matchesDateRange(
  submissionDate: string | null | undefined,
  fromDate: string,
  toDate: string,
): boolean {
  if (!fromDate && !toDate) return true;
  if (!submissionDate) return false;
  const submitted = new Date(submissionDate);
  if (Number.isNaN(submitted.getTime())) return false;

  if (fromDate) {
    const start = new Date(`${fromDate}T00:00:00`);
    if (submitted < start) return false;
  }
  if (toDate) {
    const end = new Date(`${toDate}T23:59:59.999`);
    if (submitted > end) return false;
  }
  return true;
}

export const AdminSubmissionsList: React.FC<Props> = ({ onView }) => {
  const { mfeContext } = useTasStore();
  const usageKey = mfeContext?.usageKey ?? '';
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [withdrawTarget, setWithdrawTarget] = useState<{ id: string; username: string } | null>(null);

  const collegeFilter = searchParams.get('college') ?? '';
  const universityFilter = searchParams.get('university') ?? '';
  const partnerFilter = searchParams.get('partner') ?? '';
  const emailFilter = searchParams.get('email') ?? '';
  const submittedAfter = searchParams.get('submitted_after') ?? '';
  const submittedBefore = searchParams.get('submitted_before') ?? '';
  const sortBy = parseSortBy(searchParams.get('sort_by'));
  const sortDir = parseSortDir(searchParams.get('sort_dir'));

  const [emailInput, setEmailInput] = useState(emailFilter);
  const debouncedEmail = useDebouncedValue(emailInput, 300);

  // Keep local email input aligned when URL email changes (e.g. Clear Filters / back navigation).
  useEffect(() => {
    setEmailInput(emailFilter);
  }, [emailFilter]);

  // Persist debounced email to the URL (structured for future server-side filters).
  useEffect(() => {
    const current = searchParams.get('email') ?? '';
    if (debouncedEmail === current) return;
    const next = new URLSearchParams(searchParams);
    if (debouncedEmail) {
      next.set('email', debouncedEmail);
    } else {
      next.delete('email');
    }
    setSearchParams(next, { replace: true });
  }, [debouncedEmail]); // eslint-disable-line react-hooks/exhaustive-deps

  const setFilterParam = (key: typeof FILTER_PARAM_KEYS[number], value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    // Clear filter params only — leave sort_by / sort_dir unchanged.
    const next = new URLSearchParams(searchParams);
    FILTER_PARAM_KEYS.forEach((key) => next.delete(key));
    setEmailInput('');
    setSearchParams(next, { replace: true });
  };

  const handleSortHeaderClick = (field: SortBy) => {
    const next = new URLSearchParams(searchParams);
    if (sortBy === field) {
      next.set('sort_dir', sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      next.set('sort_by', field);
      next.set('sort_dir', 'desc');
    }
    // Persist defaults explicitly so refresh restores the active sort.
    if (!next.get('sort_by')) next.set('sort_by', DEFAULT_SORT_BY);
    if (!next.get('sort_dir')) next.set('sort_dir', DEFAULT_SORT_DIR);
    setSearchParams(next, { replace: true });
  };

  const hasActiveFilters = FILTER_PARAM_KEYS.some((key) => {
    if (key === 'email') return !!(emailInput || searchParams.get('email'));
    return !!searchParams.get(key);
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-submissions', usageKey],
    queryFn: () => adminSubmissionsApi.list({ usage_key: usageKey }),
    enabled: !!usageKey,
    refetchOnMount: 'always',
  });

  const withdrawMut = useMutation({
    mutationFn: (submissionId: string) => adminSubmissionsApi.withdrawFeedback(submissionId),
    onSuccess: (_data, submissionId) => {
      setWithdrawTarget(null);
      queryClient.invalidateQueries({ queryKey: ['admin-submissions', usageKey] });
      queryClient.invalidateQueries({ queryKey: ['admin-submission-detail', submissionId] });
      onView(submissionId);
    },
    onError: (error) => {
      const response = (error as { response?: { status?: number; data?: unknown } })?.response;
      // eslint-disable-next-line no-console
      console.error('Withdraw feedback failed', {
        status: response?.status,
        body: response?.data,
        error,
      });
    },
  });

  const submissions = data ?? [];
  const isWithdrawing = withdrawMut.isPending;

  const collegeOptions = useMemo(
    () => distinctSortedOptions(submissions.map((s: any) => s.college_name)),
    [submissions],
  );
  const universityOptions = useMemo(
    () => distinctSortedOptions(submissions.map((s: any) => s.university_name)),
    [submissions],
  );
  const partnerOptions = useMemo(
    () => distinctSortedOptions(submissions.map((s: any) => s.partner_organization)),
    [submissions],
  );

  // TODO: once backend list filtering is supported, pass
  // { college, university, partner, email, submitted_after, submitted_before }
  // to adminSubmissionsApi.list and remove client-side filtering.
  const filtered = useMemo(() => {
    const emailNeedle = debouncedEmail.trim().toLowerCase();
    return submissions.filter((sub: any) => {
      if (collegeFilter && (sub.college_name ?? '') !== collegeFilter) return false;
      if (universityFilter && (sub.university_name ?? '') !== universityFilter) return false;
      if (partnerFilter && (sub.partner_organization ?? '') !== partnerFilter) return false;
      if (emailNeedle) {
        const email = String(sub.email ?? '').toLowerCase();
        if (!email.includes(emailNeedle)) return false;
      }
      if (!matchesDateRange(sub.submission_date, submittedAfter, submittedBefore)) return false;
      return true;
    });
  }, [
    submissions,
    collegeFilter,
    universityFilter,
    partnerFilter,
    debouncedEmail,
    submittedAfter,
    submittedBefore,
  ]);

  // TODO: once backend list sorting is supported, forward sort_by / sort_dir to the API
  // and skip client-side sorting (keep clickable header UI).
  const sorted = useMemo(
    () => sortSubmissions(filtered, sortBy, sortDir),
    [filtered, sortBy, sortDir],
  );

  const handleConfirmWithdraw = () => {
    if (!withdrawTarget || isWithdrawing) return;
    withdrawMut.mutate(withdrawTarget.id);
  };

  const countLabel = hasActiveFilters
    ? `${sorted.length} of ${submissions.length} submission${submissions.length !== 1 ? 's' : ''}`
    : `${submissions.length} submission${submissions.length !== 1 ? 's' : ''}`;

  return (
    <div className="d-flex flex-column h-100">
      {/* Header */}
      <div className="px-4 py-3 bg-white border-bottom">
        <div className="d-flex align-items-start justify-content-between flex-wrap" style={{ gap: '0.75rem' }}>
          <div>
            <h2 className="h5 mb-0">Student Submissions</h2>
            <small className="text-muted">{countLabel}</small>
          </div>

          <div className="d-flex align-items-center flex-wrap" style={{ gap: '0.5rem' }}>
            <Form.Control
              as="select"
              size="sm"
              value={collegeFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterParam('college', e.target.value)}
              style={{ width: 160 }}
              aria-label="College Name"
            >
              <option value="">All colleges</option>
              {collegeOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </Form.Control>

            <Form.Control
              as="select"
              size="sm"
              value={universityFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterParam('university', e.target.value)}
              style={{ width: 160 }}
              aria-label="University Name"
            >
              <option value="">All universities</option>
              {universityOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </Form.Control>

            <Form.Control
              as="select"
              size="sm"
              value={partnerFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterParam('partner', e.target.value)}
              style={{ width: 180 }}
              aria-label="Partner Organization"
            >
              <option value="">All partners</option>
              {partnerOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </Form.Control>

            <Form.Control
              leadingElement={<Search />}
              value={emailInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmailInput(e.target.value)}
              placeholder="Email ID…"
              size="sm"
              style={{ width: 180 }}
              aria-label="Email ID"
            />

            <Form.Control
              type="date"
              size="sm"
              value={submittedBefore}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilterParam('submitted_before', e.target.value)}
              style={{ width: 150 }}
              aria-label="Submitted to"
            />

            {hasActiveFilters && (
              <Button variant="primary" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-grow-1 overflow-auto p-4">
        {isLoading && (
          <div className="d-flex justify-content-center pt-5">
            <Spinner animation="border" variant="primary" screenReaderText="Loading submissions" />
          </div>
        )}

        {isError && (
          <div className="alert alert-danger">Failed to load submissions.</div>
        )}

        {!isLoading && !isError && submissions.length === 0 && (
          <div className="text-center pt-5 text-muted">
            <p>No submissions yet for this block.</p>
          </div>
        )}

        {!isLoading && !isError && submissions.length > 0 && filtered.length === 0 && (
          <div className="text-center pt-5 text-muted">
            <p className="mb-2">No submissions match these filters.</p>
            <Button variant="link" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        )}

        {!isLoading && !isError && sorted.length > 0 && (
          <div className="bg-white rounded shadow-sm" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f5f7fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={thStyle}>Student Email</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Review</th>
                  <th style={thStyle}>
                    <button
                      type="button"
                      onClick={() => handleSortHeaderClick('submitted_at')}
                      style={sortableThButtonStyle}
                      aria-label="Sort by Submitted At"
                    >
                      Submitted At
                      {sortBy === 'submitted_at' && (
                        <span aria-hidden="true">{sortDir === 'asc' ? ' ▲' : ' ▼'}</span>
                      )}
                    </button>
                  </th>
                  <th style={thStyle}>
                    <button
                      type="button"
                      onClick={() => handleSortHeaderClick('resubmission_count')}
                      style={sortableThButtonStyle}
                      aria-label="Sort by Resubmission Count"
                    >
                      Resubmission Count
                      {sortBy === 'resubmission_count' && (
                        <span aria-hidden="true">{sortDir === 'asc' ? ' ▲' : ' ▼'}</span>
                      )}
                    </button>
                  </th>
                  <th style={{ ...thStyle, width: 260 }}></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((sub: any, idx: number) => {
                  const canWithdraw = FINALIZED_FEEDBACK.has(sub.feedback_status);
                  const rowWithdrawing = isWithdrawing && withdrawTarget?.id === String(sub.id);

                  return (
                    <tr
                      key={sub.id}
                      style={{
                        borderBottom: '1px solid #dee2e6',
                        background: idx % 2 === 0 ? '#fff' : '#fafafa',
                      }}
                    >
                      <td style={tdStyle}>
                        <span className="font-weight-bold">{sub.username}</span>
                      </td>
                      <td style={tdStyle}>
                        <Badge variant={STATUS_BADGE[sub.status] ?? 'secondary'}>
                          {sub.status}
                        </Badge>
                      </td>
                      <td style={tdStyle}>
                        <Badge variant={FEEDBACK_BADGE[sub.feedback_status] ?? 'secondary'}>
                          {sub.feedback_status ?? 'pending'}
                        </Badge>
                      </td>
                      <td style={{ ...tdStyle, color: '#6b7280', fontSize: '0.85rem' }}>
                        {sub.submission_date
                          ? new Date(sub.submission_date).toLocaleString()
                          : '—'}
                      </td>
                      <td style={{ ...tdStyle, color: '#6b7280', fontSize: '0.85rem' }}>
                        {sub.resubmission_count ?? 0}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <div className="d-flex justify-content-end" style={{ gap: '0.5rem' }}>
                          {canWithdraw && (
                            <Button
                              variant="tertiary"
                              size="sm"
                              style={{ color: '#dc3545' }}
                              disabled={isWithdrawing}
                              onClick={() => setWithdrawTarget({
                                id: String(sub.id),
                                username: sub.username ?? 'this student',
                              })}
                            >
                              {rowWithdrawing ? (
                                <Spinner animation="border" size="sm" screenReaderText="Withdrawing" />
                              ) : (
                                'Withdraw Feedback'
                              )}
                            </Button>
                          )}
                          {sub.status === 'submitted' ? (
                            <Button
                              variant="brand"
                              size="sm"
                              onClick={() => onView(String(sub.id))}
                              disabled={isWithdrawing}
                            >
                              Review
                            </Button>
                          ) : (
                            <Button
                              variant="tertiary"
                              size="sm"
                              onClick={() => onView(String(sub.id))}
                              disabled={isWithdrawing}
                            >
                              View
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {withdrawMut.isError && (
          <div className="alert alert-danger mt-3">
            {formatWithdrawError(withdrawMut.error)}
          </div>
        )}
      </div>

      <ModalDialog
        title="Withdraw Feedback"
        isOpen={!!withdrawTarget}
        onClose={() => {
          if (!isWithdrawing) setWithdrawTarget(null);
        }}
        size="md"
        hasCloseButton
        isOverflowVisible={false}
        isBlocking={isWithdrawing}
      >
        <ModalDialog.Header>
          <ModalDialog.Title>Withdraw Feedback</ModalDialog.Title>
        </ModalDialog.Header>
        <ModalDialog.Body>
          <p className="mb-0">
            Withdraw feedback for{' '}
            <strong>{withdrawTarget?.username ?? 'this student'}</strong>
            ? This will reopen the grading form with the previous scores and comments so you can
            correct and resubmit. The student will not see the previous review until you submit again.
          </p>
        </ModalDialog.Body>
        <ModalDialog.Footer>
          <ActionRow>
            <ModalDialog.CloseButton variant="tertiary" disabled={isWithdrawing}>
              Cancel
            </ModalDialog.CloseButton>
            <Button
              variant="danger"
              onClick={handleConfirmWithdraw}
              disabled={isWithdrawing}
            >
              {isWithdrawing ? (
                <Spinner animation="border" size="sm" screenReaderText="Withdrawing" />
              ) : (
                'Withdraw Feedback'
              )}
            </Button>
          </ActionRow>
        </ModalDialog.Footer>
      </ModalDialog>
    </div>
  );
};

const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: '0.8rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#6b7280',
  whiteSpace: 'nowrap',
};

const sortableThButtonStyle: React.CSSProperties = {
  padding: 0,
  margin: 0,
  border: 'none',
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  fontWeight: 'inherit',
  letterSpacing: 'inherit',
  textTransform: 'inherit',
  cursor: 'pointer',
};

const tdStyle: React.CSSProperties = {
  padding: '14px 16px',
  verticalAlign: 'middle',
};
