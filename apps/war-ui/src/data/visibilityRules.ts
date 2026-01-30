// apps/war-ui/src/data/visibilityRules.ts
import type { NormalizedData } from "./theatres";
import type { OwnerKey } from "../store/useCampaignStore";
import type { NationKey } from "../setup/NationDefinitions";
import type { VisibilityLevel } from "./visibility";
import { visibilityOrder } from "./visibility";

export function isAdjacentToOwned(args: {
  data: NormalizedData | null;
  ownerByTerritory: Record<string, OwnerKey>;
  viewerNations: NationKey[];
  territoryId: string;
}) {
  const { data, ownerByTerritory, viewerNations, territoryId } = args;
  if (!data) return false;
  const viewerSet = new Set(viewerNations);

  // v1: brute force scan is fine
  for (const [tid, owner] of Object.entries(ownerByTerritory)) {
    if (owner === "neutral" || owner === "contested") continue;
    if (!viewerSet.has(owner)) continue;
    const t = data.territoryById.get(tid);
    if (!t) continue;
    if ((t.adj ?? []).includes(territoryId)) return true;
  }
  return false;
}

/**
 * Effective visibility rules:
 * - GM sees FULL
 * - Owned by viewer => FULL
 * - Else use intelByTerritory[tid][viewerNation] (NONE/KNOWN/SCOUTED/FULL)
 * - Else if adjacent to owned => KNOWN
 * - Else NONE
 */
export function getEffectiveVisibility(args: {
  viewerMode: "GM" | "PLAYER";
  viewerNation: NationKey;
  alliedNations?: NationKey[];
  territoryId: string;
  ownerByTerritory: Record<string, OwnerKey>;
  intelByTerritory: Record<
    string,
    Partial<Record<NationKey, VisibilityLevel>> | undefined
  >;
  data: NormalizedData | null;
}): VisibilityLevel {
  const {
    viewerMode,
    viewerNation,
    alliedNations,
    territoryId,
    ownerByTerritory,
    intelByTerritory,
    data,
  } = args;
  const nations = alliedNations?.length ? alliedNations : [viewerNation];

  if (viewerMode === "GM") return "FULL";

  const owner = ownerByTerritory[territoryId] ?? "neutral";
  if (owner !== "neutral" && owner !== "contested") {
    if (nations.includes(owner)) return "FULL";
  }

  let bestIntel: VisibilityLevel = "NONE";
  for (const nation of nations) {
    const intel = intelByTerritory[territoryId]?.[nation] ?? "NONE";
    if (
      visibilityOrder.indexOf(intel) >
      visibilityOrder.indexOf(bestIntel)
    ) {
      bestIntel = intel;
    }
  }
  if (bestIntel !== "NONE") return bestIntel;

  if (
    isAdjacentToOwned({
      data,
      ownerByTerritory,
      viewerNations: nations,
      territoryId,
    })
  )
    return "KNOWN";

  return "NONE";
}
