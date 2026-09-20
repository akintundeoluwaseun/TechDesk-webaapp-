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

## Where it is deployed

The live copy is at **techdeskweb.vercel.app**, which is what the website's
"Web App" links point at.

For a long time nothing deployed there automatically. The repository built and
tested cleanly on every push and published to nowhere, so a fix could be
written, reviewed and merged while the shops using it stayed on an old build.
The only deploy workflow targeted GitHub Pages, which had never been switched
on, so it failed on all eight of its runs -- a red cross on every push, while
the tests underneath it were passing.

`.github/workflows/deploy.yml` now handles both, and **one of the two has to be
set up**:

**Vercel** keeps the current URL, so nothing else has to change. Either connect
the project to this repository in Vercel's own dashboard -- after which it
deploys itself and this workflow is unnecessary -- or add three repository
secrets: `VERCEL_TOKEN` (Account Settings -> Tokens), `VERCEL_ORG_ID` and
`VERCEL_PROJECT_ID` (Project Settings -> General).

**GitHub Pages** is free and needs no account, but the URL becomes
`<owner>.github.io/<repo>/`, and the website's Web App link has to change with
it. Settings -> Pages -> Source -> "GitHub Actions".

A target that is not configured is skipped rather than failed, because a red
cross meaning "you have not chosen yet" is indistinguishable from one meaning
"you broke it".

**Which build am I looking at?** Settings -> Developer shows the commit the
running app was built from. That is the answer to "is the fix live", without
reading the bundle.

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
