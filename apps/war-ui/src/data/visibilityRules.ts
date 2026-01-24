// apps/war-ui/src/data/visibilityRules.ts
import type { NormalizedData } from "./theatres";
import type { OwnerKey } from "../store/useCampaignStore";
import type { NationKey } from "../setup/NationDefinitions";
import type { VisibilityLevel } from "./visibility";

export function isAdjacentToOwned(args: {
  data: NormalizedData | null;
  ownerByTerritory: Record<string, OwnerKey>;
  viewerNation: NationKey;
  territoryId: string;
}) {
  const { data, ownerByTerritory, viewerNation, territoryId } = args;
  if (!data) return false;

  // v1: brute force scan is fine
  for (const [tid, owner] of Object.entries(ownerByTerritory)) {
    if (owner !== viewerNation) continue;
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
  territoryId: string;
  ownerByTerritory: Record<string, OwnerKey>;
  intelByTerritory: Record<
    string,
    Partial<Record<NationKey, VisibilityLevel>> | undefined
  >;
  data: NormalizedData | null;
}): VisibilityLevel {
  const { viewerMode, viewerNation, territoryId, ownerByTerritory, intelByTerritory, data } = args;

  if (viewerMode === "GM") return "FULL";

  const owner = ownerByTerritory[territoryId] ?? "neutral";
  if (owner === viewerNation) return "FULL";

  const intel = intelByTerritory[territoryId]?.[viewerNation] ?? "NONE";
  if (intel !== "NONE") return intel;

  if (isAdjacentToOwned({ data, ownerByTerritory, viewerNation, territoryId })) return "KNOWN";

  return "NONE";
}
