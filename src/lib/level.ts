/** Difficulty colour of content relative to the player's level, like quest and mob con colours in game. */
export type Con = "grey" | "green" | "yellow" | "orange" | "red";

export function conColor(playerLevel: number, contentLevel: number): Con {
  const diff = contentLevel - playerLevel;
  if (diff >= 5) return "red";
  if (diff >= 3) return "orange";
  if (diff >= -2) return "yellow";
  const greyBelow = playerLevel <= 5 ? 0 : playerLevel <= 39 ? playerLevel - Math.floor(playerLevel / 10) - 5 : playerLevel - Math.floor(playerLevel / 5) - 1;
  return contentLevel > greyBelow ? "green" : "grey";
}

/** Fit of a dungeon's level range for the player. */
export function rangeFit(level: number, min: number, max: number): "now" | "soon" | "later" | "past" {
  if (level >= min && level <= max) return "now";
  if (level < min && min - level <= 5) return "soon";
  if (level < min) return "later";
  return "past";
}
