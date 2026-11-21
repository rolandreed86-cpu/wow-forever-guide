#!/usr/bin/env node
/**
 * Downloads a snapshot of every data feed the app uses into public/data/, so the app runs standalone
 * (no runtime calls to other sites). Run with: npm run snapshot
 *
 * Sources and terms:
 *  - Forever Companion API (https://forevercompanion.io/developers): free, asks for a link back.
 *  - wow-forever-kb (https://github.com/gBlaku/wow-forever-kb): item stats and sources.
 *  - Talents Forever via WoW Forever Talent (https://wowforevertalent.com/sources/): CC BY 4.0.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = path.resolve("public/data");
const FC = "https://forevercompanion.io/api/v1";
const KB = "https://gblaku.github.io/wow-forever-kb/items.json";
const TALENTS = "https://wowforevertalent.com";
const CLASSES = ["warrior", "paladin", "hunter", "rogue", "priest", "shaman", "mage", "warlock", "druid"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, as = "json") {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": "wayfarers-almanac-snapshot" } });
    if (res.ok) return as === "json" ? res.json() : res.text();
    if (attempt >= 4 || (res.status < 500 && res.status !== 429 && res.status !== 403)) throw new Error(`${res.status} ${url}`);
    await sleep(15000 * attempt); // the API answers 403 or 429 when rate limited
  }
}

async function save(rel, data) {
  const file = path.join(OUT, rel);
  await mkdir(path.dirname(file), { recursive: true });
  const text = JSON.stringify(data);
  await writeFile(file, text);
  console.log(`  ${rel} ${(text.length / 1024).toFixed(0)} KB`);
}

/**
 * Follow `next` links, but stop if a page doesn't advance: the API's CDN caches by path and can serve
 * the first page again for every offset.
 */
async function getAll(p) {
  const out = [];
  let url = `${FC}${p}?limit=500`;
  let lastOffset = -1;
  while (url) {
    const page = await get(url);
    const offset = page.page?.offset ?? 0;
    if (offset <= lastOffset) break;
    lastOffset = offset;
    out.push(...page.data);
    url = page.page?.next ?? null;
    await sleep(1000);
  }
  return out;
}

async function foreverCompanion(skipDetails) {
  console.log("Forever Companion");
  const dungeons = (await get(`${FC}/dungeons`)).data;
  await save("fc/dungeons.json", dungeons);
  let details;
  if (skipDetails) {
    details = JSON.parse(await readFile(path.join(OUT, "fc/dungeon-details.json"), "utf8"));
  } else {
    details = {};
    for (const d of dungeons.filter((x) => x.status === "launch")) {
      details[d.id] = (await get(`${FC}/dungeons/${d.id}`)).data;
      await sleep(1000); // stay well under 120 requests a minute
    }
    await save("fc/dungeon-details.json", details);
  }
  // Merge the quest list with every dungeon's own quests, in case pagination comes back short.
  const key = (q) => `${q.questId}:${q.faction}:${q.dungeon?.id ?? ""}`;
  const quests = new Map((await getAll("/quests")).map((q) => [key(q), q]));
  for (const d of Object.values(details)) for (const q of d.quests) if (!quests.has(key(q))) quests.set(key(q), q);
  console.log(`  ${quests.size} quests`);
  await save("fc/quests.json", [...quests.values()]);
  for (const name of ["rares", "zones", "reputations", "class-quests"]) {
    await save(`fc/${name}.json`, (await get(`${FC}/${name}`)).data);
  }
}

/** Keep only the items the app shows: gear, mounts, pets, ammo, quivers, explosives and anything crafted. */
async function itemDatabase() {
  console.log("wow-forever-kb");
  const raw = await get(KB);
  const f = Object.fromEntries(raw.fields.map((n, i) => [n, i]));
  const keep = raw.items.filter((r) => {
    const ic = r[f.ic], sub = r[f.sub], src = r[f.src];
    if (ic === "Armor" || ic === "Weapon") return r[f.slot] !== "Non-equippable";
    if (sub === "Mount" || sub === "Pet") return true;
    if (ic === "Projectile" || ic === "Quiver") return true;
    return typeof src === "string" && src.startsWith("Crafted:");
  });
  console.log(`  kept ${keep.length} of ${raw.items.length} items`);
  await save("items.json", { ...raw, items: keep, quests: [], snapshotAt: new Date().toISOString() });
}

/** Decode Astro's serialized island props: [0, value] plain, [1, [...]] arrays, [0] alone = undefined. */
function decode(v) {
  if (Array.isArray(v)) {
    if (v.length === 1 && v[0] === 0) return null;
    if (v.length === 2 && typeof v[0] === "number") {
      const [t, x] = v;
      if (t === 0) return decode(x);
      if (t === 1) return x.map(decode);
      return x;
    }
    return v.map(decode);
  }
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, decode(x)]));
  return v;
}

const unescape = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

async function talents() {
  console.log("Talents");
  const index = {};
  for (const cls of CLASSES) {
    const html = await get(`${TALENTS}/${cls}/`, "text");
    const props = [...html.matchAll(/props="([^"]*)"/g)].map((m) => unescape(m[1])).sort((a, b) => b.length - a.length);
    const data = decode(JSON.parse(props[0]));
    const gc = data.gameClass;
    const trees = gc.trees.map((t) => ({
      name: t.name,
      talents: t.talents.map((x) => ({
        id: x.id, name: x.name, row: x.row, col: x.col, maxRank: x.maxRank, passive: !!x.passive,
        prerequisite: x.prerequisite ?? null, cost: x.cost ?? null,
        ranks: x.ranks.map((r) => ({ rank: r.rank, text: r.text, confidence: r.confidence })),
        status: x.classic?.status ?? null,
        classicName: x.classic && typeof x.classic.name === "string" ? x.classic.name : null,
      })),
      removed: (t.removed ?? []).map((x) => ({ name: x.name, text: x.text })),
    }));
    index[cls] = { version: data.version, source: gc.source };
    await save(`talents/${cls}.json`, { class: cls, name: gc.name, version: data.version, source: gc.source, trees });
    await sleep(800);
  }
  await save("talents/index.json", index);
}

// npm run snapshot [-- fc|items|talents] [--keep-dungeons]
const only = process.argv.slice(2).find((a) => !a.startsWith("--"));
if (!only || only === "fc") await foreverCompanion(process.argv.includes("--keep-dungeons"));
if (!only || only === "items") await itemDatabase();
if (!only || only === "talents") await talents();
await save("meta.json", { snapshotAt: new Date().toISOString() });
