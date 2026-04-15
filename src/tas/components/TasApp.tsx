/**
 * TasApp — top-level view for the TAS MFE
 *
 * Flow:
 *   1. MFE loads → reads context (usageKey, courseId, studentId) from OpenEdX JWT
 *   2. Student sees TemplateSelector (templates assigned to this block)
 *   3. Student picks a template → createOrGetDraft is called
 *   4. TemplateCanvas renders with field overlays; FieldEditorPopup opens on tap
 *   5. Student hits "Save Draft" to persist progress, or "Submit" to finalise
 */

import React, { useEffect, useCallback, useRef } from 'react';
import { Button, Badge } from '@openedx/paragon';
import { ArrowBack } from '@openedx/paragon/icons';
import { TemplateSelector } from './TemplateSelector';
import { TemplateCanvas } from './TemplateCanvas';
import { FieldEditorPopup } from './FieldEditorPopup';
import { PdfPoller } from './PdfPoller';
import { useTasStore } from '../store/tasStore';
import { submissionsApi } from '../services/api';

export const TasApp: React.FC = () => {
  const {
    mfeContext,
    selectedTemplate,
    selectedTemplateBlockId,
    submission,
    setSubmission,
    formData,
    clearSelection,
    isPreviewMode,
    setPreviewMode,
    setIsMobile,
    getSelectedField,
    isSaving,
    setIsSaving,
  } = useTasStore();

  // Track whether createOrGetDraft has already been called for this selection
  const draftCreating = useRef(false);

  // ── Responsive detection ───────────────────────────────────────────────────
  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 768);
    handle();
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, [setIsMobile]);

  // ── Create or retrieve draft when template is selected ────────────────────
  useEffect(() => {
    if (!selectedTemplate || !selectedTemplateBlockId || !mfeContext) return;
    if (submission) return;
    if (draftCreating.current) return;

    draftCreating.current = true;

    submissionsApi
      .createOrGetDraft({
        template_block_id: selectedTemplateBlockId,
        form_data: {},
        usage_key: mfeContext.usageKey,
        course_id: mfeContext.courseId,
        student_id: mfeContext.studentId,
      })
      .then((sub) => {
        setSubmission(sub);
        if (sub.status === 'draft' && Object.keys(sub.form_data).length > 0) {
          useTasStore.getState().setFormData(sub.form_data);
        }
      })
      .catch((err: any) => {
        draftCreating.current = false;
        const status = err?.response?.status;
        const responseData = err?.response?.data;

        // 409 means already submitted — show read-only state silently
        if (status === 409) {
          setSubmission({
            id: '',
            template_block_id: selectedTemplateBlockId ?? '',
            student_id: mfeContext?.studentId ?? '',
            course_id: mfeContext?.courseId ?? '',
            usage_key: mfeContext?.usageKey ?? '',
            form_data: {},
            status: 'submitted',
            version_number: 1,
            submitted_at: null,
            pdf_url: '',
            created_at: '',
            updated_at: '',
          });
          return;
        }

        let msg = 'Failed to start assignment. Please reload and try again.';
        if (responseData?.detail) msg = responseData.detail;
        else if (responseData?.non_field_errors) {
          msg = Array.isArray(responseData.non_field_errors)
            ? responseData.non_field_errors.join('\n')
            : responseData.non_field_errors;
        } else if (typeof responseData === 'string') {
          msg = responseData;
        } else if (responseData) {
          const fieldErrors = Object.entries(responseData)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join('\n');
          if (fieldErrors) msg = fieldErrors;
        }
        alert(msg);
        clearSelection();
      });
  }, [selectedTemplate, selectedTemplateBlockId, mfeContext, submission, setSubmission, clearSelection]);

  // Reset draft-creating guard when selection is cleared
  useEffect(() => {
    if (!selectedTemplate) {
      draftCreating.current = false;
    }
  }, [selectedTemplate]);

  // ── Save draft handler ─────────────────────────────────────────────────────
  const handleSaveDraft = useCallback(async () => {
    if (!submission || submission.status === 'submitted') return;
    try {
      setIsSaving(true);
      const updated = await submissionsApi.patch(submission.id, formData);
      setSubmission(updated);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to save draft.';
      alert(msg);
    } finally {
      setIsSaving(false);
    }
  }, [submission, formData, setIsSaving, setSubmission]);

  // ── Submit handler ─────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!submission || submission.status === 'submitted') return;

    const missing =
      selectedTemplate?.fields
        .filter((f) => f.required && !(formData[f.id] ?? '').trim())
        .map((f) => f.label) ?? [];

    if (missing.length > 0) {
      alert(`Please fill in required fields:\n• ${missing.join('\n• ')}`);
      return;
    }

    if (!window.confirm('Submit this assignment? You cannot edit it after submitting.')) return;

    try {
      setIsSaving(true);
      // Save latest form data first, then submit
      await submissionsApi.patch(submission.id, formData);
      const submitted = await submissionsApi.submit(submission.id);
      setSubmission(submitted);
    } catch (err: any) {
      const responseData = err?.response?.data;
      let errorMsg = 'Submission failed. Please try again.';
      if (responseData) {
        if (typeof responseData === 'string') {
          errorMsg = responseData;
        } else if (responseData.detail) {
          errorMsg = responseData.detail;
        } else if (responseData.non_field_errors) {
          errorMsg = Array.isArray(responseData.non_field_errors)
            ? responseData.non_field_errors.join('\n')
            : responseData.non_field_errors;
        } else {
          const fieldErrors = Object.entries(responseData)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join('\n');
          if (fieldErrors) errorMsg = fieldErrors;
        }
      }
      alert(errorMsg);
    } finally {
      setIsSaving(false);
    }
  }, [submission, selectedTemplate, formData, setIsSaving, setSubmission]);

  const isSubmitted = submission?.status === 'submitted';

  // ─── Render: no template selected → selector ──────────────────────────────
  if (!selectedTemplate) {
    return (
      <div className="h-100 overflow-auto">
        <TemplateSelector />
      </div>
    );
  }

  // ─── Render: template selected → canvas ───────────────────────────────────
  const selectedField = getSelectedField();

  return (
    <div className="d-flex flex-column h-100">
      {/* Toolbar */}
      <div className="d-flex align-items-center px-3 py-2 bg-white border-bottom shadow-sm flex-shrink-0">
        {/* Back */}
        {!isSubmitted && (
          <Button
            variant="tertiary"
            size="sm"
            iconBefore={ArrowBack}
            onClick={() => {
              if (window.confirm('Go back? Unsaved changes will be lost.')) {
                clearSelection();
              }
            }}
            className="mr-1"
          >
            <span className="d-none d-sm-inline">Back</span>
          </Button>
        )}

        {/* Template name */}
        <h2 className="font-weight-bold small flex-grow-1 mb-0 text-truncate mx-2">
          {selectedTemplate.name}
        </h2>

        {/* Preview toggle */}
        {!isSubmitted && (
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => setPreviewMode(!isPreviewMode)}
            className="ml-2"
          >
            {isPreviewMode ? 'Edit' : 'Preview'}
          </Button>
        )}

        {/* Save Draft */}
        {!isSubmitted && (
          <Button
            variant="outline-brand"
            size="sm"
            onClick={handleSaveDraft}
            disabled={isSaving || !submission}
            className="ml-2"
          >
            {isSaving ? 'Saving…' : 'Save Draft'}
          </Button>
        )}

        {/* Submit */}
        {!isSubmitted && (
          <Button
            variant="brand"
            size="sm"
            onClick={handleSubmit}
            disabled={isSaving || !submission}
            className="ml-2"
          >
            Submit
          </Button>
        )}

        {isSubmitted && (
          <Badge variant="success" className="ml-2 px-3 py-2">
            &#10003; Submitted
          </Badge>
        )}
      </div>

      {/* Canvas area */}
      <div className="flex-grow-1 overflow-hidden position-relative">
        <TemplateCanvas template={selectedTemplate} readOnly={isSubmitted || isPreviewMode} />
      </div>

      {/* Field editor popup */}
      {!isSubmitted && <FieldEditorPopup field={selectedField} />}

      {/* PDF / submission status banner */}
      {isSubmitted && (
        <div className="flex-shrink-0 px-4 pb-4 bg-white border-top">
          <PdfPoller />
        </div>
      )}
    </div>
  );
};
