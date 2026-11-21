/**
 * Pulls your character from Blizzard's WoW Forever Profile API into src/data/character.json.
 *
 *   npm run sync:character
 *
 * Needs BLIZZARD_CLIENT_ID and BLIZZARD_CLIENT_SECRET (a free client from https://develop.battle.net/access/clients).
 * The character and region come from sync.config.json, or WOW_CHARACTER / WOW_REGION if set.
 * Writes the file only when something changed, and prints what changed, or "No changes".
 * Blizzard lists a character from level 10, and only after it logs out.
 */
import { readFileSync, writeFileSync } from "node:fs";
import {
  appendHistory, characterSlug, describeChanges, normalizeCharacter,
  type CharacterFile, type RawCharacter, type SyncedCharacter,
} from "../src/lib/blizzard.ts";

const OUT = "src/data/character.json";
const config = JSON.parse(readFileSync("sync.config.json", "utf8")) as { region?: string; character?: string };
const region = (process.env.WOW_REGION || config.region || "eu").toLowerCase();
const name = process.env.WOW_CHARACTER || config.character || "";
const id = process.env.BLIZZARD_CLIENT_ID;
const secret = process.env.BLIZZARD_CLIENT_SECRET;

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

if (!id || !secret) fail("Missing BLIZZARD_CLIENT_ID or BLIZZARD_CLIENT_SECRET. Add them as secrets in the cloud environment settings.");
if (!name) fail('No character set. Put it in sync.config.json as "character": "name-surname", or set WOW_CHARACTER.');
if (!["eu", "us", "kr", "tw"].includes(region)) fail(`Unknown region "${region}". Use eu or us.`);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function token(): Promise<string> {
  const res = await fetch("https://oauth.battle.net/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) fail(`Battle.net refused the API client (${res.status}). Check the client ID and secret.`);
  return ((await res.json()) as { access_token: string }).access_token;
}

/** The Forever profile API sometimes 404s a character that exists, so 404s get a few retries too. */
async function get(path: string, bearer: string, required: boolean): Promise<unknown> {
  const locale = region === "us" ? "en_US" : "en_GB";
  const url = `https://${region}.api.blizzard.com${path}?namespace=profile-forever-${region}&locale=${locale}`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${bearer}` } });
    if (res.ok) return res.json();
    const retry = res.status === 404 || res.status === 429 || res.status >= 500;
    if (!retry || attempt === 4) {
      if (!required) return undefined;
      if (res.status === 404) {
        fail(`Blizzard has no character "${name}" in ${region.toUpperCase()}. It must be level 10 or higher and logged out at least once since reaching 10. Check the name-surname spelling in sync.config.json.`);
      }
      fail(`Blizzard API error ${res.status} for ${path}`);
    }
    await sleep(2000 * attempt);
  }
  return undefined;
}

const bearer = await token();
const base = `/profile/wow/character/${encodeURIComponent(characterSlug(name))}`;
const raw: RawCharacter = { summary: await get(base, bearer, true) };
raw.professions = await get(`${base}/professions`, bearer, false);
raw.equipment = await get(`${base}/equipment`, bearer, false);
raw.specializations = await get(`${base}/specializations`, bearer, false);

const next = normalizeCharacter(raw, region);
const file = JSON.parse(readFileSync(OUT, "utf8")) as CharacterFile;
const strip = (c: SyncedCharacter | null) => (c ? JSON.stringify({ ...c, syncedAt: "" }) : "");

if (strip(file.character) === strip(next)) {
  console.log(`No changes: ${next.name} is still level ${next.level}.`);
} else {
  const changes = describeChanges(file.character, next);
  const out: CharacterFile = { character: next, history: appendHistory(file.history, next) };
  writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`Updated ${OUT}`);
  for (const line of changes) console.log(`- ${line}`);
}
