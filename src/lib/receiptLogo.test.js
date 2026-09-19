import { describe, it, expect, beforeEach } from "vitest";
import { generateInvoicePdf } from "./generateInvoicePdf";
import { generateThermalReceiptPdf } from "./generateThermalReceipt";
import { generateRepairTicketPdf } from "./generateRepairPdf";
import { receiptFilename } from "./saveFile";

// A 2x2 PNG. Small, real, and decodable -- jsPDF reads the header.
const LOGO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FAP5FDvcfRYWgAAAAAElFTkSuQmCC";

const SALE = {
  id: "s1",
  invoice: "INV-00001",
  createdAt: new Date().toISOString(),
  customerName: "Oluwaseun",
  customerPhone: "07066469118",
  total: 500000,
  subtotal: 500000,
  amountPaid: 500000,
  paymentStatus: "Paid",
  paymentMethod: "Bank Transfer",
  items: [{ id: "i1", name: "Hp 15", qty: 1, price: 500000 }],
};

const REPAIR = {
  id: "r1",
  ticket: "TCK-00001",
  createdAt: new Date().toISOString(),
  customerName: "Oluwaseun",
  customerPhone: "07066469118",
  device: "iPhone 11",
  problem: "Cracked screen",
  items: [],
};

function settings(extra) {
  localStorage.setItem("techdesk_settings", JSON.stringify({ shopName: "Oluwaseun", ...extra }));
}

/** jsPDF writes an image as a PDF XObject; no image, no such object. */
const hasImage = (doc) => doc.output("datauristring").length > 0 && /\/Subtype\s*\/Image/.test(doc.output());

describe("receipts carry the shop's own logo", () => {
  beforeEach(() => localStorage.clear());

  it("draws the uploaded logo on the A4 invoice", () => {
    settings({ logo: LOGO });
    expect(hasImage(generateInvoicePdf(SALE, { autoOpen: false }))).toBe(true);
  });

  it("draws it on the 58mm receipt too", () => {
    settings({ logo: LOGO });
    expect(hasImage(generateThermalReceiptPdf(SALE, { autoOpen: false }))).toBe(true);
  });

  it("draws it on the repair ticket", () => {
    settings({ logo: LOGO });
    expect(hasImage(generateRepairTicketPdf(REPAIR, { autoOpen: false }))).toBe(true);
  });

  it("draws nothing at all when no logo is set", () => {
    // The old build drew an empty rectangle here, which read on every
    // receipt as a picture that had failed to load.
    settings({});
    expect(hasImage(generateInvoicePdf(SALE, { autoOpen: false }))).toBe(false);
  });

  it("survives a logo that is not a usable image", () => {
    settings({ logo: "data:image/png;base64,not-really-a-png" });
    expect(() => generateInvoicePdf(SALE, { autoOpen: false })).not.toThrow();
  });
});

describe("a receipt is filed under the customer's name", () => {
  it("puts the name in front of the number", () => {
    expect(receiptFilename("Oluwaseun", "INV-00001")).toBe("Oluwaseun - INV-00001.pdf");
    expect(receiptFilename("Oluwaseun", "INV-00001", "58mm")).toBe("Oluwaseun - INV-00001-58mm.pdf");
  });

  it("falls back to the number for a walk-in", () => {
    expect(receiptFilename("", "INV-00002")).toBe("INV-00002.pdf");
    expect(receiptFilename(null, "INV-00002")).toBe("INV-00002.pdf");
  });

  it("never lets a name create a folder or break a save", () => {
    expect(receiptFilename("Ade / Bola", "INV-3")).toBe("Ade Bola - INV-3.pdf");
    expect(receiptFilename('A"B:C*D?', "INV-4")).toBe("A B C D - INV-4.pdf");
  });
});
