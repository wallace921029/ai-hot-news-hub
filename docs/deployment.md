# AI Hot News Hub — 部署与运维文档

> 版本：v1.0
> 最后更新：2026-09-20

---

## 1. 部署概述

### 1.1 部署方式

| 方式        | 说明                         | 适用场景             |
| ----------- | ---------------------------- | -------------------- |
| Docker 部署 | 使用 Docker Compose 一键部署 | 生产环境、快速部署   |
| 手动部署    | 手动安装依赖和启动服务       | 开发环境、自定义配置 |

### 1.2 系统要求

| 资源     | 最低要求            | 推荐配置   |
| -------- | ------------------- | ---------- |
| CPU      | 1 核                | 2 核       |
| 内存     | 512MB               | 1GB        |
| 磁盘     | 1GB                 | 5GB        |
| 操作系统 | Linux/macOS/Windows | Linux      |
| Node.js  | >= 18               | 20 LTS     |
| Docker   | >= 20.10            | 最新稳定版 |

---

## 2. Docker 部署

### 2.1 快速开始

**一键部署：**

```bash
# 克隆项目
git clone https://github.com/wallace921029/ai-hot-news-hub.git
cd ai-hot-news-hub

# 创建环境变量文件
cp .env.example .env

# 编辑环境变量
vim .env

# 启动服务
docker-compose up -d
```

### 2.2 环境变量配置

创建 `.env` 文件：

```bash
# 必填配置
JWT_SECRET=your-secure-jwt-secret-here

# 管理员账号（首次启动时创建）
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your-secure-password

# 注册邀请码
INVITE_CODE=your-invite-code

# AI 配置（可选）
AI_API_KEY=sk-your-openai-api-key
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
```

**环境变量说明：**

| 变量名         | 必填 | 说明            | 默认值                           |
| -------------- | ---- | --------------- | -------------------------------- |
| JWT_SECRET     | 是   | JWT 签名密钥    | change-this-secret-in-production |
| ADMIN_USERNAME | 否   | 管理员用户名    | admin                            |
| ADMIN_EMAIL    | 否   | 管理员邮箱      | admin@example.com                |
| ADMIN_PASSWORD | 否   | 管理员密码      | admin123                         |
| INVITE_CODE    | 否   | 注册邀请码      | hotnews2026                      |
| AI_API_KEY     | 否   | AI API 密钥     | -                                |
| AI_BASE_URL    | 否   | AI API 基础地址 | https://api.openai.com/v1        |
| AI_MODEL       | 否   | AI 模型名称     | gpt-4o-mini                      |

### 2.3 Docker Compose 配置

**docker-compose.yml：**

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - '8762:8762'
    volumes:
      - app-data:/app/backend/data
    environment:
      - PORT=8762
      - HOST=0.0.0.0
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET:-change-this-secret-in-production}
      - ADMIN_USERNAME=${ADMIN_USERNAME:-admin}
      - ADMIN_EMAIL=${ADMIN_EMAIL:-admin@example.com}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD:-admin123}
      - INVITE_CODE=${INVITE_CODE:-hotnews2026}
      - AI_API_KEY=${AI_API_KEY}
      - AI_BASE_URL=${AI_BASE_URL:-https://api.openai.com/v1}
      - AI_MODEL=${AI_MODEL:-gpt-4o-mini}
    restart: unless-stopped

volumes:
  app-data:
```

**配置说明：**

| 配置项      | 说明                                      |
| ----------- | ----------------------------------------- |
| ports       | 端口映射，宿主机 3000 → 容器 3000         |
| volumes     | 数据持久化，SQLite 数据库存储在 Docker 卷 |
| environment | 环境变量配置                              |
| restart     | 自动重启策略                              |

### 2.4 Dockerfile 解析

**多阶段构建：**

```dockerfile
# 阶段 1：构建前端
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 阶段 2：构建后端
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend .
RUN npm run build

# 阶段 3：生产环境
FROM node:20-alpine AS production
WORKDIR /app

# 安装后端生产依赖
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

# 复制构建产物
COPY --from=frontend-builder /app/dist ./frontend/dist
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/src/db/schema.ts ./backend/src/db/schema.ts

# 复制数据库相关文件
COPY backend/drizzle.config.ts ./backend/
COPY backend/src/db ./backend/src/db

# 创建数据目录
RUN mkdir -p /app/backend/data

# 环境变量
ENV PORT=8762
ENV HOST=0.0.0.0
ENV NODE_ENV=production

# 暴露端口
EXPOSE 8762

# 启动服务
WORKDIR /app/backend
CMD ["node", "dist/index.js"]
```

**构建优化：**

- 使用多阶段构建减小镜像体积
- 只安装生产依赖
- 使用 Alpine 基础镜像

### 2.5 常用命令

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 重新构建并启动
docker-compose up -d --build

# 查看容器状态
docker-compose ps

# 进入容器
docker-compose exec app sh
```

---

## 3. 手动部署

### 3.1 环境准备

**安装 Node.js：**

```bash
# 使用 nvm 安装
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# 或使用包管理器安装
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs
```

### 3.2 项目部署

```bash
# 克隆项目
git clone https://github.com/wallace921029/ai-hot-news-hub.git
cd ai-hot-news-hub

# 安装前端依赖
npm install

# 安装后端依赖
cd backend
npm install
cd ..

# 配置环境变量
cd backend
cp .env.example .env
vim .env
cd ..

# 初始化数据库
cd backend
npm run db:push
npm run db:seed
cd ..

# 构建前端
npm run build

# 构建后端
cd backend
npm run build
cd ..
```

### 3.3 环境变量配置

**backend/.env：**

```bash
# 服务配置
PORT=8762
HOST=0.0.0.0
NODE_ENV=production

# JWT 配置
JWT_SECRET=your-secure-jwt-secret-here

# AI 配置（可选）
AI_API_KEY=sk-your-openai-api-key
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
```

### 3.4 启动服务

```bash
# 启动后端服务
cd backend
npm run start

# 或使用 PM2 管理进程
npm install -g pm2
pm2 start dist/index.js --name ai-hot-news-hub
pm2 save
pm2 startup
```

### 3.5 反向代理配置

**Nginx 配置：**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/ai-hot-news-hub/dist;
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api {
        proxy_pass http://127.0.0.1:8762;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 4. 运维管理

### 4.1 日志管理

**Docker 日志：**

```bash
# 查看实时日志
docker-compose logs -f

# 查看最近 100 行日志
docker-compose logs --tail 100

# 查看特定服务日志
docker-compose logs app
```

**PM2 日志：**

```bash
# 查看日志
pm2 logs ai-hot-news-hub

# 查看错误日志
pm2 logs ai-hot-news-hub --err

# 清空日志
pm2 flush
```

### 4.2 数据备份

**自动备份脚本：**

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER_NAME="ai-hot-news-hub-app-1"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据库
docker cp $CONTAINER_NAME:/app/backend/data/database.sqlite $BACKUP_DIR/database_$DATE.sqlite

# 压缩备份
gzip $BACKUP_DIR/database_$DATE.sqlite

# 删除 30 天前的备份
find $BACKUP_DIR -name "database_*.sqlite.gz" -mtime +30 -delete

echo "备份完成: database_$DATE.sqlite.gz"
```

**定时备份：**

```bash
# 添加到 crontab
crontab -e

# 每天凌晨 2 点备份
0 2 * * * /path/to/backup.sh
```

### 4.3 数据恢复

```bash
# 停止服务
docker-compose down

# 恢复数据库
cp /path/to/backups/database_20260920_020000.sqlite ./data/database.sqlite

# 启动服务
docker-compose up -d
```

### 4.4 监控检查

**健康检查脚本：**

```bash
#!/bin/bash
# healthcheck.sh

URL="http://localhost:8762/api/news?page=1&pageSize=1"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $URL)

if [ $RESPONSE -eq 200 ]; then
    echo "服务正常"
    exit 0
else
    echo "服务异常: HTTP $RESPONSE"
    exit 1
fi
```

**Docker 健康检查：**

```yaml
# docker-compose.yml
services:
  app:
    build: .
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:8762/api/news?page=1&pageSize=1']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### 4.5 性能优化

**Node.js 优化：**

```bash
# 设置 Node.js 内存限制
NODE_OPTIONS="--max-old-space-size=1024"

# 启用集群模式（PM2）
pm2 start dist/index.js --name ai-hot-news-hub -i max
```

**SQLite 优化：**

```sql
-- 启用 WAL 模式
PRAGMA journal_mode=WAL;

-- 设置缓存大小
PRAGMA cache_size=-64000;  -- 64MB

-- 设置同步模式
PRAGMA synchronous=NORMAL;

-- 定期优化数据库
VACUUM;
```

---

## 5. 故障排查

### 5.1 常见问题

#### 服务无法启动

**检查步骤：**

```bash
# 1. 检查端口占用
lsof -i :8762

# 2. 检查日志
docker-compose logs

# 3. 检查环境变量
docker-compose exec app env

# 4. 检查数据库文件权限
ls -la backend/data/
```

#### 数据库错误

**检查步骤：**

```bash
# 1. 检查数据库文件是否存在
ls -la backend/data/database.sqlite

# 2. 检查数据库完整性
sqlite3 backend/data/database.sqlite "PRAGMA integrity_check;"

# 3. 重新初始化数据库
cd backend
npm run db:push
npm run db:seed
```

#### API 请求失败

**检查步骤：**

```bash
# 1. 测试 API 连通性
curl http://localhost:8762/api/news?page=1&pageSize=1

# 2. 检查防火墙设置
sudo ufw status

# 3. 检查 Nginx 配置
sudo nginx -t
```

### 5.2 错误日志分析

**日志位置：**

| 环境   | 日志位置              |
| ------ | --------------------- |
| Docker | `docker-compose logs` |
| PM2    | `~/.pm2/logs/`        |
| 手动   | 控制台输出            |

**常见错误：**

| 错误信息       | 原因        | 解决方案               |
| -------------- | ----------- | ---------------------- |
| EADDRINUSE     | 端口被占用  | 更换端口或停止占用进程 |
| SQLITE_CORRUPT | 数据库损坏  | 恢复备份或重新初始化   |
| JWT_INVALID    | Token 无效  | 重新登录获取新 Token   |
| AI_API_ERROR   | AI 服务异常 | 检查 AI 配置和网络连接 |

---

## 6. 安全配置

### 6.1 基础安全

**环境变量安全：**

```bash
# 使用强密码
JWT_SECRET=$(openssl rand -hex 32)
ADMIN_PASSWORD=$(openssl rand -base64 16)

# 限制文件权限
chmod 600 .env
chmod 600 backend/.env
```

**防火墙配置：**

```bash
# 只开放必要端口
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 6.2 HTTPS 配置

**使用 Let's Encrypt：**

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

**Nginx HTTPS 配置：**

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # ... 其他配置
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

### 6.3 数据安全

**数据库加密：**

```bash
# 使用 SQLCipher 加密数据库
# 需要修改代码支持加密连接
```

**敏感信息保护：**

- 不要将 `.env` 文件提交到版本控制
- 定期轮换 JWT 密钥
- 定期更换管理员密码

---

## 7. 升级维护

### 7.1 版本升级

**Docker 升级：**

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose down
docker-compose up -d --build
```

**手动升级：**

```bash
# 拉取最新代码
git pull

# 更新依赖
npm install
cd backend && npm install && cd ..

# 重新构建
npm run build
cd backend && npm run build && cd ..

# 重启服务
pm2 restart ai-hot-news-hub
```

### 7.2 数据库迁移

```bash
# 推送新的 schema
cd backend
npm run db:push

# 如果有数据迁移脚本
npm run db:migrate
```

### 7.3 回滚操作

```bash
# 回滚到指定版本
git checkout v1.0.0

# 重新构建
docker-compose up -d --build

# 恢复数据库备份
cp /path/to/backup/database.sqlite ./backend/data/
```

---

## 8. 扩展部署

### 8.1 负载均衡

**使用 Nginx 负载均衡：**

```nginx
upstream backend {
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
}

server {
    listen 80;
    server_name your-domain.com;

    location /api {
        proxy_pass http://backend;
    }
}
```

**使用 PM2 集群模式：**

```bash
# 启动多个实例
pm2 start dist/index.js --name ai-hot-news-hub -i 3
```

### 8.2 缓存配置

**使用 Redis 缓存：**

```yaml
# docker-compose.yml
services:
  redis:
    image: redis:alpine
    ports:
      - '6379:6379'
    volumes:
      - redis-data:/data

  app:
    build: .
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

volumes:
  redis-data:
```

### 8.3 CDN 配置

**静态资源 CDN：**

```nginx
# Nginx 配置
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    root /path/to/ai-hot-news-hub/dist;
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

---

## 附录

### A. 端口说明

| 端口 | 服务    | 说明                         |
| ---- | ------- | ---------------------------- |
| 80   | Nginx   | HTTP 访问                    |
| 443  | Nginx   | HTTPS 访问                   |
| 8762 | Fastify | 后端 API 服务                |
| 8763 | Vite    | 前端开发服务器（仅开发环境） |

### B. 目录结构

```
ai-hot-news-hub/
├── dist/                    # 前端构建产物
├── backend/
│   ├── dist/                # 后端构建产物
│   ├── data/                # SQLite 数据库文件
│   │   └── database.sqlite
│   └── .env                 # 后端环境变量
├── .env                     # Docker 环境变量
├── docker-compose.yml       # Docker 编排配置
└── Dockerfile               # Docker 镜像配置
```

### C. 相关文档

- `docs/PRD.md` — 产品需求文档
- `docs/plan.md` — 开发计划
- `docs/api.md` — 公开 API 文档
- `docs/uml-modeling.md` — UML 建模文档
- `docs/module-description.md` — 模块功能详细描述
- `docs/api-reference.md` — API 接口详细文档
- `docs/database-design.md` — 数据库设计文档
