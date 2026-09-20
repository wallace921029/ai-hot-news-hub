import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../../db/index.js'
import { newsItems } from '../../db/schema.js'
import { eq, desc, sql, inArray } from 'drizzle-orm'
import { fetchAllSources } from '../../scheduler/index.js'
import { processAllPending, processNewsItemById } from '../../ai/index.js'

const updateSchema = z.object({
  categories: z.array(z.string()).optional(),
  aiScore: z.number().min(0).max(100).optional(),
  aiSummary: z.string().optional(),
  status: z.enum(['pending', 'processed', 'failed']).optional(),
})

export async function contentRoutes(app: FastifyInstance) {
  // 获取内容列表（含未处理）
  app.get('/', async (request) => {
    const query = request.query as Record<string, string>
    const page = Math.max(1, parseInt(query.page) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize) || 15))
    const status = query.status || undefined
    const offset = (page - 1) * pageSize

    const conditions = []
    if (status) {
      conditions.push(
        eq(newsItems.status, status as 'pending' | 'processing' | 'processed' | 'failed')
      )
    }

    const where = conditions.length > 0 ? sql`${conditions[0]}` : undefined

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(newsItems)
      .where(where)

    const items = await db
      .select()
      .from(newsItems)
      .where(where)
      .orderBy(desc(newsItems.createdAt))
      .limit(pageSize)
      .offset(offset)

    return {
      items: items.map((item) => ({
        ...item,
        categories: item.categories ? JSON.parse(item.categories) : [],
        metadata: item.metadata ? JSON.parse(item.metadata) : null,
      })),
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
      .set({
        ...data,
        categories: data.categories ? JSON.stringify(data.categories) : undefined,
      })
      .where(eq(newsItems.id, parseInt(id)))
      .returning()

    if (!updated) {
      return reply.status(404).send({ error: '内容不存在' })
    }

    return {
      ...updated,
      categories: updated.categories ? JSON.parse(updated.categories) : [],
    }
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

  // 手动触发 AI 处理
  app.post('/process', async () => {
    processAllPending().catch(console.error)
    return { success: true, message: 'AI 处理已触发' }
  })

  // 单条 AI 处理
  app.post('/:id/process', async (request, reply) => {
    const { id } = request.params as { id: string }

    try {
      const result = await processNewsItemById(parseInt(id))
      return { success: true, message: '处理完成', result }
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : '处理失败',
      })
    }
  })

  // 一键抓取并处理
  app.post('/fetch-and-process', async () => {
    fetchAllSources()
      .then(() => processAllPending())
      .catch(console.error)
    return { success: true, message: '抓取并处理任务已触发' }
  })
}
