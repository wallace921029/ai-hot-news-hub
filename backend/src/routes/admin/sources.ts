import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../../db/index.js'
import { dataSources, fetchLogs } from '../../db/schema.js'
import { eq, desc } from 'drizzle-orm'
import { fetchSource } from '../../scheduler/index.js'

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
    if (data.type === 'rss' && !('sourceType' in (request.body as Record<string, unknown>))) {
      data.sourceType = 'rss'
    }
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

  // 手动触发抓取（复用 fetchSource：含重试，结果写入 fetch_logs；手动插入的文章直接标记 processed）
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

    fetchSource(source, { status: 'processed' }).catch((error) => {
      console.error(`❌ 手动抓取异常: ${source.name}`, error)
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
