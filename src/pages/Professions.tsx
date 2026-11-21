import { useMemo, useState } from "react";
import { CLASSES } from "@/data/classes";
import {
  ENGINEERING_FOREVER, ENGINEERING_PATH, ENGINEERING_SPECS, MINING_EXTRAS, MINING_NODES,
  PROFESSION_SOURCES, PROFESSION_TIERS, SMELTING, maxSkillForLevel, nodeDifficulty,
} from "@/data/professions";
import { useCharacter } from "@/lib/character";
import { canUse, craftedBy } from "@/lib/gear";
import { useKb } from "@/lib/queries";
import { ItemName } from "@/components/ItemTooltip";
import { External } from "@/components/Icons";
import { PageTitle } from "@/components/States";

const DIFF_CLASS = { red: "con-red", orange: "con-orange", yellow: "con-yellow", green: "con-green", grey: "con-grey" } as const;
const DIFF_LABEL = { red: "Too low", orange: "Always skills up", yellow: "Usually", green: "Rarely", grey: "No skill-ups" } as const;

export default function Professions() {
  const { character } = useCharacter();
  const cap = maxSkillForLevel(character.level);
  const mining = character.professions.Mining ?? 1;
  const eng = character.professions.Engineering ?? 1;
  const [engFilter, setEngFilter] = useState<"useful" | "all">("useful");
  const kb = useKb();
  const cls = CLASSES[character.classId];

  const engItems = useMemo(() => {
    if (!kb.data) return [];
    const all = craftedBy(kb.data.items, "Engineering");
    if (engFilter === "all") return all;
    // Gear you can wear, ranged gear, scopes, ammo, explosives and pets: the things worth crafting.
    return all.filter(({ item }) =>
      (item.itemClass === "Armor" || item.itemClass === "Weapon") ? canUse(item, cls, 60)
        : ["Projectile", "Quiver"].includes(item.itemClass) || ["Explosives", "Device", "Pet", "Mount"].includes(item.subclass) || /Scope/.test(item.name));
  }, [kb.data, engFilter, cls]);

  return (
    <section className="flex flex-col gap-5">
      <PageTitle eyebrow="Professions" title="Engineering & Mining">
        Skill targets, nodes and what's new in Forever. Set your skill levels by clicking your character at the top.
      </PageTitle>

      <div className="frame p-5 flex flex-col gap-3">
        <div className="lbl">Training tiers</div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {PROFESSION_TIERS.map((t) => (
            <div key={t.name} className={`row flex-col !items-start !gap-0 ${character.level >= t.level ? "on" : ""}`}>
              <span className="font-bold">{t.name}</span>
              <span className="text-sm text-muted">Up to {t.cap} · level {t.level}</span>
            </div>
          ))}
        </div>
        <p className="m-0 text-sm text-muted">At level {character.level} you can train up to {cap || "nothing yet"}. Waylaid Crates for Merchant's Favor open at the same levels.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="frame p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="heading text-xl m-0">Mining</h2>
            <a href={PROFESSION_SOURCES.mining} target="_blank" rel="noreferrer" className="text-sm inline-flex items-center gap-1">Source <External /></a>
          </div>
          <SkillBar name="Mining" skill={mining} cap={cap} />
          <div className="flex flex-col gap-2">
            {MINING_NODES.map((n) => {
              const d = nodeDifficulty(n, mining);
              return (
                <div key={n.name} className="row !min-h-0">
                  <span className="flex-1 min-w-0 flex flex-col">
                    <span className="font-bold">{n.name} {n.isNew && <span className="pill new ml-1">New</span>}</span>
                    <span className="text-sm text-muted">{n.where}</span>
                  </span>
                  <span className="text-right text-sm">
                    <span className={`font-bold ${DIFF_CLASS[d]}`}>{n.orange}</span>
                    <br /><span className="text-muted">{DIFF_LABEL[d]}</span>
                  </span>
                </div>
              );
            })}
          </div>
          <div className="lbl">Smelting</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {SMELTING.map((s) => (
              <div key={s.bar} className="text-[15px]">
                <span className={`font-bold ${mining >= s.skill ? "" : "con-red"}`}>{s.skill}</span> {s.bar} {s.isNew && <span className="pill new">New</span>}
                {s.note && <div className="text-sm text-muted">{s.note}</div>}
              </div>
            ))}
          </div>
          <div className="lbl">Camp items</div>
          {MINING_EXTRAS.map((e) => <div key={e.title} className="text-[15px]"><span className="font-bold">{e.skill}</span> {e.title}: <span className="text-[#d9c79a]">{e.detail}</span></div>)}
          <p className="m-0 text-sm text-muted">Nodes can also give scarce materials: Pyrite (copper, tin, silver), Bauxite (iron, mithril) and Pitchblende. The Bountiful Harvest Legacy perk adds 20–100% scarce yield.</p>
        </div>

        <div className="frame p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="heading text-xl m-0">Engineering</h2>
            <a href={PROFESSION_SOURCES.engineering} target="_blank" rel="noreferrer" className="text-sm inline-flex items-center gap-1">Leveling guide <External /></a>
          </div>
          <SkillBar name="Engineering" skill={eng} cap={cap} />
          <div className="lbl">Fastest path to 300</div>
          <ol className="list-none m-0 p-0 flex flex-col gap-1.5">
            {ENGINEERING_PATH.map((s) => {
              const state = eng >= s.to ? "done" : eng >= s.from ? "now" : "next";
              return (
                <li key={s.craft} className={`row !min-h-0 !py-1.5 ${state === "now" ? "on" : ""} ${state === "done" ? "opacity-60" : ""}`}>
                  <span className="w-20 text-sm text-muted shrink-0">{s.from}–{s.to}</span>
                  <span className="flex-1 min-w-0">
                    <span className="font-bold">{s.craft}</span> {s.hunter && <span className="pill good">Hunter</span>}
                    {s.note && <span className="block text-sm text-[#d9c79a]">{s.note}</span>}
                  </span>
                  {state === "now" && <span className="pill good">You are here</span>}
                </li>
              );
            })}
          </ol>
          <div className="lbl">Specialisation at 200</div>
          {ENGINEERING_SPECS.map((s) => <div key={s.name} className="text-[15px]"><span className="font-bold">{s.name}:</span> <span className="text-[#d9c79a]">{s.detail}</span></div>)}
          <p className="m-0 text-sm text-muted">Both need 200 skill and a quest chain. Switching means unlearning Engineering and levelling it again.</p>
          <div className="lbl">New in Forever</div>
          <ul className="m-0 pl-5 flex flex-col gap-1 text-[15px]">
            {ENGINEERING_FOREVER.map((e) => <li key={e.title}><span className="font-bold">{e.title}:</span> <span className="text-[#d9c79a]">{e.detail}</span></li>)}
          </ul>
        </div>
      </div>

      <div className="frame p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="heading text-xl m-0">Things you can engineer</h2>
          <div className="flex gap-2" role="group" aria-label="Filter engineering items">
            <button type="button" className={`tab ${engFilter === "useful" ? "on" : ""}`} aria-pressed={engFilter === "useful"} onClick={() => setEngFilter("useful")}>Useful for you</button>
            <button type="button" className={`tab ${engFilter === "all" ? "on" : ""}`} aria-pressed={engFilter === "all"} onClick={() => setEngFilter("all")}>Everything</button>
          </div>
        </div>
        {kb.isLoading && <div className="italic text-muted">Loading the item database…</div>}
        <div className="grid gap-2 sm:grid-cols-2">
          {engItems.map(({ item, craft }) => (
            <div key={item.id} className={`row !min-h-0 ${eng >= craft.skill ? "" : "opacity-75"}`}>
              <span className={`w-10 shrink-0 font-bold ${eng >= craft.skill ? "con-green" : "con-red"}`}>{craft.skill}</span>
              <span className="flex-1 min-w-0 flex flex-col">
                <ItemName item={item} note={eng >= craft.skill ? "You can craft this" : `Needs Engineering ${craft.skill}`} />
                <span className="text-sm text-muted">{item.itemClass === "Armor" || item.itemClass === "Weapon" ? `${item.slot} · req ${item.req}` : item.subclass}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SkillBar({ name, skill, cap }: { name: string; skill: number; cap: number }) {
  return (
    <div>
      <div className="flex justify-between text-[15px] mb-1"><span>{name}</span><span>{skill} / 300{cap && skill >= cap && cap < 300 ? ` (capped at ${cap} for your level)` : ""}</span></div>
      <div className="bar" role="progressbar" aria-label={`${name} skill`} aria-valuemin={0} aria-valuemax={300} aria-valuenow={skill}>
        <div style={{ width: `${Math.min(100, (skill / 300) * 100)}%` }} />
      </div>
    </div>
  );
}
