import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  addLock, addPoint, allocFromNames, decodeBuild, encodeBuild, fitToBudget, isValid, pointsAvailable, removePoint, splitOf,
  totalSpent, type TalentClass,
} from "@/lib/talents";
import { HUNTER_BUILDS, TALENT_NOTES, buildAtPoints, levellingPlan } from "@/data/talentBuilds";
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

describe("build codes", () => {
  it("round-trips an allocation", () => {
    const a = add(add(add({}, "a1", 5), "a3", 2), "b1", 3);
    const code = encodeBuild(cls, a);
    expect(code).toBe("502-3");
    expect(decodeBuild(cls, code)).toEqual(a);
  });
  it("writes an empty tree as 0 and rejects bad codes", () => {
    expect(encodeBuild(cls, {})).toBe("0-0");
    expect(decodeBuild(cls, "0-0")).toEqual({});
    expect(decodeBuild(cls, "9-0")).toBeNull(); // over max rank
    expect(decodeBuild(cls, "5")).toBeNull(); // wrong tree count
    expect(decodeBuild(cls, "55555-0")).toBeNull(); // more talents than the tree has
  });
  it("parses shared talent links", () => {
    expect(parseHash("#talents-hunter-0-55-5")).toEqual({ view: "talents", param: "hunter-0-55-5" });
    expect(parseHash("#talents")).toEqual({ view: "talents", param: null });
  });
});

describe("recommended builds", () => {
  it("cuts a build to a levelling stage in spend order", () => {
    const b = HUNTER_BUILDS.find((x) => x.id === "sv-weave")!;
    expect(buildAtPoints(b, 7)).toEqual({ "Improved Tracking": 5, "Savage Strikes": 2 });
    const plan = levellingPlan(b);
    expect(plan[0]).toMatchObject({ talent: "Improved Tracking", from: 10, to: 14 });
    expect(plan.at(-1)!.to).toBe(60);
    expect(levellingPlan(b, 5)[0]).toMatchObject({ from: 10, to: 10 });
  });
  it("spends exactly 51 points, and 56 with Legacy", () => {
    for (const b of HUNTER_BUILDS) {
      expect(b.order.reduce((n, s) => n + s.points, 0), b.id).toBe(51);
      expect(b.legacy.reduce((n, s) => n + s.points, 0), b.id).toBeLessThanOrEqual(5);
      const split = b.split.split("/").map(Number);
      expect(split.reduce((x, y) => x + y, 0), b.id).toBe(51);
    }
  });

  const file = resolve(__dirname, "../../public/data/talents/hunter.json");
  it.skipIf(!existsSync(file))("is legal at every level against the real Forever trees", () => {
    const hunter = JSON.parse(readFileSync(file, "utf8")) as TalentClass;
    for (const b of HUNTER_BUILDS) {
      for (let pts = 1; pts <= 56; pts++) {
        const { alloc, missing } = allocFromNames(hunter, buildAtPoints(b, pts));
        expect(missing, b.id).toEqual([]);
        expect(isValid(hunter, alloc, pts), `${b.id} at ${pts} points`).toBe(true);
        expect(totalSpent(hunter, alloc)).toBe(Math.min(pts, 51 + b.legacy.reduce((n, s) => n + s.points, 0)));
      }
      const { alloc } = allocFromNames(hunter, buildAtPoints(b, 51));
      expect(splitOf(hunter, alloc).join("/"), b.id).toBe(b.split);
      expect(decodeBuild(hunter, encodeBuild(hunter, alloc))).toEqual(alloc);
    }
  });
  it.skipIf(!existsSync(file))("has a note for every hunter talent", () => {
    const hunter = JSON.parse(readFileSync(file, "utf8")) as TalentClass;
    const names = hunter.trees.flatMap((t) => t.talents.map((x) => x.name));
    expect(names.filter((n) => !TALENT_NOTES.hunter[n])).toEqual([]);
  });
});
