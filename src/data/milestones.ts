import type { ClassId } from "./classes";

export type MilestoneKind =
  | "spell" | "armor" | "weapon" | "talent" | "pet" | "mount"
  | "profession" | "system" | "quest" | "dungeon" | "raid";

export interface Milestone {
  level: number;
  title: string;
  detail: string;
  kind: MilestoneKind;
  /** A headline unlock worth calling out ahead of time. */
  major?: boolean;
  /** Works differently from (or doesn't exist in) Classic Era. */
  foreverChange?: boolean;
  /** "confirmed" = a Forever source states it; "likely" = carried over from Classic, not yet confirmed for Forever. */
  confidence: "confirmed" | "likely";
  source?: string;
}

const WIKI_HUNTER = "https://warcraft.wiki.gg/wiki/Hunter_abilities_(Forever)";
const TAVERN_HUNTER = "https://www.warcrafttavern.com/forever/guides/hunter-leveling/";
const WIKI_FOREVER = "https://warcraft.wiki.gg/wiki/World_of_Warcraft:_Forever";
const BLIZZ_DEEPDIVE = "https://worldofwarcraft.blizzard.com/news/24301515";

/**
 * Hunter unlocks by level in WoW Forever. Hand-curated from the Forever wiki and leveling guides
 * (research report, Nov 2026). No public API exposes trainer level data, so this file is the source of truth.
 */
export const HUNTER_MILESTONES: Milestone[] = [
  { level: 1, kind: "spell", title: "Auto Shot, Raptor Strike, Track Beasts", detail: "Your starting kit. Keep your quiver or ammo pouch stocked.", confidence: "confirmed", source: WIKI_HUNTER },
  { level: 4, kind: "spell", title: "Aspect of the Monkey and Serpent Sting", detail: "Your first damage-over-time sting and a dodge aspect for when things reach melee.", confidence: "confirmed", source: WIKI_HUNTER },
  { level: 6, kind: "spell", title: "Hunter's Mark and Arcane Shot", detail: "Hunter's Mark now includes the old Improved Hunter's Mark talent. Arcane Shot no longer shares a cooldown with Aimed Shot.", foreverChange: true, confidence: "confirmed", source: BLIZZ_DEEPDIVE },
  { level: 8, kind: "spell", title: "Concussive Shot and Parry", detail: "A snare to kite with, plus Parry from the trainer.", confidence: "confirmed", source: WIKI_HUNTER },
  { level: 10, kind: "pet", major: true, title: "Tame your first pet", detail: "Pick up Taming the Beast from your trainer. Three taming quests teach Tame Beast, then Beast Training, Feed Pet and Revive Pet. Pets now scale from your gear: 10% of your attack power, 30% of your armour, your crit chance and 2 health per Stamina.", foreverChange: true, confidence: "confirmed", source: "https://www.warcrafttavern.com/forever/guides/hunter-pets/" },
  { level: 10, kind: "spell", title: "Aspect of the Hawk and Track Humanoids", detail: "Hawk is your main ranged damage aspect while levelling.", confidence: "confirmed", source: WIKI_HUNTER },
  { level: 12, kind: "spell", title: "Mend Pet, Wing Clip, Distracting Shot", detail: "Keep your pet alive between pulls with Mend Pet.", confidence: "confirmed", source: WIKI_HUNTER },
  { level: 14, kind: "spell", title: "Eagle Eye, Scare Beast, Eyes of the Beast", detail: "Eyes of the Beast includes its old improved talent.", foreverChange: true, confidence: "confirmed", source: BLIZZ_DEEPDIVE },
  { level: 16, kind: "spell", title: "Mongoose Bite and Immolation Trap", detail: "Traps can now be placed in combat, with separate Fire and Frost cooldowns, and Fire Traps scale with attack power.", foreverChange: true, confidence: "confirmed", source: BLIZZ_DEEPDIVE },
  { level: 18, kind: "spell", title: "Multi-Shot and Track Undead", detail: "Multi-Shot now shares its cooldown with Aimed Shot.", foreverChange: true, confidence: "confirmed", source: BLIZZ_DEEPDIVE },
  { level: 20, kind: "spell", major: true, title: "Aimed Shot is baseline", detail: "No talent needed in Forever, and the cast is 2 seconds instead of 3. You also get Aspect of the Cheetah, Freezing Trap and Disengage, which now drops twice as much threat.", foreverChange: true, confidence: "confirmed", source: BLIZZ_DEEPDIVE },
  { level: 20, kind: "weapon", title: "Dual Wield and Polearms", detail: "Train Dual Wield and the Polearm skill. Melee weapons are stat sticks for most hunters, so look for Agility.", confidence: "confirmed", source: TAVERN_HUNTER },
  { level: 20, kind: "pet", title: "Fox pets learn Trickster's Dance", detail: "Fox is a new pet family in Forever. Every family has one unique ability.", foreverChange: true, confidence: "confirmed", source: BLIZZ_DEEPDIVE },
  { level: 22, kind: "spell", title: "Scorpid Sting", detail: "Now also lowers the target's chance to hit by 2%.", foreverChange: true, confidence: "confirmed", source: BLIZZ_DEEPDIVE },
  { level: 24, kind: "spell", title: "Beast Lore and Track Hidden", detail: "Beast Lore shows a beast's abilities before you tame it.", confidence: "confirmed", source: WIKI_HUNTER },
  { level: 25, kind: "talent", major: true, title: "16-point milestone talent", detail: "New in Forever: Summon Hawk (Beast Mastery) or Counterattack (Survival). Trueshot Aura is now raid-wide.", foreverChange: true, confidence: "confirmed", source: TAVERN_HUNTER },
  { level: 26, kind: "spell", title: "Rapid Fire and Track Elementals", detail: "Your first big ranged cooldown.", confidence: "confirmed", source: WIKI_HUNTER },
  { level: 28, kind: "spell", title: "Frost Trap", detail: "A frost trap and a fire trap can be out at the same time.", foreverChange: true, confidence: "confirmed", source: WIKI_HUNTER },
  { level: 30, kind: "spell", major: true, title: "Feign Death", detail: "Drop threat, reset bad pulls and split groups. Aspect of the Beast arrives too, and now grants melee attack power.", foreverChange: true, confidence: "confirmed", source: WIKI_HUNTER },
  { level: 30, kind: "talent", title: "21-point milestone talents", detail: "Intimidation and Bestial Discipline (BM), Strider Kick, Expose Prey and Resourcefulness (SV), Rapid Recuperation (MM).", foreverChange: true, confidence: "confirmed", source: TAVERN_HUNTER },
  { level: 32, kind: "spell", title: "Flare and Track Demons", detail: "Flare reveals stealthed enemies.", confidence: "confirmed", source: WIKI_HUNTER },
  { level: 34, kind: "spell", title: "Explosive Trap", detail: "Your area-of-effect trap.", confidence: "confirmed", source: WIKI_HUNTER },
  { level: 36, kind: "spell", title: "Viper Sting", detail: "Drains mana from casters.", confidence: "confirmed", source: WIKI_HUNTER },
  { level: 40, kind: "armor", major: true, title: "Mail armour", detail: "Learn Mail from your hunter trainer. Expect a big armour jump across every slot, so keep any mail you loot from level 37 onwards.", confidence: "confirmed", source: WIKI_HUNTER },
  { level: 40, kind: "spell", title: "Volley, Aspect of the Pack, Track Giants", detail: "Volley is your channelled area attack.", confidence: "confirmed", source: WIKI_HUNTER },
  { level: 40, kind: "talent", major: true, title: "31-point capstone talents", detail: "Bestial Wrath (BM), Sniper Shot (MM) or Lacerating Strikes (SV).", foreverChange: true, confidence: "confirmed", source: TAVERN_HUNTER },
  { level: 46, kind: "spell", title: "Aspect of the Wild", detail: "Nature resistance for your group, useful in Zul'Farrak and Maraudon.", confidence: "confirmed", source: WIKI_HUNTER },
  { level: 50, kind: "spell", title: "Track Dragonkin", detail: "Tracking for Blackrock Spire and the dragon zones.", confidence: "confirmed", source: WIKI_HUNTER },
  { level: 60, kind: "spell", title: "Tranquilizing Shot", detail: "Removes enrage effects. Its source in Forever (trainer or a raid book) hasn't been confirmed.", confidence: "likely", source: TAVERN_HUNTER },
];

/** Every class trains new spell ranks roughly every even level (Classic rule, not yet confirmed for Forever). */
export function rankReminder(level: number): Milestone | null {
  if (level < 2 || level % 2 !== 0) return null;
  return {
    level, kind: "spell", confidence: "likely",
    title: "New spell ranks at your trainer",
    detail: "Visit your class trainer for new ranks of the spells you already know.",
  };
}

/** Unlocks that apply to every class. */
export const GENERAL_MILESTONES: Milestone[] = [
  { level: 5, kind: "profession", title: "Apprentice professions", detail: "Professions can be trained up to Apprentice (75). Camping unlocks around now too, with campsite tools for every profession.", foreverChange: true, confidence: "confirmed", source: TAVERN_HUNTER },
  { level: 10, kind: "talent", major: true, title: "Talents unlock", detail: "Your first talent point. Changing talents needs a visit to a class trainer in a major city.", confidence: "confirmed", source: BLIZZ_DEEPDIVE },
  { level: 10, kind: "profession", title: "Journeyman professions", detail: "Train up to 150 skill. Waylaid Crates start counting from level 10 for Merchant's Favor.", confidence: "confirmed", source: TAVERN_HUNTER },
  { level: 20, kind: "profession", title: "Expert professions", detail: "Train up to 225 skill. Expert Waylaid Crates open from 20.", confidence: "confirmed", source: TAVERN_HUNTER },
  { level: 25, kind: "system", title: "Legacy: level 25 challenge", detail: "Your first Legacy milestone. Legacy points buy account-wide perks, such as up to 5 extra talent points.", foreverChange: true, confidence: "confirmed", source: WIKI_FOREVER },
  { level: 35, kind: "profession", title: "Artisan professions", detail: "Train up to 300 skill. Artisan Waylaid Crates open from 35.", confidence: "confirmed", source: TAVERN_HUNTER },
  { level: 40, kind: "mount", major: true, title: "Apprentice Riding", detail: "Learn riding for 60% speed. Budget about 100g for the training (sources disagree on whether the first mount is included).", confidence: "confirmed", source: WIKI_FOREVER },
  { level: 40, kind: "talent", title: "Dual Talent Specialization", detail: "Buy a second talent spec from your class trainer for 50g. Handy for a levelling spec and a dungeon spec.", foreverChange: true, confidence: "confirmed", source: WIKI_FOREVER },
  { level: 40, kind: "system", title: "Legacy: level 40 challenge", detail: "Another Legacy milestone for account-wide perks.", foreverChange: true, confidence: "confirmed", source: WIKI_FOREVER },
  { level: 60, kind: "mount", major: true, title: "Expert Riding and epic mounts", detail: "100% speed riding: about 1,000g for training plus 200g for an epic mount. There is no flying in Forever.", confidence: "confirmed", source: WIKI_FOREVER },
  { level: 60, kind: "raid", major: true, title: "Raids open", detail: "Barrow Deeps (10-player), Hyjal Summit (20) and Onyxia's Lair (40, needs the Drakefire attunement) unlock on 9 December 2026.", foreverChange: true, confidence: "confirmed", source: WIKI_FOREVER },
  { level: 60, kind: "system", title: "Legacy: level 60 challenge", detail: "The final levelling Legacy milestone.", foreverChange: true, confidence: "confirmed", source: WIKI_FOREVER },
];

export function classMilestones(classId: ClassId): Milestone[] {
  return classId === "hunter" ? HUNTER_MILESTONES : [];
}
