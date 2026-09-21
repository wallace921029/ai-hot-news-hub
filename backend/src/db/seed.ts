import { db } from './index.js'
import { dataSources, newsCategories } from './schema.js'
import { eq } from 'drizzle-orm'

const defaultSources = [
  // 国内社交/资讯平台
  {
    name: '知乎热榜',
    type: 'rest' as const,
    url: 'https://api.zhihu.com/topstory/hot-list?limit=50&reverse_order=0',
    method: 'GET' as const,
    parser: 'zhihu',
    enabled: true,
    fetchInterval: 30,
    description: '返回 50 条热榜，含标题、热度、URL',
  },
  {
    name: '微博热搜',
    type: 'rest' as const,
    url: 'https://weibo.com/ajax/side/hotSearch',
    method: 'GET' as const,
    headers: JSON.stringify({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Referer: 'https://weibo.com/',
    }),
    parser: 'weibo',
    enabled: true,
    fetchInterval: 30,
    description: '返回 50 条热搜，含关键词、热度、标签',
  },
  {
    name: 'B站热搜',
    type: 'rest' as const,
    url: 'https://api.bilibili.com/x/web-interface/search/square?limit=30',
    method: 'GET' as const,
    parser: 'bilibili',
    enabled: true,
    fetchInterval: 30,
    description: '返回热搜关键词及热度分数',
  },
  {
    name: '今日头条热榜',
    type: 'rest' as const,
    url: 'https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc',
    method: 'GET' as const,
    parser: 'toutiao',
    enabled: true,
    fetchInterval: 30,
    description: '返回热榜列表，含标题、URL、热度、分类',
  },
  {
    name: '知乎日报',
    type: 'rest' as const,
    url: 'https://news-at.zhihu.com/api/4/news/latest',
    method: 'GET' as const,
    parser: 'zhihu',
    enabled: true,
    fetchInterval: 60,
    description: '返回每日最新文章列表',
  },
  {
    name: '澎湃新闻',
    type: 'rest' as const,
    url: 'https://cache.thepaper.cn/contentapi/wwwIndex/rightSidebar',
    method: 'GET' as const,
    parser: 'thepaper',
    enabled: true,
    fetchInterval: 30,
    description: '返回侧边栏热门文章',
  },

  // 开发者/技术社区
  {
    name: '掘金推荐',
    type: 'rest' as const,
    url: 'https://api.juejin.cn/recommend_api/v1/article/recommend_all_feed',
    method: 'POST' as const,
    body: JSON.stringify({ cursor: '0', limit: 20 }),
    parser: 'juejin',
    enabled: true,
    fetchInterval: 30,
    description: '返回推荐文章',
  },
  {
    name: 'CSDN博客热榜',
    type: 'rest' as const,
    url: 'https://blog.csdn.net/phoenix/web/blog/hot-rank?page=0&pageSize=20&type=hot',
    method: 'GET' as const,
    parser: 'csdn',
    enabled: true,
    fetchInterval: 30,
    description: '返回热榜文章，含标题、阅读量、评论数',
  },
  {
    name: 'GitHub Trending',
    type: 'rest' as const,
    url: 'https://api.github.com/search/repositories?q=stars:>1000&sort=stars&order=desc&per_page=20',
    method: 'GET' as const,
    parser: 'github',
    enabled: true,
    fetchInterval: 60,
    description: '搜索热门仓库，含 star 数、描述等',
  },
  {
    name: 'Hugging Face 热门模型',
    type: 'rest' as const,
    url: 'https://huggingface.co/api/models?sort=likes&limit=20',
    method: 'GET' as const,
    parser: 'huggingface',
    enabled: true,
    fetchInterval: 60,
    description: '返回热门模型列表，含下载量、点赞数',
  },

  // AI/科技媒体
  {
    name: '机器之心',
    type: 'rest' as const,
    url: 'https://www.jiqizhixin.com/api/v1/articles?page=1&per_page=20',
    method: 'GET' as const,
    parser: 'jiqizhixin',
    enabled: true,
    fetchInterval: 30,
    description: '返回 AI/ML 文章列表',
  },
  {
    name: '量子位 RSS',
    type: 'rss' as const,
    url: 'https://www.qbitai.com/feed',
    parser: 'qbitai',
    enabled: true,
    fetchInterval: 60,
    description: 'RSS 格式，返回最新 AI 资讯',
  },
  {
    name: 'Google AI Blog RSS',
    type: 'rss' as const,
    url: 'https://blog.google/technology/ai/rss/',
    parser: 'google-ai',
    enabled: true,
    fetchInterval: 120,
    description: 'RSS 格式',
  },
  {
    name: 'MIT Technology Review RSS',
    type: 'rss' as const,
    url: 'https://www.technologyreview.com/feed/',
    parser: 'mit-tech',
    enabled: true,
    fetchInterval: 120,
    description: 'RSS 格式',
  },
  {
    name: '超神经',
    type: 'html' as const,
    url: 'https://hyper.ai/api/v1/articles?page=1&limit=20',
    parser: 'hyperai',
    enabled: true,
    fetchInterval: 60,
    description: '返回 HTML，需解析',
  },

  // 其他平台
  {
    name: '36氪热榜',
    type: 'rest' as const,
    url: 'https://gateway.36kr.com/api/mis/nav/home/nav/rank/hot',
    method: 'POST' as const,
    body: JSON.stringify({ partner_id: 'wap', param: { siteId: 1, platformId: 2 } }),
    parser: '36kr',
    enabled: true,
    fetchInterval: 30,
    description: '返回热榜文章',
  },
  {
    name: '百度热搜',
    type: 'html' as const,
    url: 'https://top.baidu.com/board?tab=realtime',
    parser: 'baidu',
    enabled: true,
    fetchInterval: 30,
    description: '返回 HTML，需解析 word 字段',
  },
  {
    name: '豆瓣热门电影',
    type: 'rest' as const,
    url: 'https://movie.douban.com/j/search_subjects?type=movie&tag=热门&page_limit=20&page_start=0',
    method: 'GET' as const,
    parser: 'douban',
    enabled: true,
    fetchInterval: 60,
    description: '返回热门电影列表',
  },
  {
    name: 'IT之家',
    type: 'html' as const,
    url: 'https://api.ithome.com/xml/newslist/news.xml',
    parser: 'ithome',
    enabled: true,
    fetchInterval: 30,
    description: 'XML 格式新闻列表',
  },
  {
    name: '少数派热榜',
    type: 'rest' as const,
    url: 'https://sspai.com/api/v1/article/tag/info/get?limit=20&offset=0&tag=hot',
    method: 'GET' as const,
    parser: 'sspai',
    enabled: true,
    fetchInterval: 30,
    description: '返回热榜文章',
  },
  {
    name: '微信读书飙升榜',
    type: 'rest' as const,
    url: 'https://weread.qq.com/web/category/rising',
    method: 'GET' as const,
    parser: 'weread',
    enabled: true,
    fetchInterval: 60,
    description: '返回飙升榜',
  },

  // 新增数据源
  {
    name: 'Hacker News',
    type: 'rss' as const,
    url: 'https://news.ycombinator.com/rss',
    parser: 'hackernews',
    enabled: true,
    fetchInterval: 30,
    description: '全球最热门的技术新闻和创业资讯',
  },
  {
    name: 'V2EX 热门',
    type: 'rest' as const,
    url: 'https://www.v2ex.com/api/topics/hot.json',
    method: 'GET' as const,
    parser: 'v2ex',
    enabled: true,
    fetchInterval: 30,
    description: 'V2EX 开发者社区热门话题',
  },
]

export async function seedDataSources() {
  console.log('🌱 初始化数据源...')

  for (const source of defaultSources) {
    try {
      // 检查是否已存在
      const existing = await db
        .select()
        .from(dataSources)
        .where(eq(dataSources.url, source.url))
        .limit(1)

      if (existing.length === 0) {
        await db.insert(dataSources).values(source)
        console.log(`  ✅ 添加: ${source.name}`)
      } else {
        console.log(`  ⏭️  跳过: ${source.name} (已存在)`)
      }
    } catch (error) {
      console.error(`  ❌ 失败: ${source.name} - ${error}`)
    }
  }

  console.log('✅ 数据源初始化完成')
}

// 标准咨询类别
const defaultCategories = [
  {
    name: '人工智能',
    description: 'AI、机器学习、深度学习、大模型等相关资讯',
    icon: 'Brain',
    sortOrder: 1,
  },
  {
    name: '前端开发',
    description: 'Web前端、移动端UI、CSS、JavaScript框架等',
    icon: 'Layout',
    sortOrder: 2,
  },
  {
    name: '后端开发',
    description: '服务器端开发、数据库、API、微服务等',
    icon: 'Server',
    sortOrder: 3,
  },
  { name: '移动开发', description: 'iOS、Android、跨平台开发等', icon: 'Smartphone', sortOrder: 4 },
  {
    name: '云计算与DevOps',
    description: '云服务、容器、CI/CD、运维等',
    icon: 'Cloud',
    sortOrder: 5,
  },
  { name: '数据科学', description: '数据分析、数据工程、BI等', icon: 'BarChart', sortOrder: 6 },
  { name: '网络安全', description: '信息安全、隐私保护、漏洞等', icon: 'Shield', sortOrder: 7 },
  {
    name: '区块链与Web3',
    description: '加密货币、DeFi、NFT、去中心化等',
    icon: 'Link',
    sortOrder: 8,
  },
  {
    name: '创业与融资',
    description: '创业公司、投资融资、商业模式等',
    icon: 'Rocket',
    sortOrder: 9,
  },
  { name: '科技数码', description: '电子产品、硬件、消费科技等', icon: 'Cpu', sortOrder: 10 },
  { name: '游戏', description: '游戏行业、游戏开发、电竞等', icon: 'Gamepad', sortOrder: 11 },
  {
    name: '设计创意',
    description: 'UI/UX设计、创意工具、视觉艺术等',
    icon: 'Palette',
    sortOrder: 12,
  },
  {
    name: '开源项目',
    description: '开源软件、GitHub项目、社区动态等',
    icon: 'Github',
    sortOrder: 13,
  },
  {
    name: '职场与招聘',
    description: '求职、面试、职业发展、行业薪资等',
    icon: 'Briefcase',
    sortOrder: 14,
  },
  { name: '社会民生', description: '社会新闻、民生热点、政策法规等', icon: 'Users', sortOrder: 15 },
  { name: '财经金融', description: '股市、理财、经济动态等', icon: 'DollarSign', sortOrder: 16 },
  { name: '娱乐八卦', description: '明星、影视、综艺等', icon: 'Star', sortOrder: 17 },
  { name: '体育竞技', description: '体育赛事、运动健身等', icon: 'Trophy', sortOrder: 18 },
  {
    name: '教育学习',
    description: '在线教育、学习资源、考试等',
    icon: 'GraduationCap',
    sortOrder: 19,
  },
  { name: '科学探索', description: '自然科学、太空探索、医学研究等', icon: 'Atom', sortOrder: 20 },
  { name: '汽车出行', description: '新能源汽车、自动驾驶、出行服务等', icon: 'Car', sortOrder: 21 },
  {
    name: '生活消费',
    description: '美食、旅游、购物、生活方式等',
    icon: 'ShoppingBag',
    sortOrder: 22,
  },
]

export async function seedCategories() {
  console.log('🌱 初始化咨询类别...')

  for (const category of defaultCategories) {
    try {
      const existing = await db
        .select()
        .from(newsCategories)
        .where(eq(newsCategories.name, category.name))
        .limit(1)

      if (existing.length === 0) {
        await db.insert(newsCategories).values(category)
        console.log(`  ✅ 添加: ${category.name}`)
      } else {
        console.log(`  ⏭️  跳过: ${category.name} (已存在)`)
      }
    } catch (error) {
      console.error(`  ❌ 失败: ${category.name} - ${error}`)
    }
  }

  console.log('✅ 咨询类别初始化完成')
}

async function main() {
  await seedDataSources()
  await seedCategories()
  process.exit(0)
}

main()
