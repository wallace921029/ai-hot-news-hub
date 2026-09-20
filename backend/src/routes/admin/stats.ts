import { FastifyInstance } from 'fastify'
import { db } from '../../db/index.js'
import { newsItems, dataSources, fetchLogs, users, categories } from '../../db/schema.js'
import { sql, desc } from 'drizzle-orm'

export async function statsRoutes(app: FastifyInstance) {
  // 获取统计数据
  app.get('/', async () => {
    // 总内容数
    const [{ totalNews }] = await db.select({ totalNews: sql<number>`count(*)` }).from(newsItems)

    // 今日新增
    const [{ todayNews }] = await db
      .select({ todayNews: sql<number>`count(*)` })
      .from(newsItems)
      .where(sql`date(${newsItems.createdAt}, 'unixepoch') = date('now')`)

    // 数据源数量
    const [{ totalSources }] = await db
      .select({ totalSources: sql<number>`count(*)` })
      .from(dataSources)

    // 启用的数据源数量
    const [{ activeSources }] = await db
      .select({ activeSources: sql<number>`count(*)` })
      .from(dataSources)
      .where(sql`${dataSources.enabled} = 1`)

    // 用户数量
    const [{ totalUsers }] = await db.select({ totalUsers: sql<number>`count(*)` }).from(users)

    // 平台分布
    const platformDistribution = await db
      .select({
        platform: newsItems.platform,
        count: sql<number>`count(*)`,
      })
      .from(newsItems)
      .groupBy(newsItems.platform)
      .orderBy(desc(sql`count(*)`))

    // 分类分布（Top 10）
    const categoryDistribution = await db
      .select()
      .from(categories)
      .orderBy(desc(categories.count))
      .limit(10)

    // 每日趋势（最近 7 天）
    const dailyTrend = await db
      .select({
        date: sql<string>`date(${newsItems.createdAt}, 'unixepoch')`,
        count: sql<number>`count(*)`,
      })
      .from(newsItems)
      .where(sql`${newsItems.createdAt} >= unixepoch('now', '-7 days')`)
      .groupBy(sql`date(${newsItems.createdAt}, 'unixepoch')`)
      .orderBy(sql`date(${newsItems.createdAt}, 'unixepoch')`)

    // 评分分布
    const scoreDistribution = await db
      .select({
        range: sql<string>`
          CASE
            WHEN ${newsItems.aiScore} >= 90 THEN '90-100'
            WHEN ${newsItems.aiScore} >= 70 THEN '70-89'
            WHEN ${newsItems.aiScore} >= 50 THEN '50-69'
            ELSE '0-49'
          END
        `,
        count: sql<number>`count(*)`,
      })
      .from(newsItems)
      .where(sql`${newsItems.aiScore} IS NOT NULL`).groupBy(sql`
        CASE
          WHEN ${newsItems.aiScore} >= 90 THEN '90-100'
          WHEN ${newsItems.aiScore} >= 70 THEN '70-89'
          WHEN ${newsItems.aiScore} >= 50 THEN '50-69'
          ELSE '0-49'
        END
      `)

    // 抓取统计
    const [{ totalFetches }] = await db
      .select({ totalFetches: sql<number>`count(*)` })
      .from(fetchLogs)

    const [{ successFetches }] = await db
      .select({ successFetches: sql<number>`count(*)` })
      .from(fetchLogs)
      .where(sql`${fetchLogs.status} = 'success'`)

    return {
      overview: {
        totalNews,
        todayNews,
        totalSources,
        activeSources,
        totalUsers,
        totalFetches,
        successFetches,
        fetchSuccessRate: totalFetches > 0 ? Math.round((successFetches / totalFetches) * 100) : 0,
      },
      platformDistribution,
      categoryDistribution: categoryDistribution.map((c) => ({
        name: c.name,
        count: c.count,
      })),
      dailyTrend,
      scoreDistribution,
    }
  })
}
