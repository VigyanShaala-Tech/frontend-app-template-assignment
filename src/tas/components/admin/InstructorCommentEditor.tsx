/**
 * Drop-in rich text replacement for the Instructor Comment textarea.
 * Controlled HTML value/onChange — no grading or sync logic here.
 */

import React, { useMemo, useRef } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { normalizeEditorHtml } from '../../utils/commentHtmlAdapter';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

/** Incremental font-size steps (px) for Increase / Decrease controls. */
const FONT_SIZE_STEPS = [
  '10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px',
];
const DEFAULT_FONT_SIZE = '16px';

type QuillWithHistory = ReturnType<ReactQuill['getEditor']> & {
  history: { undo: () => void; redo: () => void };
};

const SizeStyle = Quill.import('attributors/style/size') as {
  whitelist: string[];
};
SizeStyle.whitelist = FONT_SIZE_STEPS;
Quill.register(SizeStyle, true);

function getEditor(ref: React.RefObject<ReactQuill | null>): QuillWithHistory | undefined {
  return ref.current?.getEditor() as QuillWithHistory | undefined;
}

function nearestSizeIndex(current: unknown): number {
  if (typeof current !== 'string' || !current) {
    return FONT_SIZE_STEPS.indexOf(DEFAULT_FONT_SIZE);
  }
  const exact = FONT_SIZE_STEPS.indexOf(current);
  if (exact >= 0) {
    return exact;
  }
  const px = parseFloat(current);
  if (Number.isNaN(px)) {
    return FONT_SIZE_STEPS.indexOf(DEFAULT_FONT_SIZE);
  }
  let best = 0;
  let bestDiff = Infinity;
  FONT_SIZE_STEPS.forEach((step, i) => {
    const diff = Math.abs(parseFloat(step) - px);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  });
  return best;
}

function stepFontSize(editor: QuillWithHistory, delta: 1 | -1): void {
  const range = editor.getSelection(true);
  if (!range) {
    return;
  }
  const format = editor.getFormat(range);
  const idx = nearestSizeIndex(format.size);
  const nextIdx = Math.max(0, Math.min(FONT_SIZE_STEPS.length - 1, idx + delta));
  const nextSize = FONT_SIZE_STEPS[nextIdx];
  if (nextSize === DEFAULT_FONT_SIZE) {
    editor.format('size', false);
  } else {
    editor.format('size', nextSize);
  }
}

export const InstructorCommentEditor: React.FC<Props> = ({
  value,
  onChange,
  placeholder = 'Leave feedback for the student…',
}) => {
  const quillRef = useRef<ReactQuill | null>(null);

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [1, 2, 3, false] }],
        ['increaseFontSize', 'decreaseFontSize'],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ align: [] }],
        ['link'],
        ['clean'],
        ['undo', 'redo'],
      ],
      handlers: {
        undo() {
          getEditor(quillRef)?.history.undo();
        },
        redo() {
          getEditor(quillRef)?.history.redo();
        },
        increaseFontSize() {
          const editor = getEditor(quillRef);
          if (editor) {
            stepFontSize(editor, 1);
          }
        },
        decreaseFontSize() {
          const editor = getEditor(quillRef);
          if (editor) {
            stepFontSize(editor, -1);
          }
        },
      },
    },
    history: {
      delay: 1000,
      maxStack: 100,
      userOnly: true,
    },
    clipboard: {
      matchVisual: false,
    },
  }), []);

  const formats = useMemo(() => [
    'header',
    'size',
    'bold',
    'italic',
    'underline',
    'strike',
    'list',
    'align',
    'link',
  ], []);

  return (
    <div className="tas-instructor-comment-editor">
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={(content, _delta, source) => {
          if (source !== 'user') {
            return;
          }
          onChange(normalizeEditorHtml(content));
        }}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
    </div>
  );
};
