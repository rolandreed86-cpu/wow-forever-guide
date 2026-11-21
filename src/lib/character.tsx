import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { ClassId, Faction } from "@/data/classes";
import synced from "@/data/character.json";
import type { CharacterFile, SyncedCharacter } from "@/lib/characterSync";

export interface Character {
  name: string;
  classId: ClassId;
  level: number;
  faction: Faction;
  /** Profession name → current skill. */
  professions: Record<string, number>;
  /** The character sync this character was last updated from, if any. */
  syncedAt?: string;
}

/** The latest character sync, bundled with the app (see scripts/sync-character.ts). */
export const SYNCED: CharacterFile = synced as CharacterFile;

export const DEFAULT_CHARACTER: Character = {
  name: "",
  classId: "hunter",
  level: 37,
  faction: "horde",
  professions: { Engineering: 175, Mining: 185 },
};

const KEY = "wa:character";

/**
 * A newer sync replaces level, class, faction and professions. Edits made after a sync are kept
 * until the next one arrives, so you can still try out "what if I were level 45".
 */
export function applySync(c: Character, s: SyncedCharacter | null): Character {
  if (!s || c.syncedAt === s.syncedAt) return c;
  return {
    ...c,
    name: s.name || c.name,
    classId: (s.classId as ClassId | null) ?? c.classId,
    level: clampLevel(s.level),
    faction: s.faction,
    professions: Object.keys(s.professions).length ? { ...s.professions } : c.professions,
    syncedAt: s.syncedAt,
  };
}

function load(): Character {
  let c = DEFAULT_CHARACTER;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) c = { ...DEFAULT_CHARACTER, ...(JSON.parse(raw) as Partial<Character>) };
  } catch {
    // ignore: fall back to the default character
  }
  return applySync(c, SYNCED.character);
}

interface Ctx {
  character: Character;
  update: (patch: Partial<Character>) => void;
  /** Put back the values from the latest sync after manual edits. */
  resync: () => void;
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
  const resync = () => setCharacter((c) => applySync({ ...c, syncedAt: undefined }, SYNCED.character));
  return <CharacterContext.Provider value={{ character, update, resync }}>{children}</CharacterContext.Provider>;
}

export function clampLevel(n: number) {
  return Math.max(1, Math.min(60, Math.round(Number.isFinite(n) ? n : 1)));
}

export function useCharacter() {
  const ctx = useContext(CharacterContext);
  if (!ctx) throw new Error("useCharacter must be used inside CharacterProvider");
  return ctx;
}
