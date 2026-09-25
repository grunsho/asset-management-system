import { vi, beforeEach } from 'vitest'

// Variables de entorno ficticias requeridas para evitar errores de inicialización
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-secret-key-123456'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-123456'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb'

// Resetaer automáticamente las llamadas e implementaciones de vi.fn() entre tests
beforeEach(() => {
  vi.clearAllMocks()
})
