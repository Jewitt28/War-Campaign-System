import type { CustomFaction } from "./useCampaignStore";

export function factionLabel(key: string, customs: CustomFaction[]) {
  if (key === "allies") return "Allies";
  if (key === "axis") return "Axis";
  if (key === "ussr") return "USSR";
  if (key === "neutral") return "Unaligned";

  if (key.startsWith("custom:")) {
    const id = key.slice("custom:".length);
    return customs.find((c) => c.id === id)?.name ?? "Custom";
  }

  return key;
}
