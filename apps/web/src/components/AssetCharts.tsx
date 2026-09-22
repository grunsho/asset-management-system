import React from 'react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Asset } from '../pages/DashboardPage'

interface AssetChartProps {
  assets: Asset[]
}

const STATUS_COLORS: Record<string, string> = {
  OPERATIONAL: '#10b981', // Verde
  MAINTENANCE: '#f59e0b', // Amarillo
  CRITICAL: '#ef4444', // Rojo
  DECOMMISSIONED: '#64748b', // Gris
}

export const AssetCharts: React.FC<AssetChartProps> = ({ assets }) => {
  // 1. Agrupación por Estado (Gráfico de Torta)
  const statusDataMap = assets.reduce(
    (acc, asset) => {
      acc[asset.status] = (acc[asset.status] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const statusData = Object.keys(statusDataMap).map((status) => ({
    name: status,
    value: statusDataMap[status],
  }))

  // 2. Agrupación de Ubicación (Gráfico de Barras)
  const locationDataMap = assets.reduce(
    (acc, asset) => {
      const locName = asset.location?.name || 'Sin Ubicación'
      acc[locName] = (acc[locName] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const locationData = Object.keys(locationDataMap).map((loc) => ({
    name: loc,
    count: locationDataMap[loc],
  }))

  return (
    <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 my-6'>
      {/* Distribución por Estado */}
      <div className='bg-slate-900/60 border border-slate-800 rounded-xl p-5'>
        <h3 className='text-sm font-semibold text-slate-300 mb-4'>
          Distribución por Estado
        </h3>
        <div className='h-64 w-full'>
          <ResponsiveContainer width='100%' height='100%'>
            <PieChart>
              <Pie
                data={statusData}
                dataKey='value'
                nameKey='name'
                cx='50%'
                cy='50%'
                outerRadius={80}
                innerRadius={50}
                paddingAngle={4}
                label={({ name, percent }) =>
                  `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
              >
                {statusData.map((entry) => (
                  <Cell
                    key={`cell=${entry.name}`}
                    fill={STATUS_COLORS[entry.name] || '#3b82f6'}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activos por Ubicación */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">
          Activos por Ubicación
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={locationData}>
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
              <YAxis allowDecimals={false} stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
              />
              <Bar dataKey="count" fill="#0284c7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
