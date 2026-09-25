import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Asset } from '../pages/DashboardPage'
import { CreateAttributeModal } from './CreateAttributeModal'
import { Plus } from 'lucide-react'

interface AssetModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  assetToEdit?: Asset | null
}

interface OptionItem {
  id: string
  name: string
}

export const AssetModal: React.FC<AssetModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  assetToEdit,
}) => {
  const [formData, setFormData] = useState({
    tagCode: '',
    name: '',
    serialNumber: '',
    categoryId: '',
    locationId: '',
  })

  const [categories, setCategories] = useState<OptionItem[]>([])
  const [locations, setLocations] = useState<OptionItem[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Estado para el modal de creación de atributos (Categoría / Ubicación)
  const [attributeModal, setAttributeModal] = useState<{
    isOpen: boolean
    type: 'category' | 'location'
  }>({
    isOpen: false,
    type: 'category',
  })

  // Cargar Categorías y Ubicaciones para los Selects
  const fetchOptions = async () => {
    try {
      const [catRes, locRes] = await Promise.all([
        api.get('/categories'),
        api.get('/locations'),
      ])

      setCategories(
        Array.isArray(catRes.data) ? catRes.data : catRes.data?.data || [],
      )
      setLocations(
        Array.isArray(locRes.data) ? locRes.data : locRes.data?.data || [],
      )
    } catch (err) {
      console.error('Error al cargar selectores del modal:', err)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchOptions()
    }
  }, [isOpen])

  useEffect(() => {
    if (assetToEdit) {
      setFormData({
        tagCode: (assetToEdit as any).tagCode || '',
        name: assetToEdit.name || '',
        serialNumber: (assetToEdit as any).serialNumber || '',
        categoryId: (assetToEdit as any).categoryId || '',
        locationId: (assetToEdit as any).locationId || '',
      })
    } else {
      setFormData({
        tagCode: '',
        name: '',
        serialNumber: '',
        categoryId: '',
        locationId: '',
      })
    }
    setErrorMessage('')
  }, [assetToEdit, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const payload = {
        tagCode: formData.tagCode,
        name: formData.name,
        serialNumber: formData.serialNumber || undefined,
        categoryId: formData.categoryId,
        locationId: formData.locationId,
      }

      if (assetToEdit) {
        await api.put(`/assets/${assetToEdit.id}`, payload)
      } else {
        await api.post('/assets', payload)
      }
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error al guardar el activo:', error)
      const serverError = error.response?.data?.error
      const validationDetails = error.response?.data?.details

      if (Array.isArray(validationDetails) || Array.isArray(serverError)) {
        const issues = (validationDetails || serverError)
          .map((i: any) => `${i.path?.join('.') || 'campo'}: ${i.message}`)
          .join(', ')
        setErrorMessage(issues)
      } else if (typeof serverError === 'string') {
        setErrorMessage(serverError)
      } else {
        setErrorMessage('Error de validación (400) al guardar el activo')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">
              {assetToEdit ? 'Editar Activo' : 'Nuevo Activo Físico'}
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors text-sm font-mono cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {errorMessage && (
              <div
                role="alert"
                className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400 font-medium"
              >
                ⚠️ {errorMessage}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Código TAG
                </label>
                <input
                  type="text"
                  required
                  value={formData.tagCode}
                  onChange={(e) =>
                    setFormData({ ...formData, tagCode: e.target.value })
                  }
                  placeholder="Ej. PUMP-01"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Número de Serie
                </label>
                <input
                  type="text"
                  value={formData.serialNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, serialNumber: e.target.value })
                  }
                  placeholder="Ej. SN-987654321"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Nombre / Descripción
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ej. Bomba Centrífuga Principal 50HP"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Categoría */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold uppercase text-slate-400">
                    Categoría
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setAttributeModal({ isOpen: true, type: 'category' })
                    }
                    className="text-[10px] font-medium text-sky-400 hover:text-sky-300 flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Nueva
                  </button>
                </div>
                <select
                  required
                  value={formData.categoryId}
                  onChange={(e) =>
                    setFormData({ ...formData, categoryId: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="">Seleccionar Categoría</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ubicación */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold uppercase text-slate-400">
                    Ubicación
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setAttributeModal({ isOpen: true, type: 'location' })
                    }
                    className="text-[10px] font-medium text-sky-400 hover:text-sky-300 flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Nueva
                  </button>
                </div>
                <select
                  required
                  value={formData.locationId}
                  onChange={(e) =>
                    setFormData({ ...formData, locationId: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="">Seleccionar Ubicación</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-medium text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-50 rounded-lg shadow-lg shadow-sky-600/20 transition-all cursor-pointer"
              >
                {isSubmitting
                  ? 'Guardando...'
                  : assetToEdit
                    ? 'Actualizar Activo'
                    : 'Guardar Activo'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal para crear Categoría o Ubicación al vuelo */}
      <CreateAttributeModal
        isOpen={attributeModal.isOpen}
        type={attributeModal.type}
        onClose={() => setAttributeModal({ ...attributeModal, isOpen: false })}
        onSuccess={fetchOptions}
      />
    </>
  )
}
