import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// The app does not send mail. It was asked for twice, removed from Enterprise,
// and left behind in Business -- where "Email activity report" sat in
// Settings -> Device long after the decision. This fails the build rather
// than waiting for someone to spot it in a screenshot again.
//
// The shop's own support contact is a different thing and stays: a mailto to
// the developer is how a shopkeeper reaches a human.
const SUPPORT_CONTACT = /mailto:seun85148@gmail\.com/;

function sourceFiles(dir, found = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, found);
    else if (/\.(jsx?|tsx?)$/.test(entry) && !/\.test\./.test(entry)) found.push(full);
  }
  return found;
}

describe("the app never sends mail on the shop's behalf", () => {
  // vitest runs from the project root, so walk src/ from there rather than
  // resolving against import.meta.url, which it rewrites.
  const files = sourceFiles(join(process.cwd(), "src"));

  it("has no mailto link other than the developer's support address", () => {
    const offenders = files.filter((f) => {
      const src = readFileSync(f, "utf8");
      return /mailto:/.test(src) && !SUPPORT_CONTACT.test(src);
    });
    expect(offenders).toEqual([]);
  });

  it("has no activity-report-by-email feature left anywhere", () => {
    const offenders = files.filter((f) =>
      /Email activity report|sendActivityEmail|notificationEmail/.test(readFileSync(f, "utf8"))
    );
    expect(offenders).toEqual([]);
  });
});
