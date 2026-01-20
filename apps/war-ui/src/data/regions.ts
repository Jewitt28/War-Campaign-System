import { loadTheatresData } from "./theatres";
import type { TheatreData } from "./theatres";

export type RegionDef = NonNullable<TheatreData["regions"]>[number];

export async function loadRegions(): Promise<RegionDef[]> {
  const td = await loadTheatresData();
  return td.raw.regions ?? [];
}
