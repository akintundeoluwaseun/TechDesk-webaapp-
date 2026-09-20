import { IS_ANDROID_APP } from "./platform";
import { toast } from "./toast";

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

export async function saveBlob(blob, filename, { share = false } = {}) {
  if (!IS_ANDROID_APP) {
    browserDownload(blob, filename);
    return { ok: true, via: "download" };
  }

  try {
    const native = await import("./nativeSave");
    const base64 = await blobToBase64(blob);

    // Share only when a button said share. Saving saves: the file lands in
    // the phone's own files and a line on screen says where, rather than
    // opening a chooser the shop has to answer before anything is kept.
    if (share) return await native.nativeShare(base64, filename);

    const saved = await native.nativeSave(base64, filename);
    toast(`Saved to ${saved.folder || "your files"}`);
    return saved;
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

/** The share sheet, for a button that says share. */
export function sharePdf(doc, filename) {
  return saveBlob(doc.output("blob"), filename, { share: true });
}

/**
 * A filename a shop can find again: who it was for, then which receipt.
 *
 * "INV-00001.pdf" tells you nothing in a folder of two hundred. "Oluwaseun -
 * INV-00001.pdf" sorts by customer and still carries the number.
 *
 * Strips what filesystems refuse and collapses the rest, because a customer
 * called "Ade / Bola" must not create a folder.
 */
export function receiptFilename(customerName, reference, suffix = "") {
  const who = String(customerName || "")
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
  const ref = String(reference || "receipt").trim();
  const tail = suffix ? `-${suffix}` : "";
  return who ? `${who} - ${ref}${tail}.pdf` : `${ref}${tail}.pdf`;
}

/**
 * Opens the PDF in whatever views PDFs here, instead of saving it.
 *
 * On a phone that is the system viewer, reached through the same share sheet
 * the save path uses -- Android's WebView has no viewer of its own. On a
 * desktop it is a new tab, where the browser's own print button is one click
 * away. Either way nothing lands in Downloads that the shop has to tidy up.
 */
export async function printPdf(doc, filename) {
  if (IS_ANDROID_APP) {
    // Android has no "open in a viewer" of its own that a web app can call:
    // the chooser the share sheet puts up is how a PDF reaches a viewer or
    // a print service. So printing shares, and saving saves.
    return saveBlob(doc.output("blob"), filename, { share: true });
  }

  const url = URL.createObjectURL(doc.output("blob"));
  const win = window.open(url, "_blank");
  if (!win) {
    // Pop-up blocked. Falling back to a download beats doing nothing and
    // leaving the shop wondering whether the button works.
    URL.revokeObjectURL(url);
    return saveBlob(doc.output("blob"), filename);
  }
  // Long enough for the tab to have loaded it; revoking sooner shows a blank
  // viewer, which looks exactly like a broken button.
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return { ok: true, via: "viewer" };
}
