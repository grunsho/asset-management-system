import React, { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { History, User, Clock } from 'lucide-react'

interface AuditLog {
  id: string
  previousStatus: string
  newStatus: string
  reason?: string | null
  createdAt: string
  user: {
    firstName: string
    lastName: string
    email: string
  }
}

interface AssetAuditModalProps {
  isOpen: boolean
  assetId: string | null
  assetTagCode?: string
  onClose: () => void
}

export const AssetAuditModal: React.FC<AssetAuditModalProps> = ({
  isOpen,
  assetId,
  assetTagCode,
  onClose,
}) => {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen && assetId) {
      setIsLoading(true)
      api
        .get(`/assets/${assetId}/logs`)
        .then((res) => setLogs(res.data || []))
        .catch((err) => console.error('Error al obtener logs:', err))
        .finally(() => setIsLoading(false))
    }
  }, [isOpen, assetId])

  if (!isOpen || !assetId) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-sky-400" />
            <h2 className="text-base font-bold text-white">
              Historial de Auditoría — {assetTagCode}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm"
          >
            ✕
          </button>
        </div>

        <div className="p-6 max-h-96 overflow-y-auto space-y-3">
          {isLoading ? (
            <div className="text-center text-slate-400 py-6 text-xs font-mono">
              Cargando historial...
            </div>
          ) : logs.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">
              No hay cambios de estado registrados para este activo.
            </p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <User className="w-3 h-3 text-sky-400" />
                    {log.user.firstName} {log.user.lastName}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="text-xs flex items-center gap-2 font-mono pt-1">
                  <span className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
                    {log.previousStatus}
                  </span>
                  <span className="text-slate-500">→</span>
                  <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    {log.newStatus}
                  </span>
                </div>

                {log.reason && (
                  <p className="text-xs text-slate-400 italic pt-1 border-t border-slate-900 mt-1">
                    "{log.reason}"
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-3 bg-slate-950/50 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
