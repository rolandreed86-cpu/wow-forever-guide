import { CLASSES, type ClassId, type Faction } from "@/data/classes";
import { GENERAL_MILESTONES, classMilestones, rankReminder, type Milestone } from "@/data/milestones";
import type { ClassQuest, Dungeon } from "./types";

export interface GuidanceInput {
  classId: ClassId;
  level: number;
  faction: Faction;
  dungeons?: Dungeon[];
  classQuests?: ClassQuest[];
}

export interface LevelGroup {
  level: number;
  items: Milestone[];
}

function armorMilestones(classId: ClassId): Milestone[] {
  const cls = CLASSES[classId];
  if (classId === "hunter") return []; // already in the hunter timeline
  return Object.entries(cls.armor)
    .filter(([, lvl]) => lvl > 1)
    .map(([type, lvl]) => ({
      level: lvl, kind: "armor" as const, major: true, confidence: "confirmed" as const,
      title: `${type} armour`,
      detail: `${cls.name}s can learn to wear ${type} from their trainer. Keep any ${type.toLowerCase()} you loot a few levels early.`,
      source: "https://warcraft.wiki.gg/wiki/World_of_Warcraft:_Forever",
    }));
}

function dungeonMilestones(dungeons: Dungeon[], faction: Faction): Milestone[] {
  return dungeons
    .filter((d) => d.status === "launch" && (!d.access || d.access === faction))
    .map((d) => ({
      level: d.minLevel, kind: "dungeon" as const, confidence: "confirmed" as const, foreverChange: d.isNew,
      title: `${d.name} opens up`,
      detail: `Levels ${d.minLevel}–${d.maxLevel} in ${d.zone}. ${d.bosses.length} bosses, ${d.lootCount} known drops${d.isNew ? ". New in Forever" : ""}.`,
      source: d.url,
    }));
}

function classQuestMilestones(quests: ClassQuest[], classId: ClassId, faction: Faction): Milestone[] {
  return quests
    .filter((q) => q.class === classId && (q.faction === "both" || q.faction === faction))
    // The hunter timeline already covers the level 10 pet quest in more detail.
    .filter((q) => !(classId === "hunter" && q.id === "hunter-taming"))
    .map((q) => ({
      level: q.level, kind: "quest" as const, major: q.essential, confidence: "confirmed" as const,
      title: `Class quest: ${q.name}`,
      detail: `Rewards ${q.reward}. ${q.giver ? `Starts from ${q.giver}` : ""}${q.location ? ` (${q.location})` : ""}.`.replace(/\s+\./g, "."),
    }));
}

/** Every milestone for this character, sorted by level. */
export function allMilestones(input: GuidanceInput): Milestone[] {
  const list = [
    ...classMilestones(input.classId),
    ...armorMilestones(input.classId),
    ...GENERAL_MILESTONES,
    ...dungeonMilestones(input.dungeons ?? [], input.faction),
    ...classQuestMilestones(input.classQuests ?? [], input.classId, input.faction),
  ];
  const order: Record<string, number> = { armor: 0, talent: 1, pet: 2, spell: 3, weapon: 4, mount: 5, quest: 6, raid: 7, dungeon: 8, profession: 9, system: 10 };
  return list.sort((a, b) => a.level - b.level || Number(!!b.major) - Number(!!a.major) || order[a.kind] - order[b.kind]);
}

/** Milestones for the next `span` levels, grouped by level, with rank reminders on even levels. */
export function upcoming(input: GuidanceInput, span = 10): LevelGroup[] {
  const from = input.level + 1;
  const to = Math.min(60, input.level + span);
  const all = allMilestones(input);
  const groups: LevelGroup[] = [];
  for (let lvl = from; lvl <= to; lvl++) {
    const items = all.filter((m) => m.level === lvl);
    const rank = rankReminder(lvl);
    if (rank && !items.some((m) => m.kind === "spell")) items.push(rank);
    if (items.length) groups.push({ level: lvl, items });
  }
  return groups;
}

/** What unlocked at the current level (useful right after a ding). */
export function current(input: GuidanceInput): Milestone[] {
  return allMilestones(input).filter((m) => m.level === input.level);
}

/** The nearest headline milestone above the current level. */
export function nextMajor(input: GuidanceInput): Milestone | null {
  return allMilestones(input).find((m) => m.level > input.level && m.major && m.kind !== "dungeon") ?? null;
}
