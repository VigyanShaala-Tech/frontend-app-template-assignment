/**
 * AdminTemplateEditor
 * Two-panel: left = metadata + fields, right = canvas with draggable field overlays.
 */

import React, { useState, useRef, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import {
  Button, Form, Badge, Spinner,
} from '@openedx/paragon';
import { ArrowBack, Add, Close, ZoomIn, ZoomOut, Refresh } from '@openedx/paragon/icons';
import { templateTypesApi, adminTemplatesApi } from '../../services/api';
import type { Template, FormField, FieldPosition, TemplateCreateBody } from '../../types';

function generateFieldId() {
  return `f-${Math.random().toString(36).slice(2, 8)}`;
}

const FIELD_TYPES: FormField['type'][] = ['text', 'textarea', 'number', 'date', 'select', 'checkbox', 'radio'];
const DEFAULT_POSITION: FieldPosition = { x: 10, y: 10, width: 40, height: 5 };

const BADGE_COLORS = ['primary', 'success', 'warning', 'danger', 'info', 'dark'] as const;

// ── FieldRow ──────────────────────────────────────────────────────────────────

interface FieldRowProps {
  field: FormField;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (f: FormField) => void;
  onRemove: () => void;
}

const FieldRow: React.FC<FieldRowProps> = ({ field, index, isSelected, onSelect, onChange, onRemove }) => (
  <div
    onClick={onSelect}
    className="mb-2"
    style={{
      border: `2px solid ${isSelected ? '#0000ff' : '#e5e7eb'}`,
      borderRadius: 10, padding: '8px 10px',
      background: isSelected ? '#eff6ff' : '#fff',
      cursor: 'pointer', transition: 'border-color 0.15s',
    }}
  >
    <div className="d-flex align-items-center gap-2">
      <Badge variant="light" className="border" style={{ minWidth: 22, textAlign: 'center', fontSize: 10 }}>
        {index + 1}
      </Badge>

      <Form.Control
        value={field.label}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...field, label: e.target.value })}
        placeholder="Field label"
        size="sm"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        floatingLabel=""
        style={{ flex: 1 }}
      />

      <Form.Control
        as="select"
        value={field.type}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange({ ...field, type: e.target.value as FormField['type'] })}
        size="sm"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        style={{ width: 'auto' }}
      >
        {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
      </Form.Control>

      <Form.Checkbox
        label="Req"
        checked={field.required}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...field, required: e.target.checked })}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      />

      <Button
        variant="tertiary"
        size="sm"
        className="p-0 text-danger"
        iconBefore={Close}
        onClick={(e: React.MouseEvent) => { e.stopPropagation(); onRemove(); }}
      >
        {' '}
      </Button>
    </div>

    {isSelected && (field.type === 'select' || field.type === 'radio') && (
      <div className="mt-2" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <Form.Label className="x-small text-muted">Options (one per line)</Form.Label>
        <Form.Control
          as="textarea"
          rows={3}
          value={(field.options ?? []).join('\n')}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            onChange({ ...field, options: e.target.value.split('\n').filter((o) => o.trim()) })
          }
          placeholder={'Option A\nOption B'}
          size="sm"
        />
      </div>
    )}
  </div>
);

// ── DraggableOverlay ──────────────────────────────────────────────────────────

interface DraggableOverlayProps {
  field: FormField;
  fieldIndex: number;
  position: FieldPosition;
  isSelected: boolean;
  canvasW: number;
  canvasH: number;
  onSelect: () => void;
  onPositionChange: (pos: FieldPosition) => void;
}

const DraggableOverlay: React.FC<DraggableOverlayProps> = ({
  field, fieldIndex, position, isSelected, canvasW, canvasH, onSelect, onPositionChange,
}) => {
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const resizeRef = useRef<{ sx: number; sy: number; ow: number; oh: number } | null>(null);

  const variantIdx = fieldIndex % BADGE_COLORS.length;
  const BORDER_COLORS = ['#2563eb','#16a34a','#d97706','#dc2626','#0891b2','#374151'];
  const LABEL_COLORS  = ['#2563eb','#16a34a','#d97706','#dc2626','#0891b2','#374151'];
  const borderColor = BORDER_COLORS[variantIdx];
  const labelColor  = LABEL_COLORS[variantIdx];

  const px = {
    left:   (position.x      / 100) * canvasW,
    top:    (position.y      / 100) * canvasH,
    width:  (position.width  / 100) * canvasW,
    height: (position.height / 100) * canvasH,
  };

  const onMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: position.x, oy: position.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      onPositionChange({
        ...position,
        x: Math.max(0, Math.min(100 - position.width,  dragRef.current.ox + ((ev.clientX - dragRef.current.sx) / canvasW) * 100)),
        y: Math.max(0, Math.min(100 - position.height, dragRef.current.oy + ((ev.clientY - dragRef.current.sy) / canvasH) * 100)),
      });
    };
    const onUp = () => { dragRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const onResizeDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    resizeRef.current = { sx: e.clientX, sy: e.clientY, ow: position.width, oh: position.height };
    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      onPositionChange({
        ...position,
        width:  Math.max(5,  Math.min(100 - position.x, resizeRef.current.ow + ((ev.clientX - resizeRef.current.sx) / canvasW) * 100)),
        height: Math.max(2, Math.min(100 - position.y, resizeRef.current.oh + ((ev.clientY - resizeRef.current.sy) / canvasH) * 100)),
      });
    };
    const onUp = () => { resizeRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        position: 'absolute',
        left: px.left, top: px.top, width: px.width, height: px.height,
        border: `2px ${isSelected ? 'solid' : 'dashed'} ${borderColor}`,
        background: isSelected ? `${borderColor}18` : `${borderColor}08`,
        cursor: 'move', userSelect: 'none', borderRadius: 4,
        boxShadow: isSelected ? `0 0 0 2px ${borderColor}40` : 'none',
      }}
    >
      {/* Label badge above */}
      <div style={{
        position: 'absolute', left: 0, top: -17,
        background: labelColor, color: '#fff',
        fontSize: 9, fontWeight: 700,
        padding: '2px 6px', borderRadius: 3,
        whiteSpace: 'nowrap',
      }}>
        {fieldIndex + 1}. {field.label || '(unnamed)'}{field.required ? ' *' : ''}
      </div>

      {/* Center type hint */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, color: borderColor, fontWeight: 500, pointerEvents: 'none',
      }}>
        {field.type}
      </div>

      {/* Resize handle */}
      {isSelected && (
        <div
          onMouseDown={onResizeDown}
          style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 12, height: 12,
            background: borderColor, cursor: 'se-resize',
            borderRadius: '3px 0 3px 0',
          }}
        />
      )}
    </div>
  );
};

// ── Main Editor ───────────────────────────────────────────────────────────────

interface Props {
  template: Template | null;
  onBack: () => void;
}

export const AdminTemplateEditor: React.FC<Props> = ({ template, onBack }) => {
  const qc = useQueryClient();
  const isEdit = !!template;

  const [name, setName] = useState(template?.name ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [templateTypeId, setTemplateTypeId] = useState(template?.template_type_id ?? '');
  const [imageUrl, setImageUrl] = useState(template?.image_url ?? '');
  const [thumbnailUrl, setThumbnailUrl] = useState(template?.thumbnail_url ?? '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [isPublic, setIsPublic] = useState(template?.is_public ?? true);
  const [fields, setFields] = useState<FormField[]>(template?.fields ?? []);
  const [positions, setPositions] = useState<Record<string, FieldPosition>>(template?.field_positions ?? {});
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const imageNaturalW = template?.image_width || 794;
  const imageNaturalH = template?.image_height || 1123;

  const { data: templateTypes = [] } = useQuery({
    queryKey: ['template-types'],
    queryFn: () => templateTypesApi.list().then((r) => r.results),
  });

  const saveMut = useMutation({
    mutationFn: (body: TemplateCreateBody) =>
      isEdit ? adminTemplatesApi.update(template!.id, body) : adminTemplatesApi.create(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-templates'] }); onBack(); },
  });

  const addField = useCallback(() => {
    const id = generateFieldId();
    setFields((prev) => [...prev, { id, label: '', type: 'text', required: false }]);
    setPositions((prev) => ({ ...prev, [id]: { ...DEFAULT_POSITION, y: 10 + Object.keys(prev).length * 8 } }));
    setSelectedFieldId(id);
  }, []);

  const updateField = useCallback((updated: FormField) => {
    setFields((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
  }, []);

  const removeField = useCallback((id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    setPositions((prev) => { const n = { ...prev }; delete n[id]; return n; });
    if (selectedFieldId === id) setSelectedFieldId(null);
  }, [selectedFieldId]);

  const updatePosition = useCallback((id: string, pos: FieldPosition) => {
    setPositions((prev) => ({ ...prev, [id]: pos }));
  }, []);

  const handleSave = () => {
    if (!name.trim()) { alert('Please enter a template name.'); return; }
    if (!templateTypeId) { alert('Please select a template type.'); return; }
    saveMut.mutate({
      template_type_id: templateTypeId,
      name: name.trim(),
      description: description.trim(),
      image_url: imageUrl.trim(),
      image_width: imageNaturalW,
      image_height: imageNaturalH,
      thumbnail_url: thumbnailUrl.trim() || imageUrl.trim(),
      fields,
      field_positions: positions,
      is_public: isPublic,
      imageFile: imageFile ?? undefined,
      thumbnailFile: thumbnailFile ?? undefined,
    });
  };

  const selectedPos = selectedFieldId ? positions[selectedFieldId] : null;
  const setSelectedPos = (pos: FieldPosition) => { if (selectedFieldId) updatePosition(selectedFieldId, pos); };

  return (
    <div className="d-flex flex-column h-100">
      {/* Toolbar */}
      <div className="d-flex align-items-center gap-3 px-4 py-2 bg-white border-bottom shadow-sm flex-shrink-0">
        <Button
          variant="tertiary"
          size="sm"
          iconBefore={ArrowBack}
          onClick={onBack}
        >
          Templates
        </Button>
        <span className="text-muted">/</span>
        <span className="font-weight-bold small flex-grow-1 text-truncate">
          {isEdit ? template!.name : 'New Template'}
        </span>
        {saveMut.isError && (
          <span className="small text-danger">
            {(saveMut.error as Error)?.message ?? 'Save failed'}
          </span>
        )}
        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={saveMut.isPending}
        >
          {saveMut.isPending ? <Spinner animation="border" size="sm" screenReaderText="Saving" /> : isEdit ? 'Save Changes' : 'Create'}
        </Button>
      </div>

      {/* Two panels */}
      <div className="d-flex flex-grow-1 overflow-hidden">

        {/* Left panel */}
        <div
          className="overflow-auto bg-white border-right"
          style={{ width: 288, flexShrink: 0 }}
        >
          {/* Details */}
          <div className="p-3 border-bottom">
            <p className="x-small font-weight-bold text-muted text-uppercase mb-3" style={{ letterSpacing: '0.08em' }}>Details</p>

            <Form.Group controlId="tpl-name" className="mb-3">
              <Form.Label>Name <span className="text-danger">*</span></Form.Label>
              <Form.Control size="sm" value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} placeholder="Template name" />
            </Form.Group>

            <Form.Group controlId="tpl-desc" className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control as="textarea" size="sm" rows={2} value={description} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)} placeholder="Brief description…" style={{ resize: 'none' }} />
            </Form.Group>

            <Form.Group controlId="tpl-type" className="mb-3">
              <Form.Label>Type <span className="text-danger">*</span></Form.Label>
              <Form.Control as="select" size="sm" value={templateTypeId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTemplateTypeId(e.target.value)}>
                <option value="">Select type…</option>
                {templateTypes.map((tt) => <option key={tt.id} value={tt.id}>{tt.name}</option>)}
              </Form.Control>
            </Form.Group>

            <Form.Group controlId="tpl-img" className="mb-3">
              <Form.Label>Image</Form.Label>
              <Form.Control
                size="sm"
                type="file"
                accept="image/*"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const file = e.target.files?.[0] ?? null;
                  setImageFile(file);
                  if (file) setImageUrl(URL.createObjectURL(file));
                }}
              />
              {imageUrl && (
                <img src={imageUrl} alt="preview" className="mt-2 rounded" style={{ maxWidth: '100%', maxHeight: 80, objectFit: 'contain' }} />
              )}
            </Form.Group>

            <Form.Group controlId="tpl-thumb" className="mb-3">
              <Form.Label>Thumbnail <small className="text-muted">(optional)</small></Form.Label>
              <Form.Control
                size="sm"
                type="file"
                accept="image/*"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const file = e.target.files?.[0] ?? null;
                  setThumbnailFile(file);
                  if (file) setThumbnailUrl(URL.createObjectURL(file));
                }}
              />
            </Form.Group>

            <Form.Switch
              id="tpl-public"
              label="Public"
              checked={isPublic}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIsPublic(e.target.checked)}
            />
          </div>

          {/* Fields */}
          <div className="p-3">
            <div className="d-flex align-items-center mb-3">
              <span className="x-small font-weight-bold text-muted text-uppercase flex-grow-1" style={{ letterSpacing: '0.08em' }}>
                Fields ({fields.length})
              </span>
              <Button variant="primary" size="sm" iconBefore={Add} onClick={addField}>
                Add
              </Button>
            </div>

            {fields.length === 0 && (
              <p className="small text-center text-muted py-3">No fields yet.</p>
            )}

            {fields.map((f, i) => (
              <FieldRow
                key={f.id}
                field={f}
                index={i}
                isSelected={selectedFieldId === f.id}
                onSelect={() => setSelectedFieldId(f.id)}
                onChange={updateField}
                onRemove={() => removeField(f.id)}
              />
            ))}

            {/* Numeric position editor */}
            {selectedPos && selectedFieldId && (
              <div className="mt-3 p-3 border rounded" style={{ background: '#eff6ff', borderColor: '#bfdbfe !important' }}>
                <p className="x-small font-weight-bold text-primary text-uppercase mb-2" style={{ letterSpacing: '0.08em' }}>Position (%)</p>
                <div className="row g-2">
                  {(['x', 'y', 'width', 'height'] as const).map((key) => (
                    <div key={key} className="col-6">
                      <Form.Group controlId={`pos-${key}`} className="mb-0">
                        <Form.Label className="text-capitalize small">{key}</Form.Label>
                        <Form.Control
                          type="number" size="sm" min={0} max={100} step={0.5}
                          value={Math.round(selectedPos[key] * 10) / 10}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setSelectedPos({ ...selectedPos, [key]: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </Form.Group>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right panel: canvas */}
        <div className="flex-grow-1 position-relative overflow-hidden" style={{ background: '#e5e7eb' }}>
          <TransformWrapper minScale={0.2} maxScale={4} limitToBounds={false} centerOnInit wheel={{ step: 0.08 }}>
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                {/* Zoom controls */}
                <div className="position-absolute d-flex flex-column gap-2" style={{ top: 12, right: 12, zIndex: 10 }}>
                  {([
                    { icon: ZoomIn,  action: () => zoomIn(),        label: '+' },
                    { icon: ZoomOut, action: () => zoomOut(),       label: '−' },
                    { icon: Refresh, action: () => resetTransform(), label: '↺' },
                  ] as const).map(({ icon: Ic, action, label }) => (
                    <Button key={label} variant="light" size="sm" iconBefore={Ic} onClick={action} className="p-1 shadow-sm">
                      {' '}
                    </Button>
                  ))}
                </div>

                <TransformComponent wrapperClass="w-100 h-100" contentClass="w-100 h-100 d-flex align-items-center justify-content-center">
                  <div
                    ref={canvasRef}
                    className="position-relative shadow"
                    style={{ width: imageNaturalW, height: imageNaturalH }}
                    onClick={() => setSelectedFieldId(null)}
                  >
                    {imageUrl ? (
                      <img src={imageUrl} alt="template" className="position-absolute w-100 h-100" style={{ objectFit: 'contain', pointerEvents: 'none', userSelect: 'none' }} draggable={false} />
                    ) : (
                      <div className="position-absolute w-100 h-100 d-flex flex-column align-items-center justify-content-center bg-white" style={{ border: '2px dashed #d1d5db' }}>
                        <p className="text-muted small">Set an Image URL in the left panel</p>
                      </div>
                    )}

                    {fields.map((f, i) => {
                      const pos = positions[f.id];
                      if (!pos) return null;
                      return (
                        <DraggableOverlay
                          key={f.id}
                          field={f}
                          fieldIndex={i}
                          position={pos}
                          isSelected={selectedFieldId === f.id}
                          canvasW={imageNaturalW}
                          canvasH={imageNaturalH}
                          onSelect={() => setSelectedFieldId(f.id)}
                          onPositionChange={(p) => updatePosition(f.id, p)}
                        />
                      );
                    })}
                  </div>
                </TransformComponent>
              </>
            )}
          </TransformWrapper>

          <div className="position-absolute small text-muted bg-white rounded shadow-sm px-3 py-2" style={{ bottom: 12, left: 12, pointerEvents: 'none' }}>
            Drag to move · resize from bottom-right corner
          </div>
        </div>
      </div>
    </div>
  );
};
