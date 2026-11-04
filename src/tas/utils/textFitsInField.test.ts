import type { FieldLayoutMetrics } from './fieldLayout';
import {
  resolveFittingFontSize,
  textFitsAtMinimumFont,
  textFitsInField,
} from './textFitsInField';

const layout: FieldLayoutMetrics = {
  fieldId: 'f1',
  boxWidth: 80,
  boxHeight: 30,
  contentWidth: 76,
  contentHeight: 26,
  fontSize: 12,
  fontFamily: 'Helvetica, Arial, sans-serif',
  fontWeight: 400,
  lineHeight: 1.3,
  padding: 2,
  color: '#111827',
};

describe('textFitsInField', () => {
  afterEach(() => {
    const probe = document.getElementById('tas-field-fit-probe');
    if (probe) probe.remove();
  });

  it('returns true for empty text', () => {
    expect(textFitsInField('', layout)).toBe(true);
  });

  it('returns true when probe reports no overflow', () => {
    // First call creates the probe; then override scroll metrics.
    textFitsInField('x', layout);
    const probe = document.getElementById('tas-field-fit-probe') as HTMLDivElement;
    Object.defineProperty(probe, 'scrollHeight', { configurable: true, get: () => 20 });
    Object.defineProperty(probe, 'scrollWidth', { configurable: true, get: () => 40 });
    expect(textFitsInField('hello', layout)).toBe(true);
  });

  it('returns false when probe height overflows', () => {
    textFitsInField('x', layout);
    const probe = document.getElementById('tas-field-fit-probe') as HTMLDivElement;
    Object.defineProperty(probe, 'scrollHeight', { configurable: true, get: () => 100 });
    Object.defineProperty(probe, 'scrollWidth', { configurable: true, get: () => 40 });
    expect(textFitsInField('too much text', layout)).toBe(false);
  });

  it('returns false when probe width overflows', () => {
    textFitsInField('x', layout);
    const probe = document.getElementById('tas-field-fit-probe') as HTMLDivElement;
    Object.defineProperty(probe, 'scrollHeight', { configurable: true, get: () => 20 });
    Object.defineProperty(probe, 'scrollWidth', { configurable: true, get: () => 200 });
    expect(textFitsInField('yyyyyyyyyyyyyyyyyyyy', layout)).toBe(false);
  });
});

describe('resolveFittingFontSize', () => {
  const baseLayout: FieldLayoutMetrics = { ...layout, fontSize: 8 };

  it('returns the base size for empty text without measuring', () => {
    const fits = jest.fn(() => false);
    expect(resolveFittingFontSize('', baseLayout, fits)).toBe(8);
    expect(fits).not.toHaveBeenCalled();
    expect(baseLayout.fontSize).toBe(8);
  });

  it('keeps the base size when the text fits', () => {
    const fits = (_text: string, candidate: FieldLayoutMetrics) => candidate.fontSize <= 8;
    expect(resolveFittingFontSize('hi', baseLayout, fits)).toBe(8);
    expect(baseLayout.fontSize).toBe(8);
  });

  it('steps down only as far as needed', () => {
    const fits = (_text: string, candidate: FieldLayoutMetrics) => candidate.fontSize <= 5;
    expect(resolveFittingFontSize('long', baseLayout, fits)).toBe(5);
  });

  it('uses a larger size again when the text is shortened', () => {
    const longFits = (_text: string, candidate: FieldLayoutMetrics) => candidate.fontSize <= 5;
    const shortFits = (_text: string, candidate: FieldLayoutMetrics) => candidate.fontSize <= 8;
    expect(resolveFittingFontSize('long response', baseLayout, longFits)).toBe(5);
    expect(resolveFittingFontSize('short', baseLayout, shortFits)).toBe(8);
  });

  it('never exceeds a base of 4', () => {
    const small = { ...baseLayout, fontSize: 4 };
    expect(resolveFittingFontSize('a', small, () => true)).toBe(4);
    expect(small.fontSize).toBe(4);
  });

  it('returns 1 when only 1px fits', () => {
    const fits = (_text: string, candidate: FieldLayoutMetrics) => candidate.fontSize <= 1;
    expect(resolveFittingFontSize('long', baseLayout, fits)).toBe(1);
  });

  it('returns 1 when even 1px does not fit', () => {
    expect(resolveFittingFontSize('long', baseLayout, () => false)).toBe(1);
    expect(baseLayout.fontSize).toBe(8);
  });

  it('returns a non-integer base when the text fits at that size', () => {
    const fractional = { ...baseLayout, fontSize: 12.5 };
    const fits = (_text: string, candidate: FieldLayoutMetrics) => candidate.fontSize <= 12.5;
    expect(resolveFittingFontSize('a', fractional, fits)).toBe(12.5);
  });

  it('searches integers below a non-integer base', () => {
    const fractional = { ...baseLayout, fontSize: 12.5 };
    const fits = (_text: string, candidate: FieldLayoutMetrics) => candidate.fontSize <= 12;
    expect(resolveFittingFontSize('a', fractional, fits)).toBe(12);
  });

  it('checks capacity at 1px and does not change the base size', () => {
    const seen: number[] = [];
    const fits = (_text: string, candidate: FieldLayoutMetrics) => {
      seen.push(candidate.fontSize);
      return true;
    };
    expect(textFitsAtMinimumFont('abc', baseLayout, fits)).toBe(true);
    expect(seen).toEqual([1]);
    expect(baseLayout.fontSize).toBe(8);
  });
});
