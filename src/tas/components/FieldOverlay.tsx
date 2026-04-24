/**
 * FieldOverlay
 * Renders one positioned field on top of the template image.
 * Uses inline styles for positioning (no Tailwind/Paragon needed for absolute placement).
 */

import React, { useRef, useLayoutEffect, useState } from 'react';
import { useTasStore } from '../store/tasStore';
import { percentToPixels } from '../utils/positioning';
import type { FormField, FieldPosition } from '../types';

interface FieldOverlayProps {
  field: FormField;
  position: FieldPosition;
  isSelected: boolean;
  imageWidth?: number;
  imageHeight?: number;
  offsetX?: number;
  offsetY?: number;
  actualImageWidth: number;
  actualImageHeight: number;
  isReadOnly?: boolean;
}

/** Shrinks font size by up to two steps if content overflows the container. */
function useAutoFontSize(
  containerRef: React.RefObject<HTMLDivElement>,
  baseFontSize: number,
  value: string,
): number {
  const [fontSize, setFontSize] = useState(baseFontSize);

  useLayoutEffect(() => {
    setFontSize(baseFontSize);
  }, [baseFontSize, value]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || !value) return;

    if (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth) {
      const smaller = baseFontSize - 2;
      if (smaller >= 8) setFontSize(smaller);
    }
  });

  return fontSize;
}

export const FieldOverlay: React.FC<FieldOverlayProps> = ({
  field,
  position,
  isSelected,
  actualImageWidth,
  actualImageHeight,
  isReadOnly = false,
}) => {
  const { openFieldEditor, formData, isMobile, submission } = useTasStore();
  const valueRef = useRef<HTMLDivElement>(null);

  const actualPx = percentToPixels(position, actualImageWidth, actualImageHeight);
  const baseFontSize = field.fontSize ?? Math.max(10, Math.min(20, actualPx.height * 0.6));

  const maxChars = field.maxChars ?? 60;
  const rawValue = formData[field.id] ?? '';
  const fieldValue = rawValue.slice(0, maxChars);
  const hasValue = fieldValue.trim().length > 0;
  const isSubmitted = submission?.status === 'submitted';
  const isInactive = isReadOnly || isSubmitted;

  const displayFontSize = useAutoFontSize(valueRef, isMobile ? baseFontSize * 0.55 : baseFontSize, fieldValue);

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
        left: `${position.x}%`,
        top: `${position.y}%`,
        width: `${position.width}%`,
        height: `${position.height}%`,
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
          ref={valueRef}
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            fontWeight: 500,
            color: '#111827',
            lineHeight: 1.3,
            fontSize: displayFontSize,
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
