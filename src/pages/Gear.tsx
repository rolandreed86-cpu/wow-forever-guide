import { useMemo, useState } from "react";
import { CLASSES } from "@/data/classes";
import { useCharacter } from "@/lib/character";
import { SOURCE_LABEL, bestInSlot, craftInfo, type Pick } from "@/lib/gear";
import { useKb } from "@/lib/queries";
import { ItemName } from "@/components/ItemTooltip";
import { Loading, LoadError, PageTitle } from "@/components/States";

export default function Gear() {
  const { character } = useCharacter();
  const cls = CLASSES[character.classId];
  const kb = useKb();
  const [level, setLevel] = useState(character.level);
  const [world, setWorld] = useState(false);
  const [raid, setRaid] = useState(false);
  const [crafted, setCrafted] = useState(true);
  const [minQuality, setMinQuality] = useState(2);

  const bis = useMemo(
    () => (kb.data ? bestInSlot(kb.data.items, cls, level, { includeWorldDrops: world, includeRaid: raid, includeCrafted: crafted, minQuality, faction: character.faction }) : null),
    [kb.data, cls, level, world, raid, crafted, minQuality, character.faction],
  );

  const note = (p: Pick) => {
    const c = craftInfo(p.item.source);
    if (c && character.professions[c.profession] !== undefined) {
      const have = character.professions[c.profession];
      return have >= c.skill ? `You can craft this (${c.profession} ${c.skill})` : `Craftable at ${c.profession} ${c.skill} (you have ${have})`;
    }
    return undefined;
  };

  return (
    <section className="flex flex-col gap-5">
      <PageTitle eyebrow="Gear planner" title={`Best in slot for a level ${level} ${cls.name.toLowerCase()}`}>
        The strongest gear you can get at each level, ranked with rough {cls.name.toLowerCase()} stat weights. It's a starting point for planning, not a theorycrafted list.
      </PageTitle>

      <div className="frame p-5 flex flex-col gap-4">
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
          <Toggle checked={crafted} onChange={setCrafted} label="Crafted items" />
          <Toggle checked={world} onChange={setWorld} label="Rare world drops" />
          <Toggle checked={raid} onChange={setRaid} label="Raid loot (not open yet)" />
          <label className="flex items-center gap-2 min-h-[44px]">
            <span>Lowest quality</span>
            <select className="field" value={minQuality} onChange={(e) => setMinQuality(parseInt(e.target.value, 10))}>
              <option value={1}>Common</option><option value={2}>Uncommon</option><option value={3}>Rare</option><option value={4}>Epic</option>
            </select>
          </label>
        </div>
      </div>

      {kb.isLoading && <Loading what="the item database (about 7 MB, first visit only)" />}
      {kb.isError && <LoadError what="the item database" error={kb.error} retry={() => kb.refetch()} />}

      {bis && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="frame p-5 flex flex-col gap-3">
            <h2 className="heading text-xl m-0">Weapons: {bis.weapons.label}</h2>
            {bis.weapons.picks.slice(0, bis.weapons.label === "Two-handed" ? 1 : 2).map((p) => <PickRow key={p.item.id} p={p} note={note(p)} top />)}
            {bis.altWeapons && (
              <>
                <div className="lbl mt-2">Alternative: {bis.altWeapons.label}</div>
                {bis.altWeapons.picks.slice(0, bis.altWeapons.label === "Two-handed" ? 1 : 2).map((p) => <PickRow key={p.item.id} p={p} note={note(p)} />)}
              </>
            )}
            {!bis.weapons.picks.length && <p className="m-0 italic text-muted">No weapons found for these filters.</p>}
          </div>
          {bis.slots.map(({ slot, picks }) => {
            const topN = slot === "Finger" || slot === "Trinket" ? 2 : 1;
            return (
              <div key={slot} className="frame p-5 flex flex-col gap-3">
                <h2 className="heading text-xl m-0">{slot === "Finger" ? "Rings" : slot === "Trinket" ? "Trinkets" : slot}</h2>
                {picks.slice(0, topN).map((p) => <PickRow key={p.item.id} p={p} note={note(p)} top />)}
                {picks.length > topN && <div className="lbl mt-1">Also good</div>}
                {picks.slice(topN).map((p) => <PickRow key={p.item.id} p={p} note={note(p)} />)}
                {!picks.length && <p className="m-0 italic text-muted">Nothing found for this slot with these filters.</p>}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function PickRow({ p, note, top }: { p: Pick; note?: string; top?: boolean }) {
  return (
    <div className={`row !min-h-0 flex-wrap ${top ? "on" : ""}`}>
      <span className="flex-1 min-w-0 flex flex-col">
        <ItemName item={p.item} note={note} />
        <span className="text-sm text-muted">
          {SOURCE_LABEL[p.source]}{p.item.source ? `: ${p.item.source.split(/[;|]/)[0].replace(/^(Drop|Quest|Vendor|Crafted): /, "")}` : ""}
        </span>
        {note && <span className="text-sm text-[#b9f09a]">{note}</span>}
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
