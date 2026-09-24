import { db } from '../db/index.js'
import { systemConfig } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { env } from '../utils/env.js'

export interface AiChatConfig {
  baseUrl: string
  apiKey: string
  model: string
}

export interface AiChatOptions {
  system: string
  user: string
  maxTokens: number
  temperature: number
  timeoutMs?: number
}

export interface AiChatResult {
  content: string
  tokensUsed: number | null
}

const DEFAULT_TIMEOUT_MS = 60_000

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

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: opts.system },
          { role: 'user', content: opts.user },
        ],
        max_tokens: opts.maxTokens,
        temperature: opts.temperature,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`AI 请求失败（HTTP ${response.status}）：${text.slice(0, 200)}`)
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
      usage?: { total_tokens?: number }
    }
    const content = data.choices?.[0]?.message?.content?.trim() ?? ''
    if (!content) {
      throw new Error('AI 返回为空')
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
