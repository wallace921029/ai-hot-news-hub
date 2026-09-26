# AI Hot News Hub

One-stop hub aggregating trending content from 20+ Chinese and international platforms (Zhihu, Weibo, Bilibili, GitHub, Hugging Face…), with AI categorization and scoring.

## Features

- **Multi-platform aggregation** — hot lists from 20+ platforms, cron-based polling
- **AI classification & scoring** — 0–100 via OpenAI-compatible APIs
- **Filter, search, favorites** — by platform / category / score, full-text search
- **Community** — discussion board, moments, threaded comments, AI @-replies
- **Admin panel** — sources, users, content, config, stats, logs
- **Docker ready**

## Tech Stack

| Layer    | Technology                                                                     |
| -------- | ------------------------------------------------------------------------------ |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, shadcn/ui, Zustand, TanStack Query |
| Backend  | Fastify, SQLite + Drizzle ORM, node-cron                                       |
| AI       | OpenAI-compatible Chat Completion                                              |
| Tooling  | oxlint, prettier                                                               |

## Quick Start

Requires Node.js >= 18.

```bash
# dependencies (two packages)
npm install
cd backend && npm install && cd ..

# database (order matters)
cd backend && npm run db:push && npm run db:seed && cd ..

# config
cp backend/.env.example backend/.env # then edit JWT_SECRET / AI_* / ADMIN_*
```

```bash
./scripts/dev.sh # backend :8762 + frontend :8763
```

Log in with the admin account from `backend/.env` (defaults `admin@example.com` / `admin123`).

## Docs

- `docs/api.md` — tested source APIs / supported platforms
- `docs/deployment.md` — production & Docker deploys
- `docs/database-design.md`, `docs/module-description.md` — architecture
- `AGENTS.md` — contributor / agent guide

## License

MIT
