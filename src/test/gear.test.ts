import { describe, expect, it } from "vitest";
import { CLASSES } from "@/data/classes";
import { bestInSlot, canUse, classifySource, craftInfo, scoreItem } from "@/lib/gear";
import type { KbItem } from "@/lib/kb";

const item = (p: Partial<KbItem>): KbItem => ({
  id: 1, name: "Item", quality: "uncommon", itemLevel: 30, req: 25, itemClass: "Armor", subclass: "Leather", slot: "Chest",
  classMask: -1, bind: "", unique: false, speed: null, minDmg: null, maxDmg: null, dps: null, armor: 100, stats: {},
  effects: null, set: null, description: null, sellPrice: null, source: "Drop: Boss (lvl 30 elite, Dungeon, 20%)",
  sourceTypes: ["drop"], startsQuest: null, rep: null, ...p,
});
const hunter = CLASSES.hunter;

describe("canUse", () => {
  it("hunters wear mail only from 40", () => {
    const mail = item({ subclass: "Mail", req: 37 });
    expect(canUse(mail, hunter, 39)).toBe(false);
    expect(canUse(mail, hunter, 40)).toBe(true);
  });
  it("respects required level, class masks and weapon types", () => {
    expect(canUse(item({ req: 30 }), hunter, 29)).toBe(false);
    expect(canUse(item({ classMask: 8 }), hunter, 60)).toBe(false); // rogue only
    expect(canUse(item({ itemClass: "Weapon", subclass: "Bow", slot: "Ranged" }), hunter, 60)).toBe(true);
    expect(canUse(item({ itemClass: "Weapon", subclass: "Wand", slot: "Ranged" }), hunter, 60)).toBe(false);
    expect(canUse(item({ itemClass: "Weapon", subclass: "Polearm", slot: "Two-Hand", req: 10 }), hunter, 19)).toBe(false);
    expect(canUse(item({ subclass: "Plate" }), hunter, 60)).toBe(false);
  });
});

describe("sources", () => {
  it("classifies boss drops, world drops, crafts and raids", () => {
    expect(classifySource("Drop: Herod (lvl 40 elite, Scarlet Monastery, 25%)", ["drop"])).toBe("boss");
    expect(classifySource("Drop: Some Rare (lvl 37 rare, Badlands, 1.05%) | World drop: 480 other creatures", ["drop"])).toBe("world");
    expect(classifySource("Crafted: Engineering 175 (learned from recipe)", ["crafted"])).toBe("crafted");
    expect(classifySource("Drop: Ragnaros (lvl 63 boss, Molten Core, 15%)", ["drop"])).toBe("raid");
    expect(craftInfo("Crafted: Engineering 175 (learned from recipe)")).toEqual({ profession: "Engineering", skill: 175 });
  });
});

describe("bestInSlot", () => {
  it("prefers agility for hunters and picks a bow by dps", () => {
    const agi = item({ id: 2, name: "Agi Chest", stats: { agility: 10 } });
    const int = item({ id: 3, name: "Int Chest", stats: { intellect: 10 } });
    const bowA = item({ id: 4, name: "Slow Bow", itemClass: "Weapon", subclass: "Bow", slot: "Ranged", dps: 10 });
    const bowB = item({ id: 5, name: "Fast Bow", itemClass: "Weapon", subclass: "Bow", slot: "Ranged", dps: 14 });
    expect(scoreItem(agi, hunter)).toBeGreaterThan(scoreItem(int, hunter));
    const bis = bestInSlot([agi, int, bowA, bowB], hunter, 30);
    expect(bis.slots.find((s) => s.slot === "Chest")!.picks[0].item.name).toBe("Agi Chest");
    expect(bis.slots.find((s) => s.slot === "Ranged")!.picks[0].item.name).toBe("Fast Bow");
  });
  it("hides rare world drops and raid loot unless asked", () => {
    const world = item({ id: 6, stats: { agility: 50 }, source: "Drop: Rare (lvl 30 rare, Zone, 1%)" });
    const ok = item({ id: 7, stats: { agility: 5 } });
    expect(bestInSlot([world, ok], hunter, 30).slots.find((s) => s.slot === "Chest")!.picks[0].item.id).toBe(7);
    expect(bestInSlot([world, ok], hunter, 30, { includeWorldDrops: true }).slots.find((s) => s.slot === "Chest")!.picks[0].item.id).toBe(6);
  });
});

import { factionOk } from "@/lib/gear";
describe("factionOk", () => {
  it("hides the other faction's quest rewards", () => {
    expect(factionOk("Quest: The Defias Brotherhood (lvl 22, The Deadmines, Alliance)", "horde")).toBe(false);
    expect(factionOk("Quest: Rig Wars (lvl 35, Gnomeregan, Horde)", "horde")).toBe(true);
    expect(factionOk("Quest: Monkey Business (lvl 30, Razorfen Kraul, Both)", "alliance")).toBe(true);
    expect(factionOk("Drop: Herod (lvl 40 elite, Scarlet Monastery, 25%)", "horde")).toBe(true);
  });
});
