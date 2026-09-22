import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/index.js'
import { users, systemConfig } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { hashPassword, comparePassword, generateToken } from '../utils/auth.js'
import { authMiddleware } from '../middleware/auth.js'

const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6),
  inviteCode: z.string(),
})

const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string(),
})

const profileSchema = z.object({
  nickname: z.string().max(50).optional(),
  avatar: z
    .string()
    .regex(/^[a-zA-Z]+:[a-zA-Z0-9_-]{1,32}$/)
    .optional(),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
})

export async function authRoutes(app: FastifyInstance) {
  // 注册
  app.post('/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: '参数错误', details: parsed.error.flatten() })
    }

    const { username, email, password, inviteCode } = parsed.data

    // 检查注册是否开启
    const regConfig = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.key, 'registration_enabled'))
      .limit(1)
    if (regConfig.length > 0 && !JSON.parse(regConfig[0].value)) {
      return reply.status(403).send({ error: '注册已关闭' })
    }

    // 验证邀请码
    const inviteConfig = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.key, 'invite_code'))
      .limit(1)
    if (inviteConfig.length > 0 && JSON.parse(inviteConfig[0].value) !== inviteCode) {
      return reply.status(400).send({ error: '邀请码无效' })
    }

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

    // 创建用户
    const passwordHash = await hashPassword(password)
    const [newUser] = await db
      .insert(users)
      .values({
        username,
        email,
        passwordHash,
        role: 'user',
        status: 'active',
      })
      .returning()

    // 生成 Token
    const token = generateToken({
      userId: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role as 'admin' | 'user',
    })

    return {
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        nickname: newUser.nickname,
        avatar: newUser.avatar,
        role: newUser.role,
      },
      token,
    }
  })

  // 登录
  app.post('/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: '参数错误', details: parsed.error.flatten() })
    }

    const { identifier, password } = parsed.data

    // 查找用户：包含 @ 按邮箱查找，否则按用户名查找
    const isEmail = identifier.includes('@')
    const [user] = await db
      .select()
      .from(users)
      .where(isEmail ? eq(users.email, identifier) : eq(users.username, identifier))
      .limit(1)
    if (!user) {
      return reply.status(401).send({ error: '账号或密码错误' })
    }

    // 检查用户状态
    if (user.status === 'disabled') {
      return reply.status(403).send({ error: '账号已被禁用' })
    }

    // 验证密码
    const valid = await comparePassword(password, user.passwordHash)
    if (!valid) {
      return reply.status(401).send({ error: '账号或密码错误' })
    }

    // 生成 Token
    const token = generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role as 'admin' | 'user',
    })

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        nickname: user.nickname,
        avatar: user.avatar,
        role: user.role,
      },
      token,
    }
  })

  // 更新个人资料（昵称、头像）
  app.put('/profile', { preHandler: [authMiddleware] }, async (request, reply) => {
    const parsed = profileSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: '参数错误', details: parsed.error.flatten() })
    }

    const data = parsed.data
    const [updated] = await db
      .update(users)
      .set({
        ...(data.nickname !== undefined && { nickname: data.nickname.trim() || null }),
        ...(data.avatar !== undefined && { avatar: data.avatar }),
        updatedAt: new Date(),
      })
      .where(eq(users.id, request.user.userId))
      .returning()

    if (!updated) {
      return reply.status(404).send({ error: '用户不存在' })
    }

    return {
      id: updated.id,
      username: updated.username,
      email: updated.email,
      nickname: updated.nickname,
      avatar: updated.avatar,
      role: updated.role,
    }
  })

  // 修改密码
  app.put('/password', { preHandler: [authMiddleware] }, async (request, reply) => {
    const parsed = passwordSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: '参数错误', details: parsed.error.flatten() })
    }

    const { currentPassword, newPassword } = parsed.data

    const [user] = await db.select().from(users).where(eq(users.id, request.user.userId)).limit(1)
    if (!user) {
      return reply.status(404).send({ error: '用户不存在' })
    }

    const valid = await comparePassword(currentPassword, user.passwordHash)
    if (!valid) {
      return reply.status(401).send({ error: '当前密码错误' })
    }

    await db
      .update(users)
      .set({ passwordHash: await hashPassword(newPassword), updatedAt: new Date() })
      .where(eq(users.id, user.id))

    return { success: true }
  })

  // 获取当前用户信息
  app.get('/me', { preHandler: [authMiddleware] }, async (request) => {
    const [user] = await db.select().from(users).where(eq(users.id, request.user.userId)).limit(1)
    if (!user) {
      throw new Error('用户不存在')
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      nickname: user.nickname,
      avatar: user.avatar,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    }
  })
}
