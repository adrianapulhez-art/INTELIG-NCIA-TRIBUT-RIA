import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070b12] text-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-pulse">
            <span className="font-extrabold text-slate-950 text-base font-mono">IT</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            Carregando credenciais...
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    // Redireciona para /auth guardando de onde veio
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  return <>{children}</>
}
