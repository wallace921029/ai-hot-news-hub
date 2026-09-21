# 已验证数据源清单（导入用）

> 最后更新：2026-09-21
> 本文档记录当前系统中**已录入并验证可用**的全部数据源，供 AI 在新环境 / 重建数据库后一键导入。
> 与 `public-api-doc.md`（API 可用性测试记录）的区别：本文档是"系统当前生效配置"的快照，字段与 `data_sources` 表一一对应。
> 机器可读副本：`docs/validated-rss-api.sources.json`（与下方「数据源 JSON」内容一致，导入脚本直接读取该文件）。

---

## 导入方法

### 方式 A：管理 API 导入（推荐）

后端运行于 `http://localhost:8762`。先登录获取 token，再逐条 POST（脚本自动跳过 URL 已存在的源，幂等可重复执行）：

```bash
TOKEN=$(curl -s -X POST http://localhost:8762/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}' | jq -r .token)

# 将下方 JSON 数组逐条导入，已存在的按 URL 跳过
jq -c '.[]' <<'EOF' | while read -r src; do
  url=$(echo "$src" | jq -r .url)
  exists=$(curl -s http://localhost:8762/api/admin/sources -H "Authorization: Bearer $TOKEN" | jq --arg u "$url" '[.[] | select(.url==$u)] | length')
  if [ "$exists" = "0" ]; then
    echo "$src" | curl -s -X POST http://localhost:8762/api/admin/sources \
      -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d @- | jq -r '"✓ 已导入 \(.name)"'
  else
    echo "− 跳过已存在: $url"
  fi
done
<在此粘贴下方「数据源 JSON」代码块内容>
EOF
```

### 方式 B：直接写入 SQLite（后端未运行时）

```bash
cd backend && node -e "
const Database = require('better-sqlite3');
const db = new Database('./data/database.db');
const sources = require('../docs/validated-rss-api.sources.json'); // 或将 JSON 内联
const ins = db.prepare(\`INSERT INTO data_sources (name, type, source_type, url, method, headers, parser, enabled, fetch_interval, description, created_at, updated_at)
  VALUES (@name, @type, @sourceType, @url, @method, @headers, @parser, @enabled, @fetchInterval, @description, strftime('%s','now'), strftime('%s','now'))\`);
const has = db.prepare('SELECT 1 FROM data_sources WHERE url = ?');
let n = 0;
for (const s of sources) {
  if (has.get(s.url)) continue;
  ins.run({ ...s, headers: s.headers ? JSON.stringify(s.headers) : null });
  n++;
}
console.log('导入', n, '个数据源');
"
```

导入后验证：`curl -s http://localhost:8762/api/admin/sources -H "Authorization: Bearer $TOKEN" | jq length`，并到管理后台"数据源管理"页点"获取全部"确认抓取正常。

---

## 字段说明（务必遵守，否则会复现历史 bug）

| 字段            | 含义                                           | 取值                                                          |
| --------------- | ---------------------------------------------- | ------------------------------------------------------------- |
| `name`          | 数据源显示名                                   | 中文/英文自由                                                 |
| `type`          | **fetcher 类型**（决定用哪个抓取器）           | `rest` / `rss` / `html`                                       |
| `sourceType`    | **展示分类**（决定首页 tab 归属）              | `rss` / `api` / `topic`                                       |
| `url`           | 请求地址                                       | 必填                                                          |
| `method`        | HTTP 方法                                      | `GET` / `POST`                                                |
| `headers`       | 附加请求头（对象，入库时序列化为 JSON 字符串） | 如微博需 `User-Agent` + `Referer`                             |
| `parser`        | 解析器键名（rest/html 必填；rss 可空）         | 见 `backend/src/fetchers/rest.ts` / `html.ts` 的 parsers 映射 |
| `enabled`       | 是否启用                                       | 1/0                                                           |
| `fetchInterval` | 抓取间隔（分钟）                               | 5-1440                                                        |

⚠️ **关键约束**：

1. `type='rss'` 的源**必须**同时传 `sourceType='rss'`，否则新闻会被错误归入 API tab（历史 bug，已在前后端双重防御，但导入时仍应显式传对）。
2. `parser` 必须是后端 parsers 映射表中存在的键名（rest：`zhihu` `zhihu-daily` `weibo` `bilibili` `toutiao` `juejin` `csdn` `github` `huggingface` `jiqizhixin` `36kr` `douban` `thepaper` `sspai` `weread` `v2ex`；html：`baidu` `ithome` `hyperai`），否则抓取时报"未找到解析器"。
3. RSS 源的 `parser` 留空即可（`platform` 会记为 `rss`），或填自定义标识（如 `qbitai`）作为 platform 标签。

---

## 数据源 JSON

```json
[
  {
    "name": "知乎热榜",
    "type": "rest",
    "sourceType": "api",
    "url": "https://api.zhihu.com/topstory/hot-list?limit=50&reverse_order=0",
    "method": "GET",
    "headers": null,
    "parser": "zhihu",
    "enabled": true,
    "fetchInterval": 30,
    "description": "返回 50 条热榜，含标题、热度、URL"
  },
  {
    "name": "微博热搜",
    "type": "rest",
    "sourceType": "api",
    "url": "https://weibo.com/ajax/side/hotSearch",
    "method": "GET",
    "headers": {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Referer": "https://weibo.com/"
    },
    "parser": "weibo",
    "enabled": true,
    "fetchInterval": 30,
    "description": "返回 50 条热搜，含关键词、热度、标签"
  },
  {
    "name": "B站热搜",
    "type": "rest",
    "sourceType": "api",
    "url": "https://api.bilibili.com/x/web-interface/search/square?limit=30",
    "method": "GET",
    "headers": null,
    "parser": "bilibili",
    "enabled": true,
    "fetchInterval": 30,
    "description": "返回热搜关键词及热度分数"
  },
  {
    "name": "今日头条热榜",
    "type": "rest",
    "sourceType": "api",
    "url": "https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc",
    "method": "GET",
    "headers": null,
    "parser": "toutiao",
    "enabled": true,
    "fetchInterval": 30,
    "description": "返回热榜列表，含标题、URL、热度、分类"
  },
  {
    "name": "知乎日报",
    "type": "rest",
    "sourceType": "api",
    "url": "https://news-at.zhihu.com/api/4/news/latest",
    "method": "GET",
    "headers": null,
    "parser": "zhihu-daily",
    "enabled": true,
    "fetchInterval": 60,
    "description": "返回每日最新文章列表"
  },
  {
    "name": "澎湃新闻",
    "type": "rest",
    "sourceType": "api",
    "url": "https://cache.thepaper.cn/contentapi/wwwIndex/rightSidebar",
    "method": "GET",
    "headers": null,
    "parser": "thepaper",
    "enabled": true,
    "fetchInterval": 30,
    "description": "返回侧边栏热门文章"
  },
  {
    "name": "掘金推荐",
    "type": "rest",
    "sourceType": "api",
    "url": "https://api.juejin.cn/recommend_api/v1/article/recommend_all_feed",
    "method": "POST",
    "headers": null,
    "parser": "juejin",
    "enabled": true,
    "fetchInterval": 30,
    "description": "返回推荐文章"
  },
  {
    "name": "CSDN博客热榜",
    "type": "rest",
    "sourceType": "api",
    "url": "https://blog.csdn.net/phoenix/web/blog/hot-rank?page=0&pageSize=20&type=hot",
    "method": "GET",
    "headers": null,
    "parser": "csdn",
    "enabled": true,
    "fetchInterval": 30,
    "description": "返回热榜文章，含标题、阅读量、评论数"
  },
  {
    "name": "GitHub Trending",
    "type": "rest",
    "sourceType": "api",
    "url": "https://api.github.com/search/repositories?q=stars:>1000&sort=stars&order=desc&per_page=20",
    "method": "GET",
    "headers": null,
    "parser": "github",
    "enabled": true,
    "fetchInterval": 60,
    "description": "搜索热门仓库，含 star 数、描述等"
  },
  {
    "name": "Hugging Face 热门模型",
    "type": "rest",
    "sourceType": "api",
    "url": "https://huggingface.co/api/models?sort=likes&limit=20",
    "method": "GET",
    "headers": null,
    "parser": "huggingface",
    "enabled": true,
    "fetchInterval": 60,
    "description": "返回热门模型列表，含下载量、点赞数"
  },
  {
    "name": "机器之心",
    "type": "rest",
    "sourceType": "api",
    "url": "https://www.jiqizhixin.com/api/v1/articles?page=1&per_page=20",
    "method": "GET",
    "headers": null,
    "parser": "jiqizhixin",
    "enabled": false,
    "fetchInterval": 30,
    "description": "返回 AI/ML 文章列表（已禁用：抓取成功率低）"
  },
  {
    "name": "量子位 RSS",
    "type": "rss",
    "sourceType": "rss",
    "url": "https://www.qbitai.com/feed",
    "method": "GET",
    "headers": null,
    "parser": "qbitai",
    "enabled": true,
    "fetchInterval": 60,
    "description": "RSS 格式，返回最新 AI 资讯"
  },
  {
    "name": "Google AI Blog RSS",
    "type": "rss",
    "sourceType": "rss",
    "url": "https://blog.google/technology/ai/rss/",
    "method": "GET",
    "headers": null,
    "parser": "google-ai",
    "enabled": true,
    "fetchInterval": 120,
    "description": "RSS 格式"
  },
  {
    "name": "MIT Technology Review RSS",
    "type": "rss",
    "sourceType": "rss",
    "url": "https://www.technologyreview.com/feed/",
    "method": "GET",
    "headers": null,
    "parser": "mit-tech",
    "enabled": true,
    "fetchInterval": 120,
    "description": "RSS 格式"
  },
  {
    "name": "超神经",
    "type": "html",
    "sourceType": "api",
    "url": "https://hyper.ai/api/v1/articles?page=1&limit=20",
    "method": "GET",
    "headers": null,
    "parser": "hyperai",
    "enabled": false,
    "fetchInterval": 60,
    "description": "返回 HTML，需解析（已禁用）"
  },
  {
    "name": "36氪热榜",
    "type": "rest",
    "sourceType": "api",
    "url": "https://gateway.36kr.com/api/mis/nav/home/nav/rank/hot",
    "method": "POST",
    "headers": null,
    "parser": "36kr",
    "enabled": false,
    "fetchInterval": 30,
    "description": "返回热榜文章（已禁用：接口变更）"
  },
  {
    "name": "百度热搜",
    "type": "html",
    "sourceType": "api",
    "url": "https://top.baidu.com/board?tab=realtime",
    "method": "GET",
    "headers": null,
    "parser": "baidu",
    "enabled": true,
    "fetchInterval": 30,
    "description": "返回 HTML，需解析 word 字段"
  },
  {
    "name": "豆瓣热门电影",
    "type": "rest",
    "sourceType": "api",
    "url": "https://movie.douban.com/j/search_subjects?type=movie&tag=热门&page_limit=20&page_start=0",
    "method": "GET",
    "headers": null,
    "parser": "douban",
    "enabled": true,
    "fetchInterval": 60,
    "description": "返回热门电影列表"
  },
  {
    "name": "IT之家",
    "type": "html",
    "sourceType": "api",
    "url": "https://api.ithome.com/xml/newslist/news.xml",
    "method": "GET",
    "headers": null,
    "parser": "ithome",
    "enabled": true,
    "fetchInterval": 30,
    "description": "XML 格式新闻列表"
  },
  {
    "name": "Hacker News",
    "type": "rss",
    "sourceType": "rss",
    "url": "https://news.ycombinator.com/rss",
    "method": "GET",
    "headers": null,
    "parser": "hackernews",
    "enabled": true,
    "fetchInterval": 30,
    "description": "全球最热门的技术新闻和创业资讯"
  },
  {
    "name": "V2EX 热门",
    "type": "rest",
    "sourceType": "api",
    "url": "https://www.v2ex.com/api/topics/hot.json",
    "method": "GET",
    "headers": null,
    "parser": "v2ex",
    "enabled": true,
    "fetchInterval": 30,
    "description": "V2EX 开发者社区热门话题"
  },
  {
    "name": "阮一峰",
    "type": "rss",
    "sourceType": "rss",
    "url": "http://www.ruanyifeng.com/blog/atom.xml",
    "method": "GET",
    "headers": null,
    "parser": "",
    "enabled": true,
    "fetchInterval": 30,
    "description": "科技爱好者周刊，Atom 格式，含全文 HTML 与图片"
  },
  {
    "name": "南方周末-新闻",
    "type": "rss",
    "sourceType": "rss",
    "url": "https://rsshub.ktachibana.party/infzm/2",
    "method": "GET",
    "headers": null,
    "parser": "",
    "enabled": true,
    "fetchInterval": 30,
    "description": "经 RSSHub 公共镜像代理（rsshub.app 官方实例封禁程序化抓取，勿用）"
  },
  {
    "name": "《联合早报》-中港台-即时",
    "type": "rss",
    "sourceType": "rss",
    "url": "https://plink.anyfeeder.com/zaobao/realtime/china",
    "method": "GET",
    "headers": null,
    "parser": "",
    "enabled": true,
    "fetchInterval": 30,
    "description": "经 anyfeeder 聚合代理"
  }
]
```

---

## 备注

- **数量**：共 24 个源（启用 21 / 禁用 3）。禁用源保留在清单中便于恢复，导入时按需改 `enabled`。
- **RSSHub 源**：公共实例 `rsshub.app` 已封禁非浏览器抓取（403）。当前使用镜像 `rsshub.ktachibana.party`，若失效可到 https://docs.rsshub.app/deploy/ 自建（`docker run -d -p 1200:1200 diygod/rsshub`，路由改为 `http://localhost:1200/infzm/2`）。
- **RSS 抓取行为**：`rss-parser` 优先取 `<content:encoded>`（含 HTML 与图片），相对路径自动补全为绝对 URL，详情页以净化后的 HTML 渲染。
- **恢复出厂**：`cd backend && npm run db:seed` 只写入 seed 内置源（不含本清单中后期手动添加的 阮一峰 / 南方周末 / 联合早报），完整恢复请用上方导入方式。
