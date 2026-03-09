/**
 * TemplateCanvas
 * Renders the template image with all field overlays.
 * Supports pinch-zoom and pan via react-zoom-pan-pinch.
 */

import React, { useRef, useState, useEffect } from 'react';
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
  const [imageDims, setImageDims] = useState({ width: 0, height: 0 });
  const [display, setDisplay] = useState({ width: 0, height: 0, offsetX: 0, offsetY: 0 });
  const { canvasState, setCanvasState, selectedFieldId, setSelectedFieldId } = useTasStore();

  // Resolve image dimensions
  useEffect(() => {
    if (template.image_url) {
      const img = new Image();
      img.onload = () => setImageDims({ width: img.width, height: img.height });
      img.src = template.image_url;
    } else if (template.image_width && template.image_height) {
      setImageDims({ width: template.image_width, height: template.image_height });
    }
  }, [template]);

  // Calculate displayed size with object-contain behaviour
  useEffect(() => {
    if (!canvasRef.current || !imageDims.width || !imageDims.height) return;

    const update = () => {
      if (!canvasRef.current) return;
      const cw = canvasRef.current.offsetWidth;
      const ch = canvasRef.current.offsetHeight;
      const iAR = imageDims.width / imageDims.height;
      const cAR = cw / ch;

      let dw: number, dh: number, ox = 0, oy = 0;
      if (cAR > iAR) {
        dh = ch;
        dw = dh * iAR;
        ox = (cw - dw) / 2;
      } else {
        dw = cw;
        dh = dw / iAR;
        oy = (ch - dh) / 2;
      }
      setDisplay({ width: dw, height: dh, offsetX: ox, offsetY: oy });
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [imageDims]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) setSelectedFieldId(null);
  };

  const imageNaturalW = template.image_width || imageDims.width || 794;
  const imageNaturalH = template.image_height || imageDims.height || 1123;

  return (
    <div className="relative w-full h-full bg-gray-200 overflow-hidden">
      <TransformWrapper
        initialScale={canvasState.scale}
        initialPositionX={canvasState.positionX}
        initialPositionY={canvasState.positionY}
        minScale={0.2}
        maxScale={5}
        limitToBounds={false}
        centerOnInit
        wheel={{ step: 0.08 }}
        pinch={{ step: 5 }}
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
            <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
              {[
                { label: '+', action: () => zoomIn(), icon: 'M12 4v16m8-8H4' },
                { label: '-', action: () => zoomOut(), icon: 'M20 12H4' },
                {
                  label: '↺',
                  action: () => resetTransform(),
                  icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
                },
              ].map(({ label, action, icon }) => (
                <button
                  key={label}
                  type="button"
                  onClick={action}
                  aria-label={label}
                  className="w-10 h-10 bg-white rounded-lg shadow flex items-center justify-center hover:bg-gray-50 active:scale-95 transition"
                >
                  <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                  </svg>
                </button>
              ))}
            </div>

            <TransformComponent
              wrapperClass="!w-full !h-full"
              contentClass="!w-full !h-full flex items-center justify-center"
            >
              <div
                ref={canvasRef}
                className="relative shadow-2xl"
                style={{ width: imageNaturalW, height: imageNaturalH }}
                onClick={handleCanvasClick}
              >
                {/* Template background */}
                {template.image_url ? (
                  <img
                    src={template.image_url}
                    alt={template.name}
                    className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none"
                    draggable={false}
                  />
                ) : (
                  <div className="absolute inset-0 bg-white border-2 border-dashed border-gray-300 flex items-center justify-center">
                    <span className="text-gray-400 text-sm">No template image</span>
                  </div>
                )}

                {/* Field overlays */}
                {display.width > 0
                  ? template.fields.map((field) => {
                      const position = template.field_positions[field.id];
                      if (!position) return null;
                      return (
                        <FieldOverlay
                          key={field.id}
                          field={field}
                          position={position}
                          isSelected={selectedFieldId === field.id}
                          imageWidth={display.width}
                          imageHeight={display.height}
                          offsetX={display.offsetX}
                          offsetY={display.offsetY}
                          actualImageWidth={imageNaturalW}
                          actualImageHeight={imageNaturalH}
                          isReadOnly={readOnly}
                        />
                      );
                    })
                  : null}
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>

      {/* Status bar */}
      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur rounded-lg px-3 py-1.5 text-xs text-gray-600 shadow">
        <span>Zoom {Math.round(canvasState.scale * 100)}%</span>
        <span className="mx-1.5 text-gray-300">|</span>
        <span>{template.fields.length} fields</span>
      </div>
    </div>
  );
};
