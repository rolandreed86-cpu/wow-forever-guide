import type {
  ApiItem, ApiMeta, ClassQuest, Dungeon, DungeonDetail, Quest, Rare, Reputation, Zone,
} from "./types";

/**
 * Data comes from a snapshot bundled with the app (public/data, refreshed by `npm run snapshot`), so the app
 * runs standalone with no calls to other sites. Set VITE_DATA_MODE=live to read the Forever Companion API
 * directly instead (free, no key, open CORS, 120 requests/minute: https://forevercompanion.io/developers).
 */
export const LIVE = import.meta.env.VITE_DATA_MODE === "live";
export const FC_BASE = (import.meta.env.VITE_FOREVER_COMPANION_API as string | undefined) ?? "https://forevercompanion.io/api/v1";
export const DATA_BASE = "data/";

interface Envelope<T> {
  data: T;
  meta?: ApiMeta;
  page?: { total: number; limit: number; offset: number; next: string | null };
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Couldn't load ${url} (${res.status})`);
  return (await res.json()) as T;
}

/** Fetch every page of a paginated live endpoint. */
async function getAll<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  let url: string | null = `${FC_BASE}${path}?limit=500`;
  let lastOffset = -1;
  while (url) {
    const page: Envelope<T[]> = await getJson<Envelope<T[]>>(url);
    const offset = page.page?.offset ?? 0;
    if (offset <= lastOffset) break; // the API's CDN can repeat the first page for every offset
    lastOffset = offset;
    out.push(...page.data);
    url = page.page?.next ?? null;
  }
  return out;
}

const live = <T,>(path: string) => async () => (await getJson<Envelope<T>>(`${FC_BASE}${path}`)).data;
const snap = <T,>(file: string) => () => getJson<T>(`${DATA_BASE}fc/${file}`);

let detailsCache: Promise<Record<string, DungeonDetail>> | null = null;
function snapshotDungeon(id: string): Promise<DungeonDetail> {
  detailsCache ??= getJson<Record<string, DungeonDetail>>(`${DATA_BASE}fc/dungeon-details.json`);
  return detailsCache.then((all) => {
    const d = all[id];
    if (!d) throw new Error(`No dungeon called "${id}" in the data`);
    return d;
  });
}

export const fc = LIVE
  ? {
      dungeons: live<Dungeon[]>("/dungeons"),
      dungeon: (id: string) => live<DungeonDetail>(`/dungeons/${encodeURIComponent(id)}`)(),
      quests: () => getAll<Quest>("/quests"),
      items: () => getAll<ApiItem>("/items"),
      rares: live<Rare[]>("/rares"),
      zones: live<Zone[]>("/zones"),
      reputations: live<Reputation[]>("/reputations"),
      classQuests: live<ClassQuest[]>("/class-quests"),
    }
  : {
      dungeons: snap<Dungeon[]>("dungeons.json"),
      dungeon: snapshotDungeon,
      quests: snap<Quest[]>("quests.json"),
      items: () => Promise.resolve([] as ApiItem[]),
      rares: snap<Rare[]>("rares.json"),
      zones: snap<Zone[]>("zones.json"),
      reputations: snap<Reputation[]>("reputations.json"),
      classQuests: snap<ClassQuest[]>("class-quests.json"),
    };

export const loadSnapshotMeta = () => getJson<{ snapshotAt: string }>(`${DATA_BASE}meta.json`);
