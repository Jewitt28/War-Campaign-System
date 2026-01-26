export type UpgradeEffect =
  | { type: "ORDER_FLEXIBILITY"; value: number }
  | { type: "FORCED_MARCH_RISK_REDUCTION"; value: number }
  | { type: "WITHDRAWAL_SUCCESS_BONUS"; value: number }
  | { type: "DEFENSE_BONUS"; value: number }
  | { type: "OFFENSE_BONUS"; value: number }
  | { type: "SUPPLY_TOLERANCE"; value: number }
  | { type: "RECON_INTEL_BONUS"; value: number }
  | { type: "FORTIFY_BUILD_SPEED"; value: number }
  | { type: "MOMENTUM_GAIN_BONUS"; value: number };

export type UpgradeDefinition = {
  id: string;
  name: string;
  description: string;
  effects: UpgradeEffect[];
};

export type NationUpgradesState = {
  appliedUpgrades: string[];
};

export const UPGRADES: UpgradeDefinition[] = [
  {
    id: "UPG_SUPPLY_DEPOT",
    name: "Supply Depot Network",
    description: "Additional depots extend operational supply tolerance.",
    effects: [{ type: "SUPPLY_TOLERANCE", value: 1 }],
  },
  {
    id: "UPG_FORWARD_DEPOT",
    name: "Forward Depot Complexes",
    description: "Hardened forward depots reduce strain on frontline logistics.",
    effects: [{ type: "SUPPLY_TOLERANCE", value: 1 }],
  },
  {
    id: "UPG_STRATEGIC_REDEPLOY",
    name: "Strategic Redeploy",
    description: "Rapid redeployment orders gain extra flexibility.",
    effects: [{ type: "ORDER_FLEXIBILITY", value: 1 }],
  },
];

export const UPGRADES_BY_ID = Object.fromEntries(
  UPGRADES.map((upgrade) => [upgrade.id, upgrade]),
) as Record<string, UpgradeDefinition>;
