/**
 * FieldEditorPopup
 * Floating draggable modal on mobile, centered modal on desktop.
 * Renders the correct input type based on field.type.
 */

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  motion,
  AnimatePresence,
  useDragControls,
  useMotionValue,
} from 'framer-motion';
import { useVisualViewportRect } from '../hooks/useVisualViewportRect';
import type { VisualViewportRect } from '../hooks/useVisualViewportRect';
import { useTasStore } from '../store/tasStore';
import type { FormField } from '../types';
import {
  clampOffsetToConstraints,
  getDefaultAnchor,
  getDragConstraints,
  type Point,
} from '../utils/mobilePopupConstraints';

interface Props {
  field: FormField | null;
  fields: FormField[];
}

const handleInputFocus = (e: React.FocusEvent<HTMLElement>) => {
  e.target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
};

interface MobileFloatingPopupProps {
  viewportRect: VisualViewportRect;
  fieldId: string;
  children: React.ReactNode;
}

const MobileFloatingPopup: React.FC<MobileFloatingPopupProps> = ({
  viewportRect,
  fieldId,
  children,
}) => {
  const dragControls = useDragControls();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const modalRef = useRef<HTMLDivElement>(null);
  const [modalSize, setModalSize] = useState({ width: 280, height: 200 });
  const [anchor, setAnchor] = useState<Point>({ x: 12, y: 12 });

  useLayoutEffect(() => {
    const el = modalRef.current;
    if (!el) return undefined;

    const updateSize = () => {
      setModalSize({ width: el.offsetWidth, height: el.offsetHeight });
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fieldId]);

  useLayoutEffect(() => {
    const el = modalRef.current;
    if (!el) return;
    const { offsetWidth: w, offsetHeight: h } = el;
    setAnchor(getDefaultAnchor(viewportRect, w, h));
    x.set(0);
    y.set(0);
    // Reset anchor/offset only when a field editor opens (fieldId), not on viewport resize.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldId, x, y]);

  const dragConstraints = useMemo(
    () => getDragConstraints(viewportRect, modalSize.width, modalSize.height, anchor),
    [viewportRect, modalSize.width, modalSize.height, anchor],
  );

  useEffect(() => {
    const constraints = getDragConstraints(
      viewportRect,
      modalSize.width,
      modalSize.height,
      anchor,
    );
    const clamped = clampOffsetToConstraints({ x: x.get(), y: y.get() }, constraints);
    x.set(clamped.x);
    y.set(clamped.y);
  }, [viewportRect, modalSize.width, modalSize.height, anchor, x, y]);

  return (
    <>
      <motion.div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        ref={modalRef}
        drag
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        dragElastic={0}
        dragConstraints={dragConstraints}
        style={{
          x,
          y,
          position: 'fixed',
          left: viewportRect.left + anchor.x,
          top: viewportRect.top + anchor.y,
          width: '86vw',
          maxWidth: 300,
          maxHeight: viewportRect.height - 24,
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          zIndex: 50,
          overflowY: 'auto',
          overflowX: 'hidden',
          boxSizing: 'border-box',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        <div
          role="button"
          tabIndex={-1}
          aria-label="Drag to move popup"
          onPointerDown={(e) => dragControls.start(e)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '6px 12px 4px',
            cursor: 'grab',
            touchAction: 'none',
            userSelect: 'none',
            color: '#9ca3af',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.02em',
          }}
        >
          <span style={{ fontSize: 13, lineHeight: 1, color: '#c4c9d4' }}>⠿</span>
          Drag to move
        </div>
        {children}
      </motion.div>
    </>
  );
};

export const FieldEditorPopup: React.FC<Props> = ({ field, fields }) => {
  const {
    isFieldEditorOpen,
    closeFieldEditor,
    openFieldEditor,
    formData,
    setFormValue,
    isMobile,
  } = useTasStore();

  const viewportRect = useVisualViewportRect(isFieldEditorOpen && isMobile);

  const currentIndex = field ? fields.findIndex((f) => f.id === field.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < fields.length - 1;

  const [localValue, setLocalValue] = React.useState('');

  useEffect(() => {
    if (field) setLocalValue(formData[field.id] ?? '');
  }, [field, formData]);

  if (!field || !isFieldEditorOpen) return null;

  const saveAndNavigate = (targetField: FormField) => {
    setFormValue(field.id, localValue);
    openFieldEditor(targetField.id);
  };

  const handleSaveAndNext = () => {
    setFormValue(field.id, localValue);
    if (hasNext) {
      openFieldEditor(fields[currentIndex + 1].id);
    } else {
      closeFieldEditor();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && field.type !== 'textarea') {
      handleSaveAndNext();
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    borderRadius: 10,
    border: '1.5px solid #d1d5db',
    padding: isMobile ? '8px 10px' : '12px 14px',
    fontSize: isMobile ? 13 : 15,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    color: '#111827',
    background: '#f9fafb',
    transition: 'border-color 0.15s',
  };

  const maxChars = field.maxChars ?? 60;

  const handleChange = (value: string) => {
    setLocalValue(value.slice(0, maxChars));
  };

  const renderInput = () => {
    switch (field.type) {
      case 'select':
        return (
          <select
            style={{ ...inputStyle, cursor: 'pointer' }}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onFocus={handleInputFocus}
          >
            <option value="">-- Select --</option>
            {(field.options ?? []).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      case 'date':
        return (
          <input
            type="date"
            style={inputStyle}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            autoFocus
          />
        );
      case 'number':
        return (
          <input
            type="number"
            style={inputStyle}
            placeholder={field.placeholder || `Enter ${field.label}`}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            autoFocus
          />
        );
      default:
        return (
          <>
            <textarea
              style={{
                ...inputStyle,
                minHeight: isMobile ? 56 : 120,
                resize: isMobile ? 'none' : 'vertical',
                lineHeight: 1.6,
              }}
              placeholder={field.placeholder || `Enter ${field.label}`}
              value={localValue}
              maxLength={maxChars}
              onChange={(e) => handleChange(e.target.value)}
              onFocus={handleInputFocus}
              autoFocus
            />
            <div
              style={{
                fontSize: isMobile ? 10 : 12,
                color: localValue.length >= maxChars ? '#ef4444' : '#9ca3af',
                textAlign: 'right',
                marginTop: isMobile ? 4 : -8,
              }}
            >
              {localValue.length}/{maxChars}
            </div>
          </>
        );
    }
  };

  const content = (
    <div
      style={{
        position: 'relative',
        padding: isMobile ? '10px 12px 12px' : '20px 24px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? 8 : 16,
      }}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={closeFieldEditor}
        style={{
          position: 'absolute',
          top: isMobile ? 6 : 12,
          right: isMobile ? 8 : 12,
          width: isMobile ? 28 : 32,
          height: isMobile ? 28 : 32,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          background: 'transparent',
          color: '#6b7280',
          fontSize: isMobile ? 20 : 22,
          lineHeight: 1,
          cursor: 'pointer',
          borderRadius: 8,
          padding: 0,
        }}
      >
        ×
      </button>

      <div style={{ paddingRight: isMobile ? 28 : 32 }}>
        <h3
          style={{
            fontSize: isMobile ? 14 : 17,
            fontWeight: 700,
            color: '#111827',
            margin: 0,
          }}
        >
          {field.label}
          {field.required && <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>}
        </h3>
        {field.placeholder && (
          <p
            style={{
              fontSize: isMobile ? 11 : 13,
              color: '#6b7280',
              marginTop: 4,
              marginBottom: 0,
            }}
          >
            {field.placeholder}
          </p>
        )}
      </div>

      {renderInput()}

      {/* Prev / Save & Next */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          disabled={!hasPrev}
          onClick={() => saveAndNavigate(fields[currentIndex - 1])}
          style={{
            flex: 1,
            padding: isMobile ? '6px 0' : '10px 0',
            borderRadius: 10,
            border: '1.5px solid #d1d5db',
            background: '#fff',
            color: hasPrev ? '#374151' : '#d1d5db',
            fontWeight: 600,
            fontSize: isMobile ? 12 : 14,
            cursor: hasPrev ? 'pointer' : 'default',
          }}
        >
          ← Prev
        </button>
        {fields.length > 1 && (
          <span style={{ alignSelf: 'center', fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap' }}>
            {currentIndex + 1} / {fields.length}
          </span>
        )}
        <button
          type="button"
          onClick={handleSaveAndNext}
          style={{
            flex: 1,
            padding: isMobile ? '6px 0' : '10px 0',
            borderRadius: 10,
            border: 'none',
            background: '#2563eb',
            color: '#fff',
            fontWeight: 600,
            fontSize: isMobile ? 12 : 14,
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(37,99,235,0.3)',
          }}
        >
          Save & Next
        </button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <AnimatePresence>
        {isFieldEditorOpen && (
          <MobileFloatingPopup
            key={field.id}
            fieldId={field.id}
            viewportRect={viewportRect}
          >
            {content}
          </MobileFloatingPopup>
        )}
      </AnimatePresence>
    );
  }

  // Desktop: centered modal
  return (
    <AnimatePresence>
      {isFieldEditorOpen && (
        <>
          <motion.div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            style={{
              position: 'fixed',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '100%',
              maxWidth: 480,
              background: '#fff',
              borderRadius: 16,
              boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
              zIndex: 50,
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            {content}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
