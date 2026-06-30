import type { NextRequest } from "next/server";
import { withTenantContext } from "@repo/db";
const MAX_WEBHOOK_PAYLOAD_BYTES = 256 * 1024;

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

  let payload: unknown;
  try {
    payload = await _req.json();
  } catch {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (!payload) {
    return Response.json({ error: "Payload is empty" }, { status: 400 });
  }

  if (typeof payload !== "object") {
    return Response.json(
      { error: "Payload must be an object" },
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

  if (endpoint.secretHash !== secret) {
    return Response.json({ error: "Invalid webhook secret" }, { status: 401 });
  }

  if (!endpoint.dataSourceId) {
    return 409;
  }

  return Response.json({
    tenantId,
    publicId,
    dataSourceId: endpoint.dataSourceId,
  });
}
