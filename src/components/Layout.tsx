import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { CLASSES } from "@/data/classes";
import { useCharacter } from "@/lib/character";
import { CharacterPanel } from "./CharacterPanel";
import { Book, Bow, Castle, Compass, Crest, Hammer, Paw, Scroll } from "./Icons";

const NAV = [
  { to: "/", label: "Guidance", icon: Compass, end: true },
  { to: "/dungeons", label: "Dungeons & Raids", icon: Castle },
  { to: "/gear", label: "Gear", icon: Bow },
  { to: "/quests", label: "Quests", icon: Scroll },
  { to: "/professions", label: "Professions", icon: Hammer },
  { to: "/collections", label: "Collections", icon: Paw },
  { to: "/about", label: "Sources", icon: Book },
];

export function Layout() {
  const { character } = useCharacter();
  const [editing, setEditing] = useState(false);
  const cls = CLASSES[character.classId];
  return (
    <div className="min-h-screen">
      <div className="max-w-[1200px] mx-auto px-4 py-4 sm:p-6 flex flex-col gap-5">
        <header className="frame px-5 py-4 flex flex-wrap items-center gap-4 justify-between">
          <NavLink to="/" className="flex items-center gap-3 no-underline">
            <Crest size={52} />
            <div>
              <div className="heading text-2xl leading-none">Wayfarer's Almanac</div>
              <div className="text-sm italic text-[#bfa978] mt-1">A field guide for WoW Forever adventurers</div>
            </div>
          </NavLink>
          <button type="button" className="row !w-auto !bg-transparent !border-transparent hover:!border-[#9a7429] gap-3 cursor-pointer"
            onClick={() => setEditing((e) => !e)} aria-expanded={editing} aria-label="Edit your character">
            <span className="w-12 h-12 rounded-full border-[3px] border-gold bg-[#2b3a22] flex items-center justify-center shadow-[inset_0_0_0_2px_#000,0_2px_0_#000]" style={{ color: cls.color }}>
              <Bow size={26} />
            </span>
            <span className="flex flex-col items-start">
              <span className="flex items-baseline gap-2">
                {character.name && <span className="cinzel font-bold text-lg" style={{ color: cls.color }}>{character.name}</span>}
                <span className="text-[15px] text-[#d9c79a]">Level {character.level} <span style={{ color: cls.color }}>{cls.name}</span></span>
              </span>
              <span className="flex gap-1.5 flex-wrap mt-1">
                {Object.entries(character.professions).map(([p, s]) => <span key={p} className="pill">{p} {s}</span>)}
                <span className="pill">{character.faction === "horde" ? "Horde" : "Alliance"}</span>
              </span>
            </span>
          </button>
        </header>

        {editing && <CharacterPanel onClose={() => setEditing(false)} />}

        <nav aria-label="Sections" className="flex flex-wrap gap-2">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="tab"><Icon size={18} />{label}</NavLink>
          ))}
        </nav>

        <main className="flex flex-col gap-5">
          <Outlet />
        </main>

        <footer className="frame px-5 py-4 text-sm text-[#bfa978] flex flex-col gap-1">
          <div>
            Dungeon, quest and class-quest data from <a href="https://forevercompanion.io" target="_blank" rel="noreferrer">Forever Companion</a>.
            Item stats and sources from <a href="https://github.com/gBlaku/wow-forever-kb" target="_blank" rel="noreferrer">wow-forever-kb</a>.
            Level milestones hand-curated from <a href="https://warcraft.wiki.gg/wiki/World_of_Warcraft:_Forever" target="_blank" rel="noreferrer">warcraft.wiki.gg</a> and community guides.
          </div>
          <div>Fan-made and not affiliated with Blizzard Entertainment. World of Warcraft is a trademark of Blizzard Entertainment.</div>
        </footer>
      </div>
    </div>
  );
}
