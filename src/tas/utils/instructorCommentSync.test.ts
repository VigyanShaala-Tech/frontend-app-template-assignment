import {
  buildInstructorComment,
  formatCategoryFeedbacks,
  orderSelectedFeedbacks,
  parseInstructorCommentSections,
  updateCategorySection,
} from './instructorCommentSync';

const categories = ['Hypothesis', 'Methodology', 'Results & Analysis'];
const hypothesisFeedbacks = [
  'Excellent hypothesis.',
  'Strong problem statement.',
  'Good literature review.',
];
const methodologyFeedbacks = [
  'Well-designed methodology.',
  'Appropriate experimental approach.',
];

describe('instructorCommentSync', () => {
  it('builds and parses a multi-category comment', () => {
    const sections = {
      Hypothesis: 'Excellent hypothesis and problem statement.',
      Methodology: 'Good methodology. Experimental design is sound.',
      'Results & Analysis': 'Results are well interpreted.',
    };
    const comment = buildInstructorComment('', sections, categories);

    expect(comment).toBe(
      'Hypothesis:\nExcellent hypothesis and problem statement.\n\n'
      + 'Methodology:\nGood methodology. Experimental design is sound.\n\n'
      + 'Results & Analysis:\nResults are well interpreted.',
    );

    const parsed = parseInstructorCommentSections(comment, categories);
    expect(parsed.sections).toEqual(sections);
  });

  it('formats multiple feedbacks on separate lines in rubric order', () => {
    const body = formatCategoryFeedbacks(
      ['Good literature review.', 'Excellent hypothesis.'],
      hypothesisFeedbacks,
    );

    expect(body).toBe('Excellent hypothesis.\nGood literature review.');
  });

  it('updateCategorySection changes only the target category with multiple feedbacks', () => {
    const initial = buildInstructorComment('', {
      Hypothesis: formatCategoryFeedbacks(
        ['Excellent hypothesis.', 'Strong problem statement.'],
        hypothesisFeedbacks,
      ),
      Methodology: 'First methodology feedback.',
    }, categories);

    const updated = updateCategorySection(
      initial,
      'Methodology',
      categories,
      ['Well-designed methodology.', 'Appropriate experimental approach.'],
      methodologyFeedbacks,
    );

    expect(updated).toContain('Excellent hypothesis.');
    expect(updated).toContain('Strong problem statement.');
    expect(updated).toContain('Well-designed methodology.');
    expect(updated).toContain('Appropriate experimental approach.');
    expect(updated).not.toContain('First methodology feedback.');
  });

  it('removes only deselected feedback from a category section', () => {
    const initial = buildInstructorComment('', {
      Hypothesis: formatCategoryFeedbacks(
        ['Excellent hypothesis.', 'Strong problem statement.', 'Good literature review.'],
        hypothesisFeedbacks,
      ),
    }, categories);

    const updated = updateCategorySection(
      initial,
      'Hypothesis',
      categories,
      ['Excellent hypothesis.', 'Good literature review.'],
      hypothesisFeedbacks,
    );

    expect(updated).toContain('Excellent hypothesis.');
    expect(updated).toContain('Good literature review.');
    expect(updated).not.toContain('Strong problem statement.');
  });

  it('omits a category section when all feedbacks are cleared', () => {
    const initial = buildInstructorComment('', {
      Hypothesis: 'Excellent hypothesis.',
      Methodology: 'Good methodology.',
    }, categories);

    const updated = updateCategorySection(initial, 'Hypothesis', categories, [], hypothesisFeedbacks);

    expect(updated).toBe('Methodology:\nGood methodology.');
  });

  it('preserves preamble text outside managed sections', () => {
    const initial = 'Overall note.\n\nHypothesis:\nGreat work.';

    const updated = updateCategorySection(
      initial,
      'Hypothesis',
      categories,
      ['Excellent hypothesis.'],
      hypothesisFeedbacks,
    );

    expect(updated).toContain('Overall note.');
    expect(updated).toContain('Excellent hypothesis.');
    expect(updated).not.toContain('Great work.');
  });

  it('orders selected feedbacks by rubric definition', () => {
    expect(orderSelectedFeedbacks(
      hypothesisFeedbacks,
      ['Good literature review.', 'Excellent hypothesis.'],
    )).toEqual(['Excellent hypothesis.', 'Good literature review.']);
  });
});
