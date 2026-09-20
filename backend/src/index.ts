import Fastify from 'fastify'
import cors from '@fastify/cors'
import { env } from './utils/env.js'
import { db } from './db/index.js'
import { users, systemConfig } from './db/schema.js'
import { eq } from 'drizzle-orm'
import { hashPassword } from './utils/auth.js'
import { authRoutes } from './routes/auth.js'
import { newsRoutes } from './routes/news.js'
import { favoriteRoutes } from './routes/favorites.js'
import { adminRoutes } from './routes/admin/index.js'
import { startScheduler, fetchAllSources } from './scheduler/index.js'
import { processAllPending } from './ai/index.js'

const app = Fastify({
  logger: true,
})

// 注册 CORS
await app.register(cors, {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})

// 注册路由
await app.register(authRoutes, { prefix: '/api/auth' })
await app.register(newsRoutes, { prefix: '/api/news' })
await app.register(favoriteRoutes, { prefix: '/api/favorites' })
await app.register(adminRoutes, { prefix: '/api/admin' })

// 健康检查
app.get('/api/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

// 手动触发抓取（管理员）
app.post(
  '/api/admin/fetch',
  {
    preHandler: async (request, reply) => {
      // 简单的权限检查
      const authHeader = request.headers.authorization
      if (!authHeader) {
        return reply.status(401).send({ error: '未授权' })
      }
    },
  },
  async () => {
    // 异步执行，不等待完成
    fetchAllSources().then(() => processAllPending())
    return { success: true, message: '抓取任务已触发' }
  }
)

// 初始化默认数据
async function initializeDefaults() {
  // 检查是否存在管理员账号
  const existingAdmin = await db.select().from(users).where(eq(users.role, 'admin')).limit(1)

  if (existingAdmin.length === 0) {
    // 创建默认管理员
    const passwordHash = await hashPassword(env.ADMIN_PASSWORD)
    await db.insert(users).values({
      username: env.ADMIN_USERNAME,
      email: env.ADMIN_EMAIL,
      passwordHash,
      role: 'admin',
      status: 'active',
    })
    app.log.info('✅ 默认管理员账号已创建')
  }

  // 初始化默认配置
  const defaultConfigs = [
    { key: 'invite_code', value: JSON.stringify(env.INVITE_CODE) },
    { key: 'registration_enabled', value: JSON.stringify(true) },
    { key: 'ai_api_key', value: JSON.stringify(env.AI_API_KEY || '') },
    { key: 'ai_base_url', value: JSON.stringify(env.AI_BASE_URL) },
    { key: 'ai_model', value: JSON.stringify(env.AI_MODEL) },
    { key: 'fetch_interval', value: JSON.stringify(30) },
  ]

  for (const config of defaultConfigs) {
    const existing = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.key, config.key))
      .limit(1)
    if (existing.length === 0) {
      await db.insert(systemConfig).values(config)
    }
  }

  app.log.info('✅ 默认配置已初始化')
}

// 启动服务器
async function start() {
  try {
    await initializeDefaults()

    // 启动定时任务
    startScheduler()

    await app.listen({ port: env.PORT, host: env.HOST })
    app.log.info(`🚀 服务器已启动: http://${env.HOST}:${env.PORT}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
