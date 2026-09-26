import { db } from '../db/index.js'
import { systemConfig } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { env } from '../utils/env.js'
import { proxyFetch } from '../utils/http.js'

export interface AiChatConfig {
  baseUrl: string
  apiKey: string
  model: string
}

export interface AiChatOptions {
  system: string
  user: string
  /** 不传则使用模型默认（不限制回复长度） */
  maxTokens?: number | null
  temperature: number
  topP?: number | null
  frequencyPenalty?: number | null
  presencePenalty?: number | null
  /** 思考开关（智谱 GLM：enabled/disabled；注意 GLM-5.3 系强制思考，传 disabled 会 400） */
  thinking?: 'enabled' | 'disabled' | null
  /** 思考程度（GLM-5.3 系仅 max/high/low；OpenAI o 系 low/medium/high；不传用模型默认） */
  reasoningEffort?: string | null
  timeoutMs?: number
}

export interface AiChatResult {
  content: string
  tokensUsed: number | null
}

const DEFAULT_TIMEOUT_MS = 120_000

/** 读取 AI 连接配置：DB（管理端设置）优先，env 兜底 */
export async function getAiChatConfig(): Promise<AiChatConfig | null> {
  const rows = await db.select().from(systemConfig)
  const map: Record<string, unknown> = {}
  for (const row of rows) {
    try {
      map[row.key] = JSON.parse(row.value)
    } catch {
      // 忽略脏数据
    }
  }

  const baseUrl = (typeof map.ai_base_url === 'string' && map.ai_base_url) || env.AI_BASE_URL || ''
  const apiKey = (typeof map.ai_api_key === 'string' && map.ai_api_key) || env.AI_API_KEY || ''
  const model = (typeof map.ai_model === 'string' && map.ai_model) || env.AI_MODEL || ''

  if (!baseUrl || !apiKey || !model) return null
  return { baseUrl: baseUrl.replace(/\/+$/, ''), apiKey, model }
}

/** OpenAI-compatible chat completions（兼容各家 /v1 代理） */
export async function chatCompletion(opts: AiChatOptions): Promise<AiChatResult> {
  const config = await getAiChatConfig()
  if (!config) {
    throw new Error('未配置 AI（缺少 Base URL / Key / 模型）')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)

  const body: Record<string, unknown> = {
    model: config.model,
    messages: [
      { role: 'system', content: opts.system },
      { role: 'user', content: opts.user },
    ],
    temperature: opts.temperature,
  }
  // 标准采样参数：只透传已配置的；maxTokens 缺省 = 不限制长度
  if (opts.maxTokens != null) body.max_tokens = opts.maxTokens
  if (opts.topP != null) body.top_p = opts.topP
  if (opts.frequencyPenalty != null) body.frequency_penalty = opts.frequencyPenalty
  if (opts.presencePenalty != null) body.presence_penalty = opts.presencePenalty
  // 思考控制（provider 专有，按需透传；配错模型会 400）
  if (opts.thinking != null) body.thinking = { type: opts.thinking }
  if (opts.reasoningEffort != null) body.reasoning_effort = opts.reasoningEffort

  try {
    const response = await proxyFetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`AI 请求失败（HTTP ${response.status}）：${text.slice(0, 200)}`)
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string }; finish_reason?: string }>
      usage?: { total_tokens?: number }
    }
    const choice = data.choices?.[0]
    const content = choice?.message?.content?.trim() ?? ''
    if (!content) {
      throw new Error(
        choice?.finish_reason === 'length'
          ? 'AI 输出被截断且为空（max_tokens 可能被思考过程耗尽，调大或去掉限制）'
          : 'AI 返回为空'
      )
    }

    return { content, tokensUsed: data.usage?.total_tokens ?? null }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('AI 请求超时')
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

/** 读单个 system_config 键（JSON 解析） */
export async function getSystemConfig<T>(key: string, fallback: T): Promise<T> {
  const [row] = await db.select().from(systemConfig).where(eq(systemConfig.key, key)).limit(1)
  if (!row) return fallback
  try {
    return JSON.parse(row.value) as T
  } catch {
    return fallback
  }
}
