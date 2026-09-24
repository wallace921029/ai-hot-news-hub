import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/index.js'
import { communityPosts, communityComments, communityLikes, users } from '../db/schema.js'
import { eq, and, desc, asc, sql, like, or, isNull, inArray } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth.js'
import { cleanupUploadsByOriginalUrls, extractOriginalUrlsFromHtml } from '../utils/uploads.js'
import {
  checkProactiveAllowed,
  checkMentionAllowed,
  containsMention,
  getAgentNickname,
  getDisplayName,
  reserveMentionLog,
  reserveProactiveLog,
  runMentionReply,
  runProactiveReply,
} from '../services/ai-agent.js'

const createPostSchema = z.object({
  title: z.string().trim().min(1, '标题不能为空').max(100, '标题最多 100 字'),
  content: z.string().trim().min(1, '内容不能为空').max(20000, '内容最多 20000 字'),
})

const updatePostSchema = z.object({
  title: z.string().trim().min(1, '标题不能为空').max(100, '标题最多 100 字').optional(),
  content: z.string().trim().min(1, '内容不能为空').max(20000, '内容最多 20000 字').optional(),
})

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

export async function communityRoutes(app: FastifyInstance) {
  // 社区接口全部需要登录
  app.addHook('preHandler', authMiddleware)

  // 帖子列表
  app.get('/posts', async (request) => {
    const query = request.query as Record<string, string>
    const page = Math.max(1, parseInt(query.page) || 1)
    const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize) || 10))
    const offset = (page - 1) * pageSize
    const search = (query.search || '').trim()
    const mine = query.mine === '1'

    const conditions = []
    if (mine) conditions.push(eq(communityPosts.userId, request.user.userId))
    if (search) {
      const pattern = `%${search}%`
      conditions.push(
        or(like(communityPosts.title, pattern), like(communityPosts.content, pattern))
      )
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(communityPosts)
      .where(where)

    const rows = await db
      .select({
        id: communityPosts.id,
        userId: communityPosts.userId,
        title: communityPosts.title,
        content: communityPosts.content,
        likeCount: communityPosts.likeCount,
        commentCount: communityPosts.commentCount,
        createdAt: communityPosts.createdAt,
        updatedAt: communityPosts.updatedAt,
        authorId: users.id,
        username: users.username,
        nickname: users.nickname,
        avatar: users.avatar,
      })
      .from(communityPosts)
      .leftJoin(users, eq(communityPosts.userId, users.id))
      .where(where)
      .orderBy(desc(communityPosts.id))
      .limit(pageSize)
      .offset(offset)

    const postIds = rows.map((r) => r.id)
    const likedSet = new Set<number>()
    if (postIds.length > 0) {
      const liked = await db
        .select({ targetId: communityLikes.targetId })
        .from(communityLikes)
        .where(
          and(
            eq(communityLikes.userId, request.user.userId),
            eq(communityLikes.targetType, 'post'),
            sql`${communityLikes.targetId} IN (${sql.join(
              postIds.map((id) => sql`${id}`),
              sql`, `
            )})`
          )
        )
      for (const l of liked) likedSet.add(l.targetId)
    }

    return {
      items: rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        title: r.title,
        content: r.content,
        likeCount: r.likeCount,
        commentCount: r.commentCount,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
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

  // 发帖
  app.post('/posts', async (request, reply) => {
    const parsed = createPostSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0]?.message || '参数错误' })
    }

    const [post] = await db
      .insert(communityPosts)
      .values({
        userId: request.user.userId,
        title: parsed.data.title,
        content: parsed.data.content,
      })
      .returning()

    // AI 智能体：新帖主动评论一条（正文里的 @ 只走这一条，不双重回复）
    let aiPending = false
    const proactive = await checkProactiveAllowed(request.user.userId)
    if (proactive.ok && proactive.config) {
      const logId = await reserveProactiveLog('post', post.id, request.user.userId)
      aiPending = true
      runProactiveReply({
        logId,
        config: proactive.config,
        agentId: proactive.agentId,
        targetType: 'post',
        postId: post.id,
        publisherName: '',
        title: post.title,
        content: post.content,
      })
    }

    return { success: true, post, aiPending }
  })

  // 帖子详情
  app.get('/posts/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const postId = parseInt(id)
    if (!postId) return reply.status(400).send({ error: '参数错误' })

    const [row] = await db
      .select({
        id: communityPosts.id,
        userId: communityPosts.userId,
        title: communityPosts.title,
        content: communityPosts.content,
        likeCount: communityPosts.likeCount,
        commentCount: communityPosts.commentCount,
        createdAt: communityPosts.createdAt,
        updatedAt: communityPosts.updatedAt,
        authorId: users.id,
        username: users.username,
        nickname: users.nickname,
        avatar: users.avatar,
      })
      .from(communityPosts)
      .leftJoin(users, eq(communityPosts.userId, users.id))
      .where(eq(communityPosts.id, postId))
      .limit(1)

    if (!row) return reply.status(404).send({ error: '帖子不存在' })

    const [liked] = await db
      .select()
      .from(communityLikes)
      .where(
        and(
          eq(communityLikes.userId, request.user.userId),
          eq(communityLikes.targetType, 'post'),
          eq(communityLikes.targetId, postId)
        )
      )
      .limit(1)

    return {
      ...row,
      likedByMe: !!liked,
      author: row.authorId
        ? toAuthor({
            id: row.authorId,
            username: row.username!,
            nickname: row.nickname,
            avatar: row.avatar,
          })
        : null,
    }
  })

  // 更新帖子（本人或管理员）
  app.put('/posts/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const postId = parseInt(id)
    if (!postId) return reply.status(400).send({ error: '参数错误' })
    const parsed = updatePostSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0]?.message || '参数错误' })
    }
    if (!parsed.data.title && !parsed.data.content) {
      return reply.status(400).send({ error: '没有要更新的内容' })
    }

    const [post] = await db
      .select()
      .from(communityPosts)
      .where(eq(communityPosts.id, postId))
      .limit(1)
    if (!post) return reply.status(404).send({ error: '帖子不存在' })
    if (post.userId !== request.user.userId && request.user.role !== 'admin') {
      return reply.status(403).send({ error: '无权编辑' })
    }

    const [updated] = await db
      .update(communityPosts)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(communityPosts.id, postId))
      .returning()

    // 编辑时清理正文中被移除的图片
    if (parsed.data.content !== undefined) {
      const before = new Set(extractOriginalUrlsFromHtml(post.content || ''))
      const after = new Set(extractOriginalUrlsFromHtml(updated.content || ''))
      const removed = [...before].filter((u) => !after.has(u))
      if (removed.length > 0) await cleanupUploadsByOriginalUrls(removed)
    }

    return { success: true, post: updated }
  })

  // 删除帖子（本人或管理员）
  app.delete('/posts/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const postId = parseInt(id)
    if (!postId) return reply.status(400).send({ error: '参数错误' })

    const [post] = await db
      .select()
      .from(communityPosts)
      .where(eq(communityPosts.id, postId))
      .limit(1)
    if (!post) return reply.status(404).send({ error: '帖子不存在' })
    if (post.userId !== request.user.userId && request.user.role !== 'admin') {
      return reply.status(403).send({ error: '无权删除' })
    }

    const commentIds = await db
      .select({ id: communityComments.id })
      .from(communityComments)
      .where(eq(communityComments.postId, postId))

    if (commentIds.length > 0) {
      const ids = commentIds.map((c) => c.id)
      await db.delete(communityLikes).where(
        and(
          eq(communityLikes.targetType, 'comment'),
          sql`${communityLikes.targetId} IN (${sql.join(
            ids.map((v) => sql`${v}`),
            sql`, `
          )})`
        )
      )
    }
    await db.delete(communityComments).where(eq(communityComments.postId, postId))
    await db
      .delete(communityLikes)
      .where(and(eq(communityLikes.targetType, 'post'), eq(communityLikes.targetId, postId)))
    await db.delete(communityPosts).where(eq(communityPosts.id, postId))

    // 级联清理帖子正文中的上传图片
    await cleanupUploadsByOriginalUrls(extractOriginalUrlsFromHtml(post.content || ''))

    return { success: true }
  })

  // 帖子点赞切换
  app.post('/posts/:id/like', async (request, reply) => {
    const { id } = request.params as { id: string }
    const postId = parseInt(id)
    if (!postId) return reply.status(400).send({ error: '参数错误' })

    const [post] = await db
      .select()
      .from(communityPosts)
      .where(eq(communityPosts.id, postId))
      .limit(1)
    if (!post) return reply.status(404).send({ error: '帖子不存在' })

    const [existing] = await db
      .select()
      .from(communityLikes)
      .where(
        and(
          eq(communityLikes.userId, request.user.userId),
          eq(communityLikes.targetType, 'post'),
          eq(communityLikes.targetId, postId)
        )
      )
      .limit(1)

    if (existing) {
      await db.delete(communityLikes).where(eq(communityLikes.id, existing.id))
      await db
        .update(communityPosts)
        .set({ likeCount: sql`max(${communityPosts.likeCount} - 1, 0)` })
        .where(eq(communityPosts.id, postId))
      const [updated] = await db
        .select()
        .from(communityPosts)
        .where(eq(communityPosts.id, postId))
        .limit(1)
      return { success: true, liked: false, likeCount: updated.likeCount }
    }

    await db.insert(communityLikes).values({
      userId: request.user.userId,
      targetType: 'post',
      targetId: postId,
    })
    await db
      .update(communityPosts)
      .set({ likeCount: sql`${communityPosts.likeCount} + 1` })
      .where(eq(communityPosts.id, postId))
    const [updated] = await db
      .select()
      .from(communityPosts)
      .where(eq(communityPosts.id, postId))
      .limit(1)
    return { success: true, liked: true, likeCount: updated.likeCount }
  })

  // 评论列表（按时间正序，主楼分页，单层回复）
  app.get('/posts/:id/comments', async (request, reply) => {
    const { id } = request.params as { id: string }
    const postId = parseInt(id)
    if (!postId) return reply.status(400).send({ error: '参数错误' })
    const query = request.query as Record<string, string>
    const page = Math.max(1, parseInt(query.page) || 1)
    const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize) || 20))
    const offset = (page - 1) * pageSize

    const [post] = await db
      .select()
      .from(communityPosts)
      .where(eq(communityPosts.id, postId))
      .limit(1)
    if (!post) return reply.status(404).send({ error: '帖子不存在' })

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(communityComments)
      .where(and(eq(communityComments.postId, postId), isNull(communityComments.parentCommentId)))

    const topRows = await db
      .select({
        id: communityComments.id,
        postId: communityComments.postId,
        userId: communityComments.userId,
        parentCommentId: communityComments.parentCommentId,
        content: communityComments.content,
        likeCount: communityComments.likeCount,
        createdAt: communityComments.createdAt,
        authorId: users.id,
        username: users.username,
        nickname: users.nickname,
        avatar: users.avatar,
      })
      .from(communityComments)
      .leftJoin(users, eq(communityComments.userId, users.id))
      .where(and(eq(communityComments.postId, postId), isNull(communityComments.parentCommentId)))
      .orderBy(asc(communityComments.id))
      .limit(pageSize)
      .offset(offset)

    const topIds = topRows.map((r) => r.id)
    let replyRows: typeof topRows = []
    if (topIds.length > 0) {
      replyRows = await db
        .select({
          id: communityComments.id,
          postId: communityComments.postId,
          userId: communityComments.userId,
          parentCommentId: communityComments.parentCommentId,
          content: communityComments.content,
          likeCount: communityComments.likeCount,
          createdAt: communityComments.createdAt,
          authorId: users.id,
          username: users.username,
          nickname: users.nickname,
          avatar: users.avatar,
        })
        .from(communityComments)
        .leftJoin(users, eq(communityComments.userId, users.id))
        .where(
          and(
            eq(communityComments.postId, postId),
            inArray(communityComments.parentCommentId, topIds)
          )
        )
        .orderBy(asc(communityComments.id))
    }

    const allIds = [...topRows.map((r) => r.id), ...replyRows.map((r) => r.id)]
    const likedSet = new Set<number>()
    if (allIds.length > 0) {
      const liked = await db
        .select({ targetId: communityLikes.targetId })
        .from(communityLikes)
        .where(
          and(
            eq(communityLikes.userId, request.user.userId),
            eq(communityLikes.targetType, 'comment'),
            sql`${communityLikes.targetId} IN (${sql.join(
              allIds.map((v) => sql`${v}`),
              sql`, `
            )})`
          )
        )
      for (const l of liked) likedSet.add(l.targetId)
    }

    const replyMap = new Map<number, typeof replyRows>()
    for (const r of replyRows) {
      const pid = r.parentCommentId as number
      if (!replyMap.has(pid)) replyMap.set(pid, [])
      replyMap.get(pid)!.push(r)
    }

    const toComment = (r: (typeof topRows)[number]) => ({
      id: r.id,
      postId: r.postId,
      userId: r.userId,
      parentCommentId: r.parentCommentId,
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

  // 发表评论（支持单层回复）
  app.post('/posts/:id/comments', async (request, reply) => {
    const { id } = request.params as { id: string }
    const postId = parseInt(id)
    if (!postId) return reply.status(400).send({ error: '参数错误' })
    const parsed = createCommentSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0]?.message || '参数错误' })
    }

    const [post] = await db
      .select()
      .from(communityPosts)
      .where(eq(communityPosts.id, postId))
      .limit(1)
    if (!post) return reply.status(404).send({ error: '帖子不存在' })

    let parentCommentId: number | null = null
    if (parsed.data.parentCommentId) {
      const [parent] = await db
        .select()
        .from(communityComments)
        .where(eq(communityComments.id, parsed.data.parentCommentId))
        .limit(1)
      if (!parent || parent.postId !== postId) {
        return reply.status(400).send({ error: '回复的评论不存在' })
      }
      if (parent.parentCommentId) {
        return reply.status(400).send({ error: '只能回复主评论' })
      }
      parentCommentId = parent.id
    }

    const [comment] = await db
      .insert(communityComments)
      .values({
        postId,
        userId: request.user.userId,
        parentCommentId,
        content: parsed.data.content,
      })
      .returning()

    await db
      .update(communityPosts)
      .set({ commentCount: sql`${communityPosts.commentCount} + 1` })
      .where(eq(communityPosts.id, postId))

    // AI 智能体：评论里 @ 则后台回复一条；超额则同步提示
    let aiQuotaExhausted = false
    let aiPending = false
    let agentUserId: number | null = null
    const nickname = await getAgentNickname()
    if (containsMention(parsed.data.content, nickname)) {
      const check = await checkMentionAllowed(request.user.userId)
      if (check.ok && check.config) {
        const logId = await reserveMentionLog('comment', comment.id, request.user.userId)
        aiPending = true
        agentUserId = check.agentId
        runMentionReply({
          logId,
          config: check.config,
          agentId: check.agentId,
          targetType: 'comment',
          commentId: comment.id,
          postId,
          parentCommentId: comment.parentCommentId,
          authorName: await getDisplayName(request.user.userId),
          mentionContent: parsed.data.content,
          contextText: `标题：${post.title}\n${post.content}`,
          sceneLabel: '议事厅帖子',
        })
      } else if (check.quotaExhausted) {
        aiQuotaExhausted = true
      }
    }

    return { success: true, comment, aiQuotaExhausted, aiPending, agentUserId }
  })

  // 删除评论（本人或管理员；主楼会级联删回复）
  app.delete('/comments/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const commentId = parseInt(id)
    if (!commentId) return reply.status(400).send({ error: '参数错误' })

    const [comment] = await db
      .select()
      .from(communityComments)
      .where(eq(communityComments.id, commentId))
      .limit(1)
    if (!comment) return reply.status(404).send({ error: '评论不存在' })
    if (comment.userId !== request.user.userId && request.user.role !== 'admin') {
      return reply.status(403).send({ error: '无权删除' })
    }

    const isTop = !comment.parentCommentId
    let idsToDelete = [commentId]
    if (isTop) {
      const replies = await db
        .select({ id: communityComments.id })
        .from(communityComments)
        .where(eq(communityComments.parentCommentId, commentId))
      for (const r of replies) idsToDelete.push(r.id)
    }

    await db.delete(communityLikes).where(
      and(
        eq(communityLikes.targetType, 'comment'),
        sql`${communityLikes.targetId} IN (${sql.join(
          idsToDelete.map((v) => sql`${v}`),
          sql`, `
        )})`
      )
    )
    await db.delete(communityComments).where(
      sql`${communityComments.id} IN (${sql.join(
        idsToDelete.map((v) => sql`${v}`),
        sql`, `
      )})`
    )
    await db
      .update(communityPosts)
      .set({ commentCount: sql`max(${communityPosts.commentCount} - ${idsToDelete.length}, 0)` })
      .where(eq(communityPosts.id, comment.postId))

    return { success: true }
  })

  // 评论点赞切换
  app.post('/comments/:id/like', async (request, reply) => {
    const { id } = request.params as { id: string }
    const commentId = parseInt(id)
    if (!commentId) return reply.status(400).send({ error: '参数错误' })

    const [comment] = await db
      .select()
      .from(communityComments)
      .where(eq(communityComments.id, commentId))
      .limit(1)
    if (!comment) return reply.status(404).send({ error: '评论不存在' })

    const [existing] = await db
      .select()
      .from(communityLikes)
      .where(
        and(
          eq(communityLikes.userId, request.user.userId),
          eq(communityLikes.targetType, 'comment'),
          eq(communityLikes.targetId, commentId)
        )
      )
      .limit(1)

    if (existing) {
      await db.delete(communityLikes).where(eq(communityLikes.id, existing.id))
      await db
        .update(communityComments)
        .set({ likeCount: sql`max(${communityComments.likeCount} - 1, 0)` })
        .where(eq(communityComments.id, commentId))
      const [updated] = await db
        .select()
        .from(communityComments)
        .where(eq(communityComments.id, commentId))
        .limit(1)
      return { success: true, liked: false, likeCount: updated.likeCount }
    }

    await db.insert(communityLikes).values({
      userId: request.user.userId,
      targetType: 'comment',
      targetId: commentId,
    })
    await db
      .update(communityComments)
      .set({ likeCount: sql`${communityComments.likeCount} + 1` })
      .where(eq(communityComments.id, commentId))
    const [updated] = await db
      .select()
      .from(communityComments)
      .where(eq(communityComments.id, commentId))
      .limit(1)
    return { success: true, liked: true, likeCount: updated.likeCount }
  })
}
