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
  email: z.string().email(),
  password: z.string(),
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

    const { email, password } = parsed.data

    // 查找用户
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
    if (!user) {
      return reply.status(401).send({ error: '邮箱或密码错误' })
    }

    // 检查用户状态
    if (user.status === 'disabled') {
      return reply.status(403).send({ error: '账号已被禁用' })
    }

    // 验证密码
    const valid = await comparePassword(password, user.passwordHash)
    if (!valid) {
      return reply.status(401).send({ error: '邮箱或密码错误' })
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
        role: user.role,
      },
      token,
    }
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
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    }
  })
}
