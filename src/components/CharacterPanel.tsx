import { useState } from "react";
import { CLASS_LIST, CLASSES, PROFESSIONS, type ClassId, type Faction } from "@/data/classes";
import { clampLevel, useCharacter } from "@/lib/character";
import { maxSkillForLevel } from "@/data/professions";

export function CharacterPanel({ onClose }: { onClose: () => void }) {
  const { character, update } = useCharacter();
  const [addProf, setAddProf] = useState("");
  const profs = Object.entries(character.professions);
  const cap = maxSkillForLevel(character.level);

  return (
    <section className="frame p-5 flex flex-col gap-4" aria-label="Edit your character">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="heading text-xl m-0">Your character</h2>
        <button type="button" className="btn ghost" onClick={onClose}>Done</button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1">
          <span className="lbl">Name</span>
          <input className="field" value={character.name} maxLength={24} placeholder="Optional"
            onChange={(e) => update({ name: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="lbl">Class</span>
          <select className="field" value={character.classId} onChange={(e) => update({ classId: e.target.value as ClassId })}>
            {CLASS_LIST.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="lbl">Level</span>
          <input className="field" type="number" min={1} max={60} value={character.level}
            onChange={(e) => update({ level: clampLevel(parseInt(e.target.value, 10)) })} />
        </label>
        <fieldset className="flex flex-col gap-1 border-0 p-0 m-0">
          <legend className="lbl mb-1">Faction</legend>
          <div className="flex gap-2">
            {(["horde", "alliance"] as Faction[]).map((f) => (
              <button key={f} type="button" className={`tab ${character.faction === f ? "on" : ""}`} aria-pressed={character.faction === f}
                onClick={() => update({ faction: f })}>{f === "horde" ? "Horde" : "Alliance"}</button>
            ))}
          </div>
        </fieldset>
      </div>
      {!CLASSES[character.classId].detailedGuidance && (
        <p className="m-0 text-[15px] text-muted italic">
          The spell-by-level timeline is written for hunters so far. Other classes get armour unlocks, class quests, dungeons and general milestones.
        </p>
      )}
      <div className="flex flex-col gap-2">
        <div className="lbl">Professions (your level allows up to {cap || "none yet"})</div>
        <div className="grid gap-3 sm:grid-cols-2">
          {profs.map(([name, skill]) => (
            <div key={name} className="flex items-center gap-3">
              <label className="flex-1 flex items-center gap-3">
                <span className="w-32 font-bold">{name}</span>
                <input className="field w-24" type="number" min={1} max={300} value={skill}
                  aria-label={`${name} skill`}
                  onChange={(e) => update({ professions: { ...character.professions, [name]: Math.max(1, Math.min(300, parseInt(e.target.value, 10) || 1)) } })} />
              </label>
              <button type="button" className="btn ghost" aria-label={`Remove ${name}`}
                onClick={() => { const next = { ...character.professions }; delete next[name]; update({ professions: next }); }}>Remove</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          <select className="field" value={addProf} onChange={(e) => setAddProf(e.target.value)} aria-label="Add a profession">
            <option value="">Add a profession…</option>
            {PROFESSIONS.filter((p) => !(p in character.professions)).map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <button type="button" className="btn" disabled={!addProf}
            onClick={() => { if (addProf) { update({ professions: { ...character.professions, [addProf]: 1 } }); setAddProf(""); } }}>Add</button>
        </div>
      </div>
    </section>
  );
}
