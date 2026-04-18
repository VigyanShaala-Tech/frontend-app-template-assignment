/**
 * PdfPoller
 * After submit, polls GET /submissions/{id}/pdf/ until the backend-generated PDF is ready.
 */

import React, { useEffect, useState } from 'react';
import { submissionsApi } from '../services/api';
import { useTasStore } from '../store/tasStore';

const MAX_POLLS = 15; // 15 × 2s = 30s

export const PdfPoller: React.FC = () => {
  const { submission, setSubmission } = useTasStore();
  const [pdfUrl, setPdfUrl] = useState<string | null>(submission?.pdf_url || null);

  useEffect(() => {
    if (!submission || submission.status !== 'submitted') return;
    if (submission.pdf_url) { setPdfUrl(submission.pdf_url); return; }
    if (!submission.id) return;

    let polls = 0;
    const interval = setInterval(async () => {
      polls += 1;
      try {
        const res = await submissionsApi.getPdf(submission.id);
        if (res.pdf_url) {
          setPdfUrl(res.pdf_url);
          setSubmission({ ...submission, pdf_url: res.pdf_url });
          clearInterval(interval);
        }
      } catch { /* ignore */ }
      if (polls >= MAX_POLLS) clearInterval(interval);
    }, 2000);

    return () => clearInterval(interval);
  }, [submission?.id, submission?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!submission || submission.status !== 'submitted') return null;

  const handleDownload = async () => {
    if (!pdfUrl) return;
    try {
      const res = await fetch(pdfUrl, { credentials: 'include' });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'submission.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(pdfUrl, '_blank');
    }
  };

  return (
    <div style={{
      marginTop: 16, padding: '14px 20px',
      background: '#f0fdf4', border: '1px solid #bbf7d0',
      borderRadius: 10, display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', gap: 12,
    }}>
      <div>
        <div style={{ fontWeight: 700, color: '#15803d', fontSize: 15 }}>
          ✓ Assignment submitted!
        </div>
        {!pdfUrl && (
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
            Generating PDF…
          </div>
        )}
      </div>
      {pdfUrl && (
        <button
          type="button"
          onClick={handleDownload}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', background: '#16a34a', color: '#fff',
            border: 'none', borderRadius: 8, fontWeight: 600,
            fontSize: 14, cursor: 'pointer', flexShrink: 0,
          }}
        >
          ↓ Download PDF
        </button>
      )}
    </div>
  );
};
