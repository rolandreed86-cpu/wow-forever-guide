import { useQuery } from "@tanstack/react-query";
import { fc } from "./api";
import { loadKb } from "./kb";

const long = { staleTime: 6 * 60 * 60 * 1000, gcTime: 24 * 60 * 60 * 1000, retry: 1 };

export const useDungeons = () => useQuery({ queryKey: ["dungeons"], queryFn: fc.dungeons, ...long });
export const useDungeon = (id: string | undefined) =>
  useQuery({ queryKey: ["dungeon", id], queryFn: () => fc.dungeon(id!), enabled: !!id, ...long });
/** Every dungeon with its loot table and quests. */
export const useDungeonDetails = (enabled = true) => useQuery({ queryKey: ["dungeon-details"], queryFn: fc.dungeonDetails, ...long, enabled });
export const useQuests = (enabled = true) => useQuery({ queryKey: ["quests"], queryFn: fc.quests, ...long, enabled });
export const useRares = () => useQuery({ queryKey: ["rares"], queryFn: fc.rares, ...long });
export const useZones = () => useQuery({ queryKey: ["zones"], queryFn: fc.zones, ...long });
export const useReputations = () => useQuery({ queryKey: ["reputations"], queryFn: fc.reputations, ...long });
export const useClassQuests = () => useQuery({ queryKey: ["class-quests"], queryFn: fc.classQuests, ...long });
/** The full item database (~7 MB, fetched once and kept in memory). */
export const useKb = (enabled = true) => useQuery({ queryKey: ["kb"], queryFn: loadKb, staleTime: Infinity, gcTime: Infinity, retry: 1, enabled });

import type { TalentClass } from "./talents";
import { DATA_BASE } from "./api";
/** Talent trees for one class (bundled snapshot). */
export const useTalents = (classId: string) =>
  useQuery({
    queryKey: ["talents", classId],
    queryFn: async () => {
      const res = await fetch(`${DATA_BASE}talents/${classId}.json`);
      if (!res.ok) throw new Error(`Couldn't load talents for ${classId} (${res.status})`);
      return (await res.json()) as TalentClass;
    },
    staleTime: Infinity,
  });
