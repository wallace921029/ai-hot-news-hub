# 新增领域公开 API 接口文档

> 最后测试：2026-09-23
> 测试标准：HTTP 200 且返回真实结构化数据（JSON/XML 含有效条目），样本摘录自实测响应
> 范围说明：本文档是 `public-api-doc.md`（社交热榜 / 开发者社区 / AI 媒体）的**领域扩展**，只收录原文档未覆盖的新领域；已收录接口不重复列出
> 本轮发起约 90 次请求（含端点复测），收录实测通过的 **30 条接口**
> 其中 RSS/Atom 形态且经 `RssFetcher` 实测可解析的 7 源（Slashdot、Stack Overflow 博客、TMZ、Page Six、Steam 新闻、中新网、DW 中文）已归入 [rss-cn.md](./rss-cn.md) / [rss-en.md](./rss-en.md)

---

## 一、热榜聚合（多平台一键热榜）

### ✅ 可用

| 平台        | API 端点                                           | 方法 | 认证 | 备注                                                                                                                        |
| ----------- | -------------------------------------------------- | ---- | ---- | --------------------------------------------------------------------------------------------------------------------------- |
| **UApiPro** | `https://uapis.cn/api/v1/misc/hotboard?type=weibo` | GET  | 无需 | 40+ 平台热榜（weibo/zhihu/douyin/bilibili/toutiao…），含热度、排名、原始链接；1 credit/次，4 QPS；支持历史时间机模式（Pro） |

样本（uapis 微博热榜实测）：

```json
{
  "type": "weibo",
  "update_time": "2026-09-23T10:54:42.338Z",
  "list": [
    {
      "index": 1,
      "title": "习近平离京对美国进行国事访问",
      "hot_value": "1123325",
      "url": "https://s.weibo.com/weibo?q=..."
    }
  ]
}
```

---

## 二、科技 / 开发者（原清单之外新增）

### ✅ 可用

| 平台                 | API 端点                                                                          | 方法 | 认证 | 备注                                      |
| -------------------- | --------------------------------------------------------------------------------- | ---- | ---- | ----------------------------------------- |
| **Hacker News 官方** | `https://hacker-news.firebaseio.com/v0/topstories.json`（+ `/v0/item/{id}.json`） | GET  | 无需 | 官方 Firebase API，先取 story id 再取详情 |
| **Lobsters**         | `https://lobste.rs/hottest.json`                                                  | GET  | 无需 | 技术书签热帖，返回 title/url/score        |
| **dev.to**           | `https://dev.to/api/articles?top=1&per_page=5`                                    | GET  | 无需 | 按天热门文章，含标题/点赞/正文            |
| **arXiv**            | `http://export.arxiv.org/api/query?search_query=cat:cs.AI&max_results=3`          | GET  | 无需 | Atom 预印本，学术 AI 论文追踪             |

---

## 三、AI（模型 / 论文）

### ✅ 可用

| 平台                   | API 端点                                               | 方法 | 认证 | 备注                              |
| ---------------------- | ------------------------------------------------------ | ---- | ---- | --------------------------------- |
| **OpenRouter**         | `https://openrouter.ai/api/v1/models`                  | GET  | 无需 | 455+ 模型列表，含定价与上下文长度 |
| **HuggingFace Spaces** | `https://huggingface.co/api/spaces?sort=likes&limit=3` | GET  | 无需 | 热门应用，含点赞数                |

---

## 四、电影 / 影视

### ✅ 可用

| 平台                        | API 端点                                                                                    | 方法 | 认证                                | 备注                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------- | ---- | ----------------------------------- | ---------------------------------------------------- |
| **豆瓣 正在热映**（移动端） | `https://m.douban.com/rexxar/api/v2/subject_collection/movie_showing/items?start=0&count=5` | GET  | 需 `Referer: https://m.douban.com/` | 实测 total=45，含封面/评分/海报；未登录可用          |
| **豆瓣 即将上映**           | `https://m.douban.com/rexxar/api/v2/subject_collection/movie_soon/items?start=0&count=5`    | GET  | 同上                                | 实测 total=19                                        |
| **豆瓣 美剧榜**             | `https://m.douban.com/rexxar/api/v2/subject_collection/tv_american/items?start=0&count=5`   | GET  | 同上                                | 同构端点，其他分类换 collection 名                   |
| **豆瓣 热门电影**（PC）     | `https://movie.douban.com/j/search_subjects?type=movie&tag=热门&page_limit=5&page_start=0`  | GET  | 无需                                | `tag=正在热映` 已失效（返回 `undefined`），用 `热门` |
| **TVMaze 排期**             | `https://api.tvmaze.com/schedule?date=2026-09-23&country=US`                                | GET  | 无需                                | 免费无 key，逐集播出排期；限流 20 次/10 秒           |
| **TVMaze 搜索**             | `https://api.tvmaze.com/singlesearch/shows?q=breaking+bad`                                  | GET  | 无需                                | 剧集详情（评分/季集/演员）                           |

样本（豆瓣正在热映实测）：`{"start":0,"count":5,"total":45,"subject_collection_items":[{"cover":{"url":"https://img3.doubanio.com/..."}}]}`

---

## 五、娱乐 / 八卦

### ✅ 可用

| 平台             | API 端点                                                           | 方法 | 认证 | 备注                                              |
| ---------------- | ------------------------------------------------------------------ | ---- | ---- | ------------------------------------------------- |
| **中文八卦入口** | `https://uapis.cn/api/v1/misc/hotboard?type=weibo` / `type=douyin` | GET  | 无需 | 微博/抖音热榜是中文娱乐八卦主战场，经热榜聚合获取 |

---

## 六、新闻 / 资讯（国际 + 中文，原清单之外）

### ✅ 可用

| 平台          | API 端点                                                                   | 方法 | 认证 | 备注                                 |
| ------------- | -------------------------------------------------------------------------- | ---- | ---- | ------------------------------------ |
| **新浪 7×24** | `https://zhibo.sina.com.cn/api/zhibo/feed?page=1&page_size=5&zhibo_id=152` | GET  | 无需 | 财经/全站快讯流 JSON，含时间戳与正文 |

样本（新浪 7×24 实测）：`{"result":{"status":{"code":0,"msg":"OK"},"timestamp":"Wed Sep 23 18:55:31 +0800 2026","data":{...}}}`

---

## 七、音乐

### ✅ 可用

| 平台                  | API 端点                                                             | 方法 | 认证                | 备注                                             |
| --------------------- | -------------------------------------------------------------------- | ---- | ------------------- | ------------------------------------------------ |
| **网易云 排行榜总览** | `https://music.163.com/api/toplist`                                  | GET  | 无需                | 一次返回 63 个榜单及其歌单 id（首选入口）        |
| **网易云 飙升榜**     | `https://music.163.com/api/playlist/detail?id=19723756`              | GET  | 无需                | 完整歌单详情，含曲目/歌手/播放量                 |
| **网易云 新歌榜**     | `https://music.163.com/api/playlist/detail?id=3778678`               | GET  | 无需                | 同上；**榜单 id 以 `/api/toplist` 实时返回为准** |
| **MusicBrainz**       | `https://musicbrainz.org/ws/2/artist?query=tag:pop&fmt=json&limit=3` | GET  | 需自定义 User-Agent | 开放音乐数据库，必须带 UA，1 req/s 限流          |

---

## 八、游戏

### ✅ 可用

| 平台               | API 端点                                                                                         | 方法 | 认证 | 备注                                 |
| ------------------ | ------------------------------------------------------------------------------------------------ | ---- | ---- | ------------------------------------ |
| **Steam 特惠推荐** | `https://store.steampowered.com/api/featured/`                                                   | GET  | 无需 | 首页精选/特惠，含 appid 与折扣       |
| **Epic 限免**      | `https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=en-US&country=US` | GET  | 无需 | 当前/即将免费游戏，含原价与折扣区间  |
| **SteamSpy**       | `https://steamspy.com/api.php?request=top100in2weeks`                                            | GET  | 无需 | 按两周活跃玩家的 Top100，含厂商/价格 |

样本（Steam featured 实测）：`{"featured_win":[{"id":4358690,"name":"Graveyard Keeper 2",...}]}`

---

## 九、体育

### ✅ 可用

| 平台            | API 端点                                                                | 方法 | 认证         | 备注                                 |
| --------------- | ----------------------------------------------------------------------- | ---- | ------------ | ------------------------------------ |
| **ESPN**        | `https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard` | GET  | 无需         | 隐藏公开接口，联赛换路径（nba/nfl…） |
| **TheSportsDB** | `https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=2026-09-23`  | GET  | 测试 key `3` | 每日赛事列表，免费档可用             |

---

## 十、财经 / 行情

### ✅ 可用

| 平台         | API 端点                                                                                                                                          | 方法 | 认证                                      | 备注                                               |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------- | -------------------------------------------------- |
| **新浪行情** | `https://hq.sinajs.cn/list=sh000001`                                                                                                              | GET  | 需 `Referer: https://finance.sina.com.cn` | 实时指数/个股；**响应为 GBK 编码**，多标的逗号分隔 |
| **东方财富** | `https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=5&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23&fields=f2,f12,f14,f3` | GET  | 无需                                      | A 股涨幅榜，含代码/名称/涨幅                       |

样本（新浪行情实测，GBK 解码后）：`hq_str_sh000001="上证指数,3951.36,3952.13,3936.52,..."`

---

## 十一、加密行情

### ✅ 可用

| 平台          | API 端点                                                                                          | 方法 | 认证 | 备注                  |
| ------------- | ------------------------------------------------------------------------------------------------- | ---- | ---- | --------------------- |
| **CoinGecko** | `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=5` | GET  | 无需 | 币价/市值榜，匿名可用 |
| **OKX**       | `https://www.okx.com/api/v5/market/tickers?instType=SPOT`                                         | GET  | 无需 | 全现货 24h 行情       |

---

## 十二、天气

### ✅ 可用

| 平台           | API 端点                                                                                                               | 方法 | 认证 | 备注                 |
| -------------- | ---------------------------------------------------------------------------------------------------------------------- | ---- | ---- | -------------------- |
| **Open-Meteo** | `https://api.open-meteo.com/v1/forecast?latitude=31.23&longitude=121.47&current=temperature_2m&timezone=Asia/Shanghai` | GET  | 无需 | 免费无 key，精度可选 |

---

## 十三、图书 / 阅读

### ✅ 可用

| 平台             | API 端点                                      | 方法 | 认证 | 备注                           |
| ---------------- | --------------------------------------------- | ---- | ---- | ------------------------------ |
| **Open Library** | `https://openlibrary.org/subjects/scifi.json` | GET  | 无需 | 主题书目（封面/出版信息/热度） |

---

## 测试汇总

| 结果    | 收录数 | 说明                    |
| ------- | ------ | ----------------------- |
| ✅ 可用 | 30     | 实测 200 且返回真实条目 |

### 接入建议（按优先级）

1. **热榜聚合首选 uapis**（免注册、多平台、有热度值）
2. **电影用豆瓣 rexxar**（记得带 `Referer: m.douban.com`），**剧集排期用 TVmaze**
3. **八卦：英文走 [rss-en.md](./rss-en.md) 的 TMZ/Page Six 订阅源**；中文八卦走微博/抖音热榜（uapis）
4. **音乐从网易云 `/api/toplist` 入口**拿全部榜单 id，再拉详情
5. 所有请求建议带浏览器 UA；新浪系与豆瓣移动端需额外 Referer
