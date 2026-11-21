import { describe, expect, it } from "vitest";
import { allMilestones, nextMajor, upcoming } from "@/lib/guidance";
import type { Dungeon } from "@/lib/types";

const dungeon = (p: Partial<Dungeon>): Dungeon => ({
  id: "x", name: "X", minLevel: 20, maxLevel: 30, zone: "Z", entrance: "", access: null, isNew: false,
  status: "launch", betaLocked: false, bosses: ["A"], questCount: 0, lootCount: 0, url: "", ...p,
});

describe("guidance", () => {
  it("flags mail armour at 40 as the next big hunter milestone from level 37", () => {
    const next = nextMajor({ classId: "hunter", level: 37, faction: "horde" });
    expect(next?.level).toBe(40);
    expect(allMilestones({ classId: "hunter", level: 37, faction: "horde" }).some((m) => m.level === 40 && m.title === "Mail armour")).toBe(true);
  });

  it("shows plate at 40 for warriors and no hunter spells", () => {
    const all = allMilestones({ classId: "warrior", level: 30, faction: "alliance" });
    expect(all.some((m) => m.level === 40 && m.title === "Plate armour")).toBe(true);
    expect(all.some((m) => m.title.includes("Feign Death"))).toBe(false);
  });

  it("groups the next levels and adds trainer reminders on even levels without spells", () => {
    const groups = upcoming({ classId: "warrior", level: 40, faction: "horde" }, 4);
    expect(groups.map((g) => g.level)).toEqual([42, 44]);
    expect(groups[0].items[0].title).toMatch(/spell ranks/);
  });

  it("only includes dungeons the faction can enter and that have launched", () => {
    const all = allMilestones({
      classId: "hunter", level: 10, faction: "alliance",
      dungeons: [dungeon({ id: "rfc", name: "Ragefire", access: "horde" }), dungeon({ id: "dm", name: "Deadmines" }), dungeon({ id: "new", name: "Soon", status: "announced" })],
    });
    const names = all.filter((m) => m.kind === "dungeon").map((m) => m.title);
    expect(names).toEqual(["Deadmines opens up"]);
  });

  it("stops at level 60", () => {
    expect(upcoming({ classId: "hunter", level: 58, faction: "horde" }, 10).every((g) => g.level <= 60)).toBe(true);
    expect(nextMajor({ classId: "hunter", level: 60, faction: "horde" })).toBeNull();
  });
});
