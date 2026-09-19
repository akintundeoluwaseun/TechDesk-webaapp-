import { describe, it, expect, beforeEach } from "vitest";
import { db } from "./db";
import { searchDestinations } from "./destinations";

/** Puts one product on the shelf and hands back its id. */
function stock(name, qty, price = 1000) {
  const item = { id: db.uid("prod"), name, stock: qty, price };
  db.saveInventory([...db.getInventory(), item]);
  return item;
}

describe("parts fitted to a repair leave the shelf", () => {
  beforeEach(() => localStorage.clear());

  it("takes the units it used out of stock", () => {
    const screen = stock("iPhone 11 screen", 5);

    db.createRepair({
      customerName: "Ada",
      device: "iPhone 11",
      problem: "cracked screen",
      parts: [{ id: "p1", productId: screen.id, name: screen.name, price: 12000, qty: 2, fromInventory: true }],
    });

    expect(db.findInventoryItem(screen.id).stock).toBe(3);
  });

  it("leaves stock alone for a labour-only job", () => {
    const screen = stock("iPhone 11 screen", 5);
    db.createRepair({ customerName: "Ada", device: "iPhone 11", problem: "software" });
    expect(db.findInventoryItem(screen.id).stock).toBe(5);
  });

  it("ignores a part that was never in inventory", () => {
    // Typed in by hand rather than picked off the shelf: there is nothing to
    // decrement, and it must not throw or corrupt the counts around it.
    const screen = stock("iPhone 11 screen", 5);
    db.createRepair({
      customerName: "Ada",
      device: "iPhone 11",
      problem: "cracked screen",
      parts: [{ id: "p1", productId: null, name: "generic cable", price: 500, qty: 1, fromInventory: false }],
    });
    expect(db.findInventoryItem(screen.id).stock).toBe(5);
  });

  it("never drives stock below zero", () => {
    const screen = stock("iPhone 11 screen", 1);
    db.createRepair({
      customerName: "Ada",
      device: "iPhone 11",
      problem: "cracked screen",
      parts: [{ id: "p1", productId: screen.id, name: screen.name, price: 12000, qty: 4, fromInventory: true }],
    });
    expect(db.findInventoryItem(screen.id).stock).toBe(0);
  });

  it("still decrements a sale, which now shares the same code path", () => {
    const cable = stock("USB-C cable", 10);
    db.createSale({
      items: [{ id: "i1", productId: cable.id, name: cable.name, price: 1500, qty: 3, fromInventory: true }],
      total: 4500,
    });
    expect(db.findInventoryItem(cable.id).stock).toBe(7);
  });

  it("records who took the job in", () => {
    const repair = db.createRepair({
      customerName: "Ada",
      device: "iPhone 11",
      problem: "cracked screen",
      actor: "Tunde",
    });
    expect(db.getRepairs().find((r) => r.id === repair.id).actor).toBe("Tunde");
  });
});

describe("search reaches every screen, not just records", () => {
  it("finds the places people actually ask for by name", () => {
    for (const [query, expected] of [
      ["hq", "Connect to HQ"],
      ["developer", "Developer"],
      ["reports", "Reports"],
      ["receipts", "Receipts"],
    ]) {
      expect(searchDestinations(query).map((d) => d.label)).toContain(expected);
    }
  });

  it("finds them by the words a shop owner would type instead", () => {
    // Nobody hunting their takings types "reports".
    expect(searchDestinations("profit").map((d) => d.label)).toContain("Reports");
    expect(searchDestinations("head office").map((d) => d.label)).toContain("Connect to HQ");
    expect(searchDestinations("stock").map((d) => d.label)).toContain("Inventory");
  });

  it("sends settings results to the tab itself", () => {
    const hq = searchDestinations("hq")[0];
    expect(hq.path).toBe("/settings?tab=hq");
  });

  it("does not offer a screen the role cannot open", () => {
    const sellerCanSee = (path) => ["/sales", "/inventory"].includes(path);
    expect(searchDestinations("users", sellerCanSee)).toEqual([]);
    expect(searchDestinations("developer", sellerCanSee)).toEqual([]);
    expect(searchDestinations("stock", sellerCanSee).map((d) => d.label)).toContain("Inventory");
  });

  it("ranks a name match above a keyword match", () => {
    // "Reports" the page should beat "Receipts" matched on its keywords.
    const labels = searchDestinations("report").map((d) => d.label);
    expect(labels[0]).toBe("Reports");
  });

  it("returns nothing for an empty query rather than everything", () => {
    expect(searchDestinations("")).toEqual([]);
    expect(searchDestinations("   ")).toEqual([]);
  });
});
