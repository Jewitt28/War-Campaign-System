import type { TheatreId } from "../data/theatres";
import type { NationKey } from "../setup/NationDefinitions";
import type { Platoon } from "./types";

export type ResourceKey = "industry" | "political" | "logistics" | "intelligence";
export type EconomyPool = Record<ResourceKey, number>;
export type ManpowerTier = "CORE" | "SECONDARY" | "FRONTIER";

export type RegionInfo = {
  id: string;
  name: string;
  theatreId: TheatreId;
  territories: string[];
  bonus?: string;
};

export type TerritoryMeta = {
  theatreId: TheatreId;
  traits: string[];
};

export const RESOURCE_KEYS: ResourceKey[] = [
  "industry",
  "political",
  "logistics",
  "intelligence",
];

export const DEFAULT_ECONOMY_POOL: EconomyPool = {
  industry: 18,
  political: 12,
  logistics: 14,
  intelligence: 8,
};

export const ECONOMY_CONFIG = {
  incomeByTheatre: {
    WE: { industry: 4, political: 3, logistics: 4, intelligence: 2 },
    EE: { industry: 3, political: 2, logistics: 2, intelligence: 1 },
    NA: { industry: 1, political: 1, logistics: 3, intelligence: 1 },
    PA: { industry: 1, political: 1, logistics: 4, intelligence: 2 },
  } satisfies Record<TheatreId, EconomyPool>,
  incomeCapByResource: {
    industry: 16,
    political: 12,
    logistics: 14,
    intelligence: 8,
  } satisfies EconomyPool,
};

export const MANPOWER_CONFIG = {
  basePool: 320,
  recoveryByTier: {
    CORE: 30,
    SECONDARY: 16,
    FRONTIER: 6,
  } satisfies Record<ManpowerTier, number>,
  theatreRecoveryMultiplier: {
    EE: 1.25,
    WE: 1,
    NA: 0.25,
    PA: 0.2,
  } satisfies Record<TheatreId, number>,
  theatreDefaultTier: {
    EE: "SECONDARY",
    WE: "SECONDARY",
    NA: "FRONTIER",
    PA: "FRONTIER",
  } satisfies Record<TheatreId, ManpowerTier>,
  homelandBonus: 10,
  attritionByTheatre: {
    EE: { base: 1, hostile: 2, environment: 0, outOfSupply: 2, overextended: 1 },
    WE: { base: 1, hostile: 2, environment: 1, outOfSupply: 2, overextended: 1 },
    NA: { base: 2, hostile: 2, environment: 3, outOfSupply: 4, overextended: 2 },
    PA: { base: 2, hostile: 1, environment: 2, outOfSupply: 4, overextended: 2 },
  } satisfies Record<
    TheatreId,
    {
      base: number;
      hostile: number;
      environment: number;
      outOfSupply: number;
      overextended: number;
    }
  >,
  supplyThresholds: {
    lowLogistics: 6,
    criticalLogistics: 2,
  },
  platoonCreationCost: {
    manpower: 24,
    industry: 10,
    logistics: 6,
  },
  harshTerrainTraits: ["DESERT", "JUNGLE", "ARCTIC", "MOUNTAIN"],
};

export type RegionControl = {
  region: RegionInfo;
  controllingNation: NationKey | null;
  isContested: boolean;
};

export function buildRegionControl(
  regions: RegionInfo[],
  ownerByTerritory: Record<string, NationKey | "neutral" | "contested" | undefined>,
): RegionControl[] {
  return regions.map((region) => {
    const owners = region.territories.map(
      (tid) => ownerByTerritory[tid] ?? "neutral",
    );
    const ownerSet = new Set(
      owners.filter((owner) => owner !== "neutral" && owner !== "contested"),
    );
    const isContested = owners.includes("contested") || ownerSet.size > 1;

    if (!isContested && ownerSet.size === 1) {
      return {
        region,
        controllingNation: Array.from(ownerSet)[0] as NationKey,
        isContested: false,
      };
    }

    return { region, controllingNation: null, isContested };
  });
}

export function createEconomyPool(
  base: EconomyPool = DEFAULT_ECONOMY_POOL,
  overrides: Partial<EconomyPool> = {},
): EconomyPool {
  return {
    industry: base.industry,
    political: base.political,
    logistics: base.logistics,
    intelligence: base.intelligence,
    ...overrides,
  };
}

export function getPlatoonCreationCost() {
  return { ...MANPOWER_CONFIG.platoonCreationCost };
}

export function computeManpowerRecovery(args: {
  nations: NationKey[];
  regions: RegionInfo[];
  ownerByTerritory: Record<string, NationKey | "neutral" | "contested" | undefined>;
  homelandsByNation: Partial<Record<NationKey, string>>;
}): { recoveryByNation: Record<NationKey, number>; logs: string[] } {
  const recoveryByNation: Record<NationKey, number> = {} as Record<
    NationKey,
    number
  >;
  const logs: string[] = [];
  const regionControl = buildRegionControl(args.regions, args.ownerByTerritory);

  for (const nation of args.nations) recoveryByNation[nation] = 0;

  for (const entry of regionControl) {
    if (!entry.controllingNation) continue;
    const nation = entry.controllingNation;
    const theatre = entry.region.theatreId;
    const tier = MANPOWER_CONFIG.theatreDefaultTier[theatre];
    const baseRecovery = MANPOWER_CONFIG.recoveryByTier[tier];
    const multiplier = MANPOWER_CONFIG.theatreRecoveryMultiplier[theatre];
    const recovered = Math.round(baseRecovery * multiplier);
    recoveryByNation[nation] = (recoveryByNation[nation] ?? 0) + recovered;
  }

  for (const nation of args.nations) {
    const homeland = args.homelandsByNation[nation];
    if (homeland && args.ownerByTerritory[homeland] === nation) {
      recoveryByNation[nation] =
        (recoveryByNation[nation] ?? 0) + MANPOWER_CONFIG.homelandBonus;
    }
  }

  for (const nation of args.nations) {
    const recovered = recoveryByNation[nation] ?? 0;
    if (recovered > 0) {
      logs.push(`Manpower recovered: ${nation} +${recovered}.`);
    }
  }

  return { recoveryByNation, logs };
}

export function computeEconomyIncome(args: {
  nations: NationKey[];
  regions: RegionInfo[];
  ownerByTerritory: Record<string, NationKey | "neutral" | "contested" | undefined>;
}): { incomeByNation: Record<NationKey, EconomyPool>; logs: string[] } {
  const incomeByNation: Record<NationKey, EconomyPool> = {} as Record<
    NationKey,
    EconomyPool
  >;
  const logs: string[] = [];
  const regionControl = buildRegionControl(args.regions, args.ownerByTerritory);

  for (const nation of args.nations) {
    incomeByNation[nation] = createEconomyPool(
      { industry: 0, political: 0, logistics: 0, intelligence: 0 },
      {},
    );
  }

  for (const entry of regionControl) {
    if (!entry.controllingNation) continue;
    const nation = entry.controllingNation;
    const theatre = entry.region.theatreId;
    const income = ECONOMY_CONFIG.incomeByTheatre[theatre];

    incomeByNation[nation] = {
      industry: incomeByNation[nation].industry + income.industry,
      political: incomeByNation[nation].political + income.political,
      logistics: incomeByNation[nation].logistics + income.logistics,
      intelligence: incomeByNation[nation].intelligence + income.intelligence,
    };
  }

  for (const nation of args.nations) {
    const income = incomeByNation[nation];
    if (!income) continue;
    const capped: EconomyPool = { ...income };

    for (const key of RESOURCE_KEYS) {
      const cap = ECONOMY_CONFIG.incomeCapByResource[key];
      capped[key] = Math.min(capped[key], cap);
    }

    incomeByNation[nation] = capped;

    if (RESOURCE_KEYS.some((key) => capped[key] > 0)) {
      logs.push(
        `Economic income: ${nation} +${capped.industry} IND, +${capped.political} POL, +${capped.logistics} SUP, +${capped.intelligence} INT.`,
      );
    }
  }

  return { incomeByNation, logs };
}

export function computeAttritionLosses(args: {
  platoonsById: Record<string, Platoon>;
  ownerByTerritory: Record<string, NationKey | "neutral" | "contested" | undefined>;
  territoryMetaById: Record<string, TerritoryMeta>;
  economyByNation: Partial<Record<NationKey, EconomyPool>>;
}): { lossesByNation: Record<NationKey, number>; logs: string[] } {
  const lossesByNation: Record<NationKey, number> = {} as Record<
    NationKey,
    number
  >;
  const logs: string[] = [];
  const harshTraits = new Set(MANPOWER_CONFIG.harshTerrainTraits);

  for (const platoon of Object.values(args.platoonsById)) {
    const nation = platoon.nation as NationKey;
    const territoryId = platoon.territoryId;
    const owner = args.ownerByTerritory[territoryId];
    const meta = args.territoryMetaById[territoryId];
    const theatre = meta?.theatreId ?? "WE";
    const profile = MANPOWER_CONFIG.attritionByTheatre[theatre];

    const isHostile =
      owner != null && owner !== "neutral" && owner !== nation;
    const traits = meta?.traits ?? [];
    const isHarshEnvironment = traits.some((trait) => harshTraits.has(trait));

    const logisticsLevel = args.economyByNation[nation]?.logistics ?? 0;
    const isOutOfSupply =
      logisticsLevel <= MANPOWER_CONFIG.supplyThresholds.lowLogistics;
    const isOverextended =
      logisticsLevel <= MANPOWER_CONFIG.supplyThresholds.criticalLogistics;

    let loss = profile.base;
    if (isHostile) loss += profile.hostile;
    if (isHarshEnvironment) loss += profile.environment;
    if (isOutOfSupply) loss += profile.outOfSupply;
    if (isOverextended) loss += profile.overextended;

    if (loss <= 0) continue;

    lossesByNation[nation] = (lossesByNation[nation] ?? 0) + loss;
  }

  for (const [nation, loss] of Object.entries(lossesByNation)) {
    if (loss > 0) {
      logs.push(`Attrition: ${nation} lost ${loss} manpower.`);
    }
  }

  return { lossesByNation, logs };
}
