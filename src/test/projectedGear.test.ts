import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_ANCHOR, baseStats, projectSheet, wornGear } from "@/lib/projectedGear";
import { levellingBis, type BisResult } from "@/lib/gear";
import { buildRouteIndex } from "@/lib/acquire";
import { parseKb } from "@/lib/kb";
import { CLASSES } from "@/data/classes";
import { estimateDps } from "@/lib/dps";
import { allocFromNames, type TalentClass } from "@/lib/talents";
import { HUNTER_BUILDS, buildAtPoints } from "@/data/talentBuilds";
import { FAMILY_BY_ID } from "@/data/pets";
import type { KbItem } from "@/lib/kb";

const item = (id: number, slot: string, stats: KbItem["stats"], weapon?: [number, number, number]): KbItem => ({
  id, name: `Item ${id}`, quality: "rare", itemLevel: 40, req: 37, itemClass: weapon ? "Weapon" : "Armor", subclass: "", slot, classMask: 0,
  bind: "", unique: false, speed: weapon?.[2] ?? null, minDmg: weapon?.[0] ?? null, maxDmg: weapon?.[1] ?? null, dps: null, armor: null,
  stats, effects: null, set: null, description: null, sellPrice: null, source: null, sourceTypes: [],
} as unknown as KbItem);
const pick = (it: KbItem) => ({ item: it, score: 1, source: "quest" }) as BisResult["slots"][number]["picks"][number];

describe("projected gear", () => {
  it("grows base stats through level 1 and the anchor", () => {
    expect(baseStats(1)).toEqual({ strength: 20, agility: 23, stamina: 21, intellect: 20, spirit: 21 });
    expect(baseStats(DEFAULT_ANCHOR.level)).toEqual(DEFAULT_ANCHOR.base);
    expect(baseStats(60).agility).toBeGreaterThan(DEFAULT_ANCHOR.base.agility);
  });

  it("wears two rings, one head and the weapon picks", () => {
    const bis: BisResult = {
      slots: [
        { slot: "Head", picks: [pick(item(1, "Head", { agility: 10 })), pick(item(2, "Head", { agility: 8 }))] },
        { slot: "Finger", picks: [pick(item(3, "Finger", { agility: 5 })), pick(item(4, "Finger", { attack_power: 20 })), pick(item(5, "Finger", {}))] },
        { slot: "Ranged", picks: [pick(item(6, "Ranged", {}, [40, 80, 3]))] },
      ],
      weapons: { label: "Two-handed", picks: [pick(item(7, "Two-hand", { strength: 10 }, [100, 150, 3.5]))], total: 0 },
      altWeapons: null,
    };
    expect(wornGear(bis).map((g) => g.item.id)).toEqual([1, 3, 4, 6, 7]);
    const p = projectSheet(bis, 37);
    const b = DEFAULT_ANCHOR.base;
    expect(p.sheet.agility).toBe(b.agility + 15);
    expect(p.sheet.meleeAp).toBe(2 * 37 + (b.strength + 10) + (b.agility + 15) - 20 + 20 + 50);
    expect(p.sheet.rangedAp).toBe(2 * 37 + 2 * (b.agility + 15) - 10 + 20 + 50);
    expect(p.weapons.mainHand?.speed).toBe(3.5);
    expect(p.sheet.offHand).toBeNull();
    expect(p.sheet.rangedHaste).toBe(10);
    expect(p.sheet.ranged!.min).toBeCloseTo(40 + 0.2 * 37 * 3 + (p.sheet.rangedAp / 14) * 3);
  });
});

const root = resolve(__dirname, "../../public");
const files = ["data/items.json", "data/fc/dungeon-details.json", "data/fc/quests.json", "data/talents/hunter.json"].map((f) => resolve(root, f));
describe.skipIf(!files.every(existsSync))("projected DPS on the real best-in-slot data", () => {
  const read = (i: number) => JSON.parse(readFileSync(files[i], "utf8"));
  const sv = HUNTER_BUILDS.find((b) => b.id === "sv-weave")!;
  const dpsAt = (level: number, kb: ReturnType<typeof parseKb>, index: ReturnType<typeof buildRouteIndex>, hunter: TalentClass) => {
    const bis = levellingBis(kb.items, CLASSES.hunter, level, index, { faction: "alliance" });
    const p = projectSheet(bis, level);
    const alloc = allocFromNames(hunter, buildAtPoints(sv, level - 9)).alloc;
    return estimateDps({ cls: hunter, alloc, level, sheet: p.sheet, weapons: p.weapons, sheetRanks: {}, pet: { family: FAMILY_BY_ID.get("wolf")! }, playstyle: "weave" }).total;
  };

  it("climbs with level from 20 to 60", () => {
    // Files are read here, not at collection time, so the suite skips cleanly where the data isn't checked in.
    const kb = parseKb(read(0));
    const index = buildRouteIndex(read(1), read(2));
    const hunter = read(3) as TalentClass;
    const d = [20, 30, 37, 40, 50, 60].map((l) => dpsAt(l, kb, index, hunter));
    if (process.env.SHOW) console.log(d.map(Math.round));
    for (let i = 1; i < d.length; i++) expect(d[i]).toBeGreaterThan(d[i - 1]);
    expect(d[5]).toBeLessThan(1000);
  });
});
