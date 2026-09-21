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