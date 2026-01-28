import type { NationDoctrineState } from "../../data/doctrine";
import type { NationResearchState } from "../../data/research";
import type {
  AppliedUpgrade,
  NationUpgradesState,
  UpgradeDef,
} from "../../data/upgrades";

type UpgradeEligibilityArgs = {
  upgrade: UpgradeDef;
  doctrineState: NationDoctrineState;
  researchState: NationResearchState;
  upgradesState: NationUpgradesState;
  resourcePoints: number;
  territoryId?: string | null;
  platoonId?: string | null;
};

export type UpgradeEligibility = {
  eligible: boolean;
  reasons: string[];
  appliedCount: number;
  appliedForTarget: number;
};

// const countApplied = (
//   applied: AppliedUpgrade[],
//   defId: string,
//   scope: AppliedUpgrade["scope"],
//   targetId?: string | null,
// ) => {
//   return applied.filter((entry) => {
//     if (entry.defId !== defId) return false;
//     if (entry.scope !== scope) return false;
//     if (scope === "TERRITORY") {
//       return entry.territoryId === targetId;
//     }
//     if (scope === "FORCE") {
//       return entry.platoonId === targetId;
//     }
//     return true;
//   }).length;
// };
const countApplied = (
  applied: AppliedUpgrade[],
  defId: string,
  scope: AppliedUpgrade["scope"],
  targetId?: string | null,
) => {
  return applied.filter((entry) => {
    if (entry.defId !== defId) return false;
    if (entry.scope !== scope) return false;

    if (scope === "TERRITORY") {
      return "territoryId" in entry && entry.territoryId === targetId;
    }
    if (scope === "FORCE") {
      return "platoonId" in entry && entry.platoonId === targetId;
    }
    return true;
  }).length;
};

export const getUpgradeEligibility = ({
  upgrade,
  doctrineState,
  researchState,
  upgradesState,
  resourcePoints,
  territoryId,
  platoonId,
}: UpgradeEligibilityArgs): UpgradeEligibility => {
  const reasons: string[] = [];
  const applied = upgradesState.applied ?? [];
  const appliedCount = applied.filter(
    (entry) => entry.defId === upgrade.id,
  ).length;
  const targetId = upgrade.scope === "TERRITORY" ? territoryId : platoonId;
  const appliedForTarget = countApplied(
    applied,
    upgrade.id,
    upgrade.scope,
    targetId ?? null,
  );

  if (upgrade.requiredResearch?.length) {
    const missing = upgrade.requiredResearch.filter(
      (id) => !researchState.completedResearch.includes(id),
    );
    if (missing.length) {
      reasons.push(`Requires research: ${missing.join(", ")}`);
    }
  }

  if (upgrade.requiredDoctrineStances?.length) {
    if (
      !upgrade.requiredDoctrineStances.includes(doctrineState.activeStanceId)
    ) {
      reasons.push("Requires active doctrine stance.");
    }
  }

  if (upgrade.requiredDoctrineTraits?.length) {
    const missing = upgrade.requiredDoctrineTraits.filter(
      (id) => !doctrineState.equippedTraitIds.includes(id),
    );
    if (missing.length) {
      reasons.push(`Requires doctrine traits: ${missing.join(", ")}`);
    }
  }

  if (upgrade.scope === "TERRITORY" && !territoryId) {
    reasons.push("Select a target territory.");
  }

  if (upgrade.scope === "FORCE" && !platoonId) {
    reasons.push("Select a target platoon.");
  }

  if (upgrade.unique && appliedCount > 0) {
    reasons.push("Unique upgrade already applied.");
  }

  if (upgrade.scope === "NATION" && upgrade.maxPerNation != null) {
    if (appliedCount >= upgrade.maxPerNation) {
      reasons.push("Nation limit reached.");
    }
  }

  if (upgrade.scope === "TERRITORY" && upgrade.maxPerTerritory != null) {
    if (territoryId && appliedForTarget >= upgrade.maxPerTerritory) {
      reasons.push("Territory limit reached.");
    }
  }

  if (upgrade.scope === "FORCE" && upgrade.maxPerPlatoon != null) {
    if (platoonId && appliedForTarget >= upgrade.maxPerPlatoon) {
      reasons.push("Platoon limit reached.");
    }
  }

  if (resourcePoints < upgrade.cost.points) {
    reasons.push("Insufficient resources.");
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    appliedCount,
    appliedForTarget,
  };
};
