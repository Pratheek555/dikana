import { createHash, timingSafeEqual } from "node:crypto";

import type { NextRequest } from "next/server";
import { withTenantContext } from "@repo/db";

const MAX_WEBHOOK_PAYLOAD_BYTES = 256 * 1024;

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type JsonObject = { [key: string]: JsonValue };

function hashWebhookSecret(secret: string) {
  return createHash("sha256").update(secret).digest("base64url");
}

function isWebhookSecretValid(secret: string, secretHash: string) {
  const provided = Buffer.from(hashWebhookSecret(secret), "base64url");
  const expected = Buffer.from(secretHash, "base64url");

  return (
    provided.byteLength === expected.byteLength &&
    timingSafeEqual(provided, expected)
  );
}

function isJsonObject(value: unknown): value is JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every(isJsonValue);
}

function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  return isJsonObject(value);
}

export async function POST(
  _req: NextRequest,
  ctx: RouteContext<"/api/webhooks/[tenantId]/[publicId]">,
) {
  const { tenantId, publicId } = await ctx.params;

  if (!tenantId || !publicId) {
    return Response.json(
      { error: "Missing tenantId or publicId" },
      { status: 400 },
    );
  }

  const contentLength = Number(_req.headers.get("content-length") ?? 0);

  if (contentLength > MAX_WEBHOOK_PAYLOAD_BYTES) {
    return Response.json({ error: "Payload too large" }, { status: 413 });
  }

  const contentType = _req.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("application/json")) {
    return Response.json(
      { error: "Webhook payload must be JSON." },
      { status: 415 },
    );
  }

  let parsedPayload: unknown;
  try {
    parsedPayload = await _req.json();
  } catch {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (!isJsonObject(parsedPayload)) {
    return Response.json(
      { error: "Payload must be a JSON object" },
      { status: 400 },
    );
  }

  const secret = _req.headers.get("x-dikana-webhook-secret")?.trim();

  if (!secret) {
    return Response.json(
      { error: "Webhook secret is required." },
      { status: 401 },
    );
  }

  const endpoint = await withTenantContext(tenantId, async (tx) => {
    return await tx.webhookEndpoint.findFirst({
      where: {
        tenantId: tenantId,
        publicId: publicId,
      },
      select: {
        id: true,
        enabled: true,
        secretHash: true,
        dataSourceId: true,
        name: true,
      },
    });
  });

  if (!endpoint) {
    return Response.json(
      { error: "Webhook endpoint not found" },
      { status: 404 },
    );
  }

  if (!endpoint.enabled) {
    return Response.json(
      { error: "Webhook endpoint is disabled" },
      { status: 403 },
    );
  }

  if (!isWebhookSecretValid(secret, endpoint.secretHash)) {
    return Response.json({ error: "Invalid webhook secret" }, { status: 401 });
  }

  if (!endpoint.dataSourceId) {
    return Response.json({ error: "Data source not found" }, { status: 404 });
  }

  const dataSourceId = endpoint.dataSourceId;
  let eventId: string;

  try {
    const storedEvent = await withTenantContext(tenantId, async (tx) => {
      const rawEvent = await tx.rawEvent.create({
        data: {
          tenantId,
          dataSourceId,
          payload: parsedPayload,
        },
        select: {
          id: true,
        },
      });

      await tx.ingestionRun.create({
        data: {
          tenantId,
          status: "SUCCEEDED",
          dataSourceId,
          rowsRead: 1,
          rowsInserted: 1,
          summary: {
            rawEventId: rawEvent.id,
            endpointId: endpoint.id,
          },
        },
      });

      await tx.dataSource.update({
        where: { id: dataSourceId },
        data: {
          lastSyncedAt: new Date(),
          recordCount: { increment: 1 },
        },
      });

      return rawEvent;
    });

    eventId = storedEvent.id;
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Failed to store webhook event" },
      { status: 500 },
    );
  }

  return Response.json({
    accepted: true,
    eventId,
  });
}
