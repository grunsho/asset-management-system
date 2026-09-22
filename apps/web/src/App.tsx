import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'

// // Vista de Dashboard temporal para probar autenticación
// function DashboardPlaceholder() {
//   return (
//     <div className='min-h-screen bg-slate-950 text-white p-8'>
//       <div className='max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6'>
//         <h1 className='text-2xl font-bold mb-2'>🚀 Dashboard de Activos</h1>
//         <p className='text-slate-400 text-sm mb-6'>
//           Sesión iniciada con éxito. Listo para cargar la tabla de activos en
//           tiempo real.
//         </p>
//       </div>
//     </div>
//   )
// }

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path='/login' element={<LoginPage />} />
          
          {/* Rutas Protegidas por Autenticación y Permisos RBAC */}
          <Route element={<ProtectedRoute requiredPermission='ASSET_READ' />}>
            <Route path='/dashboard' element={<DashboardPage />} />
          </Route>

          {/* Redirección por defecto */}
          <Route path='*' element={<Navigate to='/dashboard' replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
