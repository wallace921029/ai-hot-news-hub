# AI Hot News Hub — API 接口详细文档

> 版本：v1.0
> 最后更新：2026-09-20

---

## 1. API 概述

### 1.1 基础信息

| 项目     | 说明             |
| -------- | ---------------- |
| 基础路径 | `/api`           |
| 数据格式 | JSON             |
| 认证方式 | JWT Bearer Token |
| 字符编码 | UTF-8            |

### 1.2 通用响应格式

**成功响应：**

```json
{
  "data": { ... },
  "message": "success"
}
```

**错误响应：**

```json
{
  "error": "错误信息",
  "details": { ... },
  "statusCode": 400
}
```

### 1.3 认证说明

需要认证的接口需要在请求头中添加：

```
Authorization: Bearer <token>
```

---

## 2. 认证接口

### 2.1 用户注册

**请求：**

```
POST /api/auth/register
```

**请求体：**

```json
{
  "username": "string", // 用户名，3-50 字符
  "email": "string", // 邮箱地址
  "password": "string", // 密码，至少 6 字符
  "inviteCode": "string" // 邀请码
}
```

**响应：**

```json
{
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**错误码：**

| 状态码 | 说明               |
| ------ | ------------------ |
| 400    | 参数错误           |
| 403    | 注册已关闭         |
| 409    | 用户名或邮箱已存在 |

### 2.2 用户登录

**请求：**

```
POST /api/auth/login
```

**请求体：**

```json
{
  "email": "string", // 邮箱地址
  "password": "string" // 密码
}
```

**响应：**

```json
{
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**错误码：**

| 状态码 | 说明           |
| ------ | -------------- |
| 400    | 参数错误       |
| 401    | 邮箱或密码错误 |
| 403    | 账号已被禁用   |

### 2.3 获取当前用户信息

**请求：**

```
GET /api/auth/me
```

**认证：** 需要

**响应：**

```json
{
  "id": 1,
  "username": "testuser",
  "email": "test@example.com",
  "role": "user",
  "status": "active",
  "createdAt": "2026-09-20T00:00:00.000Z"
}
```

---

## 3. 新闻接口

### 3.1 获取新闻列表

**请求：**

```
GET /api/news
```

**查询参数：**

| 参数       | 类型   | 必填 | 说明                        |
| ---------- | ------ | ---- | --------------------------- |
| page       | number | 否   | 页码，默认 1                |
| pageSize   | number | 否   | 每页数量，默认 20，最大 100 |
| sourceType | string | 否   | 数据源类型：rss, api, topic |
| sourceId   | number | 否   | 数据源 ID                   |
| platform   | string | 否   | 平台标识                    |
| search     | string | 否   | 搜索关键词                  |

**响应：**

```json
{
  "items": [
    {
      "id": 1,
      "title": "新闻标题",
      "url": "https://example.com/news/1",
      "description": "新闻摘要",
      "platform": "zhihu",
      "sourceType": "api",
      "sourceId": 1,
      "sourceName": "知乎热榜",
      "publishedAt": "2026-09-20T00:00:00.000Z",
      "fetchedAt": "2026-09-20T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### 3.2 获取新闻详情

**请求：**

```
GET /api/news/:id
```

**路径参数：**

| 参数 | 类型   | 说明    |
| ---- | ------ | ------- |
| id   | number | 新闻 ID |

**响应：**

```json
{
  "id": 1,
  "sourceId": 1,
  "sourceType": "api",
  "platform": "zhihu",
  "title": "新闻标题",
  "url": "https://example.com/news/1",
  "description": "新闻摘要",
  "author": "作者",
  "publishedAt": "2026-09-20T00:00:00.000Z",
  "fetchedAt": "2026-09-20T00:00:00.000Z",
  "hotScore": 1000,
  "metadata": { "key": "value" },
  "status": "processed",
  "createdAt": "2026-09-20T00:00:00.000Z"
}
```

**错误码：**

| 状态码 | 说明       |
| ------ | ---------- |
| 404    | 内容不存在 |

### 3.3 获取数据源列表

**请求：**

```
GET /api/news/sources
```

**查询参数：**

| 参数       | 类型   | 必填 | 说明                        |
| ---------- | ------ | ---- | --------------------------- |
| sourceType | string | 否   | 数据源类型：rss, api, topic |

**响应：**

```json
[
  {
    "id": 1,
    "name": "知乎热榜",
    "sourceType": "api",
    "description": "知乎热榜数据"
  }
]
```

### 3.4 获取平台列表

**请求：**

```
GET /api/news/platforms
```

**查询参数：**

| 参数       | 类型   | 必填 | 说明                        |
| ---------- | ------ | ---- | --------------------------- |
| sourceType | string | 否   | 数据源类型：rss, api, topic |

**响应：**

```json
["zhihu", "weibo", "bilibili", "github"]
```

---

## 4. 收藏接口

**认证：** 所有接口都需要登录

### 4.1 获取收藏列表

**请求：**

```
GET /api/favorites
```

**查询参数：**

| 参数     | 类型   | 必填 | 说明              |
| -------- | ------ | ---- | ----------------- |
| page     | number | 否   | 页码，默认 1      |
| pageSize | number | 否   | 每页数量，默认 20 |

**响应：**

```json
{
  "items": [
    {
      "id": 1,
      "createdAt": "2026-09-20T00:00:00.000Z",
      "newsItem": {
        "id": 1,
        "title": "新闻标题",
        "url": "https://example.com/news/1",
        "description": "新闻摘要",
        "platform": "zhihu",
        "sourceType": "api",
        "publishedAt": "2026-09-20T00:00:00.000Z",
        "fetchedAt": "2026-09-20T00:00:00.000Z"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 10,
    "totalPages": 1
  }
}
```

### 4.2 添加收藏

**请求：**

```
POST /api/favorites/:newsId
```

**路径参数：**

| 参数   | 类型   | 说明    |
| ------ | ------ | ------- |
| newsId | number | 新闻 ID |

**响应：**

```json
{
  "success": true
}
```

**错误码：**

| 状态码 | 说明       |
| ------ | ---------- |
| 404    | 内容不存在 |
| 409    | 已收藏     |

### 4.3 取消收藏

**请求：**

```
DELETE /api/favorites/:newsId
```

**路径参数：**

| 参数   | 类型   | 说明    |
| ------ | ------ | ------- |
| newsId | number | 新闻 ID |

**响应：**

```json
{
  "success": true
}
```

---

## 5. 管理员接口

**认证：** 所有接口都需要管理员权限

### 5.1 数据源管理

#### 5.1.1 获取数据源列表

**请求：**

```
GET /api/admin/sources
```

**响应：**

```json
[
  {
    "id": 1,
    "name": "知乎热榜",
    "type": "rest",
    "sourceType": "api",
    "url": "https://api.zhihu.com/topstory/hot-list?limit=50",
    "method": "GET",
    "headers": null,
    "body": null,
    "parser": "zhihu",
    "enabled": true,
    "lastFetchAt": "2026-09-20T00:00:00.000Z",
    "lastError": null,
    "description": "知乎热榜数据",
    "createdAt": "2026-09-20T00:00:00.000Z",
    "updatedAt": "2026-09-20T00:00:00.000Z"
  }
]
```

#### 5.1.2 创建数据源

**请求：**

```
POST /api/admin/sources
```

**请求体：**

```json
{
  "name": "string", // 数据源名称，1-100 字符
  "type": "rest|rss|html", // 数据源类型
  "sourceType": "rss|api|topic", // 来源类型，默认 api
  "url": "string", // URL 地址
  "method": "GET|POST", // 请求方法，默认 GET
  "headers": {}, // 自定义请求头，可选
  "body": "string", // POST 请求体，可选
  "parser": "string", // 解析器标识，可选
  "enabled": true, // 是否启用，默认 true
  "description": "string" // 描述，可选
}
```

**响应：**

```json
{
  "id": 1,
  "name": "知乎热榜",
  "type": "rest",
  "sourceType": "api",
  "url": "https://api.zhihu.com/topstory/hot-list?limit=50",
  "method": "GET",
  "headers": null,
  "body": null,
  "parser": "zhihu",
  "enabled": true,
  "lastFetchAt": null,
  "lastError": null,
  "description": "知乎热榜数据",
  "createdAt": "2026-09-20T00:00:00.000Z",
  "updatedAt": "2026-09-20T00:00:00.000Z"
}
```

**错误码：**

| 状态码 | 说明     |
| ------ | -------- |
| 400    | 参数错误 |

#### 5.1.3 更新数据源

**请求：**

```
PUT /api/admin/sources/:id
```

**路径参数：**

| 参数 | 类型   | 说明      |
| ---- | ------ | --------- |
| id   | number | 数据源 ID |

**请求体：** 同创建数据源，所有字段可选

**响应：** 同创建数据源

**错误码：**

| 状态码 | 说明         |
| ------ | ------------ |
| 400    | 参数错误     |
| 404    | 数据源不存在 |

#### 5.1.4 删除数据源

**请求：**

```
DELETE /api/admin/sources/:id
```

**路径参数：**

| 参数 | 类型   | 说明      |
| ---- | ------ | --------- |
| id   | number | 数据源 ID |

**响应：**

```json
{
  "success": true
}
```

**错误码：**

| 状态码 | 说明         |
| ------ | ------------ |
| 404    | 数据源不存在 |

#### 5.1.5 手动触发抓取

**请求：**

```
POST /api/admin/sources/:id/fetch
```

**路径参数：**

| 参数 | 类型   | 说明      |
| ---- | ------ | --------- |
| id   | number | 数据源 ID |

**响应：**

```json
{
  "success": true,
  "message": "抓取任务已触发"
}
```

**说明：**

- 抓取任务异步执行
- 可通过抓取日志查看执行结果

**错误码：**

| 状态码 | 说明         |
| ------ | ------------ |
| 404    | 数据源不存在 |

#### 5.1.6 测试连通性

**请求：**

```
POST /api/admin/sources/:id/test
```

**路径参数：**

| 参数 | 类型   | 说明      |
| ---- | ------ | --------- |
| id   | number | 数据源 ID |

**响应（成功）：**

```json
{
  "success": true,
  "status": 200,
  "statusText": "OK"
}
```

**响应（失败）：**

```json
{
  "success": false,
  "error": "连接超时"
}
```

#### 5.1.7 获取数据源抓取日志

**请求：**

```
GET /api/admin/sources/:id/logs
```

**路径参数：**

| 参数 | 类型   | 说明      |
| ---- | ------ | --------- |
| id   | number | 数据源 ID |

**查询参数：**

| 参数     | 类型   | 必填 | 说明              |
| -------- | ------ | ---- | ----------------- |
| page     | number | 否   | 页码，默认 1      |
| pageSize | number | 否   | 每页数量，默认 20 |

**响应：**

```json
[
  {
    "id": 1,
    "sourceId": 1,
    "status": "success",
    "duration": 1500,
    "count": 50,
    "error": null,
    "createdAt": "2026-09-20T00:00:00.000Z"
  }
]
```

### 5.2 用户管理

#### 5.2.1 获取用户列表

**请求：**

```
GET /api/admin/users
```

**查询参数：**

| 参数     | 类型   | 必填 | 说明              |
| -------- | ------ | ---- | ----------------- |
| page     | number | 否   | 页码，默认 1      |
| pageSize | number | 否   | 每页数量，默认 20 |

**响应：**

```json
{
  "items": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "role": "admin",
      "status": "active",
      "createdAt": "2026-09-20T00:00:00.000Z",
      "updatedAt": "2026-09-20T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 10,
    "totalPages": 1
  }
}
```

#### 5.2.2 创建用户

**请求：**

```
POST /api/admin/users
```

**请求体：**

```json
{
  "username": "string", // 用户名，3-50 字符
  "email": "string", // 邮箱地址
  "password": "string", // 密码，至少 6 字符
  "role": "admin|user" // 角色，默认 user
}
```

**响应：**

```json
{
  "id": 2,
  "username": "newuser",
  "email": "newuser@example.com",
  "role": "user",
  "status": "active",
  "createdAt": "2026-09-20T00:00:00.000Z",
  "updatedAt": "2026-09-20T00:00:00.000Z"
}
```

**错误码：**

| 状态码 | 说明               |
| ------ | ------------------ |
| 400    | 参数错误           |
| 409    | 用户名或邮箱已存在 |

#### 5.2.3 更新用户

**请求：**

```
PUT /api/admin/users/:id
```

**路径参数：**

| 参数 | 类型   | 说明    |
| ---- | ------ | ------- |
| id   | number | 用户 ID |

**请求体：**

```json
{
  "username": "string", // 用户名，可选
  "email": "string", // 邮箱，可选
  "role": "admin|user", // 角色，可选
  "status": "active|disabled" // 状态，可选
}
```

**响应：** 同创建用户

**错误码：**

| 状态码 | 说明               |
| ------ | ------------------ |
| 400    | 参数错误           |
| 404    | 用户不存在         |
| 409    | 用户名或邮箱已存在 |

#### 5.2.4 删除用户

**请求：**

```
DELETE /api/admin/users/:id
```

**路径参数：**

| 参数 | 类型   | 说明    |
| ---- | ------ | ------- |
| id   | number | 用户 ID |

**响应：**

```json
{
  "success": true
}
```

**错误码：**

| 状态码 | 说明       |
| ------ | ---------- |
| 404    | 用户不存在 |

#### 5.2.5 重置密码

**请求：**

```
PUT /api/admin/users/:id/reset-password
```

**路径参数：**

| 参数 | 类型   | 说明    |
| ---- | ------ | ------- |
| id   | number | 用户 ID |

**请求体：**

```json
{
  "password": "string" // 新密码，至少 6 字符
}
```

**响应：**

```json
{
  "success": true
}
```

**错误码：**

| 状态码 | 说明       |
| ------ | ---------- |
| 400    | 参数错误   |
| 404    | 用户不存在 |

### 5.3 内容管理

#### 5.3.1 获取内容列表

**请求：**

```
GET /api/admin/content
```

**查询参数：**

| 参数       | 类型   | 必填 | 说明                             |
| ---------- | ------ | ---- | -------------------------------- |
| page       | number | 否   | 页码，默认 1                     |
| pageSize   | number | 否   | 每页数量，默认 20                |
| status     | string | 否   | 状态：pending, processed, failed |
| sourceType | string | 否   | 数据源类型：rss, api, topic      |

**响应：**

```json
{
  "items": [
    {
      "id": 1,
      "sourceId": 1,
      "sourceType": "api",
      "platform": "zhihu",
      "title": "新闻标题",
      "url": "https://example.com/news/1",
      "description": "新闻摘要",
      "author": "作者",
      "publishedAt": "2026-09-20T00:00:00.000Z",
      "fetchedAt": "2026-09-20T00:00:00.000Z",
      "hotScore": 1000,
      "metadata": null,
      "status": "processed",
      "createdAt": "2026-09-20T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

#### 5.3.2 更新内容

**请求：**

```
PUT /api/admin/content/:id
```

**路径参数：**

| 参数 | 类型   | 说明    |
| ---- | ------ | ------- |
| id   | number | 内容 ID |

**请求体：**

```json
{
  "title": "string", // 标题，可选
  "description": "string", // 描述，可选
  "status": "pending|processed|failed" // 状态，可选
}
```

**响应：**

```json
{
  "id": 1,
  "title": "更新后的标题",
  "description": "更新后的描述",
  "status": "processed"
  // ... 其他字段
}
```

**错误码：**

| 状态码 | 说明       |
| ------ | ---------- |
| 400    | 参数错误   |
| 404    | 内容不存在 |

#### 5.3.3 删除内容

**请求：**

```
DELETE /api/admin/content/:id
```

**路径参数：**

| 参数 | 类型   | 说明    |
| ---- | ------ | ------- |
| id   | number | 内容 ID |

**响应：**

```json
{
  "success": true
}
```

**错误码：**

| 状态码 | 说明       |
| ------ | ---------- |
| 404    | 内容不存在 |

#### 5.3.4 批量删除

**请求：**

```
POST /api/admin/content/batch-delete
```

**请求体：**

```json
{
  "ids": [1, 2, 3] // 内容 ID 数组
}
```

**响应：**

```json
{
  "success": true,
  "deletedCount": 3
}
```

#### 5.3.5 触发全部抓取

**请求：**

```
POST /api/admin/content/fetch
```

**响应：**

```json
{
  "success": true,
  "message": "抓取任务已触发"
}
```

### 5.4 系统配置

#### 5.4.1 获取系统配置

**请求：**

```
GET /api/admin/config
```

**响应：**

```json
{
  "inviteCode": "abc123",
  "registrationEnabled": true,
  "rssFetchInterval": 30,
  "apiFetchInterval": 30,
  "autoFetchEnabled": true,
  "aiApiKey": "***",
  "aiBaseUrl": "https://api.openai.com/v1",
  "aiModel": "gpt-4o-mini"
}
```

**说明：**

- `aiApiKey` 返回时会隐藏，显示为 `***`

#### 5.4.2 更新系统配置

**请求：**

```
PUT /api/admin/config
```

**请求体：**

```json
{
  "inviteCode": "string",           // 邀请码，可选
  "registrationEnabled": boolean,   // 注册开关，可选
  "rssFetchInterval": number,       // RSS 订阅刷新间隔（分钟），5-1440，可选
  "apiFetchInterval": number,       // API 订阅刷新间隔（分钟），5-1440，可选
  "aiApiKey": "string",             // AI API Key，可选
  "aiBaseUrl": "string",            // AI Base URL，可选
  "aiModel": "string"               // AI 模型名称，可选
}
```

**响应：**

```json
{
  "success": true
}
```

#### 5.4.3 获取自动抓取状态

**请求：**

```
GET /api/admin/config/auto-fetch
```

**响应：**

```json
{
  "enabled": true
}
```

#### 5.4.4 设置自动抓取

**请求：**

```
PUT /api/admin/config/auto-fetch
```

**请求体：**

```json
{
  "enabled": true
}
```

**响应：**

```json
{
  "enabled": true
}
```

#### 5.4.5 获取 AI 可用模型列表

**请求：**

```
POST /api/admin/config/ai/models
```

**请求体：**

```json
{
  "baseUrl": "https://api.openai.com/v1",
  "apiKey": "sk-..."
}
```

**响应：**

```json
{
  "models": ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"]
}
```

**错误码：**

| 状态码 | 说明             |
| ------ | ---------------- |
| 400    | 参数错误         |
| 500    | 获取模型列表失败 |

### 5.5 统计数据

#### 5.5.1 获取统计数据

**请求：**

```
GET /api/admin/stats
```

**响应：**

```json
{
  "totalSources": 20,
  "enabledSources": 15,
  "totalContent": 10000,
  "todayContent": 500,
  "totalUsers": 50,
  "totalFavorites": 200,
  "platformStats": [
    {
      "platform": "zhihu",
      "count": 2000
    },
    {
      "platform": "weibo",
      "count": 1500
    }
  ],
  "typeStats": [
    {
      "sourceType": "api",
      "count": 7000
    },
    {
      "sourceType": "rss",
      "count": 2000
    },
    {
      "sourceType": "topic",
      "count": 1000
    }
  ]
}
```

### 5.6 日志管理

#### 5.6.1 获取抓取日志

**请求：**

```
GET /api/admin/logs/fetch
```

**查询参数：**

| 参数     | 类型   | 必填 | 说明              |
| -------- | ------ | ---- | ----------------- |
| page     | number | 否   | 页码，默认 1      |
| pageSize | number | 否   | 每页数量，默认 20 |
| sourceId | number | 否   | 数据源 ID         |

**响应：**

```json
{
  "items": [
    {
      "id": 1,
      "sourceId": 1,
      "sourceName": "知乎热榜",
      "status": "success",
      "duration": 1500,
      "count": 50,
      "error": null,
      "createdAt": "2026-09-20T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

#### 5.6.2 获取 AI 处理日志

**请求：**

```
GET /api/admin/logs/ai
```

**查询参数：**

| 参数     | 类型   | 必填 | 说明                  |
| -------- | ------ | ---- | --------------------- |
| page     | number | 否   | 页码，默认 1          |
| pageSize | number | 否   | 每页数量，默认 20     |
| status   | string | 否   | 状态：success, failed |

**响应：**

```json
{
  "items": [
    {
      "id": 1,
      "newsItemId": 1,
      "newsTitle": "新闻标题",
      "status": "success",
      "duration": 2000,
      "tokensUsed": 500,
      "error": null,
      "createdAt": "2026-09-20T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

#### 5.6.3 获取错误日志

**请求：**

```
GET /api/admin/logs/errors
```

**查询参数：**

| 参数     | 类型   | 必填 | 说明              |
| -------- | ------ | ---- | ----------------- |
| page     | number | 否   | 页码，默认 1      |
| pageSize | number | 否   | 每页数量，默认 20 |

**响应：**

```json
{
  "items": [
    {
      "id": 1,
      "sourceId": 1,
      "sourceName": "知乎热榜",
      "status": "failed",
      "duration": 5000,
      "count": 0,
      "error": "连接超时",
      "createdAt": "2026-09-20T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 10,
    "totalPages": 1
  }
}
```

---

## 6. 错误码汇总

| 状态码 | 说明                             |
| ------ | -------------------------------- |
| 200    | 成功                             |
| 201    | 创建成功                         |
| 400    | 请求参数错误                     |
| 401    | 未认证（未登录或 Token 无效）    |
| 403    | 权限不足（非管理员访问管理接口） |
| 404    | 资源不存在                       |
| 409    | 资源冲突（如用户名已存在）       |
| 500    | 服务器内部错误                   |

---

## 7. 请求限制

| 项目           | 限制                 |
| -------------- | -------------------- |
| 请求体大小     | 1MB                  |
| 分页最大值     | 100                  |
| 抓取间隔最小值 | 5 分钟               |
| 抓取间隔最大值 | 1440 分钟（24 小时） |

---

## 附录

### A. 数据源类型说明

| 类型 | 说明                | 示例                   |
| ---- | ------------------- | ---------------------- |
| rest | REST API，返回 JSON | 知乎热榜、GitHub       |
| rss  | RSS/Atom 订阅源     | 量子位、Google AI Blog |
| html | HTML 页面，需要解析 | 百度热搜、IT之家       |

### B. 来源类型说明

| 类型  | 说明       |
| ----- | ---------- |
| api   | API 接口   |
| rss   | RSS 订阅源 |
| topic | 话题搜索   |

### C. 相关文档

- `docs/PRD.md` — 产品需求文档
- `docs/plan.md` — 开发计划
- `docs/api.md` — 公开 API 文档
- `docs/uml-modeling.md` — UML 建模文档
- `docs/module-description.md` — 模块功能详细描述
