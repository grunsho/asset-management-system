import React, { useState } from 'react'
import { api } from '../lib/api'

interface CreateAttributeModalProps {
  isOpen: boolean
  type: 'category' | 'location'
  onClose: () => void
  onSuccess: () => void
}

export const CreateAttributeModal: React.FC<CreateAttributeModalProps> = ({
  isOpen,
  type,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const title = type === 'category' ? 'Nueva Categoría' : 'Nueva Ubicación'
  const endpoint = type === 'category' ? '/categories' : '/locations'

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSubmitting(true)
    setError('')

    try {
      await api.post(endpoint, { name: name.trim() })
      setName('')
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error?.[0]?.message || 'Error al guardar')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4'>
      <div className='bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl'>
        <h2 className='text-lg font-bold text-white mb-4'>{title}</h2>

        {error && (
          <div className='mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg'>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div>
            <label className='block text-xs font-medium text-slate-400 mb-1'>
              Nombre
            </label>
            <input
              type='text'
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                type === 'category'
                  ? 'Ej. Transformadores'
                  : 'Ej. Subestación Norte'
              }
              className='w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500'
            />
          </div>

          <div className='flex justify-end gap-3 pt-2'>
            <button
              type='button'
              onClick={onClose}
              className='px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg'
            >
              Cancelar
            </button>
            <button
              type='submit'
              disabled={isSubmitting}
              className='px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg shadow-lg shadow-sky-600/20'
            >
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
