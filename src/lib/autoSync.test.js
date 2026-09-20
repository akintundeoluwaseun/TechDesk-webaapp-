import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useHqSync } from "./useHqSync";
import { saveState } from "./hqStore";
import { db, CHANGED_EVENT } from "./db";

// A sale should reach HQ while the customer is still at the counter, not up
// to two minutes later. The timer is a heartbeat; the change is the trigger.

function pushes() {
  const seen = [];
  globalThis.fetch = vi.fn(async (url, init) => {
    if (String(url).includes("sync-push")) seen.push(JSON.parse(init.body));
    return { json: async () => ({ ok: true, accepted: 1 }) };
  });
  return seen;
}

describe("a connected browser keeps HQ up to date by itself", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    saveState({ token: "tok_a_real_looking_device_token", businessId: "b1", branchId: "br1" });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("pushes shortly after a sale, without waiting for the heartbeat", async () => {
    const seen = pushes();
    renderHook(() => useHqSync());

    db.createSale({ customerName: "Chidi", total: 32000, items: [{ id: "i1", name: "Screen", qty: 1, price: 32000 }] });
    await vi.advanceTimersByTimeAsync(7000);

    expect(seen.length).toBeGreaterThan(0);
    expect(seen.some((p) => (p.records || []).some((r) => r.kind === "sale"))).toBe(true);
  });

  it("rings up one push for a burst of writes, not one each", async () => {
    const seen = pushes();
    renderHook(() => useHqSync());

    // A sale writes the sale, draws stock down and logs activity.
    db.createSale({ customerName: "Aisha", total: 7500, items: [{ id: "i2", name: "Charger", qty: 1, price: 7500 }] });
    db.createSale({ customerName: "Walk-in", total: 1500, items: [{ id: "i3", name: "Glass", qty: 1, price: 1500 }] });
    await vi.advanceTimersByTimeAsync(7000);

    expect(seen.length).toBe(1);
  });

  it("pushes when the browser comes back online", async () => {
    const seen = pushes();
    renderHook(() => useHqSync());
    await vi.advanceTimersByTimeAsync(9000);
    const before = seen.length;

    window.dispatchEvent(new Event("online"));
    await vi.advanceTimersByTimeAsync(50);
    expect(seen.length).toBeGreaterThan(before);
  });

  it("keeps a heartbeat going when nothing happens at all", async () => {
    const seen = pushes();
    renderHook(() => useHqSync());
    await vi.advanceTimersByTimeAsync(9000);
    const before = seen.length;

    await vi.advanceTimersByTimeAsync(2 * 60 * 1000 + 100);
    expect(seen.length).toBeGreaterThan(before);
  });

  it("stops listening once the app is torn down", async () => {
    const seen = pushes();
    const { unmount } = renderHook(() => useHqSync());
    await vi.advanceTimersByTimeAsync(9000);
    unmount();
    const before = seen.length;

    window.dispatchEvent(new CustomEvent(CHANGED_EVENT, { detail: { key: "x" } }));
    await vi.advanceTimersByTimeAsync(3 * 60 * 1000);
    expect(seen.length).toBe(before);
  });
});
