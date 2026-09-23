import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/index.js'
import { communityMoments, momentComments, communityLikes, users } from '../db/schema.js'
import { eq, and, desc, asc, sql } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth.js'

const createMomentSchema = z.object({
  content: z.string().trim().min(1, '内容不能为空').max(280, '动态最多 280 字'),
})

const createMomentCommentSchema = z.object({
  content: z.string().trim().min(1, '评论不能为空').max(500, '评论最多 500 字'),
})

function toAuthor(row: {
  id: number
  username: string
  nickname: string | null
  avatar: string | null
}) {
  return { id: row.id, username: row.username, nickname: row.nickname, avatar: row.avatar }
}

// 调用方保证 ids 非空
function inIds(ids: number[]) {
  return sql`IN (${sql.join(
    ids.map((v) => sql`${v}`),
    sql`, `
  )})`
}

export async function momentRoutes(app: FastifyInstance) {
  // 电波接口全部需要登录
  app.addHook('preHandler', authMiddleware)

  // 动态列表（时间倒序）
  app.get('/', async (request) => {
    const query = request.query as Record<string, string>
    const page = Math.max(1, parseInt(query.page) || 1)
    const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize) || 10))
    const offset = (page - 1) * pageSize
    const mine = query.mine === '1'

    const where = mine ? eq(communityMoments.userId, request.user.userId) : undefined

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(communityMoments)
      .where(where)

    const rows = await db
      .select({
        id: communityMoments.id,
        userId: communityMoments.userId,
        content: communityMoments.content,
        likeCount: communityMoments.likeCount,
        commentCount: communityMoments.commentCount,
        createdAt: communityMoments.createdAt,
        authorId: users.id,
        username: users.username,
        nickname: users.nickname,
        avatar: users.avatar,
      })
      .from(communityMoments)
      .leftJoin(users, eq(communityMoments.userId, users.id))
      .where(where)
      .orderBy(desc(communityMoments.id))
      .limit(pageSize)
      .offset(offset)

    const likedSet = new Set<number>()
    if (rows.length > 0) {
      const ids = rows.map((r) => r.id)
      const liked = await db
        .select({ targetId: communityLikes.targetId })
        .from(communityLikes)
        .where(
          and(
            eq(communityLikes.userId, request.user.userId),
            eq(communityLikes.targetType, 'moment'),
            sql`${communityLikes.targetId} ${inIds(ids)}`
          )
        )
      for (const l of liked) likedSet.add(l.targetId)
    }

    return {
      items: rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        content: r.content,
        likeCount: r.likeCount,
        commentCount: r.commentCount,
        createdAt: r.createdAt,
        likedByMe: likedSet.has(r.id),
        author: r.authorId
          ? toAuthor({
              id: r.authorId,
              username: r.username!,
              nickname: r.nickname,
              avatar: r.avatar,
            })
          : null,
      })),
      pagination: {
        page,
        pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize),
      },
    }
  })

  // 发动态
  app.post('/', async (request, reply) => {
    const parsed = createMomentSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0]?.message || '参数错误' })
    }

    const [moment] = await db
      .insert(communityMoments)
      .values({ userId: request.user.userId, content: parsed.data.content })
      .returning()

    return { success: true, moment }
  })

  // 删动态（本人或管理员，级联清评论+点赞）
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const momentId = parseInt(id)
    if (!momentId) return reply.status(400).send({ error: '参数错误' })

    const [moment] = await db
      .select()
      .from(communityMoments)
      .where(eq(communityMoments.id, momentId))
      .limit(1)
    if (!moment) return reply.status(404).send({ error: '动态不存在' })
    if (moment.userId !== request.user.userId && request.user.role !== 'admin') {
      return reply.status(403).send({ error: '无权删除' })
    }

    const commentIds = await db
      .select({ id: momentComments.id })
      .from(momentComments)
      .where(eq(momentComments.momentId, momentId))
    const ids = commentIds.map((c) => c.id)

    if (ids.length > 0) {
      await db
        .delete(communityLikes)
        .where(
          and(
            eq(communityLikes.targetType, 'moment_comment'),
            sql`${communityLikes.targetId} ${inIds(ids)}`
          )
        )
    }
    await db.delete(momentComments).where(eq(momentComments.momentId, momentId))
    await db
      .delete(communityLikes)
      .where(and(eq(communityLikes.targetType, 'moment'), eq(communityLikes.targetId, momentId)))
    await db.delete(communityMoments).where(eq(communityMoments.id, momentId))

    return { success: true }
  })

  // 动态点赞切换
  app.post('/:id/like', async (request, reply) => {
    const { id } = request.params as { id: string }
    const momentId = parseInt(id)
    if (!momentId) return reply.status(400).send({ error: '参数错误' })

    const [moment] = await db
      .select()
      .from(communityMoments)
      .where(eq(communityMoments.id, momentId))
      .limit(1)
    if (!moment) return reply.status(404).send({ error: '动态不存在' })

    const [existing] = await db
      .select()
      .from(communityLikes)
      .where(
        and(
          eq(communityLikes.userId, request.user.userId),
          eq(communityLikes.targetType, 'moment'),
          eq(communityLikes.targetId, momentId)
        )
      )
      .limit(1)

    if (existing) {
      await db.delete(communityLikes).where(eq(communityLikes.id, existing.id))
      await db
        .update(communityMoments)
        .set({ likeCount: sql`max(${communityMoments.likeCount} - 1, 0)` })
        .where(eq(communityMoments.id, momentId))
    } else {
      await db.insert(communityLikes).values({
        userId: request.user.userId,
        targetType: 'moment',
        targetId: momentId,
      })
      await db
        .update(communityMoments)
        .set({ likeCount: sql`${communityMoments.likeCount} + 1` })
        .where(eq(communityMoments.id, momentId))
    }

    const [updated] = await db
      .select()
      .from(communityMoments)
      .where(eq(communityMoments.id, momentId))
      .limit(1)
    return { success: true, liked: !existing, likeCount: updated.likeCount }
  })

  // 动态评论列表（扁平，时间正序）
  app.get('/:id/comments', async (request, reply) => {
    const { id } = request.params as { id: string }
    const momentId = parseInt(id)
    if (!momentId) return reply.status(400).send({ error: '参数错误' })
    const query = request.query as Record<string, string>
    const page = Math.max(1, parseInt(query.page) || 1)
    const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize) || 20))
    const offset = (page - 1) * pageSize

    const [moment] = await db
      .select()
      .from(communityMoments)
      .where(eq(communityMoments.id, momentId))
      .limit(1)
    if (!moment) return reply.status(404).send({ error: '动态不存在' })

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(momentComments)
      .where(eq(momentComments.momentId, momentId))

    const rows = await db
      .select({
        id: momentComments.id,
        momentId: momentComments.momentId,
        userId: momentComments.userId,
        content: momentComments.content,
        likeCount: momentComments.likeCount,
        createdAt: momentComments.createdAt,
        authorId: users.id,
        username: users.username,
        nickname: users.nickname,
        avatar: users.avatar,
      })
      .from(momentComments)
      .leftJoin(users, eq(momentComments.userId, users.id))
      .where(eq(momentComments.momentId, momentId))
      .orderBy(asc(momentComments.id))
      .limit(pageSize)
      .offset(offset)

    const likedSet = new Set<number>()
    if (rows.length > 0) {
      const ids = rows.map((r) => r.id)
      const liked = await db
        .select({ targetId: communityLikes.targetId })
        .from(communityLikes)
        .where(
          and(
            eq(communityLikes.userId, request.user.userId),
            eq(communityLikes.targetType, 'moment_comment'),
            sql`${communityLikes.targetId} ${inIds(ids)}`
          )
        )
      for (const l of liked) likedSet.add(l.targetId)
    }

    return {
      items: rows.map((r) => ({
        id: r.id,
        momentId: r.momentId,
        userId: r.userId,
        content: r.content,
        likeCount: r.likeCount,
        createdAt: r.createdAt,
        likedByMe: likedSet.has(r.id),
        author: r.authorId
          ? toAuthor({
              id: r.authorId,
              username: r.username!,
              nickname: r.nickname,
              avatar: r.avatar,
            })
          : null,
      })),
      pagination: {
        page,
        pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize),
      },
    }
  })

  // 发表动态评论
  app.post('/:id/comments', async (request, reply) => {
    const { id } = request.params as { id: string }
    const momentId = parseInt(id)
    if (!momentId) return reply.status(400).send({ error: '参数错误' })
    const parsed = createMomentCommentSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0]?.message || '参数错误' })
    }

    const [moment] = await db
      .select()
      .from(communityMoments)
      .where(eq(communityMoments.id, momentId))
      .limit(1)
    if (!moment) return reply.status(404).send({ error: '动态不存在' })

    const [comment] = await db
      .insert(momentComments)
      .values({ momentId, userId: request.user.userId, content: parsed.data.content })
      .returning()

    await db
      .update(communityMoments)
      .set({ commentCount: sql`${communityMoments.commentCount} + 1` })
      .where(eq(communityMoments.id, momentId))

    return { success: true, comment }
  })

  // 删除动态评论（本人或管理员）
  app.delete('/comments/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const commentId = parseInt(id)
    if (!commentId) return reply.status(400).send({ error: '参数错误' })

    const [comment] = await db
      .select()
      .from(momentComments)
      .where(eq(momentComments.id, commentId))
      .limit(1)
    if (!comment) return reply.status(404).send({ error: '评论不存在' })
    if (comment.userId !== request.user.userId && request.user.role !== 'admin') {
      return reply.status(403).send({ error: '无权删除' })
    }

    await db
      .delete(communityLikes)
      .where(
        and(eq(communityLikes.targetType, 'moment_comment'), eq(communityLikes.targetId, commentId))
      )
    await db.delete(momentComments).where(eq(momentComments.id, commentId))
    await db
      .update(communityMoments)
      .set({ commentCount: sql`max(${communityMoments.commentCount} - 1, 0)` })
      .where(eq(communityMoments.id, comment.momentId))

    return { success: true }
  })

  // 动态评论点赞切换
  app.post('/comments/:id/like', async (request, reply) => {
    const { id } = request.params as { id: string }
    const commentId = parseInt(id)
    if (!commentId) return reply.status(400).send({ error: '参数错误' })

    const [comment] = await db
      .select()
      .from(momentComments)
      .where(eq(momentComments.id, commentId))
      .limit(1)
    if (!comment) return reply.status(404).send({ error: '评论不存在' })

    const [existing] = await db
      .select()
      .from(communityLikes)
      .where(
        and(
          eq(communityLikes.userId, request.user.userId),
          eq(communityLikes.targetType, 'moment_comment'),
          eq(communityLikes.targetId, commentId)
        )
      )
      .limit(1)

    if (existing) {
      await db.delete(communityLikes).where(eq(communityLikes.id, existing.id))
      await db
        .update(momentComments)
        .set({ likeCount: sql`max(${momentComments.likeCount} - 1, 0)` })
        .where(eq(momentComments.id, commentId))
    } else {
      await db.insert(communityLikes).values({
        userId: request.user.userId,
        targetType: 'moment_comment',
        targetId: commentId,
      })
      await db
        .update(momentComments)
        .set({ likeCount: sql`${momentComments.likeCount} + 1` })
        .where(eq(momentComments.id, commentId))
    }

    const [updated] = await db
      .select()
      .from(momentComments)
      .where(eq(momentComments.id, commentId))
      .limit(1)
    return { success: true, liked: !existing, likeCount: updated.likeCount }
  })
}
