# AI Hot News Hub — 软件开发手册

> 版本：v1.0
> 最后更新：2026-09-20
> 维护团队：AI Hot News Hub 开发团队

---

## 1. 手册概述

### 1.1 项目简介

AI Hot News Hub 是一个基于 AI 的热门信息汇总平台，自动聚合来自多个平台的热点内容，通过 AI 进行智能归类和价值评分，帮助用户高效获取高质量信息。

### 1.2 手册目的

本手册旨在为开发团队提供全面的项目文档，包括：

- 产品需求和功能规格
- 系统架构和模块设计
- 数据库设计和 API 接口
- 部署和运维指南
- UML 建模和设计文档

### 1.3 文档版本历史

| 版本 | 日期       | 说明                       |
| ---- | ---------- | -------------------------- |
| v1.0 | 2026-09-20 | 初始版本，包含完整项目文档 |

---

## 2. 文档目录

### 2.1 核心文档

| 文档               | 说明                   | 链接               |
| ------------------ | ---------------------- | ------------------ |
| 产品需求文档 (PRD) | 产品功能规格和需求定义 | [PRD.md](PRD.md)   |
| 开发计划           | 项目开发阶段和进度跟踪 | [plan.md](plan.md) |
| 公开 API 文档      | 已测试的公开 API 接口  | [api.md](api.md)   |

### 2.2 设计文档

| 文档             | 说明                   | 链接                                           |
| ---------------- | ---------------------- | ---------------------------------------------- |
| UML 建模文档     | 用例图、类图、序列图等 | [uml-modeling.md](uml-modeling.md)             |
| 模块功能详细描述 | 前后端模块功能说明     | [module-description.md](module-description.md) |

### 2.3 技术文档

| 文档             | 说明                   | 链接                                     |
| ---------------- | ---------------------- | ---------------------------------------- |
| API 接口详细文档 | 后端 API 接口规格说明  | [api-reference.md](api-reference.md)     |
| 数据库设计文档   | 数据库表结构和关系设计 | [database-design.md](database-design.md) |
| 部署与运维文档   | 部署方式和运维指南     | [deployment.md](deployment.md)           |

---

## 3. 快速入门

### 3.1 环境准备

**系统要求：**

- Node.js >= 18
- npm 或 yarn
- Docker（可选）

**克隆项目：**

```bash
git clone https://github.com/wallace921029/ai-hot-news-hub.git
cd ai-hot-news-hub
```

### 3.2 本地开发

**前端开发：**

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

**后端开发：**

```bash
# 进入后端目录
cd backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
vim .env

# 初始化数据库
npm run db:push
npm run db:seed

# 启动开发服务器
npm run dev
```

### 3.3 Docker 部署

```bash
# 配置环境变量
cp .env.example .env
vim .env

# 启动服务
docker-compose up -d
```

---

## 4. 项目架构

### 4.1 技术栈

| 层级     | 技术                    |
| -------- | ----------------------- |
| 前端框架 | React 19 + TypeScript 6 |
| 构建工具 | Vite 8                  |
| 样式     | Tailwind CSS 4          |
| UI 组件  | Shadcn/ui (Radix UI)    |
| 状态管理 | Zustand                 |
| 路由     | React Router v7         |
| 数据获取 | TanStack Query + Fetch  |
| 图表     | ECharts                 |
| 后端框架 | Fastify + Node.js       |
| 数据库   | SQLite + Drizzle ORM    |
| AI 接口  | OpenAI 兼容格式         |
| 定时任务 | node-cron               |
| 容器化   | Docker                  |

### 4.2 系统架构图

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    系统架构                                          │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    前端层                                            │
│  React 19 + TypeScript 6 + Vite 8                                                  │
│  ├── Tailwind CSS 4 (样式)                                                         │
│  ├── Shadcn/ui (UI 组件库)                                                         │
│  ├── Zustand (状态管理)                                                            │
│  ├── React Router v7 (路由)                                                        │
│  ├── TanStack Query (数据获取)                                                     │
│  └── ECharts (图表)                                                                │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTP/REST API
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    后端层                                            │
│  Fastify + Node.js                                                                 │
│  ├── 路由层 (Routes)                                                               │
│  ├── 中间件层 (Middleware)                                                         │
│  ├── 服务层 (Services)                                                             │
│  └── 工具层 (Utils)                                                                │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    数据层                                            │
│  SQLite + Drizzle ORM                                                              │
│  ├── 数据库文件 (backend/data/)                                                    │
│  └── Schema 定义 (backend/src/db/schema.ts)                                        │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 目录结构

```
ai-hot-news-hub/
├── src/                          # 前端源码
│   ├── components/               # UI 组件
│   ├── pages/                    # 页面组件
│   ├── hooks/                    # 自定义 Hooks
│   ├── lib/                      # 工具函数
│   ├── services/                 # API 服务层
│   ├── stores/                   # Zustand 状态管理
│   └── types/                    # TypeScript 类型定义
├── backend/                      # 后端源码
│   ├── src/
│   │   ├── ai/                  # AI 处理模块
│   │   ├── db/                  # 数据库相关
│   │   ├── fetchers/            # 数据抓取器
│   │   ├── middleware/          # 中间件
│   │   ├── parsers/             # 内容解析器
│   │   ├── routes/              # API 路由
│   │   ├── scheduler/           # 定时任务
│   │   ├── services/            # 业务逻辑
│   │   └── utils/               # 工具函数
│   └── data/                    # SQLite 数据库文件
├── docs/                         # 文档
├── public/                       # 静态资源
├── docker-compose.yml           # Docker 编排
└── Dockerfile                   # Docker 镜像
```

---

## 5. 功能模块

### 5.1 用户系统

**功能：**

- 用户注册（邀请码机制）
- 用户登录（JWT 认证）
- 角色权限管理（管理员/普通用户）

**相关文档：**

- [PRD.md - 用户系统](PRD.md#3-用户系统)
- [module-description.md - 认证模块](module-description.md#321-认证路由-authts)

### 5.2 数据源管理

**功能：**

- 数据源 CRUD 操作
- 支持 REST API、RSS、HTML 解析
- 手动/自动抓取
- 连通性测试

**相关文档：**

- [PRD.md - 数据源管理](PRD.md#4-数据源管理)
- [module-description.md - 数据抓取模块](module-description.md#34-数据抓取模块-backend-srcfetchers)
- [api.md](api.md)

### 5.3 内容抓取与处理

**功能：**

- 定时抓取任务
- 数据标准化
- 去重处理
- AI 分类和评分（预留）

**相关文档：**

- [PRD.md - 内容抓取与处理](PRD.md#5-内容抓取与处理)
- [module-description.md - 调度器模块](module-description.md#35-调度器模块-backend-srcscheduler)

### 5.4 前端功能

**功能：**

- 首页信息流
- 搜索功能
- 收藏功能
- 管理后台

**相关文档：**

- [PRD.md - 前端功能](PRD.md#7-前端功能)
- [module-description.md - 前端模块](module-description.md#2-前端模块详细描述)

---

## 6. API 接口

### 6.1 接口概览

| 模块       | 接口数量 | 说明                                 |
| ---------- | -------- | ------------------------------------ |
| 认证接口   | 3        | 注册、登录、获取用户信息             |
| 新闻接口   | 4        | 列表、详情、数据源、平台             |
| 收藏接口   | 3        | 列表、添加、取消                     |
| 管理员接口 | 20+      | 数据源、用户、内容、配置、统计、日志 |

### 6.2 常用接口

**获取新闻列表：**

```
GET /api/news?page=1&pageSize=20&platform=zhihu
```

**用户登录：**

```
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password"
}
```

**获取系统配置：**

```
GET /api/admin/config
Authorization: Bearer <token>
```

**相关文档：**

- [api-reference.md](api-reference.md)

---

## 7. 数据库设计

### 7.1 核心表

| 表名          | 说明           |
| ------------- | -------------- |
| users         | 用户表         |
| data_sources  | 数据源表       |
| news_items    | 新闻条目表     |
| favorites     | 收藏表         |
| topics        | 话题表（预留） |
| fetch_logs    | 抓取日志表     |
| ai_logs       | AI 处理日志表  |
| system_config | 系统配置表     |

### 7.2 表关系

```
users ──────┬────── favorites ────── news_items
            │                           │
            │                           │
            └───────────────────────────┼──── data_sources
                                        │
                                        ├── fetch_logs
                                        │
                                        └── ai_logs
```

**相关文档：**

- [database-design.md](database-design.md)

---

## 8. 开发指南

### 8.1 代码规范

**TypeScript：**

- 使用严格模式
- 启用 `noUnusedLocals` 和 `noUnusedParameters`
- 使用 `erasableSyntaxOnly`（避免 enum）
- 使用 `verbatimModuleSyntax`

**代码风格：**

- 使用 Prettier 格式化
- 使用 oxlint 检查代码
- 遵循现有代码风格

### 8.2 Git 工作流

```bash
# 创建功能分支
git checkout -b feature/new-feature

# 提交更改
git add .
git commit -m "feat: add new feature"

# 推送分支
git push origin feature/new-feature

# 创建 Pull Request
```

### 8.3 测试

**前端测试：**

```bash
npm run lint
npm run build
```

**后端测试：**

```bash
cd backend
npm run build
```

**相关文档：**

- [AGENTS.md](../AGENTS.md)

---

## 9. 部署运维

### 9.1 部署方式

| 方式     | 适用场景 | 说明               |
| -------- | -------- | ------------------ |
| Docker   | 生产环境 | 一键部署，推荐使用 |
| 手动部署 | 开发环境 | 灵活配置           |

### 9.2 快速部署

```bash
# Docker 部署
docker-compose up -d

# 访问服务
open http://localhost:8762
```

### 9.3 运维要点

- 定期备份数据库
- 监控服务状态
- 查看错误日志
- 定期更新依赖

**相关文档：**

- [deployment.md](deployment.md)

---

## 10. 附录

### 10.1 环境变量

| 变量名      | 说明            | 默认值      |
| ----------- | --------------- | ----------- |
| PORT        | 服务端口        | 3000        |
| JWT_SECRET  | JWT 签名密钥    | -           |
| AI_BASE_URL | AI API 基础地址 | -           |
| AI_API_KEY  | AI API 密钥     | -           |
| AI_MODEL    | AI 模型名称     | gpt-4o-mini |

### 10.2 开发命令

**前端：**

```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run lint         # 运行代码检查
npm run preview      # 预览生产构建
```

**后端：**

```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run start        # 启动生产服务器
npm run db:push      # 推送数据库 schema
npm run db:seed      # 初始化数据源
```

### 10.3 常见问题

**Q: 如何重置管理员密码？**
A: 修改 `backend/.env` 中的 `ADMIN_PASSWORD`，然后重启服务。

**Q: 如何添加新的数据源？**
A: 登录管理后台，进入数据源管理页面，点击添加数据源。

**Q: 如何查看抓取日志？**
A: 登录管理后台，进入日志查看页面，选择抓取日志。

### 10.4 相关链接

- **项目仓库：** https://github.com/wallace921029/ai-hot-news-hub
- **问题反馈：** https://github.com/wallace921029/ai-hot-news-hub/issues
- **更新日志：** [CHANGELOG.md](../CHANGELOG.md)

---

## 11. 文档维护

### 11.1 文档更新流程

1. 修改对应的文档文件
2. 更新版本号和日期
3. 提交到 Git 仓库
4. 通知团队成员

### 11.2 文档规范

- 使用 Markdown 格式
- 保持结构清晰
- 及时更新内容
- 包含示例代码

### 11.3 联系方式

如有文档问题或建议，请联系开发团队。

---

**文档完整列表：**

1. [PRD.md](PRD.md) - 产品需求文档
2. [plan.md](plan.md) - 开发计划
3. [api.md](api.md) - 公开 API 文档
4. [uml-modeling.md](uml-modeling.md) - UML 建模文档
5. [module-description.md](module-description.md) - 模块功能详细描述
6. [api-reference.md](api-reference.md) - API 接口详细文档
7. [database-design.md](database-design.md) - 数据库设计文档
8. [deployment.md](deployment.md) - 部署与运维文档
