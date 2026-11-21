import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { CharacterProvider } from "@/lib/character";
import { Layout } from "@/components/Layout";
import Guidance from "@/pages/Guidance";
import { DungeonDetail, DungeonList } from "@/pages/Dungeons";
import Gear from "@/pages/Gear";
import Quests from "@/pages/Quests";
import Professions from "@/pages/Professions";
import Collections from "@/pages/Collections";
import About from "@/pages/About";
import { PageTitle } from "@/components/States";

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } });

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CharacterProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Guidance />} />
              <Route path="dungeons" element={<DungeonList />} />
              <Route path="dungeons/:id" element={<DungeonDetail />} />
              <Route path="gear" element={<Gear />} />
              <Route path="quests" element={<Quests />} />
              <Route path="professions" element={<Professions />} />
              <Route path="collections" element={<Collections />} />
              <Route path="about" element={<About />} />
              <Route path="*" element={<PageTitle eyebrow="Lost" title="This path leads nowhere">Use the tabs above to find your way back.</PageTitle>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </CharacterProvider>
    </QueryClientProvider>
  );
}
