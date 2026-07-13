import {
  normalizeFeedbacks,
  serializeFeedbacksForSave,
  splitPastedFeedbacks,
} from './rubricFeedbackUtils';

describe('normalizeFeedbacks', () => {
  it('returns empty array when feedbacks is undefined', () => {
    expect(normalizeFeedbacks(undefined)).toEqual([]);
  });

  it('returns the same array reference content when provided', () => {
    expect(normalizeFeedbacks(['A', 'B'])).toEqual(['A', 'B']);
  });
});

describe('splitPastedFeedbacks', () => {
  it('splits multiline Excel paste into separate lines in order', () => {
    const text = 'Excellent explanation.\nNeeds more examples.\nVery good work.\nImprove formatting.';
    expect(splitPastedFeedbacks(text)).toEqual([
      'Excellent explanation.',
      'Needs more examples.',
      'Very good work.',
      'Improve formatting.',
    ]);
  });

  it('handles Windows line endings', () => {
    expect(splitPastedFeedbacks('Line one\r\nLine two')).toEqual(['Line one', 'Line two']);
  });

  it('returns a single entry for single-line paste', () => {
    expect(splitPastedFeedbacks('Only one line')).toEqual(['Only one line']);
  });

  it('trims lines and drops empty lines', () => {
    expect(splitPastedFeedbacks('  A  \n\n  B  \n')).toEqual(['A', 'B']);
  });
});

describe('serializeFeedbacksForSave', () => {
  it('trims whitespace and removes blank entries', () => {
    expect(serializeFeedbacksForSave(['  hello  ', '', '   ', 'world'])).toEqual(['hello', 'world']);
  });

  it('preserves insertion order', () => {
    expect(serializeFeedbacksForSave(['B', 'A', 'C'])).toEqual(['B', 'A', 'C']);
  });

  it('does not deduplicate repeated entries', () => {
    expect(serializeFeedbacksForSave(['Repeat', 'Repeat', 'Other'])).toEqual(['Repeat', 'Repeat', 'Other']);
  });
});
