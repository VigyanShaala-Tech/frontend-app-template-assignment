/**
 * StudentFeedbackPanel
 * Read-only instructor feedback shown to learners after submission.
 */

import React from 'react';
import { Card } from '@openedx/paragon';
import type { SubmissionFeedback } from '../types';
import { FeedbackDisplay } from './feedback/FeedbackDisplay';

interface Props {
  feedback: SubmissionFeedback;
}

export const StudentFeedbackPanel: React.FC<Props> = ({ feedback }) => (
  <Card className="shadow-sm mt-4">
    <Card.Header title="Instructor Feedback" />
    <Card.Section>
      <FeedbackDisplay
        feedback={feedback}
        showStatusBadge
        showTotalScore={Boolean(feedback.rubrics?.length)}
        emptyMessage="No instructor feedback available yet."
      />
    </Card.Section>
  </Card>
);
