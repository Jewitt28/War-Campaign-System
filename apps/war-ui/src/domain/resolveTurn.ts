import type { FactionKey, OwnerKey } from "../store/useCampaignStore";
import type { Platoon, PlatoonOrder, Contest, TerritoryLock, PlatoonCondition } from "./types";

const uid = () => Math.random().toString(16).slice(2) + Date.now().toString(16);

function worsenCondition(c: PlatoonCondition): PlatoonCondition {
  if (c === "FRESH") return "WORN";
  if (c === "WORN") return "DEPLETED";
  if (c === "DEPLETED") return "SHATTERED";
  return "SHATTERED";
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function mergeIds(a: string[] = [], b: string[] = []) {
  return uniq([...a, ...b]);
}

export function resolveTurn(args: {
  turn: number;
  platoonsById: Record<string, Platoon>;
  orders: PlatoonOrder[];
  ownerByTerritory: Record<string, OwnerKey>;
  isAdjacent: (a: string, b: string) => boolean;

  locksByTerritory: Record<string, TerritoryLock | undefined>;
  contestsByTerritory: Record<string, Contest | undefined>;
}) {
  const nextPlatoons: Record<string, Platoon> = { ...args.platoonsById };
  const nextOwners: Record<string, OwnerKey> = { ...args.ownerByTerritory };
  const nextLocks: Record<string, TerritoryLock | undefined> = { ...args.locksByTerritory };
  const nextContests: Record<string, Contest | undefined> = { ...args.contestsByTerritory };

  const log: string[] = [];

  // Only resolve submitted MOVE orders
  const moves = args.orders.filter((o) => o.type === "MOVE" && o.submittedAt);

  // Deterministic order (later: initiative rules)
  moves.sort((a, b) => (a.faction + a.platoonId).localeCompare(b.faction + b.platoonId));

  // --- 1) APPLY MOVEMENT (no contest creation yet; we do that after all moves so arrivals merge cleanly) ---
  for (const o of moves) {
    const p = nextPlatoons[o.platoonId];
    if (!p) continue;

    // Cannot leave a locked territory
    if (nextLocks[p.territoryId]) {
      log.push(`MOVE blocked: ${p.name} is in locked territory ${p.territoryId}`);
      continue;
    }

    const path = o.path ?? [];
    if (path.length === 0) continue;

    // Validate adjacency chain & locked steps (cannot enter locked territory)
    let from = p.territoryId;
    let ok = true;

    for (const step of path) {
      if (nextLocks[step]) {
        ok = false;
        break;
      }
      if (!args.isAdjacent(from, step)) {
        ok = false;
        break;
      }
      from = step;
    }

    if (!ok) {
      log.push(`MOVE invalid: ${p.name} path rejected`);
      continue;
    }

    // Movement points
    const maxSteps = p.mpBase ?? 1;
    const allowedSteps = o.forcedMarch ? maxSteps + 1 : maxSteps;

    if (path.length > allowedSteps) {
      log.push(`MOVE too far: ${p.name} wanted ${path.length} steps (allowed ${allowedSteps})`);
      continue;
    }

    const to = path[path.length - 1];

    // Forced march wear (only if actually marching beyond normal move)
    if (o.forcedMarch && path.length >= 2) {
      const worn = worsenCondition(p.condition);
      const strength = Math.max(0, (p.strengthPct ?? 0) - 10);

      nextPlatoons[p.id] = { ...p, condition: worn, strengthPct: strength };
      log.push(`FORCED MARCH: ${p.name} now ${worn} (${strength}%)`);
    }

    // Move
    nextPlatoons[p.id] = { ...nextPlatoons[p.id], territoryId: to };
    log.push(`MOVE: ${p.name} -> ${to}`);
  }

  // --- 2) BUILD TERRITORY OCCUPANCY AFTER MOVES ---
  type Occ = { factions: Set<FactionKey>; byFaction: Record<string, string[]> };
  const occByTerritory: Record<string, Occ> = {};

  for (const p of Object.values(nextPlatoons)) {
    const tid = p.territoryId;
    const faction = p.faction as FactionKey;

    if (!occByTerritory[tid]) {
      occByTerritory[tid] = { factions: new Set<FactionKey>(), byFaction: {} };
    }
    occByTerritory[tid].factions.add(faction);
    occByTerritory[tid].byFaction[faction] = occByTerritory[tid].byFaction[faction] ?? [];
    occByTerritory[tid].byFaction[faction].push(p.id);
  }

  // --- 3) CREATE / MERGE CONTESTS CLEANLY (multiple arrivals collapse into one contest per territory) ---
  for (const [territoryId, occ] of Object.entries(occByTerritory)) {
    const factions = Array.from(occ.factions);

    // If territory is already locked (from earlier combat), do not start a new contest here.
    // (Platoons shouldn't be able to enter anyway, but this keeps state stable.)
    if (nextLocks[territoryId]) continue;

    if (factions.length >= 2) {
      // MVP supports 2-sided contests. If 3+ factions are present, we take first two (and log).
      if (factions.length > 2) {
        log.push(`WARNING: Multi-faction conflict in ${territoryId} (${factions.join(", ")}). Using first two for MVP.`);
      }

      const f1 = factions[0];
      const f2 = factions[1];

      // Decide defender/attacker:
      // Prefer current owner as defender if it is a faction and present.
      const owner = nextOwners[territoryId];
      let defenderFaction: FactionKey = f2;
      let attackerFaction: FactionKey = f1;

      if (owner && owner !== "neutral" && owner !== "contested") {
        const ownerFaction = owner as FactionKey;
        if (ownerFaction === f1 || ownerFaction === f2) {
          defenderFaction = ownerFaction;
          attackerFaction = ownerFaction === f1 ? f2 : f1;
        }
      }

      const attackerPlatoonIds = occ.byFaction[attackerFaction] ?? [];
      const defenderPlatoonIds = occ.byFaction[defenderFaction] ?? [];

      const existing = nextContests[territoryId];

      if (existing && existing.status === "BATTLE_PENDING") {
        // Merge into existing contest
        nextContests[territoryId] = {
          ...existing,
          attackerPlatoonIds: mergeIds(existing.attackerPlatoonIds, attackerPlatoonIds),
          defenderPlatoonIds: mergeIds(existing.defenderPlatoonIds, defenderPlatoonIds),
        };
        nextOwners[territoryId] = "contested";
        nextLocks[territoryId] = { territoryId, reason: "COMBAT", contestId: existing.id };
        log.push(`COMBAT UPDATED: ${territoryId} merged arrivals into contest ${existing.id}`);
      } else {
        // Create new contest
        const contestId = uid();

        nextContests[territoryId] = {
          id: contestId,
          territoryId,
          attackerFaction,
          defenderFaction,
          attackerPlatoonIds: uniq(attackerPlatoonIds),
          defenderPlatoonIds: uniq(defenderPlatoonIds),
          createdTurn: args.turn,
          status: "BATTLE_PENDING",
        };

        nextLocks[territoryId] = { territoryId, reason: "COMBAT", contestId };
        nextOwners[territoryId] = "contested";

        log.push(`COMBAT: ${attackerFaction} vs ${defenderFaction} in ${territoryId} (locked)`);
      }

      continue;
    }

    // --- 4) NO CONFLICT: OPTIONAL MVP CAPTURE LOGIC ---
    if (factions.length === 1) {
      const sole = factions[0];
      const owner = nextOwners[territoryId] ?? "neutral";

      // Only auto-capture neutral territory in MVP (safe rule).
      // (If you want “occupy flips owner even if previously enemy but empty” later, we can extend it.)
      if (owner === "neutral") {
        nextOwners[territoryId] = sole;
        log.push(`CAPTURE: ${sole} takes ${territoryId} (was neutral)`);
      }

      // If owner is contested but only one faction remains and there is no pending contest, clean it up.
      // This can happen if you manually cleared contests or during data edits.
      if (owner === "contested") {
        const c = nextContests[territoryId];
        if (!c || c.status !== "BATTLE_PENDING") {
          nextOwners[territoryId] = sole;
          log.push(`CONTEST CLEARED: ${territoryId} now controlled by ${sole}`);
        }
      }
    }
  }

  return { nextPlatoons, nextOwners, nextLocks, nextContests, log };
}
