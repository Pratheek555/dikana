import "server-only";

import { parse } from "csv-parse/sync";

export type CsvRow = Record<string, string>;

export type CsvParseResult = {
  headers: string[];
  rows: CsvRow[];
};

export type CsvErrorSample = {
  rowNumber: number;
  fieldName?: string;
  message: string;
  rawValue?: string;
};

export const CSV_UPLOAD_LIMIT_BYTES = 2 * 1024 * 1024;
export const CSV_PREVIEW_ROW_COUNT = 5;
export const CSV_ERROR_SAMPLE_COUNT = 10;

export function slugifyMetricKey(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return slug || "metric";
}

export function parseCsvText(csvText: string): CsvParseResult {
  const records = parse(csvText, {
    bom: true,
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true,
  }) as string[][];

  const [headerRow, ...dataRows] = records;
  const headers = Array.from(
    new Set((headerRow ?? []).map((header) => header.trim()).filter(Boolean)),
  );

  if (headers.length === 0) {
    return { headers: [], rows: [] };
  }

  const rows = dataRows.map((row) =>
    Object.fromEntries(
      headers.map((header, index) => [header, row[index]?.trim() ?? ""]),
    ),
  );

  return { headers, rows };
}

export function parseTimestamp(value: string): Date | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const isoDate = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/u.exec(
    trimmed,
  );

  if (isoDate) {
    const [, year, month, day, hour = "0", minute = "0", second = "0"] =
      isoDate;
    const parsed = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    );

    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const usDate = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/u.exec(
    trimmed,
  );

  if (usDate) {
    const [, month, day, year, hour = "0", minute = "0", second = "0"] =
      usDate;
    const parsed = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    );

    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(trimmed);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parseNumericValue(value: string): number | null {
  const normalized = value.trim().replace(/,/g, "");

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

export function guessTimestampColumn(headers: string[], rows: CsvRow[]) {
  const preferred = headers.find((header) =>
    /(^|_|\s|-)(timestamp|time|date|created|created_at|occurred|occurred_at)($|_|\s|-)/iu.test(
      header,
    ),
  );

  if (preferred) {
    return preferred;
  }

  return headers
    .map((header) => ({
      header,
      score:
        rows.length === 0
          ? 0
          : rows.filter((row) => parseTimestamp(row[header] ?? "")).length /
            rows.length,
    }))
    .sort((a, b) => b.score - a.score)[0]?.header;
}

export function guessNumericColumns(
  headers: string[],
  rows: CsvRow[],
  timestampColumn?: string,
) {
  return headers.filter((header) => {
    if (header === timestampColumn) {
      return false;
    }

    const populated = rows.filter((row) => (row[header] ?? "").trim());

    if (populated.length === 0) {
      return false;
    }

    const numericCount = populated.filter(
      (row) => parseNumericValue(row[header] ?? "") !== null,
    ).length;

    return numericCount / populated.length >= 0.6;
  });
}
