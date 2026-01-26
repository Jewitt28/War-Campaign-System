import { useMemo, useState, useEffect } from "react";
import {
  UPGRADE_DEFS,
  UPGRADES_BY_ID,
  type AppliedUpgrade,
  type UpgradeDef,
  type UpgradeScope,
} from "../data/upgrades";
import { useCampaignStore } from "../store/useCampaignStore";
import StrategicNodeCard from "./StrategicNodeCard";
import { getUpgradeEligibility } from "../strategy/selectors/getUpgradeEligibility";

type StatusFilter = "ALL" | "ELIGIBLE" | "LOCKED" | "APPLIED";
type TagFilter =
  | "SUPPLY"
  | "INTEL"
  | "FORT"
  | "OPS"
  | "AIR"
  | "NAVAL"
  | "DIPLOMACY";

const FILTER_TAGS: TagFilter[] = ["SUPPLY", "INTEL", "FORT", "OPS"];

const upgradeStatusFor = (
  upgrade: UpgradeDef,
  eligibility: ReturnType<typeof getUpgradeEligibility>,
  appliedForTarget: number,
): "AVAILABLE" | "LOCKED" | "COMPLETED" => {
  if (appliedForTarget > 0 || (upgrade.scope === "NATION" && eligibility.appliedCount > 0)) {
    return "COMPLETED";
  }
  return eligibility.eligible ? "AVAILABLE" : "LOCKED";
};

const formatCost = (upgrade: UpgradeDef) => {
  const upkeep = upgrade.cost.upkeepPerTurn
    ? ` · Upkeep ${upgrade.cost.upkeepPerTurn}/turn`
    : "";
  return `Cost ${upgrade.cost.points}${upkeep}`;
};

const formatEffects = (upgrade: UpgradeDef) =>
  upgrade.effects.map((effect) => `${effect.type} +${effect.value}`).join(", ");

const groupApplied = (applied: AppliedUpgrade[], scope: UpgradeScope) =>
  applied.filter((entry) => entry.scope === scope);

export default function UpgradesPanel() {
  const viewerNation = useCampaignStore((s) => s.viewerNation);
  const viewerMode = useCampaignStore((s) => s.viewerMode);
  const selectedTerritoryId = useCampaignStore((s) => s.selectedTerritoryId);
  const selectedPlatoonId = useCampaignStore((s) => s.selectedPlatoonId);
  const territoryNameById = useCampaignStore((s) => s.territoryNameById);
  const ownerByTerritory = useCampaignStore((s) => s.ownerByTerritory);
  const platoonsById = useCampaignStore((s) => s.platoonsById);
  const nationResearchState = useCampaignStore((s) => s.nationResearchState);
  const nationDoctrineState = useCampaignStore((s) => s.nationDoctrineState);
  const nationUpgradesState = useCampaignStore((s) => s.nationUpgradesState);
  const resourcePointsByNation = useCampaignStore((s) => s.resourcePointsByNation);
  const ensureResourcePoints = useCampaignStore((s) => s.ensureResourcePoints);
  const applyUpgrade = useCampaignStore((s) => s.applyUpgrade);
  const removeUpgrade = useCampaignStore((s) => s.removeUpgrade);

  const [scope, setScope] = useState<UpgradeScope>("FORCE");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [tagFilters, setTagFilters] = useState<TagFilter[]>([]);
  const [targetTerritory, setTargetTerritory] = useState<string | null>(
    selectedTerritoryId,
  );
  const [targetPlatoon, setTargetPlatoon] = useState<string | null>(
    selectedPlatoonId,
  );

  useEffect(() => {
    ensureResourcePoints();
  }, [ensureResourcePoints]);

  useEffect(() => {
    if (selectedTerritoryId) setTargetTerritory(selectedTerritoryId);
  }, [selectedTerritoryId]);

  useEffect(() => {
    if (selectedPlatoonId) setTargetPlatoon(selectedPlatoonId);
  }, [selectedPlatoonId]);

  const doctrineState = nationDoctrineState[viewerNation];
  const researchState = nationResearchState[viewerNation];
  const upgradesState = nationUpgradesState[viewerNation];
  const resourcePoints = resourcePointsByNation[viewerNation] ?? 0;

  const ownedTerritories = useMemo(() => {
    const territoryIds = Object.keys(territoryNameById);
    const owned = territoryIds.filter(
      (id) => ownerByTerritory[id] === viewerNation,
    );
    return owned.length ? owned : territoryIds;
  }, [ownerByTerritory, territoryNameById, viewerNation]);

  const platoons = useMemo(
    () =>
      Object.values(platoonsById).filter((platoon) => platoon.nation === viewerNation),
    [platoonsById, viewerNation],
  );

  const applied = upgradesState?.applied ?? [];
  const appliedNation = groupApplied(applied, "NATION");
  const appliedTerritory = groupApplied(applied, "TERRITORY");
  const appliedForce = groupApplied(applied, "FORCE");

  const upgrades = useMemo(() => {
    if (!doctrineState || !researchState || !upgradesState) return [];
    return UPGRADE_DEFS.filter((upgrade) => upgrade.scope === scope)
      .map((upgrade) => {
        const eligibility = getUpgradeEligibility({
          upgrade,
          doctrineState,
          researchState,
          upgradesState,
          resourcePoints,
          territoryId: targetTerritory,
          platoonId: targetPlatoon,
        });
        return { upgrade, eligibility };
      })
      .filter(({ upgrade, eligibility }) => {
        if (tagFilters.length) {
          const tags = upgrade.tags ?? [];
          if (!tagFilters.some((tag) => tags.includes(tag))) return false;
        }

        const appliedForTarget =
          upgrade.scope === "TERRITORY"
            ? eligibility.appliedForTarget
            : upgrade.scope === "FORCE"
              ? eligibility.appliedForTarget
              : eligibility.appliedCount;

        if (statusFilter === "APPLIED") return appliedForTarget > 0;
        if (statusFilter === "ELIGIBLE") return eligibility.eligible;
        if (statusFilter === "LOCKED") return !eligibility.eligible;
        return true;
      });
  }, [
    doctrineState,
    researchState,
    upgradesState,
    scope,
    resourcePoints,
    targetTerritory,
    targetPlatoon,
    statusFilter,
    tagFilters,
  ]);

  if (!doctrineState || !researchState || !upgradesState) {
    return <div>Loading upgrades state...</div>;
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div>
        <h3 style={{ margin: 0 }}>Upgrades</h3>
        <div style={{ fontSize: 12, opacity: 0.75 }}>
          Resource points: <b>{resourcePoints}</b>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(["FORCE", "TERRITORY", "NATION"] as UpgradeScope[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setScope(tab)}
            style={{ fontWeight: scope === tab ? 700 : 500 }}
          >
            {tab === "FORCE" ? "Forces" : tab === "TERRITORY" ? "Territories" : "Nation"}
          </button>
        ))}
      </div>

      {scope === "TERRITORY" ? (
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 12, opacity: 0.8 }}>Target territory</span>
          <select
            value={targetTerritory ?? ""}
            onChange={(e) => setTargetTerritory(e.target.value || null)}
          >
            <option value="">Select territory</option>
            {ownedTerritories.map((id) => (
              <option key={id} value={id}>
                {territoryNameById[id] ?? id}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {scope === "FORCE" ? (
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 12, opacity: 0.8 }}>Target platoon</span>
          <select
            value={targetPlatoon ?? ""}
            onChange={(e) => setTargetPlatoon(e.target.value || null)}
          >
            <option value="">Select platoon</option>
            {platoons.map((platoon) => (
              <option key={platoon.id} value={platoon.id}>
                {platoon.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div
        style={{
          display: "grid",
          gap: 10,
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        }}
      >
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 12, opacity: 0.8 }}>Show</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            {["ALL", "ELIGIBLE", "LOCKED", "APPLIED"].map((filter) => (
              <option key={filter} value={filter}>
                {filter}
              </option>
            ))}
          </select>
        </label>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Tags</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {FILTER_TAGS.map((tag) => {
              const active = tagFilters.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    setTagFilters((prev) =>
                      active ? prev.filter((t) => t !== tag) : [...prev, tag],
                    )
                  }
                  style={{ opacity: active ? 1 : 0.6 }}
                >
                  {tag.toLowerCase()}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {upgrades.length === 0 ? (
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            No upgrades match your filters.
          </div>
        ) : (
          upgrades.map(({ upgrade, eligibility }) => {
            const appliedForTarget =
              upgrade.scope === "TERRITORY"
                ? eligibility.appliedForTarget
                : upgrade.scope === "FORCE"
                  ? eligibility.appliedForTarget
                  : eligibility.appliedCount;
            const status = upgradeStatusFor(
              upgrade,
              eligibility,
              appliedForTarget,
            );

            return (
              <StrategicNodeCard
                key={upgrade.id}
                title={upgrade.name}
                subtitle={formatCost(upgrade)}
                description={upgrade.description}
                status={status}
              >
                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  {formatEffects(upgrade)}
                </div>
                {upgrade.requiredResearch?.length ? (
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    Requires research: {upgrade.requiredResearch.join(", ")}
                  </div>
                ) : null}
                {upgrade.requiredDoctrineStances?.length ? (
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    Requires stance: {upgrade.requiredDoctrineStances.join(", ")}
                  </div>
                ) : null}
                {upgrade.requiredDoctrineTraits?.length ? (
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    Requires traits: {upgrade.requiredDoctrineTraits.join(", ")}
                  </div>
                ) : null}
                {eligibility.reasons.length ? (
                  <div style={{ fontSize: 12, opacity: 0.6 }}>
                    {eligibility.reasons.join(" · ")}
                  </div>
                ) : null}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    disabled={!eligibility.eligible}
                    onClick={() =>
                      applyUpgrade({
                        nation: viewerNation,
                        upgradeId: upgrade.id,
                        territoryId: targetTerritory,
                        platoonId: targetPlatoon,
                      })
                    }
                  >
                    Apply
                  </button>
                  {viewerMode === "GM" && appliedForTarget > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        const appliedMatch = applied.find(
                          (entry) =>
                            entry.defId === upgrade.id &&
                            (upgrade.scope === "NATION" ||
                              (upgrade.scope === "TERRITORY" &&
                                entry.scope === "TERRITORY" &&
                                entry.territoryId === targetTerritory) ||
                              (upgrade.scope === "FORCE" &&
                                entry.scope === "FORCE" &&
                                entry.platoonId === targetPlatoon)),
                        );
                        if (appliedMatch) {
                          removeUpgrade(viewerNation, appliedMatch.id);
                        }
                      }}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </StrategicNodeCard>
            );
          })
        )}
      </div>

      <section
        style={{
          border: "1px solid rgba(255,255,255,.12)",
          borderRadius: 12,
          padding: 12,
          display: "grid",
          gap: 10,
        }}
      >
        <h4 style={{ margin: 0 }}>Applied upgrades</h4>

        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 600 }}>Nation</div>
          {appliedNation.length === 0 ? (
            <div style={{ fontSize: 12, opacity: 0.7 }}>None applied.</div>
          ) : (
            appliedNation.map((entry) => (
              <div key={entry.id} style={{ fontSize: 12 }}>
                {UPGRADES_BY_ID[entry.defId]?.name ?? entry.defId}
              </div>
            ))
          )}
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 600 }}>Territories</div>
          {appliedTerritory.length === 0 ? (
            <div style={{ fontSize: 12, opacity: 0.7 }}>None applied.</div>
          ) : (
            Object.entries(
              appliedTerritory.reduce<Record<string, AppliedUpgrade[]>>(
                (acc, entry) => {
                  acc[entry.territoryId] = acc[entry.territoryId] ?? [];
                  acc[entry.territoryId].push(entry);
                  return acc;
                },
                {},
              ),
            ).map(([territoryId, entries]) => (
              <div key={territoryId} style={{ fontSize: 12 }}>
                <b>{territoryNameById[territoryId] ?? territoryId}:</b>{" "}
                {entries
                  .map((entry) => UPGRADES_BY_ID[entry.defId]?.name ?? entry.defId)
                  .join(", ")}
              </div>
            ))
          )}
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 600 }}>Forces</div>
          {appliedForce.length === 0 ? (
            <div style={{ fontSize: 12, opacity: 0.7 }}>None applied.</div>
          ) : (
            Object.entries(
              appliedForce.reduce<Record<string, AppliedUpgrade[]>>((acc, entry) => {
                acc[entry.platoonId] = acc[entry.platoonId] ?? [];
                acc[entry.platoonId].push(entry);
                return acc;
              }, {}),
            ).map(([platoonId, entries]) => (
              <div key={platoonId} style={{ fontSize: 12 }}>
                <b>{platoonsById[platoonId]?.name ?? platoonId}:</b>{" "}
                {entries
                  .map((entry) => UPGRADES_BY_ID[entry.defId]?.name ?? entry.defId)
                  .join(", ")}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
