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

    $('.category-wrap_iQLoo').each((_, el) => {
      const $el = $(el)
      const title = $el('.c-single-text-ellipsis').text().trim()
      const url = $el('a').attr('href') || ''
      const hotScore = parseInt($el('.hot-index_1Bl1a').text().trim()) || 0

      if (title) {
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

// IT之家
const ithomeParser: HtmlParser = {
  parse(html, source) {
    const $ = cheerio.load(html)
    const items: RawNewsItem[] = []

    $('item').each((_, el) => {
      const $el = $(el)
      const title = $el.find('title').text().trim()
      const url = $el.find('link').text().trim()
      const description = $el.find('description').text().trim()
      const pubDate = $el.find('pubDate').text().trim()

      if (title) {
        items.push({
          sourceId: source.id,
          platform: 'ithome',
          title,
          url,
          description,
          publishedAt: pubDate ? new Date(pubDate) : undefined,
          fetchedAt: new Date(),
        })
      }
    })

    return items
  },
}

// 超神经
const hyperaiParser: HtmlParser = {
  parse(html, source) {
    const $ = cheerio.load(html)
    const items: RawNewsItem[] = []

    $('article, .article-item, .news-item').each((_, el) => {
      const $el = $(el)
      const title = $el.find('h2, h3, .title').first().text().trim()
      const url = $el.find('a').first().attr('href') || ''
      const description = $el.find('p, .summary, .excerpt').first().text().trim()

      if (title) {
        items.push({
          sourceId: source.id,
          platform: 'hyperai',
          title,
          url: url.startsWith('http') ? url : `https://hyper.ai${url}`,
          description,
          fetchedAt: new Date(),
        })
      }
    })

    return items
  },
}

// 澎湃新闻
const thepaperParser: HtmlParser = {
  parse(html, source) {
    const $ = cheerio.load(html)
    const items: RawNewsItem[] = []

    // 尝试解析 JSON 数据
    try {
      const jsonData = $('script[type="application/json"]').html()
      if (jsonData) {
        const data = JSON.parse(jsonData)
        // 根据实际 API 响应结构解析
        return items
      }
    } catch {
      // 继续尝试 HTML 解析
    }

    $('a').each((_, el) => {
      const $el = $(el)
      const title = $el.text().trim()
      const url = $el.attr('href') || ''

      if (title && url && url.includes('/detail/')) {
        items.push({
          sourceId: source.id,
          platform: 'thepaper',
          title,
          url: url.startsWith('http') ? url : `https://www.thepaper.cn${url}`,
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
  thepaper: thepaperParser,
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
