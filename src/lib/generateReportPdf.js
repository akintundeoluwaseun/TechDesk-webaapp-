import jsPDF from "jspdf";
import { savePdf } from "./saveFile";
import autoTable from "jspdf-autotable";
import { db } from "./db";
import { pdfSafe } from "./pdfSafe";
import { currencyPdfSymbol } from "./currency";

const FILTER_LABELS = { today: "Today", "7d": "Last 7 days", "30d": "Last 30 days", month: "This month" };

export function generateReportPdf(report, filter, { autoOpen = true } = {}) {
  const settings = db.getSettings();
  const cur = currencyPdfSymbol(settings);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 40;
  const contentW = pageW - marginX * 2;
  let y = 46;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(`${pdfSafe(settings.shopName || "TechDesk")} - Report`, marginX, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  y += 18;
  doc.text(`${FILTER_LABELS[filter] || filter} - Generated ${new Date().toLocaleString("en-GB")}`, marginX, y);
  y += 16;
  doc.setLineWidth(1);
  doc.line(marginX, y, pageW - marginX, y);
  y += 28;

  // Cost sits next to profit on purpose: a profit that came out negative
  // is a real answer, and the figure it came from should be on the same
  // page rather than left for the shop to guess at.
  const statCards = [
    ["Revenue", `${cur}${report.revenue.toLocaleString()}`],
    ["Cost of goods", `${cur}${Number(report.cost || 0).toLocaleString()}`],
    ["Profit", `${cur}${report.profit.toLocaleString()}`],
    ["Outstanding", `${cur}${report.outstanding.toLocaleString()}`],
    ["Sales", String(report.salesCount)],
    ["Repairs", String(report.repairsCount)],
    ["Completed", String(report.completed)],
    ["Discounts given", `${cur}${Number(report.discount || 0).toLocaleString()}`],
  ];
  const cardW = (contentW - 20) / 3;
  statCards.forEach(([label, value], i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = marginX + col * (cardW + 10);
    const cy = y + row * 56;
    doc.setLineWidth(0.75);
    doc.roundedRect(x, cy, cardW, 46, 4, 4, "S");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(label, x + 10, cy + 16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(value, x + 10, cy + 34);
  });
  // However many rows the cards actually took, rather than a hardcoded two:
  // adding a card used to make the next section land on top of them.
  y += 56 * Math.ceil(statCards.length / 3) + 20;

  if (report.topProducts.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Top products", marginX, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [["Product", "Qty", "Revenue", "Profit"]],
      body: report.topProducts.map((p) => [
        p.name,
        String(p.qty),
        `${cur}${p.revenue.toLocaleString()}`,
        `${cur}${p.profit.toLocaleString()}`,
      ]),
      theme: "striped",
      styles: { fontSize: 9.5 },
      headStyles: { fillColor: [15, 15, 15] },
    });
    y = doc.lastAutoTable.finalY + 24;
  }

  if (report.paymentMethods.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Payment methods", marginX, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [["Method", "Sales", "Total"]],
      body: report.paymentMethods.map((m) => [m.method, String(m.sales), `${cur}${m.total.toLocaleString()}`]),
      theme: "striped",
      styles: { fontSize: 9.5 },
      headStyles: { fillColor: [15, 15, 15] },
    });
    y = doc.lastAutoTable.finalY + 24;
  }

  if (y > 680) {
    doc.addPage();
    y = 46;
  }

  if (report.repairStatus.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Repair status", marginX, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [["Status", "Count"]],
      body: report.repairStatus.map((s) => [s.status, String(s.count)]),
      theme: "striped",
      styles: { fontSize: 9.5 },
      headStyles: { fillColor: [15, 15, 15] },
    });
    y = doc.lastAutoTable.finalY + 24;
  }

  if (report.staffPerformance.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Staff performance", marginX, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [["Staff", "Sales", "Revenue", "Repairs", "Done"]],
      body: report.staffPerformance.map((s) => [
        s.staff,
        String(s.sales),
        `${cur}${s.revenue.toLocaleString()}`,
        String(s.repairs),
        String(s.done),
      ]),
      theme: "striped",
      styles: { fontSize: 9.5 },
      headStyles: { fillColor: [15, 15, 15] },
    });
  }

  if (autoOpen) savePdf(doc, `techdesk-report-${filter}.pdf`);
  return doc;
}
