import type { Faction } from "@/data/classes";
import { BEASTS, FAMILY_BY_ID, PET_FAMILIES, zoneSide, type Beast, type Context, type PetFamily } from "@/data/pets";

/**
 * Ranks hunter pets for a level, spec and kind of content.
 *
 * A pet's score (0–100) blends three things, each worked out on a 0–100 scale:
 *   - damage: the family's damage modifier, plus a small bonus for a faster swing (disputed, so kept small);
 *   - toughness: how well it holds aggro and survives;
 *   - ability: what its unique ability is worth in that content, scaled by the rank you can have at this level.
 * The weights depend on the content and the spec. This is our model, built from the community numbers in
 * src/data/pets.ts, not a simulation: it is there to explain picks, and the reasons say why.
 */

export type Spec = "survival" | "beast-mastery" | "marksmanship";

export const SPEC_LABEL: Record<Spec, string> = {
  survival: "Survival",
  "beast-mastery": "Beast Mastery",
  marksmanship: "Marksmanship",
};

export const CONTEXT_LABEL: Record<Context, string> = {
  solo: "Levelling solo",
  dungeon: "Dungeons",
  raid: "Raids",
  pvp: "PvP",
};

interface Weights { damage: number; toughness: number; ability: number }

const BASE_WEIGHTS: Record<Context, Weights> = {
  solo: { damage: 0.5, toughness: 0.3, ability: 0.2 },
  dungeon: { damage: 0.5, toughness: 0.05, ability: 0.45 },
  raid: { damage: 0.5, toughness: 0, ability: 0.5 },
  pvp: { damage: 0.25, toughness: 0.25, ability: 0.5 },
};

export function weightsFor(context: Context, spec: Spec): Weights {
  const w = { ...BASE_WEIGHTS[context] };
  // Beast Mastery's talents (Unleashed Fury, Ferocity, Frenzy, Bestial Wrath) multiply the pet's own damage.
  if (spec === "beast-mastery") w.damage += 0.15;
  const sum = w.damage + w.toughness + w.ability;
  return { damage: w.damage / sum, toughness: w.toughness / sum, ability: w.ability / sum };
}

export const BASE_SWING = 2.0;

/** The highest rank of the family's unique ability you can have at this level (0 if none yet), and the top rank. */
export function abilityRankAt(family: PetFamily, level: number) {
  const ranks = family.unique.ranks;
  const have = ranks.filter((r) => r.level <= level);
  const top = ranks[ranks.length - 1];
  return { rank: have.length ? have[have.length - 1] : null, top, firstLevel: ranks[0].level };
}

/**
 * 0–1: how close this level's rank is to the top rank's power. Sparse rank tables (only first and last known)
 * are interpolated by level so a level-30 Wind Serpent isn't scored as rank 1.
 */
export function abilityStrength(family: PetFamily, level: number): number {
  const { rank, top, firstLevel } = abilityRankAt(family, level);
  if (!rank) return 0;
  if (top.level === firstLevel) return 1;
  // Ability power grows roughly with level; never below a quarter once learned.
  return Math.max(0.25, Math.min(1, (level - firstLevel) / (top.level - firstLevel) * 0.75 + 0.25));
}

export function damageScore(family: PetFamily, speed?: number): number {
  const mod = family.damage ?? 0;
  const base = 50 + mod * 250; // +10% → 75, −10% → 25
  return Math.max(0, Math.min(100, base + speedBonus(speed)));
}

/** Up to +8 for the fastest swing. Faster pets get more Frenzy procs, but tests disagree on raw DPS, so keep it small. */
export function speedBonus(speed?: number): number {
  if (!speed || speed >= BASE_SWING) return 0;
  return Math.round(((BASE_SWING / speed - 1) / 1) * 8 * 10) / 10;
}

export interface PetOptions {
  level: number;
  spec: Spec;
  context: Context;
  faction: Faction;
}

export interface ScoredPet {
  beast: Beast;
  family: PetFamily;
  score: number;
  parts: { damage: number; toughness: number; ability: number };
  reasons: string[];
  warnings: string[];
}

/** Does the family's unique ability raise your own damage as this spec? */
function buffsYou(family: PetFamily, spec: Spec) {
  return family.unique.kind === "party-buff" && spec === "survival";
}

export function abilityValue(family: PetFamily, context: Context, spec: Spec): number {
  let v = family.unique.value[context];
  // Furious Howl buffs melee attack power. Forever Survival fights in melee (Predator's Edge, Strider Kick,
  // Lacerating Strikes, Aspect of the Beast's melee AP), so the howl raises the hunter's own damage too.
  if (buffsYou(family, spec)) v += context === "solo" ? 2.5 : 0.5;
  return Math.min(5, v);
}

export function scorePet(beast: Beast, opts: PetOptions): ScoredPet | null {
  const family = FAMILY_BY_ID.get(beast.family);
  if (!family) return null;
  const { level, spec, context, faction } = opts;
  const w = weightsFor(context, spec);
  const strength = abilityStrength(family, level);
  const parts = {
    damage: damageScore(family, beast.speed),
    toughness: family.toughness * 20,
    ability: abilityValue(family, context, spec) * 20 * strength,
  };
  let score = parts.damage * w.damage + parts.toughness * w.toughness + parts.ability * w.ability;

  const reasons: string[] = [];
  const warnings: string[] = [];
  const mod = family.damage;
  if (mod !== null && mod !== 0) reasons.push(`${mod > 0 ? "+" : ""}${Math.round(mod * 100)}% family damage`);
  if (beast.speed) reasons.push(`${beast.speed.toFixed(1)} sec swing (default ${BASE_SWING.toFixed(1)})`);
  if (family.toughness >= 4 && w.toughness >= 0.2) reasons.push("tough enough to tank mobs for you");
  const { rank, firstLevel } = abilityRankAt(family, level);
  if (rank) {
    const r = family.unique.ranks.length > 1 ? ` rank ${rank.rank}` : "";
    reasons.push(`${family.unique.name}${r}: ${rank.value}`);
  } else {
    warnings.push(`${family.unique.name} unlocks at level ${firstLevel}`);
  }
  if (buffsYou(family, spec)) reasons.push("the howl raises your own melee attack power as Survival");
  if (beast.teaches?.length) reasons.push(`already knows ${beast.teaches.join(", ")}`);

  // A pet far below your level has to catch up: pets get 25% of your XP and no quest XP.
  const gap = level - beast.maxLevel;
  if (gap > 6) {
    score -= Math.min(15, (gap - 6) * 1.5);
    warnings.push(`it will be ${gap} levels behind you and has to catch up (pets get 25% of your XP)`);
  }
  const side = zoneSide(beast.zone);
  if (side !== "contested" && side !== faction) {
    score -= 4;
    warnings.push(`${beast.zone} is ${side === "horde" ? "Horde" : "Alliance"} territory: expect guards and PvP`);
  }
  if (beast.elite) warnings.push("elite: bring help or use traps");
  if (beast.confidence === "inferred") warnings.push("location not confirmed by a Forever source");

  return { beast, family, score: Math.round(score * 10) / 10, parts, reasons, warnings };
}

/** Beasts you can tame at this level (you can only tame beasts at or below your own level). */
export function tameableAt(level: number, beasts: Beast[] = BEASTS) {
  return beasts.filter((b) => b.minLevel <= level);
}

export function rankPets(opts: PetOptions, beasts: Beast[] = BEASTS): ScoredPet[] {
  return tameableAt(opts.level, beasts)
    .map((b) => scorePet(b, opts))
    .filter((x): x is ScoredPet => x !== null)
    .sort((a, b) => b.score - a.score || b.beast.maxLevel - a.beast.maxLevel || a.beast.name.localeCompare(b.beast.name));
}

/** The best beast of each family at this level, best family first. */
export function bestPerFamily(opts: PetOptions, beasts: Beast[] = BEASTS): ScoredPet[] {
  const seen = new Set<string>();
  const out: ScoredPet[] = [];
  for (const p of rankPets(opts, beasts)) {
    if (seen.has(p.family.id)) continue;
    seen.add(p.family.id);
    out.push(p);
  }
  return out;
}

/**
 * A pet worth waiting for: the soonest beast within a few levels that would beat today's pick once you can tame it.
 */
export function comingUp(opts: PetOptions, within = 5, beasts: Beast[] = BEASTS): ScoredPet | null {
  const now = rankPets(opts, beasts)[0];
  const soon = beasts
    .filter((b) => b.minLevel > opts.level && b.minLevel <= Math.min(60, opts.level + within))
    .sort((a, b) => a.minLevel - b.minLevel);
  // The soonest beast that would beat today's pick at the level you can tame it.
  for (const lv of [...new Set(soon.map((b) => b.minLevel))]) {
    const ranked = soon.filter((b) => b.minLevel === lv).map((b) => scorePet(b, { ...opts, level: lv })).filter((x): x is ScoredPet => !!x)
      .sort((a, b) => b.score - a.score);
    const nowThen = now ? scorePet(now.beast, { ...opts, level: lv }) : null;
    if (ranked[0] && (!nowThen || ranked[0].score > nowThen.score)) return ranked[0];
  }
  return null;
}

/** Every beast of one family you could tame by this level, best first (answers "which wolf is best?"). */
export function rankWithinFamily(familyId: string, opts: PetOptions, beasts: Beast[] = BEASTS): ScoredPet[] {
  return rankPets(opts, beasts.filter((b) => b.family === familyId));
}

export interface Bracket { from: number; to: number; label: string }
export const BRACKETS: Bracket[] = [
  { from: 10, to: 19, label: "10–19" },
  { from: 20, to: 29, label: "20–29" },
  { from: 30, to: 39, label: "30–39" },
  { from: 40, to: 49, label: "40–49" },
  { from: 50, to: 59, label: "50–59" },
  { from: 60, to: 60, label: "60" },
];

export interface BracketPick {
  bracket: Bracket;
  best: ScoredPet | null;
  runnersUp: ScoredPet[];
}

/**
 * The best pet to tame during a bracket: beasts you can reach by its last level and that aren't so low they'd lag,
 * scored at the bracket's last level.
 */
export function bracketPicks(opts: Omit<PetOptions, "level">, beasts: Beast[] = BEASTS): BracketPick[] {
  return BRACKETS.map((bracket) => {
    const pool = beasts.filter((b) => b.minLevel <= bracket.to && b.maxLevel >= bracket.from - 6);
    const ranked = rankPets({ ...opts, level: bracket.to }, pool);
    const unique: ScoredPet[] = [];
    const fam = new Set<string>();
    for (const p of ranked) {
      if (fam.has(p.family.id)) continue;
      fam.add(p.family.id);
      unique.push(p);
    }
    return { bracket, best: unique[0] ?? null, runnersUp: unique.slice(1, 3) };
  });
}

/** Rank the families themselves for a level (using a typical, default-speed beast). */
export function rankFamilies(opts: PetOptions): { family: PetFamily; score: number }[] {
  return PET_FAMILIES.map((family) => {
    const s = scorePet({ name: family.name, family: family.id, minLevel: 1, maxLevel: opts.level, zone: "", confidence: "community" }, opts);
    return { family, score: s?.score ?? 0 };
  }).sort((a, b) => b.score - a.score);
}

/** Marksmanship's Lone Wolf (+20% damage with no pet) beats any pet for raw damage once taken. */
export function loneWolfNote(spec: Spec, context: Context): string | null {
  if (spec !== "marksmanship") return null;
  if (context === "raid" || context === "dungeon")
    return "With Lone Wolf (Marksmanship, 10 points in) you deal 20% more damage with no pet out. In a group that usually beats any pet, unless your group wants a wolf's Furious Howl for its melee.";
  return "With Lone Wolf you deal 20% more damage with no pet, but solo you lose your tank. Most Marksmanship hunters keep a pet out while levelling.";
}
