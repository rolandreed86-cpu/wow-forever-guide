/**
 * Reads a talent build and says how it compares with the recommended builds and how to improve it.
 * Pure functions, so the page and the tests share them.
 */
import { allocFromNames, spentInTree, splitOf, totalSpent, type Allocation, type Talent, type TalentClass } from "./talents";
import { buildAtPoints, type RecommendedBuild, type TalentNote } from "@/data/talentBuilds";

export type SuggestionKind = "warn" | "improve" | "tip" | "good";
export interface Suggestion {
  kind: SuggestionKind;
  text: string;
}

export interface TalentDelta {
  talent: Talent;
  yours: number;
  theirs: number;
}

export interface BuildAnalysis {
  points: number;
  split: number[];
  /** Points in talents whose note says they add damage. */
  damagePoints: number;
  /** Points in talents that don't add damage (defence, utility, crowd control, mana, pet). */
  otherPoints: { talent: Talent; pts: number; category: string }[];
  /** Talents from the last row (31-point talents) the build takes. */
  capstones: string[];
  /** The recommended build closest to this one at the same number of points. */
  closest: { build: RecommendedBuild; match: number; deltas: TalentDelta[] } | null;
  suggestions: Suggestion[];
}

const ORDER: Record<SuggestionKind, number> = { warn: 0, improve: 1, tip: 2, good: 3 };
const firstSentence = (s: string) => (s.match(/^.*?[.!?](\s|$)/)?.[0] ?? s).trim();

/** Share of this build's points that sit where a reference build puts them (0 to 1). */
export function overlap(cls: TalentClass, a: Allocation, b: Allocation): number {
  const pts = totalSpent(cls, a);
  if (pts === 0) return 0;
  const all = cls.trees.flatMap((t) => t.talents);
  return all.reduce((n, t) => n + Math.min(a[t.id] ?? 0, b[t.id] ?? 0), 0) / pts;
}

export function deltas(cls: TalentClass, a: Allocation, b: Allocation): TalentDelta[] {
  return cls.trees
    .flatMap((t) => t.talents)
    .map((talent) => ({ talent, yours: a[talent.id] ?? 0, theirs: b[talent.id] ?? 0 }))
    .filter((d) => d.yours !== d.theirs);
}

export function analyzeBuild(
  cls: TalentClass,
  alloc: Allocation,
  budget: number,
  builds: RecommendedBuild[],
  notes: Record<string, TalentNote>,
): BuildAnalysis {
  const all = cls.trees.flatMap((t) => t.talents);
  const points = totalSpent(cls, alloc);
  const split = splitOf(cls, alloc);
  const suggestions: Suggestion[] = [];
  const say = (kind: SuggestionKind, text: string) => suggestions.push({ kind, text });
  const has = (name: string) => {
    const t = all.find((x) => x.name === name);
    return t ? alloc[t.id] ?? 0 : 0;
  };
  const deepestRow = Math.max(...all.map((t) => t.row));

  let damagePoints = 0;
  const otherPoints: BuildAnalysis["otherPoints"] = [];
  for (const t of all) {
    const pts = alloc[t.id] ?? 0;
    if (!pts) continue;
    const cat = notes[t.name]?.category ?? "damage";
    if (cat === "damage") damagePoints += pts;
    else otherPoints.push({ talent: t, pts, category: cat });
  }
  const capstones = all.filter((t) => t.row === deepestRow && (alloc[t.id] ?? 0) > 0).map((t) => t.name);

  // Closest recommended build at the same number of points.
  let closest: BuildAnalysis["closest"] = null;
  for (const b of builds) {
    const ref = allocFromNames(cls, buildAtPoints(b, points)).alloc;
    const match = overlap(cls, alloc, ref);
    if (!closest || match > closest.match) closest = { build: b, match, deltas: deltas(cls, alloc, ref) };
  }

  if (points === 0) {
    return { points, split, damagePoints, otherPoints, capstones, closest: null, suggestions: [{ kind: "tip", text: "No points spent yet. Load a recommended build or click talents to start." }] };
  }

  // Unspent points, and where the closest build would put them.
  const left = budget - points;
  if (left > 0) {
    let where = "";
    if (closest) {
      const now = allocFromNames(cls, buildAtPoints(closest.build, points)).alloc;
      const next = allocFromNames(cls, buildAtPoints(closest.build, budget)).alloc;
      const adds = deltas(cls, now, next).filter((d) => d.theirs > d.yours).map((d) => `${d.talent.name} +${d.theirs - d.yours}`);
      if (adds.length) where = ` ${closest.build.name} would put them into ${adds.join(", ")}.`;
    }
    say("improve", `You have ${left} point${left > 1 ? "s" : ""} left to spend.${where}`);
  }

  // Lone Wolf only works without a pet, so pet talents waste points.
  if (has("Lone Wolf")) {
    const petPts = otherPoints.filter((o) => o.category === "pet").reduce((n, o) => n + o.pts, 0)
      + has("Focused Fire") + has("Unleashed Fury") + has("Ferocity") + has("Frenzy") + has("Bestial Wrath");
    if (petPts > 0) say("warn", `Lone Wolf only works with no pet out, but ${petPts} point${petPts > 1 ? "s are" : " is"} in pet talents. Pick one or the other.`);
  }

  // Spread thin: no tree deep enough for its strongest talents.
  const deepest = Math.max(...split);
  const capstoneNeed = (deepestRow - 1) * 5;
  if (points >= capstoneNeed + 1 && deepest < capstoneNeed) {
    const names = cls.trees.map((t) => t.talents.find((x) => x.row === deepestRow)?.name).filter(Boolean).join(", ");
    say("warn", `No tree reaches ${capstoneNeed} points, so you can't take any 31-point talent (${names}). Move points into your main tree.`);
  } else if (points >= 20 && split.filter((n) => n >= 5).length === 3 && deepest < 21) {
    say("warn", `Points are spread over all three trees (${split.join("/")}). Each tree's best talents are deep, so pick one main tree and one support tree.`);
  }

  // Swaps that turn it into the closest recommended build.
  if (closest && closest.match < 1) {
    const priority = (cat: string) => (cat === "damage" ? 1 : 0);
    const out = closest.deltas.filter((d) => d.yours > d.theirs)
      .sort((x, y) => priority(notes[x.talent.name]?.category ?? "damage") - priority(notes[y.talent.name]?.category ?? "damage"));
    const into = closest.deltas.filter((d) => d.theirs > d.yours);
    const fmt = (ds: TalentDelta[], sign: string) =>
      ds.slice(0, 5).map((d) => `${d.talent.name} ${sign}${Math.abs(d.theirs - d.yours)}`).join(", ") + (ds.length > 5 ? ` and ${ds.length - 5} more` : "");
    if (out.length && into.length) {
      say("improve", `To match ${closest.build.name} (${Math.round(closest.match * 100)}% the same now): take points out of ${fmt(out, "−")} and put them into ${fmt(into, "+")}.`);
    }
  }

  // Core damage talents most recommended builds max out, that this build can already reach.
  for (const t of all) {
    const note = notes[t.name];
    if (note?.category !== "damage") continue;
    const takers = builds.filter((b) => (buildAtPoints(b, 51)[t.name] ?? 0) >= t.maxRank).length;
    if (takers * 2 < builds.length || takers === 0) continue;
    const pts = alloc[t.id] ?? 0;
    if (pts >= t.maxRank) continue;
    // Not yet: the closest recommended build hasn't bought more of it at this many points either.
    const refPts = closest ? allocFromNames(cls, buildAtPoints(closest.build, points)).alloc[t.id] ?? 0 : t.maxRank;
    if (refPts <= pts) continue;
    const tree = cls.trees.find((tr) => tr.talents.includes(t))!;
    const spentBelow = tree.talents.filter((x) => x.row < t.row).reduce((n, x) => n + (alloc[x.id] ?? 0), 0);
    if (spentBelow < (t.row - 1) * 5 || spentInTree(tree, alloc) === 0) continue;
    say("improve", `${t.name} is ${pts}/${t.maxRank}; ${takers} of ${builds.length} recommended builds max it. ${firstSentence(note.overview)}`);
  }

  // More points in non-damage talents than the closest build needs for its row gates.
  if (closest) {
    const ref = allocFromNames(cls, buildAtPoints(closest.build, points)).alloc;
    const refOther = all.filter((t) => (notes[t.name]?.category ?? "damage") !== "damage").reduce((n, t) => n + (ref[t.id] ?? 0), 0);
    const mine = otherPoints.reduce((n, o) => n + o.pts, 0);
    if (mine > refOther + 2) {
      const top = [...otherPoints].sort((a, b) => b.pts - a.pts).slice(0, 4).map((o) => `${o.talent.name} ${o.pts} (${o.category})`).join(", ");
      say("warn", `${mine} points add no damage (${top}), against ${refOther} in ${closest.build.name}. Fine for solo or PvP, but costs DPS in groups.`);
    }
  }

  // Play tips the build implies.
  if (has("Expose Prey")) say("tip", "Expose Prey only procs on targets with your Hunter's Mark, so keep it up.");
  if (has("Careful Aim") >= 5) say("tip", "With Careful Aim 5/5, Intellect is worth as much as Agility on gear.");
  if (has("Trueshot Aura")) say("tip", "Only one hunter per group needs Trueshot Aura. If another hunter has it, those points can go elsewhere.");
  if (has("Improved Tracking")) say("tip", "Improved Tracking needs the right tracking on: switch it to the type of the creature you're fighting.");
  if (closest && closest.match >= 0.999) say("good", `Matches ${closest.build.name}, a recommended build, point for point.`);
  else if (closest && closest.match >= 0.9) say("good", `${Math.round(closest.match * 100)}% the same as ${closest.build.name}, a recommended build. Looks solid.`);

  suggestions.sort((a, b) => ORDER[a.kind] - ORDER[b.kind]);
  return { points, split, damagePoints, otherPoints, capstones, closest, suggestions };
}
