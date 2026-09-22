import React, { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { socket } from '../lib/socket'
import { useAuth } from '../context/AuthContext'

export interface Asset {
  id: string
  name: string
  code: string
  category: string
  status: 'OPERATIONAL' | 'MAINTENANCE' | 'CRITICAL' | 'DECOMMISSIONED'
  location: string
  updatedAt: string
}

export const DashboardPage: React.FC = () => {
  const { user, logout, hasPermission } = useAuth()
  const [assets, setAssets] = useState<Asset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Cargar lista inicial de activos
  const fetchAssets = async () => {
    try {
      const { data } = await api.get('/assets')
      setAssets(data)
    } catch (error) {
      console.error('Error al cargar activos:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAssets()

    // Conectar WebSocket y escuchar actualizaciones en tiempo real
    socket.connect()

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

    return () => {
      socket.off('asset:updated')
      socket.off('asset:created')
      socket.disconnect()
    }
  }, [])

  const filteredAssets = assets.filter(
    (a) =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.location.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getStatusBadge = (status: Asset['status']) => {
    const styles = {
      OPERATIONAL: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      MAINTENANCE: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      CRITICAL: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      DECOMMISSIONED: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    }
    return (
      <span
        className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[status]}`}
      >
        {status}
      </span>
    )
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
        {/* KPI Cards */}
        <div className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-6'>
          <div className='bg-slate-900 border border-slate-800 rounded-xl p-4'>
            <p className='text-xs font-medium text-slate-400 uppercase'>
              Total Activos
            </p>
            <p className='text-2xl font-bold text-white mt-1'>
              {assets.length}
            </p>
          </div>
          <div className='bg-slate-900 border border-slate-800 rounded-xl p-4'>
            <p className='text-xs font-medium text-slate-400 uppercase'>
              Operacionales
            </p>
            <p className='text-2xl font-bold text-emerald-400 mt-1'>
              {assets.filter((a) => a.status === 'OPERATIONAL').length}
            </p>
          </div>
          <div className='bg-slate-900 border border-slate-800 rounded-xl p-4'>
            <p className='text-xs font-medium text-slate-400 uppercase'>
              En Mantenimiento
            </p>
            <p className='text-2xl font-bold text-amber-400 mt-1'>
              {assets.filter((a) => a.status === 'MAINTENANCE').length}
            </p>
          </div>
          <div className='bg-slate-900 border border-slate-800 rounded-xl p-4'>
            <p className='text-xs font-medium text-slate-400 uppercase'>
              Estado Crítico
            </p>
            <p className='text-2xl font-bold text-rose-400 mt-1'>
              {assets.filter((a) => a.status === 'CRITICAL').length}
            </p>
          </div>
        </div>

        {/* Action & Search Bar */}
        <div className='flex flex-col sm:flex-row items-center justify-between gap-4 mb-6'>
          <input
            type='text'
            placeholder='Buscar activo por nombre, código o ubicación...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='w-full sm:w-80 px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500'
          />

          {hasPermission('ASSET_CREATE') && (
            <button className='w-full sm:w-auto px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-sky-600/20 transition-all'>
              + Nuevo Activo
            </button>
          )}
        </div>

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
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className='py-8 text-center text-slate-500'>
                      No se encontraron activos.
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((asset) => (
                    <tr
                      key={asset.id}
                      className='hover:bg-slate-800/40 transition-colors'
                    >
                      <td className='py-3.5 px-4 font-mono text-xs text-sky-400'>
                        {asset.code}
                      </td>
                      <td className='py-3.5 px-4 font-medium text-white'>
                        {asset.name}
                      </td>
                      <td className='py-3.5 px-4 text-slate-400'>
                        {asset.category}
                      </td>
                      <td className='py-3.5 px-4 text-slate-400'>
                        {asset.location}
                      </td>
                      <td className='py-3.5 px-4'>
                        {getStatusBadge(asset.status)}
                      </td>
                      <td className='py-3.5 px-4 text-right'>
                        {hasPermission('ASSET_UPDATE') && (
                          <button className='text-xs text-sky-400 hover:text-sky-300 font-medium'>
                            Editar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}
