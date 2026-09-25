import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface ProtectedRouteProps {
  requiredPermission?: string
  redirectTo?: string
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  requiredPermission,
  redirectTo = '/login',
}) => {
  const { isAuthenticated, isLoading, hasPermission } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400 font-mono">
            Verificando sesión...
          </p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-4">
        <div className="max-w-md w-full bg-slate-800 p-6 rounded-xl border border-red-500/20 text-center shadow-xl">
          <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 text-xl">
            🚫
          </div>
          <h2 className="text-xl font-bold mb-2">Acceso no autorizado</h2>
          <p className="text-slate-400 text-sm mb-6">
            No tienes los permisos requeridos (
            <code className="text-amber-400">{requiredPermission}</code>) para
            acceder a esta sección.
          </p>
          <a
            href="/"
            className="inline-block px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
          >
            Volver al Inicio
          </a>
        </div>
      </div>
    )
  }

  return <Outlet />
}
