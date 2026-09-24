import { FastifyInstance } from 'fastify'
import { db } from '../../db/index.js'
import { fetchLogs, aiLogs } from '../../db/schema.js'
import { desc, eq, and, sql } from 'drizzle-orm'

export async function logRoutes(app: FastifyInstance) {
  // 抓取日志
  app.get('/fetch', async (request) => {
    const query = request.query as Record<string, string>
    const page = Math.max(1, parseInt(query.page) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize) || 15))
    const sourceId = query.sourceId ? parseInt(query.sourceId) : undefined
    const sourceCode = query.sourceCode?.trim() || undefined
    const offset = (page - 1) * pageSize

    const conditions = []
    if (sourceId) {
      conditions.push(eq(fetchLogs.sourceId, sourceId))
    }
    if (sourceCode) {
      conditions.push(eq(fetchLogs.sourceCode, sourceCode))
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(fetchLogs)
      .where(where)

    const items = await db
      .select()
      .from(fetchLogs)
      .where(where)
      .orderBy(desc(fetchLogs.createdAt))
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

  // AI 处理日志
  app.get('/ai', async (request) => {
    const query = request.query as Record<string, string>
    const page = Math.max(1, parseInt(query.page) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize) || 15))
    const status = query.status || undefined
    const offset = (page - 1) * pageSize

    const conditions = []
    if (status) {
      conditions.push(eq(aiLogs.status, status as 'success' | 'failed'))
    }

    const where = conditions.length > 0 ? conditions[0] : undefined

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(aiLogs)
      .where(where)

    const items = await db
      .select()
      .from(aiLogs)
      .where(where)
      .orderBy(desc(aiLogs.createdAt))
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

  // 错误日志（合并抓取和 AI 的错误）
  app.get('/errors', async (request) => {
    const query = request.query as Record<string, string>
    const page = Math.max(1, parseInt(query.page) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize) || 15))
    const offset = (page - 1) * pageSize

    // 抓取错误
    const fetchErrors = await db
      .select({
        id: fetchLogs.id,
        type: sql<string>`'fetch'`,
        sourceId: fetchLogs.sourceId,
        sourceCode: fetchLogs.sourceCode,
        error: fetchLogs.error,
        createdAt: fetchLogs.createdAt,
      })
      .from(fetchLogs)
      .where(eq(fetchLogs.status, 'failed'))
      .orderBy(desc(fetchLogs.createdAt))
      .limit(50)

    // AI 错误
    const aiErrors = await db
      .select({
        id: aiLogs.id,
        type: sql<string>`'ai'`,
        newsItemId: aiLogs.newsItemId,
        error: aiLogs.error,
        createdAt: aiLogs.createdAt,
      })
      .from(aiLogs)
      .where(eq(aiLogs.status, 'failed'))
      .orderBy(desc(aiLogs.createdAt))
      .limit(50)

    // 合并并排序
    const allErrors = [...fetchErrors, ...aiErrors]
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
      .slice(offset, offset + pageSize)

    return {
      items: allErrors,
      total: fetchErrors.length + aiErrors.length,
    }
  })
}
