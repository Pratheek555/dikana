# Dikana

Multi-tenant SaaS analytics platform built with Next.js, Prisma, PostgreSQL, and tenant-scoped Row Level Security.

## Day 1 Status

Implemented:

- Custom email/password signup and login with signed HTTP-only session cookies.
- Signup creates a user, tenant workspace, owner membership, and default dashboard.
- Tenant-owned tables use `tenantId` and PostgreSQL RLS.
- App database reads and writes run inside session-scoped tenant context with `app.current_tenant_id`.
- Tenant membership lookup runs inside user context with `app.current_user_id`.
- CSV upload flow at `/sources` previews headers, maps timestamp and metric columns, and imports metric points.
- `/dashboard` reads tenant-scoped sources, metrics, metric points, ingestion runs, and anomalies.

Still planned for later days:

- Webhook ingestion and realtime Socket.IO updates.
- Dashboard builder.
- Embed widget.
- Anomaly scheduler and email delivery.

## Local Setup

Required environment variables:

```sh
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
AUTH_SECRET="replace-with-a-long-random-secret"
```

Install dependencies:

```sh
npm install
```

Apply database migrations:

```sh
npm exec prisma migrate deploy --workspace @repo/db
```

Run the app:

```sh
npm run dev -- --filter=web
```

## Isolation Test

Day 1 isolation is verified by a direct PostgreSQL script. It creates Tenant A and Tenant B records for metrics, metric points, dashboards, data sources, webhook endpoints, and anomaly events. Then it reads those tables with `app.current_tenant_id` set to each tenant and asserts the other tenant's rows are invisible.

Run:

```sh
npm run test:day1:isolation
```

Expected output:

```txt
Day 1 isolation check passed.
Tenant A could not read Tenant B tenant-owned rows.
Tenant B could not read Tenant A tenant-owned rows.
```

The script also checks that a user-scoped membership read with `app.current_user_id` cannot see another user's membership.

## Manual CSV Demo

1. Start the app and open `/signup`.
2. Create Tenant A with a unique workspace name.
3. Go to `/sources`.
4. Upload `test-csv-ingestion-sample.csv`.
5. Preview the CSV, confirm the timestamp column, select numeric metric columns, and import.
6. Open `/dashboard` and confirm source and metric point counts increased.
7. Log out, create Tenant B in a fresh session, and confirm its dashboard starts empty.

## Verification Commands

```sh
npm run check-types
npm run lint
npm run test:day1:isolation
```

The isolation test requires a migrated PostgreSQL database reachable through `DATABASE_URL`.
