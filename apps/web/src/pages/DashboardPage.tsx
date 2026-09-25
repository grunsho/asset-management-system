import React, { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { socket } from '../lib/socket'
import { useAuth } from '../context/AuthContext'
import { AssetModal } from '../components/AssetModal'
import { AssetAuditModal } from '../components/AssetAuditModal'
import { ChangeStatusModal } from '../components/ChangeStatusModal'
import { Download, History, Trash2 } from 'lucide-react'
import { AssetCharts } from '../components/AssetCharts'

// Interfaces alineadas con el esquema Prisma / REST API
export interface Category {
  id: string
  name: string
}

export interface Location {
  id: string
  name: string
}

export type AssetStatus = 'OPERATIONAL' | 'IN_MAINTENANCE' | 'OUT_OF_SERVICE'

export interface Asset {
  id: string
  tagCode: string
  name: string
  serialNumber?: string | null
  status: AssetStatus
  categoryId: string
  locationId: string
  category?: Category
  location?: Location
  updatedAt: string
}

interface AssetMetrics {
  total: number
  operational: number
  operationalPercentage: number
  inMaintenance: number
  outOfService: number
  critical: number
  byStatus: Array<{ status: string; count: number }>
  byLocation: Array<{ locationId: string; name: string; count: number }>
}

export const DashboardPage: React.FC = () => {
  const { user, logout, hasPermission } = useAuth()
  const [assets, setAssets] = useState<Asset[]>([])
  const [metrics, setMetrics] = useState<AssetMetrics>({
    total: 0,
    operational: 0,
    operationalPercentage: 0,
    inMaintenance: 0,
    outOfService: 0,
    critical: 0,
    byStatus: [],
    byLocation: [],
  })
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<AssetStatus | ''>('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  })
  const [actionError, setActionError] = useState('')

  // Estados para el Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [statusAsset, setStatusAsset] = useState<Asset | null>(null)
  const [auditAsset, setAuditAsset] = useState<Asset | null>(null)

  // Cargar lista inicial de activos
  const fetchAssets = async () => {
    try {
      const response = await api.get('/assets', {
        params: {
          page,
          limit: pagination.limit,
          search: searchTerm || undefined,
          status: statusFilter || undefined,
          categoryId: categoryFilter || undefined,
          locationId: locationFilter || undefined,
        },
      })
      const data = response.data

      if (Array.isArray(data)) {
        setAssets(data)
      } else if (Array.isArray(data?.data)) {
        setAssets(data.data)
        if (data.pagination) setPagination(data.pagination)
      } else if (Array.isArray(data?.assets)) {
        setAssets(data.assets)
      } else {
        console.warn(
          'La respuesta de /assets no contiene un Array válido:',
          data,
        )
        setAssets([])
      }
    } catch (error) {
      console.error('Error al cargar activos:', error)
      setAssets([])
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMetrics = async () => {
    try {
      const response = await api.get('/reports/metrics', {
        params: {
          search: searchTerm || undefined,
          status: statusFilter || undefined,
          categoryId: categoryFilter || undefined,
          locationId: locationFilter || undefined,
        },
      })
      setMetrics(response.data)
    } catch (error) {
      console.error('Error al cargar métricas:', error)
    }
  }

  useEffect(() => {
    void fetchAssets()
    void fetchMetrics()
  }, [page, searchTerm, statusFilter, categoryFilter, locationFilter])

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [categoriesResponse, locationsResponse] = await Promise.all([
          api.get('/categories'),
          api.get('/locations'),
        ])
        setCategories(categoriesResponse.data)
        setLocations(locationsResponse.data)
      } catch (error) {
        console.error('Error al cargar filtros de activos:', error)
      }
    }

    void fetchFilterOptions()
  }, [])

  useEffect(() => {
    socket.connect()
    socket.emit('join:assets')

    socket.on('asset:updated', (updatedAsset: Asset) => {
      setAssets((prev) =>
        prev.map((asset) =>
          asset.id === updatedAsset.id ? updatedAsset : asset,
        ),
      )
    })

    socket.on('asset:created', (newAsset: Asset) => {
      setAssets((prev) => [newAsset, ...prev])
    })

    socket.on('asset:deleted', ({ id }: { id: string }) => {
      setAssets((prev) => prev.filter((asset) => asset.id !== id))
    })

    return () => {
      socket.off('asset:updated')
      socket.off('asset:created')
      socket.off('asset:deleted')
      socket.disconnect()
    }
  }, [])

  const safeAssets = Array.isArray(assets) ? assets : []

  const handleOpenCreateModal = () => {
    setSelectedAsset(null)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (asset: Asset) => {
    setSelectedAsset(asset)
    setIsModalOpen(true)
  }

  const handleDelete = async (asset: Asset) => {
    if (!window.confirm(`¿Eliminar el activo ${asset.tagCode}?`)) return

    try {
      setActionError('')
      await api.delete(`/assets/${asset.id}`)
      await fetchAssets()
    } catch (error: any) {
      setActionError(
        error.response?.data?.error || 'No se pudo eliminar el activo',
      )
    }
  }

  const getStatusBadge = (status: Asset['status']) => {
    const styles: Record<AssetStatus, string> = {
      OPERATIONAL: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      IN_MAINTENANCE: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      OUT_OF_SERVICE: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    }
    return (
      <span
        className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[status]}`}
      >
        {status}
      </span>
    )
  }
  const handleExportCSV = async () => {
    try {
      const response = await api.get('/reports/export', {
        params: {
          format: 'csv',
          search: searchTerm || undefined,
          status: statusFilter || undefined,
          categoryId: categoryFilter || undefined,
          locationId: locationFilter || undefined,
        },
        responseType: 'blob',
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `inventario_activos_${Date.now()}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (error) {
      console.error('Error al exportar CSV:', error)
    }
  }

  return (
    <div className='min-h-screen bg-slate-950 text-slate-100 flex flex-col'>
      {/* Topbar */}
      <header className='border-b border-slate-800 bg-slate-900/50 backdrop-blur px-6 py-4 flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <div className='w-9 h-9 bg-sky-500/10 text-sky-400 rounded-lg flex items-center justify-center border border-sky-500/20 text-lg'>
            ⚙️
          </div>
          <div>
            <h1 className='text-base font-bold text-white leading-none'>
              Asset Management System
            </h1>
            <p className='text-xs text-slate-400 mt-1'>
              Monitoreo de Activos Físicos
            </p>
          </div>
        </div>

        <div className='flex items-center gap-4'>
          <div className='text-right'>
            <p className='text-sm font-medium text-white'>
              {user?.firstName} {user?.lastName}
            </p>
            <p className='text-xs text-slate-400 font-mono'>{user?.role}</p>
          </div>
          <button
            onClick={logout}
            className='px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors'
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className='flex-1 max-w-7xl w-full mx-auto p-6'>
        <div className='flex justify-between items-center'>
          <h1 className='text-2xl font-bold text-white'>
            Dashboard de Activos
          </h1>
          <button
            onClick={handleExportCSV}
            className='flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg border border-slate-700 transition-colors cursor-pointer'
          >
            <Download className='w-4 h-4' />
            Exportar CSV
          </button>
        </div>
        {/* KPI Cards */}
        <div className='grid grid-cols-1 md:grid-cols-5 gap-4 mt-6 mb-6'>
          <div className='bg-slate-900 border border-slate-800 rounded-xl p-4'>
            <p className='text-xs font-medium text-slate-400 uppercase'>
              Total Activos
            </p>
            <p className='text-2xl font-bold text-white mt-1'>
              {metrics.total}
            </p>
          </div>
          <div className='bg-slate-900 border border-slate-800 rounded-xl p-4'>
            <p className='text-xs font-medium text-slate-400 uppercase'>
              Operacionales
            </p>
            <p className='text-2xl font-bold text-emerald-400 mt-1'>
              {metrics.operational} ({metrics.operationalPercentage}%)
            </p>
          </div>
          <div className='bg-slate-900 border border-slate-800 rounded-xl p-4'>
            <p className='text-xs font-medium text-slate-400 uppercase'>
              En Mantenimiento
            </p>
            <p className='text-2xl font-bold text-amber-400 mt-1'>
              {metrics.inMaintenance}
            </p>
          </div>
          <div className='bg-slate-900 border border-slate-800 rounded-xl p-4'>
            <p className='text-xs font-medium text-slate-400 uppercase'>
              Fuera de Servicio
            </p>
            <p className='text-2xl font-bold text-rose-400 mt-1'>
              {metrics.outOfService}
            </p>
          </div>
          <div className='bg-slate-900 border border-slate-800 rounded-xl p-4'>
            <p className='text-xs font-medium text-slate-400 uppercase'>
              Críticos
            </p>
            <p className='text-2xl font-bold text-rose-400 mt-1'>
              {metrics.critical}
            </p>
          </div>
        </div>

        {/* Renderizado del componente de gráficos */}
        <AssetCharts assets={safeAssets} metrics={metrics} />

        {/* Action & Search Bar */}
        <div className='flex flex-col sm:flex-row items-center justify-between gap-4 mb-6'>
          <div className='grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4'>
            <input
              type='text'
              placeholder='Buscar por nombre o código...'
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPage(1)
              }}
              className='w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500'
            />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as AssetStatus | '')
                setPage(1)
              }}
              className='w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500'
            >
              <option value=''>Todos los estados</option>
              <option value='OPERATIONAL'>Operativos</option>
              <option value='IN_MAINTENANCE'>En mantenimiento</option>
              <option value='OUT_OF_SERVICE'>Fuera de servicio</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value)
                setPage(1)
              }}
              className='w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500'
            >
              <option value=''>Todas las categorías</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              value={locationFilter}
              onChange={(e) => {
                setLocationFilter(e.target.value)
                setPage(1)
              }}
              className='w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500'
            >
              <option value=''>Todas las ubicaciones</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>

          {hasPermission('ASSET_CREATE') && (
            <button
              onClick={handleOpenCreateModal}
              className='w-full sm:w-auto px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-sky-600/20 transition-all'
            >
              + Nuevo Activo
            </button>
          )}
        </div>

        {actionError && (
          <div className='mb-4 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-400'>
            {actionError}
          </div>
        )}

        {/* Table */}
        <div className='bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl'>
          {isLoading ? (
            <div className='p-12 text-center text-slate-400 font-mono text-sm'>
              Cargando activos...
            </div>
          ) : (
            <table className='w-full text-left border-collapse'>
              <thead>
                <tr className='bg-slate-950/50 border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider'>
                  <th className='py-3 px-4'>Código</th>
                  <th className='py-3 px-4'>Nombre</th>
                  <th className='py-3 px-4'>Categoría</th>
                  <th className='py-3 px-4'>Ubicación</th>
                  <th className='py-3 px-4'>Estado</th>
                  <th className='py-3 px-4 text-right'>Acciones</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-800/60 text-sm'>
                {safeAssets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className='py-8 text-center text-slate-500'>
                      No se encontraron activos.
                    </td>
                  </tr>
                ) : (
                  safeAssets.map((asset) => (
                    <tr
                      key={asset.id}
                      className='hover:bg-slate-800/40 transition-colors'
                    >
                      <td className='py-3.5 px-4 font-mono text-xs text-sky-400'>
                        {asset.tagCode}
                      </td>
                      <td className='py-3.5 px-4 font-medium text-white'>
                        {asset.name}
                      </td>
                      <td className='py-3.5 px-4 text-slate-400'>
                        {asset.category?.name || 'Sin Categoría'}
                      </td>
                      <td className='py-3.5 px-4 text-slate-400'>
                        {asset.location?.name || 'Sin Ubicación'}
                      </td>
                      <td className='py-3.5 px-4'>
                        {getStatusBadge(asset.status)}
                      </td>
                      <td className='py-3.5 px-4 text-right'>
                        <div className='flex justify-end gap-3'>
                          {hasPermission('ASSET_UPDATE_STATUS') && (
                            <button
                              onClick={() => setStatusAsset(asset)}
                              className='text-xs text-amber-400 hover:text-amber-300 font-medium'
                            >
                              Estado
                            </button>
                          )}
                          {hasPermission('ASSET_UPDATE') && (
                            <button
                              onClick={() => handleOpenEditModal(asset)}
                              className='text-xs text-sky-400 hover:text-sky-300 font-medium'
                            >
                              Editar
                            </button>
                          )}
                          {hasPermission('ASSET_READ') && (
                            <button
                              title='Ver historial'
                              aria-label={`Ver historial de ${asset.tagCode}`}
                              onClick={() => setAuditAsset(asset)}
                              className='text-slate-400 hover:text-white'
                            >
                              <History className='h-4 w-4' />
                            </button>
                          )}
                          {hasPermission('ASSET_DELETE') && (
                            <button
                              title='Eliminar activo'
                              aria-label={`Eliminar ${asset.tagCode}`}
                              onClick={() => void handleDelete(asset)}
                              className='text-rose-400 hover:text-rose-300'
                            >
                              <Trash2 className='h-4 w-4' />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className='flex items-center justify-between py-4 text-xs text-slate-400'>
          <span>
            {pagination.total} activo(s) · Página {pagination.page} de{' '}
            {pagination.totalPages}
          </span>
          <div className='flex gap-2'>
            <button
              disabled={page <= 1}
              onClick={() => setPage((currentPage) => currentPage - 1)}
              className='rounded border border-slate-700 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40'
            >
              Anterior
            </button>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((currentPage) => currentPage + 1)}
              className='rounded border border-slate-700 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40'
            >
              Siguiente
            </button>
          </div>
        </div>
      </main>

      {/* Modal Component */}
      <AssetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchAssets}
        assetToEdit={selectedAsset}
      />
      <ChangeStatusModal
        isOpen={!!statusAsset}
        asset={statusAsset}
        onClose={() => setStatusAsset(null)}
        onSuccess={fetchAssets}
      />
      <AssetAuditModal
        isOpen={!!auditAsset}
        assetId={auditAsset?.id || null}
        assetTagCode={auditAsset?.tagCode}
        onClose={() => setAuditAsset(null)}
      />
    </div>
  )
}
