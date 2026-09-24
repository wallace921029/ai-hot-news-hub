# AGENTS.md

## Layout

- Two npm packages, two lockfiles: root = Vite + React frontend; `backend/` = Fastify + SQLite API (own `node_modules`). Install both: `npm install` at root, then `cd backend && npm install`.
- Frontend entry: `src/main.tsx` → `src/App.tsx`. Backend entry: `backend/src/index.ts` (routes registered there with `/api/*` prefixes).
- New data-source fetchers go in `backend/src/fetchers/` (+ `backend/src/parsers/`). Consult `docs/api.md` for already-tested source APIs before adding one.
- Built-in API sources are **code-only config** (`backend/src/fetchers/api-sources.ts`, "代码即订阅"): they never live in `data_sources`; DB only stores their runtime state (`source_states`, keyed by stable `code`) and news/logs/alerts reference them via `source_code`. Startup runs an idempotent migration (`backend/src/db/migrate.ts`) that syncs state rows and upgrades old DBs. RSS sources remain rows in `data_sources` (admin can only create/edit RSS).

## Commands

Root (frontend):

- `npm run dev` — Vite on `:8763`
- `npm run build` — `tsc -b && vite build` (typecheck + bundle; no separate typecheck script)
- `npm run lint` — `oxlint` (NOT ESLint)
- `npm run format` — `prettier --write .`

`backend/`:

- `npm run dev` — `tsx watch src/index.ts`, serves `:8762`
- `npm run build` / `npm run start` — `tsc` → `node dist/index.js`
- `npm run db:push` then `npm run db:seed` — create SQLite schema, then seed the default **RSS** sources only (order matters; seed assumes schema exists; built-in API sources need no seed — they come from `api-sources.ts`)

Tests: no framework / no script. `tests/api-integration.test.ts` uses `node:test` — run `node --test tests/api-integration.test.ts` with a seeded backend running on `:8762` (expects `admin@example.com` / `admin123`, invite code `hotnews2026`).

## Gotchas

- Frontend API URL is hardcoded: `src/services/api.ts` uses `http://localhost:8762/api` and `vite.config.ts` has no proxy. Frontend dev requires the backend running; changing ports means editing `api.ts`.
- Backend env comes from `backend/.env` (copy from `backend/.env.example`), validated with defaults by zod in `backend/src/utils/env.ts`.
- Every backend start syncs the earliest-created admin account to the `ADMIN_*` env values (`initializeDefaults` in `backend/src/index.ts`). Admin credential changes made via UI/API are overwritten on restart — update `.env` instead.
- SQLite file is `backend/data/database.db` (gitignored, auto-created, WAL mode). Drizzle config: `backend/drizzle.config.ts`, schema `backend/src/db/schema.ts`.
- Uploads: multipart limit 10 MB / 10 files, served at `/uploads/` from `UPLOAD_ROOT` (`backend/src/utils/uploads.ts`).
- All frontend routes require login; `/admin/*` requires admin role (`ProtectedRoute` / `AdminRoute` in `src/App.tsx`). API auth is `Authorization: Bearer <token>`.

## Conventions

- Import alias `@/*` → `src/*` (defined in both `vite.config.ts` and `tsconfig.app.json`); shadcn aliases in `components.json` (`@/components`, `@/lib`, `@/hooks`, …).
- TypeScript: project references (`tsc -b`; `tsconfig.app.json` covers `src/`, `tsconfig.node.json` covers `vite.config.ts`). `erasableSyntaxOnly` (no `enum`/`namespace` — use const objects/unions), `verbatimModuleSyntax` (use `import type`), `noUnusedLocals`/`noUnusedParameters` (unused vars fail the build).
- Router is `react-router` v8 imported from `'react-router'` (not `react-router-dom`, not v7).
- Tailwind CSS v4: `@import 'tailwindcss'` + `@theme` in `src/index.css`, no `tailwind.config.js`. Shadcn style `base-nova`.
- Pre-commit runs `npx lint-staged` (husky): `oxlint --fix` + `prettier --write` on `*.{ts,tsx}`. Prettier: no semicolons, single quotes, 100 col (`.prettierrc`).
