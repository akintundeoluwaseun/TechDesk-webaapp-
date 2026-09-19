// Everywhere in the app you can be sent, as search results.
//
// Search used to cover records only -- sales, repairs, products, customers --
// so typing "hq" or "developer" returned "No results" even though both are
// real places in the app. Somebody looking for a screen was told the screen
// did not exist.
//
// Keywords carry the words a person would actually type, which are usually
// not the words on the tab. Nobody hunting for their sales figures types
// "reports"; they type "profit" or "how much did I make".

export const DESTINATIONS = [
  // ---- pages ----
  { label: "Dashboard", type: "Page", path: "/", keywords: "home overview summary today" },
  { label: "Sales", type: "Page", path: "/sales", keywords: "sell invoice receipt till checkout order" },
  { label: "Repairs", type: "Page", path: "/repairs", keywords: "repair ticket fix job workshop device" },
  { label: "Inventory", type: "Page", path: "/inventory", keywords: "stock product item goods sku price quantity" },
  { label: "Customers", type: "Page", path: "/customers", keywords: "client buyer contact phone debtor" },
  { label: "Reports", type: "Page", path: "/reports", keywords: "report profit revenue earnings figures chart export summary how much" },
  { label: "Activity log", type: "Page", path: "/activity", keywords: "history audit trail who did what recent changes" },
  { label: "Settings", type: "Page", path: "/settings", keywords: "settings options preferences configure setup" },

  // ---- settings tabs ----
  // Deep links: SettingsPage reads ?tab= so a result lands on the tab itself
  // rather than dropping someone on Shop to go hunting.
  { label: "Shop details", type: "Settings", path: "/settings?tab=shop", keywords: "shop name address business type logo currency" },
  { label: "Receipts", type: "Settings", path: "/settings?tab=receipts", keywords: "receipt invoice template footer thermal printer whatsapp message" },
  { label: "Users", type: "Settings", path: "/settings?tab=users", keywords: "user staff worker pin password role seller repairer permission" },
  { label: "Device", type: "Settings", path: "/settings?tab=device", keywords: "device backup restore data export import printer storage" },
  { label: "Connect to HQ", type: "Settings", path: "/settings?tab=hq", keywords: "hq head office connect branch sync link otp code monitor" },
  { label: "Developer", type: "Settings", path: "/settings?tab=developer", keywords: "developer support help contact about version licence license activation" },
];

/**
 * Destinations matching `query`, best first.
 *
 * `allow` gates by role: a seller searching "users" should not be offered a
 * screen they will be bounced out of. It takes the path without its query
 * string, because permissions are per page, not per tab.
 */
export function searchDestinations(query, allow) {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return DESTINATIONS
    .map((d) => {
      const label = d.label.toLowerCase();
      // A label match beats a keyword match, and a label that starts with what
      // was typed beats one that merely contains it: typing "re" should offer
      // Repairs and Reports before Receipts-by-keyword.
      let score = 0;
      if (label === q) score = 4;
      else if (label.startsWith(q)) score = 3;
      else if (label.includes(q)) score = 2;
      else if (d.keywords.includes(q)) score = 1;
      return { ...d, score };
    })
    .filter((d) => d.score > 0)
    .filter((d) => !allow || allow(d.path.split("?")[0]))
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
}
