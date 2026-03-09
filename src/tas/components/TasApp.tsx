/**
 * TasApp — top-level view for the TAS MFE
 *
 * Flow:
 *   1. MFE loads → reads context (usageKey, courseId, studentId) from OpenEdX JWT
 *   2. Student sees TemplateSelector (templates assigned to this block)
 *   3. Student picks a template → createOrGetDraft is called
 *   4. TemplateCanvas renders with field overlays; FieldEditorPopup opens on tap
 *   5. Auto-save fires 2s after any formData change (PATCH /submissions/{id}/)
 *   6. Student hits Submit → POST /submissions/{id}/submit/ → PdfPoller starts
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { Button, Badge } from '@openedx/paragon';
import { ArrowBack } from '@openedx/paragon/icons';
import { TemplateSelector } from './TemplateSelector';
import { TemplateCanvas } from './TemplateCanvas';
import { FieldEditorPopup } from './FieldEditorPopup';
import { AutoSaveStatus } from './AutoSaveStatus';
import { PdfPoller } from './PdfPoller';
import { AdminApp } from './admin/AdminApp';
import { useTasStore } from '../store/tasStore';
import { submissionsApi } from '../services/api';

const AUTO_SAVE_DEBOUNCE_MS = 2000;

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
    setLastSavedAt,
  } = useTasStore();

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
    if (submission) return; // already have one

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
        // Load existing form data if draft
        if (sub.status === 'draft' && Object.keys(sub.form_data).length > 0) {
          useTasStore.getState().setFormData(sub.form_data);
        }
      })
      .catch(console.error);
  }, [selectedTemplate, selectedTemplateBlockId, mfeContext, submission, setSubmission]);

  // ── Auto-save debounce ─────────────────────────────────────────────────────
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevFormData = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!submission || submission.status === 'submitted') return;
    // Only trigger if formData actually changed
    if (JSON.stringify(formData) === JSON.stringify(prevFormData.current)) return;
    prevFormData.current = formData;

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      try {
        setIsSaving(true);
        const updated = await submissionsApi.patch(submission.id, formData);
        setSubmission(updated);
        setLastSavedAt(updated.updated_at);
      } catch (err) {
        console.error('Auto-save failed', err);
      } finally {
        setIsSaving(false);
      }
    }, AUTO_SAVE_DEBOUNCE_MS);

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [formData, submission, setIsSaving, setLastSavedAt, setSubmission]);

  // ── Submit handler ─────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!submission || submission.status === 'submitted') return;

    // Validate required fields
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
      // Final save first
      await submissionsApi.patch(submission.id, formData);
      const submitted = await submissionsApi.submit(submission.id);
      setSubmission(submitted);
    } catch (err: any) {
      alert(err?.message || 'Submission failed. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [submission, selectedTemplate, formData, setIsSaving, setSubmission]);

  const isSubmitted = submission?.status === 'submitted';

  // ─── Render: admin/staff → admin view ─────────────────────────────────────
  if (mfeContext?.isStaff || mfeContext?.isInstructor) {
    return <AdminApp />;
  }

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
              if (window.confirm('Go back? Unsaved changes will be discarded.')) {
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

        {/* Auto-save status */}
        <AutoSaveStatus />

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

        {/* Submit */}
        {!isSubmitted && (
          <Button
            variant="brand"
            size="sm"
            onClick={handleSubmit}
            disabled={isSaving}
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
