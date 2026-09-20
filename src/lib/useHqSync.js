import { useEffect } from "react";
import { hq } from "./hq";
import { CHANGED_EVENT } from "./db";

// How often a connected branch reports in even when nothing has happened.
// It is a heartbeat, not the main mechanism: a sale goes up seconds after it
// is rung, not up to two minutes later.
const HEARTBEAT_MS = 2 * 60 * 1000;

// Long enough that ringing up a sale -- several writes in a row -- is one
// push rather than six, short enough that HQ sees it while the customer is
// still at the counter.
const AFTER_CHANGE_MS = 6 * 1000;

/**
 * Keeps HQ up to date in the background, for as long as this device is
 * connected.
 *
 * Four things start a push: a change to the shop's own records, the tab
 * becoming visible again, the browser coming back online, and a timer that
 * carries on regardless. The timer alone was enough to be correct and not
 * enough to feel right -- a shop that made a sale and then looked at HQ saw
 * nothing there, and had no way to tell whether it was broken or just early.
 *
 * Nothing here surfaces errors. A shop with no internet is the normal case,
 * not a fault, and interrupting someone mid-sale to say so would be worse
 * than useless -- the next run picks up exactly where this one left off,
 * because the cursor only moves on a confirmed success.
 */
export function useHqSync() {
  useEffect(() => {
    let cancelled = false;
    let heartbeat = null;
    let debounce = null;
    let running = false;

    async function push() {
      if (cancelled || running) return;
      // Nothing to send into, and no point waking the radio for it.
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;

      running = true;
      try {
        // A batch is capped, so a shop with months of history behind it would
        // otherwise trickle it out one batch at a time. Keep going while
        // there is more, but yield between batches so a long catch-up cannot
        // hold the app up.
        let guard = 0;
        let res = await hq.sync();
        while (!cancelled && res?.ok && res.more && guard < 20) {
          guard += 1;
          res = await hq.sync();
        }
      } catch {
        // Never let a sync failure bubble into the UI.
      } finally {
        running = false;
      }
    }

    function soon() {
      clearTimeout(debounce);
      debounce = setTimeout(push, AFTER_CHANGE_MS);
    }

    function onVisible() {
      if (document.visibilityState === "visible") push();
    }

    window.addEventListener(CHANGED_EVENT, soon);
    window.addEventListener("online", push);
    document.addEventListener("visibilitychange", onVisible);

    // A few seconds after launch, so it never competes with first paint.
    const firstRun = setTimeout(push, 8000);
    heartbeat = setInterval(push, HEARTBEAT_MS);

    return () => {
      cancelled = true;
      clearTimeout(firstRun);
      clearTimeout(debounce);
      clearInterval(heartbeat);
      window.removeEventListener(CHANGED_EVENT, soon);
      window.removeEventListener("online", push);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}
