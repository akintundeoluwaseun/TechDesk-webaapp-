import { describe as group, it, expect } from "vitest";
import {
  TRIAL_DAYS,
  dayKey,
  freshState,
  daysBetween,
  normalizeState,
  advance,
  mergeStates,
  describe as summarise,
} from "./trial";

const left = (state) => summarise(state).daysLeft;

group("trial countdown", () => {
  it("starts at the full trial length", () => {
    expect(left(freshState("2026-09-14"))).toBe(TRIAL_DAYS);
  });

  it("drops by one on each new calendar day and then expires", () => {
    let state = freshState("2026-09-14");
    const seen = [left(state)];
    for (let d = 15; d <= 22; d += 1) {
      state = advance(state, `2026-09-${d}`);
      seen.push(left(state));
    }
    expect(seen).toEqual([7, 6, 5, 4, 3, 2, 1, 0, 0]);
    expect(summarise(state).expired).toBe(true);
  });

  it("does not move when the app is reopened the same day", () => {
    const state = freshState("2026-09-14");
    expect(advance(state, "2026-09-14")).toBe(state);
    expect(left(advance(state, "2026-09-14"))).toBe(TRIAL_DAYS);
  });

  it("burns at most one day however far the clock jumps forward", () => {
    // The reported "expired after a day" case: a machine whose date was
    // years behind at install and then synced. Wall-clock maths would end
    // the trial outright; a day can only be spent once.
    const state = advance(freshState("2026-09-14"), "2031-01-01");
    expect(left(state)).toBe(TRIAL_DAYS - 1);
    expect(summarise(state).expired).toBe(false);
  });

  it("cannot be extended by winding the clock back", () => {
    let state = advance(freshState("2026-09-14"), "2026-09-15");
    expect(left(state)).toBe(6);
    state = advance(state, "2020-01-01");
    expect(left(state)).toBe(5);
  });

  it("never reports fewer than zero days", () => {
    let state = freshState("2026-09-14");
    for (let d = 0; d < 40; d += 1) state = advance(state, `day-${d}`);
    expect(left(state)).toBe(0);
  });
});

group("trial state recovery", () => {
  it("migrates a pre-1.0.3 install timestamp without restarting the trial", () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const state = normalizeState(threeDaysAgo.toISOString());
    expect(left(state)).toBe(TRIAL_DAYS - 3);
  });

  it("clamps a migrated install that is already past the trial", () => {
    const longAgo = new Date();
    longAgo.setDate(longAgo.getDate() - 400);
    expect(left(normalizeState(longAgo.toISOString()))).toBe(0);
  });

  it("falls back to a fresh trial for junk input", () => {
    expect(left(normalizeState(null))).toBe(TRIAL_DAYS);
    expect(left(normalizeState("not a date"))).toBe(TRIAL_DAYS);
    expect(left(normalizeState({ daysUsed: "abc", lastDay: 12 }))).toBe(TRIAL_DAYS);
  });

  it("repairs a tampered negative or oversized day count", () => {
    expect(left(normalizeState({ daysUsed: -99, lastDay: "2026-09-14" }))).toBe(TRIAL_DAYS);
    expect(left(normalizeState({ daysUsed: 9e9, lastDay: "2026-09-14" }))).toBe(0);
  });

  it("keeps the furthest-along record when the two copies disagree", () => {
    // Clearing localStorage must not buy a second trial: the userData file
    // is still four days in.
    const wiped = freshState("2026-09-18");
    const onDisk = { startedAt: "2026-09-14", daysUsed: 4, lastDay: "2026-09-18" };
    expect(mergeStates(wiped, onDisk).daysUsed).toBe(4);
    expect(mergeStates(onDisk, wiped).daysUsed).toBe(4);
  });

  it("counts calendar days across a month boundary", () => {
    expect(daysBetween("2026-09-28", "2026-10-02")).toBe(4);
    expect(daysBetween("2026-02-27", "2026-03-01")).toBe(2);
  });

  it("builds a local day key, not a UTC one", () => {
    const d = new Date(2026, 8, 14, 23, 30);
    expect(dayKey(d)).toBe("2026-09-14");
  });
});
