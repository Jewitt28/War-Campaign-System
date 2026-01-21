// src/setup/SetupRules.ts
import type { BaseFactionKey, FactionKey } from "../store/useCampaignStore";
import type { TheatreId } from "../data/theatres";
import { useCampaignStore } from "../store/useCampaignStore";

export const START_TERRITORIES_BY_FACTION: Record<BaseFactionKey, string[]> = {
  allies: ["WE-01", "WE-02", "WE-03", "WE-04", "WE-05", "WE-06", "WE-07", "WE-13", "WE-15", "NA-01", "NA-02", "NA-03", "NA-04", "NA-05"],
  axis: ["WE-08", "WE-09", "WE-10", "WE-11", "WE-12", "NA-06", "NA-07", "NA-08", "NA-09", "NA-10", "NA-11", "NA-12"],
  ussr: ["EE-03", "EE-04", "EE-05", "EE-06", "EE-07", "EE-08", "EE-09", "EE-10", "EE-11", "EE-12", "EE-13", "EE-14", "EE-15"],
};

export const START_THEATRES_BY_FACTION: Record<BaseFactionKey, TheatreId[]> = {
  allies: ["WE", "NA"],
  axis: ["WE", "NA"],
  ussr: ["EE"],
};

export function isBaseFactionKey(fk: FactionKey): fk is BaseFactionKey {
  return fk === "allies" || fk === "axis" || fk === "ussr";
}

/**
 * In SETUP mode, the user selects either a base faction or a custom faction.
 * This helper returns the selected key ("allies" | "axis" | "ussr" | "custom:<id>") or null.
 */
export function getSelectedFactionKey(): FactionKey | null {
  const s = useCampaignStore.getState();

  if (s.selectedSetupFaction === "custom") {
    if (!s.selectedCustomId) return null;
    return `custom:${s.selectedCustomId}`;
  }

  if (s.selectedSetupFaction === "allies") return "allies";
  if (s.selectedSetupFaction === "axis") return "axis";
  if (s.selectedSetupFaction === "ussr") return "ussr";

  return null;
}

/**
 * Safe helpers so other files never index Record<BaseFactionKey,...> using a FactionKey.
 * Custom factions return empty sets (by design).
 */
export function getStartTheatresForFaction(fk: FactionKey): TheatreId[] {
  if (!isBaseFactionKey(fk)) return [];
  return START_THEATRES_BY_FACTION[fk];
}

export function getStartTerritoriesForFaction(fk: FactionKey): string[] {
  if (!isBaseFactionKey(fk)) return [];
  return START_TERRITORIES_BY_FACTION[fk];
}

function isInActiveTheatre(territoryId: string, active: Record<TheatreId, boolean>) {
  return (
    (territoryId.startsWith("WE-") && active.WE) ||
    (territoryId.startsWith("EE-") && active.EE) ||
    (territoryId.startsWith("NA-") && active.NA) ||
    (territoryId.startsWith("PA-") && active.PA)
  );
}

/**
 * Setup rule: can the currently selected setup faction pick this territory as homeland?
 */
export function canPickHomeland(territoryId: string): { ok: boolean; reason?: string } {
  const s = useCampaignStore.getState();
  const fk = getSelectedFactionKey();
  if (!fk) return { ok: false, reason: "Pick a faction first." };

  // Must be in an active theatre
  if (!isInActiveTheatre(territoryId, s.activeTheatres)) {
    return { ok: false, reason: "That theatre isn’t enabled." };
  }

  // Custom faction: allow any active theatre for now
  if (fk.startsWith("custom:")) return { ok: true };

  // Base faction restrictions
  if (!isBaseFactionKey(fk)) return { ok: false, reason: "Invalid faction key." };

  const allowedTheatres = START_THEATRES_BY_FACTION[fk];
  const theatreAllowed =
    (territoryId.startsWith("WE-") && allowedTheatres.includes("WE")) ||
    (territoryId.startsWith("EE-") && allowedTheatres.includes("EE")) ||
    (territoryId.startsWith("NA-") && allowedTheatres.includes("NA")) ||
    (territoryId.startsWith("PA-") && allowedTheatres.includes("PA"));

  if (!theatreAllowed) return { ok: false, reason: "That theatre isn’t allowed for this faction." };

  const allowedTerrs = START_TERRITORIES_BY_FACTION[fk];
  if (!allowedTerrs.includes(territoryId)) return { ok: false, reason: "Not a valid starting homeland." };

  return { ok: true };
}
