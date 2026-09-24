import { db } from '../db/index.js'
import { errorAlerts, fetchLogs, dataSources, sourceStates } from '../db/schema.js'
import { eq, desc, and, sql } from 'drizzle-orm'
import { builtinApiSources, getBuiltinApiSource } from '../fetchers/api-sources.js'

const CONSECUTIVE_FAILURE_THRESHOLD = 3

export async function checkAndCreateAlerts() {
  // 1. RSS 源（按 data_sources.id）
  const rssSources = await db.select().from(dataSources).where(eq(dataSources.enabled, true))

  for (const source of rssSources) {
    const recentLogs = await db
      .select()
      .from(fetchLogs)
      .where(eq(fetchLogs.sourceId, source.id))
      .orderBy(desc(fetchLogs.createdAt))
      .limit(CONSECUTIVE_FAILURE_THRESHOLD)

    if (recentLogs.length < CONSECUTIVE_FAILURE_THRESHOLD) continue

    const allFailed = recentLogs.every((log) => log.status === 'failed')
    if (!allFailed) continue

    const existingAlert = await db
      .select()
      .from(errorAlerts)
      .where(
        and(
          eq(errorAlerts.sourceId, source.id),
          eq(errorAlerts.resolved, false),
          eq(errorAlerts.alertType, 'consecutive_failures')
        )
      )
      .limit(1)

    if (existingAlert.length > 0) continue

    const errorMessages = recentLogs
      .map((log) => log.error)
      .filter(Boolean)
      .join('; ')

    await db.insert(errorAlerts).values({
      sourceId: source.id,
      alertType: 'consecutive_failures',
      message: `数据源「${source.name}」连续 ${CONSECUTIVE_FAILURE_THRESHOLD} 次抓取失败`,
      details: JSON.stringify({
        sourceName: source.name,
        failures: recentLogs.map((log) => ({
          error: log.error,
          createdAt: log.createdAt,
        })),
        lastError: errorMessages,
      }),
    })

    console.warn(
      `⚠️ 告警: 数据源「${source.name}」连续 ${CONSECUTIVE_FAILURE_THRESHOLD} 次抓取失败`
    )
  }

  // 2. 内置 API 源（按 source_states.code）
  const states = await db.select().from(sourceStates)
  const enabledDefs = builtinApiSources.filter((def) => {
    const state = states.find((s) => s.code === def.code)
    return !state || state.enabled
  })

  for (const def of enabledDefs) {
    const recentLogs = await db
      .select()
      .from(fetchLogs)
      .where(eq(fetchLogs.sourceCode, def.code))
      .orderBy(desc(fetchLogs.createdAt))
      .limit(CONSECUTIVE_FAILURE_THRESHOLD)

    if (recentLogs.length < CONSECUTIVE_FAILURE_THRESHOLD) continue
    if (!recentLogs.every((log) => log.status === 'failed')) continue

    const existingAlert = await db
      .select()
      .from(errorAlerts)
      .where(
        and(
          eq(errorAlerts.sourceCode, def.code),
          eq(errorAlerts.resolved, false),
          eq(errorAlerts.alertType, 'consecutive_failures')
        )
      )
      .limit(1)

    if (existingAlert.length > 0) continue

    const errorMessages = recentLogs
      .map((log) => log.error)
      .filter(Boolean)
      .join('; ')

    await db.insert(errorAlerts).values({
      sourceCode: def.code,
      alertType: 'consecutive_failures',
      message: `数据源「${def.name}」连续 ${CONSECUTIVE_FAILURE_THRESHOLD} 次抓取失败`,
      details: JSON.stringify({
        sourceName: def.name,
        failures: recentLogs.map((log) => ({
          error: log.error,
          createdAt: log.createdAt,
        })),
        lastError: errorMessages,
      }),
    })

    console.warn(`⚠️ 告警: 数据源「${def.name}」连续 ${CONSECUTIVE_FAILURE_THRESHOLD} 次抓取失败`)
  }
}

export async function resolveAlert(alertId: number) {
  await db
    .update(errorAlerts)
    .set({ resolved: true, resolvedAt: new Date() })
    .where(eq(errorAlerts.id, alertId))
}

export async function getAlerts(params?: { page?: number; pageSize?: number; resolved?: boolean }) {
  const page = params?.page || 1
  const pageSize = params?.pageSize || 20
  const offset = (page - 1) * pageSize

  const conditions = []
  if (params?.resolved !== undefined) {
    conditions.push(eq(errorAlerts.resolved, params.resolved))
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(errorAlerts)
    .where(where)

  const items = await db
    .select({
      id: errorAlerts.id,
      sourceId: errorAlerts.sourceId,
      sourceCode: errorAlerts.sourceCode,
      sourceName: dataSources.name,
      alertType: errorAlerts.alertType,
      message: errorAlerts.message,
      details: errorAlerts.details,
      resolved: errorAlerts.resolved,
      createdAt: errorAlerts.createdAt,
      resolvedAt: errorAlerts.resolvedAt,
    })
    .from(errorAlerts)
    .leftJoin(dataSources, eq(errorAlerts.sourceId, dataSources.id))
    .where(where)
    .orderBy(desc(errorAlerts.createdAt))
    .limit(pageSize)
    .offset(offset)

  return {
    items: items.map((item) => ({
      ...item,
      sourceName:
        item.sourceName ??
        (item.sourceCode ? (getBuiltinApiSource(item.sourceCode)?.name ?? item.sourceCode) : null),
      details: item.details ? JSON.parse(item.details) : null,
    })),
    pagination: {
      page,
      pageSize,
      total: count,
      totalPages: Math.ceil(count / pageSize),
    },
  }
}
