/**
 * Validation helpers for category criteria marks in Manage Rubrics.
 * Each category's options[].marks must sum to exactly 10.
 */

import type { RubricOption } from '../types';

export const CATEGORY_MARKS_TARGET = 10;

export function sumCategoryMarks(options: RubricOption[]): number {
  return options.reduce((sum, option) => {
    const marks = Number(option.marks);
    return sum + (Number.isFinite(marks) ? marks : 0);
  }, 0);
}

export interface CategoryMarksValidation {
  total: number;
  isValid: boolean;
  error: string | null;
}

export function validateCategoryMarks(options: RubricOption[]): CategoryMarksValidation {
  const total = sumCategoryMarks(options);

  if (total > CATEGORY_MARKS_TARGET) {
    return {
      total,
      isValid: false,
      error: 'The total marks for this category cannot exceed 10.',
    };
  }

  if (total < CATEGORY_MARKS_TARGET) {
    return {
      total,
      isValid: false,
      error: `The total marks for this category must equal 10. Current total: ${total} / 10.`,
    };
  }

  return {
    total,
    isValid: true,
    error: null,
  };
}

export function hasInvalidCategoryMarks(
  criteria: { options: RubricOption[] }[],
): boolean {
  return criteria.some((category) => !validateCategoryMarks(category.options).isValid);
}
