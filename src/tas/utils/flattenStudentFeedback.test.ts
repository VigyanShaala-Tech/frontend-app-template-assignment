import {
  flattenStudentFeedbackLines,
  isCategoryHeadingLine,
  stripCategoryHeadingsFromComment,
} from './flattenStudentFeedback';

describe('isCategoryHeadingLine', () => {
  it('detects category headings ending with a colon', () => {
    expect(isCategoryHeadingLine('Technical Accuracy:')).toBe(true);
    expect(isCategoryHeadingLine('  Presentation:  ')).toBe(true);
  });

  it('rejects normal feedback lines', () => {
    expect(isCategoryHeadingLine('Quiz on Collaboration')).toBe(false);
    expect(isCategoryHeadingLine('Note: please revise')).toBe(false);
  });
});

describe('stripCategoryHeadingsFromComment', () => {
  it('removes plain-text category headings and keeps content', () => {
    const comment = [
      'Technical Accuracy:',
      'Quiz on Collaboration',
      '',
      'Presentation:',
      'please do it asap',
    ].join('\n');

    expect(stripCategoryHeadingsFromComment(comment)).toBe(
      'Quiz on Collaboration\nplease do it asap',
    );
  });

  it('removes Quill category heading blocks and preserves rich markup', () => {
    const html = [
      '<p><u>Technical Accuracy:</u></p>',
      '<p><strong>Quiz on Collaboration</strong></p>',
      '<p><u>Presentation:</u></p>',
      '<p><a href="https://example.com">link text</a></p>',
      '<p>please do it asap</p>',
    ].join('');

    const result = stripCategoryHeadingsFromComment(html);
    expect(result).not.toMatch(/Technical Accuracy/i);
    expect(result).not.toMatch(/Presentation/i);
    expect(result).toMatch(/<strong>Quiz on Collaboration<\/strong>/);
    expect(result).toMatch(/href="https:\/\/example\.com"/);
    expect(result).toMatch(/please do it asap/);
  });

  it('returns empty string for blank comments', () => {
    expect(stripCategoryHeadingsFromComment('')).toBe('');
    expect(stripCategoryHeadingsFromComment('   ')).toBe('');
  });
});

describe('flattenStudentFeedbackLines', () => {
  it('removes category headings and blank lines', () => {
    const comment = [
      'Technical Accuracy:',
      'Quiz on Collaboration',
      'Quiz on Creativity_Growth',
      '',
      'Presentation:',
      'Assignment on Critical_Thinking',
      'please do it assap',
    ].join('\n');

    expect(flattenStudentFeedbackLines(comment)).toEqual([
      'Quiz on Collaboration',
      'Quiz on Creativity_Growth',
      'Assignment on Critical_Thinking',
      'please do it assap',
    ]);
  });

  it('strips leading bullet markers', () => {
    expect(flattenStudentFeedbackLines('• One\n- Two\n* Three')).toEqual(['One', 'Two', 'Three']);
  });

  it('returns empty array for blank comments', () => {
    expect(flattenStudentFeedbackLines('')).toEqual([]);
    expect(flattenStudentFeedbackLines('   ')).toEqual([]);
  });

  it('strips Quill HTML and category headings', () => {
    const html = [
      '<p><u>Technical Accuracy:</u></p>',
      '<p>Quiz on Collaboration</p>',
      '<p>Quiz on Creativity_Growth</p>',
      '<p><u>Presentation:</u></p>',
      '<p>Assignment on Critical_Thinking</p>',
      '<p>please do it asap</p>',
    ].join('');

    expect(flattenStudentFeedbackLines(html)).toEqual([
      'Quiz on Collaboration',
      'Quiz on Creativity_Growth',
      'Assignment on Critical_Thinking',
      'please do it asap',
    ]);
  });
});
