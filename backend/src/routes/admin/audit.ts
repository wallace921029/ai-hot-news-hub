import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { getOperationLogs } from '../../services/audit.js'

const listSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  userId: z.coerce.number().optional(),
  resource: z.string().optional(),
})

export async function auditRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const parsed = listSchema.safeParse(request.query)
    const params = parsed.success ? parsed.data : {}
    return getOperationLogs(params)
  })
}
