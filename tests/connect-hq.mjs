import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
let pass = 0, fail = 0;
const check = (n, got, want) => {
  if (got === want) { console.log(`  ok    ${n}`); pass++; }
  else { console.log(`  FAIL  ${n}\n        wanted ${JSON.stringify(want)}\n        got    ${JSON.stringify(got)}`); fail++; }
};

// Stands in for Electron's preload. Keeps its state on window so the test can
// read what the app tried to store.
const BRIDGE = `window.__hqStore = { installId: null, saved: null, disconnected: 0 };
window.techdesk = {
  hqInstallId: async () => {
    if (!window.__hqStore.installId) window.__hqStore.installId = "install-test-0001-aaaa";
    return { ok: true, installId: window.__hqStore.installId };
  },
  hqRead: async () => ({ ok: true, state: window.__hqStore.saved
    ? { connected: true, installId: window.__hqStore.installId, ...window.__hqStore.saved }
    : { connected: false, installId: window.__hqStore.installId } }),
  hqSave: async (p) => { window.__hqStore.saved = p; return { ok: true }; },
  hqDisconnect: async () => { window.__hqStore.saved = null; window.__hqStore.disconnected++; return { ok: true }; },
  readTrial: async () => ({ ok: true, state: null }),
  writeTrial: async () => ({ ok: true }),
  readLicense: async () => ({ ok: true, state: null }),
  writeLicense: async (s) => ({ ok: true, state: s }),
  findOtherEditions: async () => ({ ok: true, editions: [] }),
  getNetworkInfo: async () => ({ ip: "127.0.0.1", url: "https://127.0.0.1:47821" }),
  syncActivity: () => {}, saveBackup: async () => ({ ok: true }),
};`;

async function open(routes = {}) {
  const p = await b.newPage({ viewport: { width: 1280, height: 1100 } });
  await p.addInitScript(BRIDGE);
  for (const [fn, h] of Object.entries(routes)) await p.route(`**/functions/v1/${fn}`, h);
  await p.goto("http://127.0.0.1:4177/#/settings");
  await p.waitForTimeout(3000);
  for (const l of ["Skip", "Close", "Got it", "Maybe later", "Finish"]) {
    const btn = p.locator(`button:has-text("${l}")`).first();
    if (await btn.count()) await btn.click().catch(() => {});
  }
  await p.keyboard.press("Escape");
  await p.goto("http://127.0.0.1:4177/#/settings");
  await p.waitForTimeout(1200);
  await p.locator('button:has-text("Connect to HQ")').first().click();
  await p.waitForTimeout(700);
  return p;
}
const err = (p) => p.locator("p.text-red-500").first().textContent().catch(() => "");

// --- validation, nothing leaves ------------------------------------------
{
  let calls = 0;
  const p = await open({ "connect-start": (r) => { calls++; r.abort(); } });
  await p.fill('input[placeholder="Akure South"]', "");
  await p.locator('form button[type="submit"]').first().click();
  await p.waitForTimeout(300);
  check("branch name required", (await err(p)).trim(), "Give this branch a name first.");
  await p.fill('input[placeholder="Akure South"]', "Akure South");
  await p.locator('form button[type="submit"]').first().click();
  await p.waitForTimeout(300);
  check("HQ number required", (await err(p)).trim(), "Enter your HQ phone number.");
  check("nothing sent to the server", calls, 0);
  await p.close();
}

// --- the happy path -------------------------------------------------------
{
  let startBody = null, verifyBody = null;
  const p = await open({
    "connect-start": (r) => {
      startBody = JSON.parse(r.request().postData());
      r.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ ok: true, state: "state-abc", targetPhone: "+234 801 *** 5678" }) });
    },
    "connect-verify": (r) => {
      verifyBody = JSON.parse(r.request().postData());
      r.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ ok: true, token: "device-token-0123456789abcdef", businessId: "biz-1", branchId: "br-1" }) });
    },
  });
  await p.fill('input[placeholder="Akure South"]', "  Akure South  ");
  await p.fill('input[placeholder="08012345678"]', " 08012345678 ");
  await p.locator('form button[type="submit"]').first().click();
  await p.waitForTimeout(600);
  check("branch name trimmed", startBody.requesterLabel, "Akure South");
  check("HQ number sent", startBody.targetPhone, "08012345678");
  check("asks as a manager", startBody.requesterRole, "manager");
  check("targets HQ", startBody.targetRole, "hq");
  check("install id sent", startBody.installId, "install-test-0001-aaaa");
  check("masked number shown back", await p.locator("b").filter({ hasText: "+234" }).first().textContent(), "+234 801 *** 5678");

  await p.fill('input[placeholder="000000"]', "12 34-56");
  check("pasted code cleaned", await p.inputValue('input[placeholder="000000"]'), "123456");
  await p.fill('input[placeholder="000000"]', "483920");
  await p.locator('form button[type="submit"]').first().click();
  await p.waitForTimeout(700);
  check("handle sent, not the phone alone", verifyBody.state, "state-abc");
  check("code sent", verifyBody.code, "483920");
  check("edition sent", verifyBody.edition, "business");
  const stored = await p.evaluate(() => window.__hqStore.saved);
  check("token handed to the main process", stored.token, "device-token-0123456789abcdef");
  check("business recorded", stored.businessId, "biz-1");
  check("connected panel shown", await p.locator("text=Connected to HQ").count(), 1);
  await p.close();
}

// --- the server saying no -------------------------------------------------
{
  const p = await open({
    "connect-start": (r) => r.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ ok: true, state: "s", targetPhone: "+234 801 *** 5678" }) }),
    "connect-verify": (r) => r.fulfill({ status: 400, contentType: "application/json",
      body: JSON.stringify({ ok: false, error: "wrong_code", message: "That code is not right. 3 tries left." }) }),
  });
  await p.fill('input[placeholder="Akure South"]', "Akure");
  await p.fill('input[placeholder="08012345678"]', "08012345678");
  await p.locator('form button[type="submit"]').first().click();
  await p.waitForTimeout(600);
  await p.fill('input[placeholder="000000"]', "000000");
  await p.locator('form button[type="submit"]').first().click();
  await p.waitForTimeout(600);
  check("server wording shown", (await err(p)).trim(), "That code is not right. 3 tries left.");
  check("code form stays up", await p.locator('input[placeholder="000000"]').count(), 1);
  check("nothing stored", await p.evaluate(() => window.__hqStore.saved), null);
  await p.close();
}

// --- an unregistered HQ number -------------------------------------------
{
  const p = await open({
    "connect-start": (r) => r.fulfill({ status: 409, contentType: "application/json",
      body: JSON.stringify({ ok: false, error: "not_registered", message: "That number isn't set up as HQ yet." }) }),
  });
  await p.fill('input[placeholder="Akure South"]', "Akure");
  await p.fill('input[placeholder="08012345678"]', "08099999999");
  await p.locator('form button[type="submit"]').first().click();
  await p.waitForTimeout(600);
  check("unregistered number explained", (await err(p)).trim(), "That number isn't set up as HQ yet.");
  check("stays on the first step", await p.locator('input[placeholder="08012345678"]').count(), 1);
  await p.close();
}

// --- offline --------------------------------------------------------------
{
  const p = await open({ "connect-start": (r) => r.abort("failed") });
  await p.fill('input[placeholder="Akure South"]', "Akure");
  await p.fill('input[placeholder="08012345678"]', "08012345678");
  await p.locator('form button[type="submit"]').first().click();
  await p.waitForTimeout(800);
  check("offline says so", (await err(p)).trim(), "Couldn't reach TechDesk. Check your internet and try again.");
  await p.close();
}

await b.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
