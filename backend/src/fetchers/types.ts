export interface RawNewsItem {
  sourceId: number
  platform: string
  title: string
  url: string
  description?: string
  author?: string
  publishedAt?: Date
  fetchedAt: Date
  hotScore?: number
  metadata?: Record<string, unknown>
}

export interface Fetcher {
  fetch(source: FetcherSource): Promise<RawNewsItem[]>
}

export interface FetcherSource {
  id: number
  name: string
  url: string
  method?: 'GET' | 'POST'
  headers?: Record<string, string>
  body?: string
  parser?: string
}

export interface PlatformParser {
  /** 响应体类型，缺省 json；text 供 XML/纯文本类接口（配 charset 解码） */
  responseType?: 'json' | 'text'
  /** responseType=text 时的字符编码，如 gbk */
  charset?: string
  /** 抓取前改写 URL（如把固定日期换成当天） */
  prepareUrl?(url: string): string
  parse(data: unknown, source: FetcherSource): RawNewsItem[] | Promise<RawNewsItem[]>
}
