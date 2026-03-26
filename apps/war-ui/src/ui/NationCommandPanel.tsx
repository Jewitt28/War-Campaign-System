/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from "react";
import type {
  CampaignMapSummary,
  CampaignMembership,
} from "../features/campaigns";
import type { NormalizedData } from "../data/theatres";
import { NATION_BY_ID, type BaseNationKey } from "../setup/NationDefinitions";
import { useCampaignStore, type TurnLogType } from "../store/useCampaignStore";

import { factionLabel } from "../store/factionLabel";
import { nationLabel } from "../store/nationLabel";
import { getFactionAccent } from "./factionColors";
import { getDoctrineDerivedStats } from "../strategy/selectors/getStrategicModifiers";
import { formatTerritoryLabel, formatTerritoryList } from "./territoryLabel";
import type { Platoon, PlatoonCondition, PlatoonTrait } from "../domain/types";
import {
  type PlatoonDetail,
  type PlatoonSummary,
  useCreateCampaignPlatoon,
  useUpdateCampaignPlatoon,
} from "../features/platoons";
import {
  getPlatoonArchetypeById,
  getPlatoonArchetypeByTrait,
  getPlatoonArchetypeForTraits,
  normalizePlatoonTrait,
  type PlatoonArchetypeId,
} from "../domain/platoonArchetypes";

const CONDITION_ORDER: PlatoonCondition[] = [
  "SHATTERED",
  "DEPLETED",
  "WORN",
  "FRESH",
];

const BACKEND_NATION_KEY_ALIASES: Record<string, string> = {
  uk: "great_britain",
  united_kingdom: "great_britain",
  de: "germany",
  jp: "imperial_japan",
  japan: "imperial_japan",
  su: "soviet_union",
  soviet: "soviet_union",
  ussr: "soviet_union",
  nl: "the_netherlands",
  netherlands: "the_netherlands",
  holland: "the_netherlands",
  ppa: "polish_peoples_army",
  polish_peoples_army: "polish_peoples_army",
};

const BACKEND_FACTION_KEY_ALIASES: Record<string, string> = {
  soviet: "ussr",
};

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(Math.max(n, lo), hi);

function normalizeKey(value: string | null | undefined) {
  return value?.trim().toLowerCase().replace(/[\s-]+/g, "_") ?? null;
}

function normalizeNationKey(value: string | null | undefined) {
  const normalized = normalizeKey(value);
  if (!normalized) {
    return null;
  }
  return BACKEND_NATION_KEY_ALIASES[normalized] ?? normalized;
}

function normalizeFactionKey(value: string | null | undefined) {
  const normalized = normalizeKey(value);
  if (!normalized) {
    return null;
  }
  return BACKEND_FACTION_KEY_ALIASES[normalized] ?? normalized;
}

function nextBetterCondition(c: PlatoonCondition, steps = 1): PlatoonCondition {
  const idx = CONDITION_ORDER.indexOf(c);
  if (idx < 0) return c;
  return CONDITION_ORDER[clamp(idx + steps, 0, CONDITION_ORDER.length - 1)];
}

function mapReadinessToCondition(readinessStatus: string): PlatoonCondition {
  const normalized = readinessStatus.trim().toUpperCase();
  if (normalized.includes("SHATTER")) {
    return "SHATTERED";
  }
  if (normalized.includes("DEPLET") || normalized.includes("BROKEN")) {
    return "DEPLETED";
  }
  if (
    normalized.includes("WORN") ||
    normalized.includes("REDUCED") ||
    normalized.includes("DAMAGED")
  ) {
    return "WORN";
  }

  return "FRESH";
}

function logAction(type: TurnLogType, text: string) {
  useCampaignStore.setState((state) => ({
    turnLog: [
      { id: String(crypto.randomUUID()), ts: Date.now(), type, text },
      ...state.turnLog,
    ],
  }));
}

function logPlatoonMutationError(action: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  logAction("ERROR", `${action} failed: ${message}`);
}

type Props = {
  campaignId: string;
  data: NormalizedData | null;
  mapSummary: CampaignMapSummary;
  membership: CampaignMembership;
};

function commitPlatoonSnapshot(platoon: Platoon) {
  useCampaignStore.setState((state) => ({
    platoonsById: {
      ...state.platoonsById,
      [platoon.id]: platoon,
    },
  }));
}

function toLocalPlatoon(
  source: PlatoonSummary | PlatoonDetail,
  fallback: Platoon,
): Platoon {
  return {
    ...fallback,
    id: source.id,
    name: source.name,
    territoryId: source.currentTerritory?.key ?? fallback.territoryId,
    condition: mapReadinessToCondition(source.readinessStatus),
    strengthPct: Math.max(0, Math.min(100, Math.round(source.strength))),
    mpBase: source.mpBase,
    traits: source.traits ?? fallback.traits ?? [],
    entrenched: source.entrenched ?? false,
  }
}

export default function NationCommandPanel({
  campaignId,
  data,
  mapSummary,
  membership,
}: Props) {
  const viewerNation = useCampaignStore((s) => s.viewerNation);
  const viewerFaction = useCampaignStore((s) => s.viewerFaction);
  const customNations = useCampaignStore((s) => s.customNations);
  const customs = useCampaignStore((s) => s.customs);
  const turnNumber = useCampaignStore((s) => s.turnNumber);
  const phase = useCampaignStore((s) => s.phase);
  const platoonsById = useCampaignStore((s) => s.platoonsById);
  const ordersByTurn = useCampaignStore((s) => s.ordersByTurn);
  const selectedTerritoryId = useCampaignStore((s) => s.selectedTerritoryId);
  const selectedPlatoonId = useCampaignStore((s) => s.selectedPlatoonId);
  const setSelectedPlatoonId = useCampaignStore((s) => s.setSelectedPlatoonId);
  const setSelectedTerritory = useCampaignStore((s) => s.setSelectedTerritory);
  const orderDraftType = useCampaignStore((s) => s.orderDraftType);
  const setOrderDraftType = useCampaignStore((s) => s.setOrderDraftType);
  const submitFactionOrders = useCampaignStore((s) => s.submitFactionOrders);
  const cancelDraftOrder = useCampaignStore((s) => s.cancelDraftOrder);
  const territoryNameById = useCampaignStore((s) => s.territoryNameById);
  const ensureSupplies = useCampaignStore((s) => s.ensureSupplies);
  const getSupplies = useCampaignStore((s) => s.getSupplies);
  const spendSupplies = useCampaignStore((s) => s.spendSupplies);
  const createPlatoonMutation = useCreateCampaignPlatoon(campaignId);
  const updatePlatoonMutation = useUpdateCampaignPlatoon(campaignId);
  const nationDoctrineState = useCampaignStore((s) => s.nationDoctrineState);
  const nationResearchState = useCampaignStore((s) => s.nationResearchState);
  const nationUpgradesState = useCampaignStore((s) => s.nationUpgradesState);
  const doctrineStats = useMemo(
    () =>
      getDoctrineDerivedStats(
        {
          nationDoctrineState,
          nationResearchState,
          nationUpgradesState,
        },
        viewerNation,
      ),
    [
      nationDoctrineState,
      nationResearchState,
      nationUpgradesState,
      viewerNation,
    ],
  );

  const [openOrderPlatoonId, setOpenOrderPlatoonId] = useState<string | null>(
    null,
  );
  const [pendingOrderPlatoonId, setPendingOrderPlatoonId] = useState<
    string | null
  >(null);
  const [expandedPlatoonId, setExpandedPlatoonId] = useState<string | null>(
    null,
  );
  const [renameDraft, setRenameDraft] = useState<string>("");
  const [refitPct, setRefitPct] = useState<number>(10);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardName, setWizardName] = useState("");
  const [wizardTrait, setWizardTrait] = useState<PlatoonTrait | "">("");
  const [wizardMpBase, setWizardMpBase] = useState(1);

  const viewerFactionId = useMemo(() => {
    if (membership.factionId) {
      return membership.factionId;
    }

    const normalizedViewerFaction = normalizeFactionKey(viewerFaction);
    return (
      mapSummary.factions.find(
        (faction) => normalizeFactionKey(faction.key) === normalizedViewerFaction,
      )?.id ?? null
    );
  }, [mapSummary.factions, membership.factionId, viewerFaction]);

  const viewerNationId = useMemo(() => {
    if (
      membership.nationId &&
      normalizeNationKey(
        mapSummary.nations.find((nation) => nation.id === membership.nationId)?.key,
      ) === normalizeNationKey(viewerNation)
    ) {
      return membership.nationId;
    }

    const normalizedViewerNation = normalizeNationKey(viewerNation);
    return (
      mapSummary.nations.find(
        (nation) => normalizeNationKey(nation.key) === normalizedViewerNation,
      )?.id ?? null
    );
  }, [mapSummary.nations, membership.nationId, viewerNation]);

  const selectedTerritoryBackendId = useMemo(
    () =>
      selectedTerritoryId
        ? mapSummary.territories.find((territory) => territory.key === selectedTerritoryId)
            ?.id ?? null
        : null,
    [mapSummary.territories, selectedTerritoryId],
  );

  const viewerNationLabel =
    (viewerNation.startsWith("custom:")
      ? customNations.find((n) => n.id === viewerNation)?.name
      : NATION_BY_ID[viewerNation as BaseNationKey]?.name) ?? viewerNation;
  const platoons = useMemo(
    () =>
      Object.values(platoonsById).filter(
        (platoon) => platoon.nation === viewerNation,
      ),
    [platoonsById, viewerNation],
  );
  const draftOrders = useMemo(() => {
    const byTurn = ordersByTurn?.[turnNumber] ?? {};
    return Object.values(byTurn)
      .flat()
      .filter((order) => {
        const platoon = platoonsById[order.platoonId];
        return platoon?.nation === viewerNation && !order.submittedAt;
      });
  }, [ordersByTurn, platoonsById, turnNumber, viewerNation]);
  const orderStatusByPlatoon = useMemo(() => {
    const byTurn = ordersByTurn?.[turnNumber] ?? {};
    const statuses = new Map<string, "none" | "draft" | "submitted">();
    Object.values(byTurn)
      .flat()
      .forEach((order) => {
        if (order.submittedAt) {
          statuses.set(order.platoonId, "submitted");
          return;
        }
        if (statuses.get(order.platoonId) !== "submitted") {
          statuses.set(order.platoonId, "draft");
        }
      });
    return statuses;
  }, [ordersByTurn, turnNumber]);
  const supplies = useMemo(
    () => getSupplies(viewerNation),
    [getSupplies, viewerNation],
  );
  const canCancelOrders = doctrineStats.orderFlexibility > 0;
  const accentColor = getFactionAccent({
    viewerNation,
    viewerFaction,
    customNations,
    customs,
  });

  useEffect(() => {
    if (phase !== "ORDERS") {
      setOpenOrderPlatoonId(null);
      setPendingOrderPlatoonId(null);
      setOrderDraftType(null);
    }
  }, [phase, setOrderDraftType]);

  useEffect(() => {
    if (orderDraftType && selectedPlatoonId) {
      setPendingOrderPlatoonId(selectedPlatoonId);
    }
  }, [orderDraftType, selectedPlatoonId]);

  useEffect(() => {
    if (!orderDraftType && pendingOrderPlatoonId) {
      setOpenOrderPlatoonId(null);
      setPendingOrderPlatoonId(null);
    }
  }, [orderDraftType, pendingOrderPlatoonId]);

  useEffect(() => {
    ensureSupplies();
  }, [ensureSupplies]);

  useEffect(() => {
    setRenameDraft("");
    setRefitPct(10);
  }, [expandedPlatoonId]);

  const wizardSteps = ["Specialism", "Mobility", "Name"];
  const expandedPlatoon = expandedPlatoonId
    ? platoonsById[expandedPlatoonId]
    : undefined;

  // Costs (tune later)
  const COST_REFIT_PER_1 = 1;
  const COST_UPGRADE_MP = 25;
  const COST_UPGRADE_CONDITION = 15;
  const COST_TOGGLE_ENTRENCH = 10;
  const COST_TRAIT_RECON = 20;
  const COST_TRAIT_ENGINEERS = 20;
  const COST_TRAIT_ARMOURED = 30;

  const traitCosts: Record<PlatoonTrait, number> = {
    RECON: COST_TRAIT_RECON,
    ENGINEERS: COST_TRAIT_ENGINEERS,
    ARMOURED: COST_TRAIT_ARMOURED,
  };
  const traitInfo: Record<PlatoonTrait, string> = {
    RECON: getPlatoonArchetypeByTrait("RECON").summary,
    ENGINEERS: getPlatoonArchetypeByTrait("ENGINEERS").summary,
    ARMOURED: getPlatoonArchetypeByTrait("ARMOURED").summary,
  };

  const canAfford = (cost: number) => supplies >= cost;
  const mustMatchNation = expandedPlatoon
    ? expandedPlatoon.nation === viewerNation
    : false;
  const conditionColor: Record<PlatoonCondition, string> = {
    FRESH: "#22c55e",
    WORN: "#eab308",
    DEPLETED: "#f97316",
    SHATTERED: "#ef4444",
  };
  const classStyles: Record<
    PlatoonArchetypeId,
    { label: string; color: string }
  > = {
    INFANTRY: {
      label: getPlatoonArchetypeById("INFANTRY").label,
      color: "#94a3b8",
    },
    RECON: { label: getPlatoonArchetypeById("RECON").label, color: "#38bdf8" },
    ENGINEERS: {
      label: getPlatoonArchetypeById("ENGINEERS").label,
      color: "#fbbf24",
    },
    ARMOURED: {
      label: getPlatoonArchetypeById("ARMOURED").label,
      color: "#a78bfa",
    },
  };
  const getPlatoonClass = (platoonTraits?: Array<PlatoonTrait | string>) =>
    getPlatoonArchetypeForTraits(platoonTraits).id;
  const formatTraits = (platoonTraits?: Array<PlatoonTrait | string>) => {
    const normalized = (platoonTraits ?? [])
      .map((trait) => normalizePlatoonTrait(trait))
      .filter((trait): trait is PlatoonTrait => Boolean(trait));
    return normalized.length ? normalized.join(", ") : "";
  };
  const strengthColor = (strengthPct: number) => {
    if (strengthPct >= 75) return conditionColor.FRESH;
    if (strengthPct >= 50) return conditionColor.WORN;
    if (strengthPct >= 25) return conditionColor.DEPLETED;
    return conditionColor.SHATTERED;
  };

  const applyRename = async () => {
    if (!expandedPlatoon || !campaignId) return;
    const name = renameDraft.trim();
    if (!name) return;

    try {
      const updated = await updatePlatoonMutation.mutateAsync({
        platoonId: expandedPlatoon.id,
        payload: { name },
      });

      commitPlatoonSnapshot(
        toLocalPlatoon(updated, { ...expandedPlatoon, name }),
      );
      logAction(
        "PLATOON",
        `Renamed platoon ${expandedPlatoon.id} to "${name}"`,
      );
      setRenameDraft("");
    } catch (error) {
      logPlatoonMutationError(`Rename ${expandedPlatoon.name}`, error);
    }
  };

  const applyRefit = async () => {
    if (!expandedPlatoon || !campaignId) return;

    const cur = expandedPlatoon.strengthPct ?? 0;
    const target = clamp(cur + refitPct, 0, 100);
    const gain = target - cur;
    const cost = gain * COST_REFIT_PER_1;

    if (gain <= 0) return;
    if (!mustMatchNation) return;

    const nextCondition =
      target >= 80 && expandedPlatoon.condition !== "FRESH"
        ? nextBetterCondition(expandedPlatoon.condition, 1)
        : expandedPlatoon.condition;

    try {
      const updated = await updatePlatoonMutation.mutateAsync({
        platoonId: expandedPlatoon.id,
        payload: {
          strength: target,
          condition: nextCondition,
        },
      });

      commitPlatoonSnapshot(
        toLocalPlatoon(updated, {
          ...expandedPlatoon,
          strengthPct: target,
          condition: nextCondition,
        }),
      );
      spendSupplies(expandedPlatoon.nation, cost, "Refit");
      logAction(
        "PLATOON",
        `Refit ${expandedPlatoon.name}: +${gain}% strength (cost ${cost})`,
      );
    } catch (error) {
      logPlatoonMutationError(`Refit ${expandedPlatoon.name}`, error);
    }
  };

  const upgradeMobility = async () => {
    if (!expandedPlatoon || !campaignId) return;
    const cur = expandedPlatoon.mpBase ?? 1;
    if (cur >= 3) return;
    if (!mustMatchNation) return;

    try {
      const updated = await updatePlatoonMutation.mutateAsync({
        platoonId: expandedPlatoon.id,
        payload: { mpBase: cur + 1 },
      });

      commitPlatoonSnapshot(
        toLocalPlatoon(updated, { ...expandedPlatoon, mpBase: cur + 1 }),
      );
      spendSupplies(
        expandedPlatoon.nation,
        COST_UPGRADE_MP,
        "Mobility upgrade",
      );
      logAction(
        "PLATOON",
        `Upgraded mobility for ${expandedPlatoon.name}: MP ${cur} → ${cur + 1} (cost ${COST_UPGRADE_MP})`,
      );
    } catch (error) {
      logPlatoonMutationError(
        `Mobility upgrade for ${expandedPlatoon.name}`,
        error,
      );
    }
  };

  const upgradeCondition = async () => {
    if (!expandedPlatoon || !campaignId) return;
    if (expandedPlatoon.condition === "FRESH") return;
    if (!mustMatchNation) return;

    const next = nextBetterCondition(expandedPlatoon.condition, 1);
    try {
      const updated = await updatePlatoonMutation.mutateAsync({
        platoonId: expandedPlatoon.id,
        payload: { condition: next },
      });

      commitPlatoonSnapshot(
        toLocalPlatoon(updated, { ...expandedPlatoon, condition: next }),
      );
      spendSupplies(
        expandedPlatoon.nation,
        COST_UPGRADE_CONDITION,
        "Readiness upgrade",
      );

      logAction(
        "PLATOON",
        `Upgraded readiness for ${expandedPlatoon.name}: ${expandedPlatoon.condition} → ${next} (cost ${COST_UPGRADE_CONDITION})`,
      );
    } catch (error) {
      logPlatoonMutationError(
        `Readiness upgrade for ${expandedPlatoon.name}`,
        error,
      );
    }
  };

  const traits: PlatoonTrait[] = (expandedPlatoon?.traits ?? [])
    .map((trait) => normalizePlatoonTrait(trait))
    .filter((trait): trait is PlatoonTrait => Boolean(trait));
  const hasTrait = (t: PlatoonTrait) => traits.includes(t);
  const selectedArchetype = getPlatoonArchetypeForTraits(traits);
  const selectedClass = selectedArchetype.id;

  const addTrait = async (trait: PlatoonTrait, cost: number) => {
    if (!expandedPlatoon || !campaignId) return;
    if (!mustMatchNation) return;
    if (hasTrait(trait)) return;

    try {
      const updated = await updatePlatoonMutation.mutateAsync({
        platoonId: expandedPlatoon.id,
        payload: { traits: [...traits, trait] },
      });

      commitPlatoonSnapshot(
        toLocalPlatoon(updated, {
          ...expandedPlatoon,
          traits: [...traits, trait],
        }),
      );
      spendSupplies(expandedPlatoon.nation, cost, `Trait: ${trait}`);
      logAction(
        "PLATOON",
        `Purchased trait ${trait} for ${expandedPlatoon.name} (cost ${cost})`,
      );
    } catch (error) {
      logPlatoonMutationError(`Trait purchase ${trait}`, error);
    }
  };

  const toggleEntrench = async () => {
    if (!expandedPlatoon || !campaignId) return;
    if (!mustMatchNation) return;

    const currently = !!expandedPlatoon.entrenched;
    const nextEntrenched = !currently;

    try {
      const updated = await updatePlatoonMutation.mutateAsync({
        platoonId: expandedPlatoon.id,
        payload: { entrenched: nextEntrenched },
      });

      commitPlatoonSnapshot(
        toLocalPlatoon(updated, {
          ...expandedPlatoon,
          entrenched: nextEntrenched,
        }),
      );

      if (!currently) {
        spendSupplies(
          expandedPlatoon.nation,
          COST_TOGGLE_ENTRENCH,
          "Entrench",
        );
      }

      logAction(
        "PLATOON",
        `${expandedPlatoon.name} is now ${
          nextEntrenched ? "ENTRENCHED" : "NOT entrenched"
        }`,
      );
    } catch (error) {
      logPlatoonMutationError(`Entrench ${expandedPlatoon.name}`, error);
    }
  };

  const openCreateWizard = () => {
    if (!selectedTerritoryId || !selectedTerritoryBackendId || !viewerFactionId)
      return;
    setWizardName("");
    setWizardTrait("");
    setWizardMpBase(1);
    setWizardStep(0);
    setWizardOpen(true);
  };

  const closeCreateWizard = () => {
    setWizardOpen(false);
  };

  const goToWizardStep = (nextStep: number) => {
    setWizardStep(clamp(nextStep, 0, wizardSteps.length - 1));
  };

  const deployWizardPlatoon = async () => {
    if (
      !campaignId ||
      !selectedTerritoryId ||
      !selectedTerritoryBackendId ||
      !viewerFactionId
    ) {
      return;
    }
    const trimmedName = wizardName.trim();
    if (!trimmedName) return;

    const platoonKeyBase = `${viewerNation}-${trimmedName}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const platoonKey = `${platoonKeyBase || "platoon"}-${crypto
      .randomUUID()
      .slice(0, 8)}`.slice(0, 60);
    const unitType =
      wizardTrait === "ARMOURED"
        ? "ARMOR"
        : wizardTrait === "ENGINEERS"
          ? "ENGINEERS"
          : wizardTrait === "RECON"
            ? "RECON"
            : "INFANTRY";

    try {
      const created = await createPlatoonMutation.mutateAsync({
        platoonKey,
        name: trimmedName,
        factionId: viewerFactionId,
        nationId: viewerNationId,
        homeTerritoryId: selectedTerritoryBackendId,
        unitType,
        condition: "FRESH",
        strength: 100,
        mpBase: wizardMpBase,
        traits: wizardTrait ? [wizardTrait] : [],
        entrenched: false,
      });

      commitPlatoonSnapshot(
        toLocalPlatoon(created, {
          id: created.id,
          faction: viewerFaction,
          nation: viewerNation,
          name: trimmedName,
          territoryId: created.currentTerritory?.key ?? selectedTerritoryId,
          condition: "FRESH",
          strengthPct: 100,
          mpBase: wizardMpBase,
          traits: wizardTrait ? [wizardTrait] : [],
          entrenched: false,
        }),
      );
      setSelectedPlatoonId(created.id);
      setSelectedTerritory(created.currentTerritory?.key ?? selectedTerritoryId);
      setWizardOpen(false);
    } catch (error) {
      logPlatoonMutationError(`Create platoon ${trimmedName}`, error);
    }
  };

  return (
    <div
      style={{
        padding: 16,
        display: "grid",
        gap: 12,
        border: `1px solid ${accentColor}55`,
        borderRadius: 12,
        background: `linear-gradient(135deg, ${accentColor}12, rgba(0,0,0,0))`,
      }}
    >
      <div>
        <h2 style={{ margin: 0 }}>My Forces</h2>
        <div style={{ opacity: 0.8 }}>
          Acting nation: <b>{viewerNationLabel}</b> · Faction alignment:{" "}
          <b>{factionLabel(viewerFaction, customs)}</b> · Turn{" "}
          <b>{turnNumber}</b>
        </div>
        <div style={{ opacity: 0.7, fontSize: 12, marginTop: 4 }}>
          Supplies snapshot: <b>{supplies}</b> · Territory data:{" "}
          <b>{data ? "loaded" : "not loaded"}</b>
        </div>
      </div>

      <section
        style={{
          border: "1px solid rgba(255,255,255,.12)",
          borderRadius: 12,
          padding: 12,
        }}
      >
        <h3 style={{ marginTop: 0 }}>Nation Platoons</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={openCreateWizard}
            disabled={!selectedTerritoryId || !selectedTerritoryBackendId || !viewerFactionId}
            title={
              !selectedTerritoryId
                ? "Select a territory on the map to create a platoon."
                : !selectedTerritoryBackendId
                  ? "Selected territory is not mapped to the backend read model."
                  : !viewerFactionId
                    ? "No backend faction is available for the current viewer."
                : undefined
            }
          >
            + Create Platoon{" "}
            {selectedTerritoryId
              ? `(as ${nationLabel(viewerNation, customNations)})`
              : ""}
          </button>
        </div>
        {wizardOpen ? (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,.55)",
              display: "grid",
              placeItems: "center",
              zIndex: 50,
            }}
          >
            <div
              style={{
                width: "min(720px, 92vw)",
                background: "#0f172a",
                borderRadius: 12,
                padding: 16,
                border: `1px solid ${accentColor}55`,
                display: "grid",
                gap: 12,
                backgroundImage: `linear-gradient(135deg, ${accentColor}22, rgba(0,0,0,0))`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ fontWeight: 900 }}>Platoon Creation Wizard</div>
                <button type="button" onClick={closeCreateWizard}>
                  Close
                </button>
              </div>

              <div style={{ display: "grid", gap: 4 }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  Step {wizardStep + 1} of {wizardSteps.length} ·{" "}
                  <b>{wizardSteps[wizardStep]}</b>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {wizardSteps.map((step, index) => (
                    <div
                      key={step}
                      style={{
                        flex: 1,
                        height: 6,
                        borderRadius: 999,
                        background:
                          index <= wizardStep
                            ? accentColor
                            : "rgba(255,255,255,.12)",
                      }}
                    />
                  ))}
                </div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  Changes are staged locally and only saved when you click
                  Deploy.
                </div>
              </div>

              {wizardStep === 0 ? (
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontWeight: 700 }}>
                    Choose a platoon specialism
                  </div>
                  <label
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <input
                      type="radio"
                      name="specialism"
                      value=""
                      checked={wizardTrait === ""}
                      onChange={() => setWizardTrait("")}
                    />
                    <span style={{ display: "grid", gap: 2 }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            background: classStyles.INFANTRY.color,
                            display: "inline-block",
                          }}
                        />
                        None (standard infantry)
                      </span>
                      <span style={{ fontSize: 12, opacity: 0.75 }}>
                        Cost: <b>0</b> · Balanced infantry platoon.
                      </span>
                    </span>
                  </label>
                  {(["RECON", "ENGINEERS", "ARMOURED"] as PlatoonTrait[]).map(
                    (trait) => (
                      <label
                        key={trait}
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <input
                          type="radio"
                          name="specialism"
                          value={trait}
                          checked={wizardTrait === trait}
                          onChange={() => setWizardTrait(trait)}
                        />
                        <span style={{ display: "grid", gap: 2 }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <span
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: "50%",
                                background: classStyles[trait].color,
                                display: "inline-block",
                              }}
                            />
                            {classStyles[trait].label}
                          </span>
                          <span style={{ fontSize: 12, opacity: 0.75 }}>
                            Cost: <b>{traitCosts[trait]}</b> ·{" "}
                            {traitInfo[trait]}
                          </span>
                        </span>
                      </label>
                    ),
                  )}
                </div>
              ) : null}

              {wizardStep === 1 ? (
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ fontWeight: 700 }}>Configure mobility</div>
                  <div style={{ display: "grid", gap: 6 }}>
                    <label style={{ fontSize: 12, opacity: 0.8 }}>
                      Mobility (MP)
                    </label>
                    <select
                      value={wizardMpBase}
                      onChange={(e) =>
                        setWizardMpBase(
                          clamp(Number(e.target.value || 1), 1, 3),
                        )
                      }
                    >
                      {[1, 2, 3].map((value) => (
                        <option key={value} value={value}>
                          {value} MP
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    New platoons always deploy at full readiness and strength.
                  </div>
                </div>
              ) : null}

              {wizardStep === 2 ? (
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontWeight: 700 }}>Name your platoon</div>
                  <input
                    value={wizardName}
                    onChange={(e) => setWizardName(e.target.value)}
                    placeholder="e.g. 1st Infantry"
                  />
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    Territory: <b>{selectedTerritoryId ?? "—"}</b> · Nation:{" "}
                    <b>{nationLabel(viewerNation, customNations)}</b>
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    Specialism:{" "}
                    <b>
                      {wizardTrait
                        ? classStyles[wizardTrait].label
                        : classStyles.INFANTRY.label}
                    </b>{" "}
                    · MP <b>{wizardMpBase}</b> · Readiness <b>FRESH</b> ·
                    Strength <b>100%</b>
                  </div>
                </div>
              ) : null}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <button
                  type="button"
                  onClick={() => goToWizardStep(wizardStep - 1)}
                  disabled={wizardStep === 0}
                >
                  Back
                </button>
                <div style={{ display: "flex", gap: 8 }}>
                  {wizardStep < wizardSteps.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => goToWizardStep(wizardStep + 1)}
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={deployWizardPlatoon}
                      disabled={!wizardName.trim()}
                    >
                      Deploy
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            fontSize: 12,
            marginBottom: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#d14b47",
              }}
            />
            No order
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#e2b340",
              }}
            />
            Drafted
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#38b56f",
              }}
            />
            Submitted
          </div>
        </div>
        {platoons.length ? (
          <div style={{ display: "grid", gap: 8 }}>
            {platoons.map((platoon) => {
              const platoonClass = getPlatoonClass(platoon.traits);
              const status = orderStatusByPlatoon.get(platoon.id) ?? "none";
              const statusColor =
                status === "submitted"
                  ? "#38b56f"
                  : status === "draft"
                    ? "#e2b340"
                    : "#d14b47";
              const statusLabel =
                status === "submitted"
                  ? "Submitted order"
                  : status === "draft"
                    ? "Draft order"
                    : "No order";
              const orderPanelOpen =
                phase === "ORDERS" && openOrderPlatoonId === platoon.id;
              const detailOpen = expandedPlatoonId === platoon.id;
              return (
                <div key={platoon.id} style={{ display: "grid", gap: 8 }}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setSelectedPlatoonId(platoon.id);
                      setSelectedTerritory(platoon.territoryId);
                      if (phase === "ORDERS") {
                        setOpenOrderPlatoonId(platoon.id);
                        setOrderDraftType(null);
                        setPendingOrderPlatoonId(null);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        setSelectedPlatoonId(platoon.id);
                        setSelectedTerritory(platoon.territoryId);
                        if (phase === "ORDERS") {
                          setOpenOrderPlatoonId(platoon.id);
                          setOrderDraftType(null);
                          setPendingOrderPlatoonId(null);
                        }
                      }
                    }}
                    style={{
                      textAlign: "left",
                      padding: 10,
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,.12)",
                      background:
                        selectedPlatoonId === platoon.id
                          ? "rgba(255,255,255,.06)"
                          : "rgba(0,0,0,.12)",
                      cursor: "pointer",
                      display: "grid",
                      gap: 6,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "2px 8px",
                            borderRadius: 999,
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            background: "rgba(15,23,42,.9)",
                            border: `1px solid ${classStyles[platoonClass].color}`,
                            color: classStyles[platoonClass].color,
                          }}
                          title={`Class: ${classStyles[platoonClass].label}`}
                        >
                          {classStyles[platoonClass].label}
                        </span>
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            background: strengthColor(platoon.strengthPct ?? 0),
                            boxShadow: "0 0 6px rgba(0,0,0,.4)",
                          }}
                          title={`Strength ${platoon.strengthPct}% (${platoon.condition})`}
                        />
                        <div style={{ fontWeight: 800 }}>{platoon.name}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setExpandedPlatoonId(
                              detailOpen ? null : platoon.id,
                            );
                            setSelectedPlatoonId(platoon.id);
                            setSelectedTerritory(platoon.territoryId);
                          }}
                        >
                          {detailOpen ? "Collapse" : "Expand"}
                        </button>
                        <span
                          title={statusLabel}
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            background: statusColor,
                            boxShadow: `0 0 6px ${statusColor}66`,
                            flexShrink: 0,
                            alignSelf: "center",
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>
                      {nationLabel(platoon.nation, customNations)} ·{" "}
                      {platoon.condition} · {platoon.strengthPct}% · MP{" "}
                      {platoon.mpBase}
                      {platoon.entrenched ? " · ENTRENCHED" : ""}
                      {formatTraits(platoon.traits)
                        ? ` · ${formatTraits(platoon.traits)}`
                        : ""}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                      Territory:{" "}
                      {formatTerritoryLabel(
                        platoon.territoryId,
                        territoryNameById,
                      )}{" "}
                      · Faction: {factionLabel(platoon.faction, customs)}
                    </div>
                  </div>
                  {orderPanelOpen ? (
                    <div
                      style={{
                        border: "1px solid rgba(255,255,255,.12)",
                        borderRadius: 10,
                        padding: 10,
                        background: "rgba(0,0,0,.18)",
                        display: "grid",
                        gap: 8,
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>
                        Issue order · Turn {turnNumber}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>
                        Choose an order type, then select a highlighted
                        territory on the map.
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gap: 6,
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(120px, 1fr))",
                        }}
                      >
                        {(
                          [
                            ["MOVE", "Move"],
                            ["HOLD", "Hold"],
                            ["RECON", "Recon"],
                            ["INTEL", "Intel"],
                          ] as const
                        ).map(([value, label]) => {
                          const isActive =
                            orderDraftType === value &&
                            selectedPlatoonId === platoon.id;
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => {
                                setSelectedPlatoonId(platoon.id);
                                setOrderDraftType(value);
                                setPendingOrderPlatoonId(platoon.id);
                              }}
                              style={{
                                textAlign: "left",
                                padding: "6px 8px",
                                borderRadius: 8,
                                border: "1px solid rgba(255,255,255,.12)",
                                background: isActive
                                  ? "rgba(59,130,246,.2)"
                                  : "rgba(0,0,0,.12)",
                                fontWeight: 600,
                              }}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.75 }}>
                        {orderDraftType && selectedPlatoonId === platoon.id
                          ? "Targets are highlighted on the map. Click one to draft the order."
                          : "No order type selected yet."}
                      </div>
                    </div>
                  ) : null}
                  {detailOpen && expandedPlatoon ? (
                    <div
                      style={{
                        border: "1px solid rgba(255,255,255,.12)",
                        borderRadius: 10,
                        padding: 10,
                        background: "rgba(0,0,0,.18)",
                        display: "grid",
                        gap: 8,
                      }}
                    >
                      <div style={{ fontWeight: 900 }}>Platoon Details</div>
                      <div style={{ display: "grid", gap: 4 }}>
                        <div>
                          <b>Name:</b> {expandedPlatoon.name}
                        </div>
                        <div>
                          <b>Nation:</b>{" "}
                          {nationLabel(expandedPlatoon.nation, customNations)}
                        </div>
                        <div>
                          <b>Faction:</b>{" "}
                          {factionLabel(expandedPlatoon.faction, customs)}
                        </div>
                        <div>
                          <b>Condition:</b> {expandedPlatoon.condition}
                        </div>
                        <div>
                          <b>Strength:</b> {expandedPlatoon.strengthPct}%
                        </div>
                        <div>
                          <b>Move:</b> MP {expandedPlatoon.mpBase}
                        </div>
                        <div>
                          <b>Entrenched:</b>{" "}
                          {expandedPlatoon.entrenched ? "Yes" : "No"}
                        </div>
                        <div>
                          <b>Traits:</b>{" "}
                          {formatTraits(expandedPlatoon.traits) || "—"}
                        </div>
                        <div>
                          <b>Class:</b> {classStyles[selectedClass].label}
                        </div>
                        <div>
                          <b>Campaign Role:</b> {selectedArchetype.role}
                        </div>
                        <div>
                          <b>Strengths:</b>{" "}
                          {selectedArchetype.strengths.join(", ")}
                        </div>
                        <div>
                          <b>Weaknesses:</b>{" "}
                          {selectedArchetype.weaknesses.join(", ")}
                        </div>
                      </div>

                      <hr
                        style={{
                          borderColor: "rgba(255,255,255,.12)",
                          margin: "10px 0",
                        }}
                      />

                      <div style={{ display: "grid", gap: 6 }}>
                        <div style={{ fontWeight: 800 }}>Rename</div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <input
                            value={renameDraft}
                            onChange={(e) => setRenameDraft(e.target.value)}
                            placeholder="New name..."
                            style={{ flex: 1 }}
                          />
                          <button
                            type="button"
                            onClick={applyRename}
                            disabled={!renameDraft.trim()}
                          >
                            Save
                          </button>
                        </div>
                      </div>

                      <hr
                        style={{
                          borderColor: "rgba(255,255,255,.12)",
                          margin: "10px 0",
                        }}
                      />

                      <div style={{ display: "grid", gap: 6 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 8,
                          }}
                        >
                          <div style={{ fontWeight: 800 }}>Refit</div>
                          <div style={{ fontSize: 12, opacity: 0.8 }}>
                            Cost: <b>{refitPct * COST_REFIT_PER_1}</b> (per +
                            {refitPct}%)
                          </div>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                          }}
                        >
                          <input
                            type="number"
                            value={refitPct}
                            onChange={(e) =>
                              setRefitPct(
                                clamp(Number(e.target.value || 0), 1, 100),
                              )
                            }
                            style={{ width: 90 }}
                          />
                          <div style={{ fontSize: 12, opacity: 0.8 }}>
                            Strength goes up (max 100%). May improve condition
                            if ≥80%.
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={applyRefit}
                          disabled={
                            expandedPlatoon.strengthPct >= 100 ||
                            !mustMatchNation ||
                            !canAfford(refitPct * COST_REFIT_PER_1)
                          }
                          title={
                            !mustMatchNation
                              ? "Switch Viewer nation to match platoon nation to spend supplies."
                              : undefined
                          }
                        >
                          Refit (+{refitPct}%)
                        </button>
                      </div>

                      <hr
                        style={{
                          borderColor: "rgba(255,255,255,.12)",
                          margin: "10px 0",
                        }}
                      />

                      <div style={{ display: "grid", gap: 8 }}>
                        <div style={{ fontWeight: 800 }}>Upgrades</div>

                        <div style={{ display: "grid", gap: 6 }}>
                          <button
                            type="button"
                            onClick={upgradeMobility}
                            disabled={
                              expandedPlatoon.mpBase >= 3 ||
                              !mustMatchNation ||
                              !canAfford(COST_UPGRADE_MP)
                            }
                          >
                            Mobility +1 MP (cost {COST_UPGRADE_MP}){" "}
                            {expandedPlatoon.mpBase >= 3 ? "· MAX" : ""}
                          </button>

                          <button
                            type="button"
                            onClick={upgradeCondition}
                            disabled={
                              expandedPlatoon.condition === "FRESH" ||
                              !mustMatchNation ||
                              !canAfford(COST_UPGRADE_CONDITION)
                            }
                          >
                            Readiness +1 step (cost {COST_UPGRADE_CONDITION}){" "}
                            {expandedPlatoon.condition === "FRESH"
                              ? "· MAX"
                              : ""}
                          </button>
                        </div>
                      </div>

                      <hr
                        style={{
                          borderColor: "rgba(255,255,255,.12)",
                          margin: "10px 0",
                        }}
                      />

                      <div style={{ display: "grid", gap: 8 }}>
                        <div style={{ fontWeight: 800 }}>Specialisms</div>

                        <button
                          type="button"
                          onClick={() => addTrait("RECON", COST_TRAIT_RECON)}
                          disabled={
                            hasTrait("RECON") ||
                            !mustMatchNation ||
                            !canAfford(COST_TRAIT_RECON)
                          }
                        >
                          Recon (cost {COST_TRAIT_RECON}){" "}
                          {hasTrait("RECON") ? "· OWNED" : ""}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            addTrait("ENGINEERS", COST_TRAIT_ENGINEERS)
                          }
                          disabled={
                            hasTrait("ENGINEERS") ||
                            !mustMatchNation ||
                            !canAfford(COST_TRAIT_ENGINEERS)
                          }
                        >
                          Engineers (cost {COST_TRAIT_ENGINEERS}){" "}
                          {hasTrait("ENGINEERS") ? "· OWNED" : ""}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            addTrait("ARMOURED", COST_TRAIT_ARMOURED)
                          }
                          disabled={
                            hasTrait("ARMOURED") ||
                            !mustMatchNation ||
                            !canAfford(COST_TRAIT_ARMOURED)
                          }
                        >
                          Armoured (cost {COST_TRAIT_ARMOURED}){" "}
                          {hasTrait("ARMOURED") ? "· OWNED" : ""}
                        </button>

                        <div style={{ fontSize: 12, opacity: 0.75 }}>
                          Effects get wired into turn resolution next
                          (Recon→intel, Engineers→fortifications,
                          Armoured→breakthrough/logistics).
                        </div>
                      </div>

                      <hr
                        style={{
                          borderColor: "rgba(255,255,255,.12)",
                          margin: "10px 0",
                        }}
                      />

                      <div style={{ display: "grid", gap: 8 }}>
                        <div style={{ fontWeight: 800 }}>Fortify</div>
                        <button
                          type="button"
                          onClick={toggleEntrench}
                          disabled={
                            !mustMatchNation ||
                            (!expandedPlatoon.entrenched &&
                              !canAfford(COST_TOGGLE_ENTRENCH))
                          }
                        >
                          {expandedPlatoon.entrenched
                            ? "Remove Entrenchment"
                            : `Entrench (cost ${COST_TOGGLE_ENTRENCH})`}
                        </button>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>
                          We’ll apply entrenchment as a combat modifier when we
                          wire battle resolution.
                        </div>
                      </div>

                      <div style={{ fontSize: 12, opacity: 0.75 }}>
                        Note: supplies are spent from the platoon’s nation —
                        switch Viewer nation to match to apply upgrades/orders.
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            No platoons assigned to this nation yet.
          </div>
        )}
      </section>

      <section
        style={{
          border: "1px solid rgba(255,255,255,.12)",
          borderRadius: 12,
          padding: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 0 }}>Draft Orders</h3>
          <button
            type="button"
            onClick={() => submitFactionOrders(turnNumber, viewerNation)}
            disabled={!draftOrders.length}
          >
            Submit Orders
          </button>
        </div>
        <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>
          Order flexibility: <b>{doctrineStats.orderFlexibility}</b>{" "}
          {canCancelOrders
            ? "(draft orders can be canceled)"
            : "(no edits without doctrine/upgrades)"}
        </div>
        {draftOrders.length ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {draftOrders.map((order) => {
              const platoonName =
                platoonsById[order.platoonId]?.name ?? order.platoonId;
              return (
                <li
                  key={order.id}
                  style={{ display: "flex", gap: 8, alignItems: "center" }}
                >
                  <div style={{ flex: 1 }}>
                    <b>{order.type}</b> · {platoonName}{" "}
                    {order.type === "RECON" || order.type === "INTEL"
                      ? `→ ${
                          order.reconTargets?.length
                            ? formatTerritoryList(
                                order.reconTargets ?? [],
                                territoryNameById,
                              )
                            : "—"
                        }`
                      : `→ ${
                          order.path?.length
                            ? formatTerritoryList(
                                order.path ?? [],
                                territoryNameById,
                              )
                            : formatTerritoryLabel(
                                order.from,
                                territoryNameById,
                              )
                        }`}
                  </div>
                  <button
                    type="button"
                    onClick={() => cancelDraftOrder(turnNumber, order.id)}
                    disabled={!canCancelOrders}
                    title={
                      canCancelOrders
                        ? "Cancel draft order"
                        : "Requires order flexibility"
                    }
                  >
                    Cancel
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            No draft orders yet. Select a platoon above to issue actions.
          </div>
        )}
      </section>
    </div>
  );
}
