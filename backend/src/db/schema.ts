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
  nickname: text('nickname'),
  avatar: text('avatar'), // DiceBear 配置，格式 "style:seed"
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
  sourceType: text('source_type', { enum: ['rss', 'api', 'topic'] })
    .notNull()
    .default('api'),
  url: text('url').notNull(),
  method: text('method', { enum: ['GET', 'POST'] }).default('GET'),
  headers: text('headers'), // JSON string
  body: text('body'),
  parser: text('parser'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
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
  /** RSS 源关联 data_sources.id；内置 API 源为 null */
  sourceId: integer('source_id').references(() => dataSources.id),
  /** 内置 API 源关联 api-sources.ts 的 code；RSS 为 null */
  sourceCode: text('source_code'),
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
  topicId: integer('topic_id'), // 预留：关联话题表
  status: text('status', { enum: ['pending', 'processed', 'failed'] })
    .notNull()
    .default('processed'),
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

// 社区帖子表（众声喧哗）
export const communityPosts = sqliteTable('community_posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  title: text('title').notNull(),
  content: text('content').notNull(),
  likeCount: integer('like_count').notNull().default(0),
  commentCount: integer('comment_count').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

// 社区评论表（支持单层回复：parentCommentId 指向顶楼）
export const communityComments = sqliteTable('community_comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  postId: integer('post_id')
    .notNull()
    .references(() => communityPosts.id),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  parentCommentId: integer('parent_comment_id'),
  content: text('content').notNull(),
  likeCount: integer('like_count').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

// 社区点赞表（帖子 / 评论 / 动态 / 动态评论通用，用户防重）
export const communityLikes = sqliteTable('community_likes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  targetType: text('target_type', {
    enum: ['post', 'comment', 'moment', 'moment_comment'],
  }).notNull(),
  targetId: integer('target_id').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

// 瓜田电波动态表（短动态，时间流）
export const communityMoments = sqliteTable('community_moments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  content: text('content').notNull(),
  images: text('images'), // JSON.stringify(ImageRef[])
  likeCount: integer('like_count').notNull().default(0),
  commentCount: integer('comment_count').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

// 动态评论表（扁平，不嵌套）
export const momentComments = sqliteTable('moment_comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  momentId: integer('moment_id')
    .notNull()
    .references(() => communityMoments.id),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  content: text('content').notNull(),
  likeCount: integer('like_count').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

// 图片资源表（上传即入库，便于清理与鉴权）
export const communityImages = sqliteTable('community_images', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  originalUrl: text('original_url').notNull(),
  thumbUrl: text('thumb_url').notNull(),
  width: integer('width'),
  height: integer('height'),
  bytesOriginal: integer('bytes_original'),
  bytesThumb: integer('bytes_thumb'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

// 话题表（预留，暂不实现）
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

// 抓取日志表（source_id: RSS 源 / source_code: 内置 API 源，二选一）
export const fetchLogs = sqliteTable('fetch_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sourceId: integer('source_id').references(() => dataSources.id, { onDelete: 'cascade' }),
  sourceCode: text('source_code'),
  status: text('status', { enum: ['success', 'failed'] }).notNull(),
  duration: integer('duration').notNull(), // 毫秒
  count: integer('count').notNull().default(0),
  error: text('error'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

// 内置 API 源运行状态表（配置在 fetchers/api-sources.ts，DB 只存状态）
export const sourceStates = sqliteTable('source_states', {
  code: text('code').primaryKey(), // 对应 ApiSourceDef.code
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  lastFetchAt: integer('last_fetch_at', { mode: 'timestamp' }),
  lastError: text('last_error'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
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

// 错误告警表（source_id: RSS 源 / source_code: 内置 API 源）
export const errorAlerts = sqliteTable('error_alerts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sourceId: integer('source_id').references(() => dataSources.id, { onDelete: 'cascade' }),
  sourceCode: text('source_code'),
  alertType: text('alert_type', { enum: ['consecutive_failures', 'error_spike'] }).notNull(),
  message: text('message').notNull(),
  details: text('details'), // JSON string
  resolved: integer('resolved', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  resolvedAt: integer('resolved_at', { mode: 'timestamp' }),
})

// 操作日志审计表
export const operationLogs = sqliteTable('operation_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id),
  username: text('username'),
  action: text('action').notNull(), // e.g. 'create', 'update', 'delete'
  resource: text('resource').notNull(), // e.g. 'source', 'user', 'content', 'config'
  resourceId: text('resource_id'),
  details: text('details'), // JSON string
  ipAddress: text('ip_address'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})
