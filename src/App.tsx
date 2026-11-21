import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CharacterProvider } from "@/lib/character";
import { useRoute } from "@/lib/router";
import { Layout } from "@/components/Layout";
import Guidance from "@/pages/Guidance";
import { DungeonDetail, DungeonList } from "@/pages/Dungeons";
import Gear from "@/pages/Gear";
import Quests from "@/pages/Quests";
import Talents from "@/pages/Talents";
import Professions from "@/pages/Professions";
import Collections from "@/pages/Collections";
import About from "@/pages/About";
import { PageTitle } from "@/components/States";

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } });

function View() {
  const { view, param } = useRoute();
  let page;
  switch (view) {
    case "guidance": page = <Guidance />; break;
    case "talents": page = <Talents />; break;
    case "dungeons": page = <DungeonList />; break;
    case "dungeon": page = <DungeonDetail key={param} id={param ?? ""} />; break;
    case "gear": page = <Gear />; break;
    case "quests": page = <Quests />; break;
    case "professions": page = <Professions />; break;
    case "collections": page = <Collections />; break;
    case "about": page = <About />; break;
    default: page = <PageTitle eyebrow="Lost" title="This path leads nowhere">Use the tabs above to find your way back.</PageTitle>;
  }
  return <Layout view={view}>{page}</Layout>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CharacterProvider>
        <View />
      </CharacterProvider>
    </QueryClientProvider>
  );
}
