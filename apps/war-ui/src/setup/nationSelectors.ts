import type { FactionKey } from "../store/useCampaignStore";
import { NATIONS, type NationKey } from "./NationDefinitions";
import type { CustomNation } from "../store/useCampaignStore";

/**
 * Given enabled nations, return which factions are actually in play.
 */
export function deriveFactionsFromNations(
  nationsEnabled: Record<NationKey, boolean>,
  customNations: CustomNation[] = [],
): FactionKey[] {
  const result = new Set<FactionKey>();

  for (const n of NATIONS) {
    if (!nationsEnabled[n.id]) continue;
    result.add(n.defaultFaction);
  }

  for (const n of customNations) {
    if (!nationsEnabled[n.id]) continue;
    result.add(n.defaultFaction);
  }

  return Array.from(result.values());
}
