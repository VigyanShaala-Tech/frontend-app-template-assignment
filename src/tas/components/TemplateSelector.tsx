/**
 * TemplateSelector
 * Lists templates assigned to the current XBlock usage key.
 * Student picks one to start filling.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
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
      <div className="flex items-center justify-center h-64">
        <div
          className="inline-block h-10 w-10 rounded-full border-4 border-solid border-blue-600 border-r-transparent animate-spin"
          role="status"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 p-6 text-center">
        <p className="text-red-600 font-semibold mb-1">Failed to load templates</p>
        <p className="text-sm text-gray-500">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    );
  }

  const templates = fullTemplates ?? [];
  const blockItems = blockData?.templates ?? [];

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 p-6 text-center">
        <p className="text-gray-600 font-semibold">No templates assigned to this block</p>
        <p className="text-sm text-gray-400 mt-1">Please contact your instructor.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-900">Choose a Template</h2>
        <p className="text-sm text-gray-500 mt-1">
          Select a template below to begin your assignment.
        </p>
        {submission && submission.status === 'submitted' && (
          <div className="mt-3 px-4 py-2 bg-green-100 border border-green-300 rounded-lg text-green-800 text-sm">
            ✓ You have already submitted this assignment.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {templates.map((template, index) => {
          const blockItem = blockItems.find((bi) => bi.template.id === template.id);
          return (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.07 }}
            >
              <button
                type="button"
                onClick={() => handleSelect(template, blockItem?.template_block_id ?? '')}
                className="w-full text-left bg-white rounded-2xl shadow hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-100 hover:border-blue-300 group"
              >
                {/* Thumbnail */}
                <div className="aspect-[3/4] bg-gradient-to-br from-blue-50 to-indigo-100 relative overflow-hidden">
                  {template.thumbnail_url || template.image_url ? (
                    <img
                      src={template.thumbnail_url || template.image_url}
                      alt={template.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg
                        className="w-16 h-16 text-blue-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
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
                  {/* Type badge */}
                  {template.template_type && (
                    <span className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-xs font-medium text-gray-700 px-2 py-0.5 rounded-full">
                      {template.template_type.name}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition truncate">
                    {template.name}
                  </h3>
                  {template.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{template.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                    <span>{template.fields.length} field{template.fields.length !== 1 ? 's' : ''}</span>
                    <span>•</span>
                    <span>{template.is_public ? 'Public' : 'Private'}</span>
                  </div>
                </div>
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
