import { useMemo } from "react";
import type { NormalizedData } from "../data/theatres";
import { NATION_BY_ID, type BaseNationKey } from "../setup/NationDefinitions";
import { useCampaignStore } from "../store/useCampaignStore";
import { factionLabel } from "../store/factionLabel";
import { getFactionAccent } from "./factionColors";

type Props = {
  data: NormalizedData | null;
};

export default function NationCommandPanel({ data }: Props) {
  const viewerNation = useCampaignStore((s) => s.viewerNation);
  const viewerFaction = useCampaignStore((s) => s.viewerFaction);
  const customNations = useCampaignStore((s) => s.customNations);
  const customs = useCampaignStore((s) => s.customs);
  const turnNumber = useCampaignStore((s) => s.turnNumber);
  const platoonsById = useCampaignStore((s) => s.platoonsById);
  const ordersByTurn = useCampaignStore((s) => s.ordersByTurn);
  const suppliesByFaction = useCampaignStore((s) => s.suppliesByFaction);
  const selectedPlatoonId = useCampaignStore((s) => s.selectedPlatoonId);
  const setSelectedPlatoonId = useCampaignStore((s) => s.setSelectedPlatoonId);
  const setSelectedTerritory = useCampaignStore((s) => s.setSelectedTerritory);

  const nationLabel =
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
  const supplies = suppliesByFaction?.[viewerFaction] ?? 0;
  const accentColor = getFactionAccent({
    viewerNation,
    viewerFaction,
    customNations,
    customs,
  });

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
        <h2 style={{ margin: 0 }}>{nationLabel} Command</h2>
        <div style={{ opacity: 0.8 }}>
          Nation overview · Faction alignment:{" "}
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
              return (
                <button
                  key={platoon.id}
                  type="button"
                  onClick={() => {
                    setSelectedPlatoonId(platoon.id);
                    setSelectedTerritory(platoon.territoryId);
                  }}
                  style={{
                    textAlign: "left",
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,.12)",
                    background:
                      selectedPlatoonId === platoon.id
                        ? "rgba(255,255,255,.06)"
                        : "rgba(0,0,0,.12)",
                    cursor: "pointer",
                    display: "grid",
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <div style={{ fontWeight: 800 }}>{platoon.name}</div>
                    <span
                      title={statusLabel}
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: statusColor,
                        boxShadow: `0 0 6px ${statusColor}66`,
                        flexShrink: 0,
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>
                    {platoon.condition} · {platoon.strengthPct}% ·{" "}
                    {platoon.territoryId}
                  </div>
                </button>
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
        <h3 style={{ marginTop: 0 }}>Draft Orders</h3>
        {draftOrders.length ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {draftOrders.map((order) => (
              <li key={order.id}>
                <b>{order.type}</b> · {order.platoonId}{" "}
                {order.type === "RECON" || order.type === "INTEL"
                  ? `→ ${(order.reconTargets ?? []).join(", ") || "—"}`
                  : `→ ${order.path?.join(" → ") ?? order.from ?? "Hold"}`}
              </li>
            ))}
          </ul>
        ) : (
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            No draft orders yet. Use the Orders tab to issue actions.
          </div>
        )}
      </section>
    </div>
  );
}
