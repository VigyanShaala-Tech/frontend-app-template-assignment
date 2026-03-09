/**
 * AdminApp — root view shown to staff/instructors (isStaff || isInstructor).
 *
 * Views:
 *  list   → AdminTemplateList (create / edit / delete / toggle)
 *  editor → AdminTemplateEditor (create or edit a template)
 */

import React, { useState } from 'react';
import { AdminTemplateList } from './AdminTemplateList';
import { AdminTemplateEditor } from './AdminTemplateEditor';
import type { Template } from '../../types';

type View = { mode: 'list' } | { mode: 'editor'; template: Template | null };

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

  return (
    <div className="h-full overflow-hidden">
      <AdminTemplateList
        onCreate={() => setView({ mode: 'editor', template: null })}
        onEdit={(t) => setView({ mode: 'editor', template: t })}
      />
    </div>
  );
};
