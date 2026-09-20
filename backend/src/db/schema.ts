import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// 用户表
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

// 数据源表
export const dataSources = sqliteTable('data_sources', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type', { enum: ['rest', 'rss', 'html'] }).notNull(),
  url: text('url').notNull(),
  method: text('method', { enum: ['GET', 'POST'] }).default('GET'),
  headers: text('headers'), // JSON string
  body: text('body'),
  parser: text('parser'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  fetchInterval: integer('fetch_interval').notNull().default(30), // 分钟
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

// 新闻条目表
export const newsItems = sqliteTable('news_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sourceId: integer('source_id').references(() => dataSources.id),
  platform: text('platform').notNull(),
  title: text('title').notNull(),
  url: text('url').notNull().unique(),
  description: text('description'),
  author: text('author'),
  publishedAt: integer('published_at', { mode: 'timestamp' }),
  fetchedAt: integer('fetched_at', { mode: 'timestamp' }).notNull(),
  hotScore: real('hot_score'),
  metadata: text('metadata'), // JSON string
  categories: text('categories'), // JSON array string
  aiScore: real('ai_score'),
  aiSummary: text('ai_summary'),
  processedAt: integer('processed_at', { mode: 'timestamp' }),
  status: text('status', { enum: ['pending', 'processing', 'processed', 'failed'] })
    .notNull()
    .default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

// 收藏表
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

// 分类表
export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  count: integer('count').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

// 抓取日志表
export const fetchLogs = sqliteTable('fetch_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sourceId: integer('source_id')
    .notNull()
    .references(() => dataSources.id),
  status: text('status', { enum: ['success', 'failed'] }).notNull(),
  duration: integer('duration').notNull(), // 毫秒
  count: integer('count').notNull().default(0),
  error: text('error'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

// AI 处理日志表
export const aiLogs = sqliteTable('ai_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  newsItemId: integer('news_item_id')
    .notNull()
    .references(() => newsItems.id),
  status: text('status', { enum: ['success', 'failed'] }).notNull(),
  duration: integer('duration').notNull(), // 毫秒
  tokensUsed: integer('tokens_used'),
  error: text('error'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

// 系统配置表
export const systemConfig = sqliteTable('system_config', {
  key: text('key').primaryKey(),
  value: text('value').notNull(), // JSON string
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})
