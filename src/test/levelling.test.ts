import { describe, expect, it } from "vitest";
import { CLASSES } from "@/data/classes";
import { buildRouteIndex, parseQuestSource, reachable, routeText } from "@/lib/acquire";
import { dungeonsWorthRunning, levellingBis, upgradePath } from "@/lib/gear";
import type { KbItem } from "@/lib/kb";
import type { DungeonDetail, Quest } from "@/lib/types";

const item = (p: Partial<KbItem>): KbItem => ({
  id: 1, name: "Item", quality: "uncommon", itemLevel: 30, req: 25, itemClass: "Armor", subclass: "Leather", slot: "Chest",
  classMask: -1, bind: "", unique: false, speed: null, minDmg: null, maxDmg: null, dps: null, armor: 100, stats: { agility: 10 },
  effects: null, set: null, description: null, sellPrice: null, source: null, sourceTypes: [], startsQuest: null, rep: null, ...p,
});

const dungeon = (id: string, name: string, min: number, max: number, loot: [number, string][]): DungeonDetail => ({
  id, name, minLevel: min, maxLevel: max, zone: "", entrance: "", access: "both", isNew: false, status: "launch", betaLocked: false,
  bosses: [], questCount: 0, lootCount: loot.length, url: "", quests: [], notes: null,
  loot: loot.map(([itemId, source]) => ({ itemId, name: "", slot: "", quality: "rare", source })),
} as unknown as DungeonDetail);

const quest = (name: string, level: number, faction: Quest["faction"], ids: number[]): Quest => ({
  questId: level, type: "normal", name, level, minLevel: level - 5, faction, classes: null, xp: null, xpEstimated: false,
  dungeon: null, zone: "Desolace", giver: null, location: null, objective: null, rewards: { items: ids.map((id) => ({ id, name: "" })), choice: true },
  prerequisites: null, confidence: "", verified: null, wowhead: "", url: "",
});

const details = {
  sm: dungeon("sm-graveyard", "Scarlet Monastery: Graveyard", 26, 36, [[10, "Ironspine"], [11, "Trash mobs"]]),
  ul: dungeon("uldaman", "Uldaman", 41, 51, [[12, "Archaedas"]]),
};
const quests = [quest("Khan Hratha", 34, "both", [20]), quest("Horde Only", 30, "horde", [21])];
const index = buildRouteIndex(details, quests);

const items = [
  item({ id: 10, name: "Boss Helm", slot: "Head", req: 30, stats: { agility: 12 } }),
  item({ id: 11, name: "Trash Helm", slot: "Head", req: 30, stats: { agility: 30 } }),
  item({ id: 12, name: "Uldaman Helm", slot: "Head", req: 40, subclass: "Mail", stats: { agility: 25 } }),
  item({ id: 20, name: "Quest Helm", slot: "Head", req: 33, stats: { agility: 18 } }),
  item({ id: 21, name: "Horde Helm", slot: "Head", req: 28, stats: { agility: 40 } }),
  item({ id: 30, name: "Crafted Helm", slot: "Head", req: 25, stats: { agility: 50 }, source: "Crafted: Leatherworking 180", sourceTypes: ["crafted"] }),
  item({ id: 31, name: "Rep Helm", slot: "Head", req: 25, stats: { agility: 60 }, rep: "Timbermaw Hold - Honored", sourceTypes: ["vendor"] }),
  item({ id: 32, name: "Old Quest Gloves", slot: "Hands", req: 20, source: "Quest: The Boar Hunter (lvl 22, Wetlands, Alliance; from X)", sourceTypes: ["quest"] }),
];
const hunter = CLASSES.hunter;

describe("routes", () => {
  it("knows dungeon bosses, trash, quests, crafting and reputation", () => {
    const kind = (id: number) => index.get(items.find((i) => i.id === id)!);
    expect(kind(10)).toMatchObject({ kind: "dungeon", dungeon: "Scarlet Monastery: Graveyard", trash: false });
    expect(kind(11)).toMatchObject({ kind: "dungeon", trash: true });
    expect(kind(20)).toMatchObject({ kind: "quest", quest: "Khan Hratha", level: 34 });
    expect(kind(30).kind).toBe("crafted");
    expect(kind(31).kind).toBe("reputation");
    expect(kind(32)).toMatchObject({ kind: "quest", level: 22, faction: "alliance", zone: "Wetlands" });
  });

  it("parses quest sources from the item database", () => {
    expect(parseQuestSource("Quest: Bounty on Garrick Padfoot (lvl 5, Northshire Valley, Alliance; from Deputy Willem)"))
      .toEqual({ quest: "Bounty on Garrick Padfoot", level: 5, zone: "Northshire Valley", faction: "alliance" });
  });

  it("only counts quests up to two levels above you, and the other faction's never", () => {
    const q = index.get(items[3]);
    expect(reachable(q, 31)).toBe(false);
    expect(reachable(q, 32)).toBe(true);
    expect(reachable(index.get(items[4]), 40, "alliance")).toBe(false);
    expect(routeText(index.get(items[1]))).toContain("Random trash drop");
  });
});

describe("levelling best in slot", () => {
  it("picks quest and dungeon gear and skips crafted, reputation and trash by default", () => {
    const bis = levellingBis(items, hunter, 33, index, { faction: "alliance" });
    const head = bis.slots.find((s) => s.slot === "Head")!.picks.map((p) => p.item.name);
    expect(head).toEqual(["Quest Helm", "Boss Helm"]);
  });

  it("adds other routes when asked", () => {
    const bis = levellingBis(items, hunter, 33, index, { faction: "alliance", routes: ["quest", "dungeon", "reputation"], includeTrash: true });
    expect(bis.slots.find((s) => s.slot === "Head")!.picks[0].item.name).toBe("Rep Helm");
  });

  it("ranks dungeons by how many picks they give", () => {
    const bis = levellingBis(items, hunter, 30, index, { faction: "alliance" });
    expect(dungeonsWorthRunning(bis)[0]).toMatchObject({ dungeon: "Scarlet Monastery: Graveyard", minLevel: 26 });
  });

  it("lists the levels where the best piece changes", () => {
    const path = upgradePath(items, hunter, 30, 41, index, { faction: "alliance" });
    expect(path.filter((u) => u.slot === "Head").map((u) => [u.level, u.pick.item.name, u.replaces?.item.name])).toEqual([
      [33, "Quest Helm", "Boss Helm"],
      [40, "Uldaman Helm", "Quest Helm"],
    ]);
  });
});
