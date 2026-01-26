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
  type NationUpgradesState,
  type UpgradeEffect,
} from "../../data/upgrades";
import type { NationKey } from "../../setup/NationDefinitions";

export type DoctrineDerivedStats = {
  orderFlexibility: number;
  forcedMarchRiskReduction: number;
  withdrawalBonus: number;
  offenseBonus: number;
  defenseBonus: number;
  supplyTolerance: number;
  reconIntelBonus: number;
  fortifyBuildSpeed: number;
  momentumGainBonus: number;
  unlockedActions: string[];
};

export type StrategicModifiers = DoctrineDerivedStats & {
  supplyRangeBonus: number;
  supplyDisruptionReduction: number;
  intelDecayReduction: number;
  reconActionBonus: number;
  fortSlotBonus: number;
};

type StrategicModifierState = {
  nationDoctrineState: Record<NationKey, NationDoctrineState>;
  nationResearchState: Record<NationKey, NationResearchState>;
  nationUpgradesState: Record<NationKey, NationUpgradesState>;
};

const emptyDoctrineStats = (): DoctrineDerivedStats => ({
  orderFlexibility: 0,
  forcedMarchRiskReduction: 0,
  withdrawalBonus: 0,
  offenseBonus: 0,
  defenseBonus: 0,
  supplyTolerance: 0,
  reconIntelBonus: 0,
  fortifyBuildSpeed: 0,
  momentumGainBonus: 0,
  unlockedActions: [],
});

const emptyStrategicModifiers = (): StrategicModifiers => ({
  ...emptyDoctrineStats(),
  supplyRangeBonus: 0,
  supplyDisruptionReduction: 0,
  intelDecayReduction: 0,
  reconActionBonus: 0,
  fortSlotBonus: 0,
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
    case "SUPPLY_TOLERANCE":
      stats.supplyTolerance += effect.value;
      break;
    case "RECON_INTEL_BONUS":
      stats.reconIntelBonus += effect.value;
      break;
    case "FORTIFY_BUILD_SPEED":
      stats.fortifyBuildSpeed += effect.value;
      break;
    case "MOMENTUM_GAIN_BONUS":
      stats.momentumGainBonus += effect.value;
      break;
    case "DECEPTION_UNLOCK":
      stats.unlockedActions.push(effect.actionId);
      break;
    case "DIPLOMACY_PRESSURE_MOD":
      break;
    default: {
      const _exhaustiveCheck: never = effect;
      return _exhaustiveCheck;
    }
  }
};

const applyResearchEffect = (
  stats: StrategicModifiers,
  effect: ResearchEffect,
) => {
  switch (effect.type) {
    case "SUPPLY_RANGE_BONUS":
      stats.supplyRangeBonus += effect.value;
      break;
    case "SUPPLY_DISRUPTION_REDUCTION":
      stats.supplyDisruptionReduction += effect.value;
      break;
    case "INTEL_DECAY_REDUCTION":
      stats.intelDecayReduction += effect.value;
      break;
    case "RECON_ACTION_BONUS":
      stats.reconActionBonus += effect.value;
      break;
    case "FORT_SLOT_BONUS":
      stats.fortSlotBonus += effect.value;
      break;
    case "WITHDRAWAL_BONUS":
      stats.withdrawalBonus += effect.value;
      break;
    case "DIPLOMACY_ACTION_UNLOCK":
      stats.unlockedActions.push(effect.actionId);
      break;
    case "UPGRADE_UNLOCK":
      break;
    default: {
      const _exhaustiveCheck: never = effect;
      return _exhaustiveCheck;
    }
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

  return stats;
};

export const getStrategicModifiers = (
  state: StrategicModifierState,
  nationId: NationKey,
): StrategicModifiers => {
  const researchState = state.nationResearchState[nationId];
  const upgradesState = state.nationUpgradesState[nationId];

  if (!researchState || !upgradesState) {
    return emptyStrategicModifiers();
  }

  const stats: StrategicModifiers = {
    ...emptyStrategicModifiers(),
    ...getDoctrineDerivedStats(state, nationId),
  };

  for (const nodeId of researchState.completedResearch) {
    const node = RESEARCH_NODES_BY_ID[nodeId];
    if (!node) continue;
    node.effects.forEach((effect) => applyResearchEffect(stats, effect));
  }

  for (const upgradeId of upgradesState.appliedUpgrades) {
    const upgrade = UPGRADES_BY_ID[upgradeId];
    if (!upgrade) continue;
    upgrade.effects.forEach((effect) => applyDoctrineEffect(stats, effect));
  }

  return stats;
};
