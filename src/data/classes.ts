export type ClassId =
  | "warrior" | "paladin" | "hunter" | "rogue" | "priest"
  | "shaman" | "mage" | "warlock" | "druid";

export type Faction = "alliance" | "horde";

export interface ClassInfo {
  id: ClassId;
  name: string;
  /** Class colour used for names, tuned for contrast on stone. */
  color: string;
  /** Bit in the item class mask (1 << (classId - 1)). */
  maskBit: number;
  /** Armour types the class can wear and the level each unlocks. */
  armor: Record<string, number>;
  /** Weapon proficiencies (item subclass names) the class can use. */
  weapons: string[];
  /** Ranged slot item subclasses the class uses. */
  ranged: string[];
  canDualWield: number | null;
  /** Rough stat weights used to rank gear, per point (hit and crit are ratings in Forever item data). */
  weights: Partial<Record<StatKey, number>>;
  /** Whether the app has a full spell-by-level timeline for this class. */
  detailedGuidance: boolean;
}

export type StatKey =
  | "agility" | "strength" | "stamina" | "intellect" | "spirit"
  | "attack_power" | "ranged_attack_power" | "hit" | "crit" | "haste"
  | "spell_power" | "healing" | "spell_damage" | "mp5" | "defense"
  | "dodge" | "parry" | "block" | "block_value" | "bonus_armor"
  | "fire_res" | "frost_res" | "nature_res" | "shadow_res" | "arcane_res";

const phys = ["One-Handed Axe", "Two-Handed Axe", "One-Handed Mace", "Two-Handed Mace", "One-Handed Sword", "Two-Handed Sword", "Polearm", "Staff", "Dagger", "Fist Weapon"];

export const CLASSES: Record<ClassId, ClassInfo> = {
  warrior: {
    id: "warrior", name: "Warrior", color: "#C69B6D", maskBit: 1,
    armor: { Cloth: 1, Leather: 1, Mail: 1, Plate: 40, Shield: 1 },
    weapons: phys, ranged: ["Bow", "Gun", "Crossbow", "Thrown"], canDualWield: 20,
    weights: { strength: 2, agility: 1.4, attack_power: 1, hit: 1.5, crit: 1.6, stamina: 0.5 },
    detailedGuidance: false,
  },
  paladin: {
    id: "paladin", name: "Paladin", color: "#F48CBA", maskBit: 2,
    armor: { Cloth: 1, Leather: 1, Mail: 1, Plate: 40, Shield: 1 },
    weapons: ["One-Handed Axe", "Two-Handed Axe", "One-Handed Mace", "Two-Handed Mace", "One-Handed Sword", "Two-Handed Sword", "Polearm"],
    ranged: [], canDualWield: null,
    weights: { strength: 2, agility: 1, attack_power: 1, hit: 1.5, crit: 1.6, stamina: 0.6, intellect: 0.6, spell_power: 0.8 },
    detailedGuidance: false,
  },
  hunter: {
    id: "hunter", name: "Hunter", color: "#ABD473", maskBit: 4,
    armor: { Cloth: 1, Leather: 1, Mail: 40 },
    weapons: ["One-Handed Axe", "Two-Handed Axe", "One-Handed Sword", "Two-Handed Sword", "Polearm", "Staff", "Dagger", "Fist Weapon"],
    ranged: ["Bow", "Gun", "Crossbow"], canDualWield: 20,
    // Agility gives ranged AP and crit; AP items feed both ranged and pet (pets scale from 10% of hunter AP in Forever).
    weights: { agility: 2, ranged_attack_power: 1, attack_power: 1, hit: 1.5, crit: 1.6, stamina: 0.5, intellect: 0.4, mp5: 1, strength: 0.1 },
    detailedGuidance: true,
  },
  rogue: {
    id: "rogue", name: "Rogue", color: "#FFF468", maskBit: 8,
    armor: { Cloth: 1, Leather: 1 },
    weapons: ["One-Handed Mace", "One-Handed Sword", "Dagger", "Fist Weapon"],
    ranged: ["Bow", "Gun", "Crossbow", "Thrown"], canDualWield: 1,
    weights: { agility: 2, strength: 1, attack_power: 1, hit: 1.5, crit: 1.6, stamina: 0.4 },
    detailedGuidance: false,
  },
  priest: {
    id: "priest", name: "Priest", color: "#F0F0F0", maskBit: 16,
    armor: { Cloth: 1 }, weapons: ["One-Handed Mace", "Staff", "Dagger"], ranged: ["Wand"], canDualWield: null,
    weights: { intellect: 1, spirit: 0.9, spell_power: 1.2, healing: 0.9, spell_damage: 1, mp5: 2, stamina: 0.4, crit: 0.8 },
    detailedGuidance: false,
  },
  shaman: {
    id: "shaman", name: "Shaman", color: "#3E9BFF", maskBit: 64,
    armor: { Cloth: 1, Leather: 1, Mail: 40, Shield: 1 },
    weapons: ["One-Handed Axe", "Two-Handed Axe", "One-Handed Mace", "Two-Handed Mace", "Staff", "Dagger", "Fist Weapon"],
    ranged: [], canDualWield: null,
    weights: { strength: 1.5, agility: 1.2, attack_power: 1, intellect: 0.8, spell_power: 1, mp5: 1.5, crit: 0.8, hit: 1, stamina: 0.5 },
    detailedGuidance: false,
  },
  mage: {
    id: "mage", name: "Mage", color: "#3FC7EB", maskBit: 128,
    armor: { Cloth: 1 }, weapons: ["One-Handed Sword", "Staff", "Dagger"], ranged: ["Wand"], canDualWield: null,
    weights: { intellect: 1, spirit: 0.5, spell_power: 1.2, spell_damage: 1.2, mp5: 1.5, stamina: 0.4, crit: 0.8, hit: 1 },
    detailedGuidance: false,
  },
  warlock: {
    id: "warlock", name: "Warlock", color: "#A98BEF", maskBit: 256,
    armor: { Cloth: 1 }, weapons: ["One-Handed Sword", "Staff", "Dagger"], ranged: ["Wand"], canDualWield: null,
    weights: { intellect: 0.8, spirit: 0.4, stamina: 0.8, spell_power: 1.2, spell_damage: 1.2, mp5: 1, crit: 0.8, hit: 1 },
    detailedGuidance: false,
  },
  druid: {
    id: "druid", name: "Druid", color: "#FF7C0A", maskBit: 1024,
    armor: { Cloth: 1, Leather: 1 }, weapons: ["One-Handed Mace", "Two-Handed Mace", "Staff", "Dagger", "Fist Weapon"],
    ranged: [], canDualWield: null,
    weights: { agility: 1.4, strength: 1.4, intellect: 0.8, spirit: 0.5, spell_power: 1, healing: 0.8, mp5: 1.5, stamina: 0.6, attack_power: 1, crit: 0.8 },
    detailedGuidance: false,
  },
};

export const CLASS_LIST = Object.values(CLASSES);

export const PROFESSIONS = [
  "Alchemy", "Blacksmithing", "Enchanting", "Engineering", "Herbalism", "Leatherworking",
  "Mining", "Skinning", "Tailoring", "Cooking", "First Aid", "Fishing",
] as const;
export type Profession = (typeof PROFESSIONS)[number];
