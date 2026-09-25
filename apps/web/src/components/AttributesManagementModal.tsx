import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Trash2, Tags, MapPin } from 'lucide-react'

interface Attribute {
  id: string
  name: string
}

interface AttributeManagementProps {
  isOpen: boolean
  onClose: () => void
  onRefreshData: () => void
}

export const AttributesManagementModal: React.FC<AttributeManagementProps> = ({
  isOpen,
  onClose,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'categories' | 'locations'>(
    'categories',
  )
  const [categories, setCategories] = useState<Attribute[]>([])
  const [locations, setLocations] = useState<Attribute[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const fetchAttributes = async () => {
    setIsLoading(true)
    setErrorMessage('')
    try {
      const [catRes, locRes] = await Promise.all([
        api.get('/categories'),
        api.get('/locations'),
      ])
      setCategories(Array.isArray(catRes.data) ? catRes.data : [])
      setLocations(Array.isArray(locRes.data) ? locRes.data : [])
    } catch {
      setErrorMessage('Error al cargar atributos.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) fetchAttributes()
  }, [isOpen])

  if (!isOpen) return null
  const handleDelete = async (id: string, type: 'category' | 'location') => {
    if (!confirm('¿Está seguro de eliminar este elemento?')) return

    setErrorMessage('')
    try {
      const endpoint =
        type === 'category' ? `/categories/${id}` : `/locations/${id}`
      await api.delete(endpoint)
      await fetchAttributes()
      onRefreshData()
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.error ||
          'No se puede eliminar el elemento seleccionado.',
      )
    }
  }

  const items = activeTab === 'categories' ? categories : locations

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-white">
            Administración de Atributos
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/50">
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'categories'
                ? 'border-sky-500 text-sky-400 bg-slate-900/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tags className="w-3.5 h-3.5" /> Categorías ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab('locations')}
            className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'locations'
                ? 'border-sky-500 text-sky-400 bg-slate-900/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" /> Ubicaciones ({locations.length})
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">
              ⚠️ {errorMessage}
            </div>
          )}

          {isLoading ? (
            <div className="text-center text-slate-400 py-6 text-xs font-mono">
              Cargando...
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {items.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">
                  No hay elementos registrados.
                </p>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 rounded-lg"
                  >
                    <span className="text-xs text-slate-200 font-medium">
                      {item.name}
                    </span>
                    <button
                      onClick={() =>
                        handleDelete(
                          item.id,
                          activeTab === 'categories' ? 'category' : 'location',
                        )
                      }
                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
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
