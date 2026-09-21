import { db } from '../db/index.js'
import { operationLogs } from '../db/schema.js'
import { eq, desc, sql, and } from 'drizzle-orm'

interface AuditLogEntry {
  userId?: number
  username?: string
  action: string
  resource: string
  resourceId?: string
  details?: Record<string, unknown>
  ipAddress?: string
}

export async function logOperation(entry: AuditLogEntry) {
  try {
    await db.insert(operationLogs).values({
      userId: entry.userId,
      username: entry.username,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId,
      details: entry.details ? JSON.stringify(entry.details) : null,
      ipAddress: entry.ipAddress,
    })
  } catch (error) {
    console.error('Failed to log operation:', error)
  }
}

export async function getOperationLogs(params?: {
  page?: number
  pageSize?: number
  userId?: number
  resource?: string
}) {
  const page = params?.page || 1
  const pageSize = params?.pageSize || 20
  const offset = (page - 1) * pageSize

  const conditions = []
  if (params?.userId) {
    conditions.push(eq(operationLogs.userId, params.userId))
  }
  if (params?.resource) {
    conditions.push(eq(operationLogs.resource, params.resource))
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(operationLogs)
    .where(where)

  const items = await db
    .select()
    .from(operationLogs)
    .where(where)
    .orderBy(desc(operationLogs.createdAt))
    .limit(pageSize)
    .offset(offset)

  return {
    items: items.map((item) => ({
      ...item,
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
