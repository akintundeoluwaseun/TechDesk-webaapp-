// Where the HQ connection lives in a browser.
//
// On the desktop this is Electron's main process: the renderer asks it to
// connect and never sees the device token. A browser has no such separation.
// There is one JavaScript context and one origin, so the token lives in this
// tab's localStorage, and anything running on this origin can read it.
//
// That is a real difference from the desktop app and worth being plain about:
//   - the token is a branch credential, not an account password. It lets this
//     device push its own sales up to head office. It cannot read other
//     branches, change anything at HQ, or sign anyone in.
//   - clearing site data disconnects the branch. Nothing is lost -- HQ keeps
//     what was already sent, and reconnecting starts sending again.
//   - a shared or public computer should not be connected to a branch, for the
//     same reason you would not leave the desktop app signed in on one.
//
// Disconnecting removes it, so handing the machine on is one button.

const KEY_INSTALL = "techdesk_web_install_id";
const KEY_STATE = "techdesk_web_hq";

function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    // Private mode, blocked storage, or a browser with cookies off. The app
    // still runs; it just cannot stay connected across reloads.
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * This browser's identity to HQ, made once and kept.
 *
 * HQ counts devices, so a new id on every load would look like a new branch
 * device every time. crypto.randomUUID is everywhere the app runs; the
 * fallback covers an insecure origin during development.
 */
export function installId() {
  let id = read(KEY_INSTALL);
  if (id) return id;
  id = globalThis.crypto?.randomUUID?.() ||
    `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  write(KEY_INSTALL, id);
  return id;
}

/** The connection, or a disconnected state. Includes the token. */
export function readState() {
  const raw = read(KEY_STATE);
  if (!raw) return { connected: false, installId: installId() };
  try {
    const state = JSON.parse(raw);
    return { ...state, connected: Boolean(state.token), installId: installId() };
  } catch {
    return { connected: false, installId: installId() };
  }
}

/** The connection without its token, for anything that renders. */
export function readPublicState() {
  const { token, ...rest } = readState();
  void token;
  return rest;
}

export function saveState(state) {
  const ok = write(KEY_STATE, JSON.stringify({ ...state, connectedAt: new Date().toISOString() }));
  // Reported rather than swallowed: a browser that cannot store this would
  // otherwise say "connected" and forget on the next reload.
  return { ok };
}

export function clearState() {
  try {
    localStorage.removeItem(KEY_STATE);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/** The cursor the next sync starts from. A local clock value, never HQ's. */
const KEY_CURSOR = "techdesk_web_hq_cursor";

export function readCursor() {
  return read(KEY_CURSOR) || null;
}

export function writeCursor(value) {
  write(KEY_CURSOR, value);
}
