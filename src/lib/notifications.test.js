import { describe, it, expect, beforeEach } from "vitest";
import { notificationFeed, unreadCount, isUnread } from "./notifications";
import { db } from "./db";

const ago = (mins) => new Date(Date.now() - mins * 60000).toISOString();

function seed() {
  localStorage.setItem("techdesk_activity", JSON.stringify([
    { id: "a1", type: "sale", message: "Sale recorded INV-00042", createdAt: ago(5) },
    { id: "a2", type: "repair", message: "TCK-00018 in progress", createdAt: ago(40) },
  ]));
  localStorage.setItem("techdesk_inventory", JSON.stringify([
    { id: "p1", name: "Samsung A12 battery", stock: 2, lowStockThreshold: 5, createdAt: ago(120) },
  ]));
}

describe("Clear empties the notifications", () => {
  beforeEach(() => {
    localStorage.clear();
    seed();
  });

  it("lists activity and anything low on stock", () => {
    const feed = notificationFeed();
    expect(feed).toHaveLength(3);
    expect(feed[0].message).toMatch(/INV-00042/);
  });

  it("empties the list when everything has been cleared", () => {
    // The bug: Clear marked everything read and left every line on screen,
    // which from the counter looks exactly like a button that does nothing.
    db.clearNotifications();
    expect(notificationFeed(db.getNotifClearedAt())).toHaveLength(0);
  });

  it("brings the next one back", () => {
    db.clearNotifications();
    const clearedAt = db.getNotifClearedAt();
    db.logActivity({ type: "sale", message: "Sale recorded INV-00043" });
    const feed = notificationFeed(clearedAt);
    expect(feed).toHaveLength(1);
    expect(feed[0].message).toMatch(/INV-00043/);
  });

  it("keeps the unread count in step with what is shown", () => {
    const clearedAt = null;
    const feed = notificationFeed(clearedAt);
    expect(unreadCount(feed, clearedAt)).toBe(feed.length);
    db.clearNotifications();
    const after = db.getNotifClearedAt();
    expect(unreadCount(notificationFeed(after), after)).toBe(0);
  });

  it("still knows which of the remaining lines are new", () => {
    const halfway = ago(20);
    const feed = notificationFeed(null);
    expect(isUnread(feed.find((f) => /INV-00042/.test(f.message)), halfway)).toBe(true);
    expect(isUnread(feed.find((f) => /TCK-00018/.test(f.message)), halfway)).toBe(false);
  });
});
