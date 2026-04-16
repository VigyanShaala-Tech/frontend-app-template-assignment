/**
 * FieldEditorPopup
 * Bottom sheet on mobile, centered modal on desktop.
 * Renders the correct input type based on field.type.
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTasStore } from '../store/tasStore';
import type { FormField } from '../types';

interface Props {
  field: FormField | null;
}

export const FieldEditorPopup: React.FC<Props> = ({ field }) => {
  const {
    isFieldEditorOpen,
    closeFieldEditor,
    formData,
    setFormValue,
    isMobile,
  } = useTasStore();

  const [localValue, setLocalValue] = React.useState('');

  useEffect(() => {
    if (field) setLocalValue(formData[field.id] ?? '');
  }, [field, formData]);

  if (!field || !isFieldEditorOpen) return null;

  const handleSave = () => {
    setFormValue(field.id, localValue);
    closeFieldEditor();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && field.type !== 'textarea') {
      handleSave();
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    borderRadius: 10,
    border: '1.5px solid #d1d5db',
    padding: '12px 14px',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    color: '#111827',
    background: '#f9fafb',
    transition: 'border-color 0.15s',
  };

  const renderInput = () => {
    switch (field.type) {
      case 'select':
        return (
          <select
            style={{ ...inputStyle, cursor: 'pointer' }}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
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
            autoFocus
          />
        );
      default:
        // text and textarea both get a large textarea
        return (
          <textarea
            style={{ ...inputStyle, minHeight: 120, resize: 'vertical', lineHeight: 1.6 }}
            placeholder={field.placeholder || `Enter ${field.label}`}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            autoFocus
          />
        );
    }
  };

  const content = (
    <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: 0 }}>
          {field.label}
          {field.required && <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>}
        </h3>
        {field.placeholder && (
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4, marginBottom: 0 }}>{field.placeholder}</p>
        )}
      </div>

      {renderInput()}

      <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
        <button
          type="button"
          onClick={closeFieldEditor}
          style={{
            flex: 1, padding: '10px 0', borderRadius: 10,
            border: '1.5px solid #d1d5db', background: '#fff',
            color: '#374151', fontWeight: 600, fontSize: 14, cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          style={{
            flex: 1, padding: '10px 0', borderRadius: 10,
            border: 'none', background: '#2563eb',
            color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(37,99,235,0.3)',
          }}
        >
          Save
        </button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <AnimatePresence>
        {isFieldEditorOpen && (
          <>
            <motion.div
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeFieldEditor}
            />
            <motion.div
              style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                background: '#fff', borderRadius: '24px 24px 0 0',
                boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
                zIndex: 50, maxHeight: '85vh', overflowY: 'auto',
              }}
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
                <div style={{ width: 40, height: 4, background: '#d1d5db', borderRadius: 99 }} />
              </div>
              {content}
            </motion.div>
          </>
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
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={closeFieldEditor}
          />
          <motion.div
            style={{
              position: 'fixed', left: '50%', top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '100%', maxWidth: 480,
              background: '#fff', borderRadius: 16,
              boxShadow: '0 8px 40px rgba(0,0,0,0.18)', zIndex: 50,
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
