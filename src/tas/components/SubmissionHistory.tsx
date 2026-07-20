/**
 * Shared Submission History table for instructor and student views.
 * Does not render instructor Feedback History cards.
 */

import React from 'react';
import { Badge, Card } from '@openedx/paragon';
import type { FeedbackUnavailableReason, SubmissionVersion } from '../types';
import { downloadPdf } from '../utils/downloadPdf';

export type SubmissionHistoryItem = Pick<SubmissionVersion, 'version_number'> & {
  submitted_at?: string | null;
  saved_at?: string | null;
  form_data?: Record<string, string>;
  pdf_url?: string | null;
  download_url?: string | null;
  feedback_available?: boolean;
  feedback_unavailable_reason?: FeedbackUnavailableReason | null;
  feedback_status?: string | null;
};

interface Props {
  versions: SubmissionHistoryItem[];
  title?: string;
  showFieldCount?: boolean;
  showFeedbackStatus?: boolean;
  /** When false, PDF column and PDF buttons are omitted (student history table). */
  showPdfColumn?: boolean;
  showViewPdf?: boolean;
  showViewFeedback?: boolean;
  onViewFeedback?: (version: SubmissionHistoryItem) => void;
  pdfFilenamePrefix?: string;
}

const FEEDBACK_BADGE: Record<string, string> = {
  pending: 'secondary',
  approved: 'success',
  rejected: 'danger',
};

const thStyle: React.CSSProperties = {
  padding: '10px 16px',
  textAlign: 'left',
  fontSize: '0.78rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#6b7280',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  verticalAlign: 'middle',
};

const pdfBtnStyle: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: 12,
  fontWeight: 600,
  background: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
};

const linkBtnStyle: React.CSSProperties = {
  ...pdfBtnStyle,
  background: '#fff',
  color: '#2563eb',
  border: '1px solid #2563eb',
};

function formatTimestamp(version: SubmissionHistoryItem): string {
  const raw = version.submitted_at ?? version.saved_at;
  return raw ? new Date(raw).toLocaleString() : '—';
}

function formatStatusLabel(status: string): string {
  if (!status) return status;
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function feedbackStatusCell(version: SubmissionHistoryItem): React.ReactNode {
  if (version.feedback_available && version.feedback_status) {
    return (
      <Badge variant={FEEDBACK_BADGE[version.feedback_status] ?? 'secondary'}>
        {formatStatusLabel(version.feedback_status)}
      </Badge>
    );
  }
  if (version.feedback_unavailable_reason === 'unlinked_historical') {
    return (
      <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>
        Historical feedback unavailable for this submission.
      </span>
    );
  }
  return (
    <Badge variant={FEEDBACK_BADGE.pending}>
      Pending
    </Badge>
  );
}

export const SubmissionHistory: React.FC<Props> = ({
  versions,
  title = 'Submission History',
  showFieldCount = false,
  showFeedbackStatus = false,
  showPdfColumn = true,
  showViewPdf = false,
  showViewFeedback = false,
  onViewFeedback,
  pdfFilenamePrefix = 'submission',
}) => (
  <Card className="shadow-sm">
    <Card.Header title={title} />
    <Card.Section>
      {versions.length === 0 ? (
        <p className="text-muted small mb-0">No submission history yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #dee2e6' }}>
              <th style={thStyle}>Version</th>
              <th style={thStyle}>{showFeedbackStatus ? 'Submitted At' : 'Saved At'}</th>
              {showFieldCount && <th style={thStyle}>Fields</th>}
              {showFeedbackStatus && <th style={thStyle}>Submission Status</th>}
              {showPdfColumn && <th style={thStyle}>PDF</th>}
              {showViewFeedback && <th style={thStyle}>Feedback</th>}
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => {
              const pdfUrl = v.pdf_url || v.download_url || null;
              return (
                <tr key={v.version_number} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={tdStyle}>v{v.version_number}</td>
                  <td style={{ ...tdStyle, color: '#6b7280', fontSize: '0.85rem' }}>
                    {formatTimestamp(v)}
                  </td>
                  {showFieldCount && (
                    <td style={{ ...tdStyle, color: '#6b7280', fontSize: '0.85rem' }}>
                      {Object.keys(v.form_data ?? {}).length} field(s)
                    </td>
                  )}
                  {showFeedbackStatus && (
                    <td style={tdStyle}>{feedbackStatusCell(v)}</td>
                  )}
                  {showPdfColumn && (
                    <td style={tdStyle}>
                      {pdfUrl ? (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {showViewPdf && (
                            <button
                              type="button"
                              onClick={() => window.open(pdfUrl, '_blank')}
                              style={linkBtnStyle}
                            >
                              View PDF
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              void downloadPdf(pdfUrl, `${pdfFilenamePrefix}_v${v.version_number}.pdf`);
                            }}
                            style={pdfBtnStyle}
                          >
                            ↓ PDF
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>—</span>
                      )}
                    </td>
                  )}
                  {showViewFeedback && (
                    <td style={tdStyle}>
                      <button
                        type="button"
                        disabled={!v.feedback_available}
                        onClick={() => onViewFeedback?.(v)}
                        style={{
                          ...linkBtnStyle,
                          opacity: v.feedback_available ? 1 : 0.45,
                          cursor: v.feedback_available ? 'pointer' : 'not-allowed',
                        }}
                      >
                        View Feedback
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Card.Section>
  </Card>
);
