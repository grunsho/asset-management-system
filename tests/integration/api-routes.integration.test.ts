import bcrypt from 'bcryptjs'
import supertest from 'supertest'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

let api: ReturnType<typeof supertest>
let prisma: any
let categoryId: string
let locationId: string
let operatorId: string
let operatorEmail: string
let assetId: string | undefined

beforeAll(async () => {
  process.env.DATABASE_URL =
    'postgresql://ams_user:ams_password@localhost:5432/ams_db?schema=public'

  const indexModule = await import('../../apps/api/src/index')
  const prismaModule = await import('../../apps/api/src/lib/prisma')
  api = supertest(indexModule.app)
  prisma = prismaModule.prisma

  const category = await prisma.category.findFirst({
    orderBy: { createdAt: 'asc' },
  })
  const location = await prisma.location.findFirst({
    orderBy: { createdAt: 'asc' },
  })
  const operatorRole = await prisma.role.findUnique({
    where: { name: 'OPERATOR' },
  })

  if (!category || !location || !operatorRole) {
    throw new Error('La base de integración debe estar seeded antes de probar')
  }

  categoryId = category.id
  locationId = location.id
  operatorEmail = `operator-${Date.now()}@integration.test`
  const passwordHash = await bcrypt.hash('Operator123!', 10)
  const operator = await prisma.user.create({
    data: {
      email: operatorEmail,
      passwordHash,
      firstName: 'Integration',
      lastName: 'Operator',
      roleId: operatorRole.id,
    },
  })
  operatorId = operator.id
})

afterEach(async () => {
  if (assetId) {
    await prisma.asset.delete({ where: { id: assetId } }).catch(() => undefined)
    assetId = undefined
  }
})

afterAll(async () => {
  if (operatorId) {
    await prisma.user
      .delete({ where: { id: operatorId } })
      .catch(() => undefined)
  }
  await prisma.$disconnect()
})

const login = async (email: string, password: string) => {
  const response = await api
    .post('/api/v1/auth/login')
    .send({ email, password })
  expect(response.status).toBe(200)
  expect(response.body.accessToken).toEqual(expect.any(String))
  return response.body.accessToken as string
}

describe('API de activos - integración HTTP', () => {
  it('sirve Swagger UI y el documento OpenAPI', async () => {
    const docsResponse = await api.get('/api/docs/')
    const openapiResponse = await api.get('/api/docs.json')

    expect(docsResponse.status).toBe(200)
    expect(docsResponse.text).toContain('swagger-ui')
    expect(openapiResponse.status).toBe(200)
    expect(openapiResponse.body.openapi).toBe('3.0.3')
    expect(openapiResponse.body.paths['/assets']).toBeDefined()
  })

  it('permite al administrador operar un activo y consultar su historial', async () => {
    const token = await login('admin@ams.com', 'Admin123!')
    const tagCode = `HTTP-${Date.now()}`

    const createResponse = await api
      .post('/api/v1/assets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tagCode,
        name: 'Activo HTTP de integración',
        categoryId,
        locationId,
      })

    expect(createResponse.status).toBe(201)
    assetId = createResponse.body.id

    const listResponse = await api
      .get('/api/v1/assets')
      .query({ search: tagCode, page: 1, limit: 10 })
      .set('Authorization', `Bearer ${token}`)

    expect(listResponse.status).toBe(200)
    expect(listResponse.body.data).toHaveLength(1)
    expect(listResponse.body.pagination.total).toBe(1)

    const metricsResponse = await api
      .get('/api/v1/reports/metrics')
      .query({ search: tagCode })
      .set('Authorization', `Bearer ${token}`)

    expect(metricsResponse.status).toBe(200)
    expect(metricsResponse.body).toMatchObject({
      total: 1,
      operational: 1,
      operationalPercentage: 100,
      inMaintenance: 0,
      critical: 0,
    })

    const exportResponse = await api
      .get('/api/v1/reports/export')
      .query({ format: 'csv', search: tagCode })
      .set('Authorization', `Bearer ${token}`)

    expect(exportResponse.status).toBe(200)
    expect(exportResponse.type).toBe('text/csv')
    expect(exportResponse.text).toContain(tagCode)

    const statusResponse = await api
      .patch(`/api/v1/assets/${assetId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'IN_MAINTENANCE', reason: 'Prueba HTTP' })

    expect(statusResponse.status).toBe(200)

    const detailResponse = await api
      .get(`/api/v1/assets/${assetId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(detailResponse.status).toBe(200)
    expect(detailResponse.body.status).toBe('IN_MAINTENANCE')
    expect(detailResponse.body.logs).toHaveLength(1)
    expect(detailResponse.body.logs[0].reason).toBe('Prueba HTTP')

    const deleteResponse = await api
      .delete(`/api/v1/assets/${assetId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(deleteResponse.status).toBe(200)
    assetId = undefined
  })

  it('impide editar o eliminar activos a OPERATOR', async () => {
    const adminToken = await login('admin@ams.com', 'Admin123!')
    const createResponse = await api
      .post('/api/v1/assets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        tagCode: `RBAC-${Date.now()}`,
        name: 'Activo RBAC de integración',
        categoryId,
        locationId,
      })
    expect(createResponse.status).toBe(201)
    assetId = createResponse.body.id

    const operatorToken = await login(operatorEmail, 'Operator123!')

    const updateResponse = await api
      .put(`/api/v1/assets/${assetId}`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ name: 'No debe actualizarse' })

    const deleteResponse = await api
      .delete(`/api/v1/assets/${assetId}`)
      .set('Authorization', `Bearer ${operatorToken}`)

    expect(updateResponse.status).toBe(403)
    expect(deleteResponse.status).toBe(403)
  })
})
