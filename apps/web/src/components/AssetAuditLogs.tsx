import React, { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { History, User, Clock } from 'lucide-react'

interface AuditLog {
  id: string
  assetId: string
  userId: string
  user?: {
    firstName: string
    lastName: string
    email: string
  }
  previousStatus: string
  newStatus: string
  reason?: string
  createdAt: string
}

interface AssetAuditLogsProps {
  assetId: string
}

export const AssetAuditLogs: React.FC<AssetAuditLogsProps> = ({ assetId }) => {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await api.get(`/assets/${assetId}/logs`)
        setLogs(Array.isArray(response.data) ? response.data : [])
      } catch (err) {
        console.error('Error al cargar historial de auditoría: ', err)
      } finally {
        setIsLoading(false)
      }
    }

    if (assetId) fetchLogs()
  }, [assetId])

  if (isLoading) {
    return (
      <div className='p-6 text-center text-slate-400 font-mono text-xs'>
        Cargando historial de cambios...
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className='p-6 text-center text-slate-500 text-xs italic'>
        No hay registro de auditoría para este activo.
      </div>
    )
  }

  return (
    <div className='space-y-4 max-h-80 overflow-y-auto pr-2'>
      <div className='flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2'>
        <History className='w-4 h-4 text-sky-400' /> Historial de Modificaciones
      </div>

      <div className='relative border-l-2 boreder-slate-800 ml-3 pl-4 space-y-4'>
        {logs.map((log) => (
          <div key={log.id} className='relative group'>
            {/* Punto indicador */}
            <div className='absolute -left-5.25 top-1 w-2.5 h-2.5 rounded-full bg-sky-500 ring-4 ring-slate-900' />

            <div className='bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs space-y-1'>
              <div className='flex items-center justify-between text-slate-400'>
                <span className='flex items-center gap-1 font-medium text-slate-300'>
                  <User className='w-3 h-3' />
                  {log.user
                    ? `${log.user.firstName} ${log.user.lastName}`
                    : 'Usuario del Sistema'}
                </span>
                <span className='flex items-center gap-1 font-mono text-[10px]'>
                  <Clock className='w-3 h-3 text-slate-500' />
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>

              <div className='text-slate-300 pt-1'>
                Cambio de estado:{' '}
                <span className='font-mono text-amber-400'>
                  {log.previousStatus || 'N/A'}
                </span>{' '}
                →{' '}
                <span className='font-mono text-emerald-400'>
                  {log.newStatus}
                </span>
              </div>

              {log.reason && (
                <div className='text-slate-400 italic text-[11px] bg-slate-900/50 p-1.5 rounded border border-slate-800/50 mt-1'>
                  "{log.reason}"
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
