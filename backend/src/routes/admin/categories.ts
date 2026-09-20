import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../../db/index.js'
import { newsCategories } from '../../db/schema.js'
import { eq, asc } from 'drizzle-orm'

const createSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().optional(),
  icon: z.string().optional(),
  sortOrder: z.number().int().optional(),
  enabled: z.boolean().optional(),
})

const updateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  sortOrder: z.number().int().optional(),
  enabled: z.boolean().optional(),
})

export async function categoryRoutes(app: FastifyInstance) {
  // 获取所有类别（含禁用的）
  app.get('/', async () => {
    const allCategories = await db
      .select()
      .from(newsCategories)
      .orderBy(asc(newsCategories.sortOrder), asc(newsCategories.id))

    return allCategories
  })

  // 获取启用的类别
  app.get('/enabled', async () => {
    const enabledCategories = await db
      .select()
      .from(newsCategories)
      .where(eq(newsCategories.enabled, true))
      .orderBy(asc(newsCategories.sortOrder), asc(newsCategories.id))

    return enabledCategories
  })

  // 创建类别
  app.post('/', async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: '参数错误', details: parsed.error.flatten() })
    }

    const data = parsed.data

    // 检查名称是否已存在
    const existing = await db
      .select()
      .from(newsCategories)
      .where(eq(newsCategories.name, data.name))
      .limit(1)

    if (existing.length > 0) {
      return reply.status(400).send({ error: '类别名称已存在' })
    }

    const [created] = await db.insert(newsCategories).values(data).returning()

    return created
  })

  // 更新类别
  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = updateSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: '参数错误', details: parsed.error.flatten() })
    }

    const data = parsed.data

    // 如果更新名称，检查是否重复
    if (data.name) {
      const existing = await db
        .select()
        .from(newsCategories)
        .where(eq(newsCategories.name, data.name))
        .limit(1)

      if (existing.length > 0 && existing[0].id !== parseInt(id)) {
        return reply.status(400).send({ error: '类别名称已存在' })
      }
    }

    const [updated] = await db
      .update(newsCategories)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(newsCategories.id, parseInt(id)))
      .returning()

    if (!updated) {
      return reply.status(404).send({ error: '类别不存在' })
    }

    return updated
  })

  // 删除类别
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const [deleted] = await db
      .delete(newsCategories)
      .where(eq(newsCategories.id, parseInt(id)))
      .returning()

    if (!deleted) {
      return reply.status(404).send({ error: '类别不存在' })
    }

    return { success: true }
  })
}
