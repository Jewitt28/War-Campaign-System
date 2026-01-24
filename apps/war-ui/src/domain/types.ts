import type { NationKey } from "../setup/NationDefinitions";
import type { FactionKey } from "../store/useCampaignStore";

export type Phase = "SETUP" | "ORDERS" | "RESOLUTION" | "BATTLES";

export type PlatoonCondition = "FRESH" | "WORN" | "DEPLETED" | "SHATTERED";

export type Platoon = {
  id: string;
  faction: FactionKey;
  nation: NationKey;
  name: string;
  territoryId: string;

  condition: PlatoonCondition;
  strengthPct: number; // 0..100
  mpBase: number; // default 1
  traits?: PlatoonTrait[]; // NEW
  entrenched?: boolean; // NEW (upgrade #3 uses this)
};

export type PlatoonTrait = "RECON" | "ENGINEERS" | "MOTORIZED";

export type OrderType = "HOLD" | "MOVE" | "RECON";

export type PlatoonOrder = {
  id: string;
  turn: number;
  faction: FactionKey;
  platoonId: string;

  type: OrderType;

  // MOVE only:
  from?: string;
  path?: string[]; // territory ids (length 1 = normal move, length 2 = forced march)
  forcedMarch?: boolean; // if path length 2
  // RECON only:
  reconTargets?: string[];
  submittedAt?: number;
};

export type TerritoryLock = {
  territoryId: string;
  reason: "COMBAT";
  contestId: string;
};

export type ContestStatus = "OPEN" | "BATTLE_PENDING" | "RESOLVED";

export type Contest = {
  id: string;
  territoryId: string;

  attackerFaction: NationKey;
  defenderFaction: NationKey;

  attackerPlatoonIds: string[];
  defenderPlatoonIds: string[];

  createdTurn: number;
  status: ContestStatus;
};
export type BattleOutcome = {
  contestId: string;
  winner: NationKey; // attacker or defender nation
  attackerLossPct?: number; // e.g. 0..100
  defenderLossPct?: number; // e.g. 0..100
  attackerConditionHit?: 0 | 1 | 2; // steps worse
  defenderConditionHit?: 0 | 1 | 2;
};
