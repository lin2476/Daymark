# AGENTS

Daymark is a static React/Vite app for personal goal tracking. It stores data locally in the browser with IndexedDB through Dexie.

## Project Basics

- App name: Daymark（日迹）
- Stack: React, TypeScript, Vite, Dexie, Zustand, date-fns, lucide-react
- Main app file: `src/App.tsx`
- State and persistence: `src/store.ts`, `src/db.ts`
- Styling: `src/styles.css`
- Build output: `dist`

## Commands

```bash
npm install
npm run dev
npm run build
```

Cloudflare Pages settings:

- Build command: `npm run build`
- Build output directory: `dist`

## Network Access

When accessing the public internet from this machine, use the local proxy:

```text
http://127.0.0.1:7890
```

For npm:

```powershell
$env:HTTP_PROXY='http://127.0.0.1:7890'
$env:HTTPS_PROXY='http://127.0.0.1:7890'
npm install --proxy http://127.0.0.1:7890 --https-proxy http://127.0.0.1:7890
```

For git:

```powershell
$env:HTTP_PROXY='http://127.0.0.1:7890'
$env:HTTPS_PROXY='http://127.0.0.1:7890'
git -c http.proxy=http://127.0.0.1:7890 -c https.proxy=http://127.0.0.1:7890 fetch
git -c http.proxy=http://127.0.0.1:7890 -c https.proxy=http://127.0.0.1:7890 push
```

## Maintenance Notes

- Keep the app static-first and Cloudflare Pages friendly.
- Do not add server-only features unless explicitly requested.
- Existing browser data uses the IndexedDB name `goal-ledger-db`; do not rename it casually, or current users may appear to lose local data.
- The UI direction is simple, calm, and immersive. Avoid heavy table-like layouts, strong borders, and admin-dashboard styling.
- Global scrollbar width should remain hidden through the CSS scrollbar rules in `src/styles.css`.
- Use `apply_patch` for manual edits.
- Run `npm run build` before handing off code changes.
