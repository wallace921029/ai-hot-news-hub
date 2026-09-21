import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/index.js'
import { newsItems, dataSources } from '../db/schema.js'
import { eq, desc, and, sql } from 'drizzle-orm'

const listSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  sourceType: z.enum(['rss', 'api', 'topic']).optional(),
  sourceId: z.coerce.number().optional(),
  platform: z.string().optional(),
  search: z.string().optional(),
})

export async function newsRoutes(app: FastifyInstance) {
  // 获取新闻列表
  app.get('/', async (request, reply) => {
    const parsed = listSchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.status(400).send({ error: '参数错误', details: parsed.error.flatten() })
    }

    const { page, pageSize, sourceType, sourceId, platform, search } = parsed.data
    const offset = (page - 1) * pageSize

    // 构建查询条件
    const conditions = []

    if (sourceType) {
      conditions.push(eq(newsItems.sourceType, sourceType))
    }

    if (sourceId) {
      conditions.push(eq(newsItems.sourceId, sourceId))
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
    const items = await db
      .select({
        id: newsItems.id,
        title: newsItems.title,
        url: newsItems.url,
        description: newsItems.description,
        platform: newsItems.platform,
        sourceType: newsItems.sourceType,
        sourceId: newsItems.sourceId,
        author: newsItems.author,
        publishedAt: newsItems.publishedAt,
        fetchedAt: newsItems.fetchedAt,
        hotScore: newsItems.hotScore,
        metadata: newsItems.metadata,
      })
      .from(newsItems)
      .where(where)
      .orderBy(desc(newsItems.fetchedAt))
      .limit(pageSize)
      .offset(offset)

    // 获取数据源名称映射
    const allSources = await db
      .select({ id: dataSources.id, name: dataSources.name })
      .from(dataSources)
    const sourceMap = new Map(allSources.map((s) => [s.id, s.name]))

    // 格式化返回数据
    const formattedItems = items.map((item) => ({
      ...item,
      metadata: item.metadata ? JSON.parse(item.metadata) : null,
      sourceName: item.sourceId ? sourceMap.get(item.sourceId) || '未知' : '未知',
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
      metadata: item.metadata ? JSON.parse(item.metadata) : null,
    }
  })

  // 获取所有数据源（按 sourceType 分组）
  app.get('/sources', async (request) => {
    const query = request.query as Record<string, string>
    const sourceType = query.sourceType

    const conditions = [eq(dataSources.enabled, true)]
    if (sourceType) {
      conditions.push(eq(dataSources.sourceType, sourceType as 'rss' | 'api' | 'topic'))
    }

    const sources = await db
      .select({
        id: dataSources.id,
        name: dataSources.name,
        sourceType: dataSources.sourceType,
        description: dataSources.description,
      })
      .from(dataSources)
      .where(and(...conditions))
      .orderBy(dataSources.name)

    return sources
  })

  // 获取所有平台
  app.get('/platforms', async (request) => {
    const query = request.query as Record<string, string>
    const sourceType = query.sourceType

    const conditions = []
    if (sourceType) {
      conditions.push(eq(newsItems.sourceType, sourceType as 'rss' | 'api' | 'topic'))
    }

    const platforms = await db
      .selectDistinct({ platform: newsItems.platform })
      .from(newsItems)
      .where(and(...conditions))

    return platforms.map((p) => p.platform)
  })
}
