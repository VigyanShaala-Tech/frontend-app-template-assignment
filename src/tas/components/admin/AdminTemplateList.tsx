import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button, Badge, Spinner, Card, Form,
} from '@openedx/paragon';
import { Add, Search } from '@openedx/paragon/icons';
import { templatesApi, adminTemplatesApi } from '../../services/api';
import type { Template } from '../../types';

interface Props {
  onEdit: (template: Template) => void;
  onCreate: () => void;
  onManageTypes: () => void;
}

const TYPE_VARIANT: Record<string, string> = {
  'lab-report': 'success',
  'essay':      'primary',
  'worksheet':  'warning',
};

export const AdminTemplateList: React.FC<Props> = ({ onEdit, onCreate, onManageTypes }) => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-templates'],
    queryFn: () => templatesApi.list({ active_only: false }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminTemplatesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-templates'] }),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      adminTemplatesApi.toggleActive(id, is_active),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-templates'] }),
  });

  const filtered = (data?.results ?? []).filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleDelete = (t: Template) => {
    if (window.confirm(`Delete "${t.name}"? This cannot be undone.`)) {
      deleteMut.mutate(t.id);
    }
  };

  return (
    <div className="d-flex flex-column h-100 bg-light-200">
      {/* Header */}
      <div className="d-flex align-items-center gap-3 px-4 py-3 bg-white border-bottom">
        <div className="flex-grow-1">
          <h2 className="h5 mb-0">Templates</h2>
          <small className="text-muted">
            {data?.count ?? 0} template{(data?.count ?? 0) !== 1 ? 's' : ''}
          </small>
        </div>

        <Form.Control
          leadingElement={<Search />}
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          placeholder="Search…"
          size="sm"
          style={{ width: 180 }}
        />

        <Button
          variant="tertiary"
          size="sm"
          onClick={onManageTypes}
        >
          Manage Types
        </Button>

        <Button
          variant="primary"
          size="sm"
          iconBefore={Add}
          onClick={onCreate}
        >
          New Template
        </Button>
      </div>

      {/* Body */}
      <div className="flex-grow-1 overflow-auto p-4">
        {isLoading && (
          <div className="d-flex justify-content-center pt-5">
            <Spinner animation="border" variant="primary" screenReaderText="Loading templates" />
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center pt-5 text-muted">
            <p className="mb-2">
              {search ? 'No templates match your search.' : 'No templates yet.'}
            </p>
            {!search && (
              <Button variant="link" size="sm" onClick={onCreate}>
                Create your first template →
              </Button>
            )}
          </div>
        )}

        <div className="row g-3">
          {filtered.map((t) => {
            const typeVariant = TYPE_VARIANT[t.template_type?.slug ?? ''] ?? 'info';
            return (
              <div key={t.id} className="col-12 col-sm-6 col-lg-4 col-xl-3">
                <Card
                  style={{ opacity: t.is_active ? 1 : 0.6 }}
                  className="h-100 shadow-sm"
                >
                  {/* Thumbnail */}
                  <Card.ImageCap
                    src={t.thumbnail_url || t.image_url || ''}
                    fallbackSrc=""
                    srcAlt={t.name}
                    style={{ height: 120, objectFit: 'cover', background: '#f3f4f6' }}
                  />

                  <Card.Header
                    title={t.name}
                    actions={(
                      <Badge variant={t.is_active ? 'success' : 'secondary'} className="ml-auto">
                        {t.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    )}
                  />

                  <Card.Section>
                    <Badge variant={typeVariant} className="mr-1">
                      {t.template_type?.name ?? '—'}
                    </Badge>
                    <Badge variant="secondary" className="mr-1">
                      {t.fields.length} fields
                    </Badge>
                    <Badge variant={t.is_public ? 'success' : 'secondary'}>
                      {t.is_public ? 'Public' : 'Private'}
                    </Badge>
                    {t.description && (
                      <p className="small text-muted mt-2 mb-0" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {t.description}
                      </p>
                    )}
                  </Card.Section>

                  <Card.Footer>
                    <Button variant="tertiary" size="sm" onClick={() => onEdit(t)}>
                      Edit
                    </Button>
                    <Button
                      variant="tertiary"
                      size="sm"
                      onClick={() => toggleMut.mutate({ id: t.id, is_active: t.is_active })}
                      disabled={toggleMut.isPending}
                    >
                      {t.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="tertiary"
                      size="sm"
                      className="text-danger"
                      onClick={() => handleDelete(t)}
                      disabled={deleteMut.isPending}
                    >
                      Delete
                    </Button>
                  </Card.Footer>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
