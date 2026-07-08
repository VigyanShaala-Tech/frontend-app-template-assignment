/**
 * FeedbackDisplay
 * Shared read-only renderer for instructor feedback (reviewer preview + student view).
 */

import React from 'react';
import { Badge } from '@openedx/paragon';
import type { RubricFeedbackEntry, SubmissionFeedback } from '../../types';
import {
  filterVisibleRubrics,
  getPredefinedLabels,
} from '../../utils/feedbackPayload';

export interface FeedbackDisplayProps {
  feedback: SubmissionFeedback | null | undefined;
  showStatusBadge?: boolean;
  showTotalScore?: boolean;
  totalScore?: number | null;
  emptyMessage?: string;
  variant?: 'default' | 'compact';
}

const FEEDBACK_BADGE: Record<string, string> = {
  pending: 'secondary',
  approved: 'success',
  rejected: 'danger',
};

function formatScore(entry: RubricFeedbackEntry): string {
  const value = entry.score ?? entry.marks;
  return value != null ? String(value) : '—';
}

function CategoryBlock({
  entry,
  compact,
}: {
  entry: RubricFeedbackEntry;
  compact: boolean;
}) {
  const labels = getPredefinedLabels(entry);
  const scoreValue = entry.score ?? entry.marks;
  const categoryComment = entry.comment?.trim() ?? '';

  return (
    <div
      className={compact ? 'mb-3 pb-2' : 'mb-4 pb-3'}
      style={{ borderBottom: '1px solid #e9ecef' }}
    >
      <div className="d-flex justify-content-between align-items-start mb-1">
        <span className="small font-weight-bold">{entry.criterion}</span>
        {scoreValue != null && (
          <span className="small text-nowrap ml-2">
            <strong>{formatScore(entry)}</strong>
            <span className="text-muted ml-1">pts</span>
          </span>
        )}
      </div>

      {labels.length > 0 && (
        <ul className="small mb-1 pl-3" style={{ listStyleType: 'disc' }}>
          {labels.map((label) => (
            <li key={`${entry.criterion}-${label}`} style={{ wordBreak: 'break-word' }}>
              {label}
            </li>
          ))}
        </ul>
      )}

      {categoryComment && (
        <p
          className="small text-muted mb-0"
          style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
        >
          {categoryComment}
        </p>
      )}
    </div>
  );
}

export const FeedbackDisplay: React.FC<FeedbackDisplayProps> = ({
  feedback,
  showStatusBadge = false,
  showTotalScore = false,
  totalScore = null,
  emptyMessage = 'No feedback available.',
  variant = 'default',
}) => {
  const compact = variant === 'compact';
  const visibleRubrics = filterVisibleRubrics(feedback?.rubrics ?? []);
  const overallComment = feedback?.comment?.trim() ?? '';

  if (!feedback || (visibleRubrics.length === 0 && !overallComment)) {
    return (
      <p className="text-muted small mb-0">{emptyMessage}</p>
    );
  }

  const displayTotal = totalScore ?? feedback.total ?? visibleRubrics.reduce((sum, entry) => {
    const score = entry.score ?? entry.marks;
    return score != null ? sum + score : sum;
  }, 0);

  return (
    <div>
      {showStatusBadge && feedback.status && (
        <Badge variant={FEEDBACK_BADGE[feedback.status] ?? 'secondary'} className="mb-3">
          {feedback.status}
        </Badge>
      )}

      {visibleRubrics.length > 0 && (
        <div className={compact ? 'mb-2' : 'mb-3'}>
          {visibleRubrics.map((entry) => (
            <CategoryBlock key={entry.criterion} entry={entry} compact={compact} />
          ))}
          {showTotalScore && (
            <div className="d-flex justify-content-between align-items-center border-top pt-2">
              <span className="small font-weight-bold">Total Score</span>
              <span className="font-weight-bold">{displayTotal}</span>
            </div>
          )}
        </div>
      )}

      {overallComment && (
        <div className={visibleRubrics.length > 0 ? 'mt-2' : undefined}>
          {visibleRubrics.length > 0 && (
            <div className="small font-weight-bold mb-1">Overall comment</div>
          )}
          <p
            className="small mb-0"
            style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
          >
            {overallComment}
          </p>
        </div>
      )}
    </div>
  );
};
