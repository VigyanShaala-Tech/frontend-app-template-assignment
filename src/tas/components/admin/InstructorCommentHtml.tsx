/**
 * Renders a stored instructor comment as HTML (Quill) or plain text (legacy).
 */

import React from 'react';
import { looksLikeHtml, sanitizeCommentHtml } from '../../utils/commentHtmlAdapter';

interface Props {
  comment: string;
  className?: string;
}

export const InstructorCommentHtml: React.FC<Props> = ({
  comment,
  className = 'small mb-0',
}) => {
  if (!looksLikeHtml(comment)) {
    return (
      <p className={className} style={{ whiteSpace: 'pre-wrap' }}>
        {comment}
      </p>
    );
  }

  return (
    <div
      className={`tas-instructor-comment-html ${className}`.trim()}
      // Sanitized Quill allowlist only — see sanitizeCommentHtml
      dangerouslySetInnerHTML={{ __html: sanitizeCommentHtml(comment) }}
    />
  );
};
