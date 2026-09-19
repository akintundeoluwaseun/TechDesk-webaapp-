import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Guards a bug that nearly shipped: the sync code was ported into an edition
// whose App.jsx had a different set of hooks, so the patch adding the call
// silently did not apply. Everything built, every test passed, and nothing
// ever synced -- which looks exactly like working software until someone
// notices HQ is empty.
describe("background sync is actually wired up", () => {
  const app = readFileSync(resolve(__dirname, "../App.jsx"), "utf-8");

  it("imports the hook", () => {
    expect(app).toMatch(/import \{ useHqSync \} from "\.\/lib\/useHqSync"/);
  });

  it("calls it, not just imports it", () => {
    expect(app).toMatch(/\buseHqSync\(\)/);
  });
});
