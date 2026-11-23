/** "My builds": save several named talent builds, compare them with each other and the recommended ones, and get suggestions. */
import { useEffect, useMemo, useState } from "react";
import {
  MAX_LEGACY_BONUS, allocFromNames, decodeBuild, encodeBuild, isValid, pointsAvailable, splitOf, totalSpent,
  type Allocation, type TalentClass,
} from "@/lib/talents";
import { analyzeBuild, type BuildAnalysis, type SuggestionKind } from "@/lib/buildAnalysis";
import { TALENT_NOTES, buildAtPoints, type RecommendedBuild } from "@/data/talentBuilds";

export interface SavedBuild {
  id: string;
  name: string;
  /** Build code (see encodeBuild). */
  code: string;
  level: number;
  legacy: number;
  savedAt: string;
}

const KEY = "wa:talent-builds:";

export function readSaved(cls: string): SavedBuild[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY + cls) ?? "[]");
    return Array.isArray(v) ? (v as SavedBuild[]).filter((b) => b && typeof b.code === "string" && typeof b.name === "string") : [];
  } catch { return []; }
}

export function useSavedBuilds(cls: string) {
  const [list, setList] = useState<SavedBuild[]>(() => readSaved(cls));
  useEffect(() => {
    try { localStorage.setItem(KEY + cls, JSON.stringify(list)); } catch { /* storage blocked: kept for this visit */ }
  }, [cls, list]);
  return {
    list,
    add: (b: Omit<SavedBuild, "id" | "savedAt">) => {
      const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      setList((l) => [...l, { ...b, id, savedAt: new Date().toISOString() }]);
      return id;
    },
    update: (id: string, patch: Partial<SavedBuild>) =>
      setList((l) => l.map((b) => (b.id === id ? { ...b, ...patch, savedAt: patch.code ? new Date().toISOString() : b.savedAt } : b))),
    remove: (id: string) => setList((l) => l.filter((b) => b.id !== id)),
  };
}

type Saved = ReturnType<typeof useSavedBuilds>;

export function MyBuilds({ data, alloc, level, legacy, saved, activeId, setActiveId, onLoad, selected, toggle }: {
  data: TalentClass; alloc: Allocation; level: number; legacy: number; saved: Saved;
  activeId: string | null; setActiveId: (id: string | null) => void;
  onLoad: (b: SavedBuild, a: Allocation) => void; selected: Set<string>; toggle: (key: string) => void;
}) {
  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const spent = totalSpent(data, alloc);
  const code = encodeBuild(data, alloc);
  const active = saved.list.find((b) => b.id === activeId) ?? null;
  const changed = active ? active.code !== code || active.level !== level || active.legacy !== legacy : false;

  const saveNew = () => {
    const n = name.trim() || `Build ${saved.list.length + 1}`;
    const id = saved.add({ name: n, code, level, legacy });
    setActiveId(id);
    toggle(`s:${id}`);
    setName("");
  };

  return (
    <div className="frame p-5 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="lbl">My builds</div>
        <h2 className="heading text-2xl m-0">Saved build ideas</h2>
        <p className="m-0 text-[15px] text-[#d9c79a] max-w-3xl">
          Save as many builds as you like, each with its own name and level. Tick the ones to compare below; each gets suggestions on how to improve it.
          Saved in this browser only, so copy a build code if you want it somewhere else.
        </p>
      </div>

      <form className="flex flex-wrap gap-2 items-center" onSubmit={(e) => { e.preventDefault(); saveNew(); }}>
        <label className="sr-only" htmlFor="build-name">Build name</label>
        <input id="build-name" className="field flex-1 min-w-[12rem]" maxLength={60} placeholder={`Name this build, e.g. "Raid weave" or "PvP traps"`} value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit" className="btn" disabled={spent === 0}>Save as new build</button>
        {active && changed && (
          <button type="button" className="btn ghost" onClick={() => saved.update(active.id, { code, level, legacy })}>Update “{active.name}”</button>
        )}
      </form>

      {saved.list.length === 0 ? (
        <p className="m-0 text-muted italic">No saved builds yet. Spend some points (or load a recommended build and tweak it), name it and save it.</p>
      ) : (
        <ul className="m-0 p-0 list-none flex flex-col gap-2">
          {saved.list.map((b) => {
            const a = decodeBuild(data, b.code);
            const split = a ? splitOf(data, a).join("/") : "?";
            const on = selected.has(`s:${b.id}`);
            return (
              <li key={b.id} className={`row flex-wrap ${b.id === activeId ? "on" : ""}`}>
                <label className="flex items-center gap-2 min-h-[44px] cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 accent-[#c9a24a]" checked={on} onChange={() => toggle(`s:${b.id}`)} aria-label={`Compare ${b.name}`} />
                  <span className="sr-only">Compare</span>
                </label>
                <div className="flex-1 min-w-[10rem]">
                  {renaming === b.id ? (
                    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (renameText.trim()) saved.update(b.id, { name: renameText.trim() }); setRenaming(null); }}>
                      <input autoFocus className="field flex-1" maxLength={60} value={renameText} onChange={(e) => setRenameText(e.target.value)} aria-label="New name" />
                      <button type="submit" className="btn ghost">OK</button>
                    </form>
                  ) : (
                    <>
                      <div className="font-bold text-[#ffd23f]">{b.name}{b.id === activeId && <span className="pill ml-2">In the builder{changed ? ", edited" : ""}</span>}</div>
                      <div className="text-sm text-muted">{split} · level {b.level}{b.legacy ? ` +${b.legacy} Legacy` : ""} · saved {new Date(b.savedAt).toLocaleDateString()}</div>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn ghost" disabled={!a} onClick={() => a && onLoad(b, a)}>Load</button>
                  <button type="button" className="btn ghost" onClick={() => { setRenaming(b.id); setRenameText(b.name); }}>Rename</button>
                  {confirmDel === b.id ? (
                    <button type="button" className="btn" onClick={() => { saved.remove(b.id); setConfirmDel(null); if (activeId === b.id) setActiveId(null); }}>Confirm delete</button>
                  ) : (
                    <button type="button" className="btn ghost" onClick={() => setConfirmDel(b.id)}>Delete</button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

interface Column {
  key: string;
  name: string;
  sub: string;
  alloc: Allocation;
  budget: number;
  analysis: BuildAnalysis;
  recommended: boolean;
}

const KIND_STYLE: Record<SuggestionKind, { label: string; cls: string }> = {
  warn: { label: "Fix", cls: "warn" },
  improve: { label: "Improve", cls: "" },
  tip: { label: "Tip", cls: "ink" },
  good: { label: "Good", cls: "good" },
};

export function CompareBuilds({ data, alloc, level, legacy, saved, recommended, selected, toggle }: {
  data: TalentClass; alloc: Allocation; level: number; legacy: number; saved: SavedBuild[];
  recommended: RecommendedBuild[]; selected: Set<string>; toggle: (key: string) => void;
}) {
  const notes = TALENT_NOTES[data.class] ?? {};
  const budget = pointsAvailable(level, legacy);

  const columns: Column[] = useMemo(() => {
    const cols: Column[] = [];
    const push = (key: string, name: string, sub: string, a: Allocation, b: number, rec: boolean) =>
      cols.push({ key, name, sub, alloc: a, budget: b, recommended: rec, analysis: analyzeBuild(data, a, b, recommended, notes) });
    // The builder's build gets its own column unless it is exactly one of the ticked saved builds.
    const code = encodeBuild(data, alloc);
    const same = saved.find((s) => selected.has(`s:${s.id}`) && s.code === code && s.level === level && s.legacy === legacy);
    if (!same) push("current", "In the builder now", `level ${level}`, alloc, budget, false);
    for (const s of saved) {
      if (!selected.has(`s:${s.id}`)) continue;
      const a = decodeBuild(data, s.code);
      const b = pointsAvailable(s.level, s.legacy);
      if (a && isValid(data, a, pointsAvailable(60, MAX_LEGACY_BONUS))) push(`s:${s.id}`, s.name, `saved, level ${s.level}${s === same ? " · in the builder" : ""}`, a, b, false);
    }
    for (const r of recommended) {
      if (!selected.has(`r:${r.id}`)) continue;
      push(`r:${r.id}`, r.name, `recommended, level ${level}`, allocFromNames(data, buildAtPoints(r, budget)).alloc, budget, true);
    }
    return cols;
  }, [data, alloc, level, legacy, budget, saved, recommended, selected, notes]);

  // Talents where the compared builds disagree, in tree order.
  const differing = data.trees.flatMap((tree) =>
    [...tree.talents].sort((a, b) => a.row - b.row || a.col - b.col)
      .filter((t) => new Set(columns.map((c) => c.alloc[t.id] ?? 0)).size > 1)
      .map((t) => ({ tree: tree.name, t })));
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? differing : differing.slice(0, 12);

  return (
    <div className="frame p-5 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="lbl">Compare</div>
        <h2 className="heading text-2xl m-0">Your builds side by side</h2>
        <p className="m-0 text-[15px] text-[#d9c79a] max-w-3xl">
          Your build in the builder is always included. Tick saved builds above, and recommended builds here (shown at level {level}).
          "Same as recommended" is the share of points placed exactly where the nearest recommended build puts them.
        </p>
      </div>

      {recommended.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Recommended builds to compare">
          {recommended.map((r) => {
            const on = selected.has(`r:${r.id}`);
            return (
              <button key={r.id} type="button" aria-pressed={on} className={`pill min-h-[36px] cursor-pointer ${on ? "good" : ""}`} onClick={() => toggle(`r:${r.id}`)}>
                {on ? "✓ " : "+ "}{r.name}
              </button>
            );
          })}
        </div>
      )}

      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full text-sm border-collapse" style={{ minWidth: `${180 + columns.length * 150}px` }}>
          <thead>
            <tr>
              <th scope="col" className="text-left p-2"><span className="sr-only">Measure</span></th>
              {columns.map((c) => (
                <th key={c.key} scope="col" className="text-left p-2 align-bottom">
                  <div className={`font-bold ${c.recommended ? "text-[#b9f09a]" : "text-[#ffd23f]"}`}>{c.name}</div>
                  <div className="font-normal text-muted">{c.sub}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <Row label="Points" cols={columns} get={(c) => `${c.analysis.points} of ${c.budget}`} />
            <Row label="Split" cols={columns} get={(c) => c.analysis.split.join("/")} />
            <Row label="31-point talents" cols={columns} get={(c) => c.analysis.capstones.join(", ") || "None"} />
            <Row label="Damage points" cols={columns} get={(c) => `${c.analysis.damagePoints} (${c.analysis.points ? Math.round((c.analysis.damagePoints / c.analysis.points) * 100) : 0}%)`} />
            <Row label="Closest recommended" cols={columns} get={(c) => (c.recommended ? "—" : c.analysis.closest?.build.name ?? "—")} />
            <Row label="Same as recommended" cols={columns} get={(c) => (c.recommended ? "—" : c.analysis.closest ? `${Math.round(c.analysis.closest.match * 100)}%` : "—")} />
            <Row label="Suggestions" cols={columns} get={(c) => {
              const n = c.analysis.suggestions.filter((s) => s.kind === "warn" || s.kind === "improve").length;
              return n === 0 ? "None" : `${n} to look at`;
            }} />
            {shown.length > 0 && (
              <tr><th colSpan={columns.length + 1} className="text-left p-2 pt-4 lbl">Where they differ</th></tr>
            )}
            {shown.map(({ tree, t }) => (
              <tr key={t.id} className="border-t border-[#3a2c1a]">
                <th scope="row" className="text-left p-2 font-normal text-[#e8d5a4]">{t.name}<span className="text-muted"> · {tree}</span></th>
                {columns.map((c) => {
                  const p = c.alloc[t.id] ?? 0;
                  return <td key={c.key} className={`p-2 tabular-nums ${p === 0 ? "text-[#6f6450]" : p >= t.maxRank ? "text-gold-bright font-bold" : "text-[#4fd34f]"}`}>{p}/{t.maxRank}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {differing.length > 12 && (
        <div><button type="button" className="btn ghost" onClick={() => setShowAll((v) => !v)}>{showAll ? "Show fewer" : `Show all ${differing.length} differences`}</button></div>
      )}
      {columns.length < 2 && <p className="m-0 text-muted italic">Tick a saved build or add a recommended build to compare against.</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {columns.filter((c) => !c.recommended).map((c) => (
          <div key={c.key} className="parch p-4 flex flex-col gap-2">
            <div className="lbl">Suggestions</div>
            <h3 className="heading text-lg m-0 text-[#3b2a14]">{c.name} <span className="text-sm font-normal">({c.analysis.split.join("/")})</span></h3>
            <ul className="m-0 p-0 list-none flex flex-col gap-2">
              {c.analysis.suggestions.map((s, i) => (
                <li key={i} className="flex gap-2 items-start">
                  <span className={`pill ${KIND_STYLE[s.kind].cls} shrink-0`}>{KIND_STYLE[s.kind].label}</span>
                  <span>{s.text}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ label, cols, get }: { label: string; cols: Column[]; get: (c: Column) => string }) {
  return (
    <tr className="border-t border-[#3a2c1a]">
      <th scope="row" className="text-left p-2 text-muted font-normal">{label}</th>
      {cols.map((c) => <td key={c.key} className="p-2 text-[#e8d5a4]">{get(c)}</td>)}
    </tr>
  );
}
