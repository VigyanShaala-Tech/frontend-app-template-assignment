import type { VisualViewportRect } from '../hooks/useVisualViewportRect';

export const VIEWPORT_MARGIN = 12;

export interface Point {
  x: number;
  y: number;
}

export interface DragConstraints {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Default top-left anchor within the visual viewport (before drag offset). */
export function getDefaultAnchor(
  viewport: VisualViewportRect,
  modalW: number,
  modalH: number,
  margin = VIEWPORT_MARGIN,
): Point {
  const maxX = Math.max(margin, viewport.width - margin - modalW);
  const maxY = Math.max(margin, viewport.height - margin - modalH);
  const x = clamp((viewport.width - modalW) / 2, margin, maxX);
  const y = clamp(viewport.height * 0.25, margin, maxY);
  return { x, y };
}

/**
 * Framer Motion drag constraint offsets relative to the modal's rest position.
 * Ensures the modal stays within [margin, viewport - margin] on all sides.
 */
export function getDragConstraints(
  viewport: VisualViewportRect,
  modalW: number,
  modalH: number,
  anchor: Point,
  margin = VIEWPORT_MARGIN,
): DragConstraints {
  const left = margin - anchor.x;
  const top = margin - anchor.y;
  const right = viewport.width - margin - modalW - anchor.x;
  const bottom = viewport.height - margin - modalH - anchor.y;
  return {
    left,
    top,
    right: Math.max(left, right),
    bottom: Math.max(top, bottom),
  };
}

export function clampOffsetToConstraints(
  offset: Point,
  constraints: DragConstraints,
): Point {
  return {
    x: clamp(offset.x, constraints.left, constraints.right),
    y: clamp(offset.y, constraints.top, constraints.bottom),
  };
}
