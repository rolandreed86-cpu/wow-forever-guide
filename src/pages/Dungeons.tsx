import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CLASSES } from "@/data/classes";
import { LATER_CONTENT, RAIDS } from "@/data/raids";
import { useCharacter } from "@/lib/character";
import { canUse, scoreItem } from "@/lib/gear";
import { conColor, rangeFit } from "@/lib/level";
import { useDungeon, useDungeons, useKb } from "@/lib/queries";
import type { Dungeon } from "@/lib/types";
import { ItemName } from "@/components/ItemTooltip";
import { Loading, LoadError, PageTitle } from "@/components/States";
import { External } from "@/components/Icons";

const FIT_LABEL = { now: "Your level", soon: "Soon", later: "Later", past: "Below you" } as const;

export function DungeonList() {
  const { character } = useCharacter();
  const q = useDungeons();
  const [show, setShow] = useState<"all" | "mine" | "new">("all");

  const list = (q.data ?? []).filter((d) => {
    if (show === "mine") return rangeFit(character.level, d.minLevel, d.maxLevel) === "now";
    if (show === "new") return d.isNew;
    return true;
  });

  return (
    <section className="flex flex-col gap-5">
      <PageTitle eyebrow="Dungeons & Raids" title="Instances of Azeroth">
        34 dungeons from level 13 to 60, nine of them new in Forever, and three raids opening on 9 December 2026.
      </PageTitle>

      <div className="flex gap-2 flex-wrap" role="group" aria-label="Filter dungeons">
        {([["all", "All dungeons"], ["mine", "At my level"], ["new", "New in Forever"]] as const).map(([k, label]) => (
          <button key={k} type="button" className={`tab ${show === k ? "on" : ""}`} aria-pressed={show === k} onClick={() => setShow(k)}>{label}</button>
        ))}
      </div>

      {q.isLoading && <Loading what="dungeons" />}
      {q.isError && <LoadError what="dungeons" error={q.error} retry={() => q.refetch()} />}

      <div className="grid gap-3 sm:grid-cols-2">
        {list.map((d) => <DungeonCard key={d.id} d={d} level={character.level} />)}
      </div>
      {q.data && list.length === 0 && <div className="frame p-5 italic text-muted">No dungeons match that filter.</div>}

      <div className="frame p-5 flex flex-col gap-4">
        <h2 className="heading text-xl m-0">Raids</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {RAIDS.map((r) => (
            <div key={r.id} className="row !items-start flex-col !gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-gold-bright">{r.name}</span>
                {r.isNew && <span className="pill new">New</span>}
              </div>
              <span className="text-sm text-[#d9c79a]">{r.size}-player · {r.bosses} {r.bosses === 1 ? "boss" : "bosses"} · opens 9 Dec 2026</span>
              <span className="text-sm text-muted">{r.note}</span>
            </div>
          ))}
        </div>
        <p className="m-0 text-sm text-muted italic">Raid loot tables aren't public yet. They'll be added when the raids open.</p>
        <div className="lbl">Coming later</div>
        <ul className="m-0 pl-5 text-[15px] text-[#d9c79a]">
          {LATER_CONTENT.map((c) => <li key={c.when}><span className="font-bold">{c.when}:</span> {c.what}</li>)}
        </ul>
      </div>
    </section>
  );
}

function DungeonCard({ d, level }: { d: Dungeon; level: number }) {
  const fit = rangeFit(level, d.minLevel, d.maxLevel);
  const body = (
    <>
      <span className="flex-1 min-w-0 flex flex-col">
        <span className="flex items-center gap-2 flex-wrap">
          <span className="font-bold">{d.name}</span>
          {d.isNew && <span className="pill new">New</span>}
          {d.access && <span className="pill">{d.access === "horde" ? "Horde" : "Alliance"}</span>}
          {d.status !== "launch" && <span className="pill warn">Announced</span>}
        </span>
        <span className="text-sm text-muted">{d.zone} · {d.bosses.length} bosses · {d.lootCount} drops · {d.questCount} quests</span>
      </span>
      <span className="flex flex-col items-end gap-1">
        <span className={`font-bold con-${conColor(level, Math.round((d.minLevel + d.maxLevel) / 2))}`}>{d.minLevel}–{d.maxLevel}</span>
        <span className={`pill ${fit === "now" ? "good" : ""}`}>{FIT_LABEL[fit]}</span>
      </span>
    </>
  );
  return d.status === "launch"
    ? <Link to={`/dungeons/${d.id}`} className="row">{body}</Link>
    : <div className="row opacity-80">{body}</div>;
}

export function DungeonDetail() {
  const { id } = useParams();
  const { character } = useCharacter();
  const cls = CLASSES[character.classId];
  const q = useDungeon(id);
  const kb = useKb();
  const [onlyMine, setOnlyMine] = useState(true);

  const loot = useMemo(() => {
    const d = q.data;
    if (!d) return [];
    return d.loot.map((l) => {
      const item = kb.data?.byId.get(l.itemId);
      const usable = item ? canUse(item, cls, 60) : true;
      return { l, item, usable, score: item ? scoreItem(item, cls) : 0 };
    });
  }, [q.data, kb.data, cls]);

  if (q.isLoading) return <Loading what="this dungeon" />;
  if (q.isError || !q.data) return <LoadError what="this dungeon" error={q.error} retry={() => q.refetch()} />;
  const d = q.data;
  const shown = loot.filter((x) => !onlyMine || x.usable);
  const bosses = [...d.bosses, ...new Set(shown.map((x) => x.l.source).filter((s) => !d.bosses.includes(s)))];
  const notes = Array.isArray(d.notes) ? d.notes : d.notes ? [d.notes] : [];

  return (
    <section className="flex flex-col gap-5">
      <div><Link to="/dungeons" className="text-sm">← All dungeons</Link></div>
      <PageTitle eyebrow={`${d.zone} · levels ${d.minLevel}–${d.maxLevel}`} title={d.name}>
        {d.entrance}
      </PageTitle>
      <div className="flex gap-2 flex-wrap">
        {d.isNew && <span className="pill new">New in Forever</span>}
        {d.access && <span className="pill">{d.access === "horde" ? "Horde only" : "Alliance only"}</span>}
        <span className={`pill ${rangeFit(character.level, d.minLevel, d.maxLevel) === "now" ? "good" : ""}`}>{FIT_LABEL[rangeFit(character.level, d.minLevel, d.maxLevel)]}</span>
        <a className="pill" href={d.url} target="_blank" rel="noreferrer">Forever Companion <External /></a>
      </div>

      {notes.length > 0 && (
        <div className="parch p-5"><div className="lbl mb-2">Notes</div><ul className="m-0 pl-5">{notes.map((n, i) => <li key={i}>{n}</li>)}</ul></div>
      )}

      <div className="flex flex-wrap gap-5 items-start">
        <div className="flex-[999_1_520px] min-w-0 frame p-5 flex flex-col gap-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h2 className="heading text-xl m-0">Loot by boss</h2>
            <label className="flex items-center gap-2 text-[15px] cursor-pointer min-h-[44px]">
              <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} className="w-5 h-5 accent-[#c9a24a]" />
              Only gear a {cls.name.toLowerCase()} can use
            </label>
          </div>
          {kb.isLoading && <div className="text-sm text-muted italic">Loading item details for tooltips…</div>}
          {bosses.map((b) => {
            const drops = shown.filter((x) => x.l.source === b).sort((a, b2) => b2.score - a.score);
            if (!drops.length) return null;
            const best = drops[0];
            return (
              <div key={b} className="flex flex-col gap-2">
                <div className="lbl">{b}</div>
                {drops.map(({ l, item, usable }) => (
                  <div key={l.itemId} className="row !min-h-0 flex-wrap">
                    <span className="flex-1 min-w-0"><ItemName item={item} fallback={l.name} quality={l.quality} /></span>
                    <span className="text-sm text-muted">{item ? `${item.subclass !== "Miscellaneous" ? item.subclass + " " : ""}${item.slot}` : l.slot}{item ? ` · req ${item.req}` : ""}</span>
                    {usable && item && best.item?.id === item.id && cls.id === "hunter" && <span className="pill good">Top pick</span>}
                  </div>
                ))}
              </div>
            );
          })}
          {shown.length === 0 && <p className="m-0 italic text-muted">No known drops match. Untick the filter to see everything.</p>}
        </div>

        <aside className="flex-[1_1_320px] min-w-0 flex flex-col gap-5">
          <div className="frame p-5 flex flex-col gap-2">
            <div className="lbl">Bosses</div>
            <ol className="m-0 pl-5 text-[15px]">{d.bosses.map((b) => <li key={b}>{b}</li>)}</ol>
          </div>
          <div className="parch p-5 flex flex-col gap-3">
            <div className="lbl">Quests</div>
            {d.quests.length === 0 && <div className="italic text-[15px]">No quests recorded.</div>}
            {d.quests.filter((x) => !x.faction || x.faction === "both" || x.faction === character.faction).map((x) => (
              <div key={x.questId} className="flex flex-col">
                <a href={x.wowhead} target="_blank" rel="noreferrer" className="font-bold !text-[#5a1a12]">{x.name}</a>
                <span className="text-sm text-[#47331a]">
                  <span className={`font-bold con-${conColor(character.level, x.level)}`}>[{x.level}]</span> from {x.giver ?? "unknown"}{x.location ? `, ${x.location}` : ""}
                </span>
                {x.objective && <span className="text-sm text-[#47331a] italic">{x.objective}</span>}
                {x.rewards.items.length > 0 && (
                  <span className="text-sm text-[#47331a]">Reward{x.rewards.choice ? " (choose one)" : ""}: {x.rewards.items.map((i) => i.name).join(", ")}</span>
                )}
                {x.prerequisites && <span className="text-xs text-[#6b4e22]">Needs: {x.prerequisites.flat().map((p) => p.name).filter((n, i, a) => a.indexOf(n) === i).join(", ")}</span>}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
