/* global URL, console, process */

import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const { Client } = pg;

const scriptDir = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = join(scriptDir, "..", "..", "..");

function loadEnvFile(path) {
  if (!existsSync(path)) {
    return;
  }

  for (const line of readFileSync(path, "utf8").split(/\r?\n/u)) {
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/u.exec(line.trim());

    if (!match || process.env[match[1]]) {
      continue;
    }

    process.env[match[1]] = match[2].replace(/^["']|["']$/gu, "");
  }
}

loadEnvFile(join(repoRoot, ".env"));
loadEnvFile(join(repoRoot, "packages", "db", ".env"));

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DIRECT_URL or DATABASE_URL is required.");
  process.exit(1);
}

const runId = `day1_${Date.now()}_${randomUUID().slice(0, 8)}`;
const rlsRoleName = `day1_rls_${runId.slice(-18)}`;

function id(label) {
  return `${runId}_${label}`;
}

const fixtures = {
  a: {
    userId: id("user_a"),
    tenantId: id("tenant_a"),
    membershipId: id("membership_a"),
    dashboardId: id("dashboard_a"),
    dataSourceId: id("source_a"),
    metricId: id("metric_a"),
    metricPointId: id("point_a"),
    webhookEndpointId: id("webhook_a"),
    anomalyEventId: id("anomaly_a"),
    email: `${runId}_a@example.com`,
    tenantSlug: `${runId}-tenant-a`,
  },
  b: {
    userId: id("user_b"),
    tenantId: id("tenant_b"),
    membershipId: id("membership_b"),
    dashboardId: id("dashboard_b"),
    dataSourceId: id("source_b"),
    metricId: id("metric_b"),
    metricPointId: id("point_b"),
    webhookEndpointId: id("webhook_b"),
    anomalyEventId: id("anomaly_b"),
    email: `${runId}_b@example.com`,
    tenantSlug: `${runId}-tenant-b`,
  },
};

const checks = [
  { table: "Metric", label: "metrics" },
  { table: "MetricPoint", label: "metric points" },
  { table: "Dashboard", label: "dashboards" },
  { table: "DataSource", label: "data sources" },
  { table: "WebhookEndpoint", label: "webhook endpoints" },
  { table: "AnomalyEvent", label: "anomaly events" },
];

function assertEqual(actual, expected, message) {
  if (Number(actual) !== expected) {
    throw new Error(`${message}: expected ${expected}, received ${actual}`);
  }
}

function quoteIdentifier(value) {
  return `"${value.replace(/"/gu, '""')}"`;
}

function quoteLiteral(value) {
  return `'${value.replace(/'/gu, "''")}'`;
}

function connectionStringForRole(roleName, password) {
  const url = new URL(connectionString);
  const [, tenantSuffix] = url.username.match(/^[^.]+(\..+)$/u) ?? [];

  url.username = `${roleName}${tenantSuffix ?? ""}`;
  url.password = password;

  return url.toString();
}

async function createRlsEnforcedRole(client) {
  const role = quoteIdentifier(rlsRoleName);
  const password = `day1_${randomUUID()}`;
  const currentRole = await client.query(
    "SELECT current_user, rolbypassrls FROM pg_roles WHERE rolname = current_user",
  );

  if (!currentRole.rows[0]?.rolbypassrls) {
    return null;
  }

  await client.query(
    `CREATE ROLE ${role} LOGIN PASSWORD ${quoteLiteral(password)} NOBYPASSRLS`,
  );
  await client.query(`GRANT USAGE ON SCHEMA public TO ${role}`);
  await client.query(
    `GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES ON ALL TABLES IN SCHEMA public TO ${role}`,
  );

  return connectionStringForRole(rlsRoleName, password);
}

async function dropRlsEnforcedRole(client) {
  const role = quoteIdentifier(rlsRoleName);
  const existingRole = await client.query(
    "SELECT 1 FROM pg_roles WHERE rolname = $1",
    [rlsRoleName],
  );

  if (existingRole.rowCount === 0) {
    return;
  }

  await client.query(
    `REVOKE SELECT, INSERT, UPDATE, DELETE, REFERENCES ON ALL TABLES IN SCHEMA public FROM ${role}`,
  );
  await client.query(`REVOKE USAGE ON SCHEMA public FROM ${role}`);
  await client.query(`DROP ROLE IF EXISTS ${role}`);
}

async function withTransaction(client, callback) {
  await client.query("BEGIN");

  try {
    const result = await callback();
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function setUserContext(client, userId) {
  await client.query("SELECT set_config('app.current_user_id', $1, true)", [
    userId,
  ]);
}

async function setTenantContext(client, tenantId) {
  await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [
    tenantId,
  ]);
}

async function preCleanup(client) {
  const users = await client.query(
    'SELECT "id" FROM "User" WHERE "email" LIKE $1',
    ["day1_%@example.com"],
  );

  for (const row of users.rows) {
    await withTransaction(client, async () => {
      await setUserContext(client, row.id);
      await client.query('DELETE FROM "Tenant" WHERE "ownerId" = $1', [row.id]);
    });
  }

  await client.query('DELETE FROM "User" WHERE "email" LIKE $1', [
    "day1_%@example.com",
  ]);
}

async function seedTenant(client, fixture, name, value) {
  await client.query(
    'INSERT INTO "User" ("id", "email", "name", "passwordHash", "updatedAt") VALUES ($1, $2, $3, $4, now())',
    [fixture.userId, fixture.email, `${name} Owner`, "day1-test-password-hash"],
  );

  await withTransaction(client, async () => {
    await setUserContext(client, fixture.userId);

    await client.query(
      'INSERT INTO "Tenant" ("id", "name", "slug", "ownerId", "alertEmail", "updatedAt") VALUES ($1, $2, $3, $4, $5, now())',
      [
        fixture.tenantId,
        `${name} Workspace`,
        fixture.tenantSlug,
        fixture.userId,
        fixture.email,
      ],
    );

    await setTenantContext(client, fixture.tenantId);

    await client.query(
      'INSERT INTO "TenantMembership" ("id", "tenantId", "userId", "role") VALUES ($1, $2, $3, $4)',
      [fixture.membershipId, fixture.tenantId, fixture.userId, "OWNER"],
    );

    await client.query(
      'INSERT INTO "Dashboard" ("id", "tenantId", "name", "isDefault", "updatedAt") VALUES ($1, $2, $3, true, now())',
      [fixture.dashboardId, fixture.tenantId, "Default dashboard"],
    );

    await client.query(
      'INSERT INTO "DataSource" ("id", "tenantId", "type", "name", "status", "config", "recordCount", "lastSyncedAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6::jsonb, 1, now(), now())',
      [
        fixture.dataSourceId,
        fixture.tenantId,
        "CSV",
        `${name} CSV`,
        "ACTIVE",
        JSON.stringify({ source: "day1-isolation-check" }),
      ],
    );

    await client.query(
      'INSERT INTO "Metric" ("id", "tenantId", "key", "name", "kind", "valueType", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, now())',
      [
        fixture.metricId,
        fixture.tenantId,
        `${name.toLowerCase()}_revenue`,
        `${name} Revenue`,
        "RAW",
        "NUMBER",
      ],
    );

    await client.query(
      'INSERT INTO "MetricPoint" ("id", "tenantId", "metricId", "dataSourceId", "timestamp", "numberValue", "dimensions") VALUES ($1, $2, $3, $4, now(), $5, $6::jsonb)',
      [
        fixture.metricPointId,
        fixture.tenantId,
        fixture.metricId,
        fixture.dataSourceId,
        value,
        JSON.stringify({ sourceColumn: "revenue" }),
      ],
    );

    await client.query(
      'INSERT INTO "WebhookEndpoint" ("id", "tenantId", "name", "publicId", "secretHash") VALUES ($1, $2, $3, $4, $5)',
      [
        fixture.webhookEndpointId,
        fixture.tenantId,
        `${name} Webhook`,
        `${runId}_${name.toLowerCase()}_webhook`,
        "day1-test-secret-hash",
      ],
    );

    await client.query(
      'INSERT INTO "AnomalyEvent" ("id", "tenantId", "metricId", "severity", "startedAt", "observedValue", "expectedValue", "deviation", "modelSnapshot", "dedupeKey") VALUES ($1, $2, $3, $4, now(), $5, $6, $7, $8::jsonb, $9)',
      [
        fixture.anomalyEventId,
        fixture.tenantId,
        fixture.metricId,
        "HIGH",
        value * 2,
        value,
        value,
        JSON.stringify({ model: "day1-isolation-check" }),
        `${runId}_${name.toLowerCase()}_anomaly`,
      ],
    );
  });
}

async function assertTenantIsolation(client, viewer, other, label) {
  await withTransaction(client, async () => {
    await setTenantContext(client, viewer.tenantId);

    for (const check of checks) {
      const own = await client.query(
        `SELECT count(*)::int AS count FROM "${check.table}" WHERE "tenantId" = $1`,
        [viewer.tenantId],
      );
      const cross = await client.query(
        `SELECT count(*)::int AS count FROM "${check.table}" WHERE "tenantId" = $1`,
        [other.tenantId],
      );

      assertEqual(
        own.rows[0].count,
        1,
        `${label} should see its own ${check.label}`,
      );
      assertEqual(
        cross.rows[0].count,
        0,
        `${label} should not see the other tenant's ${check.label}`,
      );
    }
  });
}

async function assertMembershipIsolation(client, viewer, other, label) {
  await withTransaction(client, async () => {
    await setUserContext(client, viewer.userId);

    const own = await client.query(
      'SELECT count(*)::int AS count FROM "TenantMembership" WHERE "userId" = $1',
      [viewer.userId],
    );
    const cross = await client.query(
      'SELECT count(*)::int AS count FROM "TenantMembership" WHERE "userId" = $1',
      [other.userId],
    );

    assertEqual(own.rows[0].count, 1, `${label} should see its membership`);
    assertEqual(
      cross.rows[0].count,
      0,
      `${label} should not see the other user's membership`,
    );
  });
}

async function cleanup(client) {
  for (const fixture of [fixtures.a, fixtures.b]) {
    await withTransaction(client, async () => {
      await setUserContext(client, fixture.userId);
      await setTenantContext(client, fixture.tenantId);
      await client.query('DELETE FROM "Tenant" WHERE "id" = $1', [
        fixture.tenantId,
      ]);
    });
  }

  await client.query('DELETE FROM "User" WHERE "id" = ANY($1::text[])', [
    [fixtures.a.userId, fixtures.b.userId],
  ]);
}

const adminClient = new Client({ connectionString });
let client = adminClient;
let temporaryRoleConnectionString = null;

try {
  await adminClient.connect();
  temporaryRoleConnectionString = await createRlsEnforcedRole(adminClient);

  if (temporaryRoleConnectionString) {
    console.log(`Using temporary RLS-enforced role ${rlsRoleName}.`);
    client = new Client({ connectionString: temporaryRoleConnectionString });
    await client.connect();
  }

  const fixtureClient = temporaryRoleConnectionString ? adminClient : client;

  await preCleanup(fixtureClient);
  await seedTenant(fixtureClient, fixtures.a, "TenantA", 100);
  await seedTenant(fixtureClient, fixtures.b, "TenantB", 200);
  await assertTenantIsolation(client, fixtures.a, fixtures.b, "Tenant A");
  await assertTenantIsolation(client, fixtures.b, fixtures.a, "Tenant B");
  await assertMembershipIsolation(client, fixtures.a, fixtures.b, "Tenant A");
  await assertMembershipIsolation(client, fixtures.b, fixtures.a, "Tenant B");
  await cleanup(fixtureClient);

  if (client !== adminClient) {
    await client.end();
    client = adminClient;
  }

  if (temporaryRoleConnectionString) {
    await dropRlsEnforcedRole(adminClient);
  }

  console.log("Day 1 isolation check passed.");
  console.log("Tenant A could not read Tenant B tenant-owned rows.");
  console.log("Tenant B could not read Tenant A tenant-owned rows.");
} catch (error) {
  console.error("Day 1 isolation check failed.");
  console.error(error);

  try {
    await cleanup(temporaryRoleConnectionString ? adminClient : client);
    if (client !== adminClient) {
      await client.end();
      client = adminClient;
    }
    await dropRlsEnforcedRole(adminClient);
  } catch {
    // Best-effort cleanup; preserve the original failure.
  }

  process.exitCode = 1;
} finally {
  if (client !== adminClient) {
    await client.end();
  }

  await adminClient.end();
}
