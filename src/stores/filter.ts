import { create } from 'zustand'

interface FilterState {
  sourceType: 'api' | 'rss' | 'topic'
  sourceId: number | null
  platform: string | null
  search: string
  page: number
  pageSize: number
  setSourceType: (sourceType: 'api' | 'rss' | 'topic') => void
  setSourceId: (sourceId: number | null) => void
  setPlatform: (platform: string | null) => void
  setSearch: (search: string) => void
  setPage: (page: number) => void
  setPageSize: (pageSize: number) => void
  reset: () => void
}

export const useFilterStore = create<FilterState>((set) => ({
  sourceType: 'rss',
  sourceId: null,
  platform: null,
  search: '',
  page: 1,
  pageSize: 10,

  setSourceType: (sourceType) => set({ sourceType, sourceId: null, platform: null, page: 1 }),
  setSourceId: (sourceId) => set({ sourceId, page: 1 }),
  setPlatform: (platform) => set({ platform, page: 1 }),
  setSearch: (search) => set({ search, page: 1 }),
  setPage: (page) => set({ page }),
  setPageSize: (pageSize) => set({ pageSize, page: 1 }),
  reset: () =>
    set({ sourceType: 'rss', sourceId: null, platform: null, search: '', page: 1, pageSize: 10 }),
}))
