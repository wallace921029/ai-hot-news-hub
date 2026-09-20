import { FastifyRequest, FastifyReply } from 'fastify'
import { verifyToken, type JWTPayload } from '../utils/auth.js'

// 扩展 FastifyRequest 类型
declare module 'fastify' {
  interface FastifyRequest {
    user: JWTPayload
  }
}

// 认证中间件
export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ error: '未提供认证令牌' })
  }

  const token = authHeader.substring(7)

  try {
    const payload = verifyToken(token)
    request.user = payload
  } catch {
    return reply.status(401).send({ error: '无效或过期的认证令牌' })
  }
}

// 管理员权限中间件
export async function adminMiddleware(request: FastifyRequest, reply: FastifyReply) {
  if (request.user.role !== 'admin') {
    return reply.status(403).send({ error: '需要管理员权限' })
  }
}
