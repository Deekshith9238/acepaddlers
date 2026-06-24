# Backend — local development

## Prerequisites
- Docker Desktop running
- `pnpm install` done at the repo root

## 1. Start Postgres (Docker)
```bash
docker compose up -d        # Postgres on host port 5433 (avoids native 5432)
```
Connection string: `postgresql://postgres:postgres@localhost:5433/postgres`

## 2. Apply the database schema
Migrations are generated from the Drizzle schema and applied with a tracked migrator
(works non-interactively, unlike `push` which needs a TTY):
```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5433/postgres"
pnpm --filter @workspace/db run generate   # only after changing lib/db/src/schema/*
pnpm --filter @workspace/db run migrate     # apply pending migrations
```

## 3. Create the first admin (bootstrap)
The API server creates an admin on startup if `ADMIN_EMAIL` / `ADMIN_PASSWORD`
are set and that email doesn't exist yet:
```bash
export ADMIN_EMAIL="admin@acepaddlers.com"
export ADMIN_PASSWORD="change-me-strong"
export ADMIN_NAME="Ace Admin"
```

## 4. Run the API
```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5433/postgres" PORT=8080
pnpm --filter @workspace/api-server run dev     # build + start (http://localhost:8080)
```
Or run API + frontend together (uses the 5433 default):
```bash
pnpm run dev
```

## 5. Contract-first workflow (when adding endpoints)
1. Edit `lib/api-spec/openapi.yaml`
2. `pnpm --filter @workspace/api-spec run codegen`  → regenerates Zod (`@workspace/api-zod`) + React Query hooks (`@workspace/api-client-react`)
3. Implement the Express handler in `artifacts/api-server`, validating with the generated Zod schemas
4. Consume the generated hook in the frontend

## Smoke test (admin auth)
```bash
B=http://localhost:8080/api
curl -s $B/healthz
curl -s -c cj.txt -X POST $B/admin/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@acepaddlers.com","password":"change-me-strong"}'
curl -s -b cj.txt $B/admin/auth/me
curl -s -X POST -b cj.txt $B/admin/auth/logout -o /dev/null -w '%{http_code}\n'
```

## Notes
- Password hashing uses Node's built-in `crypto.scrypt` (no external dep).
- Sessions are opaque random tokens; only their SHA-256 hash is stored in `admin_sessions`.
- Session cookie `ap_admin` is httpOnly, SameSite=Lax, and Secure in production.
