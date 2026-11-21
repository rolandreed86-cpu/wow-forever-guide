import { useMemo, useState } from "react";
import { CLASSES } from "@/data/classes";
import { SYNCED, useCharacter } from "@/lib/character";
import { ROUTE_LABEL, buildRouteIndex, routeText, type RouteKind } from "@/lib/acquire";
import {
  SOURCE_LABEL, bestInSlot, craftInfo, dungeonsWorthRunning, levellingBis, plannerSlot, scoreItem, upgradePath,
  type BisResult, type Pick, type Upgrade,
} from "@/lib/gear";
import { useDungeonDetails, useKb, useQuests } from "@/lib/queries";
import { ItemName } from "@/components/ItemTooltip";
import { Loading, LoadError, PageTitle } from "@/components/States";

type Mode = "levelling" | "all";
const EXTRA_ROUTES: { kind: RouteKind; label: string }[] = [
  { kind: "crafted", label: "Crafted" },
  { kind: "reputation", label: "Reputation rewards" },
  { kind: "vendor", label: "Vendor gear" },
  { kind: "world", label: "Rare world drops" },
];
const PATH_SPAN = 10;

export default function Gear() {
  const { character } = useCharacter();
  const cls = CLASSES[character.classId];
  const kb = useKb();
  const details = useDungeonDetails();
  const quests = useQuests();
  const [mode, setMode] = useState<Mode>("levelling");
  const [level, setLevel] = useState(character.level);
  const [extras, setExtras] = useState<RouteKind[]>([]);
  const [trash, setTrash] = useState(false);
  const [world, setWorld] = useState(false);
  const [raid, setRaid] = useState(false);
  const [crafted, setCrafted] = useState(true);
  const [minQuality, setMinQuality] = useState(2);

  const index = useMemo(() => (details.data ? buildRouteIndex(details.data, quests.data) : null), [details.data, quests.data]);
  const planOpts = useMemo(
    () => ({ routes: ["quest", "dungeon", ...extras] as RouteKind[], faction: character.faction, minQuality, includeTrash: trash }),
    [extras, character.faction, minQuality, trash],
  );

  const bis = useMemo(() => {
    if (!kb.data) return null;
    if (mode === "levelling") return index ? levellingBis(kb.data.items, cls, level, index, planOpts) : null;
    return bestInSlot(kb.data.items, cls, level, { includeWorldDrops: world, includeRaid: raid, includeCrafted: crafted, minQuality, faction: character.faction });
  }, [kb.data, index, mode, cls, level, planOpts, world, raid, crafted, minQuality, character.faction]);

  const path = useMemo(
    () => (kb.data && index && mode === "levelling" && level < 60 ? upgradePath(kb.data.items, cls, level, Math.min(60, level + PATH_SPAN), index, planOpts) : []),
    [kb.data, index, mode, cls, level, planOpts],
  );

  // What you're wearing now, from the last character sync: slot → lowest score there (the one to replace first).
  const equipped = useMemo(() => {
    const map = new Map<string, { name: string; score: number }>();
    if (!kb.data || !SYNCED.character || character.syncedAt !== SYNCED.character.syncedAt) return map;
    for (const e of SYNCED.character.equipment) {
      const it = kb.data.byId.get(e.id);
      const slot = it && plannerSlot(it);
      if (!it || !slot) continue;
      const score = scoreItem(it, cls);
      const prev = map.get(slot);
      if (!prev || score < prev.score) map.set(slot, { name: it.name, score });
    }
    return map;
  }, [kb.data, cls, character.syncedAt]);

  const vsEquipped = (slot: string, p: Pick) => {
    const e = equipped.get(slot);
    if (!e) return undefined;
    if (e.name === p.item.name) return "You're wearing this";
    const gain = Math.round((p.score - e.score) * 10) / 10;
    return gain > 0 ? `+${gain} over your ${e.name}` : undefined;
  };

  const craftNote = (p: Pick) => {
    const c = craftInfo(p.item.source);
    if (c && character.professions[c.profession] !== undefined) {
      const have = character.professions[c.profession];
      return have >= c.skill ? `You can craft this (${c.profession} ${c.skill})` : `Craftable at ${c.profession} ${c.skill} (you have ${have})`;
    }
    return undefined;
  };

  const loading = kb.isLoading || (mode === "levelling" && details.isLoading);
  const levelling = mode === "levelling";

  return (
    <section className="flex flex-col gap-5">
      <PageTitle eyebrow="Gear planner" title={`${levelling ? "Levelling gear" : "Best in slot"} for a level ${level} ${cls.name.toLowerCase()}`}>
        {levelling
          ? "The strongest quest rewards and dungeon boss drops you can get at this level, which are the quickest upgrades while levelling. Crafted, reputation and vendor gear are off unless you add them."
          : `Every source, including crafted, vendor and reputation gear, ranked with rough ${cls.name.toLowerCase()} stat weights.`}
      </PageTitle>

      <div className="frame p-5 flex flex-col gap-4">
        <div className="flex gap-2 flex-wrap" role="group" aria-label="Which gear">
          <button type="button" className={`tab ${levelling ? "on" : ""}`} aria-pressed={levelling} onClick={() => setMode("levelling")}>Quests and dungeons</button>
          <button type="button" className={`tab ${!levelling ? "on" : ""}`} aria-pressed={!levelling} onClick={() => setMode("all")}>Every source</button>
        </div>
        <label className="flex flex-col gap-2">
          <span className="flex justify-between"><span className="lbl">Level</span><span className="cinzel font-bold text-gold-bright">{level}</span></span>
          <input type="range" min={1} max={60} value={level} onChange={(e) => setLevel(parseInt(e.target.value, 10))} className="w-full accent-[#c9a24a] h-11" />
        </label>
        <div className="flex gap-2 flex-wrap">
          {[10, 20, 30, 40, 50, 60].map((l) => (
            <button key={l} type="button" className={`tab ${level === l ? "on" : ""}`} onClick={() => setLevel(l)}>{l}</button>
          ))}
          <button type="button" className={`tab ${level === character.level ? "on" : ""}`} onClick={() => setLevel(character.level)}>My level</button>
        </div>
        <div className="flex gap-x-6 gap-y-2 flex-wrap text-[15px]">
          {levelling ? (
            <>
              <Toggle checked={trash} onChange={setTrash} label="Random dungeon trash drops" />
              {EXTRA_ROUTES.map((r) => (
                <Toggle key={r.kind} checked={extras.includes(r.kind)} label={r.label}
                  onChange={(on) => setExtras((x) => (on ? [...x, r.kind] : x.filter((k) => k !== r.kind)))} />
              ))}
            </>
          ) : (
            <>
              <Toggle checked={crafted} onChange={setCrafted} label="Crafted items" />
              <Toggle checked={world} onChange={setWorld} label="Rare world drops" />
              <Toggle checked={raid} onChange={setRaid} label="Raid loot (not open yet)" />
            </>
          )}
          <label className="flex items-center gap-2 min-h-[44px]">
            <span>Lowest quality</span>
            <select className="field" value={minQuality} onChange={(e) => setMinQuality(parseInt(e.target.value, 10))}>
              <option value={1}>Common</option><option value={2}>Uncommon</option><option value={3}>Rare</option><option value={4}>Epic</option>
            </select>
          </label>
        </div>
      </div>

      {loading && <Loading what="the item database (about 7 MB, first visit only)" />}
      {kb.isError && <LoadError what="the item database" error={kb.error} retry={() => kb.refetch()} />}
      {levelling && details.isError && <LoadError what="dungeon loot tables" error={details.error} retry={() => details.refetch()} />}

      {bis && levelling && <DungeonsToRun bis={bis} level={level} />}

      {bis && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="frame p-5 flex flex-col gap-3">
            <h2 className="heading text-xl m-0">Weapons: {bis.weapons.label}</h2>
            {bis.weapons.picks.slice(0, bis.weapons.label === "Two-handed" ? 1 : 2).map((p, i) => (
              <PickRow key={p.item.id} p={p} note={craftNote(p)} gain={vsEquipped(i ? "Off hand" : "Weapon", p)} top />
            ))}
            {bis.altWeapons && (
              <>
                <div className="lbl mt-2">Alternative: {bis.altWeapons.label}</div>
                {bis.altWeapons.picks.slice(0, bis.altWeapons.label === "Two-handed" ? 1 : 2).map((p) => <PickRow key={p.item.id} p={p} note={craftNote(p)} />)}
              </>
            )}
            {!bis.weapons.picks.length && <p className="m-0 italic text-muted">No weapons found for these filters.</p>}
          </div>
          {bis.slots.map(({ slot, picks }) => {
            const topN = slot === "Finger" || slot === "Trinket" ? 2 : 1;
            return (
              <div key={slot} className="frame p-5 flex flex-col gap-3">
                <h2 className="heading text-xl m-0">{slot === "Finger" ? "Rings" : slot === "Trinket" ? "Trinkets" : slot}</h2>
                {picks.slice(0, topN).map((p) => <PickRow key={p.item.id} p={p} note={craftNote(p)} gain={vsEquipped(slot, p)} top />)}
                {picks.length > topN && <div className="lbl mt-1">Also good</div>}
                {picks.slice(topN).map((p) => <PickRow key={p.item.id} p={p} note={craftNote(p)} />)}
                {!picks.length && <p className="m-0 italic text-muted">Nothing found for this slot with these filters.</p>}
              </div>
            );
          })}
        </div>
      )}

      {levelling && path.length > 0 && <UpgradePath path={path} from={level} />}
    </section>
  );
}

function DungeonsToRun({ bis, level }: { bis: BisResult; level: number }) {
  const runs = dungeonsWorthRunning(bis).slice(0, 4);
  if (!runs.length) return null;
  return (
    <div className="frame p-5 flex flex-col gap-3">
      <h2 className="heading text-xl m-0">Dungeons worth running at {level}</h2>
      <p className="m-0 text-[15px] text-muted">Ranked by how many of the picks below drop there or come from their quests.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {runs.map((d) => (
          <div key={d.dungeon} className="row !min-h-0 flex-col !items-start gap-1">
            <span className="flex justify-between w-full gap-2 items-baseline">
              {d.dungeonId ? <a href={`#dungeon-${d.dungeonId}`} className="font-bold">{d.dungeon}</a> : <span className="font-bold">{d.dungeon}</span>}
              <span className="text-sm text-muted shrink-0">{d.minLevel ? `${d.minLevel}–${d.maxLevel} · ` : ""}{d.picks.length} {d.picks.length === 1 ? "piece" : "pieces"}</span>
            </span>
            <span className="text-sm flex flex-wrap gap-x-2">
              {d.picks.map((p, i) => <span key={p.item.id}><ItemName item={p.item} />{i < d.picks.length - 1 ? "," : ""}</span>)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function UpgradePath({ path, from }: { path: Upgrade[]; from: number }) {
  const byLevel = new Map<number, Upgrade[]>();
  for (const u of path) byLevel.set(u.level, [...(byLevel.get(u.level) ?? []), u]);
  return (
    <div className="frame p-5 flex flex-col gap-4">
      <h2 className="heading text-xl m-0">Upgrade path from {from} to {Math.min(60, from + PATH_SPAN)}</h2>
      <p className="m-0 text-[15px] text-muted">The levels where a quest or dungeon gives you something better than the best piece before it.</p>
      <ol className="list-none m-0 p-0 flex flex-col gap-4">
        {[...byLevel.entries()].map(([level, ups]) => (
          <li key={level} className="flex gap-4">
            <div className="shrink-0 w-14 text-center">
              <div className="lbl">Level</div>
              <div className="cinzel font-black text-2xl text-gold-bright">{level}</div>
            </div>
            <ul className="list-none m-0 p-0 flex flex-col gap-2 flex-1 border-l-2 border-[#4f3814] pl-4 min-w-0">
              {ups.map((u) => (
                <li key={`${u.slot}:${u.pick.item.id}`} className="flex flex-col">
                  <span><span className="text-muted text-sm mr-2">{u.slot}</span><ItemName item={u.pick.item} /></span>
                  <span className="text-sm text-muted">
                    {u.pick.route ? `${ROUTE_LABEL[u.pick.route.kind]}: ${routeText(u.pick.route)}` : ""}
                    {u.replaces ? ` · replaces ${u.replaces.item.name}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}

function PickRow({ p, note, gain, top }: { p: Pick; note?: string; gain?: string; top?: boolean }) {
  const where = p.route
    ? `${ROUTE_LABEL[p.route.kind]}: ${routeText(p.route)}`
    : `${SOURCE_LABEL[p.source]}${p.item.source ? `: ${p.item.source.split(/[;|]/)[0].replace(/^(Drop|Quest|Vendor|Crafted): /, "")}` : ""}`;
  const dungeonId = p.route?.kind === "dungeon" ? p.route.dungeonId : null;
  return (
    <div className={`row !min-h-0 flex-wrap ${top ? "on" : ""}`}>
      <span className="flex-1 min-w-0 flex flex-col">
        <ItemName item={p.item} note={note} />
        <span className="text-sm text-muted">
          {dungeonId ? <a href={`#dungeon-${dungeonId}`} className="text-muted">{where}</a> : where}
        </span>
        {note && <span className="text-sm text-[#b9f09a]">{note}</span>}
        {gain && <span className="text-sm text-[#4fd34f]">{gain}</span>}
      </span>
      <span className="text-sm text-[#d9c79a] text-right">req {p.item.req}<br />score {p.score}</span>
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-5 h-5 accent-[#c9a24a]" />
      {label}
    </label>
  );
}
