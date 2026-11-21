/**
 * Where an item comes from and how quickly you can get it while levelling.
 *
 * Quest rewards and dungeon drops are the fast routes: you get them on the way to the next level.
 * Crafted, reputation and vendor gear, and rare world drops, take a detour, so the levelling
 * planner leaves them out unless you ask for them.
 *
 * Verified Forever data comes first (Forever Companion dungeon loot tables and quest rewards),
 * then the item database's own source text ("Quest: Name (lvl 30, Zone, Alliance; from ...)").
 */
import type { KbItem } from "./kb";
import type { DungeonDetail, Quest } from "./types";

export type Route =
  | { kind: "dungeon"; dungeon: string; dungeonId: string; boss: string; minLevel: number; maxLevel: number; access: string; trash: boolean }
  | { kind: "quest"; quest: string; level: number; minLevel: number; zone: string | null; faction: string | null; dungeon: string | null }
  | { kind: "crafted"; profession: string; skill: number }
  | { kind: "reputation"; rep: string }
  | { kind: "vendor" }
  | { kind: "world" }
  | { kind: "raid" }
  | { kind: "other" };

export type RouteKind = Route["kind"];

export const ROUTE_LABEL: Record<RouteKind, string> = {
  dungeon: "Dungeon", quest: "Quest", crafted: "Crafted", reputation: "Reputation", vendor: "Vendor",
  world: "World drop", raid: "Raid", other: "Other",
};

/** Routes you pick up while levelling, without farming or grinding. */
export const FAST_ROUTES: RouteKind[] = ["quest", "dungeon"];

const RAID_NAMES = [
  "Molten Core", "Blackwing Lair", "Zul'Gurub", "Ruins of Ahn'Qiraj", "Temple of Ahn'Qiraj", "Ahn'Qiraj",
  "Naxxramas", "Onyxia's Lair", "Barrow Deeps", "Hyjal Summit",
];

export interface RouteIndex {
  get(item: KbItem): Route;
}

/** "Quest: The Boar Hunter (lvl 3, Coldridge Valley, Alliance; from Talin ...)" → level, zone and faction. */
export function parseQuestSource(src: string): { quest: string; level: number; zone: string | null; faction: string | null } | null {
  const m = src.match(/Quest: ([^(;|]+?) \(lvl (\d+)(?:, ([^,;)]+))?(?:, (Alliance|Horde|Both))?/);
  if (!m) return null;
  return { quest: m[1].trim(), level: parseInt(m[2], 10), zone: m[3]?.trim() ?? null, faction: m[4]?.toLowerCase() ?? null };
}

function fromKb(item: KbItem): Route {
  const src = item.source ?? "";
  if (RAID_NAMES.some((r) => src.includes(r))) return { kind: "raid" };
  if (item.rep) return { kind: "reputation", rep: item.rep };
  const craft = src.match(/Crafted: ([A-Za-z ]+?) (\d+)/);
  if (item.sourceTypes.includes("crafted") && craft) return { kind: "crafted", profession: craft[1], skill: parseInt(craft[2], 10) };
  if (item.sourceTypes.includes("quest")) {
    const q = parseQuestSource(src);
    if (q) return { kind: "quest", ...q, minLevel: Math.max(1, q.level - 5), dungeon: null };
  }
  if (item.sourceTypes.includes("vendor")) return { kind: "vendor" };
  if (item.sourceTypes.includes("drop")) return { kind: "world" };
  return { kind: "other" };
}

/** Build the lookup from Forever Companion's dungeon details (loot and quests) plus its quest list. */
export function buildRouteIndex(details: Record<string, DungeonDetail> | undefined, quests: Quest[] | undefined): RouteIndex {
  const map = new Map<number, Route>();
  for (const d of Object.values(details ?? {})) {
    for (const l of d.loot ?? []) {
      if (!map.has(l.itemId)) {
        map.set(l.itemId, { kind: "dungeon", dungeon: d.name, dungeonId: d.id, boss: l.source, minLevel: d.minLevel, maxLevel: d.maxLevel, access: d.access ?? "both", trash: /trash/i.test(l.source ?? "") });
      }
    }
  }
  const allQuests = [...(quests ?? []), ...Object.values(details ?? {}).flatMap((d) => d.quests ?? [])];
  for (const q of allQuests) {
    for (const it of q.rewards?.items ?? []) {
      const prev = map.get(it.id);
      // Keep the easiest quest when several give the same item; a dungeon drop stays a dungeon drop.
      if (prev && (prev.kind === "dungeon" || (prev.kind === "quest" && prev.level <= q.level))) continue;
      map.set(it.id, {
        kind: "quest", quest: q.name, level: q.level, minLevel: q.minLevel, zone: q.zone ?? q.location ?? null,
        faction: q.faction, dungeon: q.dungeon?.name ?? null,
      });
    }
  }
  return { get: (item) => map.get(item.id) ?? fromKb(item) };
}

/**
 * Can you reasonably get this at this level? Quests up to 2 levels above you; dungeons once you're within 2 of their minimum.
 * Random drops from dungeon trash are left out unless asked for, since you can't count on them.
 */
export function reachable(route: Route, level: number, faction?: "alliance" | "horde", includeTrash = false): boolean {
  if (route.kind === "quest") {
    if (faction && route.faction && route.faction !== "both" && route.faction !== faction) return false;
    return route.level <= level + 2;
  }
  if (route.kind === "dungeon") {
    if (route.trash && !includeTrash) return false;
    if (faction && route.access && route.access !== "both" && route.access !== faction) return false;
    return route.minLevel <= level + 2;
  }
  return true;
}

/** Short "where from" text for a pick. */
export function routeText(route: Route): string {
  switch (route.kind) {
    case "dungeon": return `${route.trash ? "Random trash drop" : route.boss}, ${route.dungeon} (${route.minLevel}–${route.maxLevel})`;
    case "quest": return `${route.quest} (level ${route.level}${route.dungeon ? `, ${route.dungeon}` : route.zone ? `, ${route.zone}` : ""})`;
    case "crafted": return `${route.profession} ${route.skill}`;
    case "reputation": return route.rep;
    default: return ROUTE_LABEL[route.kind];
  }
}
