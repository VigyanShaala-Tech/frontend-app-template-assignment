import type { FieldLayoutMetrics } from './fieldLayout';
import {
  applyTextCandidate,
  clampFormDataToFields,
  clampTextToLongestPrefix,
} from './clampTextToField';

const layout: FieldLayoutMetrics = {
  fieldId: 'f1',
  boxWidth: 100,
  boxHeight: 40,
  contentWidth: 96,
  contentHeight: 36,
  fontSize: 12,
  fontFamily: 'Helvetica, Arial, sans-serif',
  fontWeight: 400,
  lineHeight: 1.3,
  padding: 2,
  color: '#111827',
};

describe('clampTextToLongestPrefix', () => {
  it('returns full text when it fits', () => {
    const fits = (text: string) => text.length <= 10;
    expect(clampTextToLongestPrefix('hello', layout, fits)).toBe('hello');
  });

  it('clamps paste overflow to longest fitting prefix', () => {
    const fits = (text: string) => text.length <= 5;
    expect(clampTextToLongestPrefix('abcdefghij', layout, fits)).toBe('abcde');
  });

  it('handles long unbroken strings via prefix length', () => {
    const fits = (text: string) => text.length <= 8;
    const long = 'y'.repeat(40);
    expect(clampTextToLongestPrefix(long, layout, fits)).toBe('y'.repeat(8));
  });

  it('returns empty when even one character does not fit', () => {
    const fits = () => false;
    expect(clampTextToLongestPrefix('abc', layout, fits)).toBe('');
  });
});

describe('applyTextCandidate', () => {
  const fits = (text: string) => text.length <= 5;

  it('accepts fitting text', () => {
    const result = applyTextCandidate('hi', 'hello', layout, fits);
    expect(result).toEqual({ value: 'hello', capacityFull: false, rejected: false });
  });

  it('rejects a single overflowing character and keeps previous', () => {
    const result = applyTextCandidate('hello', 'hello!', layout, fits);
    expect(result.value).toBe('hello');
    expect(result.capacityFull).toBe(true);
    expect(result.rejected).toBe(true);
  });

  it('clamps paste that only partially fits', () => {
    const result = applyTextCandidate('', 'abcdefghij', layout, fits);
    expect(result.value).toBe('abcde');
    expect(result.capacityFull).toBe(true);
    expect(result.rejected).toBe(false);
  });

  it('clears capacity warning when deleting text so it fits again', () => {
    const result = applyTextCandidate('hello', 'hel', layout, fits);
    expect(result).toEqual({ value: 'hel', capacityFull: false, rejected: false });
  });
});

describe('clampFormDataToFields', () => {
  it('clamps overflowing stored values before submit', () => {
    const fits = (text: string) => text.length <= 3;
    const { formData, capacityFull } = clampFormDataToFields(
      { f1: 'abcdef', f2: 'ok' },
      { f1: layout },
      fits,
    );
    expect(formData.f1).toBe('abc');
    expect(formData.f2).toBe('ok');
    expect(capacityFull.f1).toBe(true);
  });
});
