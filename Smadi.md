# Z Route Master — Workspace

## Stack

- **Monorepo**: pnpm workspaces
- **Node.js**: 20+
- **TypeScript**: 5.9
- **API**: Express 5 + express-session (pg store)
- **Database**: PostgreSQL + Drizzle ORM
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui

## Artifacts

| Artifact | Path | Description |
|---|---|---|
| `artifacts/zroute` | `/` | React + Vite frontend |
| `artifacts/api-server` | `/api` | Express 5 backend |
| `artifacts/mockup-sandbox` | `/__mockup` | Component prototyping |

## Role System

| Role | Access |
|---|---|
| **admin** | Everything: upload sites, manage users, generate & save plans, export |
| **user** | Generate plans (New Sites + Plan File) & save own plans, see own plans only |
| **viewer** | See ALL plans + export Excel — cannot save new plans |

- Admin is seeded into DB (`Adm.Zain` / `Zain@1202`)
- Admin account cannot be deleted
- Sites upload/clear: admin only
- Plans append: admin + user roles
- Plan list: admin/viewer see all; user sees only plans matching their plannerName

## Key Files

### Frontend (`artifacts/zroute/src`)
- `lib/api.ts` — Typed fetch client (credentials: include)
- `context/auth.tsx` — Auth context (session check on load)
- `pages/login.tsx` — Login page
- `pages/dashboard.tsx` — Plans dashboard with search + export
- `pages/admin.tsx` — Admin panel: user management + data upload/clear
- `pages/generate.tsx` — Generate Smart Team Plans (k-means clustering)
- `lib/planning.ts` — Geographic clustering algorithm (k-means + nearest-neighbor)
- `lib/export.ts` — Excel export (single plan + all plans)

### Backend (`artifacts/api-server/src`)
- `routes/auth.ts` — Login/logout/me (all from DB)
- `routes/sites.ts` — Sites CRUD (bulk upload, list, clear — upload/clear admin only)
- `routes/plans.ts` — Plans CRUD (role-filtered list, append, update, delete, clear)
- `routes/users.ts` — Admin-only user management (admin protected from deletion)

## Database Tables

- `users` — username, password (plaintext), display_name, planner_name, role
- `sites` — site_id, name, lat, lng, gov + many metadata fields
- `plans` — client_id, team_name, planner_name, plan_name, day_groups (JSONB), site_ids
- `user_sessions` — connect-pg-simple session store

## Key Bugs Fixed

- Session not persisting → `user_sessions` table created manually (connect-pg-simple can't find table.sql when bundled)
- `createTableIfMissing: true` removed from session config
- `confirm()` dialogs blocked in Replit iframe → replaced with Dialog components
- Duplicate `sites` key in api.ts → removed
- TypeScript null index error in generate.tsx → non-null assertion added

## Deployment

See `deploy/DEPLOY.md` for full Ubuntu Server deployment guide.

Files in `deploy/`:
- `setup.sql` — DB schema + admin seed
- `.env.example` — environment variables template
- `nginx.conf` — Nginx reverse proxy config
- `docker-compose.yml` — Docker Compose alternative
- `Dockerfile.api` — API container
- `Dockerfile.web` — Frontend static container

## Key Commands

```bash
pnpm --filter @workspace/api-server run dev   # start API server
pnpm --filter @workspace/zroute run dev       # start frontend
pnpm --filter @workspace/zroute exec tsc --noEmit  # typecheck frontend
pnpm --filter @workspace/db run push          # push DB schema (dev only)
```
