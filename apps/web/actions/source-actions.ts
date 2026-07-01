"use server";

import { revalidatePath } from "next/cache";

import {
  CSV_ERROR_SAMPLE_COUNT,
  CSV_PREVIEW_ROW_COUNT,
  CSV_UPLOAD_LIMIT_BYTES,
  CsvErrorSample,
  guessNumericColumns,
  guessTimestampColumn,
  parseCsvText,
  parseNumericValue,
  parseTimestamp,
  slugifyMetricKey,
} from "@/lib/csv-ingestion";
import { requireActiveTenantId } from "@/lib/tenant";
import { withTenantContext } from "@repo/db";

export type CsvPreviewState = {
  error?: string;
  csvText?: string;
  fileName?: string;
  sourceName?: string;
  headers?: string[];
  sampleRows?: Record<string, string>[];
  guessedTimestampColumn?: string;
  guessedMetricColumns?: string[];
  rowCount?: number;
};

export type CsvImportState = {
  error?: string;
  success?: string;
  summary?: {
    sourceName: string;
    rowsRead: number;
    acceptedRows: number;
    rejectedRows: number;
    pointsInserted: number;
    errorCount: number;
  };
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function getSelectedMetricColumns(formData: FormData) {
  return formData
    .getAll("metricColumns")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function previewCsvUpload(
  _previousState: CsvPreviewState,
  formData: FormData,
): Promise<CsvPreviewState> {
  await requireActiveTenantId();

  const file = formData.get("csvFile");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a CSV file to preview." };
  }

  if (!file.name.toLowerCase().endsWith(".csv")) {
    return { error: "Only .csv files are supported." };
  }

  if (file.size > CSV_UPLOAD_LIMIT_BYTES) {
    return { error: "CSV files must be 2 MB or smaller for this version." };
  }

  const csvText = await file.text();
  const sourceName =
    getString(formData, "sourceName") || file.name.replace(/\.csv$/iu, "");
  const parsed = parseCsvText(csvText);

  if (parsed.headers.length === 0 || parsed.rows.length === 0) {
    return { error: "The CSV needs a header row and at least one data row." };
  }

  const sampleRows = parsed.rows.slice(0, CSV_PREVIEW_ROW_COUNT);
  const guessedTimestampColumn = guessTimestampColumn(
    parsed.headers,
    sampleRows,
  );
  const guessedMetricColumns = guessNumericColumns(
    parsed.headers,
    sampleRows,
    guessedTimestampColumn,
  );

  return {
    csvText,
    fileName: file.name,
    sourceName,
    headers: parsed.headers,
    sampleRows,
    guessedTimestampColumn,
    guessedMetricColumns,
    rowCount: parsed.rows.length,
  };
}

export async function importCsvUpload(
  _previousState: CsvImportState,
  formData: FormData,
): Promise<CsvImportState> {
  const tenantId = await requireActiveTenantId();
  const csvText = getString(formData, "csvText");
  const sourceName = getString(formData, "sourceName");
  const timestampColumn = getString(formData, "timestampColumn");
  const metricColumns = getSelectedMetricColumns(formData);

  if (!csvText || !sourceName) {
    return { error: "Preview a CSV before importing it." };
  }

  const parsed = parseCsvText(csvText);

  if (!timestampColumn || !parsed.headers.includes(timestampColumn)) {
    return { error: "Choose a timestamp column." };
  }

  const selectedMetricColumns = metricColumns.filter((column) =>
    parsed.headers.includes(column),
  );

  if (selectedMetricColumns.length === 0) {
    return { error: "Choose at least one numeric metric column." };
  }

  const errors: Array<CsvErrorSample & { fieldName?: string }> = [];
  const acceptedRowNumbers = new Set<number>();
  const rejectedRowNumbers = new Set<number>();
  const preparedMetricValues: Array<{
    column: string;
    timestamp: Date;
    numberValue: number;
  }> = [];

  parsed.rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const timestampValue = row[timestampColumn] ?? "";
    const timestamp = parseTimestamp(timestampValue);

    if (!timestamp) {
      rejectedRowNumbers.add(rowNumber);
      errors.push({
        rowNumber,
        fieldName: timestampColumn,
        message: "Invalid timestamp.",
        rawValue: timestampValue,
      });
      return;
    }

    let rowHadPoint = false;

    for (const column of selectedMetricColumns) {
      const rawValue = row[column] ?? "";
      const numberValue = parseNumericValue(rawValue);

      if (numberValue === null) {
        rejectedRowNumbers.add(rowNumber);
        errors.push({
          rowNumber,
          fieldName: column,
          message: "Missing or non-numeric metric value.",
          rawValue,
        });
        continue;
      }

      rowHadPoint = true;
      preparedMetricValues.push({
        column,
        timestamp,
        numberValue,
      });
    }

    if (rowHadPoint) {
      acceptedRowNumbers.add(rowNumber);
    }
  });

  const importResult = await withTenantContext(tenantId, async (tx) => {
    const dataSource = await tx.dataSource.create({
      data: {
        tenantId,
        type: "CSV",
        name: sourceName,
        status: "ACTIVE",
        config: {
          fileName: getString(formData, "fileName") || null,
          timestampColumn,
          metricColumns: selectedMetricColumns,
        },
      },
      select: { id: true, name: true },
    });

    const ingestionRun = await tx.ingestionRun.create({
      data: {
        tenantId,
        dataSourceId: dataSource.id,
        status: "RUNNING",
        rowsRead: parsed.rows.length,
      },
      select: { id: true },
    });

    const metricsByColumn = new Map<string, { id: string; key: string }>();

    for (const column of selectedMetricColumns) {
      const key = `csv_${slugifyMetricKey(column)}`;
      const metric = await tx.metric.upsert({
        where: {
          tenantId_key: {
            tenantId,
            key,
          },
        },
        create: {
          tenantId,
          key,
          name: column,
          kind: "RAW",
          valueType: "NUMBER",
        },
        update: {
          name: column,
          valueType: "NUMBER",
        },
        select: { id: true, key: true },
      });

      metricsByColumn.set(column, metric);

      await tx.dataSourceMapping.upsert({
        where: {
          dataSourceId_sourceField: {
            dataSourceId: dataSource.id,
            sourceField: column,
          },
        },
        create: {
          tenantId,
          dataSourceId: dataSource.id,
          sourceField: column,
          metricId: metric.id,
          valueType: "NUMBER",
        },
        update: {
          metricId: metric.id,
          valueType: "NUMBER",
          timestampField: false,
        },
      });
    }

    await tx.dataSourceMapping.upsert({
      where: {
        dataSourceId_sourceField: {
          dataSourceId: dataSource.id,
          sourceField: timestampColumn,
        },
      },
      create: {
        tenantId,
        dataSourceId: dataSource.id,
        sourceField: timestampColumn,
        timestampField: true,
        valueType: "STRING",
      },
      update: {
        timestampField: true,
        valueType: "STRING",
      },
    });

    const metricPoints: Array<{
      tenantId: string;
      metricId: string;
      dataSourceId: string;
      timestamp: Date;
      numberValue: number;
      dimensions: {
        sourceColumn: string;
        sourceName: string;
      };
    }> = [];

    for (const preparedValue of preparedMetricValues) {
      const metric = metricsByColumn.get(preparedValue.column);

      if (!metric) {
        continue;
      }

      metricPoints.push({
        tenantId,
        metricId: metric.id,
        dataSourceId: dataSource.id,
        timestamp: preparedValue.timestamp,
        numberValue: preparedValue.numberValue,
        dimensions: {
          sourceColumn: preparedValue.column,
          sourceName,
        },
      });
    }

    if (metricPoints.length > 0) {
      await tx.metricPoint.createMany({
        data: metricPoints,
      });
    }

    const errorSamples = errors.slice(0, CSV_ERROR_SAMPLE_COUNT);

    if (errorSamples.length > 0) {
      await tx.ingestionError.createMany({
        data: errorSamples.map((error) => ({
          tenantId,
          dataSourceId: dataSource.id,
          runId: ingestionRun.id,
          rowNumber: error.rowNumber,
          fieldName: error.fieldName,
          message: error.message,
          rawValue: error.rawValue,
        })),
      });
    }

    const rowsRead = parsed.rows.length;
    const acceptedRows = acceptedRowNumbers.size;
    const rejectedRows = rejectedRowNumbers.size;
    const summary = {
      sourceName,
      timestampColumn,
      metricColumns: selectedMetricColumns,
      rowsRead,
      acceptedRows,
      rejectedRows,
      pointsInserted: metricPoints.length,
      errorCount: errors.length,
      errorSamples,
    };

    await tx.ingestionRun.update({
      where: { id: ingestionRun.id },
      data: {
        status: errors.length === rowsRead ? "FAILED" : "SUCCEEDED",
        finishedAt: new Date(),
        rowsInserted: metricPoints.length,
        errorCount: errors.length,
        summary,
      },
    });

    await tx.dataSource.update({
      where: { id: dataSource.id },
      data: {
        status: errors.length === rowsRead ? "ERROR" : "ACTIVE",
        recordCount: metricPoints.length,
        lastSyncedAt: new Date(),
      },
    });

    return summary;
  });

  revalidatePath("/sources");
  revalidatePath("/dashboard");

  return {
    success: `Imported ${importResult.pointsInserted} metric points from ${importResult.sourceName}.`,
    summary: {
      sourceName: importResult.sourceName,
      rowsRead: importResult.rowsRead,
      acceptedRows: importResult.acceptedRows,
      rejectedRows: importResult.rejectedRows,
      pointsInserted: importResult.pointsInserted,
      errorCount: importResult.errorCount,
    },
  };
}
