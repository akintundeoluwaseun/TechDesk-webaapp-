// No Android build in this edition, so this is a stub. saveFile.js is shared
// verbatim across the editions and only reaches for this module when running
// inside Capacitor, which never happens here -- keeping the stub means the
// Capacitor packages are not a dependency of a desktop or browser build.

export async function nativeSave() {
  throw new Error("Native file saving isn't available in this edition.");
}

export async function nativeShare() {
  throw new Error("Native sharing isn't available in this edition.");
}
