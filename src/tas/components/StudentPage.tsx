/**
 * StudentPage
 * Mounted at /submission/:usageKey
 * Reads usageKey from the URL, sets up MfeContext with isStaff/isInstructor=false,
 * then renders TasApp.
 */

import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getAuthenticatedUser } from '@edx/frontend-platform/auth';
import { useTasStore } from '../store/tasStore';
import { TasApp } from './TasApp';

export const StudentPage: React.FC = () => {
  const { usageKey: rawUsageKey } = useParams<{ usageKey: string }>();
  const usageKey = rawUsageKey ? decodeURIComponent(rawUsageKey) : undefined;
  const setMfeContext = useTasStore((s) => s.setMfeContext);
  const mfeContext = useTasStore((s) => s.mfeContext);

  useEffect(() => {
    if (!usageKey) return;

    const injected = (window as any).__TAS_CONTEXT__;
    const user = getAuthenticatedUser();
    const params = new URLSearchParams(window.location.search);

    setMfeContext({
      usageKey,
      courseId:
        injected?.courseId
        || params.get('course_id')
        || usageKey.replace(/type@.*$/, '').replace('block-v1:', 'course-v1:').replace(/\+[^+]+$/, ''),
      studentId:
        injected?.studentId
        || params.get('student_id')
        || (user ? String((user as any).username) : 'student_demo'),
      isStaff: false,
      isInstructor: false,
    });
  }, [usageKey, setMfeContext]);

  if (!mfeContext || mfeContext.usageKey !== usageKey) {
    return null; // wait for context to be set
  }

  return <TasApp />;
};
