/**
 * AdminFeedbackOptionsEditor
 * Configure predefined feedback comment snippets per rubric category for the
 * current assignment (TemplateBlock / usage_key).
 *
 * Does not edit global Template or Rubric grading options.
 */

import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button, Spinner, Form, Alert,
} from '@openedx/paragon';
import { Add, ArrowBack, Close } from '@openedx/paragon/icons';
import { adminFeedbackApi, adminSubmissionsApi } from '../../services/api';
import { useTasStore } from '../../store/tasStore';
import type { CategoryFeedbackConfig, FeedbackOption } from '../../types';

interface Props {
  onBack: () => void;
}

function generateOptionId() {
  return `fb-${Math.random().toString(36).slice(2, 10)}`;
}

function buildCategoriesFromRubrics(
  criteria: { criterion: string }[],
  saved: CategoryFeedbackConfig[],
): CategoryFeedbackConfig[] {
  const byId = new Map(saved.map((c) => [c.category_id, c.options]));
  return criteria.map((c) => ({
    category_id: c.criterion,
    options: (byId.get(c.criterion) ?? []).map((o) => ({ ...o })),
  }));
}

export const AdminFeedbackOptionsEditor: React.FC<Props> = ({ onBack }) => {
  const { mfeContext } = useTasStore();
  const usageKey = mfeContext?.usageKey ?? '';
  const qc = useQueryClient();

  const [categories, setCategories] = useState<CategoryFeedbackConfig[]>([]);
  const [error, setError] = useState('');
  const [initialized, setInitialized] = useState(false);

  const rubricsQuery = useQuery({
    queryKey: ['block-rubrics', usageKey],
    queryFn: () => adminSubmissionsApi.getRubrics(usageKey),
    enabled: !!usageKey,
  });

  const optionsQuery = useQuery({
    queryKey: ['block-feedback-options', usageKey],
    queryFn: () => adminFeedbackApi.getOptions(usageKey),
    enabled: !!usageKey,
  });

  useEffect(() => {
    if (!rubricsQuery.data || !optionsQuery.data || initialized) return;
    setCategories(
      buildCategoriesFromRubrics(rubricsQuery.data.rubrics ?? [], optionsQuery.data.categories ?? []),
    );
    setInitialized(true);
  }, [rubricsQuery.data, optionsQuery.data, initialized]);

  // Reset local form when assignment (usageKey) changes
  useEffect(() => {
    setInitialized(false);
    setCategories([]);
    setError('');
  }, [usageKey]);

  const saveMut = useMutation({
    mutationFn: (payload: CategoryFeedbackConfig[]) => adminFeedbackApi.setOptions(usageKey, payload),
    onSuccess: (data) => {
      qc.setQueryData(['block-feedback-options', usageKey], data);
      // Reviewer reads via rubrics; invalidate so a fresh review load gets new snippets
      qc.invalidateQueries({ queryKey: ['block-rubrics', usageKey] });
      setError('');
    },
    onError: (e: any) => setError(e?.response?.data ? JSON.stringify(e.response.data) : e.message),
  });

  const setOptionLabel = (ci: number, oi: number, label: string) => {
    setCategories((prev) => prev.map((cat, i) => {
      if (i !== ci) return cat;
      const options = cat.options.map((o, j) => (j === oi ? { ...o, label } : o));
      return { ...cat, options };
    }));
  };

  const addOption = (ci: number) => {
    const next: FeedbackOption = { id: generateOptionId(), label: '' };
    setCategories((prev) => prev.map((cat, i) => (
      i === ci ? { ...cat, options: [...cat.options, next] } : cat
    )));
  };

  const removeOption = (ci: number, oi: number) => {
    setCategories((prev) => prev.map((cat, i) => {
      if (i !== ci) return cat;
      return { ...cat, options: cat.options.filter((_, j) => j !== oi) };
    }));
  };

  const moveOption = (ci: number, oi: number, dir: -1 | 1) => {
    setCategories((prev) => prev.map((cat, i) => {
      if (i !== ci) return cat;
      const target = oi + dir;
      if (target < 0 || target >= cat.options.length) return cat;
      const options = [...cat.options];
      const [moved] = options.splice(oi, 1);
      options.splice(target, 0, moved);
      return { ...cat, options };
    }));
  };

  const handleSave = () => {
    for (const cat of categories) {
      for (const o of cat.options) {
        if (!o.label.trim()) {
          setError(`All options under "${cat.category_id}" need a label.`);
          return;
        }
      }
    }
    setError('');
    saveMut.mutate(
      categories.map((c) => ({
        category_id: c.category_id,
        options: c.options.map((o) => ({ id: o.id, label: o.label.trim() })),
      })),
    );
  };

  if (!usageKey) {
    return (
      <div className="d-flex flex-column h-100">
        <div className="d-flex align-items-center gap-3 px-4 py-3 bg-white border-bottom shadow-sm flex-shrink-0">
          <Button variant="tertiary" size="sm" iconBefore={ArrowBack} onClick={onBack}>
            Templates
          </Button>
          <span className="text-muted">/</span>
          <span className="font-weight-bold small flex-grow-1">Feedback Options</span>
        </div>
        <div className="p-4">
          <Alert variant="warning">
            Open this page with an assignment usage key, e.g.
            {' '}
            <code>/admin/templates?usage_key=block-v1:…</code>
            , to configure predefined feedback for that assignment.
          </Alert>
        </div>
      </div>
    );
  }

  const isLoading = rubricsQuery.isLoading || optionsQuery.isLoading;
  const criterionCount = rubricsQuery.data?.rubrics?.length ?? 0;

  return (
    <div className="d-flex flex-column h-100">
      <div className="d-flex align-items-center gap-3 px-4 py-3 bg-white border-bottom shadow-sm flex-shrink-0">
        <Button variant="tertiary" size="sm" iconBefore={ArrowBack} onClick={onBack}>
          Templates
        </Button>
        <span className="text-muted">/</span>
        <span className="font-weight-bold small flex-grow-1 text-truncate">
          Feedback Options
        </span>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={saveMut.isPending || isLoading || criterionCount === 0}
        >
          {saveMut.isPending
            ? <Spinner animation="border" size="sm" screenReaderText="Saving" />
            : 'Save'}
        </Button>
      </div>

      <div className="flex-grow-1 overflow-auto p-4" style={{ maxWidth: 640 }}>
        <p className="small text-muted mb-3">
          Predefined comment snippets for reviewers, scoped to this assignment.
          Categories come from the block rubric.
        </p>

        {error && <Alert variant="danger" className="mb-3 small">{error}</Alert>}
        {saveMut.isSuccess && !saveMut.isPending && (
          <Alert variant="success" className="mb-3 small">Feedback options saved.</Alert>
        )}

        {isLoading && (
          <div className="d-flex justify-content-center py-5">
            <Spinner animation="border" variant="primary" screenReaderText="Loading" />
          </div>
        )}

        {(rubricsQuery.isError || optionsQuery.isError) && (
          <Alert variant="danger" className="mb-3 small">
            Failed to load feedback options or rubrics for this assignment.
          </Alert>
        )}

        {!isLoading && !rubricsQuery.isError && criterionCount === 0 && (
          <Alert variant="warning">
            Assign a rubric to this assignment first, then return here to configure feedback options.
          </Alert>
        )}

        {!isLoading && categories.map((cat, ci) => (
          <div
            key={cat.category_id}
            className="mb-4 p-3 rounded border"
            style={{ background: '#f8f9fa' }}
          >
            <div className="d-flex align-items-center mb-3">
              <span className="font-weight-bold small flex-grow-1">{cat.category_id}</span>
              <Button variant="tertiary" size="sm" iconBefore={Add} onClick={() => addOption(ci)}>
                Add option
              </Button>
            </div>

            {cat.options.length === 0 && (
              <p className="text-muted small mb-0">No options yet for this category.</p>
            )}

            {cat.options.map((opt, oi) => (
              <div key={opt.id} className="d-flex align-items-center mb-2" style={{ gap: '0.4rem' }}>
                <Form.Control
                  size="sm"
                  value={opt.label}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOptionLabel(ci, oi, e.target.value)}
                  placeholder="Feedback label"
                  style={{ flex: 1 }}
                />
                <Button
                  variant="tertiary"
                  size="sm"
                  onClick={() => moveOption(ci, oi, -1)}
                  disabled={oi === 0}
                  title="Move up"
                >
                  ↑
                </Button>
                <Button
                  variant="tertiary"
                  size="sm"
                  onClick={() => moveOption(ci, oi, 1)}
                  disabled={oi === cat.options.length - 1}
                  title="Move down"
                >
                  ↓
                </Button>
                <Button
                  variant="tertiary"
                  size="sm"
                  iconBefore={Close}
                  onClick={() => removeOption(ci, oi)}
                  className="text-danger"
                  title="Remove"
                >
                  {' '}
                </Button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
