import { describe, expect, it, vi } from 'vitest'
import { checkPermission } from '../../../apps/api/src/middlewares/auth-middlewares'

const createResponse = () => {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  }

  response.status.mockReturnValue(response)
  return response
}

describe('checkPermission', () => {
  it('rechaza una petición sin usuario autenticado', () => {
    const response = createResponse()
    const next = vi.fn()

    checkPermission('ASSET_READ')({} as never, response as never, next)

    expect(response.status).toHaveBeenCalledWith(401)
    expect(response.json).toHaveBeenCalledWith({
      error: 'Usuario no encontrado',
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('permite cualquier permiso a ADMIN', () => {
    const response = createResponse()
    const next = vi.fn()

    checkPermission('USER_MANAGE')(
      {
        user: { userId: 'admin-id', role: 'ADMIN', permissions: [] },
      } as never,
      response as never,
      next,
    )

    expect(next).toHaveBeenCalledOnce()
    expect(response.status).not.toHaveBeenCalled()
  })

  it('permite el permiso asignado al usuario', () => {
    const response = createResponse()
    const next = vi.fn()

    checkPermission('ASSET_UPDATE_STATUS')(
      {
        user: {
          userId: 'operator-id',
          role: 'OPERATOR',
          permissions: ['ASSET_READ', 'ASSET_UPDATE_STATUS'],
        },
      } as never,
      response as never,
      next,
    )

    expect(next).toHaveBeenCalledOnce()
    expect(response.status).not.toHaveBeenCalled()
  })

  it('rechaza el permiso que no está asignado', () => {
    const response = createResponse()
    const next = vi.fn()

    checkPermission('ASSET_UPDATE')(
      {
        user: {
          userId: 'operator-id',
          role: 'OPERATOR',
          permissions: ['ASSET_READ', 'ASSET_UPDATE_STATUS'],
        },
      } as never,
      response as never,
      next,
    )

    expect(response.status).toHaveBeenCalledWith(403)
    expect(response.json).toHaveBeenCalledWith({
      error: 'Permiso insuficiente. Requiere: ASSET_UPDATE',
    })
    expect(next).not.toHaveBeenCalled()
  })
})
