# Physical Asset Management System (SaaS)

Sistema modular y escalable para la gestión de activos físicos, mantenimiento industrial y trazabilidad operativa. Desarrollado sobre una arquitectura de **Monorrepo** moderna, desacoplada y orientada a eventos en tiempo real.

---

## 🛠️ Tech Stack & Arquitectura

### Monorepo & Herramientas
- **Package Manager**: npm workspaces (`apps/*`, `packages/*`).
- **Lenguaje**: TypeScript (v5.5+) con configuración de path mapping estricto (`paths` sin `baseUrl`).
- **Orquestación local**: Docker & Docker Compose para servicios de infraestructura (PostgreSQL, Redis).

### Backend (`apps/api`)
- **Runtime**: Node.js + Express.
- **ORM / Database**: Prisma v6 + PostgreSQL.
- **Cache & Pub/Sub**: Redis.
- **Real-Time Engine**: Socket.io.
- **Autenticación & Seguridad**: JWT Stateless, Refresh Tokens en cookies HTTP-Only, RBAC dinámico respaldado por BD, `bcryptjs`.
- **Validación de Datos**: Zod.

### Frontend (`apps/web`)
- **Framework**: React 19 + Vite.
- **Estilos**: Tailwind CSS v4 con integración `@tailwindcss/postcss`.
- **Estado & Red**: Axios con interceptores automáticos para renovación de sesiones (Refresh Token Flow), Context API.
- **Navegación**: React Router DOM v6.

---

## 📁 Estructura del Monorrepo

```text
.
├── apps/
│   ├── api/                  # Backend Node.js / Express
│   │   ├── prisma/           # Schemas, migraciones y seeders de la BD
│   │   └── src/
│   │       ├── controllers/
│   │       ├── lib/          # Clientes de Prisma, Redis y utilidades JWT
│   │       ├── middlewares/  # Autenticación y control de acceso (RBAC)
│   │       ├── routes/       # Definición de endpoints REST
│   │       └── index.ts      # Servidor HTTP y Socket.io
│   └── web/                  # Frontend React 19 + Vite
│       ├── src/
│       │   ├── components/   # Componentes reutilizables y Guards (ProtectedRoute)
│       │   ├── context/      # Proveedores de estado global (AuthContext)
│       │   ├── lib/          # Cliente Axios e instancias de Socket.io
│       │   ├── pages/        # Pantallas (LoginPage, DashboardPage, etc.)
│       │   └── App.tsx
│       └── vite.config.ts
├── packages/
│   └── shared/               # DTOs, interfaces y tipos TypeScript compartidos
├── AGENTS.md                 # Convenciones técnicas y restricciones para LLMs/Agentes
└── README.md
```
---

## 🚀 Guía de Instalación y Configuración Local

### 1. Requisitos Previos
- **Node.js**: v18.x o superior
- **npm**: v9.x o superior
- **Docker & Docker Compose** (para PostgreSQL y Redis local)

### 2. Clonar el repositorio e instalar dependencias

`git clone <URL_DEL_REPOSITORIO>`  
`cd asset-management-system`  
`npm install`

### 3. Configuración de Variables de Entorno

Crea el archivo `.env` dentro de `apps/api/` con el siguiente contenido:

```
PORT=4000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/asset_management?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="desarrollo_jwt_access_secret_123"
REFRESH_TOKEN_SECRET="desarrollo_jwt_refresh_secret_123"
```

### 4. Base de Datos & Migraciones

Levanta PostgreSQL en Docker desde la raíz:
`docker-compose up -d`

Ejecuta las migraciones y el seeder dentro de `apps/api`:  

`cd apps/api`  
`npx prisma migrate dev`  
`npx prisma db seed`

---

## 💻 Ejecución en Desarrollo

**Levantar la API (Backend):**
`npm run dev --workspace=apps/api`
(Disponible en http://localhost:4000)

**Levantar la Aplicación Web (Frontend):**
`npm run dev --workspace=apps/web`
(Disponible en http://localhost:3000)

---

## 🔑 Credenciales por Defecto (Entorno de Desarrollo)

| Rol | Correo Electrónico | Contraseña |
| :--- | :--- | :--- |
| **Administrador (Full RBAC)** | admin@ams.com | Admin123! |

⚠️ Nota de Seguridad: Credenciales exclusivas para pruebas locales en entornos de desarrollo.

---

## 📌 Reglas de Desarrollo & Convenciones

Antes de realizar cambios arquitectónicos o agregar librerías nativas, consulta el archivo AGENTS.md, el cual documenta las restricciones del proyecto (uso obligatorio de bcryptjs, prevención de hoisting de Prisma en monorrepos y configuración de Tailwind CSS v4).