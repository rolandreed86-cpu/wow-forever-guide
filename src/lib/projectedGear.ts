/**
 * A projected hunter character sheet for any level, wearing the levelling best-in-slot gear from the gear planner
 * (quest and dungeon gear, which is how Roland levels). The DPS estimate uses it to plan builds at levels you
 * haven't reached yet, the same way it uses the real sheet for your gear now.
 *
 * Base stats grow in a straight line through Classic's level-1 human hunter and the base values the Armory shows
 * for the synced character; attack power and crit follow Classic's hunter formulas. Every assumption is in
 * PROJECTION_ASSUMPTIONS and shown on the page.
 */
import type { CharacterSheet, WeaponInfo } from "./characterSync";
import type { BisResult, Pick } from "./gear";
import type { KbItem } from "./kb";

export const PROJECTION_ASSUMPTIONS = [
  "Gear is the gear planner's levelling best in slot for that level: the best quest and dungeon item per slot, two rings, two trinkets and its weapon choice.",
  "Base stats grow in a straight line from a level-1 human hunter through the base stats the Armory shows for your character at their level.",
  "Attack power = 2 × level + Strength + Agility − 20 (melee) and 2 × level + 2 × Agility − 10 (ranged), plus gear and Aspect of the Hawk's Classic rank; crit rating is 14 per 1% and hit rating 10 per 1%.",
  "No enchants. A quiver adds 10% ranged speed (13% from 45, 15% from 55), and ammo adds about 0.2 × level damage per second.",
];

interface Base { strength: number; agility: number; stamina: number; intellect: number; spirit: number }
const LEVEL_1: Base = { strength: 20, agility: 23, stamina: 21, intellect: 20, spirit: 21 };
/** Kurt's base stats at 37 from BattlePost, used when no other anchor is given. */
export const DEFAULT_ANCHOR = { level: 37, base: { strength: 38, agility: 74, stamina: 58, intellect: 42, spirit: 46 } as Base };

export function baseStats(level: number, anchor = DEFAULT_ANCHOR): Base {
  const t = (level - 1) / Math.max(1, anchor.level - 1);
  const k = (key: keyof Base) => Math.round(LEVEL_1[key] + (anchor.base[key] - LEVEL_1[key]) * t);
  return { strength: k("strength"), agility: k("agility"), stamina: k("stamina"), intellect: k("intellect"), spirit: k("spirit") };
}

// Classic Aspect of the Hawk ranged attack power by rank.
const HAWK: [number, number][] = [[10, 20], [18, 35], [28, 50], [38, 70], [48, 90], [58, 110], [60, 120]];
const hawkAp = (level: number) => HAWK.filter(([l]) => l <= level).pop()?.[1] ?? 0;
const quiver = (level: number) => (level >= 55 ? 15 : level >= 45 ? 13 : level >= 10 ? 10 : 0);

export interface Projection {
  level: number;
  sheet: CharacterSheet;
  weapons: { mainHand?: WeaponInfo; offHand?: WeaponInfo; ranged?: WeaponInfo };
  gear: { slot: string; item: KbItem }[];
}

const weaponInfo = (it: KbItem): WeaponInfo | undefined =>
  it.minDmg && it.maxDmg && it.speed ? { id: it.id, name: it.name, min: it.minDmg, max: it.maxDmg, speed: it.speed } : undefined;

/** The items a best-in-slot result puts on: one per slot, two rings and trinkets, and the chosen weapons. */
export function wornGear(bis: BisResult): { slot: string; item: KbItem }[] {
  const out: { slot: string; item: KbItem }[] = [];
  for (const s of bis.slots) {
    const n = s.slot === "Finger" || s.slot === "Trinket" ? 2 : 1;
    const seen = new Set<number>();
    for (const p of s.picks) {
      if (out.filter((o) => o.slot === s.slot).length >= n) break;
      if (seen.has(p.item.id) && p.item.unique) continue;
      seen.add(p.item.id);
      out.push({ slot: s.slot, item: p.item });
    }
  }
  const w: Pick[] = bis.weapons.picks;
  if (bis.weapons.label === "Two-handed") { if (w[0]) out.push({ slot: "Two-hand", item: w[0].item }); }
  else {
    if (w[0]) out.push({ slot: "Main hand", item: w[0].item });
    if (w[1]) out.push({ slot: "Off hand", item: w[1].item });
  }
  return out;
}

export function projectSheet(bis: BisResult, level: number, anchor = DEFAULT_ANCHOR): Projection {
  const gear = wornGear(bis);
  const sum = (k: string) => gear.reduce((n, g) => n + ((g.item.stats as Record<string, number | undefined>)[k] ?? 0), 0);
  const base = baseStats(level, anchor);
  const strength = base.strength + sum("strength");
  const agility = base.agility + sum("agility");
  const intellect = base.intellect + sum("intellect");
  const itemAp = sum("attack_power");
  const meleeAp = Math.max(0, 2 * level + strength + agility - 20 + itemAp + hawkAp(level));
  const rangedAp = Math.max(0, 2 * level + 2 * agility - 10 + itemAp + sum("ranged_attack_power") + hawkAp(level));
  const agiPerCrit = (53 * level) / 60;
  const critGear = sum("crit") / 14;
  const hit = sum("hit") / 10;

  const mh = gear.find((g) => g.slot === "Main hand" || g.slot === "Two-hand")?.item;
  const oh = gear.find((g) => g.slot === "Off hand")?.item;
  const rg = gear.find((g) => g.slot === "Ranged")?.item;
  const weapons = { mainHand: mh && weaponInfo(mh), offHand: oh && weaponInfo(oh), ranged: rg && weaponInfo(rg) };
  // The sheet shows damage with attack power in, and the off hand at half damage.
  const sheetWeapon = (w: WeaponInfo | undefined, ap: number, mult = 1, extra = 0) =>
    w ? { min: (w.min + extra + (ap / 14) * w.speed) * mult, max: (w.max + extra + (ap / 14) * w.speed) * mult, speed: w.speed } : null;
  const ammo = 0.2 * level * (weapons.ranged?.speed ?? 2.8);

  const sheet: CharacterSheet = {
    strength, agility, stamina: base.stamina + sum("stamina"), intellect, spirit: base.spirit + sum("spirit"),
    health: null, mana: null,
    meleeAp, mainHand: sheetWeapon(weapons.mainHand, meleeAp), offHand: sheetWeapon(weapons.offHand, meleeAp, 0.5),
    meleeCrit: agility / agiPerCrit + critGear, meleeHit: hit,
    rangedAp, ranged: sheetWeapon(weapons.ranged, rangedAp, 1, ammo),
    rangedCrit: agility / agiPerCrit + critGear, rangedHit: hit, rangedHaste: quiver(level),
    armor: null, dodge: null, parry: null,
  };
  return { level, sheet, weapons, gear };
}
