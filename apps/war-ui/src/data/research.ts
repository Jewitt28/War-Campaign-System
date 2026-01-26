export type ResearchTree =
  | "LOGISTICS"
  | "INTELLIGENCE"
  | "OPERATIONS"
  | "FORTIFICATIONS"
  | "DIPLOMACY";

export type ResearchEffect =
  | { type: "SUPPLY_RANGE_BONUS"; value: number }
  | { type: "SUPPLY_DISRUPTION_REDUCTION"; value: number }
  | { type: "INTEL_DECAY_REDUCTION"; value: number }
  | { type: "RECON_ACTION_BONUS"; value: number }
  | { type: "FORT_SLOT_BONUS"; value: number }
  | { type: "WITHDRAWAL_BONUS"; value: number }
  | { type: "DIPLOMACY_ACTION_UNLOCK"; actionId: string }
  | { type: "UPGRADE_UNLOCK"; upgradeId: string };

export type ResearchNode = {
  id: string;

  tree: ResearchTree;
  tier: 1 | 2 | 3;

  name: string;
  description: string;

  prerequisites: string[]; // node IDs

  costBand: "LOW" | "MEDIUM" | "HIGH";
  timeTurns: number;

  visibility: "HIDDEN" | "RUMOURED" | "OBSERVED" | "PUBLIC";

  effects: ResearchEffect[];

  locksIn: boolean; // true for Tier II & III

  unlocksUpgrades?: string[];
  unlocksDoctrineTraits?: string[];
};

export type NationResearchState = {
  activeResearchId?: string;
  startedTurn?: number;
  progressTurns: number;
  completedResearch: string[];
};

export type ResearchRecommendation = {
  nodeId: string;
  score: number;
  reasons: string[];
};

export const RESEARCH_TREES: ResearchTree[] = [
  "LOGISTICS",
  "INTELLIGENCE",
  "OPERATIONS",
  "FORTIFICATIONS",
  "DIPLOMACY",
];

export const RESEARCH_NODES: ResearchNode[] = [
  {
    id: "LOG_BASIC_SUPPLY",
    tree: "LOGISTICS",
    tier: 1,
    name: "Basic Supply Coordination",
    description: "Establishes standardised supply routing and accountability.",
    prerequisites: [],
    costBand: "LOW",
    timeTurns: 1,
    visibility: "HIDDEN",
    locksIn: false,
    effects: [{ type: "SUPPLY_RANGE_BONUS", value: 1 }],
    unlocksUpgrades: ["UPG_SUPPLY_DEPOT"],
  },
  {
    id: "LOG_MOTOR_TRANSPORT",
    tree: "LOGISTICS",
    tier: 1,
    name: "Motor Transport Pools",
    description: "Centralised allocation of transport assets.",
    prerequisites: [],
    costBand: "LOW",
    timeTurns: 1,
    visibility: "RUMOURED",
    locksIn: false,
    effects: [{ type: "SUPPLY_DISRUPTION_REDUCTION", value: 10 }],
  },
  {
    id: "LOG_FORWARD_DEPOTS",
    tree: "LOGISTICS",
    tier: 2,
    name: "Forward Supply Depots",
    description: "Establishes hardened forward depots closer to the front.",
    prerequisites: ["LOG_BASIC_SUPPLY"],
    costBand: "MEDIUM",
    timeTurns: 2,
    visibility: "OBSERVED",
    locksIn: true,
    effects: [{ type: "SUPPLY_RANGE_BONUS", value: 1 }],
    unlocksUpgrades: ["UPG_FORWARD_DEPOT"],
  },
  {
    id: "LOG_REDUNDANT_ROUTING",
    tree: "LOGISTICS",
    tier: 2,
    name: "Redundant Supply Routing",
    description: "Multiple fallback routes reduce catastrophic disruption.",
    prerequisites: ["LOG_MOTOR_TRANSPORT"],
    costBand: "MEDIUM",
    timeTurns: 2,
    visibility: "OBSERVED",
    locksIn: true,
    effects: [{ type: "SUPPLY_DISRUPTION_REDUCTION", value: 20 }],
  },
  {
    id: "LOG_STRATEGIC_LIFT",
    tree: "LOGISTICS",
    tier: 3,
    name: "Strategic Lift Capability",
    description: "Large-scale transport enables rapid redeployment.",
    prerequisites: ["LOG_FORWARD_DEPOTS", "LOG_REDUNDANT_ROUTING"],
    costBand: "HIGH",
    timeTurns: 3,
    visibility: "PUBLIC",
    locksIn: true,
    effects: [{ type: "UPGRADE_UNLOCK", upgradeId: "UPG_STRATEGIC_REDEPLOY" }],
  },
  {
    id: "INT_FIELD_RECON",
    tree: "INTELLIGENCE",
    tier: 1,
    name: "Field Recon Detachments",
    description: "Dedicated recon elements improve local intelligence.",
    prerequisites: [],
    costBand: "LOW",
    timeTurns: 1,
    visibility: "HIDDEN",
    locksIn: false,
    effects: [{ type: "RECON_ACTION_BONUS", value: 1 }],
  },
  {
    id: "INT_SIGNAL_INTERCEPTS",
    tree: "INTELLIGENCE",
    tier: 2,
    name: "Signals Intercepts",
    description: "Intercepted communications improve operational awareness.",
    prerequisites: ["INT_FIELD_RECON"],
    costBand: "MEDIUM",
    timeTurns: 2,
    visibility: "OBSERVED",
    locksIn: true,
    effects: [{ type: "INTEL_DECAY_REDUCTION", value: 25 }],
  },
  {
    id: "FORT_DEPTH_WORKS",
    tree: "FORTIFICATIONS",
    tier: 2,
    name: "Defense in Depth Works",
    description: "Layered fortification work improves withdrawal discipline.",
    prerequisites: [],
    costBand: "MEDIUM",
    timeTurns: 2,
    visibility: "OBSERVED",
    locksIn: true,
    effects: [{ type: "WITHDRAWAL_BONUS", value: 5 }],
  },
];

export const RESEARCH_NODES_BY_ID = Object.fromEntries(
  RESEARCH_NODES.map((node) => [node.id, node]),
) as Record<string, ResearchNode>;
