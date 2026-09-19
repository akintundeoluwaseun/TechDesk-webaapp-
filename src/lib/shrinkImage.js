// Making a shop logo small enough to live in a receipt.
//
// The logo is kept as a data URL in settings, which means it is copied into
// every PDF the shop prints and into every backup. A photo straight off a
// phone is several megabytes; a 4MB receipt is slow to share on Nigerian
// data and can push localStorage over its quota, which would take the whole
// settings file with it.
//
// 480px on the long edge is more than any receipt uses -- the A4 header
// draws it at 90pt -- and lands around 40KB.

const MAX_EDGE = 480;
const QUALITY = 0.86;

/**
 * Returns a smaller data URL, or the original if it cannot be re-encoded.
 *
 * Never throws: a logo that will not shrink is still a logo, and refusing
 * the upload over it would be worse than a large file.
 */
export function shrinkImage(dataUrl, maxEdge = MAX_EDGE) {
  return new Promise((resolve) => {
    if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        if (scale === 1 && dataUrl.length < 200000) {
          resolve(dataUrl);
          return;
        }
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        // A white ground, because a transparent PNG flattens to black in a
        // PDF and the shop would get a black box where its logo should be.
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const out = canvas.toDataURL("image/jpeg", QUALITY);
        resolve(out.length < dataUrl.length ? out : dataUrl);
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
