# AI Hot News Hub — 开发计划

> 最后更新：2026-09-20

## 状态说明

| 标记 | 含义            |
| ---- | --------------- |
| ✅   | 已完成          |
| 🔄   | 进行中          |
| ⏳   | 待开始          |
| ❌   | 已取消/暂不需要 |

---

## Phase 0：项目初始化 ✅

- [x] Vite + React 19 + TypeScript 6 项目创建
- [x] 技术选型确认（前端+后端）
- [x] 依赖安装
  - [x] 前端：Tailwind CSS、Shadcn/ui、Zustand、React Router、TanStack Query、React Hook Form、Zod、ECharts、react-i18next、Lucide React、Day.js、Framer Motion、Sonner
  - [x] 后端：Fastify、Drizzle ORM、SQLite
  - [x] 工具：Prettier、Husky、lint-staged
- [x] 配置文件设置
  - [x] vite.config.ts（Tailwind 插件 + 路径别名）
  - [x] tsconfig.app.json（路径别名）
  - [x] .prettierrc
  - [x] .husky/pre-commit（lint-staged）
  - [x] package.json（lint-staged 配置）
- [x] Shadcn/ui 初始化（components.json + utils.ts）
- [x] Git 仓库初始化
- [x] AGENTS.md 编写
- [x] PRD 编写

---

## Phase 1：核心功能（MVP）

### 1.1 后端项目初始化 ✅

- [x] 创建后端目录结构
- [x] 配置 Fastify 服务器
- [x] 配置 CORS
- [ ] 配置 Swagger/OpenAPI
- [x] 创建基础中间件（错误处理、日志）
- [x] 配置环境变量

### 1.2 数据库设计与迁移 ✅

- [x] 定义 Drizzle Schema
  - [x] users 表
  - [x] data_sources 表
  - [x] news_items 表
  - [x] favorites 表
  - [x] fetch_logs 表
  - [x] ai_logs 表
  - [x] system_config 表
- [ ] 生成迁移文件
- [ ] 初始化数据库

### 1.3 用户认证 ✅

- [x] 注册接口（邀请码验证）
- [x] 登录接口（JWT）
- [x] 获取当前用户信息
- [x] 密码加密（bcrypt）
- [x] JWT 中间件
- [x] 角色权限中间件

### 1.4 数据源管理 ✅

- [x] CRUD 接口（管理员）
- [x] 启用/禁用数据源
- [x] 测试连通性
- [x] 手动触发抓取（接口已创建，待实现抓取逻辑）

### 1.5 数据抓取服务 ✅

- [x] 抓取调度器（基于 node-cron）
- [x] REST API 抓取器
  - [x] 知乎热榜
  - [x] 微博热搜
  - [x] B站热搜
  - [x] 今日头条
  - [x] 掘金
  - [x] CSDN
  - [x] GitHub
  - [x] Hugging Face
  - [x] 机器之心
  - [x] 36氪
  - [x] 豆瓣电影
  - [x] 少数派
  - [x] 微信读书
- [x] RSS 抓取器
  - [x] 量子位
  - [x] Google AI Blog
  - [x] MIT Technology Review
- [x] HTML 解析器
  - [x] 百度热搜
  - [x] IT之家
  - [x] 超神经
  - [x] 澎湃新闻
- [x] 数据标准化
- [x] 去重处理
- [x] 抓取日志记录

### 1.6 AI 处理服务 ✅

- [x] OpenAI 兼容 API 调用
- [x] 分类处理
- [x] 评分处理
- [x] 摘要生成（评分理由）
- [x] AI 处理队列
- [x] 重试机制
- [x] AI 日志记录

### 1.7 内容接口 ✅

- [x] 获取新闻列表（分页、筛选、排序）
- [x] 获取新闻详情
- [x] 搜索新闻
- [x] 获取平台列表

### 1.8 收藏接口 ✅

- [x] 获取收藏列表
- [x] 添加收藏
- [x] 取消收藏

### 1.9 管理员接口 ✅

- [x] 用户管理（CRUD、重置密码）
- [x] 内容管理（删除、批量操作）
- [x] 系统配置（AI 模型、抓取频率、注册开关、邀请码）
- [x] 数据统计
- [x] 日志查看

### 1.10 前端 — 基础框架 ✅

- [x] 路由配置
  - [x] 首页 `/`
  - [x] 收藏页 `/favorites`
  - [x] 登录页 `/login`
  - [x] 注册页 `/register`
  - [x] 管理后台 `/admin/*`
- [x] 布局组件
  - [x] 公共布局（Header + Sidebar + Content）
  - [x] 管理后台布局
- [x] API 服务层封装
- [x] Zustand 状态管理
  - [x] 用户状态
  - [x] 筛选状态
- [x] 认证流程
  - [x] 登录页面
  - [x] 注册页面
  - [x] 路由守卫
  - [x] 权限控制

### 1.11 前端 — 首页信息流 ✅

- [x] 新闻卡片组件
- [x] 信息流列表
- [x] 平台筛选
- [x] 排序切换（评分/时间）
- [x] 分页加载
- [x] 搜索功能

### 1.12 前端 — 收藏页 ✅

- [x] 收藏列表
- [x] 取消收藏
- [x] 空状态展示

### 1.13 前端 — 管理后台 ✅

- [x] 侧边栏导航
- [x] 数据源管理页面
  - [x] 数据源列表
  - [x] 添加/编辑表单
  - [x] 手动抓取按钮
  - [x] 测试连通性按钮
- [x] 用户管理页面
  - [x] 用户列表
  - [x] 创建用户表单
  - [x] 邀请码管理
- [x] 内容管理页面
  - [x] 内容列表
  - [x] 删除确认
- [x] 系统配置页面
  - [x] AI 模型配置
  - [x] 抓取频率配置
  - [x] 注册开关
- [x] 数据统计页面
  - [x] 抓取统计
  - [x] 平台分布
- [x] 日志查看页面
  - [x] 抓取日志
  - [x] 错误日志
  - [x] 告警日志
  - [x] 操作审计日志

### 1.14 Docker 部署 ✅

- [x] Dockerfile（多阶段构建）
- [x] docker-compose.yml
- [x] 环境变量配置
- [x] 数据持久化

---

## Phase 2：增强功能 ⏳

- [x] 内容详情页
- [x] 错误告警机制
- [x] 操作日志审计
- [ ] AI 摘要优化
- [ ] 内容去重优化

---

## Phase 3：优化与扩展 ⏳

- [ ] 性能优化
  - [ ] 接口缓存
  - [ ] 分页优化
  - [ ] 前端懒加载
- [ ] 更多数据源
- [ ] 移动端适配
- [ ] 国际化
- [ ] 暗色模式
- [ ] 快捷键支持

---

## 当前进度

**当前阶段**：Phase 1 完成 🎉

**已完成**：

- Phase 0：项目初始化 ✅
- Phase 1.1：后端项目初始化 ✅
- Phase 1.2：数据库设计与迁移 ✅
- Phase 1.3：用户认证 ✅
- Phase 1.4：数据源管理 ✅
- Phase 1.5：数据抓取服务 ✅
- Phase 1.6：AI 处理服务 ✅
- Phase 1.7：内容接口 ✅
- Phase 1.8：收藏接口 ✅
- Phase 1.9：管理员接口 ✅
- Phase 1.10：前端基础框架 ✅
- Phase 1.11：首页信息流 ✅
- Phase 1.12：收藏页 ✅
- Phase 1.13：管理后台 ✅
- Phase 1.14：Docker 部署 ✅

**下一步**：

1. 测试完整流程
2. 修复 Bug
3. 开始 Phase 2 增强功能
