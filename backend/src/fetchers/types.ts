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
