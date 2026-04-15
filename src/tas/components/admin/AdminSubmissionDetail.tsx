/**
 * AdminSubmissionDetail
 * Shows a single student submission.
 *
 * - If status is "submitted": show form data + rubric scoring form
 * - If status is "rejected": show form data read-only + past feedback
 * - Always shows version history at the bottom
 */

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Button, Badge, Spinner, Form, Card,
} from '@openedx/paragon';
import { ArrowBack, CheckCircle } from '@openedx/paragon/icons';
import { adminSubmissionsApi, submissionsApi } from '../../services/api';
import { useTasStore } from '../../store/tasStore';

interface Props {
  submissionId: string;
  onBack: () => void;
}

const STATUS_BADGE: Record<string, string> = {
  submitted: 'primary',
  rejected: 'danger',
  draft: 'secondary',
};

const FEEDBACK_BADGE: Record<string, string> = {
  pending: 'secondary',
  approved: 'success',
  rejected: 'danger',
};

export const AdminSubmissionDetail: React.FC<Props> = ({ submissionId, onBack }) => {
  const { mfeContext } = useTasStore();
  const usageKey = mfeContext?.usageKey ?? '';

  const [comment, setComment] = useState('');
  const [rubricScores, setRubricScores] = useState<Record<string, string>>({});
  const [feedbackStatus, setFeedbackStatus] = useState<'approved' | 'rejected'>('approved');
  const [feedbackSaved, setFeedbackSaved] = useState(false);

  const { data: submission, isLoading: loadingSub } = useQuery({
    queryKey: ['admin-submission-detail', submissionId],
    queryFn: () => adminSubmissionsApi.get(submissionId),
  });

  const { data: rubrics, isLoading: loadingRubrics } = useQuery({
    queryKey: ['block-rubrics', usageKey],
    queryFn: () => adminSubmissionsApi.getRubrics(usageKey),
    enabled: !!usageKey,
  });

  const { data: versionsData, isLoading: loadingVersions } = useQuery({
    queryKey: ['submission-versions', submissionId],
    queryFn: () => submissionsApi.getVersions(submissionId),
    enabled: !!submissionId,
  });

  const feedbackMut = useMutation({
    mutationFn: () =>
      adminSubmissionsApi.submitFeedback(submissionId, {
        comment,
        rubrics: Object.entries(rubricScores).map(([criterion, score]) => ({ criterion, score })),
        status: feedbackStatus,
      }),
    onSuccess: () => setFeedbackSaved(true),
  });

  const isLoading = loadingSub || loadingRubrics;

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center h-100">
        <Spinner animation="border" variant="primary" screenReaderText="Loading" />
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="p-4">
        <Button variant="tertiary" iconBefore={ArrowBack} onClick={onBack}>Back</Button>
        <div className="alert alert-danger mt-3">Submission not found.</div>
      </div>
    );
  }

  const rubricList: any[] = rubrics?.rubrics ?? [];
  const formEntries = Object.entries(submission.form_data ?? {});
  const versions = versionsData?.versions ?? [];
  const isSubmitted = submission.status === 'submitted';

  return (
    <div className="d-flex flex-column h-100">
      {/* Header */}
      <div className="d-flex align-items-center px-4 py-3 bg-white border-bottom" style={{ gap: '0.75rem' }}>
        <Button variant="tertiary" size="sm" iconBefore={ArrowBack} onClick={onBack}>
          Back
        </Button>
        <div className="flex-grow-1">
          <h2 className="h5 mb-0">{submission.username}'s Submission</h2>
          <small className="text-muted">
            {submission.submission_date
              ? new Date(submission.submission_date).toLocaleString()
              : 'Not submitted'}
            {' · '}v{submission.version ?? 1}
          </small>
        </div>
        <Badge variant={STATUS_BADGE[submission.status] ?? 'secondary'}>
          {submission.status}
        </Badge>
      </div>

      {/* Body */}
      <div className="flex-grow-1 overflow-auto p-4">
        <div className="row">
          {/* Left: Student answers */}
          <div className="col-12 col-lg-6 mb-4">
            <Card className="shadow-sm mb-4">
              <Card.Header title="Student Answers" />
              <Card.Section>
                {formEntries.length === 0 && (
                  <p className="text-muted small mb-0">No answers submitted.</p>
                )}
                {formEntries.map(([fieldId, value]) => (
                  <div key={fieldId} className="mb-3">
                    <div className="small font-weight-bold text-muted mb-1">{fieldId}</div>
                    <div
                      className="p-2 rounded"
                      style={{ background: '#f8f9fa', minHeight: 36, wordBreak: 'break-word' }}
                    >
                      {String(value) || <span className="text-muted">—</span>}
                    </div>
                  </div>
                ))}
              </Card.Section>
            </Card>

            {submission.pdf && (
              <Card className="shadow-sm">
                <Card.Header title="PDF Submission" />
                <Card.Section>
                  <a href={submission.pdf} target="_blank" rel="noopener noreferrer">
                    Download PDF
                  </a>
                </Card.Section>
              </Card>
            )}
          </div>

          {/* Right: Feedback form (submitted) or past feedback (rejected) */}
          <div className="col-12 col-lg-6 mb-4">
            <Card className="shadow-sm">
              <Card.Header title={isSubmitted ? 'Instructor Feedback' : 'Previous Feedback'} />
              <Card.Section>
                {/* Past feedback for rejected submissions */}
                {!isSubmitted && submission.feedback && (
                  <div className="mb-2">
                    <Badge variant={FEEDBACK_BADGE[submission.feedback.status] ?? 'secondary'} className="mb-2">
                      {submission.feedback.status}
                    </Badge>
                    {submission.feedback.comment && (
                      <p className="small mt-2 mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                        {submission.feedback.comment}
                      </p>
                    )}
                    {!submission.feedback.comment && (
                      <p className="text-muted small mb-0">No comment left.</p>
                    )}
                  </div>
                )}

                {!isSubmitted && !submission.feedback && (
                  <p className="text-muted small mb-0">No feedback recorded.</p>
                )}

                {/* Review form — only for submitted */}
                {isSubmitted && (
                  feedbackSaved ? (
                    <div className="d-flex align-items-center text-success" style={{ gap: '0.5rem' }}>
                      <CheckCircle />
                      <span>Feedback saved.</span>
                    </div>
                  ) : (
                    <>
                      {rubricList.length > 0 && (
                        <div className="mb-4">
                          <p className="font-weight-bold small mb-2">Rubric Scores</p>
                          {rubricList.map((rubric: any, idx: number) => (
                            <Form.Group key={idx} className="mb-3">
                              <Form.Label className="small font-weight-bold">
                                {rubric.criterion ?? rubric.name ?? `Criterion ${idx + 1}`}
                                {rubric.max_score && (
                                  <span className="text-muted font-weight-normal ml-1">
                                    (max {rubric.max_score})
                                  </span>
                                )}
                              </Form.Label>
                              <Form.Control
                                type="number"
                                min={0}
                                max={rubric.max_score ?? 100}
                                value={rubricScores[rubric.criterion ?? String(idx)] ?? ''}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                  setRubricScores((prev) => ({
                                    ...prev,
                                    [rubric.criterion ?? String(idx)]: e.target.value,
                                  }))
                                }
                                placeholder="Score"
                              />
                            </Form.Group>
                          ))}
                        </div>
                      )}

                      <Form.Group className="mb-3">
                        <Form.Label className="small font-weight-bold">Comments</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={4}
                          value={comment}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setComment(e.target.value)}
                          placeholder="Leave feedback for the student…"
                        />
                      </Form.Group>

                      {/* Approve / Reject buttons */}
                      <div className="d-flex" style={{ gap: '0.5rem' }}>
                        <Button
                          variant="brand"
                          onClick={() => { setFeedbackStatus('approved'); feedbackMut.mutate(); }}
                          disabled={feedbackMut.isPending}
                        >
                          {feedbackMut.isPending && feedbackStatus === 'approved'
                            ? <Spinner animation="border" size="sm" screenReaderText="Saving" />
                            : 'Approve'}
                        </Button>
                        <Button
                          variant="outline-danger"
                          onClick={() => { setFeedbackStatus('rejected'); feedbackMut.mutate(); }}
                          disabled={feedbackMut.isPending}
                        >
                          {feedbackMut.isPending && feedbackStatus === 'rejected'
                            ? <Spinner animation="border" size="sm" screenReaderText="Saving" />
                            : 'Reject'}
                        </Button>
                      </div>

                      {feedbackMut.isError && (
                        <div className="alert alert-danger mt-2 small">Failed to save feedback.</div>
                      )}
                    </>
                  )
                )}
              </Card.Section>
            </Card>
          </div>
        </div>

        {/* Version history */}
        {versions.length > 0 && (
          <Card className="shadow-sm">
            <Card.Header title="Submission History" />
            <Card.Section>
              {loadingVersions ? (
                <Spinner animation="border" size="sm" screenReaderText="Loading versions" />
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #dee2e6' }}>
                      <th style={thStyle}>Version</th>
                      <th style={thStyle}>Saved At</th>
                      <th style={thStyle}>Fields</th>
                    </tr>
                  </thead>
                  <tbody>
                    {versions.map((v: any) => (
                      <tr key={v.version_number} style={{ borderBottom: '1px solid #dee2e6' }}>
                        <td style={tdStyle}>v{v.version_number}</td>
                        <td style={{ ...tdStyle, color: '#6b7280', fontSize: '0.85rem' }}>
                          {v.saved_at ? new Date(v.saved_at).toLocaleString() : '—'}
                        </td>
                        <td style={{ ...tdStyle, color: '#6b7280', fontSize: '0.85rem' }}>
                          {Object.keys(v.form_data ?? {}).length} field(s)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card.Section>
          </Card>
        )}
      </div>
    </div>
  );
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
