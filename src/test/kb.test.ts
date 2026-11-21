import { describe, expect, it } from "vitest";
import { parseKb, formatMoney } from "@/lib/kb";

describe("parseKb", () => {
  it("maps columnar rows to items with named stats", () => {
    const fields = ["id", "name", "q", "ilvl", "req", "ic", "sub", "slot", "mask", "bind", "uniq", "speed", "min", "max", "dps", "approx", "armor", "st", "other", "fx", "set", "rep", "desc", "sell", "src", "srcTypes", "lvl", "est", "startsQuest"];
    const row = [7718, "Herod's Shoulder", 3, 42, 37, "Armor", "Mail", "Shoulder", -1, "Binds when picked up", 0, null, null, null, null, null, 196, [[1, 6], [2, 15]], null, null, null, null, null, 6867, "Drop: Herod (lvl 40 elite, Scarlet Monastery, 25%)", "drop", 37, 1, null];
    const kb = parseKb({ build: "1.60.1", fields, stats: ["agility", "strength", "stamina"], items: [row], questFields: [], quests: [] });
    const it0 = kb.byId.get(7718)!;
    expect(it0.quality).toBe("rare");
    expect(it0.stats).toEqual({ strength: 6, stamina: 15 });
    expect(it0.subclass).toBe("Mail");
    expect(it0.sourceTypes).toEqual(["drop"]);
  });
  it("formats copper as gold, silver and copper", () => {
    expect(formatMoney(6867)).toBe("68s 67c");
    expect(formatMoney(1234567)).toBe("123g 45s 67c");
  });
});
