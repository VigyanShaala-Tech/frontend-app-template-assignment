import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import type { Submission, SubmissionFeedback } from '../types';
import { useTasStore } from '../store/tasStore';
import { submissionsApi } from '../services/api';
import { TasApp } from './TasApp';

jest.mock('@openedx/paragon', () => {
  const ReactActual = require('react');
  const Passthrough = ({ children }: { children?: React.ReactNode }) => ReactActual.createElement('div', null, children);
  const ModalDialog = Object.assign(Passthrough, {
    Header: Passthrough,
    Title: Passthrough,
    Body: Passthrough,
    Footer: Passthrough,
    CloseButton: Passthrough,
  });
  return { Button: Passthrough, ActionRow: Passthrough, ModalDialog };
});

jest.mock('../services/api', () => ({
  submissionsApi: {
    get: jest.fn(),
    getVersions: jest.fn(),
    createOrGetDraft: jest.fn(),
    patch: jest.fn(),
    submit: jest.fn(),
    reopen: jest.fn(),
    getPdf: jest.fn(),
  },
  formatApiError: (_err: unknown, fallback: string) => fallback,
}));

jest.mock('../utils/navigateBackToAssignment', () => ({
  navigateBackToAssignment: jest.fn(),
}));

jest.mock('./TemplateSelector', () => ({ TemplateSelector: () => null }));
jest.mock('./TemplateCanvas', () => ({ TemplateCanvas: () => null }));
jest.mock('./FieldEditorPopup', () => ({ FieldEditorPopup: () => null }));
jest.mock('./PdfPoller', () => ({ PdfPoller: () => null }));
jest.mock('./StudentFeedbackPanel', () => ({ StudentFeedbackPanel: () => null }));
jest.mock('./StudentSubmissionDetail', () => ({ StudentSubmissionDetail: () => null }));
jest.mock('./SubmissionHistory', () => ({ SubmissionHistory: () => null }));
jest.mock('./RequiredFieldsModal', () => ({ RequiredFieldsModal: () => null }));
jest.mock('./BackNavigationModal', () => ({ BackNavigationModal: () => null }));
jest.mock('./OptionalFieldsSubmitModal', () => ({ OptionalFieldsSubmitModal: () => null }));
jest.mock('./ConfirmSubmitModal', () => ({ ConfirmSubmitModal: () => null }));

const getSubmission = submissionsApi.get as jest.Mock;
const getVersions = submissionsApi.getVersions as jest.Mock;

const polls = new Map<number, () => void>();

function installPollSpy() {
  const realSetInterval = window.setInterval.bind(window);
  const realClearInterval = window.clearInterval.bind(window);
  let nextId = 1;

  jest.spyOn(window, 'setInterval').mockImplementation(((
    handler: TimerHandler,
    timeout?: number,
    ...args: unknown[]
  ) => {
    if (timeout === 30_000 && typeof handler === 'function') {
      const id = nextId;
      nextId += 1;
      polls.set(id, () => {
        handler(...(args as []));
      });
      return id as unknown as ReturnType<typeof setInterval>;
    }
    return realSetInterval(handler, timeout as number, ...(args as []));
  }) as typeof window.setInterval);

  jest.spyOn(window, 'clearInterval').mockImplementation(((id?: number) => {
    if (typeof id === 'number' && polls.has(id)) {
      polls.delete(id);
      return;
    }
    realClearInterval(id as number);
  }) as typeof window.clearInterval);
}

function firePolls() {
  const callbacks = [...polls.values()];
  act(() => {
    callbacks.forEach((callback) => callback());
  });
}

function makeSubmission(overrides: Partial<Submission> = {}): Submission {
  return {
    id: '1363',
    template_block_id: '1',
    student_id: 'student',
    course_id: 'course-v1:edX+Demo+2026',
    usage_key: 'block-v1:edX+Demo+2026+type@tas+block@abc',
    form_data: {},
    status: 'submitted',
    version_number: 2,
    submitted_at: '2026-10-30T00:00:00Z',
    pdf_url: '',
    feedback: null,
    created_at: '2026-10-30T00:00:00Z',
    updated_at: '2026-10-30T00:00:00Z',
    ...overrides,
  };
}

function feedback(
  status: SubmissionFeedback['status'],
  comment: string,
  marks: number,
): SubmissionFeedback {
  return {
    status,
    comment,
    rubrics: [{
      criterion: 'Quality',
      selected_option: comment,
      marks,
      score: marks,
    }],
  };
}

function seed(submission: Submission | null) {
  useTasStore.setState({
    submission,
    selectedTemplate: null,
    selectedTemplateBlockId: null,
    formData: {},
    mfeContext: {
      usageKey: 'block-v1:edX+Demo+2026+type@tas+block@abc',
      courseId: 'course-v1:edX+Demo+2026',
      studentId: 'student',
      isStaff: false,
      isInstructor: false,
    },
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('TasApp submission refresh', () => {
  beforeEach(() => {
    polls.clear();
    installPollSpy();
    getSubmission.mockReset();
    getVersions.mockReset();
    getSubmission.mockImplementation(() => new Promise(() => {}));
    getVersions.mockResolvedValue({ submission_id: '1363', versions: [] });
    seed(null);
  });

  afterEach(() => {
    cleanup();
    polls.clear();
    jest.restoreAllMocks();
    seed(null);
  });

  it('does not refetch when each response allocates a new feedback object with the same status', async () => {
    seed(makeSubmission({ feedback: feedback('approved', 'original', 1) }));
    const first = deferred<Submission>();
    getSubmission.mockImplementationOnce(() => first.promise);

    render(<TasApp />);

    expect(getSubmission).toHaveBeenCalledTimes(1);
    expect(getSubmission).toHaveBeenCalledWith('1363');
    expect(polls.size).toBe(0);

    await act(async () => {
      first.resolve(makeSubmission({
        feedback: feedback('approved', 'revised comment', 5),
      }));
      await first.promise;
    });
    await flushMicrotasks();

    expect(getSubmission).toHaveBeenCalledTimes(1);
    expect(polls.size).toBe(0);
  });

  it('polls every 30 seconds while feedback is null and does not tight-loop', async () => {
    seed(makeSubmission({ feedback: null }));
    getSubmission.mockImplementation(() => Promise.resolve(makeSubmission({
      feedback: null,
      updated_at: `t-${getSubmission.mock.calls.length}`,
    })));

    render(<TasApp />);
    await flushMicrotasks();

    expect(getSubmission).toHaveBeenCalledTimes(1);
    expect(getSubmission).toHaveBeenCalledWith('1363');
    expect(window.setInterval).toHaveBeenCalledWith(expect.any(Function), 30_000);
    expect(polls.size).toBe(1);

    await flushMicrotasks();
    expect(getSubmission).toHaveBeenCalledTimes(1);

    firePolls();
    await flushMicrotasks();
    expect(getSubmission).toHaveBeenCalledTimes(2);
    expect(polls.size).toBe(1);
  });

  it('stops polling when feedback arrives and ignores a later payload with the same status', async () => {
    seed(makeSubmission({ feedback: null }));
    const first = deferred<Submission>();
    const second = deferred<Submission>();
    getSubmission
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);

    render(<TasApp />);
    expect(getSubmission).toHaveBeenCalledTimes(1);
    expect(polls.size).toBe(1);

    await act(async () => {
      first.resolve(makeSubmission({ feedback: feedback('approved', 'now graded', 3) }));
      await first.promise;
    });
    await flushMicrotasks();

    expect(getSubmission).toHaveBeenCalledTimes(2);
    expect(polls.size).toBe(0);

    await act(async () => {
      second.resolve(makeSubmission({ feedback: feedback('approved', 'comment edited', 4) }));
      await second.promise;
    });
    await flushMicrotasks();

    expect(getSubmission).toHaveBeenCalledTimes(2);
    firePolls();
    expect(getSubmission).toHaveBeenCalledTimes(2);
  });

  it('triggers one additional GET on focus', async () => {
    seed(makeSubmission({ feedback: feedback('approved', 'original', 1) }));
    const first = deferred<Submission>();
    getSubmission.mockImplementationOnce(() => first.promise);

    render(<TasApp />);
    expect(getSubmission).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new Event('focus'));
    expect(getSubmission).toHaveBeenCalledTimes(2);

    await act(async () => {
      first.resolve(makeSubmission({ feedback: feedback('approved', 'edited after focus', 8) }));
      await first.promise;
    });
    await flushMicrotasks();
    expect(getSubmission).toHaveBeenCalledTimes(2);
  });

  it('does not GET a draft submission', async () => {
    seed(makeSubmission({ status: 'draft', feedback: null }));

    render(<TasApp />);
    await flushMicrotasks();

    expect(getSubmission).not.toHaveBeenCalled();
    expect(polls.size).toBe(0);

    window.dispatchEvent(new Event('focus'));
    firePolls();
    expect(getSubmission).not.toHaveBeenCalled();
  });

  it('refreshes when feedback status changes and then stops for same-status updates', async () => {
    seed(makeSubmission({ feedback: feedback('pending', 'waiting', 0) }));
    const first = deferred<Submission>();
    const second = deferred<Submission>();
    getSubmission
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);

    render(<TasApp />);
    expect(getSubmission).toHaveBeenCalledTimes(1);
    expect(polls.size).toBe(0);

    await act(async () => {
      first.resolve(makeSubmission({ feedback: feedback('approved', 'graded', 5) }));
      await first.promise;
    });
    await flushMicrotasks();
    expect(getSubmission).toHaveBeenCalledTimes(2);

    await act(async () => {
      second.resolve(makeSubmission({ feedback: feedback('approved', 'graded with new rubric', 2) }));
      await second.promise;
    });
    await flushMicrotasks();
    expect(getSubmission).toHaveBeenCalledTimes(2);
  });

  it('removes the focus listener and interval on unmount', async () => {
    seed(makeSubmission({ feedback: null }));
    getSubmission.mockImplementation(() => Promise.resolve(makeSubmission({ feedback: null })));

    const view = render(<TasApp />);
    await flushMicrotasks();
    expect(getSubmission).toHaveBeenCalledTimes(1);
    expect(polls.size).toBe(1);

    view.unmount();

    expect(polls.size).toBe(0);
    window.dispatchEvent(new Event('focus'));
    firePolls();
    expect(getSubmission).toHaveBeenCalledTimes(1);
  });
});
