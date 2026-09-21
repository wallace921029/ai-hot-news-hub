import * as cheerio from 'cheerio'
import type { Fetcher, FetcherSource, RawNewsItem } from './types.js'

interface HtmlParser {
  parse(html: string, source: FetcherSource): RawNewsItem[]
}

// 百度热搜
const baiduParser: HtmlParser = {
  parse(html, source) {
    const $ = cheerio.load(html)
    const items: RawNewsItem[] = []

    // 百度热搜的 HTML 结构
    $('.category-wrap_iQLoo, .hot-item, [class*="hot"]').each((_, el) => {
      const $el = $(el)
      const title = $el
        .find('.c-single-text-ellipsis, .title, [class*="title"]')
        .first()
        .text()
        .trim()
      const url = $el.find('a').attr('href') || ''
      const hotScoreText = $el
        .find('.hot-index_1Bl1a, [class*="index"], [class*="hot"]')
        .text()
        .trim()
      const hotScore = parseInt(hotScoreText.replace(/[^\d]/g, '')) || 0

      if (title && title.length > 1) {
        items.push({
          sourceId: source.id,
          platform: 'baidu',
          title,
          url: url.startsWith('http') ? url : `https://top.baidu.com${url}`,
          hotScore,
          fetchedAt: new Date(),
        })
      }
    })

    return items
  },
}

// IT之家 (XML)
const ithomeParser: HtmlParser = {
  parse(html, source) {
    const $ = cheerio.load(html, { xmlMode: true })
    const items: RawNewsItem[] = []

    $('item').each((_, el) => {
      const $el = $(el)
      const title = $el
        .find('title')
        .text()
        .trim()
        .replace(/^<!\[CDATA\[|\]\]>$/g, '')
      const rawUrl = $el
        .find('url')
        .text()
        .trim()
        .replace(/^<!\[CDATA\[|\]\]>$/g, '')
      const description = $el
        .find('description')
        .text()
        .trim()
        .replace(/^<!\[CDATA\[|\]\]>$/g, '')
      const pubDate = $el.find('postdate').text().trim()
      const hitCount = parseInt($el.find('hitcount').text().trim()) || 0
      const commentCount = parseInt($el.find('commentcount').text().trim()) || 0

      // Convert relative URL to absolute
      const url = rawUrl.startsWith('http') ? rawUrl : `https://www.ithome.com${rawUrl}`

      if (title && url) {
        items.push({
          sourceId: source.id,
          platform: 'ithome',
          title,
          url,
          description: description.substring(0, 200),
          hotScore: hitCount,
          metadata: { comments: commentCount },
          publishedAt: pubDate ? new Date(pubDate) : undefined,
          fetchedAt: new Date(),
        })
      }
    })

    return items
  },
}

// 超神经 - 使用 JSON API
const hyperaiParser: HtmlParser = {
  parse(html, source) {
    // 尝试解析 JSON 响应
    try {
      const data = JSON.parse(html)
      if (data.data && Array.isArray(data.data)) {
        return data.data.map(
          (item: { title: string; slug?: string; url?: string; summary?: string }) => ({
            sourceId: source.id,
            platform: 'hyperai',
            title: item.title,
            url: item.url || `https://hyper.ai/articles/${item.slug}`,
            description: item.summary?.substring(0, 200),
            fetchedAt: new Date(),
          })
        )
      }
    } catch {
      // 如果不是 JSON，尝试 HTML 解析
    }

    const $ = cheerio.load(html)
    const items: RawNewsItem[] = []

    $('article, .article-item, .news-item, [class*="article"]').each((_, el) => {
      const $el = $(el)
      const title = $el.find('h2, h3, .title, [class*="title"]').first().text().trim()
      const url = $el.find('a').first().attr('href') || ''
      const description = $el.find('p, .summary, .excerpt, [class*="desc"]').first().text().trim()

      if (title && title.length > 1) {
        items.push({
          sourceId: source.id,
          platform: 'hyperai',
          title,
          url: url.startsWith('http') ? url : `https://hyper.ai${url}`,
          description: description.substring(0, 200),
          fetchedAt: new Date(),
        })
      }
    })

    return items
  },
}

// 解析器映射
const parsers: Record<string, HtmlParser> = {
  baidu: baiduParser,
  ithome: ithomeParser,
  hyperai: hyperaiParser,
}

export class HtmlFetcher implements Fetcher {
  async fetch(source: FetcherSource): Promise<RawNewsItem[]> {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      ...source.headers,
    }

    const response = await fetch(source.url, {
      method: source.method || 'GET',
      headers,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()
    const parserName = source.parser

    if (!parserName || !parsers[parserName]) {
      throw new Error(`未找到 HTML 解析器: ${parserName}`)
    }

    return parsers[parserName].parse(html, source)
  }
}
