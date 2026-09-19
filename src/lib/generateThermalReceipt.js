import jsPDF from "jspdf";
import { savePdf, printPdf, receiptFilename } from "./saveFile";
import { db } from "./db";
import { pdfSafe } from "./pdfSafe";
import { currencyPdfSymbol } from "./currency";

const WIDTH_MM = 58;
const MARGIN_MM = 3;
const LINE_H = 4.2;

export function generateThermalReceiptPdf(sale, { autoOpen = true, print = false } = {}) {
  const settings = db.getSettings();
  const cur = currencyPdfSymbol(settings);
  const contentW = WIDTH_MM - MARGIN_MM * 2;

  const itemLines = (sale.items || []).length * 2;
  const contactLines = [settings.phone, settings.address, settings.email].filter(Boolean).length;
  const estimatedLines = 26 + itemLines + contactLines;
  const heightMM = Math.max(85, estimatedLines * LINE_H + 20);

  const doc = new jsPDF({ unit: "mm", format: [WIDTH_MM, heightMM] });
  let y = 5;

  const center = (text, size = 10, bold = false) => {
    if (!text) return;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.text(text, WIDTH_MM / 2, y, { align: "center" });
    y += LINE_H;
  };
  const left = (text, size = 8, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.text(text, MARGIN_MM, y);
    y += LINE_H;
  };
  const kv = (label, value, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(8);
    doc.text(label, MARGIN_MM, y);
    doc.text(value, WIDTH_MM - MARGIN_MM, y, { align: "right" });
    y += LINE_H;
  };
  const divider = (dashed = true) => {
    if (dashed) doc.setLineDashPattern([1, 1], 0);
    doc.setLineWidth(0.2);
    doc.line(MARGIN_MM, y, WIDTH_MM - MARGIN_MM, y);
    if (dashed) doc.setLineDashPattern([], 0);
    y += LINE_H;
  };

  // ---- Logo ----
  // The shop's own, or nothing. A 58mm roll has no room to waste on an empty
  // box, and an empty box is what this drew before.
  const afterLogo = drawLogo(doc, settings, WIDTH_MM / 2, y, 30, 14);
  y = afterLogo > y ? afterLogo + 3 : y;

  // ---- Header ----
  center(pdfSafe(settings.shopName || "TechDesk").toUpperCase(), 12, true);
  if (settings.tagline) center(pdfSafe(settings.tagline), 6.5);
  if (settings.phone) center(pdfSafe(settings.phone), 6.5);
  if (settings.address) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.splitTextToSize(pdfSafe(settings.address), contentW).forEach((l) => center(l, 6.5));
  }
  if (settings.email) center(pdfSafe(settings.email), 6.5);
  y += 0.5;
  divider(false);

  // ---- Title ----
  center("SALES RECEIPT", 9.5, true);
  y += 0.3;

  kv("Invoice No", sale.invoice);
  kv("Date", new Date(sale.createdAt).toLocaleDateString("en-GB"));
  kv("Time", new Date(sale.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
  kv("Sold By", pdfSafe(sale.soldBy) || "Admin");
  divider();

  // ---- Customer ----
  left("CUSTOMER", 7.5, true);
  kv("Name", pdfSafe(sale.customerName) || "Walk-in");
  if (sale.customerPhone) kv("Phone", pdfSafe(sale.customerPhone));
  if (sale.customerEmail) kv("Email", pdfSafe(sale.customerEmail));
  if (sale.customerAddress) kv("Address", pdfSafe(sale.customerAddress));
  divider();

  // ---- Items ----
  (sale.items || []).forEach((item) => {
    left(pdfSafe(item.name), 8);
    kv(`  ${item.qty} x ${cur}${Number(item.price).toLocaleString()}`, `${cur}${Number(item.price * item.qty).toLocaleString()}`);
  });
  divider();

  // ---- Totals ----
  kv("Subtotal", `${cur}${Number(sale.subtotal).toLocaleString()}`);
  if (sale.discount) kv("Discount", `-${cur}${Number(sale.discount).toLocaleString()}`);
  divider(false);
  kv("TOTAL", `${cur}${Number(sale.total).toLocaleString()}`, true);
  y += 1;
  divider();

  // ---- Payment ----
  left("PAYMENT", 7.5, true);
  kv("Method", pdfSafe(sale.paymentMethod) || "-");
  kv("Amount Paid", `${cur}${Number(sale.amountPaid || 0).toLocaleString()}`);
  const balance = Math.max(0, Number(sale.total) - Number(sale.amountPaid || 0));
  kv("Balance", `${cur}${balance.toLocaleString()}`);
  divider();

  // ---- Footer ----
  y += 1;
  center("Thank you for your patronage!", 8, true);
  center("We appreciate your trust in us.", 6.5);
  if (settings.phone) center(pdfSafe(settings.phone), 6.5);
  y += 1;
  center(`Powered by ${pdfSafe(settings.shopName || "TechDesk")}`, 6);

  const filename = receiptFilename(sale.customerName, sale.invoice, "58mm");
  if (autoOpen) {
    if (print) printPdf(doc, filename);
    else savePdf(doc, filename);
  }
  return doc;
}

/**
 * The shop's logo at the top of a receipt, or nothing at all.
 *
 * This used to draw a bare rectangle as a "logo mark" on every receipt,
 * whether or not the shop had a logo. On a customer's copy that reads as a
 * picture that failed to load, not as a design -- and the shop had already
 * uploaded a real logo in Settings, which no receipt ever used.
 *
 * Returns the y to carry on from, so a shop with no logo simply starts
 * higher rather than leaving a hole where the box was.
 */
function drawLogo(doc, settings, centreX, y, maxW, maxH) {
  const data = settings.logo;
  if (!data || typeof data !== "string" || !data.startsWith("data:image/")) return y;

  try {
    const props = doc.getImageProperties(data);
    // Fit inside the box without stretching: a squashed logo looks worse
    // than a small one.
    const scale = Math.min(maxW / props.width, maxH / props.height);
    const w = props.width * scale;
    const h = props.height * scale;
    doc.addImage(data, centreX - w / 2, y, w, h);
    return y + h;
  } catch {
    // An unreadable or unsupported image must not take the whole receipt
    // down -- the sale still needs its paperwork.
    return y;
  }
}
