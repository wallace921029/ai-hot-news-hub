import Parser from 'rss-parser'
import type { Fetcher, FetcherSource, RawNewsItem } from './types.js'
import { proxyFetch } from '../utils/http.js'

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  },
})

export class RssFetcher implements Fetcher {
  async fetch(source: FetcherSource): Promise<RawNewsItem[]> {
    // 先经 proxyFetch 取文本（走代理），再纯解析：rss-parser 内建请求不读代理变量
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)
    try {
      const response = await proxyFetch(source.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        signal: controller.signal,
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const feed = await parser.parseString(await response.text())
      return feed.items.map((item) => {
        let desc = item.content || item.summary || item.contentSnippet || ''
        // 把 feed.baseUrl 传给图片相对路径？rss-parser 不自动补，这里用 item 的 link 补 img/src 相对路径
        if (desc && item.link) {
          try {
            const base = new URL(item.link).origin
            desc = desc.replace(
              /(src|href)="(?!https?:\/\/|\/\/|data:|mailto:|#)([^"]+)"/g,
              `$1="${base}$2"`
            )
          } catch {
            /* 忽略 base URL 解析错误 */
          }
        }
        return {
          sourceId: source.id,
          platform: source.parser || 'rss',
          title: item.title || 'Untitled',
          url: item.link || item.guid || '',
          description: desc,
          author: item.creator || item.author,
          publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
          fetchedAt: new Date(),
        }
      })
    } finally {
      clearTimeout(timer)
    }
  }
}
