/**
 * BackNavigationModal
 * Custom confirmation when the student taps Back — replaces the native browser confirm.
 */

import React from 'react';
import { ModalDialog, Icon } from '@openedx/paragon';
import { Undo, CheckCircle } from '@openedx/paragon/icons';

const SUBMIT_GREEN = '#69AB4A';

interface Props {
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onContinueHere: () => void;
  onSaveAndGoBack: () => void;
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

export const BackNavigationModal: React.FC<Props> = ({
  isOpen,
  isSaving,
  onClose,
  onContinueHere,
  onSaveAndGoBack,
}) => (
  <ModalDialog
    title="Oops! Did you press Back by mistake?"
    isOpen={isOpen}
    onClose={onClose}
    size="md"
    hasCloseButton
    isOverflowVisible={false}
  >
    <ModalDialog.Header>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 14,
          paddingTop: 8,
          paddingRight: 24,
          width: '100%',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(105, 171, 74, 0.14)',
            color: SUBMIT_GREEN,
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          <Icon src={Undo} style={{ width: 28, height: 28 }} />
        </span>
        <ModalDialog.Title style={{ margin: 0, textAlign: 'center' }}>
          Oops! Did you press Back by mistake?
        </ModalDialog.Title>
      </div>
    </ModalDialog.Header>

    <ModalDialog.Body>
      <div style={{ maxWidth: 560, paddingBottom: 4 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'rgba(105, 171, 74, 0.1)',
            border: '1px solid rgba(105, 171, 74, 0.22)',
            borderRadius: 10,
            padding: '12px 14px',
            color: '#166534',
            fontSize: 14,
            lineHeight: 1.5,
            fontWeight: 500,
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'rgba(105, 171, 74, 0.18)',
              color: SUBMIT_GREEN,
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            <Icon src={CheckCircle} style={{ width: 18, height: 18 }} />
          </span>
          <span>All your changes are safe. You won&apos;t lose any progress.</span>
        </div>
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
          onClick={onContinueHere}
          disabled={isSaving}
          style={{
            ...primaryBtnStyle,
            opacity: isSaving ? 0.6 : 1,
            cursor: isSaving ? 'not-allowed' : 'pointer',
          }}
        >
          Continue Here
        </button>

        <button
          type="button"
          onClick={onSaveAndGoBack}
          disabled={isSaving}
          style={{
            ...secondaryBtnStyle,
            opacity: isSaving ? 0.6 : 1,
            cursor: isSaving ? 'not-allowed' : 'pointer',
          }}
        >
          {isSaving ? 'Saving...' : 'Save & Go Back'}
        </button>
      </div>
    </ModalDialog.Footer>
  </ModalDialog>
);
