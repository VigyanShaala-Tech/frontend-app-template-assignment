import { getConfig } from '@edx/frontend-platform';
import type { MfeContext } from '../types';

/** Open edX deep link to the assignment block in courseware. */
export function buildAssignmentJumpToUrl(courseId: string, usageKey: string): string {
  const lmsBaseUrl = (getConfig().LMS_BASE_URL as string).replace(/\/$/, '');
  return `${lmsBaseUrl}/courses/${encodeURIComponent(courseId)}/jump_to/${encodeURIComponent(usageKey)}`;
}

/** True when browser history can reliably return to a prior page. */
export function canUseBrowserHistoryBack(): boolean {
  if (window.history.length <= 1) return false;

  const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (navEntry?.type === 'reload') return false;

  return true;
}

function hasJumpToContext(mfeContext: MfeContext | null): mfeContext is MfeContext {
  return Boolean(mfeContext?.courseId?.trim() && mfeContext?.usageKey?.trim());
}

/** Navigate back to the LMS assignment block (history first, jump_to fallback). */
export function navigateBackToAssignment(mfeContext: MfeContext | null): void {
  if (canUseBrowserHistoryBack()) {
    window.history.back();
    return;
  }

  if (hasJumpToContext(mfeContext)) {
    window.location.assign(
      buildAssignmentJumpToUrl(mfeContext.courseId.trim(), mfeContext.usageKey.trim()),
    );
    return;
  }

  // Graceful last resort — avoid constructing an invalid jump_to URL
  if (window.history.length > 1) {
    window.history.back();
  }
  // Otherwise remain on the submission page (no navigation, no invalid URL)
}
