import { describe, it, expect, vi, afterEach } from "vitest";
import { waNumber, saleMessage, repairMessage, openWhatsApp } from "./share";

describe("the number wa.me is given", () => {
  it("turns the number written on a Nigerian phone into one WhatsApp accepts", () => {
    // The bug this replaces: "08012345678" went to wa.me verbatim, which
    // opens a chat with nobody and reports nothing.
    expect(waNumber("08012345678")).toBe("2348012345678");
    expect(waNumber("0803-123-4567")).toBe("2348031234567");
    expect(waNumber("0803 123 4567")).toBe("2348031234567");
  });

  it("leaves an already-international number alone", () => {
    expect(waNumber("+234 801 234 5678")).toBe("2348012345678");
    expect(waNumber("2348012345678")).toBe("2348012345678");
    expect(waNumber("00234 801 234 5678")).toBe("2348012345678");
  });

  it("adds the country code to a bare local number", () => {
    expect(waNumber("8012345678")).toBe("2348012345678");
  });

  it("passes a foreign number through rather than mangling it", () => {
    expect(waNumber("447911123456")).toBe("447911123456");
  });

  it("gives back nothing when there is nothing usable", () => {
    expect(waNumber("")).toBe("");
    expect(waNumber(null)).toBe("");
    expect(waNumber("abc")).toBe("");
    expect(waNumber("0801")).toBe("");
  });
});

describe("the message", () => {
  const sale = {
    invoice: "INV-00007",
    customerName: "Ada",
    total: 45000,
    items: [{ name: "iPhone case", qty: 2, price: 5000 }],
  };

  it("names the shop, the receipt and the total", () => {
    const text = saleMessage(sale, { shopName: "Seun Phones" });
    expect(text).toContain("Ada");
    expect(text).toContain("Seun Phones");
    expect(text).toContain("INV-00007");
    expect(text).toContain("₦45,000");
    expect(text).toContain("iPhone case");
  });

  it("uses the shop's own template when they have written one", () => {
    const text = saleMessage(sale, {
      shopName: "Seun Phones",
      whatsappTemplate: "Hi {name}, your {shop} receipt {invoice} comes to {total}. Thank you!",
    });
    expect(text).toBe("Hi Ada, your Seun Phones receipt INV-00007 comes to ₦45,000. Thank you!");
  });

  it("leaves a placeholder it cannot fill visible rather than printing 'undefined'", () => {
    const text = saleMessage(sale, { whatsappTemplate: "{name} — {nonsense}" });
    expect(text).toBe("Ada — {nonsense}");
  });

  it("copes with a walk-in who left no name", () => {
    const text = saleMessage({ invoice: "INV-1", total: 100, items: [] }, {});
    expect(text).toContain("Hello,");
    expect(text).not.toContain("undefined");
  });

  it("charges a repair as labour plus parts, matching the ticket", () => {
    const text = repairMessage(
      {
        ticket: "TKT-00003",
        customerName: "Ada",
        device: "iPhone 11",
        problem: "cracked screen",
        status: "completed",
        repairCost: 8000,
        parts: [{ name: "iPhone 11 screen", qty: 1, price: 32000 }],
      },
      { shopName: "Seun Phones" }
    );
    expect(text).toContain("TKT-00003");
    expect(text).toContain("iPhone 11 screen");
    expect(text).toContain("₦40,000"); // 8,000 labour + 32,000 parts
  });
});

describe("opening WhatsApp", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("opens a chat with the customer, message ready", () => {
    const open = vi.fn();
    vi.stubGlobal("window", { open });
    openWhatsApp("08012345678", "hello there");
    expect(open).toHaveBeenCalledOnce();
    const url = open.mock.calls[0][0];
    expect(url).toContain("https://wa.me/2348012345678");
    expect(url).toContain(encodeURIComponent("hello there"));
  });

  it("still opens, on the contact picker, when the sale had no phone number", () => {
    const open = vi.fn();
    vi.stubGlobal("window", { open });
    openWhatsApp("", "hello there");
    expect(open.mock.calls[0][0].startsWith("https://wa.me/?text=")).toBe(true);
  });
});
