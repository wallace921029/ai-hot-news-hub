import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../../db/index.js'
import { systemConfig, users } from '../../db/schema.js'
import { eq, and, ne } from 'drizzle-orm'
import {
  getAutoFetchEnabled,
  setAutoFetchEnabled,
  applyFetchIntervals,
} from '../../scheduler/index.js'
import {
  DEFAULT_NICKNAME,
  DEFAULT_PERSONA,
  DEFAULT_MAX_TOKENS,
  DEFAULT_TEMPERATURE,
  DEFAULT_DAILY_LIMIT,
  AI_AGENT_USERNAME,
  syncAgentNickname,
} from '../../services/ai-agent.js'
import { env } from '../../utils/env.js'

const configSchema = z.object({
  inviteCode: z.string().optional(),
  registrationEnabled: z.boolean().optional(),
  rssFetchInterval: z.number().min(5).max(1440).optional(),
  apiFetchInterval: z.number().min(5).max(1440).optional(),
  aiApiKey: z.string().optional(),
  aiBaseUrl: z.string().optional(),
  aiModel: z.string().optional(),
  aiAgentEnabled: z.boolean().optional(),
  aiAgentNickname: z.string().min(1).max(50).optional(),
  aiAgentPersona: z.string().min(1).max(8000).optional(),
  aiAgentMaxTokens: z.number().min(1).max(32000).optional(),
  aiAgentTemperature: z.number().min(0).max(2).optional(),
  aiAgentThrottleEnabled: z.boolean().optional(),
  aiAgentDailyLimit: z.number().min(0).max(100000).optional(),
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
      rssFetchInterval: configMap.rss_fetch_interval || 30,
      apiFetchInterval: configMap.api_fetch_interval || 30,
      autoFetchEnabled: getAutoFetchEnabled(),
      aiApiKey: configMap.ai_api_key || '',
      aiBaseUrl: configMap.ai_base_url || '',
      aiModel: configMap.ai_model || '',
      aiAgentEnabled: configMap.ai_agent_enabled ?? false,
      aiAgentNickname: configMap.ai_agent_nickname || DEFAULT_NICKNAME,
      aiAgentPersona: configMap.ai_agent_persona || DEFAULT_PERSONA,
      aiAgentMaxTokens: configMap.ai_agent_max_tokens ?? DEFAULT_MAX_TOKENS,
      aiAgentTemperature: configMap.ai_agent_temperature ?? DEFAULT_TEMPERATURE,
      aiAgentThrottleEnabled: configMap.ai_agent_throttle_enabled ?? true,
      aiAgentDailyLimit: configMap.ai_agent_daily_limit ?? DEFAULT_DAILY_LIMIT,
    }
  })

  // 更新系统配置
  app.put('/', async (request, reply) => {
    const parsed = configSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: '参数错误', details: parsed.error.flatten() })
    }

    const data = parsed.data

    // 开启智能体必须有可用 Key（DB 配置或环境变量兜底）
    if (data.aiAgentEnabled === true) {
      const dbKey = typeof data.aiApiKey === 'string' && data.aiApiKey !== '' ? data.aiApiKey : null
      const [keyRow] = dbKey
        ? [{ value: JSON.stringify(dbKey) }]
        : await db.select().from(systemConfig).where(eq(systemConfig.key, 'ai_api_key')).limit(1)
      let effectiveKey = ''
      try {
        effectiveKey = keyRow ? (JSON.parse(keyRow.value) as string) : ''
      } catch {
        effectiveKey = ''
      }
      if (!effectiveKey && !env.AI_API_KEY) {
        return reply.status(400).send({ error: '启用 AI 智能体需要先配置 API Key' })
      }
    }

    // AI 昵称不可与活人用户重名（改名后历史评论作者名自动跟随）
    let nicknameToSync: string | null = null
    if (data.aiAgentNickname !== undefined) {
      const nickname = data.aiAgentNickname.trim()
      if (!nickname) {
        return reply.status(400).send({ error: 'AI 昵称不能为空' })
      }
      const taken = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.nickname, nickname), ne(users.username, AI_AGENT_USERNAME)))
        .limit(1)
      if (taken.length > 0) {
        return reply.status(409).send({ error: `昵称「${nickname}」已被用户占用` })
      }
      data.aiAgentNickname = nickname
      nicknameToSync = nickname
    }

    const updates = [
      data.inviteCode !== undefined &&
        data.inviteCode !== '' && { key: 'invite_code', value: JSON.stringify(data.inviteCode) },
      data.registrationEnabled !== undefined && {
        key: 'registration_enabled',
        value: JSON.stringify(data.registrationEnabled),
      },
      data.rssFetchInterval !== undefined && {
        key: 'rss_fetch_interval',
        value: JSON.stringify(data.rssFetchInterval),
      },
      data.apiFetchInterval !== undefined && {
        key: 'api_fetch_interval',
        value: JSON.stringify(data.apiFetchInterval),
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
      data.aiAgentEnabled !== undefined && {
        key: 'ai_agent_enabled',
        value: JSON.stringify(data.aiAgentEnabled),
      },
      data.aiAgentNickname !== undefined && {
        key: 'ai_agent_nickname',
        value: JSON.stringify(data.aiAgentNickname),
      },
      data.aiAgentPersona !== undefined && {
        key: 'ai_agent_persona',
        value: JSON.stringify(data.aiAgentPersona),
      },
      data.aiAgentMaxTokens !== undefined && {
        key: 'ai_agent_max_tokens',
        value: JSON.stringify(data.aiAgentMaxTokens),
      },
      data.aiAgentTemperature !== undefined && {
        key: 'ai_agent_temperature',
        value: JSON.stringify(data.aiAgentTemperature),
      },
      data.aiAgentThrottleEnabled !== undefined && {
        key: 'ai_agent_throttle_enabled',
        value: JSON.stringify(data.aiAgentThrottleEnabled),
      },
      data.aiAgentDailyLimit !== undefined && {
        key: 'ai_agent_daily_limit',
        value: JSON.stringify(data.aiAgentDailyLimit),
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

    // 保存后立即生效（内存中的调度间隔同步更新）
    applyFetchIntervals(data.rssFetchInterval, data.apiFetchInterval)

    // 昵称变更同步到智能体用户行（历史评论作者名自动跟随）
    if (nicknameToSync) {
      await syncAgentNickname(nicknameToSync)
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
