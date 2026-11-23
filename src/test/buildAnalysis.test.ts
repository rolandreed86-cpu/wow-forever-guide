import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { analyzeBuild, overlap } from "@/lib/buildAnalysis";
import { allocFromNames, type TalentClass } from "@/lib/talents";
import { HUNTER_BUILDS, TALENT_NOTES, buildAtPoints } from "@/data/talentBuilds";

const file = resolve(__dirname, "../../public/data/talents/hunter.json");
const hunter = existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as TalentClass) : null;
const notes = TALENT_NOTES.hunter;
const named = (byName: Record<string, number>) => allocFromNames(hunter!, byName).alloc;
const rec = (id: string, pts: number) => named(buildAtPoints(HUNTER_BUILDS.find((b) => b.id === id)!, pts));

describe.skipIf(!hunter)("build analysis against the Forever hunter trees", () => {
  it("recognises a recommended build and has nothing to fix", () => {
    const a = analyzeBuild(hunter!, rec("sv-weave", 51), 51, HUNTER_BUILDS, notes);
    expect(a.closest?.build.id).toBe("sv-weave");
    expect(a.closest?.match).toBe(1);
    expect(a.capstones).toEqual(["Lacerating Strikes"]);
    expect(a.suggestions.filter((s) => s.kind === "warn" || s.kind === "improve")).toEqual([]);
    expect(a.suggestions.some((s) => s.kind === "good")).toBe(true);
  });

  it("flags unspent points and says where they would go", () => {
    const a = analyzeBuild(hunter!, rec("bm", 20), 28, HUNTER_BUILDS, notes);
    const s = a.suggestions.find((x) => x.text.startsWith("You have 8 points left"));
    expect(s?.text).toMatch(/Beast Mastery would put them into/);
  });

  it("warns about a build spread over all three trees and suggests swaps", () => {
    const spread = named({ "Deadly Aspects": 5, "Focused Fire": 2, "Lethal Attacks": 5, "Careful Aim": 5, "Improved Tracking": 5, "Deflection": 3 });
    const a = analyzeBuild(hunter!, spread, 25, HUNTER_BUILDS, notes);
    expect(a.split).toEqual([7, 10, 8]);
    expect(a.suggestions[0].kind).toBe("warn");
    expect(a.suggestions.some((s) => /spread over all three trees/.test(s.text))).toBe(true);
    expect(a.suggestions.some((s) => /^To match .*take points out of .*Deflection −3/.test(s.text))).toBe(true);
  });

  it("warns when Lone Wolf is paired with pet talents", () => {
    const a = analyzeBuild(hunter!, named({ "Focused Fire": 2, "Lethal Attacks": 5, "Careful Aim": 5, "Lone Wolf": 1 }), 13, HUNTER_BUILDS, notes);
    expect(a.suggestions.some((s) => s.kind === "warn" && /Lone Wolf/.test(s.text))).toBe(true);
  });

  it("measures overlap as a share of points", () => {
    expect(overlap(hunter!, rec("sv-weave", 28), rec("sv-melee", 28))).toBeGreaterThan(0.8);
    expect(overlap(hunter!, rec("bm", 28), rec("sv-weave", 28))).toBe(0);
  });
});
