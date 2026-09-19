import { useEffect } from "react";
import { hq } from "./hq";

// Always on here: there is no desktop shell to check for, and a web branch
// that never reported in would lose its records to a cleared browser.
//
// How often a connected branch reports in. Two minutes is frequent enough that
// HQ's screen feels live, and rare enough that a shop on mobile data is not
// paying for it all day.
const EVERY_MS = 2 * 60 * 1000;

/**
 * Pushes changes to HQ in the background, for as long as this device is
 * connected.
 *
 * Nothing here surfaces errors. A shop with no internet is the normal case,
 * not a fault, and interrupting someone mid-sale to say so would be worse than
 * useless -- the next run picks up exactly where this one left off, because
 * the cursor only moves on a confirmed success.
 */
export function useHqSync() {
  useEffect(() => {

    let cancelled = false;
    let timer = null;

    async function run() {
      if (cancelled) return;
      try {
        // A batch is capped, so a shop with months of history to send would
        // otherwise trickle it out one batch every two minutes. Keep going
        // while there is more, but yield between batches so a long catch-up
        // cannot hold the app up.
        let guard = 0;
        let res = await hq.sync();
        while (!cancelled && res?.ok && res.more && guard < 20) {
          guard += 1;
          res = await hq.sync();
        }
      } catch {
        // Never let a sync failure bubble into the UI.
      }
      if (!cancelled) timer = setTimeout(run, EVERY_MS);
    }

    // A few seconds after launch, so it never competes with first paint.
    timer = setTimeout(run, 8000);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);
}
