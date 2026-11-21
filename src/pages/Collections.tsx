import { useMemo, useState } from "react";
import { useCharacter } from "@/lib/character";
import { conColor } from "@/lib/level";
import { classifySource, SOURCE_LABEL } from "@/lib/gear";
import { useKb, useRares } from "@/lib/queries";
import { ItemName } from "@/components/ItemTooltip";
import { Loading, LoadError, PageTitle } from "@/components/States";

type Tab = "mounts" | "pets" | "tame";

const OWNED_KEY = "wa:owned";
function loadOwned(): Set<number> {
  try { return new Set(JSON.parse(localStorage.getItem(OWNED_KEY) ?? "[]") as number[]); } catch { return new Set(); }
}

export default function Collections() {
  const { character } = useCharacter();
  const [tab, setTab] = useState<Tab>(character.classId === "hunter" ? "tame" : "mounts");
  const [owned, setOwned] = useState<Set<number>>(loadOwned);
  const [hideOwned, setHideOwned] = useState(false);
  const kb = useKb();
  const rares = useRares();

  const toggle = (id: number) => {
    const next = new Set(owned);
    if (next.has(id)) next.delete(id); else next.add(id);
    setOwned(next);
    try { localStorage.setItem(OWNED_KEY, JSON.stringify([...next])); } catch { /* per-visit only */ }
  };

  const collectibles = useMemo(() => {
    if (!kb.data) return [];
    const sub = tab === "mounts" ? "Mount" : "Pet";
    return kb.data.items
      .filter((i) => i.itemClass === "Miscellaneous" && i.subclass === sub && i.source)
      .sort((a, b) => a.req - b.req || a.name.localeCompare(b.name));
  }, [kb.data, tab]);

  const shown = collectibles.filter((i) => !hideOwned || !owned.has(i.id));
  const ownedCount = collectibles.filter((i) => owned.has(i.id)).length;
  const tameable = (rares.data ?? []).filter((r) => r.tameable);

  return (
    <section className="flex flex-col gap-5">
      <PageTitle eyebrow="Collections" title="Mounts, pets and beasts">
        Mounts, companion pets, toys and transmog are account-wide in Forever. Tick off what you own; it's saved in this browser.
      </PageTitle>

      <div className="flex gap-2 flex-wrap" role="tablist" aria-label="Collection type">
        {([["tame", "Rare beasts to tame"], ["mounts", "Mounts"], ["pets", "Companion pets"]] as const).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={`tab ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {tab === "tame" ? (
        <div className="flex flex-col gap-4">
          <div className="parch p-5 flex flex-col gap-2">
            <div className="lbl">Hunter pets in Forever</div>
            <p className="m-0">There are 19 pet families, including the new Fox (Trickster's Dance at level 20), and Owl is now Bird of Prey. Every family has one unique ability. Pets scale from your gear, so a well-geared hunter has a strong pet whatever its level of loyalty.</p>
            <p className="m-0 text-sm">You can only tame beasts at or below your level, and you can stable up to 3 pets (1 active, 2 stabled).</p>
          </div>
          {rares.isLoading && <Loading what="rare beasts" />}
          {rares.isError && <LoadError what="rare beasts" error={rares.error} retry={() => rares.refetch()} />}
          <div className="grid gap-3 sm:grid-cols-2">
            {tameable.map((r) => {
              const top = parseInt(r.levels.split(/[–-]/).pop() ?? "0", 10);
              return (
                <div key={r.id} className="frame p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gold-bright">{r.name}</span>
                    <span className="pill">{r.tameable}</span>
                    {r.elite && <span className="pill warn">Elite</span>}
                  </div>
                  <div className="text-[15px] text-[#d9c79a]">{r.zone} · level <span className={`font-bold con-${conColor(character.level, top || 1)}`}>{r.levels}</span></div>
                  {r.coords.length > 0 && <div className="text-sm text-muted">Seen at {r.coords.join("; ")}</div>}
                  {top > character.level && <div className="text-sm con-orange">Too high to tame until level {top}</div>}
                </div>
              );
            })}
          </div>
          {rares.data && tameable.length === 0 && <div className="frame p-5 italic text-muted">No tameable rares recorded yet.</div>}
          <p className="m-0 text-sm text-muted">More rares are added as players find them.</p>
        </div>
      ) : (
        <div className="frame p-5 flex flex-col gap-3">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div className="lbl">{ownedCount} of {collectibles.length} collected</div>
            <label className="flex items-center gap-2 min-h-[44px] cursor-pointer text-[15px]">
              <input type="checkbox" checked={hideOwned} onChange={(e) => setHideOwned(e.target.checked)} className="w-5 h-5 accent-[#c9a24a]" />
              Hide ones I own
            </label>
          </div>
          <div className="bar" aria-hidden="true"><div style={{ width: `${collectibles.length ? (ownedCount / collectibles.length) * 100 : 0}%` }} /></div>
          {kb.isLoading && <Loading what="the item database" />}
          {kb.isError && <LoadError what="the item database" error={kb.error} retry={() => kb.refetch()} />}
          <div className="flex flex-col gap-2">
            {shown.map((i) => (
              <div key={i.id} className="row !min-h-0 flex-wrap">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={owned.has(i.id)} onChange={() => toggle(i.id)} className="w-5 h-5 accent-[#c9a24a]" aria-label={`I own ${i.name}`} />
                </label>
                <span className="flex-1 min-w-0 flex flex-col">
                  <ItemName item={i} />
                  <span className="text-sm text-muted">{SOURCE_LABEL[classifySource(i.source, i.sourceTypes)]}: {i.source?.split("|")[0]}</span>
                </span>
                {i.req > 1 && <span className="text-sm text-[#d9c79a]">req {i.req}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
