/**
 * AdminRubricManager
 * Create, edit, and deactivate rubrics.
 *
 * A rubric has:
 *   - name (string)
 *   - criteria: [{ criterion, options: [{ name, marks }] }]
 *
 * The left panel is a full rubric form (name + dynamic criteria/options).
 * The right panel lists existing rubrics with edit/deactivate actions.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button, Badge, Spinner, Form, Alert,
} from '@openedx/paragon';
import { Add, ArrowBack, Close, Edit } from '@openedx/paragon/icons';
import { rubricsApi } from '../../services/api';
import type { Rubric, RubricCriterion, RubricOption } from '../../types';

interface Props {
  onBack: () => void;
}

const EMPTY_OPTION: RubricOption = { name: '', marks: 0 };
const EMPTY_CRITERION: RubricCriterion = { criterion: '', options: [{ ...EMPTY_OPTION }] };

function emptyForm() {
  return { name: '', criteria: [{ ...EMPTY_CRITERION, options: [{ ...EMPTY_OPTION }] }] as RubricCriterion[] };
}

export const AdminRubricManager: React.FC<Props> = ({ onBack }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['rubrics-all'],
    queryFn: () => rubricsApi.list(),
  });

  const saveMut = useMutation({
    mutationFn: (payload: { name: string; criteria: RubricCriterion[] }) =>
      editingId
        ? rubricsApi.update(editingId, payload)
        : rubricsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rubrics-all'] });
      setForm(emptyForm());
      setEditingId(null);
      setError('');
    },
    onError: (e: any) => setError(e?.response?.data ? JSON.stringify(e.response.data) : e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => rubricsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rubrics-all'] }),
  });

  // ── Criterion helpers ──────────────────────────────────────────────────────

  const setCriterionName = (ci: number, value: string) =>
    setForm((prev) => {
      const criteria = prev.criteria.map((c, i) => i === ci ? { ...c, criterion: value } : c);
      return { ...prev, criteria };
    });

  const addCriterion = () =>
    setForm((prev) => ({
      ...prev,
      criteria: [...prev.criteria, { ...EMPTY_CRITERION, options: [{ ...EMPTY_OPTION }] }],
    }));

  const removeCriterion = (ci: number) =>
    setForm((prev) => ({ ...prev, criteria: prev.criteria.filter((_, i) => i !== ci) }));

  // ── Option helpers ────────────────────────────────────────────────────────

  const setOptionField = (ci: number, oi: number, field: keyof RubricOption, value: string | number) =>
    setForm((prev) => {
      const criteria = prev.criteria.map((c, i) => {
        if (i !== ci) return c;
        const options = c.options.map((o, j) => j === oi ? { ...o, [field]: value } : o);
        return { ...c, options };
      });
      return { ...prev, criteria };
    });

  const addOption = (ci: number) =>
    setForm((prev) => {
      const criteria = prev.criteria.map((c, i) =>
        i === ci ? { ...c, options: [...c.options, { ...EMPTY_OPTION }] } : c,
      );
      return { ...prev, criteria };
    });

  const removeOption = (ci: number, oi: number) =>
    setForm((prev) => {
      const criteria = prev.criteria.map((c, i) => {
        if (i !== ci) return c;
        return { ...c, options: c.options.filter((_, j) => j !== oi) };
      });
      return { ...prev, criteria };
    });

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = () => {
    if (!form.name.trim()) { setError('Rubric name is required.'); return; }
    for (const [ci, c] of form.criteria.entries()) {
      if (!c.criterion.trim()) { setError(`Category ${ci + 1} needs a name.`); return; }
      if (c.options.length === 0) { setError(`Category "${c.criterion}" needs at least one criteria.`); return; }
      for (const o of c.options) {
        if (!o.name.trim()) { setError(`All criteria in "${c.criterion}" need a name.`); return; }
      }
    }
    setError('');
    saveMut.mutate({ name: form.name.trim(), criteria: form.criteria });
  };

  const startEdit = (r: Rubric) => {
    setEditingId(r.id);
    setForm({ name: r.name, criteria: r.criteria.map((c) => ({ ...c, options: [...c.options] })) });
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm());
    setError('');
  };

  const rubrics = data?.results ?? [];

  return (
    <div className="d-flex flex-column">
      <div className="d-flex align-items-center mb-4 flex-wrap" style={{ gap: '0.5rem' }}>
        <Button variant="tertiary" size="sm" iconBefore={ArrowBack} onClick={onBack}>
          Templates
        </Button>
        <span className="text-muted">/</span>
        <h1 className="h3 mb-0">Rubrics</h1>
      </div>

      <div className="d-flex rounded border overflow-hidden bg-white" style={{ minHeight: '24rem' }}>
        {/* Left: form */}
        <div className="overflow-auto border-right p-4" style={{ width: 380, flexShrink: 0 }}>
          <h3 className="h6 mb-4">{editingId ? 'Edit Rubric' : 'New Rubric'}</h3>

          {error && <Alert variant="danger" className="mb-3 small">{error}</Alert>}

          <Form.Group controlId="rubric-name" className="mb-4">
            <Form.Label>Name <span className="text-danger">*</span></Form.Label>
            <Form.Control
              size="sm"
              value={form.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setForm((p) => ({ ...p, name: e.target.value }))
              }
              placeholder="e.g. Essay Rubric"
            />
          </Form.Group>

          <div className="mb-2 d-flex align-items-center justify-content-between">
            <span className="small font-weight-bold">Categories</span>
            <Button variant="tertiary" size="sm" iconBefore={Add} onClick={addCriterion}>
              Add Category
            </Button>
          </div>

          {form.criteria.map((criterion, ci) => (
            <div
              key={ci}
              className="mb-3 p-3 rounded border"
              style={{ background: '#f8f9fa' }}
            >
              <div className="d-flex align-items-center mb-2" style={{ gap: '0.5rem' }}>
                <Form.Control
                  size="sm"
                  value={criterion.criterion}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCriterionName(ci, e.target.value)
                  }
                  placeholder={`Category ${ci + 1} name`}
                  style={{ flex: 1 }}
                />
                {form.criteria.length > 1 && (
                  <Button
                    variant="tertiary"
                    size="sm"
                    iconBefore={Close}
                    onClick={() => removeCriterion(ci)}
                    className="text-danger"
                  >
                    {' '}
                  </Button>
                )}
              </div>

              {/* Options */}
              <div className="mb-2">
                {criterion.options.map((opt, oi) => (
                  <div key={oi} className="d-flex align-items-center mb-1" style={{ gap: '0.4rem' }}>
                    <Form.Control
                      size="sm"
                      value={opt.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setOptionField(ci, oi, 'name', e.target.value)
                      }
                      placeholder="Criteria label"
                      style={{ flex: 2 }}
                    />
                    <Form.Control
                      size="sm"
                      type="number"
                      min={0}
                      value={opt.marks}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setOptionField(ci, oi, 'marks', Number(e.target.value))
                      }
                      placeholder="Marks"
                      style={{ flex: 1 }}
                    />
                    {criterion.options.length > 1 && (
                      <Button
                        variant="tertiary"
                        size="sm"
                        iconBefore={Close}
                        onClick={() => removeOption(ci, oi)}
                        className="text-muted"
                      >
                        {' '}
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <Button variant="tertiary" size="sm" iconBefore={Add} onClick={() => addOption(ci)}>
                <span style={{ fontSize: 12 }}>Add Criteria</span>
              </Button>
            </div>
          ))}

          <div className="d-flex mt-4" style={{ gap: '0.5rem' }}>
            <Button
              variant="primary"
              size="sm"
              iconBefore={editingId ? undefined : Add}
              onClick={handleSubmit}
              disabled={saveMut.isPending}
            >
              {saveMut.isPending
                ? <Spinner animation="border" size="sm" screenReaderText="Saving" />
                : editingId ? 'Save Changes' : 'Create Rubric'}
            </Button>
            {editingId && (
              <Button variant="tertiary" size="sm" iconBefore={Close} onClick={cancelEdit}>
                {' '}
              </Button>
            )}
          </div>
        </div>

        {/* Right: list */}
        <div className="flex-grow-1 overflow-auto p-4">
          <h3 className="h6 mb-3">Existing Rubrics</h3>

          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" variant="primary" screenReaderText="Loading" />
            </div>
          )}

          {!isLoading && rubrics.length === 0 && (
            <p className="text-muted small">No rubrics yet. Create one on the left.</p>
          )}

          <div className="d-flex flex-column" style={{ gap: '0.75rem' }}>
            {rubrics.map((r) => (
              <div
                key={r.id}
                className="bg-white rounded border p-3"
                style={{ borderColor: editingId === r.id ? '#2563eb' : undefined }}
              >
                <div className="d-flex align-items-center mb-2">
                  <span className="font-weight-bold small flex-grow-1">{r.name}</span>
                  <Badge variant={r.is_active ? 'success' : 'light'} className="mr-2 small">
                    {r.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <Button
                    variant="tertiary"
                    size="sm"
                    iconBefore={Edit}
                    onClick={() => startEdit(r)}
                    disabled={deleteMut.isPending}
                  >
                    {' '}
                  </Button>
                  <Button
                    variant="tertiary"
                    size="sm"
                    iconBefore={Close}
                    className="text-danger"
                    onClick={() => {
                      if (window.confirm(`Deactivate rubric "${r.name}"?`)) deleteMut.mutate(r.id);
                    }}
                    disabled={deleteMut.isPending || !r.is_active}
                  >
                    {' '}
                  </Button>
                </div>

                {r.criteria.map((c, ci) => (
                  <div key={ci} className="mb-1" style={{ fontSize: 12 }}>
                    <span className="font-weight-bold text-muted">{c.criterion}: </span>
                    {c.options.map((o, oi) => (
                      <span key={oi} className="mr-2">
                        {o.name} <span className="text-muted">({o.marks} pts)</span>
                        {oi < c.options.length - 1 && ' · '}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
