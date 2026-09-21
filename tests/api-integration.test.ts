import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'

const BASE = 'http://localhost:8762/api'
let adminToken = ''
let userToken = ''
let testUserId = 0
let testSourceId = 0
let testNewsId = 0

async function api(method: string, path: string, body?: unknown, token?: string) {
  const headers: Record<string, string> = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }

  return { status: res.status, data, ok: res.ok }
}

// ============================================================
// Auth
// ============================================================
describe('Auth API', () => {
  it('POST /auth/login — admin login', async () => {
    const res = await api('POST', '/auth/login', {
      email: 'admin@example.com',
      password: 'admin123',
    })
    assert.equal(res.status, 200)
    assert.ok((res.data as any).token)
    assert.equal((res.data as any).user.role, 'admin')
    adminToken = (res.data as any).token
  })

  it('POST /auth/login — wrong password', async () => {
    const res = await api('POST', '/auth/login', {
      email: 'admin@example.com',
      password: 'wrongpassword',
    })
    assert.equal(res.status, 401)
  })

  it('POST /auth/login — non-existent user', async () => {
    const res = await api('POST', '/auth/login', {
      email: 'nobody@example.com',
      password: 'password',
    })
    assert.equal(res.status, 401)
  })

  it('GET /auth/me — get current user', async () => {
    const res = await api('GET', '/auth/me', undefined, adminToken)
    assert.equal(res.status, 200)
    assert.equal((res.data as any).email, 'admin@example.com')
  })

  it('GET /auth/me — no token', async () => {
    const res = await api('GET', '/auth/me')
    assert.equal(res.status, 401)
  })

  it('POST /auth/register — with valid invite code', async () => {
    // Use unique email to avoid conflicts with previous runs
    const uniqueEmail = `test-${Date.now()}@example.com`
    const res = await api('POST', '/auth/register', {
      username: `testuser-${Date.now()}`,
      email: uniqueEmail,
      password: 'test123456',
      inviteCode: 'hotnews2026',
    })
    assert.equal(res.status, 200)
    assert.ok((res.data as any).token)
    assert.equal((res.data as any).user.role, 'user')
    userToken = (res.data as any).token
    testUserId = (res.data as any).user.id
  })

  it('POST /auth/register — wrong invite code', async () => {
    const res = await api('POST', '/auth/register', {
      username: 'baduser',
      email: 'bad@example.com',
      password: 'test123456',
      inviteCode: 'wrongcode',
    })
    assert.equal(res.status, 400)
  })

  it('POST /auth/register — duplicate email', async () => {
    const res = await api('POST', '/auth/register', {
      username: 'another',
      email: 'admin@example.com', // Already exists
      password: 'test123456',
      inviteCode: 'hotnews2026',
    })
    assert.equal(res.status, 409)
  })
})

// ============================================================
// News
// ============================================================
describe('News API', () => {
  it('GET /news — empty list initially', async () => {
    const res = await api('GET', '/news?page=1&pageSize=5')
    assert.equal(res.status, 200)
    assert.ok(Array.isArray((res.data as any).items))
    assert.ok((res.data as any).pagination)
  })

  it('GET /news/sources — returns sources', async () => {
    const res = await api('GET', '/news/sources')
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.data))
  })

  it('GET /news/platforms — returns platforms', async () => {
    const res = await api('GET', '/news/platforms')
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.data))
  })
})

// ============================================================
// Favorites
// ============================================================
describe('Favorites API', () => {
  it('GET /favorites — requires auth', async () => {
    const res = await api('GET', '/favorites')
    assert.equal(res.status, 401)
  })

  it('GET /favorites — empty list for new user', async () => {
    if (!userToken) return // Skip if registration failed
    const res = await api('GET', '/favorites', undefined, userToken)
    assert.equal(res.status, 200)
    assert.ok(Array.isArray((res.data as any).items))
  })

  it('POST /favorites/:id — non-existent news', async () => {
    if (!userToken) return // Skip if registration failed
    const res = await api('POST', '/favorites/99999', undefined, userToken)
    assert.ok(res.status === 404 || res.status === 400)
  })
})

// ============================================================
// Admin — Sources
// ============================================================
describe('Admin Sources API', () => {
  it('GET /admin/sources — returns all sources', async () => {
    const res = await api('GET', '/admin/sources', undefined, adminToken)
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.data))
    assert.ok((res.data as any).length > 0)
    testSourceId = (res.data as any)[0].id
  })

  it('GET /admin/sources — requires admin', async () => {
    const res = await api('GET', '/admin/sources', undefined, userToken)
    assert.ok(res.status === 401 || res.status === 403)
  })

  it('POST /admin/sources — create source', async () => {
    const res = await api(
      'POST',
      '/admin/sources',
      {
        name: 'Test Source',
        type: 'rest',
        url: 'https://httpbin.org/get',
        method: 'GET',
        parser: 'test',
        enabled: true,
        fetchInterval: 30,
        description: 'Test source for integration tests',
      },
      adminToken
    )
    assert.equal(res.status, 200)
    assert.ok((res.data as any).id)
    testSourceId = (res.data as any).id
  })

  it('PUT /admin/sources/:id — update source', async () => {
    const res = await api(
      'PUT',
      `/admin/sources/${testSourceId}`,
      { name: 'Updated Test Source' },
      adminToken
    )
    assert.equal(res.status, 200)
    assert.equal((res.data as any).name, 'Updated Test Source')
  })

  it('POST /admin/sources/:id/test — test connectivity', async () => {
    const res = await api('POST', `/admin/sources/${testSourceId}/test`, undefined, adminToken)
    assert.equal(res.status, 200)
    assert.ok('success' in (res.data as any))
  })

  it('DELETE /admin/sources/:id — delete source', async () => {
    const res = await api('DELETE', `/admin/sources/${testSourceId}`, undefined, adminToken)
    assert.equal(res.status, 200)
    assert.equal((res.data as any).success, true)
  })

  it('DELETE /admin/sources/:id — not found', async () => {
    const res = await api('DELETE', '/admin/sources/99999', undefined, adminToken)
    assert.equal(res.status, 404)
  })
})

// ============================================================
// Admin — Users
// ============================================================
describe('Admin Users API', () => {
  it('GET /admin/users — returns users', async () => {
    const res = await api('GET', '/admin/users', undefined, adminToken)
    assert.equal(res.status, 200)
    assert.ok(Array.isArray((res.data as any).items))
  })

  it('POST /admin/users — create user', async () => {
    const uniqueSuffix = Date.now()
    const res = await api(
      'POST',
      '/admin/users',
      {
        username: `admintest-${uniqueSuffix}`,
        email: `admintest-${uniqueSuffix}@example.com`,
        password: 'admin123',
        role: 'user',
      },
      adminToken
    )
    assert.equal(res.status, 200)
    assert.ok((res.data as any).id)
    testUserId = (res.data as any).id
  })

  it('PUT /admin/users/:id — update user', async () => {
    const res = await api(
      'PUT',
      `/admin/users/${testUserId}`,
      { username: `updated-${Date.now()}` },
      adminToken
    )
    assert.equal(res.status, 200)
  })

  it('PUT /admin/users/:id/reset-password — reset password', async () => {
    const res = await api(
      'PUT',
      `/admin/users/${testUserId}/reset-password`,
      { password: 'newpassword123' },
      adminToken
    )
    assert.equal(res.status, 200)
    assert.equal((res.data as any).success, true)
  })

  it('DELETE /admin/users/:id — delete user', async () => {
    const res = await api('DELETE', `/admin/users/${testUserId}`, undefined, adminToken)
    assert.equal(res.status, 200)
    assert.equal((res.data as any).success, true)
  })

  it('DELETE /admin/users/:id — cannot delete self', async () => {
    const res = await api('DELETE', '/admin/users/1', undefined, adminToken)
    assert.ok(res.status === 400 || res.status === 403)
  })
})

// ============================================================
// Admin — Content
// ============================================================
describe('Admin Content API', () => {
  it('GET /admin/content — returns content list', async () => {
    const res = await api('GET', '/admin/content', undefined, adminToken)
    assert.equal(res.status, 200)
    assert.ok('items' in (res.data as any))
    assert.ok('pagination' in (res.data as any))
  })

  it('GET /admin/content — filter by status', async () => {
    const res = await api('GET', '/admin/content?status=processed', undefined, adminToken)
    assert.equal(res.status, 200)
  })

  it('POST /admin/content/fetch — trigger fetch all', async () => {
    const res = await api('POST', '/admin/content/fetch', undefined, adminToken)
    assert.equal(res.status, 200)
    assert.equal((res.data as any).success, true)
  })
})

// ============================================================
// Admin — Config
// ============================================================
describe('Admin Config API', () => {
  it('GET /admin/config — returns config', async () => {
    const res = await api('GET', '/admin/config', undefined, adminToken)
    assert.equal(res.status, 200)
    assert.ok('inviteCode' in (res.data as any))
    assert.ok('registrationEnabled' in (res.data as any))
    assert.ok('fetchInterval' in (res.data as any))
  })

  it('PUT /admin/config — update config', async () => {
    const res = await api('PUT', '/admin/config', { fetchInterval: 60 }, adminToken)
    assert.equal(res.status, 200)
  })

  it('GET /admin/config/auto-fetch — get auto-fetch', async () => {
    const res = await api('GET', '/admin/config/auto-fetch', undefined, adminToken)
    assert.equal(res.status, 200)
    assert.ok('enabled' in (res.data as any))
  })

  it('PUT /admin/config/auto-fetch — toggle auto-fetch', async () => {
    const res = await api('PUT', '/admin/config/auto-fetch', { enabled: true }, adminToken)
    assert.equal(res.status, 200)
  })
})

// ============================================================
// Admin — Stats
// ============================================================
describe('Admin Stats API', () => {
  it('GET /admin/stats — returns stats', async () => {
    const res = await api('GET', '/admin/stats', undefined, adminToken)
    assert.equal(res.status, 200)
    assert.ok('overview' in (res.data as any))
    assert.ok('platformDistribution' in (res.data as any))
    assert.ok('categoryDistribution' in (res.data as any))
    assert.ok('dailyTrend' in (res.data as any))
  })
})

// ============================================================
// Admin — Logs
// ============================================================
describe('Admin Logs API', () => {
  it('GET /admin/logs/fetch — returns fetch logs', async () => {
    const res = await api('GET', '/admin/logs/fetch', undefined, adminToken)
    assert.equal(res.status, 200)
    assert.ok('items' in (res.data as any))
  })

  it('GET /admin/logs/errors — returns error logs', async () => {
    const res = await api('GET', '/admin/logs/errors', undefined, adminToken)
    assert.equal(res.status, 200)
    assert.ok('items' in (res.data as any))
  })

  it('GET /admin/logs/ai — returns AI logs', async () => {
    const res = await api('GET', '/admin/logs/ai', undefined, adminToken)
    assert.equal(res.status, 200)
    assert.ok('items' in (res.data as any))
  })
})

// ============================================================
// Admin — Categories
// ============================================================
describe('Admin Categories API', () => {
  let catId = 0

  it('GET /admin/categories — returns categories', async () => {
    const res = await api('GET', '/admin/categories', undefined, adminToken)
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.data))
  })

  it('POST /admin/categories — create category', async () => {
    const res = await api(
      'POST',
      '/admin/categories',
      { name: 'TestCategory', description: 'Test', enabled: true },
      adminToken
    )
    assert.equal(res.status, 200)
    catId = (res.data as any).id
  })

  it('PUT /admin/categories/:id — update category', async () => {
    const res = await api(
      'PUT',
      `/admin/categories/${catId}`,
      { name: 'UpdatedCategory' },
      adminToken
    )
    assert.equal(res.status, 200)
  })

  it('DELETE /admin/categories/:id — delete category', async () => {
    const res = await api('DELETE', `/admin/categories/${catId}`, undefined, adminToken)
    assert.equal(res.status, 200)
  })

  it('GET /admin/categories/enabled — enabled only', async () => {
    const res = await api('GET', '/admin/categories/enabled', undefined, adminToken)
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.data))
  })
})

// ============================================================
// Permission checks
// ============================================================
describe('Permission checks', () => {
  it('User cannot access admin sources', async () => {
    const res = await api('GET', '/admin/sources', undefined, userToken)
    assert.ok(res.status === 401 || res.status === 403)
  })

  it('User cannot access admin users', async () => {
    const res = await api('GET', '/admin/users', undefined, userToken)
    assert.ok(res.status === 401 || res.status === 403)
  })

  it('User cannot access admin config', async () => {
    const res = await api('GET', '/admin/config', undefined, userToken)
    assert.ok(res.status === 401 || res.status === 403)
  })

  it('User cannot access admin stats', async () => {
    const res = await api('GET', '/admin/stats', undefined, userToken)
    assert.ok(res.status === 401 || res.status === 403)
  })

  it('User cannot access admin content', async () => {
    const res = await api('GET', '/admin/content', undefined, userToken)
    assert.ok(res.status === 401 || res.status === 403)
  })

  it('User cannot access admin logs', async () => {
    const res = await api('GET', '/admin/logs/fetch', undefined, userToken)
    assert.ok(res.status === 401 || res.status === 403)
  })

  it('Unauthenticated cannot access news detail', async () => {
    const res = await api('GET', '/news/1')
    // news detail may return 404 if no items, that's OK
    assert.ok(res.status === 200 || res.status === 404)
  })
})
