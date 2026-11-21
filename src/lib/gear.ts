import type { ClassInfo, StatKey } from "@/data/classes";
import type { KbItem } from "./kb";
import { FAST_ROUTES, reachable, type Route, type RouteIndex, type RouteKind } from "./acquire";

export type SourceKind = "boss" | "quest" | "crafted" | "vendor" | "world" | "raid" | "other";

/** Classic raids that are not in WoW Forever yet, plus Forever's first raids (closed until 9 Dec 2026). */
const RAID_NAMES = [
  "Molten Core", "Blackwing Lair", "Zul'Gurub", "Ruins of Ahn'Qiraj", "Temple of Ahn'Qiraj", "Ahn'Qiraj",
  "Naxxramas", "Onyxia's Lair", "Barrow Deeps", "Hyjal Summit",
];

export function classifySource(src: string | null, types: string[]): SourceKind {
  if (!src) return "other";
  if (RAID_NAMES.some((r) => src.includes(r))) return "raid";
  if (types.includes("crafted")) return "crafted";
  if (types.includes("quest")) return "quest";
  if (types.includes("vendor")) return "vendor";
  if (types.includes("drop")) {
    // "Drop: Herod (lvl 40 elite, Scarlet Monastery, 25%)": a named source with a decent chance is farmable.
    const named = src.split("|")[0];
    const best = Math.max(0, ...[...named.matchAll(/(\d+(?:\.\d+)?)%/g)].map((m) => parseFloat(m[1])));
    if (/elite/.test(named) && best >= 4) return "boss";
    if (best >= 8) return "boss";
    return "world";
  }
  return "other";
}

export const SOURCE_LABEL: Record<SourceKind, string> = {
  boss: "Dungeon or boss drop", quest: "Quest reward", crafted: "Crafted", vendor: "Vendor",
  world: "Rare world drop", raid: "Raid (not open yet)", other: "Other",
};

/** Paper-doll groups used by the gear planner. */
export const GEAR_SLOTS = [
  "Head", "Neck", "Shoulder", "Back", "Chest", "Wrist", "Hands", "Waist", "Legs", "Feet",
  "Finger", "Trinket", "Ranged",
] as const;

const JEWELRY = new Set(["Neck", "Finger", "Trinket", "Back"]);
const CASTER_OFFHAND = new Set(["priest", "mage", "warlock", "druid", "shaman", "paladin"]);
/** Weapon skills that need training at a level. */
const WEAPON_SKILL_LEVEL: Partial<Record<string, Record<string, number>>> = { hunter: { Polearm: 20 } };

export interface GearOptions {
  includeWorldDrops?: boolean;
  includeRaid?: boolean;
  includeCrafted?: boolean;
  minQuality?: number;
  /** Hide quest rewards and drops that the source text marks as the other faction's. */
  faction?: "alliance" | "horde";
}

/** True unless the source only mentions the other faction. */
export function factionOk(src: string | null, faction?: "alliance" | "horde"): boolean {
  if (!src || !faction) return true;
  const own = faction === "horde" ? "Horde" : "Alliance";
  const other = faction === "horde" ? "Alliance" : "Horde";
  return !new RegExp(`\\b${other}\\b`).test(src) || new RegExp(`\\b(${own}|Both)\\b`).test(src);
}

const QUALITY_RANK: Record<string, number> = { poor: 0, common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5, artifact: 6, heirloom: 7 };

export function canUse(item: KbItem, cls: ClassInfo, level: number): boolean {
  if (item.itemClass !== "Armor" && item.itemClass !== "Weapon") return false;
  if (item.req > level) return false;
  if (item.classMask > 0 && (item.classMask & cls.maskBit) === 0) return false;
  if (item.quality === "artifact" || item.quality === "heirloom") return false;

  if (item.itemClass === "Armor") {
    if (item.slot === "Shirt" || item.slot === "Tabard" || item.subclass === "Cosmetic") return false;
    if (item.slot === "Relic") return false;
    if (item.slot === "Held In Off-hand") return CASTER_OFFHAND.has(cls.id);
    if (item.slot === "Shield") return cls.armor.Shield !== undefined && level >= cls.armor.Shield;
    if (JEWELRY.has(item.slot) || item.subclass === "Miscellaneous") return true;
    const unlock = cls.armor[item.subclass];
    return unlock !== undefined && level >= unlock;
  }

  // Weapons
  if (item.slot === "Ranged" || item.slot === "Thrown") return cls.ranged.includes(item.subclass);
  if (!cls.weapons.includes(item.subclass)) return false;
  const skillLevel = WEAPON_SKILL_LEVEL[cls.id]?.[item.subclass];
  if (skillLevel && level < skillLevel) return false;
  if (item.slot === "Off Hand") return cls.canDualWield !== null && level >= cls.canDualWield;
  return true;
}

export function scoreItem(item: KbItem, cls: ClassInfo): number {
  let score = 0;
  for (const [k, v] of Object.entries(item.stats)) score += (cls.weights[k as StatKey] ?? 0) * (v ?? 0);
  if (item.itemClass === "Weapon" && item.dps) {
    const isRanged = item.slot === "Ranged" || item.slot === "Thrown";
    if (cls.id === "hunter") score += item.dps * (isRanged ? 7 : 0.6);
    else if (["warrior", "rogue", "paladin", "shaman", "druid"].includes(cls.id)) score += item.dps * (isRanged ? 0.5 : 6);
    else score += item.dps * 0.2;
  }
  // A little credit for armour and item level breaks ties between otherwise equal pieces.
  score += (item.armor ?? 0) * 0.01 + item.itemLevel * 0.05;
  return Math.round(score * 10) / 10;
}

export interface Pick {
  item: KbItem;
  score: number;
  source: SourceKind;
  /** Where to get it, when a route index was used. */
  route?: Route;
}

export interface BisResult {
  slots: { slot: string; picks: Pick[] }[];
  weapons: { label: string; picks: Pick[]; total: number };
  altWeapons: { label: string; picks: Pick[]; total: number } | null;
}

function allowed(p: Pick, o: GearOptions): boolean {
  if (p.source === "world" && !o.includeWorldDrops) return false;
  if (p.source === "raid" && !o.includeRaid) return false;
  if (p.source === "crafted" && o.includeCrafted === false) return false;
  if (p.source === "other") return false;
  if (!factionOk(p.item.source, o.faction)) return false;
  if ((QUALITY_RANK[p.item.quality] ?? 0) < (o.minQuality ?? 2)) return false;
  return true;
}

export function candidates(items: KbItem[], cls: ClassInfo, level: number, o: GearOptions = {}): Pick[] {
  const out: Pick[] = [];
  for (const item of items) {
    if (!canUse(item, cls, level)) continue;
    const p: Pick = { item, score: scoreItem(item, cls), source: classifySource(item.source, item.sourceTypes) };
    if (allowed(p, o)) out.push(p);
  }
  return out.sort((a, b) => b.score - a.score);
}

/** Best items for each slot at a given level, with runner-ups. */
export function bestInSlot(items: KbItem[], cls: ClassInfo, level: number, o: GearOptions = {}, depth = 3): BisResult {
  return bisFromPool(candidates(items, cls, level, o), cls, level, depth);
}

/** Group a ranked pool of candidates into slots and the better weapon set. */
export function bisFromPool(pool: Pick[], cls: ClassInfo, level: number, depth = 3): BisResult {
  const bySlot = (slots: string[]) => pool.filter((p) => slots.includes(p.item.slot));

  const slots = GEAR_SLOTS.filter((s) => s !== "Ranged" || cls.ranged.length > 0).map((slot) => {
    const want = slot === "Chest" ? ["Chest"] : slot === "Ranged" ? ["Ranged", "Thrown"] : [slot];
    const n = slot === "Finger" || slot === "Trinket" ? depth + 1 : depth;
    return { slot, picks: bySlot(want).slice(0, n) };
  });

  const twoHand = bySlot(["Two-Hand"]);
  const mainHand = bySlot(["One-Hand", "Main Hand"]);
  const dual = cls.canDualWield !== null && level >= cls.canDualWield;
  const offPool = dual ? bySlot(["One-Hand", "Off Hand"]) : bySlot(["Shield", "Held In Off-hand"]);
  const mh = mainHand[0];
  const oh = offPool.find((p) => p.item.id !== mh?.item.id);
  const thTotal = twoHand[0]?.score ?? 0;
  const pairTotal = (mh?.score ?? 0) + (oh?.score ?? 0);

  const thSet = { label: "Two-handed", picks: twoHand.slice(0, depth), total: thTotal };
  const pairSet = {
    label: dual ? "Dual wield" : "One-hand and off-hand",
    picks: [mh, oh].filter(Boolean) as Pick[],
    total: pairTotal,
  };
  const [weapons, altWeapons] = thTotal >= pairTotal ? [thSet, pairSet] : [pairSet, thSet];
  return { slots, weapons, altWeapons: altWeapons.picks.length ? altWeapons : null };
}

export interface PlanOptions {
  /** Which routes count. Defaults to quests and dungeons, the fast ones while levelling. */
  routes?: RouteKind[];
  faction?: "alliance" | "horde";
  minQuality?: number;
  /** Count random drops from dungeon trash mobs too. */
  includeTrash?: boolean;
}

/** Usable items you can reach at this level by the chosen routes, best first. */
export function planCandidates(items: KbItem[], cls: ClassInfo, level: number, index: RouteIndex, o: PlanOptions = {}): Pick[] {
  const routes = o.routes ?? FAST_ROUTES;
  const out: Pick[] = [];
  for (const item of items) {
    if ((QUALITY_RANK[item.quality] ?? 0) < (o.minQuality ?? 2)) continue;
    if (!canUse(item, cls, level)) continue;
    const route = index.get(item);
    if (!routes.includes(route.kind) || !reachable(route, level, o.faction, o.includeTrash)) continue;
    if (route.kind !== "quest" && route.kind !== "dungeon" && !factionOk(item.source, o.faction)) continue;
    out.push({ item, score: scoreItem(item, cls), source: classifySource(item.source, item.sourceTypes), route });
  }
  return out.sort((a, b) => b.score - a.score);
}

/** Levelling best in slot: the strongest quest and dungeon gear you can get at this level. */
export function levellingBis(items: KbItem[], cls: ClassInfo, level: number, index: RouteIndex, o: PlanOptions = {}, depth = 3): BisResult {
  return bisFromPool(planCandidates(items, cls, level, index, o), cls, level, depth);
}

export interface Upgrade {
  level: number;
  slot: string;
  pick: Pick;
  /** The previous best for this slot, if any. */
  replaces: Pick | null;
}

/** The levels where your best quest or dungeon piece for a slot changes, from one level to another. */
export function upgradePath(items: KbItem[], cls: ClassInfo, from: number, to: number, index: RouteIndex, o: PlanOptions = {}): Upgrade[] {
  const best = new Map<string, Pick>();
  const owned = new Set<number>();
  const out: Upgrade[] = [];
  for (let level = from; level <= to; level++) {
    const bis = levellingBis(items, cls, level, index, o, 2);
    const tops: [string, Pick | undefined][] = bis.slots.flatMap(({ slot, picks }) =>
      slot === "Finger" || slot === "Trinket"
        ? [[`${slot} 1`, picks[0]], [`${slot} 2`, picks[1]]] as [string, Pick | undefined][]
        : [[slot, picks[0]]] as [string, Pick | undefined][]);
    bis.weapons.picks.slice(0, bis.weapons.label === "Two-handed" ? 1 : 2).forEach((p, i) => tops.push([i ? "Off hand" : "Weapon", p]));
    for (const [slot, pick] of tops) {
      if (!pick) continue;
      const prev = best.get(slot) ?? null;
      if (prev?.item.id === pick.item.id) continue;
      best.set(slot, pick);
      // A ring or trinket moving from the first to the second place is something you already have.
      if (owned.has(pick.item.id) || (prev && pick.score <= prev.score)) continue;
      owned.add(pick.item.id);
      if (level > from) out.push({ level, slot: slot.replace(/ \d$/, ""), pick, replaces: prev });
    }
  }
  return out;
}

export interface DungeonValue {
  dungeonId: string;
  dungeon: string;
  minLevel: number;
  maxLevel: number;
  picks: Pick[];
}

/** Dungeons ranked by how many of your best-in-slot picks drop there or come from their quests. */
export function dungeonsWorthRunning(bis: BisResult): DungeonValue[] {
  const all = [...bis.slots.flatMap((s) => s.picks.slice(0, s.slot === "Finger" || s.slot === "Trinket" ? 2 : 1)), ...bis.weapons.picks.slice(0, 2)];
  const map = new Map<string, DungeonValue>();
  for (const p of all) {
    const r = p.route;
    const name = r?.kind === "dungeon" ? r.dungeon : r?.kind === "quest" ? r.dungeon : null;
    if (!r || !name) continue;
    const v = map.get(name) ?? { dungeonId: r.kind === "dungeon" ? r.dungeonId : "", dungeon: name, minLevel: 0, maxLevel: 0, picks: [] };
    if (r.kind === "dungeon") Object.assign(v, { dungeonId: r.dungeonId, minLevel: r.minLevel, maxLevel: r.maxLevel });
    if (!v.picks.some((x) => x.item.id === p.item.id)) v.picks.push(p);
    map.set(name, v);
  }
  return [...map.values()].sort((a, b) => b.picks.length - a.picks.length || a.minLevel - b.minLevel);
}

/** Map an equipped item to the planner's slot names. */
export function plannerSlot(item: KbItem): string | null {
  if (["Two-Hand", "One-Hand", "Main Hand"].includes(item.slot)) return "Weapon";
  if (["Off Hand", "Shield", "Held In Off-hand"].includes(item.slot)) return "Off hand";
  if (item.slot === "Thrown") return "Ranged";
  return (GEAR_SLOTS as readonly string[]).includes(item.slot) ? item.slot : null;
}

/** "Crafted: Engineering 175 (learned from recipe)" → { profession: "Engineering", skill: 175 } */
export function craftInfo(src: string | null): { profession: string; skill: number } | null {
  const m = src?.match(/Crafted: ([A-Za-z ]+?) (\d+)/);
  return m ? { profession: m[1], skill: parseInt(m[2], 10) } : null;
}

/** Items crafted by a profession, sorted by skill. */
export function craftedBy(items: KbItem[], profession: string) {
  return items
    .map((item) => ({ item, craft: craftInfo(item.source) }))
    .filter((x): x is { item: KbItem; craft: { profession: string; skill: number } } => x.craft?.profession === profession)
    .sort((a, b) => a.craft.skill - b.craft.skill || a.item.name.localeCompare(b.item.name));
}
