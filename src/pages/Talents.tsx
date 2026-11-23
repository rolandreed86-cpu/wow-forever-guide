import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CLASS_LIST, CLASSES, type ClassId } from "@/data/classes";
import { useCharacter, SYNCED } from "@/lib/character";
import { useTalents } from "@/lib/queries";
import {
  MAX_LEGACY_BONUS, POINTS_PER_ROW, addLock, addPoint, allocFromNames, buildSummary, decodeBuild, encodeBuild,
  fitToBudget, isValid, pointsAvailable, removePoint, spentInTree, splitOf, totalSpent,
  type Allocation, type Talent, type TalentClass, type TalentTree,
} from "@/lib/talents";
import {
  CATEGORY_LABEL, HUNTER_BUILDS, TALENT_NOTES, buildAtPoints, levellingPlan, type RecommendedBuild,
} from "@/data/talentBuilds";
import { Loading, LoadError, PageTitle } from "@/components/States";
import { CompareBuilds, MyBuilds, useSavedBuilds } from "@/components/TalentBuilds";
import { NO_PET, PetAndDps, defaultPet, type PlaystyleChoice } from "@/components/PetDps";

const STORE = "wa:talents:";
const PRESET_STORE = "wa:talent-preset:";
const ACTIVE_STORE = "wa:talent-active:";
const COMPARE_STORE = "wa:talent-compare:";
const PET_STORE = "wa:talent-pet:";
const STYLE_STORE = "wa:talent-style:";
function load<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
function save(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* per-visit only */ }
}

const STATUS_LABEL: Record<string, string> = { new: "New in Forever", changed: "Changed", moved: "Moved", same: "Same as Classic" };
const buildsFor = (classId: string): RecommendedBuild[] => (classId === "hunter" ? HUNTER_BUILDS : []);

/** A shared link looks like #talents-hunter-<code>. */
function parseShared(param: string | null | undefined): { classId: ClassId; code: string } | null {
  if (!param) return null;
  const i = param.indexOf("-");
  const cls = (i < 0 ? param : param.slice(0, i)) as ClassId;
  if (!CLASSES[cls]) return null;
  return { classId: cls, code: i < 0 ? "" : param.slice(i + 1) };
}

export default function Talents({ shared }: { shared?: string | null }) {
  const { character } = useCharacter();
  const share = parseShared(shared);
  const [classId, setClassId] = useState<ClassId>(share?.classId ?? character.classId);
  const [level, setLevel] = useState(share ? 60 : Math.max(10, character.level));
  const [legacy, setLegacy] = useState(0);
  const q = useTalents(classId);

  return (
    <section className="flex flex-col gap-5">
      <PageTitle eyebrow="Talents" title={`${CLASSES[classId].name} talent builder`}>
        Build with the Forever trees, including the new 16-point milestone talents. Hover a talent (or tap it on a phone) for every rank,
        what it means in play and which recommended builds take it. Click to add a point, right-click or use minus to take one back.
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
            <span className="flex justify-between">
              <span className="lbl">Level</span>
              <span className="flex gap-3 items-baseline">
                {level !== character.level && character.level >= 10 && (
                  <button type="button" className="text-sm underline text-[#d9c79a]" onClick={() => setLevel(character.level)}>My level ({character.level})</button>
                )}
                <span className="cinzel font-bold text-gold-bright">{level}</span>
              </span>
            </span>
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
      {q.data && (
        <Planner key={classId} data={q.data} level={level} legacy={legacy} setLevel={setLevel} setLegacy={setLegacy}
          sharedCode={share && share.classId === classId ? share.code : null} />
      )}
    </section>
  );
}

interface Hover { talent: Talent; tree: TalentTree; rect: DOMRect; pinned: boolean }

function Planner({ data, level, legacy, setLevel, setLegacy, sharedCode }: {
  data: TalentClass; level: number; legacy: number; setLevel: (n: number) => void; setLegacy: (n: number) => void; sharedCode: string | null;
}) {
  const budget = pointsAvailable(level, legacy);
  const builds = buildsFor(data.class);
  const [alloc, setAlloc] = useState<Allocation>(() => {
    if (sharedCode) {
      const a = decodeBuild(data, sharedCode);
      if (a && isValid(data, a, pointsAvailable(60, MAX_LEGACY_BONUS))) return a;
    }
    return load<Allocation>(STORE + data.class, {});
  });
  const [presetId, setPresetId] = useState<string>(() => load(PRESET_STORE + data.class, builds.find((b) => b.recommended)?.id ?? builds[0]?.id ?? ""));
  const [hover, setHover] = useState<Hover | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const preset = builds.find((b) => b.id === presetId) ?? null;
  const saved = useSavedBuilds(data.class);
  const { character } = useCharacter();
  const charLevel = SYNCED.character?.level ?? character.level;
  const [pet, setPet] = useState<string>(() => load<string | null>(PET_STORE + data.class, null) ?? defaultPet(data, alloc, charLevel, character.faction));
  const [style, setStyle] = useState<PlaystyleChoice>(() => load<PlaystyleChoice>(STYLE_STORE + data.class, "auto"));
  useEffect(() => save(PET_STORE + data.class, pet), [pet, data.class]);
  useEffect(() => save(STYLE_STORE + data.class, style), [style, data.class]);
  const [activeId, setActiveId] = useState<string | null>(() => load<string | null>(ACTIVE_STORE + data.class, null));
  const [selected, setSelected] = useState<Set<string>>(() => new Set(load<string[]>(COMPARE_STORE + data.class, builds.filter((b) => b.recommended).map((b) => `r:${b.id}`))));
  const toggle = (key: string) => setSelected((cur) => { const n = new Set(cur); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  useEffect(() => save(ACTIVE_STORE + data.class, activeId), [activeId, data.class]);
  useEffect(() => save(COMPARE_STORE + data.class, [...selected]), [selected, data.class]);

  // A shared build opens at the level it needs.
  useEffect(() => {
    if (!sharedCode) return;
    setLevel(Math.max(10, Math.min(60, totalSpent(data, alloc) + 9)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Lowering the level trims the deepest points so the build stays legal.
  useEffect(() => {
    setAlloc((a) => (totalSpent(data, a) > budget ? fitToBudget(data, a, budget) : a));
  }, [budget, data]);
  useEffect(() => save(STORE + data.class, alloc), [alloc, data.class]);
  useEffect(() => save(PRESET_STORE + data.class, presetId), [presetId, data.class]);
  useEffect(() => {
    if (!hover) return;
    // Follow the talent when the page scrolls or reflows; close if it scrolled out of view.
    const id = hover.talent.id;
    const follow = () => {
      const el = document.querySelector<HTMLElement>(`button[data-talent="${id}"]`);
      const rect = el?.getBoundingClientRect();
      if (!rect || rect.bottom < 0 || rect.top > window.innerHeight) setHover(null);
      else setHover((h) => (h && h.talent.id === id ? { ...h, rect } : h));
    };
    window.addEventListener("scroll", follow, { passive: true });
    window.addEventListener("resize", follow);
    return () => { window.removeEventListener("scroll", follow); window.removeEventListener("resize", follow); };
  }, [hover?.talent.id]);
  useEffect(() => { if (notice) { const t = setTimeout(() => setNotice(null), 3500); return () => clearTimeout(t); } }, [notice]);

  const spent = totalSpent(data, alloc);
  const left = budget - spent;
  const code = encodeBuild(data, alloc);

  const loadPreset = (b: RecommendedBuild, points: number) => {
    const { alloc: a, missing } = allocFromNames(data, buildAtPoints(b, points));
    setPresetId(b.id);
    if (missing.length) setNotice(`Couldn't find ${missing.join(", ")} in the current trees.`);
    if (isValid(data, a, points)) setAlloc(a);
  };

  const copy = async (text: string, what: string) => {
    try { await navigator.clipboard.writeText(text); setNotice(`${what} copied.`); }
    catch { window.prompt(`Copy the ${what.toLowerCase()}:`, text); }
  };
  const shareLink = () => {
    const base = typeof location !== "undefined" ? location.href.split("#")[0] : "";
    return `${base}#talents-${data.class}-${code}`;
  };

  return (
    <div className="flex flex-col gap-5">
      {builds.length > 0 && (
        <Recommendations data={data} builds={builds} preset={preset} level={level} legacy={legacy} budget={budget}
          onPick={setPresetId} onLoad={loadPreset} setLevel={setLevel} />
      )}

      <div className="frame px-5 py-4 flex flex-col gap-3" aria-live="polite">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 justify-between">
          <div className="flex flex-wrap gap-x-6 gap-y-1 items-baseline">
            <span><span className="lbl mr-2">Points left</span><span className={`cinzel font-black text-2xl ${left > 0 ? "text-gold-bright" : "text-muted"}`}>{left}</span></span>
            <span className="text-[15px] text-[#d9c79a]">{spent} of {budget} spent · {buildSummary(data, alloc)}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn ghost" onClick={() => copy(code, "Build code")} disabled={spent === 0}>Copy build code</button>
            <button type="button" className="btn ghost" onClick={() => copy(shareLink(), "Share link")} disabled={spent === 0}>Copy share link</button>
            <button type="button" className="btn ghost" onClick={() => setAlloc({})} disabled={spent === 0}>Reset</button>
          </div>
        </div>
        <ImportCode data={data} onImport={(a) => {
          const need = totalSpent(data, a);
          if (need > budget) setLevel(Math.min(60, need + 9));
          setAlloc(a);
          setNotice("Build loaded.");
        }} />
        {notice && <div className="text-sm text-[#b9f09a]">{notice}</div>}
        {preset && <BuildDiff data={data} alloc={alloc} preset={preset} points={spent} />}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {data.trees.map((tree) => (
          <Tree key={tree.name} cls={data} tree={tree} alloc={alloc} budget={budget} hoverId={hover?.talent.id ?? null}
            onAdd={(id) => setAlloc((a) => addPoint(data, a, budget, id))}
            onRemove={(id) => setAlloc((a) => removePoint(data, a, budget, id))}
            onHover={(talent, rect, pinned) => setHover(talent && rect ? { talent, tree, rect, pinned } : null)}
            hoverPinned={hover?.pinned ?? false} />
        ))}
      </div>

      {data.class === "hunter" && (
        <PetAndDps cls={data} alloc={alloc} level={level} faction={character.faction} pet={pet} setPet={setPet} style={style} setStyle={setStyle} />
      )}

      <MyBuilds data={data} alloc={alloc} level={level} legacy={legacy} pet={data.class === "hunter" ? pet : NO_PET} playstyle={style}
        saved={saved} activeId={activeId} setActiveId={setActiveId} selected={selected} toggle={toggle}
        onLoad={(b, a) => {
          setLevel(b.level); setLegacy(b.legacy); setAlloc(a); setActiveId(b.id);
          if (b.pet) setPet(b.pet);
          setStyle(b.playstyle ?? "auto");
          setNotice(`Loaded “${b.name}”.`);
        }} />

      <CompareBuilds data={data} alloc={alloc} level={level} legacy={legacy} pet={data.class === "hunter" ? pet : NO_PET} playstyle={style}
        faction={character.faction} charLevel={charLevel} saved={saved.list} recommended={builds} selected={selected} toggle={toggle} />

      {hover && (
        <FloatingTooltip rect={hover.rect} onClose={() => setHover(null)} pinned={hover.pinned}>
          <TalentDetail cls={data} t={hover.talent} tree={hover.tree} pts={alloc[hover.talent.id] ?? 0}
            lock={addLock(data, alloc, budget, hover.talent.id)?.reason ?? null}
            onAdd={hover.pinned ? () => setAlloc((a) => addPoint(data, a, budget, hover.talent.id)) : undefined}
            onRemove={hover.pinned ? () => setAlloc((a) => removePoint(data, a, budget, hover.talent.id)) : undefined} />
        </FloatingTooltip>
      )}

      <p className="m-0 text-sm text-muted">
        Talent trees and text from <a href="https://wowforevertalent.com/sources/" target="_blank" rel="noreferrer">Talents Forever via WoW Forever Talent</a> (CC BY 4.0),
        data version {data.version}. Taken from the Forever beta client with later hotfixes; ranks marked unverified haven't been checked in game.
        Changing talents in game needs a visit to your class trainer.
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- recommendations */

function Recommendations({ data, builds, preset, level, legacy, budget, onPick, onLoad, setLevel }: {
  data: TalentClass; builds: RecommendedBuild[]; preset: RecommendedBuild | null; level: number; legacy: number; budget: number;
  onPick: (id: string) => void; onLoad: (b: RecommendedBuild, points: number) => void; setLevel: (n: number) => void;
}) {
  const synced = SYNCED.character;
  const syncedSplit = synced && synced.classId === data.class ? data.trees.map((t) => synced.talents?.[t.name] ?? 0) : null;
  const max = pointsAvailable(60, legacy);

  return (
    <div className="frame p-5 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="lbl">Recommended builds</div>
        <h2 className="heading text-2xl m-0">Best DPS builds, compared</h2>
        <p className="m-0 text-[15px] text-[#d9c79a] max-w-3xl">
          Pick a build to read why it works, how to level with it and how it plays, then load it into the builder at your level or at 60.
          Rankings come from Wowhead's early Forever tier list (21 Nov 2026), which calls itself a prediction until raids open on 9 December.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" role="radiogroup" aria-label="Recommended builds">
        {builds.map((b) => (
          <button key={b.id} type="button" role="radio" aria-checked={preset?.id === b.id}
            className={`row flex-col !items-start gap-1 ${preset?.id === b.id ? "on" : ""}`} onClick={() => onPick(b.id)}>
            <span className="flex flex-wrap gap-2 items-center">
              <span className="font-bold text-[#ffd23f]">{b.name}</span>
              {b.recommended && <span className="pill good">Best DPS</span>}
            </span>
            <span className="text-sm text-[#d9c79a]">{b.split} · {b.role}</span>
            <span className="text-sm text-muted">{b.standing.split(".")[0]}.</span>
          </button>
        ))}
      </div>

      <CompareTable builds={builds} />

      {preset && (
        <div className="parch p-5 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="lbl">{preset.role} · {preset.split}</div>
              <h3 className="heading text-xl m-0 text-[#3b2a14]">{preset.name}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn" onClick={() => onLoad(preset, budget)}>Load at level {level} ({budget} points)</button>
              <button type="button" className="btn ghost" onClick={() => { setLevel(60); onLoad(preset, max); }}>Load level 60 build</button>
            </div>
          </div>
          <p className="m-0">{preset.standing}</p>
          <p className="m-0">{preset.playstyle}</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="lbl mb-1">Strengths</div>
              <ul className="m-0 pl-5">{preset.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
            <div>
              <div className="lbl mb-1">Weaknesses</div>
              <ul className="m-0 pl-5">{preset.weaknesses.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="lbl mb-1">Stat priority</div>
              <p className="m-0">{preset.stats}</p>
            </div>
            <div>
              <div className="lbl mb-1">How to play it</div>
              <ol className="m-0 pl-5">{preset.rotation.map((s) => <li key={s}>{s}</li>)}</ol>
            </div>
          </div>
          {syncedSplit && synced && (
            <YourCharacter data={data} preset={preset} name={synced.name} level={synced.level} split={syncedSplit} />
          )}
          <LevellingTable preset={preset} level={level} legacy={legacy} />
        </div>
      )}
    </div>
  );
}

function CompareTable({ builds }: { builds: RecommendedBuild[] }) {
  const rows: { label: string; get: (b: RecommendedBuild) => string }[] = [
    { label: "Points at 60", get: (b) => b.split },
    { label: "Raid DPS (Wowhead, 21 Nov)", get: (b) => ({ "sv-weave": "S tier, #1 overall", "sv-melee": "Not ranked separately", "mm-weave": "A tier, #6", bm: "A tier, #9" }[b.id] ?? "") },
    { label: "Range", get: (b) => ({ "sv-weave": "Ranged + melee", "sv-melee": "Melee", "mm-weave": "Mostly ranged", bm: "Ranged" }[b.id] ?? "") },
    { label: "Difficulty", get: (b) => ({ "sv-weave": "Hard", "sv-melee": "Medium", "mm-weave": "Medium", bm: "Easy" }[b.id] ?? "") },
    { label: "Trueshot Aura for group", get: (b) => (b.order.some((s) => s.talent === "Trueshot Aura") ? "Yes" : "No") },
    { label: "Careful Aim (Int = AP)", get: (b) => (b.order.some((s) => s.talent === "Careful Aim") ? "Yes" : "Only with Legacy points") },
    { label: "Levelling", get: (b) => ({ "sv-weave": "Slow start, strong from 30", "sv-melee": "Slow start, strong from 30", "mm-weave": "Steady", bm: "Fastest and safest" }[b.id] ?? "") },
  ];
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full text-sm border-collapse min-w-[560px]">
        <thead>
          <tr>
            <th className="text-left p-2 lbl" scope="col"><span className="sr-only">Compare</span></th>
            {builds.map((b) => <th key={b.id} scope="col" className="text-left p-2 text-[#ffd23f] font-bold">{b.name}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-t border-[#3a2c1a]">
              <th scope="row" className="text-left p-2 text-muted font-normal">{r.label}</th>
              {builds.map((b) => <td key={b.id} className="p-2 text-[#e8d5a4]">{r.get(b)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function YourCharacter({ data, preset, name, level, split }: { data: TalentClass; preset: RecommendedBuild; name: string; level: number; split: number[] }) {
  const pts = pointsAvailable(level);
  const { alloc } = allocFromNames(data, buildAtPoints(preset, pts));
  const want = splitOf(data, alloc);
  const same = want.every((n, i) => n === split[i]);
  return (
    <div className="border border-[#8a6a2f] rounded p-3 bg-[#f6ead0]">
      <div className="lbl mb-1">{name} at level {level}</div>
      <p className="m-0">
        Your last character sync shows <b>{split.join("/")}</b> (talent points can lag a few levels behind, since Raider.IO crawls slowly). This build at level {level} is <b>{want.join("/")}</b>.
        {same ? " You're already on track." : " Spreading points across all three trees misses the strongest talents deep in each tree, so a respec at your class trainer is worth it."}
      </p>
    </div>
  );
}

function LevellingTable({ preset, level, legacy }: { preset: RecommendedBuild; level: number; legacy: number }) {
  const plan = levellingPlan(preset, legacy);
  return (
    <details open>
      <summary className="cursor-pointer min-h-[32px] font-bold">Levelling order, level by level</summary>
      <p className="m-0 my-2 text-sm">One point per level from 10{legacy > 0 ? `, plus ${legacy} Legacy point${legacy > 1 ? "s" : ""} at 10` : ""}. Your level is highlighted.</p>
      <ol className="m-0 p-0 list-none grid gap-1 sm:grid-cols-2">
        {plan.map((s, i) => {
          const now = level >= s.from && level <= s.to;
          const done = level > s.to;
          return (
            <li key={i} className={`flex gap-3 px-2 py-1 rounded ${now ? "bg-[#e9d39a] font-bold" : done ? "opacity-60" : ""}`}>
              <span className="tabular-nums w-16 shrink-0">{s.from === s.to ? `${s.from}` : `${s.from}–${s.to}`}</span>
              <span>{s.talent} {s.points > 1 ? `×${s.points}` : ""}</span>
            </li>
          );
        })}
      </ol>
    </details>
  );
}

function BuildDiff({ data, alloc, preset, points }: { data: TalentClass; alloc: Allocation; preset: RecommendedBuild; points: number }) {
  if (points === 0) return null;
  const { alloc: want } = allocFromNames(data, buildAtPoints(preset, points));
  const all = data.trees.flatMap((t) => t.talents);
  const diffs = all.filter((t) => (alloc[t.id] ?? 0) !== (want[t.id] ?? 0));
  if (diffs.length === 0) return <div className="text-sm text-[#b9f09a]">Matches {preset.name} at {points} points.</div>;
  return (
    <details className="text-sm">
      <summary className="cursor-pointer min-h-[32px] text-[#d9c79a]">Compared with {preset.name} at {points} points: {diffs.length} talent{diffs.length > 1 ? "s" : ""} differ</summary>
      <ul className="m-0 pl-5 mt-1 text-muted">
        {diffs.map((t) => <li key={t.id}>{t.name}: yours {alloc[t.id] ?? 0}, build {want[t.id] ?? 0}</li>)}
      </ul>
    </details>
  );
}

function ImportCode({ data, onImport }: { data: TalentClass; onImport: (a: Allocation) => void }) {
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const submit = () => {
    let code = text.trim();
    const m = code.match(/#talents-([a-z]+)-(.+)$/);
    if (m) {
      if (m[1] !== data.class) { setErr(`That link is for a ${CLASSES[m[1] as ClassId]?.name ?? m[1]} build.`); return; }
      code = m[2];
    }
    const a = decodeBuild(data, code);
    if (!a || !isValid(data, a, pointsAvailable(60, MAX_LEGACY_BONUS))) { setErr("That isn't a valid build code for this class."); return; }
    setErr(null); setText(""); onImport(a);
  };
  return (
    <form className="flex flex-wrap gap-2 items-center" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <label className="sr-only" htmlFor="talent-import">Build code or share link</label>
      <input id="talent-import" className="field flex-1 min-w-[12rem]" placeholder="Paste a build code or share link" value={text} onChange={(e) => setText(e.target.value)} />
      <button type="submit" className="btn ghost" disabled={!text.trim()}>Load</button>
      {err && <span className="text-sm text-[#ff9a3c] w-full">{err}</span>}
    </form>
  );
}

/* ---------------------------------------------------------------- trees */

function Tree({ cls, tree, alloc, budget, hoverId, hoverPinned, onAdd, onRemove, onHover }: {
  cls: TalentClass; tree: TalentTree; alloc: Allocation; budget: number; hoverId: string | null; hoverPinned: boolean;
  onAdd: (id: string) => void; onRemove: (id: string) => void; onHover: (t: Talent | null, rect: DOMRect | null, pinned: boolean) => void;
}) {
  const spent = spentInTree(tree, alloc);
  const rows = Math.max(...tree.talents.map((t) => t.row));
  const byPos = useMemo(() => new Map(tree.talents.map((t) => [`${t.row}:${t.col}`, t])), [tree]);
  const pointer = useRef<string>("mouse");

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
            const show = (el: HTMLElement, pinned: boolean) => onHover(t, el.getBoundingClientRect(), pinned);
            return (
              <div key={t.id} className="relative">
                <button type="button" data-talent={t.id}
                  className={`w-full min-h-[64px] rounded border-2 p-1.5 text-left flex flex-col justify-between gap-1 text-[12.5px] leading-tight cursor-pointer
                    ${state === "maxed" ? "border-[#f3d688] bg-[#3a2c12] text-[#fff1c8]" : state === "some" ? "border-[#4fd34f] bg-[#16210f] text-bone" : state === "open" ? "border-[#9a7429] bg-[#18120c] text-bone" : "border-[#3a2c1a] bg-[#100c08] text-[#8a7a5a]"}
                    ${gated ? "opacity-60" : ""} ${hoverId === t.id ? "ring-2 ring-[#9aa0b8]" : ""}`}
                  aria-label={`${t.name}, ${pts} of ${t.maxRank}${lock && !maxed ? `. ${lock.reason}` : ""}`}
                  aria-describedby={hoverId === t.id ? "talent-tip" : undefined}
                  onPointerDown={(e) => { pointer.current = e.pointerType; }}
                  onClick={(e) => {
                    // On touch, the first tap opens the tooltip (with + and − buttons); a second tap adds a point.
                    if (pointer.current === "touch" && !(hoverId === t.id && hoverPinned)) { show(e.currentTarget, true); return; }
                    onAdd(t.id);
                    show(e.currentTarget, pointer.current === "touch");
                  }}
                  onContextMenu={(e) => { e.preventDefault(); onRemove(t.id); show(e.currentTarget, false); }}
                  onMouseEnter={(e) => { if (pointer.current !== "touch") show(e.currentTarget, false); }}
                  onMouseLeave={() => { if (pointer.current !== "touch") onHover(null, null, false); }}
                  onFocus={(e) => { if (pointer.current !== "touch") show(e.currentTarget, false); }}
                  onBlur={() => { if (pointer.current !== "touch") onHover(null, null, false); }}>
                  <span className="font-bold break-words [hyphens:auto]" lang="en">{t.name}</span>
                  <span className="flex items-center justify-between gap-1">
                    <span className={`tabular-nums font-bold ${state === "some" ? "text-[#4fd34f]" : state === "maxed" ? "text-gold-bright" : ""}`}>{pts}/{t.maxRank}</span>
                    {t.status === "new" && <span className="text-[10px] px-1 rounded bg-[#1c1330] text-[#dcc6ff] border border-[#6a4aa8]">New</span>}
                  </span>
                </button>
                {pts > 0 && (
                  <button type="button" data-talent={t.id} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-crimson border border-gold text-[#f3e3b8] text-sm leading-none flex items-center justify-center"
                    aria-label={`Remove a point from ${t.name}`} onClick={() => onRemove(t.id)}>−</button>
                )}
              </div>
            );
          }),
        )}
      </div>
      {tree.removed.length > 0 && (
        <details className="text-sm text-muted">
          <summary className="cursor-pointer min-h-[32px]">Removed from this tree ({tree.removed.length})</summary>
          <ul className="m-0 pl-5 mt-1">{tree.removed.map((r) => <li key={r.name}>{r.name}{r.text ? `: ${r.text}` : ""}</li>)}</ul>
        </details>
      )}
    </div>
  );
}

/** A tooltip pinned to a talent button, kept inside the viewport (above the talent if there's room, else below). */
function FloatingTooltip({ rect, pinned, onClose, children }: { rect: DOMRect; pinned: boolean; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; maxHeight: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    el.style.maxHeight = "none";
    const w = el.offsetWidth, h = el.offsetHeight;
    const left = Math.min(Math.max(8, rect.left + rect.width / 2 - w / 2), vw - w - 8);
    // Never cover the talent itself, so a second tap on it still reaches it.
    const above = rect.top - 16, below = vh - rect.bottom - 16;
    if (h <= above) setPos({ left, top: rect.top - h - 8, maxHeight: above });
    else if (h <= below || below >= above) setPos({ left, top: rect.bottom + 8, maxHeight: below });
    else setPos({ left, top: 8, maxHeight: above });
  }, [rect, children]);
  useEffect(() => {
    if (!pinned) return;
    // Taps on talents are handled by the talent itself (open another, or add a point).
    const onDown = (e: PointerEvent) => {
      const target = e.target as Element;
      if (ref.current?.contains(target) || target.closest?.("[data-talent]")) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const t = setTimeout(() => window.addEventListener("pointerdown", onDown), 0);
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); window.removeEventListener("pointerdown", onDown); window.removeEventListener("keydown", onKey); };
  }, [pinned, onClose]);
  return (
    <div ref={ref} id="talent-tip" role="tooltip"
      className={`tip fixed z-50 w-[22rem] max-w-[calc(100vw-16px)] overflow-y-auto ${pinned ? "" : "pointer-events-none"}`}
      style={{ left: pos?.left ?? -9999, top: pos?.top ?? 0, maxHeight: pos?.maxHeight, visibility: pos ? "visible" : "hidden" }}>
      {children}
    </div>
  );
}

function TalentDetail({ cls, t, tree, pts, lock, onAdd, onRemove }: {
  cls: TalentClass; t: Talent; tree: TalentTree; pts: number; lock: string | null; onAdd?: () => void; onRemove?: () => void;
}) {
  const note = TALENT_NOTES[cls.class]?.[t.name];
  const pre = t.prerequisite ? cls.trees.flatMap((x) => x.talents).find((x) => x.id === t.prerequisite) : null;
  const takenBy = buildsFor(cls.class)
    .map((b) => ({ b, n: buildAtPoints(b, 51)[t.name] ?? 0 }))
    .filter((x) => x.n > 0);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold text-lg text-[#ffd23f]">{t.name}</span>
        <span className="tabular-nums text-[#9aa3b5]">{pts}/{t.maxRank}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {note && <span className="pill">{CATEGORY_LABEL[note.category]}</span>}
        {t.status && <span className={`pill ${t.status === "new" ? "new" : ""}`}>{STATUS_LABEL[t.status] ?? t.status}{t.classicName && t.status === "changed" ? ` (was ${t.classicName})` : ""}</span>}
        {!t.passive && <span className="pill">Active ability</span>}
      </div>
      <div className="text-[#9aa3b5] text-sm">
        {tree.name}, row {t.row}: {t.row === 1 ? "available from your first point" : `needs ${(t.row - 1) * POINTS_PER_ROW} points in ${tree.name}`}{pre ? `, and ${pre.maxRank}/${pre.maxRank} ${pre.name}` : ""}.
      </div>
      {t.cost && <div className="text-sm text-[#d6dbe8]">{t.cost}</div>}
      {note && <div className="text-[#f3e3b8]">{note.overview}</div>}
      <ol className="m-0 p-0 list-none flex flex-col gap-1 text-[14px]">
        {t.ranks.map((r) => {
          const cur = r.rank === pts;
          const next = r.rank === pts + 1;
          return (
            <li key={r.rank} className={`flex gap-2 ${cur ? "text-white" : next ? "text-[#2bdc2b]" : "text-[#8f97aa]"}`}>
              <span className="tabular-nums shrink-0 w-14 text-[#9aa3b5]">Rank {r.rank}{cur ? " ✓" : ""}</span>
              <span>{r.text}{r.confidence !== "source" && <span className="pill warn ml-2">Unverified</span>}</span>
            </li>
          );
        })}
        {t.ranks.length < t.maxRank && <li className="text-[#9aa3b5] italic">No text recorded for ranks {t.ranks.length + 1} to {t.maxRank} yet.</li>}
      </ol>
      {takenBy.length > 0 && (
        <div className="text-sm text-[#9aa3b5]">
          In recommended builds: {takenBy.map(({ b, n }) => `${b.name} ${n}/${t.maxRank}`).join(" · ")}
        </div>
      )}
      {takenBy.length === 0 && buildsFor(cls.class).length > 0 && <div className="text-sm text-[#9aa3b5]">Not taken in any recommended DPS build.</div>}
      {lock && lock !== "Maxed" && <div className="text-[#ff9a3c] text-sm">{lock}</div>}
      {(onAdd || onRemove) && (
        <div className="flex gap-2 pt-1">
          <button type="button" className="btn" onClick={onAdd} disabled={!!lock}>+ Add point</button>
          <button type="button" className="btn ghost" onClick={onRemove} disabled={pts === 0}>− Remove</button>
        </div>
      )}
    </div>
  );
}
