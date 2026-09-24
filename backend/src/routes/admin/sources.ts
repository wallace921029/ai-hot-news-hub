import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../../db/index.js'
import { dataSources, fetchLogs, sourceStates } from '../../db/schema.js'
import { eq, desc } from 'drizzle-orm'
import { fetchSource, builtinTargetFromDef, rssTargetFromRow } from '../../scheduler/index.js'
import { builtinApiSources, getBuiltinApiSource } from '../../fetchers/api-sources.js'

const rssCreateSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.literal('rss'),
  sourceType: z.enum(['rss', 'api', 'topic']).default('rss'),
  url: z.string().url(),
  method: z.enum(['GET', 'POST']).default('GET'),
  enabled: z.boolean().default(true),
  description: z.string().optional(),
})

const rssUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().optional(),
  enabled: z.boolean().optional(),
  description: z.string().optional(),
})

/** 内置 API 源的对外展示结构：配置来自代码，状态来自 source_states */
function builtinView(
  def: (typeof builtinApiSources)[number],
  state?: typeof sourceStates.$inferSelect
) {
  return {
    id: null,
    code: def.code,
    builtin: true,
    name: def.name,
    type: def.type,
    sourceType: 'api' as const,
    url: def.url,
    method: def.method || 'GET',
    headers: def.headers ?? null,
    body: def.body ?? null,
    parser: def.parser,
    enabled: state ? state.enabled : true,
    lastFetchAt: state?.lastFetchAt ?? null,
    lastError: state?.lastError ?? null,
    description: def.description ?? null,
    createdAt: null,
    updatedAt: state?.updatedAt ?? null,
  }
}

async function getBuiltinState(code: string) {
  const [state] = await db.select().from(sourceStates).where(eq(sourceStates.code, code)).limit(1)
  return state
}

export async function sourceRoutes(app: FastifyInstance) {
  // 获取数据源列表 = RSS（DB 行）+ 内置 API（代码清单 + 状态）
  app.get('/', async () => {
    const [rssRows, states] = await Promise.all([
      db.select().from(dataSources).orderBy(desc(dataSources.createdAt)),
      db.select().from(sourceStates),
    ])
    const stateByCode = new Map(states.map((s) => [s.code, s]))

    const rss = rssRows.map((s) => ({
      ...s,
      builtin: false,
      code: null as string | null,
      headers: s.headers ? JSON.parse(s.headers) : null,
    }))
    const builtin = builtinApiSources.map((def) => builtinView(def, stateByCode.get(def.code)))

    return [...rss, ...builtin]
  })

  // 创建数据源：仅允许 RSS（内置 API 配置随代码发布，不经 DB 创建）
  app.post('/', async (request, reply) => {
    const parsed = rssCreateSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        error: '仅支持创建 RSS 订阅源（内置 API 源随代码发布，不可通过接口添加）',
        details: parsed.error.flatten(),
      })
    }

    const data = parsed.data
    const [newSource] = await db
      .insert(dataSources)
      .values({ ...data, sourceType: 'rss' })
      .returning()

    return newSource
  })

  // 更新数据源（仅 RSS 行；内置 API 见 /builtin/:code）
  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = rssUpdateSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: '参数错误', details: parsed.error.flatten() })
    }

    const [updated] = await db
      .update(dataSources)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(dataSources.id, parseInt(id)))
      .returning()

    if (!updated) {
      return reply.status(404).send({ error: '数据源不存在（内置 API 源请使用 /builtin/:code）' })
    }

    return updated
  })

  // 删除数据源（仅 RSS 行；内置 API 源不可删除）
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const [deleted] = await db
      .delete(dataSources)
      .where(eq(dataSources.id, parseInt(id)))
      .returning()

    if (!deleted) {
      return reply.status(404).send({ error: '数据源不存在（内置 API 源不可删除）' })
    }

    return { success: true }
  })

  // ===== 内置 API 源：仅可开关，配置不可改 =====
  app.put('/builtin/:code', async (request, reply) => {
    const { code } = request.params as { code: string }
    const def = getBuiltinApiSource(code)
    if (!def) {
      return reply.status(404).send({ error: '内置源不存在' })
    }

    const parsed = z.object({ enabled: z.boolean() }).safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: '参数错误', details: parsed.error.flatten() })
    }

    const state = await getBuiltinState(code)
    if (state) {
      await db
        .update(sourceStates)
        .set({ enabled: parsed.data.enabled, updatedAt: new Date() })
        .where(eq(sourceStates.code, code))
    } else {
      await db.insert(sourceStates).values({ code, enabled: parsed.data.enabled })
    }

    return { success: true, code, enabled: parsed.data.enabled }
  })

  // 手动触发内置源抓取
  app.post('/builtin/:code/fetch', async (request, reply) => {
    const { code } = request.params as { code: string }
    const def = getBuiltinApiSource(code)
    if (!def) {
      return reply.status(404).send({ error: '内置源不存在' })
    }

    fetchSource(builtinTargetFromDef(def), { status: 'processed' }).catch((error) => {
      console.error(`❌ 手动抓取异常: ${def.name}`, error)
    })

    return { success: true, message: '抓取任务已触发' }
  })

  // 测试内置源连通性
  app.post('/builtin/:code/test', async (request, reply) => {
    const { code } = request.params as { code: string }
    const def = getBuiltinApiSource(code)
    if (!def) {
      return reply.status(404).send({ error: '内置源不存在' })
    }

    try {
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...def.headers,
      }

      const response = await fetch(def.url, {
        method: def.method || 'GET',
        headers,
        body: def.method === 'POST' ? def.body : undefined,
      })

      return {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      }
    }
  })

  // 手动触发抓取（RSS：复用 fetchSource，含重试，结果写入 fetch_logs）
  app.post('/:id/fetch', async (request, reply) => {
    const { id } = request.params as { id: string }

    const [source] = await db
      .select()
      .from(dataSources)
      .where(eq(dataSources.id, parseInt(id)))
      .limit(1)

    if (!source) {
      return reply.status(404).send({ error: '数据源不存在' })
    }

    fetchSource(rssTargetFromRow(source), { status: 'processed' }).catch((error) => {
      console.error(`❌ 手动抓取异常: ${source.name}`, error)
    })

    return { success: true, message: '抓取任务已触发' }
  })

  // 测试连通性（RSS）
  app.post('/:id/test', async (request, reply) => {
    const { id } = request.params as { id: string }

    const [source] = await db
      .select()
      .from(dataSources)
      .where(eq(dataSources.id, parseInt(id)))
      .limit(1)

    if (!source) {
      return reply.status(404).send({ error: '数据源不存在' })
    }

    try {
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }

      if (source.headers) {
        Object.assign(headers, JSON.parse(source.headers))
      }

      const response = await fetch(source.url, {
        method: source.method || 'GET',
        headers,
        body: source.method === 'POST' ? source.body : undefined,
      })

      return {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      }
    }
  })

  // 获取抓取日志（RSS）
  app.get('/:id/logs', async (request) => {
    const { id } = request.params as { id: string }
    const { page = 1, pageSize = 20 } = request.query as { page?: number; pageSize?: number }
    const offset = (page - 1) * pageSize

    const logs = await db
      .select()
      .from(fetchLogs)
      .where(eq(fetchLogs.sourceId, parseInt(id)))
      .orderBy(desc(fetchLogs.createdAt))
      .limit(pageSize)
      .offset(offset)

    return logs
  })

  // 获取抓取日志（内置 API 源）
  app.get('/builtin/:code/logs', async (request) => {
    const { code } = request.params as { code: string }
    const { page = 1, pageSize = 20 } = request.query as { page?: number; pageSize?: number }
    const offset = (page - 1) * pageSize

    const logs = await db
      .select()
      .from(fetchLogs)
      .where(eq(fetchLogs.sourceCode, code))
      .orderBy(desc(fetchLogs.createdAt))
      .limit(pageSize)
      .offset(offset)

    return logs
  })
}
