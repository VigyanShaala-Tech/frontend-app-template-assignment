/**
 * MobileActionModal
 * In-tree fixed overlay for student confirmation dialogs on mobile / APK WebView.
 * Desktop continues to use Paragon ModalDialog (portal + 100vh centering).
 *
 * Pattern matches FieldEditorPopup MobileFloatingPopup: position:fixed + visualViewport,
 * no portal, no FocusOn scroll-lock. z-index sits above the toolbar (60).
 */

import React, { useLayoutEffect, useRef, useState } from 'react';
import { useVisualViewportRect } from '../hooks/useVisualViewportRect';

const BACKDROP_Z = 70;
const SHEET_Z = 80;
const MARGIN = 16;
const MAX_WIDTH = 360;

interface Props {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const MobileActionModal: React.FC<Props> = ({
  isOpen,
  title,
  onClose,
  children,
}) => {
  const viewportRect = useVisualViewportRect(isOpen);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [sheetSize, setSheetSize] = useState({ width: 280, height: 200 });

  useLayoutEffect(() => {
    if (!isOpen) return undefined;
    const el = sheetRef.current;
    if (!el) return undefined;

    const updateSize = () => {
      setSheetSize({ width: el.offsetWidth, height: el.offsetHeight });
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isOpen, title]);

  if (!isOpen) return null;

  const maxH = Math.max(0, viewportRect.height - MARGIN * 2);
  const sheetW = Math.min(viewportRect.width * 0.86, MAX_WIDTH);
  const sheetH = Math.min(sheetSize.height, maxH);
  const left = viewportRect.left + Math.max(
    MARGIN,
    (viewportRect.width - sheetW) / 2,
  );
  const top = viewportRect.top + Math.max(
    MARGIN,
    (viewportRect.height - sheetH) / 2,
  );

  return (
    <>
      <div
        role="presentation"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: BACKDROP_Z,
        }}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-label={title}
        aria-modal="true"
        style={{
          position: 'fixed',
          left,
          top,
          width: '86vw',
          maxWidth: MAX_WIDTH,
          maxHeight: maxH,
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 8px 40px rgba(0, 0, 0, 0.18)',
          zIndex: SHEET_Z,
          overflowY: 'auto',
          overflowX: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 28,
            height: 28,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: 'transparent',
            color: '#6b7280',
            fontSize: 20,
            lineHeight: 1,
            cursor: 'pointer',
            borderRadius: 8,
            padding: 0,
            zIndex: 1,
          }}
        >
          ×
        </button>
        <div
          style={{
            position: 'relative',
            padding: '16px 12px 16px',
            paddingRight: 36,
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
};
