/** Pet choice for a talent build and the DPS estimate on the character's current gear. */
import { useCallback, useMemo, useState } from "react";
import { SYNCED } from "@/lib/character";
import { BEASTS, FAMILY_BY_ID, type Beast } from "@/data/pets";
import { bestPerFamily, rankPets, type Spec } from "@/lib/pets";
import {
  DPS_ASSUMPTIONS, PLAYSTYLE_LABEL, estimateDps, suggestedPlaystyle, type DpsResult, type PetChoice, type Playstyle,
} from "@/lib/dps";
import { splitOf, type Allocation, type TalentClass } from "@/lib/talents";
import { CLASSES, type Faction } from "@/data/classes";
import type { CharacterSheet, WeaponInfo } from "@/lib/characterSync";
import { useDungeonDetails, useKb, useQuests } from "@/lib/queries";
import { buildRouteIndex } from "@/lib/acquire";
import { levellingBis } from "@/lib/gear";
import { PROJECTION_ASSUMPTIONS, projectSheet, type Projection } from "@/lib/projectedGear";

export type GearMode = "current" | "bis";

/** The gear a DPS estimate is worked out on: the character's real sheet, or projected best in slot for a level. */
export interface GearSource {
  kind: GearMode;
  level: number;
  sheet: CharacterSheet;
  weapons: { mainHand?: WeaponInfo; offHand?: WeaponInfo; ranged?: WeaponInfo } | null | undefined;
  /** Talent ranks already counted in the sheet. */
  sheetRanks: Record<string, number> | null;
  label: string;
  projection?: Projection;
}

export type PlaystyleChoice = Playstyle | "auto";
export const NO_PET = "none";

const SPECS: Spec[] = ["beast-mastery", "marksmanship", "survival"];

/** The spec a build reads as, from its deepest tree. */
export function specOf(cls: TalentClass, alloc: Allocation): Spec {
  const split = splitOf(cls, alloc);
  return SPECS[split.indexOf(Math.max(...split))] ?? "survival";
}

const character = () => (SYNCED.character && SYNCED.character.classId === "hunter" ? SYNCED.character : null);
export function currentGear(): GearSource | null {
  const c = character();
  if (!c?.sheet) return null;
  return { kind: "current", level: c.level, sheet: c.sheet, weapons: c.weapons, sheetRanks: c.talentRanks ?? null, label: `your gear now (level ${c.level})` };
}

/**
 * A function from level to gear source. In "bis" mode it loads the item database and dungeon and quest data,
 * then builds the levelling best-in-slot sheet for each level asked for; null while that data is loading.
 */
export function useGearFor(mode: GearMode, faction: Faction): { gearFor: (level: number) => GearSource | null; loading: boolean; error: boolean } {
  const want = mode === "bis";
  const kb = useKb(want);
  const details = useDungeonDetails(want);
  const quests = useQuests(want);
  const index = useMemo(() => (details.data ? buildRouteIndex(details.data, quests.data) : null), [details.data, quests.data]);
  const cache = useMemo(() => new Map<number, GearSource>(), [kb.data, index, faction]);
  const c = character();
  const anchor = c?.sheet?.base ? { level: c.level, base: c.sheet.base } : undefined;
  const gearFor = useCallback((level: number): GearSource | null => {
    if (mode === "current") return currentGear();
    if (!kb.data || !index) return null;
    const hit = cache.get(level);
    if (hit) return hit;
    const bis = levellingBis(kb.data.items, CLASSES.hunter, level, index, { faction });
    const projection = projectSheet(bis, level, anchor);
    const g: GearSource = { kind: "bis", level, sheet: projection.sheet, weapons: projection.weapons, sheetRanks: {}, label: `best-in-slot quest and dungeon gear at level ${level}`, projection };
    cache.set(level, g);
    return g;
  }, [mode, kb.data, index, cache, faction, anchor?.level]);
  return { gearFor, loading: want && (kb.isLoading || details.isLoading || quests.isLoading), error: want && (kb.isError || details.isError) };
}

/** The pet the pets guide ranks first for this build's spec in dungeons, at the character's level. */
export function defaultPet(cls: TalentClass, alloc: Allocation, level: number, faction: Faction): string {
  const top = rankPets({ level, spec: specOf(cls, alloc), context: "dungeon", faction })[0];
  return top ? top.beast.name : NO_PET;
}

export function petChoice(name: string | undefined | null): PetChoice | null {
  if (!name || name === NO_PET) return null;
  const beast = BEASTS.find((b) => b.name === name);
  if (beast) return { family: FAMILY_BY_ID.get(beast.family)!, beast };
  const fam = FAMILY_BY_ID.get(name);
  return fam ? { family: fam } : null;
}

/** DPS for a build on the given gear (the synced character's by default), or null without a sheet. */
export function buildDps(cls: TalentClass, alloc: Allocation, pet: string | null | undefined, style: PlaystyleChoice, gear: GearSource | null = currentGear()): (DpsResult & { playstyle: Playstyle }) | null {
  if (!gear || cls.class !== "hunter") return null;
  const playstyle = style === "auto" ? suggestedPlaystyle(cls, alloc) : style;
  const r = estimateDps({ cls, alloc, level: gear.level, sheet: gear.sheet, weapons: gear.weapons, sheetRanks: gear.sheetRanks, pet: petChoice(pet), playstyle });
  return { ...r, playstyle };
}

/** Pet and playstyle swaps that would raise this build's estimate, best first. */
export function petAdvice(cls: TalentClass, alloc: Allocation, pet: string, style: PlaystyleChoice, gear: GearSource | null, faction: Faction): string[] {
  const now = buildDps(cls, alloc, pet, style, gear);
  if (!now || !gear) return [];
  const out: string[] = [];
  const candidates = bestPerFamily({ level: gear.level, spec: specOf(cls, alloc), context: "dungeon", faction });
  let best: { name: string; family: string; dps: number } | null = null;
  for (const c of candidates) {
    const d = buildDps(cls, alloc, c.beast.name, style, gear)?.total ?? 0;
    if (!best || d > best.dps) best = { name: c.beast.name, family: c.family.name, dps: d };
  }
  if (best && best.name !== pet && best.dps - now.total >= 2) {
    out.push(`Pet: ${best.name} (${best.family}) would add about ${Math.round(best.dps - now.total)} DPS over ${petChoice(pet)?.beast?.name ?? petChoice(pet)?.family.name ?? "no pet"}.`);
  }
  const styles: Playstyle[] = ["ranged", "weave", "melee"];
  const bestStyle = styles.map((s) => ({ s, d: buildDps(cls, alloc, pet, s, gear)?.total ?? 0 })).sort((a, b) => b.d - a.d)[0];
  if (bestStyle.s !== now.playstyle && bestStyle.d - now.total >= 2) {
    out.push(`Playstyle: ${PLAYSTYLE_LABEL[bestStyle.s].toLowerCase()} estimates about ${Math.round(bestStyle.d - now.total)} DPS more than ${PLAYSTYLE_LABEL[now.playstyle].toLowerCase()} with these talents.`);
  }
  return out;
}

export function PetPicker({ cls, alloc, level, faction, pet, setPet, style, setStyle, idPrefix = "pet" }: {
  cls: TalentClass; alloc: Allocation; level: number; faction: Faction;
  pet: string; setPet: (p: string) => void; style: PlaystyleChoice; setStyle: (s: PlaystyleChoice) => void; idPrefix?: string;
}) {
  const spec = specOf(cls, alloc);
  const ranked = useMemo(() => rankPets({ level, spec, context: "dungeon", faction }), [level, spec, faction]);
  const families = useMemo(() => {
    const m = new Map<string, Beast[]>();
    for (const p of ranked) m.set(p.family.name, [...(m.get(p.family.name) ?? []), p.beast]);
    return [...m.entries()];
  }, [ranked]);
  const suggested = suggestedPlaystyle(cls, alloc);
  const current = petChoice(pet);
  const missing = pet !== NO_PET && !ranked.some((p) => p.beast.name === pet);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 min-w-0">
        <span className="lbl">Pet</span>
        <select id={`${idPrefix}-pick`} className="field w-full min-w-0" value={pet} onChange={(e) => setPet(e.target.value)}>
          <option value={NO_PET}>No pet</option>
          {missing && current && <option value={pet}>{current.beast?.name ?? current.family.name} (not tameable at {level})</option>}
          {families.map(([fam, beasts]) => (
            <optgroup key={fam} label={fam}>
              {beasts.slice(0, 6).map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name}{b === ranked[0].beast ? " ★ best pick" : ""} · lvl {b.minLevel === b.maxLevel ? b.minLevel : `${b.minLevel}–${b.maxLevel}`}{b.rare ? " · rare" : ""}{b.speed ? ` · ${b.speed.toFixed(1)}s` : ""}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {current && <span className="text-sm text-muted">{current.family.unique.name}: {current.family.pitch}</span>}
      </label>
      <label className="flex flex-col gap-1 min-w-0">
        <span className="lbl">How you play it</span>
        <select id={`${idPrefix}-style`} className="field w-full min-w-0" value={style} onChange={(e) => setStyle(e.target.value as PlaystyleChoice)}>
          <option value="auto">Match the talents ({PLAYSTYLE_LABEL[suggested].toLowerCase()})</option>
          {(Object.keys(PLAYSTYLE_LABEL) as Playstyle[]).map((p) => <option key={p} value={p}>{PLAYSTYLE_LABEL[p]}</option>)}
        </select>
      </label>
    </div>
  );
}

const fmt = (n: number) => (n >= 100 ? Math.round(n).toString() : n.toFixed(1));

export function PetAndDps({ cls, alloc, level, faction, pet, setPet, style, setStyle, gearMode, setGearMode, gear, gearLoading }: {
  cls: TalentClass; alloc: Allocation; level: number; faction: Faction;
  pet: string; setPet: (p: string) => void; style: PlaystyleChoice; setStyle: (s: PlaystyleChoice) => void;
  gearMode: GearMode; setGearMode: (m: GearMode) => void; gear: GearSource | null; gearLoading: boolean;
}) {
  const c = SYNCED.character;
  const result = buildDps(cls, alloc, pet, style, gear);
  // "vs now": your current talents on the same gear (only meaningful on your own gear and level).
  const now = gearMode === "current" && c?.talentRanks && result ? buildDps(cls, nameAlloc(cls, c.talentRanks), pet, style, gear) : null;
  const advice = result ? petAdvice(cls, alloc, pet, style, gear, faction) : [];
  const [showAll, setShowAll] = useState(false);
  if (cls.class !== "hunter") return null;

  return (
    <div className="frame p-5 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="lbl">Pet and damage</div>
        <h2 className="heading text-2xl m-0">Your pet, and this build's DPS</h2>
        <p className="m-0 text-[15px] text-[#d9c79a] max-w-3xl">
          Pick the pet you'd run with this build at level {level}. Work the DPS out on {c ? `${c.name}'s` : "your"} gear now, as the Armory last showed it,
          or on the best quest and dungeon gear for level {level} (pick any level up to 60 above). It counts the build's talents and your pet's family, ability and buffs
          (Furious Howl, Unleashed Fury, Ferocity, Frenzy, Bestial Wrath, Lone Wolf).
        </p>
      </div>

      <PetPicker cls={cls} alloc={alloc} level={level} faction={faction} pet={pet} setPet={setPet} style={style} setStyle={setStyle} />

      <div className="flex flex-wrap gap-2 items-center" role="radiogroup" aria-label="Gear for the estimate">
        <span className="lbl mr-1">Gear</span>
        {(["current", "bis"] as GearMode[]).map((m) => (
          <button key={m} type="button" role="radio" aria-checked={gearMode === m} className={`pill min-h-[36px] cursor-pointer ${gearMode === m ? "good" : ""}`}
            onClick={() => setGearMode(m)} disabled={m === "current" && !currentGear()}>
            {m === "current" ? `Your gear now${c ? ` (level ${c.level})` : ""}` : `Best in slot at level ${level}`}
          </button>
        ))}
      </div>

      {!result ? (
        <p className="m-0 text-muted italic">
          {gearLoading ? "Gathering the best-in-slot gear for this level…"
            : gearMode === "current" ? "The DPS estimate on your gear needs a character sheet from the daily character sync. Switch to best in slot to plan with projected gear."
            : "Couldn't build the best-in-slot gear for this level."}
        </p>
      ) : (
        <>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4" aria-live="polite">
            <Stat label="Estimated DPS" value={fmt(result.total)} big
              sub={now ? `${result.total >= now.total ? "+" : ""}${fmt(result.total - now.total)} vs your talents now` : undefined} />
            <Stat label="You" value={fmt(result.you)} sub={PLAYSTYLE_LABEL[result.playstyle]} />
            <Stat label="Pet and hawks" value={fmt(result.pet)} sub={`${Math.round(result.petShare * 100)}% of the total`} />
            <Stat label="Your stats with it" value={`${Math.round(result.stats.rangedAp)} RAP`}
              sub={`${Math.round(result.stats.meleeAp)} AP · ${result.stats.rangedCrit.toFixed(1)}% crit · ${result.stats.hit.toFixed(0)}% hit`} />
          </div>

          <div className="h-3 rounded overflow-hidden flex bg-[#100c08] border border-[#3a2c1a]" aria-hidden="true">
            <div style={{ width: `${(1 - result.petShare) * 100}%` }} className="bg-[#c9a24a]" />
            <div style={{ width: `${result.petShare * 100}%` }} className="bg-[#4fd34f]" />
          </div>

          {advice.length > 0 && (
            <ul className="m-0 p-0 list-none flex flex-col gap-1">
              {advice.map((a) => <li key={a} className="flex gap-2 items-start"><span className="pill shrink-0">Improve</span><span>{a}</span></li>)}
            </ul>
          )}

          <table className="w-full text-sm border-collapse">
            <thead>
              <tr><th scope="col" className="text-left p-2 lbl">Source</th><th scope="col" className="text-right p-2 lbl">DPS</th><th scope="col" className="text-right p-2 lbl">Share</th></tr>
            </thead>
            <tbody>
              {(showAll ? result.lines : result.lines.slice(0, 10)).map((l) => (
                <tr key={l.label} className="border-t border-[#3a2c1a]">
                  <td className="p-2">
                    <span className={l.source === "pet" ? "text-[#4fd34f]" : "text-[#e8d5a4]"}>{l.label}</span>
                    {l.detail && <span className="block text-muted text-[13px]">{l.detail}</span>}
                  </td>
                  <td className="p-2 text-right tabular-nums">{fmt(l.dps)}</td>
                  <td className="p-2 text-right tabular-nums text-muted">{Math.round((l.dps / result.total) * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          {result.lines.length > 10 && <div><button type="button" className="btn ghost" onClick={() => setShowAll((v) => !v)}>{showAll ? "Show fewer" : `Show all ${result.lines.length}`}</button></div>}
          {result.notes.length > 0 && <ul className="m-0 pl-5 text-sm text-[#ffc48a]">{result.notes.map((n) => <li key={n}>{n}</li>)}</ul>}

          <details className="text-sm text-muted">
            <summary className="cursor-pointer min-h-[32px]">Gear used and how the estimate works</summary>
            {gear?.projection && (
              <div className="my-2">
                <p className="m-0 mb-1">Projected level {gear.level} gear ({Math.round(gear.sheet.agility)} Agility, {Math.round(gear.sheet.meleeAp)} attack power, {Math.round(gear.sheet.rangedAp)} ranged attack power):</p>
                <ul className="m-0 pl-5 grid sm:grid-cols-2 gap-x-4">
                  {gear.projection.gear.map((g, i) => <li key={i}><span className={`q-${g.item.quality}`}>{g.item.name}</span> <span className="text-muted">({g.slot.toLowerCase()})</span></li>)}
                </ul>
                <p className="m-0 mt-1"><a href="#gear">See where each piece drops on the Gear page</a>.</p>
                <ul className="m-0 pl-5 mt-2">{PROJECTION_ASSUMPTIONS.map((a) => <li key={a}>{a}</li>)}</ul>
              </div>
            )}
            {c && gearMode === "current" && (
              <p className="my-2">
                {c.name}, level {c.level}, as of {c.gearFrom ? new Date(c.gearFrom).toLocaleString() : "the last sync"}:{" "}
                {c.equipment.filter((e) => ["Main hand", "Off hand", "Ranged"].includes(e.slot)).map((e) => `${e.name} (${e.slot.toLowerCase()})`).join(", ")}.
                Sheet: {c.sheet?.agility} Agility, {c.sheet?.intellect} Intellect, {c.sheet?.meleeAp} attack power, {c.sheet?.rangedAp} ranged attack power.
                {level !== c.level && ` The builder is set to level ${level}; on your gear now the estimate uses your level (${c.level}). Switch to best in slot to see level ${level}.`}
              </p>
            )}
            <p className="my-2">It's a simple model for comparing builds on the same gear, not a full simulation. Treat the totals as rough and the differences between builds as the useful part. Assumptions:</p>
            <ul className="m-0 pl-5">{DPS_ASSUMPTIONS.map((a) => <li key={a}>{a}</li>)}</ul>
          </details>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, sub, big }: { label: string; value: string; sub?: string; big?: boolean }) {
  return (
    <div className="border border-[#3a2c1a] rounded p-3 bg-[#18120c]">
      <div className="lbl">{label}</div>
      <div className={`cinzel font-black ${big ? "text-3xl text-gold-bright" : "text-xl text-[#f3e3b8]"}`}>{value}</div>
      {sub && <div className="text-sm text-muted">{sub}</div>}
    </div>
  );
}

/** Talent names → allocation, ignoring unknown names. */
function nameAlloc(cls: TalentClass, ranks: Record<string, number>): Allocation {
  const out: Allocation = {};
  for (const t of cls.trees.flatMap((x) => x.talents)) if (ranks[t.name]) out[t.id] = Math.min(t.maxRank, ranks[t.name]);
  return out;
}
