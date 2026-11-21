import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { ClassId, Faction } from "@/data/classes";

export interface Character {
  name: string;
  classId: ClassId;
  level: number;
  faction: Faction;
  /** Profession name → current skill. */
  professions: Record<string, number>;
}

export const DEFAULT_CHARACTER: Character = {
  name: "",
  classId: "hunter",
  level: 37,
  faction: "horde",
  professions: { Engineering: 175, Mining: 185 },
};

const KEY = "wa:character";

function load(): Character {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_CHARACTER, ...(JSON.parse(raw) as Partial<Character>) };
  } catch {
    // ignore: fall back to the default character
  }
  return DEFAULT_CHARACTER;
}

interface Ctx {
  character: Character;
  update: (patch: Partial<Character>) => void;
}

const CharacterContext = createContext<Ctx | null>(null);

export function CharacterProvider({ children }: { children: ReactNode }) {
  const [character, setCharacter] = useState<Character>(load);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(character));
    } catch {
      // storage blocked: settings last for this visit only
    }
  }, [character]);
  const update = (patch: Partial<Character>) =>
    setCharacter((c) => ({ ...c, ...patch, level: clampLevel(patch.level ?? c.level) }));
  return <CharacterContext.Provider value={{ character, update }}>{children}</CharacterContext.Provider>;
}

export function clampLevel(n: number) {
  return Math.max(1, Math.min(60, Math.round(Number.isFinite(n) ? n : 1)));
}

export function useCharacter() {
  const ctx = useContext(CharacterContext);
  if (!ctx) throw new Error("useCharacter must be used inside CharacterProvider");
  return ctx;
}
