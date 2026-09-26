import { FastifyInstance } from 'fastify'
import { AI_AGENT_USERNAME, getAgentConfig } from '../services/ai-agent.js'

/**
 * 可 @ 的 AI 列表（公开接口）。
 * 昵称/头像本就是评论区可见信息；数组结构兼容未来多 AI（到时从配置查多行即可）。
 * 前端评论框 @ 弹窗的数据源；AI 关闭时返回空数组，前端直接不弹。
 */
export async function aiRoutes(app: FastifyInstance) {
  app.get('/agents', async () => {
    const config = await getAgentConfig()
    if (!config.enabled) {
      return { agents: [] }
    }
    return {
      agents: [
        {
          username: AI_AGENT_USERNAME,
          nickname: config.nickname,
          avatar: config.avatar,
        },
      ],
    }
  })
}
