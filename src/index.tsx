import 'core-js/stable';
import 'regenerator-runtime/runtime';

import {
  APP_INIT_ERROR, APP_READY, subscribe, initialize,
} from '@edx/frontend-platform';
import { getAuthenticatedUser } from '@edx/frontend-platform/auth';
import { AppProvider, ErrorPage } from '@edx/frontend-platform/react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import Header from '@edx/frontend-component-header';
import { FooterSlot } from '@edx/frontend-component-footer';

import messages from './i18n';
import { TasApp } from './tas/components/TasApp';
import { useTasStore } from './tas/store/tasStore';
import type { MfeContext } from './tas/types';

import './index.scss';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1 },
  },
});

const container = document.getElementById('root');
const root = createRoot(container!);

/**
 * Read the MFE context from:
 *  1. URL query params  (?usage_key=...&course_id=...)  — useful during dev
 *  2. window.__TAS_CONTEXT__ injected by the XBlock
 *  3. Sensible dev defaults
 */
function resolveMfeContext(): MfeContext {
  // Check XBlock-injected global
  const injected = (window as any).__TAS_CONTEXT__ as Partial<MfeContext> | undefined;

  // URL params (dev convenience)
  const params = new URLSearchParams(window.location.search);

  // Authenticated user from OpenEdX JWT
  const user = getAuthenticatedUser();

  return {
    usageKey:
      injected?.usageKey
      || params.get('usage_key')
      || 'block-v1:Org+Course101+2024+type@format_forge+block@abc123',
    courseId:
      injected?.courseId
      || params.get('course_id')
      || 'course-v1:Org+Course101+2024',
    studentId:
      injected?.studentId
      || params.get('student_id')
      || (user ? String((user as any).username) : 'student_demo'),
    isStaff:
      injected?.isStaff !== undefined
        ? injected.isStaff
        : params.get('is_staff') === 'true',
    isInstructor:
      injected?.isInstructor !== undefined
        ? injected.isInstructor
        : params.get('is_instructor') === 'true',
  };
}

subscribe(APP_READY, () => {
  const ctx = resolveMfeContext();
  useTasStore.getState().setMfeContext(ctx);

  root.render(
    <AppProvider>
      <QueryClientProvider client={queryClient}>
        <Header />
        <main style={{ minHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
          <TasApp />
        </main>
        <FooterSlot />
      </QueryClientProvider>
    </AppProvider>,
  );
});

subscribe(APP_INIT_ERROR, (error: { message: any }) => {
  root.render(<ErrorPage message={error.message} />);
});

initialize({ messages });
