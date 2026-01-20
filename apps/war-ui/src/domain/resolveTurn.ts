import type { FactionKey, OwnerKey } from "../store/useCampaignStore";
import type { Platoon, PlatoonOrder, Contest, TerritoryLock, PlatoonCondition } from "./types";

const uid = () => Math.random().toString(16).slice(2) + Date.now().toString(16);

function worsenCondition(c: PlatoonCondition): PlatoonCondition {
  if (c === "FRESH") return "WORN";
  if (c === "WORN") return "DEPLETED";
  if (c === "DEPLETED") return "SHATTERED";
  return "SHATTERED";
}

export function resolveTurn(args: {
  turn: number;
  platoonsById: Record<string, Platoon>;
  orders: PlatoonOrder[];
  ownerByTerritory: Record<string, OwnerKey>;
  // adjacency function comes from NormalizedData in UI layer
  isAdjacent: (a: string, b: string) => boolean;

  locksByTerritory: Record<string, TerritoryLock | undefined>;
  contestsByTerritory: Record<string, Contest | undefined>;
}) {
  const nextPlatoons: Record<string, Platoon> = { ...args.platoonsById };
  const nextOwners: Record<string, OwnerKey> = { ...args.ownerByTerritory };
  const nextLocks: Record<string, TerritoryLock | undefined> = { ...args.locksByTerritory };
  const nextContests: Record<string, Contest | undefined> = { ...args.contestsByTerritory };

  const log: string[] = [];

  // Only resolve MOVE orders that are submitted
  const moves = args.orders.filter((o) => o.type === "MOVE" && o.submittedAt);

  // Simple deterministic order: sort by faction then platoonId (later you can do initiative rules)
  moves.sort((a, b) => (a.faction + a.platoonId).localeCompare(b.faction + b.platoonId));

  for (const o of moves) {
    const p = nextPlatoons[o.platoonId];
    if (!p) continue;

    // Locked territories: you cannot leave or enter a locked combat territory
    if (nextLocks[p.territoryId]) {
      log.push(`MOVE blocked: ${p.name} is in locked territory ${p.territoryId}`);
      continue;
    }

    const path = o.path ?? [];
    if (path.length === 0) continue;

    // validate adjacency chain
    let from = p.territoryId;
    let ok = true;
    for (const step of path) {
      if (nextLocks[step]) { ok = false; break; }
      if (!args.isAdjacent(from, step)) { ok = false; break; }
      from = step;
    }
    if (!ok) {
      log.push(`Invalid MOVE path for ${p.name}`);
      continue;
    }

    // movement points: 1 step normally, 2 steps if forced march
    const maxSteps = p.mpBase;
    const allowedSteps = o.forcedMarch ? maxSteps + 1 : maxSteps;
    if (path.length > allowedSteps) {
      log.push(`MOVE too far for ${p.name}`);
      continue;
    }

    const to = path[path.length - 1];

    // Apply forced march wear
    if (o.forcedMarch && path.length >= 2) {
      const worn = worsenCondition(p.condition);
      const strength = Math.max(0, p.strengthPct - 10);
      nextPlatoons[p.id] = { ...p, condition: worn, strengthPct: strength };
      log.push(`Forced march: ${p.name} now ${worn} (${strength}%)`);
    }

    // Move the platoon
    nextPlatoons[p.id] = { ...nextPlatoons[p.id], territoryId: to };
    log.push(`MOVE: ${p.name} -> ${to}`);

    // Determine if combat is created
    const owner = nextOwners[to] ?? "neutral";
    const platoonFaction = p.faction as FactionKey;

    const enteringEnemy =
      owner !== "neutral" &&
      owner !== "contested" &&
      owner !== platoonFaction;

    if (enteringEnemy) {
      // Create contest + lock territory
      const contestId = uid();
      const defenderFaction = owner as FactionKey;

      // find defender platoons in that territory
      const defenderPlatoonIds = Object.values(nextPlatoons)
        .filter((pp) => pp.territoryId === to && pp.faction === defenderFaction)
        .map((pp) => pp.id);

      const attackerPlatoonIds = Object.values(nextPlatoons)
        .filter((pp) => pp.territoryId === to && pp.faction === platoonFaction)
        .map((pp) => pp.id);

      nextContests[to] = {
        id: contestId,
        territoryId: to,
        attackerFaction: platoonFaction,
        defenderFaction,
        attackerPlatoonIds,
        defenderPlatoonIds,
        createdTurn: args.turn,
        status: "BATTLE_PENDING",
      };

      nextLocks[to] = { territoryId: to, reason: "COMBAT", contestId };
      nextOwners[to] = "contested";

      log.push(`COMBAT: ${platoonFaction} vs ${defenderFaction} in ${to} (locked)`);
    }
  }

  return { nextPlatoons, nextOwners, nextLocks, nextContests, log };
}
