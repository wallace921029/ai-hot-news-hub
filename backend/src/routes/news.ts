import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/index.js'
import { newsItems, categories } from '../db/schema.js'
import { eq, desc, asc, like, and, sql, inArray } from 'drizzle-orm'

const listSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(15),
  category: z.string().optional(),
  platform: z.string().optional(),
  sort: z.enum(['score', 'time']).default('score'),
  search: z.string().optional(),
})

export async function newsRoutes(app: FastifyInstance) {
  // 获取新闻列表
  app.get('/', async (request, reply) => {
    const parsed = listSchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.status(400).send({ error: '参数错误', details: parsed.error.flatten() })
    }

    const { page, pageSize, category, platform, sort, search } = parsed.data
    const offset = (page - 1) * pageSize

    // 构建查询条件
    const conditions = [eq(newsItems.status, 'processed')]

    if (category) {
      conditions.push(sql`json_each.value = ${category}`)
    }

    if (platform) {
      conditions.push(eq(newsItems.platform, platform))
    }

    if (search) {
      conditions.push(
        sql`(${newsItems.title} LIKE ${`%${search}%`} OR ${newsItems.description} LIKE ${`%${search}%`})`
      )
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    // 查询总数
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(newsItems)
      .where(where)

    // 查询数据
    const orderBy = sort === 'score' ? desc(newsItems.aiScore) : desc(newsItems.publishedAt)

    let query = db
      .select({
        id: newsItems.id,
        title: newsItems.title,
        url: newsItems.url,
        description: newsItems.description,
        platform: newsItems.platform,
        publishedAt: newsItems.publishedAt,
        aiScore: newsItems.aiScore,
        aiSummary: newsItems.aiSummary,
        categories: newsItems.categories,
        sourceId: newsItems.sourceId,
      })
      .from(newsItems)
      .where(where)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset(offset)

    const items = await query

    // 解析分类 JSON
    const formattedItems = items.map((item) => ({
      ...item,
      categories: item.categories ? JSON.parse(item.categories) : [],
    }))

    return {
      items: formattedItems,
      pagination: {
        page,
        pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize),
      },
    }
  })

  // 获取新闻详情
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const [item] = await db
      .select()
      .from(newsItems)
      .where(eq(newsItems.id, parseInt(id)))
      .limit(1)

    if (!item) {
      return reply.status(404).send({ error: '内容不存在' })
    }

    return {
      ...item,
      categories: item.categories ? JSON.parse(item.categories) : [],
      metadata: item.metadata ? JSON.parse(item.metadata) : null,
    }
  })

  // 获取所有分类
  app.get('/categories', async () => {
    const allCategories = await db.select().from(categories).orderBy(desc(categories.count))

    return allCategories
  })

  // 获取所有平台
  app.get('/platforms', async () => {
    const platforms = await db.selectDistinct({ platform: newsItems.platform }).from(newsItems)

    return platforms.map((p) => p.platform)
  })
}
