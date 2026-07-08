/**
 * Shared helpers for building and filtering instructor feedback payloads.
 * Used by reviewer preview and submit so both always stay in sync.
 */

import type {
  PredefinedFeedbackOption,
  RubricCriterionWithFeedback,
  RubricFeedbackEntry,
  SubmissionFeedback,
} from '../types';

export function parseScoreInput(rawInput: string): number | null {
  const trimmed = rawInput.trim();
  if (trimmed === '') {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function isValidScore(parsed: number | null): parsed is number {
  return parsed !== null && !Number.isNaN(parsed) && parsed >= 0 && parsed <= 10;
}

export function buildPredefinedLookup(
  rubricList: RubricCriterionWithFeedback[],
): Record<string, PredefinedFeedbackOption[]> {
  const lookup: Record<string, PredefinedFeedbackOption[]> = {};
  rubricList.forEach((rubric) => {
    lookup[rubric.criterion] = rubric.predefined_feedback ?? [];
  });
  return lookup;
}

export function resolvePredefinedLabels(
  ids: string[],
  options: PredefinedFeedbackOption[],
): string[] {
  const byId = Object.fromEntries(options.map((option) => [option.id, option.label]));
  return ids.map((id) => byId[id] ?? id);
}

export function getPredefinedLabels(
  entry: RubricFeedbackEntry,
): string[] {
  if (entry.selected_option_labels?.length) {
    return entry.selected_option_labels;
  }
  if (entry.selected_options?.length) {
    return entry.selected_options;
  }
  return [];
}

export function hasVisibleCategoryContent(entry: RubricFeedbackEntry): boolean {
  const hasScore = entry.score != null || entry.marks != null;
  const hasPredefined = getPredefinedLabels(entry).length > 0;
  const hasComment = Boolean(entry.comment?.trim());
  return hasScore || hasPredefined || hasComment;
}

export function filterVisibleRubrics(entries: RubricFeedbackEntry[]): RubricFeedbackEntry[] {
  return entries.filter(hasVisibleCategoryContent);
}

export interface ReviewerFeedbackFormState {
  rubricList: RubricCriterionWithFeedback[];
  scoreInputs: Record<string, string>;
  selectedPredefined: Record<string, string[]>;
  categoryComments: Record<string, string>;
  overallComment: string;
  predefinedLookup: Record<string, PredefinedFeedbackOption[]>;
}

function buildRubricEntry(
  rubric: RubricCriterionWithFeedback,
  parsed: number | null,
  selectedIds: string[],
  categoryComment: string,
  predefinedLookup: Record<string, PredefinedFeedbackOption[]>,
): RubricFeedbackEntry | null {
  const trimmedCategoryComment = categoryComment.trim();
  const options = predefinedLookup[rubric.criterion] ?? [];
  const labels = resolvePredefinedLabels(selectedIds, options);

  if (!isValidScore(parsed) && selectedIds.length === 0 && !trimmedCategoryComment) {
    return null;
  }

  const entry: RubricFeedbackEntry = {
    criterion: rubric.criterion,
    selected_option: isValidScore(parsed) ? `Score: ${parsed}` : '',
    marks: isValidScore(parsed) ? parsed : 0,
    score: isValidScore(parsed) ? parsed : null,
  };

  if (selectedIds.length > 0) {
    entry.selected_options = selectedIds;
    entry.selected_option_labels = labels;
  }
  if (trimmedCategoryComment) {
    entry.comment = trimmedCategoryComment;
  }

  return entry;
}

/** Build rubric entries for preview — includes partial/in-progress form values. */
export function buildPreviewRubrics(
  state: ReviewerFeedbackFormState,
): RubricFeedbackEntry[] {
  const entries: RubricFeedbackEntry[] = [];

  state.rubricList.forEach((rubric) => {
    const parsed = parseScoreInput(state.scoreInputs[rubric.criterion] ?? '');
    const selectedIds = state.selectedPredefined[rubric.criterion] ?? [];
    const categoryComment = state.categoryComments[rubric.criterion] ?? '';
    const entry = buildRubricEntry(
      rubric,
      parsed,
      selectedIds,
      categoryComment,
      state.predefinedLookup,
    );
    if (entry) {
      entries.push(entry);
    }
  });

  return entries;
}

export function buildPreviewFeedback(
  state: ReviewerFeedbackFormState,
  options?: { status?: SubmissionFeedback['status']; total?: number | null },
): SubmissionFeedback {
  const rubrics = buildPreviewRubrics(state);
  const visibleRubrics = filterVisibleRubrics(rubrics);
  const total = options?.total ?? visibleRubrics.reduce((sum, entry) => {
    const score = entry.score ?? entry.marks;
    return score != null ? sum + score : sum;
  }, 0);

  return {
    status: options?.status ?? 'pending',
    comment: state.overallComment,
    rubrics: visibleRubrics,
    total: visibleRubrics.length > 0 ? total : undefined,
  };
}

export interface BuildRubricPayloadResult {
  hasErrors: boolean;
  scoreErrors: Record<string, string>;
  rubricPayload: RubricFeedbackEntry[];
  total: number;
}

/** Build rubric payload for submit — enforces required valid scores per criterion. */
export function buildRubricPayload(
  state: ReviewerFeedbackFormState,
): BuildRubricPayloadResult {
  const scoreErrors: Record<string, string> = {};
  const rubricPayload: RubricFeedbackEntry[] = [];
  let total = 0;

  state.rubricList.forEach((rubric) => {
    const parsed = parseScoreInput(state.scoreInputs[rubric.criterion] ?? '');
    if (parsed === null) {
      scoreErrors[rubric.criterion] = 'Score is required.';
      return;
    }
    if (Number.isNaN(parsed)) {
      scoreErrors[rubric.criterion] = 'Enter a valid number.';
      return;
    }
    if (parsed > 10) {
      scoreErrors[rubric.criterion] = 'Score cannot be greater than 10.';
      return;
    }
    if (parsed < 0) {
      scoreErrors[rubric.criterion] = 'Score cannot be less than 0.';
      return;
    }

    total += parsed;
    const selectedIds = state.selectedPredefined[rubric.criterion] ?? [];
    const categoryComment = state.categoryComments[rubric.criterion] ?? '';
    const options = state.predefinedLookup[rubric.criterion] ?? [];
    const labels = resolvePredefinedLabels(selectedIds, options);

    const entry: RubricFeedbackEntry = {
      criterion: rubric.criterion,
      selected_option: `Score: ${parsed}`,
      marks: parsed,
      score: parsed,
    };
    if (selectedIds.length > 0) {
      entry.selected_options = selectedIds;
      entry.selected_option_labels = labels;
    }
    const trimmedCategoryComment = categoryComment.trim();
    if (trimmedCategoryComment) {
      entry.comment = trimmedCategoryComment;
    }
    rubricPayload.push(entry);
  });

  return {
    hasErrors: Object.keys(scoreErrors).length > 0,
    scoreErrors,
    rubricPayload,
    total,
  };
}

/** Hydrate reviewer form state from a stored feedback object. */
export function parseFeedbackIntoFormState(feedback: SubmissionFeedback): {
  comment: string;
  scoreInputs: Record<string, string>;
  selectedPredefined: Record<string, string[]>;
  categoryComments: Record<string, string>;
} {
  const scoreInputs: Record<string, string> = {};
  const selectedPredefined: Record<string, string[]> = {};
  const categoryComments: Record<string, string> = {};

  feedback.rubrics?.forEach((entry) => {
    if (entry.score != null) {
      scoreInputs[entry.criterion] = String(entry.score);
    } else if (entry.marks != null) {
      scoreInputs[entry.criterion] = String(entry.marks);
    }
    if (entry.selected_options?.length) {
      selectedPredefined[entry.criterion] = [...entry.selected_options];
    }
    if (entry.comment?.trim()) {
      categoryComments[entry.criterion] = entry.comment;
    }
  });

  return {
    comment: feedback.comment ?? '',
    scoreInputs,
    selectedPredefined,
    categoryComments,
  };
}
