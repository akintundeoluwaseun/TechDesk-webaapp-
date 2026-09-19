// Desktop-only edition: there is no Android build here, so this is a stub.
// saveFile.js is shared verbatim across the editions and only reaches for this
// module when running inside Capacitor, which never happens in this one --
// keeping the stub means the Capacitor packages aren't a dependency here.
export async function nativeSave() {
  throw new Error("Native file saving isn't available in this edition.");
}
