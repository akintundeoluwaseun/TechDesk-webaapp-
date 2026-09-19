import React, { createContext, useContext } from "react";

// No sign-in in the web app.
//
// The desktop build has PINs and roles because a shop counter is shared: a
// seller should not see cost prices or the owner's reports. A browser tab on
// somebody's own phone or laptop is not shared in that way, and a PIN there
// protects nothing -- anyone holding the device is already past it.
//
// So there is one user, and they can see everything. This file keeps the same
// shape as the desktop one so every component that asks who is signed in goes
// on working, and so putting roles back later is one file rather than twenty.

const OWNER = { id: "owner", name: "Owner", role: "admin" };

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  return (
    <AuthContext.Provider
      value={{ user: OWNER, signIn: () => OWNER, signOut: () => {}, isAdmin: true }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Everything is reachable; kept so callers read the same as the desktop app. */
export function canAccess() {
  return true;
}

export function homeFor() {
  return "/";
}
