# TechDesk Web

TechDesk in a browser tab. Same shop as the desktop Business edition — sales,
repairs, inventory, customers, reports, receipts — with three differences that
follow from where it runs.

**No sign-in.** The desktop build has PINs and roles because a shop counter is
shared, and a seller should not see cost prices or the owner's reports. A
browser tab on somebody's own phone or laptop is not shared that way, and a PIN
there protects nothing: whoever is holding the device is already past it.

**Records live in this browser.** There is no installer and no folder on disk,
so everything is kept in the browser's own storage for this site. That means
clearing site data, or "clear browsing history" with site data ticked, erases
the shop's records on this device.

**So connect it to head office.** Settings → Connect to HQ links this browser
to an Enterprise HQ, and from then on it sends up what it sells, every couple
of minutes, in the background. A cleared browser then costs you the device, not
the history. A shop with no HQ should take a backup from Settings → Device and
keep the file somewhere safe.

## Running it

```
npm install
npm run dev      # http://localhost:5173
npm test
npm run build    # -> dist/
```

## Deploying

Pushing to `main` builds and publishes to GitHub Pages via
`.github/workflows/pages.yml`. **Pages has to be turned on once by hand:**
Settings → Pages → Source → "GitHub Actions". Until then the build passes and
the deploy step fails.

The app routes on the URL hash and loads its assets relatively, so it works
from a subpath like `/techdesk-webaapp-/` without further configuration.

## What is not here

`window.techdesk` — the Electron bridge — does not exist in a browser, so the
desktop-only pieces are gone rather than hidden: the lock screen and PIN
recovery, the Users tab, the LAN sync, the scan for other TechDesk editions
installed on the same computer, and the Quit and Switch user buttons. A test
in `src/lib/webApp.test.js` keeps them gone.
