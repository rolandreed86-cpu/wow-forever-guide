import { CLASSES } from "@/data/classes";
import { maxSkillForLevel } from "@/data/professions";
import { SYNCED, useCharacter } from "@/lib/character";
import type { HistoryPoint, SyncedCharacter } from "@/lib/characterSync";
import { PageTitle } from "@/components/States";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function Progress() {
  const c = SYNCED.character;
  return (
    <section className="flex flex-col gap-5">
      <PageTitle eyebrow="Progress" title={c ? `${c.name}'s journey` : "Live character tracking"}>
        Your level, professions, talents and gear, read from Raider.IO and ForeverDB. A daily sync updates this page,
        and the guidance, gear and profession pages follow your real character.
      </PageTitle>
      {c ? <Tracked c={c} history={SYNCED.history} /> : <NotSetUp />}
    </section>
  );
}

function NotSetUp() {
  return (
    <div className="frame p-5 flex flex-col gap-3 max-w-[70ch]">
      <h2 className="heading text-xl m-0">Waiting for the first sync</h2>
      <p className="m-0">Tracking starts once your character is named in the project. Until then the app uses the character you set by hand in the header.</p>
      <ul className="m-0 pl-5 flex flex-col gap-1 text-[15px]">
        <li>Level, gear and talents come from Raider.IO, which reads the Armory. A character appears from level 10, after a logout.</li>
        <li>Professions come from ForeverDB, which needs its in-game addon to upload them.</li>
      </ul>
    </div>
  );
}

function Tracked({ c, history }: { c: SyncedCharacter; history: HistoryPoint[] }) {
  const { character, resync } = useCharacter();
  const cls = c.classId ? CLASSES[c.classId] : null;
  const edited = character.syncedAt === c.syncedAt &&
    (character.level !== c.level ||
      (Object.keys(c.professions).length > 0 && JSON.stringify(character.professions) !== JSON.stringify(c.professions)));
  const cap = maxSkillForLevel(c.level);
  const talentTotal = Object.values(c.talents).reduce((a, b) => a + b, 0);

  return (
    <>
      <div className="parch px-6 py-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="lbl">Level</div>
          <div className="cinzel font-black text-5xl text-[#5a1a12] leading-none">{c.level}</div>
          <div className="text-[#47331a] mt-1">
            {c.race} <span className="font-bold">{c.className}</span> · {c.faction === "horde" ? "Horde" : "Alliance"} · {c.region}
            {c.guild && <> · &lt;{c.guild}&gt;</>}
          </div>
        </div>
        <div className="text-[#47331a] text-[15px] text-right">
          <div>Synced {fmtWhen(c.syncedAt)}</div>
          {c.lastSeen && <div>Armory read {fmtWhen(c.lastSeen)}</div>}
          {c.itemLevel !== null && <div>Average item level {c.itemLevel}</div>}
        </div>
      </div>

      {edited && (
        <div className="frame px-5 py-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[15px]">You've changed your character by hand, so the other pages show level {character.level}, not your synced level {c.level}.</span>
          <button type="button" className="btn" onClick={resync}>Use synced character</button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="frame p-5 flex flex-col gap-3 min-w-0">
          <h2 className="heading text-xl m-0">Levels over time</h2>
          {history.length > 1 ? <LevelChart history={history} /> : <p className="m-0 text-muted italic">The chart starts after your second synced day.</p>}
        </div>

        <div className="frame p-5 flex flex-col gap-3">
          <h2 className="heading text-xl m-0">Professions</h2>
          {Object.keys(c.professions).length === 0 && (
            <p className="m-0 text-muted italic">No professions yet. They come from ForeverDB: install its addon and upload once to add them.</p>
          )}
          {Object.entries(c.professions).map(([p, v]) => {
            const max = c.professionMax[p] || 300;
            const prev = history.length > 1 ? history[history.length - 2].professions[p] : undefined;
            return (
              <div key={p} className="flex flex-col gap-1">
                <div className="flex justify-between gap-2 text-[15px]">
                  <span className="font-bold">{p}</span>
                  <span className="tabular-nums">
                    {v} / {max}
                    {prev !== undefined && prev !== v && <span className="text-[#4fd34f] ml-2">+{v - prev}</span>}
                  </span>
                </div>
                <div className="bar" role="progressbar" aria-label={`${p} skill`} aria-valuenow={v} aria-valuemin={0} aria-valuemax={max}>
                  <div style={{ width: `${Math.min(100, (v / max) * 100)}%` }} />
                </div>
                {max < 300 && v >= max - 10 && (
                  <span className="text-sm text-[#ff9a3c]">Near the {max} cap. {cap > max ? "Train the next rank." : "The next rank needs a higher level."}</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="frame p-5 flex flex-col gap-3">
          <h2 className="heading text-xl m-0">Talents</h2>
          {talentTotal === 0 ? <p className="m-0 text-muted italic">No talent points reported yet.</p> : (
            <>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(c.talents).map(([tree, pts]) => (
                  <span key={tree} className="pill"><span className="font-bold mr-1">{pts}</span>{tree}</span>
                ))}
              </div>
              <span className="text-[15px] text-muted">{talentTotal} points spent at level {c.level}. <a href="#talents">Plan the rest</a></span>
            </>
          )}
        </div>

        <div className="frame p-5 flex flex-col gap-2 min-w-0">
          <h2 className="heading text-xl m-0">Equipped</h2>
          {c.equipment.length === 0 && <p className="m-0 text-muted italic">No gear reported.</p>}
          <ul className="list-none m-0 p-0 grid gap-x-4 gap-y-1 sm:grid-cols-2">
            {c.equipment.map((it) => (
              <li key={`${it.slot}:${it.id}`} className="flex flex-col min-w-0">
                <span className="text-sm text-muted">{it.slot}</span>
                <span className={`q-${it.quality} font-bold truncate`}>{it.name}</span>
              </li>
            ))}
          </ul>
          <a href="#gear" className="text-[15px]">See upgrades for level {c.level}</a>
        </div>
      </div>

      <p className="m-0 text-sm text-muted">
        Character data from{" "}
        {c.links.length ? c.links.map((l, i) => (
          <span key={l.url}>{i > 0 && " and "}<a href={l.url} target="_blank" rel="noreferrer">{l.label}</a></span>
        )) : "Raider.IO"}
        {c.professionsFrom && <> (professions as of {fmtDate(c.professionsFrom)})</>}.{" "}
        {cls ? "" : "Unknown class, so class pages use your manual choice. "}
        History since {history[0] ? fmtDate(history[0].date) : fmtDate(c.syncedAt)}.
      </p>
    </>
  );
}

function LevelChart({ history }: { history: HistoryPoint[] }) {
  const W = 560, H = 200, P = { l: 34, r: 12, t: 12, b: 26 };
  const t0 = Date.parse(history[0].date), t1 = Date.parse(history[history.length - 1].date);
  const span = Math.max(1, t1 - t0);
  const lo = Math.max(1, Math.floor((Math.min(...history.map((h) => h.level)) - 1) / 5) * 5);
  const hi = Math.min(60, Math.ceil((Math.max(...history.map((h) => h.level)) + 1) / 5) * 5);
  const x = (d: string) => P.l + ((Date.parse(d) - t0) / span) * (W - P.l - P.r);
  const y = (l: number) => P.t + (1 - (l - lo) / Math.max(1, hi - lo)) * (H - P.t - P.b);
  const ticks = Array.from({ length: Math.floor((hi - lo) / 5) + 1 }, (_, i) => lo + i * 5);
  const path = history.map((h, i) => `${i ? "L" : "M"}${x(h.date).toFixed(1)},${y(h.level).toFixed(1)}`).join(" ");
  const last = history[history.length - 1];
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[320px] h-auto" role="img"
        aria-label={`Level rose from ${history[0].level} on ${fmtDate(history[0].date)} to ${last.level} on ${fmtDate(last.date)}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="#3a2c1a" strokeWidth={1} />
            <text x={P.l - 8} y={y(t) + 4} textAnchor="end" fontSize="12" fill="#9aa3b5">{t}</text>
          </g>
        ))}
        <text x={P.l} y={H - 6} fontSize="12" fill="#9aa3b5">{fmtDate(history[0].date)}</text>
        <text x={W - P.r} y={H - 6} fontSize="12" fill="#9aa3b5" textAnchor="end">{fmtDate(last.date)}</text>
        <path d={path} fill="none" stroke="#e8c26a" strokeWidth={2.5} strokeLinejoin="round" />
        {history.map((h) => (
          <circle key={h.date} cx={x(h.date)} cy={y(h.level)} r={3.5} fill="#e8c26a">
            <title>{`${fmtDate(h.date)}: level ${h.level}`}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
}
