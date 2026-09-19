import { IS_ANDROID_APP } from "./platform";

// Saving a generated file, from whichever shell the app is running in.
//
// jsPDF's doc.save() and the CSV export both do the same browser trick: build
// a blob URL and click an <a download>. That works in a browser and in
// Electron, and does nothing at all inside Android's WebView, which has no
// download manager behind it -- the tap silently fails.
//
// Two details of the browser path were also wrong everywhere: the anchor was
// never attached to the document (some engines ignore a click on a detached
// one) and the object URL was revoked synchronously right after click(),
// which can cancel the download before it has started.

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.onload = () => {
      const result = String(reader.result || "");
      // drop the "data:<type>;base64," prefix
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.readAsDataURL(blob);
  });
}

function browserDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function saveBlob(blob, filename) {
  if (!IS_ANDROID_APP) {
    browserDownload(blob, filename);
    return { ok: true, via: "download" };
  }

  try {
    // On Android the file is written to the app's cache and handed to the
    // system share sheet, which is the more useful ending anyway: the shop
    // can save it, print it, or send it straight to the customer.
    const { nativeSave } = await import("./nativeSave");
    return await nativeSave(await blobToBase64(blob), filename);
  } catch (err) {
    const message = String(err?.message || err);
    // A cancelled share sheet isn't a failure -- the file is written either way.
    if (/cancel/i.test(message)) return { ok: true, via: "cancelled" };
    // Tapping save and getting nothing is the bug this module exists to fix,
    // so a real failure must never be silent.
    try {
      window.alert(`Couldn't save ${filename}.\n\n${message}`);
    } catch {
      /* no alert available; the return value still reports it */
    }
    return { ok: false, error: message };
  }
}

// jsPDF hands back a real Blob, so PDFs and CSVs share one path.
export function savePdf(doc, filename) {
  return saveBlob(doc.output("blob"), filename);
}
