import { useEffect, useMemo, useState } from "react";
import { CLASS_LIST, CLASSES, type ClassId } from "@/data/classes";
import { useCharacter } from "@/lib/character";
import { useTalents } from "@/lib/queries";
import {
  MAX_LEGACY_BONUS, POINTS_PER_ROW, addLock, addPoint, buildSummary, fitToBudget, pointsAvailable,
  rankText, removePoint, spentInTree, totalSpent, type Allocation, type Talent, type TalentClass, type TalentTree,
} from "@/lib/talents";
import { Loading, LoadError, PageTitle } from "@/components/States";

const STORE = "wa:talents:";
function loadBuild(cls: string): Allocation {
  try { return JSON.parse(localStorage.getItem(STORE + cls) ?? "{}") as Allocation; } catch { return {}; }
}
function saveBuild(cls: string, a: Allocation) {
  try { localStorage.setItem(STORE + cls, JSON.stringify(a)); } catch { /* per-visit only */ }
}

const STATUS_LABEL: Record<string, string> = { new: "New in Forever", changed: "Changed", moved: "Moved", same: "Same as Classic" };

export default function Talents() {
  const { character } = useCharacter();
  const [classId, setClassId] = useState<ClassId>(character.classId);
  const [level, setLevel] = useState(Math.max(10, character.level));
  const [legacy, setLegacy] = useState(0);
  const q = useTalents(classId);

  return (
    <section className="flex flex-col gap-5">
      <PageTitle eyebrow="Talents" title={`${CLASSES[classId].name} talent planner`}>
        Plan your points with the Forever trees, including the new 16-point milestone talents. Hover or tap a talent to read it; click to add a point, right-click or use the minus button to take one back.
      </PageTitle>

      <div className="frame p-5 flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="lbl">Class</span>
            <select id="talent-class" className="field" value={classId} onChange={(e) => setClassId(e.target.value as ClassId)}>
              {CLASS_LIST.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="flex justify-between"><span className="lbl">Level</span><span className="cinzel font-bold text-gold-bright">{level}</span></span>
            <input id="talent-level" type="range" min={10} max={60} value={level} onChange={(e) => setLevel(parseInt(e.target.value, 10))} className="w-full accent-[#c9a24a] h-11" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="lbl">Legacy bonus points</span>
            <select id="talent-legacy" className="field" value={legacy} onChange={(e) => setLegacy(parseInt(e.target.value, 10))}>
              {Array.from({ length: MAX_LEGACY_BONUS + 1 }, (_, i) => <option key={i} value={i}>{i === 0 ? "None" : `+${i} (Talented perk)`}</option>)}
            </select>
          </label>
        </div>
      </div>

      {q.isLoading && <Loading what="talent trees" />}
      {q.isError && <LoadError what="talent trees" error={q.error} retry={() => q.refetch()} />}
      {q.data && <Planner key={classId} data={q.data} budget={pointsAvailable(level, legacy)} />}
    </section>
  );
}

function Planner({ data, budget }: { data: TalentClass; budget: number }) {
  const [alloc, setAlloc] = useState<Allocation>(() => loadBuild(data.class));
  const [focus, setFocus] = useState<{ talent: Talent; tree: TalentTree } | null>(null);

  // Lowering the level trims the deepest points so the build stays legal.
  useEffect(() => {
    setAlloc((a) => (totalSpent(data, a) > budget ? fitToBudget(data, a, budget) : a));
  }, [budget, data]);
  useEffect(() => saveBuild(data.class, alloc), [alloc, data.class]);

  const spent = totalSpent(data, alloc);
  const left = budget - spent;

  return (
    <div className="flex flex-col gap-5">
      <div className="frame px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-2 justify-between" aria-live="polite">
        <div className="flex flex-wrap gap-x-6 gap-y-1 items-baseline">
          <span><span className="lbl mr-2">Points left</span><span className={`cinzel font-black text-2xl ${left > 0 ? "text-gold-bright" : "text-muted"}`}>{left}</span></span>
          <span className="text-[15px] text-[#d9c79a]">{spent} of {budget} spent · {buildSummary(data, alloc)}</span>
        </div>
        <button type="button" className="btn ghost" onClick={() => setAlloc({})} disabled={spent === 0}>Reset build</button>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {data.trees.map((tree) => (
          <Tree key={tree.name} cls={data} tree={tree} alloc={alloc} budget={budget}
            onAdd={(id) => setAlloc((a) => addPoint(data, a, budget, id))}
            onRemove={(id) => setAlloc((a) => removePoint(data, a, budget, id))}
            onFocus={(talent) => setFocus({ talent, tree })} />
        ))}
      </div>

      <div className="tip min-h-[8rem]" aria-live="polite">
        {focus ? <TalentDetail t={focus.talent} tree={focus.tree} pts={alloc[focus.talent.id] ?? 0} lock={addLock(data, alloc, budget, focus.talent.id)?.reason ?? null} />
          : <span className="text-[#9aa3b5] italic">Hover, focus or tap a talent to read what it does.</span>}
      </div>

      <p className="m-0 text-sm text-muted">
        Talent trees and text from <a href="https://wowforevertalent.com/sources/" target="_blank" rel="noreferrer">Talents Forever via WoW Forever Talent</a> (CC BY 4.0),
        data version {data.version}. Taken from the Forever beta client with later hotfixes; ranks marked unverified haven't been checked in game.
      </p>
    </div>
  );
}

function Tree({ cls, tree, alloc, budget, onAdd, onRemove, onFocus }: {
  cls: TalentClass; tree: TalentTree; alloc: Allocation; budget: number;
  onAdd: (id: string) => void; onRemove: (id: string) => void; onFocus: (t: Talent) => void;
}) {
  const spent = spentInTree(tree, alloc);
  const rows = Math.max(...tree.talents.map((t) => t.row));
  const byPos = useMemo(() => new Map(tree.talents.map((t) => [`${t.row}:${t.col}`, t])), [tree]);

  return (
    <div className="frame p-4 flex flex-col gap-3">
      <div className="flex justify-between items-baseline">
        <h2 className="heading text-xl m-0">{tree.name}</h2>
        <span className="cinzel font-bold text-gold-bright">{spent}</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: rows }, (_, r) => r + 1).flatMap((row) =>
          [1, 2, 3, 4].map((col) => {
            const t = byPos.get(`${row}:${col}`);
            if (!t) return <div key={`${row}:${col}`} aria-hidden="true" />;
            const pts = alloc[t.id] ?? 0;
            const lock = addLock(cls, alloc, budget, t.id);
            const gated = spent < (row - 1) * POINTS_PER_ROW;
            const maxed = pts >= t.maxRank;
            const state = maxed ? "maxed" : pts > 0 ? "some" : lock ? "locked" : "open";
            return (
              <div key={t.id} className="relative">
                <button type="button"
                  className={`w-full min-h-[64px] rounded border-2 p-1.5 text-left flex flex-col justify-between gap-1 text-[12.5px] leading-tight cursor-pointer
                    ${state === "maxed" ? "border-[#f3d688] bg-[#3a2c12] text-[#fff1c8]" : state === "some" ? "border-[#4fd34f] bg-[#16210f] text-bone" : state === "open" ? "border-[#9a7429] bg-[#18120c] text-bone" : "border-[#3a2c1a] bg-[#100c08] text-[#8a7a5a]"}
                    ${gated ? "opacity-60" : ""}`}
                  aria-label={`${t.name}, ${pts} of ${t.maxRank}${lock && !maxed ? `. ${lock.reason}` : ""}`}
                  onClick={() => { onAdd(t.id); onFocus(t); }}
                  onContextMenu={(e) => { e.preventDefault(); onRemove(t.id); onFocus(t); }}
                  onMouseEnter={() => onFocus(t)} onFocus={() => onFocus(t)}>
                  <span className="font-bold break-words [hyphens:auto]" lang="en">{t.name}</span>
                  <span className="flex items-center justify-between gap-1">
                    <span className={`tabular-nums font-bold ${state === "some" ? "text-[#4fd34f]" : state === "maxed" ? "text-gold-bright" : ""}`}>{pts}/{t.maxRank}</span>
                    {t.status === "new" && <span className="text-[10px] px-1 rounded bg-[#1c1330] text-[#dcc6ff] border border-[#6a4aa8]">New</span>}
                  </span>
                </button>
                {pts > 0 && (
                  <button type="button" className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-crimson border border-gold text-[#f3e3b8] text-sm leading-none flex items-center justify-center"
                    aria-label={`Remove a point from ${t.name}`} onClick={() => { onRemove(t.id); onFocus(t); }}>−</button>
                )}
              </div>
            );
          }),
        )}
      </div>
      {tree.removed.length > 0 && (
        <details className="text-sm text-muted">
          <summary className="cursor-pointer min-h-[32px]">Removed from this tree ({tree.removed.length})</summary>
          <ul className="m-0 pl-5 mt-1">{tree.removed.map((r) => <li key={r.name}>{r.name}</li>)}</ul>
        </details>
      )}
    </div>
  );
}

function TalentDetail({ t, tree, pts, lock }: { t: Talent; tree: TalentTree; pts: number; lock: string | null }) {
  const cur = pts > 0 ? rankText(t, pts) : null;
  const next = pts < t.maxRank ? t.ranks.find((r) => r.rank === pts + 1) ?? null : null;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold text-lg text-[#ffd23f]">{t.name}</span>
        {t.status && <span className="pill">{STATUS_LABEL[t.status] ?? t.status}{t.classicName && t.status === "changed" ? ` (was ${t.classicName})` : ""}</span>}
      </div>
      <div className="text-[#9aa3b5] text-sm">{tree.name} · row {t.row} (needs {(t.row - 1) * POINTS_PER_ROW} points) · rank {pts}/{t.maxRank}{t.passive ? " · passive" : ""}</div>
      {t.cost && <div className="text-sm">{t.cost}</div>}
      {cur && <div><span className="text-[#9aa3b5] text-sm">Current: </span>{cur.text}</div>}
      {next ? <div><span className="text-[#9aa3b5] text-sm">{pts > 0 ? "Next rank: " : "Rank 1: "}</span><span className="text-[#2bdc2b]">{next.text}</span>
        {next.confidence !== "source" && <span className="pill warn ml-2">Unverified</span>}</div>
        : pts < t.maxRank && <div className="text-[#9aa3b5] italic">No text recorded for the next rank yet.</div>}
      {lock && lock !== "Maxed" && <div className="text-[#ff9a3c] text-sm">{lock}</div>}
    </div>
  );
}
