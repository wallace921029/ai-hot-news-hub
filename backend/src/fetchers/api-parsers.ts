import Parser from 'rss-parser'
import type { PlatformParser, RawNewsItem } from './types.js'
import { proxyFetch } from '../utils/http.js'

const atomParser = new Parser()

function today(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function stripHtml(text?: string | null): string {
  return (text ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function requireArray<T>(value: unknown, label: string): T[] {
  if (!Array.isArray(value)) throw new Error(`${label} 返回结构异常（非数组）`)
  return value as T[]
}

const WMO_CODE: Record<number, string> = {
  0: '晴',
  1: '基本晴',
  2: '多云',
  3: '阴',
  45: '雾',
  48: '雾凇',
  51: '毛毛雨',
  53: '毛毛雨',
  55: '毛毛雨',
  61: '小雨',
  63: '中雨',
  65: '大雨',
  71: '小雪',
  73: '中雪',
  75: '大雪',
  80: '阵雨',
  81: '阵雨',
  82: '强阵雨',
  95: '雷雨',
  96: '雷雨冰雹',
  99: '雷雨冰雹',
}

// ===== 热榜聚合 =====
const uapisHotboard: PlatformParser = {
  parse(data, source) {
    const d = data as {
      type?: string
      list?: Array<{ index: number; title: string; hot_value?: string; url: string }>
    }
    const list = requireArray<{ index: number; title: string; hot_value?: string; url: string }>(
      d.list,
      'uapis hotboard'
    )
    const platform = d.type || 'hotboard'
    return list.map((item) => ({
      sourceId: source.id,
      platform,
      title: item.title,
      url: item.url,
      hotScore: item.hot_value ? Number(item.hot_value) || undefined : undefined,
      metadata: { rank: item.index },
      fetchedAt: new Date(),
    }))
  },
}

// ===== 科技 / 开发者 =====
const hnFirebase: PlatformParser = {
  async parse(data, source) {
    const ids = requireArray<number>(data, 'hacker-news topstories').slice(0, 12)
    const details = await Promise.all(
      ids.map(async (id) => {
        const res = await proxyFetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
        if (!res.ok) return null
        return (await res.json()) as {
          type?: string
          title?: string
          url?: string
          by?: string
          time?: number
          score?: number
          descendants?: number
          id?: number
        }
      })
    )

    const items: RawNewsItem[] = []
    for (const item of details) {
      if (!item || item.type !== 'story' || !item.title || item.id == null) continue
      items.push({
        sourceId: source.id,
        platform: 'hackernews',
        title: item.title,
        url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
        author: item.by,
        publishedAt: item.time ? new Date(item.time * 1000) : undefined,
        hotScore: item.score,
        description: item.descendants != null ? `${item.descendants} 条评论` : undefined,
        fetchedAt: new Date(),
      })
    }
    return items
  },
}

const lobsters: PlatformParser = {
  parse(data, source) {
    const list = requireArray(data, 'lobsters') as Array<{
      title: string
      url?: string
      short_id: string
      short_id_url: string
      score?: number
      description?: string
      created_at?: string
      comment_count?: number
      submitter_user?: { username?: string }
    }>
    return list.map((item) => ({
      sourceId: source.id,
      platform: 'lobsters',
      title: item.title,
      url: item.url || item.short_id_url || `https://lobste.rs/s/${item.short_id}`,
      author: item.submitter_user?.username,
      publishedAt: item.created_at ? new Date(item.created_at) : undefined,
      hotScore: item.score,
      description:
        item.description ||
        (item.comment_count != null ? `${item.comment_count} 条评论` : undefined),
      fetchedAt: new Date(),
    }))
  },
}

const devto: PlatformParser = {
  parse(data, source) {
    const list = requireArray(data, 'dev.to') as Array<{
      title: string
      url: string
      description?: string
      positive_reactions_count?: number
      published_at?: string
      reading_time_minutes?: number
      tag_list?: string[]
      user?: { username?: string }
    }>
    return list.map((item) => ({
      sourceId: source.id,
      platform: 'devto',
      title: item.title,
      url: item.url,
      author: item.user?.username,
      publishedAt: item.published_at ? new Date(item.published_at) : undefined,
      hotScore: item.positive_reactions_count,
      description:
        [item.description, item.tag_list?.length ? `#${item.tag_list.join(' #')}` : '']
          .filter(Boolean)
          .join(' ')
          .slice(0, 300) || undefined,
      fetchedAt: new Date(),
    }))
  },
}

const arxiv: PlatformParser = {
  responseType: 'text',
  async parse(data, source) {
    const feed = await atomParser.parseString(String(data))
    const entries = feed.items || []
    return entries.map((entry) => ({
      sourceId: source.id,
      platform: 'arxiv',
      title: stripHtml(entry.title).slice(0, 200),
      url: entry.link || entry.guid || '',
      author: entry.creator || entry.author,
      publishedAt: entry.isoDate
        ? new Date(entry.isoDate)
        : entry.published
          ? new Date(entry.published)
          : undefined,
      description: stripHtml(entry.content || entry.summary).slice(0, 300) || undefined,
      fetchedAt: new Date(),
    }))
  },
}

// ===== AI =====
const openrouter: PlatformParser = {
  parse(data, source) {
    const d = data as {
      data?: Array<{
        id: string
        name?: string
        context_length?: number
        pricing?: { prompt?: string; completion?: string }
        created?: number
      }>
    }
    const list = requireArray<{
      id: string
      name?: string
      context_length?: number
      pricing?: { prompt?: string; completion?: string }
      created?: number
    }>(d.data, 'openrouter')
    return [...list]
      .sort((a, b) => (b.created || 0) - (a.created || 0))
      .slice(0, 30)
      .map((model) => ({
        sourceId: source.id,
        platform: 'openrouter',
        title: model.name || model.id,
        url: `https://openrouter.ai/${model.id}`,
        publishedAt: model.created ? new Date(model.created * 1000) : undefined,
        description:
          [
            model.context_length ? `上下文 ${model.context_length}` : '',
            model.pricing?.prompt
              ? `输入 $${(Number(model.pricing.prompt) * 1e6).toFixed(2)}/M · 输出 $${(Number(model.pricing.completion || 0) * 1e6).toFixed(2)}/M`
              : '',
          ]
            .filter(Boolean)
            .join(' · ') || undefined,
        metadata: { model_id: model.id },
        fetchedAt: new Date(),
      }))
  },
}

// ===== 电影 / 影视 =====
const doubanRexxar: PlatformParser = {
  parse(data, source) {
    const d = data as {
      subject_collection_items?: Array<{
        id: string
        title: string
        card_subtitle?: string
        rating?: { value?: number; count?: number }
        cover?: { url?: string }
      }>
    }
    const list = requireArray<{
      id: string
      title: string
      card_subtitle?: string
      rating?: { value?: number; count?: number }
      cover?: { url?: string }
    }>(d.subject_collection_items, 'douban rexxar')
    return list.map((item) => ({
      sourceId: source.id,
      platform: 'douban',
      title: item.title,
      url: `https://movie.douban.com/subject/${item.id}/`,
      hotScore: item.rating?.value,
      description: item.card_subtitle,
      metadata: {
        cover: item.cover?.url,
        rating_count: item.rating?.count,
      },
      fetchedAt: new Date(),
    }))
  },
}

const tvmazeSchedule: PlatformParser = {
  prepareUrl(url) {
    return url.replace(/date=\d{4}-\d{2}-\d{2}/, `date=${today()}`)
  },
  parse(data, source) {
    const list = requireArray(data, 'tvmaze schedule') as Array<{
      name?: string
      url: string
      season?: number
      number?: number
      airdate?: string
      airtime?: string
      airstamp?: string
      summary?: string
      show?: { name?: string; url?: string }
    }>
    return list.map((episode) => {
      const showName = episode.show?.name || '未知剧集'
      const code =
        episode.season != null && episode.number != null
          ? ` S${episode.season}E${String(episode.number).padStart(2, '0')}`
          : ''
      return {
        sourceId: source.id,
        platform: 'tvmaze',
        title:
          `${showName}${code} · ${episode.airdate || ''} ${episode.airtime || ''} ${episode.name || ''}`.trim(),
        url: episode.url,
        publishedAt: episode.airstamp ? new Date(episode.airstamp) : undefined,
        description: stripHtml(episode.summary).slice(0, 200) || undefined,
        metadata: { show: showName, show_url: episode.show?.url },
        fetchedAt: new Date(),
      }
    })
  },
}

const tvmazeSearch: PlatformParser = {
  parse(data, source) {
    const show = data as {
      name?: string
      url?: string
      summary?: string
      premiered?: string
      status?: string
      rating?: { average?: number }
      genres?: string[]
    }
    if (!show?.name || !show.url) throw new Error('tvmaze search 返回结构异常')
    return [
      {
        sourceId: source.id,
        platform: 'tvmaze',
        title: show.name,
        url: show.url,
        hotScore: show.rating?.average,
        description: [show.status, show.premiered, show.genres?.join('/')]
          .filter(Boolean)
          .join(' · ')
          .concat(show.summary ? ` — ${stripHtml(show.summary).slice(0, 160)}` : ''),
        fetchedAt: new Date(),
      },
    ]
  },
}

// ===== 新闻 =====
const sinaZhibo: PlatformParser = {
  parse(data, source) {
    const d = data as {
      result?: {
        data?: {
          feed?: {
            list?: Array<{
              id: number
              zhibo_id?: number
              rich_text?: string
              create_time?: string
              docurl?: string
              like_nums?: number
            }>
          }
        }
      }
    }
    const list = requireArray<{
      id: number
      zhibo_id?: number
      rich_text?: string
      create_time?: string
      docurl?: string
      like_nums?: number
    }>(d.result?.data?.feed?.list, 'sina zhibo')
    return list.map((item) => {
      const text = stripHtml(item.rich_text)
      return {
        sourceId: source.id,
        platform: 'sina',
        title: text.length > 100 ? `${text.slice(0, 100)}…` : text,
        url:
          item.docurl ||
          `https://zhibo.sina.com.cn/zhibo/feed?zhibo_id=${item.zhibo_id ?? 152}&page=1#${item.id}`,
        publishedAt: item.create_time ? new Date(item.create_time.replace(' ', 'T')) : undefined,
        hotScore: item.like_nums ? Number(item.like_nums) || undefined : undefined,
        metadata: { zhibo_id: item.zhibo_id },
        fetchedAt: new Date(),
      }
    })
  },
}

// ===== 音乐 =====
const neteaseToplist: PlatformParser = {
  parse(data, source) {
    const d = data as {
      list?: Array<{
        id: number
        name?: string
        updateFrequency?: string
        updateTime?: number
        coverImgUrl?: string
        playCount?: number
      }>
    }
    const list = requireArray<{
      id: number
      name?: string
      updateFrequency?: string
      updateTime?: number
      coverImgUrl?: string
      playCount?: number
    }>(d.list, 'netease toplist')
    return list.map((board) => ({
      sourceId: source.id,
      platform: 'netease',
      title: board.name || `榜单 ${board.id}`,
      url: `https://music.163.com/#/discover/toplist?id=${board.id}`,
      publishedAt: board.updateTime ? new Date(board.updateTime) : undefined,
      hotScore: board.playCount,
      description:
        [board.updateFrequency, board.coverImgUrl ? '含封面' : ''].filter(Boolean).join(' · ') ||
        undefined,
      metadata: { playlist_id: board.id },
      fetchedAt: new Date(),
    }))
  },
}

const neteasePlaylist: PlatformParser = {
  parse(data, source) {
    const d = data as {
      code?: number
      result?: {
        tracks?: Array<{
          id: number
          name?: string
          artists?: Array<{ name?: string }>
          album?: { name?: string }
          al?: { name?: string }
          duration?: number
        }>
      }
      playlist?: {
        tracks?: Array<{
          id: number
          name?: string
          artists?: Array<{ name?: string }>
          album?: { name?: string }
          al?: { name?: string }
          duration?: number
        }>
      }
    }
    if (d.code != null && d.code !== 200) throw new Error(`netease playlist 错误码 ${d.code}`)
    const tracks = d.result?.tracks || d.playlist?.tracks
    const list = requireArray<{
      id: number
      name?: string
      artists?: Array<{ name?: string }>
      album?: { name?: string }
      al?: { name?: string }
      duration?: number
    }>(tracks, 'netease playlist tracks')
    return list.map((track) => {
      const artists = (track.artists || [])
        .map((a) => a.name)
        .filter(Boolean)
        .join(' / ')
      return {
        sourceId: source.id,
        platform: 'netease',
        title: artists ? `${track.name} - ${artists}` : track.name || `歌曲 ${track.id}`,
        url: `https://music.163.com/#/song?id=${track.id}`,
        description: track.album?.name || track.al?.name,
        fetchedAt: new Date(),
      }
    })
  },
}

const musicbrainz: PlatformParser = {
  parse(data, source) {
    const d = data as {
      artists?: Array<{
        id: string
        name?: string
        type?: string
        disambiguation?: string
        score?: number
        area?: { name?: string }
      }>
    }
    const list = requireArray<{
      id: string
      name?: string
      type?: string
      disambiguation?: string
      score?: number
      area?: { name?: string }
    }>(d.artists, 'musicbrainz')
    return list.map((artist) => ({
      sourceId: source.id,
      platform: 'musicbrainz',
      title: artist.name || artist.id,
      url: `https://musicbrainz.org/artist/${artist.id}`,
      hotScore: artist.score,
      description:
        [artist.type, artist.area?.name, artist.disambiguation].filter(Boolean).join(' · ') ||
        undefined,
      fetchedAt: new Date(),
    }))
  },
}

// ===== 游戏 =====
const steamFeatured: PlatformParser = {
  parse(data, source) {
    const d = data as {
      featured_win?: Array<{
        id: number
        name?: string
        discounted?: boolean
        discount_percent?: number
        original_price?: number
        final_price?: number
        currency?: string
      }>
    }
    const list = requireArray<{
      id: number
      name?: string
      discounted?: boolean
      discount_percent?: number
      original_price?: number
      final_price?: number
      currency?: string
    }>(d.featured_win, 'steam featured')
    return list.map((game) => {
      const price = (cents?: number) =>
        cents != null && cents > 0
          ? `${(cents / 100).toFixed(2)} ${game.currency || 'USD'}`
          : '免费'
      return {
        sourceId: source.id,
        platform: 'steam',
        title: game.name || `App ${game.id}`,
        url: `https://store.steampowered.com/app/${game.id}`,
        hotScore: game.discount_percent || undefined,
        description: game.discounted
          ? `特惠 ${game.discount_percent}% OFF：${price(game.final_price)}（原价 ${price(game.original_price)}）`
          : price(game.final_price),
        metadata: { appid: game.id },
        fetchedAt: new Date(),
      }
    })
  },
}

interface EpicElement {
  title?: string
  id?: string
  productSlug?: string | null
  urlSlug?: string | null
  offerMappings?: Array<{ pageSlug?: string }> | null
  promotions?: {
    promotionalOffers?: unknown[]
    upcomingPromotionalOffers?: unknown[]
  } | null
  price?: {
    totalPrice?: {
      originalPrice?: number
      discountPrice?: number
      currencyCode?: string
      fmtPrice?: { originalPrice?: string; discountPrice?: string }
    }
  }
}

const epicFree: PlatformParser = {
  parse(data, source) {
    const d = data as {
      data?: { Catalog?: { searchStore?: { elements?: EpicElement[] } } }
    }
    const elements = requireArray<EpicElement>(
      d.data?.Catalog?.searchStore?.elements,
      'epic free games'
    )
    const withPromo = elements.filter((el) => el.promotions != null)
    const list = withPromo.length > 0 ? withPromo : elements

    return list.map((game) => {
      const ongoing = (game.promotions?.promotionalOffers?.length ?? 0) > 0
      const upcoming = (game.promotions?.upcomingPromotionalOffers?.length ?? 0) > 0
      const slug =
        game.offerMappings?.[0]?.pageSlug ||
        (game.productSlug ? game.productSlug.replace(/\/home$/, '') : '') ||
        null
      const fmt = game.price?.totalPrice
      return {
        sourceId: source.id,
        platform: 'epic',
        title: `${game.title || '未知游戏'}${ongoing ? '（限免中）' : upcoming ? '（即将限免）' : ''}`,
        url: slug
          ? `https://store.epicgames.com/p/${slug}`
          : `https://store.epicgames.com/free-games#${game.id}`,
        description: fmt?.fmtPrice?.originalPrice
          ? ongoing || upcoming
            ? `${fmt.fmtPrice.originalPrice} → ${fmt.fmtPrice.discountPrice} · ${ongoing ? '限免中' : '即将限免'}`
            : `${fmt.fmtPrice.originalPrice}（关注中）`
          : undefined,
        metadata: {
          offer_id: game.id,
          status: ongoing ? 'free_now' : upcoming ? 'upcoming' : 'watching',
        },
        fetchedAt: new Date(),
      }
    })
  },
}

const steamspy: PlatformParser = {
  parse(data, source) {
    if (typeof data !== 'object' || data === null) throw new Error('steamspy 返回结构异常')
    const list = Object.values(
      data as Record<
        string,
        {
          appid?: number
          name?: string
          developer?: string
          price?: string | number
          ccu?: number
          players_2weeks?: number | null
        }
      >
    )
      .filter((game) => game && game.appid != null)
      .sort(
        (a, b) => (b.players_2weeks || 0) - (a.players_2weeks || 0) || (b.ccu || 0) - (a.ccu || 0)
      )
      .slice(0, 20)

    return list.map((game) => {
      const price = Number(game.price)
      return {
        sourceId: source.id,
        platform: 'steam',
        title: game.name || `App ${game.appid}`,
        url: `https://store.steampowered.com/app/${game.appid}`,
        hotScore: game.players_2weeks ?? game.ccu ?? undefined,
        description:
          [
            game.developer,
            price > 0 ? `$${(price / 100).toFixed(2)}` : price === 0 ? '免费' : '',
            game.players_2weeks != null ? `两周玩家 ${game.players_2weeks}` : '',
            game.ccu != null ? `在线 ${game.ccu}` : '',
          ]
            .filter(Boolean)
            .join(' · ') || undefined,
        metadata: { appid: game.appid },
        fetchedAt: new Date(),
      }
    })
  },
}

// ===== 体育 =====
const espnScoreboard: PlatformParser = {
  parse(data, source) {
    const d = data as {
      events?: Array<{
        id?: string
        name?: string
        date?: string
        competitions?: Array<{
          competitors?: Array<{
            homeAway?: string
            score?: string
            team?: { displayName?: string; abbreviation?: string }
          }>
        }>
      }>
    }
    const list = Array.isArray(d.events) ? d.events : []
    return list
      .filter((event) => event.id && event.name)
      .map((event) => {
        const competitors = event.competitions?.[0]?.competitors || []
        const scoreLine = competitors
          .map((c) => `${c.team?.abbreviation || c.team?.displayName || '?'} ${c.score ?? '-'}`)
          .join(' · ')
        return {
          sourceId: source.id,
          platform: 'espn',
          title: event.name as string,
          url: `https://www.espn.com/game/_/gameId/${event.id}`,
          publishedAt: event.date ? new Date(event.date) : undefined,
          description: scoreLine || undefined,
          metadata: { event_id: event.id },
          fetchedAt: new Date(),
        }
      })
  },
}

const thesportsdb: PlatformParser = {
  prepareUrl(url) {
    return url.replace(/d=\d{4}-\d{2}-\d{2}/, `d=${today()}`)
  },
  parse(data, source) {
    const d = data as {
      events?: Array<{
        idEvent?: string
        strEvent?: string
        dateEvent?: string
        strTime?: string
        strLeague?: string
        strThumb?: string
        strVenue?: string
      }> | null
    }
    const list = Array.isArray(d.events) ? d.events : []
    return list
      .filter((event) => event.idEvent && event.strEvent)
      .map((event) => ({
        sourceId: source.id,
        platform: 'thesportsdb',
        title: `${event.strEvent} · ${event.dateEvent || ''} ${event.strTime || ''}`.trim(),
        url: `https://www.thesportsdb.com/event/${event.idEvent}`,
        description: [event.strLeague, event.strVenue].filter(Boolean).join(' · ') || undefined,
        metadata: { event_id: event.idEvent, thumb: event.strThumb },
        fetchedAt: new Date(),
      }))
  },
}

// ===== 财经 =====
const sinaHq: PlatformParser = {
  responseType: 'text',
  charset: 'gbk',
  parse(data, source) {
    const match = String(data).match(/hq_str_(\w+)="([^"]*)"/)
    if (!match) throw new Error('新浪行情返回无法解析')
    const fields = match[2].split(',')
    const name = fields[0]
    const current = parseFloat(fields[3])
    const prevClose = parseFloat(fields[2])
    if (!name || Number.isNaN(current)) throw new Error('新浪行情字段解析失败')
    const pct = prevClose ? ((current - prevClose) / prevClose) * 100 : 0
    const sign = pct >= 0 ? '+' : ''
    const date = fields[30] || today()

    return [
      {
        sourceId: source.id,
        platform: 'sina-finance',
        title: `${name} ${date} · ${current.toFixed(2)} (${sign}${pct.toFixed(2)}%)`,
        url: `${source.url}#${date}`,
        description: `开盘 ${fields[1]} · 最高 ${fields[4]} · 最低 ${fields[5]} · 昨收 ${fields[2]}`,
        metadata: { code: match[1], date },
        fetchedAt: new Date(),
      },
    ]
  },
}

const eastmoney: PlatformParser = {
  parse(data, source) {
    const d = data as {
      data?: {
        diff?: Array<{ f2?: number; f3?: number; f12?: string; f14?: string }>
      }
    }
    const list = requireArray<{ f2?: number; f3?: number; f12?: string; f14?: string }>(
      d.data?.diff,
      'eastmoney clist'
    )
    return list
      .filter((row) => row.f12 && row.f14)
      .map((row) => {
        const code = row.f12 as string
        const prefix = code.startsWith('6')
          ? 'sh'
          : code.startsWith('8') || code.startsWith('4')
            ? 'bj'
            : 'sz'
        const pct = row.f3 ?? 0
        const sign = pct >= 0 ? '+' : ''
        return {
          sourceId: source.id,
          platform: 'eastmoney',
          title: `${row.f14} ${code} · ${row.f2} (${sign}${pct}%)`,
          url: `https://quote.eastmoney.com/${prefix}${code}.html`,
          hotScore: pct,
          metadata: { code, market: prefix },
          fetchedAt: new Date(),
        }
      })
  },
}

// ===== 加密行情 =====
const coingecko: PlatformParser = {
  parse(data, source) {
    const list = requireArray(data, 'coingecko markets') as Array<{
      id?: string
      symbol?: string
      name?: string
      current_price?: number
      market_cap?: number
      price_change_percentage_24h?: number
    }>
    return list.map((coin) => {
      const change = coin.price_change_percentage_24h ?? 0
      const sign = change >= 0 ? '+' : ''
      return {
        sourceId: source.id,
        platform: 'coingecko',
        title: `${coin.name}${coin.symbol ? ` (${coin.symbol.toUpperCase()})` : ''} · $${coin.current_price ?? '-'}`,
        url: `https://www.coingecko.com/en/coins/${coin.id}`,
        hotScore: coin.market_cap,
        description: `24h ${sign}${(change ?? 0).toFixed(2)}%`,
        metadata: { coin_id: coin.id },
        fetchedAt: new Date(),
      }
    })
  },
}

const okx: PlatformParser = {
  parse(data, source) {
    const d = data as {
      code?: string | number
      data?: Array<{
        instId?: string
        last?: string
        open24h?: string
        volCcy24h?: string
        vol24h?: string
      }>
    }
    if (d.code != null && String(d.code) !== '0') throw new Error(`OKX 错误码 ${d.code}`)
    const list = requireArray<{
      instId?: string
      last?: string
      open24h?: string
      volCcy24h?: string
      vol24h?: string
    }>(d.data, 'okx tickers')
    return [...list]
      .sort((a, b) => Number(b.volCcy24h || 0) - Number(a.volCcy24h || 0))
      .slice(0, 5)
      .map((ticker) => {
        const last = Number(ticker.last || 0)
        const open = Number(ticker.open24h || 0)
        const change = open ? ((last - open) / open) * 100 : 0
        const sign = change >= 0 ? '+' : ''
        return {
          sourceId: source.id,
          platform: 'okx',
          title: `${ticker.instId} · ${ticker.last} (${sign}${change.toFixed(2)}%)`,
          url: `https://www.okx.com/trade-spot/${(ticker.instId || '').toLowerCase()}`,
          description: ticker.volCcy24h ? `24h 量 ${ticker.volCcy24h}` : undefined,
          metadata: { inst_id: ticker.instId },
          fetchedAt: new Date(),
        }
      })
  },
}

// ===== 天气 =====
const openmeteo: PlatformParser = {
  parse(data, source) {
    const d = data as {
      current?: {
        time?: string
        temperature_2m?: number
        weather_code?: number
      }
      daily?: {
        time?: string[]
        temperature_2m_max?: number[]
        temperature_2m_min?: number[]
      }
    }
    const cur = d.current
    if (!cur?.time || cur.temperature_2m == null) throw new Error('Open-Meteo 返回结构异常')
    const date = cur.time.slice(0, 10)
    const condition =
      cur.weather_code != null ? WMO_CODE[cur.weather_code] || `代码${cur.weather_code}` : ''
    const maxToday = d.daily?.temperature_2m_max?.[0]
    const minToday = d.daily?.temperature_2m_min?.[0]
    return [
      {
        sourceId: source.id,
        platform: 'weather',
        title: `上海天气·Open-Meteo ${date} ${cur.temperature_2m}°C ${condition}`.trim(),
        url: `${source.url}#${date}`,
        description:
          maxToday != null && minToday != null
            ? `今日最高 ${maxToday}° / 最低 ${minToday}°`
            : undefined,
        metadata: { date, weather_code: cur.weather_code },
        fetchedAt: new Date(),
      },
    ]
  },
}

// ===== 图书 =====
const openlibrary: PlatformParser = {
  parse(data, source) {
    const d = data as {
      works?: Array<{
        key?: string
        title?: string
        cover_id?: number
        authors?: Array<{ name?: string }>
        subjects?: string[]
      }>
    }
    const list = requireArray<{
      key?: string
      title?: string
      cover_id?: number
      authors?: Array<{ name?: string }>
      subjects?: string[]
    }>(d.works, 'openlibrary works')
    return list.map((work) => ({
      sourceId: source.id,
      platform: 'openlibrary',
      title: work.title || work.key || '未命名',
      url: work.key ? `https://openlibrary.org${work.key}` : '',
      author: work.authors
        ?.map((a) => a.name)
        .filter(Boolean)
        .slice(0, 3)
        .join(' / '),
      description: work.subjects?.slice(0, 5).join(' · '),
      metadata: work.cover_id
        ? { cover: `https://covers.openlibrary.org/b/id/${work.cover_id}-M.jpg` }
        : undefined,
      fetchedAt: new Date(),
    }))
  },
}

export const apiParsers: Record<string, PlatformParser> = {
  'uapis-hotboard': uapisHotboard,
  'hn-firebase': hnFirebase,
  lobsters,
  devto,
  arxiv,
  openrouter,
  'douban-rexxar': doubanRexxar,
  'tvmaze-schedule': tvmazeSchedule,
  'tvmaze-search': tvmazeSearch,
  'sina-zhibo': sinaZhibo,
  'netease-toplist': neteaseToplist,
  'netease-playlist': neteasePlaylist,
  musicbrainz,
  'steam-featured': steamFeatured,
  'epic-free': epicFree,
  steamspy,
  'espn-scoreboard': espnScoreboard,
  thesportsdb,
  'sina-hq': sinaHq,
  eastmoney,
  coingecko,
  okx,
  openmeteo,
  openlibrary,
}
