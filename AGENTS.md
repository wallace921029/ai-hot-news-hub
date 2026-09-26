# AGENTS.md

## Layout

- Two npm packages, two lockfiles: root = Vite + React frontend; `backend/` = Fastify + SQLite API (own `node_modules`). Install both: `npm install` at root, then `cd backend && npm install`.
- Frontend entry: `src/main.tsx` → `src/App.tsx`. Backend entry: `backend/src/index.ts` (routes registered there with `/api/*` prefixes).
- Sources, two kinds: built-in API sources are **code-only** (`backend/src/fetchers/api-sources.ts`, "代码即订阅") — never rows in `data_sources`. DB keeps only runtime state (`source_states`, keyed by stable `code`); news/logs/alerts reference them via `source_code`. RSS sources are rows in `data_sources`. Admin `POST/PUT/DELETE /admin/sources` accepts RSS only (`type: 'rss'`, `sourceType` forced to `'rss'`); built-in ops go through `/admin/sources/builtin/:code` (fetch/test/update-enabled/logs).
- Adding a built-in source = append a def in `api-sources.ts` **plus** register its `parser` in `rest.ts` / `html.ts` / `api-parsers.ts` (startup throws in `db/migrate.ts` if missing). `code` is the stable identity — never change it after publish. Removing a `code` from the list deletes its state + news/logs/alerts on next startup. Consult `docs/api.md` for already-tested source APIs.
- Startup runs idempotent `migrateBuiltinApiSources()` (`backend/src/db/migrate.ts`): syncs `source_states`, upgrades old DBs, creates `news_comments` / `ai_agent_logs`, ensures the agent user row.
- AI agent (`users.username='ai_agent'`, constant `AI_AGENT_USERNAME`; display nickname editable, default 润土): logic in `backend/src/services/ai-agent.ts`, OpenAI-compatible client in `services/ai.ts` (key from `system_config.ai_api_key` or env). Mention-replies run fire-and-forget; per-user-per-day quota surfaces as sync `aiQuotaExhausted` flag; avatar must be `style:seed` matching `src/lib/avatar.ts` styles. News comments live in `news_comments` (`backend/src/routes/news-comments.ts`).

## Commands

Root (frontend; `lint`/`format` scripts exist **only here** — run from root to cover `backend/` too):

- `npm run dev` — Vite on `:8763`
- `npm run build` — `tsc -b && vite build` (typecheck + bundle; no separate typecheck script)
- `npm run lint` — `oxlint` (NOT ESLint)
- `npm run format` — `prettier --write .`
- `./scripts/dev.sh [--force]` — starts backend (`:8762`) + frontend (`:8763`) with health-check; `--force` kills port occupants

`backend/` (run with workdir `backend/` — DB path `./data/database.db` is relative, also in `drizzle.config.ts`):

- `npm run dev` — `tsx watch src/index.ts`, serves `:8762`
- `npm run build` / `npm run start` — `tsc` → `node dist/index.js`
- `npm run db:push` then `npm run db:seed` — create SQLite schema, then seed the default **RSS** sources only (order matters; seed assumes schema exists; built-in API sources need no seed)

Tests: no framework / no script. `node --test tests/api-integration.test.ts` with a seeded backend running on `:8762` (expects `admin@example.com` / `admin123`, invite code `hotnews2026`). Tests mutate the real dev DB (create/delete users + RSS sources, toggle `aiAgent` config) and the news-comments suite polls `GET /news` up to ~90s waiting for scheduler fetch — needs network.

## Gotchas

- Frontend API URL is hardcoded: `src/services/api.ts` uses `http://localhost:8762/api` and `vite.config.ts` has no proxy. Frontend dev requires the backend running; changing ports means editing `api.ts`.
- Backend env comes from `backend/.env` (copy from `backend/.env.example`), validated with defaults by zod in `backend/src/utils/env.ts`.
- Every backend start syncs the earliest-created admin account to the `ADMIN_*` env values (`initializeDefaults` in `backend/src/index.ts`). Admin credential changes made via UI/API are overwritten on restart — update `.env` instead.
- SQLite file is `backend/data/database.db` (whole `backend/data/` gitignored, auto-created, WAL mode). Schema `backend/src/db/schema.ts`.
- Uploads: multipart limit 10 MB / 10 files, served at `/uploads/` from `backend/data/uploads` (`UPLOAD_ROOT` in `backend/src/utils/uploads.ts`).
- Outbound HTTP must go through `proxyFetch()` (`backend/src/utils/http.ts`), never raw `fetch()` — Node fetch ignores `HTTP(S)_PROXY`/`NO_PROXY`, so proxied environments fail with `fetch failed`. New `undici` direct dep for `ProxyAgent`. RSS uses `proxyFetch` + `parseString` (rss-parser's own request bypasses proxy).
- All frontend routes require login; `/admin/*` requires admin role (`ProtectedRoute` / `AdminRoute` in `src/App.tsx`). API auth is `Authorization: Bearer <token>`.

## Conventions

- Import alias `@/*` → `src/*` (defined in both `vite.config.ts` and `tsconfig.app.json`); shadcn aliases in `components.json` (`@/components`, `@/lib`, `@/hooks`, …).
- TypeScript: project references (`tsc -b`; `tsconfig.app.json` covers `src/`, `tsconfig.node.json` covers `vite.config.ts`); backend has its own `backend/tsconfig.json`. Both forbid `enum`/`namespace` (`erasableSyntaxOnly` — use const objects/unions), `import type` (`verbatimModuleSyntax`), unused vars (`noUnusedLocals`/`noUnusedParameters` fail the build).
- Router is `react-router` v8 imported from `'react-router'` (not `react-router-dom`, not v7).
- Tailwind CSS v4: `@import 'tailwindcss'` + `@theme` in `src/index.css`, no `tailwind.config.js`. Shadcn style `base-nova`.
- Pre-commit runs `npx lint-staged` (husky): `oxlint --fix` + `prettier --write` on `*.{ts,tsx}`. Prettier: no semicolons, single quotes, 100 col (`.prettierrc`).
