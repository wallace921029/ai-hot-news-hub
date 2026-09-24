import { db } from './index.js'
import { dataSources, newsItems, fetchLogs, errorAlerts, sourceStates, aiLogs } from './schema.js'
import { builtinApiSources, getBuiltinApiSourceByUrl } from '../fetchers/api-sources.js'
import { hasRestParser } from '../fetchers/rest.js'
import { hasHtmlParser } from '../fetchers/html.js'
import { eq, inArray, sql } from 'drizzle-orm'

/**
 * 「代码即订阅」迁移：内置 API 源配置只存在 fetchers/api-sources.ts，
 * DB 仅保留运行状态（source_states）与按 code 关联的新闻/日志/告警。
 *
 * 幂等，启动时执行：
 * 1. 校验内置清单的 parser 均已注册
 * 2. 旧库补齐列 / 重建 fetch_logs（source_id 改为可空 + 增加 source_code）
 * 3. 旧行 data_sources(source_type='api') 的新闻/日志/告警迁到 code 身份并删除这些行
 * 4. 为每个内置源补齐 source_states 行（不覆盖已有 enabled 等用户状态）
 * 5. 清理已从清单移除的源（source_states + 关联新闻/日志/告警）
 */

async function getTableColumns(table: string): Promise<Array<{ name: string; notnull: number }>> {
  // table 仅来自本文件内的白名单常量，非用户输入
  return (await db.all(sql.raw(`PRAGMA table_info(${table})`))) as Array<{
    name: string
    notnull: number
  }>
}

async function ensureColumn(table: string, column: string, ddl: string) {
  const cols = await getTableColumns(table)
  if (!cols.some((c) => c.name === column)) {
    await db.run(sql.raw(ddl))
    console.log(`🔧 迁移: ${table} 新增列 ${column}`)
  }
}

async function ensureFetchLogsShape() {
  const cols = await getTableColumns('fetch_logs')
  const hasCode = cols.some((c) => c.name === 'source_code')
  const sourceIdNotNull = cols.find((c) => c.name === 'source_id')?.notnull === 1
  if (hasCode && !sourceIdNotNull) return

  await db.run(
    sql.raw(`CREATE TABLE fetch_logs_new (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "source_id" integer,
      "source_code" text,
      "status" text NOT NULL,
      "duration" integer NOT NULL,
      "count" integer DEFAULT 0 NOT NULL,
      "error" text,
      "created_at" integer DEFAULT (unixepoch()) NOT NULL,
      FOREIGN KEY ("source_id") REFERENCES "data_sources"("id") ON UPDATE no action ON DELETE cascade
    )`)
  )
  const before = (await db.all(sql.raw(`SELECT COUNT(*) AS n FROM fetch_logs`))) as Array<{
    n: number
  }>
  await db.run(
    sql.raw(
      `INSERT INTO fetch_logs_new (id, source_id, source_code, status, duration, count, error, created_at)
       SELECT id, source_id, NULL, status, duration, count, error, created_at FROM fetch_logs`
    )
  )
  await db.run(sql.raw(`DROP TABLE fetch_logs`))
  await db.run(sql.raw(`ALTER TABLE fetch_logs_new RENAME TO fetch_logs`))
  console.log(`🔧 迁移: fetch_logs 已重建（保留 ${before[0]?.n ?? 0} 行日志）`)
}

async function ensureSourceStatesTable() {
  await db.run(
    sql.raw(`CREATE TABLE IF NOT EXISTS source_states (
      "code" text PRIMARY KEY NOT NULL,
      "enabled" integer DEFAULT true NOT NULL,
      "last_fetch_at" integer,
      "last_error" text,
      "created_at" integer DEFAULT (unixepoch()) NOT NULL,
      "updated_at" integer DEFAULT (unixepoch()) NOT NULL
    )`)
  )
}

export async function migrateBuiltinApiSources(): Promise<void> {
  // 1. 校验内置清单 parser 均已注册（配置与解析器必须同版本存在）
  for (const def of builtinApiSources) {
    const ok = def.type === 'html' ? hasHtmlParser(def.parser) : hasRestParser(def.parser)
    if (!ok) {
      throw new Error(`内置 API 源 ${def.code} 的解析器未注册: ${def.parser}`)
    }
  }

  // 2. 结构迁移（旧库补列；fetch_logs 需要去掉 source_id 的 NOT NULL，只能重建）
  await ensureColumn(
    'news_items',
    'source_code',
    'ALTER TABLE news_items ADD COLUMN source_code text'
  )
  await ensureColumn(
    'error_alerts',
    'source_code',
    'ALTER TABLE error_alerts ADD COLUMN source_code text'
  )
  await ensureFetchLogsShape()
  await ensureSourceStatesTable()

  // 3. 旧行迁移：data_sources 中 source_type='api' 的行 → code 身份
  const apiRows = await db.select().from(dataSources).where(eq(dataSources.sourceType, 'api'))

  for (const row of apiRows) {
    const code = getBuiltinApiSourceByUrl(row.url)?.code ?? `legacy-${row.id}`

    await db
      .update(newsItems)
      .set({ sourceCode: code, sourceId: null })
      .where(eq(newsItems.sourceId, row.id))

    await db
      .update(errorAlerts)
      .set({ sourceCode: code, sourceId: null })
      .where(eq(errorAlerts.sourceId, row.id))

    await db
      .update(fetchLogs)
      .set({ sourceCode: code, sourceId: null })
      .where(eq(fetchLogs.sourceId, row.id))

    const existingState = await db
      .select({ code: sourceStates.code })
      .from(sourceStates)
      .where(eq(sourceStates.code, code))
      .limit(1)
    if (existingState.length === 0) {
      await db.insert(sourceStates).values({
        code,
        enabled: row.enabled,
        lastFetchAt: row.lastFetchAt,
        lastError: row.lastError,
      })
    }
  }

  if (apiRows.length > 0) {
    await db.delete(dataSources).where(
      inArray(
        dataSources.id,
        apiRows.map((r) => r.id)
      )
    )
    console.log(
      `🔧 迁移: 已将 ${apiRows.length} 个 API 源迁出 data_sources（新闻/日志/告警改挂 code）`
    )
  }

  // 4. 补齐所有内置源的状态行（缺省 enabled=true；不覆盖已有用户状态）
  let created = 0
  for (const def of builtinApiSources) {
    const existing = await db
      .select({ code: sourceStates.code })
      .from(sourceStates)
      .where(eq(sourceStates.code, def.code))
      .limit(1)
    if (existing.length === 0) {
      await db.insert(sourceStates).values({ code: def.code, enabled: true })
      created++
    }
  }
  if (created > 0) {
    console.log(`🔧 迁移: 新增 ${created} 个内置 API 源状态（共 ${builtinApiSources.length} 个）`)
  }

  // 5. 清理已从清单移除的源：状态行与关联新闻/日志/告警一并删除（删除源 = 彻底下线）
  const validCodes = new Set(builtinApiSources.map((d) => d.code))
  const allStates = await db.select({ code: sourceStates.code }).from(sourceStates)
  const orphanCodes = allStates.map((s) => s.code).filter((code) => !validCodes.has(code))
  if (orphanCodes.length > 0) {
    await db.delete(aiLogs).where(
      sql`${aiLogs.newsItemId} IN (
          SELECT id FROM news_items WHERE source_code IN (${sql.join(
            orphanCodes.map((c) => sql`${c}`),
            sql`, `
          )})
        )`
    )
    await db.delete(newsItems).where(inArray(newsItems.sourceCode, orphanCodes))
    await db.delete(fetchLogs).where(inArray(fetchLogs.sourceCode, orphanCodes))
    await db.delete(errorAlerts).where(inArray(errorAlerts.sourceCode, orphanCodes))
    await db.delete(sourceStates).where(inArray(sourceStates.code, orphanCodes))
    console.log(
      `🔧 迁移: 已下线 ${orphanCodes.length} 个内置源并清理关联数据: ${orphanCodes.join(', ')}`
    )
  }
}
