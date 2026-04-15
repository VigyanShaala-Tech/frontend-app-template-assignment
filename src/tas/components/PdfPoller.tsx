/**
 * PdfPoller
 * After submit, polls GET /submissions/{id}/pdf/ until the URL is ready.
 * Stops after 30 seconds if no PDF is generated.
 */

import React, { useEffect, useState } from 'react';
import { Alert, Hyperlink } from '@openedx/paragon';
import { FileDownload } from '@openedx/paragon/icons';
import { submissionsApi } from '../services/api';
import { useTasStore } from '../store/tasStore';

const MAX_POLLS = 15; // 15 × 2s = 30s

export const PdfPoller: React.FC = () => {
  const { submission, setSubmission } = useTasStore();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!submission || submission.status !== 'submitted') return;

    // Already have a URL
    if (submission.pdf_url) {
      setPdfUrl(submission.pdf_url);
      return;
    }

    // No submission ID (stub from 409 path) — skip polling
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
      } catch {
        // ignore transient errors
      }
      if (polls >= MAX_POLLS) clearInterval(interval);
    }, 2000);

    return () => clearInterval(interval);
  }, [submission?.id, submission?.status]);  // eslint-disable-line react-hooks/exhaustive-deps

  if (!submission || submission.status !== 'submitted') return null;

  return (
    <Alert variant="success" className="mt-4 mb-0">
      <Alert.Heading>Assignment submitted!</Alert.Heading>
      {pdfUrl ? (
        <Hyperlink
          destination={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="d-inline-flex align-items-center font-weight-bold"
        >
          <FileDownload className="mr-1" />
          Download PDF
        </Hyperlink>
      ) : null}
    </Alert>
  );
};
