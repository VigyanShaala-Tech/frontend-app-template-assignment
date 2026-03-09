/**
 * FieldOverlay
 * Renders one positioned field on top of the template image.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useTasStore } from '../store/tasStore';
import { percentToPixels, calculateFontSize } from '../utils/positioning';
import type { FormField, FieldPosition } from '../types';

interface FieldOverlayProps {
  field: FormField;
  position: FieldPosition;
  isSelected: boolean;
  /** Displayed image width / height in px (after object-contain scaling) */
  imageWidth: number;
  imageHeight: number;
  /** Pixel offset of image within its container */
  offsetX: number;
  offsetY: number;
  /** Actual original image dimensions (for font-size consistency) */
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

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isReadOnly && !isSubmitted) {
      openFieldEditor(field.id);
    }
  };

  return (
    <motion.div
      layout
      onClick={handleClick}
      className={[
        'absolute border-2 transition-colors',
        isReadOnly || isSubmitted
          ? 'cursor-default border-transparent'
          : 'cursor-pointer hover:border-blue-400',
        isSelected
          ? 'border-blue-500 bg-blue-50/40'
          : hasValue
          ? 'border-green-400 bg-green-50/30'
          : 'border-dashed border-gray-400/60 bg-white/20',
      ].join(' ')}
      style={{
        left: px.x + offsetX,
        top: px.y + offsetY,
        width: px.width,
        height: px.height,
      }}
    >
      {/* Label */}
      {!isReadOnly && !isSubmitted && (
        <div
          className="absolute left-0 bg-blue-600 text-white font-medium whitespace-nowrap rounded"
          style={{
            fontSize: isMobile ? 7 : 11,
            top: isMobile ? -15 : -22,
            padding: isMobile ? '1px 3px' : '2px 6px',
            lineHeight: 1.2,
          }}
        >
          {field.label}
          {field.required && <span className="text-red-300 ml-0.5">*</span>}
        </div>
      )}

      {/* Value preview */}
      {hasValue && (
        <div
          className="absolute inset-0 overflow-hidden font-medium text-gray-900 leading-tight"
          style={{ fontSize: isMobile ? fontSize * 0.55 : fontSize, padding: 2 }}
        >
          {fieldValue}
        </div>
      )}

      {/* Empty placeholder tap hint */}
      {!hasValue && !isReadOnly && !isSubmitted && (
        <div
          className="absolute inset-0 flex items-center justify-center text-gray-400"
          style={{ fontSize: isMobile ? 8 : 11 }}
        >
          Tap to fill
        </div>
      )}
    </motion.div>
  );
};
