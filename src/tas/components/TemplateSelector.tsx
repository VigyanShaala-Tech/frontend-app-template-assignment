/**
 * TemplateSelector
 * Lists templates assigned to the current XBlock usage key.
 * Student picks one to start filling.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Spinner,
  Alert,
  Badge,
  Card,
} from '@openedx/paragon';
import { blockTemplatesApi, templatesApi } from '../services/api';
import { useTasStore } from '../store/tasStore';
import type { Template } from '../types';

export const TemplateSelector: React.FC = () => {
  const { mfeContext, setSelectedTemplate, submission } = useTasStore();

  const usageKey = mfeContext?.usageKey || 'demo-block';

  // Fetch templates assigned to this block
  const { data: blockData, isLoading, error } = useQuery({
    queryKey: ['block-templates', usageKey],
    queryFn: () => blockTemplatesApi.list(usageKey),
  });

  // For each template block item we need the full template (fields + positions)
  const templateIds = blockData?.templates.map((tb) => tb.template.id) ?? [];
  const { data: fullTemplates, isLoading: loadingFull } = useQuery({
    queryKey: ['templates-full', templateIds],
    queryFn: async () => {
      const results = await Promise.all(templateIds.map((id) => templatesApi.get(id)));
      return results;
    },
    enabled: templateIds.length > 0,
  });

  const handleSelect = (template: Template, templateBlockId: string) => {
    setSelectedTemplate(template, templateBlockId);
  };

  if (isLoading || loadingFull) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '16rem' }}>
        <Spinner animation="border" variant="primary" screenReaderText="Loading templates" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center p-4 text-center" style={{ minHeight: '16rem' }}>
        <Alert variant="danger" className="w-100">
          <Alert.Heading>Failed to load templates</Alert.Heading>
          <p className="mb-0 small">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </Alert>
      </div>
    );
  }

  const templates = fullTemplates ?? [];
  const blockItems = blockData?.templates ?? [];

  if (templates.length === 0) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center p-4 text-center" style={{ minHeight: '16rem' }}>
        <Alert variant="info" className="w-100">
          <Alert.Heading>No templates assigned to this block</Alert.Heading>
          <p className="mb-0 small">Please contact your instructor.</p>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="font-weight-bold">Choose a Template</h2>
        <p className="small text-muted mt-1">
          Select a template below to begin your assignment.
        </p>
        {submission && submission.status === 'submitted' && (
          <Alert variant="success" className="mt-3 mb-0">
            You have already submitted this assignment.
          </Alert>
        )}
      </div>

      <div className="row">
        {templates.map((template) => {
          const blockItem = blockItems.find((bi) => bi.template.id === template.id);
          return (
            <div key={template.id} className="col-12 col-sm-6 col-lg-4 mb-4">
              <Card
                isClickable
                onClick={() => handleSelect(template, blockItem?.template_block_id ?? '')}
                className="h-100"
              >
                <Card.ImageCap
                  src={template.thumbnail_url || template.image_url || ''}
                  srcAlt={template.name}
                  fallbackSrc=""
                  imageLoadingType="eager"
                  skeletonHeight={220}
                >
                  {!(template.thumbnail_url || template.image_url) && (
                    <div
                      className="d-flex align-items-center justify-content-center w-100"
                      style={{ minHeight: '220px', background: '#e8f0fe' }}
                    >
                      <svg
                        width="64"
                        height="64"
                        fill="none"
                        stroke="#93b4f7"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                  )}
                </Card.ImageCap>
                <Card.Header
                  title={template.name}
                  actions={
                    template.template_type
                      ? (
                        <Badge variant="light">
                          {template.template_type.name}
                        </Badge>
                      )
                      : undefined
                  }
                />
                <Card.Section>
                  {template.description && (
                    <p className="small text-muted mb-2">{template.description}</p>
                  )}
                  <div className="d-flex align-items-center small text-muted">
                    <span>
                      {template.fields.length} field{template.fields.length !== 1 ? 's' : ''}
                    </span>
                    <span className="mx-1">&bull;</span>
                    <span>{template.is_public ? 'Public' : 'Private'}</span>
                  </div>
                </Card.Section>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
};
