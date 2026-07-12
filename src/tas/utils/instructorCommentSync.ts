/**
 * Helpers for syncing per-category predefined feedback into the instructor comment.
 */

export function normalizeFeedbacks(feedbacks?: string[]): string[] {
  return feedbacks ?? [];
}

export function orderSelectedFeedbacks(
  rubricFeedbackOrder: string[],
  selectedFeedbacks: string[],
): string[] {
  return rubricFeedbackOrder.filter((feedback) => selectedFeedbacks.includes(feedback));
}

export function formatCategoryFeedbacks(
  selectedFeedbacks: string[],
  rubricFeedbackOrder: string[],
): string {
  return orderSelectedFeedbacks(rubricFeedbackOrder, selectedFeedbacks).join('\n');
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface ParsedInstructorComment {
  preamble: string;
  sections: Record<string, string>;
  postamble: string;
}

export function parseInstructorCommentSections(
  comment: string,
  categoryOrder: string[],
): ParsedInstructorComment {
  if (!comment.trim() || categoryOrder.length === 0) {
    return { preamble: comment, sections: {}, postamble: '' };
  }

  const headings: { name: string; index: number; lineEnd: number }[] = [];
  categoryOrder.forEach((name) => {
    const regex = new RegExp(`^${escapeRegex(name)}:\\s*$`, 'm');
    const match = comment.match(regex);
    if (match && match.index !== undefined) {
      headings.push({ name, index: match.index, lineEnd: match.index + match[0].length });
    }
  });

  headings.sort((a, b) => a.index - b.index);

  if (headings.length === 0) {
    return { preamble: comment, sections: {}, postamble: '' };
  }

  const preamble = comment.slice(0, headings[0].index).replace(/\n+$/, '');
  const sections: Record<string, string> = {};

  headings.forEach((heading, i) => {
    const start = heading.lineEnd;
    const end = i + 1 < headings.length ? headings[i + 1].index : comment.length;
    const body = comment.slice(start, end).replace(/^\n/, '').replace(/\n+$/, '');
    sections[heading.name] = body;
  });

  return { preamble, sections, postamble: '' };
}

export function buildInstructorComment(
  preamble: string,
  sections: Record<string, string>,
  categoryOrder: string[],
  postamble = '',
): string {
  const parts: string[] = [];

  if (preamble.trim()) {
    parts.push(preamble.trimEnd());
  }

  categoryOrder.forEach((name) => {
    const body = sections[name]?.trim();
    if (body) {
      parts.push(`${name}:\n${body}`);
    }
  });

  if (postamble.trim()) {
    parts.push(postamble.trimEnd());
  }

  return parts.join('\n\n');
}

export function updateCategorySection(
  comment: string,
  categoryName: string,
  categoryOrder: string[],
  selectedFeedbacks: string[],
  rubricFeedbackOrder: string[],
): string {
  const { preamble, sections, postamble } = parseInstructorCommentSections(comment, categoryOrder);
  const body = formatCategoryFeedbacks(selectedFeedbacks, rubricFeedbackOrder);

  if (body.trim()) {
    sections[categoryName] = body;
  } else {
    delete sections[categoryName];
  }

  return buildInstructorComment(preamble, sections, categoryOrder, postamble);
}
