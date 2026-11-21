/** Raids in WoW Forever's first tier (research report, Nov 2026). Loot tables aren't public yet. */
export interface Raid {
  id: string;
  name: string;
  size: number;
  bosses: number;
  opens: string;
  isNew: boolean;
  note: string;
}

export const RAID_OPEN_DATE = "2026-12-09";

export const RAIDS: Raid[] = [
  { id: "barrow-deeps", name: "Barrow Deeps", size: 10, bosses: 8, opens: RAID_OPEN_DATE, isNew: true, note: "New 10-player raid. A good first raid for small guilds." },
  { id: "hyjal-summit", name: "Hyjal Summit", size: 20, bosses: 13, opens: RAID_OPEN_DATE, isNew: true, note: "New 20-player raid tied to the Mount Hyjal zone." },
  { id: "onyxias-lair", name: "Onyxia's Lair", size: 40, bosses: 1, opens: RAID_OPEN_DATE, isNew: false, note: "40-player. Needs the Drakefire attunement questline." },
];

export const LATER_CONTENT = [
  { when: "Winter 2026/27", what: "Hardcore mode" },
  { when: "Spring 2027", what: "2 raids, 2 dungeons, a new zone and a legendary questline" },
  { when: "Summer 2027", what: "A revamped iconic raid, a new raid and 2 dungeons" },
];
