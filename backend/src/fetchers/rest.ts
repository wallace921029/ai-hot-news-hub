import type { Fetcher, FetcherSource, RawNewsItem } from './types.js'

interface PlatformParser {
  parse(data: unknown, source: FetcherSource): RawNewsItem[]
}

// 知乎热榜
const zhihuParser: PlatformParser = {
  parse(data, source) {
    const hotListData = data as {
      data: Array<{ target: { title: string; url: string; excerpt?: string } }>
    }
    if (hotListData.data && Array.isArray(hotListData.data)) {
      return hotListData.data.map((item) => ({
        sourceId: source.id,
        platform: 'zhihu',
        title: item.target.title,
        url: item.target.url,
        description: item.target.excerpt,
        fetchedAt: new Date(),
      }))
    }
    return []
  },
}

// 知乎日报
const zhihuDailyParser: PlatformParser = {
  parse(data, source) {
    const dailyData = data as {
      stories: Array<{ id: number; title: string; url: string; hint?: string }>
    }
    if (!dailyData.stories || !Array.isArray(dailyData.stories)) return []
    return dailyData.stories.map((item) => ({
      sourceId: source.id,
      platform: 'zhihu',
      title: item.title,
      url: item.url,
      description: item.hint,
      fetchedAt: new Date(),
    }))
  },
}

// 微博热搜
const weiboParser: PlatformParser = {
  parse(data, source) {
    const items = (
      data as { data: { realtime: Array<{ word: string; num: number; label_name?: string }> } }
    ).data.realtime
    return items.map((item) => ({
      sourceId: source.id,
      platform: 'weibo',
      title: item.word,
      url: `https://s.weibo.com/weibo?q=${encodeURIComponent(item.word)}`,
      hotScore: item.num,
      metadata: { label: item.label_name },
      fetchedAt: new Date(),
    }))
  },
}

// B站热搜
const bilibiliParser: PlatformParser = {
  parse(data, source) {
    const items = (
      data as {
        data: { trending: { list: Array<{ keyword: string; show_name: string; hot_id: number }> } }
      }
    ).data.trending.list
    return items.map((item) => ({
      sourceId: source.id,
      platform: 'bilibili',
      title: item.show_name || item.keyword,
      url: `https://search.bilibili.com/all?keyword=${encodeURIComponent(item.keyword)}`,
      fetchedAt: new Date(),
    }))
  },
}

// 今日头条
const toutiaoParser: PlatformParser = {
  parse(data, source) {
    const items = (
      data as { data: Array<{ Title: string; Url: string; HotValue?: number; LabelDesc?: string }> }
    ).data
    return items.map((item) => ({
      sourceId: source.id,
      platform: 'toutiao',
      title: item.Title,
      url: item.Url,
      hotScore: item.HotValue,
      metadata: { label: item.LabelDesc },
      fetchedAt: new Date(),
    }))
  },
}

// 掘金
const juejinParser: PlatformParser = {
  parse(data, source) {
    const response = data as {
      data: Array<{
        item_info: {
          article_info: {
            title: string
            link_url: string
            brief_content: string
            digg_count: number
            article_id: string
          }
        }
      }>
    }
    return (response.data || [])
      .filter((item) => item.item_info?.article_info)
      .map((item) => {
        const article = item.item_info.article_info
        return {
          sourceId: source.id,
          platform: 'juejin',
          title: article.title,
          url: article.link_url || `https://juejin.cn/post/${article.article_id}`,
          description: article.brief_content?.substring(0, 200),
          hotScore: article.digg_count,
          fetchedAt: new Date(),
        }
      })
  },
}

// CSDN
const csdnParser: PlatformParser = {
  parse(data, source) {
    const items = (
      data as {
        data: Array<{
          articleTitle: string
          articleDetailUrl: string
          viewCount: number | string
          commentCount: number | string
          favorCount: number | string
          hotRankScore: number | string
          nickName: string
        }>
      }
    ).data
    return items.map((item) => ({
      sourceId: source.id,
      platform: 'csdn',
      title: item.articleTitle,
      url: item.articleDetailUrl,
      author: item.nickName,
      hotScore: Number(item.hotRankScore) || Number(item.viewCount) || 0,
      metadata: {
        views: Number(item.viewCount) || 0,
        comments: Number(item.commentCount) || 0,
        favorites: Number(item.favorCount) || 0,
      },
      fetchedAt: new Date(),
    }))
  },
}

// GitHub
const githubParser: PlatformParser = {
  parse(data, source) {
    const items = (
      data as {
        items: Array<{
          name: string
          full_name: string
          description: string
          html_url: string
          stargazers_count: number
          language: string
        }>
      }
    ).items
    return items.map((item) => ({
      sourceId: source.id,
      platform: 'github',
      title: item.full_name,
      url: item.html_url,
      description: item.description,
      hotScore: item.stargazers_count,
      metadata: { language: item.language },
      fetchedAt: new Date(),
    }))
  },
}

// Hugging Face
const huggingfaceParser: PlatformParser = {
  parse(data, source) {
    const items = data as Array<{
      id: string
      likes: number
      downloads: number
      pipeline_tag?: string
    }>
    return items.map((item) => ({
      sourceId: source.id,
      platform: 'huggingface',
      title: item.id,
      url: `https://huggingface.co/${item.id}`,
      hotScore: item.likes,
      metadata: { downloads: item.downloads, tag: item.pipeline_tag },
      fetchedAt: new Date(),
    }))
  },
}

// 机器之心 - API 已不可用，改用 RSS
const jiqizhixinParser: PlatformParser = {
  parse() {
    // 机器之心 API 已返回 HTML 页面，无法解析
    return []
  },
}

// 36氪
const kr36Parser: PlatformParser = {
  parse(data, source) {
    const response = data as {
      data: {
        hotRankList: Array<{
          itemId: number
          templateMaterial: {
            widgetTitle: string
          }
        }>
      }
    }
    const items = response.data?.hotRankList || []
    return items.map((item) => ({
      sourceId: source.id,
      platform: '36kr',
      title: item.templateMaterial.widgetTitle,
      url: `https://36kr.com/p/${item.itemId}`,
      fetchedAt: new Date(),
    }))
  },
}

// 豆瓣电影
const doubanParser: PlatformParser = {
  parse(data, source) {
    const items = (
      data as { subjects: Array<{ title: string; url: string; rate: string; cover: string }> }
    ).subjects
    return items.map((item) => ({
      sourceId: source.id,
      platform: 'douban',
      title: item.title,
      url: item.url,
      hotScore: parseFloat(item.rate),
      metadata: { cover: item.cover },
      fetchedAt: new Date(),
    }))
  },
}

// 澎湃新闻 - 使用 REST API
const thepaperParser: PlatformParser = {
  parse(data, source) {
    const response = data as {
      data: {
        hotNews: Array<{
          contId: string
          name: string
          pubTime?: string
          praiseTimes?: string
        }>
      }
    }
    const items = response.data?.hotNews || []
    return items.map((item) => ({
      sourceId: source.id,
      platform: 'thepaper',
      title: item.name,
      url: `https://www.thepaper.cn/newsDetail_forward_${item.contId}`,
      hotScore: item.praiseTimes ? parseInt(item.praiseTimes) : undefined,
      fetchedAt: new Date(),
    }))
  },
}

// 少数派
const sspaiParser: PlatformParser = {
  parse(data, source) {
    const response = data as {
      data: Array<{ title: string; url: string; summary?: string }> | null
      error?: number
      msg?: string
    }
    if (!response.data || response.error) {
      throw new Error(response.msg || '少数派 API 需要登录或返回错误')
    }
    return response.data.map((item) => ({
      sourceId: source.id,
      platform: 'sspai',
      title: item.title,
      url: `https://sspai.com${item.url}`,
      description: item.summary,
      fetchedAt: new Date(),
    }))
  },
}

// 微信读书
const wereadParser: PlatformParser = {
  parse(data, source) {
    const items = (
      data as {
        books: Array<{ book: { title: string; author: string; bookId: string; newRating: number } }>
      }
    ).books
    return items.map((item) => ({
      sourceId: source.id,
      platform: 'weread',
      title: item.book.title,
      url: `https://weread.qq.com/web/book/${item.book.bookId}`,
      author: item.book.author,
      hotScore: item.book.newRating,
      fetchedAt: new Date(),
    }))
  },
}

// V2EX 热门话题
const v2exParser: PlatformParser = {
  parse(data, source) {
    const items = data as Array<{
      id: number
      title: string
      url: string
      content?: string
      node?: { title: string }
      member?: { username: string }
      replies?: number
    }>
    if (!Array.isArray(items)) return []
    return items.map((item) => ({
      sourceId: source.id,
      platform: 'v2ex',
      title: item.title,
      url: item.url || `https://www.v2ex.com/t/${item.id}`,
      description: item.content
        ? item.content.replace(/<[^>]*>/g, '').substring(0, 200)
        : undefined,
      author: item.member?.username,
      hotScore: item.replies,
      metadata: { node: item.node?.title },
      fetchedAt: new Date(),
    }))
  },
}

// 解析器映射
const parsers: Record<string, PlatformParser> = {
  zhihu: zhihuParser,
  'zhihu-daily': zhihuDailyParser,
  weibo: weiboParser,
  bilibili: bilibiliParser,
  toutiao: toutiaoParser,
  juejin: juejinParser,
  csdn: csdnParser,
  github: githubParser,
  huggingface: huggingfaceParser,
  jiqizhixin: jiqizhixinParser,
  '36kr': kr36Parser,
  douban: doubanParser,
  thepaper: thepaperParser,
  sspai: sspaiParser,
  weread: wereadParser,
  v2ex: v2exParser,
}

export class RestFetcher implements Fetcher {
  async fetch(source: FetcherSource): Promise<RawNewsItem[]> {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      ...source.headers,
    }

    const response = await fetch(source.url, {
      method: source.method || 'GET',
      headers,
      body: source.method === 'POST' ? source.body : undefined,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    const parserName = source.parser || this.detectParser(source.url)

    if (!parserName || !parsers[parserName]) {
      throw new Error(`未找到解析器: ${parserName || source.url}`)
    }

    return parsers[parserName].parse(data, source)
  }

  private detectParser(url: string): string | null {
    const urlMap: [string, string][] = [
      ['api.zhihu.com', 'zhihu'],
      ['news-at.zhihu.com', 'zhihu-daily'],
      ['weibo.com', 'weibo'],
      ['bilibili.com', 'bilibili'],
      ['toutiao.com', 'toutiao'],
      ['juejin.cn', 'juejin'],
      ['csdn.net', 'csdn'],
      ['api.github.com', 'github'],
      ['huggingface.co', 'huggingface'],
      ['jiqizhixin.com', 'jiqizhixin'],
      ['36kr.com', '36kr'],
      ['douban.com', 'douban'],
      ['sspai.com', 'sspai'],
      ['weread.qq.com', 'weread'],
      ['v2ex.com', 'v2ex'],
    ]

    for (const [domain, parser] of urlMap) {
      if (url.includes(domain)) {
        return parser
      }
    }

    return null
  }
}
