import React, { createContext, useContext, useState } from "react";

const STORAGE_KEY = "techdesk_hide_startup_tutorial";
const HelpContext = createContext(null);

export function HelpProvider({ children }) {
  const [open, setOpen] = useState(() => localStorage.getItem(STORAGE_KEY) !== "1");

  function dismiss(dontShowAgain) {
    if (dontShowAgain) localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  }

  return (
    <HelpContext.Provider value={{ open, openHelp: () => setOpen(true), dismiss }}>
      {children}
    </HelpContext.Provider>
  );
}

export function useHelp() {
  const ctx = useContext(HelpContext);
  if (!ctx) throw new Error("useHelp must be used within HelpProvider");
  return ctx;
}
