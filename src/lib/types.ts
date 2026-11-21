/** Shapes returned by the Forever Companion API (https://forevercompanion.io/api/v1). */
export type Quality = "poor" | "common" | "uncommon" | "rare" | "epic" | "legendary";

export interface Dungeon {
  id: string;
  name: string;
  minLevel: number;
  maxLevel: number;
  zone: string;
  entrance: string;
  access: "horde" | "alliance" | null;
  isNew: boolean;
  status: "launch" | "announced" | string;
  betaLocked: boolean;
  bosses: string[];
  questCount: number;
  lootCount: number;
  url: string;
}

export interface LootEntry {
  itemId: number;
  name: string;
  slot: string;
  quality: Quality;
  source: string;
}

export interface DungeonDetail extends Dungeon {
  quests: Quest[];
  loot: LootEntry[];
  notes?: string[] | string | null;
}

export interface Quest {
  questId: number;
  type: "dungeon" | "elite" | string;
  name: string;
  level: number;
  minLevel: number;
  faction: "horde" | "alliance" | "both" | null;
  classes: string[] | null;
  xp: number | null;
  xpEstimated: boolean;
  dungeon: { id: string; name: string } | null;
  zone: string | null;
  giver: string | null;
  location: string | null;
  objective: string | null;
  rewards: { items: { id: number; name: string }[]; choice: boolean };
  prerequisites: { questId: number; name: string }[][] | null;
  confidence: string;
  verified: { players: number; facts: string[] } | null;
  wowhead: string;
  url: string;
}

export interface ApiItem {
  id: number;
  name: string;
  quality: Quality;
  icon: string;
  itemLevel: number;
  requiredLevel: number;
  slot: string;
  armor: string | null;
  weaponType: string | null;
  stats: string[];
  classicOnly: boolean;
  verified: unknown;
  wowhead: string;
}

export interface Rare {
  id: string;
  name: string;
  zone: string;
  levels: string;
  faction: string;
  coords: string[];
  elite: boolean;
  tameable: string | null;
  loot: { id?: number; itemId?: number; name: string }[];
  verified: unknown;
}

export interface Zone {
  id: string;
  name: string;
  minLevel: number;
  maxLevel: number;
  faction: "horde" | "alliance" | "contested" | "both" | null;
  isNew: boolean;
  race: string | null;
}

export interface ClassQuest {
  id: string;
  class: string;
  level: number;
  name: string;
  faction: "horde" | "alliance" | "both";
  races: string[] | null;
  giver: string | null;
  location: string | null;
  reward: string;
  essential: boolean;
}

export interface Reputation {
  id: string;
  name: string;
  factionNames?: Record<string, string>;
  minLevel?: number;
  currency?: string;
  summary?: string;
  howTo?: string[];
  [k: string]: unknown;
}

export interface ApiMeta {
  updatedAt: string;
  attribution: string;
}
