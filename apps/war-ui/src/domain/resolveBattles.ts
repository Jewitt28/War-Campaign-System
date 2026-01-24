// src/domain/resolveBattles.ts
import type {
  BattleOutcome,
  Platoon,
  PlatoonCondition,
  Contest,
  TerritoryLock,
} from "./types";
import type { FactionKey, OwnerKey } from "../store/useCampaignStore";
function worsen(c: PlatoonCondition): PlatoonCondition {
  if (c === "FRESH") return "WORN";
  if (c === "WORN") return "DEPLETED";
  if (c === "DEPLETED") return "SHATTERED";
  return "SHATTERED";
}

function worsenN(c: PlatoonCondition, n: number): PlatoonCondition {
  let out = c;
  for (let i = 0; i < n; i++) out = worsen(out);
  return out;
}

function applyLoss(p: Platoon, lossPct: number, conditionHit: number): Platoon {
  const nextStrength = Math.max(0, Math.min(100, p.strengthPct - lossPct));
  const nextCond = worsenN(p.condition, conditionHit);
  return { ...p, strengthPct: nextStrength, condition: nextCond };
}

export function resolveBattles(args: {
  platoonsById: Record<string, Platoon>;
  ownerByTerritory: Record<string, OwnerKey>;
  locksByTerritory: Record<string, TerritoryLock | undefined>;
  contestsByTerritory: Record<string, Contest | undefined>;
  adjacencyByTerritory: Record<string, string[]>;
  outcomes: BattleOutcome[];
}) {
  const nextPlatoons = { ...args.platoonsById };
  const nextOwners = { ...args.ownerByTerritory };
  const nextLocks = { ...args.locksByTerritory };
  const nextContests = { ...args.contestsByTerritory };
  const log: string[] = [];

  const outcomeById = new Map(args.outcomes.map((o) => [o.contestId, o]));

  for (const [territoryId, c] of Object.entries(nextContests)) {
    if (!c) continue;
    if (c.status !== "BATTLE_PENDING") continue;

    const out = outcomeById.get(c.id);
    if (!out) continue; // unresolved battle stays pending

    const attackerLoss = out.attackerLossPct ?? 0;
    const defenderLoss = out.defenderLossPct ?? 0;
    const attackerHit = out.attackerConditionHit ?? 0;
    const defenderHit = out.defenderConditionHit ?? 0;

    // apply losses
    for (const pid of c.attackerPlatoonIds) {
      const p = nextPlatoons[pid];
      if (!p) continue;
      nextPlatoons[pid] = applyLoss(p, attackerLoss, attackerHit);
    }
    for (const pid of c.defenderPlatoonIds) {
      const p = nextPlatoons[pid];
      if (!p) continue;
      nextPlatoons[pid] = applyLoss(p, defenderLoss, defenderHit);
    }
    const loserFaction: FactionKey = (
      out.winner === c.attackerFaction ? c.defenderFaction : c.attackerFaction
    ) as FactionKey;
    const fallbackOptions = (
      args.adjacencyByTerritory[territoryId] ?? []
    ).filter((tid) => !nextLocks[tid]);
    const preferredFallbacks = fallbackOptions.filter((tid) => {
      const owner = nextOwners[tid];
      return owner === loserFaction || owner === "neutral" || owner == null;
    });
    const fallbackTarget = preferredFallbacks[0] ?? fallbackOptions[0];

    const shouldRetreat = (p: Platoon) => (p.strengthPct ?? 0) > 0;

    if (fallbackTarget) {
      const retreatingIds =
        out.winner === c.attackerFaction
          ? c.defenderPlatoonIds
          : c.attackerPlatoonIds;
      for (const pid of retreatingIds) {
        const p = nextPlatoons[pid];
        if (!p) continue;
        if (!shouldRetreat(p)) continue;
        nextPlatoons[pid] = { ...p, territoryId: fallbackTarget };
      }
      if (retreatingIds.length) {
        log.push(
          `RETREAT: ${loserFaction} platoons fallback from ${territoryId} to ${fallbackTarget}`,
        );
      }
    } else {
      log.push(
        `RETREAT BLOCKED: No adjacent fallback from ${territoryId} for ${loserFaction}`,
      );
    }
    // winner takes territory
    nextOwners[territoryId] = out.winner as OwnerKey;

    // unlock territory (safe)
    if (nextLocks[territoryId]) {
      delete nextLocks[territoryId];
    }

    // mark resolved
    nextContests[territoryId] = { ...c, status: "RESOLVED" };

    log.push(
      `BATTLE RESOLVED: ${territoryId} winner=${out.winner} (A -${attackerLoss}% hit${attackerHit}, D -${defenderLoss}% hit${defenderHit})`,
    );
  }

  return { nextPlatoons, nextOwners, nextLocks, nextContests, log };
}
