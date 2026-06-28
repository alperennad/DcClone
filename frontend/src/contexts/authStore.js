import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      
      login: (token, user) => {
        set({ token, user, isAuthenticated: true })
      },
      
      logout: () => {
        set({ token: null, user: null, isAuthenticated: false })
      },
      
      updateUser: (userData) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null
        }))
      },
      
      getToken: () => get().token,
      getUser: () => get().user,
    }),
    {
      name: 'auth-storage',
    }
  )
)
