# AI Hot News Hub — 数据库设计文档

> 版本：v1.0
> 最后更新：2026-09-20

---

## 1. 数据库概述

### 1.1 数据库选型

| 项目     | 说明                           |
| -------- | ------------------------------ |
| 数据库   | SQLite                         |
| ORM      | Drizzle ORM                    |
| 驱动     | better-sqlite3                 |
| 存储位置 | `backend/data/database.sqlite` |

### 1.2 设计原则

- **简单高效**：SQLite 适合单机部署，无需额外服务
- **类型安全**：使用 Drizzle ORM 提供 TypeScript 类型支持
- **性能优化**：合理使用索引和 WAL 模式
- **数据完整性**：使用外键约束保证数据一致性

### 1.3 配置优化

```typescript
// 启用 WAL 模式
db.run(sql`PRAGMA journal_mode=WAL`)

// 启用外键约束
db.run(sql`PRAGMA foreign_keys=ON`)
```

---

## 2. 表结构设计

### 2.1 用户表 (users)

**功能描述：**
存储系统用户信息，包括管理员和普通用户。

**表结构：**

| 字段名        | 类型    | 约束                          | 说明                   |
| ------------- | ------- | ----------------------------- | ---------------------- |
| id            | INTEGER | PRIMARY KEY, AUTOINCREMENT    | 用户 ID                |
| username      | TEXT    | NOT NULL, UNIQUE              | 用户名                 |
| email         | TEXT    | NOT NULL, UNIQUE              | 邮箱地址               |
| password_hash | TEXT    | NOT NULL                      | 密码哈希（bcrypt）     |
| role          | TEXT    | NOT NULL, DEFAULT 'user'      | 角色：admin, user      |
| status        | TEXT    | NOT NULL, DEFAULT 'active'    | 状态：active, disabled |
| created_at    | INTEGER | NOT NULL, DEFAULT unixepoch() | 创建时间（时间戳）     |
| updated_at    | INTEGER | NOT NULL, DEFAULT unixepoch() | 更新时间（时间戳）     |

**索引：**

| 索引名                   | 字段     | 说明           |
| ------------------------ | -------- | -------------- |
| sqlite_autoindex_users_1 | id       | 主键索引       |
| sqlite_autoindex_users_2 | username | 用户名唯一索引 |
| sqlite_autoindex_users_3 | email    | 邮箱唯一索引   |

**Drizzle Schema：**

```typescript
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'user'] })
    .notNull()
    .default('user'),
  status: text('status', { enum: ['active', 'disabled'] })
    .notNull()
    .default('active'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})
```

### 2.2 数据源表 (data_sources)

**功能描述：**
存储数据源配置信息，包括 API 地址、抓取方式等。

**表结构：**

| 字段名         | 类型    | 约束                          | 说明                        |
| -------------- | ------- | ----------------------------- | --------------------------- |
| id             | INTEGER | PRIMARY KEY, AUTOINCREMENT    | 数据源 ID                   |
| name           | TEXT    | NOT NULL                      | 数据源名称                  |
| type           | TEXT    | NOT NULL                      | 数据源类型：rest, rss, html |
| source_type    | TEXT    | NOT NULL, DEFAULT 'api'       | 来源类型：rss, api, topic   |
| url            | TEXT    | NOT NULL                      | API/源地址                  |
| method         | TEXT    | DEFAULT 'GET'                 | 请求方法：GET, POST         |
| headers        | TEXT    | -                             | 自定义请求头（JSON 字符串） |
| body           | TEXT    | -                             | POST 请求体                 |
| parser         | TEXT    | -                             | 解析器标识                  |
| enabled        | INTEGER | NOT NULL, DEFAULT 1           | 是否启用：1=启用, 0=禁用    |
| fetch_interval | INTEGER | NOT NULL, DEFAULT 30          | 抓取间隔（分钟）            |
| last_fetch_at  | INTEGER | -                             | 上次抓取时间（时间戳）      |
| last_error     | TEXT    | -                             | 上次错误信息                |
| description    | TEXT    | -                             | 描述                        |
| created_at     | INTEGER | NOT NULL, DEFAULT unixepoch() | 创建时间（时间戳）          |
| updated_at     | INTEGER | NOT NULL, DEFAULT unixepoch() | 更新时间（时间戳）          |

**索引：**

| 索引名                          | 字段 | 说明     |
| ------------------------------- | ---- | -------- |
| sqlite_autoindex_data_sources_1 | id   | 主键索引 |

**Drizzle Schema：**

```typescript
export const dataSources = sqliteTable('data_sources', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type', { enum: ['rest', 'rss', 'html'] }).notNull(),
  sourceType: text('source_type', { enum: ['rss', 'api', 'topic'] })
    .notNull()
    .default('api'),
  url: text('url').notNull(),
  method: text('method', { enum: ['GET', 'POST'] }).default('GET'),
  headers: text('headers'), // JSON string
  body: text('body'),
  parser: text('parser'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  fetchInterval: integer('fetch_interval').notNull().default(30),
  lastFetchAt: integer('last_fetch_at', { mode: 'timestamp' }),
  lastError: text('last_error'),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})
```

### 2.3 新闻条目表 (news_items)

**功能描述：**
存储抓取的新闻条目，包括原始数据和 AI 处理结果。

**表结构：**

| 字段名       | 类型    | 约束                          | 说明                             |
| ------------ | ------- | ----------------------------- | -------------------------------- |
| id           | INTEGER | PRIMARY KEY, AUTOINCREMENT    | 新闻 ID                          |
| source_id    | INTEGER | FOREIGN KEY → data_sources.id | 数据源 ID                        |
| source_type  | TEXT    | NOT NULL, DEFAULT 'api'       | 来源类型：rss, api, topic        |
| platform     | TEXT    | NOT NULL                      | 平台标识（如 zhihu, weibo）      |
| title        | TEXT    | NOT NULL                      | 标题                             |
| url          | TEXT    | NOT NULL, UNIQUE              | 原文链接                         |
| description  | TEXT    | -                             | 摘要/描述                        |
| author       | TEXT    | -                             | 作者                             |
| published_at | INTEGER | -                             | 发布时间（时间戳）               |
| fetched_at   | INTEGER | NOT NULL                      | 抓取时间（时间戳）               |
| hot_score    | REAL    | -                             | 平台热度分                       |
| metadata     | TEXT    | -                             | 元数据（JSON 字符串）            |
| topic_id     | INTEGER | -                             | 预留：关联话题表                 |
| status       | TEXT    | NOT NULL, DEFAULT 'processed' | 状态：pending, processed, failed |
| created_at   | INTEGER | NOT NULL, DEFAULT unixepoch() | 创建时间（时间戳）               |

**索引：**

| 索引名                        | 字段       | 说明           |
| ----------------------------- | ---------- | -------------- |
| sqlite_autoindex_news_items_1 | id         | 主键索引       |
| sqlite_autoindex_news_items_2 | url        | URL 唯一索引   |
| idx_news_items_source_id      | source_id  | 数据源 ID 索引 |
| idx_news_items_platform       | platform   | 平台索引       |
| idx_news_items_status         | status     | 状态索引       |
| idx_news_items_fetched_at     | fetched_at | 抓取时间索引   |

**Drizzle Schema：**

```typescript
export const newsItems = sqliteTable('news_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sourceId: integer('source_id').references(() => dataSources.id),
  sourceType: text('source_type', { enum: ['rss', 'api', 'topic'] })
    .notNull()
    .default('api'),
  platform: text('platform').notNull(),
  title: text('title').notNull(),
  url: text('url').notNull().unique(),
  description: text('description'),
  author: text('author'),
  publishedAt: integer('published_at', { mode: 'timestamp' }),
  fetchedAt: integer('fetched_at', { mode: 'timestamp' }).notNull(),
  hotScore: real('hot_score'),
  metadata: text('metadata'), // JSON string
  topicId: integer('topic_id'),
  status: text('status', { enum: ['pending', 'processed', 'failed'] })
    .notNull()
    .default('processed'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})
```

### 2.4 收藏表 (favorites)

**功能描述：**
存储用户的收藏记录。

**表结构：**

| 字段名       | 类型    | 约束                                  | 说明               |
| ------------ | ------- | ------------------------------------- | ------------------ |
| id           | INTEGER | PRIMARY KEY, AUTOINCREMENT            | 收藏 ID            |
| user_id      | INTEGER | NOT NULL, FOREIGN KEY → users.id      | 用户 ID            |
| news_item_id | INTEGER | NOT NULL, FOREIGN KEY → news_items.id | 新闻 ID            |
| created_at   | INTEGER | NOT NULL, DEFAULT unixepoch()         | 收藏时间（时间戳） |

**约束：**

| 约束名                       | 类型        | 字段                  | 说明              |
| ---------------------------- | ----------- | --------------------- | ----------------- |
| sqlite_autoindex_favorites_1 | PRIMARY KEY | id                    | 主键              |
| sqlite_autoindex_favorites_2 | UNIQUE      | user_id, news_item_id | 用户+新闻唯一约束 |

**索引：**

| 索引名                       | 字段                  | 说明         |
| ---------------------------- | --------------------- | ------------ |
| sqlite_autoindex_favorites_1 | id                    | 主键索引     |
| sqlite_autoindex_favorites_2 | user_id, news_item_id | 唯一索引     |
| idx_favorites_user_id        | user_id               | 用户 ID 索引 |

**Drizzle Schema：**

```typescript
export const favorites = sqliteTable('favorites', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  newsItemId: integer('news_item_id')
    .notNull()
    .references(() => newsItems.id),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})
```

### 2.5 话题表 (topics)

**功能描述：**
预留的话题表，用于未来的话题搜索功能。

**表结构：**

| 字段名         | 类型    | 约束                          | 说明                   |
| -------------- | ------- | ----------------------------- | ---------------------- |
| id             | INTEGER | PRIMARY KEY, AUTOINCREMENT    | 话题 ID                |
| name           | TEXT    | NOT NULL, UNIQUE              | 话题名称               |
| description    | TEXT    | -                             | 描述                   |
| search_queries | TEXT    | -                             | 搜索查询（JSON 数组）  |
| enabled        | INTEGER | NOT NULL, DEFAULT 1           | 是否启用               |
| last_fetch_at  | INTEGER | -                             | 上次抓取时间（时间戳） |
| created_at     | INTEGER | NOT NULL, DEFAULT unixepoch() | 创建时间（时间戳）     |
| updated_at     | INTEGER | NOT NULL, DEFAULT unixepoch() | 更新时间（时间戳）     |

**索引：**

| 索引名                    | 字段 | 说明         |
| ------------------------- | ---- | ------------ |
| sqlite_autoindex_topics_1 | id   | 主键索引     |
| sqlite_autoindex_topics_2 | name | 名称唯一索引 |

**Drizzle Schema：**

```typescript
export const topics = sqliteTable('topics', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  description: text('description'),
  searchQueries: text('search_queries'), // JSON array of search queries
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  lastFetchAt: integer('last_fetch_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})
```

### 2.6 抓取日志表 (fetch_logs)

**功能描述：**
记录数据源抓取的成功/失败日志。

**表结构：**

| 字段名     | 类型    | 约束                                    | 说明                  |
| ---------- | ------- | --------------------------------------- | --------------------- |
| id         | INTEGER | PRIMARY KEY, AUTOINCREMENT              | 日志 ID               |
| source_id  | INTEGER | NOT NULL, FOREIGN KEY → data_sources.id | 数据源 ID             |
| status     | TEXT    | NOT NULL                                | 状态：success, failed |
| duration   | INTEGER | NOT NULL                                | 耗时（毫秒）          |
| count      | INTEGER | NOT NULL, DEFAULT 0                     | 抓取条数              |
| error      | TEXT    | -                                       | 错误信息              |
| created_at | INTEGER | NOT NULL, DEFAULT unixepoch()           | 创建时间（时间戳）    |

**索引：**

| 索引名                        | 字段       | 说明           |
| ----------------------------- | ---------- | -------------- |
| sqlite_autoindex_fetch_logs_1 | id         | 主键索引       |
| idx_fetch_logs_source_id      | source_id  | 数据源 ID 索引 |
| idx_fetch_logs_created_at     | created_at | 创建时间索引   |

**Drizzle Schema：**

```typescript
export const fetchLogs = sqliteTable('fetch_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sourceId: integer('source_id')
    .notNull()
    .references(() => dataSources.id),
  status: text('status', { enum: ['success', 'failed'] }).notNull(),
  duration: integer('duration').notNull(),
  count: integer('count').notNull().default(0),
  error: text('error'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})
```

### 2.7 AI 处理日志表 (ai_logs)

**功能描述：**
记录 AI 处理的成功/失败日志。

**表结构：**

| 字段名       | 类型    | 约束                                  | 说明                  |
| ------------ | ------- | ------------------------------------- | --------------------- |
| id           | INTEGER | PRIMARY KEY, AUTOINCREMENT            | 日志 ID               |
| news_item_id | INTEGER | NOT NULL, FOREIGN KEY → news_items.id | 新闻 ID               |
| status       | TEXT    | NOT NULL                              | 状态：success, failed |
| duration     | INTEGER | NOT NULL                              | 耗时（毫秒）          |
| tokens_used  | INTEGER | -                                     | Token 消耗            |
| error        | TEXT    | -                                     | 错误信息              |
| created_at   | INTEGER | NOT NULL, DEFAULT unixepoch()         | 创建时间（时间戳）    |

**索引：**

| 索引名                     | 字段         | 说明         |
| -------------------------- | ------------ | ------------ |
| sqlite_autoindex_ai_logs_1 | id           | 主键索引     |
| idx_ai_logs_news_item_id   | news_item_id | 新闻 ID 索引 |
| idx_ai_logs_created_at     | created_at   | 创建时间索引 |

**Drizzle Schema：**

```typescript
export const aiLogs = sqliteTable('ai_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  newsItemId: integer('news_item_id')
    .notNull()
    .references(() => newsItems.id),
  status: text('status', { enum: ['success', 'failed'] }).notNull(),
  duration: integer('duration').notNull(),
  tokensUsed: integer('tokens_used'),
  error: text('error'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})
```

### 2.8 系统配置表 (system_config)

**功能描述：**
存储系统全局配置项。

**表结构：**

| 字段名     | 类型    | 约束                          | 说明                  |
| ---------- | ------- | ----------------------------- | --------------------- |
| key        | TEXT    | PRIMARY KEY                   | 配置键                |
| value      | TEXT    | NOT NULL                      | 配置值（JSON 字符串） |
| updated_at | INTEGER | NOT NULL, DEFAULT unixepoch() | 更新时间（时间戳）    |

**索引：**

| 索引名                           | 字段 | 说明     |
| -------------------------------- | ---- | -------- |
| sqlite_autoindex_system_config_1 | key  | 主键索引 |

**Drizzle Schema：**

```typescript
export const systemConfig = sqliteTable('system_config', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})
```

**预置配置项：**

| 配置键               | 说明             | 默认值 |
| -------------------- | ---------------- | ------ |
| invite_code          | 注册邀请码       | ''     |
| registration_enabled | 注册开关         | true   |
| fetch_interval       | 抓取间隔（分钟） | 30     |
| auto_fetch_enabled   | 自动抓取开关     | false  |
| ai_api_key           | AI API 密钥      | ''     |
| ai_base_url          | AI API 基础地址  | ''     |
| ai_model             | AI 模型名称      | ''     |

---

## 3. 表关系设计

### 3.1 ER 图

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    ER 图                                             │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   users     │       │   favorites │       │ news_items  │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │◀──┐   │ id (PK)     │   ┌──▶│ id (PK)     │
│ username    │   └───│ user_id(FK) │   │   │ source_id(FK)│──┐
│ email       │       │ news_item_id│───┘   │ platform    │  │
│ password_hash│      │ created_at  │       │ title       │  │
│ role        │       └─────────────┘       │ url         │  │
│ status      │                             │ description │  │
│ created_at  │                             │ ...         │  │
│ updated_at  │                             └─────────────┘  │
└─────────────┘                                    │         │
                                                   │         │
                                                   │         │
┌─────────────┐       ┌─────────────┐       ┌──────┴───────┐
│ categories  │       │  ai_logs    │       │ data_sources │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)     │       │ id (PK)     │◀─┘
│ name        │       │ news_item_id│──┐    │ name        │
│ count       │       │ status      │  │    │ type        │
│ created_at  │       │ duration    │  │    │ url         │
│ updated_at  │       │ tokens_used │  │    │ ...         │
└─────────────┘       │ error       │  │    └─────────────┘
                      │ created_at  │  │           │
                      └─────────────┘  │           │
                              │        │           │
                              │        │           │
                              ▼        ▼           ▼
                      ┌─────────────┐       ┌─────────────┐
                      │  ai_logs    │       │ fetch_logs  │
                      │  (续)       │       ├─────────────┤
                      └─────────────┘       │ id (PK)     │
                                            │ source_id(FK)│
                                            │ status      │
                                            │ duration    │
                                            │ count       │
                                            │ error       │
                                            │ created_at  │
                                            └─────────────┘
```

### 3.2 外键关系

| 表名       | 字段         | 引用表       | 引用字段 | 删除策略 |
| ---------- | ------------ | ------------ | -------- | -------- |
| favorites  | user_id      | users        | id       | CASCADE  |
| favorites  | news_item_id | news_items   | id       | CASCADE  |
| news_items | source_id    | data_sources | id       | SET NULL |
| fetch_logs | source_id    | data_sources | id       | CASCADE  |
| ai_logs    | news_item_id | news_items   | id       | CASCADE  |

---

## 4. 数据字典

### 4.1 枚举值定义

#### 角色 (role)

| 值    | 说明     |
| ----- | -------- |
| admin | 管理员   |
| user  | 普通用户 |

#### 用户状态 (status)

| 值       | 说明 |
| -------- | ---- |
| active   | 活跃 |
| disabled | 禁用 |

#### 数据源类型 (type)

| 值   | 说明            |
| ---- | --------------- |
| rest | REST API        |
| rss  | RSS/Atom 订阅源 |
| html | HTML 页面       |

#### 来源类型 (source_type)

| 值    | 说明       |
| ----- | ---------- |
| api   | API 接口   |
| rss   | RSS 订阅源 |
| topic | 话题搜索   |

#### 请求方法 (method)

| 值   | 说明      |
| ---- | --------- |
| GET  | GET 请求  |
| POST | POST 请求 |

#### 新闻状态 (status)

| 值        | 说明     |
| --------- | -------- |
| pending   | 待处理   |
| processed | 已处理   |
| failed    | 处理失败 |

#### 日志状态 (status)

| 值      | 说明 |
| ------- | ---- |
| success | 成功 |
| failed  | 失败 |

### 4.2 JSON 字段格式

#### headers (请求头)

```json
{
  "User-Agent": "Mozilla/5.0 ...",
  "Referer": "https://example.com"
}
```

#### metadata (元数据)

```json
{
  "language": "JavaScript",
  "cover": "https://example.com/cover.jpg",
  "label": "热门"
}
```

#### search_queries (搜索查询)

```json
["AI 人工智能", "机器学习", "深度学习"]
```

#### value (系统配置值)

```json
"abc123"  // 字符串
true      // 布尔值
30        // 数字
```

---

## 5. 索引设计

### 5.1 主键索引

所有表都有自增主键 `id`，自动创建主键索引。

### 5.2 唯一索引

| 表名          | 字段                  | 说明          |
| ------------- | --------------------- | ------------- |
| users         | username              | 用户名唯一    |
| users         | email                 | 邮箱唯一      |
| news_items    | url                   | URL 唯一      |
| favorites     | user_id, news_item_id | 用户+新闻唯一 |
| topics        | name                  | 话题名称唯一  |
| system_config | key                   | 配置键唯一    |

### 5.3 普通索引

| 表名       | 字段         | 说明      |
| ---------- | ------------ | --------- |
| news_items | source_id    | 数据源 ID |
| news_items | platform     | 平台      |
| news_items | status       | 状态      |
| news_items | fetched_at   | 抓取时间  |
| favorites  | user_id      | 用户 ID   |
| fetch_logs | source_id    | 数据源 ID |
| fetch_logs | created_at   | 创建时间  |
| ai_logs    | news_item_id | 新闻 ID   |
| ai_logs    | created_at   | 创建时间  |

---

## 6. 数据迁移

### 6.1 Schema 推送

使用 Drizzle Kit 推送 schema 到数据库：

```bash
cd backend
npm run db:push
```

### 6.2 数据初始化

运行种子脚本初始化默认数据：

```bash
cd backend
npm run db:seed
```

**初始化内容：**

- 默认管理员账号（admin@example.com / admin123）
- 预置数据源配置
- 默认系统配置

---

## 7. 性能优化

### 7.1 WAL 模式

启用 WAL（Write-Ahead Logging）模式提高并发性能：

```sql
PRAGMA journal_mode=WAL;
```

**优势：**

- 读写可以并发执行
- 写操作不会阻塞读操作
- 提高多用户并发访问性能

### 7.2 查询优化

**分页查询：**

```typescript
const items = await db
  .select()
  .from(newsItems)
  .where(eq(newsItems.status, 'processed'))
  .orderBy(desc(newsItems.fetchedAt))
  .limit(pageSize)
  .offset(offset)
```

**索引使用：**

- 在 `WHERE` 条件字段上创建索引
- 在 `ORDER BY` 字段上创建索引
- 在 `JOIN` 字段上创建索引

### 7.3 连接池

SQLite 是文件数据库，不需要传统连接池。使用 better-sqlite3 的同步 API，每次请求创建新的连接。

---

## 8. 备份与恢复

### 8.1 备份策略

**手动备份：**

```bash
# 复制数据库文件
cp backend/data/database.sqlite backend/data/database.sqlite.backup
```

**自动备份：**

可以设置定时任务自动备份数据库文件。

### 8.2 恢复策略

**恢复备份：**

```bash
# 停止服务
# 恢复数据库文件
cp backend/data/database.sqlite.backup backend/data/database.sqlite
# 启动服务
```

---

## 附录

### A. 完整 Schema 文件

完整的 Drizzle Schema 定义位于 `backend/src/db/schema.ts`。

### B. 相关文档

- `docs/PRD.md` — 产品需求文档
- `docs/plan.md` — 开发计划
- `docs/public-api-doc.md` — 公开 API 文档
- `docs/uml-modeling.md` — UML 建模文档
- `docs/module-description.md` — 模块功能详细描述
- `docs/api-reference.md` — API 接口详细文档
