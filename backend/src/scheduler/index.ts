import cron from 'node-cron'
import { db } from '../db/index.js'
import { dataSources, newsItems, fetchLogs, categories } from '../db/schema.js'
import { eq, and, sql } from 'drizzle-orm'
import { RestFetcher } from '../fetchers/rest.js'
import { RssFetcher } from '../fetchers/rss.js'
import { HtmlFetcher } from '../fetchers/html.js'
import type { Fetcher, RawNewsItem } from '../fetchers/types.js'

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

// 去重检查
async function isDuplicate(url: string, title: string): Promise<boolean> {
  // URL 去重
  const existingByUrl = await db.select().from(newsItems).where(eq(newsItems.url, url)).limit(1)
  if (existingByUrl.length > 0) {
    return true
  }

  // 标题去重（简单实现，后续可优化为编辑距离）
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
async function saveNewsItems(items: RawNewsItem[]) {
  let savedCount = 0

  for (const item of items) {
    try {
      const duplicate = await isDuplicate(item.url, item.title)
      if (duplicate) {
        continue
      }

      await db.insert(newsItems).values({
        sourceId: item.sourceId,
        platform: item.platform,
        title: item.title,
        url: item.url,
        description: item.description,
        author: item.author,
        publishedAt: item.publishedAt,
        fetchedAt: item.fetchedAt,
        hotScore: item.hotScore,
        metadata: item.metadata ? JSON.stringify(item.metadata) : null,
        status: 'pending',
      })

      savedCount++
    } catch (error) {
      // 忽略单条记录的错误（如 URL 重复）
      console.error(`保存新闻失败: ${item.title}`, error)
    }
  }

  return savedCount
}

// 抓取单个数据源
async function fetchSource(source: typeof dataSources.$inferSelect) {
  const startTime = Date.now()

  try {
    const fetcher = getFetcher(source.type)
    const headers = source.headers ? JSON.parse(source.headers) : undefined

    const items = await fetcher.fetch({
      id: source.id,
      name: source.name,
      url: source.url,
      method: source.method || undefined,
      headers,
      body: source.body || undefined,
      parser: source.parser || undefined,
    })

    const savedCount = await saveNewsItems(items)
    const duration = Date.now() - startTime

    // 记录抓取日志
    await db.insert(fetchLogs).values({
      sourceId: source.id,
      status: 'success',
      duration,
      count: savedCount,
    })

    // 更新数据源的上次抓取时间
    await db
      .update(dataSources)
      .set({
        lastFetchAt: new Date(),
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(dataSources.id, source.id))

    console.log(`✅ 抓取成功: ${source.name} (${savedCount} 条, ${duration}ms)`)
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : '未知错误'

    // 记录错误日志
    await db.insert(fetchLogs).values({
      sourceId: source.id,
      status: 'failed',
      duration,
      count: 0,
      error: errorMessage,
    })

    // 更新数据源的错误信息
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

// 抓取所有启用的数据源
export async function fetchAllSources() {
  console.log('🔄 开始抓取所有数据源...')

  const sources = await db.select().from(dataSources).where(eq(dataSources.enabled, true))

  // 并发抓取，但限制并发数
  const concurrency = 5
  for (let i = 0; i < sources.length; i += concurrency) {
    const batch = sources.slice(i, i + concurrency)
    await Promise.all(batch.map((source) => fetchSource(source)))
  }

  console.log('✅ 所有数据源抓取完成')
}

// 更新分类统计
export async function updateCategoryCounts() {
  const allNews = await db.select({ categories: newsItems.categories }).from(newsItems)

  const categoryMap = new Map<string, number>()

  for (const news of allNews) {
    if (news.categories) {
      const cats = JSON.parse(news.categories) as string[]
      for (const cat of cats) {
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1)
      }
    }
  }

  // 更新或插入分类
  for (const [name, count] of categoryMap) {
    const existing = await db.select().from(categories).where(eq(categories.name, name)).limit(1)

    if (existing.length > 0) {
      await db
        .update(categories)
        .set({ count, updatedAt: new Date() })
        .where(eq(categories.name, name))
    } else {
      await db.insert(categories).values({ name, count })
    }
  }
}

// 启动定时任务
export function startScheduler() {
  // 每 30 分钟抓取一次（可配置）
  cron.schedule('*/30 * * * *', async () => {
    await fetchAllSources()
    await updateCategoryCounts()
  })

  console.log('⏰ 定时任务已启动')
}
