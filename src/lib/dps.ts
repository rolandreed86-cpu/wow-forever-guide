/**
 * A simple, open DPS estimate for a hunter talent build, a pet and the gear the character is wearing.
 *
 * It starts from the character sheet BattlePost reads from the Armory (attack power, weapon damage, crit, hit, haste),
 * takes out what the character's own talents already add, puts in what the chosen build's talents add, then adds up
 * auto attacks, the main abilities at their cooldowns, the pet and any hawks. Every number it can't read from the game
 * is an assumption listed in DPS_ASSUMPTIONS, and the page shows that list next to the result.
 *
 * It is a model for comparing builds on the same gear, not a simulation: treat the totals as rough and the
 * differences between builds as the useful part.
 */
import type { CharacterSheet, WeaponInfo } from "./characterSync";
import type { Allocation, TalentClass } from "./talents";
import { abilityRankAt } from "./pets";
import type { Beast, PetFamily } from "@/data/pets";

export type Playstyle = "ranged" | "weave" | "melee";

export const PLAYSTYLE_LABEL: Record<Playstyle, string> = {
  ranged: "Ranged only",
  weave: "Melee weave",
  melee: "Full melee",
};

export interface PetChoice {
  family: PetFamily;
  beast?: Beast;
}

export interface DpsInputs {
  cls: TalentClass;
  alloc: Allocation;
  level: number;
  sheet: CharacterSheet;
  weapons?: { mainHand?: WeaponInfo; offHand?: WeaponInfo; ranged?: WeaponInfo } | null;
  /** Talent ranks the character had when the sheet was read: their effects are already in the sheet. */
  sheetRanks: Record<string, number> | null;
  pet: PetChoice | null;
  playstyle: Playstyle;
}

export interface DpsLine {
  label: string;
  dps: number;
  source: "you" | "pet";
  detail?: string;
}

export interface DpsResult {
  total: number;
  you: number;
  pet: number;
  petShare: number;
  lines: DpsLine[];
  stats: { agility: number; meleeAp: number; rangedAp: number; meleeCrit: number; rangedCrit: number; hit: number };
  notes: string[];
}

export const DPS_ASSUMPTIONS = [
  "The target is your level, you attack from behind (no parries), and armour is ignored, so every build loses the same share to it.",
  "Melee weave spends about 60% of the time in melee and 40% at range; abilities are used whenever they're off cooldown and mana never runs out.",
  "Ability damage uses Classic's rank values for your level (Raptor Strike, Arcane Shot, Serpent Sting, Mongoose Bite). Forever may have changed them.",
  "Agility: 1 melee attack power, 2 ranged attack power, and 1% crit per (53 × level ÷ 60) Agility, as in Classic.",
  "Pets deal about (0.9 × level − 3) damage per second before family and talents, take your ranged crit (Method) and miss 10% of the time. Swing speed only changes how often Frenzy procs.",
  "Summon Hawk keeps up to two hawks; each hawk adds a quarter of a pet's base damage for its 18 seconds, and uses an Arcane Shot cooldown.",
  "Improved Tracking assumes you track the right creature type; Bestial Wrath and Rapid Fire are averaged over their cooldowns.",
  "Not counted: Multi-Shot, Volley, traps, Counterattack, trinkets, consumables and on-kill effects such as Rapid Killing's bonus.",
];

// Classic rank values: [level learned, value].
const ARCANE: [number, number][] = [[6, 13], [12, 21], [20, 33], [28, 59], [36, 83], [44, 115], [52, 145], [60, 183]];
const SERPENT: [number, number][] = [[4, 20], [10, 40], [18, 80], [26, 140], [34, 210], [42, 290], [50, 385], [58, 490]];
const RAPTOR: [number, number][] = [[1, 5], [8, 11], [16, 21], [24, 34], [32, 50], [40, 80], [48, 110], [56, 140]];
const MONGOOSE: [number, number][] = [[16, 25], [30, 45], [44, 75], [58, 115]];
const rankValue = (table: [number, number][], level: number) => table.filter(([l]) => l <= level).pop()?.[1] ?? 0;

const DEFAULT_RANGED_SPEED = 2.8;

/** "1 min" → 60, "30 sec" → 30. */
function seconds(s?: string): number | null {
  if (!s) return null;
  const m = s.match(/([\d.]+)\s*(min|sec)/);
  return m ? Number(m[1]) * (m[2] === "min" ? 60 : 1) : null;
}

/** Average of the first number or range in a rank value: "86–98 damage" → 92, "72 over 18 sec" → 72. */
function firstAmount(v: string): number | null {
  const m = v.match(/(\d+)(?:\s*(?:–|-|to)\s*(\d+))?/);
  if (!m) return null;
  return m[2] ? (Number(m[1]) + Number(m[2])) / 2 : Number(m[1]);
}

/** The pet's own ability damage per second at this level, if it does damage. */
export function petAbilityDps(family: PetFamily, level: number): { dps: number; label: string } | null {
  const u = family.unique;
  const { rank } = abilityRankAt(family, level);
  if (!rank) return null;
  if (!["damage", "aoe", "anti-caster", "anti-healer", "control"].includes(u.kind)) return null;
  if (!/damage|over/.test(rank.value)) return null;
  const amount = firstAmount(rank.value);
  if (amount === null) return null;
  if (/per stack/.test(rank.value)) {
    // Stacks to 5 and lasts 10 sec, refreshed on its 4 sec cooldown.
    return { dps: (amount * 5) / 10, label: `${u.name} (5 stacks)` };
  }
  const cd = seconds(u.cooldown) ?? 10;
  return { dps: amount / cd, label: `${u.name} rank ${rank.rank}` };
}

/** Furious Howl's melee attack power at this level, 0 for other families. */
export function howlAp(family: PetFamily | undefined, level: number): number {
  if (!family || family.unique.name !== "Furious Howl") return 0;
  const { rank } = abilityRankAt(family, level);
  return rank ? firstAmount(rank.value) ?? 0 : 0;
}

export function estimateDps(inp: DpsInputs): DpsResult {
  const { cls, alloc, level, sheet, sheetRanks, playstyle } = inp;
  const notes: string[] = [];
  const all = cls.trees.flatMap((t) => t.talents);
  const rank = (name: string) => {
    const t = all.find((x) => x.name === name);
    return t ? alloc[t.id] ?? 0 : 0;
  };
  const was = (name: string) => sheetRanks?.[name] ?? 0;
  if (!sheetRanks) notes.push("Your current talents weren't readable, so the sheet is treated as having no talent bonuses.");

  const loneWolf = rank("Lone Wolf") > 0;
  const pet = loneWolf ? null : inp.pet;
  if (loneWolf && inp.pet) notes.push("Lone Wolf is in this build, so the pet is left out.");

  // ── Character stats with this build's talents instead of the current ones.
  const agiPerCrit = (53 * level) / 60;
  const agility = (sheet.agility / (1 + 0.03 * was("Lightning Reflexes"))) * (1 + 0.03 * rank("Lightning Reflexes"));
  const dAgi = agility - sheet.agility;
  const dCareful = sheet.intellect * 0.2 * (rank("Careful Aim") - was("Careful Aim"));
  const dTrueshot = 20 * (rank("Trueshot Aura") - was("Trueshot Aura"));
  const dCrit = dAgi / agiPerCrit + (rank("Lethal Attacks") - was("Lethal Attacks"));
  const dHit = rank("Surefooted") - was("Surefooted");

  const howl = pet ? howlAp(pet.family, level) : 0;
  const meleeApNoHowl = sheet.meleeAp + dAgi + dCareful;
  const rangedAp = sheet.rangedAp + 2 * dAgi + dCareful + dTrueshot;
  const meleeCrit = Math.max(0, sheet.meleeCrit + dCrit);
  const rangedCrit = Math.max(0, sheet.rangedCrit + dCrit);
  const hit = Math.max(0, sheet.rangedHit + dHit);
  const meleeHit = Math.max(0, sheet.meleeHit + dHit);

  // ── Weapon damage without attack power, worked back from the sheet.
  const mhSpeed = sheet.mainHand?.speed ?? inp.weapons?.mainHand?.speed ?? 2.5;
  const ohSpeed = sheet.offHand?.speed ?? inp.weapons?.offHand?.speed ?? null;
  const rSpeed = inp.weapons?.ranged?.speed ?? sheet.ranged?.speed ?? DEFAULT_RANGED_SPEED;
  if (!inp.weapons?.ranged) notes.push(`Ranged weapon speed unknown, assumed ${DEFAULT_RANGED_SPEED} sec.`);
  const avg = (w: { min: number; max: number } | null | undefined) => (w ? (w.min + w.max) / 2 : 0);
  const ohMultWas = 0.5 * (1 + 0.1 * was("Predator's Edge"));
  const mhBase = sheet.mainHand ? avg(sheet.mainHand) - (sheet.meleeAp / 14) * mhSpeed : 0;
  const ohBase = sheet.offHand && ohSpeed ? avg(sheet.offHand) / ohMultWas - (sheet.meleeAp / 14) * ohSpeed : 0;
  const rBase = sheet.ranged ? avg(sheet.ranged) - (sheet.rangedAp / 14) * rSpeed : 0;

  // ── Damage multipliers and hit tables.
  const allDmg = (1 + 0.01 * rank("Improved Tracking")) * (pet ? 1 + 0.01 * rank("Focused Fire") : 1) * (loneWolf ? 1.2 : 1);
  const rangedDmg = allDmg * (1 + 0.01 * rank("Ranged Weapon Specialization"));
  const rangedCritMult = 2 + 0.06 * rank("Mortal Shots");
  const meleeAbilityCritMult = 2 + 0.06 * rank("Predator's Edge");
  const meleeAbilityCrit = meleeCrit + 2 * rank("Savage Strikes");
  const dualWield = ohBase > 0 && playstyle !== "ranged";
  const specialLand = Math.max(0, 1 - Math.max(0, 5 - meleeHit) / 100 - 0.05);
  const whiteLand = Math.max(0, 1 - Math.max(0, (dualWield ? 24 : 5) - meleeHit) / 100 - 0.05);
  const rangedLand = Math.max(0, 1 - Math.max(0, 5 - hit) / 100);
  const crit = (c: number, mult: number) => 1 + (Math.min(100, c) / 100) * (mult - 1);

  const meleeShare = playstyle === "melee" ? 1 : playstyle === "weave" ? 0.6 : 0;
  const rangedShare = 1 - meleeShare;

  const lines: DpsLine[] = [];
  const add = (label: string, dps: number, source: "you" | "pet", detail?: string) => {
    if (dps > 0.05) lines.push({ label, dps, source, detail });
  };

  const daProc = 0.02 * rank("Deadly Aspects");
  const daUptime = (swing: number) => (daProc ? 1 - Math.pow(1 - daProc, 12 / swing) : 0);

  // Your damage, as a function of melee attack power (so Furious Howl's share can be split out).
  const yourDamage = (meleeAp: number, record: boolean) => {
    let total = 0;
    const put = (label: string, dps: number, detail?: string) => {
      total += dps;
      if (record) add(label, dps, "you", detail);
    };
    // Ranged auto shot.
    if (rangedShare > 0 && sheet.ranged) {
      const rapid = 1 + 0.4 * (15 / Math.max(60, 300 - 60 * rank("Rapid Killing")));
      let swing = rSpeed / ((1 + sheet.rangedHaste / 100) * rapid);
      swing /= 1 + 0.3 * daUptime(swing);
      const shot = (rBase + (rangedAp / 14) * rSpeed) * rangedDmg * rangedLand * crit(rangedCrit, rangedCritMult);
      put("Auto Shot", (shot / swing) * rangedShare, `${Math.round(shot)} per shot every ${swing.toFixed(2)} sec, ${Math.round(rangedShare * 100)}% of the time`);
    }
    // Melee auto attacks.
    if (meleeShare > 0 && sheet.mainHand) {
      let mh = mhSpeed;
      mh /= 1 + 0.3 * daUptime(mh);
      const mhHit = (mhBase + (meleeAp / 14) * mhSpeed) * allDmg * whiteLand * crit(meleeCrit, 2);
      put("Main hand", (mhHit / mh) * meleeShare, `${Math.round(mhHit)} per swing every ${mh.toFixed(2)} sec`);
      if (dualWield && ohSpeed) {
        let oh = ohSpeed;
        oh /= 1 + 0.3 * daUptime(oh);
        const ohMult = 0.5 * (1 + 0.1 * rank("Predator's Edge"));
        const ohHit = (ohBase + (meleeAp / 14) * ohSpeed) * ohMult * allDmg * whiteLand * crit(meleeCrit, 2);
        put("Off hand", (ohHit / oh) * meleeShare, `${Math.round(ohMult * 100)}% damage${rank("Predator's Edge") ? " with Predator's Edge" : ""}`);
      }
      // Raptor Strike adds its bonus to a main-hand swing every 6 sec.
      const raptor = rankValue(RAPTOR, level) * allDmg * specialLand * crit(meleeAbilityCrit, meleeAbilityCritMult);
      put("Raptor Strike", (raptor / 6) * (playstyle === "weave" ? 0.8 : 1), "bonus over a normal swing");
      if (rank("Strider Kick")) {
        const kick = (mhBase + (meleeAp / 14) * mhSpeed) * allDmg * specialLand * crit(meleeAbilityCrit, meleeAbilityCritMult);
        put("Strider Kick", kick / 8, "100% weapon damage every 8 sec");
      }
      // Mongoose Bite: after the target dodges, or from Expose Prey on a marked target.
      const meleeSwings = (1 / mhSpeed + (dualWield && ohSpeed ? 1 / ohSpeed : 0)) * meleeShare;
      const allAttacks = meleeSwings + (rangedShare > 0 ? rangedShare / rSpeed : 0);
      const procs = meleeSwings * 0.05 + allAttacks * 0.05 * rank("Expose Prey");
      const bites = Math.min(1 / 5, procs);
      const bite = rankValue(MONGOOSE, level) * allDmg * specialLand * crit(meleeAbilityCrit, meleeAbilityCritMult)
        * (1 + (rank("Lacerating Strikes") ? 0.4 : 0));
      if (bite > 0) put("Mongoose Bite", bite * bites, `${(bites * 60).toFixed(1)} bites a minute${rank("Lacerating Strikes") ? ", with Lacerating Strikes' bleed" : ""}`);
    }
    // Arcane Shot shares its cooldown with Summon Hawk; hawks are counted with the pet.
    const cd = 6 - 0.3 * rank("Improved Arcane Shot");
    const hawkRate = rank("Summon Hawk") ? 1 / Math.max(9, cd) : 0;
    if (playstyle !== "melee") {
      const arcaneRate = Math.max(0, 1 / cd - hawkRate);
      const arcane = rankValue(ARCANE, level) * rangedDmg * rangedLand * crit(rangedCrit, rangedCritMult);
      put("Arcane Shot", arcane * arcaneRate, `every ${(1 / arcaneRate).toFixed(1)} sec`);
    }
    const serpent = rankValue(SERPENT, level) * allDmg * (1 + 0.06 * rank("Improved Stings"));
    put("Serpent Sting", serpent / 15, "kept up all fight");
    if (rank("Sniper Shot") && playstyle !== "melee") {
      const shot = (rBase + (rangedAp / 14) * rSpeed + 320) * rangedDmg * rangedLand * crit(rangedCrit, rangedCritMult);
      const lostAutos = (4 / rSpeed) * (rBase + (rangedAp / 14) * rSpeed) * rangedDmg * rangedLand;
      put("Sniper Shot", Math.max(0, shot - lostAutos) / 15, "every 15 sec, minus the auto shots its 4 sec cast costs");
    }
    return total;
  };

  const youNoHowl = yourDamage(meleeApNoHowl, true);
  const youWithHowl = howl ? yourDamage(meleeApNoHowl + howl, false) : youNoHowl;

  // ── Pet and hawks.
  let petTotal = 0;
  const petMult = (1 + 0.01 * rank("Focused Fire")) * (1 + 0.03 * rank("Unleashed Fury"));
  const petCrit = rangedCrit + 2 * rank("Ferocity");
  const base = Math.max(5, 0.9 * level - 3);
  if (pet) {
    const fam = pet.family;
    const swing = pet.beast?.speed ?? 2.0;
    const frenzyChance = (Math.min(100, petCrit) / 100) * 0.2 * rank("Frenzy");
    const frenzy = frenzyChance ? 1 - Math.pow(1 - frenzyChance, 8 / swing) : 0;
    const wrath = rank("Bestial Wrath") ? 1 + 0.5 * (18 / 120) : 1;
    const famMod = 1 + (fam.damage ?? 0);
    const melee = (base + howl / 14) * famMod * petMult * wrath * 0.9 * crit(petCrit, 2) * (1 + 0.3 * frenzy);
    const who = pet.beast ? `${pet.beast.name} (${fam.name})` : fam.name;
    add(`${who}: attacks`, melee, "pet",
      `${fam.damage ? `${fam.damage > 0 ? "+" : ""}${Math.round(fam.damage * 100)}% family damage, ` : ""}${Math.round(petCrit)}% crit${frenzy ? `, Frenzy up ${Math.round(frenzy * 100)}%` : ""}${wrath > 1 ? ", Bestial Wrath" : ""}`);
    petTotal += melee;
    const ab = petAbilityDps(fam, level);
    if (ab) {
      const d = ab.dps * petMult * wrath * crit(petCrit, 2);
      add(`${who}: ${ab.label}`, d, "pet");
      petTotal += d;
    }
    if (howl) {
      add(`${who}: Furious Howl on you`, youWithHowl - youNoHowl, "pet", `+${howl} melee attack power to you${meleeShare < 1 ? ` while in melee (${Math.round(meleeShare * 100)}% of the time)` : ""}`);
      petTotal += youWithHowl - youNoHowl;
    }
    if (fam.unique.kind === "debuff" && /armour/.test(fam.unique.ranks[0].value)) notes.push(`${fam.unique.name} lowers the target's armour; that isn't counted because armour is ignored.`);
  }
  if (rank("Summon Hawk")) {
    const cd = 6 - 0.3 * rank("Improved Arcane Shot");
    const rate = 1 / Math.max(9, cd);
    const dive = (32 + 0.05 * rangedAp) * petMult * crit(petCrit, 2);
    const assault = base * 0.25 * Math.min(2, 18 * rate) * petMult * 0.9 * crit(petCrit, 2);
    add("Summon Hawk", dive * rate + assault, "pet", `${(18 * rate).toFixed(1)} hawks out on average`);
    petTotal += dive * rate + assault;
  }

  const you = youNoHowl;
  const total = you + petTotal;
  lines.sort((a, b) => (a.source === b.source ? b.dps - a.dps : a.source === "you" ? -1 : 1));
  return {
    total, you, pet: petTotal, petShare: total ? petTotal / total : 0, lines,
    stats: { agility, meleeAp: meleeApNoHowl, rangedAp, meleeCrit, rangedCrit, hit },
    notes,
  };
}

/** The playstyle a build points to: Survival's melee talents mean weaving, deep melee with Hawk means full melee. */
export function suggestedPlaystyle(cls: TalentClass, alloc: Allocation): Playstyle {
  const all = cls.trees.flatMap((t) => t.talents);
  const r = (n: string) => alloc[all.find((t) => t.name === n)?.id ?? ""] ?? 0;
  const melee = r("Predator's Edge") + r("Strider Kick") * 3 + r("Expose Prey") + r("Savage Strikes");
  if (melee >= 4 && r("Summon Hawk") && !r("Trueshot Aura")) return "melee";
  if (melee >= 4) return "weave";
  return "ranged";
}
