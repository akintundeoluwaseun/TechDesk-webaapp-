import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { canAccess, homeFor } from "./AuthContext";
import { installId, readState, readPublicState, saveState, clearState } from "./hqStore";
import { IS_DESKTOP_APP, IS_ANDROID_APP, IS_WEB_APP } from "./platform";

const src = (p) => readFileSync(join(process.cwd(), "src", p), "utf8");

/** Source with comments stripped, so a note ABOUT a thing is not the thing. */
const code = (p) =>
  src(p).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("this build knows it is a browser", () => {
  it("claims no shell it does not have", () => {
    expect(IS_WEB_APP).toBe(true);
    expect(IS_DESKTOP_APP).toBe(false);
    expect(IS_ANDROID_APP).toBe(false);
  });
});

describe("no sign-in, no roles", () => {
  it("lets the one user reach everything", () => {
    for (const path of ["/", "/sales", "/repairs", "/inventory", "/reports", "/activity", "/settings"]) {
      expect(canAccess(undefined, path)).toBe(true);
    }
    expect(homeFor()).toBe("/");
  });

  it("has no lock screen left to render", () => {
    // A PIN on a browser tab protects nothing -- whoever holds the device is
    // already past it -- so the screen and its recovery flow are gone, not
    // hidden behind a flag that could be flipped back on by accident.
    const app = src("App.jsx");
    expect(app).not.toMatch(/LoginScreen/);
    expect(() => src("pages/LoginScreen.jsx")).toThrow();
    expect(() => src("lib/pinRecovery.js")).toThrow();
  });

  it("offers no Users tab, because there are none", () => {
    expect(src("pages/SettingsPage.jsx")).not.toMatch(/UsersTab/);
  });

  it("offers no control that would do nothing", () => {
    // Quit and Switch user are Electron gestures. In a tab, window.close()
    // does nothing to a page the user opened, and signing out of a
    // single-user app signs you into the same place.
    for (const f of ["components/Topbar.jsx", "components/Sidebar.jsx", "components/MobileAppBar.jsx"]) {
      expect(code(f), f).not.toMatch(/handlePowerOff|handleSwitchUser|window\.close\(\)/);
    }
  });

  it("does not look for other editions on a disk it cannot read", () => {
    expect(src("pages/settings/DeviceTab.jsx")).not.toMatch(/findOtherEditions/);
  });
});

describe("the HQ connection in a browser", () => {
  beforeEach(() => localStorage.clear());

  it("keeps one install id across reloads", () => {
    // A new id each time would look to HQ like a new branch device on every
    // page load.
    const first = installId();
    expect(first).toBeTruthy();
    expect(installId()).toBe(first);
  });

  it("starts disconnected", () => {
    expect(readState().connected).toBe(false);
    expect(readPublicState().connected).toBe(false);
  });

  it("is connected once a token is stored, and forgets it on disconnect", () => {
    expect(saveState({ token: "tok_abc", businessId: "b1", branchId: "br1" }).ok).toBe(true);
    expect(readState().connected).toBe(true);
    expect(readState().token).toBe("tok_abc");

    clearState();
    expect(readState().connected).toBe(false);
    expect(readState().token).toBeUndefined();
  });

  it("never hands the token to anything that renders", () => {
    saveState({ token: "tok_abc", businessId: "b1", branchName: "Ikeja" });
    const shown = readPublicState();
    expect(shown.token).toBeUndefined();
    expect(shown.branchName).toBe("Ikeja");
    expect(shown.connected).toBe(true);
  });

  it("reports a browser that will not store rather than claiming success", () => {
    // Private browsing, or site data turned off. Saying "connected" here
    // would be a lie the shop finds out about when nothing reaches HQ.
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(saveState({ token: "tok_abc" }).ok).toBe(false);
    spy.mockRestore();
  });

  it("survives junk in storage instead of throwing on load", () => {
    localStorage.setItem("techdesk_web_hq", "{not json");
    expect(readState().connected).toBe(false);
  });

  it("keeps the install id when the connection is cleared", () => {
    const id = installId();
    saveState({ token: "tok_abc" });
    clearState();
    expect(installId()).toBe(id);
  });
});
