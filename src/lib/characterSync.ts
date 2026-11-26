/**
 * Turns public WoW Forever character data into the small character record the app keeps.
 * No imports, so the Node sync script (scripts/sync-character.ts) can load this file directly.
 *
 * Sources, both public and keyless:
 *   Raider.IO   forever.raider.io/api/v1/characters/profile?fields=gear,talents,guild
 *               level, class, race, faction, guild, equipped gear, talent points per tree. Crawled from the Armory.
 *   BattlePost  battlepost.net/en/{region}/armory/{name-surname}
 *               level, average item level and main talent tree, read live from the Armory when the page is opened.
 *               Usually fresher than Raider.IO, which re-reads characters every few days.
 *   ForeverDB   foreverdb.net/armory/{region}/{realm}/{name}
 *               profession skills, from the ForeverDB addon when the player uploads with it.
 */

export type SyncClassId = "warrior" | "paladin" | "hunter" | "rogue" | "priest" | "shaman" | "mage" | "warlock" | "druid";

export interface SyncedItem {
  slot: string;
  id: number;
  name: string;
  quality: string;
}

/** A weapon's own damage range and swing time (from its item tooltip, before attack power). */
export interface WeaponInfo {
  id: number;
  name: string;
  min: number;
  max: number;
  speed: number;
}

export interface SheetWeapon {
  /** Damage per swing or shot as the character sheet shows it, attack power included. */
  min: number;
  max: number;
  speed: number | null;
}

/** The character sheet as BattlePost shows it: at last logout, with gear and buffs, talents included. */
export interface CharacterSheet {
  strength: number;
  agility: number;
  stamina: number;
  intellect: number;
  spirit: number;
  /** Stats before gear and buffs, when the page shows them. */
  base?: { strength: number; agility: number; stamina: number; intellect: number; spirit: number } | null;
  health: number | null;
  mana: number | null;
  meleeAp: number;
  mainHand: SheetWeapon | null;
  offHand: SheetWeapon | null;
  meleeCrit: number;
  meleeHit: number;
  rangedAp: number;
  ranged: SheetWeapon | null;
  rangedCrit: number;
  rangedHit: number;
  /** Ranged attack speed bonus, in percent (quiver, ammo pouch). */
  rangedHaste: number;
  armor: number | null;
  dodge: number | null;
  parry: number | null;
}

export interface SyncedCharacter {
  name: string;
  region: string;
  realm: string;
  classId: SyncClassId | null;
  className: string;
  race: string;
  level: number;
  faction: "horde" | "alliance";
  guild: string | null;
  itemLevel: number | null;
  /** Profession name → current skill. */
  professions: Record<string, number>;
  /** Profession name → highest skill the current rank allows. */
  professionMax: Record<string, number>;
  /** Tree name → points spent. */
  talents: Record<string, number>;
  equipment: SyncedItem[];
  /** When a source last saw the character (ISO). */
  lastSeen: string | null;
  /** Main talent tree and total points spent, from BattlePost. */
  spec?: { name: string; points: number } | null;
  /** Character sheet stats from BattlePost, when it is the live source. */
  sheet?: CharacterSheet | null;
  /** Talent name → rank, from BattlePost. */
  talentRanks?: Record<string, number> | null;
  /** Equipped weapons' own damage and speed, from their item tooltips. */
  weapons?: { mainHand?: WeaponInfo; offHand?: WeaponInfo; ranged?: WeaponInfo } | null;
  /** When the gear and talent split were read (Raider.IO's last crawl, or BattlePost when it is live; ISO). */
  gearFrom?: string | null;
  /** When the professions were last read, if ever (ISO). */
  professionsFrom: string | null;
  /** Links to the character on each source that answered. */
  links: { label: string; url: string }[];
  /** When this record was fetched (ISO). */
  syncedAt: string;
}

export interface HistoryPoint {
  date: string;
  level: number;
  professions: Record<string, number>;
}

export interface CharacterFile {
  character: SyncedCharacter | null;
  history: HistoryPoint[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = any;

const CLASS_IDS: SyncClassId[] = ["warrior", "paladin", "hunter", "rogue", "priest", "shaman", "mage", "warlock", "druid"];

/** Talent trees in the order Raider.IO's pointAllocation lists them. */
export const TREES: Record<SyncClassId, [string, string, string]> = {
  warrior: ["Arms", "Fury", "Protection"],
  paladin: ["Holy", "Protection", "Retribution"],
  hunter: ["Beast Mastery", "Marksmanship", "Survival"],
  rogue: ["Assassination", "Combat", "Subtlety"],
  priest: ["Discipline", "Holy", "Shadow"],
  shaman: ["Elemental", "Enhancement", "Restoration"],
  mage: ["Arcane", "Fire", "Frost"],
  warlock: ["Affliction", "Demonology", "Destruction"],
  druid: ["Balance", "Feral Combat", "Restoration"],
};

const QUALITY = ["poor", "common", "uncommon", "rare", "epic", "legendary", "artifact", "heirloom"];

const SLOT_LABEL: Record<string, string> = {
  head: "Head", neck: "Neck", shoulder: "Shoulder", back: "Back", chest: "Chest", shirt: "Shirt", tabard: "Tabard",
  wrist: "Wrist", hands: "Hands", waist: "Waist", legs: "Legs", feet: "Feet", finger1: "Finger", finger2: "Finger",
  trinket1: "Trinket", trinket2: "Trinket", mainhand: "Main hand", offhand: "Off hand", ranged: "Ranged",
};

export function classIdFromName(name: string): SyncClassId | null {
  const id = name.trim().toLowerCase() as SyncClassId;
  return CLASS_IDS.includes(id) ? id : null;
}

export function raiderIoUrl(region: string, realm: string, name: string): string {
  const q = new URLSearchParams({ region: region.toLowerCase(), realm: realm.toLowerCase(), name, fields: "gear,talents,guild" });
  return `https://forever.raider.io/api/v1/characters/profile?${q}`;
}

/** The Raider.IO profile: everything except professions. */
export function parseRaiderIo(json: Json) {
  const className = String(json?.class ?? "");
  const classId = classIdFromName(className);
  const items: Record<string, Json> = json?.gear?.items ?? {};
  const equipment: SyncedItem[] = Object.entries(items)
    .map(([slot, it]) => ({
      slot: SLOT_LABEL[slot] ?? slot,
      id: Number(it?.item_id ?? 0),
      name: String(it?.name ?? ""),
      quality: QUALITY[Number(it?.item_quality)] ?? "common",
    }))
    .filter((it) => it.id > 0);
  const alloc: number[] = json?.talentLoadout?.spec?.pointAllocation ?? json?.talentLoadout?.pointAllocation ?? [];
  const talents: Record<string, number> = {};
  if (classId && alloc.length) TREES[classId].forEach((tree, i) => (talents[tree] = Number(alloc[i]) || 0));
  const ilvl = Number(json?.gear?.item_level_equipped);
  return {
    name: String(json?.name ?? ""),
    realm: String(json?.realm ?? ""),
    className,
    classId,
    race: String(json?.race ?? ""),
    level: Number(json?.level) || 1,
    faction: (String(json?.faction ?? "").toLowerCase() === "alliance" ? "alliance" : "horde") as "horde" | "alliance",
    guild: json?.guild?.name ? String(json.guild.name) : null,
    itemLevel: Number.isFinite(ilvl) && ilvl > 0 ? ilvl : null,
    talents,
    equipment,
    lastSeen: json?.last_crawled_at ? String(json.last_crawled_at) : null,
    url: json?.profile_url ? String(json.profile_url) : null,
  };
}

const decode = (s: string) =>
  s.replace(/&#x27;|&#0*39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

/** Character page links on a ForeverDB armory search page, e.g. "/armory/eu/pve/Name". */
export function foreverDbLinks(html: string): string[] {
  return [...new Set([...html.matchAll(/href="(\/armory\/(?:eu|us|kr|tw)\/[^"/]+\/[^"/]+)"/g)].map((m) => m[1]))];
}

/** Pick the link for this character: same region and name, ignoring case and spaces. */
export function pickForeverDbLink(links: string[], region: string, name: string): string | null {
  const want = name.toLowerCase().replace(/[\s-]+/g, "");
  return links.find((l) => {
    const [, , r, , n] = l.split("/");
    return r === region.toLowerCase() && decodeURIComponent(n).toLowerCase().replace(/[\s-]+/g, "") === want;
  }) ?? null;
}

/** Profession skills from a ForeverDB character page ("Mining 190/225" items under the Professions heading). */
export function parseForeverDbProfessions(html: string): { professions: Record<string, number>; professionMax: Record<string, number> } {
  const professions: Record<string, number> = {};
  const professionMax: Record<string, number> = {};
  const section = html.match(/<h2>\s*Professions\s*<\/h2>\s*<ul[^>]*>([\s\S]*?)<\/ul>/i);
  if (section) {
    for (const m of section[1].matchAll(/<li>([^<]+?)\s+(\d+)\s*\/\s*(\d+)\s*<\/li>/g)) {
      const name = decode(m[1]);
      professions[name] = Number(m[2]);
      professionMax[name] = Number(m[3]);
    }
  }
  return { professions, professionMax };
}

export function battlePostUrl(region: string, name: string): string {
  return `https://battlepost.net/en/${region.toLowerCase()}/armory/${name.trim().toLowerCase().replace(/\s+/g, "-")}`;
}

/** "16h ago", "3d ago", "just now" → milliseconds. */
function agoMs(text: string): number | null {
  if (/just now/i.test(text)) return 0;
  const m = text.match(/(\d+)\s*(m|min|h|d|w)\b/i);
  if (!m) return null;
  const unit = { m: 60e3, min: 60e3, h: 3600e3, d: 86400e3, w: 604800e3 }[m[2].toLowerCase() as "m"];
  return Number(m[1]) * unit;
}

/** Level, item level, main tree and last logout from a BattlePost character page. */
function battlePostText(html: string): string[] {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "")
    .split(/<[^>]+>/).map((x) => decode(x)).filter(Boolean);
}

export function parseBattlePost(html: string, now = new Date()) {
  const text = battlePostText(html);
  const head = text.find((t) => /^Lv \d+ /.test(t));
  if (!head) return null;
  const level = Number(head.match(/^Lv (\d+)/)![1]);
  const ilvlIdx = text.indexOf("Avg iLvl");
  const ilvl = ilvlIdx > 0 ? Number(text[ilvlIdx - 1]) : NaN;
  const specIdx = text.indexOf("Spec");
  const specName = specIdx >= 0 ? text[specIdx + 1] : null;
  const pts = specIdx >= 0 ? text[specIdx + 2]?.match(/^(\d+) pts$/) : null;
  const seenIdx = text.indexOf("Last seen");
  const ago = seenIdx >= 0 ? agoMs(text[seenIdx + 1] ?? "") : null;
  return {
    level,
    itemLevel: Number.isFinite(ilvl) && ilvl > 0 ? ilvl : null,
    spec: specName && pts ? { name: specName, points: Number(pts[1]) } : null,
    lastSeen: ago === null ? null : new Date(now.getTime() - ago).toISOString(),
  };
}

const QUALITY_BY_CLASS = ["poor", "common", "uncommon", "rare", "epic", "legendary"];
const num = (s: string | undefined) => {
  const m = s?.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : NaN;
};

/** Average item level of equipped gear, leaving out shirts and tabards, rounded to one decimal. Null if no item is known. */
export function averageItemLevel(equipment: SyncedItem[], levels: Map<number, number>): number | null {
  const known = equipment
    .filter((e) => !/shirt|tabard/i.test(e.slot))
    .map((e) => levels.get(e.id))
    .filter((v): v is number => typeof v === "number" && v > 0);
  return known.length ? Math.round((known.reduce((a, b) => a + b, 0) / known.length) * 10) / 10 : null;
}

/** Equipped gear from a BattlePost page: slot, item id, name and quality, in page order. */
export function parseBattlePostGear(html: string): SyncedItem[] {
  const out: SyncedItem[] = [];
  // The slot label is "Head" or, on older pages, "Head · 37" with the item level after it.
  const re = /href="[^"]*item=(\d+)[^"]*"[^>]*>[\s\S]*?<b class="q(\d)">([^<]+)<\/b><small>([^<·]+?)\s*(?:·[^<]*)?<\/small>/g;
  for (const m of html.matchAll(re)) {
    out.push({ slot: decode(m[4]), id: Number(m[1]), name: decode(m[3]), quality: QUALITY_BY_CLASS[Number(m[2])] ?? "common" });
  }
  return out;
}

/** BattlePost's talent panel: talent name → rank, and points per tree. */
export function parseBattlePostTalents(text: string[]): { ranks: Record<string, number>; trees: Record<string, number> } {
  const ranks: Record<string, number> = {};
  for (let i = 1; i < text.length; i++) {
    const m = text[i].match(/^Rank (\d+)\/(\d+)$/);
    if (m && Number(m[1]) > 0) ranks[text[i - 1]] = Number(m[1]);
  }
  const trees: Record<string, number> = {};
  // The talent panel's header is the last "Talents" before "Spent" (the site menu has one too).
  const end = text.indexOf("Spent");
  const start = end >= 0 ? text.lastIndexOf("Talents", end) : -1;
  if (start >= 0 && end > start) {
    for (let i = start + 1; i + 1 < end; i += 2) {
      if (/^\d+$/.test(text[i + 1])) trees[text[i]] = Number(text[i + 1]);
    }
  }
  return { ranks, trees };
}

/** The Stats tab of a BattlePost page. Null if it isn't there. */
export function parseBattlePostSheet(text: string[]): CharacterSheet | null {
  const start = text.findIndex((t) => /^As of last logout/.test(t));
  if (start < 0) return null;
  const t = text.slice(start);
  const after = (label: string, from = 0) => {
    const i = t.indexOf(label, from);
    return i >= 0 ? t[i + 1] : undefined;
  };
  const section = (label: string) => Math.max(0, t.indexOf(label));
  const melee = section("Melee"), ranged = section("Ranged"), def = section("Defense");
  const weapon = (s: string | undefined): SheetWeapon | null => {
    const m = s?.match(/([\d,]+)\s*[–-]\s*([\d,]+)(?:\s*·\s*speed\s*([\d.]+))?/);
    return m ? { min: num(m[1]), max: num(m[2]), speed: m[3] ? Number(m[3]) : null } : null;
  };
  const n = (label: string, from = 0) => num(after(label, from));
  const baseOf = (label: string) => num(after(label)?.match(/base\s+([\d,]+)/)?.[1]);
  const base = { strength: baseOf("Strength"), agility: baseOf("Agility"), stamina: baseOf("Stamina"), intellect: baseOf("Intellect"), spirit: baseOf("Spirit") };
  const sheet: CharacterSheet = {
    strength: n("Strength"), agility: n("Agility"), stamina: n("Stamina"), intellect: n("Intellect"), spirit: n("Spirit"),
    base: Object.values(base).every(Number.isFinite) ? base : null,
    health: n("Health") || null, mana: n("Mana") || null,
    meleeAp: n("Attack power", melee), mainHand: weapon(after("Main hand", melee)), offHand: weapon(after("Off hand", melee)),
    meleeCrit: n("Crit", melee), meleeHit: n("Hit", melee) || 0,
    rangedAp: n("Ranged attack power", ranged), ranged: weapon(after("Ranged weapon", ranged)),
    rangedCrit: n("Crit", ranged), rangedHit: n("Hit", ranged) || 0, rangedHaste: n("Haste", ranged) || 0,
    armor: n("Armor", def) || null, dodge: n("Dodge", def) || null, parry: n("Parry", def) || null,
  };
  return Number.isFinite(sheet.agility) && Number.isFinite(sheet.rangedAp) ? sheet : null;
}

/** A weapon's damage and speed from a Wowhead tooltip's text. */
export function parseWeaponTooltip(id: number, name: string, tooltipHtml: string): WeaponInfo | null {
  const text = decode(tooltipHtml.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
  const m = text.match(/(\d+)\s*-\s*(\d+)\s+Damage\s+Speed\s+([\d.]+)/);
  return m ? { id, name, min: Number(m[1]), max: Number(m[2]), speed: Number(m[3]) } : null;
}

export interface SyncInputs {
  raiderIo: Json;
  /** BattlePost character page, if it answered. */
  battlePost?: { html: string; url: string } | null;
  /** Equipped weapons' damage and speed, if their tooltips were read. */
  weapons?: SyncedCharacter["weapons"];
  /** ForeverDB character page, if it was found. */
  foreverDb?: { html: string; url: string } | null;
  region: string;
  /** The previous record, to keep professions when ForeverDB has nothing new. */
  previous?: SyncedCharacter | null;
  now?: Date;
}

export function buildCharacter({ raiderIo, battlePost, foreverDb, weapons, region, previous, now = new Date() }: SyncInputs): SyncedCharacter {
  const r = parseRaiderIo(raiderIo);
  const links: { label: string; url: string }[] = [];
  if (r.url) links.push({ label: "Raider.IO", url: r.url });
  // BattlePost reads the Armory when asked, so when it's at least as far along it wins for level and item level.
  const bp = battlePost ? parseBattlePost(battlePost.html, now) : null;
  const live = bp && bp.level >= r.level ? bp : null;
  // BattlePost's gear, talents and character sheet are read at the same time as its level, so they come with it.
  const bpText = live && battlePost ? battlePostText(battlePost.html) : null;
  const bpGear = live && battlePost ? parseBattlePostGear(battlePost.html) : [];
  const bpTalents = bpText ? parseBattlePostTalents(bpText) : null;
  const sheet = bpText ? parseBattlePostSheet(bpText) : null;
  if (bp && battlePost) links.push({ label: "BattlePost", url: battlePost.url });
  const prof = foreverDb ? parseForeverDbProfessions(foreverDb.html) : { professions: {}, professionMax: {} };
  const haveProfs = Object.keys(prof.professions).length > 0;
  if (foreverDb) links.push({ label: "ForeverDB", url: foreverDb.url });
  const { url: _url, ...rest } = r;
  void _url;
  // When BattlePost has no gear this time, the last sync's gear is still newer than Raider.IO's if it was read later.
  const keep = !bpGear.length && previous?.gearFrom && r.lastSeen && previous.gearFrom > r.lastSeen ? previous : null;
  return {
    ...rest,
    level: live?.level ?? r.level,
    itemLevel: live?.itemLevel ?? keep?.itemLevel ?? (bpGear.length && previous?.itemLevel ? previous.itemLevel : r.itemLevel),
    lastSeen: live?.lastSeen ?? r.lastSeen,
    spec: live?.spec ?? null,
    equipment: bpGear.length ? bpGear : keep?.equipment ?? r.equipment,
    talents: bpTalents && Object.keys(bpTalents.trees).length ? bpTalents.trees : keep?.talents ?? r.talents,
    talentRanks: bpTalents && Object.keys(bpTalents.ranks).length ? bpTalents.ranks : null,
    sheet,
    weapons: weapons ?? null,
    gearFrom: bpGear.length ? live?.lastSeen ?? r.lastSeen : keep?.gearFrom ?? r.lastSeen,
    region: region.toUpperCase(),
    professions: haveProfs ? prof.professions : previous?.professions ?? {},
    professionMax: haveProfs ? prof.professionMax : previous?.professionMax ?? {},
    professionsFrom: haveProfs ? now.toISOString() : previous?.professionsFrom ?? null,
    links,
    syncedAt: now.toISOString(),
  };
}

/** The parts that count as a change; timestamps alone don't. */
export function fingerprint(c: SyncedCharacter | null): string {
  if (!c) return "";
  // The sheet moves with buffs at logout, so on its own it isn't a change; gear and talent changes still are.
  const { syncedAt: _a, lastSeen: _b, professionsFrom: _c, gearFrom: _d, sheet: _e, weapons: _f, ...rest } = c;
  void _a; void _b; void _c; void _d; void _e; void _f;
  return JSON.stringify(rest);
}

/** Add today's level and skills to the history if anything moved since the last point. Keeps one point per day. */
export function appendHistory(history: HistoryPoint[], c: SyncedCharacter): HistoryPoint[] {
  const point: HistoryPoint = { date: c.syncedAt.slice(0, 10), level: c.level, professions: { ...c.professions } };
  const last = history[history.length - 1];
  const same = last && last.level === point.level && JSON.stringify(last.professions) === JSON.stringify(point.professions);
  if (same) return history;
  if (last && last.date === point.date) return [...history.slice(0, -1), point];
  return [...history, point];
}

/** One line per change between two syncs, for commit messages and PR descriptions. */
export function describeChanges(before: SyncedCharacter | null, after: SyncedCharacter): string[] {
  if (!before) return [`First sync: ${after.name}, level ${after.level} ${after.className}`];
  const lines: string[] = [];
  if (after.level !== before.level) lines.push(`Level ${before.level} → ${after.level}`);
  for (const [p, v] of Object.entries(after.professions)) {
    const old = before.professions[p];
    if (old === undefined) lines.push(`Learned ${p} (${v})`);
    else if (old !== v) lines.push(`${p} ${old} → ${v}`);
  }
  for (const p of Object.keys(before.professions)) if (!(p in after.professions)) lines.push(`Dropped ${p}`);
  const oldTalents = Object.values(before.talents).join("/");
  const newTalents = Object.values(after.talents).join("/");
  if (newTalents && oldTalents !== newTalents) lines.push(`Talents ${oldTalents || "none"} → ${newTalents}`);
  const oldGear = new Set(before.equipment.map((i) => i.id));
  for (const it of after.equipment) if (!oldGear.has(it.id)) lines.push(`New ${it.slot.toLowerCase()}: ${it.name}`);
  if (after.itemLevel !== null && before.itemLevel !== null && after.itemLevel !== before.itemLevel) {
    lines.push(`Item level ${before.itemLevel} → ${after.itemLevel}`);
  }
  return lines;
}
