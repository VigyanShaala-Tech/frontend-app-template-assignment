# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Dev server with hot reload (default port 8080, configurable via .env)
npm run build      # Production build
npm test           # Jest with coverage (--passWithNoTests)
npm run lint       # stylelint + ESLint + TypeScript type check
npm run lint:fix   # Auto-fix linting issues
npm run types      # TypeScript type check without emit
npm run snapshot   # Update Jest snapshots
```

To run a single test file:
```bash
npx jest src/tas/components/TasApp.test.tsx
```

## Architecture Overview

This is an **OpenEdX Micro-Frontend (MFE)** for a Template Assignment System (TAS) — a form-filling and grading tool where students fill overlaid fields on a template image (e.g., a lab report PDF).

### Three User Roles

- **Student** — Picks a template, fills in overlaid fields, auto-saves draft, submits for grading
- **Instructor** — Reviews student submissions, provides feedback and grades
- **Admin/Staff** — Creates/manages template types, templates, and template fields

### Routing (src/index.tsx)

```
/submission/:usageKey                   → StudentPage
/instructor/grade-submissions/:usageKey → InstructorPage
/admin/templates                        → AdminPage
```

### State Management

**Zustand store** (`src/tas/store/tasStore.ts`) owns all app state:
- `MfeContext` — usageKey, courseId, studentId, isStaff, isInstructor (injected from XBlock or URL params in dev)
- `formData` — live field edits (uncommitted)
- `submission` — last persisted submission from API
- Canvas state — scale, positionX/Y for zoom/pan
- Editor state — selectedFieldId, isFieldEditorOpen, isPreviewMode
- Auto-save state — isSaving, lastSavedAt

**TanStack React Query** (`@tanstack/react-query`) handles data fetching/mutations with 5-minute staleTime and 1 retry.

### API Layer (src/tas/services/api.ts)

Base URL: `{LMS_BASE_URL}/tas/api/v1` — uses OpenEdX JWT auth via `getAuthenticatedHttpClient()`.

Key flow:
1. `getTemplatesForBlock(blockId)` → list templates for a block
2. `createOrGetDraft(blockId, templateId)` → get/create student draft submission
3. `updateSubmission(id, formData)` → auto-save (debounced)
4. `submitSubmission(id)` → finalize, triggers PDF generation
5. `getPdfStatus(id)` → polled by `PdfPoller` until PDF is ready

**Mock data** in `src/tas/services/mockData.ts` — used in non-production with 400ms simulated delay.

### Template Canvas System

Fields are positioned using **percentage-based coordinates (0–100)** relative to template image dimensions, making layout responsive across screen sizes. Conversion utilities live in `src/tas/utils/positioning.ts`.

The admin template editor (`AdminTemplateEditor`) lets staff drag-position fields on the template image; students then see those fields as overlays in `TemplateCanvas` / `FieldOverlay`.

### OpenEdX Integration

- **Context injection**: XBlock passes context via `window.__TAS_CONTEXT__`; falls back to URL query params (`?is_staff=true`, `?usage_key=...`) during local dev
- **Auth**: JWT from LMS cookies, CSRF token from `/csrf/api/v1/token`
- **UI**: Uses **Paragon** (`@openedx/paragon`) — not Tailwind or plain Bootstrap
- **Build**: `@openedx/frontend-build` provides webpack, eslint, jest, and TypeScript configs
- **i18n**: formatjs for extraction; Transifex (via Atlas) for translations — run `make extract_translations` after adding new strings

### Environment

`.env.development` targets a local Tutor instance (`local.openedx.io`). See `SETUP.md` for full local development setup with Tutor.
