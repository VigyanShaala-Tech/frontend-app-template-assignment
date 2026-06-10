/**
 * StudentFeedbackPanel
 * Read-only instructor feedback shown to learners after submission.
 */

import React from 'react';
import { Badge, Card, Form } from '@openedx/paragon';
import type { SubmissionFeedback } from '../types';

interface Props {
  feedback: SubmissionFeedback;
}

const FEEDBACK_BADGE: Record<string, string> = {
  pending: 'secondary',
  approved: 'success',
  rejected: 'danger',
};

export const StudentFeedbackPanel: React.FC<Props> = ({ feedback }) => {
  const comment = feedback.comment ?? '';

  return (
    <Card className="shadow-sm mt-4">
      <Card.Header title="Instructor Feedback" />
      <Card.Section>
        <Badge variant={FEEDBACK_BADGE[feedback.status] ?? 'secondary'} className="mb-3">
          {feedback.status}
        </Badge>

        {feedback.rubrics && feedback.rubrics.length > 0 && (
          <div className="mb-3">
            {feedback.rubrics.map((r, i) => (
              <div
                key={i}
                className="d-flex justify-content-between small py-1"
                style={{ borderBottom: '1px solid #e9ecef' }}
              >
                <span>{r.criterion}</span>
                <span>
                  <strong>{r.score ?? r.marks ?? '—'}</strong>
                  {(r.score != null || r.marks != null) && (
                    <span className="text-muted ml-1">pts</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}

        <Form.Group className="mb-0">
          <Form.Label className="small font-weight-bold">Instructor comment</Form.Label>
          <Form.Control
            as="textarea"
            readOnly
            rows={6}
            value={comment}
            style={{ whiteSpace: 'pre-wrap' }}
            aria-label="Instructor comment"
          />
          {!comment && (
            <div className="small text-muted mt-1">No instructor comment.</div>
          )}
        </Form.Group>
      </Card.Section>
    </Card>
  );
};
