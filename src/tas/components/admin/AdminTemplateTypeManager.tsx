/**
 * AdminTemplateTypeManager
 * Create, edit, and deactivate template types.
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button, Badge, Spinner, Form, Alert, AlertModal,
} from '@openedx/paragon';
import { Add, ArrowBack, Close, Edit, WarningAmber } from '@openedx/paragon/icons';
import { templateTypesApi, templatesApi } from '../../services/api';
import type { TemplateType } from '../../types';

interface Props {
  onBack: () => void;
}

const EMPTY_FORM = { name: '', slug: '', description: '' };

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export const AdminTemplateTypeManager: React.FC<Props> = ({ onBack }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [depsBlockedModalOpen, setDepsBlockedModalOpen] = useState(false);
  const [depsBlockedMessage, setDepsBlockedMessage] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['template-types-all'],
    queryFn: () => templateTypesApi.list(),
  });

  const { data: templatesData, isLoading: templatesDepsLoading } = useQuery({
    queryKey: ['admin-templates', 'dependency-count'],
    queryFn: () => templatesApi.list({ active_only: false }),
  });

  const templateCountByTypeId = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of templatesData?.results ?? []) {
      const tid = t.template_type_id || t.template_type?.id;
      if (tid === undefined || tid === '') continue;
      const k = String(tid);
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [templatesData]);

  const createMut = useMutation({
    mutationFn: (body: Omit<TemplateType, 'id'>) => templateTypesApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['template-types-all'] });
      qc.invalidateQueries({ queryKey: ['template-types'] });
      setForm(EMPTY_FORM);
      setEditingId(null);
      setError('');
    },
    onError: (e: any) => setError(e?.response?.data ? JSON.stringify(e.response.data) : e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Omit<TemplateType, 'id'>> }) =>
      templateTypesApi.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['template-types-all'] });
      qc.invalidateQueries({ queryKey: ['template-types'] });
      setForm(EMPTY_FORM);
      setEditingId(null);
      setError('');
    },
    onError: (e: any) => setError(e?.response?.data ? JSON.stringify(e.response.data) : e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => templateTypesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['template-types-all'] });
      qc.invalidateQueries({ queryKey: ['template-types'] });
      qc.invalidateQueries({ queryKey: ['admin-templates'] });
    },
    onError: (e: any) => setError(e?.response?.data ? JSON.stringify(e.response.data) : e.message),
  });

  const handleNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      // Auto-generate slug only when not editing (or slug hasn't been manually changed)
      slug: editingId ? prev.slug : toSlug(name),
    }));
  };

  const handleSubmit = () => {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setError('');
    const name = form.name.trim();
    const slug = (editingId ? form.slug : toSlug(name)).trim();
    if (!slug) { setError('Name must contain letters or numbers.'); return; }
    const body = {
      name,
      slug,
      description: form.description.trim(),
      is_active: true,
    };
    if (editingId) {
      updateMut.mutate({ id: editingId, body });
    } else {
      createMut.mutate(body);
    }
  };

  const startEdit = (tt: TemplateType) => {
    setEditingId(tt.id);
    setForm({ name: tt.name, slug: tt.slug, description: tt.description });
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
  };

  const isPending = createMut.isPending || updateMut.isPending;
  const types = data?.results ?? [];

  return (
    <div className="d-flex flex-column h-100">
      {/* Header */}
      <div className="d-flex align-items-center gap-3 px-4 py-3 bg-white border-bottom shadow-sm flex-shrink-0">
        <Button variant="tertiary" size="sm" iconBefore={ArrowBack} onClick={onBack}>
          Templates
        </Button>
        <span className="text-muted">/</span>
        <span className="font-weight-bold small flex-grow-1">Template Types</span>
      </div>

      <div className="d-flex flex-grow-1 overflow-hidden">

        {/* Left: form */}
        <div className="overflow-auto bg-white border-right p-4" style={{ width: 320, flexShrink: 0 }}>
          <h3 className="h6 mb-4">{editingId ? 'Edit Type' : 'New Type'}</h3>

          {error && (
            <Alert variant="danger" className="mb-3 small">{error}</Alert>
          )}

          <Form.Group controlId="tt-name" className="mb-3">
            <Form.Label>Name <span className="text-danger">*</span></Form.Label>
            <Form.Control
              size="sm"
              value={form.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNameChange(e.target.value)}
              placeholder="e.g. Lab Report"
            />
          </Form.Group>

          <Form.Group controlId="tt-desc" className="mb-4">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              size="sm"
              rows={2}
              value={form.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Optional description…"
              style={{ resize: 'none' }}
            />
          </Form.Group>

          <div className="d-flex gap-2">
            <Button
              variant="primary"
              size="sm"
              iconBefore={editingId ? undefined : Add}
              onClick={handleSubmit}
              disabled={isPending}
            >
              {isPending
                ? <Spinner animation="border" size="sm" screenReaderText="Saving" />
                : editingId ? 'Save Changes' : 'Create Type'}
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
          <h3 className="h6 mb-3">Existing Types</h3>

          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" variant="primary" screenReaderText="Loading" />
            </div>
          )}

          {!isLoading && types.length === 0 && (
            <p className="text-muted small">No template types yet. Create one on the left.</p>
          )}

          <div className="d-flex flex-column gap-2">
            {types.map((tt) => (
              <div
                key={tt.id}
                className="d-flex align-items-center gap-3 p-3 bg-white rounded border"
                style={{ borderColor: editingId === tt.id ? '#2563eb' : undefined }}
              >
                <div className="flex-grow-1">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <span className="font-weight-bold small">{tt.name}</span>
                    <Badge variant={tt.is_active ? 'success' : 'light'} className="small">
                      {tt.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  {tt.description && (
                    <div className="text-muted" style={{ fontSize: 11 }}>
                      {tt.description}
                    </div>
                  )}
                </div>

                <Button
                  variant="tertiary"
                  size="sm"
                  iconBefore={Edit}
                  onClick={() => startEdit(tt)}
                  disabled={deleteMut.isPending}
                >
                  {' '}
                </Button>

                <Button
                  variant="tertiary"
                  size="sm"
                  className="text-danger"
                  iconBefore={Close}
                  onClick={() => {
                    const dependentCount = templateCountByTypeId.get(String(tt.id)) ?? 0;
                    if (dependentCount > 0) {
                      setDepsBlockedMessage(
                        `Cannot deactivate "${tt.name}". ${dependentCount} template${dependentCount === 1 ? '' : 's'} still use this type. Delete or reassign those templates first.`,
                      );
                      setDepsBlockedModalOpen(true);
                      return;
                    }
                    if (window.confirm(`Deactivate "${tt.name}"?`)) deleteMut.mutate(tt.id);
                  }}
                  disabled={deleteMut.isPending || !tt.is_active || templatesDepsLoading}
                >
                  {' '}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AlertModal
        variant="warning"
        icon={WarningAmber}
        title="Templates depend on this type"
        isOpen={depsBlockedModalOpen}
        onClose={() => setDepsBlockedModalOpen(false)}
        footerNode={(
          <Button variant="primary" size="sm" onClick={() => setDepsBlockedModalOpen(false)}>
            OK
          </Button>
        )}
        hasCloseButton
        size="sm"
      >
        <p className="mb-0 small">{depsBlockedMessage}</p>
      </AlertModal>
    </div>
  );
};
