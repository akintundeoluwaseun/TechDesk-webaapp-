import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import codeHashes from "../data/activationHashes.json";
import { TRIAL_DAYS, dayKey, normalizeState, advance, mergeStates, describe } from "./trial";

const LicenseContext = createContext(null);

const KEY_ASSIGNED_INDEX = "techdesk_license_index";
const KEY_TRIAL = "techdesk_trial";
const KEY_TRIAL_START_LEGACY = "techdesk_trial_start";
const KEY_ACTIVATED = "techdesk_activated";

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// The device's PIN is drawn once from the table and must never change: the
// activation code a customer paid for is only valid against the PIN it was
// issued for. Losing this index silently re-rolls the PIN and invalidates a
// code that has already been bought, so it is persisted alongside the
// activation flag rather than in localStorage alone.
function readLocalIndex() {
  const raw = localStorage.getItem(KEY_ASSIGNED_INDEX);
  if (raw === null) return null;
  const index = Number(raw);
  return Number.isInteger(index) && index >= 0 && index < codeHashes.length ? index : null;
}

function assignIndex() {
  return Math.floor(Math.random() * codeHashes.length);
}

function storeLocalIndex(index) {
  try {
    localStorage.setItem(KEY_ASSIGNED_INDEX, String(index));
  } catch {
    // license.json is the durable copy; losing this mirror is survivable.
  }
}

function readLocalTrial() {
  try {
    const raw = localStorage.getItem(KEY_TRIAL);
    if (raw) return normalizeState(JSON.parse(raw));
    // Pre-1.0.3 installs stored only the install timestamp.
    const legacy = localStorage.getItem(KEY_TRIAL_START_LEGACY);
    if (legacy) return normalizeState(legacy);
  } catch {
    /* fall through to a fresh trial */
  }
  return null;
}

function writeLocalTrial(state) {
  try {
    localStorage.setItem(KEY_TRIAL, JSON.stringify(state));
  } catch {
    // Out of quota, or storage blocked. The userData file is the durable
    // copy, so losing this mirror is survivable.
  }
}

export function LicenseProvider({ children }) {
  const [activated, setActivated] = useState(() => localStorage.getItem(KEY_ACTIVATED) === "1");
  // Seeded from localStorage so the PIN renders immediately, then corrected
  // from license.json below if that disagrees.
  const [licenseIndex, setLicenseIndex] = useState(() => {
    const local = readLocalIndex();
    if (local !== null) return local;
    const fresh = assignIndex();
    storeLocalIndex(fresh);
    return fresh;
  });
  const assignedEntry = codeHashes[licenseIndex];

  // Render immediately from local storage; the userData file is read a tick
  // later and reconciled, so the sidebar never waits on IPC to show a number.
  const [trial, setTrial] = useState(() => advance(normalizeState(readLocalTrial())));
  const trialRef = useRef(trial);
  trialRef.current = trial;

  const activatedRef = useRef(activated);
  activatedRef.current = activated;

  function commit(next) {
    setTrial(next);
    trialRef.current = next;
    writeLocalTrial(next);
    window.techdesk?.writeTrial?.(next);
  }

  // Restore activation from license.json. This is the half that fixes an app
  // showing "Activate" again the morning after it was activated: localStorage
  // may have lost the write, but the file did not. Sticky in one direction --
  // the file can turn activation on, never off.
  useEffect(() => {
    let cancelled = false;
    Promise.resolve(window.techdesk?.readLicense?.())
      .then((res) => {
        if (cancelled || !res?.ok) return;
        const stored = res.state;
        const storedIndex = Number(stored?.licenseIndex);
        const hasStoredIndex =
          Number.isInteger(storedIndex) && storedIndex >= 0 && storedIndex < codeHashes.length;

        // The file is the authority on which PIN this device was issued, so a
        // device whose localStorage was cleared gets its original PIN back
        // instead of drawing a new one its paid code wouldn't match.
        if (hasStoredIndex && storedIndex !== licenseIndex) {
          setLicenseIndex(storedIndex);
          storeLocalIndex(storedIndex);
        }

        if (stored?.activated === true) {
          setActivated(true);
          try {
            localStorage.setItem(KEY_ACTIVATED, "1");
          } catch {
            /* mirror only */
          }
        }

        // Seed the file on first run, and heal it if it is missing either
        // half -- including for devices activated before this existed.
        if (!stored || !hasStoredIndex || (activatedRef.current && stored.activated !== true)) {
          window.techdesk?.writeLicense?.({
            activated: activatedRef.current,
            licenseIndex: hasStoredIndex ? storedIndex : licenseIndex,
          });
        }
      })
      .catch(() => {
        // No Electron bridge (browser/dev).
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reconcile with the durable copy on disk. Whichever record is further
  // along wins, so clearing localStorage cannot buy a second trial and a
  // wiped profile cannot lose one.
  useEffect(() => {
    let cancelled = false;
    Promise.resolve(window.techdesk?.readTrial?.())
      .then((res) => {
        if (cancelled) return;
        const fromDisk = res?.ok && res.state ? normalizeState(res.state) : null;
        const merged = advance(mergeStates(trialRef.current, fromDisk));
        commit(merged);
      })
      .catch(() => {
        // No Electron bridge (browser/dev). localStorage stands alone.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Roll the day over while the app stays open -- a shop leaves this running
  // for weeks, so the count has to move at midnight without a restart.
  useEffect(() => {
    const t = setInterval(() => {
      const next = advance(trialRef.current, dayKey());
      if (next !== trialRef.current) commit(next);
    }, 60000);
    return () => clearInterval(t);
  }, []);

  const { daysLeft, expired } = describe(trial);
  const restricted = !activated && expired;

  async function verifyCode(input) {
    const clean = (input || "").trim().toUpperCase();
    const candidateHash = await sha256Hex(`${assignedEntry.pin}:${clean}`);
    if (candidateHash !== assignedEntry.hash) return false;

    try {
      localStorage.setItem(KEY_ACTIVATED, "1");
    } catch {
      // Quota or blocked storage -- the file below is what actually counts.
    }
    setActivated(true);
    // Durable, synchronous on the main-process side: once this resolves the
    // activation has really hit the disk, so a power cut can't undo it.
    await Promise.resolve(
      window.techdesk?.writeLicense?.({ activated: true, licenseIndex })
    ).catch(() => {});
    return true;
  }

  return (
    <LicenseContext.Provider
      value={{
        activated,
        pin: assignedEntry.pin,
        trialDays: TRIAL_DAYS,
        daysUsed: trial.daysUsed,
        daysLeft,
        trialExpired: expired,
        restricted,
        verifyCode,
      }}
    >
      {children}
    </LicenseContext.Provider>
  );
}

export function useLicense() {
  const ctx = useContext(LicenseContext);
  if (!ctx) throw new Error("useLicense must be used within LicenseProvider");
  return ctx;
}
