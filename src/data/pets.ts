/**
 * Hunter pet families and tameable beasts in WoW Forever.
 *
 * Hand-curated from community guides (no official pet API exists). Where sources disagree the newer one wins, and
 * every number that only one source gives, or that we worked out ourselves, is flagged with `confidence`.
 *   - Family damage / armour / health modifiers: foreverchanges.pro (datamined, Sept 2026) and the mmonster tier list,
 *     which agree. wofwforever.com calls them unconfirmed, so they are "community".
 *   - Unique abilities and ranks: foreverchanges.pro, wofwforever.com (Nov 15 2026), allthings.how (Nov 11 2026).
 *   - Beasts, levels, zones and rare traits: mobalytics, mmonster rare-pet list, theforevertavern, WCLBox, Forever Companion.
 *     Many level ranges are carried over from Classic, which Forever mostly keeps; those are "classic".
 */

export type Confidence = "confirmed" | "community" | "classic" | "inferred";
export type Context = "solo" | "dungeon" | "raid" | "pvp";
export type AbilityKind = "party-buff" | "debuff" | "damage" | "aoe" | "control" | "defence" | "stealth" | "anti-caster" | "anti-healer";

export interface AbilityRank {
  rank: number;
  level: number;
  /** What this rank does, e.g. "+68 melee attack power". */
  value: string;
}

export interface UniqueAbility {
  name: string;
  kind: AbilityKind;
  /** The tooltip, in plain words. */
  effect: string;
  focus?: number;
  cooldown?: string;
  ranks: AbilityRank[];
  /** How much the ability is worth, 0–5, in each kind of content, at its top rank. */
  value: Record<Context, number>;
  confidence: Confidence;
}

export interface PetFamily {
  id: string;
  name: string;
  /** Damage, armour and health versus a beast with no family, as fractions (0.1 = +10%). null = unknown. */
  damage: number | null;
  armor: number | null;
  health: number | null;
  /** How well the family holds aggro and survives, 1–5. */
  toughness: number;
  diet: string[];
  /** Shared abilities every member can learn. */
  shared: string[];
  unique: UniqueAbility;
  /** Number of tameable beasts in the family (foreverchanges count), if known. */
  beastCount?: number;
  /** One line on why you'd pick it. */
  pitch: string;
  note?: string;
  isNew?: boolean;
  modsConfidence: Confidence;
}

export const PET_FAMILIES: PetFamily[] = [
  {
    id: "cat", name: "Cat", damage: 0.10, armor: 0, health: -0.02, toughness: 2, diet: ["Meat", "Fish"],
    shared: ["Bite", "Claw", "Dash", "Cower"], beastCount: 61, modsConfidence: "community",
    pitch: "Joint-highest damage of any family, and the fastest-swinging rares in the game.",
    unique: {
      name: "Prowl", kind: "stealth", focus: 40, cooldown: "10 sec", confidence: "community",
      effect: "Your pet stalks in stealth at reduced speed. Its first attack from stealth deals bonus damage. Good for opening on a target, not for sustained damage.",
      ranks: [
        { rank: 1, level: 30, value: "−50% speed, +20% first attack" },
        { rank: 2, level: 40, value: "−45% speed, +35% first attack" },
        { rank: 3, level: 50, value: "−40% speed, +50% first attack" },
      ],
      value: { solo: 1.5, dungeon: 0.5, raid: 0.5, pvp: 2.5 },
    },
  },
  {
    id: "raptor", name: "Raptor", damage: 0.10, armor: 0.03, health: -0.05, toughness: 2, diet: ["Meat"],
    shared: ["Bite", "Claw", "Dash"], beastCount: 37, modsConfidence: "community",
    pitch: "Matches the cat's +10% damage and adds a strong bleed, so it does more steady damage than a cat.",
    unique: {
      name: "Savage Rend", kind: "damage", focus: 50, cooldown: "1 min", confidence: "community",
      effect: "Rends the target, making it bleed for physical damage over 18 sec.",
      ranks: [
        { rank: 1, level: 12, value: "30 over 18 sec" },
        { rank: 2, level: 24, value: "54 over 18 sec" },
        { rank: 3, level: 36, value: "72 over 18 sec" },
        { rank: 4, level: 48, value: "120 over 18 sec" },
        { rank: 5, level: 60, value: "156 over 18 sec" },
      ],
      value: { solo: 3, dungeon: 2.5, raid: 2.5, pvp: 2 },
    },
  },
  {
    id: "wolf", name: "Wolf", damage: 0, armor: null, health: null, toughness: 3, diet: ["Meat"],
    shared: ["Bite", "Dash"], modsConfidence: "community",
    pitch: "The only pet that buffs you and your party: Furious Howl adds melee attack power to every melee player nearby, you included.",
    note: "Furious Howl buffs melee attack power only, not ranged. It helps you most when you fight in melee, as a Forever Survival hunter does.",
    unique: {
      name: "Furious Howl", kind: "party-buff", focus: 60, cooldown: "30 sec", confidence: "community",
      effect: "Howls, increasing the melee attack power of party and raid members within 15 yards (including you and the wolf) for 1 min. Cut by 40% in the 24 Sept beta update; numbers are from 9 Nov.",
      ranks: [
        { rank: 1, level: 10, value: "+13 melee attack power" },
        { rank: 2, level: 24, value: "+31 to 38 melee attack power" },
        { rank: 3, level: 40, value: "+68 melee attack power" },
        { rank: 4, level: 56, value: "+84 melee attack power" },
      ],
      value: { solo: 1, dungeon: 4.5, raid: 5, pvp: 1.5 },
    },
  },
  {
    id: "bear", name: "Bear", damage: -0.09, armor: 0.05, health: 0.08, toughness: 5, diet: ["Meat", "Fish", "Cheese", "Bread", "Fungus", "Fruit"],
    shared: ["Bite", "Claw", "Dash"], beastCount: 42, modsConfidence: "community",
    pitch: "The best solo tank: most health, eats almost anything, and Swipe holds aggro on three mobs at once.",
    unique: {
      name: "Swipe", kind: "aoe", focus: 20, cooldown: "5 sec", confidence: "community",
      effect: "Swipes up to 3 nearby enemies. Low damage, but it keeps multiple mobs on the bear.",
      ranks: [
        { rank: 1, level: 12, value: "4 damage" },
        { rank: 2, level: 24, value: "8–10 damage" },
        { rank: 3, level: 36, value: "11–13 damage" },
        { rank: 4, level: 48, value: "16–18 damage" },
        { rank: 5, level: 60, value: "20–22 damage" },
      ],
      value: { solo: 3.5, dungeon: 0.5, raid: 0, pvp: 0.5 },
    },
  },
  {
    id: "boar", name: "Boar", damage: -0.10, armor: 0.09, health: 0.04, toughness: 5, diet: ["Meat", "Fish", "Cheese", "Bread", "Fungus", "Fruit"],
    shared: ["Bite", "Dash"], beastCount: 28, modsConfidence: "community",
    pitch: "Tough, eats anything, and Charge roots the target and grabs aggro from range.",
    unique: {
      name: "Charge", kind: "control", focus: 35, cooldown: "25 sec", confidence: "community",
      effect: "Charges an enemy 8–25 yards away, immobilising it for 1 sec and adding attack power to the boar's next attack.",
      ranks: [
        { rank: 1, level: 1, value: "+66 attack power" },
        { rank: 2, level: 12, value: "+130 attack power" },
        { rank: 3, level: 24, value: "+204 attack power" },
        { rank: 4, level: 36, value: "+294 attack power" },
        { rank: 5, level: 48, value: "+430 attack power" },
        { rank: 6, level: 60, value: "+490 attack power" },
      ],
      value: { solo: 3, dungeon: 0.5, raid: 0, pvp: 2 },
    },
  },
  {
    id: "turtle", name: "Turtle", damage: -0.10, armor: null, health: null, toughness: 5, diet: ["Fish", "Fungus", "Fruit"],
    shared: ["Bite", "Dash"], modsConfidence: "community",
    pitch: "Hardest pet to kill. Shell Shield halves damage taken when a pull goes wrong.",
    unique: {
      name: "Shell Shield", kind: "defence", cooldown: "3 min", confidence: "community",
      effect: "Withdraws into its shell for 12 sec, taking 50% less damage but attacking more slowly.",
      ranks: [{ rank: 1, level: 20, value: "−50% damage taken for 12 sec" }],
      value: { solo: 2, dungeon: 0.5, raid: 0, pvp: 2 },
    },
  },
  {
    id: "bat", name: "Bat", damage: 0.07, armor: 0, health: 0, toughness: 2, diet: ["Fungus", "Fruit"],
    shared: ["Bite", "Dive"], beastCount: 9, modsConfidence: "community",
    pitch: "Good damage, and Sonic Blast slows every caster around it, which shines in PvP.",
    unique: {
      name: "Sonic Blast", kind: "anti-caster", focus: 80, cooldown: "1 min", confidence: "community",
      effect: "Deals Nature damage and slows the casting speed of nearby enemies by 30% for 20 sec.",
      ranks: [
        { rank: 1, level: 12, value: "15–17 damage" },
        { rank: 2, level: 24, value: "33–39 damage" },
        { rank: 3, level: 36, value: "44–52 damage" },
        { rank: 4, level: 48, value: "62–74 damage" },
        { rank: 5, level: 60, value: "77–91 damage" },
      ],
      value: { solo: 1.5, dungeon: 2, raid: 1.5, pvp: 4 },
    },
  },
  {
    id: "bird-of-prey", name: "Bird of Prey", damage: 0.07, armor: 0, health: 0, toughness: 2, diet: ["Meat"],
    shared: ["Claw", "Dive"], beastCount: 13, modsConfidence: "community",
    pitch: "Owls were renamed. +7% damage and a disarm that ruins a melee player's day.",
    unique: {
      name: "Mine!", kind: "control", focus: 20, cooldown: "90 sec", confidence: "community",
      effect: "Snatches the target's weapon, disarming it for 3 sec.",
      ranks: [
        { rank: 1, level: 10, value: "10–12 damage" },
        { rank: 2, level: 20, value: "14–16 damage" },
        { rank: 3, level: 30, value: "20–24 damage" },
        { rank: 4, level: 40, value: "33–37 damage" },
        { rank: 5, level: 50, value: "41–47 damage" },
      ],
      value: { solo: 2, dungeon: 1, raid: 0.5, pvp: 4 },
    },
  },
  {
    id: "spider", name: "Spider", damage: 0.07, armor: null, health: null, toughness: 2, diet: ["Meat"],
    shared: ["Bite", "Dash"], modsConfidence: "community",
    pitch: "+7% damage and a 20-yard root that lets you kite anything.",
    unique: {
      name: "Web", kind: "control", cooldown: "40 sec", confidence: "community",
      effect: "Webs the target from up to 20 yards, rooting it for 4 sec and dealing a little Nature damage.",
      ranks: [{ rank: 1, level: 1, value: "Root 4 sec, 12–20 damage" }],
      value: { solo: 1.5, dungeon: 1, raid: 0.5, pvp: 4 },
    },
  },
  {
    id: "wind-serpent", name: "Wind Serpent", damage: 0.07, armor: null, health: null, toughness: 2, diet: ["Fish", "Cheese", "Bread"],
    shared: ["Bite", "Dive"], modsConfidence: "community",
    pitch: "+7% damage and a ranged Nature nuke that ignores armour.",
    unique: {
      name: "Lightning Breath", kind: "damage", confidence: "community",
      effect: "Breathes lightning at one target for Nature damage. Expensive in Focus.",
      ranks: [
        { rank: 1, level: 1, value: "8–10 damage" },
        { rank: 6, level: 60, value: "86–98 damage" },
      ],
      value: { solo: 2.5, dungeon: 2, raid: 2, pvp: 2 },
    },
  },
  {
    id: "carrion-bird", name: "Carrion Bird", damage: 0, armor: 0.05, health: 0, toughness: 3, diet: ["Meat", "Fish"],
    shared: ["Bite", "Claw", "Dive"], beastCount: 29, modsConfidence: "community",
    pitch: "Demoralizing Screech lowers the attack power of everything in melee range, which helps a tank.",
    unique: {
      name: "Demoralizing Screech", kind: "debuff", focus: 20, cooldown: "10 sec", confidence: "community",
      effect: "Hits one enemy and lowers the melee attack power of all enemies in melee range for 30 sec.",
      ranks: [
        { rank: 1, level: 8, value: "−63 enemy attack power" },
        { rank: 2, level: 24, value: "−111 enemy attack power" },
        { rank: 3, level: 48, value: "−164 enemy attack power" },
        { rank: 4, level: 56, value: "−204 enemy attack power" },
      ],
      value: { solo: 2, dungeon: 3, raid: 2.5, pvp: 1.5 },
    },
  },
  {
    id: "tallstrider", name: "Tallstrider", damage: 0, armor: null, health: null, toughness: 3, diet: ["Cheese", "Fungus", "Fruit"],
    shared: ["Bite", "Dash"], modsConfidence: "community",
    pitch: "Dust Cloud strips armour from the target, which raises every physical attacker's damage.",
    unique: {
      name: "Dust Cloud", kind: "debuff", focus: 10, confidence: "community",
      effect: "Kicks up dust, reducing the target's armour for 30 sec. Helps you and every physical damage dealer on that target.",
      ranks: [
        { rank: 1, level: 12, value: "−65 armour" },
        { rank: 5, level: 60, value: "−505 armour" },
      ],
      value: { solo: 1.5, dungeon: 3, raid: 3.5, pvp: 1 },
    },
  },
  {
    id: "gorilla", name: "Gorilla", damage: 0.02, armor: 0, health: 0.04, toughness: 3, diet: ["Fungus", "Fruit"],
    shared: ["Bite", "Dash"], beastCount: 10, modsConfidence: "community",
    pitch: "Thunderstomp is an area attack from level 30, good for packs.",
    unique: {
      name: "Thunderstomp", kind: "aoe", focus: 60, cooldown: "1 min", confidence: "community",
      effect: "Stomps the ground, dealing Nature damage to all enemies within 8 yards.",
      ranks: [
        { rank: 1, level: 30, value: "53–61 damage" },
        { rank: 2, level: 40, value: "69–79 damage" },
        { rank: 3, level: 50, value: "92–106 damage" },
        { rank: 4, level: 60, value: "122–142 damage" },
      ],
      value: { solo: 2.5, dungeon: 1.5, raid: 0.5, pvp: 1 },
    },
  },
  {
    id: "hyena", name: "Hyena", damage: 0, armor: 0.05, health: 0, toughness: 3, diet: ["Meat", "Fruit"],
    shared: ["Bite", "Dash"], beastCount: 19, modsConfidence: "community",
    pitch: "Tendon Rip halves a target's speed, so nothing runs away.",
    unique: {
      name: "Tendon Rip", kind: "control", focus: 25, cooldown: "30 sec", confidence: "community",
      effect: "Rips the target's tendons for damage over 9 sec and slows its movement by 50%.",
      ranks: [
        { rank: 1, level: 12, value: "12 over 9 sec" },
        { rank: 2, level: 24, value: "21 over 9 sec" },
        { rank: 3, level: 36, value: "27 over 9 sec" },
        { rank: 4, level: 48, value: "45 over 9 sec" },
        { rank: 5, level: 60, value: "60 over 9 sec" },
      ],
      value: { solo: 2, dungeon: 0.5, raid: 0.5, pvp: 3 },
    },
  },
  {
    id: "crocolisk", name: "Crocolisk", damage: 0, armor: 0.10, health: -0.05, toughness: 3, diet: ["Meat", "Fish"],
    shared: ["Bite", "Dash"], beastCount: 22, modsConfidence: "community",
    pitch: "Dismember cuts healing on the target by 25%, the best anti-healer pet.",
    unique: {
      name: "Dismember", kind: "anti-healer", focus: 35, cooldown: "15 sec", confidence: "community",
      effect: "Bites down hard, dealing damage and reducing healing received by 25% for 6 sec.",
      ranks: [
        { rank: 1, level: 12, value: "11–13 damage" },
        { rank: 2, level: 24, value: "18–20 damage" },
        { rank: 3, level: 36, value: "26–30 damage" },
        { rank: 4, level: 48, value: "39–45 damage" },
        { rank: 5, level: 60, value: "50–58 damage" },
      ],
      value: { solo: 1.5, dungeon: 1, raid: 1, pvp: 4 },
    },
  },
  {
    id: "crab", name: "Crab", damage: -0.05, armor: 0.13, health: -0.04, toughness: 4, diet: ["Fish", "Bread", "Fungus", "Fruit"],
    shared: ["Claw", "Dash"], beastCount: 22, modsConfidence: "community",
    pitch: "Most armour of any family, and Pinch slows the target by 50%.",
    unique: {
      name: "Pinch", kind: "control", focus: 50, cooldown: "30 sec", confidence: "community",
      effect: "Pinches the target for damage and slows its movement by 50% for 9 sec.",
      ranks: [
        { rank: 1, level: 12, value: "19–21 damage" },
        { rank: 2, level: 24, value: "32–36 damage" },
        { rank: 3, level: 36, value: "41–47 damage" },
        { rank: 4, level: 48, value: "68–78 damage" },
        { rank: 5, level: 60, value: "88–102 damage" },
      ],
      value: { solo: 2.5, dungeon: 0.5, raid: 0, pvp: 3 },
    },
  },
  {
    id: "scorpid", name: "Scorpid", damage: -0.06, armor: 0.10, health: 0, toughness: 4, diet: ["Meat"],
    shared: ["Claw", "Dash"], beastCount: 25, modsConfidence: "community",
    pitch: "Sturdy, with a stacking poison. Middle of the pack.",
    unique: {
      name: "Scorpid Poison", kind: "damage", focus: 30, cooldown: "4 sec", confidence: "community",
      effect: "Poisons the target for Nature damage over 10 sec. Stacks up to 5 times.",
      ranks: [
        { rank: 1, level: 8, value: "5 over 10 sec per stack" },
        { rank: 2, level: 24, value: "10 over 10 sec per stack" },
        { rank: 3, level: 40, value: "20 over 10 sec per stack" },
        { rank: 4, level: 56, value: "25 over 10 sec per stack" },
      ],
      value: { solo: 2, dungeon: 1.5, raid: 1.5, pvp: 1.5 },
    },
  },
  {
    id: "fox", name: "Fox", damage: 0, armor: 0.05, health: 0, toughness: 3, diet: ["Meat"],
    shared: ["Bite", "Dash"], beastCount: 4, modsConfidence: "community", isNew: true,
    pitch: "New in Forever. Trickster's Dance makes it dodge half of all attacks and swing faster for 12 sec.",
    note: "Found on Zephras Isle. One source says the full list of fox tame spots is still unconfirmed.",
    unique: {
      name: "Trickster's Dance", kind: "defence", focus: 10, cooldown: "3 min", confidence: "confirmed",
      effect: "For 12 sec the fox gains +50% dodge chance and attacks 30% faster.",
      ranks: [{ rank: 1, level: 20, value: "+50% dodge, 30% faster attacks" }],
      value: { solo: 2.5, dungeon: 1, raid: 1, pvp: 2.5 },
    },
  },
  {
    id: "core-hound", name: "Core Hound", damage: null, armor: null, health: null, toughness: 3, diet: ["Meat"],
    shared: ["Bite"], modsConfidence: "inferred", isNew: true,
    pitch: "Listed by one guide only. Lava Breath hits two enemies and slows casting.",
    note: "Only allthings.how lists this family, and no source says where to tame one. Treat as unconfirmed.",
    unique: {
      name: "Lava Breath", kind: "anti-caster", confidence: "inferred",
      effect: "Breathes lava on up to 2 nearby enemies for Fire damage and slows their casting by 25% for 10 sec.",
      ranks: [{ rank: 1, level: 48, value: "78–137 Fire damage" }],
      value: { solo: 2, dungeon: 1.5, raid: 1, pvp: 3 },
    },
  },
];

export const FAMILY_BY_ID = new Map(PET_FAMILIES.map((f) => [f.id, f]));

/** Which side owns a zone, for warning Alliance players off Horde zones and vice versa. Zephras Isle is open to both. */
export const ZONE_SIDE: Record<string, "alliance" | "horde" | "contested"> = {
  "Elwynn Forest": "alliance", "Dun Morogh": "alliance", Teldrassil: "alliance", Darkshore: "alliance", Westfall: "alliance",
  "Loch Modan": "alliance", "Redridge Mountains": "alliance", Duskwood: "alliance", Wetlands: "alliance",
  Durotar: "horde", Mulgore: "horde", "Tirisfal Glades": "horde", "Silverpine Forest": "horde", "The Barrens": "horde",
};
export function zoneSide(zone: string) {
  return ZONE_SIDE[zone] ?? "contested";
}

export interface Beast {
  name: string;
  family: string;
  minLevel: number;
  maxLevel: number;
  zone: string;
  rare?: boolean;
  elite?: boolean;
  /** Swing timer in seconds, if faster than the 2.0 sec default. */
  speed?: number;
  /** Ability ranks the beast already knows, so you learn them by taming it. */
  teaches?: string[];
  coords?: string;
  note?: string;
  isNew?: boolean;
  confidence: Confidence;
}

const b = (name: string, family: string, levels: [number, number] | number, zone: string, extra: Partial<Beast> = {}): Beast => {
  const [minLevel, maxLevel] = Array.isArray(levels) ? levels : [levels, levels];
  return { name, family, minLevel, maxLevel, zone, confidence: "community", ...extra };
};

/**
 * Notable tameable beasts: every named rare the sources list, plus the best ordinary beast of each family per level
 * range and the beasts that teach ability ranks. Not every one of Forever's ~500 beasts.
 */
export const BEASTS: Beast[] = [
  // ── Cats
  b("Raluk", "cat", 7, "Durotar", { rare: true }),
  b("Mokwa", "cat", 7, "Mulgore", { rare: true }),
  b("Shal'ma", "cat", [5, 10], "Durotar", { rare: true, isNew: true, speed: 1.3, coords: "59.8, 91.0", note: "Forever Companion lists a 1.3 sec swing." }),
  b("Duskstalker", "cat", 9, "Teldrassil", { rare: true, speed: 1.4 }),
  b("Ghostfang", "cat", [4, 12], "Dun Morogh", { rare: true, isNew: true, coords: "74.2, 63.2", note: "New ghostly cat look, unique to this beast." }),
  b("The Rake", "cat", 10, "Mulgore", { rare: true, speed: 1.2, note: "Sources disagree on the zone: Mulgore (two guides) or The Barrens." }),
  b("Feral Nightsaber", "cat", [10, 11], "Teldrassil", { confidence: "classic" }),
  b("Shadowclaw", "cat", 13, "Darkshore", { rare: true, speed: 1.5 }),
  b("Dishu", "cat", 13, "The Barrens", { rare: true, speed: 1.5 }),
  b("Moonstalker Matriarch", "cat", [19, 20], "Darkshore", { confidence: "classic" }),
  b("Humar the Pridelord", "cat", [23, 25], "The Barrens", { rare: true, elite: true, speed: 1.3, coords: "61.0, 35.0" }),
  b("Feral Mountain Lion", "cat", [27, 28], "Hillsbrad Foothills", { confidence: "classic" }),
  b("Needles Cougar", "cat", [27, 28], "Thousand Needles", { confidence: "classic", speed: 1.2, note: "One guide lists several mountain lions and cougars at 1.2 sec; which ones is unconfirmed." }),
  b("Kurzen War Tiger", "cat", [32, 33], "Stranglethorn Vale", { teaches: ["Dash 1"] }),
  b("Mountain Lion", "cat", [32, 33], "Alterac Mountains", { teaches: ["Prowl 1"] }),
  b("Araga", "cat", 35, "Alterac Mountains", { rare: true, speed: 1.4 }),
  b("Swamp Jaguar", "cat", [36, 37], "Swamp of Sorrows", { speed: 1.2 }),
  b("Ridge Stalker", "cat", [36, 37], "Badlands", { teaches: ["Prowl 1"] }),
  b("Broken Tooth", "cat", 37, "Badlands", { rare: true, speed: 1.0, teaches: ["Dash 1"], note: "The fastest-attacking pet in the game (1.0 sec swing). Three guides agree." }),
  b("Shadowmaw Panther", "cat", [37, 38], "Stranglethorn Vale", { confidence: "classic" }),
  b("Bhag'thera", "cat", 40, "Stranglethorn Vale", { rare: true, elite: true, teaches: ["Dash 2"], note: "Part of the Big Game Hunter quest chain." }),
  b("Ridge Stalker Patriarch", "cat", [40, 41], "Badlands", { teaches: ["Prowl 2", "Dash 2"] }),
  b("Elder Shadowmaw Panther", "cat", [42, 43], "Stranglethorn Vale", { teaches: ["Prowl 2"] }),
  b("King Bangalash", "cat", 43, "Stranglethorn Vale", { rare: true, elite: true, note: "Unique white tiger look." }),
  b("Jaguero Stalker", "cat", 50, "Stranglethorn Vale", { teaches: ["Prowl 3"] }),
  b("Rak'shiri", "cat", 57, "Winterspring", { rare: true, note: "Unique white sabre look." }),
  b("Frostsaber Stalker", "cat", [59, 60], "Winterspring", { teaches: ["Prowl 3"] }),

  // ── Raptors
  b("Bloodtalon Scythemaw", "raptor", [6, 11], "Durotar", { confidence: "classic" }),
  b("Sunscale Scytheclaw", "raptor", [16, 19], "The Barrens", { confidence: "classic" }),
  b("Takk the Leaper", "raptor", [10, 25], "The Barrens", { rare: true, elite: true, coords: "60.4, 9.4", note: "Guides list him at 19; Forever Companion gives 10–25." }),
  b("Highland Raptor", "raptor", [22, 24], "Wetlands", { confidence: "classic" }),
  b("Razormaw Matriarch", "raptor", 31, "Wetlands", { rare: true }),
  b("Dart", "raptor", 38, "Dustwallow Marsh", { rare: true }),
  b("Ravasaur Hunter", "raptor", [50, 52], "Un'Goro Crater", { confidence: "classic" }),

  // ── Wolves
  b("Prowler", "wolf", [9, 10], "Elwynn Forest", { confidence: "classic" }),
  b("Prairie Wolf Alpha", "wolf", [9, 10], "Mulgore", { teaches: ["Furious Howl 1"] }),
  b("Timber", "wolf", 10, "Dun Morogh", { rare: true, teaches: ["Bite 2"] }),
  b("Worg", "wolf", [10, 11], "Silverpine Forest", { teaches: ["Furious Howl 1"] }),
  b("Coyote Packleader", "wolf", [11, 12], "Westfall", { teaches: ["Furious Howl 1"] }),
  b("Coldrasp", "wolf", [5, 12], "Tirisfal Glades", { rare: true, isNew: true, speed: 1.5, teaches: ["Furious Howl 1"], coords: "19.7, 65.6", note: "New ghost wolf look." }),
  b("Gorefang", "wolf", 13, "Silverpine Forest", { rare: true }),
  b("Bloodsnout Worg", "wolf", [16, 17], "Silverpine Forest", { teaches: ["Bite 3"] }),
  b("Mist Howler", "wolf", 22, "Ashenvale", { rare: true, speed: 1.3, teaches: ["Furious Howl 1"] }),
  b("Lupos", "wolf", 23, "Duskwood", { rare: true, teaches: ["Bite 3"], note: "Unique shadow wolf look." }),
  b("Black Ravager", "wolf", [24, 25], "Duskwood", { teaches: ["Bite 4"] }),
  b("Barnabus", "wolf", 38, "Badlands", { rare: true, teaches: ["Bite 6"] }),
  b("Snarler", "wolf", 42, "Feralas", { rare: true, teaches: ["Bite 6", "Furious Howl 3"], note: "The only named beast that already knows Furious Howl rank 3." }),
  b("Vilebranch Raiding Wolf", "wolf", [50, 51], "The Hinterlands", { teaches: ["Dash 3"] }),
  b("Bloodaxe Worg", "wolf", [56, 57], "Blackrock Spire", { elite: true, teaches: ["Furious Howl 4", "Bite 8"], note: "Inside Lower Blackrock Spire. Bring a group." }),

  // ── Bears
  b("Jorul", "bear", 8, "Dun Morogh", { rare: true }),
  b("Mowgh", "bear", 8, "Teldrassil", { rare: true }),
  b("Young Forest Bear", "bear", [8, 9], "Elwynn Forest", { teaches: ["Claw 2"] }),
  b("Matriarch Bristlefur", "bear", [5, 10], "Elwynn Forest", { rare: true, isNew: true, coords: "64.4, 77.0" }),
  b("Bjarn", "bear", 12, "Dun Morogh", { rare: true, teaches: ["Claw 2"] }),
  b("Mystmane", "bear", [3, 13], "Zephras Isle", { rare: true, isNew: true, speed: 1.6, coords: "60.2, 34.6", note: "Fastest bear in the game." }),
  b("Old Vicejaw", "bear", 14, "Silverpine Forest", { rare: true }),
  b("Black Bear Patriarch", "bear", [16, 17], "Loch Modan", { teaches: ["Claw 3"] }),
  b("Elder Ashenvale Bear", "bear", [25, 26], "Ashenvale", { teaches: ["Claw 4"] }),
  b("Big Samras", "bear", 27, "Hillsbrad Foothills", { rare: true }),
  b("Ursol'lok", "bear", 31, "Ashenvale", { rare: true, note: "Unique white bear look." }),
  b("Ironfur Patriarch", "bear", [48, 49], "Feralas", { teaches: ["Claw 7"] }),
  b("Angerclaw Mauler", "bear", [49, 50], "Felwood", { teaches: ["Claw 7"] }),
  b("Elder Shardtooth", "bear", [57, 58], "Winterspring", { teaches: ["Claw 8"] }),

  // ── Boars
  b("Mottled Boar", "boar", [1, 2], "Durotar", { teaches: ["Charge 1"] }),
  b("Young Thistle Boar", "boar", [1, 2], "Teldrassil", { teaches: ["Charge 1"] }),
  b("Goretusk", "boar", [14, 15], "Westfall", { confidence: "classic", note: "Westfall and Loch Modan boars teach Charge rank 2." }),
  b("Bellygrub", "boar", 24, "Redridge Mountains", { rare: true, teaches: ["Charge 3"] }),
  b("Grunter", "boar", 50, "Blasted Lands", { rare: true, teaches: ["Charge 5", "Dash 3"] }),
  b("Plagued Swine", "boar", 60, "Eastern Plaguelands", { teaches: ["Charge 6"] }),

  // ── Turtles
  b("Oasis Snapjaw", "turtle", [15, 16], "The Barrens"),
  b("Koartul", "turtle", 25, "Hillsbrad Foothills", { rare: true, elite: true }),
  b("Cranky Benj", "turtle", 32, "Alterac Mountains", { rare: true, teaches: ["Bite 4", "Shell Shield 1"] }),
  b("Sparkleshell Snapper", "turtle", [34, 35], "Thousand Needles", { teaches: ["Bite 5"] }),
  b("Giant Surf Glider", "turtle", [48, 50], "Tanaris", { teaches: ["Bite 7"] }),

  // ── Bats
  b("Vampiric Duskbat", "bat", [8, 9], "Tirisfal Glades"),
  b("Ressan the Needler", "bat", [11, 12], "Tirisfal Glades", { rare: true }),
  b("Greater Duskbat", "bat", [10, 12], "Tirisfal Glades", { teaches: ["Cower"] }),

  // ── Birds of prey
  b("Strigid Hunter", "bird-of-prey", [8, 9], "Teldrassil", { teaches: ["Claw 2"] }),
  b("Nightscreech", "bird-of-prey", [5, 11], "Teldrassil", { rare: true, coords: "46.4, 33.6" }),
  b("Carrodin", "bird-of-prey", 25, "Wetlands", { rare: true }),
  b("Ironbeak Hunter", "bird-of-prey", [50, 51], "Felwood", { teaches: ["Dive 3"] }),
  b("Winterspring Screecher", "bird-of-prey", [57, 59], "Winterspring", { teaches: ["Claw 8"] }),

  // ── Spiders
  b("Night Web Spider", "spider", [3, 4], "Tirisfal Glades", { teaches: ["Bite 1"] }),
  b("Webwood Silkspinner", "spider", [8, 9], "Teldrassil", { teaches: ["Bite 2"] }),
  b("Forest Lurker", "spider", [11, 12], "Loch Modan"),
  b("Sri'skulk", "spider", 13, "Tirisfal Glades", { rare: true }),
  b("Krethis Shadowspinner", "spider", 15, "Silverpine Forest", { rare: true }),
  b("Deepmoss Creeper", "spider", [16, 17], "Stonetalon Mountains", { teaches: ["Bite 3"] }),
  b("Shanda the Spinner", "spider", 19, "Loch Modan", { rare: true, teaches: ["Bite 3"] }),
  b("Chatter", "spider", 23, "Redridge Mountains", { rare: true, teaches: ["Bite 3"] }),
  b("Leech Widow", "spider", 24, "Wetlands", { rare: true, teaches: ["Bite 4"] }),
  b("Giant Moss Creeper", "spider", [24, 25], "Hillsbrad Foothills", { teaches: ["Bite 4"] }),
  b("Naraxis", "spider", 27, "Duskwood", { rare: true, teaches: ["Bite 4"] }),
  b("Plains Creeper", "spider", [32, 33], "Arathi Highlands", { teaches: ["Bite 5"] }),
  b("Darkmist Widow", "spider", 40, "Dustwallow Marsh", { rare: true }),
  b("Rekk'tilac", "spider", 48, "Searing Gorge", { rare: true, teaches: ["Bite 7"] }),

  // ── Wind serpents
  b("Azzere the Skyblade", "wind-serpent", 25, "The Barrens", { rare: true }),
  b("Hayoc", "wind-serpent", 41, "Dustwallow Marsh", { rare: true }),

  // ── Carrion birds
  b("Swoop", "carrion-bird", [7, 9], "Mulgore"),
  b("Fleshripper", "carrion-bird", [10, 17], "Westfall"),
  b("Lord Condar", "carrion-bird", [15, 16], "Loch Modan", { rare: true }),
  b("Vultros", "carrion-bird", 26, "Westfall", { rare: true }),
  b("Mesa Buzzard", "carrion-bird", [34, 35], "Arathi Highlands", { teaches: ["Dive 1"] }),
  b("Roc", "carrion-bird", [41, 43], "Tanaris", { teaches: ["Dive 2"] }),
  b("Vale Screecher", "carrion-bird", [41, 43], "Feralas", { teaches: ["Dive 2"] }),
  b("Carrion Vulture", "carrion-bird", [50, 52], "Western Plaguelands", { teaches: ["Dive 3"] }),
  

  // ── Tallstriders
  b("Adult Plainstrider", "tallstrider", [6, 7], "Mulgore"),
  b("Mazzranache", "tallstrider", 9, "Mulgore", { rare: true, teaches: ["Cower 1"] }),
  b("Fernfeather", "tallstrider", [3, 12], "Zephras Isle", { rare: true, isNew: true, coords: "48.0, 85.4" }),
  b("Strider Clutchmother", "tallstrider", 20, "Darkshore", { rare: true }),

  // ── Gorillas
  b("Mistvale Gorilla", "gorilla", [32, 33], "Stranglethorn Vale", { teaches: ["Thunderstomp 1"] }),
  b("Jungle Thunderer", "gorilla", [37, 38], "Stranglethorn Vale", { teaches: ["Thunderstomp 1"] }),
  b("Elder Mistvale Gorilla", "gorilla", [40, 41], "Stranglethorn Vale", { teaches: ["Thunderstomp 2"] }),
  b("Kurmokk", "gorilla", 42, "Stranglethorn Vale", { rare: true }),
  b("Groddoc Thunderer", "gorilla", [49, 50], "Feralas", { teaches: ["Thunderstomp 2"] }),
  b("U'cha", "gorilla", 55, "Un'Goro Crater", { rare: true, elite: true, teaches: ["Thunderstomp 3"] }),

  // ── Hyenas
  b("Kolkar Packhound", "hyena", 13, "The Barrens"),
  b("Hecklefang Hyena", "hyena", [15, 16], "The Barrens"),
  b("Snort the Heckler", "hyena", 17, "The Barrens", { rare: true }),
  b("Bonepaw Hyena", "hyena", [33, 35], "Desolace", { teaches: ["Dash 1"] }),
  b("Giggler", "hyena", 34, "Desolace", { rare: true }),
  b("Longtooth Runner", "hyena", [40, 41], "Feralas", { teaches: ["Dash 2"] }),
  b("Ravage", "hyena", 51, "Blasted Lands", { rare: true, speed: 1.3 }),

  // ── Crocolisks
  b("Dreadmaw Crocolisk", "crocolisk", [9, 11], "Durotar"),
  b("Loch Crocolisk", "crocolisk", [14, 15], "Loch Modan"),
  b("Kackle", "crocolisk", [15, 16], "Loch Modan", { rare: true }),
  b("Large Loch Crocolisk", "crocolisk", 22, "Loch Modan", { rare: true, teaches: ["Bite 3"] }),
  b("Ripscale", "crocolisk", 39, "Dustwallow Marsh", { rare: true, teaches: ["Bite 6"] }),

  // ── Crabs
  b("Tide Crawler", "crab", [12, 14], "Darkshore"),
  b("Shore Crawler", "crab", [17, 18], "Westfall", { teaches: ["Claw 3"] }),
  b("Silt Crawler", "crab", [40, 41], "Swamp of Sorrows", { teaches: ["Claw 6"] }),

  // ── Scorpids
  b("Venomtail Scorpid", "scorpid", [9, 10], "Durotar", { teaches: ["Scorpid Poison 1"] }),
  b("Death Flayer", "scorpid", 11, "Durotar", { rare: true, speed: 1.6, teaches: ["Claw 2", "Scorpid Poison 1"] }),
  b("Scorpashi Snapper", "scorpid", [30, 31], "Desolace", { teaches: ["Claw 4", "Scorpid Poison 2"] }),
  b("Vile Sting", "scorpid", 35, "Thousand Needles", { rare: true, elite: true, teaches: ["Claw 5", "Scorpid Poison 2"] }),
  b("Scorpid Hunter", "scorpid", [40, 41], "Tanaris", { teaches: ["Claw 6", "Scorpid Poison 3"] }),
  b("Firetail Scorpid", "scorpid", [56, 57], "Burning Steppes", { teaches: ["Scorpid Poison 4"] }),

  // ── Foxes
  b("Slydris", "fox", 6, "Zephras Isle", { rare: true, elite: true, isNew: true, note: "Rare golden fox. Zephras also has three ordinary foxes." }),
];

export const PET_SOURCES = [
  { name: "foreverchanges.pro: hunter pets", url: "https://foreverchanges.pro/hunter-pets", what: "Family modifiers, ability ranks, which beasts teach them" },
  { name: "wofwforever.com: best hunter pets", url: "https://wofwforever.com/en/guides/wow-forever-best-hunter-pets/", what: "Furious Howl numbers (9 Nov), recommendations, pet talents" },
  { name: "allthings.how: every pet family", url: "https://allthings.how/wow-forever-hunter-pets/", what: "Families, diets, Core Hound, November hotfixes" },
  { name: "mmonster: rare pets and tier list", url: "https://mmonster.co/wow-forever/guides/hunter-pets/rare-pets", what: "Rare beasts, attack speeds, damage tiers" },
  { name: "Mobalytics: hunter pets", url: "https://mobalytics.gg/wow-forever/guides/hunter-pets", what: "Taming spots, recommendations, taming rules" },
  { name: "The Forever Tavern: hunter pets", url: "https://theforevertavern.com/hunter-pets", what: "Cat taming table" },
  { name: "Forever Companion: rares", url: "https://forevercompanion.io", what: "Rare coordinates" },
];
