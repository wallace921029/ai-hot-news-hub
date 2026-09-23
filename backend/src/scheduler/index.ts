import { db } from '../db/index.js'
import {
  dataSources,
  newsItems,
  fetchLogs,
  systemConfig,
  aiLogs,
  errorAlerts,
} from '../db/schema.js'
import { eq, and, inArray, count, sql } from 'drizzle-orm'
import { RestFetcher } from '../fetchers/rest.js'
import { RssFetcher } from '../fetchers/rss.js'
import { HtmlFetcher } from '../fetchers/html.js'
import type { Fetcher, RawNewsItem } from '../fetchers/types.js'
import { checkAndCreateAlerts } from '../services/alerts.js'

// ===== 常量 =====
const TICK_MS = 60_000 // 每分钟一个调度 tick
const CONCURRENCY = 5 // 单轮内数据源分批并发数
const FETCH_ATTEMPTS = 3 // 单源抓取总尝试次数
const RETRY_DELAYS_MS = [3_000, 10_000] // 首次失败后退避
const NEWS_RETENTION_DAYS = 30 // 新闻保留天数（被收藏的永不清）
const LOG_RETENTION_DAYS = 90 // 抓取日志/告警保留天数
const DEFAULT_INTERVAL_MIN = 30 // 默认刷新间隔（分钟）

type Category = 'rss' | 'api'
type InsertStatus = 'pending' | 'processed'

// ===== 状态 =====
let autoFetchEnabled = false
let rssIntervalMins = DEFAULT_INTERVAL_MIN
let apiIntervalMins = DEFAULT_INTERVAL_MIN
const lastRun: Record<Category, number> = { rss: 0, api: 0 }
let roundRunning = false
let cleanupDayKey = ''
let tickTimer: NodeJS.Timeout | null = null

const restFetcher = new RestFetcher()
const rssFetcher = new RssFetcher()
const htmlFetcher = new HtmlFetcher()

function getFetcher(type: string): Fetcher {
  switch (type) {
    case 'rest':
      return restFetcher
    case 'rss':
      return rssFetcher
    case 'html':
      return htmlFetcher
    default:
      throw new Error(`未知的数据源类型: ${type}`)
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// 去重检查
async function isDuplicate(url: string, title: string): Promise<boolean> {
  const existingByUrl = await db.select().from(newsItems).where(eq(newsItems.url, url)).limit(1)
  if (existingByUrl.length > 0) {
    return true
  }

  const existingByTitle = await db
    .select()
    .from(newsItems)
    .where(eq(newsItems.title, title))
    .limit(1)
  if (existingByTitle.length > 0) {
    return true
  }

  return false
}

// 保存新闻条目
async function saveNewsItems(
  items: RawNewsItem[],
  sourceType: 'rss' | 'api' | 'topic' = 'api',
  status: InsertStatus = 'pending'
) {
  let savedCount = 0

  for (const item of items) {
    try {
      const duplicate = await isDuplicate(item.url, item.title)
      if (duplicate) {
        continue
      }

      await db.insert(newsItems).values({
        sourceId: item.sourceId,
        sourceType,
        platform: item.platform,
        title: item.title,
        url: item.url,
        description: item.description,
        author: item.author,
        publishedAt: item.publishedAt,
        fetchedAt: item.fetchedAt,
        hotScore: item.hotScore,
        metadata: item.metadata ? JSON.stringify(item.metadata) : null,
        status,
      })

      savedCount++
    } catch (error) {
      // 忽略单条记录的错误（如 URL 重复）
      console.error(`保存新闻失败: ${item.title}`, error)
    }
  }

  return savedCount
}

// 抓取单个数据源（含重试：总尝试 FETCH_ATTEMPTS 次，退避 RETRY_DELAYS_MS）
export async function fetchSource(
  source: typeof dataSources.$inferSelect,
  opts?: { status?: InsertStatus }
) {
  const startTime = Date.now()
  const insertStatus: InsertStatus = opts?.status ?? 'pending'

  let items: RawNewsItem[] | null = null
  let attempts = 0
  let lastError: unknown = null

  for (let i = 0; i < FETCH_ATTEMPTS; i++) {
    attempts = i + 1
    try {
      const fetcher = getFetcher(source.type)
      const headers = source.headers ? JSON.parse(source.headers) : undefined

      items = await fetcher.fetch({
        id: source.id,
        name: source.name,
        url: source.url,
        method: source.method || undefined,
        headers,
        body: source.body || undefined,
        parser: source.parser || undefined,
      })
      break
    } catch (error) {
      lastError = error
      const message = error instanceof Error ? error.message : '未知错误'
      if (i < FETCH_ATTEMPTS - 1) {
        console.warn(
          `⚠️ 抓取失败（第 ${attempts}/${FETCH_ATTEMPTS} 次）: ${source.name} - ${message}，${RETRY_DELAYS_MS[i] / 1000}s 后重试`
        )
        await sleep(RETRY_DELAYS_MS[i])
      }
    }
  }

  const duration = Date.now() - startTime

  if (items) {
    const savedCount = await saveNewsItems(items, source.sourceType || 'api', insertStatus)

    await db.insert(fetchLogs).values({
      sourceId: source.id,
      status: 'success',
      duration,
      count: savedCount,
    })

    await db
      .update(dataSources)
      .set({
        lastFetchAt: new Date(),
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(dataSources.id, source.id))

    console.log(`✅ 抓取成功: ${source.name} (${savedCount} 条, ${duration}ms)`)
  } else {
    let errorMessage = lastError instanceof Error ? lastError.message : '未知错误'
    if (attempts > 1) {
      errorMessage += `（已尝试${attempts}次）`
    }

    // 只记最终结果一行
    await db.insert(fetchLogs).values({
      sourceId: source.id,
      status: 'failed',
      duration,
      count: 0,
      error: errorMessage,
    })

    await db
      .update(dataSources)
      .set({
        lastError: errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(dataSources.id, source.id))

    console.error(`❌ 抓取失败: ${source.name} - ${errorMessage}`)
  }
}

// 抓取数据源；category 缺省时抓全部（手动"获取全部"）
export async function fetchAllSources(category?: Category) {
  const tag = category ? `[${category.toUpperCase()}] ` : ''
  console.log(`🔄 ${tag}开始抓取数据源...`)

  const conditions = [eq(dataSources.enabled, true)]
  if (category === 'rss') {
    conditions.push(eq(dataSources.type, 'rss'))
  } else if (category === 'api') {
    conditions.push(inArray(dataSources.type, ['rest', 'html']))
  }

  const sources = await db
    .select()
    .from(dataSources)
    .where(and(...conditions))

  const batches: (typeof sources)[] = []
  for (let i = 0; i < sources.length; i += CONCURRENCY) {
    batches.push(sources.slice(i, i + CONCURRENCY))
  }
  for (const batch of batches) {
    await Promise.all(batch.map((source) => fetchSource(source)))
  }

  console.log(`✅ ${tag}抓取完成（${sources.length} 个源）`)

  try {
    await checkAndCreateAlerts()
  } catch (error) {
    console.error('告警检查失败:', error)
  }
}

// ===== 过期数据清理（由 tick 每日触发，也可手动调用） =====
export async function runCleanupOnce() {
  const nowSec = Math.floor(Date.now() / 1000)
  const newsCutoff = nowSec - NEWS_RETENTION_DAYS * 86400
  const logCutoff = nowSec - LOG_RETENTION_DAYS * 86400

  const candidates = sql`id IN (
    SELECT id FROM news_items
    WHERE fetched_at < ${newsCutoff} AND id NOT IN (SELECT news_item_id FROM favorites)
  )`

  const [{ newsCount }] = await db.select({ newsCount: count() }).from(newsItems).where(candidates)

  if (newsCount > 0) {
    await db.delete(aiLogs).where(sql`news_item_id IN (
        SELECT id FROM news_items
        WHERE fetched_at < ${newsCutoff} AND id NOT IN (SELECT news_item_id FROM favorites)
      )`)
    await db.delete(newsItems).where(candidates)
  }

  const [{ logCount }] = await db
    .select({ logCount: count() })
    .from(fetchLogs)
    .where(sql`created_at < ${logCutoff}`)
  if (logCount > 0) {
    await db.delete(fetchLogs).where(sql`created_at < ${logCutoff}`)
  }

  const [{ alertCount }] = await db
    .select({ alertCount: count() })
    .from(errorAlerts)
    .where(sql`created_at < ${logCutoff}`)
  if (alertCount > 0) {
    await db.delete(errorAlerts).where(sql`created_at < ${logCutoff}`)
  }

  console.log(
    `🧹 过期清理完成: 新闻 ${newsCount} 条、抓取日志 ${logCount} 条、告警 ${alertCount} 条（收藏的新闻永不清）`
  )

  return { newsCount, logCount, alertCount }
}

function maybeRunCleanup() {
  const now = new Date()
  const dayKey = now.toDateString()
  if (now.getHours() >= 4 && cleanupDayKey !== dayKey) {
    cleanupDayKey = dayKey // 先占位，失败也不再当日重试
    runCleanupOnce().catch((error) => console.error('过期清理失败:', error))
  }
}

// ===== 自动抓取开关 / 间隔配置 =====
export function getAutoFetchEnabled() {
  return autoFetchEnabled
}

export async function setAutoFetchEnabled(enabled: boolean) {
  autoFetchEnabled = enabled
  if (enabled) {
    // 开启后下个 tick 立即首轮（RSS 与 API 分两拍先后触发）
    lastRun.rss = 0
    lastRun.api = 0
  }

  const existing = await db
    .select()
    .from(systemConfig)
    .where(eq(systemConfig.key, 'auto_fetch_enabled'))
    .limit(1)

  if (existing.length > 0) {
    await db
      .update(systemConfig)
      .set({ value: JSON.stringify(enabled), updatedAt: new Date() })
      .where(eq(systemConfig.key, 'auto_fetch_enabled'))
  } else {
    await db.insert(systemConfig).values({
      key: 'auto_fetch_enabled',
      value: JSON.stringify(enabled),
    })
  }

  console.log(`⏰ 自动抓取已${enabled ? '开启' : '关闭'}`)
}

// 配置页保存间隔后调用，立即生效
export function applyFetchIntervals(rss?: number, api?: number) {
  if (typeof rss === 'number' && rss >= 5 && rss <= 1440) {
    rssIntervalMins = rss
  }
  if (typeof api === 'number' && api >= 5 && api <= 1440) {
    apiIntervalMins = api
  }
  console.log(`⏱ 刷新间隔已更新: RSS ${rssIntervalMins} 分钟 / API ${apiIntervalMins} 分钟`)
}

async function ensureIntervalConfig(map: Record<string, unknown>) {
  // 旧全局键 fetch_interval 迁移为 RSS/API 两个新键
  const legacy =
    typeof map.fetch_interval === 'number' && map.fetch_interval >= 5 && map.fetch_interval <= 1440
      ? (map.fetch_interval as number)
      : undefined

  for (const key of ['rss_fetch_interval', 'api_fetch_interval'] as const) {
    if (typeof map[key] !== 'number') {
      const value = legacy ?? DEFAULT_INTERVAL_MIN
      map[key] = value
      const existing = await db
        .select()
        .from(systemConfig)
        .where(eq(systemConfig.key, key))
        .limit(1)
      if (existing.length === 0) {
        await db.insert(systemConfig).values({ key, value: JSON.stringify(value) })
      }
    }
  }

  if (map.fetch_interval !== undefined) {
    await db.delete(systemConfig).where(eq(systemConfig.key, 'fetch_interval'))
    console.log('🗑 旧配置 fetch_interval 已迁移并删除')
  }
}

async function initConfig() {
  const rows = await db.select().from(systemConfig)
  const map: Record<string, unknown> = {}
  for (const row of rows) {
    try {
      map[row.key] = JSON.parse(row.value)
    } catch {
      // 忽略脏数据
    }
  }

  autoFetchEnabled = map.auto_fetch_enabled === true

  await ensureIntervalConfig(map)

  rssIntervalMins =
    typeof map.rss_fetch_interval === 'number' && map.rss_fetch_interval >= 5
      ? map.rss_fetch_interval
      : DEFAULT_INTERVAL_MIN
  apiIntervalMins =
    typeof map.api_fetch_interval === 'number' && map.api_fetch_interval >= 5
      ? map.api_fetch_interval
      : DEFAULT_INTERVAL_MIN
}

// ===== 调度主循环 =====
async function runRound(category: Category) {
  roundRunning = true
  try {
    await fetchAllSources(category)
  } catch (error) {
    console.error(`[${category}] 抓取轮次异常:`, error)
  } finally {
    roundRunning = false
    lastRun[category] = Date.now()
  }
}

async function tick() {
  try {
    maybeRunCleanup()
  } catch (error) {
    console.error('过期清理异常:', error)
  }

  if (!autoFetchEnabled || roundRunning) {
    return
  }

  const now = Date.now()
  if (now - lastRun.rss >= rssIntervalMins * 60_000) {
    await runRound('rss')
    return
  }
  if (now - lastRun.api >= apiIntervalMins * 60_000) {
    await runRound('api')
  }
}

// 启动定时任务（系统 setInterval，不依赖 node-cron）
export async function startScheduler() {
  await initConfig()

  if (tickTimer) {
    clearInterval(tickTimer)
  }
  tickTimer = setInterval(() => {
    tick().catch((error) => console.error('调度 tick 异常:', error))
  }, TICK_MS)

  console.log(
    `⏰ 调度器已启动（自动抓取: ${autoFetchEnabled ? '开启' : '关闭'}，RSS ${rssIntervalMins} 分钟 / API ${apiIntervalMins} 分钟）`
  )
}
