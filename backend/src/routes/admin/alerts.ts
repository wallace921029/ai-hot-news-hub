import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { getAlerts, resolveAlert } from '../../services/alerts.js'

const listSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  resolved: z.coerce.boolean().optional(),
})

export async function alertsRoutes(app: FastifyInstance) {
  // 获取告警列表
  app.get('/', async (request) => {
    const parsed = listSchema.safeParse(request.query)
    const params = parsed.success ? parsed.data : {}
    return getAlerts(params)
  })

  // 解决告警
  app.put('/:id/resolve', async (request) => {
    const { id } = request.params as { id: string }
    await resolveAlert(parseInt(id))
    return { success: true }
  })
}
