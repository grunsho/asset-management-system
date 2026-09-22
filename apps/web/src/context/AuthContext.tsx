import React, { createContext, useContext, useState, useEffect } from 'react'
import { api, setAccessToken } from '../lib/api'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
}

interface AuthContextType {
  user: User | null
  permissions: string[]
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  hasPermission: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null)
  const [permissions, setPermissions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Verificar la sesión al cargar la app intentando obtener me / refresh
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await api.post('/auth/refresh')
        setAccessToken(data.accessToken)

        const meRes = await api.get('/auth/me')
        setUser(meRes.data.user)
        setPermissions(meRes.data.permissions)
      } catch (error) {
        setUser(null)
        setPermissions([])
        setAccessToken(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password })
    setAccessToken(data.accessToken)
    setUser(data.user)
    setPermissions(data.permissions || [])
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      console.warn('Logout backend falló, limpiando sesión localmente', error)
    } finally {
      setAccessToken(null)
      setUser(null)
      setPermissions([])
      window.location.href = '/login'
    }
  }

  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider')
  }
  return context
}
