const API_BASE = 'http://localhost:8762/api'
const API_ORIGIN = 'http://localhost:8762'

/** 相对上传路径 → 绝对 URL */
export function assetUrl(path: string): string {
  if (!path) return path
  return path.startsWith('http') ? path : `${API_ORIGIN}${path}`
}

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
      ...headers,
    }

    if (body) {
      requestHeaders['Content-Type'] = 'application/json'
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
  async login(identifier: string, password: string) {
    return this.request<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: { identifier, password },
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

  async updateProfile(data: { nickname?: string; avatar?: string }) {
    return this.request<any>('/auth/profile', { method: 'PUT', body: data })
  }

  async updatePassword(currentPassword: string, newPassword: string) {
    return this.request<{ success: boolean }>('/auth/password', {
      method: 'PUT',
      body: { currentPassword, newPassword },
    })
  }

  // 新闻
  async getNews(params: {
    page?: number
    pageSize?: number
    sourceType?: 'rss' | 'api' | 'topic'
    sourceId?: number
    sourceCode?: string
    platform?: string
    search?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.set('page', String(params.page))
    if (params.pageSize) searchParams.set('pageSize', String(params.pageSize))
    if (params.sourceType) searchParams.set('sourceType', params.sourceType)
    if (params.sourceId) searchParams.set('sourceId', String(params.sourceId))
    if (params.sourceCode) searchParams.set('sourceCode', params.sourceCode)
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

  // 社区 - 瓜友议事厅
  async getCommunityPosts(params?: {
    page?: number
    pageSize?: number
    search?: string
    mine?: boolean
  }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize))
    if (params?.search) searchParams.set('search', params.search)
    if (params?.mine) searchParams.set('mine', '1')

    return this.request<any>(`/community/posts?${searchParams.toString()}`)
  }

  async createCommunityPost(data: { title: string; content: string }) {
    return this.request<{ success: boolean; post: any }>('/community/posts', {
      method: 'POST',
      body: data,
    })
  }

  async getCommunityPost(id: number) {
    return this.request<any>(`/community/posts/${id}`)
  }

  async updateCommunityPost(id: number, data: { title?: string; content?: string }) {
    return this.request<{ success: boolean; post: any }>(`/community/posts/${id}`, {
      method: 'PUT',
      body: data,
    })
  }

  async deleteCommunityPost(id: number) {
    return this.request<{ success: boolean }>(`/community/posts/${id}`, { method: 'DELETE' })
  }

  async togglePostLike(id: number) {
    return this.request<{ success: boolean; liked: boolean; likeCount: number }>(
      `/community/posts/${id}/like`,
      { method: 'POST', body: {} }
    )
  }

  async getCommunityComments(postId: number, page = 1, pageSize = 20) {
    return this.request<any>(
      `/community/posts/${postId}/comments?page=${page}&pageSize=${pageSize}`
    )
  }

  async createCommunityComment(postId: number, content: string, parentCommentId?: number) {
    return this.request<{ success: boolean; comment: any }>(`/community/posts/${postId}/comments`, {
      method: 'POST',
      body: parentCommentId ? { content, parentCommentId } : { content },
    })
  }

  async deleteCommunityComment(id: number) {
    return this.request<{ success: boolean }>(`/community/comments/${id}`, { method: 'DELETE' })
  }

  async toggleCommentLike(id: number) {
    return this.request<{ success: boolean; liked: boolean; likeCount: number }>(
      `/community/comments/${id}/like`,
      { method: 'POST', body: {} }
    )
  }

  // 瓜田电波 - 短动态
  async getMoments(params?: { page?: number; pageSize?: number; mine?: boolean }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize))
    if (params?.mine) searchParams.set('mine', '1')

    return this.request<any>(`/moments?${searchParams.toString()}`)
  }

  async createMoment(
    content: string,
    images?: Array<{ originalUrl: string; thumbUrl: string; width?: number; height?: number }>
  ) {
    return this.request<{ success: boolean; moment: any }>('/moments', {
      method: 'POST',
      body: { content, images },
    })
  }

  async uploadImages(files: File[]) {
    const formData = new FormData()
    for (const file of files) formData.append('file', file)

    const headers: Record<string, string> = {}
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`

    const response = await fetch(`${API_BASE}/uploads/images`, {
      method: 'POST',
      headers,
      body: formData,
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: '上传失败' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }
    return response.json() as Promise<{
      images: Array<{
        originalUrl: string
        thumbUrl: string
        width: number
        height: number
        bytesOriginal: number
        bytesThumb: number
      }>
    }>
  }

  async deleteMoment(id: number) {
    return this.request<{ success: boolean }>(`/moments/${id}`, { method: 'DELETE' })
  }

  async toggleMomentLike(id: number) {
    return this.request<{ success: boolean; liked: boolean; likeCount: number }>(
      `/moments/${id}/like`,
      { method: 'POST', body: {} }
    )
  }

  async getMomentComments(momentId: number, page = 1, pageSize = 20) {
    return this.request<any>(`/moments/${momentId}/comments?page=${page}&pageSize=${pageSize}`)
  }

  async createMomentComment(momentId: number, content: string) {
    return this.request<{ success: boolean; comment: any }>(`/moments/${momentId}/comments`, {
      method: 'POST',
      body: { content },
    })
  }

  async deleteMomentComment(id: number) {
    return this.request<{ success: boolean }>(`/moments/comments/${id}`, { method: 'DELETE' })
  }

  async toggleMomentCommentLike(id: number) {
    return this.request<{ success: boolean; liked: boolean; likeCount: number }>(
      `/moments/comments/${id}/like`,
      { method: 'POST', body: {} }
    )
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
    return this.request<any>(`/admin/sources/${id}/fetch`, { method: 'POST' })
  }

  async testSource(id: number) {
    return this.request<any>(`/admin/sources/${id}/test`, { method: 'POST' })
  }

  // 管理员 - 内置 API 源（按 code 操作）
  async fetchBuiltinSource(code: string) {
    return this.request<any>(`/admin/sources/builtin/${code}/fetch`, { method: 'POST' })
  }

  async testBuiltinSource(code: string) {
    return this.request<any>(`/admin/sources/builtin/${code}/test`, { method: 'POST' })
  }

  async updateBuiltinSource(code: string, data: { enabled: boolean }) {
    return this.request<any>(`/admin/sources/builtin/${code}`, { method: 'PUT', body: data })
  }

  async getBuiltinSourceLogs(code: string, params?: { page?: number; pageSize?: number }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize))

    return this.request<any>(`/admin/sources/builtin/${code}/logs?${searchParams.toString()}`)
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
    search?: string
    sourceId?: number
    sourceCode?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize))
    if (params?.status) searchParams.set('status', params.status)
    if (params?.sourceType) searchParams.set('sourceType', params.sourceType)
    if (params?.search) searchParams.set('search', params.search)
    if (params?.sourceId) searchParams.set('sourceId', String(params.sourceId))
    if (params?.sourceCode) searchParams.set('sourceCode', params.sourceCode)

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
    return this.request<any>('/admin/content/fetch', { method: 'POST' })
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

  // 管理员 - 日志
  async getFetchLogs(params?: {
    page?: number
    pageSize?: number
    sourceId?: number
    sourceCode?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize))
    if (params?.sourceId) searchParams.set('sourceId', String(params.sourceId))
    if (params?.sourceCode) searchParams.set('sourceCode', params.sourceCode)

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

  // 管理员 - 告警
  async getAlerts(params?: { page?: number; pageSize?: number; resolved?: boolean }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize))
    if (params?.resolved !== undefined) searchParams.set('resolved', String(params.resolved))

    return this.request<any>(`/admin/alerts?${searchParams.toString()}`)
  }

  async resolveAlert(id: number) {
    return this.request<any>(`/admin/alerts/${id}/resolve`, { method: 'PUT' })
  }

  // 管理员 - 审计日志
  async getAuditLogs(params?: {
    page?: number
    pageSize?: number
    userId?: number
    resource?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize))
    if (params?.userId) searchParams.set('userId', String(params.userId))
    if (params?.resource) searchParams.set('resource', params.resource)

    return this.request<any>(`/admin/audit?${searchParams.toString()}`)
  }
}

export const api = new ApiService()
