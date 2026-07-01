import { createHash, timingSafeEqual } from "node:crypto";

import type { NextRequest } from "next/server";
import { withTenantContext } from "@repo/db";
const MAX_WEBHOOK_PAYLOAD_BYTES = 256 * 1024;

// time safe comparision of webhook secrets
// What is time safe comparision?
// It compares two buffers in constant time, regardless of their contents.
// in simpler terms, it prevents timing attacks by not revealing which buffer is larger.
// what is timing attacks?
// A timing attack is a type of attack that exploits the time taken to execute a particular operation,
// such as comparing two buffers, to deduce sensitive information about the operation's input.
// example: an attacker could measure the time taken to compare two secret hashes,
// and deduce which hash is larger, thus revealing the secret.
// why use timingSafeEqual instead of a simple equality check?
// timingSafeEqual compares two buffers in constant time, regardless of their contents,
// while a simple equality check would reveal which buffer is larger, thus revealing the secret.
function hashWebhookSecret(secret: string) {
  return createHash("sha256").update(secret).digest("base64url");
}

function isWebhookSecretValid(secret: string, secretHash: string) {
  const provided = Buffer.from(hashWebhookSecret(secret), "base64url");
  const expected = Buffer.from(hashWebhookSecret(secretHash), "base64url");

  return (
    provided.byteLength === expected.byteLength &&
    timingSafeEqual(provided, expected)
  );
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

  let payload: Record<string, unknown>;
  try {
    payload = await _req.json();
  } catch {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
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

  let webHookEventStore: unknown;
  try {
    webHookEventStore = await withTenantContext(tenantId, async (tx) => {
      return await tx.rawEvent.create({
        data: {
          tenantId: tenantId,
          dataSourceId: String(endpoint.dataSourceId),
          payload: payload as Record<string, unknown>,
        },
      });
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Failed to store webhook event" },
      { status: 500 },
    );
  }

  return Response.json({
    tenantId,
    publicId,
    dataSourceId: endpoint.dataSourceId,
    webHookEventStore,
  });
}
