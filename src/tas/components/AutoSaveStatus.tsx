/**
 * AutoSaveStatus
 * Small indicator showing last-saved time and saving spinner.
 */

import React from 'react';
import { useTasStore } from '../store/tasStore';

export const AutoSaveStatus: React.FC = () => {
  const { isSaving, lastSavedAt } = useTasStore();

  if (isSaving) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-gray-500">
        <svg className="w-3 h-3 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Saving…
      </span>
    );
  }

  if (lastSavedAt) {
    const t = new Date(lastSavedAt);
    return (
      <span className="text-xs text-green-600">
        ✓ Saved {t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    );
  }

  return null;
};
