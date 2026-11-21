import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CLASSES } from "@/data/classes";
import type { Milestone } from "@/data/milestones";
import { ENGINEERING_PATH, MINING_NODES, PROFESSION_TIERS, maxSkillForLevel } from "@/data/professions";
import { useCharacter } from "@/lib/character";
import { candidates } from "@/lib/gear";
import { allMilestones, current, nextMajor, upcoming } from "@/lib/guidance";
import { conColor, rangeFit } from "@/lib/level";
import { useClassQuests, useDungeons, useKb, useQuests } from "@/lib/queries";
import { ItemName } from "@/components/ItemTooltip";
import { KIND_ICON, External } from "@/components/Icons";

function MilestoneLine({ m, onParchment }: { m: Milestone; onParchment?: boolean }) {
  const Icon = KIND_ICON[m.kind];
  return (
    <li className="flex gap-3 items-start">
      <span className={`mt-0.5 shrink-0 ${onParchment ? "text-[#6b4e22]" : "text-gold"}`}><Icon size={20} /></span>
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`font-bold ${m.major ? (onParchment ? "text-[#5a1a12]" : "text-gold-bright") : ""}`}>{m.title}</span>
          {m.foreverChange && <span className={onParchment ? "pill ink" : "pill new"}>Forever change</span>}
          {m.confidence === "likely" && <span className={onParchment ? "pill ink" : "pill warn"} title="Carried over from Classic; not yet confirmed for Forever">Unconfirmed</span>}
        </div>
        <div className={`text-[15px] ${onParchment ? "text-[#47331a]" : "text-[#d9c79a]"}`}>
          {m.detail}
          {m.source && <> <a href={m.source} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm" aria-label={`Source for ${m.title}`}><External /></a></>}
        </div>
      </div>
    </li>
  );
}

export default function Guidance() {
  const { character } = useCharacter();
  const cls = CLASSES[character.classId];
  const [span, setSpan] = useState(10);
  const dungeons = useDungeons();
  const classQuests = useClassQuests();
  const quests = useQuests();
  const kb = useKb();

  const input = { classId: character.classId, level: character.level, faction: character.faction, dungeons: dungeons.data, classQuests: classQuests.data };
  const next = nextMajor(input);
  const now = current(input);
  const road = upcoming(input, span);

  // Armour you can loot now and wear soon (e.g. mail for hunters at 40).
  const armorSoon = Object.entries(cls.armor).find(([, lvl]) => lvl > character.level && lvl - character.level <= 6);
  const lootEarly = useMemo(() => {
    if (!armorSoon || !kb.data) return [];
    const [type, lvl] = armorSoon;
    return candidates(kb.data.items, cls, lvl, { faction: character.faction })
      .filter((p) => p.item.subclass === type && p.item.req <= character.level + 3 && p.source !== "world")
      .slice(0, 5);
  }, [armorSoon, kb.data, cls, character.level, character.faction]);

  const myDungeons = (dungeons.data ?? [])
    .filter((d) => d.status === "launch" && (!d.access || d.access === character.faction))
    .map((d) => ({ d, fit: rangeFit(character.level, d.minLevel, d.maxLevel) }))
    .filter((x) => x.fit === "now" || x.fit === "soon")
    .slice(0, 6);

  const keyQuests = (quests.data ?? [])
    .filter((q) => (q.faction === "both" || q.faction === character.faction || !q.faction))
    .filter((q) => q.minLevel <= character.level && q.level >= character.level - 2 && q.level <= character.level + 4)
    .filter((q) => !q.classes || q.classes.map((c) => c.toLowerCase()).includes(character.classId))
    .sort((a, b) => (b.rewards.items.length - a.rewards.items.length) || ((b.xp ?? 0) - (a.xp ?? 0)))
    .slice(0, 5);

  const levelsAway = next ? next.level - character.level : 0;

  return (
    <section className="flex flex-col gap-5" aria-labelledby="guidance-title">
      <h1 id="guidance-title" className="sr-only">Guidance</h1>

      {next ? (
        <div className="parch px-6 py-6 sm:px-7 flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="lbl">Next great milestone</div>
              <div className="cinzel font-black text-4xl text-[#5a1a12] leading-tight">Level {next.level}</div>
              <div className="text-[#47331a] italic">
                {levelsAway === 1 ? "One level away." : `${levelsAway} levels away.`}
              </div>
            </div>
            <span className="pill ink">{cls.name} · level {character.level}</span>
          </div>
          <hr className="rule !bg-[#8a6a2f] !shadow-none" />
          <ul className="list-none m-0 p-0 flex flex-col gap-3">
            {allMilestones(input).filter((m) => m.level === next.level && m.major && m.kind !== "dungeon").map((m, i) => (
              <MilestoneLine key={i} m={m} onParchment />
            ))}
          </ul>
        </div>
      ) : (
        <div className="parch px-6 py-6">
          <div className="lbl">Level 60</div>
          <div className="cinzel font-black text-3xl text-[#5a1a12]">You've reached the cap</div>
          <p className="m-0 text-[#47331a]">Time for raids, epic mounts and best-in-slot gear. Raids open on 9 December 2026.</p>
        </div>
      )}

      <div className="flex flex-wrap gap-5 items-start">
        <div className="flex-[999_1_520px] min-w-0 flex flex-col gap-5">
          {now.length > 0 && (
            <div className="frame p-5 flex flex-col gap-3">
              <div className="lbl">Unlocked at your level ({character.level})</div>
              <ul className="list-none m-0 p-0 flex flex-col gap-3">{now.map((m, i) => <MilestoneLine key={i} m={m} />)}</ul>
            </div>
          )}

          <div className="frame p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="heading text-xl m-0">The road ahead</h2>
              <div className="flex gap-2" role="group" aria-label="How far ahead">
                {[5, 10, 20].map((n) => (
                  <button key={n} type="button" className={`tab ${span === n ? "on" : ""}`} aria-pressed={span === n} onClick={() => setSpan(n)}>{n} levels</button>
                ))}
              </div>
            </div>
            {road.length === 0 && <p className="m-0 text-muted italic">Nothing left to unlock. Enjoy level 60.</p>}
            <ol className="list-none m-0 p-0 flex flex-col gap-4">
              {road.map((g) => (
                <li key={g.level} className="flex gap-4">
                  <div className="shrink-0 w-14 text-center">
                    <div className="lbl">Level</div>
                    <div className={`cinzel font-black text-2xl ${g.items.some((m) => m.major) ? "text-gold-bright" : "text-[#d9c79a]"}`}>{g.level}</div>
                  </div>
                  <ul className="list-none m-0 p-0 flex flex-col gap-3 flex-1 border-l-2 border-[#4f3814] pl-4 min-w-0">
                    {g.items.map((m, i) => <MilestoneLine key={i} m={m} />)}
                  </ul>
                </li>
              ))}
            </ol>
            {!cls.detailedGuidance && (
              <p className="m-0 text-sm text-muted italic">A spell-by-level timeline for {cls.name}s isn't written yet; hunters have the full version.</p>
            )}
          </div>
        </div>

        <aside className="flex-[1_1_320px] min-w-0 flex flex-col gap-5">
          {armorSoon && (
            <div className="frame p-5 flex flex-col gap-3">
              <div className="lbl">Keep these: {armorSoon[0].toLowerCase()} at {armorSoon[1]}</div>
              {kb.isLoading && <div className="text-muted italic text-[15px]">Loading items…</div>}
              {lootEarly.map((p) => (
                <div key={p.item.id} className="flex flex-col">
                  <ItemName item={p.item} note={`Wearable at level ${armorSoon[1]}`} />
                  <span className="text-sm text-muted">{p.item.slot} · requires {p.item.req} · {p.item.source?.split(";")[0]}</span>
                </div>
              ))}
            </div>
          )}

          <div className="frame p-5 flex flex-col gap-3">
            <div className="flex justify-between items-center"><div className="lbl">Dungeons for you</div><Link to="/dungeons" className="text-sm">All</Link></div>
            {dungeons.isLoading && <div className="text-muted italic text-[15px]">Loading dungeons…</div>}
            {dungeons.isError && <div className="text-muted italic text-[15px]">Dungeon data is unavailable right now.</div>}
            {myDungeons.map(({ d, fit }) => (
              <Link key={d.id} to={`/dungeons/${d.id}`} className="row">
                <span className="flex-1 min-w-0">
                  <span className="font-bold block">{d.name}</span>
                  <span className="text-sm text-muted">{d.zone}{d.isNew ? " · new" : ""}</span>
                </span>
                <span className={`font-bold con-${conColor(character.level, Math.round((d.minLevel + d.maxLevel) / 2))}`}>{d.minLevel}–{d.maxLevel}</span>
                <span className={`pill ${fit === "now" ? "good" : ""}`}>{fit === "now" ? "Now" : "Soon"}</span>
              </Link>
            ))}
            {dungeons.data && myDungeons.length === 0 && <div className="text-muted italic text-[15px]">No dungeons in your range right now.</div>}
          </div>

          <div className="parch p-5 flex flex-col gap-3">
            <div className="flex justify-between items-center"><div className="lbl">Key quests for you</div><Link to="/quests" className="text-sm !text-[#5a1a12]">All</Link></div>
            {quests.isLoading && <div className="italic text-[15px]">Loading quests…</div>}
            {keyQuests.map((q) => (
              <div key={q.questId} className="flex flex-col">
                <a href={q.wowhead} target="_blank" rel="noreferrer" className="font-bold !text-[#5a1a12]">{q.name}</a>
                <span className="text-sm text-[#47331a]">
                  <span className={`font-bold con-${conColor(character.level, q.level)}`}>[{q.level}]</span> {q.dungeon ? q.dungeon.name : q.zone ?? q.location}
                  {q.rewards.items.length > 0 && <> · Reward{q.rewards.choice ? " choice" : ""}: {q.rewards.items.map((i) => i.name).join(", ")}</>}
                </span>
              </div>
            ))}
            {quests.data && keyQuests.length === 0 && <div className="italic text-[15px] text-[#47331a]">No tracked dungeon or elite quests near your level.</div>}
          </div>

          <ProfessionGoals />
        </aside>
      </div>
    </section>
  );
}

function ProfessionGoals() {
  const { character } = useCharacter();
  const cap = maxSkillForLevel(character.level);
  const nextTier = PROFESSION_TIERS.find((t) => t.level > character.level);
  const mining = character.professions.Mining;
  const eng = character.professions.Engineering;
  const nextNode = mining !== undefined ? MINING_NODES.find((n) => n.orange > mining) : undefined;
  const engStep = eng !== undefined ? ENGINEERING_PATH.find((s) => eng >= s.from && eng < s.to) ?? ENGINEERING_PATH.find((s) => s.from > eng) : undefined;
  const capped = Object.entries(character.professions).filter(([, s]) => s >= cap && cap < 300);
  if (!Object.keys(character.professions).length) return null;
  return (
    <div className="frame p-5 flex flex-col gap-3">
      <div className="flex justify-between items-center"><div className="lbl">Profession goals</div><Link to="/professions" className="text-sm">Details</Link></div>
      {capped.length > 0 && nextTier && (
        <div className="text-[15px]"><span className="pill warn">Capped</span> {capped.map(([p]) => p).join(" and ")} at {cap}. {nextTier.name} training ({nextTier.cap}) opens at level {nextTier.level}.</div>
      )}
      {engStep && <div className="text-[15px]"><span className="font-bold">Engineering {eng}:</span> craft {engStep.craft} ({engStep.from}–{engStep.to}).{engStep.note ? ` ${engStep.note}` : ""}</div>}
      {mining !== undefined && (
        <div className="text-[15px]"><span className="font-bold">Mining {mining}:</span> {nextNode ? `${nextNode.name} unlocks at ${nextNode.orange}.` : "Every node is open to you."}</div>
      )}
    </div>
  );
}
