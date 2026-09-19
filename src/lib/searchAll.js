// One search, used by the desktop topbar and the phone menu.
//
// The shop asked for search that covers "all things" -- not just products,
// but the pages and settings tabs too. That lived inside Topbar, which is
// hidden on phones, so a phone had no search at all. It lives here now.

import { db } from "./db";
import { searchDestinations } from "./destinations";

/**
 * Places first, then records.
 *
 * Someone who types "reports" wants the page; if a customer happens to be
 * called Report they can scroll one line. Fields are optional-chained
 * throughout -- a record from an older backup can be missing something the
 * UI normally guarantees, and one bad row should not break search for
 * everything else.
 */
export function searchEverything(query, allow, { places = 5, total = 10 } = {}) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return [];

  const destinations = searchDestinations(query, allow);
  const results = [];

  db.getSales().forEach((s) => {
    if (s.invoice?.toLowerCase().includes(q) || s.customerName?.toLowerCase().includes(q)) {
      results.push({ type: "Sale", label: `${s.invoice || "Sale"} — ${s.customerName || "Walk-in"}`, path: "/sales" });
    }
  });
  db.getRepairs().forEach((r) => {
    if (r.ticket?.toLowerCase().includes(q) || r.customerName?.toLowerCase().includes(q) || r.device?.toLowerCase().includes(q)) {
      results.push({ type: "Repair", label: `${r.ticket || "Repair"} — ${r.device || "Device"}`, path: "/repairs" });
    }
  });
  db.getInventory().forEach((p) => {
    if (p.name?.toLowerCase().includes(q)) {
      results.push({ type: "Product", label: p.name, path: "/inventory" });
    }
  });
  db.getCustomers().forEach((c) => {
    if (c.name?.toLowerCase().includes(q) || c.phone?.includes(q)) {
      results.push({ type: "Customer", label: c.name || c.phone || "Customer", path: "/customers" });
    }
  });

  // Places are capped so a long record list cannot push them off, and the
  // whole thing is capped so the panel never covers the page behind it.
  return [...destinations.slice(0, places), ...results].slice(0, total);
}
