// src/setup/NationDefinitions.ts
import type { BaseFactionKey } from "../store/useCampaignStore";

export type NationKey =
  | "belgium"
  | "bulgaria"
  | "finland"
  | "france"
  | "germany"
  | "great_britain"
  | "greece"
  | "hungary"
  | "imperial_japan"
  | "italy"
  | "norway"
  | "partisans"
  | "poland"
  | "polish_peoples_army"
  | "romania"
  | "soviet_union"
  | "the_netherlands"
  | "us";

export type NationDef = {
  id: NationKey;
  name: string;
  flag?: string

  /**
   * “Default” alliance bucket for V1 gameplay and fog-of-war ownership coloring.
   * Later we will make factions optional and player-joinable.
   */
  defaultFaction: BaseFactionKey;

  /**
   * Homeland options, using CURRENT map territory IDs.
   * This is intentionally coarse for V1 and will be improved in V2 when territories split.
   */
  homelandTerritories: string[];
};

export const NATIONS: NationDef[] = [
  { id: "belgium", name: "Belgium", defaultFaction: "allies", homelandTerritories: ["WE-07"] },
  { id: "bulgaria", name: "Bulgaria", defaultFaction: "axis", homelandTerritories: ["EE-14"] },
  { id: "finland", name: "Finland", defaultFaction: "axis", homelandTerritories: ["EE-01"] }, // historically co-belligerent
  { id: "france", name: "France", defaultFaction: "allies", homelandTerritories: ["WE-04", "WE-05", "WE-06"] },
  { id: "germany", name: "Germany", defaultFaction: "axis", homelandTerritories: ["WE-08", "WE-09"] },
  { id: "great_britain", name: "Great Britain", defaultFaction: "allies", homelandTerritories: ["WE-01", "WE-02"] },
  { id: "greece", name: "Greece", defaultFaction: "allies", homelandTerritories: ["EE-15"] },
  { id: "hungary", name: "Hungary", defaultFaction: "axis", homelandTerritories: ["EE-15"] },
  { id: "imperial_japan", name: "Imperial Japan", defaultFaction: "axis", homelandTerritories: ["PA-01", "PA-02"] },
  { id: "italy", name: "Italy", defaultFaction: "axis", homelandTerritories: ["WE-10", "WE-11"] },
  { id: "norway", name: "Norway", defaultFaction: "allies", homelandTerritories: ["WE-15"] },
  { id: "partisans", name: "Partisans", defaultFaction: "allies", homelandTerritories: ["EE-15", "WE-06", "EE-09"] }, // placeholder set
  { id: "poland", name: "Poland", defaultFaction: "allies", homelandTerritories: ["EE-07", "EE-08"] },
  { id: "polish_peoples_army", name: "Polish People’s Army", defaultFaction: "ussr", homelandTerritories: ["EE-07", "EE-08"] },
  { id: "romania", name: "Romania", defaultFaction: "axis", homelandTerritories: ["EE-14"] },
  { id: "soviet_union", name: "Soviet Union", defaultFaction: "ussr", homelandTerritories: ["EE-05"] }, // “capital homeland” v1
  { id: "the_netherlands", name: "The Netherlands", defaultFaction: "allies", homelandTerritories: ["WE-07"] },
  { id: "us", name: "United States", defaultFaction: "allies", homelandTerritories: ["NA-15"] }, // temporary (until US mainland exists)
];

export const NATION_BY_ID: Record<NationKey, NationDef> = Object.fromEntries(
  NATIONS.map((n) => [n.id, n])
) as Record<NationKey, NationDef>;
