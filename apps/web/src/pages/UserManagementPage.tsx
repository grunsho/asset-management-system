import React, { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, RefreshCw, UserPlus } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

interface ManagedUser {
  id: string
  email: string
  firstName: string
  lastName: string
  isActive: boolean
  createdAt?: string
  role: { id: string; name: string }
}

interface RoleOption {
  id: string
  name: string
  description?: string | null
}

const initialForm = {
  email: '',
  firstName: '',
  lastName: '',
  password: '',
  roleId: '',
}

export const UserManagementPage: React.FC = () => {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [form, setForm] = useState(initialForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadData = async () => {
    setIsLoading(true)
    setError('')
    try {
      const [usersResponse, rolesResponse] = await Promise.all([
        api.get('/users'),
        api.get('/users/roles'),
      ])
      setUsers(usersResponse.data)
      setRoles(rolesResponse.data)
      setForm((current) => ({
        ...current,
        roleId: current.roleId || rolesResponse.data[0]?.id || '',
      }))
    } catch (requestError: any) {
      setError(
        requestError.response?.data?.error ||
          'No se pudieron cargar los usuarios y roles.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsCreating(true)
    setError('')
    setNotice('')
    try {
      await api.post('/users', form)
      setForm({ ...initialForm, roleId: roles[0]?.id || '' })
      setNotice('Usuario creado.')
      await loadData()
    } catch (requestError: any) {
      setError(
        requestError.response?.data?.error || 'No se pudo crear el usuario.',
      )
    } finally {
      setIsCreating(false)
    }
  }

  const updateUser = async (target: ManagedUser, changes: object) => {
    setUpdatingUserId(target.id)
    setError('')
    setNotice('')
    try {
      const response = await api.patch(`/users/${target.id}`, changes)
      setUsers((current) =>
        current.map((item) => (item.id === target.id ? response.data : item)),
      )
      setNotice(`Cambios guardados para ${target.email}.`)
    } catch (requestError: any) {
      setError(
        requestError.response?.data?.error ||
          `No se pudo actualizar ${target.email}.`,
      )
    } finally {
      setUpdatingUserId(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 px-5 py-4">
        <div>
          <Link
            to="/dashboard"
            className="mb-2 inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Volver al dashboard
          </Link>
          <h1 className="text-lg font-semibold text-white">Usuarios y roles</h1>
        </div>
        <span className="text-xs text-slate-400">Administración</span>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-5 py-7">
        {error && (
          <div
            role="alert"
            className="flex items-center justify-between gap-4 border-l-2 border-rose-400 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
          >
            <span>{error}</span>
            <button
              onClick={() => void loadData()}
              aria-label="Reintentar carga de usuarios"
              className="inline-flex items-center gap-2 text-xs font-medium hover:text-white"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Reintentar
            </button>
          </div>
        )}
        {notice && (
          <p
            role="status"
            className="border-l-2 border-emerald-400 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
          >
            {notice}
          </p>
        )}

        <section aria-labelledby="create-user-heading">
          <div className="mb-4 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-sky-400" />
            <h2
              id="create-user-heading"
              className="text-sm font-semibold text-white"
            >
              Crear usuario
            </h2>
          </div>
          <form
            onSubmit={handleCreate}
            className="grid grid-cols-1 gap-3 border-y border-slate-800 py-4 sm:grid-cols-2 lg:grid-cols-5"
          >
            <input
              aria-label="Nombre"
              required
              value={form.firstName}
              onChange={(event) =>
                setForm({ ...form, firstName: event.target.value })
              }
              placeholder="Nombre"
              className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
            />
            <input
              aria-label="Apellido"
              required
              value={form.lastName}
              onChange={(event) =>
                setForm({ ...form, lastName: event.target.value })
              }
              placeholder="Apellido"
              className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
            />
            <input
              aria-label="Correo electrónico"
              type="email"
              required
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
              placeholder="correo@empresa.com"
              className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
            />
            <input
              aria-label="Contraseña inicial"
              type="password"
              minLength={12}
              maxLength={128}
              required
              value={form.password}
              onChange={(event) =>
                setForm({ ...form, password: event.target.value })
              }
              placeholder="Contraseña inicial (12+ caracteres)"
              className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
            />
            <div className="flex gap-2">
              <select
                aria-label="Rol del nuevo usuario"
                required
                value={form.roleId}
                onChange={(event) =>
                  setForm({ ...form, roleId: event.target.value })
                }
                className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={isCreating || roles.length === 0}
                className="inline-flex items-center gap-2 rounded bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50"
              >
                <UserPlus className="h-3.5 w-3.5" />
                {isCreating ? 'Creando...' : 'Crear'}
              </button>
            </div>
          </form>
        </section>

        <section aria-labelledby="users-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="users-heading" className="text-sm font-semibold text-white">
              Cuentas ({users.length})
            </h2>
            <button
              onClick={() => void loadData()}
              disabled={isLoading}
              aria-label="Actualizar usuarios"
              className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Actualizar
            </button>
          </div>

          <div className="overflow-x-auto border-y border-slate-800">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-slate-800 text-[11px] uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-3 font-medium">Usuario</th>
                  <th className="px-3 py-3 font-medium">Correo</th>
                  <th className="px-3 py-3 font-medium">Rol</th>
                  <th className="px-3 py-3 font-medium">Estado</th>
                  <th className="px-3 py-3 font-medium">Alta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={5}
                      role="status"
                      className="px-3 py-10 text-center text-slate-400"
                    >
                      Cargando usuarios...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-10 text-center text-slate-500"
                    >
                      No hay usuarios.
                    </td>
                  </tr>
                ) : (
                  users.map((managedUser) => {
                    const isSelf = managedUser.id === currentUser?.id
                    const isUpdating = updatingUserId === managedUser.id
                    return (
                      <tr
                        key={managedUser.id}
                        className="hover:bg-slate-900/60"
                      >
                        <td className="px-3 py-3 font-medium text-slate-200">
                          {managedUser.firstName} {managedUser.lastName}
                          {isSelf && (
                            <span className="ml-2 text-[10px] text-slate-500">
                              Tú
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-slate-400">
                          {managedUser.email}
                        </td>
                        <td className="px-3 py-3">
                          <select
                            aria-label={`Rol de ${managedUser.email}`}
                            value={managedUser.role.id}
                            disabled={isSelf || isUpdating}
                            onChange={(event) =>
                              void updateUser(managedUser, {
                                roleId: event.target.value,
                              })
                            }
                            className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 disabled:opacity-50"
                          >
                            {roles.map((role) => (
                              <option key={role.id} value={role.id}>
                                {role.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-3">
                          <label className="inline-flex items-center gap-2 text-xs text-slate-300">
                            <input
                              type="checkbox"
                              aria-label={`Cuenta activa de ${managedUser.email}`}
                              checked={managedUser.isActive}
                              disabled={isSelf || isUpdating}
                              onChange={(event) =>
                                void updateUser(managedUser, {
                                  isActive: event.target.checked,
                                })
                              }
                              className="h-4 w-4 accent-emerald-500"
                            />
                            {managedUser.isActive ? 'Activa' : 'Inactiva'}
                          </label>
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-500">
                          {managedUser.createdAt
                            ? new Date(
                                managedUser.createdAt,
                              ).toLocaleDateString()
                            : '—'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}
