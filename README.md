# AI Hot News Hub

A one-stop hub aggregating trending content from major Chinese and international platforms (Zhihu, Weibo, Bilibili, GitHub, etc.), with AI-powered categorization and scoring to help you efficiently discover high-quality information.

## Features

- **Multi-platform aggregation** — Fetches hot lists from 20+ platforms including Zhihu, Weibo, Bilibili, Toutiao, GitHub, Hugging Face, and more
- **AI classification & scoring** — Automatically categorizes and scores content (0–100) via OpenAI-compatible APIs
- **Smart filtering** — Filter by platform, category, or sort by AI score / time
- **Full-text search** — Search across titles and summaries
- **Favorites** — Save and manage articles of interest
- **Admin panel** — Manage data sources, users, content, system config, stats, and logs
- **Scheduled fetching** — Configurable cron-based data source polling
- **Docker ready** — One-command deployment with Docker Compose

## Tech Stack

| Layer         | Technology                        |
| ------------- | --------------------------------- |
| Frontend      | React 19, TypeScript 6, Vite 8    |
| UI            | Tailwind CSS 4, Shadcn/ui (Radix) |
| State         | Zustand                           |
| Data Fetching | TanStack Query                    |
| Charts        | ECharts                           |
| Backend       | Fastify, Node.js                  |
| Database      | SQLite, Drizzle ORM               |
| AI            | OpenAI-compatible Chat Completion |
| Scheduler     | node-cron                         |
| Linter        | oxlint                            |

## Getting Started

### Prerequisites

- Node.js >= 18
- npm

### Installation

```bash
# Clone the repo
git clone https://github.com/wallace921029/ai-hot-news-hub.git
cd ai-hot-news-hub

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### Database Setup

```bash
cd backend

# Push schema to SQLite
npm run db:push

# Seed default data sources
npm run db:seed
```

### Configuration

Create `backend/.env` based on `backend/.env.example` and configure:

- `JWT_SECRET` — Secret for JWT token signing
- `AI_BASE_URL` — OpenAI-compatible API base URL
- `AI_API_KEY` — API key for the AI service
- `AI_MODEL` — Model name (e.g. `gpt-4o-mini`)

### Development

```bash
# Start backend (from backend/)
npm run dev

# Start frontend (from project root)
npm run dev
```

The frontend runs at `http://localhost:5173` and the backend at `http://localhost:3000`.

### Production Build

```bash
# Build frontend
npm run build

# Build backend
cd backend
npm run build
npm run start
```

### Docker

```bash
docker-compose up -d
```

## Project Structure

```
ai-hot-news-hub/
├── src/                    # Frontend source
│   ├── components/         # UI components (layouts, ui/)
│   ├── pages/              # Route pages (Home, Login, admin/*)
│   ├── stores/             # Zustand stores
│   ├── services/           # API client
│   └── types/              # TypeScript types
├── backend/                # Backend source
│   ├── src/
│   │   ├── routes/         # API routes (auth, news, favorites, admin)
│   │   ├── db/             # Database schema, seed
│   │   ├── fetchers/       # Data fetchers (REST, RSS, HTML)
│   │   ├── ai/             # AI processing
│   │   ├── scheduler/      # Cron scheduler
│   │   └── middleware/      # Auth middleware
│   └── data/               # SQLite database file
├── docs/                   # Documentation & screenshots
├── docker-compose.yml
└── Dockerfile
```

## Supported Data Sources

See [`docs/public-api-doc.md`](docs/public-api-doc.md) for the full list of tested public APIs.

**Chinese platforms:** Zhihu, Weibo, Bilibili, Toutiao, Thepaper, Douban, IT之家, 少数派, 36Kr, Baidu, etc.

**International / Dev:** GitHub Trending, Hugging Face, Google AI Blog, MIT Tech Review, etc.

## License

MIT
