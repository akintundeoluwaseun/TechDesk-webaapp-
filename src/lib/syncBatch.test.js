import { beforeEach, describe, expect, it } from "vitest";
import { db } from "./db";

beforeEach(() => {
  localStorage.clear();
});

describe("what gets sent to HQ", () => {
  it("sends everything when nothing has synced yet", () => {
    db.createSale({ total: 5000, items: [] });
    db.createRepair({ device: "iPhone 11" });
    const { records } = db.getSyncBatch(null);
    expect(records.map((r) => r.kind).sort()).toContain("sale");
    expect(records.map((r) => r.kind)).toContain("repair");
  });

  it("sends nothing when nothing has changed since the cursor", () => {
    db.createSale({ total: 5000, items: [] });
    const later = new Date(Date.now() + 60_000).toISOString();
    expect(db.getSyncBatch(later).records).toHaveLength(0);
  });

  it("sends an edited sale again, which createdAt alone would never do", () => {
    // The bug this guards: without updatedAt an edit keeps its original
    // createdAt, falls behind the cursor, and HQ shows the first version of
    // that sale forever.
    const sale = db.createSale({ total: 5000, items: [] });
    // The cursor a real device would hold: the newest thing it actually sent.
    const { cursor } = db.getSyncBatch(null);

    db.updateSale(sale.id, { total: 9000 });
    const sent = db.getSyncBatch(cursor).records.find((r) => r.id === sale.id);
    expect(sent).toBeDefined();
    expect(sent.payload.total).toBe(9000);
  });

  it("reports a delete as a tombstone, because absence is not deletion", () => {
    const sale = db.createSale({ total: 5000, items: [] });
    const { cursor } = db.getSyncBatch(null);
    db.deleteSale(sale.id);

    const tomb = db.getSyncBatch(cursor).records.find((r) => r.deleted);
    expect(tomb).toMatchObject({ id: sale.id, kind: "sale", deleted: true });
  });

  it("tombstones deletes of every kind that syncs", () => {
    const p = db.addInventoryItem({ name: "Charger", stock: 3 });
    const r = db.createRepair({ device: "Tecno" });
    const { cursor } = db.getSyncBatch(null);
    db.deleteInventoryItem(p.id);
    db.deleteRepair(r.id);

    const kinds = db.getSyncBatch(cursor).records
      .filter((x) => x.deleted)
      .map((x) => x.kind)
      .sort();
    expect(kinds).toEqual(["product", "repair"]);
  });

  it("sends records that predate updatedAt, using createdAt instead", () => {
    // A shop upgrading into this feature has a whole history with no
    // updatedAt. Skipping it would mean HQ never sees anything that came
    // before the upgrade.
    localStorage.setItem(
      "techdesk_sales",
      JSON.stringify([{ id: "old_1", createdAt: "2026-01-01T10:00:00.000Z", total: 100 }]),
    );
    const { records } = db.getSyncBatch(null);
    expect(records.map((r) => r.id)).toContain("old_1");
  });

  it("skips rows with no usable timestamp rather than guessing one", () => {
    localStorage.setItem("techdesk_sales", JSON.stringify([{ id: "no_time", total: 1 }]));
    expect(db.getSyncBatch(null).records).toHaveLength(0);
  });

  it("orders oldest first, so a cut-short batch can be resumed", () => {
    localStorage.setItem(
      "techdesk_sales",
      JSON.stringify([
        { id: "c", createdAt: "2026-03-01T00:00:00.000Z", updatedAt: "2026-03-01T00:00:00.000Z" },
        { id: "a", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
        { id: "b", createdAt: "2026-02-01T00:00:00.000Z", updatedAt: "2026-02-01T00:00:00.000Z" },
      ]),
    );
    expect(db.getSyncBatch(null).records.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("caps a batch and says there is more", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      id: `s_${i}`,
      createdAt: new Date(2026, 0, i + 1).toISOString(),
      updatedAt: new Date(2026, 0, i + 1).toISOString(),
    }));
    localStorage.setItem("techdesk_sales", JSON.stringify(many));

    const batch = db.getSyncBatch(null, 5);
    expect(batch.records).toHaveLength(5);
    expect(batch.more).toBe(true);
    // And the cap takes the OLDEST five, so resuming from the last one sent
    // cannot skip the middle.
    expect(batch.records.map((r) => r.id)).toEqual(["s_0", "s_1", "s_2", "s_3", "s_4"]);
  });

  it("re-sends the boundary record rather than risk dropping it", () => {
    // Two records can share a millisecond. A strict "after the cursor" would
    // send the first and lose the second forever. Re-sending one is free --
    // the push is idempotent and refuses to go backwards.
    const at = "2026-05-01T10:00:00.000Z";
    localStorage.setItem(
      "techdesk_sales",
      JSON.stringify([
        { id: "same_ms_a", createdAt: at, updatedAt: at },
        { id: "same_ms_b", createdAt: at, updatedAt: at },
      ]),
    );
    const first = db.getSyncBatch(null, 1);
    expect(first.records.map((r) => r.id)).toEqual(["same_ms_a"]);
    expect(first.more).toBe(true);

    const second = db.getSyncBatch(first.cursor);
    expect(second.records.map((r) => r.id)).toContain("same_ms_b");
  });

  it("reports a cursor from the records sent, not the caller's clock", () => {
    // The cursor must be a local time taken from the data. Storing the
    // server's reply instead would skip everything written in the gap
    // between two clocks that disagree.
    const at = "2026-04-02T08:30:00.000Z";
    localStorage.setItem("techdesk_sales", JSON.stringify([{ id: "s1", createdAt: at, updatedAt: at }]));
    expect(db.getSyncBatch(null).cursor).toBe(at);
  });

  it("leaves the cursor alone when there is nothing to send", () => {
    const held = "2026-04-02T08:30:00.000Z";
    expect(db.getSyncBatch(held).cursor).toBe(held);
  });

  it("never sends users, settings or counters", () => {
    db.addUser({ name: "Ada", pin: "1234" });
    db.saveSettings({ ...db.getSettings(), shopName: "Alpha" });
    const kinds = new Set(db.getSyncBatch(null).records.map((r) => r.kind));
    expect(kinds.has("user")).toBe(false);
    expect(kinds.has("settings")).toBe(false);
  });

  it("survives an unreadable tombstone list instead of losing the whole batch", () => {
    db.createSale({ total: 100, items: [] });
    localStorage.setItem("techdesk_tombstones", "{ not json");
    expect(db.getSyncBatch(null).records.length).toBeGreaterThan(0);
  });
});
