import { create } from 'zustand'

interface FilterState {
  category: string | null
  platform: string | null
  sort: 'score' | 'time'
  search: string
  page: number
  setCategory: (category: string | null) => void
  setPlatform: (platform: string | null) => void
  setSort: (sort: 'score' | 'time') => void
  setSearch: (search: string) => void
  setPage: (page: number) => void
  reset: () => void
}

export const useFilterStore = create<FilterState>((set) => ({
  category: null,
  platform: null,
  sort: 'score',
  search: '',
  page: 1,

  setCategory: (category) => set({ category, page: 1 }),
  setPlatform: (platform) => set({ platform, page: 1 }),
  setSort: (sort) => set({ sort, page: 1 }),
  setSearch: (search) => set({ search, page: 1 }),
  setPage: (page) => set({ page }),
  reset: () => set({ category: null, platform: null, sort: 'score', search: '', page: 1 }),
}))
