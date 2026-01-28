export type UpgradeScope = "NATION" | "TERRITORY" | "FORCE";

export type UpgradeEffect =
  | { type: "SUPPLY_HUB"; value: number }
  | { type: "FORT_SLOTS"; value: number }
  | { type: "AA_COVER"; value: number }
  | { type: "RECON_BONUS"; value: number }
  | { type: "MOVEMENT_BONUS"; value: number }
  | { type: "FORCED_MARCH_RISK_REDUCTION"; value: number }
  | { type: "WITHDRAWAL_SUCCESS_BONUS"; value: number }
  | { type: "OFFENSE_BONUS"; value: number }
  | { type: "DEFENSE_BONUS"; value: number }
  | { type: "INTEL_VISIBILITY_BONUS"; value: number }
  | { type: "ORDER_SLOT_BONUS"; value: number };

export type UpgradeDef = {
  id: string;
  name: string;
  description: string;
  scope: UpgradeScope;
  requiredResearch?: string[];
  requiredDoctrineStances?: string[];
  requiredDoctrineTraits?: string[];
  cost: {
    points: number;
    upkeepPerTurn?: number;
  };
  maxPerNation?: number;
  maxPerTerritory?: number;
  maxPerPlatoon?: number;
  unique?: boolean;
  effects: UpgradeEffect[];
  tags?: (
    | "SUPPLY"
    | "INTEL"
    | "FORT"
    | "OPS"
    | "AIR"
    | "NAVAL"
    | "DIPLOMACY"
  )[];
};
export type AppliedUpgrade =
  | { id: string; defId: string; scope: "NATION" }
  | { id: string; defId: string; scope: "TERRITORY"; territoryId: string }
  | { id: string; defId: string; scope: "FORCE"; platoonId: string };

export type NationUpgradesState = {
  applied: AppliedUpgrade[];
};

export const UPGRADE_DEFS: UpgradeDef[] = [
  {
    id: "UPG_SUPPLY_DEPOT",
    name: "Supply Depot",
    description: "Establishes a supply depot to extend operational reach.",
    scope: "TERRITORY",
    requiredResearch: ["LOG_BASIC_SUPPLY"],
    cost: { points: 2, upkeepPerTurn: 1 },
    maxPerTerritory: 1,
    effects: [{ type: "SUPPLY_HUB", value: 1 }],
    tags: ["SUPPLY"],
  },
  {
    id: "UPG_FORWARD_DEPOT",
    name: "Forward Supply Depot",
    description: "A hardened forward depot supporting frontline formations.",
    scope: "TERRITORY",
    requiredResearch: ["LOG_FORWARD_DEPOTS"],
    cost: { points: 4, upkeepPerTurn: 2 },
    maxPerTerritory: 1,
    effects: [
      { type: "SUPPLY_HUB", value: 2 },
      { type: "DEFENSE_BONUS", value: 5 },
    ],
    tags: ["SUPPLY", "FORT"],
  },
  {
    id: "UPG_STRATEGIC_REDEPLOY",
    name: "Strategic Redeploy Capability",
    description: "Enables rapid redeployment with reduced forced march risk.",
    scope: "NATION",
    requiredResearch: ["LOG_STRATEGIC_LIFT"],
    cost: { points: 8, upkeepPerTurn: 2 },
    unique: true,
    effects: [
      { type: "MOVEMENT_BONUS", value: 1 },
      { type: "FORCED_MARCH_RISK_REDUCTION", value: 15 },
    ],
    tags: ["OPS", "SUPPLY"],
  },
  {
    id: "UPG_FORT_WORKS",
    name: "Fortification Works",
    description: "Adds fortification capacity to a territory.",
    scope: "TERRITORY",
    cost: { points: 3, upkeepPerTurn: 1 },
    maxPerTerritory: 1,
    effects: [{ type: "FORT_SLOTS", value: 1 }],
    tags: ["FORT"],
  },
  {
    id: "UPG_VETERAN_DRILL",
    name: "Veteran Drill",
    description: "Improves cohesion and withdrawal outcomes.",
    scope: "FORCE",
    cost: { points: 2 },
    maxPerPlatoon: 1,
    effects: [{ type: "WITHDRAWAL_SUCCESS_BONUS", value: 10 }],
    tags: ["OPS"],
  },
];

export const UPGRADES_BY_ID = Object.fromEntries(
  UPGRADE_DEFS.map((upgrade) => [upgrade.id, upgrade]),
) as Record<string, UpgradeDef>;
