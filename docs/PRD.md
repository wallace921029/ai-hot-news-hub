# AI Hot News Hub — 产品需求文档 (PRD)

> 版本：v1.0
> 最后更新：2026-09-20
> 状态：草稿

---

## 1. 产品概述

### 1.1 产品定位

AI Hot News Hub 是一个基于 AI 的热门信息汇总平台，自动聚合来自多个平台的热点内容，通过 AI 进行智能归类和价值评分，帮助用户高效获取高质量信息。

### 1.2 目标用户

- **信息重度用户**：需要跨平台追踪热点资讯的从业者
- **技术开发者**：关注技术社区、AI 领域动态的人群
- **内容研究者**：需要快速了解多平台热点的研究人员

### 1.3 核心价值

- **聚合**：一个入口查看多平台热点，无需逐个平台浏览
- **智能分类**：AI 自动归类，按主题而非平台组织内容
- **价值评分**：AI 评估信息质量，帮用户过滤噪音，节省时间

---

## 2. 用户角色与权限

### 2.1 角色定义

| 角色           | 说明                     | 权限范围         |
| -------------- | ------------------------ | ---------------- |
| **平台管理员** | 系统管理者，拥有全部权限 | 所有功能         |
| **普通用户**   | 内容消费者，只读权限     | 浏览、搜索、收藏 |

### 2.2 权限矩阵

| 功能模块           | 管理员 | 普通用户 |
| ------------------ | ------ | -------- |
| 浏览内容           | ✅     | ✅       |
| 搜索内容           | ✅     | ✅       |
| 收藏内容           | ✅     | ✅       |
| 数据源管理         | ✅     | ❌       |
| 用户管理           | ✅     | ❌       |
| 内容管理（增删改） | ✅     | ❌       |
| 系统配置           | ✅     | ❌       |
| 数据统计           | ✅     | ❌       |
| 日志查看           | ✅     | ❌       |

---

## 3. 用户系统

### 3.1 注册机制

**方式**：邀请码注册

- 管理员在后台生成/修改邀请码
- 管理员可开启或关闭注册入口
- 注册时需要填写：用户名、邮箱、密码、邀请码
- 注册后默认为普通用户角色

### 3.2 登录机制

- 支持邮箱 + 密码登录
- JWT Token 认证
- Token 过期时间：7 天（可配置）

### 3.3 管理员账号

- 系统初始化时自动创建默认管理员账号
- 管理员可在后台创建其他管理员账号

---

## 4. 数据源管理

### 4.1 数据源类型

| 类型          | 说明                 | 示例                      |
| ------------- | -------------------- | ------------------------- |
| **REST API**  | 返回 JSON 的公开接口 | 知乎热榜、GitHub Trending |
| **RSS/Atom**  | 标准订阅源格式       | 量子位、Google AI Blog    |
| **HTML 解析** | 需要解析 HTML 页面   | 百度热搜、IT之家          |

### 4.2 已验证数据源

详见 `docs/public-api-doc.md`，包括：

**国内社交/资讯**：知乎热榜、微博热搜、B站热搜、今日头条、知乎日报、澎湃新闻

**开发者/技术社区**：掘金、CSDN、GitHub、Hugging Face

**AI/科技媒体**：机器之心、量子位、Google AI Blog、MIT Technology Review、超神经

**其他平台**：36氪、百度热搜、豆瓣电影、IT之家、少数派、微信读书

### 4.3 数据源配置

每个数据源包含以下配置项：

```typescript
interface DataSource {
  id: string // 唯一标识
  name: string // 显示名称
  type: 'rest' | 'rss' | 'html' // 数据源类型
  url: string // API/源地址
  method?: 'GET' | 'POST' // 请求方法
  headers?: Record<string, string> // 自定义请求头
  body?: string // POST 请求体
  parser?: string // 解析器标识（HTML/XML 解析用）
  enabled: boolean // 是否启用
  fetchInterval: number // 抓取间隔（分钟）
  lastFetchAt?: Date // 上次抓取时间
  description?: string // 描述
}
```

### 4.4 管理员功能

- 添加/编辑/删除数据源
- 启用/禁用数据源
- 手动触发抓取
- 查看数据源状态（上次抓取时间、错误信息）
- 测试数据源连通性

---

## 5. 内容抓取与处理

### 5.1 抓取机制

**定时任务**：

- 管理员可配置全局抓取频率（默认 30 分钟）
- 每个数据源可单独配置抓取频率
- 支持手动触发立即抓取

**抓取流程**：

1. 调度器根据配置触发抓取任务
2. 并发请求各数据源（控制并发数，避免被封）
3. 解析响应，提取标准化数据
4. 去重处理（基于 URL 或标题相似度）
5. 存入待处理队列

### 5.2 数据标准化

从各平台抓取的数据统一为以下格式：

```typescript
interface RawNewsItem {
  sourceId: string // 数据源 ID
  platform: string // 平台标识
  title: string // 标题
  url: string // 原文链接
  description?: string // 摘要/描述
  author?: string // 作者
  publishedAt?: Date // 发布时间
  fetchedAt: Date // 抓取时间
  hotScore?: number // 平台热度分
  metadata?: Record<string, any> // 平台特有数据
}
```

### 5.3 AI 处理

**处理时机**：数据抓取后立即进入 AI 处理队列

**处理内容**：

1. **分类**：AI 根据标题和元信息自动归类
   - 分类由 AI 动态生成，系统记录所有出现过的分类
   - 管理员可查看、合并、重命名分类
   - 分类数量不设上限，由 AI 根据内容决定

2. **评分**：AI 综合评估信息价值（0-100 分）
   - 评分维度：信息密度、时效性、独特性、可信度、实用性
   - 评分直接决定内容在列表中的排序

3. **摘要**：AI 生成一句话摘要（可选）

**AI 处理后的数据**：

```typescript
interface ProcessedNewsItem extends RawNewsItem {
  id: string // 唯一 ID
  categories: string[] // AI 分类标签
  aiScore: number // AI 评分 (0-100)
  aiSummary?: string // AI 摘要
  processedAt: Date // 处理时间
  status: 'pending' | 'processed' | 'failed' // 处理状态
}
```

### 5.4 去重策略

- **URL 去重**：相同 URL 直接跳过
- **标题去重**：标题相似度 > 85% 视为重复（基于编辑距离）
- **跨平台去重**：同一事件在不同平台的报道合并为一条，保留多个来源链接

---

## 6. AI 模型配置

### 6.1 支持的接口格式

采用 OpenAI Chat Completion API 格式，兼容：

- OpenAI（GPT-4o-mini、GPT-4o 等）
- Anthropic Claude（通过 OpenAI 兼容代理）
- 本地模型（Ollama、vLLM、LM Studio 等）
- 其他兼容 OpenAI 格式的服务

### 6.2 配置项

```typescript
interface AIConfig {
  provider: string // 提供商标识（用于展示）
  apiKey: string // API Key
  baseUrl: string // API 基础地址
  model: string // 模型名称
  maxTokens: number // 最大 Token 数
  temperature: number // 温度参数
  enabled: boolean // 是否启用
}
```

### 6.3 Prompt 模板

**分类 Prompt**：

```
请根据以下新闻标题和摘要，为其分配 1-3 个分类标签。
分类应该是中文，简洁明了，如：AI、前端开发、创业融资、开源项目等。

标题：{title}
摘要：{description}
平台：{platform}

请以 JSON 格式返回：{"categories": ["分类1", "分类2"]}
```

**评分 Prompt**：

```
请对以下新闻进行信息价值评分（0-100 分）。
评分维度：信息密度、时效性、独特性、可信度、实用性。
90-100：极高价值，必读
70-89：高价值，推荐阅读
50-69：中等价值，可选阅读
0-49：低价值，可跳过

标题：{title}
摘要：{description}
平台：{platform}
热度：{hotScore}

请以 JSON 格式返回：{"score": 85, "reason": "评分理由"}
```

---

## 7. 前端功能

### 7.1 首页（信息流）

**布局**：

- 顶部：导航栏 + 搜索框 + 分类筛选
- 主体：信息流列表
- 侧边：分类标签云 + 平台筛选（可折叠）

**信息流**：

- 默认按 AI 评分降序排列
- 支持按时间排序
- 支持按平台筛选
- 支持按分类筛选
- 分页加载（每页 20 条）

**卡片展示**：

- 标题（点击跳转原文）
- AI 摘要（一句话）
- 分类标签
- AI 评分（可视化展示）
- 来源平台图标
- 发布时间
- 收藏按钮

### 7.2 搜索

- 全文搜索（标题 + 摘要）
- 支持按分类、平台、时间范围筛选
- 搜索结果高亮关键词

### 7.3 收藏页

- 收藏列表（按收藏时间排序）
- 取消收藏
- 收藏分类筛选

### 7.4 个人中心

- 修改密码
- 收藏统计

### 7.5 管理后台

**数据源管理**：

- 数据源列表（名称、类型、状态、上次抓取时间）
- 添加/编辑/删除数据源
- 启用/禁用数据源
- 手动触发抓取
- 测试连通性

**用户管理**：

- 用户列表（用户名、邮箱、角色、注册时间、状态）
- 创建管理员账号
- 禁用/启用用户
- 重置用户密码
- 邀请码管理（查看、修改、开关注册）

**内容管理**：

- 内容列表（标题、来源、分类、评分、状态）
- 查看详情
- 手动编辑分类
- 删除内容
- 批量操作

**系统配置**：

- AI 模型配置（API Key、Base URL、模型名称、参数）
- 抓取频率配置
- 注册开关
- 邀请码管理

**数据统计**：

- 数据源抓取统计（成功/失败次数、条数）
- 内容分类分布（饼图）
- 每日新增内容趋势（折线图）
- 平台内容分布（柱状图）
- AI 评分分布（直方图）

**日志查看**：

- 抓取日志（时间、数据源、状态、耗时、条数）
- AI 处理日志（时间、内容ID、状态、耗时）
- 错误日志（时间、类型、详情）
- 支持按时间、类型筛选

---

## 8. 数据库设计

### 8.1 核心表

**users** — 用户表

```sql
- id: 主键
- username: 用户名
- email: 邮箱（唯一）
- password_hash: 密码哈希
- role: 角色 (admin/user)
- status: 状态 (active/disabled)
- created_at: 创建时间
- updated_at: 更新时间
```

**data_sources** — 数据源表

```sql
- id: 主键
- name: 名称
- type: 类型 (rest/rss/html)
- url: 地址
- method: 请求方法
- headers: 请求头（JSON）
- body: 请求体
- parser: 解析器标识
- enabled: 是否启用
- fetch_interval: 抓取间隔（分钟）
- last_fetch_at: 上次抓取时间
- last_error: 上次错误信息
- description: 描述
- created_at: 创建时间
- updated_at: 更新时间
```

**news_items** — 新闻条目表

```sql
- id: 主键
- source_id: 数据源ID（外键）
- platform: 平台标识
- title: 标题
- url: 原文链接（唯一）
- description: 摘要
- author: 作者
- published_at: 发布时间
- fetched_at: 抓取时间
- hot_score: 平台热度分
- metadata: 元数据（JSON）
- categories: 分类（JSON数组）
- ai_score: AI评分
- ai_summary: AI摘要
- processed_at: 处理时间
- status: 状态 (pending/processed/failed)
- created_at: 创建时间
```

**favorites** — 收藏表

```sql
- id: 主键
- user_id: 用户ID（外键）
- news_item_id: 新闻ID（外键）
- created_at: 收藏时间
- UNIQUE(user_id, news_item_id)
```

**categories** — 分类表

```sql
- id: 主键
- name: 分类名称（唯一）
- count: 关联内容数量
- created_at: 创建时间
- updated_at: 更新时间
```

**fetch_logs** — 抓取日志表

```sql
- id: 主键
- source_id: 数据源ID（外键）
- status: 状态 (success/failed)
- duration: 耗时（毫秒）
- count: 抓取条数
- error: 错误信息
- created_at: 创建时间
```

**ai_logs** — AI处理日志表

```sql
- id: 主键
- news_item_id: 新闻ID（外键）
- status: 状态 (success/failed)
- duration: 耗时（毫秒）
- tokens_used: Token消耗
- error: 错误信息
- created_at: 创建时间
```

**system_config** — 系统配置表

```sql
- key: 配置键（主键）
- value: 配置值（JSON）
- updated_at: 更新时间
```

---

## 9. API 设计

### 9.1 认证接口

| 方法 | 路径                 | 说明             |
| ---- | -------------------- | ---------------- |
| POST | `/api/auth/register` | 用户注册         |
| POST | `/api/auth/login`    | 用户登录         |
| POST | `/api/auth/logout`   | 退出登录         |
| GET  | `/api/auth/me`       | 获取当前用户信息 |

### 9.2 内容接口

| 方法 | 路径               | 说明                             |
| ---- | ------------------ | -------------------------------- |
| GET  | `/api/news`        | 获取新闻列表（分页、筛选、排序） |
| GET  | `/api/news/:id`    | 获取新闻详情                     |
| GET  | `/api/news/search` | 搜索新闻                         |
| GET  | `/api/categories`  | 获取所有分类                     |
| GET  | `/api/platforms`   | 获取所有平台                     |

### 9.3 收藏接口

| 方法   | 路径                     | 说明         |
| ------ | ------------------------ | ------------ |
| GET    | `/api/favorites`         | 获取收藏列表 |
| POST   | `/api/favorites/:newsId` | 添加收藏     |
| DELETE | `/api/favorites/:newsId` | 取消收藏     |

### 9.4 管理员接口

**数据源管理**：

| 方法   | 路径                           | 说明           |
| ------ | ------------------------------ | -------------- |
| GET    | `/api/admin/sources`           | 获取数据源列表 |
| POST   | `/api/admin/sources`           | 创建数据源     |
| PUT    | `/api/admin/sources/:id`       | 更新数据源     |
| DELETE | `/api/admin/sources/:id`       | 删除数据源     |
| POST   | `/api/admin/sources/:id/fetch` | 手动触发抓取   |
| POST   | `/api/admin/sources/:id/test`  | 测试连通性     |

**用户管理**：

| 方法   | 路径                                  | 说明         |
| ------ | ------------------------------------- | ------------ |
| GET    | `/api/admin/users`                    | 获取用户列表 |
| POST   | `/api/admin/users`                    | 创建用户     |
| PUT    | `/api/admin/users/:id`                | 更新用户     |
| DELETE | `/api/admin/users/:id`                | 删除用户     |
| PUT    | `/api/admin/users/:id/reset-password` | 重置密码     |

**内容管理**：

| 方法   | 路径                           | 说明                     |
| ------ | ------------------------------ | ------------------------ |
| GET    | `/api/admin/news`              | 获取内容列表（含未处理） |
| PUT    | `/api/admin/news/:id`          | 更新内容（分类等）       |
| DELETE | `/api/admin/news/:id`          | 删除内容                 |
| POST   | `/api/admin/news/batch-delete` | 批量删除                 |

**系统配置**：

| 方法 | 路径                | 说明         |
| ---- | ------------------- | ------------ |
| GET  | `/api/admin/config` | 获取系统配置 |
| PUT  | `/api/admin/config` | 更新系统配置 |

**统计与日志**：

| 方法 | 路径                    | 说明           |
| ---- | ----------------------- | -------------- |
| GET  | `/api/admin/stats`      | 获取统计数据   |
| GET  | `/api/admin/logs/fetch` | 获取抓取日志   |
| GET  | `/api/admin/logs/ai`    | 获取AI处理日志 |
| GET  | `/api/admin/logs/error` | 获取错误日志   |

---

## 10. 技术架构

### 10.1 整体架构

```
┌─────────────────┐     ┌─────────────────┐
│   Frontend      │     │   Backend       │
│   React + Vite  │────▶│   Fastify       │
│   Tailwind CSS  │     │   Node.js       │
│   Shadcn/ui     │     │                 │
└─────────────────┘     └────────┬────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
              ┌─────▼─────┐ ┌───▼───┐ ┌─────▼─────┐
              │  SQLite   │ │  AI   │ │  Scheduler │
              │  Drizzle  │ │ Service│ │  (定时任务) │
              └───────────┘ └───────┘ └───────────┘
```

### 10.2 目录结构

```
ai-hot-news-hub/
├── frontend/              # 前端项目
│   ├── src/
│   │   ├── components/    # UI 组件
│   │   ├── pages/         # 页面组件
│   │   ├── hooks/         # 自定义 hooks
│   │   ├── lib/           # 工具函数
│   │   ├── stores/        # Zustand 状态
│   │   ├── services/      # API 调用
│   │   ├── types/         # TypeScript 类型
│   │   └── i18n/          # 国际化配置
│   └── ...
├── backend/               # 后端项目
│   ├── src/
│   │   ├── routes/        # API 路由
│   │   ├── services/      # 业务逻辑
│   │   ├── db/            # 数据库相关
│   │   ├── fetchers/      # 数据抓取器
│   │   ├── parsers/       # 内容解析器
│   │   ├── ai/            # AI 处理
│   │   ├── scheduler/     # 定时任务
│   │   └── utils/         # 工具函数
│   ├── drizzle/           # 数据库迁移
│   └── ...
├── docs/                  # 文档
├── docker-compose.yml     # Docker 编排
└── Dockerfile             # Docker 镜像
```

### 10.3 技术栈汇总

| 层级     | 技术                    |
| -------- | ----------------------- |
| 前端框架 | React 19 + TypeScript 6 |
| 构建工具 | Vite 8                  |
| 样式     | Tailwind CSS 4          |
| UI 组件  | Shadcn/ui               |
| 状态管理 | Zustand                 |
| 路由     | React Router v7         |
| 数据请求 | TanStack Query + Fetch  |
| 图表     | ECharts                 |
| 后端框架 | Fastify                 |
| 数据库   | SQLite + Drizzle ORM    |
| AI 接口  | OpenAI 兼容格式         |
| 定时任务 | node-cron               |
| 容器化   | Docker                  |

---

## 11. 非功能需求

### 11.1 性能

- 首页加载时间 < 2 秒
- API 响应时间 < 500ms（不含 AI 处理）
- 支持 100+ 并发用户

### 11.2 可靠性

- 数据抓取失败自动重试（最多 3 次）
- AI 处理失败自动重试（最多 2 次）
- 错误日志记录，便于排查

### 11.3 安全

- 密码使用 bcrypt 加密存储
- API 接口鉴权（JWT）
- 管理员接口权限校验
- SQL 注入防护（Drizzle ORM 参数化查询）
- XSS 防护（前端转义）

### 11.4 可扩展性

- 数据源支持插件化扩展
- AI 模型可配置切换
- 分类动态生成，无需预设

---

## 12. 开发计划

### Phase 1：核心功能（MVP）

- [ ] 后端项目初始化（Fastify + Drizzle）
- [ ] 数据库 schema 设计与迁移
- [ ] 用户认证（注册/登录/JWT）
- [ ] 数据源管理（CRUD）
- [ ] 数据抓取服务（REST API 类型）
- [ ] RSS 抓取服务
- [ ] HTML 解析服务
- [ ] AI 处理服务（分类 + 评分）
- [ ] 定时任务调度
- [ ] 前端首页信息流
- [ ] 分类筛选与排序
- [ ] 搜索功能
- [ ] 收藏功能
- [ ] 管理后台（数据源、用户、内容）
- [ ] Docker 部署

### Phase 2：增强功能

- [ ] 系统配置页面（AI 模型、抓取频率）
- [ ] 数据统计页面（ECharts 图表）
- [ ] 日志查看页面
- [ ] 邀请码管理
- [ ] 注册开关
- [ ] 内容详情页
- [ ] 分类管理（合并、重命名）

### Phase 3：优化与扩展

- [ ] 性能优化（缓存、分页优化）
- [ ] 更多数据源支持
- [ ] AI 摘要生成
- [ ] 内容去重优化
- [ ] 移动端适配
- [ ] 国际化

---

## 附录

### A. 术语表

| 术语    | 说明                              |
| ------- | --------------------------------- |
| 数据源  | 提供新闻/热点的平台 API 或订阅源  |
| AI 评分 | AI 对信息价值的综合评分（0-100）  |
| AI 分类 | AI 根据内容自动分配的分类标签     |
| 抓取    | 从数据源获取数据的过程            |
| 处理    | AI 对原始数据进行分类和评分的过程 |

### B. 相关文档

- `docs/public-api-doc.md` — 已测试的公开 API 文档
