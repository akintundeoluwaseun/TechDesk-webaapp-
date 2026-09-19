import jsPDF from "jspdf";
import { savePdf, printPdf, receiptFilename } from "./saveFile";
import autoTable from "jspdf-autotable";
import { db } from "./db";
import { pdfSafe } from "./pdfSafe";
import { currencyPdfSymbol } from "./currency";

export function generateInvoicePdf(sale, { autoOpen = true, print = false } = {}) {
  const settings = db.getSettings();
  const cur = currencyPdfSymbol(settings);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 40;
  const contentW = pageW - marginX * 2;
  let y = 40;

  // ---- Header ----
  // The shop's own logo when it has one, and nothing when it has not. The
  // empty rectangle that used to sit here read as a broken image on every
  // receipt a customer was handed.
  const afterLogo = drawLogo(doc, settings, pageW / 2, y, 90, 45);
  // +30pt, not +16: doc.text puts the BASELINE here, and a 26pt capital
  // reaches about 19pt above it. At +16 the shop name sat inside the logo.
  y = afterLogo > y ? afterLogo + 30 : y + 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text(pdfSafe(settings.shopName || "TechDesk").toUpperCase(), pageW / 2, y, { align: "center" });
  y += 20;

  if (settings.tagline) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(pdfSafe(settings.tagline), pageW / 2, y, { align: "center" });
    y += 22;
  }

  const contactParts = [settings.phone, settings.address, settings.email].filter(Boolean).map(pdfSafe);
  if (contactParts.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text(contactParts.join("     |     "), pageW / 2, y, { align: "center" });
    y += 14;
  }

  doc.setLineWidth(1);
  doc.line(marginX, y, pageW - marginX, y);
  y += 30;

  // ---- Title ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("SALES RECEIPT", pageW / 2, y, { align: "center" });
  y += 30;

  // ---- Invoice meta (left) + payment status (right) ----
  const metaTop = y;
  doc.setFontSize(10.5);
  const metaRows = [
    ["Invoice No", sale.invoice],
    ["Date", new Date(sale.createdAt).toLocaleDateString("en-GB")],
    ["Time", new Date(sale.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })],
    ["Sold By", sale.soldBy || "Admin"],
  ];
  metaRows.forEach(([label, value], i) => {
    const ly = metaTop + i * 16;
    doc.setFont("helvetica", "bold");
    doc.text(label, marginX, ly);
    doc.setFont("helvetica", "normal");
    doc.text(`: ${pdfSafe(value)}`, marginX + 70, ly);
  });

  // payment status badge (top right)
  const badgeW = 165,
    badgeX = pageW - marginX - badgeW;
  doc.setFillColor(15, 15, 15);
  doc.rect(badgeX, metaTop - 12, badgeW, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("PAYMENT STATUS", badgeX + badgeW / 2, metaTop + 3, { align: "center" });

  doc.setFillColor(235, 235, 235);
  doc.rect(badgeX, metaTop + 10, badgeW, 26, "F");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(13);
  doc.text((sale.paymentStatus || "PENDING").toUpperCase(), badgeX + badgeW / 2, metaTop + 28, {
    align: "center",
  });
  doc.setTextColor(0, 0, 0);

  y = metaTop + 16 * metaRows.length + 26;

  // ---- Customer details ----
  doc.setFillColor(15, 15, 15);
  doc.rect(marginX, y, 150, 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("CUSTOMER DETAILS", marginX + 10, y + 14);
  doc.setTextColor(0, 0, 0);
  y += 20;

  const boxTop = y;
  const boxH = 56;
  doc.setLineWidth(1);
  doc.roundedRect(marginX, boxTop, contentW, boxH, 4, 4, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  const col2X = marginX + contentW / 2 + 10;
  doc.text("Name", marginX + 20, boxTop + 22);
  doc.text("Phone", marginX + 20, boxTop + 42);
  doc.text("Email", col2X, boxTop + 22);
  doc.text("Address", col2X, boxTop + 42);

  doc.setFont("helvetica", "normal");
  doc.text(`: ${pdfSafe(sale.customerName) || "Walk-in"}`, marginX + 75, boxTop + 22);
  doc.text(`: ${pdfSafe(sale.customerPhone) || "-"}`, marginX + 75, boxTop + 42);
  doc.text(`: ${pdfSafe(sale.customerEmail) || "-"}`, col2X + 55, boxTop + 22);
  doc.text(`: ${pdfSafe(sale.customerAddress) || "-"}`, col2X + 55, boxTop + 42);

  y = boxTop + boxH + 26;

  // ---- Items table ----
  const rows = (sale.items || []).map((item, idx) => [
    String(idx + 1),
    pdfSafe(item.name),
    item.imei ? `Serial No: ${pdfSafe(item.imei)}` : "N/A",
    String(item.qty),
    `${cur}${Number(item.price).toLocaleString()}`,
    `${cur}${Number(item.price * item.qty).toLocaleString()}`,
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [["S/N", "ITEM", "IMEI / SERIAL NO.", "QTY", "UNIT PRICE", "TOTAL"]],
    body: rows,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: { top: 8, bottom: 8, left: 4, right: 4 } },
    headStyles: { fillColor: [15, 15, 15], textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 30 },
      3: { cellWidth: 35, halign: "center" },
      4: { cellWidth: 80, halign: "right" },
      5: { cellWidth: 80, halign: "right" },
    },
    didDrawCell: (data) => {
      if (data.section === "body") {
        doc.setDrawColor(200, 200, 200);
        doc.setLineDashPattern([1, 1], 0);
        doc.line(
          data.cell.x,
          data.cell.y + data.cell.height,
          data.cell.x + data.cell.width,
          data.cell.y + data.cell.height
        );
        doc.setLineDashPattern([], 0);
      }
    },
  });

  y = doc.lastAutoTable.finalY + 20;

  // ---- Totals ----
  const totalsX = pageW - marginX - 200;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.text("Subtotal", totalsX, y);
  doc.text(`${cur}${Number(sale.subtotal).toLocaleString()}`, pageW - marginX, y, { align: "right" });
  y += 18;
  if (sale.discount) {
    doc.text("Discount", totalsX, y);
    doc.text(`- ${cur}${Number(sale.discount).toLocaleString()}`, pageW - marginX, y, { align: "right" });
    y += 18;
  }
  doc.setLineWidth(0.75);
  doc.line(totalsX, y, pageW - marginX, y);
  y += 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("TOTAL", totalsX, y);
  doc.text(`${cur}${Number(sale.total).toLocaleString()}`, pageW - marginX, y, { align: "right" });
  y += 30;

  // ---- Payment details ----
  doc.setFillColor(15, 15, 15);
  doc.rect(marginX, y, 150, 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("PAYMENT DETAILS", marginX + 10, y + 14);
  doc.setTextColor(0, 0, 0);
  y += 20;

  const payBoxTop = y;
  const payBoxH = 50;
  doc.setLineWidth(1);
  doc.roundedRect(marginX, payBoxTop, contentW, payBoxH, 4, 4, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Payment Method", marginX + 20, payBoxTop + 22);
  doc.text("Amount Paid", marginX + 20, payBoxTop + 40);
  doc.text("Balance", col2X, payBoxTop + 22);

  doc.setFont("helvetica", "normal");
  doc.text(`: ${pdfSafe(sale.paymentMethod) || "-"}`, marginX + 115, payBoxTop + 22);
  doc.text(`: ${cur}${Number(sale.amountPaid || 0).toLocaleString()}`, marginX + 115, payBoxTop + 40);
  const balance = Math.max(0, Number(sale.total) - Number(sale.amountPaid || 0));
  doc.text(`: ${cur}${balance.toLocaleString()}`, col2X + 55, payBoxTop + 22);

  y = payBoxTop + payBoxH + 22;

  // ---- Footer ----
  doc.setLineDashPattern([2, 2], 0);
  doc.setLineWidth(0.5);
  doc.line(marginX, y, pageW - marginX, y);
  doc.setLineDashPattern([], 0);
  y += 26;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Thank you for your patronage!", pageW / 2, y, { align: "center" });
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text("We appreciate your trust in us.", pageW / 2, y, { align: "center" });
  y += 16;
  if (settings.phone) {
    doc.text(pdfSafe(settings.phone), pageW / 2, y, { align: "center" });
    y += 22;
  } else {
    y += 6;
  }

  doc.setLineDashPattern([2, 2], 0);
  doc.line(marginX, y, pageW - marginX, y);
  doc.setLineDashPattern([], 0);
  y += 18;

  doc.setFontSize(9);
  doc.text(`Powered by ${pdfSafe(settings.shopName || "TechDesk")}`, pageW / 2, y, { align: "center" });

  const filename = receiptFilename(sale.customerName, sale.invoice);
  if (autoOpen) {
    // print: straight to whatever views PDFs here, so nothing has to be
    // fished back out of Downloads to be shown to the customer.
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
