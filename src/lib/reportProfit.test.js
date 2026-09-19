import { describe, it, expect, beforeEach } from "vitest";
import { db } from "./db";
import { computeReport } from "./reports";

function inventory(costPrice) {
  localStorage.setItem(
    "techdesk_inventory",
    JSON.stringify([{ id: "p1", name: "Hp 15", stock: 50, price: 500000, costPrice }])
  );
}

const sell = (item, extra = {}) =>
  db.createSale({
    customerName: "Walk-in",
    total: 500000,
    subtotal: 500000,
    items: [{ id: "i1", productId: "p1", fromInventory: true, name: "Hp 15", qty: 1, price: 500000, ...item }],
    ...extra,
  });

describe("profit is worked out from what the goods actually cost", () => {
  beforeEach(() => localStorage.clear());

  it("uses the cost recorded on the sale", () => {
    inventory(400000);
    sell({ costPrice: 400000 });
    expect(computeReport("30d").profit).toBe(100000);
  });

  it("does not rewrite an old sale when the product is re-priced", () => {
    // This is the bug: the report read today's inventory, so raising a
    // product's cost price changed the profit on every sale of it that had
    // already happened, months back.
    inventory(400000);
    sell({ costPrice: 400000 });
    inventory(700000);
    expect(computeReport("30d").profit).toBe(100000);
  });

  it("falls back to the product for sales made before the snapshot existed", () => {
    inventory(400000);
    sell({}); // no costPrice on the item, as older sales have
    expect(computeReport("30d").profit).toBe(100000);
  });

  it("reports a real loss as a loss", () => {
    // Cost above the selling price is a genuine answer, not a glitch --
    // and the cost is published alongside it so the shop can see why.
    inventory(700000);
    sell({ costPrice: 700000 });
    const report = computeReport("30d");
    expect(report.profit).toBe(-200000);
    expect(report.cost).toBe(700000);
  });

  it("publishes the cost and the discounts behind the profit", () => {
    inventory(400000);
    sell({ costPrice: 400000 }, { discount: 50000, total: 450000 });
    const report = computeReport("30d");
    expect(report.cost).toBe(400000);
    expect(report.discount).toBe(50000);
    expect(report.profit).toBe(report.revenue - report.cost);
  });

  it("costs a top product the same way", () => {
    inventory(400000);
    sell({ costPrice: 400000 });
    inventory(700000);
    expect(computeReport("30d").topProducts[0].profit).toBe(100000);
  });
});
