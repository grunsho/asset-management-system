import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error ||
        'Credenciales inválidas. Verifica tu correo y contraseña.'
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-slate-950 p-4'>
      <div className='max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8'>
        <div className='flex flex-col items-center mb-8'>
          <div className='w-12 h-12 bg-sky-500/10 text-sky-400 rounded-xl flex items-center justify-center mb-3 text-2xl border border-sky-500/20'>
            ⚙️
          </div>
          <h1 className='text-2xl font-bold text-white tracking-light'>
            Asset Manager
          </h1>
          <p className='text-xs text-slate-400 mt-1'>
            Plataforma de Control de Activos Físicos
          </p>
        </div>

        {error && (
          <div className='mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2'>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className='space-y-5'>
          <div>
            <label className='block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2'>
              Correo Electrónico
            </label>
            <input
              type='email'
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className='w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-sm transition-all'
              placeholder='nombre@empresa.com'
            />
          </div>

          <div>
            <label className='block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2'>
              Contraseña
            </label>
            <input
              type='password'
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className='w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-sm transition-all'
              placeholder='••••••••'
            />
          </div>

          <button
            type='submit'
            disabled={isSubmitting}
            className='w-full py-3 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 text-white font-medium rounded-lg text-sm transition-all shadow-lg shadow-sky-600/20 flex items-center justify-center gap-2'
          >
            {isSubmitting ? (
              <>
                <span className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></span>
                Iniciando sesión...
              </>
            ) : (
              'Ingresar a la Plataforma'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
