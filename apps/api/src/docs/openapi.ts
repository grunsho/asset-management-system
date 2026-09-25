const assetStatus = {
  type: 'string',
  enum: ['OPERATIONAL', 'IN_MAINTENANCE', 'OUT_OF_SERVICE'],
}

const errorResponse = {
  type: 'object',
  properties: {
    error: { type: 'string' },
  },
}

export const openapiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Asset Management System API',
    version: '1.0.0',
    description:
      'API REST para gestión de activos físicos, RBAC y auditoría operativa.',
  },
  servers: [{ url: '/api/v1', description: 'API local o desplegada' }],
  tags: [
    { name: 'Auth', description: 'Autenticación y sesión' },
    { name: 'Assets', description: 'Gestión y auditoría de activos' },
    { name: 'Reports', description: 'Exportación de inventario' },
    { name: 'Catalogs', description: 'Categorías y ubicaciones' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      refreshCookie: {
        type: 'apiKey',
        in: 'cookie',
        name: 'refreshToken',
      },
    },
    schemas: {
      AssetStatus: assetStatus,
      Category: {
        type: 'object',
        required: ['id', 'name'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Maquinaria Pesada' },
          description: { type: 'string', nullable: true },
        },
      },
      Location: {
        type: 'object',
        required: ['id', 'name'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Planta Principal' },
          description: { type: 'string', nullable: true },
        },
      },
      AssetLog: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          assetId: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          previousStatus: { $ref: '#/components/schemas/AssetStatus' },
          newStatus: { $ref: '#/components/schemas/AssetStatus' },
          reason: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Asset: {
        type: 'object',
        required: [
          'id',
          'tagCode',
          'name',
          'status',
          'categoryId',
          'locationId',
        ],
        properties: {
          id: { type: 'string', format: 'uuid' },
          tagCode: { type: 'string', example: 'PUMP-01' },
          name: { type: 'string', example: 'Bomba hidráulica' },
          serialNumber: { type: 'string', nullable: true },
          status: { $ref: '#/components/schemas/AssetStatus' },
          categoryId: { type: 'string', format: 'uuid' },
          locationId: { type: 'string', format: 'uuid' },
          category: { $ref: '#/components/schemas/Category' },
          location: { $ref: '#/components/schemas/Location' },
          logs: {
            type: 'array',
            items: { $ref: '#/components/schemas/AssetLog' },
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      AssetPage: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/Asset' },
          },
          pagination: {
            type: 'object',
            properties: {
              total: { type: 'integer' },
              page: { type: 'integer' },
              limit: { type: 'integer' },
              totalPages: { type: 'integer' },
            },
          },
        },
      },
      Error: errorResponse,
    },
  },
  paths: {
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Iniciar sesión',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', format: 'password' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Sesión iniciada y refresh token en cookie HTTP-only',
          },
          401: { description: 'Credenciales inválidas' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Renovar access token',
        security: [{ refreshCookie: [] }],
        responses: {
          200: { description: 'Nuevo access token emitido' },
          401: { description: 'Refresh token ausente' },
          403: { description: 'Refresh token inválido' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Obtener usuario y permisos actuales',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Perfil autenticado' },
          401: { description: 'No autenticado' },
        },
      },
    },
    '/assets': {
      get: {
        tags: ['Assets'],
        summary: 'Listar activos con filtros y paginación',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100 },
          },
          { name: 'status', in: 'query', schema: assetStatus },
          {
            name: 'categoryId',
            in: 'query',
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'locationId',
            in: 'query',
            schema: { type: 'string', format: 'uuid' },
          },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Página de activos',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AssetPage' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Assets'],
        summary: 'Crear activo',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['tagCode', 'name', 'categoryId', 'locationId'],
                properties: {
                  tagCode: { type: 'string', minLength: 3 },
                  name: { type: 'string', minLength: 2 },
                  serialNumber: { type: 'string' },
                  categoryId: { type: 'string', format: 'uuid' },
                  locationId: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Activo creado' },
          403: { description: 'Permiso insuficiente' },
        },
      },
    },
    '/assets/{id}': {
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      get: {
        tags: ['Assets'],
        summary: 'Obtener detalle e historial de un activo',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Detalle del activo' },
          404: { description: 'Activo no encontrado' },
        },
      },
      put: {
        tags: ['Assets'],
        summary: 'Editar datos del activo',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Activo actualizado' },
          403: { description: 'Permiso insuficiente' },
        },
      },
      delete: {
        tags: ['Assets'],
        summary: 'Eliminar activo',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Activo eliminado' },
          403: { description: 'Permiso insuficiente' },
        },
      },
    },
    '/assets/{id}/status': {
      patch: {
        tags: ['Assets'],
        summary: 'Cambiar estado y crear auditoría',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { $ref: '#/components/schemas/AssetStatus' },
                  reason: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Estado actualizado y auditoría creada' },
          400: { description: 'Estado inválido o repetido' },
        },
      },
    },
    '/assets/{id}/logs': {
      get: {
        tags: ['Assets'],
        summary: 'Obtener historial de auditoría',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Historial del activo',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/AssetLog' },
                },
              },
            },
          },
        },
      },
    },
    '/reports/export': {
      get: {
        tags: ['Reports'],
        summary: 'Exportar inventario CSV',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'format',
            in: 'query',
            required: true,
            schema: { type: 'string', enum: ['csv'] },
          },
          { name: 'status', in: 'query', schema: assetStatus },
          {
            name: 'categoryId',
            in: 'query',
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'locationId',
            in: 'query',
            schema: { type: 'string', format: 'uuid' },
          },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          {
            name: 'fromDate',
            in: 'query',
            schema: { type: 'string', format: 'date-time' },
          },
          {
            name: 'toDate',
            in: 'query',
            schema: { type: 'string', format: 'date-time' },
          },
        ],
        responses: {
          200: {
            description: 'Archivo CSV',
            content: { 'text/csv': { schema: { type: 'string' } } },
          },
        },
      },
    },
    '/reports/metrics': {
      get: {
        tags: ['Reports'],
        summary: 'Obtener métricas globales del inventario',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: assetStatus },
          {
            name: 'categoryId',
            in: 'query',
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'locationId',
            in: 'query',
            schema: { type: 'string', format: 'uuid' },
          },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          {
            name: 'fromDate',
            in: 'query',
            schema: { type: 'string', format: 'date-time' },
          },
          {
            name: 'toDate',
            in: 'query',
            schema: { type: 'string', format: 'date-time' },
          },
        ],
        responses: {
          200: {
            description: 'Métricas agregadas por estado y ubicación',
          },
        },
      },
    },
    '/categories': {
      get: {
        tags: ['Catalogs'],
        summary: 'Listar categorías',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Categorías' } },
      },
      post: {
        tags: ['Catalogs'],
        summary: 'Crear categoría',
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: 'Categoría creada' } },
      },
    },
    '/locations': {
      get: {
        tags: ['Catalogs'],
        summary: 'Listar ubicaciones',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Ubicaciones' } },
      },
      post: {
        tags: ['Catalogs'],
        summary: 'Crear ubicación',
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: 'Ubicación creada' } },
      },
    },
  },
} as const
