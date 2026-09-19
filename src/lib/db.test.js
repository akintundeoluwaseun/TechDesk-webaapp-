import { describe, it, expect, beforeEach } from "vitest";
import { db } from "./db";

describe("invoice/ticket numbering", () => {
  beforeEach(() => localStorage.clear());

  it("never reuses a number after the record that used it is deleted", () => {
    const first = db.createSale({ items: [], total: 0 });
    const second = db.createSale({ items: [], total: 0 });
    expect(second.invoice).not.toBe(first.invoice);

    db.deleteSale(second.id);

    const third = db.createSale({ items: [], total: 0 });
    expect(third.invoice).not.toBe(second.invoice);
    expect(third.invoice).not.toBe(first.invoice);
  });

  it("seeds the counter from existing records so it can't collide after an upgrade", () => {
    localStorage.setItem(
      db.KEYS.sales,
      JSON.stringify([{ id: "s1", invoice: "INV-00042", items: [], total: 0 }])
    );
    const next = db.createSale({ items: [], total: 0 });
    expect(next.invoice).toBe("INV-00043");
  });
});

describe("restoreBackup", () => {
  beforeEach(() => localStorage.clear());

  it("restores only recognized keys", () => {
    const backup = JSON.stringify({
      data: {
        [db.KEYS.customers]: JSON.stringify([{ id: "c1", name: "Jane" }]),
        not_a_real_key: JSON.stringify([{ id: "x" }]),
      },
    });
    db.restoreBackup(backup);
    expect(db.getCustomers()).toEqual([{ id: "c1", name: "Jane" }]);
    expect(localStorage.getItem("not_a_real_key")).toBeNull();
  });

  it("rejects a malformed backup without touching existing data", () => {
    localStorage.setItem(db.KEYS.customers, JSON.stringify([{ id: "c1", name: "Jane" }]));
    const malformed = JSON.stringify({
      data: {
        [db.KEYS.customers]: "{not valid json",
      },
    });
    expect(() => db.restoreBackup(malformed)).toThrow();
    expect(db.getCustomers()).toEqual([{ id: "c1", name: "Jane" }]);
  });

  it("rejects a backup with no recognized data", () => {
    expect(() => db.restoreBackup(JSON.stringify({ data: { junk: "1" } }))).toThrow();
  });
});

describe("mergeBackup", () => {
  beforeEach(() => localStorage.clear());

  function backupOf(overrides) {
    return JSON.stringify({
      data: Object.fromEntries(Object.entries(overrides).map(([k, v]) => [k, JSON.stringify(v)])),
    });
  }

  it("keeps existing records and adds the incoming ones", () => {
    localStorage.setItem(db.KEYS.customers, JSON.stringify([{ id: "c1", name: "Jane" }]));
    const result = db.mergeBackup(backupOf({ [db.KEYS.customers]: [{ id: "c2", name: "Musa" }] }));

    expect(db.getCustomers().map((c) => c.id).sort()).toEqual(["c1", "c2"]);
    expect(result.added.customers).toBe(1);
  });

  it("is a no-op when the same backup is merged twice", () => {
    const backup = backupOf({ [db.KEYS.customers]: [{ id: "c2", name: "Musa" }] });
    db.mergeBackup(backup);
    const second = db.mergeBackup(backup);

    expect(db.getCustomers()).toHaveLength(1);
    expect(second.added.customers).toBe(0);
  });

  it("reissues an incoming invoice number that is already in use here", () => {
    localStorage.setItem(
      db.KEYS.sales,
      JSON.stringify([{ id: "local", invoice: "INV-00001", items: [], total: 10 }])
    );
    db.mergeBackup(
      backupOf({ [db.KEYS.sales]: [{ id: "incoming", invoice: "INV-00001", items: [], total: 99 }] })
    );

    const sales = db.getSales();
    expect(sales).toHaveLength(2);
    const invoices = sales.map((s) => s.invoice);
    expect(new Set(invoices).size).toBe(2);
    // the local record keeps its number; the incoming one is renumbered
    expect(sales.find((s) => s.id === "local").invoice).toBe("INV-00001");
    expect(sales.find((s) => s.id === "incoming").invoice).not.toBe("INV-00001");
  });

  it("moves the counter past every merged number so the next sale can't collide", () => {
    db.mergeBackup(
      backupOf({ [db.KEYS.sales]: [{ id: "s9", invoice: "INV-00009", items: [], total: 0 }] })
    );
    const next = db.createSale({ items: [], total: 0 });
    expect(next.invoice).toBe("INV-00010");
  });

  it("copies shop settings only when none were set on this device", () => {
    const incoming = { [db.KEYS.settings]: { shopName: "Musa Repairs" } };

    db.mergeBackup(backupOf({ ...incoming, [db.KEYS.customers]: [{ id: "c1" }] }));
    expect(db.getSettings().shopName).toBe("Musa Repairs");

    localStorage.clear();
    db.saveSettings({ ...db.getSettings(), shopName: "Already Mine" });
    db.mergeBackup(backupOf({ ...incoming, [db.KEYS.customers]: [{ id: "c2" }] }));
    expect(db.getSettings().shopName).toBe("Already Mine");
  });

  it("rejects a backup with nothing to merge", () => {
    expect(() => db.mergeBackup(JSON.stringify({ data: {} }))).toThrow();
  });
});
