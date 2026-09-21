import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../../db/index.js'
import { newsItems, dataSources } from '../../db/schema.js'
import { eq, desc, sql, inArray } from 'drizzle-orm'
import { fetchAllSources } from '../../scheduler/index.js'

const updateSchema = z.object({
  status: z.enum(['pending', 'processed', 'failed']).optional(),
})

export async function contentRoutes(app: FastifyInstance) {
  // 获取内容列表
  app.get('/', async (request) => {
    const query = request.query as Record<string, string>
    const page = Math.max(1, parseInt(query.page) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize) || 20))
    const status = query.status || undefined
    const sourceType = query.sourceType || undefined
    const offset = (page - 1) * pageSize

    const conditions = []
    if (status) {
      conditions.push(eq(newsItems.status, status as 'pending' | 'processed' | 'failed'))
    }
    if (sourceType) {
      conditions.push(eq(newsItems.sourceType, sourceType as 'rss' | 'api' | 'topic'))
    }

    const where = conditions.length > 0 ? sql`${conditions[0]}` : undefined

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(newsItems)
      .where(where)

    const items = await db
      .select({
        id: newsItems.id,
        sourceId: newsItems.sourceId,
        sourceName: dataSources.name,
        sourceType: newsItems.sourceType,
        platform: newsItems.platform,
        title: newsItems.title,
        url: newsItems.url,
        description: newsItems.description,
        author: newsItems.author,
        publishedAt: newsItems.publishedAt,
        fetchedAt: newsItems.fetchedAt,
        hotScore: newsItems.hotScore,
        metadata: newsItems.metadata,
        topicId: newsItems.topicId,
        status: newsItems.status,
        createdAt: newsItems.createdAt,
      })
      .from(newsItems)
      .leftJoin(dataSources, eq(newsItems.sourceId, dataSources.id))
      .where(where)
      .orderBy(desc(newsItems.createdAt))
      .limit(pageSize)
      .offset(offset)

    return {
      items,
      pagination: {
        page,
        pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize),
      },
    }
  })

  // 更新内容
  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = updateSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: '参数错误', details: parsed.error.flatten() })
    }

    const data = parsed.data
    const [updated] = await db
      .update(newsItems)
      .set(data)
      .where(eq(newsItems.id, parseInt(id)))
      .returning()

    if (!updated) {
      return reply.status(404).send({ error: '内容不存在' })
    }

    return updated
  })

  // 删除内容
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const [deleted] = await db
      .delete(newsItems)
      .where(eq(newsItems.id, parseInt(id)))
      .returning()

    if (!deleted) {
      return reply.status(404).send({ error: '内容不存在' })
    }

    return { success: true }
  })

  // 批量删除
  app.post('/batch-delete', async (request, reply) => {
    const { ids } = request.body as { ids: number[] }

    if (!ids || ids.length === 0) {
      return reply.status(400).send({ error: '请选择要删除的内容' })
    }

    await db.delete(newsItems).where(inArray(newsItems.id, ids))

    return { success: true, deleted: ids.length }
  })

  // 手动触发抓取所有数据源
  app.post('/fetch', async () => {
    fetchAllSources().catch(console.error)
    return { success: true, message: '抓取任务已触发' }
  })
}
