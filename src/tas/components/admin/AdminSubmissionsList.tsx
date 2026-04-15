/**
 * AdminSubmissionsList
 * Shows submitted and rejected submissions for a block.
 * One row per student (latest). "Review" only available for submitted ones.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Badge, Spinner } from '@openedx/paragon';
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

export const AdminSubmissionsList: React.FC<Props> = ({ onView }) => {
  const { mfeContext } = useTasStore();
  const usageKey = mfeContext?.usageKey ?? '';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-submissions', usageKey],
    queryFn: () => adminSubmissionsApi.list({ usage_key: usageKey }),
    enabled: !!usageKey,
  });

  const submissions = data ?? [];

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
                  <th style={{ ...thStyle, width: 110 }}></th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub: any, idx: number) => (
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
                      {sub.status === 'submitted' ? (
                        <Button
                          variant="brand"
                          size="sm"
                          onClick={() => onView(String(sub.id))}
                        >
                          Review
                        </Button>
                      ) : (
                        <Button
                          variant="tertiary"
                          size="sm"
                          onClick={() => onView(String(sub.id))}
                        >
                          View
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
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
