import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'

/**
 * 可 @ 的 AI 列表：后端 AI 关闭时为空数组。
 * 昵称可在后台随时改，缓存 10 分钟；评论框挂载即预取，保证敲 @ 时秒开。
 */
export function useMentionableAis() {
  return useQuery({
    queryKey: ['ai-agents'],
    queryFn: () => api.getAiAgents(),
    staleTime: 1000 * 60 * 10,
    retry: 1,
  })
}
