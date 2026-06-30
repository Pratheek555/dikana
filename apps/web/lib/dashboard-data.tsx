import { logoutUser } from "@/actions/user-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getActiveTenant } from "@/lib/tenant";
import { withTenantReadContext } from "@repo/db";
import { LogOutIcon } from "lucide-react";

export function formatDate(date?: Date | null) {
  if (!date) {
    return "Not yet";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en", {
    notation: value > 9999 ? "compact" : "standard",
  }).format(value);
}

export function humanize(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function statusVariant(status: string) {
  if (["ACTIVE", "SUCCEEDED", "RESOLVED", "SENT"].includes(status)) {
    return "secondary" as const;
  }

  if (["ERROR", "FAILED", "CRITICAL", "HIGH"].includes(status)) {
    return "destructive" as const;
  }

  return "outline" as const;
}

export function WorkspaceEmptyState() {
  return (
    <main className="min-h-svh bg-background p-6">
      <div className="mx-auto flex min-h-[calc(100svh-3rem)] max-w-3xl items-center">
        <Card className="w-full rounded-lg">
          <CardHeader>
            <CardTitle>No workspace yet</CardTitle>
            <CardDescription>
              Your account is signed in, but it is not attached to a tenant
              workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Create a workspace from the signup flow or ask an owner to add you
              to an existing tenant.
            </p>
            <form action={logoutUser}>
              <Button type="submit" variant="outline">
                <LogOutIcon data-icon="inline-start" />
                Log out
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export async function getDashboardShellData() {
  const activeTenant = await getActiveTenant();

  if (!activeTenant) {
    return null;
  }

  const { user, membership } = activeTenant;
  const tenantId = membership.tenant.id;

  const [dataSourceCount, activeSourceCount, pendingAlertCount] =
    await withTenantReadContext(tenantId, (db) => [
      db.dataSource.count({ where: { tenantId } }),
      db.dataSource.count({ where: { tenantId, status: "ACTIVE" } }),
      db.alertDelivery.count({ where: { tenantId, status: "PENDING" } }),
    ]);

  return {
    user,
    membership,
    dataSourceCount,
    activeSourceCount,
    pendingAlertCount,
  };
}

export async function getDashboardData() {
  const activeTenant = await getActiveTenant();

  if (!activeTenant) {
    return null;
  }

  const { user, membership } = activeTenant;
  const tenantId = membership.tenant.id;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    dataSourceCount,
    activeSourceCount,
    metricCount,
    metricPointCount,
    recentMetricPointCount,
    openAnomalyCount,
    failedRunCount,
    pendingAlertCount,
    dashboard,
    dataSources,
    ingestionRuns,
    ingestionErrors,
    anomalies,
    metrics,
    teamMembers,
    apiKeyCount,
    embedCount,
  ] = await withTenantReadContext(tenantId, (db) => [
      db.dataSource.count({ where: { tenantId } }),
      db.dataSource.count({ where: { tenantId, status: "ACTIVE" } }),
      db.metric.count({ where: { tenantId } }),
      db.metricPoint.count({ where: { tenantId } }),
      db.metricPoint.count({
        where: { tenantId, createdAt: { gte: sevenDaysAgo } },
      }),
      db.anomalyEvent.count({ where: { tenantId, status: "OPEN" } }),
      db.ingestionRun.count({
        where: {
          tenantId,
          status: "FAILED",
          startedAt: { gte: sevenDaysAgo },
        },
      }),
      db.alertDelivery.count({ where: { tenantId, status: "PENDING" } }),
      db.dashboard.findFirst({
        where: { tenantId, isDefault: true },
        select: {
          id: true,
          name: true,
          widgets: {
            orderBy: [{ y: "asc" }, { x: "asc" }],
            take: 6,
            select: {
              id: true,
              title: true,
              chartType: true,
              width: true,
              height: true,
              widgetMetrics: {
                take: 2,
                select: {
                  role: true,
                  metric: {
                    select: {
                      name: true,
                      key: true,
                      unit: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      db.dataSource.findMany({
        where: { tenantId },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          recordCount: true,
          lastSyncedAt: true,
          nextSyncAt: true,
        },
      }),
      db.ingestionRun.findMany({
        where: { tenantId },
        orderBy: { startedAt: "desc" },
        take: 8,
        select: {
          id: true,
          status: true,
          startedAt: true,
          finishedAt: true,
          rowsRead: true,
          rowsInserted: true,
          errorCount: true,
          dataSource: {
            select: {
              name: true,
            },
          },
        },
      }),
      db.ingestionError.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          rowNumber: true,
          fieldName: true,
          message: true,
          rawValue: true,
          createdAt: true,
          dataSource: {
            select: {
              name: true,
            },
          },
        },
      }),
      db.anomalyEvent.findMany({
        where: { tenantId },
        orderBy: { startedAt: "desc" },
        take: 4,
        select: {
          id: true,
          severity: true,
          status: true,
          startedAt: true,
          observedValue: true,
          expectedValue: true,
          metric: {
            select: {
              name: true,
              unit: true,
            },
          },
        },
      }),
      db.metric.findMany({
        where: { tenantId },
        orderBy: { updatedAt: "desc" },
        take: 8,
        select: {
          id: true,
          name: true,
          key: true,
          kind: true,
          valueType: true,
          unit: true,
          anomalyEnabled: true,
          goalTarget: true,
        },
      }),
      db.tenantMembership.findMany({
        where: { tenantId },
        orderBy: { createdAt: "asc" },
        take: 6,
        select: {
          id: true,
          role: true,
          createdAt: true,
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      }),
      db.apiKey.count({ where: { tenantId, revokedAt: null } }),
      db.embedConfig.count({ where: { tenantId, enabled: true } }),
    ]);

  const sourceHealth =
    dataSourceCount === 0
      ? "No sources connected"
      : `${activeSourceCount} of ${dataSourceCount} active`;
  const syncSuccessRate =
    ingestionRuns.length === 0
      ? 0
      : Math.round(
          (ingestionRuns.filter((run) => run.status === "SUCCEEDED").length /
            ingestionRuns.length) *
            100,
        );

  return {
    user,
    membership,
    dataSourceCount,
    activeSourceCount,
    metricCount,
    metricPointCount,
    recentMetricPointCount,
    openAnomalyCount,
    failedRunCount,
    pendingAlertCount,
    dashboard,
    dataSources,
    ingestionRuns,
    ingestionErrors,
    anomalies,
    metrics,
    teamMembers,
    apiKeyCount,
    embedCount,
    sourceHealth,
    syncSuccessRate,
  };
}

export type DashboardData = NonNullable<
  Awaited<ReturnType<typeof getDashboardData>>
>;
