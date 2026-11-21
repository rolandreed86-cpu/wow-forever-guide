import { useMemo, useState } from "react";
import { useCharacter } from "@/lib/character";
import { conColor } from "@/lib/level";
import { useClassQuests, useQuests, useReputations } from "@/lib/queries";
import { CLASSES } from "@/data/classes";
import { Loading, LoadError, PageTitle } from "@/components/States";

export default function Quests() {
  const { character } = useCharacter();
  const q = useQuests();
  const cq = useClassQuests();
  const reps = useReputations();
  const [range, setRange] = useState(5);
  const [type, setType] = useState<"all" | "dungeon" | "elite">("all");
  const [rewardsOnly, setRewardsOnly] = useState(false);
  const [search, setSearch] = useState("");

  const list = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (q.data ?? [])
      .filter((x) => !x.faction || x.faction === "both" || x.faction === character.faction)
      .filter((x) => type === "all" || x.type === type)
      .filter((x) => !rewardsOnly || x.rewards.items.length > 0)
      .filter((x) => s ? x.name.toLowerCase().includes(s) || (x.dungeon?.name ?? x.zone ?? "").toLowerCase().includes(s) : Math.abs(x.level - character.level) <= range)
      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  }, [q.data, character.faction, character.level, type, rewardsOnly, search, range]);

  const classQuests = (cq.data ?? [])
    .filter((x) => x.class === character.classId && (x.faction === "both" || x.faction === character.faction))
    .sort((a, b) => a.level - b.level);

  return (
    <section className="flex flex-col gap-5">
      <PageTitle eyebrow="Quests" title="Key quests">
        Dungeon and elite quests near your level, your class quests, and the Waylaid Supplies reputation.
      </PageTitle>

      <div className="flex flex-wrap gap-5 items-start">
        <div className="flex-[999_1_520px] min-w-0 flex flex-col gap-4">
          <div className="frame p-5 flex flex-col gap-3">
            <div className="flex gap-2 flex-wrap items-center">
              <input className="field flex-1 min-w-[200px]" type="search" placeholder="Search quests, dungeons or zones" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search quests" />
              <select className="field" value={range} onChange={(e) => setRange(parseInt(e.target.value, 10))} aria-label="Level range" disabled={!!search}>
                <option value={3}>Within 3 levels</option><option value={5}>Within 5 levels</option><option value={10}>Within 10 levels</option><option value={60}>Any level</option>
              </select>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              {(["all", "dungeon", "elite"] as const).map((t) => (
                <button key={t} type="button" className={`tab ${type === t ? "on" : ""}`} aria-pressed={type === t} onClick={() => setType(t)}>
                  {t === "all" ? "All" : t === "dungeon" ? "Dungeon" : "Elite"}
                </button>
              ))}
              <label className="flex items-center gap-2 min-h-[44px] ml-1 cursor-pointer">
                <input type="checkbox" checked={rewardsOnly} onChange={(e) => setRewardsOnly(e.target.checked)} className="w-5 h-5 accent-[#c9a24a]" />
                Item rewards only
              </label>
            </div>
          </div>

          {q.isLoading && <Loading what="quests" />}
          {q.isError && <LoadError what="quests" error={q.error} retry={() => q.refetch()} />}
          {q.data && <div className="text-sm text-muted">{list.length} quests</div>}

          <div className="flex flex-col gap-2">
            {list.slice(0, 150).map((x) => (
              <article key={x.questId} className="frame px-4 py-3 flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`font-bold con-${conColor(character.level, x.level)}`}>[{x.level}]</span>
                  <a href={x.wowhead} target="_blank" rel="noreferrer" className="font-bold">{x.name}</a>
                  <span className="pill">{x.type === "dungeon" ? x.dungeon?.name ?? "Dungeon" : "Elite"}</span>
                  {x.verified && x.verified.players >= 3 && <span className="pill good" title={`Checked in game by ${x.verified.players} players`}>Verified</span>}
                </div>
                <div className="text-[15px] text-[#d9c79a]">
                  From {x.giver ?? "unknown"}{x.location ? ` in ${x.location}` : ""} · starts at level {x.minLevel}
                  {x.xp ? ` · ${x.xp.toLocaleString()} XP` : ""}
                </div>
                {x.objective && <div className="text-[15px] italic text-[#bfa978]">{x.objective}</div>}
                {x.rewards.items.length > 0 && (
                  <div className="text-[15px]">Reward{x.rewards.choice ? " (choose one)" : ""}: <span className="text-[#4aa3ff]">{x.rewards.items.map((i) => i.name).join(", ")}</span></div>
                )}
                {x.prerequisites && <div className="text-sm text-muted">Needs: {x.prerequisites.flat().map((p) => p.name).filter((n, i, a) => a.indexOf(n) === i).join(", ")}</div>}
              </article>
            ))}
            {list.length > 150 && <div className="text-sm text-muted italic">Showing the first 150. Narrow the search to see more.</div>}
          </div>
        </div>

        <aside className="flex-[1_1_320px] min-w-0 flex flex-col gap-5">
          <div className="parch p-5 flex flex-col gap-3">
            <div className="lbl">{CLASSES[character.classId].name} class quests</div>
            {cq.isLoading && <div className="italic">Loading…</div>}
            {classQuests.map((x) => (
              <div key={x.id} className="flex flex-col">
                <span className="font-bold text-[#5a1a12]">
                  <span className={`con-${conColor(character.level, x.level)}`}>[{x.level}]</span> {x.name}
                  {x.essential && <span className="pill ink ml-2">Essential</span>}
                </span>
                <span className="text-sm text-[#47331a]">Rewards {x.reward}. {x.giver}{x.location ? `, ${x.location}` : ""}</span>
              </div>
            ))}
            {cq.data && classQuests.length === 0 && <div className="italic text-[15px]">No class quests recorded.</div>}
          </div>

          {reps.data?.map((r) => (
            <div key={r.id} className="frame p-5 flex flex-col gap-2">
              <div className="lbl">Reputation</div>
              <div className="font-bold text-gold-bright">{r.factionNames?.[character.faction] ?? r.name}</div>
              {r.summary && <p className="m-0 text-[15px] text-[#d9c79a]">{r.summary}</p>}
              {r.howTo && <ul className="m-0 pl-5 text-sm text-[#d9c79a] flex flex-col gap-1">{r.howTo.map((h, i) => <li key={i}>{h}</li>)}</ul>}
            </div>
          ))}
        </aside>
      </div>
    </section>
  );
}
