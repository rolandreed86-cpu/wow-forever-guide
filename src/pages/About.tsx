import { useQuery } from "@tanstack/react-query";
import { loadSnapshotMeta } from "@/lib/api";
import { PageTitle } from "@/components/States";

const SOURCES = [
  { name: "Forever Companion API", url: "https://forevercompanion.io/developers", use: "Dungeons, dungeon loot, quests, class quests, rares and reputations. Records marked verified were checked in game by 3 or more players." },
  { name: "wow-forever-kb", url: "https://github.com/gBlaku/wow-forever-kb", use: "Item stats and sources from the game client tables. Powers tooltips, the gear planner, engineering recipes and collections." },
  { name: "Talents Forever via WoW Forever Talent", url: "https://wowforevertalent.com/sources/", use: "Talent trees and every rank's text for all nine classes, from the Forever beta client with later hotfixes. Licensed CC BY 4.0." },
  { name: "warcraft.wiki.gg", url: "https://warcraft.wiki.gg/wiki/World_of_Warcraft:_Forever", use: "Hunter abilities by level, mining techniques, riding, talents and Legacy milestones (hand-curated into the app)." },
  { name: "Warcraft Tavern and Wowhead Forever guides", url: "https://www.warcrafttavern.com/forever/guides/hunter-leveling/", use: "Hunter levelling, pets, engineering path and profession tiers (hand-curated)." },
  { name: "Blizzard news", url: "https://worldofwarcraft.blizzard.com/news/24301515", use: "Class deep dives and Forever change notes." },
];

export default function About() {
  const meta = useQuery({ queryKey: ["meta"], queryFn: loadSnapshotMeta, staleTime: Infinity });
  const when = meta.data ? new Date(meta.data.snapshotAt).toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" }) : null;
  return (
    <section className="flex flex-col gap-5">
      <PageTitle eyebrow="Sources" title="Where the data comes from">
        Blizzard's official API doesn't yet offer trainer spells or dungeon loot for Forever, so this app combines community data with hand-checked level milestones.
      </PageTitle>
      <div className="frame p-5 text-[15px] text-[#d9c79a]">
        All data is bundled with the app, so it works on its own without contacting other sites.{when ? ` This copy was taken on ${when}.` : ""}
      </div>
      <div className="grid gap-3">
        {SOURCES.map((s) => (
          <div key={s.name} className="frame p-5 flex flex-col gap-1">
            <a href={s.url} target="_blank" rel="noreferrer" className="font-bold text-lg">{s.name}</a>
            <p className="m-0 text-[15px] text-[#d9c79a]">{s.use}</p>
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
