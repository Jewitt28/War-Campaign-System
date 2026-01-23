// apps/war-ui/src/data/visibilityRules.ts
import type { NormalizedData } from "./theatres";
import type { FactionKey, OwnerKey } from "../store/useCampaignStore";
import type { VisibilityLevel } from "./visibility";

export function isAdjacentToOwned(args: {
  data: NormalizedData | null;
  ownerByTerritory: Record<string, OwnerKey>;
  viewerFaction: FactionKey;
  territoryId: string;
}) {
  const { data, ownerByTerritory, viewerFaction, territoryId } = args;
  if (!data) return false;

  // v1: brute force scan is fine
  for (const [tid, owner] of Object.entries(ownerByTerritory)) {
    if (owner !== viewerFaction) continue;
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
 * - Else use intelByTerritory[tid][viewerFaction] (NONE/KNOWN/SCOUTED/FULL)
 * - Else if adjacent to owned => KNOWN
 * - Else NONE
 */
export function getEffectiveVisibility(args: {
  viewerMode: "GM" | "PLAYER";
  viewerFaction: FactionKey;
  territoryId: string;
  ownerByTerritory: Record<string, OwnerKey>;
  intelByTerritory: Record<string, Partial<Record<FactionKey, VisibilityLevel>> | undefined>;
  data: NormalizedData | null;
}): VisibilityLevel {
  const { viewerMode, viewerFaction, territoryId, ownerByTerritory, intelByTerritory, data } = args;

  if (viewerMode === "GM") return "FULL";

  const owner = ownerByTerritory[territoryId] ?? "neutral";
  if (owner === viewerFaction) return "FULL";

  const intel = intelByTerritory[territoryId]?.[viewerFaction] ?? "NONE";
  if (intel !== "NONE") return intel;

  if (isAdjacentToOwned({ data, ownerByTerritory, viewerFaction, territoryId })) return "KNOWN";

  return "NONE";
}
