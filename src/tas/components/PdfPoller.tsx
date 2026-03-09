/**
 * PdfPoller
 * After submit, polls GET /submissions/{id}/pdf/ until the URL is ready.
 */

import React, { useEffect, useState } from 'react';
import { submissionsApi } from '../services/api';
import { useTasStore } from '../store/tasStore';

export const PdfPoller: React.FC = () => {
  const { submission, setSubmission } = useTasStore();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    if (!submission || submission.status !== 'submitted') return;
    if (submission.pdf_url) {
      setPdfUrl(submission.pdf_url);
      return;
    }

    setPolling(true);
    const interval = setInterval(async () => {
      try {
        const res = await submissionsApi.getPdf(submission.id);
        if (res.pdf_url) {
          setPdfUrl(res.pdf_url);
          setSubmission({ ...submission, pdf_url: res.pdf_url });
          setPolling(false);
          clearInterval(interval);
        }
      } catch {
        // ignore transient errors
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [submission, setSubmission]);

  if (!submission || submission.status !== 'submitted') return null;

  return (
    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
      <p className="font-semibold mb-1">Assignment submitted!</p>
      {pdfUrl ? (
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-blue-600 hover:underline font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download PDF
        </a>
      ) : polling ? (
        <span className="flex items-center gap-1.5 text-gray-500">
          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Generating PDF…
        </span>
      ) : null}
    </div>
  );
};
