import type {
  ApiItem, ApiMeta, ClassQuest, Dungeon, DungeonDetail, Quest, Rare, Reputation, Zone,
} from "./types";

/**
 * Forever Companion API: free, no key, open CORS, 120 requests/minute per IP, syncs about every 6 hours.
 * Docs: https://forevercompanion.io/developers. Their terms ask for a link back, which the footer provides.
 */
export const FC_BASE = (import.meta.env.VITE_FOREVER_COMPANION_API as string | undefined) ?? "https://forevercompanion.io/api/v1";

const TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_PREFIX = "wa:fc:";

interface Envelope<T> {
  data: T;
  meta?: ApiMeta;
  page?: { total: number; limit: number; offset: number; next: string | null };
}

function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const { at, value } = JSON.parse(raw) as { at: number; value: T };
    return Date.now() - at < TTL_MS ? value : null;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, value: T) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ at: Date.now(), value }));
  } catch {
    // Storage full or blocked: the app still works, it just refetches.
  }
}

async function getJson<T>(url: string): Promise<Envelope<T>> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Forever Companion returned ${res.status} for ${url}`);
  return (await res.json()) as Envelope<T>;
}

async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = readCache<T>(key);
  if (hit) return hit;
  const value = await load();
  writeCache(key, value);
  return value;
}

/** Fetch every page of a paginated list endpoint. */
async function getAll<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  let url: string | null = `${FC_BASE}${path}${path.includes("?") ? "&" : "?"}limit=500`;
  while (url) {
    const page: Envelope<T[]> = await getJson<T[]>(url);
    out.push(...page.data);
    url = page.page?.next ?? null;
  }
  return out;
}

export const fc = {
  dungeons: () => cached("dungeons", async () => (await getJson<Dungeon[]>(`${FC_BASE}/dungeons`)).data),
  dungeon: (id: string) => cached(`dungeon:${id}`, async () => (await getJson<DungeonDetail>(`${FC_BASE}/dungeons/${encodeURIComponent(id)}`)).data),
  quests: () => cached("quests", () => getAll<Quest>("/quests")),
  items: () => cached("items", () => getAll<ApiItem>("/items")),
  rares: () => cached("rares", async () => (await getJson<Rare[]>(`${FC_BASE}/rares`)).data),
  zones: () => cached("zones", async () => (await getJson<Zone[]>(`${FC_BASE}/zones`)).data),
  reputations: () => cached("reputations", async () => (await getJson<Reputation[]>(`${FC_BASE}/reputations`)).data),
  classQuests: () => cached("class-quests", async () => (await getJson<ClassQuest[]>(`${FC_BASE}/class-quests`)).data),
};
