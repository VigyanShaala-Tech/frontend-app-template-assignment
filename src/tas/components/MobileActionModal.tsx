/**
 * MobileActionModal
 * In-tree fixed overlay for student confirmation dialogs on mobile / APK WebView.
 * Desktop continues to use Paragon ModalDialog (portal + 100vh centering).
 *
 * Anchored to .tas-toolbar in layout/client coordinates (position:fixed).
 * No portal, no FocusOn scroll-lock, no 50%/100vh vertical centering.
 */

import React, { useLayoutEffect, useState } from 'react';
import { useVisualViewportRect } from '../hooks/useVisualViewportRect';

const BACKDROP_Z = 70;
const SHEET_Z = 80;
const GAP = 12;
const HORIZONTAL_MARGIN = 16;
const MAX_WIDTH = 360;
const MIN_MAX_HEIGHT = 120;
const TOOLBAR_SELECTOR = '.tas-toolbar';

interface Props {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function readToolbarBottom(): number | null {
  if (typeof document === 'undefined') return null;
  const el = document.querySelector(TOOLBAR_SELECTOR);
  if (!(el instanceof HTMLElement)) return null;
  return el.getBoundingClientRect().bottom;
}

export const MobileActionModal: React.FC<Props> = ({
  isOpen,
  title,
  onClose,
  children,
}) => {
  const viewportRect = useVisualViewportRect(isOpen);
  const [toolbarBottom, setToolbarBottom] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!isOpen) {
      setToolbarBottom(null);
      return undefined;
    }

    const measure = () => setToolbarBottom(readToolbarBottom());
    measure();

    const toolbar = document.querySelector(TOOLBAR_SELECTOR);
    const ro = toolbar && typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(measure)
      : null;
    if (toolbar && ro) ro.observe(toolbar);

    window.addEventListener('resize', measure);
    const vv = window.visualViewport;
    vv?.addEventListener('resize', measure);
    vv?.addEventListener('scroll', measure);

    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
      vv?.removeEventListener('resize', measure);
      vv?.removeEventListener('scroll', measure);
    };
  }, [isOpen, viewportRect]);

  if (!isOpen) return null;

  // toolbarBottom is layout/client Y (same as position:fixed). Do not add offsetTop.
  const backdropTop = toolbarBottom ?? viewportRect.top;
  const sheetTop = backdropTop + GAP;
  const sheetW = Math.min(viewportRect.width * 0.86, MAX_WIDTH);
  const left = viewportRect.left + Math.max(
    HORIZONTAL_MARGIN,
    (viewportRect.width - sheetW) / 2,
  );
  const visualBottomClient = viewportRect.top + viewportRect.height;
  const maxH = Math.max(MIN_MAX_HEIGHT, visualBottomClient - sheetTop - GAP);

  const nodeEnv = (globalThis as { process?: { env?: { NODE_ENV?: string } } })
    .process?.env?.NODE_ENV;
  if (nodeEnv === 'development') {
    // eslint-disable-next-line no-console -- coordinate-space check during local/dev only
    console.debug('[MobileActionModal]', {
      toolbarBottom,
      offsetTop: viewportRect.top,
      sheetTop,
      backdropTop,
      left,
      maxH,
    });
  }

  return (
    <>
      <div
        role="presentation"
        onClick={onClose}
        style={{
          position: 'fixed',
          top: backdropTop,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: BACKDROP_Z,
        }}
      />
      <div
        role="dialog"
        aria-label={title}
        aria-modal="true"
        style={{
          position: 'fixed',
          left,
          top: sheetTop,
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
