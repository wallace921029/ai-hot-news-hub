# 已验证公开 API 数据源

> 最后更新：2026-09-21
> 验证状态：✅ 已验证可用

---

## 一、REST API 数据源

### ✅ 已验证可用（11个）

| 平台             | 数据源名称            | API 端点                                                                                     | 方法 | 认证  | 平台标识      | 累计数据量 |
| ---------------- | --------------------- | -------------------------------------------------------------------------------------------- | ---- | ----- | ------------- | ---------- |
| **知乎热榜**     | 知乎热榜              | `https://api.zhihu.com/topstory/hot-list?limit=50&reverse_order=0`                           | GET  | 无需  | `zhihu`       | 106+       |
| **知乎日报**     | 知乎日报              | `https://news-at.zhihu.com/api/4/news/latest`                                                | GET  | 无需  | `zhihu`       | 间歇性     |
| **微博热搜**     | 微博热搜              | `https://weibo.com/ajax/side/hotSearch`                                                      | GET  | 需 UA | `weibo`       | 198+       |
| **B站热搜**      | B站热搜               | `https://api.bilibili.com/x/web-interface/search/square?limit=30`                            | GET  | 无需  | `bilibili`    | 89+        |
| **今日头条**     | 今日头条热榜          | `https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc`                             | GET  | 无需  | `toutiao`     | 153+       |
| **掘金**         | 掘金推荐              | `https://api.juejin.cn/recommend_api/v1/article/recommend_all_feed`                          | POST | 无需  | `juejin`      | 20+        |
| **CSDN**         | CSDN博客热榜          | `https://blog.csdn.net/phoenix/web/blog/hot-rank?page=0&pageSize=20&type=hot`                | GET  | 无需  | `csdn`        | 37+        |
| **GitHub**       | GitHub Trending       | `https://api.github.com/search/repositories?q=stars:>1000&sort=stars&order=desc&per_page=20` | GET  | 无需  | `github`      | 20+        |
| **Hugging Face** | Hugging Face 热门模型 | `https://huggingface.co/api/models?sort=likes&limit=20`                                      | GET  | 无需  | `huggingface` | 20+        |
| **豆瓣电影**     | 豆瓣热门电影          | `https://movie.douban.com/j/search_subjects?type=movie&tag=热门&page_limit=20&page_start=0`  | GET  | 无需  | `douban`      | 27+        |
| **澎湃新闻**     | 澎湃新闻              | `https://cache.thepaper.cn/contentapi/wwwIndex/rightSidebar`                                 | GET  | 无需  | `thepaper`    | 20+        |
| **V2EX**         | V2EX 热门             | `https://www.v2ex.com/api/topics/hot.json`                                                   | GET  | 无需  | `v2ex`        | 18+        |

### ⚠️ 暂不可用（已禁用）

| 平台         | 数据源名称     | API 端点                                                                  | 失败原因                     |
| ------------ | -------------- | ------------------------------------------------------------------------- | ---------------------------- |
| **机器之心** | 机器之心       | `https://www.jiqizhixin.com/api/v1/articles?page=1&per_page=20`           | API 返回 HTML，无法解析 JSON |
| **36氪**     | 36氪热榜       | `https://gateway.36kr.com/api/mis/nav/home/nav/rank/hot`                  | API 持续返回 HTTP 500 错误   |
| **少数派**   | 少数派热榜     | `https://sspai.com/api/v1/article/tag/info/get?limit=20&offset=0&tag=hot` | 需要登录认证                 |
| **微信读书** | 微信读书飙升榜 | `https://weread.qq.com/web/category/rising`                               | 返回 HTML，非 JSON 格式      |
| **超神经**   | 超神经         | `https://hyper.ai/api/v1/articles?page=1&limit=20`                        | API 返回 HTML，非 JSON 格式  |

---

## 二、RSS/Atom 订阅源

### ✅ 已验证可用（4个）

| 平台                | 数据源名称                | RSS 地址                                 | 平台标识     | 累计数据量 |
| ------------------- | ------------------------- | ---------------------------------------- | ------------ | ---------- |
| **量子位**          | 量子位 RSS                | `https://www.qbitai.com/feed`            | `qbitai`     | 20+        |
| **Google AI**       | Google AI Blog RSS        | `https://blog.google/technology/ai/rss/` | `google-ai`  | 2+         |
| **MIT Tech Review** | MIT Technology Review RSS | `https://www.technologyreview.com/feed/` | `mit-tech`   | 10+        |
| **Hacker News**     | Hacker News               | `https://news.ycombinator.com/rss`       | `hackernews` | 62+        |

---

## 三、HTML 解析数据源

### ✅ 已验证可用（2个）

| 平台         | 数据源名称 | URL                                            | 平台标识 | 累计数据量 |
| ------------ | ---------- | ---------------------------------------------- | -------- | ---------- |
| **百度热搜** | 百度热搜   | `https://top.baidu.com/board?tab=realtime`     | `baidu`  | 62+        |
| **IT之家**   | IT之家     | `https://api.ithome.com/xml/newslist/news.xml` | `ithome` | 1+         |

---

## 四、验证记录

| 日期       | 操作           | 结果               |
| ---------- | -------------- | ------------------ |
| 2026-09-21 | 全量连通性测试 | 24 个源测试        |
| 2026-09-21 | 禁用失效源     | 6 个禁用           |
| 2026-09-21 | 全量抓取测试   | 17/19 成功获取数据 |
| 2026-09-21 | 最终验证       | 19 个启用源        |

---

## 五、统计汇总

| 类型     | 启用数 | 已验证有数据 | 禁用数 |
| -------- | ------ | ------------ | ------ |
| REST API | 12     | 11           | 5      |
| RSS      | 4      | 4            | 0      |
| HTML     | 2      | 2            | 0      |
| **总计** | **18** | **17**       | **5**  |

---

## 六、备注

1. **知乎日报**：API 正常但存在间歇性网络错误（fetch failed），已启用
2. **微博热搜**：需要设置 `User-Agent` 和 `Referer` 请求头
3. **掘金**：使用 POST 方法，body 为 `{"cursor":"0","limit":20}`
4. **36氪热榜**：API 间歇性返回 HTTP 500 错误，已禁用
5. **超神经**：API 返回 HTML 页面，非 JSON 格式，已禁用
