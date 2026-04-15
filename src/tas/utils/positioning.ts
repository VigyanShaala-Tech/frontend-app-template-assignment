import type { FieldPosition } from '../types';

export function percentToPixels(
  percent: FieldPosition,
  imageWidth: number,
  imageHeight: number,
): { x: number; y: number; width: number; height: number } {
  return {
    x: (percent.x / 100) * imageWidth,
    y: (percent.y / 100) * imageHeight,
    width: (percent.width / 100) * imageWidth,
    height: (percent.height / 100) * imageHeight,
  };
}

export function pixelsToPercent(
  pixels: { x: number; y: number; width: number; height: number },
  imageWidth: number,
  imageHeight: number,
): FieldPosition {
  return {
    x: (pixels.x / imageWidth) * 100,
    y: (pixels.y / imageHeight) * 100,
    width: (pixels.width / imageWidth) * 100,
    height: (pixels.height / imageHeight) * 100,
  };
}

export function calculateFontSize(fieldHeight: number): number {
  return Math.max(10, Math.min(20, fieldHeight * 0.6));
}
