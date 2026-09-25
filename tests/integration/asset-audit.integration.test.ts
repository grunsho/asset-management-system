import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

let prisma: any
let AssetService: any
let categoryId: string
let locationId: string
let adminId: string
const createdTagCodes: string[] = []

beforeAll(async () => {
  process.env.DATABASE_URL =
    'postgresql://ams_user:ams_password@localhost:5432/ams_db?schema=public'

  const prismaModule = await import('../../apps/api/src/lib/prisma')
  const serviceModule =
    await import('../../apps/api/src/services/asset-service')
  prisma = prismaModule.prisma
  AssetService = serviceModule.AssetService

  const category = await prisma.category.findFirst({
    orderBy: { createdAt: 'asc' },
  })
  const location = await prisma.location.findFirst({
    orderBy: { createdAt: 'asc' },
  })
  const admin = await prisma.user.findFirst({
    where: { email: 'admin@ams.com' },
  })

  if (!category || !location || !admin) {
    throw new Error('La base de integración debe estar seeded antes de probar')
  }

  categoryId = category.id
  locationId = location.id
  adminId = admin.id
})

afterEach(async () => {
  if (createdTagCodes.length > 0) {
    await prisma.asset.deleteMany({
      where: { tagCode: { in: createdTagCodes } },
    })
    createdTagCodes.length = 0
  }
})

afterAll(async () => {
  await prisma.$disconnect()
})

const createTestAsset = async () => {
  const tagCode = `TEST-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  createdTagCodes.push(tagCode)

  return prisma.asset.create({
    data: {
      tagCode,
      name: 'Activo de integración',
      categoryId,
      locationId,
    },
  })
}

describe('AssetService - integración PostgreSQL', () => {
  it('persiste el cambio de estado y su auditoría', async () => {
    const asset = await createTestAsset()

    await AssetService.updateStatus({
      assetId: asset.id,
      newStatus: 'IN_MAINTENANCE',
      userId: adminId,
      reason: 'Prueba de integración',
    })

    const updatedAsset = await prisma.asset.findUnique({
      where: { id: asset.id },
    })
    const logs = await prisma.assetLog.findMany({
      where: { assetId: asset.id },
    })

    expect(updatedAsset.status).toBe('IN_MAINTENANCE')
    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject({
      userId: adminId,
      previousStatus: 'OPERATIONAL',
      newStatus: 'IN_MAINTENANCE',
      reason: 'Prueba de integración',
    })
  })

  it('revierte el cambio de estado si falla la creación de auditoría', async () => {
    const asset = await createTestAsset()
    const missingUserId = '00000000-0000-0000-0000-000000000000'

    await expect(
      AssetService.updateStatus({
        assetId: asset.id,
        newStatus: 'OUT_OF_SERVICE',
        userId: missingUserId,
        reason: 'Debe revertirse',
      }),
    ).rejects.toThrow()

    const unchangedAsset = await prisma.asset.findUnique({
      where: { id: asset.id },
    })
    const logs = await prisma.assetLog.findMany({
      where: { assetId: asset.id },
    })

    expect(unchangedAsset.status).toBe('OPERATIONAL')
    expect(logs).toHaveLength(0)
  })
})
