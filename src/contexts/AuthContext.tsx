import React, { createContext, useContext, useEffect, useState, useMemo } from 'react'
import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export interface UserProfile {
  id: string
  email: string
  name?: string
  avatar?: string
  created?: string
  updated?: string
  verified?: boolean
}

interface AuthContextType {
  user: UserProfile | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<UserProfile>
  register: (name: string, email: string, password: string) => Promise<UserProfile>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function formatUserRecord(record: RecordModel | null): UserProfile | null {
  if (!record) return null
  return {
    id: record.id,
    email: record.email || '',
    name: record.name || '',
    avatar: record.avatar || '',
    created: record.created,
    updated: record.updated,
    verified: record.verified,
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    return formatUserRecord(pb.authStore.record)
  })
  const [token, setToken] = useState<string | null>(() => pb.authStore.token || null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    // Sincroniza estado inicial e valida token se presente
    const checkAuth = async () => {
      try {
        if (pb.authStore.isValid) {
          // Token existe no localStorage e não está expirado localmente, atualiza perfil
          try {
            await pb.collection('users').authRefresh()
            setUser(formatUserRecord(pb.authStore.record))
            setToken(pb.authStore.token)
          } catch {
            // Se o token for inválido no servidor, limpa o store
            pb.authStore.clear()
            setUser(null)
            setToken(null)
          }
        } else {
          setUser(null)
          setToken(null)
        }
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()

    // Inscreve no authStore do PocketBase para reagir a login, logout e updates
    const unsubscribe = pb.authStore.onChange((newToken, newModel) => {
      setToken(newToken || null)
      setUser(formatUserRecord(newModel as RecordModel | null))
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string): Promise<UserProfile> => {
    const authData = await pb.collection('users').authWithPassword(email.trim(), password)
    const profile = formatUserRecord(authData.record)
    setUser(profile)
    setToken(authData.token)
    return profile!
  }

  const register = async (name: string, email: string, password: string): Promise<UserProfile> => {
    const trimmedEmail = email.trim()
    const trimmedName = name.trim()

    // 1. Criar usuário na coleção 'users' com o nome
    await pb.collection('users').create({
      email: trimmedEmail,
      name: trimmedName,
      password,
      passwordConfirm: password,
    })

    // 2. Realizar login imediato com a nova conta
    const authData = await pb.collection('users').authWithPassword(trimmedEmail, password)
    const profile = formatUserRecord(authData.record)
    setUser(profile)
    setToken(authData.token)
    return profile!
  }

  const logout = () => {
    pb.authStore.clear()
    setUser(null)
    setToken(null)
  }

  const refreshUser = async () => {
    if (pb.authStore.isValid) {
      try {
        const authData = await pb.collection('users').authRefresh()
        setUser(formatUserRecord(authData.record))
        setToken(authData.token)
      } catch {
        logout()
      }
    }
  }

  const isAuthenticated = useMemo(() => {
    return Boolean(token && user)
  }, [token, user])

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}
