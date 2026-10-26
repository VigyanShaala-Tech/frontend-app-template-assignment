/**
 * Determines whether text fits inside a template field box using the same
 * typography/wrapping rules as FieldOverlay (off-DOM measurement probe).
 */

import type { FieldLayoutMetrics } from './fieldLayout';
import { fieldTextStyle } from './fieldLayout';

/** Smallest display size. The instructor base size is still the maximum. */
export const MIN_FIELD_FONT_SIZE = 1;

const PROBE_ID = 'tas-field-fit-probe';

export type TextFitsFn = (text: string, layout: FieldLayoutMetrics) => boolean;

/** Copy of a layout at a candidate display size. Does not change the source layout. */
export function layoutAtFontSize(layout: FieldLayoutMetrics, fontSize: number): FieldLayoutMetrics {
  return { ...layout, fontSize };
}

function getProbe(): HTMLDivElement | null {
  if (typeof document === 'undefined') return null;

  let probe = document.getElementById(PROBE_ID) as HTMLDivElement | null;
  if (!probe) {
    probe = document.createElement('div');
    probe.id = PROBE_ID;
    probe.setAttribute('aria-hidden', 'true');
    probe.style.position = 'absolute';
    probe.style.left = '-10000px';
    probe.style.top = '0';
    probe.style.visibility = 'hidden';
    probe.style.pointerEvents = 'none';
    probe.style.zIndex = '-1';
    document.body.appendChild(probe);
  }
  return probe;
}

function applyProbeLayout(probe: HTMLDivElement, layout: FieldLayoutMetrics): void {
  const styles = fieldTextStyle(layout);
  probe.style.width = `${layout.boxWidth}px`;
  probe.style.height = `${layout.boxHeight}px`;
  probe.style.overflow = 'hidden';
  probe.style.fontFamily = String(styles.fontFamily ?? '');
  probe.style.fontWeight = String(styles.fontWeight ?? '');
  probe.style.fontSize = `${layout.fontSize}px`;
  probe.style.lineHeight = String(styles.lineHeight ?? '');
  probe.style.color = String(styles.color ?? '');
  probe.style.padding = `${layout.padding}px`;
  probe.style.boxSizing = 'border-box';
  probe.style.whiteSpace = 'pre-wrap';
  probe.style.overflowWrap = 'anywhere';
  probe.style.wordBreak = 'break-word';
}

/**
 * Returns true when `text` renders fully inside the field box
 * (no vertical or horizontal overflow under canonical styles).
 */
export function textFitsInField(text: string, layout: FieldLayoutMetrics): boolean {
  if (!text) return true;
  if (layout.contentWidth <= 0 || layout.contentHeight <= 0) return false;

  const probe = getProbe();
  if (!probe) {
    // SSR / non-DOM: be permissive; submit path still clamps when DOM is available.
    return true;
  }

  applyProbeLayout(probe, layout);
  probe.textContent = text;

  // Allow 1px tolerance for sub-pixel rounding differences across browsers.
  const fitsHeight = probe.scrollHeight <= layout.boxHeight + 1;
  const fitsWidth = probe.scrollWidth <= layout.boxWidth + 1;
  return fitsHeight && fitsWidth;
}

/**
 * True when `text` fits at the minimum display size (1px).
 * Capacity checks use this so a smaller size can still accept the text.
 * The layout's own fontSize (the instructor base) is left unchanged.
 */
export function textFitsAtMinimumFont(
  text: string,
  layout: FieldLayoutMetrics,
  fits: TextFitsFn = textFitsInField,
): boolean {
  return fits(text, layoutAtFontSize(layout, MIN_FIELD_FONT_SIZE));
}

/**
 * Largest font size at which `text` fits, from 1px through `layout.fontSize`.
 * `layout.fontSize` is the instructor base and is never written back.
 * Empty text uses the base size. If nothing fits, the result is 1px
 * (or the base itself when the base is already at or below 1px).
 */
export function resolveFittingFontSize(
  text: string,
  layout: FieldLayoutMetrics,
  fits: TextFitsFn = textFitsInField,
): number {
  const base = layout.fontSize;
  if (!text) return base;
  if (!(base > MIN_FIELD_FONT_SIZE)) return base;
  if (fits(text, layoutAtFontSize(layout, base))) return base;

  const floored = Math.floor(base);
  let hi = floored >= base ? floored - 1 : floored;
  if (hi < MIN_FIELD_FONT_SIZE) return MIN_FIELD_FONT_SIZE;

  let lo = MIN_FIELD_FONT_SIZE;
  let best = MIN_FIELD_FONT_SIZE;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (fits(text, layoutAtFontSize(layout, mid))) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}
