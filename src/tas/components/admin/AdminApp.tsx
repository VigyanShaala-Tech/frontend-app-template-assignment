/**
 * AdminApp — template management for staff.
 * Mounted at /admin/templates
 *
 * Views:
 *  list   → AdminTemplateList (create / edit / delete / toggle)
 *  editor → AdminTemplateEditor (create or edit a template)
 *  types  → AdminTemplateTypeManager
 */

import React, { useState } from 'react';
import { AdminTemplateList } from './AdminTemplateList';
import { AdminTemplateEditor } from './AdminTemplateEditor';
import { AdminTemplateTypeManager } from './AdminTemplateTypeManager';
import { AdminRubricManager } from './AdminRubricManager';
import type { Template } from '../../types';

type View =
  | { mode: 'list' }
  | { mode: 'editor'; template: Template | null }
  | { mode: 'types' }
  | { mode: 'rubrics' };

export const AdminApp: React.FC = () => {
  const [view, setView] = useState<View>({ mode: 'list' });

  if (view.mode === 'editor') {
    return (
      <AdminTemplateEditor
        template={view.template}
        onBack={() => setView({ mode: 'list' })}
      />
    );
  }

  if (view.mode === 'types') {
    return (
      <AdminTemplateTypeManager onBack={() => setView({ mode: 'list' })} />
    );
  }

  if (view.mode === 'rubrics') {
    return (
      <AdminRubricManager onBack={() => setView({ mode: 'list' })} />
    );
  }

  return (
    <AdminTemplateList
      onCreate={() => setView({ mode: 'editor', template: null })}
      onEdit={(t) => setView({ mode: 'editor', template: t })}
      onManageTypes={() => setView({ mode: 'types' })}
      onManageRubrics={() => setView({ mode: 'rubrics' })}
    />
  );
};
