/**
 * Recommended talent builds and plain-English talent notes.
 *
 * Builds are written as a spend order (talent name + points), so the same list gives the level-60 build
 * and the build at any level on the way: at level L you have spent the first L − 9 points.
 * Trees, ranks and text come from Talents Forever (src/lib/talents.ts); this file only adds advice.
 *
 * Sources (read 23 Nov 2026):
 *  - Wowhead DPS tier list (updated 21 Nov 2026, "very early prediction"):
 *    https://www.wowhead.com/forever/guide/classes/tier-lists/dps-pve-rankings
 *  - Icy Veins Survival builds (2 Nov): https://www.icy-veins.com/wow-forever/survival-hunter-melee-dps-pve-spec-builds-talents
 *  - Method Survival talents (5 Nov): https://www.method.gg/wow-forever/class-guides/survival-hunter/talents
 *  - Method hunter levelling (14 Nov): https://www.method.gg/wow-forever/wow-forever-hunter-leveling-guide-and-talents
 *  - Wowhead level-20 Survival guide: https://www.wowhead.com/forever/guide/classes/hunter/survival/level-20-dps-overview
 * None of these guides publish exact point-by-point Survival builds, so the point placements below are ours:
 * they take the talents the guides name and fill the row gates with the most useful leftovers.
 */

export type TalentCategory = "damage" | "pet" | "mana" | "defence" | "utility" | "control";

export const CATEGORY_LABEL: Record<TalentCategory, string> = {
  damage: "Damage",
  pet: "Pet",
  mana: "Mana",
  defence: "Defence",
  utility: "Utility",
  control: "Crowd control",
};

export interface TalentNote {
  category: TalentCategory;
  /** One or two sentences: what it means in play, and whether DPS builds want it. */
  overview: string;
}

/** Notes keyed by talent name, per class. Only the hunter is written so far. */
export const TALENT_NOTES: Record<string, Record<string, TalentNote>> = {
  hunter: {
    // Beast Mastery
    "Deadly Aspects": { category: "damage", overview: "A free haste proc on your auto attacks: Hawk for ranged, Beast for melee. Strong in any build that has the 5 points to spare in Beast Mastery." },
    "Endurance Training": { category: "pet", overview: "Tougher pet. Mostly a filler point for reaching row 3; one point is enough for levelling." },
    "Focused Fire": { category: "damage", overview: "Flat 2% more damage for you and your pet while the pet is out. Cheap and always on, so every pet build takes it." },
    "Improved Aspect of the Monkey": { category: "defence", overview: "More dodge for you and your pet. A PvP and solo-safety pick, not a DPS one." },
    "Improved Revive Pet": { category: "utility", overview: "Much faster, cheaper pet revives. Lovely for levelling and dungeons, worthless once your pet stops dying." },
    "Pathfinding": { category: "utility", overview: "Faster Cheetah and Pack. Quality of life while levelling before your mount; drop it at 60." },
    "Bestial Swiftness": { category: "pet", overview: "Pet runs 30% faster outdoors. Mainly taken because Intimidation (and so Bestial Wrath) needs it." },
    "Unleashed Fury": { category: "damage", overview: "15% more pet and hawk damage. The core of Beast Mastery damage, and worth it for Summon Hawk in melee builds." },
    "Improved Mend Pet": { category: "pet", overview: "Mend Pet also cleanses. Useful against poison and disease dungeons, otherwise skippable." },
    "Ferocity": { category: "damage", overview: "10% crit for your pet and hawks. Needed for Frenzy and a big chunk of pet damage." },
    "Summon Hawk": { category: "damage", overview: "New 16-point talent: a hawk that keeps attacking for 18 seconds, sharing Arcane Shot's cooldown. Its damage scales with ranged attack power and with Unleashed Fury and Ferocity." },
    "Spirit Bond": { category: "defence", overview: "Slow health regeneration for you and the pet. Saves eating between pulls when solo." },
    "Intimidation": { category: "control", overview: "A 3-second stun from your pet. Required to reach Bestial Wrath; also a strong PvP and interrupt tool." },
    "Bestial Discipline": { category: "mana", overview: "Pet gets more Focus and you keep half your mana regeneration while casting. Good in long fights." },
    "Frenzy": { category: "pet", overview: "Pet crits grant 30% attack speed, almost always up with Ferocity. Big pet damage." },
    "Bestial Wrath": { category: "damage", overview: "31-point talent: 50% more pet damage for 18 seconds every 2 minutes. Line it up with Rapid Fire." },
    // Marksmanship
    "Hawk Eye": { category: "utility", overview: "More range. Nice for kiting and PvP, not damage." },
    "Improved Concussive Shot": { category: "control", overview: "Concussive Shot can stun. PvP and kiting only." },
    "Lethal Attacks": { category: "damage", overview: "5% crit on everything, ranged and melee. One of the best five points a hunter can buy in any build." },
    "Improved Stings": { category: "damage", overview: "Stronger Serpent Sting. Fine while levelling; at 60 most builds spend these points elsewhere." },
    "Efficiency": { category: "mana", overview: "Cheaper shots, stings and melee abilities. Take some if you run out of mana in long fights." },
    "Careful Aim": { category: "damage", overview: "New in Forever: Intellect becomes attack power, 1 for 1 at 5/5. Makes Intellect as good as Agility on gear, so it is a top pick for every build." },
    "Rapid Killing": { category: "damage", overview: "Rapid Fire every 3 minutes, plus a 20% stronger next shot after a kill. Great for levelling and trash." },
    "Improved Arcane Shot": { category: "damage", overview: "Arcane Shot every 4.5 seconds. Strong in weaving builds that fire Arcane Shot between melee hits." },
    "Lone Wolf": { category: "damage", overview: "20% more damage with no pet out. Only for the pet-less turret Marksmanship build." },
    "Trueshot Aura": { category: "damage", overview: "Party-wide ranged attack power. Your raid only needs one hunter to have it." },
    "Mortal Shots": { category: "damage", overview: "30% more crit damage on ranged abilities. Pairs with Lethal Attacks; needs Careful Aim maxed." },
    "Rapid Recuperation": { category: "mana", overview: "Serpent Sting keeps your mana regeneration going. Mana sustain for ranged-heavy builds." },
    "Barrage": { category: "damage", overview: "More Multi-Shot and Volley damage. Best for AoE and deep Marksmanship." },
    "Scatter Shot": { category: "control", overview: "A short disorient. PvP and emergency peel." },
    "Ranged Weapon Specialization": { category: "damage", overview: "5% more ranged weapon damage. Only reachable in deep Marksmanship builds." },
    "Sniper Shot": { category: "damage", overview: "31-point talent: a 4-second cast long-range shot. Good for pulling and turret play; weak when you move a lot." },
    // Survival
    "Improved Tracking": { category: "damage", overview: "5% more damage to whatever creature type you are tracking. Keep the right tracking up: Humanoids in PvP and most dungeons, Beasts, Giants or Dragonkin for those bosses. The best first five points for Survival." },
    "Deflection": { category: "defence", overview: "Parry chance. Helps solo melee and feeds Counterattack, but no damage." },
    "Entrapment": { category: "control", overview: "Traps root everything they hit. PvP and kiting tool." },
    "Savage Strikes": { category: "damage", overview: "4% crit on melee abilities (Raptor Strike, Mongoose Bite, Strider Kick). Cheap and core for Survival." },
    "Survivalist": { category: "defence", overview: "10% more health. The usual filler for Survival's row gates; more forgiving in melee range." },
    "Improved Wing Clip": { category: "control", overview: "Wing Clip can root. PvP only." },
    "Clever Traps": { category: "control", overview: "Longer freezes and stronger fire traps. PvP and AoE trap play." },
    "Surefooted": { category: "damage", overview: "3% hit, plus shorter slows on you. Hit chance is valuable until your gear covers the cap." },
    "Deterrence": { category: "defence", overview: "Ten seconds of 25% dodge and parry. Needed for Counterattack and a good panic button in melee." },
    "Survival Tactics": { category: "utility", overview: "Traps and Feign Death resist less. PvP and raids where Feign Death must land." },
    "Predator's Edge": { category: "damage", overview: "New in Forever: 30% more melee crit damage and 50% more off-hand damage. The reason Survival works as a melee spec." },
    "Counterattack": { category: "damage", overview: "A hit after you parry. Only worth it in full-melee builds with Deflection." },
    "Resourcefulness": { category: "mana", overview: "60% cheaper melee and traps, and crits keep mana regeneration going. This is what lets Survival weave melee without going out of mana." },
    "Expose Prey": { category: "damage", overview: "Attacks on a target with Hunter's Mark can light up Mongoose Bite. Keep Hunter's Mark on your target. Needed for Lacerating Strikes." },
    "Survivalist's Discipline": { category: "utility", overview: "Traps and Deterrence come back 40% sooner. PvP pick." },
    "Strider Kick": { category: "damage", overview: "A full-weapon-damage kick on an 8-second cooldown. Use it on cooldown in melee range." },
    "Lightning Reflexes": { category: "damage", overview: "15% more Agility. Big damage for every Survival build." },
    "Lacerating Strikes": { category: "damage", overview: "31-point talent: Mongoose Bite adds a bleed for 40% of its damage. Guides disagree, because Mongoose Bite depends on random Expose Prey procs. Take it when you have the point." },
  },
};

export type BuildRole = "Survival" | "Beast Mastery" | "Marksmanship";

export interface BuildStep {
  talent: string;
  points: number;
}

export interface RecommendedBuild {
  id: string;
  name: string;
  role: BuildRole;
  /** Tree split at 60 without Legacy points, e.g. "0/20/31". */
  split: string;
  recommended?: boolean;
  /** Where it stands for raid DPS, with the source. */
  standing: string;
  playstyle: string;
  strengths: string[];
  weaknesses: string[];
  /** Spend order: levelling path and level-60 build in one list. */
  order: BuildStep[];
  /** Up to 5 extra points for the Legacy "Talented" perk. */
  legacy: BuildStep[];
  stats: string;
  rotation: string[];
}

export const HUNTER_BUILDS: RecommendedBuild[] = [
  {
    id: "sv-weave",
    name: "Survival melee weave",
    role: "Survival",
    split: "0/20/31",
    recommended: true,
    standing: "S tier, number 1 of all DPS specs on Wowhead's early tier list (21 Nov). Method also calls ranged and melee weaving the strongest Survival build.",
    playstyle: "Shoot from range, then step in for Raptor Strike, Strider Kick and Mongoose Bite between Auto Shots. Resourcefulness pays for the melee, Careful Aim and Lethal Attacks from Marksmanship add attack power and crit, and Trueshot Aura helps the whole party.",
    strengths: [
      "Highest predicted hunter damage: Wowhead says Survival is the only spec that can weave melee without going out of mana.",
      "Gets Careful Aim, so Intellect gear is as good as Agility: a much wider pool of usable mail and leather.",
      "Brings Trueshot Aura for the party.",
    ],
    weaknesses: [
      "Harder to play: you move in and out of melee, and Mongoose Bite depends on random procs.",
      "Melee range is dangerous on bosses with frontal or melee-range mechanics.",
      "Comes together late: the key pieces arrive at 30 to 40 (Expose Prey, Strider Kick, Lightning Reflexes).",
    ],
    order: [
      { talent: "Improved Tracking", points: 5 },
      { talent: "Savage Strikes", points: 2 },
      { talent: "Survivalist", points: 3 },
      { talent: "Surefooted", points: 3 },
      { talent: "Deterrence", points: 1 },
      { talent: "Survivalist", points: 1 },
      { talent: "Predator's Edge", points: 5 },
      { talent: "Expose Prey", points: 2 },
      { talent: "Strider Kick", points: 1 },
      { talent: "Resourcefulness", points: 2 },
      { talent: "Lightning Reflexes", points: 5 },
      { talent: "Lacerating Strikes", points: 1 },
      { talent: "Lethal Attacks", points: 5 },
      { talent: "Careful Aim", points: 5 },
      { talent: "Rapid Killing", points: 2 },
      { talent: "Improved Arcane Shot", points: 3 },
      { talent: "Trueshot Aura", points: 1 },
      { talent: "Mortal Shots", points: 4 },
    ],
    legacy: [
      { talent: "Mortal Shots", points: 1 },
      { talent: "Barrage", points: 3 },
      { talent: "Efficiency", points: 1 },
    ],
    stats: "Agility = Intellect (with Careful Aim) > Strength > Hit until your hit is covered. Source: Method's Survival gear page.",
    rotation: [
      "Keep Hunter's Mark on your target: Expose Prey only procs against marked targets.",
      "Open with Serpent Sting and Arcane Shot (or Summon Hawk) from range.",
      "Step into melee between Auto Shots: Strider Kick on cooldown, Raptor Strike on cooldown, Mongoose Bite whenever it lights up.",
      "Use Rapid Fire on pull or with trinkets; step out when the boss needs you at range.",
    ],
  },
  {
    id: "sv-melee",
    name: "Survival full melee",
    role: "Survival",
    split: "16/5/30",
    standing: "Icy Veins lists it as Survival's melee build. No source ranks it above the weave build; expect a little less damage in exchange for simpler play.",
    playstyle: "Stay in melee all fight like a rogue with a pet. Deadly Aspects procs melee haste with Aspect of the Beast, Summon Hawk adds ranged damage on Arcane Shot's cooldown, and Counterattack punishes parried hits.",
    strengths: [
      "Simplest Survival play: no stepping in and out.",
      "Dual wielding gets the full 50% off-hand bonus from Predator's Edge.",
      "Summon Hawk keeps doing damage while you are busy in melee.",
    ],
    weaknesses: [
      "No Careful Aim at 51 points, so Intellect is far weaker on gear (Agility > Strength > Intellect). With the Legacy perk you can add it.",
      "No Trueshot Aura for the group.",
      "Always in melee range, so more damage taken.",
    ],
    order: [
      { talent: "Improved Tracking", points: 5 },
      { talent: "Savage Strikes", points: 2 },
      { talent: "Survivalist", points: 3 },
      { talent: "Surefooted", points: 3 },
      { talent: "Deterrence", points: 1 },
      { talent: "Survivalist", points: 1 },
      { talent: "Predator's Edge", points: 5 },
      { talent: "Counterattack", points: 1 },
      { talent: "Expose Prey", points: 2 },
      { talent: "Strider Kick", points: 1 },
      { talent: "Resourcefulness", points: 1 },
      { talent: "Lightning Reflexes", points: 5 },
      { talent: "Deadly Aspects", points: 5 },
      { talent: "Focused Fire", points: 2 },
      { talent: "Endurance Training", points: 3 },
      { talent: "Unleashed Fury", points: 5 },
      { talent: "Summon Hawk", points: 1 },
      { talent: "Lethal Attacks", points: 5 },
    ],
    legacy: [{ talent: "Careful Aim", points: 5 }],
    stats: "Agility > Strength > Intellect (no Careful Aim). With the Legacy perk and Careful Aim: Agility = Intellect > Strength.",
    rotation: [
      "Aspect of the Beast on (Deadly Aspects melee haste proc).",
      "Hunter's Mark, then Summon Hawk whenever Arcane Shot's cooldown is up.",
      "Strider Kick and Raptor Strike on cooldown, Mongoose Bite on proc, Counterattack after a parry.",
    ],
  },
  {
    id: "mm-weave",
    name: "Marksmanship weave",
    role: "Marksmanship",
    split: "0/26/25",
    standing: "A tier, number 6 of all DPS specs on Wowhead's tier list, which names this 26/25 Marksmanship and Survival split as the best Marksmanship build. Method expects Marksmanship to end up the best endgame build; Wowhead currently disagrees.",
    playstyle: "Mostly ranged with Mortal Shots and Barrage, but still borrowing Survival's melee talents for weaving. More mana pressure than Survival.",
    strengths: [
      "Strongest pure ranged burst, with full Mortal Shots and Barrage for AoE.",
      "Rapid Recuperation and Resourcefulness for mana.",
      "Easy switch to range-only on fights where melee is unsafe.",
    ],
    weaknesses: [
      "Wowhead's early sims put it below Survival.",
      "Loses Lightning Reflexes and Lacerating Strikes.",
      "Turret play (no melee, 5/41/5) is about 12% lower than its baseline per Wowhead.",
    ],
    order: [
      { talent: "Lethal Attacks", points: 5 },
      { talent: "Careful Aim", points: 5 },
      { talent: "Rapid Killing", points: 2 },
      { talent: "Improved Arcane Shot", points: 3 },
      { talent: "Trueshot Aura", points: 1 },
      { talent: "Mortal Shots", points: 5 },
      { talent: "Barrage", points: 3 },
      { talent: "Rapid Recuperation", points: 2 },
      { talent: "Improved Tracking", points: 5 },
      { talent: "Savage Strikes", points: 2 },
      { talent: "Survivalist", points: 3 },
      { talent: "Surefooted", points: 3 },
      { talent: "Deterrence", points: 1 },
      { talent: "Survivalist", points: 1 },
      { talent: "Predator's Edge", points: 5 },
      { talent: "Resourcefulness", points: 2 },
      { talent: "Expose Prey", points: 2 },
      { talent: "Strider Kick", points: 1 },
    ],
    legacy: [{ talent: "Ranged Weapon Specialization", points: 5 }],
    stats: "Agility = Intellect (Careful Aim) > Hit until capped > Strength.",
    rotation: [
      "Hunter's Mark, Serpent Sting, Arcane Shot on cooldown, Multi-Shot when there is more than one target.",
      "Weave Strider Kick and Raptor Strike when the boss allows melee.",
      "Rapid Fire on pull and again after kills, thanks to Rapid Killing.",
    ],
  },
  {
    id: "bm",
    name: "Beast Mastery",
    role: "Beast Mastery",
    split: "31/20/0",
    standing: "A tier, number 9 on Wowhead's tier list. Method calls it the easiest and strongest hunter spec right now, and its levelling guide uses this 31 Beast Mastery / 20 Marksmanship split.",
    playstyle: "Your pet does a large share of the damage. Stay at range, keep the pet alive, and line up Bestial Wrath with Rapid Fire.",
    strengths: [
      "Easiest to play and safest: you never need melee range.",
      "Fastest and safest levelling build (Method's pick for 10 to 60).",
      "Summon Hawk plus a strong pet keeps damage going while moving.",
    ],
    weaknesses: [
      "Lowest ranked of the three for raid DPS in Wowhead's early list; turret Beast Mastery is about 7% under its baseline.",
      "Pet damage suffers on bosses with heavy AoE or cleave.",
    ],
    order: [
      { talent: "Deadly Aspects", points: 5 },
      { talent: "Focused Fire", points: 2 },
      { talent: "Improved Revive Pet", points: 2 },
      { talent: "Endurance Training", points: 1 },
      { talent: "Unleashed Fury", points: 5 },
      { talent: "Bestial Swiftness", points: 1 },
      { talent: "Summon Hawk", points: 1 },
      { talent: "Ferocity", points: 5 },
      { talent: "Intimidation", points: 1 },
      { talent: "Bestial Discipline", points: 2 },
      { talent: "Frenzy", points: 5 },
      { talent: "Bestial Wrath", points: 1 },
      { talent: "Lethal Attacks", points: 5 },
      { talent: "Careful Aim", points: 5 },
      { talent: "Rapid Killing", points: 2 },
      { talent: "Efficiency", points: 3 },
      { talent: "Trueshot Aura", points: 1 },
      { talent: "Mortal Shots", points: 4 },
    ],
    legacy: [
      { talent: "Mortal Shots", points: 1 },
      { talent: "Barrage", points: 3 },
      { talent: "Efficiency", points: 1 },
    ],
    stats: "Agility = Intellect (Careful Aim) > Hit. Your pet inherits 100% of your crit (Method), so crit is worth more than it looks.",
    rotation: [
      "Pet attacks first; Hunter's Mark and Serpent Sting.",
      "Summon Hawk on cooldown (shares Arcane Shot's cooldown).",
      "Bestial Wrath with Rapid Fire every 2 minutes; Intimidation to stop casts.",
    ],
  },
];

/** Talent name → points for a build cut to a number of points (levelling stage), Legacy points after 51. */
export function buildAtPoints(build: RecommendedBuild, points: number): Record<string, number> {
  const out: Record<string, number> = {};
  let left = points;
  for (const step of [...build.order, ...build.legacy]) {
    if (left <= 0) break;
    const n = Math.min(step.points, left);
    out[step.talent] = (out[step.talent] ?? 0) + n;
    left -= n;
  }
  return out;
}

/** The levels at which each step of a build is first and fully bought, for a levelling table. */
export function levellingPlan(build: RecommendedBuild, legacyBonus = 0): { talent: string; points: number; from: number; to: number }[] {
  const plan: { talent: string; points: number; from: number; to: number }[] = [];
  let spent = 0;
  const bonus = Math.max(0, Math.min(5, legacyBonus));
  for (const step of [...build.order, ...build.legacy.slice(0)]) {
    const first = spent + 1;
    const last = spent + step.points;
    // Point n is available at level n + 9 − bonus (Legacy points arrive at level 10), never below 10.
    const lvl = (n: number) => Math.max(10, n + 9 - bonus);
    if (lvl(first) > 60) break;
    plan.push({ talent: step.talent, points: step.points, from: lvl(first), to: Math.min(60, lvl(last)) });
    spent = last;
  }
  return plan;
}
