import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findUser: vi.fn(),
  verifyAccessToken: vi.fn(),
}))

vi.mock('../../../apps/api/src/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: mocks.findUser,
    },
  },
}))

vi.mock('../../../apps/api/src/lib/jwt', () => ({
  verifyAccessToken: mocks.verifyAccessToken,
}))

import { authenticateToken } from '../../../apps/api/src/middlewares/auth-middlewares'

const createResponse = () => {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  }

  response.status.mockReturnValue(response)
  return response
}

describe('authenticateToken', () => {
  beforeEach(() => {
    mocks.findUser.mockReset()
    mocks.verifyAccessToken.mockReset()
  })

  it('rechaza la petición cuando no hay token', async () => {
    const response = createResponse()
    const next = vi.fn()

    await authenticateToken({ headers: {} } as never, response as never, next)

    expect(response.status).toHaveBeenCalledWith(401)
    expect(mocks.verifyAccessToken).not.toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })

  it('rechaza un token inválido', async () => {
    const response = createResponse()
    const next = vi.fn()
    mocks.verifyAccessToken.mockImplementation(() => {
      throw new Error('invalid token')
    })

    await authenticateToken(
      { headers: { authorization: 'Bearer invalid-token' } } as never,
      response as never,
      next,
    )

    expect(response.status).toHaveBeenCalledWith(403)
    expect(response.json).toHaveBeenCalledWith({
      error: 'Token inválido o expirado',
      code: 'TOKEN_INVALID',
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('rechaza un usuario inactivo aunque el token sea válido', async () => {
    const response = createResponse()
    const next = vi.fn()
    mocks.verifyAccessToken.mockReturnValue({
      userId: 'inactive-id',
      role: 'OPERATOR',
    })
    mocks.findUser.mockResolvedValue({ isActive: false })

    await authenticateToken(
      { headers: { authorization: 'Bearer valid-token' } } as never,
      response as never,
      next,
    )

    expect(response.status).toHaveBeenCalledWith(403)
    expect(response.json).toHaveBeenCalledWith({
      error: 'Usuario inactivo o no encontrado',
      code: 'USER_INACTIVE',
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('carga los permisos actuales desde la base de datos', async () => {
    const response = createResponse()
    const next = vi.fn()
    mocks.verifyAccessToken.mockReturnValue({
      userId: 'operator-id',
      role: 'ADMIN',
      permissions: ['USER_MANAGE'],
    })
    mocks.findUser.mockResolvedValue({
      id: 'operator-id',
      isActive: true,
      role: {
        name: 'OPERATOR',
        permissions: [
          { permission: { code: 'ASSET_READ' } },
          { permission: { code: 'ASSET_UPDATE_STATUS' } },
        ],
      },
    })
    const request = {
      headers: { authorization: 'Bearer valid-token' },
    } as never

    await authenticateToken(request, response as never, next)

    expect(request.user).toEqual({
      userId: 'operator-id',
      role: 'OPERATOR',
      permissions: ['ASSET_READ', 'ASSET_UPDATE_STATUS'],
    })
    expect(next).toHaveBeenCalledOnce()
  })

  it('propaga errores de base de datos en vez de tratarlos como token inválido', async () => {
    const response = createResponse()
    const next = vi.fn()
    const databaseError = new Error('database unavailable')
    mocks.verifyAccessToken.mockReturnValue({
      userId: 'operator-id',
      role: 'OPERATOR',
    })
    mocks.findUser.mockRejectedValue(databaseError)

    await authenticateToken(
      { headers: { authorization: 'Bearer valid-token' } } as never,
      response as never,
      next,
    )

    expect(next).toHaveBeenCalledWith(databaseError)
    expect(response.status).not.toHaveBeenCalled()
  })
})
