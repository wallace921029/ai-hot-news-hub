import { db } from './index.js'
import { dataSources } from './schema.js'
import { eq } from 'drizzle-orm'

/**
 * 默认种子：仅 RSS 订阅源（安装即有）。
 * 内置 API 源不进 DB —— 配置在 fetchers/api-sources.ts，状态在 source_states，由启动迁移补齐。
 */
const defaultSources = [
  {
    name: '量子位 RSS',
    type: 'rss' as const,
    sourceType: 'rss' as const,
    url: 'https://www.qbitai.com/feed',
    parser: 'qbitai',
    enabled: true,
    description: 'RSS 格式，返回最新 AI 资讯',
  },
  {
    name: 'Google AI Blog RSS',
    type: 'rss' as const,
    sourceType: 'rss' as const,
    url: 'https://blog.google/innovation-and-ai/technology/ai/rss/',
    parser: 'google-ai',
    enabled: true,
    description: 'RSS 格式',
  },
  {
    name: 'MIT Technology Review RSS',
    type: 'rss' as const,
    sourceType: 'rss' as const,
    url: 'https://www.technologyreview.com/feed/',
    parser: 'mit-tech',
    enabled: true,
    description: 'RSS 格式',
  },
  {
    name: 'Hacker News',
    type: 'rss' as const,
    sourceType: 'rss' as const,
    url: 'https://news.ycombinator.com/rss',
    parser: 'hackernews',
    enabled: true,
    description: '全球最热门的技术新闻和创业资讯',
  },
]

export async function seedDataSources() {
  console.log('🌱 初始化 RSS 数据源...')

  for (const source of defaultSources) {
    try {
      const existing = await db
        .select()
        .from(dataSources)
        .where(eq(dataSources.url, source.url))
        .limit(1)

      if (existing.length === 0) {
        await db.insert(dataSources).values(source)
        console.log(`  ✅ 添加: ${source.name}`)
      } else {
        console.log(`  ⏭️  跳过: ${source.name} (已存在)`)
      }
    } catch (error) {
      console.error(`  ❌ 失败: ${source.name} - ${error}`)
    }
  }

  console.log('✅ RSS 数据源初始化完成')
}

async function main() {
  await seedDataSources()
  process.exit(0)
}

main()
