# AGENTS.md

## Project overview

AI Hot News Hub — aggregates trending content from Chinese and international platforms (Zhihu, Weibo, Bilibili, GitHub, etc.). Frontend is a Vite + React 19 + TypeScript 6 app. Backend is Node.js + Fastify + SQLite.

## Commands

### Frontend (root)

| Task                       | Command                                       |
| -------------------------- | --------------------------------------------- |
| Dev server                 | `npm run dev`                                 |
| Build (typecheck + bundle) | `npm run build` (runs `tsc -b && vite build`) |
| Lint                       | `npm run lint` (runs `oxlint`)                |
| Preview production build   | `npm run preview`                             |

### Backend (`cd backend`)

| Task              | Command           |
| ----------------- | ----------------- |
| Dev server        | `npm run dev`     |
| Build             | `npm run build`   |
| Start             | `npm run start`   |
| Push DB schema    | `npm run db:push` |
| Seed data sources | `npm run db:seed` |

- No dedicated `typecheck` script. Type checking happens as part of `npm run build` via `tsc -b`.
- No test framework is configured yet.

## Tech stack & toolchain

### Core framework

- **Bundler:** Vite 8 with `@vitejs/plugin-react` (OXC-based, not SWC)
- **Linter:** oxlint (NOT ESLint). Config in `.oxlintrc.json`. Plugins: react, typescript, oxc.
- **TypeScript:** ~6.0.2 with project references (`tsconfig.json` → `tsconfig.app.json` + `tsconfig.node.json`). Build uses `tsc -b`.
- **Strict TS flags:** `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `verbatimModuleSyntax`
- **Module system:** ESM (`"type": "module"` in package.json)
- **Code formatter:** Prettier

### Frontend

- **CSS:** Tailwind CSS
- **UI components:** Shadcn/ui (built on Radix UI)
- **State management:** Zustand
- **Routing:** React Router v7
- **Data fetching:** TanStack Query + Fetch
- **Form handling:** React Hook Form
- **Data validation:** Zod
- **Charts:** ECharts
- **Internationalization:** react-i18next
- **Icons:** Lucide React
- **Date/time:** Day.js
- **Animations:** Framer Motion
- **Notifications:** Sonner

### Backend

- **Framework:** Node.js + Fastify
- **Database:** SQLite + Drizzle ORM
- **API docs:** Swagger/OpenAPI

## Key conventions

- `src/` contains the React app. Entry: `src/main.tsx` → `src/App.tsx`.
- `public/` has static assets (`favicon.svg`, `icons.svg`).
- `docs/public-api-doc.md` documents all tested public API endpoints (Chinese social/news platforms, dev communities, AI/tech media). Consult this before adding new data sources.
- `backend/` contains the Fastify API server.

## Quirks

- `tsconfig.node.json` only covers `vite.config.ts`; `tsconfig.app.json` covers `src/`. They use different `module` settings (`nodenext` vs `esnext`).
- The `erasableSyntaxOnly` TS flag means runtime-enumerable syntax (e.g. `enum`, `namespace`) is disallowed. Use `const` objects or union types instead.
- Oxlint rules: `react/rules-of-hooks` is error, `react/only-export-components` is warn.
