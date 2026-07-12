/**
 * Helpers for rubric category-level predefined feedbacks (feedbacks: string[]).
 */

/** Treat missing feedbacks as an empty in-memory list (legacy rubrics). */
export function normalizeFeedbacks(feedbacks?: string[]): string[] {
  return feedbacks ?? [];
}

/**
 * Split clipboard text from Excel row-wise paste into individual feedback lines.
 * Preserves paste order; trims each line; drops empty lines.
 */
export function splitPastedFeedbacks(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Prepare feedbacks for persistence: trim, remove blanks, preserve order, no dedupe.
 */
export function serializeFeedbacksForSave(feedbacks: string[]): string[] {
  const result: string[] = [];
  for (const entry of feedbacks) {
    const trimmed = entry.trim();
    if (trimmed) {
      result.push(trimmed);
    }
  }
  return result;
}
