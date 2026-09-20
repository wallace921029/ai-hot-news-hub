import Parser from 'rss-parser'
import type { Fetcher, FetcherSource, RawNewsItem } from './types.js'

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  },
})

export class RssFetcher implements Fetcher {
  async fetch(source: FetcherSource): Promise<RawNewsItem[]> {
    const feed = await parser.parseURL(source.url)

    return feed.items.map((item) => ({
      sourceId: source.id,
      platform: source.parser || 'rss',
      title: item.title || 'Untitled',
      url: item.link || item.guid || '',
      description: item.contentSnippet || item.content || item.summary,
      author: item.creator || item.author,
      publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
      fetchedAt: new Date(),
    }))
  }
}
