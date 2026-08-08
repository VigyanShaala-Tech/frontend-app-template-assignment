/**
 * ConfirmSubmitModal
 * Confirmation when the student submits with all active fields completed.
 * Display-only — submit logic stays in TasApp.
 */

import React from 'react';
import { ModalDialog, Icon } from '@openedx/paragon';
import { WarningAmber } from '@openedx/paragon/icons';

const SUBMIT_GREEN = '#69AB4A';
const WARNING_AMBER = '#f59e0b';

interface Props {
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onCancel: () => void;
  onConfirmSubmit: () => void;
}

const secondaryBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  flex: 1,
  padding: '12px 16px',
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 600,
  background: '#fff',
  color: SUBMIT_GREEN,
  border: `1.5px solid ${SUBMIT_GREEN}`,
  cursor: 'pointer',
};

const primaryBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  flex: 1,
  padding: '12px 16px',
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 600,
  background: SUBMIT_GREEN,
  color: '#fff',
  border: `1.5px solid ${SUBMIT_GREEN}`,
  cursor: 'pointer',
};

export const ConfirmSubmitModal: React.FC<Props> = ({
  isOpen,
  isSaving,
  onClose,
  onCancel,
  onConfirmSubmit,
}) => (
  <ModalDialog
    title="Submit this assignment?"
    isOpen={isOpen}
    onClose={onClose}
    size="md"
    hasCloseButton
    isOverflowVisible={false}
  >
    <ModalDialog.Header>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingRight: 8 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'rgba(245, 158, 11, 0.12)',
            color: WARNING_AMBER,
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          <Icon src={WarningAmber} style={{ width: 24, height: 24 }} />
        </span>
        <ModalDialog.Title style={{ margin: 0 }}>Submit this assignment?</ModalDialog.Title>
      </div>
    </ModalDialog.Header>

    <ModalDialog.Body>
      <div style={{ maxWidth: 560, paddingBottom: 4 }}>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 14, lineHeight: 1.5 }}>
          Once submitted, you will not be able to edit this assignment.
        </p>
      </div>
    </ModalDialog.Body>

    <ModalDialog.Footer>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 12,
          width: '100%',
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          style={{
            ...secondaryBtnStyle,
            opacity: isSaving ? 0.6 : 1,
            cursor: isSaving ? 'not-allowed' : 'pointer',
          }}
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={onConfirmSubmit}
          disabled={isSaving}
          style={{
            ...primaryBtnStyle,
            opacity: isSaving ? 0.6 : 1,
            cursor: isSaving ? 'not-allowed' : 'pointer',
          }}
        >
          Confirm Submit
        </button>
      </div>
    </ModalDialog.Footer>
  </ModalDialog>
);
