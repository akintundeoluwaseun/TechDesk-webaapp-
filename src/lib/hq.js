// Talking to the TechDesk backend, from a browser.
//
// Same three steps as the desktop app, and the shop owner's part in between is
// still a phone call:
//
//   1. connectStart(hqPhone)  -- a code is texted to HQ's phone
//   2. the manager rings HQ, who reads the code out
//   3. connectVerify(code)    -- the device is linked and gets its token
//
// The difference from the desktop build is where the token ends up. There, it
// goes to Electron's main process and the UI never sees it. A browser has no
// second process to hide it in, so it lives in this origin's localStorage --
// see hqStore.js, which says plainly what that does and does not mean. The
// posting therefore happens here rather than being handed off.

import { db } from "./db";
import { installId, readState, readPublicState, saveState, clearState } from "./hqStore";

// Public by design. This gets a request to the door; the database decides what
// it is allowed through it. Nothing secret ships in the app.
const SUPABASE_URL = "https://wuwerzyydtvargvqjufb.supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_aiiQjedgBx4Tq-NX_jIGtw_ekAYgxV_";

const EDITION = "web";

/** The handle from connectStart, held only until verify. Never persisted. */
let pendingState = null;
// The provider's id for the code that was just sent. Handed back at verify so
// the check works even on a backend that has not stored it.
let pendingOtpId = null;
let pendingPhone = null;

async function post(fn, body, token) {
  let res;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token || PUBLISHABLE_KEY}`,
        "apikey": PUBLISHABLE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch {
    // No connection at all. Said plainly, because a shop on a dropped line
    // should not be left wondering whether it was their fault.
    return { ok: false, error: "offline", message: "Couldn't reach TechDesk. Check your internet and try again." };
  }
  const data = await res.json().catch(() => ({}));
  if (data && typeof data.ok === "boolean") return data;
  return { ok: false, error: "server_error", message: "Something went wrong. Try again." };
}

export const hq = {
  /** The web app can always try; there is no shell that might be missing. */
  available: () => true,

  /** Whether this device is connected, and to whom. Never the token. */
  async status() {
    return readPublicState();
  },

  /**
   * Step one. Texts a code to the HQ number and keeps the handle that proves
   * this device asked. Returns the masked number so the person can check they
   * typed it right before ringing anyone.
   */
  async connectStart({ hqPhone, branchName, businessName }) {
    const label = (branchName || "").trim();
    if (!label) return { ok: false, message: "Give this branch a name first." };

    const res = await post("connect-start", {
      installId: installId(),
      requesterRole: "manager",
      requesterLabel: label,
      targetPhone: hqPhone,
      targetRole: "hq",
      branchName: label,
      businessName: businessName || null,
      edition: EDITION,
    });

    if (res.ok) {
      pendingState = res.state;
      pendingOtpId = res.otpId || null;
      pendingPhone = hqPhone;
    }
    return res;
  },

  /** Step two. The code HQ read out. */
  async connectVerify({ code, appVersion }) {
    if (!pendingState) {
      return { ok: false, message: "Ask for a new code first." };
    }

    const res = await post("connect-verify", {
      state: pendingState,
      otpId: pendingOtpId,
      installId: installId(),
      targetPhone: pendingPhone,
      code,
      edition: EDITION,
      appVersion: appVersion || null,
    });

    if (!res.ok) return res;

    const saved = saveState({
      token: res.token,
      businessId: res.businessId,
      branchId: res.branchId,
      hqPhone: pendingPhone,
      branchName: res.branchName || null,
    });
    // The handle is spent either way: it cannot be used twice, and keeping it
    // around only invites a confusing second attempt.
    pendingState = null;
    pendingOtpId = null;
    pendingPhone = null;

    if (!saved.ok) {
      // The device IS linked at HQ but the token did not survive locally --
      // private browsing, or site data turned off. Saying "connected" here
      // would be a lie the shop discovers when nothing ever reaches HQ.
      return {
        ok: false,
        message:
          "Connected, but this browser wouldn't save it. Turn off private browsing, or allow site data, then connect again.",
      };
    }
    return { ok: true };
  },

  /**
   * Sends everything changed since the last successful sync.
   *
   * The cursor moves only on a confirmed success, so a failed push is retried
   * rather than skipped, and it is always a time from this device's own clock
   * -- the server's reply would drift against it.
   */
  async sync({ appVersion } = {}) {
    const state = readState();
    if (!state.connected) return { ok: false, error: "not_connected" };

    const batch = db.getSyncBatch(state.lastSyncAt);

    // An empty push is still worth making: it is how a branch says "still
    // here", and it is what keeps HQ's online dot honest.
    const res = await post("sync-push", {
      records: batch.records,
      edition: EDITION,
      appVersion: appVersion || null,
    }, state.token);

    if (!res?.ok) return { ...res, sent: 0, more: batch.more };

    if (batch.records.length) {
      saveState({ ...state, lastSyncAt: batch.cursor });
    }
    return { ok: true, sent: batch.records.length, more: batch.more };
  },

  /** Forgets the connection in this browser. The install id survives. */
  async disconnect() {
    pendingState = null;
    pendingOtpId = null;
    pendingPhone = null;
    return clearState();
  },
};
