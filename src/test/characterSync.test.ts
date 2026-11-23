import { describe, expect, it } from "vitest";
import {
  appendHistory, battlePostUrl, buildCharacter, parseBattlePost, parseBattlePostGear, parseBattlePostSheet, parseBattlePostTalents, parseWeaponTooltip, describeChanges, fingerprint, foreverDbLinks, parseForeverDbProfessions,
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

// Trimmed from a real battlepost.net character page.
const bpPage = `<h1>Kurt Barren</h1><span>37</span><div>Kurt Barren</div><div>Lv 37 Human</div><div>Survival Hunter</div>
<div>Checked just now</div><div>· last seen 16h ago</div><b>34</b><span>Avg iLvl</span><b>0</b><span>Achievements</span>
<dt>Class</dt><dd>Hunter</dd><dt>Spec</dt><dd>Survival</dd><dd>28 pts</dd><dt>Realm type</dt><dd>PvP</dd>
<dt>Last seen</dt><dd>16h ago</dd><dt>Updated</dt><dd>just now</dd><script>var x = "<div>Lv 99 Fake</div>";</script>`;

describe("BattlePost page", () => {
  const now = new Date("2026-11-23T10:00:00Z");

  it("reads level, item level, main tree and last logout", () => {
    expect(parseBattlePost(bpPage, now)).toEqual({
      level: 37, itemLevel: 34, spec: { name: "Survival", points: 28 }, lastSeen: "2026-11-22T18:00:00.000Z",
    });
    expect(parseBattlePost("<p>Not found</p>")).toBeNull();
    expect(battlePostUrl("EU", "Kurt Barren")).toBe("https://battlepost.net/en/eu/armory/kurt-barren");
  });

  it("wins over a staler Raider.IO level but keeps Raider.IO's gear", () => {
    const c = buildCharacter({ raiderIo: rio, battlePost: { html: bpPage, url: "bp" }, region: "eu", now });
    expect(c).toMatchObject({ level: 37, itemLevel: 34, spec: { name: "Survival", points: 28 }, gearFrom: rio.last_crawled_at });
    expect(c.equipment).toHaveLength(2);
    expect(c.links.map((l) => l.label)).toContain("BattlePost");
  });

  it("is ignored when it's behind Raider.IO", () => {
    const c = buildCharacter({ raiderIo: { ...rio, level: 40 }, battlePost: { html: bpPage, url: "bp" }, region: "eu", now });
    expect(c.level).toBe(40);
  });
});

describe("BattlePost gear, talents and sheet", () => {
  const page = `<a class="pd-s" href="https://www.wowhead.com/forever/item=274598"><span class="pd-t"><b class="q3">Bloodslash Axe</b><small>Main hand · iLvl 39</small></span></a>
<a class="pd-s" href="https://www.wowhead.com/forever/item=270032?ench=8"><span class="pd-t"><b class="q3">Cultist&#039;s Armguards</b><small>Wrist · iLvl 29</small></span></a>
<nav><a>Talents</a></nav><h3>Talents</h3><div>Beast Mastery</div><b>7</b><div>Marksmanship</div><b>10</b><div>Survival</div><b>11</b><span>Spent</span><b>28</b>
<b>5/5</b><b>Lethal Attacks</b><span>Rank 5/5</span><b>0/5</b><b>Efficiency</b><span>Rank 0/5</span>
<h3>Stats</h3><p>As of last logout, with gear and buffs</p><dt>Strength</dt><dd>46 (base 38)</dd><dt>Agility</dt><dd>145 (base 74)</dd>
<dt>Stamina</dt><dd>119</dd><dt>Intellect</dt><dd>69</dd><dt>Spirit</dt><dd>67</dd><h4>Melee</h4><dt>Attack power</dt><dd>382</dd>
<dt>Main hand</dt><dd>114–155 · speed 2.5 · 53.9 DPS</dd><dt>Crit</dt><dd>7.58%</dd><dt>Hit</dt><dd>1%</dd>
<h4>Ranged</h4><dt>Ranged attack power</dt><dd>481</dd><dt>Ranged weapon</dt><dd>159–196</dd><dt>Crit</dt><dd>11.06%</dd><dt>Hit</dt><dd>1%</dd><dt>Haste</dt><dd>10%</dd>
<h4>Defense</h4><dt>Armor</dt><dd>1,007 (base 56)</dd>`;
  const text = page.split(/<[^>]+>/).map((s) => s.trim()).filter(Boolean);

  it("reads equipped gear with quality and decoded names", () => {
    expect(parseBattlePostGear(page)).toEqual([
      { slot: "Main hand", id: 274598, name: "Bloodslash Axe", quality: "rare" },
      { slot: "Wrist", id: 270032, name: "Cultist's Armguards", quality: "rare" },
    ]);
  });
  it("reads talent ranks and tree points, skipping the site menu", () => {
    expect(parseBattlePostTalents(text)).toEqual({ ranks: { "Lethal Attacks": 5 }, trees: { "Beast Mastery": 7, Marksmanship: 10, Survival: 11 } });
  });
  it("reads the character sheet", () => {
    expect(parseBattlePostSheet(text)).toMatchObject({
      agility: 145, meleeAp: 382, mainHand: { min: 114, max: 155, speed: 2.5 }, offHand: null, meleeCrit: 7.58,
      rangedAp: 481, ranged: { min: 159, max: 196, speed: null }, rangedCrit: 11.06, rangedHaste: 10, armor: 1007,
    });
    expect(parseBattlePostSheet(["nothing"])).toBeNull();
  });
  it("reads a weapon's speed from its tooltip", () => {
    expect(parseWeaponTooltip(1, "Gun", "<td>41 - 78 Damage</td><th>Speed 2.80</th>")).toEqual({ id: 1, name: "Gun", min: 41, max: 78, speed: 2.8 });
  });
});
