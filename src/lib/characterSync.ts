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
  /** When the gear and talent split were read (Raider.IO's last crawl, ISO). */
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
  s.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

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
export function parseBattlePost(html: string, now = new Date()) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "")
    .split(/<[^>]+>/).map((x) => decode(x)).filter(Boolean);
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

export interface SyncInputs {
  raiderIo: Json;
  /** BattlePost character page, if it answered. */
  battlePost?: { html: string; url: string } | null;
  /** ForeverDB character page, if it was found. */
  foreverDb?: { html: string; url: string } | null;
  region: string;
  /** The previous record, to keep professions when ForeverDB has nothing new. */
  previous?: SyncedCharacter | null;
  now?: Date;
}

export function buildCharacter({ raiderIo, battlePost, foreverDb, region, previous, now = new Date() }: SyncInputs): SyncedCharacter {
  const r = parseRaiderIo(raiderIo);
  const links: { label: string; url: string }[] = [];
  if (r.url) links.push({ label: "Raider.IO", url: r.url });
  // BattlePost reads the Armory when asked, so when it's at least as far along it wins for level and item level.
  const bp = battlePost ? parseBattlePost(battlePost.html, now) : null;
  const live = bp && bp.level >= r.level ? bp : null;
  if (bp && battlePost) links.push({ label: "BattlePost", url: battlePost.url });
  const prof = foreverDb ? parseForeverDbProfessions(foreverDb.html) : { professions: {}, professionMax: {} };
  const haveProfs = Object.keys(prof.professions).length > 0;
  if (foreverDb) links.push({ label: "ForeverDB", url: foreverDb.url });
  const { url: _url, ...rest } = r;
  void _url;
  return {
    ...rest,
    level: live?.level ?? r.level,
    itemLevel: live?.itemLevel ?? r.itemLevel,
    lastSeen: live?.lastSeen ?? r.lastSeen,
    spec: live?.spec ?? null,
    gearFrom: r.lastSeen,
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
  const { syncedAt: _a, lastSeen: _b, professionsFrom: _c, gearFrom: _d, ...rest } = c;
  void _a; void _b; void _c; void _d;
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
