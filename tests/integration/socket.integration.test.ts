import { io as createClient, Socket } from 'socket.io-client'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

let httpServer: any
let prisma: any
let AssetService: any
let generateAccessToken: any
let getIO: any
let serverUrl: string
let adminId: string
let categoryId: string
let locationId: string
let assetId: string | undefined

beforeAll(async () => {
  process.env.DATABASE_URL =
    'postgresql://ams_user:ams_password@localhost:5432/ams_db?schema=public'

  const indexModule = await import('../../apps/api/src/index')
  const prismaModule = await import('../../apps/api/src/lib/prisma')
  const serviceModule =
    await import('../../apps/api/src/services/asset-service')
  const jwtModule = await import('../../apps/api/src/lib/jwt')
  const socketModule = await import('../../apps/api/src/lib/socket')

  httpServer = indexModule.httpServer
  prisma = prismaModule.prisma
  AssetService = serviceModule.AssetService
  generateAccessToken = jwtModule.generateAccessToken
  getIO = socketModule.getIO

  const admin = await prisma.user.findUnique({
    where: { email: 'admin@ams.com' },
  })
  const category = await prisma.category.findFirst({
    orderBy: { createdAt: 'asc' },
  })
  const location = await prisma.location.findFirst({
    orderBy: { createdAt: 'asc' },
  })

  if (!admin || !category || !location) {
    throw new Error('La base de integración debe estar seeded antes de probar')
  }

  adminId = admin.id
  categoryId = category.id
  locationId = location.id

  await new Promise<void>((resolve) => {
    httpServer.listen(0, '127.0.0.1', () => resolve())
  })
  const address = httpServer.address()
  if (!address || typeof address === 'string') {
    throw new Error('No se pudo obtener el puerto del servidor de integración')
  }
  serverUrl = `http://127.0.0.1:${address.port}`
})

afterEach(async () => {
  if (assetId) {
    await prisma.asset.delete({ where: { id: assetId } }).catch(() => undefined)
    assetId = undefined
  }
})

afterAll(async () => {
  getIO().close()
  await new Promise<void>((resolve) => httpServer.close(() => resolve()))
  await prisma.$disconnect()
})

const connect = (token?: string) => {
  const client = createClient(serverUrl, {
    autoConnect: true,
    auth: token ? { token } : undefined,
    reconnection: false,
  })

  return new Promise<Socket>((resolve, reject) => {
    client.once('connect', () => resolve(client))
    client.once('connect_error', (error) => {
      client.close()
      reject(error)
    })
  })
}

describe('Socket.io - integración de autenticación y eventos', () => {
  it('rechaza una conexión sin token', async () => {
    await expect(connect()).rejects.toThrow('Token no proporcionado')
  })

  it('rechaza una conexión con token inválido', async () => {
    await expect(connect('invalid-token')).rejects.toThrow(
      'Token inválido o expirado',
    )
  })

  it('permite conectar y recibir eventos a un usuario autorizado', async () => {
    const token = generateAccessToken({
      userId: adminId,
      role: 'ADMIN',
      permissions: [],
    })
    const client = await connect(token)
    const eventPromise = new Promise<any>((resolve) => {
      client.once('asset:created', resolve)
    })

    const tagCode = `SOCKET-${Date.now()}`
    const asset = await AssetService.createAsset({
      tagCode,
      name: 'Activo Socket de integración',
      categoryId,
      locationId,
    })
    assetId = asset.id

    const receivedAsset = await eventPromise

    expect(receivedAsset).toMatchObject({
      id: asset.id,
      tagCode,
      name: 'Activo Socket de integración',
    })
    client.close()
  })
})
