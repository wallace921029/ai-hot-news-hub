import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../../db/index.js'
import { systemConfig } from '../../db/schema.js'
import { eq } from 'drizzle-orm'
import { getAutoFetchEnabled, setAutoFetchEnabled } from '../../scheduler/index.js'

const configSchema = z.object({
  inviteCode: z.string().optional(),
  registrationEnabled: z.boolean().optional(),
  fetchInterval: z.number().min(5).max(1440).optional(),
  aiApiKey: z.string().optional(),
  aiBaseUrl: z.string().optional(),
  aiModel: z.string().optional(),
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
      fetchInterval: configMap.fetch_interval || 30,
      autoFetchEnabled: getAutoFetchEnabled(),
      aiApiKey: configMap.ai_api_key || '',
      aiBaseUrl: configMap.ai_base_url || '',
      aiModel: configMap.ai_model || '',
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
      data.fetchInterval !== undefined && {
        key: 'fetch_interval',
        value: JSON.stringify(data.fetchInterval),
      },
      data.aiApiKey !== undefined &&
        data.aiApiKey !== '' && { key: 'ai_api_key', value: JSON.stringify(data.aiApiKey) },
      data.aiBaseUrl !== undefined && {
        key: 'ai_base_url',
        value: JSON.stringify(data.aiBaseUrl),
      },
      data.aiModel !== undefined && {
        key: 'ai_model',
        value: JSON.stringify(data.aiModel),
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

  // 获取自动抓取状态
  app.get('/auto-fetch', async () => {
    return { enabled: getAutoFetchEnabled() }
  })

  // 切换自动抓取
  app.put('/auto-fetch', async (request) => {
    const { enabled } = request.body as { enabled: boolean }
    await setAutoFetchEnabled(enabled)
    return { enabled: getAutoFetchEnabled() }
  })

  // 获取 AI 可用模型列表
  app.post('/ai/models', async (request, reply) => {
    const { baseUrl, apiKey } = request.body as { baseUrl: string; apiKey: string }

    if (!baseUrl || !apiKey) {
      return reply.status(400).send({ error: '请提供 Base URL 和 API Key' })
    }

    try {
      const response = await fetch(`${baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        return reply.status(response.status).send({ error: '获取模型列表失败' })
      }

      const data = (await response.json()) as {
        data: Array<{ id: string; object: string }>
      }

      const models = (data.data || []).map((m) => m.id).sort()

      return { models }
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : '获取模型列表失败',
      })
    }
  })
}
