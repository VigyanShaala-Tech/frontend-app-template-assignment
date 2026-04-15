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

  const renderInput = () => {
    const base =
      'w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            className={`${base} min-h-[120px] resize-y`}
            placeholder={field.placeholder || `Enter ${field.label}`}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            autoFocus
          />
        );
      case 'select':
        return (
          <select
            className={base}
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
            className={base}
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
            className={base}
            placeholder={field.placeholder || `Enter ${field.label}`}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        );
      default:
        return (
          <input
            type="text"
            className={base}
            placeholder={field.placeholder || `Enter ${field.label}`}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        );
    }
  };

  const content = (
    <div className="p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </h3>
        {field.placeholder && (
          <p className="text-sm text-gray-500 mt-0.5">{field.placeholder}</p>
        )}
      </div>

      {renderInput()}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={closeFieldEditor}
          className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition shadow-sm"
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
              className="fixed inset-0 bg-black/50 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeFieldEditor}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50 max-h-[85vh] overflow-y-auto"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
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
            className="fixed inset-0 bg-black/40 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeFieldEditor}
          />
          <motion.div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50"
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
