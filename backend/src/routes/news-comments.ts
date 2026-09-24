import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/index.js'
import { newsComments, newsItems, users } from '../db/schema.js'
import { eq, and, asc, sql, isNull, inArray } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth.js'
import {
  checkMentionAllowed,
  containsMention,
  getAgentNickname,
  getDisplayName,
  reserveMentionLog,
  runMentionReply,
} from '../services/ai-agent.js'

const createCommentSchema = z.object({
  content: z.string().trim().min(1, '评论不能为空').max(2000, '评论最多 2000 字'),
  parentCommentId: z.coerce.number().int().positive().optional(),
})

function toAuthor(row: {
  id: number
  username: string
  nickname: string | null
  avatar: string | null
}) {
  return { id: row.id, username: row.username, nickname: row.nickname, avatar: row.avatar }
}

export async function newsCommentRoutes(app: FastifyInstance) {
  // 新闻评论接口全部需要登录
  app.addHook('preHandler', authMiddleware)

  // 评论列表（单层楼中楼，与议事厅一致；暂无点赞）
  app.get('/:newsId/comments', async (request, reply) => {
    const newsItemId = parseInt((request.params as { newsId: string }).newsId)
    if (!newsItemId) return reply.status(400).send({ error: '参数错误' })
    const query = request.query as Record<string, string>
    const page = Math.max(1, parseInt(query.page) || 1)
    const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize) || 20))
    const offset = (page - 1) * pageSize

    const [news] = await db.select().from(newsItems).where(eq(newsItems.id, newsItemId)).limit(1)
    if (!news) return reply.status(404).send({ error: '内容不存在' })

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(newsComments)
      .where(and(eq(newsComments.newsItemId, newsItemId), isNull(newsComments.parentCommentId)))

    const baseSelect = {
      id: newsComments.id,
      newsItemId: newsComments.newsItemId,
      userId: newsComments.userId,
      parentCommentId: newsComments.parentCommentId,
      content: newsComments.content,
      likeCount: newsComments.likeCount,
      createdAt: newsComments.createdAt,
      authorId: users.id,
      username: users.username,
      nickname: users.nickname,
      avatar: users.avatar,
    }

    const topRows = await db
      .select(baseSelect)
      .from(newsComments)
      .leftJoin(users, eq(newsComments.userId, users.id))
      .where(and(eq(newsComments.newsItemId, newsItemId), isNull(newsComments.parentCommentId)))
      .orderBy(asc(newsComments.id))
      .limit(pageSize)
      .offset(offset)

    const topIds = topRows.map((r) => r.id)
    let replyRows: typeof topRows = []
    if (topIds.length > 0) {
      replyRows = await db
        .select(baseSelect)
        .from(newsComments)
        .leftJoin(users, eq(newsComments.userId, users.id))
        .where(
          and(
            eq(newsComments.newsItemId, newsItemId),
            inArray(newsComments.parentCommentId, topIds)
          )
        )
        .orderBy(asc(newsComments.id))
    }

    const replyMap = new Map<number, typeof replyRows>()
    for (const r of replyRows) {
      const pid = r.parentCommentId as number
      if (!replyMap.has(pid)) replyMap.set(pid, [])
      replyMap.get(pid)!.push(r)
    }

    const toComment = (r: (typeof topRows)[number]) => ({
      id: r.id,
      newsItemId: r.newsItemId,
      userId: r.userId,
      parentCommentId: r.parentCommentId,
      content: r.content,
      likeCount: r.likeCount,
      createdAt: r.createdAt,
      author: r.authorId
        ? toAuthor({
            id: r.authorId,
            username: r.username!,
            nickname: r.nickname,
            avatar: r.avatar,
          })
        : null,
    })

    return {
      items: topRows.map((r) => ({
        ...toComment(r),
        replies: (replyMap.get(r.id) || []).map(toComment),
      })),
      pagination: {
        page,
        pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize),
      },
    }
  })

  // 发表评论（支持单层回复；@智能体则后台回复，超额同步提示）
  app.post('/:newsId/comments', async (request, reply) => {
    const newsItemId = parseInt((request.params as { newsId: string }).newsId)
    if (!newsItemId) return reply.status(400).send({ error: '参数错误' })
    const parsed = createCommentSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0]?.message || '参数错误' })
    }

    const [news] = await db.select().from(newsItems).where(eq(newsItems.id, newsItemId)).limit(1)
    if (!news) return reply.status(404).send({ error: '内容不存在' })

    let parentCommentId: number | null = null
    if (parsed.data.parentCommentId) {
      const [parent] = await db
        .select()
        .from(newsComments)
        .where(eq(newsComments.id, parsed.data.parentCommentId))
        .limit(1)
      if (!parent || parent.newsItemId !== newsItemId) {
        return reply.status(400).send({ error: '回复的评论不存在' })
      }
      if (parent.parentCommentId) {
        return reply.status(400).send({ error: '只能回复主评论' })
      }
      parentCommentId = parent.id
    }

    const [comment] = await db
      .insert(newsComments)
      .values({
        newsItemId,
        userId: request.user.userId,
        parentCommentId,
        content: parsed.data.content,
      })
      .returning()

    // AI 智能体：评论里 @ 则后台回复一条；超额则同步提示（速递永不主动）
    let aiQuotaExhausted = false
    let aiPending = false
    let agentUserId: number | null = null
    const nickname = await getAgentNickname()
    if (containsMention(parsed.data.content, nickname)) {
      const check = await checkMentionAllowed(request.user.userId)
      if (check.ok && check.config) {
        const logId = await reserveMentionLog('news_comment', comment.id, request.user.userId)
        aiPending = true
        agentUserId = check.agentId
        runMentionReply({
          logId,
          config: check.config,
          agentId: check.agentId,
          targetType: 'news_comment',
          commentId: comment.id,
          newsItemId,
          parentCommentId: comment.parentCommentId,
          authorName: await getDisplayName(request.user.userId),
          mentionContent: parsed.data.content,
          contextText: `标题：${news.title}\n${news.description ?? ''}`,
          sceneLabel: '速递新闻',
        })
      } else if (check.quotaExhausted) {
        aiQuotaExhausted = true
      }
    }

    return { success: true, comment, aiQuotaExhausted, aiPending, agentUserId }
  })

  // 删除评论（本人或管理员；主楼会级联删回复）
  app.delete('/comments/:id', async (request, reply) => {
    const commentId = parseInt((request.params as { id: string }).id)
    if (!commentId) return reply.status(400).send({ error: '参数错误' })

    const [comment] = await db
      .select()
      .from(newsComments)
      .where(eq(newsComments.id, commentId))
      .limit(1)
    if (!comment) return reply.status(404).send({ error: '评论不存在' })
    if (comment.userId !== request.user.userId && request.user.role !== 'admin') {
      return reply.status(403).send({ error: '无权删除' })
    }

    const idsToDelete = [commentId]
    if (!comment.parentCommentId) {
      const replies = await db
        .select({ id: newsComments.id })
        .from(newsComments)
        .where(eq(newsComments.parentCommentId, commentId))
      for (const r of replies) idsToDelete.push(r.id)
    }

    await db.delete(newsComments).where(
      sql`${newsComments.id} IN (${sql.join(
        idsToDelete.map((v) => sql`${v}`),
        sql`, `
      )})`
    )

    return { success: true }
  })
}
