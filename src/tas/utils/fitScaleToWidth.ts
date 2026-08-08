/**
 * Fit a natural-width canvas into a wrapper width, capped at 1.
 * Used for mobile TransformWrapper initialScale.
 */
export function fitScaleToWidth(
  clientWidth: number,
  naturalW: number,
  padding: number,
): number {
  if (clientWidth <= 0 || naturalW <= 0) return 1;
  return Math.min(1, (clientWidth - padding) / naturalW);
}
