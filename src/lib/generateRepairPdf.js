import jsPDF from "jspdf";
import { savePdf, printPdf, receiptFilename } from "./saveFile";
import autoTable from "jspdf-autotable";
import { db } from "./db";
import { pdfSafe } from "./pdfSafe";
import { currencyPdfSymbol } from "./currency";

function contactLine(settings) {
  return [settings.phone, settings.address, settings.email]
    .filter(Boolean)
    .map(pdfSafe)
    .join("   |   ");
}

function sectionLabel(doc, x, y, w, text) {
  doc.setFillColor(15, 15, 15);
  doc.rect(x, y, w, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(text, x + 8, y + 12.5);
  doc.setTextColor(0, 0, 0);
  return y + 18;
}

function detailGrid(doc, x, y, w, rows) {
  autoTable(doc, {
    startY: y,
    margin: { left: x, right: doc.internal.pageSize.getWidth() - x - w },
    body: rows,
    theme: "plain",
    styles: { fontSize: 9.5, cellPadding: { top: 3, bottom: 3, left: 0, right: 4 } },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: "bold" },
      1: { cellWidth: w - 60 },
    },
    tableWidth: w,
  });
  return doc.lastAutoTable.finalY;
}

function textBox(doc, x, y, w, text, minH = 30) {
  doc.setLineWidth(1);
  const lines = doc.splitTextToSize(text || "-", w - 24);
  const h = Math.max(minH, lines.length * 13 + 16);
  doc.roundedRect(x, y, w, h, 4, 4, "S");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(lines, x + 12, y + 18);
  return y + h;
}

function header(doc, marginX, settings, big = 22) {
  let y = 42;

  // The shop's logo when it has one. The empty rectangle that used to sit
  // here read as a picture that had failed to load, on every ticket handed
  // to a customer -- and the shop's real logo, uploaded in Settings, was
  // never used by any document.
  const hasLogo = drawLogoLeft(doc, settings, marginX, y - 26, 26, 20);
  const textX = marginX + (hasLogo ? 34 : 0);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(big);
  doc.text(pdfSafe(settings.shopName || "TechDesk").toUpperCase(), textX, y - 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(settings.tagline || "", textX, y + 6);

  return y + 24;
}

/** Left-aligned logo for the ticket header. True when one was drawn. */
function drawLogoLeft(doc, settings, x, y, maxW, maxH) {
  const data = settings.logo;
  if (!data || typeof data !== "string" || !data.startsWith("data:image/")) return false;
  try {
    const props = doc.getImageProperties(data);
    const scale = Math.min(maxW / props.width, maxH / props.height);
    doc.addImage(data, x, y, props.width * scale, props.height * scale);
    return true;
  } catch {
    // An unreadable image must not stop a ticket printing.
    return false;
  }
}

export function generateRepairTicketPdf(repair, { autoOpen = true, print = false } = {}) {
  const settings = db.getSettings();
  const cur = currencyPdfSymbol(settings);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 40;
  const contentW = pageW - marginX * 2;

  header(doc, marginX, settings, 22);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(pdfSafe(settings.labels.ticketTitle).toUpperCase(), pageW / 2, 46, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.text("SERVICE PASS", pageW / 2, 62, { align: "center" });

  const boxW = 170,
    boxX = pageW - marginX - boxW,
    boxY = 22;
  doc.setFillColor(15, 15, 15);
  doc.rect(boxX, boxY, boxW, 16, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("TICKET NO.", boxX + 10, boxY + 11);
  doc.setTextColor(0, 0, 0);
  doc.setLineWidth(1);
  doc.rect(boxX, boxY + 16, boxW, 66, "S");
  doc.setFontSize(13);
  doc.text(repair.ticket, boxX + 10, boxY + 36);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("DATE", boxX + 10, boxY + 51);
  doc.setFont("helvetica", "normal");
  doc.text(new Date(repair.createdAt).toLocaleDateString("en-GB"), boxX + 55, boxY + 51);
  doc.setFont("helvetica", "bold");
  doc.text("TIME", boxX + 10, boxY + 63);
  doc.setFont("helvetica", "normal");
  doc.text(
    new Date(repair.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    boxX + 55,
    boxY + 63
  );
  doc.setFont("helvetica", "bold");
  doc.text("STATUS", boxX + 10, boxY + 76);
  doc.setFillColor(15, 15, 15);
  doc.rect(boxX + 55, boxY + 69, 70, 12, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.text((repair.status || "received").toUpperCase(), boxX + 90, boxY + 77, { align: "center" });
  doc.setTextColor(0, 0, 0);

  let y = boxY + 16 + 66 + 20;
  doc.setLineWidth(1);
  doc.line(marginX, y, pageW - marginX, y);
  y += 22;

  const colW = (contentW - 20) / 2;
  const custY = sectionLabel(doc, marginX, y, 150, "CUSTOMER DETAILS");
  sectionLabel(doc, marginX + colW + 20, y, 150, `${settings.labels.itemLabel.toUpperCase()} DETAILS`);

  const custRows = [
    ["Name", pdfSafe(repair.customerName) || "-"],
    ["Phone", pdfSafe(repair.customerPhone) || "-"],
    ["Email", pdfSafe(repair.customerEmail) || "-"],
  ];
  const devRows = [
    [settings.labels.itemBrandLabel, pdfSafe(repair.device) || "-"],
    [settings.labels.serialLabel, pdfSafe(repair.serial) || "N/A"],
    [settings.labels.idLabel, pdfSafe(repair.imei) || "N/A"],
  ];
  const custBottom = detailGrid(doc, marginX + 8, custY + 8, colW - 8, custRows);
  const devBottom = detailGrid(doc, marginX + colW + 28, custY + 8, colW - 8, devRows);
  y = Math.max(custBottom, devBottom) + 18;

  y = sectionLabel(doc, marginX, y, 170, settings.labels.problemLabel.toUpperCase());
  y = textBox(doc, marginX, y, contentW, pdfSafe(repair.problem)) + 18;

  y = sectionLabel(doc, marginX, y, 220, `${settings.labels.diagnosisLabel.toUpperCase()} (Technician Use)`);
  y = textBox(doc, marginX, y, contentW, pdfSafe(repair.diagnosis) || "To be diagnosed after inspection.") + 20;

  y = sectionLabel(doc, marginX, y, 170, "SERVICE & CHARGES");
  const rows = repair.charges?.length
    ? repair.charges.map((c, i) => [
        String(i + 1),
        c.description,
        String(c.qty),
        `${cur}${Number(c.unitPrice).toLocaleString()}`,
        `${cur}${Number(c.qty * c.unitPrice).toLocaleString()}`,
      ])
    : buildDefaultRows(repair, cur);

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [["S/N", "DESCRIPTION", "QTY", "UNIT PRICE", "AMOUNT"]],
    body: rows,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: { top: 7, bottom: 7, left: 4, right: 4 } },
    headStyles: { fillColor: [15, 15, 15], textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 30 },
      2: { cellWidth: 40, halign: "center" },
      3: { cellWidth: 100, halign: "right" },
      4: { cellWidth: 100, halign: "right" },
    },
  });

  y = doc.lastAutoTable.finalY + 18;
  const totalsX = pageW - marginX - 220;
  // Labour plus whatever parts went in. The table lists parts as their own
  // priced lines, so a total of labour alone would not match the column above
  // it -- the customer would be reading two different numbers for one job.
  const partsTotal = (repair.parts || []).reduce(
    (sum, part) => sum + Number(part.qty || 0) * Number(part.price || 0),
    0
  );
  const grandTotal = Number(repair.repairCost || 0) + partsTotal;
  const estTotal = grandTotal ? `${cur}${grandTotal.toLocaleString()}` : `${cur}0 - ${cur}XX,XXX`;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text("ESTIMATED TOTAL", totalsX, y);
  doc.text(estTotal, pageW - marginX, y, { align: "right" });
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.text("DEPOSIT PAID", totalsX, y);
  doc.text(`${cur}${Number(repair.depositPaid || 0).toLocaleString()}`, pageW - marginX, y, { align: "right" });
  y += 10;
  doc.line(totalsX, y, pageW - marginX, y);
  y += 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("BALANCE DUE", totalsX, y);
  doc.text(estTotal, pageW - marginX, y, { align: "right" });
  y += 30;

  const boxW2 = (contentW - 40) / 3;
  const sigY = y;
  const sigH = 84;
  doc.setLineWidth(1);
  doc.roundedRect(marginX, sigY, boxW2, sigH, 4, 4, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("TERMS & CONDITIONS", marginX + 10, sigY + 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  [
    "Devices are left at the owner's risk.",
    "TechDesk is not liable for any data loss.",
    "Payment is required upon completion.",
    "This ticket must be presented for collection.",
  ].forEach((line, i) => doc.text(`- ${line}`, marginX + 10, sigY + 32 + i * 12, { maxWidth: boxW2 - 20 }));

  doc.roundedRect(marginX + boxW2 + 20, sigY, boxW2, sigH, 4, 4, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("RECEIVED BY (TECHNICIAN)", marginX + boxW2 + 30, sigY + 16);
  doc.line(marginX + boxW2 + 30, sigY + sigH - 16, marginX + boxW2 * 2 + 10, sigY + sigH - 16);

  doc.roundedRect(marginX + (boxW2 + 20) * 2, sigY, boxW2, sigH, 4, 4, "S");
  doc.text("CUSTOMER SIGNATURE", marginX + (boxW2 + 20) * 2 + 10, sigY + 16);
  doc.line(marginX + (boxW2 + 20) * 2 + 10, sigY + sigH - 16, pageW - marginX - 10, sigY + sigH - 16);

  const filename = receiptFilename(repair.customerName, repair.ticket);
  if (autoOpen) {
    if (print) printPdf(doc, filename);
    else savePdf(doc, filename);
  }
  return doc;
}

export function generateBlankRepairFormPdf({ autoOpen = true } = {}) {
  const settings = db.getSettings();
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 34;
  const contentW = pageW - marginX * 2;

  function underline(x, yy, w) {
    doc.setLineWidth(0.5);
    doc.line(x, yy, x + w, yy);
  }

  function copyHeader(sectionTop, labelText) {
    let y = sectionTop + 34;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(pdfSafe(settings.shopName || "TechDesk").toUpperCase(), marginX, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(settings.tagline || "", marginX, y + 12);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(pdfSafe(settings.labels.ticketTitle).toUpperCase(), pageW / 2, y - 6, { align: "center" });
    doc.setFillColor(15, 15, 15);
    const lw = doc.getTextWidth(labelText) + 16;
    doc.setFontSize(8.5);
    doc.rect(pageW / 2 - lw / 2, y, lw, 14, "F");
    doc.setTextColor(255, 255, 255);
    doc.text(labelText, pageW / 2, y + 10, { align: "center" });
    doc.setTextColor(0, 0, 0);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(
      contactLine(settings),
      marginX,
      y + 26
    );

    const boxW = 120;
    doc.setLineWidth(0.75);
    doc.rect(pageW - marginX - boxW, y - 22, boxW, 48, "S");
    doc.setFontSize(7.5);
    doc.text("DATE   :", pageW - marginX - boxW + 8, y - 9);
    underline(pageW - marginX - boxW + 42, y - 10, boxW - 52);
    doc.text("TIME    :", pageW - marginX - boxW + 8, y + 4);
    underline(pageW - marginX - boxW + 42, y + 3, boxW - 52);
    doc.text("STATUS :", pageW - marginX - boxW + 8, y + 17);
    underline(pageW - marginX - boxW + 42, y + 16, boxW - 52);

    return y + 40;
  }

  function customerDetailsBox(y, label) {
    doc.setFillColor(15, 15, 15);
    doc.rect(marginX, y, 140, 14, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(label || "CUSTOMER DETAILS", marginX + 8, y + 10);
    doc.setTextColor(0, 0, 0);
    y += 14;
    const h = 42;
    doc.setLineWidth(0.75);
    doc.roundedRect(marginX, y, contentW, h, 3, 3, "S");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const half = contentW / 2;
    doc.text("Name", marginX + 10, y + 16);
    underline(marginX + 42, y + 17, half - 55);
    doc.text("Phone", marginX + half + 15, y + 16);
    underline(marginX + half + 48, y + 17, half - 60);
    doc.text("Email", marginX + 10, y + 32);
    underline(marginX + 42, y + 33, half - 55);
    doc.text("Address", marginX + half + 15, y + 32);
    underline(marginX + half + 55, y + 33, half - 67);
    return y + h;
  }

  // ---- Section 1: Engineer copy ----
  let y = copyHeader(0, "ENGINEER COPY");
  y = customerDetailsBox(y + 4);
  y += 10;

  doc.setFillColor(15, 15, 15);
  doc.rect(marginX, y, 140, 14, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text(settings.labels.problemLabel.toUpperCase(), marginX + 8, y + 10);
  doc.setTextColor(0, 0, 0);
  y += 14;
  doc.roundedRect(marginX, y, contentW, 18, 3, 3, "S");
  y += 26;

  doc.setFillColor(15, 15, 15);
  doc.rect(marginX, y, 190, 14, "F");
  doc.setTextColor(255, 255, 255);
  doc.text(`${settings.labels.diagnosisLabel.toUpperCase()} (Technician Use)`, marginX + 8, y + 10);
  doc.setTextColor(0, 0, 0);
  y += 14;
  doc.roundedRect(marginX, y, contentW, 18, 3, 3, "S");
  y += 26;

  doc.setFillColor(15, 15, 15);
  doc.rect(marginX, y, 130, 14, "F");
  doc.setTextColor(255, 255, 255);
  doc.text("SERVICE & CHARGES", marginX + 8, y + 10);
  doc.setTextColor(0, 0, 0);
  const tableTop = y + 14;

  const totalsX = pageW - marginX - 160;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text("ESTIMATED TOTAL  : N", totalsX, y + 14);
  underline(totalsX + 110, y + 15, 45);
  doc.text("DEPOSIT PAID       : N", totalsX, y + 30);
  underline(totalsX + 110, y + 31, 45);
  doc.setFont("helvetica", "bold");
  doc.text("BALANCE DUE       : N", totalsX, y + 46);
  underline(totalsX + 110, y + 47, 45);

  autoTable(doc, {
    startY: tableTop,
    margin: { left: marginX, right: pageW - marginX - (totalsX - marginX - 15) },
    head: [["S/N", "DESCRIPTION", "QTY", "PRICE", "AMOUNT"]],
    body: [1, 2, 3].map((n) => [String(n), "", "", "", ""]),
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 2.5, minCellHeight: 9 },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: "bold", lineWidth: 0.5 },
    tableLineWidth: 0.5,
    tableLineColor: [0, 0, 0],
  });

  y = Math.max(doc.lastAutoTable.finalY, y + 50) + 8;

  const smallBoxW = (contentW - 20) / 3;
  const smallBoxH = 40;
  doc.setLineWidth(0.75);
  doc.roundedRect(marginX, y, smallBoxW, smallBoxH, 3, 3, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("TERMS & CONDITIONS", marginX + 6, y + 10);
  doc.setFont("helvetica", "normal");
  ["Devices left at owner's risk.", "Not liable for data loss.", "Payment due on completion."].forEach((l, i) =>
    doc.text(`- ${l}`, marginX + 6, y + 19 + i * 8, { maxWidth: smallBoxW - 12 })
  );

  doc.roundedRect(marginX + smallBoxW + 10, y, smallBoxW, smallBoxH, 3, 3, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("RECEIVED BY (TECHNICIAN)", marginX + smallBoxW + 16, y + 12);
  underline(marginX + smallBoxW + 16, y + smallBoxH - 8, smallBoxW - 16);

  doc.roundedRect(marginX + (smallBoxW + 10) * 2, y, smallBoxW, smallBoxH, 3, 3, "S");
  doc.text("CUSTOMER SIGNATURE", marginX + (smallBoxW + 10) * 2 + 6, y + 12);
  underline(marginX + (smallBoxW + 10) * 2 + 6, y + smallBoxH - 8, smallBoxW - 16);

  y += smallBoxH;

  // ---- cut line 1 (placed just after section 1's actual content, not a fixed third) ----
  const cutY1 = y + 14;
  doc.setLineDashPattern([4, 3], 0);
  doc.setLineWidth(0.75);
  doc.line(marginX - 15, cutY1, pageW - marginX + 15, cutY1);
  doc.setLineDashPattern([], 0);

  // ---- Section 2: Customer copy ----
  y = copyHeader(cutY1 + 8, "CUSTOMER COPY");
  y = customerDetailsBox(y + 4, "CUSTOMER DETAILS");
  y += 10;

  doc.setFillColor(15, 15, 15);
  doc.rect(marginX, y, 250, 14, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text(`${settings.labels.problemLabel.toUpperCase()} (Confirmed by Customer)`, marginX + 8, y + 10);
  doc.setTextColor(0, 0, 0);
  y += 14;
  doc.roundedRect(marginX, y, contentW, 18, 3, 3, "S");
  y += 26;

  const confirmBoxW = contentW * 0.62;
  doc.roundedRect(marginX, y, confirmBoxW, 48, 3, 3, "S");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text("I confirm the above problem has been reported correctly.", marginX + 8, y + 14);
  doc.text("Customer Signature:", marginX + 8, y + 34);
  underline(marginX + 78, y + 35, confirmBoxW - 90);

  const noteBoxX = marginX + confirmBoxW + 12;
  doc.roundedRect(noteBoxX, y, contentW - confirmBoxW - 12, 48, 3, 3, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("NOTE TO CUSTOMER", noteBoxX + 6, y + 10);
  doc.setFont("helvetica", "normal");
  ["Keep this copy safe.", "Present when collecting.", "Charges may change."].forEach((l, i) =>
    doc.text(`- ${l}`, noteBoxX + 6, y + 19 + i * 8, { maxWidth: contentW - confirmBoxW - 24 })
  );

  y += 48;

  // ---- cut line 2 ----
  const cutY2 = y + 14;
  doc.setLineDashPattern([4, 3], 0);
  doc.line(marginX - 15, cutY2, pageW - marginX + 15, cutY2);
  doc.setLineDashPattern([], 0);

  // ---- Section 3: Service receipt ----
  y = cutY2 + 34;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(pdfSafe(settings.shopName || "TechDesk").toUpperCase(), marginX, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(settings.tagline || "", marginX, y + 12);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("SERVICE RECEIPT", pageW / 2, y - 8, { align: "center" });
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text("(After Job Completion)", pageW / 2, y + 6, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(
    contactLine(settings),
    marginX,
    y + 26
  );

  const boxW3 = 110;
  doc.setLineWidth(0.75);
  doc.rect(pageW - marginX - boxW3, y - 20, boxW3, 36, "S");
  doc.setFontSize(7.5);
  doc.text("DATE :", pageW - marginX - boxW3 + 6, y - 6);
  underline(pageW - marginX - boxW3 + 34, y - 7, boxW3 - 42);
  doc.text("TIME :", pageW - marginX - boxW3 + 6, y + 9);
  underline(pageW - marginX - boxW3 + 34, y + 8, boxW3 - 42);

  y += 32;
  const custColW = contentW * 0.33;
  doc.setFillColor(15, 15, 15);
  doc.rect(marginX, y, 130, 14, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("CUSTOMER DETAILS", marginX + 6, y + 10);
  doc.setTextColor(0, 0, 0);
  const custBoxTop = y + 14;
  doc.roundedRect(marginX, custBoxTop, custColW, 60, 3, 3, "S");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  ["Name", "Phone", "Email", "Address"].forEach((label, i) => {
    doc.text(label, marginX + 6, custBoxTop + 13 + i * 13);
    underline(marginX + 40, custBoxTop + 14 + i * 13, custColW - 48);
  });

  const chargeX = marginX + custColW + 12;
  const chargeW = contentW - custColW - 12 - 130;
  doc.setFillColor(15, 15, 15);
  doc.rect(chargeX, y, 120, 14, "F");
  doc.setTextColor(255, 255, 255);
  doc.text("SERVICE & CHARGES", chargeX + 6, y + 10);
  doc.setTextColor(0, 0, 0);

  autoTable(doc, {
    startY: custBoxTop,
    margin: { left: chargeX, right: pageW - chargeX - chargeW },
    head: [["S/N", "DESC.", "QTY", "AMT"]],
    body: [1, 2, 3].map((n) => [String(n), "", "", ""]),
    theme: "grid",
    styles: { fontSize: 6.5, cellPadding: 2.5, minCellHeight: 8 },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: "bold", lineWidth: 0.4 },
    tableLineWidth: 0.4,
    tableWidth: chargeW,
  });

  const payX = pageW - marginX - 118;
  doc.setLineWidth(0.75);
  doc.roundedRect(payX, custBoxTop, 118, 60, 3, 3, "S");
  doc.setFontSize(6.5);
  doc.text("TOTAL AMOUNT  : N", payX + 6, custBoxTop + 11);
  doc.text("LESS DEPOSIT     : N", payX + 6, custBoxTop + 23);
  doc.setFont("helvetica", "bold");
  doc.text("AMOUNT PAID    : N", payX + 6, custBoxTop + 35);
  doc.setFillColor(15, 15, 15);
  doc.rect(payX + 6, custBoxTop + 40, 55, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(5.5);
  doc.text("PAYMENT METHOD", payX + 9, custBoxTop + 47);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text("[ ] Cash  [ ] Transfer  [ ] POS", payX + 6, custBoxTop + 57);

  y = custBoxTop + 60 + 12;
  const sigBoxW = (contentW - 20) / 2;
  doc.setLineWidth(0.75);
  doc.roundedRect(marginX, y, sigBoxW, 30, 3, 3, "S");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("RECEIVED BY (TECHNICIAN)", marginX + 6, y + 12);
  underline(marginX + 6, y + 24, sigBoxW - 12);

  doc.roundedRect(marginX + sigBoxW + 20, y, sigBoxW, 30, 3, 3, "S");
  doc.text("CUSTOMER SIGNATURE", marginX + sigBoxW + 26, y + 12);
  underline(marginX + sigBoxW + 26, y + 24, sigBoxW - 12);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.text("Thank you for your patronage!", pageW - marginX, y + 10, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  if (settings.phone) doc.text(pdfSafe(settings.phone), pageW - marginX, y + 22, { align: "right" });

  if (autoOpen) savePdf(doc, "repair-ticket-form.pdf");
  return doc;
}

/**
 * The line items for a ticket that has no explicit `charges` list.
 *
 * Parts fitted from inventory are printed as their own lines. Before they were
 * recorded at all this table carried a placeholder -- "Parts (To be added
 * after diagnosis)" -- which stayed on the customer's copy even for a job
 * where the parts were known, priced and already off the shelf.
 */
function buildDefaultRows(repair, cur) {
  const rows = [
    [
      "1",
      "Labour",
      "1",
      `${cur}${Number(repair.repairCost || 0).toLocaleString()}`,
      `${cur}${Number(repair.repairCost || 0).toLocaleString()}`,
    ],
  ];

  const parts = repair.parts || [];
  if (parts.length) {
    parts.forEach((part) => {
      const qty = Number(part.qty || 0);
      const price = Number(part.price || 0);
      rows.push([
        String(rows.length + 1),
        pdfSafe(part.name || "Part"),
        String(qty),
        `${cur}${price.toLocaleString()}`,
        `${cur}${(qty * price).toLocaleString()}`,
      ]);
    });
  } else {
    rows.push([String(rows.length + 1), "Parts (To be added after diagnosis)", "-", "-", "-"]);
  }

  return rows;
}
