import { KB_URL } from "@/lib/kb";
import { FC_BASE } from "@/lib/api";
import { PageTitle } from "@/components/States";

const SOURCES = [
  { name: "Forever Companion API", url: "https://forevercompanion.io/developers", use: "Dungeons, dungeon loot, quests, class quests, rares and reputations. Free, no key, refreshed about every 6 hours. Records marked verified were checked in game by 3 or more players.", endpoint: FC_BASE },
  { name: "wow-forever-kb", url: "https://github.com/gBlaku/wow-forever-kb", use: "About 22,700 items with full stats and sources, rebuilt daily from game client tables. Powers tooltips, the gear planner, engineering recipes and collections.", endpoint: KB_URL },
  { name: "warcraft.wiki.gg", url: "https://warcraft.wiki.gg/wiki/World_of_Warcraft:_Forever", use: "Hunter abilities by level, mining techniques, riding, talents and Legacy milestones (hand-curated into the app)." },
  { name: "Warcraft Tavern and Wowhead Forever guides", url: "https://www.warcrafttavern.com/forever/guides/hunter-leveling/", use: "Hunter levelling, pets, engineering path and profession tiers (hand-curated)." },
  { name: "Blizzard news", url: "https://worldofwarcraft.blizzard.com/news/24301515", use: "Class deep dives and Forever change notes." },
];

export default function About() {
  return (
    <section className="flex flex-col gap-5">
      <PageTitle eyebrow="Sources" title="Where the data comes from">
        Blizzard's official API doesn't yet offer trainer spells or dungeon loot for Forever, so this app combines two community data feeds with hand-checked level milestones.
      </PageTitle>
      <div className="grid gap-3">
        {SOURCES.map((s) => (
          <div key={s.name} className="frame p-5 flex flex-col gap-1">
            <a href={s.url} target="_blank" rel="noreferrer" className="font-bold text-lg">{s.name}</a>
            <p className="m-0 text-[15px] text-[#d9c79a]">{s.use}</p>
            {s.endpoint && <code className="text-sm text-muted break-all">{s.endpoint}</code>}
          </div>
        ))}
      </div>
      <div className="parch p-5 flex flex-col gap-2">
        <div className="lbl">Good to know</div>
        <ul className="m-0 pl-5 flex flex-col gap-1">
          <li>Milestones marked <b>Unconfirmed</b> come from Classic and haven't been confirmed for Forever yet.</li>
          <li>Best-in-slot picks use rough stat weights, not simulations. Treat them as a shortlist.</li>
          <li>Some item sources come from Classic data and may differ in Forever. Raid loot appears once raids open on 9 December 2026.</li>
          <li>Your character, owned mounts and pets are stored only in this browser.</li>
        </ul>
      </div>
    </section>
  );
}
