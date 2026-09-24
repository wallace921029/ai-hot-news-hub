import { useCallback, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'

interface WatchOptions {
  /** 与 useQuery 一致的完整 queryKey（精确匹配） */
  queryKey: unknown[]
  /** 轮询间隔，默认 3s */
  intervalMs?: number
  /** 最长等待，默认 150s（覆盖后端 120s 超时 + 余量）；超时自动停 */
  timeoutMs?: number
  /** 缓存数据里是否已出现目标（如 AI 回复） */
  isArrived: (data: unknown) => boolean
}

/**
 * AI 回复定向轮询：只在调用方明确期待时启动（如 @ 后、新帖等欢迎语），
 * 抓到目标或超时即停，平时零额外请求。卸载自动清理。
 */
export function useAiReplyPoll() {
  const queryClient = useQueryClient()
  const timer = useRef<number | null>(null)

  const stop = useCallback(() => {
    if (timer.current !== null) {
      clearInterval(timer.current)
      timer.current = null
    }
  }, [])

  useEffect(() => {
    return stop
  }, [stop])

  const watch = useCallback(
    (opts: WatchOptions) => {
      stop()
      const deadline = Date.now() + (opts.timeoutMs ?? 150000)
      const tick = async () => {
        try {
          await queryClient.refetchQueries({ queryKey: opts.queryKey, exact: true, type: 'active' })
          const data = queryClient.getQueryData(opts.queryKey)
          if (data && opts.isArrived(data)) {
            stop()
            return
          }
        } catch {
          // 忽略单次失败，继续等
        }
        if (Date.now() >= deadline) stop()
      }
      timer.current = window.setInterval(tick, opts.intervalMs ?? 3000)
    },
    [queryClient, stop]
  )

  return { watchAiReply: watch, stopAiReplyWatch: stop }
}

/** 内容是否新鲜（默认 10 分钟内发布），用于新帖/新动态等欢迎语 */
export function isFreshContent(createdAt: string | null | undefined, minutes = 10): boolean {
  if (!createdAt) return false
  const t = new Date(createdAt).getTime()
  if (Number.isNaN(t)) return false
  return Date.now() - t < minutes * 60 * 1000
}
