// src/data/region.ts
import { withBase } from "./theatres";

export type RegionGroup = {
  id: string;
  name: string;
  territories: string[];
};

export type RegionGroupsData = {
  schemaVersion: string;
  groups: RegionGroup[];
};

export async function loadRegionGroups(url = withBase("region_groups.json")): Promise<RegionGroupsData> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load region_groups.json (${res.status})`);
  return (await res.json()) as RegionGroupsData;
}
