/**
 * FieldOverlay
 * Renders one positioned field on top of the template image.
 * Uses inline styles for positioning (no Tailwind/Paragon needed for absolute placement).
 */

import React from 'react';
import { useTasStore } from '../store/tasStore';
import { percentToPixels, calculateFontSize } from '../utils/positioning';
import type { FormField, FieldPosition } from '../types';

interface FieldOverlayProps {
  field: FormField;
  position: FieldPosition;
  isSelected: boolean;
  imageWidth: number;
  imageHeight: number;
  offsetX: number;
  offsetY: number;
  actualImageWidth: number;
  actualImageHeight: number;
  isReadOnly?: boolean;
}

export const FieldOverlay: React.FC<FieldOverlayProps> = ({
  field,
  position,
  isSelected,
  imageWidth,
  imageHeight,
  offsetX,
  offsetY,
  actualImageWidth,
  actualImageHeight,
  isReadOnly = false,
}) => {
  const { openFieldEditor, formData, isMobile, submission } = useTasStore();

  const px = percentToPixels(position, imageWidth, imageHeight);
  const actualPx = percentToPixels(position, actualImageWidth, actualImageHeight);
  const fontSize = calculateFontSize(actualPx.height);

  const fieldValue = formData[field.id] ?? '';
  const hasValue = fieldValue.trim().length > 0;
  const isSubmitted = submission?.status === 'submitted';
  const isInactive = isReadOnly || isSubmitted;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isInactive) openFieldEditor(field.id);
  };

  const borderColor = isInactive
    ? 'transparent'
    : isSelected
    ? '#3b82f6'
    : hasValue
    ? '#22c55e'
    : '#9ca3af';

  const borderStyle = !isInactive && !isSelected && !hasValue ? 'dashed' : 'solid';

  const bgColor = isInactive
    ? 'transparent'
    : isSelected
    ? 'rgba(59,130,246,0.1)'
    : hasValue
    ? 'rgba(34,197,94,0.08)'
    : 'rgba(255,255,255,0.15)';

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'absolute',
        left: px.x + offsetX,
        top: px.y + offsetY,
        width: px.width,
        height: px.height,
        border: `2px ${borderStyle} ${borderColor}`,
        backgroundColor: bgColor,
        cursor: isInactive ? 'default' : 'pointer',
        boxSizing: 'border-box',
        transition: 'border-color 0.15s ease, background-color 0.15s ease',
      }}
    >
      {/* Label badge above the field */}
      {!isInactive && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: isMobile ? -15 : -22,
            backgroundColor: '#2563eb',
            color: '#fff',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            borderRadius: 3,
            fontSize: isMobile ? 7 : 11,
            padding: isMobile ? '1px 3px' : '2px 6px',
            lineHeight: 1.2,
          }}
        >
          {field.label}
          {field.required && <span style={{ color: '#fca5a5', marginLeft: 2 }}>*</span>}
        </div>
      )}

      {/* Value preview */}
      {hasValue && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            fontWeight: 500,
            color: '#111827',
            lineHeight: 1.3,
            fontSize: isMobile ? fontSize * 0.55 : fontSize,
            padding: 2,
          }}
        >
          {fieldValue}
        </div>
      )}

      {/* Tap hint */}
      {!hasValue && !isInactive && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#9ca3af',
            fontSize: isMobile ? 8 : 11,
          }}
        >
          Tap to fill
        </div>
      )}
    </div>
  );
};
