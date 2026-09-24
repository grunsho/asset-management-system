Para transformar este roadmap en la guía definitiva de desarrollo —el estándar que regirá toda la arquitectura, reglas de negocio y entregables antes de escribir la primera línea de código— estructuraremos la documentación técnica en dos partes:

1. `AGENTS.md` / *Guía de Principios y Convenciones Globales del Proyecto*: El manifiesto con el contrato técnico, decisiones de arquitectura, estructura de carpetas y estándares de código.

2. **Roadmap Detallado Fase por Fase**: La especificación profunda de cada etapa con su propósito, integración, herramientas y entregables concretos.

---

# Parte 1: Documentación Base (`AGENTS.md`)

# AGENTS.md — Asset Management System (EAM/CMMS MVP)

## 1. Visión General del Proyecto

Plataforma SaaS de Gestión de Activos Físicos y Mantenimiento Operacional orientada a entornos industriales/corporativos. Incluye control de acceso basado en roles (RBAC), trazabilidad del historial de activos y un dashboard de métricas en tiempo real.

## 2. Arquitectura de Software

- **Modelo:** Arquitectura en capas (Controller - Service - Repository / Model) con separación estricta entre Frontend (SPA/SSR) y Backend (REST API / WebSockets).

- **Comunicación:** RESTful JSON API para operaciones CRUD y HTTP/WebSockets (Socket.io) para eventos de actualización en tiempo real.

- **Seguridad:** Autenticación Stateless basada en JWT (Access Token en memoria/cabecera Authorization; Refresh Token en Cookie HTTP-Only + SameSite).

## 3. Estándares y Convenciones de Código

- **Lenguaje:** TypeScript estricto en todo el proyecto (`"strict": true` en `tsconfig.json`).

- **Nombres de Archivos:** `kebab-case` para archivos e infraestructura (ej. `asset-controller.ts`, `auth-middleware.ts`).

- **Nombrado de Componentes / Clases:** `PascalCase` (ej. `AssetCard.tsx`, `AssetService.ts`).

- **Nombrado de Variables / Funciones:** `camelCase` (ej. `getAssetById`, `isUserAuthorized`).

- **Commits:** Convenciones de Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`).

## 4. Estructura de Repositorio (Monorepo o Decoupled Layout)

```text

/

├── apps/

│   ├── web/                  # Frontend React + TypeScript

│   └── api/                  # Backend Node.js / NestJS o Express + TypeScript

├── packages/

│   └── shared/               # DTOs, Tipos TypeScript compartidos, Esquemas de Zod

├── docker-compose.yml        # Orquestación de servicios locales (API, Web, PostgreSQL, Redis)

└── README.md

```

## 5. Reglas de Negocio Inmutables

1. **Unicidad de Activo:** El `tag_code` (Código de Placa/Activo) debe ser único en la base de datos.

2. **Auditoría Obligatoria:** Ninguna actualización de estado de un activo (`OPERATIONAL`, `IN_MAINTENANCE`, `OUT_OF_SERVICE`) puede ejecutarse sin generar automáticamente un registro en la tabla `asset_logs` vinculado al ID del usuario que realizó la acción.

3. **Restricción de RBAC:**

* `ADMIN`: Control total (CRUD usuarios, roles, activos, reportes).

* `OPERATOR`: Lectura global de activos, actualización de estados de activos y gestión de órdenes de trabajo. No puede eliminar activos ni cambiar roles.

* `VIEWER`: Lectura exclusiva de activos y reportes. Sin permisos de modificación.  

# Parte 2: Roadmap Detallado de Desarrollo

## Fase 1: Arquitectura de Base de Datos, Entorno Docker y Autenticación RBAC

### 1. Idea de la Sección
Establecer los cimientos del proyecto configurando la infraestructura de desarrollo mediante contenedores, el esquema relacional de la base de datos y la capa de autenticación/autorización robusta con tokens y roles.

### 2. Cómo ayuda a la totalidad del proyecto

Otorga estabilidad desde el día uno. Evita inconsistencias de entornos ("en mi máquina funciona") mediante Docker y asegura que toda la aplicación respete el control de acceso (RBAC) desde el primer endpoint desarrollado, garantizando la seguridad sin parches posteriores.

### 3. Herramientas y Stack

* **Infraestructura:** Docker, `docker-compose`.

* **Base de datos:** PostgreSQL 16.

* **ORM / Migraciones:** Prisma ORM o TypeORM (Node.js/TS).

* **Validación & Seguridad:** JSON Web Tokens (`jsonwebtoken`), `bcrypt` para hashing de contraseñas, `Zod` para validación de esquemas de datos.

### 4. Entregables y Resultados Esperados

* Contenedor de PostgreSQL y Redis corriendo localmente vía `docker-compose up`.

* Script de migraciones ejecutado exitosamente con las tablas base: `users`, `roles`, `permissions`, `role_permissions`.

* Seeds de base de datos con roles por defecto (`ADMIN`, `OPERATOR`, `VIEWER`) y un usuario administrador inicial.

* Endpoints funcionales:

  * `POST /api/v1/auth/login` (retorna Access Token y establece Cookie con Refresh Token).
  * `POST /api/v1/auth/refresh` (renovación de token).
  * `GET /api/v1/auth/me` (retorna el perfil y los permisos del usuario autenticado).

* Middleware de Express/NestJS `checkPermission('ASSET_READ')` probado con tests unitarios.

---

## Fase 2: Módulo Core de Activos (Asset Management) y Audit Trail

### 1. Idea de la Sección

Implementar la lógica de negocio central de la aplicación: la creación, actualización, categorización y seguimiento de activos físicos, incluyendo la trazabilidad histórica de sus cambios de estado.

### 2. Cómo ayuda a la totalidad del proyecto

Representa el corazón del dominio del negocio (EAM/CMMS). Permite la manipulación de datos estructurados complejos y garantiza que el sistema cumpla con normativas de auditoría operativa al registrar cada interacción.

### 3. Herramientas y Stack

* **Backend:** Node.js + TypeScript (Express / NestJS).

* **Base de Datos:** PostgreSQL (Tablas `assets`, `categories`, `locations`, `asset_logs`).

* **Documentación API:** OpenAPI / Swagger (`swagger-ui-express`).

* **Testing:** Jest o Vitest para pruebas de integración de los endpoints.

### 4. Entregables y Resultados Esperados

* Tablas de base de datos creadas: `assets`, `categories`, `locations` y `asset_logs`.

* API RESTful con endpoints protegidos por RBAC:

 * `GET /api/v1/assets` (incluye filtros por `status`, `category_id`, `location_id`, paginación y búsqueda por texto en `tag_code` o `name`).

 * `POST /api/v1/assets` (creación de activo; requiere rol `ADMIN`).
 * `GET /api/v1/assets/:id` (detalle completo con historial de logs adjunto).
 * `PATCH /api/v1/assets/:id/status` (cambio de estado que dispara una transacción atómica SQL: actualiza el estado en `assets` e inserta el registro en `asset_logs`).

* Swagger UI disponible en `/api/docs` probando cada endpoint con sus esquemas DTO.

---

## Fase 3: Frontend Base, Sistema de Diseño y Consumo de API (RBAC)

### 1. Idea de la Sección

Construir la interfaz de usuario web, la gestión de estado de autenticación global, el enrutamiento protegido según el rol del usuario y las pantallas de gestión de activos.

### 2. Cómo ayuda a la totalidad del proyecto

Transforma las APIs del backend en una herramienta operativa usable. Al conectar la capa de presentación con el sistema de permisos, garantiza que la experiencia de usuario sea coherente y segura visualmente (ocultando acciones no autorizadas).

### 3. Herramientas y Stack

* **Framework:** React 19 + TypeScript (Vite o Next.js App Router).

* **Estilos & UI:** Tailwind CSS v4, `shadcn/ui` (Tabla de datos, Modales, Formulario, Badges de estado).

* **Gestión de Estado & Data Fetching:** Redux Toolkit + RTK Query (o TanStack Query / Axios).

* **Formularios & Validación:** React Hook Form + Zod.



### 4. Entregables y Resultados Esperados

* Pantalla de **Login** funcional con persistencia de sesión segura.

* **Layout Principal** con barra de navegación lateral y encabezado con perfil de usuario activo.

* **Guards / Rutas Protegidas:** Redirección automática si un usuario no autenticado o sin rol intenta ingresar a `/admin` o `/assets/new`.

* **Vista de Tabla de Activos (`/assets`):**

 * Paginación en servidor, filtros dinámicos por estado/categoría y barra de búsqueda.

 * Botones contextuales según rol (ej: el botón "Eliminar" o "Editar" solo es visible para `ADMIN`).

* **Modal / Formulario de Creación y Cambio de Estado de Activos** con validaciones visuales en tiempo real.

---

## Fase 4: Módulo de Reportes y Eventos en Tiempo Real (WebSockets + Dashboard)

### 1. Idea de la Sección

Desarrollar el panel de control ejecutivo con indicadores KPI visuales y la infraestructura para empujar actualizaciones instantáneas a los clientes conectados cuando el estado de un activo cambie en cualquier punto del sistema.

### 2. Cómo ayuda a la totalidad del proyecto

Otorga el factor de alto impacto diferenciador (Real-time & Analytics). Demuestra capacidad para manejar sistemas concurrentes, arquitecturas orientadas a eventos y renderizado optimizado en el frontend.

### 3. Herramientas y Stack

* **Servicios Real-Time:** Socket.io (o WebSockets nativos) / Redis Pub/Sub para propagación de eventos.

* **Gráficos & Métricas:** Recharts o Chart.js.

* **Exportación de Datos:** `exceljs` o `pdfmake` en backend para generación de reportes descargables.

### 4. Entregables y Resultados Esperados

* Gateway de WebSockets configurado en el backend con autenticación basada en JWT.

* Integración del cliente de WebSockets en React para escuchar eventos (`ASSET_STATUS_UPDATED`).

* **Dashboard Principal (`/dashboard`):**

 * Tarjetas KPI: % Activos Operativos, Activos en Mantenimiento, Mantenimientos Críticos.

 * Gráfico de Torta / Donut: Distribución de activos por estado.

 * Gráfico de Barras: Activos por ubicación/planta.

* **Efecto Real-time:** Si el Usuario A cambia el estado de un activo en una ventana/dispositivo, la gráfica y el contador del Usuario B se actualizan en pantalla automáticamente sin recargar la página.

* Endpoint `GET /api/v1/reports/export?format=csv` funcional para descargar el inventario filtrado.



---



## Fase 5: Dockerización de Producción, CI/CD y Despliegue Cloud



### 1. Idea de la Sección

Empaquetar la aplicación en imágenes de Docker optimizadas para producción, configurar un pipeline de integración continua que ejecute validaciones automáticas y desplegar la solución en una plataforma Cloud accesible mediante un enlace público.



### 2. Cómo ayuda a la totalidad del proyecto

Demuestra que el candidato posee mentalidad de ingeniería end-to-end (DevOps/Cloud Ready), entregando un producto funcionando en producción que cualquier reclutador o líder técnico puede probar inmediatamente.



### 3. Herramientas y Stack

* **CI/CD:** GitHub Actions.

* **Contenedores de Producción:** Multi-stage Dockerfiles (`node:alpine` / Nginx).

* **Hosting / Cloud:** Render, Railway o AWS (EC2/ECS) para API + DB; Vercel o Netlify para el Frontend.

* **SSL & Dominio:** HTTPS mediante Let's Encrypt / Cloudflare.



### 4. Entregables y Resultados Esperados

* `Dockerfile.frontend` y `Dockerfile.backend` configurados con builds multietapa (reduciendo el tamaño de la imagen a producción al mínimo).

* Pipeline `.github/workflows/ci.yml` que en cada `push` a `main`:

&#x20; 1. Instale dependencias.

&#x20; 2. Pase el Linter (`eslint`).

&#x20; 3. Compile TypeScript (`tsc --noEmit`).

&#x20; 4. Ejecute tests unitarios/integración.

* Entornos de despliegue configurados con variables de entorno de producción (`NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`).

* **Proyecto en Vivo:** URL accesible del Frontend con certificado SSL (HTTPS) con la app funcional conectada al backend y base de datos de producción.



---

## Fase 6: Prioridades de Producto y Optimización del Sistema (Roadmap de mejoras inmediatas)

### 1. Idea de la Sección

Consolidar la propuesta de valor del producto y cerrar la brecha entre la MVP funcional y una herramienta operativa de mantenimiento industrial real, mejorando la gestión del activo, la visibilidad ejecutiva y la sostenibilidad técnica del código.

### 2. Qué se prioriza en esta fase

1. **Gestión operativa avanzada de activos**
   - Edición y eliminación real de activos desde el dashboard.
   - Historial detallado de cambios por activo.
   - Filtros por categoría, ubicación, estado y fecha.
   - Workflow de cambio de estado con motivo y observaciones.

2. **Analytics y dashboard ejecutivos**
   - KPIs clave por zona, categoría y estado del activo.
   - Gráficos con Recharts para tendencias y distribución.
   - Vista resumida para liderazgo o supervisión operativa.
   - Reportes exportables mejorados con filtros aplicados.

3. **Optimización y crecimiento técnico**
   - Middleware de errores global y respuestas API normalizadas.
   - Refactor de servicios y validaciones para evitar duplicación.
   - Mejora del control de permisos y consistencia del RBAC.
   - Test unitarios e integración para rutas críticas.
   - Linting y formatter para mantener calidad del código.

### 3. Resultado esperado

La aplicación deja de verse como un prototipo funcional y pasa a operar como una plataforma de gestión de activos con valor real para mantenimiento, supervisión y toma de decisiones. Además, el código queda preparado para escalar sin degradar la calidad ni la mantenibilidad.

### 4. Orden recomendado de ejecución

* *Paso 1:* Gestionar plenamente la operación del activo (edición, historial, filtros y cambio de estado con auditoría).
* *Paso 2:* Añadir métricas y dashboard ejecutivo con visualización de datos.
* *Paso 3:* Reforzar la base técnica del sistema (errores, tests, validaciones y organización del código).

---