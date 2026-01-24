// src/setup/SetupRules.ts
import {
  useCampaignStore,
  type BaseFactionKey,
  type FactionKey,
} from "../store/useCampaignStore";
import type { TheatreId } from "../data/theatres";
import { NATIONS, type NationKey } from "./NationDefinitions";

export function getFactionKeyForNation(nation: NationKey): BaseFactionKey {
  const s = useCampaignStore.getState();
  if (nation.startsWith("custom:")) {
    return (
      s.customNations.find((x) => x.id === nation)?.defaultFaction ?? "allies"
    );
  }
  const n = NATIONS.find((x) => x.id === nation);
  return n?.defaultFaction ?? "allies";
}

/**
 * Setup rule: the territory must be in an enabled theatre.
 * You said you want to remove theatre restrictions per nation to increase playability.
 */
function isInActiveTheatre(territoryId: string, active: Record<TheatreId, boolean>) {
  return (
    (territoryId.startsWith("WE-") && active.WE) ||
    (territoryId.startsWith("EE-") && active.EE) ||
    (territoryId.startsWith("NA-") && active.NA) ||
    (territoryId.startsWith("PA-") && active.PA)
  );
}

export function canPickNationHomeland(territoryId: string): { ok: boolean; reason?: string } {
  const s = useCampaignStore.getState();

  if (!s.selectedSetupNation) return { ok: false, reason: "Pick a nation first." };

  if (!s.homelandUnlock && !isInActiveTheatre(territoryId, s.activeTheatres)) {
    return { ok: false, reason: "That theatre isn’t enabled." };
  }

  // Optional: prevent multiple nations selecting same homeland
  const alreadyUsedBy = Object.entries(s.homelandsByNation).find(([, tid]) => tid === territoryId);
  if (alreadyUsedBy) return { ok: false, reason: "That territory is already a homeland." };

  return { ok: true };
}

/**
 * If you still need to support custom factions later, this stays here for convenience.
 */
export function isBaseFactionKey(fk: FactionKey): fk is BaseFactionKey {
  return fk === "allies" || fk === "axis" || fk === "ussr";
}
