import { useQuery } from "@tanstack/react-query";
import { fc } from "./api";
import { loadKb } from "./kb";

const long = { staleTime: 6 * 60 * 60 * 1000, gcTime: 24 * 60 * 60 * 1000, retry: 1 };

export const useDungeons = () => useQuery({ queryKey: ["dungeons"], queryFn: fc.dungeons, ...long });
export const useDungeon = (id: string | undefined) =>
  useQuery({ queryKey: ["dungeon", id], queryFn: () => fc.dungeon(id!), enabled: !!id, ...long });
export const useQuests = () => useQuery({ queryKey: ["quests"], queryFn: fc.quests, ...long });
export const useRares = () => useQuery({ queryKey: ["rares"], queryFn: fc.rares, ...long });
export const useZones = () => useQuery({ queryKey: ["zones"], queryFn: fc.zones, ...long });
export const useReputations = () => useQuery({ queryKey: ["reputations"], queryFn: fc.reputations, ...long });
export const useClassQuests = () => useQuery({ queryKey: ["class-quests"], queryFn: fc.classQuests, ...long });
/** The full item database (~7 MB, fetched once and kept in memory). */
export const useKb = () => useQuery({ queryKey: ["kb"], queryFn: loadKb, staleTime: Infinity, gcTime: Infinity, retry: 1 });
