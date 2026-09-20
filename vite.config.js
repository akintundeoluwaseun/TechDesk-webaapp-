import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Which build is this?
//
// The app is deployed somewhere this repo cannot see, so "is the fix live?"
// used to be unanswerable without reading the bundle. Vercel sets
// VERCEL_GIT_COMMIT_SHA on every build and GitHub Actions sets GITHUB_SHA;
// whichever is present is stamped in and shown in Settings -> Developer, so
// the answer is on screen.
const sha =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  "";

export default defineConfig({
  plugins: [react()],
  base: "./",
  define: {
    __BUILD_SHA__: JSON.stringify(sha ? sha.slice(0, 7) : "dev"),
    __BUILD_AT__: JSON.stringify(new Date().toISOString()),
  },
  server: {
    port: 5173,
  },
  build: {
    outDir: "dist",
  },
});
