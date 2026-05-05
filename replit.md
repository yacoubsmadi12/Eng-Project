# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Project: Z Route Master

A field operations routing management system for telecom/utility sites.

### Artifacts
- **`artifacts/zroute`** — React + Vite frontend (preview path: `/`)
- **`artifacts/api-server`** — Express 5 backend (preview path: `/api`)
- **`artifacts/mockup-sandbox`** — Component prototyping (preview path: `/__mockup`)

### Frontend (`artifacts/zroute`)
- `src/lib/api.ts` — Typed API client (fetch-based, credentials included)
- `src/context/auth.tsx` — Auth context (login, logout, session check on load)
- `src/pages/login.tsx` — Login page (redirects to dashboard on success)
- `src/pages/dashboard.tsx` — Plans view with search; admin badge + link to admin panel
- `src/pages/admin.tsx` — Admin panel: user management + bulk JSON data upload

### Backend (`artifacts/api-server`)
- `src/routes/auth.ts` — Login/logout/me with express-session + pg store
- `src/routes/sites.ts` — Sites CRUD (list, bulk upload, clear)
- `src/routes/plans.ts` — Plans CRUD (list filtered by role, bulk, update, delete)
- `src/routes/users.ts` — Admin-only user management (list, create, delete)

### Auth
- Admin credentials: `ADMIN_USER` / `ADMIN_PASS` env vars (defaults: `Adm.Zain` / `Zain@1202`)
- Regular users stored in DB with `username`, `password`, `displayName`, `plannerName`, `role`
- Sessions stored in PostgreSQL (`user_sessions` table)
- Role-based plan filtering: admins see all plans, users see only their own (matched by `plannerName`)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
