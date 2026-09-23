import React, { useState } from 'react'
import { api } from '../lib/api'
import { Asset, AssetStatus } from '../pages/DashboardPage'

interface ChangeStatusModalProps {
  isOpen: boolean
  asset: Asset | null
  onClose: () => void
  onSuccess: () => void
}

export const ChangeStatusModal: React.FC<ChangeStatusModalProps> = ({
  isOpen,
  asset,
  onClose,
  onSuccess,
}) => {
  const [status, setStatus] = useState<AssetStatus>('OPERATIONAL')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen || !asset) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      await api.patch(`/assets/${asset.id}/status`, {
        status,
        reason: reason.trim() || undefined,
      })
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al actualizar el estado')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4'>
      <div className='bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl'>
        <h3 className='text-lg font-bold text-white mb-1'>
          Cambiar Estado del Activo
        </h3>
        <p className='text-xs text-slate-400 font-mono mb-4'>
          {asset.tagCode} - {asset.name}
        </p>

        {error && (
          <div className='mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg'>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div>
            <label className='block text-xs font-medium text-slate-400 mb-1'>
              Nuevo Estado
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as AssetStatus)}
              className='w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500'
            >
              <option value='OPERATIONAL'>OPERATIONAL (Operativo)</option>
              <option value='IN_MAINTENANCE'>
                IN_MAINTENANCE (En Mantenimiento)
              </option>
              <option value='OUT_OF_SERVICE'>
                OUT_OF_SERVICE (Fuera de Servicio)
              </option>
            </select>
          </div>

          <div>
            <label className='block text-xs font-medium text-slate-400 mb-1'>
              Motivo del Cambio (Bitácora de Auditoría)
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder='Ej. Mantención preventiva programada de 500 hrs...'
              className='w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500 resize-none'
            />
          </div>

          <div className='flex justify-end gap-3 pt-2'>
            <button
              type='button'
              onClick={onClose}
              className='px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg cursor-pointer'
            >
              Cancelar
            </button>
            <button
              type='submit'
              disabled={isSubmitting}
              className='px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg shadow-lg shadow-sky-600/20 cursor-pointer'
            >
              {isSubmitting ? 'Guardando...' : 'Actualizar Estado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
