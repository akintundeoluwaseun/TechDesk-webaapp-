// jsPDF's standard 14 fonts only reliably support WinAnsi/Latin-1 characters.
// Anything outside that (bullets, smart quotes, em dashes, checkbox glyphs,
// currency symbols like Naira, emoji, etc.) can silently corrupt surrounding
// text. Route any dynamic/user-editable string through this before doc.text().
export function pdfSafe(str) {
  if (!str) return str;
  return String(str)
    .replace(/[\u2022\u00b7\u2219]/g, "-") // bullet / middle dot
    .replace(/[\u2013\u2014]/g, "-") // en dash / em dash
    .replace(/\u25A1/g, "[ ]") // checkbox square
    .replace(/[\u2018\u2019]/g, "'") // curly single quotes
    .replace(/[\u201C\u201D]/g, '"') // curly double quotes
    .replace(/\u2026/g, "...") // ellipsis
    .replace(/\u20A6/g, "N") // Naira sign
    .replace(/[^\x00-\xFF]/g, ""); // safety net: strip anything else non-Latin-1
}
