import { FastifyInstance } from 'fastify'
import { authMiddleware, adminMiddleware } from '../../middleware/auth.js'
import { sourceRoutes } from './sources.js'
import { userRoutes } from './users.js'
import { contentRoutes } from './content.js'
import { configRoutes } from './config.js'
import { statsRoutes } from './stats.js'
import { logRoutes } from './logs.js'

export async function adminRoutes(app: FastifyInstance) {
  // 所有管理员路由都需要认证和管理员权限
  app.addHook('preHandler', authMiddleware)
  app.addHook('preHandler', adminMiddleware)

  await app.register(sourceRoutes, { prefix: '/sources' })
  await app.register(userRoutes, { prefix: '/users' })
  await app.register(contentRoutes, { prefix: '/content' })
  await app.register(configRoutes, { prefix: '/config' })
  await app.register(statsRoutes, { prefix: '/stats' })
  await app.register(logRoutes, { prefix: '/logs' })
}
