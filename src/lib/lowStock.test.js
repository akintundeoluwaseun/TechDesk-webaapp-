import { describe, it, expect, beforeEach } from "vitest";
import { db } from "./db";

function stock(n, threshold = 5) {
  localStorage.setItem(
    "techdesk_inventory",
    JSON.stringify([{ id: "p1", name: "Hp 15", stock: n, lowStockThreshold: threshold, price: 500000 }])
  );
}

const sellOne = (qty = 1) =>
  db.createSale({
    customerName: "Walk-in",
    total: 500000,
    items: [{ id: "i1", productId: "p1", fromInventory: true, name: "Hp 15", qty, price: 500000 }],
  });

const lowStockAlerts = () => db.getActivity().filter((a) => a.type === "lowstock");

describe("the admin hears about low stock as it happens", () => {
  beforeEach(() => localStorage.clear());

  it("raises an alert on the sale that crosses the threshold", () => {
    stock(6);
    sellOne();
    expect(lowStockAlerts()).toHaveLength(1);
    expect(lowStockAlerts()[0].message).toMatch(/down to 5/);
  });

  it("says so plainly when the last one goes", () => {
    stock(1);
    sellOne();
    expect(lowStockAlerts()[0].message).toMatch(/out of stock/);
  });

  it("does not repeat itself on every later sale", () => {
    // The shop is already looking at one alert. A second, third and fourth
    // saying the same thing would bury the ones that matter.
    stock(6);
    sellOne();
    sellOne();
    sellOne();
    expect(lowStockAlerts()).toHaveLength(1);
  });

  it("speaks up again when an already-low item finally runs out", () => {
    // Out of stock is a worse state than low, not a repeat of it: the shop
    // can no longer sell the thing at all.
    stock(6);
    sellOne();
    sellOne(5);
    const alerts = lowStockAlerts();
    expect(alerts).toHaveLength(2);
    expect(alerts[0].message).toMatch(/out of stock/);
  });

  it("stays quiet while there is plenty left", () => {
    stock(20);
    sellOne();
    expect(lowStockAlerts()).toHaveLength(0);
  });

  it("catches a bulk sale that jumps the threshold in one go", () => {
    stock(20);
    sellOne(18);
    expect(lowStockAlerts()).toHaveLength(1);
  });

  it("honours the product's own threshold, not a fixed five", () => {
    stock(11, 10);
    sellOne();
    expect(lowStockAlerts()).toHaveLength(1);
  });

  it("reports the stock that was actually saved", () => {
    stock(6);
    sellOne();
    const saved = JSON.parse(localStorage.getItem("techdesk_inventory"))[0].stock;
    expect(lowStockAlerts()[0].message).toContain(String(saved));
  });
});
