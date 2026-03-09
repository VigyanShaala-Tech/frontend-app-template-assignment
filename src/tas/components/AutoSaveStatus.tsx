/**
 * AutoSaveStatus
 * Small indicator showing last-saved time and saving spinner.
 */

import React from 'react';
import { Spinner } from '@openedx/paragon';
import { useTasStore } from '../store/tasStore';

export const AutoSaveStatus: React.FC = () => {
  const { isSaving, lastSavedAt } = useTasStore();

  if (isSaving) {
    return (
      <span className="d-flex align-items-center small text-muted">
        <Spinner
          animation="border"
          size="sm"
          variant="primary"
          screenReaderText="Saving"
          className="mr-1"
        />
        Saving…
      </span>
    );
  }

  if (lastSavedAt) {
    const t = new Date(lastSavedAt);
    return (
      <span className="small text-success">
        &#10003; Saved {t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    );
  }

  return null;
};
