---
name: verify
description: Build, run, and drive the Nexus app end-to-end to verify changes at the UI surface.
---

# Verifying Nexus

## Build
```bash
pnpm build          # Next 16 + Turbopack; catches favicon/image and route errors
```
Gotcha: Turbopack requires the PNG inside `src/app/favicon.ico` to be **RGBA** (RGB fails the build).

## Run
```bash
pnpm dev            # picks the next free port if 3000 is busy — read the startup log!
```
Port 3000 is often taken by another local app (shows "FunMath" branding — that's NOT Nexus).

## Auth / backend
Pages under `(app)` are auth-gated by middleware (fail-closed). Mock login: `max@gmail.com` / `password123` (from `scripts/seed-mock-data.mjs`).

If the real Supabase host (`*.supabase.co`) is unreachable (some networks block it — check with `curl <NEXT_PUBLIC_SUPABASE_URL>/auth/v1/health`), run the in-memory mock and point a dev server at it:

```bash
node <scratchpad>/mock-supabase.mjs &   # GoTrue + PostgREST subset on :54999 (recreate if gone; ~130 lines)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54999 NEXT_PUBLIC_SUPABASE_ANON_KEY=mock pnpm dev --port 3002
```
The mock needs: `POST /auth/v1/token` (returns session with a fake-signed JWT), `GET /auth/v1/user`, and `/rest/v1/:table` CRUD (in-memory; parse `id=eq.<uuid>`, honor `Accept: vnd.pgrst.object` for `.single()`).

## Drive
No Playwright in deps. Use `playwright-core` (install in scratchpad) + the cached browser:
`~/Library/Caches/ms-playwright/chromium-*/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`

Selector gotchas:
- `aside` is ambiguous (nav sidebar + in-page panels) — scope to `main aside`.
- Notes modal save button is "Save Changes"; calendar modal is "Save".
- Background `pnpm dev` tasks have been killed by stray SIGTERMs; prefer launching the server detached inside the same foreground command as the driver script.

## Flows worth driving
- Login → /calendar: click a day cell → right-side panel; add/edit/delete events from the panel.
- /notes: New Note → Write/Preview tabs; LaTeX via `$...$` and `$$...$$` (KaTeX, `.katex` elements).
- Favicon: check `link[rel*="icon"]` tags + fetch `/favicon.ico`, `/nexus-mark.svg`.
