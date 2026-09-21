# TechDesk Web — deploy target

**This repository holds a build, not source.** Editing anything here is
overwritten the next time the app is published.

The source lives in the TechDesk monorepo, at `apps/web`, alongside the
desktop, Android and Monitor shells. All four render the same screens from
`@techdesk/ui`, which is the point: a fix reaches every one of them, or it
reaches none.

## Why the build lives here

Vercel watches this repository. The app itself is a hash-routed single page,
so there is nothing to build and no route a server has to understand — the
files below are served exactly as they are.

## The history

This repository used to hold its own copy of every screen, written before
TechDesk had paid tiers. That copy is on the `pre-merge-source` branch,
unchanged. It is kept for reference and is not built or deployed.

It is also the reason the web app was free: the tier system was written after
that copy was taken, so staff accounts, PDF receipts, WhatsApp and head
office were open to anyone here while the desktop and Android apps charged
for them.

## Publishing a change

Change `apps/web` (or anything in `packages/`) in the monorepo, then publish
from there. Nothing is edited by hand in this repository.
