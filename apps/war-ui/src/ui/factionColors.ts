import type { BaseFactionKey, CustomFaction, CustomNation, FactionKey } from "../store/useCampaignStore";
import type { NationKey } from "../setup/NationDefinitions";

export const BASE_FACTION_COLORS: Record<BaseFactionKey, string> = {
  allies: "#3b82f6",
  axis: "#ef4444",
  ussr: "#f97316",
};

export const NEUTRAL_COLOR = "#94a3b8";

export function getFactionAccent(args: {
  viewerNation: NationKey;
  viewerFaction: FactionKey;
  customNations: CustomNation[];
  customs: CustomFaction[];
}) {
  const { viewerNation, viewerFaction, customNations, customs } = args;

  if (viewerNation.startsWith("custom:")) {
    const customNation = customNations.find((nation) => nation.id === viewerNation);
    if (customNation?.color) return customNation.color;
  }

  if (viewerFaction.startsWith("custom:")) {
    const id = viewerFaction.slice("custom:".length);
    const customFaction = customs.find((faction) => faction.id === id);
    if (customFaction?.color) return customFaction.color;
  }

  if (viewerFaction === "neutral") return NEUTRAL_COLOR;

  return BASE_FACTION_COLORS[viewerFaction as BaseFactionKey] ?? NEUTRAL_COLOR;
}
