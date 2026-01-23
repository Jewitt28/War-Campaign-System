import type { NationId } from "./NationId";

/**
 * v1: keep this small and explicit.
 * Later you’ll swap this to pull from NATION_DEFINITIONS.
 */
const NATION_HOMELANDS: Record<NationId, string[]> = {
  GREAT_BRITAIN: ["WE-01", "WE-02"],
  FRANCE: ["WE-04", "WE-05", "WE-06"],
  BELGIUM: ["WE-07"],
  NETHERLANDS: ["WE-07"],
  NORWAY: ["WE-15"],

  GERMANY: ["WE-08", "WE-09"],
  ITALY: ["WE-10", "WE-11"],

  POLAND: ["EE-07", "EE-08"],
  POLISH_PPA: ["EE-08"],
  SOVIET_UNION: ["EE-05", "EE-06"],

  FINLAND: ["EE-01"],
  ROMANIA: ["EE-14"],
  BULGARIA: ["EE-14"],
  HUNGARY: ["EE-15"],
  GREECE: ["EE-15"],

  IMPERIAL_JAPAN: ["PA-01", "PA-02"],
  UNITED_STATES: ["PA-15"],

  PARTISANS: [],
};

export function getNationHomelands(nationId: NationId): string[] {
  return NATION_HOMELANDS[nationId] ?? [];
}
