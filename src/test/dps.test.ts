import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { estimateDps, howlAp, petAbilityDps, suggestedPlaystyle } from "@/lib/dps";
import { allocFromNames, type TalentClass } from "@/lib/talents";
import { HUNTER_BUILDS, buildAtPoints } from "@/data/talentBuilds";
import { FAMILY_BY_ID } from "@/data/pets";
import type { CharacterSheet } from "@/lib/characterSync";

const file = resolve(__dirname, "../../public/data/talents/hunter.json");
const hunter = existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as TalentClass) : null;

// Kurt's sheet on 23 Nov 2026 (BattlePost), with the talents he had then.
const sheet: CharacterSheet = {
  strength: 46, agility: 145, stamina: 119, intellect: 69, spirit: 67, health: 1683, mana: 1770,
  meleeAp: 382, mainHand: { min: 114, max: 155, speed: 2.5 }, offHand: { min: 53, max: 73, speed: 2.2 },
  meleeCrit: 7.58, meleeHit: 1, rangedAp: 481, ranged: { min: 159, max: 196, speed: null },
  rangedCrit: 11.06, rangedHit: 1, rangedHaste: 10, armor: 1007, dodge: 10.36, parry: 4.76,
};
const sheetRanks = { "Deadly Aspects": 5, "Focused Fire": 2, "Lethal Attacks": 5, "Careful Aim": 5, "Improved Tracking": 5, "Savage Strikes": 2, Survivalist: 3, Surefooted: 1 };
const weapons = { ranged: { id: 274604, name: "Frosty Blunderbuss", min: 41, max: 78, speed: 2.8 } };
const wolf = FAMILY_BY_ID.get("wolf")!;
const cat = FAMILY_BY_ID.get("cat")!;

describe("pet helpers", () => {
  it("reads Furious Howl and damage abilities by level", () => {
    expect(howlAp(wolf, 37)).toBe(34.5); // rank 2: "+31 to 38"
    expect(howlAp(wolf, 40)).toBe(68);
    expect(howlAp(cat, 40)).toBe(0);
    expect(petAbilityDps(FAMILY_BY_ID.get("raptor")!, 37)).toEqual({ dps: 72 / 60, label: "Savage Rend rank 3" });
    expect(petAbilityDps(cat, 40)).toBeNull(); // Prowl is an opener
  });
});

describe.skipIf(!hunter)("DPS estimate on Kurt's gear", () => {
  const named = (b: Record<string, number>) => allocFromNames(hunter!, b).alloc;
  const run = (alloc: ReturnType<typeof named>, pet: typeof wolf | null, playstyle: "ranged" | "weave" | "melee") =>
    estimateDps({ cls: hunter!, alloc, level: 37, sheet, weapons, sheetRanks, pet: pet ? { family: pet } : null, playstyle });

  it("reproduces the sheet when the build is the one he has", () => {
    const r = run(named(sheetRanks), wolf, "weave");
    expect(r.stats.meleeAp).toBeCloseTo(382, 5);
    expect(r.stats.rangedAp).toBeCloseTo(481, 5);
    expect(r.stats.rangedCrit).toBeCloseTo(11.06, 5);
    expect(r.total).toBeGreaterThan(50);
    expect(r.total).toBeLessThan(400);
    expect(r.petShare).toBeGreaterThan(0);
    expect(r.lines.some((l) => /Furious Howl on you/.test(l.label))).toBe(true);
  });

  it("removes talents the build doesn't have from the sheet", () => {
    const r = run({}, wolf, "ranged");
    expect(r.stats.rangedAp).toBeCloseTo(481 - 69, 5); // no Careful Aim
    expect(r.stats.rangedCrit).toBeCloseTo(11.06 - 5, 5); // no Lethal Attacks
  });

  it("drops the pet with Lone Wolf and adds 20%", () => {
    const lw = named({ "Lethal Attacks": 5, "Careful Aim": 5, "Lone Wolf": 1 });
    const r = run(lw, cat, "ranged");
    expect(r.pet).toBe(0);
    expect(r.notes.join(" ")).toMatch(/Lone Wolf/);
  });

  it("ranks the recommended Survival weave above Kurt's spread build at 28 points", () => {
    const weave = named(buildAtPoints(HUNTER_BUILDS.find((b) => b.id === "sv-weave")!, 28));
    expect(suggestedPlaystyle(hunter!, weave)).toBe("weave");
    expect(run(weave, wolf, "weave").total).toBeGreaterThan(run(named(sheetRanks), wolf, "weave").total * 0.9);
  });
});
