/**
 * Display-only status labels for instructor (and shared) UI.
 * API/DB values remain draft | submitted | approved | rejected | pending.
 */

export const SUBMISSION_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Under Review',
  approved: 'Accepted',
  rejected: 'Reattempt',
};

export const FEEDBACK_STATUS_LABELS: Record<string, string> = {
  pending: 'Available for Review',
  approved: 'Accepted',
  rejected: 'Reattempt',
};

export function formatSubmissionStatusLabel(status: string): string {
  return SUBMISSION_STATUS_LABELS[status] ?? status;
}

export function formatFeedbackStatusLabel(status: string): string {
  return FEEDBACK_STATUS_LABELS[status] ?? status;
}
