import {
  DOCTRINE_STANCES_BY_ID,
  DOCTRINE_TRAITS_BY_ID,
  type DoctrineEffect,
  type NationDoctrineState,
} from "../../data/doctrine";
import {
  RESEARCH_NODES_BY_ID,
  type NationResearchState,
  type ResearchEffect,
} from "../../data/research";
import {
  UPGRADES_BY_ID,
  type AppliedUpgrade,
  type NationUpgradesState,
  type UpgradeEffect,
} from "../../data/upgrades";
import type { Platoon } from "../../domain/types";
import type { NationKey } from "../../setup/NationDefinitions";

export type DoctrineDerivedStats = {
  orderFlexibility: number;
  movementBonus: number;
  forcedMarchRiskReduction: number;
  withdrawalBonus: number;
  offenseBonus: number;
  defenseBonus: number;
};

export type StrategicModifiers = {
  movementBonus: number;
  forcedMarchRiskReduction: number;
  withdrawalBonus: number;
  offenseBonus: number;
  defenseBonus: number;
  supplyHubBonusByTerritory: Record<string, number>;
  fortSlotsBonusByTerritory: Record<string, number>;
  reconBonusByTerritory: Record<string, number>;
};

export type PlatoonModifiers = {
  movementBonus: number;
  forcedMarchRiskReduction: number;
  withdrawalBonus: number;
  offenseBonus: number;
  defenseBonus: number;
};

type StrategicModifierState = {
  nationDoctrineState: Record<NationKey, NationDoctrineState>;
  nationResearchState: Record<NationKey, NationResearchState>;
  nationUpgradesState: Record<NationKey, NationUpgradesState>;
  platoonsById?: Record<string, Platoon>;
};

const emptyDoctrineStats = (): DoctrineDerivedStats => ({
  orderFlexibility: 0,
  movementBonus: 0,
  forcedMarchRiskReduction: 0,
  withdrawalBonus: 0,
  offenseBonus: 0,
  defenseBonus: 0,
});

const emptyStrategicModifiers = (): StrategicModifiers => ({
  movementBonus: 0,
  forcedMarchRiskReduction: 0,
  withdrawalBonus: 0,
  offenseBonus: 0,
  defenseBonus: 0,
  supplyHubBonusByTerritory: {},
  fortSlotsBonusByTerritory: {},
  reconBonusByTerritory: {},
});

const emptyPlatoonModifiers = (): PlatoonModifiers => ({
  movementBonus: 0,
  forcedMarchRiskReduction: 0,
  withdrawalBonus: 0,
  offenseBonus: 0,
  defenseBonus: 0,
});

type ModifierEffect = DoctrineEffect | UpgradeEffect;

const applyDoctrineEffect = (
  stats: DoctrineDerivedStats,
  effect: ModifierEffect,
) => {
  switch (effect.type) {
    case "ORDER_FLEXIBILITY":
      stats.orderFlexibility += effect.value;
      break;
    case "MOVEMENT_BONUS":
      stats.movementBonus += effect.value;
      break;
    case "FORCED_MARCH_RISK_REDUCTION":
      stats.forcedMarchRiskReduction += effect.value;
      break;
    case "WITHDRAWAL_SUCCESS_BONUS":
      stats.withdrawalBonus += effect.value;
      break;
    case "DEFENSE_BONUS":
      stats.defenseBonus += effect.value;
      break;
    case "OFFENSE_BONUS":
      stats.offenseBonus += effect.value;
      break;
    case "DECEPTION_UNLOCK":
      break;
    case "DIPLOMACY_PRESSURE_MOD":
      break;
    case "SUPPLY_TOLERANCE":
      break;
    case "RECON_INTEL_BONUS":
      break;
    case "FORTIFY_BUILD_SPEED":
      break;
    case "MOMENTUM_GAIN_BONUS":
      break;
    case "SUPPLY_HUB":
      break;
    case "FORT_SLOTS":
      break;
    case "AA_COVER":
      break;
    case "RECON_BONUS":
      break;
    case "INTEL_VISIBILITY_BONUS":
      break;
    case "ORDER_SLOT_BONUS":
      break;
    default: {
      const _exhaustiveCheck: never = effect;
      return _exhaustiveCheck;
    }
  }
};

const applyResearchEffect = (
  stats: DoctrineDerivedStats,
  effect: ResearchEffect,
) => {
  switch (effect.type) {
    case "WITHDRAWAL_BONUS":
      stats.withdrawalBonus += effect.value;
      break;
    case "SUPPLY_RANGE_BONUS":
    case "SUPPLY_DISRUPTION_REDUCTION":
    case "INTEL_DECAY_REDUCTION":
    case "RECON_ACTION_BONUS":
    case "FORT_SLOT_BONUS":
    case "DIPLOMACY_ACTION_UNLOCK":
    case "UPGRADE_UNLOCK":
      break;
    default: {
      const _exhaustiveCheck: never = effect;
      return _exhaustiveCheck;
    }
  }
};

const addTerritoryBonus = (
  record: Record<string, number>,
  territoryId: string,
  value: number,
) => {
  record[territoryId] = (record[territoryId] ?? 0) + value;
};

const applyUpgradeEffectToStrategic = (
  stats: StrategicModifiers,
  effect: UpgradeEffect,
  scope: AppliedUpgrade["scope"],
  territoryId?: string,
) => {
  if (scope === "TERRITORY" && territoryId) {
    switch (effect.type) {
      case "SUPPLY_HUB":
        addTerritoryBonus(stats.supplyHubBonusByTerritory, territoryId, effect.value);
        return;
      case "FORT_SLOTS":
        addTerritoryBonus(stats.fortSlotsBonusByTerritory, territoryId, effect.value);
        return;
      case "RECON_BONUS":
        addTerritoryBonus(stats.reconBonusByTerritory, territoryId, effect.value);
        return;
      default:
        break;
    }
  }

  switch (effect.type) {
    case "MOVEMENT_BONUS":
      stats.movementBonus += effect.value;
      break;
    case "FORCED_MARCH_RISK_REDUCTION":
      stats.forcedMarchRiskReduction += effect.value;
      break;
    case "WITHDRAWAL_SUCCESS_BONUS":
      stats.withdrawalBonus += effect.value;
      break;
    case "OFFENSE_BONUS":
      stats.offenseBonus += effect.value;
      break;
    case "DEFENSE_BONUS":
      stats.defenseBonus += effect.value;
      break;
    default:
      break;
  }
};

const applyUpgradeEffectToPlatoon = (
  stats: PlatoonModifiers,
  effect: UpgradeEffect,
) => {
  switch (effect.type) {
    case "MOVEMENT_BONUS":
      stats.movementBonus += effect.value;
      break;
    case "FORCED_MARCH_RISK_REDUCTION":
      stats.forcedMarchRiskReduction += effect.value;
      break;
    case "WITHDRAWAL_SUCCESS_BONUS":
      stats.withdrawalBonus += effect.value;
      break;
    case "OFFENSE_BONUS":
      stats.offenseBonus += effect.value;
      break;
    case "DEFENSE_BONUS":
      stats.defenseBonus += effect.value;
      break;
    default:
      break;
  }
};

export const getDoctrineDerivedStats = (
  state: StrategicModifierState,
  nationId: NationKey,
): DoctrineDerivedStats => {
  const doctrineState = state.nationDoctrineState[nationId];
  const researchState = state.nationResearchState[nationId];

  if (!doctrineState || !researchState) {
    return emptyDoctrineStats();
  }

  const stats = emptyDoctrineStats();
  const stance = DOCTRINE_STANCES_BY_ID[doctrineState.activeStanceId];
  if (stance) {
    stance.effects.forEach((effect) => applyDoctrineEffect(stats, effect));
  }

  let slotsUsed = 0;
  for (const traitId of doctrineState.equippedTraitIds) {
    const trait = DOCTRINE_TRAITS_BY_ID[traitId];
    if (!trait) continue;

    if (trait.requiredResearch?.length) {
      const hasResearch = trait.requiredResearch.every((id) =>
        researchState.completedResearch.includes(id),
      );
      if (!hasResearch) continue;
    }

    if (trait.prerequisitesTraits?.length) {
      const hasTraits = trait.prerequisitesTraits.every((id) =>
        doctrineState.equippedTraitIds.includes(id),
      );
      if (!hasTraits) continue;
    }

    if (slotsUsed + trait.slotCost > doctrineState.traitSlots) continue;
    slotsUsed += trait.slotCost;
    trait.effects.forEach((effect) => applyDoctrineEffect(stats, effect));
  }

  for (const nodeId of researchState.completedResearch) {
    const node = RESEARCH_NODES_BY_ID[nodeId];
    if (!node) continue;
    node.effects.forEach((effect) => applyResearchEffect(stats, effect));
  }

  return stats;
};

export const getNationStrategicModifiers = (
  state: StrategicModifierState,
  nationId: NationKey,
): StrategicModifiers => {
  const upgradesState = state.nationUpgradesState[nationId];

  if (!upgradesState) {
    return emptyStrategicModifiers();
  }

  const doctrineStats = getDoctrineDerivedStats(state, nationId);
  const stats: StrategicModifiers = {
    ...emptyStrategicModifiers(),
    movementBonus: doctrineStats.movementBonus,
    forcedMarchRiskReduction: doctrineStats.forcedMarchRiskReduction,
    withdrawalBonus: doctrineStats.withdrawalBonus,
    offenseBonus: doctrineStats.offenseBonus,
    defenseBonus: doctrineStats.defenseBonus,
  };

  for (const applied of upgradesState.applied) {
    const upgrade = UPGRADES_BY_ID[applied.defId];
    if (!upgrade) continue;
    const territoryId =
      applied.scope === "TERRITORY" ? applied.territoryId : undefined;
    upgrade.effects.forEach((effect) =>
      applyUpgradeEffectToStrategic(stats, effect, applied.scope, territoryId),
    );
  }

  return stats;
};

export const getPlatoonModifiers = (
  state: StrategicModifierState,
  platoonId: string,
): PlatoonModifiers => {
  const platoon = state.platoonsById?.[platoonId];
  if (!platoon) return emptyPlatoonModifiers();

  const nationModifiers = getNationStrategicModifiers(state, platoon.nation);
  const upgradesState = state.nationUpgradesState[platoon.nation];

  const stats: PlatoonModifiers = {
    movementBonus: nationModifiers.movementBonus,
    forcedMarchRiskReduction: nationModifiers.forcedMarchRiskReduction,
    withdrawalBonus: nationModifiers.withdrawalBonus,
    offenseBonus: nationModifiers.offenseBonus,
    defenseBonus: nationModifiers.defenseBonus,
  };

  if (!upgradesState) return stats;

  for (const applied of upgradesState.applied) {
    if (applied.scope !== "FORCE") continue;
    if (applied.platoonId !== platoonId) continue;
    const upgrade = UPGRADES_BY_ID[applied.defId];
    if (!upgrade) continue;
    upgrade.effects.forEach((effect) => applyUpgradeEffectToPlatoon(stats, effect));
  }

  return stats;
};
