import type { Dispatcher } from 'undici'

/**
 * 出站 HTTP 统一走这里。
 *
 * Node 原生 fetch 不读 HTTP(S)_PROXY / NO_PROXY，直连失败的环境（如需代理出站）
 * 会报 `fetch failed`。本 helper 按 curl 语义 honor 这些变量；无代理变量时与原生
 * fetch 行为完全一致。ProxyAgent 按代理地址缓存复用连接。
 *
 * undici 延迟到真正需要代理时才动态导入：无代理的服务器连这个包都不会加载，
 * 不抬高 Node 版本基线。
 */
const agentCache = new Map<string, Dispatcher>()

function noProxyHit(hostname: string, port: string): boolean {
  const raw = process.env.NO_PROXY || process.env.no_proxy || ''
  const host = hostname.toLowerCase()
  for (const item of raw.split(',')) {
    const rule = item.trim().toLowerCase()
    if (!rule) continue
    if (rule === '*') return true
    // 规则可带端口（如 127.0.0.1:8762），先拆出来比
    const colon = rule.lastIndexOf(':')
    const ruleHost = colon > 0 ? rule.slice(0, colon) : rule
    const rulePort = colon > 0 ? rule.slice(colon + 1) : ''
    if (rulePort && rulePort !== port) continue
    if (ruleHost.startsWith('.')) {
      if (host.endsWith(ruleHost)) return true
    } else if (host === ruleHost || host.endsWith(`.${ruleHost}`)) {
      return true
    }
  }
  return false
}

function proxyFor(url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
  if (noProxyHit(parsed.hostname, parsed.port || (parsed.protocol === 'https:' ? '443' : '80'))) {
    return null
  }
  const proxy =
    parsed.protocol === 'https:'
      ? process.env.HTTPS_PROXY ||
        process.env.https_proxy ||
        process.env.HTTP_PROXY ||
        process.env.http_proxy
      : process.env.HTTP_PROXY ||
        process.env.http_proxy ||
        process.env.HTTPS_PROXY ||
        process.env.https_proxy
  return proxy || null
}

export async function proxyFetch(url: string, init?: RequestInit): Promise<Response> {
  const proxy = proxyFor(url)
  if (!proxy) return fetch(url, init)
  let agent = agentCache.get(proxy)
  if (!agent) {
    const { ProxyAgent } = await import('undici')
    agent = new ProxyAgent(proxy)
    agentCache.set(proxy, agent)
  }
  // dispatcher 为 undici 专有参数，DOM 的 RequestInit 类型里没有；
  // 包内 undici 与 Node 内建 undici-types 各一份类型声明，经 unknown 中转
  return fetch(url, { ...init, dispatcher: agent } as unknown as RequestInit)
}
