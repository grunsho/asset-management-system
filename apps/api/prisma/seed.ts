import { PrismaClient, RoleName } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando script de Seeding...')

  // 1. Crear permisos base
  const permissionsData = [
    {
      code: 'ASSET_READ',
      description: 'Permite visualizar activos y reportes',
    },
    { code: 'ASSET_CREATE', description: 'Permite crear nuevos activos' },
    {
      code: 'ASSET_UPDATE',
      description: 'Permite editar información de activos',
    },
    {
      code: 'ASSET_UPDATE_STATUS',
      description: 'Permite actualizar el estado de un activo',
    },
    {
      code: 'ASSET_DELETE',
      description: 'Permite eliminar activos del sistema',
    },
    { code: 'USER_MANAGE', description: 'Permite gestionar usuarios y roles' },
  ]

  const permissions: Record<string, string> = {}
  for (const perm of permissionsData) {
    const created = await prisma.permission.upsert({
      where: { code: perm.code },
      update: {},
      create: perm,
    })
    permissions[perm.code] = created.id
  }

  // 2. Crear roles base
  const rolesData = [
    { name: RoleName.ADMIN, description: 'Control total del sistema' },
    {
      name: RoleName.OPERATOR,
      description: 'Lectura y actualización de estados de activos',
    },
    {
      name: RoleName.VIEWER,
      description: 'Acceso de solo lectura a activos y reportes',
    },
  ]

  const roles: Record<RoleName, string> = {} as any
  for (const roleDef of rolesData) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: {},
      create: roleDef,
    })
    roles[roleDef.name] = role.id
  }

  // 3. Asignar permisos a roles
  const rolePermissionsMap: Record<RoleName, string[]> = {
    [RoleName.ADMIN]: [
      'ASSET_READ',
      'ASSET_CREATE',
      'ASSET_UPDATE',
      'ASSET_UPDATE_STATUS',
      'ASSET_DELETE',
      'USER_MANAGE',
    ],
    [RoleName.OPERATOR]: ['ASSET_READ', 'ASSET_UPDATE_STATUS'],
    [RoleName.VIEWER]: ['ASSET_READ'],
  }

  for (const [roleName, permCodes] of Object.entries(rolePermissionsMap)) {
    const roleId = roles[roleName as RoleName]
    const permissionIds = permCodes.map((code) => permissions[code])

    await prisma.rolePermission.deleteMany({
      where: {
        roleId,
        permissionId: { notIn: permissionIds },
      },
    })

    for (const code of permCodes) {
      const permissionId = permissions[code]
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId, permissionId },
        },
        update: {},
        create: { roleId, permissionId },
      })
    }
  }

  // 4. Crear usuario Admin inicial
  const adminEmail =
    process.env.ADMIN_EMAIL ||
    (process.env.NODE_ENV === 'production' ? undefined : 'admin@ams.com')
  const adminPassword =
    process.env.ADMIN_PASSWORD ||
    (process.env.NODE_ENV === 'production' ? undefined : 'Admin123!')

  if (!adminEmail || !adminPassword) {
    throw new Error(
      'Set ADMIN_EMAIL and ADMIN_PASSWORD before seeding in production',
    )
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 12)

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: hashedPassword,
      firstName: 'Admin',
      lastName: 'System',
      roleId: roles[RoleName.ADMIN],
    },
  })

  // 5. Crear Categorías y Ubicaciones Iniciales para Pruebas
  await prisma.category.upsert({
    where: { name: 'Maquinaria Pesada' },
    update: {},
    create: {
      name: 'Maquinaria Pesada',
      description: 'Equipos móviles de operación',
    },
  })

  await prisma.location.upsert({
    where: { name: 'Planta Principal' },
    update: {},
    create: {
      name: 'Planta Principal',
      description: 'Instalaciones centrales',
    },
  })

  console.log('✅ Seeding completado con éxito!')
  console.log(`👤 Usuario Admin disponible: ${adminUser.email}`)
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
