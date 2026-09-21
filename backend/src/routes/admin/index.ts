import { FastifyInstance } from 'fastify'
import { authMiddleware, adminMiddleware } from '../../middleware/auth.js'
import { sourceRoutes } from './sources.js'
import { userRoutes } from './users.js'
import { contentRoutes } from './content.js'
import { configRoutes } from './config.js'
import { statsRoutes } from './stats.js'
import { logRoutes } from './logs.js'
import { alertsRoutes } from './alerts.js'
import { auditRoutes } from './audit.js'
import { logOperation } from '../../services/audit.js'

export async function adminRoutes(app: FastifyInstance) {
  // 所有管理员路由都需要认证和管理员权限
  app.addHook('preHandler', authMiddleware)
  app.addHook('preHandler', adminMiddleware)

  // 审计日志：记录所有管理员写操作
  app.addHook('onResponse', async (request, reply) => {
    const method = request.method
    if (!['POST', 'PUT', 'DELETE'].includes(method)) return

    const user = (request as any).user
    if (!user) return

    const url = request.url
    const statusCode = reply.statusCode

    // 解析资源类型和操作
    let resource = 'unknown'
    let action = method.toLowerCase()
    let resourceId: string | undefined

    if (url.includes('/sources')) {
      resource = 'source'
      const match = url.match(/\/sources\/(\d+)/)
      if (match) resourceId = match[1]
    } else if (url.includes('/users')) {
      resource = 'user'
      const match = url.match(/\/users\/(\d+)/)
      if (match) resourceId = match[1]
    } else if (url.includes('/content')) {
      resource = 'content'
      const match = url.match(/\/content\/(\d+)/)
      if (match) resourceId = match[1]
    } else if (url.includes('/config')) {
      resource = 'config'
    } else if (url.includes('/alerts')) {
      resource = 'alert'
      const match = url.match(/\/alerts\/(\d+)/)
      if (match) resourceId = match[1]
    }

    await logOperation({
      userId: user.userId,
      username: user.username || user.email,
      action,
      resource,
      resourceId,
      details: { statusCode, url },
      ipAddress: request.ip,
    })
  })

  await app.register(sourceRoutes, { prefix: '/sources' })
  await app.register(userRoutes, { prefix: '/users' })
  await app.register(contentRoutes, { prefix: '/content' })
  await app.register(configRoutes, { prefix: '/config' })
  await app.register(statsRoutes, { prefix: '/stats' })
  await app.register(logRoutes, { prefix: '/logs' })
  await app.register(alertsRoutes, { prefix: '/alerts' })
  await app.register(auditRoutes, { prefix: '/audit' })
}
