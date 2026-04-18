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
        usage_key: mfeContext.usageKey,
        course_id: mfeContext.courseId,
        student_id: mfeContext.studentId,
      })
      .then((sub) => {
        setSubmission(sub);
        if (Object.keys(sub.form_data).length > 0) {
          useTasStore.getState().setFormData(sub.form_data);
        }
      })
      .catch((err: any) => {
        draftCreating.current = false;
        const responseData = err?.response?.data;
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

  // ── Print / Save as PDF ───────────────────────────────────────────────────
  const handlePrint = useCallback(() => {
    if (!selectedTemplate) return;
    const imageW = selectedTemplate.image_width || 794;
    const imageH = selectedTemplate.image_height || 1123;

    const fieldsHtml = selectedTemplate.fields.map((field) => {
      const pos = selectedTemplate.field_positions[field.id];
      const value = formData[field.id] ?? '';
      if (!pos || !value) return '';
      return `
        <div style="
          position:absolute;
          left:${pos.x}%;top:${pos.y}%;
          width:${pos.width}%;height:${pos.height}%;
          font-size:${Math.max(8, imageH * pos.height / 100 * 0.55)}px;
          font-weight:500;color:#111827;
          overflow:hidden;padding:2px;box-sizing:border-box;
          line-height:1.3;white-space:pre-wrap;
        ">${value.replace(/</g, '&lt;')}</div>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head>
      <title>${selectedTemplate.name}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { width:${imageW}px; }
        @page { size:${imageW}px ${imageH}px; margin:0; }
        @media print { body { width:${imageW}px; } }
      </style>
    </head><body>
      <div style="position:relative;width:${imageW}px;height:${imageH}px;">
        <img src="${selectedTemplate.image_url}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;" />
        ${fieldsHtml}
      </div>
    </body></html>`;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  }, [selectedTemplate, formData]);

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

  const btnBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '6px 14px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    transition: 'opacity 0.15s',
    whiteSpace: 'nowrap',
  };

  return (
    <div className="d-flex flex-column h-100">
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 16px',
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        flexShrink: 0,
        gap: 8,
        minHeight: 52,
      }}>
        {/* Back */}
        {!isSubmitted && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Go back? Unsaved changes will be lost.')) {
                clearSelection();
              }
            }}
            style={{ ...btnBase, background: '#f3f4f6', color: '#374151' }}
          >
            ← Back
          </button>
        )}

        {/* Template name */}
        <span style={{
          flex: 1,
          fontWeight: 700,
          fontSize: 14,
          color: '#111827',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          margin: '0 4px',
        }}>
          {selectedTemplate.name}
        </span>

        {/* Preview toggle */}
        {!isSubmitted && (
          <button
            type="button"
            onClick={() => setPreviewMode(!isPreviewMode)}
            style={{ ...btnBase, background: '#f3f4f6', color: '#374151' }}
          >
            {isPreviewMode ? 'Edit' : 'Preview'}
          </button>
        )}

        {/* Save as PDF */}
        <button
          type="button"
          onClick={handlePrint}
          style={{ ...btnBase, background: '#f3f4f6', color: '#374151' }}
        >
          ↓ Save as PDF
        </button>

        {/* Save Draft */}
        {!isSubmitted && (
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSaving || !submission}
            style={{
              ...btnBase,
              background: '#fff',
              color: '#2563eb',
              border: '1.5px solid #2563eb',
              opacity: (isSaving || !submission) ? 0.5 : 1,
            }}
          >
            {isSaving ? 'Saving…' : 'Save Draft'}
          </button>
        )}

        {/* Submit */}
        {!isSubmitted && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || !submission}
            style={{
              ...btnBase,
              background: '#2563eb',
              color: '#fff',
              opacity: (isSaving || !submission) ? 0.5 : 1,
            }}
          >
            Submit
          </button>
        )}

        {isSubmitted && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#dcfce7',
            color: '#15803d',
            borderRadius: 8,
            padding: '6px 14px',
            fontWeight: 600,
            fontSize: 13,
          }}>
            ✓ Submitted
          </span>
        )}
      </div>

      {/* Outer page — scrollable grey background */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        background: '#e5e7eb',
        padding: '24px',
      }}>
        {/* Inner container — white card that holds the canvas */}
        <div style={{
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
          padding: 16,
          maxWidth: 900,
          margin: '0 auto',
        }}>
          <TemplateCanvas template={selectedTemplate} readOnly={isSubmitted || isPreviewMode} />
        </div>
      </div>

      {/* Field editor popup */}
      {!isSubmitted && <FieldEditorPopup field={selectedField} />}

      {/* PDF / submission status banner */}
      {isSubmitted && (
        <div style={{ flexShrink: 0, padding: '0 16px 16px', background: '#fff', borderTop: '1px solid #e5e7eb' }}>
          <PdfPoller />
        </div>
      )}
    </div>
  );
};
