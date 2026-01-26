import { useMemo } from "react";
import {
  DOCTRINE_STANCES,
  DOCTRINE_STANCES_BY_ID,
  DOCTRINE_TRAITS,
  type DoctrineEffect,
} from "../data/doctrine";
import { useCampaignStore } from "../store/useCampaignStore";
import StrategicNodeCard from "./StrategicNodeCard";

const TAG_LABELS: Record<string, string> = {
  OFFENSE: "Offense",
  DEFENSE: "Defense",
  MOBILITY: "Mobility",
  ATTRITION: "Attrition",
  DECEPTION: "Deception",
  LOGISTICS: "Logistics",
};

function describeEffect(effect: DoctrineEffect) {
  switch (effect.type) {
    case "ORDER_FLEXIBILITY":
      return `Order flexibility +${effect.value}`;
    case "FORCED_MARCH_RISK_REDUCTION":
      return `Forced march risk −${effect.value}%`;
    case "WITHDRAWAL_SUCCESS_BONUS":
      return `Withdrawal bonus +${effect.value}`;
    case "DEFENSE_BONUS":
      return `Defense bonus +${effect.value}`;
    case "OFFENSE_BONUS":
      return `Offense bonus +${effect.value}`;
    case "SUPPLY_TOLERANCE":
      return `Supply tolerance +${effect.value}`;
    case "RECON_INTEL_BONUS":
      return `Recon/intel bonus +${effect.value}`;
    case "FORTIFY_BUILD_SPEED":
      return `Fortify build speed +${effect.value}%`;
    case "MOMENTUM_GAIN_BONUS":
      return `Momentum gain +${effect.value}`;
    case "DECEPTION_UNLOCK":
      return `Unlock action: ${effect.actionId}`;
    case "DIPLOMACY_PRESSURE_MOD":
      return `Diplomacy pressure +${effect.value}`;
    default:
      return "Unknown effect";
  }
}

function stanceStatus(
  activeStanceId: string,
  stanceId: string,
  canSwitch: boolean,
) {
  if (activeStanceId === stanceId) return "ACTIVE";
  return canSwitch ? "AVAILABLE" : "LOCKED";
}

export default function DoctrinePanel() {
  const viewerNation = useCampaignStore((s) => s.viewerNation);
  const turnNumber = useCampaignStore((s) => s.turnNumber);
  const phase = useCampaignStore((s) => s.phase);
  const doctrineState = useCampaignStore((s) => s.nationDoctrineState);
  const researchState = useCampaignStore((s) => s.nationResearchState);
  const switchDoctrineStance = useCampaignStore((s) => s.switchDoctrineStance);
  const equipDoctrineTrait = useCampaignStore((s) => s.equipDoctrineTrait);
  const unequipDoctrineTrait = useCampaignStore((s) => s.unequipDoctrineTrait);

  const state = doctrineState[viewerNation];
  const research = researchState[viewerNation];
  const activeStance = state
    ? DOCTRINE_STANCES_BY_ID[state.activeStanceId]
    : null;

  const canManageTraits = phase === "SETUP" || phase === "ORDERS";
  const stanceLockedUntil =
    state?.stanceLockedUntilTurn && state.stanceLockedUntilTurn > turnNumber
      ? state.stanceLockedUntilTurn
      : undefined;

  const equippedTraits = useMemo(() => {
    if (!state) return [];
    return state.equippedTraitIds
      .map((id) => DOCTRINE_TRAITS.find((trait) => trait.id === id))
      .filter(Boolean);
  }, [state]);

  const usedSlots = useMemo(() => {
    return equippedTraits.reduce((sum, trait) => sum + (trait?.slotCost ?? 0), 0);
  }, [equippedTraits]);

  const canSwitchStance = (stanceId: string) => {
    if (!state) return false;
    if (stanceId === state.activeStanceId) return false;
    if (stanceLockedUntil) return false;
    const stance = DOCTRINE_STANCES_BY_ID[stanceId];
    if (!stance) return false;
    if (stance.requiredResearch?.length) {
      return stance.requiredResearch.every((id) =>
        research?.completedResearch.includes(id),
      );
    }
    return true;
  };

  const traitLockReason = (traitId: string) => {
    if (!state || !research) return "Unavailable";
    const trait = DOCTRINE_TRAITS.find((t) => t.id === traitId);
    if (!trait) return "Unavailable";
    if (trait.requiredResearch?.length) {
      const missing = trait.requiredResearch.find(
        (id) => !research.completedResearch.includes(id),
      );
      if (missing) return `Requires ${missing}`;
    }
    if (trait.prerequisitesTraits?.length) {
      const missing = trait.prerequisitesTraits.find(
        (id) => !state.equippedTraitIds.includes(id),
      );
      if (missing) return `Requires trait ${missing}`;
    }
    if (usedSlots + trait.slotCost > state.traitSlots) {
      return "Not enough trait slots";
    }
    if (!canManageTraits) return "Strategic phase only";
    return null;
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section
        style={{
          border: "1px solid rgba(255,255,255,.12)",
          borderRadius: 12,
          padding: 12,
        }}
      >
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>Active Doctrine</div>
          {activeStance ? (
            <>
              <div style={{ fontWeight: 700 }}>{activeStance.name}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                {activeStance.description}
              </div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                Tags:{" "}
                {activeStance.tags.map((tag) => TAG_LABELS[tag] ?? tag).join(", ")}
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
                {activeStance.effects.map((effect, idx) => (
                  <li key={`${effect.type}-${idx}`}>{describeEffect(effect)}</li>
                ))}
              </ul>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                {stanceLockedUntil
                  ? `Stance locked until turn ${stanceLockedUntil}.`
                  : "Stance can be switched this turn."}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              No doctrine stance selected.
            </div>
          )}
        </div>
      </section>

      <section
        style={{
          border: "1px solid rgba(255,255,255,.12)",
          borderRadius: 12,
          padding: 12,
          display: "grid",
          gap: 12,
        }}
      >
        <div style={{ fontWeight: 800 }}>Doctrine Stances</div>
        <div
          style={{
            display: "grid",
            gap: 10,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          {DOCTRINE_STANCES.map((stance) => {
            const canSwitch = canSwitchStance(stance.id);
            const status = stanceStatus(
              state?.activeStanceId ?? "",
              stance.id,
              canSwitch,
            );
            return (
              <StrategicNodeCard
                key={stance.id}
                title={stance.name}
                subtitle={stance.tags.map((tag) => TAG_LABELS[tag] ?? tag).join(", ")}
                description={stance.description}
                status={status}
                selected={state?.activeStanceId === stance.id}
                onSelect={
                  canSwitch ? () => switchDoctrineStance(viewerNation, stance.id) : undefined
                }
              >
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
                  {stance.effects.map((effect, idx) => (
                    <li key={`${stance.id}-${idx}`}>
                      {describeEffect(effect)}
                    </li>
                  ))}
                </ul>
                {stanceLockedUntil && status === "LOCKED" ? (
                  <div style={{ fontSize: 12, opacity: 0.75 }}>
                    Locked until turn {stanceLockedUntil}.
                  </div>
                ) : null}
              </StrategicNodeCard>
            );
          })}
        </div>
      </section>

      <section
        style={{
          border: "1px solid rgba(255,255,255,.12)",
          borderRadius: 12,
          padding: 12,
          display: "grid",
          gap: 12,
        }}
      >
        <div style={{ fontWeight: 800 }}>Doctrine Traits</div>
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          Trait slots: {usedSlots}/{state?.traitSlots ?? 0}
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>Equipped Traits</div>
          {equippedTraits.length ? (
            <div
              style={{
                display: "grid",
                gap: 10,
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              }}
            >
              {equippedTraits.map((trait) => {
                if (!trait) return null;
                return (
                  <StrategicNodeCard
                    key={trait.id}
                    title={trait.name}
                    subtitle={`Tier ${trait.tier} · Slot cost ${trait.slotCost}`}
                    description={trait.description}
                    status="ACTIVE"
                    onSelect={() => unequipDoctrineTrait(viewerNation, trait.id)}
                  >
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
                      {trait.effects.map((effect, idx) => (
                        <li key={`${trait.id}-${idx}`}>
                          {describeEffect(effect)}
                        </li>
                      ))}
                    </ul>
                  </StrategicNodeCard>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              No traits equipped.
            </div>
          )}
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>Available Traits</div>
          <div
            style={{
              display: "grid",
              gap: 10,
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            {DOCTRINE_TRAITS.map((trait) => {
              const isEquipped = state?.equippedTraitIds.includes(trait.id);
              const lockReason = traitLockReason(trait.id);
              const status = isEquipped ? "ACTIVE" : lockReason ? "LOCKED" : "AVAILABLE";
              return (
                <StrategicNodeCard
                  key={trait.id}
                  title={trait.name}
                  subtitle={`Tier ${trait.tier} · Slot cost ${trait.slotCost}`}
                  description={trait.description}
                  status={status}
                  onSelect={
                    !lockReason && !isEquipped
                      ? () => equipDoctrineTrait(viewerNation, trait.id)
                      : undefined
                  }
                >
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
                    {trait.effects.map((effect, idx) => (
                      <li key={`${trait.id}-effect-${idx}`}>
                        {describeEffect(effect)}
                      </li>
                    ))}
                  </ul>
                  {lockReason ? (
                    <div style={{ fontSize: 12, color: "#ffd28a" }}>
                      {lockReason}
                    </div>
                  ) : null}
                </StrategicNodeCard>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
