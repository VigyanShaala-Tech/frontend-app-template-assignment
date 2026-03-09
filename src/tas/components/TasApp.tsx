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
import { TemplateSelector } from './TemplateSelector';
import { TemplateCanvas } from './TemplateCanvas';
import { FieldEditorPopup } from './FieldEditorPopup';
import { AutoSaveStatus } from './AutoSaveStatus';
import { PdfPoller } from './PdfPoller';
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
    isMobile,
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

  // ─── Render: no template selected → selector ──────────────────────────────
  if (!selectedTemplate) {
    return (
      <div className="h-full overflow-y-auto">
        <TemplateSelector />
      </div>
    );
  }

  // ─── Render: template selected → canvas ───────────────────────────────────
  const selectedField = getSelectedField();

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        {/* Back */}
        {!isSubmitted && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Go back? Unsaved changes will be discarded.')) {
                clearSelection();
              }
            }}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition mr-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Back</span>
          </button>
        )}

        {/* Template name */}
        <h2 className="font-semibold text-gray-900 text-sm flex-1 truncate">
          {selectedTemplate.name}
        </h2>

        {/* Auto-save status */}
        <AutoSaveStatus />

        {/* Preview toggle */}
        {!isSubmitted && (
          <button
            type="button"
            onClick={() => setPreviewMode(!isPreviewMode)}
            className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
          >
            {isPreviewMode ? 'Edit' : 'Preview'}
          </button>
        )}

        {/* Submit */}
        {!isSubmitted && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition shadow-sm disabled:opacity-50"
          >
            Submit
          </button>
        )}

        {isSubmitted && (
          <span className="text-xs px-3 py-1.5 rounded-lg bg-green-100 text-green-700 font-medium">
            ✓ Submitted
          </span>
        )}
      </div>

      {/* Canvas area */}
      <div className="flex-1 overflow-hidden relative">
        <TemplateCanvas template={selectedTemplate} readOnly={isSubmitted || isPreviewMode} />
      </div>

      {/* Field editor popup */}
      {!isSubmitted && <FieldEditorPopup field={selectedField} />}

      {/* PDF / submission status banner */}
      {isSubmitted && (
        <div className="flex-shrink-0 px-4 pb-4 bg-white border-t border-gray-100">
          <PdfPoller />
        </div>
      )}
    </div>
  );
};
