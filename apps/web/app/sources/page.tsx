import Link from "next/link";
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  CheckCircle2Icon,
  DatabaseIcon,
  FileTextIcon,
  LogOutIcon,
} from "lucide-react";

import { logoutUser } from "@/actions/user-actions";
import { CsvIngestionForm } from "@/components/sources/csv-ingestion-form";
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
  if (["ACTIVE", "SUCCEEDED"].includes(status)) {
    return "secondary" as const;
  }

  if (["ERROR", "FAILED"].includes(status)) {
    return "destructive" as const;
  }

  return "outline" as const;
}

export default async function SourcesPage() {
  const activeTenant = await getActiveTenant();

  if (!activeTenant) {
    return (
      <main className="min-h-svh bg-background p-6">
        <div className="mx-auto flex min-h-[calc(100svh-3rem)] max-w-3xl items-center">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>No workspace yet</CardTitle>
              <CardDescription>
                Your account is not attached to a tenant workspace.
              </CardDescription>
            </CardHeader>
            <CardContent>
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

  const { membership } = activeTenant;
  const tenantId = membership.tenant.id;
  const [sources, runs, errors, sourceCount, pointCount] =
    await withTenantContext(tenantId, async (tx) =>
      Promise.all([
        tx.dataSource.findMany({
          where: { tenantId },
          orderBy: { updatedAt: "desc" },
          take: 8,
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            recordCount: true,
            lastSyncedAt: true,
            createdAt: true,
          },
        }),
        tx.ingestionRun.findMany({
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
        tx.ingestionError.findMany({
          where: { tenantId },
          orderBy: { createdAt: "desc" },
          take: 8,
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
        tx.dataSource.count({ where: { tenantId } }),
        tx.metricPoint.count({ where: { tenantId } }),
      ]),
    );

  return (
    <main className="min-h-svh bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-lg border bg-card p-4 text-card-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <DatabaseIcon aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-semibold tracking-tight">
                  Sources
                </h1>
                <Badge variant="secondary">{membership.tenant.name}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                /{membership.tenant.slug} CSV ingestion and source health
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard">
                <ArrowLeftIcon data-icon="inline-start" />
                Dashboard
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

        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                Connected sources
              </CardTitle>
              <CardAction>
                <FileTextIcon aria-hidden />
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{formatNumber(sourceCount)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                Metric points
              </CardTitle>
              <CardAction>
                <CheckCircle2Icon aria-hidden />
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{formatNumber(pointCount)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                Recent errors
              </CardTitle>
              <CardAction>
                <AlertCircleIcon aria-hidden />
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{formatNumber(errors.length)}</p>
            </CardContent>
          </Card>
        </section>

        <CsvIngestionForm />

        <section className="grid gap-4 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Recent sources</CardTitle>
              <CardDescription>CSV and future ingestion sources.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {sources.length > 0 ? (
                sources.map((source) => (
                  <div key={source.id} className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{source.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {humanize(source.type)} -{" "}
                          {formatNumber(source.recordCount)} points
                        </p>
                      </div>
                      <Badge variant={statusVariant(source.status)}>
                        {humanize(source.status)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Last sync: {formatDate(source.lastSyncedAt)}
                    </p>
                    <Separator />
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Upload a CSV to create your first data source.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ingestion runs</CardTitle>
              <CardDescription>Latest import outcomes.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {runs.length > 0 ? (
                runs.map((run) => (
                  <div key={run.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{run.dataSource.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(run.startedAt)} -{" "}
                        {formatNumber(run.rowsInserted)} points from{" "}
                        {formatNumber(run.rowsRead)} rows
                      </p>
                      {run.errorCount > 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {formatNumber(run.errorCount)} errors recorded
                        </p>
                      ) : null}
                    </div>
                    <Badge variant={statusVariant(run.status)}>
                      {humanize(run.status)}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Import history will appear after the first upload.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ingestion errors</CardTitle>
              <CardDescription>Recent rejected row samples.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {errors.length > 0 ? (
                errors.map((error) => (
                  <div key={error.id} className="flex flex-col gap-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="truncate font-medium">
                        {error.dataSource.name}
                      </p>
                      <Badge variant="outline">
                        Row {error.rowNumber ?? "?"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {error.fieldName ? `${error.fieldName}: ` : ""}
                      {error.message}
                    </p>
                    {error.rawValue ? (
                      <p className="truncate text-sm text-muted-foreground">
                        Value: {error.rawValue}
                      </p>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Rejected rows will appear here when imports contain invalid
                  timestamps or non-numeric metric values.
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
