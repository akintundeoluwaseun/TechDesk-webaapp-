import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { hq } from "./hq";
import { saveState } from "./hqStore";
import { db } from "./db";

// sync-push authenticates from the request BODY: it reads body.token and
// nothing else. The Authorization header carries the publishable key, which
// only gets the request through the gateway. Sending the device token as a
// bearer and nothing more meant every push was answered "Missing token" --
// a browser could connect to HQ and then never deliver a single sale.

function mockFetch(reply = { ok: true, accepted: 0 }) {
  const calls = [];
  globalThis.fetch = vi.fn(async (url, init) => {
    calls.push({ url: String(url), init, body: JSON.parse(init.body) });
    return { json: async () => reply };
  });
  return calls;
}

describe("a connected browser actually delivers its sales", () => {
  beforeEach(() => {
    localStorage.clear();
    saveState({ token: "tok_a_real_looking_device_token", businessId: "b1", branchId: "br1" });
  });
  afterEach(() => vi.restoreAllMocks());

  it("sends the device token where sync-push reads it", async () => {
    const calls = mockFetch();
    await hq.sync();
    const push = calls.find((c) => c.url.includes("sync-push"));
    expect(push, "no sync-push call was made").toBeTruthy();
    expect(push.body.token).toBe("tok_a_real_looking_device_token");
  });

  it("sends the shop's existing records on the first sync", async () => {
    db.createSale({
      customerName: "Chidi Okafor",
      total: 32000,
      items: [{ id: "i1", name: "iPhone 11 screen", qty: 1, price: 32000 }],
    });
    const calls = mockFetch({ ok: true, accepted: 1 });
    const res = await hq.sync();

    const push = calls.find((c) => c.url.includes("sync-push"));
    expect(res.ok).toBe(true);
    expect(push.body.records.length).toBeGreaterThan(0);
    // The kinds have to be the ones the server's enum knows.
    for (const r of push.body.records) {
      expect(["sale", "repair", "product", "customer", "activity"]).toContain(r.kind);
    }
    expect(push.body.records.some((r) => r.kind === "sale")).toBe(true);
  });

  it("does not move the cursor when the push failed", async () => {
    db.createSale({ customerName: "Walk-in", total: 1500, items: [{ id: "i1", name: "Glass", qty: 1, price: 1500 }] });
    mockFetch({ ok: false, error: "server_error" });
    await hq.sync();

    // The next attempt must still carry that sale.
    const calls = mockFetch({ ok: true, accepted: 1 });
    await hq.sync();
    const push = calls.find((c) => c.url.includes("sync-push"));
    expect(push.body.records.some((r) => r.kind === "sale")).toBe(true);
  });

  it("still reports in when there is nothing new to say", async () => {
    const calls = mockFetch();
    const res = await hq.sync();
    expect(res.ok).toBe(true);
    expect(calls.find((c) => c.url.includes("sync-push")).body.records).toEqual([]);
  });
});
