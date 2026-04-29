/**
 * TemplateCanvas
 * Renders the template image with all field overlays.
 * Zoom/pan via react-zoom-pan-pinch, contained inside the white card from TasApp.
 */

import React, { useRef } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useTasStore } from '../store/tasStore';
import { FieldOverlay } from './FieldOverlay';
import type { Template } from '../types';

interface Props {
  template: Template;
  readOnly?: boolean;
}

export const TemplateCanvas: React.FC<Props> = ({ template, readOnly = false }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const { canvasState, setCanvasState, selectedFieldId, setSelectedFieldId } = useTasStore();

  const imageNaturalW = template.image_width || 794;
  const imageNaturalH = template.image_height || 1123;

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) setSelectedFieldId(null);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: 600, overflow: 'hidden' }}>
      <TransformWrapper
        initialScale={canvasState.scale}
        initialPositionX={canvasState.positionX}
        initialPositionY={canvasState.positionY}
        minScale={0.2}
        maxScale={5}
        limitToBounds={false}
        centerOnInit
        wheel={{ disabled: true }}
        pinch={{ disabled: true }}
        onTransformed={(ref) => {
          setCanvasState({
            scale: ref.state.scale,
            positionX: ref.state.positionX,
            positionY: ref.state.positionY,
          });
        }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            {/* Zoom controls */}
            <div style={{
              position: 'absolute', top: 8, right: 8, zIndex: 10,
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              {[
                { label: '+', action: () => zoomIn() },
                { label: '−', action: () => zoomOut() },
                { label: '↺', action: () => resetTransform() },
              ].map(({ label, action }) => (
                <button
                  key={label}
                  type="button"
                  onClick={action}
                  style={{
                    width: 32, height: 32,
                    background: '#fff', border: '1px solid #e5e7eb',
                    borderRadius: 6, cursor: 'pointer',
                    fontSize: 15, fontWeight: 700, color: '#374151',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                  }}
                >
                  {label}
                </button>
              ))}
              <div style={{
                textAlign: 'center', fontSize: 10, color: '#6b7280',
                background: 'rgba(255,255,255,0.9)', borderRadius: 4, padding: '1px 3px',
              }}>
                {Math.round(canvasState.scale * 100)}%
              </div>
            </div>

            <TransformComponent
              wrapperStyle={{ width: '100%', height: '100%' }}
              contentStyle={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
            >
              <div
                ref={canvasRef}
                onClick={handleCanvasClick}
                style={{
                  position: 'relative',
                  width: imageNaturalW,
                  height: imageNaturalH,
                  flexShrink: 0,
                  boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
                  borderRadius: 4,
                  overflow: 'hidden',
                  background: '#fff',
                }}
              >
                {template.image_url ? (
                  <img
                    src={template.image_url}
                    alt={template.name}
                    draggable={false}
                    style={{
                      position: 'absolute', inset: 0,
                      width: '100%', height: '100%',
                      objectFit: 'contain',
                      pointerEvents: 'none', userSelect: 'none',
                    }}
                  />
                ) : (
                  <div style={{
                    position: 'absolute', inset: 0, background: '#fff',
                    border: '2px dashed #d1d5db',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ color: '#9ca3af', fontSize: 14 }}>No template image</span>
                  </div>
                )}

                {template.fields.map((field) => {
                  const position = template.field_positions[field.id];
                  if (!position) return null;
                  return (
                    <FieldOverlay
                      key={field.id}
                      field={field}
                      position={position}
                      isSelected={selectedFieldId === field.id}
                      actualImageWidth={imageNaturalW}
                      actualImageHeight={imageNaturalH}
                      isReadOnly={readOnly}
                    />
                  );
                })}
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
};
