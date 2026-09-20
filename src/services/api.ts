const API_BASE = 'http://localhost:3000/api'

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
}

class ApiService {
  private token: string | null = null

  setToken(token: string | null) {
    this.token = token
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    }

    if (this.token) {
      requestHeaders['Authorization'] = `Bearer ${this.token}`
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: '请求失败' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // 认证
  async login(email: string, password: string) {
    return this.request<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    })
  }

  async register(username: string, email: string, password: string, inviteCode: string) {
    return this.request<{ user: any; token: string }>('/auth/register', {
      method: 'POST',
      body: { username, email, password, inviteCode },
    })
  }

  async getMe() {
    return this.request<any>('/auth/me')
  }

  // 新闻
  async getNews(params: {
    page?: number
    pageSize?: number
    sourceType?: 'rss' | 'api' | 'topic'
    sourceId?: number
    platform?: string
    search?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.set('page', String(params.page))
    if (params.pageSize) searchParams.set('pageSize', String(params.pageSize))
    if (params.sourceType) searchParams.set('sourceType', params.sourceType)
    if (params.sourceId) searchParams.set('sourceId', String(params.sourceId))
    if (params.platform) searchParams.set('platform', params.platform)
    if (params.search) searchParams.set('search', params.search)

    return this.request<any>(`/news?${searchParams.toString()}`)
  }

  async getNewsById(id: number) {
    return this.request<any>(`/news/${id}`)
  }

  async getNewsSources(sourceType?: string) {
    const searchParams = new URLSearchParams()
    if (sourceType) searchParams.set('sourceType', sourceType)
    return this.request<any[]>(`/news/sources?${searchParams.toString()}`)
  }

  async getPlatforms(sourceType?: string) {
    const searchParams = new URLSearchParams()
    if (sourceType) searchParams.set('sourceType', sourceType)
    return this.request<string[]>(`/news/platforms?${searchParams.toString()}`)
  }

  // 收藏
  async getFavorites(page = 1, pageSize = 20) {
    return this.request<any>(`/favorites?page=${page}&pageSize=${pageSize}`)
  }

  async addFavorite(newsId: number) {
    return this.request<any>(`/favorites/${newsId}`, { method: 'POST', body: {} })
  }

  async removeFavorite(newsId: number) {
    return this.request<any>(`/favorites/${newsId}`, { method: 'DELETE' })
  }

  // 管理员 - 数据源
  async getSources() {
    return this.request<any[]>('/admin/sources')
  }

  async createSource(data: any) {
    return this.request<any>('/admin/sources', { method: 'POST', body: data })
  }

  async updateSource(id: number, data: any) {
    return this.request<any>(`/admin/sources/${id}`, { method: 'PUT', body: data })
  }

  async deleteSource(id: number) {
    return this.request<any>(`/admin/sources/${id}`, { method: 'DELETE' })
  }

  async fetchSource(id: number) {
    return this.request<any>(`/admin/sources/${id}/fetch`, { method: 'POST', body: {} })
  }

  async testSource(id: number) {
    return this.request<any>(`/admin/sources/${id}/test`, { method: 'POST', body: {} })
  }

  // 管理员 - 用户
  async getUsers(params?: { page?: number; pageSize?: number }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize))

    return this.request<any>(`/admin/users?${searchParams.toString()}`)
  }

  async createUser(data: any) {
    return this.request<any>('/admin/users', { method: 'POST', body: data })
  }

  async updateUser(id: number, data: any) {
    return this.request<any>(`/admin/users/${id}`, { method: 'PUT', body: data })
  }

  async deleteUser(id: number) {
    return this.request<any>(`/admin/users/${id}`, { method: 'DELETE' })
  }

  async resetPassword(id: number, password: string) {
    return this.request<any>(`/admin/users/${id}/reset-password`, {
      method: 'PUT',
      body: { password },
    })
  }

  // 管理员 - 内容
  async getAdminContent(params?: {
    page?: number
    pageSize?: number
    status?: string
    sourceType?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize))
    if (params?.status) searchParams.set('status', params.status)
    if (params?.sourceType) searchParams.set('sourceType', params.sourceType)

    return this.request<any>(`/admin/content?${searchParams.toString()}`)
  }

  async updateContent(id: number, data: any) {
    return this.request<any>(`/admin/content/${id}`, { method: 'PUT', body: data })
  }

  async deleteContent(id: number) {
    return this.request<any>(`/admin/content/${id}`, { method: 'DELETE' })
  }

  async batchDeleteContent(ids: number[]) {
    return this.request<any>('/admin/content/batch-delete', { method: 'POST', body: { ids } })
  }

  async fetchAllContent() {
    return this.request<any>('/admin/content/fetch', { method: 'POST', body: {} })
  }

  // 管理员 - 配置
  async getConfig() {
    return this.request<any>('/admin/config')
  }

  async updateConfig(data: any) {
    return this.request<any>('/admin/config', { method: 'PUT', body: data })
  }

  async getAutoFetch() {
    return this.request<{ enabled: boolean }>('/admin/config/auto-fetch')
  }

  async setAutoFetch(enabled: boolean) {
    return this.request<any>('/admin/config/auto-fetch', { method: 'PUT', body: { enabled } })
  }

  async getAIModels(baseUrl: string, apiKey: string) {
    return this.request<{ models: string[] }>('/admin/config/ai/models', {
      method: 'POST',
      body: { baseUrl, apiKey },
    })
  }

  // 管理员 - 统计
  async getStats() {
    return this.request<any>('/admin/stats')
  }

  // 管理员 - 类别
  async getAdminCategories() {
    return this.request<any[]>('/admin/categories')
  }

  async getEnabledCategories() {
    return this.request<any[]>('/admin/categories/enabled')
  }

  async createCategory(data: any) {
    return this.request<any>('/admin/categories', { method: 'POST', body: data })
  }

  async updateCategory(id: number, data: any) {
    return this.request<any>(`/admin/categories/${id}`, { method: 'PUT', body: data })
  }

  async deleteCategory(id: number) {
    return this.request<any>(`/admin/categories/${id}`, { method: 'DELETE' })
  }

  // 管理员 - 日志
  async getFetchLogs(params?: { page?: number; pageSize?: number; sourceId?: number }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize))
    if (params?.sourceId) searchParams.set('sourceId', String(params.sourceId))

    return this.request<any>(`/admin/logs/fetch?${searchParams.toString()}`)
  }

  async getAILogs(params?: { page?: number; pageSize?: number; status?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize))
    if (params?.status) searchParams.set('status', params.status)

    return this.request<any>(`/admin/logs/ai?${searchParams.toString()}`)
  }

  async getErrorLogs(params?: { page?: number; pageSize?: number }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize))

    return this.request<any>(`/admin/logs/errors?${searchParams.toString()}`)
  }
}

export const api = new ApiService()
