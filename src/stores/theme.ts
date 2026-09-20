import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeStore {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  return theme === 'system' ? getSystemTheme() : theme
}

function applyTheme(resolvedTheme: 'light' | 'dark') {
  const root = document.documentElement
  root.setAttribute('data-theme', resolvedTheme)
  root.classList.remove('light', 'dark')
  root.classList.add(resolvedTheme)
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'system',
      resolvedTheme: getSystemTheme(),

      setTheme: (theme: Theme) => {
        const resolvedTheme = resolveTheme(theme)
        applyTheme(resolvedTheme)
        set({ theme, resolvedTheme })
      },

      toggleTheme: () => {
        const { resolvedTheme } = get()
        const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
        get().setTheme(newTheme)
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          const resolved = resolveTheme(state.theme)
          state.resolvedTheme = resolved
          applyTheme(resolved)

          // 监听系统主题变化
          if (state.theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
            const handler = () => {
              const newResolved = getSystemTheme()
              applyTheme(newResolved)
              useThemeStore.setState({ resolvedTheme: newResolved })
            }
            mediaQuery.addEventListener('change', handler)
          }
        }
      },
    }
  )
)
