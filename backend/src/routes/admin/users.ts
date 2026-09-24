import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../../db/index.js'
import { users } from '../../db/schema.js'
import { eq, desc, sql } from 'drizzle-orm'
import { hashPassword } from '../../utils/auth.js'
import { AI_AGENT_USERNAME } from '../../services/ai-agent.js'

const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'user']).default('user'),
})

const updateUserSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  email: z.string().email().optional(),
  role: z.enum(['admin', 'user']).optional(),
  status: z.enum(['active', 'disabled']).optional(),
})

export async function userRoutes(app: FastifyInstance) {
  // 获取用户列表
  app.get('/', async (request) => {
    const query = request.query as Record<string, string>
    const page = Math.max(1, parseInt(query.page) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize) || 15))
    const offset = (page - 1) * pageSize

    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(users)

    const items = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
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

  // 创建用户
  app.post('/', async (request, reply) => {
    const parsed = createUserSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: '参数错误', details: parsed.error.flatten() })
    }

    const { username, email, password, role } = parsed.data

    // 检查用户名是否已存在
    const existingUsername = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1)
    if (existingUsername.length > 0) {
      return reply.status(409).send({ error: '用户名已存在' })
    }

    // 检查邮箱是否已存在
    const existingEmail = await db.select().from(users).where(eq(users.email, email)).limit(1)
    if (existingEmail.length > 0) {
      return reply.status(409).send({ error: '邮箱已被注册' })
    }

    const passwordHash = await hashPassword(password)
    const [newUser] = await db
      .insert(users)
      .values({
        username,
        email,
        passwordHash,
        role,
        status: 'active',
      })
      .returning()

    return {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      status: newUser.status,
      createdAt: newUser.createdAt,
    }
  })

  // 更新用户
  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = updateUserSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: '参数错误', details: parsed.error.flatten() })
    }

    const data = parsed.data
    const [updated] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, parseInt(id)))
      .returning()

    if (!updated) {
      return reply.status(404).send({ error: '用户不存在' })
    }

    return {
      id: updated.id,
      username: updated.username,
      email: updated.email,
      role: updated.role,
      status: updated.status,
    }
  })

  // 删除用户
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    // 不能删除自己
    if (parseInt(id) === request.user.userId) {
      return reply.status(400).send({ error: '不能删除自己的账号' })
    }

    // AI 智能体账号不可删除（删了启动时也会重建，且其评论有外键关联）
    const [target] = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, parseInt(id)))
      .limit(1)
    if (target?.username === AI_AGENT_USERNAME) {
      return reply.status(400).send({ error: 'AI 智能体账号不可删除' })
    }

    const [deleted] = await db
      .delete(users)
      .where(eq(users.id, parseInt(id)))
      .returning()

    if (!deleted) {
      return reply.status(404).send({ error: '用户不存在' })
    }

    return { success: true }
  })

  // 重置密码
  app.put('/:id/reset-password', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { password } = request.body as { password: string }

    if (!password || password.length < 6) {
      return reply.status(400).send({ error: '密码至少 6 位' })
    }

    const passwordHash = await hashPassword(password)
    const [updated] = await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, parseInt(id)))
      .returning()

    if (!updated) {
      return reply.status(404).send({ error: '用户不存在' })
    }

    return { success: true }
  })
}
