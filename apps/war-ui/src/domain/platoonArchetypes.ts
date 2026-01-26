import type { PlatoonTrait } from "./types";

export type PlatoonArchetypeId =
  | "INFANTRY"
  | "RECON"
  | "ENGINEERS"
  | "ARMOURED";

export type PlatoonArchetypeHooks = {
  regionInteraction: string;
  manpowerCost: string;
  supplyConsumption: string;
  doctrineUpgrades: string;
};

export type PlatoonArchetype = {
  id: PlatoonArchetypeId;
  label: string;
  trait?: PlatoonTrait;
  role: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  hooks: PlatoonArchetypeHooks;
};

export const PLATOON_ARCHETYPES: PlatoonArchetype[] = [
  {
    id: "INFANTRY",
    label: "Infantry",
    role: "Hold ground, attack objectives, absorb losses.",
    summary: "Backbone formation for every theatre.",
    strengths: [
      "Holding territory",
      "Fighting in cities, forests, and mountains",
      "Reliable endurance across theatres",
    ],
    weaknesses: ["Rapid exploitation", "Specialised intel work"],
    hooks: {
      regionInteraction: "Baseline region control and defence anchor.",
      manpowerCost: "Default manpower cost reference point.",
      supplyConsumption: "Average supply draw and upkeep.",
      doctrineUpgrades: "Receives most generalist doctrine upgrades.",
    },
  },
  {
    id: "RECON",
    label: "Recon",
    trait: "RECON",
    role: "Intelligence, screening, and disruption.",
    summary: "Primary way to act in fog of war.",
    strengths: [
      "Improving intel and visibility",
      "Operating in fog of war",
      "Avoiding decisive engagements",
    ],
    weaknesses: ["Holding territory", "Prolonged combat"],
    hooks: {
      regionInteraction: "Unlocks scouting, screening, and intel actions.",
      manpowerCost: "Lower manpower footprint than line units.",
      supplyConsumption: "Light supply draw; prioritises intel over firepower.",
      doctrineUpgrades: "Receives recon/intel doctrine upgrades.",
    },
  },
  {
    id: "ENGINEERS",
    label: "Engineers",
    trait: "ENGINEERS",
    role: "Terrain shaping and force multiplication.",
    summary: "Enable fortifications and chokepoints.",
    strengths: [
      "Building and improving forts",
      "Enhancing chokepoints",
      "Mitigating terrain penalties",
    ],
    weaknesses: ["Unspecialised combat performance"],
    hooks: {
      regionInteraction: "Enables fortifications and chokepoint rules.",
      manpowerCost: "Moderate manpower with specialist tooling.",
      supplyConsumption: "Engineer supplies consumed for fortification work.",
      doctrineUpgrades: "Receives engineering doctrine upgrades.",
    },
  },
  {
    id: "ARMOURED",
    label: "Armoured",
    trait: "ARMOURED",
    role: "Breakthrough and exploitation.",
    summary: "Powerful spearhead with fragile logistics.",
    strengths: [
      "Rapid advances",
      "Attacking across open terrain",
      "Exploiting weakly defended regions",
    ],
    weaknesses: [
      "Dense terrain (urban, jungle, mountains)",
      "Supply-poor theatres",
      "Prolonged unsupported operations",
    ],
    hooks: {
      regionInteraction: "Rewards open terrain breakthroughs and exploitation.",
      manpowerCost: "High manpower and equipment overhead.",
      supplyConsumption: "High fuel and supply demand; fragile logistics.",
      doctrineUpgrades: "Receives armoured doctrine upgrades.",
    },
  },
];

const platoonArchetypeById = PLATOON_ARCHETYPES.reduce(
  (acc, archetype) => {
    acc[archetype.id] = archetype;
    return acc;
  },
  {} as Record<PlatoonArchetypeId, PlatoonArchetype>,
);

const platoonArchetypeByTrait = PLATOON_ARCHETYPES.reduce(
  (acc, archetype) => {
    if (archetype.trait) {
      acc[archetype.trait] = archetype;
    }
    return acc;
  },
  {} as Record<PlatoonTrait, PlatoonArchetype>,
);

const traitAliases: Record<string, PlatoonTrait> = {
  RECON: "RECON",
  ENGINEERS: "ENGINEERS",
  ARMOURED: "ARMOURED",
  MOTORIZED: "ARMOURED",
};

export const normalizePlatoonTrait = (
  trait: PlatoonTrait | string | null | undefined,
): PlatoonTrait | null => {
  if (!trait) return null;
  return traitAliases[trait] ?? null;
};

export const getPlatoonArchetypeById = (id: PlatoonArchetypeId) =>
  platoonArchetypeById[id];

export const getPlatoonArchetypeByTrait = (
  trait: PlatoonTrait | string | null | undefined,
): PlatoonArchetype => {
  const normalized = normalizePlatoonTrait(trait);
  if (!normalized) return platoonArchetypeById.INFANTRY;
  return platoonArchetypeByTrait[normalized] ?? platoonArchetypeById.INFANTRY;
};

export const getPlatoonArchetypeForTraits = (
  traits?: Array<PlatoonTrait | string> | null,
): PlatoonArchetype => {
  if (!traits?.length) return platoonArchetypeById.INFANTRY;
  for (const trait of traits) {
    const normalized = normalizePlatoonTrait(trait);
    if (normalized) {
      return (
        platoonArchetypeByTrait[normalized] ?? platoonArchetypeById.INFANTRY
      );
    }
  }
  return platoonArchetypeById.INFANTRY;
};
