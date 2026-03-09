/**
 * PdfPoller
 * After submit, polls GET /submissions/{id}/pdf/ until the URL is ready.
 */

import React, { useEffect, useState } from 'react';
import { Alert, Spinner, Hyperlink } from '@openedx/paragon';
import { FileDownload } from '@openedx/paragon/icons';
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
      ) : polling ? (
        <span className="d-flex align-items-center small text-muted">
          <Spinner
            animation="border"
            size="sm"
            screenReaderText="Generating PDF"
            className="mr-1"
          />
          Generating PDF…
        </span>
      ) : null}
    </Alert>
  );
};
