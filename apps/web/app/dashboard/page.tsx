import Link from "next/link";
import {
  ActivityIcon,
  AlertTriangleIcon,
  BarChart3Icon,
  DatabaseIcon,
  GaugeIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  PlusIcon,
  RadioTowerIcon,
  SettingsIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react";

import { logoutUser } from "@/actions/user-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getActiveTenant } from "@/lib/tenant";
import { withTenantContext } from "@repo/db";

function formatDate(date?: Date | null) {
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

function formatNumber(value: number) {
  return new Intl.NumberFormat("en", {
    notation: value > 9999 ? "compact" : "standard",
  }).format(value);
}

function humanize(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusVariant(status: string) {
  if (["ACTIVE", "SUCCEEDED", "RESOLVED", "SENT"].includes(status)) {
    return "secondary" as const;
  }

  if (["ERROR", "FAILED", "CRITICAL", "HIGH"].includes(status)) {
    return "destructive" as const;
  }

  return "outline" as const;
}

function StatCard({
  title,
  value,
  detail,
  icon: Icon,
}: {
  title: string;
  value: string;
  detail: string;
  icon: typeof ActivityIcon;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
        <CardAction>
          <div className="flex size-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Icon aria-hidden />
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const activeTenant = await getActiveTenant();

  if (!activeTenant) {
    return (
      <main className="min-h-svh bg-background p-6">
        <div className="mx-auto flex min-h-[calc(100svh-3rem)] max-w-3xl items-center">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>No workspace yet</CardTitle>
              <CardDescription>
                Your account is signed in, but it is not attached to a tenant
                workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Create a workspace from the signup flow or ask an owner to add
                you to an existing tenant.
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

  const { user, membership } = activeTenant;
  const tenantId = membership.tenant.id;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    dataSourceCount,
    activeSourceCount,
    metricCount,
    metricPointCount,
    openAnomalyCount,
    failedRunCount,
    pendingAlertCount,
    dashboard,
    dataSources,
    ingestionRuns,
    anomalies,
    metrics,
  ] = await withTenantContext(tenantId, async (tx) =>
    Promise.all([
      tx.dataSource.count({ where: { tenantId } }),
      tx.dataSource.count({ where: { tenantId, status: "ACTIVE" } }),
      tx.metric.count({ where: { tenantId } }),
      tx.metricPoint.count({ where: { tenantId } }),
      tx.anomalyEvent.count({ where: { tenantId, status: "OPEN" } }),
      tx.ingestionRun.count({
        where: {
          tenantId,
          status: "FAILED",
          startedAt: { gte: sevenDaysAgo },
        },
      }),
      tx.alertDelivery.count({ where: { tenantId, status: "PENDING" } }),
      tx.dashboard.findFirst({
        where: { tenantId, isDefault: true },
        select: {
          id: true,
          name: true,
          widgets: {
            orderBy: [{ y: "asc" }, { x: "asc" }],
            take: 4,
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
      tx.dataSource.findMany({
        where: { tenantId },
        orderBy: { updatedAt: "desc" },
        take: 4,
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
      tx.ingestionRun.findMany({
        where: { tenantId },
        orderBy: { startedAt: "desc" },
        take: 5,
        select: {
          id: true,
          status: true,
          startedAt: true,
          rowsInserted: true,
          errorCount: true,
          dataSource: {
            select: {
              name: true,
            },
          },
        },
      }),
      tx.anomalyEvent.findMany({
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
      tx.metric.findMany({
        where: { tenantId },
        orderBy: { updatedAt: "desc" },
        take: 5,
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
    ]),
  );

  const sourceHealth =
    dataSourceCount === 0
      ? "No sources connected"
      : `${activeSourceCount} of ${dataSourceCount} active`;
  const defaultDashboardName = dashboard?.name ?? "Default dashboard";
  const widgets = dashboard?.widgets ?? [];
  const hasWorkspaceData =
    dataSourceCount > 0 || metricCount > 0 || widgets.length > 0;

  return (
    <main className="min-h-svh bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-lg border bg-card p-4 text-card-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <LayoutDashboardIcon aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-semibold tracking-tight">
                  {membership.tenant.name}
                </h1>
                <Badge variant="secondary">{humanize(membership.role)}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                /{membership.tenant.slug} dashboard and anomaly operations
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/sources">
                <SettingsIcon data-icon="inline-start" />
                Sources
              </Link>
            </Button>
            <form action={logoutUser}>
              <Button type="submit" variant="secondary">
                <LogOutIcon data-icon="inline-start" />
                Log out
              </Button>
            </form>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Data sources"
            value={formatNumber(dataSourceCount)}
            detail={sourceHealth}
            icon={DatabaseIcon}
          />
          <StatCard
            title="Metrics"
            value={formatNumber(metricCount)}
            detail={`${formatNumber(metricPointCount)} metric points stored`}
            icon={BarChart3Icon}
          />
          <StatCard
            title="Open anomalies"
            value={formatNumber(openAnomalyCount)}
            detail={`${failedRunCount} failed runs in the last 7 days`}
            icon={AlertTriangleIcon}
          />
          <StatCard
            title="Alerts"
            value={formatNumber(pendingAlertCount)}
            detail={`Checks every ${membership.tenant.anomalyScheduleMins} minutes`}
            icon={RadioTowerIcon}
          />
        </section>

        {!hasWorkspaceData ? (
          <Card>
            <CardHeader>
              <CardTitle>Set up monitoring</CardTitle>
              <CardDescription>
                Connect a source, map fields into metrics, and build widgets
                for the default dashboard.
              </CardDescription>
              <CardAction>
                <Badge variant="outline">Fresh workspace</Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              {[
                {
                  title: "Connect data",
                  description:
                    "Add CSV, Google Sheets, or webhook data sources for this tenant.",
                  icon: DatabaseIcon,
                },
                {
                  title: "Define metrics",
                  description:
                    "Map source fields to raw metrics or computed business indicators.",
                  icon: GaugeIcon,
                },
                {
                  title: "Watch anomalies",
                  description:
                    "Enable anomaly detection and route alerts to the workspace email.",
                  icon: SparklesIcon,
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex min-h-40 flex-col justify-between rounded-lg border bg-background p-4"
                >
                  <item.icon aria-hidden />
                  <div className="flex flex-col gap-1">
                    <h2 className="font-medium">{item.title}</h2>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <Card>
            <CardHeader>
              <CardTitle>{defaultDashboardName}</CardTitle>
              <CardDescription>
                Widget layout from Dashboard and DashboardWidget records.
              </CardDescription>
              <CardAction>
                <Button variant="outline" size="sm">
                  <PlusIcon data-icon="inline-start" />
                  Widget
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {widgets.length > 0 ? (
                widgets.map((widget) => (
                  <div
                    key={widget.id}
                    className="flex min-h-44 flex-col justify-between rounded-lg border bg-background p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-col gap-1">
                        <h2 className="truncate font-medium">{widget.title}</h2>
                        <p className="text-sm text-muted-foreground">
                          {humanize(widget.chartType)} chart
                        </p>
                      </div>
                      <Badge variant="outline">
                        {widget.width}x{widget.height}
                      </Badge>
                    </div>
                    <div className="flex h-20 items-end gap-2">
                      {[40, 64, 52, 76, 58, 86, 70].map((height, index) => (
                        <div
                          key={`${widget.id}-${height}-${index}`}
                          className="w-full rounded-sm bg-primary"
                          style={{ height: `${height}%` }}
                        />
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {widget.widgetMetrics.length > 0 ? (
                        widget.widgetMetrics.map((item) => (
                          <Badge key={item.metric.key} variant="secondary">
                            {item.metric.name}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="outline">No metrics linked</Badge>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full flex min-h-56 flex-col items-center justify-center gap-3 rounded-lg border bg-background p-6 text-center">
                  <LayoutDashboardIcon aria-hidden />
                  <div className="flex max-w-md flex-col gap-1">
                    <h2 className="font-medium">No widgets yet</h2>
                    <p className="text-sm text-muted-foreground">
                      The default dashboard exists. Add KPI, line, bar, or
                      table widgets once metrics are available.
                    </p>
                  </div>
                  <Button variant="outline">
                    <PlusIcon data-icon="inline-start" />
                    Add widget
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Workspace health</CardTitle>
              <CardDescription>
                Live operations pulled from ingestion, anomaly, and alert
                records.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <ShieldCheckIcon aria-hidden />
                  <div>
                    <p className="font-medium">Alert email</p>
                    <p className="text-sm text-muted-foreground">
                      {membership.tenant.alertEmail ?? user.email}
                    </p>
                  </div>
                </div>
                <Badge variant="outline">Enabled</Badge>
              </div>
              <Separator />
              <div className="grid gap-3">
                {[
                  ["Tenant created", formatDate(membership.tenant.createdAt)],
                  ["Default dashboard", dashboard ? "Ready" : "Missing"],
                  ["Anomaly cadence", `${membership.tenant.anomalyScheduleMins}m`],
                  ["Signed in as", user.email],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className="truncate text-sm font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Data sources</CardTitle>
              <CardDescription>Recent source sync state.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {dataSources.length > 0 ? (
                dataSources.map((source) => (
                  <div key={source.id} className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{source.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {humanize(source.type)} -{" "}
                          {formatNumber(source.recordCount)} records
                        </p>
                      </div>
                      <Badge variant={statusVariant(source.status)}>
                        {humanize(source.status)}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Last sync: {formatDate(source.lastSyncedAt)}
                    </div>
                    <Separator />
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No source records are connected to this tenant yet.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ingestion runs</CardTitle>
              <CardDescription>Latest processing outcomes.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {ingestionRuns.length > 0 ? (
                ingestionRuns.map((run) => (
                  <div key={run.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{run.dataSource.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(run.startedAt)} -{" "}
                        {formatNumber(run.rowsInserted)} rows
                      </p>
                    </div>
                    <Badge variant={statusVariant(run.status)}>
                      {humanize(run.status)}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Ingestion activity will appear after the first source run.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Anomalies</CardTitle>
              <CardDescription>Recent detected metric deviations.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {anomalies.length > 0 ? (
                anomalies.map((anomaly) => (
                  <div key={anomaly.id} className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{anomaly.metric.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Expected {formatNumber(anomaly.expectedValue)}, saw{" "}
                          {formatNumber(anomaly.observedValue)}
                          {anomaly.metric.unit ? ` ${anomaly.metric.unit}` : ""}
                        </p>
                      </div>
                      <Badge variant={statusVariant(anomaly.severity)}>
                        {humanize(anomaly.severity)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {humanize(anomaly.status)} since {formatDate(anomaly.startedAt)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No anomaly events have been recorded for this tenant.
                </p>
              )}
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Metrics catalog</CardTitle>
            <CardDescription>
              Raw and computed metrics available to widgets, embeds, and
              anomaly models.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {metrics.length > 0 ? (
              metrics.map((metric) => (
                <div
                  key={metric.id}
                  className="flex min-h-36 flex-col justify-between rounded-lg border bg-background p-4"
                >
                  <div className="flex flex-col gap-1">
                    <p className="truncate font-medium">{metric.name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {metric.key}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{humanize(metric.kind)}</Badge>
                    <Badge variant="outline">{humanize(metric.valueType)}</Badge>
                    {metric.anomalyEnabled ? (
                      <Badge variant="outline">Anomaly on</Badge>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full rounded-lg border bg-background p-4">
                <p className="text-sm text-muted-foreground">
                  Metrics will show here after source fields are mapped.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
