import {
  htmlToPlainText,
  looksLikeHtml,
  normalizeEditorHtml,
  plainTextToHtml,
} from './commentHtmlAdapter';

describe('commentHtmlAdapter', () => {
  it('detects HTML vs plain text', () => {
    expect(looksLikeHtml('<p>Hello</p>')).toBe(true);
    expect(looksLikeHtml('Hypothesis:\nfoo')).toBe(false);
  });

  it('round-trips plain category blocks through HTML', () => {
    const plain = 'Hypothesis:\nClear rationale\n\nMethodology:\nValid design';
    const html = plainTextToHtml(plain);
    expect(html).toContain('<p>');
    expect(htmlToPlainText(html).replace(/\r/g, '')).toContain('Hypothesis:');
    expect(htmlToPlainText(html)).toContain('Clear rationale');
    expect(htmlToPlainText(html)).toContain('Methodology:');
  });

  it('normalizes empty Quill documents to empty string', () => {
    expect(normalizeEditorHtml('<p><br></p>')).toBe('');
    expect(normalizeEditorHtml('<p></p>')).toBe('');
    expect(normalizeEditorHtml('<p>Keep me</p>')).toBe('<p>Keep me</p>');
  });

  it('leaves plain text unchanged in htmlToPlainText', () => {
    const plain = 'specificity:\nVideo % : What is SMART goal?';
    expect(htmlToPlainText(plain)).toBe(plain);
  });
});
