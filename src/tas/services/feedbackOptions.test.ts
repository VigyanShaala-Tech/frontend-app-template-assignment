/**
 * Contract tests for predefined feedback fixtures and CategoryFeedbackConfig shape.
 * Keeps REQ-006 / REQ-002 data aligned without mounting OpenEdX UI.
 */

import { MOCK_BLOCK_FEEDBACK_OPTIONS, MOCK_BLOCK_RUBRICS } from './mockData';
import type { BlockFeedbackOptionsResponse, CategoryFeedbackConfig } from '../types';

const DEMO_USAGE_KEY = 'block-v1:Org+Course101+2024+type@format_forge+block@abc123';

describe('MOCK_BLOCK_FEEDBACK_OPTIONS', () => {
  it('includes an entry for the demo usage key', () => {
    expect(MOCK_BLOCK_FEEDBACK_OPTIONS[DEMO_USAGE_KEY]).toBeDefined();
  });

  it('matches BlockFeedbackOptionsResponse shape', () => {
    const payload: BlockFeedbackOptionsResponse = MOCK_BLOCK_FEEDBACK_OPTIONS[DEMO_USAGE_KEY];
    expect(payload.usage_key).toBe(DEMO_USAGE_KEY);
    expect(Array.isArray(payload.categories)).toBe(true);
    payload.categories.forEach((cat: CategoryFeedbackConfig) => {
      expect(typeof cat.category_id).toBe('string');
      expect(cat.category_id.length).toBeGreaterThan(0);
      expect(Array.isArray(cat.options)).toBe(true);
      cat.options.forEach((opt) => {
        expect(typeof opt.id).toBe('string');
        expect(opt.id.length).toBeGreaterThan(0);
        expect(typeof opt.label).toBe('string');
        expect(opt.label.length).toBeGreaterThan(0);
      });
    });
  });

  it('uses category_ids that match MOCK_BLOCK_RUBRICS criteria', () => {
    const rubricCriteria = new Set(
      (MOCK_BLOCK_RUBRICS.rubrics ?? []).map((r) => r.criterion),
    );
    const feedbackCategories = MOCK_BLOCK_FEEDBACK_OPTIONS[DEMO_USAGE_KEY].categories;
    feedbackCategories.forEach((cat) => {
      expect(rubricCriteria.has(cat.category_id)).toBe(true);
    });
    expect(feedbackCategories.map((c) => c.category_id).sort()).toEqual(
      [...rubricCriteria].sort(),
    );
  });

  it('uses unique option ids within and across categories', () => {
    const ids = MOCK_BLOCK_FEEDBACK_OPTIONS[DEMO_USAGE_KEY].categories.flatMap(
      (c) => c.options.map((o) => o.id),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('RubricCriterion predefined_feedback compatibility', () => {
  it('allows criteria without predefined_feedback (backward compatible)', () => {
    MOCK_BLOCK_RUBRICS.rubrics.forEach((r) => {
      expect(r.predefined_feedback).toBeUndefined();
      expect(r.criterion).toBeTruthy();
      expect(Array.isArray(r.options)).toBe(true);
    });
  });
});
