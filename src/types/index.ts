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
  publishedAt: string | null
  aiScore: number | null
  aiSummary: string | null
  categories: string[]
  sourceId: number | null
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

export interface Category {
  id: number
  name: string
  count: number
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
  categoryDistribution: Array<{ name: string; count: number }>
  dailyTrend: Array<{ date: string; count: number }>
  scoreDistribution: Array<{ range: string; count: number }>
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

export interface AILog extends LogItem {
  newsItemId: number
  tokensUsed?: number | null
}
