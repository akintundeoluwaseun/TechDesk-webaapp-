import { saveBlob } from "./saveFile";

// Escapes a value for a CSV cell: wraps in quotes and doubles any inner
// quotes whenever the value contains a comma, quote, or newline.
function csvCell(value) {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function rowsToCsv(rows) {
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

export function downloadCsv(filename, csvString) {
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  return saveBlob(blob, filename);
}
