import type { FactionKey, CustomNation } from "../store/useCampaignStore";
import { NATIONS, type NationKey } from "./NationDefinitions";

type NationRecord = { id: NationKey; defaultFaction: FactionKey };

function getAllNations(customNations: CustomNation[]): NationRecord[] {
  return [
    ...NATIONS.map((nation) => ({
      id: nation.id,
      defaultFaction: nation.defaultFaction,
    })),
    ...customNations.map((nation) => ({
      id: nation.id,
      defaultFaction: nation.defaultFaction,
    })),
  ];
}

export function getAlignedFactionKey(
  nation: NationKey,
  customNations: CustomNation[],
  useDefaultFactions: boolean,
): FactionKey {
  if (!useDefaultFactions) return "neutral";
  if (nation.startsWith("custom:")) {
    return (
      customNations.find((custom) => custom.id === nation)?.defaultFaction ??
      "neutral"
    );
  }
  return NATIONS.find((n) => n.id === nation)?.defaultFaction ?? "neutral";
}

export function getConflictSideKey(
  nation: NationKey,
  customNations: CustomNation[],
  useDefaultFactions: boolean,
): string {
  const faction = getAlignedFactionKey(nation, customNations, useDefaultFactions);
  return faction === "neutral" ? nation : faction;
}

export function getFactionMembersForNation(args: {
  nation: NationKey;
  customNations: CustomNation[];
  nationsEnabled?: Record<NationKey, boolean>;
  useDefaultFactions: boolean;
}): NationKey[] {
  const { nation, customNations, nationsEnabled, useDefaultFactions } = args;
  const faction = getAlignedFactionKey(
    nation,
    customNations,
    useDefaultFactions,
  );
  if (faction === "neutral") return [nation];

  return getAllNations(customNations)
    .filter(
      (entry) =>
        !nationsEnabled || nationsEnabled[entry.id] || entry.id === nation,
    )
    .filter(
      (entry) =>
        getAlignedFactionKey(entry.id, customNations, useDefaultFactions) ===
        faction,
    )
    .map((entry) => entry.id);
}
