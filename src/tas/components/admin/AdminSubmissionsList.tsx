/**
 * AdminSubmissionsList
 * Shows submitted and rejected submissions for a block.
 * One row per student (latest). "Review" only available for submitted ones.
 * "Withdraw Feedback" for finalized reviews (approved / rejected).
 */

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Badge, Spinner, ModalDialog, ActionRow } from '@openedx/paragon';
import { adminSubmissionsApi } from '../../services/api';
import { useTasStore } from '../../store/tasStore';

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

export const AdminSubmissionsList: React.FC<Props> = ({ onView }) => {
  const { mfeContext } = useTasStore();
  const usageKey = mfeContext?.usageKey ?? '';
  const queryClient = useQueryClient();

  const [withdrawTarget, setWithdrawTarget] = useState<{ id: string; username: string } | null>(null);

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

  const handleConfirmWithdraw = () => {
    if (!withdrawTarget || isWithdrawing) return;
    withdrawMut.mutate(withdrawTarget.id);
  };

  return (
    <div className="d-flex flex-column h-100">
      {/* Header */}
      <div className="px-4 py-3 bg-white border-bottom">
        <h2 className="h5 mb-0">Student Submissions</h2>
        <small className="text-muted">
          {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
        </small>
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

        {!isLoading && !isError && submissions.length > 0 && (
          <div className="bg-white rounded shadow-sm" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f5f7fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={thStyle}>Student</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Review</th>
                  <th style={thStyle}>Submitted At</th>
                  <th style={thStyle}>Version</th>
                  <th style={{ ...thStyle, width: 260 }}></th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub: any, idx: number) => {
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
                        v{sub.version_number ?? 1}
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

const tdStyle: React.CSSProperties = {
  padding: '14px 16px',
  verticalAlign: 'middle',
};
