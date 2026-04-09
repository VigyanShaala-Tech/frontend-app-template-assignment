# Template Assignment MFE — Local Setup Guide

This guide covers setting up the **Template Assignment System (TAS) MFE** locally using Tutor.

---

## Prerequisites

- [Tutor](https://docs.tutor.edly.io/install.html) installed (`pip install "tutor[full]"`)
- [tutor-mfe plugin](https://github.com/overhangio/tutor-mfe) enabled
- Node.js 18+ and npm installed
- A running local Tutor instance (`tutor local launch`)

---

## 1. Clone the repo

```bash
git clone https://github.com/VigyanShaala-Tech/template-assignment-mfe.git
cd template-assignment-mfe
```

---

## 2. Install dependencies

```bash
npm install
```

---

## 3. Configure environment

Copy the example env file and fill in values to match your local Tutor instance:

```bash
cp .env.example .env
```

Key values to set (match your `tutor local` URLs):

```env
BASE_URL=http://localhost:2000          # port where this MFE will run
LMS_BASE_URL=http://local.openedx.io   # Tutor LMS URL
LOGIN_URL=http://local.openedx.io/login
LOGOUT_URL=http://local.openedx.io/logout
ACCESS_TOKEN_COOKIE_NAME=edx-jwt-cookie-header-payload
USER_INFO_COOKIE_NAME=edx-user-info
LANGUAGE_PREFERENCE_COOKIE_NAME=openedx-language-preference
CSRF_TOKEN_API_PATH=/csrf/api/v1/token
SITE_NAME=VigyanShaala
```

> **Note:** `BASE_URL` port must match the port tutor-mfe maps for this app. Check `tutor config printvalue MFE_PORT` or the tutor-mfe config for the assigned port.

---

## 4. Register the MFE with tutor-mfe

In your Tutor plugins or `config.yml`, add this MFE:

```yaml
MFE_APPS:
  tas:
    repository: https://github.com/VigyanShaala-Tech/template-assignment-mfe
    port: 2000
    version: main
```

Then rebuild:

```bash
tutor mfe buildmount tas
```

---

## 5. Run locally (dev server)

```bash
npm start
```

The dev server starts at `http://localhost:8080` (or the port configured in webpack).

---

## 6. Open the app in the browser

### Student view (default)

```
http://localhost:8080
```

No extra params needed — the app defaults to student view with mock data using:
- `usage_key=block-v1:Org+Course101+2024+type@format_forge+block@abc123`
- `course_id=course-v1:Org+Course101+2024`

### Admin / Instructor view

Append `?is_staff=true` or `?is_instructor=true` to the URL:

```
http://localhost:8080?is_staff=true
```

This switches to the admin template management view where you can create, edit, activate/deactivate, and delete templates.

### Custom context via URL params

All MFE context values can be overridden via query params during development:

| Param           | Example value                                                    | Description                     |
|-----------------|------------------------------------------------------------------|---------------------------------|
| `usage_key`     | `block-v1:Org+Course101+2024+type@format_forge+block@abc123`    | XBlock usage key                |
| `course_id`     | `course-v1:Org+Course101+2024`                                  | Course ID                       |
| `student_id`    | `student_demo`                                                   | Student username                |
| `is_staff`      | `true`                                                           | Show admin view                 |
| `is_instructor` | `true`                                                           | Show admin view                 |

---

## 7. Mock data

The app currently uses **mock data** (no backend required). All templates, submissions, and API calls are handled in:

- `src/tas/services/mockData.ts` — template and submission fixtures
- `src/tas/services/api.ts` — mock API with 400ms simulated delay

Two templates are available by default:
- **Biology Lab Report** — 4 fields (Student Name, Hypothesis, Outcome, Date)
- **Physics Worksheet** — 4 fields (Student Name, Q1 Answer, Q2 Answer, Score)

---

## 8. TypeScript check

```bash
npm run types
```

---

## 9. Run tests

```bash
npm test
```

---

## Project structure

```
src/
  tas/
    components/
      admin/          # Admin template management (AdminApp, AdminTemplateList, AdminTemplateEditor)
      TemplateCanvas  # Student canvas with field overlays
      TemplateSelector# Template picker for students
      FieldOverlay    # Positioned input overlay on the template image
      FieldEditorPopup# Modal for filling in a field
      TasApp          # Root — routes to admin or student view
    services/
      api.ts          # All API calls (currently mocked)
      mockData.ts     # Mock templates and submissions
    store/
      tasStore.ts     # Zustand global state
    types/
      index.ts        # TypeScript types
    utils/
      positioning.ts  # percent ↔ pixel conversion for field positions
```

---

## Notes

- **Paragon** (`@openedx/paragon`) is used for all UI components — no Tailwind CSS.
- Field positions are stored as **percentages** (0–100) relative to the natural image size (default 794×1123 px for A4).
- The XBlock can inject context via `window.__TAS_CONTEXT__`; URL params take effect in development when that global is absent.
