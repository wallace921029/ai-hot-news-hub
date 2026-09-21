export interface User {
  id: number
  username: string
  email: string
  role: 'admin' | 'user'
  status: 'active' | 'disabled'
  createdAt?: string
}

export interface NewsItem {
  id: number
  title: string
  url: string
  description: string | null
  platform: string
  sourceType: 'rss' | 'api' | 'topic'
  sourceId: number | null
  sourceName?: string
  publishedAt: string | null
  fetchedAt: string
  author?: string | null
  hotScore?: number | null
  metadata?: Record<string, unknown> | null
  status?: 'pending' | 'processed' | 'failed'
}

export interface NewsListResponse {
  items: NewsItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface DataSource {
  id: number
  name: string
  type: 'rest' | 'rss' | 'html'
  sourceType: 'rss' | 'api' | 'topic'
  url: string
  method: 'GET' | 'POST'
  headers: Record<string, string> | null
  body: string | null
  parser: string | null
  enabled: boolean
  fetchInterval: number
  lastFetchAt: string | null
  lastError: string | null
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface DataSourceOption {
  id: number
  name: string
  sourceType: 'rss' | 'api' | 'topic'
  description: string | null
}

export interface Favorite {
  id: number
  createdAt: string
  newsItem: NewsItem | null
}

export interface Stats {
  overview: {
    totalNews: number
    todayNews: number
    totalSources: number
    activeSources: number
    totalUsers: number
    totalFetches: number
    successFetches: number
    fetchSuccessRate: number
  }
  platformDistribution: Array<{ platform: string; count: number }>
  dailyTrend: Array<{ date: string; count: number }>
}

export interface LogItem {
  id: number
  status: 'success' | 'failed'
  duration: number
  count?: number
  error?: string | null
  createdAt: string
}

export interface FetchLog extends LogItem {
  sourceId: number
}
