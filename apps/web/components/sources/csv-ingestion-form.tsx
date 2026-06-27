"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { CheckIcon, FileUpIcon } from "lucide-react";

import {
  importCsvUpload,
  previewCsvUpload,
  type CsvImportState,
  type CsvPreviewState,
} from "@/actions/source-actions";
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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const initialPreviewState: CsvPreviewState = {};
const initialImportState: CsvImportState = {};

export function CsvIngestionForm() {
  const [previewState, previewAction, previewPending] = useActionState(
    previewCsvUpload,
    initialPreviewState,
  );
  const [importState, importAction, importPending] = useActionState(
    importCsvUpload,
    initialImportState,
  );
  const [timestampColumn, setTimestampColumn] = useState("");
  const [selectedMetricColumns, setSelectedMetricColumns] = useState<string[]>(
    [],
  );

  const headers = useMemo(
    () => previewState.headers ?? [],
    [previewState.headers],
  );
  const sampleRows = previewState.sampleRows ?? [];
  const guessedMetricColumns = useMemo(
    () => previewState.guessedMetricColumns ?? [],
    [previewState.guessedMetricColumns],
  );

  useEffect(() => {
    setTimestampColumn(previewState.guessedTimestampColumn ?? headers[0] ?? "");
    setSelectedMetricColumns(guessedMetricColumns);
  }, [guessedMetricColumns, headers, previewState.guessedTimestampColumn]);

  function toggleMetricColumn(column: string) {
    setSelectedMetricColumns((current) =>
      current.includes(column)
        ? current.filter((item) => item !== column)
        : [...current, column],
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
      <Card>
        <CardHeader>
          <CardTitle>Upload CSV</CardTitle>
          <CardDescription>
            Preview headers and sample rows before importing metric points.
          </CardDescription>
          <CardAction>
            <Badge variant="outline">Step 1</Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <form action={previewAction}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="sourceName">Source name</FieldLabel>
                <Input
                  id="sourceName"
                  name="sourceName"
                  placeholder="June sales export"
                  defaultValue={previewState.sourceName}
                />
                <FieldDescription>
                  Leave blank to use the uploaded file name.
                </FieldDescription>
              </Field>
              <Field data-invalid={Boolean(previewState.error)}>
                <FieldLabel htmlFor="csvFile">CSV file</FieldLabel>
                <Input
                  id="csvFile"
                  name="csvFile"
                  type="file"
                  accept=".csv,text/csv"
                  required
                  aria-invalid={Boolean(previewState.error)}
                />
                <FieldDescription>
                  Maximum size is 2 MB for this version.
                </FieldDescription>
                {previewState.error ? (
                  <FieldError>{previewState.error}</FieldError>
                ) : null}
              </Field>
              <Button type="submit" disabled={previewPending}>
                <FileUpIcon data-icon="inline-start" />
                {previewPending ? "Previewing..." : "Preview CSV"}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Map columns</CardTitle>
          <CardDescription>
            Choose one timestamp column and at least one numeric metric column.
          </CardDescription>
          <CardAction>
            <Badge variant={previewState.csvText ? "secondary" : "outline"}>
              Step 2
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          {previewState.csvText ? (
            <form action={importAction}>
              <FieldGroup>
                <input
                  type="hidden"
                  name="sourceName"
                  value={previewState.sourceName ?? "CSV upload"}
                />
                <input
                  type="hidden"
                  name="fileName"
                  value={previewState.fileName ?? ""}
                />
                <textarea
                  className="hidden"
                  name="csvText"
                  readOnly
                  value={previewState.csvText}
                />
                {selectedMetricColumns.map((column) => (
                  <input
                    key={column}
                    type="hidden"
                    name="metricColumns"
                    value={column}
                  />
                ))}
                <Field>
                  <FieldLabel htmlFor="timestampColumn">
                    Timestamp column
                  </FieldLabel>
                  <select
                    id="timestampColumn"
                    name="timestampColumn"
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    value={timestampColumn}
                    onChange={(event) => setTimestampColumn(event.target.value)}
                  >
                    {headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                  <FieldDescription>
                    Detected from common timestamp, date, and time labels.
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel>Metric columns</FieldLabel>
                  <div className="grid gap-2 md:grid-cols-2">
                    {headers
                      .filter((header) => header !== timestampColumn)
                      .map((header) => {
                        const checked = selectedMetricColumns.includes(header);

                        return (
                          <label
                            key={header}
                            className={cn(
                              "flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-sm",
                              checked ? "border-primary" : "border-border",
                            )}
                          >
                            <span className="truncate">{header}</span>
                            <input
                              className="size-4"
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleMetricColumn(header)}
                            />
                          </label>
                        );
                      })}
                  </div>
                  <FieldDescription>
                    Numeric-looking columns are selected automatically.
                  </FieldDescription>
                </Field>

                {importState.error ? (
                  <FieldError>{importState.error}</FieldError>
                ) : null}
                {importState.success ? (
                  <div className="flex items-center gap-2 rounded-md border bg-background p-3 text-sm">
                    <CheckIcon aria-hidden />
                    <span>{importState.success}</span>
                  </div>
                ) : null}

                <Button
                  type="submit"
                  disabled={importPending || selectedMetricColumns.length === 0}
                >
                  {importPending ? "Importing..." : "Import metric points"}
                </Button>
              </FieldGroup>
            </form>
          ) : (
            <div className="flex min-h-72 items-center justify-center rounded-md border bg-background p-6 text-center">
              <div className="flex max-w-sm flex-col gap-2">
                <h2 className="font-medium">No preview yet</h2>
                <p className="text-sm text-muted-foreground">
                  Upload a CSV to inspect headers and choose the columns that
                  should become metrics.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {previewState.csvText ? (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              {previewState.rowCount ?? 0} rows detected from{" "}
              {previewState.fileName}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    {headers.map((header) => (
                      <th key={header} className="px-3 py-2 text-left font-medium">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sampleRows.map((row, index) => (
                    <tr key={index} className="border-t">
                      {headers.map((header) => (
                        <td key={header} className="max-w-64 truncate px-3 py-2">
                          {row[header]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {importState.summary ? (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Import summary</CardTitle>
            <CardDescription>{importState.summary.sourceName}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["Rows read", importState.summary.rowsRead],
              ["Accepted rows", importState.summary.acceptedRows],
              ["Rejected rows", importState.summary.rejectedRows],
              ["Points inserted", importState.summary.pointsInserted],
              ["Errors", importState.summary.errorCount],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border bg-background p-3">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
