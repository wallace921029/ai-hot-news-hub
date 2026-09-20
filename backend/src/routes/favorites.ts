import { FastifyInstance } from 'fastify'
import { db } from '../db/index.js'
import { favorites, newsItems } from '../db/schema.js'
import { eq, and, desc, sql } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth.js'

export async function favoriteRoutes(app: FastifyInstance) {
  // 所有收藏接口都需要登录
  app.addHook('preHandler', authMiddleware)

  // 获取收藏列表
  app.get('/', async (request) => {
    const query = request.query as Record<string, string>
    const page = Math.max(1, parseInt(query.page) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize) || 20))
    const offset = (page - 1) * pageSize

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(favorites)
      .where(eq(favorites.userId, request.user.userId))

    const items = await db
      .select({
        id: favorites.id,
        createdAt: favorites.createdAt,
        newsItem: {
          id: newsItems.id,
          title: newsItems.title,
          url: newsItems.url,
          description: newsItems.description,
          platform: newsItems.platform,
          sourceType: newsItems.sourceType,
          publishedAt: newsItems.publishedAt,
          fetchedAt: newsItems.fetchedAt,
        },
      })
      .from(favorites)
      .leftJoin(newsItems, eq(favorites.newsItemId, newsItems.id))
      .where(eq(favorites.userId, request.user.userId))
      .orderBy(desc(favorites.createdAt))
      .limit(pageSize)
      .offset(offset)

    return {
      items: items.map((item) => ({
        ...item,
        newsItem: item.newsItem || null,
      })),
      pagination: {
        page,
        pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize),
      },
    }
  })

  // 添加收藏
  app.post('/:newsId', async (request, reply) => {
    const { newsId } = request.params as { newsId: string }
    const newsIdNum = parseInt(newsId)

    // 检查新闻是否存在
    const [news] = await db.select().from(newsItems).where(eq(newsItems.id, newsIdNum)).limit(1)
    if (!news) {
      return reply.status(404).send({ error: '内容不存在' })
    }

    // 检查是否已收藏
    const [existing] = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, request.user.userId), eq(favorites.newsItemId, newsIdNum)))
      .limit(1)

    if (existing) {
      return reply.status(409).send({ error: '已收藏' })
    }

    await db.insert(favorites).values({
      userId: request.user.userId,
      newsItemId: newsIdNum,
    })

    return { success: true }
  })

  // 取消收藏
  app.delete('/:newsId', async (request) => {
    const { newsId } = request.params as { newsId: string }
    const newsIdNum = parseInt(newsId)

    await db
      .delete(favorites)
      .where(and(eq(favorites.userId, request.user.userId), eq(favorites.newsItemId, newsIdNum)))

    return { success: true }
  })
}
