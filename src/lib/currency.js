// What money looks like in this shop.
//
// Naira unless the shop says otherwise, because that is who TechDesk was
// built for and nobody should have to configure anything to start selling.
//
// Two formatters, not one. A screen can show the naira, cedi and euro signs;
// a PDF cannot. jsPDF's standard fonts only carry Latin-1, and a character
// outside it does not merely fail to draw -- it can corrupt the text around
// it. So those currencies carry an ASCII-safe spelling for print alongside
// their real symbol.

export const DEFAULT_CURRENCY = "NGN";

/**
 * Ten, kept short on purpose: a list a shop scrolls past is worse than a list
 * that covers where TechDesk is actually sold. Six African currencies first,
 * then the four a Nigerian shop is most likely to price in for an export or
 * a diaspora customer.
 *
 * `pdf` is the Latin-1-safe spelling, set only where the symbol itself is not
 * printable -- the naira, cedi and euro signs all sit outside Latin-1, and
 * jsPDF cannot draw them. Everything else prints as its own symbol.
 */
export const CURRENCIES = [
  { code: "NGN", symbol: "\u20A6", name: "Nigerian Naira", pdf: "N" },
  { code: "GHS", symbol: "\u20B5", name: "Ghanaian Cedi", pdf: "GHS" },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
  { code: "XOF", symbol: "CFA", name: "West African CFA Franc" },
  { code: "EGP", symbol: "E\u00A3", name: "Egyptian Pound" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "\u20AC", name: "Euro", pdf: "EUR" },
  { code: "GBP", symbol: "\u00A3", name: "British Pound" },
  { code: "CAD", symbol: "CA$", name: "Canadian Dollar" },
];

const BY_CODE = new Map(CURRENCIES.map((c) => [c.code, c]));
const FALLBACK = BY_CODE.get(DEFAULT_CURRENCY);

/**
 * The shop's currency.
 *
 * Takes the settings object, or a bare code, or nothing. A code that is not
 * on the list falls back to naira rather than throwing -- a backup restored
 * from a later version must not take the till down.
 */
export function getCurrency(settingsOrCode) {
  if (!settingsOrCode) return FALLBACK;
  const code = typeof settingsOrCode === "string"
    ? settingsOrCode
    : settingsOrCode.currency;
  return BY_CODE.get(code) || FALLBACK;
}

/** The symbol for screens. */
export function currencySymbol(settingsOrCode) {
  return getCurrency(settingsOrCode).symbol;
}

/** The Latin-1-safe spelling, for anything going into a PDF. */
export function currencyPdfSymbol(settingsOrCode) {
  const c = getCurrency(settingsOrCode);
  return c.pdf || c.symbol;
}

function groupOf(amount) {
  return Number(amount || 0).toLocaleString();
}

/** Money for a screen: "₦45,000". */
export function money(amount, settingsOrCode) {
  return `${currencySymbol(settingsOrCode)}${groupOf(amount)}`;
}

/** Money for a PDF: "N45,000" -- never a character jsPDF cannot draw. */
export function moneyPdf(amount, settingsOrCode) {
  return `${currencyPdfSymbol(settingsOrCode)}${groupOf(amount)}`;
}
