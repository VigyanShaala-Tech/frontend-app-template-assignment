import 'core-js/stable';
import 'regenerator-runtime/runtime';

import {
  APP_INIT_ERROR, APP_READY, subscribe, initialize,
} from '@edx/frontend-platform';
import { AppProvider, ErrorPage } from '@edx/frontend-platform/react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Routes, Route, Navigate } from 'react-router-dom';

import Header from '@edx/frontend-component-header';
import { FooterSlot } from '@edx/frontend-component-footer';

import messages from './i18n';
import { StudentPage } from './tas/components/StudentPage';
import { InstructorPage } from './tas/components/InstructorPage';
import { AdminPage } from './tas/components/AdminPage';

import './index.scss';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1 },
  },
});

const container = document.getElementById('root');
const root = createRoot(container!);

subscribe(APP_READY, () => {
  root.render(
    // AppProvider already includes BrowserRouter internally
    <AppProvider>
      <QueryClientProvider client={queryClient}>
        <Header />
        <main style={{ minHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
          <Routes>
            {/* Student submission view */}
            <Route path="/submission/:usageKey" element={<StudentPage />} />

            {/* Instructor grading view */}
            <Route path="/instructor/grade-submissions/:usageKey" element={<InstructorPage />} />

            {/* Admin — template/type management (staff only) */}
            <Route path="/admin/templates" element={<AdminPage />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
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
