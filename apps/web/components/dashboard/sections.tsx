import Link from "next/link";
import {
  ActivityIcon,
  AlertTriangleIcon,
  BarChart3Icon,
  ClockIcon,
  DatabaseIcon,
  GaugeIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  MailIcon,
  PlusIcon,
  RadioTowerIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";

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
import {
  type DashboardData,
  formatDate,
  formatNumber,
  humanize,
  statusVariant,
} from "@/lib/dashboard-data";

type Icon = typeof ActivityIcon;

function StatCard({
  title,
  value,
  detail,
  icon: Icon,
}: {
  title: string;
  value: string;
  detail: string;
  icon: Icon;
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader className="gap-3">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
        <CardAction>
          <div className="flex size-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Icon aria-hidden />
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium uppercase text-primary">{eyebrow}</p>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function BarPreview({ id }: { id: string }) {
  return (
    <div className="flex h-24 items-end gap-2">
      {[48, 72, 54, 88, 66, 94, 78, 100].map((height, index) => (
        <div
          key={`${id}-${height}-${index}`}
          className="w-full rounded-sm bg-primary"
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}

export function OverviewRoute({ data }: { data: DashboardData }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
      <Card className="overflow-hidden rounded-lg border-primary/20 bg-card">
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Production cockpit</Badge>
            <Badge variant="outline">/{data.membership.tenant.slug}</Badge>
          </div>
          <CardTitle className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
            {data.membership.tenant.name} is monitoring{" "}
            {formatNumber(data.metricPointCount)} metric points across{" "}
            {formatNumber(data.dataSourceCount)} sources.
          </CardTitle>
          <CardDescription className="max-w-2xl">
            A focused control room for analytics, source health, anomaly
            response, ingestion logs, and team-level configuration.
          </CardDescription>
          <CardAction className="hidden sm:block">
            <Button asChild>
              <Link href="/sources">
                <PlusIcon data-icon="inline-start" />
                Add source
              </Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {[
            ["Source health", data.sourceHealth],
            ["Sync success", `${data.syncSuccessRate}% recent runs`],
            [
              "Alert cadence",
              `${data.membership.tenant.anomalyScheduleMins} minute checks`,
            ],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border bg-background/50 p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-2 text-sm font-medium">{value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Operations pulse</CardTitle>
          <CardDescription>Last 7 days of risk signals.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {[
            {
              label: "Open anomalies",
              value: data.openAnomalyCount,
              icon: AlertTriangleIcon,
            },
            {
              label: "Failed ingestion runs",
              value: data.failedRunCount,
              icon: ClockIcon,
            },
            {
              label: "Pending alerts",
              value: data.pendingAlertCount,
              icon: RadioTowerIcon,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                  <item.icon aria-hidden />
                </div>
                <span className="text-sm text-muted-foreground">
                  {item.label}
                </span>
              </div>
              <span className="text-2xl font-semibold">
                {formatNumber(item.value)}
              </span>
            </div>
          ))}
          <Separator />
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">Recent anomalies</p>
            {data.anomalies.length > 0 ? (
              data.anomalies.map((anomaly) => (
                <div
                  key={anomaly.id}
                  className="flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm">{anomaly.metric.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Expected {formatNumber(anomaly.expectedValue)}, saw{" "}
                      {formatNumber(anomaly.observedValue)}
                      {anomaly.metric.unit ? ` ${anomaly.metric.unit}` : ""}
                    </p>
                  </div>
                  <Badge variant={statusVariant(anomaly.severity)}>
                    {humanize(anomaly.severity)}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No anomaly events have been recorded for this tenant.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function AnalyticsRoute({ data }: { data: DashboardData }) {
  const defaultDashboardName = data.dashboard?.name ?? "Default dashboard";
  const widgets = data.dashboard?.widgets ?? [];
  const hasWorkspaceData =
    data.dataSourceCount > 0 || data.metricCount > 0 || widgets.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <SectionHeading
        eyebrow="Analytics"
        title="Everything the team expects to see first"
        description="High-signal KPIs, dashboard widgets, recent metrics, and anomaly context share one surface so users can scan before drilling in."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Data sources"
          value={formatNumber(data.dataSourceCount)}
          detail={data.sourceHealth}
          icon={DatabaseIcon}
        />
        <StatCard
          title="Metrics"
          value={formatNumber(data.metricCount)}
          detail={`${formatNumber(data.recentMetricPointCount)} points in 7 days`}
          icon={BarChart3Icon}
        />
        <StatCard
          title="Open anomalies"
          value={formatNumber(data.openAnomalyCount)}
          detail={`${data.failedRunCount} failed runs in the last 7 days`}
          icon={AlertTriangleIcon}
        />
        <StatCard
          title="Team"
          value={formatNumber(data.teamMembers.length)}
          detail={`${data.apiKeyCount} active API keys, ${data.embedCount} embeds`}
          icon={UsersIcon}
        />
      </div>

      {!hasWorkspaceData ? (
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Set up monitoring</CardTitle>
            <CardDescription>
              Connect a source, map fields into metrics, and build the first
              dashboard widgets.
            </CardDescription>
            <CardAction>
              <Badge variant="outline">Fresh workspace</Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {[
              {
                title: "Connect data",
                description: "Add CSV, Sheets, or webhook sources.",
                icon: DatabaseIcon,
              },
              {
                title: "Define metrics",
                description: "Map fields into raw or computed metrics.",
                icon: GaugeIcon,
              },
              {
                title: "Watch anomalies",
                description: "Route meaningful alerts to the team.",
                icon: SparklesIcon,
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex min-h-36 flex-col justify-between rounded-lg border bg-background p-4"
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

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
        <Card className="rounded-lg">
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
                  className="flex min-h-56 flex-col justify-between rounded-lg border bg-background p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate font-medium">{widget.title}</h2>
                      <p className="text-sm text-muted-foreground">
                        {humanize(widget.chartType)} chart
                      </p>
                    </div>
                    <Badge variant="outline">
                      {widget.width}x{widget.height}
                    </Badge>
                  </div>
                  <BarPreview id={widget.id} />
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
                    Add KPI, line, bar, or table widgets once metrics are
                    available.
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

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Metrics catalog</CardTitle>
            <CardDescription>
              Available to widgets, embeds, and anomaly models.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {data.metrics.length > 0 ? (
              data.metrics.map((metric) => (
                <div
                  key={metric.id}
                  className="rounded-lg border bg-background p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {metric.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {metric.key}
                      </p>
                    </div>
                    <Badge variant="outline">{humanize(metric.kind)}</Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Metrics will show here after source fields are mapped.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function LogsRoute({ data }: { data: DashboardData }) {
  return (
    <div className="flex flex-col gap-4">
      <SectionHeading
        eyebrow="Logs"
        title="Recent data ingestion"
        description="A readable operations ledger for imported rows, rejected values, sync timing, and source status."
      />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Ingestion timeline</CardTitle>
            <CardDescription>Latest processing outcomes.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {data.ingestionRuns.length > 0 ? (
              data.ingestionRuns.map((run) => (
                <div
                  key={run.id}
                  className="grid gap-3 rounded-lg border bg-background p-4 md:grid-cols-[1fr_auto]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">
                        {run.dataSource.name}
                      </p>
                      <Badge variant={statusVariant(run.status)}>
                        {humanize(run.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDate(run.startedAt)} -{" "}
                      {formatNumber(run.rowsInserted)} inserted from{" "}
                      {formatNumber(run.rowsRead)} rows
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span>{formatNumber(run.errorCount)} errors</span>
                    <ClockIcon aria-hidden />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Ingestion activity will appear after the first source run.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Rejected rows</CardTitle>
            <CardDescription>Latest validation failures.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {data.ingestionErrors.length > 0 ? (
              data.ingestionErrors.map((error) => (
                <div
                  key={error.id}
                  className="rounded-lg border bg-background p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="truncate text-sm font-medium">
                      {error.dataSource.name}
                    </p>
                    <Badge variant="outline">Row {error.rowNumber ?? "?"}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {error.fieldName ? `${error.fieldName}: ` : ""}
                    {error.message}
                  </p>
                  {error.rawValue ? (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      Value: {error.rawValue}
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Rejected rows will appear when imports contain invalid
                timestamps or non-numeric metric values.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Source ledger</CardTitle>
          <CardDescription>Recent source sync state.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {data.dataSources.length > 0 ? (
            data.dataSources.map((source) => (
              <div
                key={source.id}
                className="flex min-h-40 flex-col justify-between rounded-lg border bg-background p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{source.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {humanize(source.type)}
                    </p>
                  </div>
                  <Badge variant={statusVariant(source.status)}>
                    {humanize(source.status)}
                  </Badge>
                </div>
                <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                  <span>{formatNumber(source.recordCount)} records</span>
                  <span>Last sync {formatDate(source.lastSyncedAt)}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No source records are connected to this tenant yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function SettingsRoute({ data }: { data: DashboardData }) {
  return (
    <div className="flex flex-col gap-4">
      <SectionHeading
        eyebrow="Dashboard settings"
        title="Team, delivery, and foreseeable controls"
        description="A settings surface for ownership, alert routing, embeds, API access, and future governance controls."
      />

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Workspace controls</CardTitle>
            <CardDescription>Current tenant configuration.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {[
              {
                label: "Alert email",
                value: data.membership.tenant.alertEmail ?? data.user.email,
                icon: MailIcon,
              },
              {
                label: "Anomaly cadence",
                value: `${data.membership.tenant.anomalyScheduleMins} minutes`,
                icon: RadioTowerIcon,
              },
              {
                label: "Active API keys",
                value: formatNumber(data.apiKeyCount),
                icon: KeyRoundIcon,
              },
              {
                label: "Enabled embeds",
                value: formatNumber(data.embedCount),
                icon: ShieldCheckIcon,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <item.icon aria-hidden />
                  <span className="text-sm text-muted-foreground">
                    {item.label}
                  </span>
                </div>
                <span className="truncate text-sm font-medium">
                  {item.value}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Team</CardTitle>
            <CardDescription>Members attached to this tenant.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {data.teamMembers.map((member) => (
              <div
                key={member.id}
                className="grid gap-3 rounded-lg border bg-background p-4 sm:grid-cols-[1fr_auto]"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {member.user.name ?? member.user.email}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {member.user.email}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{humanize(member.role)}</Badge>
                  <Badge variant="outline">
                    Since {formatDate(member.createdAt)}
                  </Badge>
                </div>
              </div>
            ))}
            <Separator />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm">
                <UsersIcon data-icon="inline-start" />
                Invite teammate
              </Button>
              <Button variant="secondary" size="sm">
                <ShieldCheckIcon data-icon="inline-start" />
                Audit access
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
