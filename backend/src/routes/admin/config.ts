import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../../db/index.js'
import { systemConfig } from '../../db/schema.js'
import { eq } from 'drizzle-orm'

const configSchema = z.object({
  inviteCode: z.string().optional(),
  registrationEnabled: z.boolean().optional(),
  aiApiKey: z.string().optional(),
  aiBaseUrl: z.string().optional(),
  aiModel: z.string().optional(),
  fetchInterval: z.number().min(5).max(1440).optional(),
})

export async function configRoutes(app: FastifyInstance) {
  // 获取系统配置
  app.get('/', async () => {
    const configs = await db.select().from(systemConfig)

    const configMap: Record<string, unknown> = {}
    for (const config of configs) {
      configMap[config.key] = JSON.parse(config.value)
    }

    return {
      inviteCode: configMap.invite_code || '',
      registrationEnabled: configMap.registration_enabled ?? true,
      aiApiKey: configMap.ai_api_key ? '***' : '', // 不返回真实 key
      aiBaseUrl: configMap.ai_base_url || 'https://api.openai.com/v1',
      aiModel: configMap.ai_model || 'gpt-4o-mini',
      fetchInterval: configMap.fetch_interval || 30,
    }
  })

  // 更新系统配置
  app.put('/', async (request, reply) => {
    const parsed = configSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: '参数错误', details: parsed.error.flatten() })
    }

    const data = parsed.data

    const updates = [
      data.inviteCode !== undefined &&
        data.inviteCode !== '' && { key: 'invite_code', value: JSON.stringify(data.inviteCode) },
      data.registrationEnabled !== undefined && {
        key: 'registration_enabled',
        value: JSON.stringify(data.registrationEnabled),
      },
      data.aiApiKey !== undefined &&
        data.aiApiKey !== '' && { key: 'ai_api_key', value: JSON.stringify(data.aiApiKey) },
      data.aiBaseUrl !== undefined &&
        data.aiBaseUrl !== '' && { key: 'ai_base_url', value: JSON.stringify(data.aiBaseUrl) },
      data.aiModel !== undefined &&
        data.aiModel !== '' && { key: 'ai_model', value: JSON.stringify(data.aiModel) },
      data.fetchInterval !== undefined && {
        key: 'fetch_interval',
        value: JSON.stringify(data.fetchInterval),
      },
    ].filter(Boolean)

    for (const update of updates) {
      if (update) {
        const existing = await db
          .select()
          .from(systemConfig)
          .where(eq(systemConfig.key, update.key))
          .limit(1)

        if (existing.length > 0) {
          await db
            .update(systemConfig)
            .set({ value: update.value, updatedAt: new Date() })
            .where(eq(systemConfig.key, update.key))
        } else {
          await db.insert(systemConfig).values(update)
        }
      }
    }

    return { success: true }
  })
}
