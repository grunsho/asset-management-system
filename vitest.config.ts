import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // Entorno Node.js para pruebas de Backend (Middleware, Servicios, Schemas)
    environment: 'node',

    // Globals activa `describe`, `it`, `expect`, `vi` sin necesidad de importarlos
    globals: true,

    // Archivo de inicialización/setup previo a la ejecución de pruebas
    setupFiles: ['./tests/setup.ts'],

    // Inclusión de patrones de archivos de test unitarios
    include: ['tests/**/*.test.{ts,tsx}', 'src/**/*.spec.ts'],

    // Exclusión de carpetas no relevantes
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],

    // Configuración de reporte de cobertura de código
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/types/**', 'src/**/*.d.ts'],
    },
  },
  resolve: {
    // Configuración de alias de rutas
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
