// The notification feed, shared by the desktop topbar and the phone app bar.
//
// It lived inside Topbar, which is why phones had no notifications at all:
// the topbar hides its controls below md and there was nowhere else for the
// bell to read from. Pulled out here so both surfaces show the same list,
// count the same things unread, and clear the same marker.

import { db } from "./db";
import { ShoppingCart, Wrench, Box, User, Settings as SettingsIcon, Bell } from "lucide-react";

// One look per activity type, with real category labels -- the message text
// already says what happened, so the heading does not invent a sub-status.
export const NOTIF_STYLES = {
  sale: { Icon: ShoppingCart, label: "New Sale", light: "bg-blue-100 text-blue-600", dark: "bg-blue-500/20 text-blue-400" },
  repair: { Icon: Wrench, label: "Repair Update", light: "bg-emerald-100 text-emerald-600", dark: "bg-emerald-500/20 text-emerald-400" },
  inventory: { Icon: Box, label: "Stock Update", light: "bg-amber-100 text-amber-600", dark: "bg-amber-500/20 text-amber-400" },
  lowstock: { Icon: Box, label: "Low Stock Alert", light: "bg-amber-100 text-amber-600", dark: "bg-amber-500/20 text-amber-400" },
  customer: { Icon: User, label: "New Customer", light: "bg-violet-100 text-violet-600", dark: "bg-violet-500/20 text-violet-400" },
  settings: { Icon: SettingsIcon, label: "Account Update", light: "bg-slate-200 text-slate-600", dark: "bg-slate-500/20 text-slate-400" },
};

export const DEFAULT_NOTIF_STYLE = {
  Icon: Bell,
  label: "Activity",
  light: "bg-slate-200 text-slate-600",
  dark: "bg-slate-500/20 text-slate-400",
};

export function notifStyle(type) {
  return NOTIF_STYLES[type] || DEFAULT_NOTIF_STYLE;
}

export function timeAgo(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const diffMin = Math.round(Math.max(0, Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.round(diffHr / 24)}d ago`;
}

/**
 * A single time-ordered feed: recorded activity, plus anything currently
 * low on stock folded in.
 *
 * Low stock is a live state rather than an event, so it borrows the
 * product's own timestamp. Using "now" would make every item jump to the
 * top of the list every time the bell was opened.
 *
 * `clearedAt` actually empties the list rather than only greying it: Clear
 * used to mark everything read and leave every line where it was, which
 * from the counter looks exactly like a button that does nothing. Anything
 * from before that moment is gone; the next sale, repair or low-stock
 * crossing puts a fresh line at the top.
 */
export function notificationFeed(clearedAt = null, limit = 8) {
  const activity = db.getActivity();
  const lowStock = db
    .getInventory()
    .filter((p) => Number(p.stock || 0) <= Number(p.lowStockThreshold || 5));

  const merged = [
    ...activity,
    ...lowStock.map((p) => ({
      type: "lowstock",
      message: `${p.name || "Item"} — only ${p.stock ?? 0} remaining.`,
      createdAt: p.createdAt || p.updatedAt || new Date(0).toISOString(),
    })),
  ];
  const cut = clearedAt ? new Date(clearedAt) : null;
  // >= rather than >: clearing and then selling in the same millisecond is
  // rare but real, and dropping that sale's line is a notification the shop
  // never sees.
  const kept = cut ? merged.filter((item) => new Date(item.createdAt) >= cut) : merged;
  kept.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return kept.slice(0, limit);
}

export function isUnread(item, clearedAt) {
  // Same boundary as the feed above, so what is shown and what counts as
  // new can never disagree.
  return !clearedAt || new Date(item.createdAt) >= new Date(clearedAt);
}

export function unreadCount(feed, clearedAt) {
  return feed.filter((item) => isUnread(item, clearedAt)).length;
}
