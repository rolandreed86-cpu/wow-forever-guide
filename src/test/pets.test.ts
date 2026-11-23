import { describe, expect, it } from "vitest";
import { BEASTS, FAMILY_BY_ID, PET_FAMILIES } from "@/data/pets";
import {
  abilityRankAt, abilityStrength, bracketPicks, comingUp, rankPets, rankWithinFamily, scorePet, speedBonus, tameableAt,
} from "@/lib/pets";

const base = { level: 37, spec: "survival" as const, faction: "alliance" as const };

describe("pet data", () => {
  it("every beast belongs to a known family and has a sane level range", () => {
    for (const b of BEASTS) {
      expect(FAMILY_BY_ID.has(b.family), b.name).toBe(true);
      expect(b.minLevel).toBeLessThanOrEqual(b.maxLevel);
      expect(b.maxLevel).toBeLessThanOrEqual(60);
    }
  });
  it("every family has ranks in level order", () => {
    for (const f of PET_FAMILIES) {
      const lv = f.unique.ranks.map((r) => r.level);
      expect([...lv].sort((a, b) => a - b), f.name).toEqual(lv);
    }
  });
  it("names are unique", () => {
    expect(new Set(BEASTS.map((b) => b.name)).size).toBe(BEASTS.length);
  });
});

describe("pet ranking", () => {
  it("only offers beasts at or below your level", () => {
    expect(tameableAt(20).every((b) => b.minLevel <= 20)).toBe(true);
    expect(rankPets({ ...base, level: 20, context: "solo" }).some((p) => p.beast.name === "Broken Tooth")).toBe(false);
  });

  it("knows which rank of Furious Howl you have", () => {
    const wolf = FAMILY_BY_ID.get("wolf")!;
    expect(abilityRankAt(wolf, 37).rank?.rank).toBe(2);
    expect(abilityRankAt(wolf, 40).rank?.rank).toBe(3);
    expect(abilityStrength(FAMILY_BY_ID.get("gorilla")!, 29)).toBe(0);
  });

  it("picks a wolf for Survival in raids and dungeons from level 20", () => {
    for (const context of ["raid", "dungeon"] as const) {
      const picks = bracketPicks({ spec: "survival", context, faction: "alliance" });
      for (const p of picks.filter((x) => x.bracket.from >= 20)) expect(p.best?.family.id, `${context} ${p.bracket.label}`).toBe("wolf");
    }
  });

  it("counts the howl as a buff to a Survival hunter but not a Marksmanship one", () => {
    const wolf = BEASTS.find((b) => b.name === "Mist Howler")!;
    const sv = scorePet(wolf, { ...base, context: "solo" })!;
    const mm = scorePet(wolf, { ...base, spec: "marksmanship", context: "solo" })!;
    expect(sv.score).toBeGreaterThan(mm.score);
    expect(sv.reasons.some((r) => r.includes("your own melee"))).toBe(true);
  });

  it("rates Broken Tooth's 1.0 sec swing above other cats at 37", () => {
    const cats = rankWithinFamily("cat", { ...base, context: "solo" });
    expect(cats[0].beast.name).toBe("Broken Tooth");
    expect(speedBonus(1.0)).toBe(8);
    expect(speedBonus(2.0)).toBe(0);
  });

  it("ranks damage families first for Beast Mastery solo at 37", () => {
    const top = rankPets({ ...base, spec: "beast-mastery", context: "solo" })[0];
    expect(["cat", "raptor"]).toContain(top.family.id);
  });

  it("warns about Horde zones for an Alliance hunter and about pets that lag behind", () => {
    const worg = scorePet(BEASTS.find((b) => b.name === "Worg")!, { ...base, context: "solo" })!;
    expect(worg.warnings.some((w) => w.includes("Horde territory"))).toBe(true);
    expect(worg.warnings.some((w) => w.includes("levels behind"))).toBe(true);
  });

  it("points a level 37 Survival hunter at Barnabus for raids", () => {
    const soon = comingUp({ ...base, context: "raid" });
    expect(soon?.beast.name).toBe("Barnabus");
  });

  it("recommends PvP control pets", () => {
    const top = rankPets({ ...base, context: "pvp" })[0];
    expect(["spider", "crocolisk", "bird-of-prey", "bat"]).toContain(top.family.id);
  });
});
