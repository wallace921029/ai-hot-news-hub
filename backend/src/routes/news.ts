import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/index.js'
import { newsItems, dataSources, sourceStates } from '../db/schema.js'
import { eq, desc, and, sql } from 'drizzle-orm'
import { getBuiltinApiSource, builtinApiSources } from '../fetchers/api-sources.js'

const listSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  sourceType: z.enum(['rss', 'api', 'topic']).optional(),
  sourceId: z.coerce.number().optional(),
  sourceCode: z.string().optional(),
  platform: z.string().optional(),
  search: z.string().optional(),
})

/** 新闻来源名：RSS 按 source_id、内置 API 按 source_code */
export function resolveSourceName(
  sourceId: number | null | undefined,
  sourceCode: string | null | undefined,
  rssNameById?: Map<number, string>
): string {
  if (sourceCode) {
    return getBuiltinApiSource(sourceCode)?.name ?? sourceCode
  }
  if (sourceId != null) {
    if (rssNameById) return rssNameById.get(sourceId) ?? '未知'
    return '未知'
  }
  return '未知'
}

export async function newsRoutes(app: FastifyInstance) {
  // 获取新闻列表
  app.get('/', async (request, reply) => {
    const parsed = listSchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.status(400).send({ error: '参数错误', details: parsed.error.flatten() })
    }

    const { page, pageSize, sourceType, sourceId, sourceCode, platform, search } = parsed.data
    const offset = (page - 1) * pageSize

    // 构建查询条件
    const conditions = []

    if (sourceType) {
      conditions.push(eq(newsItems.sourceType, sourceType))
    }

    if (sourceId) {
      conditions.push(eq(newsItems.sourceId, sourceId))
    }

    if (sourceCode) {
      conditions.push(eq(newsItems.sourceCode, sourceCode))
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
        sourceCode: newsItems.sourceCode,
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

    // 获取 RSS 数据源名称映射（内置 API 按 code 从代码清单解析）
    const allSources = await db
      .select({ id: dataSources.id, name: dataSources.name })
      .from(dataSources)
    const sourceMap = new Map(allSources.map((s) => [s.id, s.name]))

    // 格式化返回数据
    const formattedItems = items.map((item) => ({
      ...item,
      metadata: item.metadata ? JSON.parse(item.metadata) : null,
      sourceName: resolveSourceName(item.sourceId, item.sourceCode, sourceMap),
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

    let sourceName: string | undefined
    if (item.sourceCode) {
      sourceName = getBuiltinApiSource(item.sourceCode)?.name ?? item.sourceCode
    } else if (item.sourceId) {
      const [source] = await db
        .select({ name: dataSources.name })
        .from(dataSources)
        .where(eq(dataSources.id, item.sourceId))
        .limit(1)
      sourceName = source?.name
    }

    return {
      ...item,
      metadata: item.metadata ? JSON.parse(item.metadata) : null,
      sourceName,
    }
  })

  // 获取所有数据源（RSS + 启用中的内置 API，供筛选）
  app.get('/sources', async (request) => {
    const query = request.query as Record<string, string>
    const sourceType = query.sourceType

    // rss/topic：只返回对应 DB 行；api：只返回内置清单；缺省：两者合并
    const rssConditions = [eq(dataSources.enabled, true)]
    if (sourceType === 'rss' || sourceType === 'topic') {
      rssConditions.push(eq(dataSources.sourceType, sourceType))
    }
    const wantRss = !sourceType || sourceType === 'rss' || sourceType === 'topic'

    const rss = wantRss
      ? (
          await db
            .select({
              id: dataSources.id,
              name: dataSources.name,
              sourceType: dataSources.sourceType,
              description: dataSources.description,
            })
            .from(dataSources)
            .where(and(...rssConditions))
            .orderBy(dataSources.name)
        ).map((s) => ({ ...s, code: null as string | null }))
      : []

    let builtin: Array<{
      id: null
      code: string
      name: string
      sourceType: 'api'
      description: string | null
    }> = []
    if (!sourceType || sourceType === 'api') {
      const states = await db.select().from(sourceStates)
      const enabledCodes = new Set(states.filter((s) => s.enabled).map((s) => s.code))
      builtin = builtinApiSources
        .filter((def) => enabledCodes.has(def.code))
        .map((def) => ({
          id: null,
          code: def.code,
          name: def.name,
          sourceType: 'api' as const,
          description: def.description ?? null,
        }))
    }

    return [...rss, ...builtin].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
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
