/** Talent trees from Talents Forever (CC BY 4.0) via WoW Forever Talent, and the planner's allocation rules. */

export interface TalentRank {
  rank: number;
  text: string;
  confidence: string;
}

export interface Talent {
  id: string;
  name: string;
  row: number;
  col: number;
  maxRank: number;
  passive: boolean;
  prerequisite: string | null;
  cost: string | null;
  ranks: TalentRank[];
  /** Compared with Classic: "new", "changed", "moved" or "same". */
  status: string | null;
  classicName: string | null;
}

export interface TalentTree {
  name: string;
  talents: Talent[];
  removed: { name: string; text: string | null }[];
}

export interface TalentClass {
  class: string;
  name: string;
  version: string;
  source: string;
  trees: TalentTree[];
}

/** Talent id → points spent. */
export type Allocation = Record<string, number>;

export const POINTS_PER_ROW = 5;
export const MAX_LEGACY_BONUS = 5;

/** One point per level from 10, plus up to 5 from the Legacy "Talented" perk. */
export function pointsAvailable(level: number, legacyBonus = 0): number {
  return Math.max(0, level - 9) + (level >= 10 ? Math.min(MAX_LEGACY_BONUS, Math.max(0, legacyBonus)) : 0);
}

export function spentInTree(tree: TalentTree, alloc: Allocation): number {
  return tree.talents.reduce((n, t) => n + (alloc[t.id] ?? 0), 0);
}

export function totalSpent(cls: TalentClass, alloc: Allocation): number {
  return cls.trees.reduce((n, t) => n + spentInTree(t, alloc), 0);
}

function spentBelowRow(tree: TalentTree, alloc: Allocation, row: number): number {
  return tree.talents.filter((t) => t.row < row).reduce((n, t) => n + (alloc[t.id] ?? 0), 0);
}

function findTalent(cls: TalentClass, id: string): { tree: TalentTree; talent: Talent } | null {
  for (const tree of cls.trees) {
    const talent = tree.talents.find((t) => t.id === id);
    if (talent) return { tree, talent };
  }
  return null;
}

/** Every rule an allocation must meet: rank limits, row gates, prerequisites and the point budget. */
export function isValid(cls: TalentClass, alloc: Allocation, budget: number): boolean {
  if (totalSpent(cls, alloc) > budget) return false;
  for (const tree of cls.trees) {
    for (const t of tree.talents) {
      const pts = alloc[t.id] ?? 0;
      if (pts === 0) continue;
      if (pts > t.maxRank || pts < 0) return false;
      if (spentBelowRow(tree, alloc, t.row) < (t.row - 1) * POINTS_PER_ROW) return false;
      if (t.prerequisite) {
        const pre = findTalent(cls, t.prerequisite);
        if (pre && (alloc[pre.talent.id] ?? 0) < pre.talent.maxRank) return false;
      }
    }
  }
  return true;
}

export type Lock = null | { reason: string };

/** Why a point can't be added to this talent right now, or null if it can. */
export function addLock(cls: TalentClass, alloc: Allocation, budget: number, id: string): Lock {
  const found = findTalent(cls, id);
  if (!found) return { reason: "Unknown talent" };
  const { tree, talent } = found;
  const pts = alloc[id] ?? 0;
  if (pts >= talent.maxRank) return { reason: "Maxed" };
  const needRow = (talent.row - 1) * POINTS_PER_ROW;
  if (spentBelowRow(tree, alloc, talent.row) < needRow) return { reason: `Needs ${needRow} points in ${tree.name}` };
  if (talent.prerequisite) {
    const pre = findTalent(cls, talent.prerequisite);
    if (pre && (alloc[pre.talent.id] ?? 0) < pre.talent.maxRank) return { reason: `Needs ${pre.talent.maxRank} points in ${pre.talent.name}` };
  }
  if (totalSpent(cls, alloc) >= budget) return { reason: "No points left" };
  return null;
}

export function addPoint(cls: TalentClass, alloc: Allocation, budget: number, id: string): Allocation {
  if (addLock(cls, alloc, budget, id)) return alloc;
  return { ...alloc, [id]: (alloc[id] ?? 0) + 1 };
}

/** Remove a point, unless that would break a talent that depends on it. */
export function removePoint(cls: TalentClass, alloc: Allocation, budget: number, id: string): Allocation {
  const pts = alloc[id] ?? 0;
  if (pts === 0) return alloc;
  const next = { ...alloc, [id]: pts - 1 };
  if (next[id] === 0) delete next[id];
  return isValid(cls, next, Math.max(budget, totalSpent(cls, next))) ? next : alloc;
}

/** Drop points from the deepest talents until the build fits a smaller budget (e.g. after lowering the level). */
export function fitToBudget(cls: TalentClass, alloc: Allocation, budget: number): Allocation {
  let next = { ...alloc };
  const order = cls.trees.flatMap((tr) => tr.talents).sort((a, b) => b.row - a.row);
  let guard = 500;
  while (totalSpent(cls, next) > budget && guard-- > 0) {
    const t = order.find((x) => (next[x.id] ?? 0) > 0 && removePoint(cls, next, Infinity, x.id) !== next);
    if (!t) break;
    next = removePoint(cls, next, Infinity, t.id);
  }
  return next;
}

/** The talent's description at its current rank, or rank 1 if none is spent. */
export function rankText(t: Talent, pts: number): TalentRank | null {
  const want = Math.max(1, pts);
  return t.ranks.find((r) => r.rank === want) ?? t.ranks[t.ranks.length - 1] ?? null;
}

/** Name of the build by where most points went, e.g. "Marksmanship (5/31/0)". */
export function buildSummary(cls: TalentClass, alloc: Allocation): string {
  const per = cls.trees.map((t) => spentInTree(t, alloc));
  if (per.every((p) => p === 0)) return "No points spent";
  const top = per.indexOf(Math.max(...per));
  return `${cls.trees[top].name} (${per.join("/")})`;
}
