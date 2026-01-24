import type { BaseFactionKey } from "../store/useCampaignStore";
import { NATIONS, type NationKey } from "./NationDefinitions";
import type { CustomNation } from "../store/useCampaignStore";

/**
 * Given enabled nations, return which factions are actually in play.
 */
export function deriveFactionsFromNations(
  nationsEnabled: Record<NationKey, boolean>,
  customNations: CustomNation[] = [],
): Record<BaseFactionKey, boolean> {
  const result: Record<BaseFactionKey, boolean> = {
    allies: false,
    axis: false,
    ussr: false,
  };

  for (const n of NATIONS) {
    if (!nationsEnabled[n.id]) continue;
    result[n.defaultFaction] = true;
  }

  for (const n of customNations) {
    if (!nationsEnabled[n.id]) continue;
    result[n.defaultFaction] = true;
  }

  return result;
}
