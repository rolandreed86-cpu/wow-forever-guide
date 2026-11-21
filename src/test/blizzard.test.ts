import { describe, expect, it } from "vitest";
import {
  appendHistory, characterSlug, describeChanges, normalizeCharacter, parseProfessions, parseTalents,
  type SyncedCharacter,
} from "@/lib/blizzard";
import { applySync, DEFAULT_CHARACTER } from "@/lib/character";

const raw = {
  summary: {
    name: "Thrall-Doomhammer", level: 38, faction: { type: "HORDE", name: "Horde" },
    character_class: { id: 3, name: "Hunter" }, race: { name: "Orc" }, guild: { name: "Wayfarers" },
    equipped_item_level: 31, last_login_timestamp: 1795000000000,
  },
  professions: {
    primaries: [
      { profession: { name: "Engineering" }, skill_points: 182, max_skill_points: 225 },
      { profession: { name: "Mining" }, tiers: [{ skill_points: 190, max_skill_points: 225 }] },
    ],
    secondaries: [{ profession: { name: "First Aid" }, skill_points: 150, max_skill_points: 225 }],
  },
  equipment: {
    equipped_items: [
      { slot: { type: "CHEST", name: "Chest" }, item: { id: 6473 }, name: "Armor of the Fang", quality: { type: "RARE" } },
      { slot: { type: "SHIRT", name: "Shirt" }, item: { id: 0 }, name: "Nothing" },
    ],
  },
  specializations: {
    specialization_groups: [
      { is_active: false, specializations: [{ specialization_name: "Survival", spent_points: 29 }] },
      { is_active: true, specializations: [
        { specialization_name: "Beast Mastery", spent_points: 21 },
        { specialization_name: "Marksmanship", talents: [{ talent_rank: 5 }, { talent_rank: 3 }] },
        { specialization_name: "Survival", spent_points: 0 },
      ] },
    ],
  },
};

describe("Blizzard profile parsing", () => {
  const c = normalizeCharacter(raw, "eu", new Date("2026-11-21T08:00:00Z"));

  it("reads the summary", () => {
    expect(c).toMatchObject({ name: "Thrall-Doomhammer", level: 38, classId: "hunter", faction: "horde", race: "Orc", region: "EU", guild: "Wayfarers", itemLevel: 31 });
    expect(c.lastLogout).toMatch(/^2026-/);
  });

  it("reads flat and tiered professions, secondary ones included", () => {
    expect(c.professions).toEqual({ Engineering: 182, Mining: 190, "First Aid": 150 });
    expect(c.professionMax.Mining).toBe(225);
    expect(parseProfessions(undefined).professions).toEqual({});
  });

  it("uses the active talent group and counts ranks when no total is given", () => {
    expect(c.talents).toEqual({ "Beast Mastery": 21, Marksmanship: 8, Survival: 0 });
    expect(parseTalents({})).toEqual({});
  });

  it("drops empty equipment slots and lower-cases quality", () => {
    expect(c.equipment).toEqual([{ slot: "Chest", id: 6473, name: "Armor of the Fang", quality: "rare" }]);
  });

  it("makes slugs Blizzard accepts", () => {
    expect(characterSlug(" Thrall-Doomhammer ")).toBe("thrall-doomhammer");
  });
});

describe("history and change notes", () => {
  const base: SyncedCharacter = normalizeCharacter(raw, "eu", new Date("2026-11-20T08:00:00Z"));
  const later: SyncedCharacter = { ...base, level: 40, professions: { ...base.professions, Mining: 205 }, syncedAt: "2026-11-21T08:00:00.000Z" };

  it("adds a point only when something moved, one per day", () => {
    const h1 = appendHistory([], base);
    expect(h1).toHaveLength(1);
    expect(appendHistory(h1, { ...base, syncedAt: "2026-11-21T08:00:00.000Z" })).toBe(h1);
    const h2 = appendHistory(h1, later);
    expect(h2.map((p) => p.level)).toEqual([38, 40]);
    expect(appendHistory(h2, { ...later, level: 41 }).map((p) => p.level)).toEqual([38, 41]);
  });

  it("describes level, profession and gear changes", () => {
    const after = { ...later, equipment: [...later.equipment, { slot: "Legs", id: 10410, name: "Leggings of the Fang", quality: "rare" }] };
    expect(describeChanges(base, after)).toEqual(["Level 38 → 40", "Mining 190 → 205", "New legs: Leggings of the Fang"]);
    expect(describeChanges(null, base)[0]).toContain("First sync");
  });
});

describe("applying a sync to the app's character", () => {
  const synced = normalizeCharacter(raw, "eu", new Date("2026-11-21T08:00:00Z"));

  it("takes level, class, faction and professions from a new sync", () => {
    const c = applySync({ ...DEFAULT_CHARACTER, classId: "mage", level: 12 }, synced);
    expect(c).toMatchObject({ classId: "hunter", level: 38, faction: "horde", syncedAt: synced.syncedAt });
    expect(c.professions.Engineering).toBe(182);
  });

  it("keeps manual edits made after that sync", () => {
    const edited = { ...applySync(DEFAULT_CHARACTER, synced), level: 45 };
    expect(applySync(edited, synced).level).toBe(45);
  });

  it("does nothing without a sync", () => {
    expect(applySync(DEFAULT_CHARACTER, null)).toBe(DEFAULT_CHARACTER);
  });
});
