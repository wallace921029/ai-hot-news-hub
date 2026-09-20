import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '@/services/api'
import type { User } from '@/types'

interface UserState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isAdmin: boolean
  isInitialized: boolean
  login: (email: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string, inviteCode: string) => Promise<void>
  logout: () => void
  fetchUser: () => Promise<void>
  setToken: (token: string | null) => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isAdmin: false,
      isInitialized: false,

      setToken: (token: string | null) => {
        api.setToken(token)
        set({ token })
      },

      login: async (email: string, password: string) => {
        const { user, token } = await api.login(email, password)
        api.setToken(token)
        set({
          user,
          token,
          isAuthenticated: true,
          isAdmin: user.role === 'admin',
          isInitialized: true,
        })
      },

      register: async (username: string, email: string, password: string, inviteCode: string) => {
        const { user, token } = await api.register(username, email, password, inviteCode)
        api.setToken(token)
        set({
          user,
          token,
          isAuthenticated: true,
          isAdmin: user.role === 'admin',
          isInitialized: true,
        })
      },

      logout: () => {
        api.setToken(null)
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isAdmin: false,
          isInitialized: true,
        })
      },

      fetchUser: async () => {
        try {
          const user = await api.getMe()
          set({
            user,
            isAuthenticated: true,
            isAdmin: user.role === 'admin',
            isInitialized: true,
          })
        } catch {
          // Token 无效或过期
          api.setToken(null)
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isAdmin: false,
            isInitialized: true,
          })
        }
      },

      // 初始化：恢复登录状态
      initialize: async () => {
        const { token } = get()
        if (token) {
          api.setToken(token)
          await get().fetchUser()
        } else {
          set({ isInitialized: true })
        }
      },
    }),
    {
      name: 'user-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isAdmin: state.isAdmin,
      }),
    }
  )
)
