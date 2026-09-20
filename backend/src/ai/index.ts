import { db } from '../db/index.js'
import { newsItems, aiLogs, categories, systemConfig } from '../db/schema.js'
import { eq, isNull, or } from 'drizzle-orm'

// JSON Schema 定义
const CATEGORIES_SCHEMA = {
  name: 'categories_response',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      categories: {
        type: 'array',
        items: { type: 'string' },
        description: '1-3个分类标签，中文，如：AI、前端开发、创业融资、娱乐、体育、科技、社会',
      },
    },
    required: ['categories'],
    additionalProperties: false,
  },
}

const SCORE_SCHEMA = {
  name: 'score_response',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      dimensions: {
        type: 'object',
        properties: {
          info_density: {
            type: 'object',
            properties: {
              score: { type: 'integer', minimum: 0, maximum: 10, description: '信息密度得分' },
              reason: { type: 'string', description: '得分理由' },
            },
            required: ['score', 'reason'],
            additionalProperties: false,
          },
          timeliness: {
            type: 'object',
            properties: {
              score: { type: 'integer', minimum: 0, maximum: 10, description: '时效性得分' },
              reason: { type: 'string', description: '得分理由' },
            },
            required: ['score', 'reason'],
            additionalProperties: false,
          },
          uniqueness: {
            type: 'object',
            properties: {
              score: { type: 'integer', minimum: 0, maximum: 10, description: '独特性得分' },
              reason: { type: 'string', description: '得分理由' },
            },
            required: ['score', 'reason'],
            additionalProperties: false,
          },
          credibility: {
            type: 'object',
            properties: {
              score: { type: 'integer', minimum: 0, maximum: 10, description: '可信度得分' },
              reason: { type: 'string', description: '得分理由' },
            },
            required: ['score', 'reason'],
            additionalProperties: false,
          },
          influence: {
            type: 'object',
            properties: {
              score: { type: 'integer', minimum: 0, maximum: 10, description: '影响力得分' },
              reason: { type: 'string', description: '得分理由' },
            },
            required: ['score', 'reason'],
            additionalProperties: false,
          },
          depth: {
            type: 'object',
            properties: {
              score: { type: 'integer', minimum: 0, maximum: 10, description: '深度得分' },
              reason: { type: 'string', description: '得分理由' },
            },
            required: ['score', 'reason'],
            additionalProperties: false,
          },
          foresight: {
            type: 'object',
            properties: {
              score: { type: 'integer', minimum: 0, maximum: 10, description: '前瞻性得分' },
              reason: { type: 'string', description: '得分理由' },
            },
            required: ['score', 'reason'],
            additionalProperties: false,
          },
          controversy: {
            type: 'object',
            properties: {
              score: { type: 'integer', minimum: 0, maximum: 10, description: '讨论价值得分' },
              reason: { type: 'string', description: '得分理由' },
            },
            required: ['score', 'reason'],
            additionalProperties: false,
          },
          practicality: {
            type: 'object',
            properties: {
              score: { type: 'integer', minimum: 0, maximum: 10, description: '实用性得分' },
              reason: { type: 'string', description: '得分理由' },
            },
            required: ['score', 'reason'],
            additionalProperties: false,
          },
          emotional: {
            type: 'object',
            properties: {
              score: { type: 'integer', minimum: 0, maximum: 10, description: '情感共鸣得分' },
              reason: { type: 'string', description: '得分理由' },
            },
            required: ['score', 'reason'],
            additionalProperties: false,
          },
        },
        required: [
          'info_density',
          'timeliness',
          'uniqueness',
          'credibility',
          'influence',
          'depth',
          'foresight',
          'controversy',
          'practicality',
          'emotional',
        ],
        additionalProperties: false,
      },
      score: {
        type: 'integer',
        minimum: 0,
        maximum: 100,
        description: '总分（各维度分数之和）',
      },
      reason: {
        type: 'string',
        description: '一句话综合评价',
      },
    },
    required: ['dimensions', 'score', 'reason'],
    additionalProperties: false,
  },
}

// 获取 AI 配置
async function getAIConfig() {
  const configs = await db.select().from(systemConfig)

  const configMap: Record<string, string> = {}
  for (const config of configs) {
    configMap[config.key] = JSON.parse(config.value)
  }

  return {
    apiKey: configMap.ai_api_key || '',
    baseUrl: configMap.ai_base_url || 'https://api.openai.com/v1',
    model: configMap.ai_model || 'gpt-4o-mini',
  }
}

// 调用 AI API（支持 JSON Schema 约束）
async function callAI<T>(prompt: string, schema: object): Promise<T> {
  const config = await getAIConfig()

  if (!config.apiKey) {
    throw new Error('AI API Key 未配置')
  }

  console.log(`🤖 调用 AI API: ${config.model} @ ${config.baseUrl}`)

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: {
        type: 'json_schema',
        json_schema: schema,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`AI API 错误: ${response.status} - ${error}`)
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>
    usage?: { total_tokens: number }
  }

  const content = data.choices[0]?.message?.content || ''
  console.log(`📝 AI 返回内容: ${content.substring(0, 200)}...`)

  if (!content) {
    throw new Error('AI 返回内容为空')
  }

  return JSON.parse(content) as T
}

// 分类处理
async function processCategories(title: string): Promise<string[]> {
  const prompt = `请根据以下标题，为其分配 1-3 个分类标签。分类应该是中文，简洁明了。

标题：${title}`

  const result = await callAI<{ categories: string[] }>(prompt, CATEGORIES_SCHEMA)
  return result.categories || []
}

// 评分处理
async function processScore(title: string): Promise<{ score: number; reason: string }> {
  const prompt = `你是一个专业的信息价值评估师。请严格按照以下评分体系对标题进行逐项评估。

## 评分体系（总分 100 分，每个维度 0-10 分）

1. **信息密度**：是否包含具体数字、数据、明确结论
2. **时效性**：是否为正在发生的重大突发事件
3. **独特性**：是否为独家报道、罕见事件或突破性发现
4. **可信度**：来源是否权威、可靠、经过验证
5. **影响力**：影响范围（全球/行业/地区/小众）
6. **深度**：是否深度分析、系统性研究、原创洞察
7. **前瞻性**：是否预示重大趋势或行业转折点
8. **争议性**：是否引发广泛讨论、有思辨价值
9. **实用性**：是否可直接应用、学习、参考
10. **情感共鸣**：是否引发情感触动或深度反思

## 待评估标题
${title}

请逐条分析每个维度，给出具体分数和理由，计算总分并给出综合评价。`

  const result = await callAI<{
    dimensions: Record<string, { score: number; reason: string }>
    score: number
    reason: string
  }>(prompt, SCORE_SCHEMA)

  if (!result.score) {
    throw new Error('AI 未返回有效评分')
  }

  return {
    score: result.score,
    reason: result.reason || '',
  }
}

// 处理单条新闻
async function processNewsItem(item: typeof newsItems.$inferSelect): Promise<boolean> {
  const startTime = Date.now()

  try {
    // 设置状态为处理中
    await db.update(newsItems).set({ status: 'processing' }).where(eq(newsItems.id, item.id))

    // 并行执行分类和评分（只根据标题）
    const [categoriesResult, scoreResult] = await Promise.all([
      processCategories(item.title),
      processScore(item.title),
    ])

    const duration = Date.now() - startTime

    // 更新新闻条目
    await db
      .update(newsItems)
      .set({
        categories: JSON.stringify(categoriesResult),
        aiScore: scoreResult.score,
        aiSummary: scoreResult.reason,
        processedAt: new Date(),
        status: 'processed',
      })
      .where(eq(newsItems.id, item.id))

    // 记录 AI 日志
    await db.insert(aiLogs).values({
      newsItemId: item.id,
      status: 'success',
      duration,
      tokensUsed: 0,
    })

    // 更新分类统计
    for (const cat of categoriesResult) {
      const existing = await db.select().from(categories).where(eq(categories.name, cat)).limit(1)

      if (existing.length > 0) {
        await db
          .update(categories)
          .set({
            count: existing[0].count + 1,
            updatedAt: new Date(),
          })
          .where(eq(categories.name, cat))
      } else {
        await db.insert(categories).values({ name: cat, count: 1 })
      }
    }

    console.log(
      `✅ AI 处理成功: ${item.title} (评分: ${scoreResult.score}, 分类: ${categoriesResult.join(', ')})`
    )
    return true
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : '未知错误'

    // 更新状态为失败
    await db.update(newsItems).set({ status: 'failed' }).where(eq(newsItems.id, item.id))

    // 记录错误日志
    await db.insert(aiLogs).values({
      newsItemId: item.id,
      status: 'failed',
      duration,
      error: errorMessage,
    })

    console.error(`❌ AI 处理失败: ${item.title} - ${errorMessage}`)
    return false
  }
}

// 处理所有待处理的新闻
export async function processAllPending() {
  console.log('🤖 开始 AI 处理...')

  const pendingItems = await db
    .select()
    .from(newsItems)
    .where(or(eq(newsItems.status, 'pending'), isNull(newsItems.processedAt)))

  console.log(`📊 待处理数量: ${pendingItems.length}`)

  let processed = 0
  let failed = 0

  // 串行处理，避免 API 限流
  for (const item of pendingItems) {
    const success = await processNewsItem(item)
    if (success) {
      processed++
    } else {
      failed++
    }
    // 添加延迟，避免 API 限流
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  console.log(`✅ AI 处理完成: 成功 ${processed}, 失败 ${failed}`)
  return { processed, failed, total: pendingItems.length }
}

// 处理单条新闻（通过 ID）
export async function processNewsItemById(id: number) {
  const [item] = await db.select().from(newsItems).where(eq(newsItems.id, id)).limit(1)

  if (!item) {
    throw new Error('内容不存在')
  }

  const success = await processNewsItem(item)
  return { success, item }
}
