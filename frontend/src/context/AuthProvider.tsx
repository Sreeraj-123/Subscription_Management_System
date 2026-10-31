import React, { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import type { User, AuthResponse } from '@/types/auth'
import { AuthContext } from './auth-context'

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('brightloop_user')
    return saved ? JSON.parse(saved) : null
  })
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('brightloop_access_token') && !localStorage.getItem('brightloop_user'))
  })

  const refreshProfile = async () => {
    if (!api.getAccessToken()) {
      setUser(null)
      setIsLoading(false)
      return
    }

    try {
      const data = await api.get<User>('/accounts/me/')
      setUser(data)
      localStorage.setItem('brightloop_user', JSON.stringify(data))
    } catch {
      api.clearTokens()
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    const init = async () => {
      if (!api.getAccessToken()) {
        if (active) setIsLoading(false)
        return
      }
      try {
        const data = await api.get<User>('/accounts/me/')
        if (active) {
          setUser(data)
          localStorage.setItem('brightloop_user', JSON.stringify(data))
        }
      } catch {
        if (active) {
          api.clearTokens()
          setUser(null)
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }
    init()
    return () => {
      active = false
    }
  }, [])

  const login = async (email: string, password: string) => {
    const res = await api.post<AuthResponse>('/accounts/login/', { email, password }, { skipAuth: true })
    api.setTokens(res.tokens.access, res.tokens.refresh)
    setUser(res.user)
    localStorage.setItem('brightloop_user', JSON.stringify(res.user))
  }

  const signup = async (data: any) => {
    const res = await api.post<AuthResponse>('/accounts/signup/', data, { skipAuth: true })
    api.setTokens(res.tokens.access, res.tokens.refresh)
    setUser(res.user)
    localStorage.setItem('brightloop_user', JSON.stringify(res.user))
  }

  const logout = () => {
    api.clearTokens()
    setUser(null)
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
