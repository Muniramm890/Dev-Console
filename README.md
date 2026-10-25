# School Office - Developer Console

Platform control for all schools: block / suspend / unblock, force logout, modules on/off, limits, admin password reset,
new school onboarding, audit log, announcements - plus **Open school**: the complete Admin app (copied unchanged under `src/`)
running on a short-lived "act as" token, with a floating **DEV** control for switch school / write mode / exit.

* New code: `src/dev/*` (platform login + pages + DevPanel). Everything else under `src/` is the Admin app copy.
* Backend: `/api/platform/*` in SCHOOL-ERP-backend (separate login, `head@schooloffice.tech`).
* Build: `npm install --legacy-peer-deps && npm run build` (output `dist/`). Needs SPA fallback to `index.html`.
* API URL: `VITE_API_URL` (defaults to the production backend).
* Updating the Admin part: copy the latest Admin_App `src/` over this `src/` (keep `src/dev/`, `src/main.tsx`, and the one-line
  `window.__DEV_CONSOLE__` exit in `src/App.tsx`).
