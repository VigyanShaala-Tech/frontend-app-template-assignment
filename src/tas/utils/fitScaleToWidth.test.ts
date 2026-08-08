import { fitScaleToWidth } from './fitScaleToWidth';

describe('fitScaleToWidth', () => {
  it('fits natural width into the wrapper minus padding, capped at 1', () => {
    expect(fitScaleToWidth(400, 794, 16)).toBeCloseTo((400 - 16) / 794);
    expect(fitScaleToWidth(900, 794, 16)).toBe(1);
  });

  it('returns 1 for invalid dimensions', () => {
    expect(fitScaleToWidth(0, 794, 16)).toBe(1);
    expect(fitScaleToWidth(400, 0, 16)).toBe(1);
  });
});
