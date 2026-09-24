/**
 * 内置 API 数据源清单（代码即订阅的唯一事实源）。
 *
 * - 配置（url/method/headers/body/parser）只存在于此文件，随代码版本发布，不入库；
 * - DB 仅保存每个源的运行状态（enabled / lastFetchAt / lastError），见 source_states；
 * - 解析器必须存在于 rest.ts / api-parsers.ts / html.ts 的注册表中，与本清单同步修改。
 *
 * code 为稳定身份标识：新闻（news_items.source_code）、抓取日志（fetch_logs.source_code）、
 * 状态表（source_states.code）均以它关联。已发布后不要更改 code。
 */
export interface ApiSourceDef {
  /** 稳定身份，发布后不可变更 */
  code: string
  name: string
  type: 'rest' | 'html'
  url: string
  method?: 'GET' | 'POST'
  headers?: Record<string, string>
  body?: string
  /** 解析器键，必须已在解析器注册表中 */
  parser: string
  description?: string
}

export const builtinApiSources: ApiSourceDef[] = [
  // ===== 热榜聚合 =====
  {
    code: 'uapis-weibo',
    name: 'UApiPro 微博热榜',
    type: 'rest',
    url: 'https://uapis.cn/api/v1/misc/hotboard?type=weibo',
    parser: 'uapis-hotboard',
    description: '多平台热榜聚合（微博），含热度/排名/原始链接',
  },
  {
    code: 'uapis-douyin',
    name: 'UApiPro 抖音热榜',
    type: 'rest',
    url: 'https://uapis.cn/api/v1/misc/hotboard?type=douyin',
    parser: 'uapis-hotboard',
    description: '多平台热榜聚合（抖音），中文八卦主战场',
  },

  // ===== 国内社交 / 资讯 =====
  {
    code: 'zhihu-hot',
    name: '知乎热榜',
    type: 'rest',
    url: 'https://api.zhihu.com/topstory/hot-list?limit=50&reverse_order=0',
    parser: 'zhihu',
    description: '返回 50 条热榜，含标题、热度、URL',
  },
  {
    code: 'weibo-hot',
    name: '微博热搜',
    type: 'rest',
    url: 'https://weibo.com/ajax/side/hotSearch',
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Referer: 'https://weibo.com/',
    },
    parser: 'weibo',
    description: '返回 50 条热搜，含关键词、热度、标签',
  },
  {
    code: 'bilibili-hot',
    name: 'B站热搜',
    type: 'rest',
    url: 'https://api.bilibili.com/x/web-interface/search/square?limit=30',
    parser: 'bilibili',
    description: '返回热搜关键词及热度分数',
  },
  {
    code: 'toutiao-hot',
    name: '今日头条热榜',
    type: 'rest',
    url: 'https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc',
    parser: 'toutiao',
    description: '返回热榜列表，含标题、URL、热度、分类',
  },
  {
    code: 'zhihu-daily',
    name: '知乎日报',
    type: 'rest',
    url: 'https://news-at.zhihu.com/api/4/news/latest',
    parser: 'zhihu-daily',
    description: '返回每日最新文章列表',
  },
  {
    code: 'thepaper-hot',
    name: '澎湃新闻',
    type: 'rest',
    url: 'https://cache.thepaper.cn/contentapi/wwwIndex/rightSidebar',
    parser: 'thepaper',
    description: '返回侧边栏热门文章',
  },
  {
    code: 'baidu-hot',
    name: '百度热搜',
    type: 'html',
    url: 'https://top.baidu.com/board?tab=realtime',
    parser: 'baidu',
    description: '返回 HTML，需解析 word 字段',
  },
  {
    code: 'kr36-hot',
    name: '36氪热榜',
    type: 'rest',
    url: 'https://gateway.36kr.com/api/mis/nav/home/nav/rank/hot',
    method: 'POST',
    body: JSON.stringify({ partner_id: 'wap', param: { siteId: 1, platformId: 2 } }),
    parser: '36kr',
    description: 'POST 热榜接口，返回热榜文章',
  },

  // ===== 科技 / 开发者 =====
  {
    code: 'hn-top',
    name: 'Hacker News 官方',
    type: 'rest',
    url: 'https://hacker-news.firebaseio.com/v0/topstories.json',
    parser: 'hn-firebase',
    description: '官方 Firebase API，取 Top12 story 详情',
  },
  {
    code: 'lobsters-hottest',
    name: 'Lobsters 热帖',
    type: 'rest',
    url: 'https://lobste.rs/hottest.json',
    parser: 'lobsters',
    description: '技术书签热帖，含分数与评论数',
  },
  {
    code: 'devto-top',
    name: 'dev.to 热门文章',
    type: 'rest',
    url: 'https://dev.to/api/articles?top=1&per_page=10',
    parser: 'devto',
    description: '按天热门文章，含点赞/标签',
  },
  {
    code: 'arxiv-cs-ai',
    name: 'arXiv cs.AI 论文',
    type: 'rest',
    url: 'https://export.arxiv.org/api/query?search_query=cat:cs.AI&max_results=10',
    parser: 'arxiv',
    description: 'Atom 预印本查询，学术 AI 论文追踪',
  },
  {
    code: 'juejin-feed',
    name: '掘金推荐',
    type: 'rest',
    url: 'https://api.juejin.cn/recommend_api/v1/article/recommend_all_feed',
    method: 'POST',
    body: JSON.stringify({ cursor: '0', limit: 20 }),
    parser: 'juejin',
    description: 'POST 推荐流，返回推荐文章',
  },
  {
    code: 'csdn-hot',
    name: 'CSDN博客热榜',
    type: 'rest',
    url: 'https://blog.csdn.net/phoenix/web/blog/hot-rank?page=0&pageSize=20&type=hot',
    parser: 'csdn',
    description: '返回热榜文章，含标题、阅读量、评论数',
  },
  {
    code: 'github-trending',
    name: 'GitHub Trending',
    type: 'rest',
    url: 'https://api.github.com/search/repositories?q=stars:>1000&sort=stars&order=desc&per_page=20',
    parser: 'github',
    description: '搜索热门仓库，含 star 数、描述等',
  },
  {
    code: 'ithome-xml',
    name: 'IT之家',
    type: 'html',
    url: 'https://api.ithome.com/xml/newslist/news.xml',
    parser: 'ithome',
    description: 'XML 格式新闻列表',
  },

  // ===== AI =====
  {
    code: 'openrouter-models',
    name: 'OpenRouter 模型',
    type: 'rest',
    url: 'https://openrouter.ai/api/v1/models',
    parser: 'openrouter',
    description: '模型列表按创建时间取最新 30，含定价与上下文长度',
  },
  {
    code: 'hf-spaces',
    name: 'HuggingFace Spaces',
    type: 'rest',
    url: 'https://huggingface.co/api/spaces?sort=likes&limit=20',
    parser: 'huggingface',
    description: '热门应用（Spaces），含点赞数',
  },
  {
    code: 'hf-models',
    name: 'Hugging Face 热门模型',
    type: 'rest',
    url: 'https://huggingface.co/api/models?sort=likes&limit=20',
    parser: 'huggingface',
    description: '返回热门模型列表，含下载量、点赞数',
  },
  {
    code: 'hyperai',
    name: '超神经',
    type: 'html',
    url: 'https://hyper.ai/api/v1/articles?page=1&limit=20',
    parser: 'hyperai',
    description: 'JSON/HTML 混合响应，需解析',
  },

  // ===== 电影 / 影视 =====
  {
    code: 'douban-showing',
    name: '豆瓣 正在热映',
    type: 'rest',
    url: 'https://m.douban.com/rexxar/api/v2/subject_collection/movie_showing/items?start=0&count=20',
    headers: { Referer: 'https://m.douban.com/' },
    parser: 'douban-rexxar',
    description: '移动端 rexxar 正在热映，含评分/封面',
  },
  {
    code: 'douban-soon',
    name: '豆瓣 即将上映',
    type: 'rest',
    url: 'https://m.douban.com/rexxar/api/v2/subject_collection/movie_soon/items?start=0&count=20',
    headers: { Referer: 'https://m.douban.com/' },
    parser: 'douban-rexxar',
    description: '移动端 rexxar 即将上映',
  },
  {
    code: 'douban-tv-american',
    name: '豆瓣 美剧榜',
    type: 'rest',
    url: 'https://m.douban.com/rexxar/api/v2/subject_collection/tv_american/items?start=0&count=20',
    headers: { Referer: 'https://m.douban.com/' },
    parser: 'douban-rexxar',
    description: '移动端 rexxar 美剧分类榜',
  },
  {
    code: 'douban-movies',
    name: '豆瓣 热门电影',
    type: 'rest',
    url: 'https://movie.douban.com/j/search_subjects?type=movie&tag=%E7%83%AD%E9%97%A8&page_limit=20&page_start=0',
    parser: 'douban',
    description: 'PC 端热门电影（tag=正在热映已失效）',
  },

  // ===== 新闻 / 资讯 =====
  {
    code: 'sina-zhibo',
    name: '新浪 7×24 快讯',
    type: 'rest',
    url: 'https://zhibo.sina.com.cn/api/zhibo/feed?page=1&page_size=20&zhibo_id=152',
    parser: 'sina-zhibo',
    description: '财经/全站快讯流，含时间戳与正文',
  },

  // ===== 音乐 =====
  {
    code: 'netease-toplist',
    name: '网易云 排行榜总览',
    type: 'rest',
    url: 'https://music.163.com/api/toplist',
    parser: 'netease-toplist',
    description: '63 个官方榜单入口，含播放量与更新时间',
  },
  {
    code: 'netease-rising',
    name: '网易云 飙升榜',
    type: 'rest',
    url: 'https://music.163.com/api/playlist/detail?id=19723756',
    parser: 'netease-playlist',
    description: '飙升榜曲目详情（榜单 id 以 /api/toplist 为准）',
  },
  {
    code: 'netease-new-songs',
    name: '网易云 新歌榜',
    type: 'rest',
    url: 'https://music.163.com/api/playlist/detail?id=3778678',
    parser: 'netease-playlist',
    description: '新歌榜曲目详情',
  },
  {
    code: 'musicbrainz-artists',
    name: 'MusicBrainz 热门艺人',
    type: 'rest',
    url: 'https://musicbrainz.org/ws/2/artist?query=tag:pop&fmt=json&limit=10',
    headers: { 'User-Agent': 'AINewsHub/1.0 (https://github.com/ai-hot-news-hub)' },
    parser: 'musicbrainz',
    description: '开放音乐数据库 tag:pop 艺人，需自定义 UA，1 req/s',
  },

  // ===== 游戏 =====
  {
    code: 'steam-featured',
    name: 'Steam 特惠推荐',
    type: 'rest',
    url: 'https://store.steampowered.com/api/featured/',
    parser: 'steam-featured',
    description: '首页精选/特惠，含折扣与价格',
  },
  {
    code: 'epic-free',
    name: 'Epic 限免游戏',
    type: 'rest',
    url: 'https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=en-US&country=US',
    parser: 'epic-free',
    description: '限免/即将限免游戏（promotions 非空条目）',
  },
  {
    code: 'steamspy-top',
    name: 'SteamSpy 两周热玩',
    type: 'rest',
    url: 'https://steamspy.com/api.php?request=top100in2weeks',
    parser: 'steamspy',
    description: '按两周活跃玩家 Top20，含厂商/价格/在线数',
  },

  // ===== 体育 =====
  {
    code: 'thesportsdb-day',
    name: 'TheSportsDB 今日赛事',
    type: 'rest',
    url: 'https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=2026-09-23',
    parser: 'thesportsdb',
    description: '每日赛事列表（测试 key 3），抓取时自动改写为当天日期',
  },

  // ===== 财经 / 行情 =====
  {
    code: 'sina-hq-sh',
    name: '新浪行情·上证指数',
    type: 'rest',
    url: 'https://hq.sinajs.cn/list=sh000001',
    headers: { Referer: 'https://finance.sina.com.cn/' },
    parser: 'sina-hq',
    description: '实时指数行情，GBK 编码 + Referer 必需，按日去重',
  },
  {
    code: 'eastmoney-gainers',
    name: '东方财富 A股涨幅榜',
    type: 'rest',
    url: 'https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=10&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23&fields=f2,f12,f14,f3',
    parser: 'eastmoney',
    description: 'A 股涨幅榜 Top10，含代码/名称/涨幅',
  },

  // ===== 加密行情 =====
  {
    code: 'coingecko-markets',
    name: 'CoinGecko 币价榜',
    type: 'rest',
    url: 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10',
    parser: 'coingecko',
    description: '市值 Top10 币价，匿名可用',
  },
  {
    code: 'okx-tickers',
    name: 'OKX 现货行情',
    type: 'rest',
    url: 'https://www.okx.com/api/v5/market/tickers?instType=SPOT',
    parser: 'okx',
    description: '全现货 24h 行情按成交额取 Top5',
  },

  // ===== 图书 / 阅读 =====
  {
    code: 'openlibrary-scifi',
    name: 'Open Library 科幻书目',
    type: 'rest',
    url: 'https://openlibrary.org/subjects/scifi.json',
    parser: 'openlibrary',
    description: '主题书目（封面/作者/标签）',
  },
]

const byCode = new Map(builtinApiSources.map((s) => [s.code, s]))
const byUrl = new Map(builtinApiSources.map((s) => [s.url, s]))

export function getBuiltinApiSource(code: string): ApiSourceDef | undefined {
  return byCode.get(code)
}

export function getBuiltinApiSourceByUrl(url: string): ApiSourceDef | undefined {
  return byUrl.get(url)
}

export const builtinApiSourceCodes: string[] = builtinApiSources.map((s) => s.code)
