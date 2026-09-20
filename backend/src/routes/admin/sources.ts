import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../../db/index.js'
import { dataSources, fetchLogs, newsItems } from '../../db/schema.js'
import { eq, desc } from 'drizzle-orm'
import { RestFetcher } from '../../fetchers/rest.js'
import { RssFetcher } from '../../fetchers/rss.js'
import { HtmlFetcher } from '../../fetchers/html.js'

const restFetcher = new RestFetcher()
const rssFetcher = new RssFetcher()
const htmlFetcher = new HtmlFetcher()

function getFetcher(type: string) {
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

const sourceSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['rest', 'rss', 'html']),
  sourceType: z.enum(['rss', 'api', 'topic']).default('api'),
  url: z.string().url(),
  method: z.enum(['GET', 'POST']).default('GET'),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
  parser: z.string().optional(),
  enabled: z.boolean().default(true),
  fetchInterval: z.number().min(5).max(1440).default(30),
  description: z.string().optional(),
})

export async function sourceRoutes(app: FastifyInstance) {
  // 获取数据源列表
  app.get('/', async () => {
    const sources = await db.select().from(dataSources).orderBy(desc(dataSources.createdAt))
    return sources.map((s) => ({
      ...s,
      headers: s.headers ? JSON.parse(s.headers) : null,
    }))
  })

  // 创建数据源
  app.post('/', async (request, reply) => {
    const parsed = sourceSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: '参数错误', details: parsed.error.flatten() })
    }

    const data = parsed.data
    const [newSource] = await db
      .insert(dataSources)
      .values({
        ...data,
        headers: data.headers ? JSON.stringify(data.headers) : null,
      })
      .returning()

    return newSource
  })

  // 更新数据源
  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = sourceSchema.partial().safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: '参数错误', details: parsed.error.flatten() })
    }

    const data = parsed.data
    const [updated] = await db
      .update(dataSources)
      .set({
        ...data,
        headers: data.headers ? JSON.stringify(data.headers) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(dataSources.id, parseInt(id)))
      .returning()

    if (!updated) {
      return reply.status(404).send({ error: '数据源不存在' })
    }

    return updated
  })

  // 删除数据源
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const [deleted] = await db
      .delete(dataSources)
      .where(eq(dataSources.id, parseInt(id)))
      .returning()

    if (!deleted) {
      return reply.status(404).send({ error: '数据源不存在' })
    }

    return { success: true }
  })

  // 手动触发抓取
  app.post('/:id/fetch', async (request, reply) => {
    const { id } = request.params as { id: string }

    const [source] = await db
      .select()
      .from(dataSources)
      .where(eq(dataSources.id, parseInt(id)))
      .limit(1)

    if (!source) {
      return reply.status(404).send({ error: '数据源不存在' })
    }

    // 异步执行抓取
    const fetcher = getFetcher(source.type)
    const headers = source.headers ? JSON.parse(source.headers) : undefined

    fetcher
      .fetch({
        id: source.id,
        name: source.name,
        url: source.url,
        method: source.method || undefined,
        headers,
        body: source.body || undefined,
        parser: source.parser || undefined,
      })
      .then(async (items) => {
        // 保存抓取结果
        let savedCount = 0
        for (const item of items) {
          try {
            await db.insert(newsItems).values({
              sourceId: item.sourceId,
              sourceType: source.sourceType || 'api',
              platform: item.platform,
              title: item.title,
              url: item.url,
              description: item.description,
              author: item.author,
              publishedAt: item.publishedAt,
              fetchedAt: item.fetchedAt,
              hotScore: item.hotScore,
              metadata: item.metadata ? JSON.stringify(item.metadata) : null,
              status: 'processed',
            })
            savedCount++
          } catch {
            // 忽略重复记录
          }
        }

        // 更新数据源状态
        await db
          .update(dataSources)
          .set({ lastFetchAt: new Date(), lastError: null, updatedAt: new Date() })
          .where(eq(dataSources.id, source.id))

        console.log(`✅ 手动抓取成功: ${source.name} (${savedCount} 条)`)
      })
      .catch(async (error) => {
        const errorMessage = error instanceof Error ? error.message : '未知错误'
        await db
          .update(dataSources)
          .set({ lastError: errorMessage, updatedAt: new Date() })
          .where(eq(dataSources.id, source.id))
        console.error(`❌ 手动抓取失败: ${source.name} - ${errorMessage}`)
      })

    return { success: true, message: '抓取任务已触发' }
  })

  // 测试连通性
  app.post('/:id/test', async (request, reply) => {
    const { id } = request.params as { id: string }

    const [source] = await db
      .select()
      .from(dataSources)
      .where(eq(dataSources.id, parseInt(id)))
      .limit(1)

    if (!source) {
      return reply.status(404).send({ error: '数据源不存在' })
    }

    try {
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }

      if (source.headers) {
        Object.assign(headers, JSON.parse(source.headers))
      }

      const response = await fetch(source.url, {
        method: source.method || 'GET',
        headers,
        body: source.method === 'POST' ? source.body : undefined,
      })

      return {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      }
    }
  })

  // 获取抓取日志
  app.get('/:id/logs', async (request) => {
    const { id } = request.params as { id: string }
    const { page = 1, pageSize = 20 } = request.query as { page?: number; pageSize?: number }
    const offset = (page - 1) * pageSize

    const logs = await db
      .select()
      .from(fetchLogs)
      .where(eq(fetchLogs.sourceId, parseInt(id)))
      .orderBy(desc(fetchLogs.createdAt))
      .limit(pageSize)
      .offset(offset)

    return logs
  })
}
