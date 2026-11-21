import { useId, useState } from "react";
import { PRIMARY_STATS, STAT_LABELS, formatMoney, type KbItem } from "@/lib/kb";
import type { StatKey } from "@/data/classes";

export function ItemTooltip({ item, note }: { item: KbItem; note?: React.ReactNode }) {
  const primary = PRIMARY_STATS.filter((k) => item.stats[k]);
  const equip = (Object.keys(item.stats) as StatKey[]).filter((k) => !PRIMARY_STATS.includes(k));
  return (
    <div className="tip flex flex-col gap-0.5 max-w-sm">
      <div className={`font-bold text-lg q-${item.quality}`}>{item.name}</div>
      {item.bind && <div>{item.bind}</div>}
      {item.unique && <div>Unique</div>}
      <div className="flex justify-between gap-4"><span>{item.slot}</span><span>{item.subclass !== "Miscellaneous" ? item.subclass : ""}</span></div>
      {item.minDmg != null && item.maxDmg != null && (
        <div className="flex justify-between gap-4"><span>{item.minDmg} – {item.maxDmg} Damage</span>{item.speed && <span>Speed {item.speed.toFixed(2)}</span>}</div>
      )}
      {item.dps != null && <div>({item.dps.toFixed(1)} damage per second)</div>}
      {item.armor ? <div>{item.armor} Armor</div> : null}
      {primary.map((k) => {
        const v = item.stats[k]!;
        return <div key={k}>{v > 0 ? "+" : ""}{v} {STAT_LABELS[k]}</div>;
      })}
      <div>Requires Level {item.req}</div>
      {equip.map((k) => (
        <div key={k} className="text-[#2bdc2b]">Equip: {STAT_LABELS[k]} {item.stats[k]! > 0 ? "+" : ""}{item.stats[k]}</div>
      ))}
      {item.effects && <div className="text-[#2bdc2b]">{item.effects}</div>}
      {item.set && <div className="text-[#ffd27a]">{item.set}</div>}
      {item.description && <div className="text-[#ffd23f] italic">"{item.description}"</div>}
      {item.sellPrice ? <div className="text-[#9aa3b5] text-sm">Sells for {formatMoney(item.sellPrice)}</div> : null}
      {item.source && <div className="border-t border-[#343a55] mt-2 pt-2 text-[#c9d0e6] text-sm">{item.source}</div>}
      {note && <div className="border-t border-[#343a55] mt-2 pt-2 text-[#ffd23f] italic">{note}</div>}
      <a className="text-sm mt-1" href={`https://www.wowhead.com/forever/item=${item.id}`} target="_blank" rel="noreferrer">View on Wowhead</a>
    </div>
  );
}

/** An item name in its quality colour that shows the full tooltip on hover, focus or tap. */
export function ItemName({ item, fallback, quality, note }: { item?: KbItem; fallback?: string; quality?: string; note?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  if (!item) return <span className={`font-bold q-${quality ?? "common"}`}>{fallback}</span>;
  return (
    <span className="relative inline-block" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" className={`font-bold q-${item.quality} bg-transparent border-0 p-0 cursor-help text-left underline decoration-dotted decoration-1 underline-offset-4`}
        aria-describedby={open ? id : undefined} aria-expanded={open}
        onClick={() => setOpen((o) => !o)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}>
        {item.name}
      </button>
      {open && (
        <span id={id} role="tooltip" className="absolute z-50 left-0 top-full mt-2 w-[min(22rem,80vw)] block">
          <ItemTooltip item={item} note={note} />
        </span>
      )}
    </span>
  );
}
