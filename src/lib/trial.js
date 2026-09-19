// Trial clock.
//
// The trial is counted in *distinct calendar days the app was actually
// opened*, not in raw milliseconds since install. That choice is deliberate:
//
//   - The number moves at midnight, the way a shop owner expects a day to
//     tick over, instead of at whatever time of day they happened to install.
//   - A wrong system clock can only ever burn ONE day. The old wall-clock
//     maths would expire a trial outright if the machine's date was behind at
//     install and then synced forward, which is the likeliest explanation for
//     a trial that "ended after a day".
//   - A shop that doesn't open on Sunday doesn't lose Sunday.
//
// The count only ever moves forward, so closing the app, changing the clock
// back, or clearing browser storage cannot hand anyone a fresh trial.

export const TRIAL_DAYS = 7;

// Local calendar day, not UTC -- a shop in Lagos rolls over at Lagos
// midnight, not at 01:00 the way a UTC key would.
export function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function clampDays(n) {
  const num = Number(n);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.min(TRIAL_DAYS, Math.floor(num));
}

export function freshState(today = dayKey()) {
  return { startedAt: today, daysUsed: 0, lastDay: today };
}

// Whole calendar days between two YYYY-MM-DD keys. Built from UTC midnights
// so a DST change in between can't produce a 23- or 25-hour "day".
export function daysBetween(fromKey, toKey) {
  const from = Date.parse(`${fromKey}T00:00:00Z`);
  const to = Date.parse(`${toKey}T00:00:00Z`);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0;
  return Math.round((to - from) / 86400000);
}

// Accepts anything we might find on disk or in localStorage -- including the
// pre-1.0.3 `techdesk_trial_start` ISO timestamp -- and returns a valid state.
export function normalizeState(raw, today = dayKey()) {
  if (raw && typeof raw === "object" && typeof raw.lastDay === "string") {
    return {
      startedAt: typeof raw.startedAt === "string" ? raw.startedAt : raw.lastDay,
      daysUsed: clampDays(raw.daysUsed),
      lastDay: raw.lastDay,
    };
  }

  // Migration: an existing install carries an ISO install date. Credit the
  // calendar days that have genuinely passed so upgrading doesn't silently
  // restart someone's trial, then count forward from here.
  if (typeof raw === "string" && raw) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      const startKey = dayKey(parsed);
      return {
        startedAt: startKey,
        daysUsed: clampDays(daysBetween(startKey, today)),
        lastDay: today,
      };
    }
  }

  return freshState(today);
}

// Marks today as used. Returns the same object when nothing changed so
// callers can skip a needless write.
export function advance(state, today = dayKey()) {
  if (state.lastDay === today) return state;
  // A day can only ever be spent once, however far the clock jumped.
  return { ...state, daysUsed: clampDays(state.daysUsed + 1), lastDay: today };
}

// Two records of the same trial (the userData file and localStorage) may
// disagree if one was cleared. The furthest-along one is the truth.
export function mergeStates(a, b) {
  if (!a) return b;
  if (!b) return a;
  if (b.daysUsed > a.daysUsed) return b;
  if (a.daysUsed > b.daysUsed) return a;
  return a.lastDay >= b.lastDay ? a : b;
}

export function describe(state) {
  const daysUsed = clampDays(state.daysUsed);
  const daysLeft = Math.max(0, TRIAL_DAYS - daysUsed);
  return { daysLeft, expired: daysLeft === 0 };
}
