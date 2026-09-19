import React, { createContext, useContext, useState } from "react";
import { db } from "./db";

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => db.getSettings());

  // Merged over what is on disk, not over the copy this provider happens to
  // be holding. That copy is a snapshot from mount, so anything written
  // straight to db since -- PIN recovery questions, for one -- would be wiped
  // by the next toggle in Settings. Setting recovery questions and then
  // switching on "Require PIN sign-in" silently threw the questions away,
  // leaving an owner who believed they had a way back in.
  function updateSettings(patch) {
    const next = { ...db.getSettings(), ...patch };
    db.saveSettings(next);
    setSettings(next);
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
