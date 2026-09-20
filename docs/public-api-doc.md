# 公开 API 接口文档

> 最后更新：2026-09-20
> 本文档记录了各主流平台公开 API 的可用性测试结果。

---

## 一、国内社交 / 资讯平台

### ✅ 可用

| 平台             | API 端点                                                           | 方法 | 认证                      | 备注                                  |
| ---------------- | ------------------------------------------------------------------ | ---- | ------------------------- | ------------------------------------- |
| **知乎热榜**     | `https://api.zhihu.com/topstory/hot-list?limit=50&reverse_order=0` | GET  | 无需                      | 返回 50 条热榜，含标题、热度、URL     |
| **微博热搜**     | `https://weibo.com/ajax/side/hotSearch`                            | GET  | 需要 User-Agent + Referer | 返回 50 条热搜，含关键词、热度、标签  |
| **B站热搜**      | `https://api.bilibili.com/x/web-interface/search/square?limit=30`  | GET  | 无需                      | 返回热搜关键词及热度分数              |
| **今日头条热榜** | `https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc`   | GET  | 无需                      | 返回热榜列表，含标题、URL、热度、分类 |
| **知乎日报**     | `https://news-at.zhihu.com/api/4/news/latest`                      | GET  | 无需                      | 返回每日最新文章列表                  |
| **澎湃新闻**     | `https://cache.thepaper.cn/contentapi/wwwIndex/rightSidebar`       | GET  | 无需                      | 返回侧边栏热门文章                    |

### ❌ 不可用

| 平台              | 状态          | 原因                                        |
| ----------------- | ------------- | ------------------------------------------- |
| **小红书**        | 需要签名/认证 | API 保护严格，多个端点返回 404 或空数据     |
| **抖音**          | 需要签名/认证 | API 保护严格，无公开可用端点                |
| **微信 24h 热文** | 无官方 API    | 第三方聚合站不稳定；搜狗微信搜索端点已变更  |
| **X (Twitter)**   | 需 OAuth 认证 | 官方 API 返回 401；Nitter 已关闭            |
| **Instagram**     | 需认证        | `?__a=1` 端点已被封禁；Graph API 需权限申请 |
| **Facebook**      | 需登录态      | 无公开趋势 API                              |
| **大众点评**      | 企业合作模式  | 需企业资质入驻审核，无个人开发者 API        |

---

## 二、开发者 / 技术社区

### ✅ 可用

| 平台             | API 端点                                                                                    | 方法 | 认证 | 备注                                           |
| ---------------- | ------------------------------------------------------------------------------------------- | ---- | ---- | ---------------------------------------------- |
| **掘金**         | `https://api.juejin.cn/recommend_api/v1/article/recommend_all_feed`                         | POST | 无需 | Body: `{"cursor":"0","limit":5}`，返回推荐文章 |
| **CSDN 博客**    | `https://blog.csdn.net/phoenix/web/blog/hot-rank?page=0&pageSize=5&type=hot`                | GET  | 无需 | 返回热榜文章，含标题、阅读量、评论数           |
| **GitHub**       | `https://api.github.com/search/repositories?q=stars:>1000&sort=stars&order=desc&per_page=5` | GET  | 无需 | 搜索热门仓库，含 star 数、描述等               |
| **Hugging Face** | `https://huggingface.co/api/models?sort=likes&limit=5`                                      | GET  | 无需 | 返回热门模型列表，含下载量、点赞数             |

### ❌ 不可用

| 平台        | 状态       | 原因             |
| ----------- | ---------- | ---------------- |
| **Readhub** | API 已关闭 | 所有端点返回 404 |

---

## 三、AI / 科技媒体

### ✅ 可用

| 平台                      | API 端点                                                       | 方法 | 认证 | 备注                       |
| ------------------------- | -------------------------------------------------------------- | ---- | ---- | -------------------------- |
| **机器之心**              | `https://www.jiqizhixin.com/api/v1/articles?page=1&per_page=5` | GET  | 无需 | 返回 AI/ML 文章列表        |
| **量子位**                | `https://www.qbitai.com/feed`                                  | GET  | 无需 | RSS 格式，返回最新 AI 资讯 |
| **Google AI Blog**        | `https://blog.google/technology/ai/rss/`                       | GET  | 无需 | RSS 格式                   |
| **MIT Technology Review** | `https://www.technologyreview.com/feed/`                       | GET  | 无需 | RSS 格式                   |
| **超神经**                | `https://hyper.ai/api/v1/articles?page=1&limit=5`              | GET  | 无需 | 返回 HTML，需解析          |

### ❌ 不可用

| 平台                            | 状态       | 原因                                   |
| ------------------------------- | ---------- | -------------------------------------- |
| **AIbase**                      | 无公开 API | 多个端点返回 404                       |
| **MIT Technology Review China** | SPA 渲染   | 返回 HTML 外壳，需 JS 渲染才能获取内容 |

---

## 四、其他平台

### ✅ 可用

| 平台         | API 端点                                                                                   | 方法 | 认证 | 备注                                                             |
| ------------ | ------------------------------------------------------------------------------------------ | ---- | ---- | ---------------------------------------------------------------- |
| **36氪热榜** | `https://gateway.36kr.com/api/mis/nav/home/nav/rank/hot`                                   | POST | 无需 | Body: `{"partner_id":"wap","param":{"siteId":1,"platformId":2}}` |
| **百度热搜** | `https://top.baidu.com/board?tab=realtime`                                                 | GET  | 无需 | 返回 HTML，需解析 `word` 字段                                    |
| **豆瓣电影** | `https://movie.douban.com/j/search_subjects?type=movie&tag=热门&page_limit=5&page_start=0` | GET  | 无需 | 返回热门电影列表                                                 |
| **IT之家**   | `https://api.ithome.com/xml/newslist/news.xml`                                             | GET  | 无需 | XML 格式新闻列表                                                 |
| **少数派**   | `https://sspai.com/api/v1/article/tag/info/get?limit=5&offset=0&tag=hot`                   | GET  | 无需 | 返回热榜文章                                                     |
| **微信读书** | `https://weread.qq.com/web/category/rising`                                                | GET  | 无需 | 返回飙升榜                                                       |

### ❌ 不可用

| 平台         | 状态        | 原因                      |
| ------------ | ----------- | ------------------------- |
| **虎扑**     | WAF 拦截    | 返回 405 拦截页面         |
| **豆瓣小组** | 需要 apikey | 返回 "apikey is required" |
| **果壳**     | 参数问题    | 400 Bad Request           |
| **虎嗅**     | 端点变更    | 返回 404                  |
| **百度贴吧** | 返回 HTML   | 热议页面需 JS 渲染        |

---

## 五、接口分类汇总

### 无需认证的 REST API（最推荐）

```
知乎热榜:     GET https://api.zhihu.com/topstory/hot-list?limit=50
微博热搜:     GET https://weibo.com/ajax/side/hotSearch (需 Headers)
B站热搜:     GET https://api.bilibili.com/x/web-interface/search/square?limit=30
今日头条:     GET https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc
CSDN博客:    GET https://blog.csdn.net/phoenix/web/blog/hot-rank?page=0&pageSize=5&type=hot
GitHub:      GET https://api.github.com/search/repositories?q=stars:>1000&sort=stars
HuggingFace: GET https://huggingface.co/api/models?sort=likes&limit=5
豆瓣电影:     GET https://movie.douban.com/j/search_subjects?type=movie&tag=热门
机器之心:     GET https://www.jiqizhixin.com/api/v1/articles?page=1&per_page=5
36氪热榜:    POST https://gateway.36kr.com/api/mis/nav/home/nav/rank/hot
```

### RSS/Atom 订阅源

```
量子位:       https://www.qbitai.com/feed
Google AI:   https://blog.google/technology/ai/rss/
MIT Tech:    https://www.technologyreview.com/feed/
```

### 需解析 HTML/XML

```
百度热搜:     https://top.baidu.com/board?tab=realtime (HTML)
IT之家:      https://api.ithome.com/xml/newslist/news.xml (XML)
超神经:      https://hyper.ai/api/v1/articles?page=1&limit=5 (HTML)
```
