// src/nations/NationDefinitions.ts
import type { NationDefinition } from "./types";

export const NATION_DEFINITIONS: NationDefinition[] = [
  {
    id: "GREAT_BRITAIN",
    name: "Great Britain",
    defaultFaction: "allies",
    homelandTerritories: ["WE-01", "WE-02"],
  },
  {
    id: "FRANCE",
    name: "France",
    defaultFaction: "allies",
    homelandTerritories: ["WE-04", "WE-05", "WE-06"],
  },
  {
    id: "BELGIUM",
    name: "Belgium",
    defaultFaction: "allies",
    homelandTerritories: ["WE-07"],
    notes: "Shares Benelux territory with Netherlands (v1 compromise)",
  },
  {
    id: "NETHERLANDS",
    name: "The Netherlands",
    defaultFaction: "allies",
    homelandTerritories: ["WE-07"],
    notes: "Shares Benelux territory with Belgium (v1 compromise)",
  },
  {
    id: "NORWAY",
    name: "Norway",
    defaultFaction: "allies",
    homelandTerritories: ["WE-15"],
  },
  {
    id: "GERMANY",
    name: "Germany",
    defaultFaction: "axis",
    homelandTerritories: ["WE-08", "WE-09"],
  },
  {
    id: "ITALY",
    name: "Italy",
    defaultFaction: "axis",
    homelandTerritories: ["WE-10", "WE-11"],
  },
  {
    id: "POLAND",
    name: "Poland",
    defaultFaction: "allies",
    homelandTerritories: ["EE-07", "EE-08"],
  },
  {
    id: "POLISH_PPA",
    name: "Polish People's Army",
    defaultFaction: "ussr",
    homelandTerritories: ["EE-08"],
    notes: "Soviet-aligned Poland (late-war)",
  },
  {
    id: "SOVIET_UNION",
    name: "Soviet Union",
    defaultFaction: "ussr",
    homelandTerritories: ["EE-05", "EE-06"],
  },
  {
    id: "FINLAND",
    name: "Finland",
    defaultFaction: "axis",
    homelandTerritories: ["EE-01"],
  },
  {
    id: "ROMANIA",
    name: "Romania",
    defaultFaction: "axis",
    homelandTerritories: ["EE-14"],
    notes: "Shares territory with Bulgaria (v1 compromise)",
  },
  {
    id: "BULGARIA",
    name: "Bulgaria",
    defaultFaction: "axis",
    homelandTerritories: ["EE-14"],
    notes: "Shares territory with Romania (v1 compromise)",
  },
  {
    id: "HUNGARY",
    name: "Hungary",
    defaultFaction: "axis",
    homelandTerritories: ["EE-15"],
  },
  {
    id: "GREECE",
    name: "Greece",
    defaultFaction: "allies",
    homelandTerritories: ["EE-15"],
    notes: "Shares Balkans gate (v1 compromise)",
  },
  {
    id: "UNITED_STATES",
    name: "United States",
    defaultFaction: "allies",
    homelandTerritories: ["PA-15"],
  },
  {
    id: "IMPERIAL_JAPAN",
    name: "Imperial Japan",
    defaultFaction: "axis",
    homelandTerritories: ["PA-01", "PA-02"],
  },
  {
    id: "PARTISANS",
    name: "Partisans",
    homelandTerritories: [],
    notes: "Activated via resistance mechanics only",
  },
];
