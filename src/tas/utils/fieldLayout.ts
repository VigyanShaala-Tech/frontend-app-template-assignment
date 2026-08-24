/**
 * Canonical field text layout for template overlay, fit-checking, and print HTML.
 * Must stay aligned with tas_integration/tas_app/pdf_generator.py:
 * fontSize ?? max(10, min(20, h * 0.6)), padding 2px, line-height 1.3,
 * pre-wrap / overflow-wrap:anywhere / word-break:break-word, overflow hidden.
 * Stored PDFs embed bundled Liberation Sans Regular (Arial-metric), not a host OS font.
 */

import type { CSSProperties } from 'react';
import type { FieldPosition, FormField } from '../types';
import { calculateFontSize, percentToPixels } from './positioning';

export const FIELD_TEXT_FONT_FAMILY = 'Helvetica, Arial, sans-serif';
export const FIELD_TEXT_FONT_WEIGHT = 400;
export const FIELD_TEXT_LINE_HEIGHT = 1.3;
export const FIELD_TEXT_PADDING_PX = 2;
export const FIELD_TEXT_COLOR = '#111827';

export interface FieldLayoutMetrics {
  fieldId: string;
  boxWidth: number;
  boxHeight: number;
  contentWidth: number;
  contentHeight: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  lineHeight: number;
  padding: number;
  color: string;
}

export function resolveFieldFontSize(field: FormField, fieldHeightPx: number): number {
  return field.fontSize ?? calculateFontSize(fieldHeightPx);
}

export function resolveFieldLayout(
  field: FormField,
  position: FieldPosition,
  imageWidth: number,
  imageHeight: number,
): FieldLayoutMetrics {
  const box = percentToPixels(position, imageWidth, imageHeight);
  const padding = FIELD_TEXT_PADDING_PX;
  const fontSize = resolveFieldFontSize(field, box.height);

  return {
    fieldId: field.id,
    boxWidth: box.width,
    boxHeight: box.height,
    contentWidth: Math.max(0, box.width - padding * 2),
    contentHeight: Math.max(0, box.height - padding * 2),
    fontSize,
    fontFamily: FIELD_TEXT_FONT_FAMILY,
    fontWeight: FIELD_TEXT_FONT_WEIGHT,
    lineHeight: FIELD_TEXT_LINE_HEIGHT,
    padding,
    color: FIELD_TEXT_COLOR,
  };
}

/** CSS styles shared by FieldOverlay value text and the off-DOM fit probe. */
export function fieldTextStyle(layout: FieldLayoutMetrics): CSSProperties {
  return {
    fontFamily: layout.fontFamily,
    fontWeight: layout.fontWeight,
    fontSize: layout.fontSize,
    lineHeight: layout.lineHeight,
    color: layout.color,
    padding: layout.padding,
    boxSizing: 'border-box',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
  };
}
