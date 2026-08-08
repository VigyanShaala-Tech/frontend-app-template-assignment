/**
 * URL helpers for instructor submission status filter tabs (toggle behaviour).
 * Absence of `status` means all statuses (no status=all).
 */

export type StatusTabKey = 'submitted' | 'approved' | 'rejected';

export function parseStatus(value: string | null): StatusTabKey | null {
  if (value === 'approved' || value === 'rejected' || value === 'submitted') {
    return value;
  }
  return null;
}

/**
 * Toggle status in search params.
 * - Clicking the active tab clears `status` (show all).
 * - Clicking another tab sets that status.
 * Always resets `page`. Preserves all other params.
 */
export function applyStatusTabToSearchParams(
  searchParams: URLSearchParams,
  currentStatus: StatusTabKey | null,
  clickedStatus: StatusTabKey,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  if (currentStatus === clickedStatus) {
    next.delete('status');
  } else {
    next.set('status', clickedStatus);
  }
  next.delete('page');
  return next;
}
