/**
 * StudentSubmissionDetail
 * Two-column view: submitted PDF (left) + instructor feedback (right).
 */

import React from 'react';
import { Badge, Button, Card } from '@openedx/paragon';
import { ArrowBack } from '@openedx/paragon/icons';
import type { SubmissionVersion } from '../types';
import { stripCategoryHeadingsFromComment } from '../utils/flattenStudentFeedback';
import { InstructorCommentHtml } from './admin/InstructorCommentHtml';
import { SubmissionPdfViewer } from './SubmissionPdfViewer';

interface Props {
  version: SubmissionVersion;
  onBack: () => void;
}

const FEEDBACK_BADGE: Record<string, string> = {
  pending: 'secondary',
  approved: 'success',
  rejected: 'danger',
};

export const StudentSubmissionDetail: React.FC<Props> = ({ version, onBack }) => {
  const displayComment = stripCategoryHeadingsFromComment(version.instructor_comment ?? '');
  const pdfUrl = version.pdf_url || version.download_url;

  return (
    <div className="d-flex flex-column h-100">
      <div className="d-flex align-items-center px-4 py-3 bg-white border-bottom" style={{ gap: '0.75rem' }}>
        <Button variant="tertiary" size="sm" iconBefore={ArrowBack} onClick={onBack}>
          Back
        </Button>
        <div className="flex-grow-1">
          <h2 className="h5 mb-0">Submission v{version.version_number}</h2>
          <small className="text-muted">
            {version.submitted_at
              ? new Date(version.submitted_at).toLocaleString()
              : '—'}
          </small>
        </div>
        {version.feedback_status && (
          <Badge variant={FEEDBACK_BADGE[version.feedback_status] ?? 'secondary'}>
            {version.feedback_status}
          </Badge>
        )}
      </div>

      <div className="flex-grow-1 overflow-auto p-4" style={{ background: '#e5e7eb' }}>
        <div className="row">
          <div className="col-12 col-lg-6 mb-4">
            <SubmissionPdfViewer
              pdfUrl={pdfUrl}
              title="Submitted Assignment"
              showViewPdf
              downloadFilename={`submission_v${version.version_number}.pdf`}
            />
          </div>

          <div className="col-12 col-lg-6 mb-4">
            <Card className="shadow-sm">
              <Card.Header title="Feedback" />
              <Card.Section>
                {!version.feedback_available && (
                  <p className="text-muted small mb-0">
                    {version.feedback_unavailable_reason === 'unlinked_historical'
                      ? 'Historical feedback unavailable for this submission.'
                      : 'Feedback pending'}
                  </p>
                )}

                {version.feedback_available && (
                  <>
                    {version.feedback_status && (
                      <Badge
                        variant={FEEDBACK_BADGE[version.feedback_status] ?? 'secondary'}
                        className="mb-3"
                      >
                        {version.feedback_status}
                      </Badge>
                    )}
                    {!displayComment.trim() ? (
                      <p className="text-muted small mb-0">No instructor comment.</p>
                    ) : (
                      <InstructorCommentHtml comment={displayComment} className="small mb-0" />
                    )}
                  </>
                )}
              </Card.Section>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
