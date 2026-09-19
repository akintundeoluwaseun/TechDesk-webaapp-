import { describe, it, expect } from "vitest";
import {
  CURRENCIES, DEFAULT_CURRENCY, getCurrency, money, moneyPdf, currencySymbol, currencyPdfSymbol,
} from "./currency";

describe("the shop's currency", () => {
  it("is naira when nothing has been chosen", () => {
    expect(DEFAULT_CURRENCY).toBe("NGN");
    expect(getCurrency(undefined).code).toBe("NGN");
    expect(getCurrency({}).code).toBe("NGN");
    expect(money(45000, {})).toBe("₦45,000");
  });

  it("follows the setting once one is chosen", () => {
    expect(money(45000, { currency: "USD" })).toBe("$45,000");
    expect(money(45000, { currency: "GBP" })).toBe("£45,000");
    expect(money(45000, { currency: "KES" })).toBe("KSh45,000");
    expect(money(45000, { currency: "GHS" })).toBe("₵45,000");
  });

  it("falls back rather than throwing on a code it does not know", () => {
    // A backup restored from a later version must not take the till down.
    expect(money(100, { currency: "ZZZ" })).toBe("₦100");
    expect(getCurrency("ZZZ").code).toBe("NGN");
  });

  it("offers ten currencies, each complete and unique", () => {
    expect(CURRENCIES.length).toBe(10);
    const codes = CURRENCIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const c of CURRENCIES) {
      expect(c.code).toMatch(/^[A-Z]{3}$/);
      expect(c.symbol.length).toBeGreaterThan(0);
      expect(c.name.length).toBeGreaterThan(0);
    }
  });
});

describe("money that has to survive a PDF", () => {
  // jsPDF's standard fonts carry Latin-1 only. A character outside it does
  // not just fail to draw -- it can corrupt the text around it, which is why
  // receipts have always printed "N" rather than the naira sign.
  const latin1 = (s) => [...s].every((ch) => ch.charCodeAt(0) <= 0xff);

  it("never puts a character in a PDF that jsPDF cannot draw", () => {
    for (const c of CURRENCIES) {
      const printed = moneyPdf(1234, { currency: c.code });
      expect(latin1(printed), `${c.code} prints "${printed}"`).toBe(true);
    }
  });

  it("spells out the ones whose symbol is not printable", () => {
    expect(currencyPdfSymbol({ currency: "NGN" })).toBe("N");
    expect(currencyPdfSymbol({ currency: "GHS" })).toBe("GHS");
    expect(currencyPdfSymbol({ currency: "EUR" })).toBe("EUR");
  });

  it("prints the real symbol where it is printable", () => {
    expect(currencyPdfSymbol({ currency: "USD" })).toBe("$");
    expect(currencyPdfSymbol({ currency: "GBP" })).toBe("£");
    expect(currencyPdfSymbol({ currency: "ZAR" })).toBe("R");
  });

  it("keeps the screen symbol and the print symbol separate", () => {
    // The screen can show the naira sign; the receipt cannot. Conflating them
    // is how a receipt ends up with mangled totals.
    expect(currencySymbol({ currency: "NGN" })).toBe("₦");
    expect(currencyPdfSymbol({ currency: "NGN" })).toBe("N");
  });

  it("groups thousands the same way on screen and in print", () => {
    expect(money(1234567, { currency: "USD" })).toBe("$1,234,567");
    expect(moneyPdf(1234567, { currency: "USD" })).toBe("$1,234,567");
  });

  it("copes with nothing at all", () => {
    expect(money(undefined, {})).toBe("₦0");
    expect(money(null, {})).toBe("₦0");
  });
});
