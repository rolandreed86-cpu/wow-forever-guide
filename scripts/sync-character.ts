/**
 * Pulls your character into src/data/character.json from public WoW Forever sites. No API keys needed.
 *
 *   npm run sync:character
 *
 *   Raider.IO  class, faction, guild, gear and talent points (crawled from the Armory every few days)
 *   BattlePost level, item level, gear, talent ranks and character sheet, read live from the Armory (optional)
 *   Wowhead    damage and speed of the equipped weapons (tooltip service), for the DPS estimate (optional)
 *   ForeverDB  profession skills, when you upload with the ForeverDB addon (optional)
 *
 * The character comes from sync.config.json: region (eu or us), realm (the ruleset: normal, pvp, rp or pvp-rp)
 * and character ("Name Surname"). WOW_REGION, WOW_REALM and WOW_CHARACTER override it.
 * Writes the file only when something changed, and prints what changed, or "No changes".
 */
import { readFileSync, writeFileSync } from "node:fs";
import {
  appendHistory, averageItemLevel, battlePostUrl, buildCharacter, parseBattlePost, describeChanges, fingerprint, foreverDbLinks, parseBattlePostGear,
  parseForeverDbProfessions, parseWeaponTooltip, pickForeverDbLink, raiderIoUrl, type CharacterFile, type SyncedCharacter,
} from "../src/lib/characterSync.ts";

const OUT = "src/data/character.json";
const UA = { "User-Agent": "wayfarers-almanac-sync/1.0 (personal character tracker)" };
const config = JSON.parse(readFileSync("sync.config.json", "utf8")) as { region?: string; realm?: string; character?: string };
const region = (process.env.WOW_REGION || config.region || "eu").toLowerCase();
const realm = (process.env.WOW_REALM || config.realm || "normal").toLowerCase();
const name = (process.env.WOW_CHARACTER || config.character || "").trim();

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

if (!name) fail('No character set. Put it in sync.config.json as "character": "Name Surname", or set WOW_CHARACTER.');

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getText(url: string, tries = 3): Promise<{ status: number; body: string }> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: UA });
    const body = await res.text();
    if (res.ok || attempt >= tries || (res.status < 500 && res.status !== 429)) return { status: res.status, body };
    await sleep(3000 * attempt);
  }
}

// Raider.IO: required.
const rio = await getText(raiderIoUrl(region, realm, name));
if (rio.status !== 200) {
  let msg = rio.body;
  try { msg = (JSON.parse(rio.body) as { message?: string }).message ?? msg; } catch { /* plain text */ }
  fail(`Raider.IO couldn't find "${name}" on ${region.toUpperCase()} ${realm} (${rio.status}: ${msg}). ` +
    "Check the name, region and realm in sync.config.json. A new character appears after Raider.IO next crawls the Armory, " +
    "which needs level 10 and a logout. You can also look it up once at forever.raider.io to queue it.");
}
const raiderIo = JSON.parse(rio.body);

// BattlePost: optional, the freshest level.
let battlePost: { html: string; url: string } | null = null;
try {
  const url = battlePostUrl(region, name);
  const page = await getText(url, 2);
  if (page.status === 200) battlePost = { html: page.body, url };
  else console.warn(`BattlePost answered ${page.status}, using Raider.IO's level.`);
} catch (e) {
  console.warn(`BattlePost unavailable, using Raider.IO's level (${(e as Error).message})`);
}

// Weapon damage and speed for the DPS estimate: BattlePost names the items, Wowhead's tooltip service has their stats.
let weapons: SyncedCharacter["weapons"] = null;
if (battlePost) {
  const slots = { "Main hand": "mainHand", "Off hand": "offHand", Ranged: "ranged" } as const;
  for (const item of parseBattlePostGear(battlePost.html)) {
    const key = slots[item.slot as keyof typeof slots];
    if (!key) continue;
    try {
      const tip = await getText(`https://nether.wowhead.com/forever/tooltip/item/${item.id}`, 2);
      const w = tip.status === 200 ? parseWeaponTooltip(item.id, item.name, (JSON.parse(tip.body) as { tooltip?: string }).tooltip ?? "") : null;
      if (w) weapons = { ...weapons, [key]: w };
    } catch (e) {
      console.warn(`Couldn't read ${item.name}'s tooltip (${(e as Error).message})`);
    }
    await sleep(300);
  }
}

// ForeverDB: optional, for professions.
let foreverDb: { html: string; url: string } | null = null;
try {
  const search = await getText(`https://foreverdb.net/armory?q=${encodeURIComponent(name)}`, 2);
  const link = pickForeverDbLink(foreverDbLinks(search.body), region, name);
  if (link) {
    const url = `https://foreverdb.net${link}`;
    const page = await getText(url, 2);
    if (page.status === 200) foreverDb = { html: page.body, url };
  }
} catch (e) {
  console.warn(`ForeverDB unavailable, keeping the last known professions (${(e as Error).message})`);
}
if (!foreverDb) console.warn("ForeverDB has no page for this character yet, so professions stay as they were. Upload once with the ForeverDB addon to add them.");
else if (!Object.keys(parseForeverDbProfessions(foreverDb.html).professions).length) console.warn("ForeverDB lists the character but no professions.");

const file = JSON.parse(readFileSync(OUT, "utf8")) as CharacterFile;
const next = buildCharacter({ raiderIo, battlePost, foreverDb, weapons, region, previous: file.character });

// BattlePost sometimes shows no average item level ("-"). Work it out from the gear and the bundled item data instead.
const bpLive = battlePost ? parseBattlePost(battlePost.html) : null;
if (bpLive && bpLive.level >= next.level && bpLive.itemLevel === null && parseBattlePostGear(battlePost!.html).length) {
  try {
    const kb = JSON.parse(readFileSync("public/data/items.json", "utf8")) as { fields: string[]; items: unknown[][] };
    const id = kb.fields.indexOf("id"), ilvl = kb.fields.indexOf("ilvl");
    const levels = new Map(kb.items.map((r) => [Number(r[id]), Number(r[ilvl])]));
    const avg = averageItemLevel(next.equipment, levels);
    if (avg !== null) next.itemLevel = avg;
  } catch {
    // no item data here: keep what buildCharacter chose
  }
}

if (fingerprint(file.character) === fingerprint(next)) {
  console.log(`No changes: ${next.name} is still level ${next.level}.`);
} else {
  const changes = describeChanges(file.character, next);
  const out: CharacterFile = { character: next, history: appendHistory(file.history, next) };
  writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`Updated ${OUT}`);
  for (const line of changes) console.log(`- ${line}`);
}
