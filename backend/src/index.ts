import Fastify from 'fastify'
import cors from '@fastify/cors'
import { env } from './utils/env.js'
import { db } from './db/index.js'
import { users, systemConfig } from './db/schema.js'
import { eq, asc } from 'drizzle-orm'
import { hashPassword, comparePassword } from './utils/auth.js'
import { authRoutes } from './routes/auth.js'
import { newsRoutes } from './routes/news.js'
import { favoriteRoutes } from './routes/favorites.js'
import { communityRoutes } from './routes/community.js'
import { momentRoutes } from './routes/moments.js'
import { uploadRoutes } from './routes/uploads.js'
import { adminRoutes } from './routes/admin/index.js'
import { startScheduler, fetchAllSources } from './scheduler/index.js'
import { migrateBuiltinApiSources } from './db/migrate.js'

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

// 静态资源：上传图片
import fastifyStatic from '@fastify/static'
import fastifyMultipart from '@fastify/multipart'
import { UPLOAD_ROOT } from './utils/uploads.js'

await app.register(fastifyMultipart, {
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
})
await app.register(fastifyStatic, {
  root: UPLOAD_ROOT,
  prefix: '/uploads/',
  decorateReply: false,
})

// 注册路由
await app.register(authRoutes, { prefix: '/api/auth' })
await app.register(newsRoutes, { prefix: '/api/news' })
await app.register(favoriteRoutes, { prefix: '/api/favorites' })
await app.register(uploadRoutes, { prefix: '/api/uploads' })
await app.register(communityRoutes, { prefix: '/api/community' })
await app.register(momentRoutes, { prefix: '/api/moments' })
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
      const authHeader = request.headers.authorization
      if (!authHeader) {
        return reply.status(401).send({ error: '未授权' })
      }
    },
  },
  async () => {
    fetchAllSources().catch(console.error)
    return { success: true, message: '抓取任务已触发' }
  }
)

// 初始化默认数据
async function initializeDefaults() {
  // 「代码即订阅」迁移：旧库 API 源迁到 code 身份 + 补齐 source_states（幂等，须在调度器/路由读取前执行）
  await migrateBuiltinApiSources()

  // 每次启动将管理员账号同步为 .env 配置（取最早创建的管理员，即引导账号）
  const [bootstrapAdmin] = await db
    .select()
    .from(users)
    .where(eq(users.role, 'admin'))
    .orderBy(asc(users.id))
    .limit(1)

  if (!bootstrapAdmin) {
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
  } else {
    const passwordMatches = await comparePassword(env.ADMIN_PASSWORD, bootstrapAdmin.passwordHash)
    if (
      bootstrapAdmin.username !== env.ADMIN_USERNAME ||
      bootstrapAdmin.email !== env.ADMIN_EMAIL ||
      !passwordMatches
    ) {
      try {
        await db
          .update(users)
          .set({
            username: env.ADMIN_USERNAME,
            email: env.ADMIN_EMAIL,
            passwordHash: await hashPassword(env.ADMIN_PASSWORD),
          })
          .where(eq(users.id, bootstrapAdmin.id))
        app.log.info('✅ 管理员账号已按 .env 同步更新')
      } catch (err) {
        app.log.error(`⚠️ 管理员账号同步失败（.env 的用户名/邮箱可能与其他账号冲突）: ${err}`)
      }
    }
  }

  // 初始化默认配置
  const defaultConfigs = [
    { key: 'invite_code', value: JSON.stringify(env.INVITE_CODE) },
    { key: 'registration_enabled', value: JSON.stringify(true) },
    { key: 'rss_fetch_interval', value: JSON.stringify(30) },
    { key: 'api_fetch_interval', value: JSON.stringify(30) },
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
    await startScheduler()

    await app.listen({ port: env.PORT, host: env.HOST })
    app.log.info(`🚀 服务器已启动: http://${env.HOST}:${env.PORT}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
