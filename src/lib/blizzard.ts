/**
 * Turns Blizzard's WoW Forever Profile API responses into the small character record the app keeps.
 * No imports, so the Node sync script (scripts/sync-character.ts) can load this file directly.
 *
 * Endpoints (namespace profile-forever-{region}):
 *   /profile/wow/character/{name}            summary: level, class, race, faction
 *   /profile/wow/character/{name}/professions
 *   /profile/wow/character/{name}/equipment
 *   /profile/wow/character/{name}/specializations
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
  classId: SyncClassId | null;
  className: string;
  race: string;
  level: number;
  faction: "horde" | "alliance";
  guild: string | null;
  itemLevel: number | null;
  /** Profession name → current skill. */
  professions: Record<string, number>;
  /** Profession name → highest skill the current tier allows. */
  professionMax: Record<string, number>;
  /** Tree name → points spent, in the order Blizzard lists them. */
  talents: Record<string, number>;
  equipment: SyncedItem[];
  /** When the character last logged out, if Blizzard says (ISO). */
  lastLogout: string | null;
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

// Loose shapes: the Forever API mostly follows the Classic profile format, but fields come and go.
/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = any;

const CLASS_IDS: SyncClassId[] = ["warrior", "paladin", "hunter", "rogue", "priest", "shaman", "mage", "warlock", "druid"];

function str(v: Json): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") {
    if (typeof v.name === "string") return v.name;
    if (v.name && typeof v.name === "object") return str(v.name.en_GB ?? v.name.en_US ?? Object.values(v.name)[0]);
    if (typeof v.en_GB === "string") return v.en_GB;
    if (typeof v.en_US === "string") return v.en_US;
  }
  return "";
}

export function classIdFromName(name: string): SyncClassId | null {
  const id = name.trim().toLowerCase() as SyncClassId;
  return CLASS_IDS.includes(id) ? id : null;
}

/** Skill and cap for one profession entry, which can be flat (Classic) or split into tiers (retail). */
function professionSkill(entry: Json): { skill: number; max: number } | null {
  if (typeof entry?.skill_points === "number") return { skill: entry.skill_points, max: entry.max_skill_points ?? 0 };
  const tiers: Json[] = Array.isArray(entry?.tiers) ? entry.tiers : [];
  if (!tiers.length) return null;
  const best = tiers.reduce((a, b) => ((b.skill_points ?? 0) > (a.skill_points ?? 0) ? b : a));
  return { skill: best.skill_points ?? 0, max: best.max_skill_points ?? 0 };
}

export function parseProfessions(json: Json): { professions: Record<string, number>; professionMax: Record<string, number> } {
  const professions: Record<string, number> = {};
  const professionMax: Record<string, number> = {};
  for (const entry of [...(json?.primaries ?? []), ...(json?.secondaries ?? [])]) {
    const name = str(entry?.profession);
    const s = professionSkill(entry);
    if (!name || !s) continue;
    professions[name] = s.skill;
    if (s.max) professionMax[name] = s.max;
  }
  return { professions, professionMax };
}

export function parseEquipment(json: Json): SyncedItem[] {
  return (json?.equipped_items ?? [])
    .map((it: Json) => ({
      slot: str(it?.slot) || String(it?.slot?.type ?? ""),
      id: Number(it?.item?.id ?? 0),
      name: str(it),
      quality: String(it?.quality?.type ?? "COMMON").toLowerCase(),
    }))
    .filter((it: SyncedItem) => it.id > 0);
}

/** Points per tree from the active talent group (Classic style), or the first group if none is flagged. */
export function parseTalents(json: Json): Record<string, number> {
  const groups: Json[] = json?.specialization_groups ?? [];
  const group = groups.find((g) => g?.is_active) ?? groups[0];
  const specs: Json[] = group?.specializations ?? json?.specializations ?? [];
  const out: Record<string, number> = {};
  for (const s of specs) {
    const name = str(s?.specialization_name ?? s?.specialization) || str(s);
    if (!name) continue;
    const pts = typeof s?.spent_points === "number"
      ? s.spent_points
      : (s?.talents ?? []).reduce((n: number, t: Json) => n + (Number(t?.talent_rank) || 0), 0);
    out[name] = pts;
  }
  return out;
}

export function parseSummary(json: Json) {
  const className = str(json?.character_class ?? json?.class);
  const faction = String(json?.faction?.type ?? str(json?.faction)).toLowerCase().startsWith("a") ? "alliance" : "horde";
  const ts = Number(json?.last_login_timestamp);
  return {
    name: str(json) || String(json?.name ?? ""),
    className,
    classId: classIdFromName(className),
    race: str(json?.race),
    level: Number(json?.level) || 1,
    faction: faction as "horde" | "alliance",
    guild: str(json?.guild) || null,
    itemLevel: typeof json?.equipped_item_level === "number" ? json.equipped_item_level : null,
    lastLogout: Number.isFinite(ts) && ts > 0 ? new Date(ts).toISOString() : null,
  };
}

export interface RawCharacter {
  summary: Json;
  professions?: Json;
  equipment?: Json;
  specializations?: Json;
}

export function normalizeCharacter(raw: RawCharacter, region: string, now = new Date()): SyncedCharacter {
  const s = parseSummary(raw.summary);
  const p = parseProfessions(raw.professions);
  return {
    ...s,
    region: region.toUpperCase(),
    professions: p.professions,
    professionMax: p.professionMax,
    talents: parseTalents(raw.specializations),
    equipment: parseEquipment(raw.equipment),
    syncedAt: now.toISOString(),
  };
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

/** Blizzard character slugs are lower case, with the surname after a hyphen in Forever. */
export function characterSlug(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}
