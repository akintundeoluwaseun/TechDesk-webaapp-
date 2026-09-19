import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const src = (p) => readFileSync(join(process.cwd(), "src", p), "utf8");

// The phone menu used to list four pages -- the four the bottom bar already
// showed were missing from it, and search, notifications and help only ever
// existed in the desktop topbar, which hides itself below md. Half the app
// was unreachable on a phone. These guard the whole of it.
describe("the phone menu reaches the whole app", () => {
  const routesIn = (file) =>
    [...src(file).matchAll(/path="(\/[a-z]*)"/g)].map((m) => m[1]).filter((p) => p !== "*");

  it("lists every route the app has", () => {
    const appBar = src("components/MobileAppBar.jsx");
    for (const route of new Set(routesIn("App.jsx"))) {
      expect(appBar, `menu is missing ${route}`).toMatch(new RegExp(`to: "${route}"`));
    }
  });

  it("carries the controls the topbar hides on a phone", () => {
    const appBar = src("components/MobileAppBar.jsx");
    expect(appBar, "no search").toMatch(/searchEverything/);
    expect(appBar, "no notifications").toMatch(/notificationFeed/);
    expect(appBar, "no help").toMatch(/openHelp/);
  });

  it("shows the same notifications as the desktop topbar", () => {
    // Both read one module, so a change to the feed cannot land on one
    // surface and not the other.
    for (const f of ["components/Topbar.jsx", "components/MobileAppBar.jsx"]) {
      expect(src(f), f).toMatch(/from "\.\.\/lib\/notifications"/);
      expect(src(f), f).toMatch(/from "\.\.\/lib\/searchAll"/);
    }
  });
});
