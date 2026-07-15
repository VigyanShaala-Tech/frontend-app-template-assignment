/**
 * StudentFeedbackPanel
 * Read-only instructor feedback shown to learners after submission.
 * Renders stored Instructor Comment HTML with category headings stripped.
 */

import React from 'react';
import { Badge, Card } from '@openedx/paragon';
import type { SubmissionFeedback } from '../types';
import { stripCategoryHeadingsFromComment } from '../utils/flattenStudentFeedback';
import { InstructorCommentHtml } from './admin/InstructorCommentHtml';

interface Props {
  feedback: SubmissionFeedback;
}

const FEEDBACK_BADGE: Record<string, string> = {
  pending: 'secondary',
  approved: 'success',
  rejected: 'danger',
};

export const StudentFeedbackPanel: React.FC<Props> = ({ feedback }) => {
  const displayComment = stripCategoryHeadingsFromComment(feedback.comment ?? '');

  return (
    <Card className="shadow-sm mt-4">
      <Card.Header title="Instructor Feedback" />
      <Card.Section>
        <Badge variant={FEEDBACK_BADGE[feedback.status] ?? 'secondary'} className="mb-3">
          {feedback.status}
        </Badge>

        {!displayComment.trim() ? (
          <div className="small text-muted">No instructor comment.</div>
        ) : (
          <InstructorCommentHtml comment={displayComment} className="small mb-0" />
        )}
      </Card.Section>
    </Card>
  );
};
