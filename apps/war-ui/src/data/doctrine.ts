export type DoctrineEffect =
  | { type: "ORDER_FLEXIBILITY"; value: number }
  | { type: "FORCED_MARCH_RISK_REDUCTION"; value: number }
  | { type: "WITHDRAWAL_SUCCESS_BONUS"; value: number }
  | { type: "DEFENSE_BONUS"; value: number }
  | { type: "OFFENSE_BONUS"; value: number }
  | { type: "SUPPLY_TOLERANCE"; value: number }
  | { type: "RECON_INTEL_BONUS"; value: number }
  | { type: "FORTIFY_BUILD_SPEED"; value: number }
  | { type: "MOMENTUM_GAIN_BONUS"; value: number }
  | { type: "DECEPTION_UNLOCK"; actionId: string }
  | { type: "DIPLOMACY_PRESSURE_MOD"; value: number };

export type DoctrinePenalty =
  | { type: "MOMENTUM_LOSS"; value: number }
  | { type: "ORDER_LOCKOUT_TURNS"; value: number }
  | { type: "SUPPLY_DISRUPTION"; value: number };

export type DoctrineStance = {
  id: string;
  name: string;
  description: string;
  tags: (
    | "OFFENSE"
    | "DEFENSE"
    | "MOBILITY"
    | "ATTRITION"
    | "DECEPTION"
    | "LOGISTICS"
  )[];
  effects: DoctrineEffect[];
  requiredResearch?: string[];
  switchCooldownTurns: number;
  switchPenalty?: DoctrinePenalty;
};

export type DoctrineTrait = {
  id: string;
  name: string;
  description: string;
  tier: 1 | 2 | 3;
  prerequisitesTraits?: string[];
  requiredResearch?: string[];
  effects: DoctrineEffect[];
  slotCost: number;
};

export type NationDoctrineState = {
  activeStanceId: string;
  stanceLockedUntilTurn?: number;
  equippedTraitIds: string[];
  traitSlots: number;
};

export const DOCTRINE_STANCES: DoctrineStance[] = [
  {
    id: "DOC_MOBILE_WARFARE",
    name: "Mobile Warfare",
    description: "Prioritises manoeuvre, rapid exploitation, and operational tempo.",
    tags: ["OFFENSE", "MOBILITY"],
    effects: [
      { type: "OFFENSE_BONUS", value: 10 },
      { type: "FORCED_MARCH_RISK_REDUCTION", value: 15 },
      { type: "MOMENTUM_GAIN_BONUS", value: 10 },
    ],
    switchCooldownTurns: 2,
    switchPenalty: { type: "SUPPLY_DISRUPTION", value: 10 },
  },
  {
    id: "DOC_FIREPOWER_ATTRITION",
    name: "Firepower & Attrition",
    description: "Emphasises overwhelming firepower and grinding advances.",
    tags: ["OFFENSE", "ATTRITION"],
    effects: [
      { type: "OFFENSE_BONUS", value: 8 },
      { type: "DEFENSE_BONUS", value: 5 },
      { type: "SUPPLY_TOLERANCE", value: 1 },
    ],
    switchCooldownTurns: 2,
    switchPenalty: { type: "MOMENTUM_LOSS", value: 1 },
  },
  {
    id: "DOC_DEFENSE_IN_DEPTH",
    name: "Defense in Depth",
    description: "Layered defenses, elastic withdrawals, and fortified positions.",
    tags: ["DEFENSE", "LOGISTICS"],
    effects: [
      { type: "DEFENSE_BONUS", value: 12 },
      { type: "WITHDRAWAL_SUCCESS_BONUS", value: 10 },
      { type: "FORTIFY_BUILD_SPEED", value: 20 },
    ],
    switchCooldownTurns: 2,
    switchPenalty: { type: "ORDER_LOCKOUT_TURNS", value: 1 },
  },
  {
    id: "DOC_DECEPTION_INITIATIVE",
    name: "Deception & Initiative",
    description: "Misleading manoeuvres, feints, and intel-driven strikes.",
    tags: ["DECEPTION", "MOBILITY"],
    effects: [
      { type: "RECON_INTEL_BONUS", value: 10 },
      { type: "ORDER_FLEXIBILITY", value: 1 },
      { type: "DECEPTION_UNLOCK", actionId: "ACT_FEINT" },
    ],
    switchCooldownTurns: 2,
    switchPenalty: { type: "SUPPLY_DISRUPTION", value: 5 },
  },
];

export const DOCTRINE_TRAITS: DoctrineTrait[] = [
  {
    id: "TRT_MISSION_COMMAND",
    name: "Mission Command",
    description: "Delegated authority enables faster adjustments in the field.",
    tier: 1,
    slotCost: 1,
    effects: [{ type: "ORDER_FLEXIBILITY", value: 1 }],
  },
  {
    id: "TRT_SUPPLY_DISCIPLINE",
    name: "Supply Discipline",
    description: "Standard operating procedures reduce supply disruption.",
    tier: 1,
    slotCost: 1,
    effects: [{ type: "SUPPLY_TOLERANCE", value: 1 }],
  },
  {
    id: "TRT_PREPARED_POSITIONS",
    name: "Prepared Positions",
    description: "Improves the speed and effectiveness of fortification work.",
    tier: 1,
    slotCost: 1,
    effects: [{ type: "FORTIFY_BUILD_SPEED", value: 10 }],
  },
  {
    id: "TRT_ADVANCED_ROUTING",
    name: "Advanced Routing",
    description: "Fallback routing and improved staging reduces disruption.",
    tier: 2,
    slotCost: 1,
    requiredResearch: ["LOG_REDUNDANT_ROUTING"],
    effects: [{ type: "FORCED_MARCH_RISK_REDUCTION", value: 10 }],
  },
  {
    id: "TRT_SIGNALS_COORDINATION",
    name: "Signals Coordination",
    description: "Intel sharing improves recon and reduces fog decay.",
    tier: 2,
    slotCost: 1,
    requiredResearch: ["INT_SIGNAL_INTERCEPTS"],
    effects: [{ type: "RECON_INTEL_BONUS", value: 10 }],
  },
  {
    id: "TRT_ELASTIC_DEFENSE",
    name: "Elastic Defense",
    description: "Improves controlled withdrawals and defensive cohesion.",
    tier: 2,
    slotCost: 1,
    requiredResearch: ["FORT_DEPTH_WORKS"],
    effects: [{ type: "WITHDRAWAL_SUCCESS_BONUS", value: 10 }],
  },
  {
    id: "TRT_OPERATIONAL_TEMPO",
    name: "Operational Tempo",
    description: "Improves momentum gains and exploitation windows.",
    tier: 3,
    slotCost: 2,
    requiredResearch: ["LOG_STRATEGIC_LIFT"],
    effects: [{ type: "MOMENTUM_GAIN_BONUS", value: 15 }],
  },
];

export const DOCTRINE_STANCES_BY_ID = Object.fromEntries(
  DOCTRINE_STANCES.map((stance) => [stance.id, stance]),
) as Record<string, DoctrineStance>;

export const DOCTRINE_TRAITS_BY_ID = Object.fromEntries(
  DOCTRINE_TRAITS.map((trait) => [trait.id, trait]),
) as Record<string, DoctrineTrait>;
