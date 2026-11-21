import { describe, expect, it } from "vitest";
import { addLock, addPoint, fitToBudget, pointsAvailable, removePoint, totalSpent, type TalentClass } from "@/lib/talents";
import { parseHash } from "@/lib/router";

const t = (id: string, row: number, col: number, maxRank: number, prerequisite: string | null = null) => ({
  id, name: id, row, col, maxRank, passive: true, prerequisite, cost: null, status: null, classicName: null,
  ranks: Array.from({ length: maxRank }, (_, i) => ({ rank: i + 1, text: `${id} ${i + 1}`, confidence: "source" })),
});
const cls: TalentClass = {
  class: "hunter", name: "Hunter", version: "test", source: "",
  trees: [
    { name: "A", removed: [], talents: [t("a1", 1, 1, 5), t("a2", 1, 2, 5), t("a3", 2, 1, 3), t("a4", 3, 1, 1, "a3")] },
    { name: "B", removed: [], talents: [t("b1", 1, 1, 5)] },
  ],
};
const add = (a: Record<string, number>, id: string, n: number, budget = 51) => {
  for (let i = 0; i < n; i++) a = addPoint(cls, a, budget, id);
  return a;
};

describe("talent rules", () => {
  it("gives one point per level from 10, plus Legacy bonus", () => {
    expect(pointsAvailable(9)).toBe(0);
    expect(pointsAvailable(10)).toBe(1);
    expect(pointsAvailable(60)).toBe(51);
    expect(pointsAvailable(60, 5)).toBe(56);
    expect(pointsAvailable(60, 9)).toBe(56);
  });
  it("gates rows by points spent in the tree", () => {
    let a = add({}, "a1", 4);
    expect(addLock(cls, a, 51, "a3")?.reason).toMatch(/Needs 5 points in A/);
    a = add(a, "a1", 1);
    expect(addLock(cls, a, 51, "a3")).toBeNull();
    expect(add({}, "a1", 9).a1).toBe(5); // capped at max rank
  });
  it("needs a maxed prerequisite", () => {
    let a = add(add({}, "a1", 5), "a2", 5);
    a = add(a, "a3", 2);
    expect(addLock(cls, a, 51, "a4")?.reason).toMatch(/Needs 3 points in a3/);
    a = add(a, "a3", 1);
    expect(add(a, "a4", 1).a4).toBe(1);
  });
  it("refuses refunds that break deeper talents", () => {
    const a = add(add(add({}, "a1", 5), "a2", 5), "a3", 3);
    const b = add(a, "a4", 1);
    expect(removePoint(cls, b, 51, "a3")).toBe(b); // a4 depends on a maxed a3
    expect(removePoint(cls, a, 51, "a1").a1).toBe(4); // still 9 below row 2 (needs 5)
  });
  it("respects the point budget and trims deepest points first", () => {
    const a = add(add({}, "a1", 5), "a3", 3, 8);
    expect(totalSpent(cls, a)).toBe(8);
    expect(addLock(cls, a, 8, "b1")?.reason).toBe("No points left");
    const trimmed = fitToBudget(cls, a, 5);
    expect(trimmed).toEqual({ a1: 5 });
  });
});

describe("hash routes", () => {
  it("parses plain and parameter routes", () => {
    expect(parseHash("")).toEqual({ view: "guidance", param: null });
    expect(parseHash("#gear")).toEqual({ view: "gear", param: null });
    expect(parseHash("#dungeon-sm-armory")).toEqual({ view: "dungeon", param: "sm-armory" });
    expect(parseHash("#dungeons")).toEqual({ view: "dungeons", param: null });
  });
});
