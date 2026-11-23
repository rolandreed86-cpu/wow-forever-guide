import { useMemo, useState } from "react";
import { useCharacter } from "@/lib/character";
import { conColor } from "@/lib/level";
import { PET_FAMILIES, PET_SOURCES, zoneSide, type Context, type PetFamily } from "@/data/pets";
import {
  BASE_SWING, CONTEXT_LABEL, comingUp, SPEC_LABEL, abilityRankAt, bestPerFamily, bracketPicks, loneWolfNote, rankPets,
  rankWithinFamily, weightsFor, type ScoredPet, type Spec,
} from "@/lib/pets";
import { PageTitle } from "@/components/States";

const SPECS: Spec[] = ["survival", "beast-mastery", "marksmanship"];
const CONTEXTS: Context[] = ["solo", "dungeon", "raid", "pvp"];
const SPEC_KEY = "wa:pet-spec";

function loadSpec(): Spec {
  try {
    const s = localStorage.getItem(SPEC_KEY) as Spec | null;
    return s && SPECS.includes(s) ? s : "survival";
  } catch { return "survival"; }
}

const pct = (v: number | null) => (v === null ? "?" : `${v > 0 ? "+" : ""}${Math.round(v * 100)}%`);
const levels = (p: ScoredPet) => (p.beast.minLevel === p.beast.maxLevel ? `${p.beast.minLevel}` : `${p.beast.minLevel}–${p.beast.maxLevel}`);

export default function Pets() {
  const { character } = useCharacter();
  const [level, setLevel] = useState(Math.max(10, character.level));
  const [spec, setSpecState] = useState<Spec>(loadSpec);
  const [context, setContext] = useState<Context>("solo");
  const setSpec = (s: Spec) => {
    setSpecState(s);
    try { localStorage.setItem(SPEC_KEY, s); } catch { /* per-visit only */ }
  };

  const opts = useMemo(() => ({ level, spec, context, faction: character.faction }), [level, spec, context, character.faction]);
  const families = useMemo(() => bestPerFamily(opts), [opts]);
  const top = families[0] ?? null;
  const perContext = useMemo(
    () => CONTEXTS.map((c) => ({ context: c, pick: rankPets({ ...opts, context: c })[0] ?? null })),
    [opts],
  );
  const brackets = useMemo(() => bracketPicks({ spec, context, faction: character.faction }), [spec, context, character.faction]);
  const soon = useMemo(() => comingUp(opts), [opts]);
  const lone = loneWolfNote(spec, context);
  const w = weightsFor(context, spec);
  const isHunter = character.classId === "hunter";

  return (
    <section className="flex flex-col gap-5">
      <PageTitle eyebrow="Hunter pets" title={`Best pet for a level ${level} ${SPEC_LABEL[spec]} hunter`}>
        Every pet family, what its ability does at your level, and the single best beast to tame for how you play. Pets
        scale from your gear in Forever, so the family and its ability matter more than the beast's own stats.
      </PageTitle>

      {!isHunter && (
        <div className="frame p-4 text-[15px] text-[#d9c79a]">Only hunters can tame pets. This page assumes a hunter; switch your class in the header to plan one.</div>
      )}

      <div className="frame p-5 flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="flex justify-between"><span className="lbl">Level</span><span className="cinzel font-bold text-gold-bright">{level}</span></span>
          <input type="range" min={10} max={60} value={level} onChange={(e) => setLevel(parseInt(e.target.value, 10))} className="w-full accent-[#c9a24a] h-11" aria-label="Level" />
        </label>
        <div className="flex gap-2 flex-wrap">
          {[10, 20, 30, 40, 50, 60].map((l) => (
            <button key={l} type="button" className={`tab ${level === l ? "on" : ""}`} onClick={() => setLevel(l)}>{l}</button>
          ))}
          <button type="button" className={`tab ${level === character.level ? "on" : ""}`} onClick={() => setLevel(Math.max(10, character.level))}>My level</button>
        </div>
        <div className="flex flex-col gap-2">
          <span className="lbl">Your spec</span>
          <div className="flex gap-2 flex-wrap" role="group" aria-label="Spec">
            {SPECS.map((s) => (
              <button key={s} type="button" className={`tab ${spec === s ? "on" : ""}`} aria-pressed={spec === s} onClick={() => setSpec(s)}>{SPEC_LABEL[s]}</button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="lbl">What you're doing</span>
          <div className="flex gap-2 flex-wrap" role="group" aria-label="Content">
            {CONTEXTS.map((c) => (
              <button key={c} type="button" className={`tab ${context === c ? "on" : ""}`} aria-pressed={context === c} onClick={() => setContext(c)}>{CONTEXT_LABEL[c]}</button>
            ))}
          </div>
        </div>
      </div>

      {top && <TopPick pick={top} runnersUp={families.slice(1, 4)} context={context} spec={spec} level={level} />}
      {soon && (
        <div className="parch p-4 text-[15px]">
          <span className="font-bold">Worth waiting for: </span>
          {soon.beast.name} ({soon.family.name}) in {soon.beast.zone} becomes tameable at level {soon.beast.minLevel}
          {soon.beast.minLevel - level === 1 ? ", one level away" : `, ${soon.beast.minLevel - level} levels away`}. {soon.reasons.slice(0, 3).join("; ")}.
        </div>
      )}
      {lone && <div className="parch p-4 text-[15px]"><span className="font-bold">Lone Wolf: </span>{lone}</div>}

      {spec === "survival" && <SurvivalNote level={level} />}

      <div className="frame p-5 flex flex-col gap-3">
        <div className="lbl">Best pet at level {level} for each kind of content ({SPEC_LABEL[spec]})</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {perContext.map(({ context: c, pick }) => (
            <button key={c} type="button" onClick={() => setContext(c)}
              className={`row !min-h-0 !items-start flex-col !gap-1 text-left cursor-pointer ${c === context ? "!border-[#f3d688]" : ""}`}>
              <span className="lbl">{CONTEXT_LABEL[c]}</span>
              {pick ? (
                <>
                  <span className="font-bold text-gold-bright">{pick.beast.name}</span>
                  <span className="text-sm text-[#d9c79a]">{pick.family.name} · {pick.family.unique.name}</span>
                  <span className="text-sm text-muted">{pick.beast.zone}, level {levels(pick)}</span>
                </>
              ) : <span className="text-muted italic">Nothing tameable yet</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="frame p-5 flex flex-col gap-3">
        <div className="lbl">Best in slot pet per level bracket · {CONTEXT_LABEL[context]} · {SPEC_LABEL[spec]}</div>
        <p className="m-0 text-sm text-muted">The best beast you can tame during each bracket, scored at the bracket's top level. A pet levels with you, so you only need a new one when a better family or a faster beast comes into reach.</p>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-[15px] border-collapse min-w-[560px]">
            <thead>
              <tr className="text-left text-[#bfa978]">
                <th className="p-2">Levels</th><th className="p-2">Best pet</th><th className="p-2">Where</th><th className="p-2">Also good</th>
              </tr>
            </thead>
            <tbody>
              {brackets.map(({ bracket, best, runnersUp }) => {
                const mine = character.level >= bracket.from && character.level <= bracket.to;
                return (
                  <tr key={bracket.label} className={`border-t border-[#3a2c1a] align-top ${mine ? "bg-[#2a1f0e]" : ""}`}>
                    <td className="p-2 cinzel font-bold whitespace-nowrap">{bracket.label}{mine && <span className="pill good ml-2">You</span>}</td>
                    <td className="p-2">
                      {best ? (
                        <span className="flex flex-col">
                          <span className="font-bold text-gold-bright">{best.beast.name}</span>
                          <span className="text-sm text-[#d9c79a]">{best.family.name}{best.beast.speed ? ` · ${best.beast.speed.toFixed(1)}s swing` : ""}{best.beast.rare ? " · rare" : ""}</span>
                          <span className="text-sm text-muted">{best.reasons.slice(0, 2).join("; ")}</span>
                        </span>
                      ) : "—"}
                    </td>
                    <td className="p-2 text-sm">{best && <>{best.beast.zone}, level {levels(best)}{best.beast.coords && <><br /><span className="text-muted">at {best.beast.coords}</span></>}</>}</td>
                    <td className="p-2 text-sm">{runnersUp.map((r) => <div key={r.beast.name}>{r.beast.name} <span className="text-muted">({r.family.name})</span></div>)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="lbl">Every family at level {level}, best first · tap one to see every beast</div>
        <div className="grid gap-3 lg:grid-cols-2">
          {families.map((p, i) => <FamilyCard key={p.family.id} best={p} place={i + 1} opts={opts} />)}
          {PET_FAMILIES.filter((f) => !families.some((p) => p.family.id === f.id)).map((f) => (
            <FamilyCard key={f.id} family={f} opts={opts} />
          ))}
        </div>
      </div>

      <div className="parch p-5 flex flex-col gap-2">
        <div className="lbl">Taming rules in Forever</div>
        <ul className="m-0 pl-5 flex flex-col gap-1 text-[15px]">
          <li>You can only tame beasts at or below your own level (24 Sept beta change).</li>
          <li>You can't tame while you have a pet, even a dismissed one. Stable it first. You get 3 slots: 1 active, 2 stabled. Keep one free to learn ability ranks from wild beasts.</li>
          <li>Pets earn 25% of your XP from green-or-higher mobs and no quest or rested XP, so a pet far below your level is slow to catch up.</li>
          <li>Pets take 10% of your attack power, 30% of your armour, your crit chance and 2 health per Stamina. Player buffs like Blessings no longer apply to them.</li>
          <li>A happy pet deals 125% damage, content 100%, unhappy 75%. Feed it what its family eats.</li>
          <li>Beast Lore (level 24) shows a beast's abilities, diet and stats before you tame it, but not its swing speed.</li>
        </ul>
      </div>

      <details className="frame p-5">
        <summary className="lbl cursor-pointer min-h-[32px]">How the ranking works, and how sure we are</summary>
        <div className="flex flex-col gap-2 mt-3 text-[15px] text-[#d9c79a]">
          <p className="m-0">Each beast gets a score from three parts. For {CONTEXT_LABEL[context].toLowerCase()} as {SPEC_LABEL[spec]} the weights are damage {Math.round(w.damage * 100)}%, toughness {Math.round(w.toughness * 100)}% and ability {Math.round(w.ability * 100)}%.</p>
          <ul className="m-0 pl-5 flex flex-col gap-1">
            <li><b>Damage</b> comes from the family's damage modifier (cats and raptors +10%, boars and turtles −10%), plus a small bonus for a faster swing than {BASE_SWING.toFixed(1)} sec. Testers disagree on how much faster pets gain, so the bonus is capped at 8 points.</li>
            <li><b>Toughness</b> is how well the family tanks: bears, boars and turtles top it.</li>
            <li><b>Ability</b> is what the family's unique ability is worth in that content, scaled by the rank you can have at your level. Wolves score highest in groups, spiders and crocolisks in PvP.</li>
            <li>Beast Mastery adds weight to damage, because its talents multiply your pet's damage. Survival counts the wolf's howl as a buff to you, because Forever Survival fights in melee.</li>
            <li>Beasts more than 6 levels below you lose points, and beasts in the other faction's zones lose a few.</li>
          </ul>
          <p className="m-0">Family modifiers and ability ranks are datamined by the community, not published by Blizzard. Some beast levels and zones are carried over from Classic and are marked as such. The ranking is our model built on those numbers, not a combat simulation.</p>
        </div>
      </details>

      <div className="frame px-5 py-4 text-sm text-[#bfa978] flex flex-col gap-1">
        <div className="lbl">Sources</div>
        {PET_SOURCES.map((s) => (
          <div key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.name}</a>: {s.what}</div>
        ))}
      </div>
    </section>
  );
}

function TopPick({ pick, runnersUp, context, spec, level }: { pick: ScoredPet; runnersUp: ScoredPet[]; context: Context; spec: Spec; level: number }) {
  return (
    <div className="frame p-5 flex flex-col gap-3">
      <div className="lbl">Best in slot · {CONTEXT_LABEL[context]} · {SPEC_LABEL[spec]}</div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="heading text-2xl">{pick.beast.name}</span>
        <span className="pill">{pick.family.name}</span>
        {pick.beast.rare && <span className="pill">Rare</span>}
        {pick.beast.elite && <span className="pill warn">Elite</span>}
        {pick.beast.isNew && <span className="pill good">New in Forever</span>}
      </div>
      <div className="text-[15px] text-[#d9c79a]">{pick.beast.zone} · level {levels(pick)}{pick.beast.coords ? ` · at ${pick.beast.coords}` : ""}</div>
      <p className="m-0 italic">{pick.family.pitch}</p>
      <ul className="m-0 pl-5 text-[15px] flex flex-col gap-0.5">
        {pick.reasons.map((r) => <li key={r}>{r}</li>)}
        {pick.warnings.map((r) => <li key={r} className="con-orange">{r}</li>)}
      </ul>
      {pick.beast.note && <div className="text-sm text-muted">{pick.beast.note}</div>}
      <AbilityTooltip family={pick.family} level={level} />
      {runnersUp.length > 0 && (
        <div className="flex flex-col gap-1">
          <div className="lbl">Next best families</div>
          <div className="flex flex-wrap gap-2">
            {runnersUp.map((r) => (
              <span key={r.beast.name} className="pill">{r.beast.name} ({r.family.name}, {r.beast.zone})</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SurvivalNote({ level }: { level: number }) {
  const howl = PET_FAMILIES.find((f) => f.id === "wolf")!;
  const r = abilityRankAt(howl, level).rank;
  return (
    <div className="parch p-5 flex flex-col gap-2 text-[15px]">
      <div className="lbl">For your Survival build</div>
      <p className="m-0">Forever's Survival tree is built around melee: Predator's Edge, Strider Kick, Lacerating Strikes and the melee attack power on Aspect of the Beast. That makes the <b>wolf</b> special for you. Furious Howl raises the melee attack power of everyone nearby, and that includes you{r ? ` (+${r.value.replace(/^\+/, "").replace(" melee attack power", "")} at rank ${r.rank})` : ""}. No other pet raises your own damage.</p>
      <p className="m-0">Solo, a high-damage cat or raptor still kills faster, because the howl is small next to a +10% damage pet. In dungeons and raids with other melee, take a wolf. Ranks 3 (level 40) and 4 (level 56) are where it really pays off; Snarler in Feralas already knows rank 3.</p>
      <p className="m-0 text-sm text-muted">Our reading of the talent and ability text; no guide has tested Survival pets in Forever yet.</p>
    </div>
  );
}

function AbilityTooltip({ family, level }: { family: PetFamily; level: number }) {
  const u = family.unique;
  const current = level ? abilityRankAt(family, level).rank : null;
  return (
    <details className="rounded border border-[#3a2c1a] bg-[#100c08] p-3">
      <summary className="cursor-pointer min-h-[28px]">
        <span className="font-bold text-[#ffd23f]">{u.name}</span>
        <span className="text-sm text-muted"> · {u.kind.replace("-", " ")}{u.focus ? ` · ${u.focus} Focus` : ""}{u.cooldown ? ` · ${u.cooldown} cooldown` : ""}</span>
      </summary>
      <div className="flex flex-col gap-2 mt-2 text-[15px]">
        <div>{u.effect}</div>
        <table className="text-sm border-collapse">
          <thead><tr className="text-left text-[#9aa3b5]"><th className="pr-3">Rank</th><th className="pr-3">Level</th><th>Effect</th></tr></thead>
          <tbody>
            {u.ranks.map((r) => (
              <tr key={r.rank} className={current?.rank === r.rank ? "text-[#2bdc2b]" : ""}>
                <td className="pr-3">{r.rank}</td><td className="pr-3">{r.level}</td><td>{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {u.confidence !== "confirmed" && <div className="text-sm text-muted">Numbers from community datamining{u.confidence === "inferred" ? "; only one source" : ""}.</div>}
      </div>
    </details>
  );
}

function FamilyCard({ best, family: fam, place, opts }: { best?: ScoredPet; family?: PetFamily; place?: number; opts: { level: number; spec: Spec; context: Context; faction: "horde" | "alliance" } }) {
  const family = best?.family ?? fam!;
  const [open, setOpen] = useState(false);
  const all = useMemo(() => (open ? rankWithinFamily(family.id, opts) : []), [open, family.id, opts]);
  const { rank, firstLevel } = abilityRankAt(family, opts.level);
  return (
    <div className="frame p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        {place && <span className="cinzel font-bold text-gold-bright">#{place}</span>}
        <span className="font-bold text-lg">{family.name}</span>
        {family.isNew && <span className="pill good">New</span>}
        <span className="text-sm text-muted ml-auto">dmg {pct(family.damage)} · armour {pct(family.armor)} · health {pct(family.health)}</span>
      </div>
      <div className="text-[15px] text-[#d9c79a]">{family.pitch}</div>
      <AbilityTooltip family={family} level={opts.level} />
      <div className="text-sm">
        {rank ? <span>At level {opts.level}: <b>{family.unique.name}{family.unique.ranks.length > 1 ? ` rank ${rank.rank}` : ""}</b>, {rank.value}</span>
          : <span className="con-orange">{family.unique.name} unlocks at level {firstLevel}</span>}
      </div>
      <div className="text-sm text-muted">Learns {family.shared.join(", ")} · eats {family.diet.join(", ")}</div>
      {family.note && <div className="text-sm text-muted">{family.note}</div>}
      {best ? (
        <div className="row !min-h-0 flex-col !items-start !gap-0.5">
          <span className="text-sm text-[#bfa978]">Best {family.name.toLowerCase()} you can tame by {opts.level}</span>
          <span className="font-bold text-gold-bright">{best.beast.name}</span>
          <span className="text-sm">{best.beast.zone}, level <span className={`con-${conColor(opts.level, best.beast.maxLevel)}`}>{levels(best)}</span>{best.beast.coords ? ` · ${best.beast.coords}` : ""}</span>
          <span className="text-sm text-muted">{beastWhy(best)}</span>
        </div>
      ) : (
        <div className="text-sm italic text-muted">None recorded at or below level {opts.level}.</div>
      )}
      <button type="button" className="btn ghost self-start" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? "Hide beasts" : `Compare every ${family.name.toLowerCase()}`}
      </button>
      {open && <BeastList pets={all} level={opts.level} />}
    </div>
  );
}

/** Why this beast beats others of its family: speed, known ranks, level. */
function beastWhy(p: ScoredPet) {
  const bits: string[] = [];
  if (p.beast.speed) bits.push(`faster ${p.beast.speed.toFixed(1)} sec swing`);
  if (p.beast.teaches?.length) bits.push(`knows ${p.beast.teaches.join(", ")}`);
  if (p.beast.note) bits.push(p.beast.note);
  if (!bits.length) bits.push(p.warnings.some((w) => w.includes("levels behind")) ? "the best of what's in reach, but well below your level" : "a typical member of the family, near your level");
  return bits.join(" · ");
}

function BeastList({ pets, level }: { pets: ScoredPet[]; level: number }) {
  if (!pets.length) return <div className="text-sm italic text-muted">No beasts of this family recorded at or below level {level}.</div>;
  return (
    <ol className="m-0 pl-5 flex flex-col gap-2 text-[15px]">
      {pets.map((p) => {
        const side = zoneSide(p.beast.zone);
        return (
          <li key={p.beast.name}>
            <span className="font-bold">{p.beast.name}</span>
            <span className="text-sm text-muted"> · {p.beast.zone}{side !== "contested" ? ` (${side})` : ""}, level {levels(p)}{p.beast.coords ? ` at ${p.beast.coords}` : ""}</span>
            <div className="text-sm">
              {p.beast.rare && <span className="pill mr-1">Rare</span>}
              {p.beast.elite && <span className="pill warn mr-1">Elite</span>}
              {p.beast.speed && <span className="pill good mr-1">{p.beast.speed.toFixed(1)}s swing</span>}
              {p.beast.teaches?.length ? <span className="text-[#d9c79a]">Knows {p.beast.teaches.join(", ")}. </span> : null}
              {p.beast.confidence === "classic" && <span className="text-muted">Level and zone from Classic. </span>}
              {p.warnings.filter((w) => !w.includes("unlocks at")).map((w) => <span key={w} className="con-orange">{w}. </span>)}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
