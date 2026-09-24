import { db } from '../db/index.js'
import {
  users,
  communityComments,
  momentComments,
  newsComments,
  communityPosts,
  communityMoments,
  aiAgentLogs,
} from '../db/schema.js'
import { eq, and, gte, sql } from 'drizzle-orm'
import { hashPassword } from '../utils/auth.js'
import { chatCompletion, getAiChatConfig, getSystemConfig } from './ai.js'

/** 里子：内部身份永不改；面子（nickname）可随时改 */
export const AI_AGENT_USERNAME = 'ai_agent'
export const AI_AGENT_EMAIL = 'ai-agent@localhost'
export const AI_AGENT_AVATAR = 'adventurer:ai-agent'
/** 与前端 src/lib/avatar.ts 的 avatarStyles 保持一致 */
const AVATAR_STYLES = [
  'adventurer',
  'adventurerNeutral',
  'avataaars',
  'bigSmile',
  'bottts',
  'croodles',
  'funEmoji',
  'lorelei',
  'micah',
  'notionists',
  'openPeeps',
  'toonHead',
] as const

/** 校验 style:seed 头像格式，不合法返回 null */
export function normalizeAgentAvatar(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const idx = v.indexOf(':')
  if (idx <= 0) return null
  const style = v.slice(0, idx)
  const seed = v.slice(idx + 1)
  if (!(AVATAR_STYLES as readonly string[]).includes(style)) return null
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(seed)) return null
  return `${style}:${seed}`
}

export const DEFAULT_NICKNAME = '润土'
export const DEFAULT_PERSONA =
  '你是"润土"，赛博瓜田的土著瓜友，说话带点闰土式土味幽默，偶尔掉一句《故乡》梗；回复紧扣对方的话，不说教、不复读。'
export const DEFAULT_TEMPERATURE = 0.8
export const DEFAULT_DAILY_LIMIT = 20
/** 调用超时默认 120 秒（思考模型慢，后台任务等得起） */
export const DEFAULT_TIMEOUT_SECONDS = 120

export type AgentTargetType = 'moment' | 'post' | 'moment_comment' | 'comment' | 'news_comment'

export interface AgentConfig {
  enabled: boolean
  nickname: string
  persona: string
  /** null = 不传，不限制回复长度 */
  maxTokens: number | null
  temperature: number
  /** null = 不传，使用模型默认 */
  topP: number | null
  frequencyPenalty: number | null
  presencePenalty: number | null
  /** null = 不传；enabled/disabled（注意 GLM-5.3 系强制思考，disabled 会 400） */
  thinking: 'enabled' | 'disabled' | null
  /** null = 不传；GLM-5.3 系仅 max/high/low，OpenAI o 系 low/medium/high */
  reasoningEffort: string | null
  /** 头像 style:seed（恒合法，非法回退默认） */
  avatar: string
  /** 单次调用超时（秒） */
  timeoutSeconds: number
  throttleEnabled: boolean
  dailyLimit: number
}

function asOptionalNumber(v: unknown, min: number, max: number): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null
}

const REASONING_EFFORTS = ['minimal', 'none', 'low', 'medium', 'high', 'xhigh', 'max'] as const

export async function getAgentConfig(): Promise<AgentConfig> {
  const [
    enabled,
    nickname,
    persona,
    maxTokens,
    temperature,
    topP,
    frequencyPenalty,
    presencePenalty,
    thinking,
    reasoningEffort,
    avatar,
    timeoutSeconds,
    throttleEnabled,
    dailyLimit,
  ] = await Promise.all([
    getSystemConfig('ai_agent_enabled', false),
    getSystemConfig('ai_agent_nickname', DEFAULT_NICKNAME),
    getSystemConfig('ai_agent_persona', DEFAULT_PERSONA),
    getSystemConfig<number | null>('ai_agent_max_tokens', null),
    getSystemConfig('ai_agent_temperature', DEFAULT_TEMPERATURE),
    getSystemConfig<number | null>('ai_agent_top_p', null),
    getSystemConfig<number | null>('ai_agent_frequency_penalty', null),
    getSystemConfig<number | null>('ai_agent_presence_penalty', null),
    getSystemConfig<string | null>('ai_agent_thinking', null),
    getSystemConfig<string | null>('ai_agent_reasoning_effort', null),
    getSystemConfig<string | null>('ai_agent_avatar', AI_AGENT_AVATAR),
    getSystemConfig('ai_agent_timeout', DEFAULT_TIMEOUT_SECONDS),
    getSystemConfig('ai_agent_throttle_enabled', true),
    getSystemConfig('ai_agent_daily_limit', DEFAULT_DAILY_LIMIT),
  ])
  return {
    enabled: enabled === true,
    nickname: typeof nickname === 'string' && nickname.trim() ? nickname.trim() : DEFAULT_NICKNAME,
    persona: typeof persona === 'string' && persona.trim() ? persona : DEFAULT_PERSONA,
    maxTokens:
      typeof maxTokens === 'number' && Number.isFinite(maxTokens) && maxTokens >= 1
        ? Math.floor(maxTokens)
        : null,
    temperature:
      typeof temperature === 'number' && temperature >= 0 && temperature <= 2
        ? temperature
        : DEFAULT_TEMPERATURE,
    topP: asOptionalNumber(topP, 0, 1),
    frequencyPenalty: asOptionalNumber(frequencyPenalty, -2, 2),
    presencePenalty: asOptionalNumber(presencePenalty, -2, 2),
    thinking: thinking === 'enabled' || thinking === 'disabled' ? thinking : null,
    reasoningEffort:
      typeof reasoningEffort === 'string' &&
      (REASONING_EFFORTS as readonly string[]).includes(reasoningEffort)
        ? reasoningEffort
        : null,
    avatar: normalizeAgentAvatar(avatar) ?? AI_AGENT_AVATAR,
    timeoutSeconds:
      typeof timeoutSeconds === 'number' && timeoutSeconds >= 10 && timeoutSeconds <= 600
        ? Math.floor(timeoutSeconds)
        : DEFAULT_TIMEOUT_SECONDS,
    throttleEnabled: throttleEnabled !== false,
    dailyLimit: typeof dailyLimit === 'number' && dailyLimit >= 0 ? Math.floor(dailyLimit) : 0,
  }
}

/** 确保智能体用户行存在（启动/首次使用时调用；删了会自动重建） */
export async function ensureAgentUser() {
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.username, AI_AGENT_USERNAME))
    .limit(1)
  if (existing) return existing

  const config = await getAgentConfig()
  const [created] = await db
    .insert(users)
    .values({
      username: AI_AGENT_USERNAME,
      email: AI_AGENT_EMAIL,
      passwordHash: await hashPassword(`ai-agent-${Date.now()}-${Math.random()}`),
      role: 'user',
      status: 'active',
      nickname: config.nickname,
      avatar: config.avatar,
    })
    .returning()
  console.log(`🤖 AI 智能体用户已创建（@${config.nickname}）`)
  return created
}

/** 管理端改名/换头像后同步用户行（历史评论作者自动跟随，无需动数据） */
export async function syncAgentProfile(nickname: string, avatar: string) {
  await db
    .update(users)
    .set({ nickname, avatar, updatedAt: new Date() })
    .where(eq(users.username, AI_AGENT_USERNAME))
}

/** 是否 @ 了智能体（按当前昵称动态匹配） */
export function containsMention(content: string, nickname: string): boolean {
  if (!content || !nickname) return false
  return content.includes(`@${nickname}`)
}

/** 当前显示名（单次查询，供 @ 预检） */
export async function getAgentNickname(): Promise<string> {
  const config = await getAgentConfig()
  return config.nickname
}

/** 用户显示名（nickname 优先） */
export async function getDisplayName(userId: number): Promise<string> {
  const [row] = await db
    .select({ username: users.username, nickname: users.nickname })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  if (!row) return '未知'
  return row.nickname?.trim() || row.username
}

/** 今日 00:00（本地） */
function todayStart(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * 回复前置检查（请求内同步执行）：
 * 开关 / key / 自己人 / 配额。返回 quotaExhausted=true 时调用方应提示用户。
 */
export async function checkMentionAllowed(
  triggerUserId: number
): Promise<{ ok: boolean; quotaExhausted: boolean; agentId: number; config?: AgentConfig }> {
  const agent = await ensureAgentUser()
  const config = await getAgentConfig()

  if (triggerUserId === agent.id) {
    return { ok: false, quotaExhausted: false, agentId: agent.id }
  }
  if (!config.enabled) {
    return { ok: false, quotaExhausted: false, agentId: agent.id }
  }
  const aiConfig = await getAiChatConfig()
  if (!aiConfig) {
    return { ok: false, quotaExhausted: false, agentId: agent.id }
  }

  if (config.throttleEnabled && config.dailyLimit > 0) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(aiAgentLogs)
      .where(
        and(
          eq(aiAgentLogs.trigger, 'mention'),
          eq(aiAgentLogs.userId, triggerUserId),
          gte(aiAgentLogs.createdAt, todayStart())
        )
      )
    if (count >= config.dailyLimit) {
      return { ok: false, quotaExhausted: true, agentId: agent.id }
    }
  }

  return { ok: true, quotaExhausted: false, agentId: agent.id, config }
}

/** 占位一条 pending 日志（计次防并发；后台任务回填结果） */
export async function reserveMentionLog(
  targetType: AgentTargetType,
  targetId: number,
  userId: number
): Promise<number> {
  const [row] = await db
    .insert(aiAgentLogs)
    .values({ targetType, targetId, trigger: 'mention', userId, status: 'pending' })
    .returning()
  return row.id
}

/**
 * 主动评论前置检查（新帖/新动态，请求内同步执行）：
 * 开关 + key + 自己人。主动不计配额。
 */
export async function checkProactiveAllowed(
  publisherId: number
): Promise<{ ok: boolean; agentId: number; config?: AgentConfig }> {
  const agent = await ensureAgentUser()
  if (publisherId === agent.id) {
    return { ok: false, agentId: agent.id }
  }
  const config = await getAgentConfig()
  if (!config.enabled) {
    return { ok: false, agentId: agent.id }
  }
  const aiConfig = await getAiChatConfig()
  if (!aiConfig) {
    return { ok: false, agentId: agent.id }
  }
  return { ok: true, agentId: agent.id, config }
}

export async function reserveProactiveLog(
  targetType: 'moment' | 'post',
  targetId: number,
  userId: number
): Promise<number> {
  const [row] = await db
    .insert(aiAgentLogs)
    .values({ targetType, targetId, trigger: 'proactive', userId, status: 'pending' })
    .returning()
  return row.id
}

function updateLog(logId: number, patch: Partial<typeof aiAgentLogs.$inferInsert>) {
  return db.update(aiAgentLogs).set(patch).where(eq(aiAgentLogs.id, logId))
}

async function bumpPostCommentCount(postId: number) {
  await db
    .update(communityPosts)
    .set({ commentCount: sql`${communityPosts.commentCount} + 1` })
    .where(eq(communityPosts.id, postId))
}

async function bumpMomentCommentCount(momentId: number) {
  await db
    .update(communityMoments)
    .set({ commentCount: sql`${communityMoments.commentCount} + 1` })
    .where(eq(communityMoments.id, momentId))
}

const slice = (s: string | null | undefined, n = 2000) => (s ?? '').slice(0, n)

function systemPrompt(config: AgentConfig): string {
  return `${config.persona}\n\n约束：直接输出回复正文，不要加"润土："之类前缀；内容里若有"@xxx"字样那是在叫你，忽略它直接回复；紧扣对方的话。表情规则：只允许使用 Unicode 表情符号（如🎉😄🍉）作为表情包，严禁输出 [xxx] 样式的方括号表情代码。`
}

/** 被 @ 后的后台回复任务（fire-and-forget；失败只记日志） */
export function runMentionReply(task: {
  logId: number
  config: AgentConfig
  agentId: number
  targetType: 'moment_comment' | 'comment' | 'news_comment'
  /** 被 @ 的那条评论 id（社区/新闻用于挂楼） */
  commentId: number
  postId?: number
  momentId?: number
  newsItemId?: number
  /** 被 @ 评论的 parent（有则复用同楼；无则挂到被@楼下） */
  parentCommentId?: number | null
  authorName: string
  mentionContent: string
  contextText: string
  sceneLabel: string
}) {
  const started = Date.now()
  ;(async () => {
    const userText = `【${task.sceneLabel}】\n${slice(task.contextText)}\n\n【@${task.config.nickname}他的人说】\n${slice(task.mentionContent)}\n\n请回复他。`
    const { content, tokensUsed } = await chatCompletion({
      system: systemPrompt(task.config),
      user: userText,
      maxTokens: task.config.maxTokens,
      temperature: task.config.temperature,
      topP: task.config.topP,
      frequencyPenalty: task.config.frequencyPenalty,
      presencePenalty: task.config.presencePenalty,
      thinking: task.config.thinking,
      reasoningEffort: task.config.reasoningEffort,
      timeoutMs: task.config.timeoutSeconds * 1000,
    })

    if (task.targetType === 'comment' && task.postId != null) {
      await db.insert(communityComments).values({
        postId: task.postId,
        userId: task.agentId,
        parentCommentId: task.parentCommentId ?? task.commentId,
        content,
      })
      await bumpPostCommentCount(task.postId)
    } else if (task.targetType === 'news_comment' && task.newsItemId != null) {
      await db.insert(newsComments).values({
        newsItemId: task.newsItemId,
        userId: task.agentId,
        parentCommentId: task.parentCommentId ?? task.commentId,
        content,
      })
    } else if (task.targetType === 'moment_comment' && task.momentId != null) {
      await db.insert(momentComments).values({
        momentId: task.momentId,
        userId: task.agentId,
        content: `@${task.authorName} ${content}`,
      })
      await bumpMomentCommentCount(task.momentId)
    } else {
      throw new Error('回复目标不完整')
    }

    await updateLog(task.logId, {
      status: 'success',
      duration: Date.now() - started,
      tokensUsed,
    })
  })().catch(async (error) => {
    console.error(
      `🤖 AI 回复失败 (${task.sceneLabel}):`,
      error instanceof Error ? error.message : error
    )
    await updateLog(task.logId, {
      status: 'failed',
      duration: Date.now() - started,
      error: error instanceof Error ? error.message : '未知错误',
    }).catch(() => {})
  })
}

/** 新帖/新动态的主动评论任务（fire-and-forget；失败只记日志） */
export function runProactiveReply(task: {
  logId: number
  config: AgentConfig
  agentId: number
  targetType: 'moment' | 'post'
  momentId?: number
  postId?: number
  publisherName: string
  title?: string
  content: string
  hasImages?: boolean
}) {
  const started = Date.now()
  ;(async () => {
    const userText =
      task.targetType === 'post'
        ? `【有人刚在议事厅发了新帖】\n标题：${slice(task.title, 200)}\n正文：${slice(task.content)}${task.hasImages ? '\n（附了图片）' : ''}\n\n请热烈欢迎并一句话点评。`
        : `【有人刚在电波发了一条新动态】\n${slice(task.content)}${task.hasImages ? '\n（附了图片）' : ''}\n\n请用一句话接梗/捧哏欢迎他。`
    const { content, tokensUsed } = await chatCompletion({
      system: systemPrompt(task.config),
      user: userText,
      maxTokens: task.config.maxTokens,
      temperature: task.config.temperature,
      topP: task.config.topP,
      frequencyPenalty: task.config.frequencyPenalty,
      presencePenalty: task.config.presencePenalty,
      thinking: task.config.thinking,
      reasoningEffort: task.config.reasoningEffort,
      timeoutMs: task.config.timeoutSeconds * 1000,
    })

    if (task.targetType === 'post' && task.postId != null) {
      await db.insert(communityComments).values({
        postId: task.postId,
        userId: task.agentId,
        parentCommentId: null,
        content,
      })
      await bumpPostCommentCount(task.postId)
    } else if (task.targetType === 'moment' && task.momentId != null) {
      await db.insert(momentComments).values({
        momentId: task.momentId,
        userId: task.agentId,
        content: `@${task.publisherName} ${content}`,
      })
      await bumpMomentCommentCount(task.momentId)
    } else {
      throw new Error('回复目标不完整')
    }

    await updateLog(task.logId, {
      status: 'success',
      duration: Date.now() - started,
      tokensUsed,
    })
  })().catch(async (error) => {
    console.error('🤖 AI 主动评论失败:', error instanceof Error ? error.message : error)
    await updateLog(task.logId, {
      status: 'failed',
      duration: Date.now() - started,
      error: error instanceof Error ? error.message : '未知错误',
    }).catch(() => {})
  })
}
