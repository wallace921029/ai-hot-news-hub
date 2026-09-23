# AI Hot News Hub — 模块功能详细描述

> 版本：v1.0
> 最后更新：2026-09-20

---

## 1. 系统架构概述

### 1.1 整体架构

AI Hot News Hub 采用前后端分离架构，前端使用 React + TypeScript，后端使用 Fastify + Node.js。

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    系统架构                                          │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    前端层                                            │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │  React 19 + TypeScript 6 + Vite 8                                          │    │
│  │  ├── Tailwind CSS 4 (样式)                                                 │    │
│  │  ├── Shadcn/ui (UI 组件库)                                                 │    │
│  │  ├── Zustand (状态管理)                                                    │    │
│  │  ├── React Router v7 (路由)                                                │    │
│  │  ├── TanStack Query (数据获取)                                             │    │
│  │  └── ECharts (图表)                                                        │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTP/REST API
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    后端层                                            │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │  Fastify + Node.js                                                         │    │
│  │  ├── 路由层 (Routes)                                                       │    │
│  │  ├── 中间件层 (Middleware)                                                 │    │
│  │  ├── 服务层 (Services)                                                     │    │
│  │  └── 工具层 (Utils)                                                        │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    数据层                                            │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │  SQLite + Drizzle ORM                                                      │    │
│  │  ├── 数据库文件 (backend/data/)                                            │    │
│  │  └── Schema 定义 (backend/src/db/schema.ts)                                │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 目录结构

```
ai-hot-news-hub/
├── src/                          # 前端源码
│   ├── components/               # UI 组件
│   │   ├── layouts/             # 布局组件
│   │   ├── ui/                  # Shadcn/ui 组件
│   │   └── NewsCard.tsx         # 新闻卡片组件
│   ├── pages/                   # 页面组件
│   │   ├── admin/               # 管理后台页面
│   │   │   ├── Config.tsx       # 系统配置页面
│   │   │   ├── Content.tsx      # 内容管理页面
│   │   │   ├── Dashboard.tsx    # 数据统计页面
│   │   │   ├── Logs.tsx         # 日志查看页面
│   │   │   ├── Sources.tsx      # 数据源管理页面
│   │   │   └── Users.tsx        # 用户管理页面
│   │   ├── Favorites.tsx        # 收藏页面
│   │   ├── Home.tsx             # 首页
│   │   ├── Login.tsx            # 登录页面
│   │   └── Register.tsx         # 注册页面
│   ├── hooks/                   # 自定义 Hooks
│   ├── lib/                     # 工具函数
│   ├── services/                # API 服务层
│   │   └── api.ts               # API 客户端
│   ├── stores/                  # Zustand 状态管理
│   │   ├── filter.ts            # 筛选状态
│   │   └── user.ts              # 用户状态
│   └── types/                   # TypeScript 类型定义
├── backend/                     # 后端源码
│   ├── src/
│   │   ├── ai/                  # AI 处理模块
│   │   ├── db/                  # 数据库相关
│   │   │   ├── index.ts         # 数据库连接
│   │   │   ├── schema.ts        # 表结构定义
│   │   │   └── seed.ts          # 数据初始化
│   │   ├── fetchers/            # 数据抓取器
│   │   │   ├── html.ts          # HTML 解析器
│   │   │   ├── rest.ts          # REST API 抓取器
│   │   │   ├── rss.ts           # RSS 抓取器
│   │   │   └── types.ts         # 类型定义
│   │   ├── middleware/          # 中间件
│   │   │   └── auth.ts          # 认证中间件
│   │   ├── parsers/             # 内容解析器
│   │   ├── routes/              # API 路由
│   │   │   ├── admin/           # 管理员接口
│   │   │   │   ├── config.ts    # 系统配置
│   │   │   │   ├── content.ts   # 内容管理
│   │   │   │   ├── index.ts     # 路由注册
│   │   │   │   ├── logs.ts      # 日志管理
│   │   │   │   ├── sources.ts   # 数据源管理
│   │   │   │   ├── stats.ts     # 统计数据
│   │   │   │   └── users.ts     # 用户管理
│   │   │   ├── auth.ts          # 认证接口
│   │   │   ├── favorites.ts     # 收藏接口
│   │   │   └── news.ts          # 新闻接口
│   │   ├── scheduler/           # 定时任务
│   │   │   └── index.ts         # 调度器
│   │   ├── services/            # 业务逻辑
│   │   └── utils/               # 工具函数
│   ├── data/                    # SQLite 数据库文件
│   └── dist/                    # 编译输出
├── docs/                        # 文档
├── public/                      # 静态资源
├── docker-compose.yml           # Docker 编排
└── Dockerfile                   # Docker 镜像
```

---

## 2. 前端模块详细描述

### 2.1 路由模块 (`src/App.tsx`)

**功能描述：**
路由模块负责管理应用的页面导航和权限控制。

**路由配置：**

| 路径             | 组件        | 权限要求 | 说明                 |
| ---------------- | ----------- | -------- | -------------------- |
| `/`              | `Home`      | 无       | 首页，展示新闻信息流 |
| `/favorites`     | `Favorites` | 登录用户 | 收藏页面             |
| `/login`         | `Login`     | 无       | 登录页面             |
| `/register`      | `Register`  | 无       | 注册页面             |
| `/admin`         | `Dashboard` | 管理员   | 管理后台首页         |
| `/admin/sources` | `Sources`   | 管理员   | 数据源管理           |
| `/admin/users`   | `Users`     | 管理员   | 用户管理             |
| `/admin/content` | `Content`   | 管理员   | 内容管理             |
| `/admin/config`  | `Config`    | 管理员   | 系统配置             |
| `/admin/logs`    | `Logs`      | 管理员   | 日志查看             |

**权限控制：**

- 使用 `ProtectedRoute` 组件包装需要认证的路由
- 使用 `AdminRoute` 组件包装需要管理员权限的路由
- 未登录用户访问受保护路由时重定向到登录页
- 非管理员访问管理后台时重定向到首页

### 2.2 状态管理模块 (`src/stores/`)

#### 2.2.1 用户状态 (`user.ts`)

**功能描述：**
管理用户认证状态和用户信息。

**状态字段：**

```typescript
interface UserStore {
  user: User | null // 当前用户信息
  token: string | null // JWT Token
  isAuthenticated: boolean // 是否已认证
  isAdmin: boolean // 是否管理员
}
```

**操作方法：**

| 方法                     | 说明                            |
| ------------------------ | ------------------------------- |
| `login(email, password)` | 用户登录，获取 Token 并存储     |
| `logout()`               | 用户登出，清除 Token 和用户信息 |
| `setUser(user)`          | 设置用户信息                    |
| `getToken()`             | 获取当前 Token                  |
| `checkAuth()`            | 检查认证状态，验证 Token 有效性 |

**持久化：**

- Token 存储在 `localStorage`
- 应用启动时自动检查 Token 有效性

#### 2.2.2 筛选状态 (`filter.ts`)

**功能描述：**
管理首页新闻列表的筛选条件。

**状态字段：**

```typescript
interface FilterStore {
  platform: string | null // 平台筛选
  sourceType: string | null // 数据源类型筛选 (rss/api/topic)
  sortBy: 'score' | 'time' // 排序方式
  search: string // 搜索关键词
  page: number // 当前页码
}
```

**操作方法：**

| 方法                        | 说明               |
| --------------------------- | ------------------ |
| `setPlatform(platform)`     | 设置平台筛选       |
| `setSourceType(sourceType)` | 设置数据源类型筛选 |
| `setSortBy(sortBy)`         | 设置排序方式       |
| `setSearch(search)`         | 设置搜索关键词     |
| `setPage(page)`             | 设置当前页码       |
| `resetFilters()`            | 重置所有筛选条件   |

### 2.3 API 服务模块 (`src/services/api.ts`)

**功能描述：**
封装所有与后端 API 的交互，提供统一的请求接口。

**类结构：**

```typescript
class ApiService {
  private token: string | null

  // 设置 Token
  setToken(token: string | null): void

  // 通用请求方法
  private async request<T>(endpoint: string, options: RequestOptions): Promise<T>

  // 认证接口
  async login(email: string, password: string): Promise<{ user: User; token: string }>
  async register(
    username: string,
    email: string,
    password: string,
    inviteCode: string
  ): Promise<{ user: User; token: string }>
  async getMe(): Promise<User>

  // 新闻接口
  async getNews(params: NewsParams): Promise<NewsResponse>
  async getNewsById(id: number): Promise<NewsItem>
  async getNewsSources(sourceType?: string): Promise<Source[]>
  async getPlatforms(sourceType?: string): Promise<string[]>

  // 收藏接口
  async getFavorites(page: number, pageSize: number): Promise<FavoritesResponse>
  async addFavorite(newsId: number): Promise<void>
  async removeFavorite(newsId: number): Promise<void>

  // 管理员接口
  async getSources(): Promise<Source[]>
  async createSource(data: CreateSourceRequest): Promise<Source>
  async updateSource(id: number, data: UpdateSourceRequest): Promise<Source>
  async deleteSource(id: number): Promise<void>
  async fetchSource(id: number): Promise<void>
  async testSource(id: number): Promise<TestResult>

  async getUsers(params: UserParams): Promise<UsersResponse>
  async createUser(data: CreateUserRequest): Promise<User>
  async updateUser(id: number, data: UpdateUserRequest): Promise<User>
  async deleteUser(id: number): Promise<void>
  async resetPassword(id: number, password: string): Promise<void>

  async getAdminContent(params: ContentParams): Promise<ContentResponse>
  async updateContent(id: number, data: UpdateContentRequest): Promise<NewsItem>
  async deleteContent(id: number): Promise<void>
  async batchDeleteContent(ids: number[]): Promise<void>

  async getConfig(): Promise<Config>
  async updateConfig(data: UpdateConfigRequest): Promise<Config>
  async getAutoFetch(): Promise<{ enabled: boolean }>
  async setAutoFetch(enabled: boolean): Promise<void>

  async getStats(): Promise<Stats>
  async getFetchLogs(params: LogParams): Promise<LogsResponse>
  async getAILogs(params: LogParams): Promise<LogsResponse>
  async getErrorLogs(params: LogParams): Promise<LogsResponse>
}
```

**请求拦截：**

- 自动在请求头中添加 `Authorization: Bearer <token>`
- 统一处理 HTTP 错误响应
- 自动解析 JSON 响应

### 2.4 页面组件模块

#### 2.4.1 首页 (`src/pages/Home.tsx`)

**功能描述：**
展示新闻信息流，支持筛选、排序和搜索。

**主要功能：**

| 功能     | 说明                            |
| -------- | ------------------------------- |
| 新闻列表 | 分页展示新闻卡片，每页 20 条    |
| 平台筛选 | 按数据来源平台筛选              |
| 类型筛选 | 按数据源类型筛选 (RSS/API/话题) |
| 排序切换 | 支持按 AI 评分或时间排序        |
| 搜索功能 | 全文搜索标题和描述              |
| 加载状态 | 显示加载动画和骨架屏            |
| 错误处理 | 显示错误信息和重试按钮          |

**数据流：**

1. 使用 `useQuery` 获取新闻列表数据
2. 筛选条件变化时自动重新获取
3. 使用 `keepPreviousData` 优化翻页体验

#### 2.4.2 收藏页面 (`src/pages/Favorites.tsx`)

**功能描述：**
展示用户收藏的新闻列表。

**主要功能：**

| 功能     | 说明                   |
| -------- | ---------------------- |
| 收藏列表 | 分页展示收藏的新闻     |
| 取消收藏 | 点击按钮取消收藏       |
| 空状态   | 无收藏时显示空状态提示 |
| 加载状态 | 显示加载动画           |

#### 2.4.3 登录页面 (`src/pages/Login.tsx`)

**功能描述：**
用户登录表单。

**主要功能：**

| 功能       | 说明                         |
| ---------- | ---------------------------- |
| 表单验证   | 验证邮箱格式和密码长度       |
| 登录请求   | 调用登录 API                 |
| 错误提示   | 显示登录失败原因             |
| 跳转       | 登录成功后跳转到首页         |
| Token 存储 | 将 Token 存储到 localStorage |

#### 2.4.4 注册页面 (`src/pages/Register.tsx`)

**功能描述：**
用户注册表单。

**主要功能：**

| 功能     | 说明                           |
| -------- | ------------------------------ |
| 表单验证 | 验证用户名、邮箱、密码和邀请码 |
| 注册请求 | 调用注册 API                   |
| 错误提示 | 显示注册失败原因               |
| 跳转     | 注册成功后跳转到首页           |

### 2.5 管理后台页面模块

#### 2.5.1 数据源管理 (`src/pages/admin/Sources.tsx`)

**功能描述：**
管理数据源的 CRUD 操作和状态控制。

**主要功能：**

| 功能       | 说明                      |
| ---------- | ------------------------- |
| 数据源列表 | 显示所有数据源及其状态    |
| 添加数据源 | 填写表单创建新数据源      |
| 编辑数据源 | 修改数据源配置            |
| 删除数据源 | 删除数据源（需确认）      |
| 启用/禁用  | 切换数据源启用状态        |
| 手动抓取   | 触发指定数据源的抓取任务  |
| 测试连通性 | 测试数据源 URL 是否可访问 |

**表单字段：**

```typescript
interface SourceForm {
  name: string // 数据源名称
  type: 'rest' | 'rss' | 'html' // 数据源类型
  sourceType: 'rss' | 'api' | 'topic' // 来源类型
  url: string // API/源地址
  method?: 'GET' | 'POST' // 请求方法
  headers?: string // 自定义请求头 (JSON)
  body?: string // POST 请求体
  parser?: string // 解析器标识
  description?: string // 描述
  enabled: boolean // 是否启用
}
```

#### 2.5.2 用户管理 (`src/pages/admin/Users.tsx`)

**功能描述：**
管理用户账号和邀请码。

**主要功能：**

| 功能       | 说明                 |
| ---------- | -------------------- |
| 用户列表   | 显示所有用户及其状态 |
| 创建用户   | 创建新的管理员账号   |
| 编辑用户   | 修改用户信息和角色   |
| 删除用户   | 删除用户（需确认）   |
| 重置密码   | 重置用户密码         |
| 邀请码管理 | 查看和修改邀请码     |
| 注册开关   | 开启/关闭注册功能    |

#### 2.5.3 内容管理 (`src/pages/admin/Content.tsx`)

**功能描述：**
管理新闻内容。

**主要功能：**

| 功能     | 说明                 |
| -------- | -------------------- |
| 内容列表 | 显示所有新闻内容     |
| 筛选功能 | 按状态、类型筛选     |
| 删除内容 | 删除单条新闻         |
| 批量删除 | 选择多条新闻批量删除 |

#### 2.5.4 系统配置 (`src/pages/admin/Config.tsx`)

**功能描述：**
管理系统全局配置。

**配置项：**

| 配置项      | 说明                              |
| ----------- | --------------------------------- |
| AI 模型配置 | API Key、Base URL、模型名称、参数 |
| 抓取频率    | 全局抓取间隔（分钟）              |
| 注册开关    | 开启/关闭用户注册                 |
| 邀请码      | 设置注册邀请码                    |

#### 2.5.5 数据统计 (`src/pages/admin/Dashboard.tsx`)

**功能描述：**
展示系统运行统计数据。

**统计指标：**

| 指标         | 说明               |
| ------------ | ------------------ |
| 总数据源数   | 系统中的数据源总数 |
| 启用数据源数 | 当前启用的数据源数 |
| 总内容数     | 系统中的新闻总数   |
| 今日新增     | 今日新增的新闻数   |
| 总用户数     | 系统中的用户总数   |
| 总收藏数     | 系统中的收藏总数   |

**图表展示：**

| 图表     | 说明                       |
| -------- | -------------------------- |
| 平台分布 | 各平台内容数量的柱状图     |
| 类型分布 | RSS/API/话题内容占比的饼图 |

#### 2.5.6 日志查看 (`src/pages/admin/Logs.tsx`)

**功能描述：**
查看系统运行日志。

**日志类型：**

| 类型        | 说明                      |
| ----------- | ------------------------- |
| 抓取日志    | 数据源抓取的成功/失败记录 |
| AI 处理日志 | AI 分类和评分的处理记录   |
| 错误日志    | 系统错误记录              |

### 2.6 UI 组件模块

#### 2.6.1 新闻卡片 (`src/components/NewsCard.tsx`)

**功能描述：**
展示单条新闻的卡片组件。

**Props：**

```typescript
interface NewsCardProps {
  item: NewsItem // 新闻数据
  isFavorited?: boolean // 是否已收藏
}
```

**展示内容：**

- 新闻标题（可点击跳转原文）
- 数据来源名称
- 平台标识
- 抓取时间
- 收藏按钮（hover 显示）

**交互功能：**

- 点击标题在新标签页打开原文
- 点击收藏按钮添加/取消收藏
- 收藏成功后显示 toast 提示

#### 2.6.2 布局组件 (`src/components/layouts/`)

**功能描述：**
提供应用的整体布局结构。

**组件：**

- `MainLayout`: 主布局，包含 Header 和内容区域
- `AdminLayout`: 管理后台布局，包含侧边栏和内容区域

---

## 3. 后端模块详细描述

### 3.1 数据库模块 (`backend/src/db/`)

#### 3.1.1 数据库连接 (`index.ts`)

**功能描述：**
初始化 SQLite 数据库连接和 Drizzle ORM。

**实现细节：**

- 使用 `better-sqlite3` 驱动
- 数据库文件路径：`backend/data/database.sqlite`
- 启用 WAL 模式提高并发性能

#### 3.1.2 表结构定义 (`schema.ts`)

**功能描述：**
定义所有数据库表的结构。

**核心表：**

| 表名            | 说明           |
| --------------- | -------------- |
| `users`         | 用户表         |
| `data_sources`  | 数据源表       |
| `news_items`    | 新闻条目表     |
| `favorites`     | 收藏表         |
| `topics`        | 话题表（预留） |
| `fetch_logs`    | 抓取日志表     |
| `ai_logs`       | AI 处理日志表  |
| `system_config` | 系统配置表     |

#### 3.1.3 数据初始化 (`seed.ts`)

**功能描述：**
初始化默认数据源和系统配置。

**初始化内容：**

- 默认管理员账号
- 预置数据源配置
- 默认系统配置

### 3.2 路由模块 (`backend/src/routes/`)

#### 3.2.1 认证路由 (`auth.ts`)

**功能描述：**
处理用户认证相关请求。

**接口列表：**

| 方法 | 路径                 | 说明             |
| ---- | -------------------- | ---------------- |
| POST | `/api/auth/register` | 用户注册         |
| POST | `/api/auth/login`    | 用户登录         |
| GET  | `/api/auth/me`       | 获取当前用户信息 |

**注册流程：**

1. 验证参数格式
2. 检查注册是否开启
3. 验证邀请码
4. 检查用户名和邮箱是否重复
5. 加密密码（bcrypt）
6. 创建用户记录
7. 生成 JWT Token
8. 返回用户信息和 Token

**登录流程：**

1. 验证参数格式
2. 查找用户记录
3. 检查用户状态
4. 验证密码
5. 生成 JWT Token
6. 返回用户信息和 Token

#### 3.2.2 新闻路由 (`news.ts`)

**功能描述：**
处理新闻内容相关请求。

**接口列表：**

| 方法 | 路径                  | 说明           |
| ---- | --------------------- | -------------- |
| GET  | `/api/news`           | 获取新闻列表   |
| GET  | `/api/news/:id`       | 获取新闻详情   |
| GET  | `/api/news/sources`   | 获取数据源列表 |
| GET  | `/api/news/platforms` | 获取平台列表   |

**列表查询参数：**

```typescript
interface NewsQuery {
  page?: number // 页码，默认 1
  pageSize?: number // 每页数量，默认 20
  sourceType?: 'rss' | 'api' | 'topic' // 数据源类型
  sourceId?: number // 数据源 ID
  platform?: string // 平台标识
  search?: string // 搜索关键词
}
```

**查询逻辑：**

1. 只返回 `status = 'processed'` 的新闻
2. 支持按平台、类型、数据源筛选
3. 支持标题和描述的模糊搜索
4. 按抓取时间降序排列
5. 返回数据源名称映射

#### 3.2.3 收藏路由 (`favorites.ts`)

**功能描述：**
处理用户收藏相关请求。

**接口列表：**

| 方法   | 路径                     | 说明         |
| ------ | ------------------------ | ------------ |
| GET    | `/api/favorites`         | 获取收藏列表 |
| POST   | `/api/favorites/:newsId` | 添加收藏     |
| DELETE | `/api/favorites/:newsId` | 取消收藏     |

**权限要求：**

- 所有接口都需要登录认证

#### 3.2.4 管理员路由 (`admin/`)

**数据源管理 (`sources.ts`)：**

| 方法   | 路径                           | 说明           |
| ------ | ------------------------------ | -------------- |
| GET    | `/api/admin/sources`           | 获取数据源列表 |
| POST   | `/api/admin/sources`           | 创建数据源     |
| PUT    | `/api/admin/sources/:id`       | 更新数据源     |
| DELETE | `/api/admin/sources/:id`       | 删除数据源     |
| POST   | `/api/admin/sources/:id/fetch` | 手动触发抓取   |
| POST   | `/api/admin/sources/:id/test`  | 测试连通性     |

**用户管理 (`users.ts`)：**

| 方法   | 路径                                  | 说明         |
| ------ | ------------------------------------- | ------------ |
| GET    | `/api/admin/users`                    | 获取用户列表 |
| POST   | `/api/admin/users`                    | 创建用户     |
| PUT    | `/api/admin/users/:id`                | 更新用户     |
| DELETE | `/api/admin/users/:id`                | 删除用户     |
| PUT    | `/api/admin/users/:id/reset-password` | 重置密码     |

**内容管理 (`content.ts`)：**

| 方法   | 路径                              | 说明         |
| ------ | --------------------------------- | ------------ |
| GET    | `/api/admin/content`              | 获取内容列表 |
| PUT    | `/api/admin/content/:id`          | 更新内容     |
| DELETE | `/api/admin/content/:id`          | 删除内容     |
| POST   | `/api/admin/content/batch-delete` | 批量删除     |
| POST   | `/api/admin/content/fetch`        | 触发全部抓取 |

**系统配置 (`config.ts`)：**

| 方法 | 路径                           | 说明             |
| ---- | ------------------------------ | ---------------- |
| GET  | `/api/admin/config`            | 获取系统配置     |
| PUT  | `/api/admin/config`            | 更新系统配置     |
| GET  | `/api/admin/config/auto-fetch` | 获取自动抓取状态 |
| PUT  | `/api/admin/config/auto-fetch` | 设置自动抓取状态 |

**统计数据 (`stats.ts`)：**

| 方法 | 路径               | 说明         |
| ---- | ------------------ | ------------ |
| GET  | `/api/admin/stats` | 获取统计数据 |

**日志管理 (`logs.ts`)：**

| 方法 | 路径                     | 说明             |
| ---- | ------------------------ | ---------------- |
| GET  | `/api/admin/logs/fetch`  | 获取抓取日志     |
| GET  | `/api/admin/logs/ai`     | 获取 AI 处理日志 |
| GET  | `/api/admin/logs/errors` | 获取错误日志     |

### 3.3 中间件模块 (`backend/src/middleware/`)

#### 3.3.1 认证中间件 (`auth.ts`)

**功能描述：**
验证 JWT Token 并提取用户信息。

**实现逻辑：**

1. 从 `Authorization` 头提取 Token
2. 验证 Token 有效性
3. 解析用户信息
4. 将用户信息附加到请求对象

**使用方式：**

```typescript
// 路由级别
app.get('/protected', { preHandler: [authMiddleware] }, async (request) => {
  // request.user 包含用户信息
})

// 插件级别
app.addHook('preHandler', authMiddleware)
```

### 3.4 数据抓取模块 (`backend/src/fetchers/`)

#### 3.4.1 类型定义 (`types.ts`)

**功能描述：**
定义抓取器的通用接口。

```typescript
interface FetcherSource {
  id: number
  name: string
  url: string
  method?: 'GET' | 'POST'
  headers?: Record<string, string>
  body?: string
  parser?: string
}

interface RawNewsItem {
  sourceId: number
  platform: string
  title: string
  url: string
  description?: string
  author?: string
  publishedAt?: Date
  fetchedAt: Date
  hotScore?: number
  metadata?: Record<string, any>
}

interface Fetcher {
  fetch(source: FetcherSource): Promise<RawNewsItem[]>
}
```

#### 3.4.2 REST API 抓取器 (`rest.ts`)

**功能描述：**
抓取返回 JSON 格式的 REST API 数据源。

**支持的平台解析器：**

| 平台         | 解析器名称    | 说明               |
| ------------ | ------------- | ------------------ |
| 知乎热榜     | `zhihu`       | 解析热榜和日报格式 |
| 微博热搜     | `weibo`       | 解析热搜关键词     |
| B站热搜      | `bilibili`    | 解析热搜关键词     |
| 今日头条     | `toutiao`     | 解析热榜列表       |
| 掘金         | `juejin`      | 解析推荐文章       |
| CSDN         | `csdn`        | 解析热榜文章       |
| GitHub       | `github`      | 解析热门仓库       |
| Hugging Face | `huggingface` | 解析热门模型       |
| 机器之心     | `jiqizhixin`  | 解析 AI 文章       |
| 36氪         | `36kr`        | 解析热榜           |
| 豆瓣电影     | `douban`      | 解析热门电影       |
| 澎湃新闻     | `thepaper`    | 解析热门新闻       |
| 少数派       | `sspai`       | 解析热榜文章       |
| 微信读书     | `weread`      | 解析飙升榜         |

**自动检测：**

- 根据 URL 域名自动选择解析器
- 支持自定义解析器标识

#### 3.4.3 RSS 抓取器 (`rss.ts`)

**功能描述：**
抓取 RSS/Atom 格式的数据源。

**支持的格式：**

- RSS 2.0
- Atom
- RDF

**解析内容：**

- 标题
- 链接
- 描述/内容
- 作者
- 发布时间

#### 3.4.4 HTML 解析器 (`html.ts`)

**功能描述：**
解析 HTML 页面提取数据。

**支持的平台：**

- 百度热搜
- IT之家
- 超神经
- 澎湃新闻

**解析方式：**

- 使用 CSS 选择器提取数据
- 支持自定义解析规则

### 3.5 调度器模块 (`backend/src/scheduler/`)

#### 3.5.1 调度器 (`index.ts`)

**功能描述：**
管理定时抓取任务。

**核心功能：**

| 功能     | 说明                              |
| -------- | --------------------------------- |
| 定时触发 | 使用 `node-cron` 定时执行抓取任务 |
| 并发控制 | 限制并发抓取数量（默认 5）        |
| 去重处理 | 基于 URL 和标题去重               |
| 日志记录 | 记录抓取成功/失败日志             |
| 状态更新 | 更新数据源的抓取时间和错误信息    |

**定时任务配置：**

- 系统自带定时器每分钟检查一次，RSS 与 API 订阅按各自间隔分别触发一轮
- 刷新间隔在「系统配置 → 抓取设置」中按类别分别设置（5–1440 分钟，默认 30）
- 手动「获取全部 / 手动抓取」不受间隔限制；开启自动抓取后 1 分钟内触发首轮
- 单源抓取失败自动重试，最多尝试 3 次（退避 3s / 10s）
- 每日 04:00 后自动清理过期数据（新闻 30 天，抓取日志与告警 90 天；被收藏的新闻永不清）

**抓取流程：**

1. 获取所有启用的数据源
2. 按并发数分批执行
3. 调用对应的抓取器获取数据
4. 数据标准化和去重
5. 保存到数据库
6. 记录抓取日志
7. 更新数据源状态

### 3.6 AI 处理模块 (`backend/src/ai/`)

#### 3.6.1 AI 处理器 (`index.ts`)

**功能描述：**
预留的 AI 处理模块，用于新闻分类和评分。

**当前状态：**

- 功能已禁用
- 提供接口占位

**计划功能：**

| 功能     | 说明                        |
| -------- | --------------------------- |
| 新闻分类 | AI 自动分配分类标签         |
| 价值评分 | AI 评估信息价值（0-100 分） |
| 摘要生成 | AI 生成一句话摘要           |

**接口定义：**

```typescript
// 处理所有待处理的新闻
async function processAllPending(): Promise<{ processed: number; failed: number; total: number }>

// 处理单条新闻
async function processNewsItemById(id: number): Promise<void>

// 批量处理新闻
async function processBatchByIds(ids: number[]): Promise<void>
```

---

## 4. 数据流详细描述

### 4.1 内容抓取数据流

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              内容抓取数据流                                          │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  调度器     │    │  抓取器     │    │  数据处理   │    │  数据库     │
│  (Cron)     │    │ (Fetcher)   │    │  (Process)  │    │  (SQLite)   │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │                  │
       │  1. 触发任务     │                  │                  │
       │ ────────────────>│                  │                  │
       │                  │                  │                  │
       │                  │  2. 获取数据源   │                  │
       │                  │ ────────────────────────────────────>│
       │                  │                  │                  │
       │                  │  3. 返回数据源   │                  │
       │                  │ <────────────────────────────────────│
       │                  │                  │                  │
       │                  │  4. 发送请求     │                  │
       │                  │ ────────────────>│                  │
       │                  │   (外部 API)     │                  │
       │                  │                  │                  │
       │                  │  5. 返回响应     │                  │
       │                  │ <────────────────│                  │
       │                  │                  │                  │
       │                  │  6. 解析数据     │                  │
       │                  │ ────────────────>│                  │
       │                  │                  │                  │
       │                  │  7. 标准化数据   │                  │
       │                  │ <────────────────│                  │
       │                  │                  │                  │
       │                  │  8. 去重检查     │                  │
       │                  │ ────────────────────────────────────>│
       │                  │                  │                  │
       │                  │  9. 返回结果     │                  │
       │                  │ <────────────────────────────────────│
       │                  │                  │                  │
       │                  │  10. 保存数据    │                  │
       │                  │ ────────────────────────────────────>│
       │                  │                  │                  │
       │                  │  11. 记录日志    │                  │
       │                  │ ────────────────────────────────────>│
       │                  │                  │                  │
       │                  │  12. 更新状态    │                  │
       │                  │ ────────────────────────────────────>│
       │                  │                  │                  │
```

### 4.2 用户认证数据流

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              用户认证数据流                                          │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   前端      │    │   后端      │    │  数据库     │    │  JWT 服务   │
│  (React)    │    │  (Fastify)  │    │  (SQLite)   │    │             │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │                  │
       │  1. 登录请求     │                  │                  │
       │ ────────────────>│                  │                  │
       │                  │                  │                  │
       │                  │  2. 查询用户     │                  │
       │                  │ ────────────────>│                  │
       │                  │                  │                  │
       │                  │  3. 返回用户     │                  │
       │                  │ <────────────────│                  │
       │                  │                  │                  │
       │                  │  4. 验证密码     │                  │
       │                  │                  │                  │
       │                  │  5. 生成 Token   │                  │
       │                  │ ────────────────────────────────────>│
       │                  │                  │                  │
       │                  │  6. 返回 Token   │                  │
       │                  │ <────────────────────────────────────│
       │                  │                  │                  │
       │  7. 返回响应     │                  │                  │
       │ <────────────────│                  │                  │
       │                  │                  │                  │
       │  8. 存储 Token   │                  │                  │
       │ (localStorage)   │                  │                  │
       │                  │                  │                  │
```

### 4.3 内容浏览数据流

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              内容浏览数据流                                          │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   用户      │    │   前端      │    │   后端      │    │  数据库     │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │                  │
       │  1. 访问首页     │                  │                  │
       │ ────────────────>│                  │                  │
       │                  │                  │                  │
       │                  │  2. 请求新闻列表 │                  │
       │                  │ ────────────────>│                  │
       │                  │                  │                  │
       │                  │                  │  3. 查询数据     │
       │                  │                  │ ────────────────>│
       │                  │                  │                  │
       │                  │                  │  4. 返回数据     │
       │                  │                  │ <────────────────│
       │                  │                  │                  │
       │                  │  5. 返回响应     │                  │
       │                  │ <────────────────│                  │
       │                  │                  │                  │
       │  6. 渲染列表     │                  │                  │
       │ <────────────────│                  │                  │
       │                  │                  │                  │
       │  7. 点击筛选     │                  │                  │
       │ ────────────────>│                  │                  │
       │                  │                  │                  │
       │                  │  8. 请求筛选数据 │                  │
       │                  │ ────────────────>│                  │
       │                  │                  │                  │
       │                  │                  │  9. 查询数据     │
       │                  │                  │ ────────────────>│
       │                  │                  │                  │
       │                  │                  │  10. 返回数据    │
       │                  │                  │ <────────────────│
       │                  │                  │                  │
       │                  │  11. 返回响应    │                  │
       │                  │ <────────────────│                  │
       │                  │                  │                  │
       │  12. 更新列表    │                  │                  │
       │ <────────────────│                  │                  │
       │                  │                  │                  │
```

---

## 5. 错误处理机制

### 5.1 前端错误处理

**API 错误处理：**

- 使用 `try-catch` 捕获 API 请求错误
- 显示 toast 错误提示
- 提供重试按钮

**网络错误处理：**

- 检测网络连接状态
- 显示网络错误提示
- 自动重试机制

### 5.2 后端错误处理

**全局错误处理：**

- 使用 Fastify 的 `setErrorHandler` 捕获未处理的错误
- 记录错误日志
- 返回统一的错误响应格式

**错误响应格式：**

```typescript
interface ErrorResponse {
  error: string // 错误信息
  details?: any // 详细错误信息
  statusCode: number // HTTP 状态码
}
```

**常见错误码：**

| 状态码 | 说明                       |
| ------ | -------------------------- |
| 400    | 请求参数错误               |
| 401    | 未认证                     |
| 403    | 权限不足                   |
| 404    | 资源不存在                 |
| 409    | 资源冲突（如用户名已存在） |
| 500    | 服务器内部错误             |

---

## 6. 安全机制

### 6.1 认证安全

**JWT Token：**

- 使用 HMAC-SHA256 签名
- Token 有效期：7 天
- 存储在 `localStorage`

**密码安全：**

- 使用 bcrypt 加密存储
- 加密轮数：10

### 6.2 接口安全

**权限控制：**

- 使用中间件验证 Token
- 使用角色中间件验证管理员权限
- 所有管理接口都需要管理员权限

**输入验证：**

- 使用 Zod 验证请求参数
- 防止 SQL 注入（Drizzle ORM 参数化查询）
- 防止 XSS（前端转义）

### 6.3 数据安全

**数据库安全：**

- 使用 SQLite WAL 模式
- 定期备份数据库文件
- 敏感配置使用环境变量

---

## 7. 性能优化

### 7.1 前端性能优化

**数据获取优化：**

- 使用 TanStack Query 缓存数据
- 使用 `keepPreviousData` 避免翻页闪烁
- 使用 `placeholderData` 显示骨架屏

**渲染优化：**

- 使用 React.memo 优化组件渲染
- 使用虚拟列表优化长列表
- 图片懒加载

### 7.2 后端性能优化

**数据库优化：**

- 添加常用字段索引
- 使用分页查询避免全表扫描
- 使用连接池

**并发控制：**

- 限制同时抓取的数据源数量
- 使用队列处理 AI 任务
- 异步处理非关键任务

---

## 附录

### A. 环境变量配置

**后端环境变量 (`backend/.env`)：**

| 变量名        | 说明            | 默认值      |
| ------------- | --------------- | ----------- |
| `PORT`        | 服务端口        | 8762        |
| `JWT_SECRET`  | JWT 签名密钥    | -           |
| `AI_BASE_URL` | AI API 基础地址 | -           |
| `AI_API_KEY`  | AI API 密钥     | -           |
| `AI_MODEL`    | AI 模型名称     | gpt-4o-mini |

### B. 开发命令

**前端命令：**

| 命令              | 说明           |
| ----------------- | -------------- |
| `npm run dev`     | 启动开发服务器 |
| `npm run build`   | 构建生产版本   |
| `npm run lint`    | 运行代码检查   |
| `npm run preview` | 预览生产构建   |

**后端命令：**

| 命令              | 说明              |
| ----------------- | ----------------- |
| `npm run dev`     | 启动开发服务器    |
| `npm run build`   | 构建生产版本      |
| `npm run start`   | 启动生产服务器    |
| `npm run db:push` | 推送数据库 schema |
| `npm run db:seed` | 初始化数据源      |

### C. 相关文档

- `docs/PRD.md` — 产品需求文档
- `docs/plan.md` — 开发计划
- `docs/public-api-doc.md` — 公开 API 文档
- `docs/uml-modeling.md` — UML 建模文档
