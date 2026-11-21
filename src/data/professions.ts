/** Hand-curated profession data for WoW Forever (research report, Nov 2026). */

export interface SkillThresholds {
  /** Orange: always gives a skill-up. */ orange: number;
  /** Yellow: usually gives a skill-up. */ yellow?: number;
  /** Green: sometimes gives a skill-up. */ green?: number;
  /** Grey: never gives a skill-up. */ grey?: number;
}

export interface MiningNode extends SkillThresholds {
  name: string;
  where: string;
  isNew?: boolean;
}

const MINING_SRC = "https://warcraft.wiki.gg/wiki/Forever_mining_techniques";
const ENG_SRC = "https://www.wowhead.com/forever/profession-leveling-guides/engineering";
const ENG_OVERVIEW = "https://www.warcrafttavern.com/forever/guides/engineering/";
export const PROFESSION_SOURCES = { mining: MINING_SRC, engineering: ENG_SRC, engineeringOverview: ENG_OVERVIEW };

export const MINING_NODES: MiningNode[] = [
  { name: "Copper Vein", orange: 1, yellow: 25, green: 50, grey: 100, where: "Starting zones and the Barrens. Can yield Pyrite." },
  { name: "Tin Vein", orange: 65, yellow: 90, green: 115, grey: 165, where: "Westfall, Redridge, the Barrens, Stonetalon. Can yield Pyrite." },
  { name: "Silver Vein", orange: 75, yellow: 100, green: 125, grey: 175, where: "Rare spawn in tin areas. Can yield Pyrite." },
  { name: "Iron Deposit", orange: 125, yellow: 150, green: 175, grey: 225, where: "Arathi Highlands, Desolace, Stranglethorn. Can yield Bauxite." },
  { name: "Gold Vein", orange: 155, where: "Rare spawn in iron areas." },
  { name: "Mithril Deposit", orange: 175, yellow: 200, green: 225, grey: 275, where: "Hinterlands, Tanaris, Badlands. Can yield Bauxite." },
  { name: "Truesilver Deposit", orange: 230, yellow: 255, green: 280, grey: 330, where: "Rare spawn in mithril and thorium areas." },
  { name: "Dark Iron Deposit", orange: 230, where: "Burning Steppes and Searing Gorge." },
  { name: "Small Thorium Vein", orange: 245, yellow: 270, green: 295, grey: 345, where: "Un'Goro, Felwood, Winterspring, Burning Steppes." },
  { name: "Rich Thorium Vein", orange: 275, yellow: 300, green: 325, grey: 375, where: "Un'Goro, Silithus, Eastern Plaguelands, Winterspring." },
  { name: "Heavy Thorium Ore", orange: 300, where: "Mount Hyjal (new zone).", isNew: true },
];

export interface Smelt { bar: string; skill: number; note?: string; isNew?: boolean }
export const SMELTING: Smelt[] = [
  { bar: "Copper Bar", skill: 1 }, { bar: "Tin Bar", skill: 65 }, { bar: "Bronze Bar", skill: 65 },
  { bar: "Silver Bar", skill: 75 }, { bar: "Iron Bar", skill: 125 }, { bar: "Gold Bar", skill: 155 },
  { bar: "Steel Bar", skill: 165 }, { bar: "Mithril Bar", skill: 175 }, { bar: "Truesilver Bar", skill: 230 },
  { bar: "Dark Iron Bar", skill: 230, note: "Needs the Black Forge in Blackrock Depths." },
  { bar: "Thorium Bar", skill: 250 },
  { bar: "Azerothium Bar", skill: 275, note: "2 Pitchblende + Coal.", isNew: true },
  { bar: "Heavy Thorium Bar", skill: 300, note: "Needs the Molten Foundry camp station or a dungeon forge.", isNew: true },
  { bar: "Legionite Bar", skill: 300, note: "Skill requirement not yet confirmed.", isNew: true },
];

export const MINING_EXTRAS = [
  { skill: 20, title: "Lodestone (camp)", detail: "Camp item that gives a melee attack power buff.", isNew: true },
  { skill: 140, title: "Rock Garden (camp)", detail: "Camp item that spawns a mining node at your campsite.", isNew: true },
  { skill: 300, title: "Molten Foundry (camp)", detail: "Camp station for smelting the new high-end bars.", isNew: true },
];

export interface EngStep { from: number; to: number; craft: string; note?: string; hunter?: boolean }
/** Wowhead Forever's 1-300 path (same recipes as Classic). */
export const ENGINEERING_PATH: EngStep[] = [
  { from: 1, to: 30, craft: "Rough Blasting Powder" },
  { from: 30, to: 50, craft: "Handful of Copper Bolts", note: "Make an Arclight Spanner at 50; you need it for most recipes." },
  { from: 51, to: 75, craft: "Rough Copper Bomb" },
  { from: 75, to: 90, craft: "Coarse Blasting Powder" },
  { from: 90, to: 100, craft: "Coarse Dynamite" },
  { from: 100, to: 105, craft: "Silver Contact" },
  { from: 105, to: 125, craft: "Bronze Tube" },
  { from: 125, to: 135, craft: "Standard Scope", note: "A scope for your bow or gun.", hunter: true },
  { from: 135, to: 150, craft: "Whirring Bronze Gizmo" },
  { from: 150, to: 160, craft: "Bronze Framework" },
  { from: 160, to: 175, craft: "Explosive Sheep" },
  { from: 175, to: 194, craft: "Solid Blasting Powder" },
  { from: 194, to: 195, craft: "Gyromatic Micro-Adjustor" },
  { from: 195, to: 200, craft: "Mithril Tube" },
  { from: 200, to: 215, craft: "Unstable Trigger", note: "Pick Goblin or Gnomish at 200." },
  { from: 215, to: 238, craft: "Mithril Casing" },
  { from: 238, to: 250, craft: "Hi-Explosive Bomb" },
  { from: 250, to: 260, craft: "Dense Blasting Powder" },
  { from: 260, to: 285, craft: "Thorium Widget", note: "Schematic bought from a vendor." },
  { from: 285, to: 300, craft: "Thorium Tube" },
];

export const ENGINEERING_SPECS = [
  { name: "Goblin Engineering", detail: "Explosives and chaos: Dimensional Ripper - Everlook, The Big One.", requires: 200 },
  { name: "Gnomish Engineering", detail: "Gadgets: Ultrasafe Transporter: Gadgetzan, World Enlarger, Gnomish Mind Control Cap.", requires: 200 },
];

export const ENGINEERING_FOREVER = [
  { title: "Saf T explosives", detail: "Saf T Dynamite and Saf T Copper Bomb can be used by non-engineers, so you can sell them." },
  { title: "Satchel of Copper Bombs", detail: "Goes in the thrown slot and needs no ammo." },
  { title: "Clanking Cord belts", detail: "A belt for every armour type." },
  { title: "Camp stations", detail: "Reagent Bot (tier 1), Repair Bot (tier 2) and the Anarchist's Workbench (tier 3), which some high recipes need." },
  { title: "Legacy perks", detail: "Working Overtime (+10% skill-up chance) and Dedicated Study (a free skill point every 23 hours)." },
  { title: "Gnome racial change", detail: "Gnomes now have less chance of gadget backfires instead of +15 skill." },
];

/** Profession tier caps and the character level each tier needs. */
export const PROFESSION_TIERS = [
  { name: "Apprentice", cap: 75, level: 5 },
  { name: "Journeyman", cap: 150, level: 10 },
  { name: "Expert", cap: 225, level: 20 },
  { name: "Artisan", cap: 300, level: 35 },
];

export function maxSkillForLevel(level: number): number {
  let cap = 0;
  for (const t of PROFESSION_TIERS) if (level >= t.level) cap = t.cap;
  return cap;
}

export type Difficulty = "orange" | "yellow" | "green" | "grey";
export function nodeDifficulty(node: SkillThresholds, skill: number): Difficulty | "red" {
  if (skill < node.orange) return "red";
  if (node.grey !== undefined && skill >= node.grey) return "grey";
  if (node.green !== undefined && skill >= node.green) return "green";
  if (node.yellow !== undefined && skill >= node.yellow) return "yellow";
  return "orange";
}
