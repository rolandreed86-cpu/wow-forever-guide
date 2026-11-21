import { describe, expect, it } from "vitest";
import {
  appendHistory, buildCharacter, describeChanges, fingerprint, foreverDbLinks, parseForeverDbProfessions,
  parseRaiderIo, pickForeverDbLink, raiderIoUrl, type SyncedCharacter,
} from "@/lib/characterSync";
import { applySync, DEFAULT_CHARACTER } from "@/lib/character";

// Trimmed from a real forever.raider.io profile response.
const rio = {
  name: "Hunt Anasie", race: "Troll", class: "Hunter", level: 35, faction: "horde", region: "eu", realm: "Normal",
  last_crawled_at: "2026-11-21T03:35:31.038Z", profile_url: "https://forever.raider.io/characters/eu/normal/Hunt%20Anasie",
  guild: { name: "Wayfarers" },
  gear: {
    item_level_equipped: 27,
    items: {
      head: { item_id: 6720, item_quality: 2, name: "Spirit Hunter Headdress" },
      chest: { item_id: 270043, item_quality: 3, name: "Dreamer's Chestguard" },
      mainhand: { item_id: 0, item_quality: 1, name: "" },
    },
  },
  talentLoadout: { spec: { id: 1485, slug: "hunter", name: "Hunter", pointAllocation: [26, 0, 0] } },
};

// Trimmed from a real foreverdb.net armory page.
const fdbPage = `<h2>Gear</h2><ul class="ssr-list"><li>Head: <a href="/item/3732">Hooded Cowl</a> (item level 30)</li></ul>
        <h2>Professions</h2><ul class="ssr-list"><li>Engineering 182/225</li><li>Mining 190/225</li><li>First Aid 20/75</li></ul>`;
const fdbSearch = `<a href="/armory/us/pve/Hunt-Anasie">x</a><a href="/armory/eu/camwow-eu4-realm-8-pvp/Hunt%20Anasie">y</a><a href="/armory/eu/pve/Other">z</a>`;

describe("Raider.IO profile", () => {
  const r = parseRaiderIo(rio);

  it("reads level, class, faction and guild", () => {
    expect(r).toMatchObject({ name: "Hunt Anasie", level: 35, classId: "hunter", race: "Troll", faction: "horde", guild: "Wayfarers", itemLevel: 27 });
  });

  it("names talent trees from the point allocation", () => {
    expect(r.talents).toEqual({ "Beast Mastery": 26, Marksmanship: 0, Survival: 0 });
  });

  it("labels gear slots and qualities and drops empty slots", () => {
    expect(r.equipment).toEqual([
      { slot: "Head", id: 6720, name: "Spirit Hunter Headdress", quality: "uncommon" },
      { slot: "Chest", id: 270043, name: "Dreamer's Chestguard", quality: "rare" },
    ]);
  });

  it("builds the API URL with the ruleset as realm", () => {
    expect(raiderIoUrl("EU", "Normal", "Hunt Anasie")).toBe(
      "https://forever.raider.io/api/v1/characters/profile?region=eu&realm=normal&name=Hunt+Anasie&fields=gear%2Ctalents%2Cguild");
  });
});

describe("ForeverDB page", () => {
  it("reads professions with their caps", () => {
    expect(parseForeverDbProfessions(fdbPage)).toEqual({
      professions: { Engineering: 182, Mining: 190, "First Aid": 20 },
      professionMax: { Engineering: 225, Mining: 225, "First Aid": 75 },
    });
    expect(parseForeverDbProfessions("<h1>No such character</h1>").professions).toEqual({});
  });

  it("finds the right character in search results", () => {
    const links = foreverDbLinks(fdbSearch);
    expect(links).toHaveLength(3);
    expect(pickForeverDbLink(links, "eu", "Hunt Anasie")).toBe("/armory/eu/camwow-eu4-realm-8-pvp/Hunt%20Anasie");
    expect(pickForeverDbLink(links, "us", "hunt anasie")).toBe("/armory/us/pve/Hunt-Anasie");
    expect(pickForeverDbLink(links, "eu", "Nobody")).toBeNull();
  });
});

describe("building the record", () => {
  const now = new Date("2026-11-21T08:00:00Z");
  const full = buildCharacter({ raiderIo: rio, foreverDb: { html: fdbPage, url: "https://foreverdb.net/x" }, region: "eu", now });

  it("joins both sources", () => {
    expect(full.professions.Mining).toBe(190);
    expect(full.professionsFrom).toBe(now.toISOString());
    expect(full.links.map((l) => l.label)).toEqual(["Raider.IO", "ForeverDB"]);
    expect(full.region).toBe("EU");
  });

  it("keeps the last professions when ForeverDB has none", () => {
    const next = buildCharacter({ raiderIo: { ...rio, level: 36 }, foreverDb: null, region: "eu", previous: full, now: new Date("2026-11-22T08:00:00Z") });
    expect(next.professions).toEqual(full.professions);
    expect(next.professionsFrom).toBe(full.professionsFrom);
    expect(next.level).toBe(36);
  });

  it("ignores timestamps when deciding whether anything changed", () => {
    const again = buildCharacter({ raiderIo: { ...rio, last_crawled_at: "2026-11-22T01:00:00Z" }, foreverDb: { html: fdbPage, url: "https://foreverdb.net/x" }, region: "eu", now: new Date("2026-11-22T08:00:00Z") });
    expect(fingerprint(again)).toBe(fingerprint(full));
  });
});

describe("history and change notes", () => {
  const base: SyncedCharacter = buildCharacter({ raiderIo: rio, foreverDb: { html: fdbPage, url: "u" }, region: "eu", now: new Date("2026-11-20T08:00:00Z") });
  const later: SyncedCharacter = { ...base, level: 37, professions: { ...base.professions, Mining: 205 }, syncedAt: "2026-11-21T08:00:00.000Z" };

  it("adds a point only when something moved, one per day", () => {
    const h1 = appendHistory([], base);
    expect(appendHistory(h1, { ...base, syncedAt: "2026-11-21T08:00:00.000Z" })).toBe(h1);
    const h2 = appendHistory(h1, later);
    expect(h2.map((p) => p.level)).toEqual([35, 37]);
    expect(appendHistory(h2, { ...later, level: 38 }).map((p) => p.level)).toEqual([35, 38]);
  });

  it("describes level, profession and gear changes", () => {
    const after = { ...later, equipment: [...later.equipment, { slot: "Legs", id: 10410, name: "Leggings of the Fang", quality: "rare" }] };
    expect(describeChanges(base, after)).toEqual(["Level 35 → 37", "Mining 190 → 205", "New legs: Leggings of the Fang"]);
    expect(describeChanges(null, base)[0]).toContain("First sync");
  });
});

describe("applying a sync to the app's character", () => {
  const synced = buildCharacter({ raiderIo: rio, foreverDb: { html: fdbPage, url: "u" }, region: "eu", now: new Date("2026-11-21T08:00:00Z") });

  it("takes level, class, faction and professions from a new sync", () => {
    const c = applySync({ ...DEFAULT_CHARACTER, classId: "mage", level: 12 }, synced);
    expect(c).toMatchObject({ classId: "hunter", level: 35, faction: "horde", syncedAt: synced.syncedAt });
    expect(c.professions.Engineering).toBe(182);
  });

  it("keeps manual edits made after that sync", () => {
    const edited = { ...applySync(DEFAULT_CHARACTER, synced), level: 45 };
    expect(applySync(edited, synced).level).toBe(45);
  });

  it("does nothing without a sync", () => {
    expect(applySync(DEFAULT_CHARACTER, null)).toBe(DEFAULT_CHARACTER);
  });
});
