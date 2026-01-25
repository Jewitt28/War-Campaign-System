import { useEffect, useMemo, useState } from "react";
import type { NormalizedData } from "../data/theatres";
import { useCampaignStore } from "../store/useCampaignStore";

import PlayerDashboard from "../player/PlayerDashboard";

import PlatoonsPanel from "./PlatoonsPanel";
import TurnLogPanel from "./TurnLogPanel";
import CommandHub from "./CommandHub";
import BattlesPanel from "./BattlesPanel";
import { getFactionAccent } from "./factionColors";

type Props = { data: NormalizedData | null };

// Keep these compatible with your existing GMTools/PlayerDashboard expectations.
export type Tab =
  | "DASHBOARD"
  | "ORDERS"
  | "RESOLUTION"
  | "BATTLES"
  | "INTEL"
  | "LOG";
type RightTab = Tab | "PLATOONS";

export default function CommandPanel({ data }: Props) {
  const mode = useCampaignStore((s) => s.mode);
  //  const viewerMode = useCampaignStore((s) => s.viewerMode);
  const commandHubExpanded = useCampaignStore((s) => s.commandHubExpanded);
  const setCommandHubExpanded = useCampaignStore(
    (s) => s.setCommandHubExpanded,
  );
  const viewerMode = useCampaignStore((s) => s.viewerMode);
  const phase = useCampaignStore((s) => s.phase);
  const viewerNation = useCampaignStore((s) => s.viewerNation);
  const viewerFaction = useCampaignStore((s) => s.viewerFaction);
  const customNations = useCampaignStore((s) => s.customNations);
  const customs = useCampaignStore((s) => s.customs);
  // Temporary: while in setup, treat UI as GM-capable so GM-only panels are available.
  const gmEffective = mode === "SETUP" || viewerMode === "GM";

  const accentColor = getFactionAccent({
    viewerNation,
    viewerFaction,
    customNations,
    customs,
  });

  const [tab, setTab] = useState<RightTab>("DASHBOARD");

  const tabs: Array<{ id: RightTab; label: string; gmOnly?: boolean }> =
    useMemo(() => {
      return [
        { id: "DASHBOARD", label: "Dashboard" },
        { id: "ORDERS", label: "Orders" },
        { id: "RESOLUTION", label: "Resolution" },
        { id: "BATTLES", label: "Battles" },
        { id: "PLATOONS", label: "Platoons" },
        { id: "INTEL", label: "Intel/Owners", gmOnly: true },
        { id: "LOG", label: "Log" },
      ];
    }, []);

  const playerTabsByPhase: Record<string, RightTab[]> = useMemo(
    () => ({
      SETUP: ["DASHBOARD", "LOG"],
      ORDERS: ["DASHBOARD", "ORDERS", "PLATOONS", "LOG"],
      RESOLUTION: ["DASHBOARD", "RESOLUTION", "LOG"],
      BATTLES: ["DASHBOARD", "BATTLES", "LOG"],
    }),
    [],
  );

  const visibleTabs = useMemo(() => {
    const allowed = gmEffective
      ? tabs
      : tabs.filter((t) => (playerTabsByPhase[phase] ?? []).includes(t.id));
    return allowed.filter((t) => !t.gmOnly || gmEffective);
  }, [gmEffective, phase, playerTabsByPhase, tabs]);

  const safeTab = visibleTabs.some((t) => t.id === tab)
    ? tab
    : (visibleTabs[0]?.id ?? "DASHBOARD");

  const content = (() => {
    switch (safeTab) {
      case "DASHBOARD":
        if (gmEffective) {
          return (
            <GMPanelNotice message="GM tools are centralized in the left panel." />
          );
        }
        return commandHubExpanded ? (
          <GMPanelNotice message="Command Hub is expanded in the center panel." />
        ) : (
          <CommandHub data={data} variant="full" />
        );
      // return gmEffective ? <GMTools data={data} setTab={tab} /> : <CommandHub data={data}  />;
      case "ORDERS":
        return <OrdersPhasePanel />;
      case "RESOLUTION":
        return <ResolutionPhasePanel />;
      case "BATTLES":
        return gmEffective ? (
          <BattlesPanel />
        ) : (
          <PhaseWaitingPanel phase={phase} />
        );
      case "LOG":
        return <PlayerDashboard data={data} tab={safeTab} />;
      case "INTEL":
        return gmEffective ? (
          <GMPanelNotice message="Intel controls are available in the GM tools panel." />
        ) : (
          <div>Not available in PLAYER mode.</div>
        );
      case "PLATOONS":
        return <PlatoonsPanel data={data} />;
      default:
        return null;
    }
  })();

  return (
    <div
      style={{
        padding: 12,
        border: `1px solid ${accentColor}55`,
        borderRadius: 8,
        background: `linear-gradient(135deg, ${accentColor}12, rgba(0,0,0,0))`,
      }}
    >
      {/* TOP: Always-visible inspector */}
      <MapInspector />

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 10,
          alignItems: "center",
        }}
      >
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              opacity: safeTab === t.id ? 1 : 0.75,
              fontWeight: safeTab === t.id ? 800 : 600,
            }}
          >
            {t.label}
          </button>
        ))}
        {!gmEffective && safeTab === "DASHBOARD" ? (
          <button
            type="button"
            onClick={() => setCommandHubExpanded(!commandHubExpanded)}
            style={{ marginLeft: "auto" }}
          >
            {commandHubExpanded ? "Collapse Hub" : "Expand Hub"}
          </button>
        ) : null}
      </div>
      {/* MIDDLE: Tab content */}
      <div
        style={{
          border: "1px solid rgba(255,255,255,.10)",
          borderRadius: 10,
          padding: 10,
        }}
      >
        {content}
      </div>

      {/* BOTTOM: Always-visible mini log */}
      <div
        style={{ marginTop: 12, borderTop: "1px solid rgba(255,255,255,.12)" }}
      >
        <TurnLogPanel defaultOpen={false} maxHeight={260} />
      </div>
    </div>
  );
}

function MapInspector() {
  const selectedTerritoryId = useCampaignStore((s) => s.selectedTerritoryId);
  const ownerByTerritory = useCampaignStore((s) => s.ownerByTerritory);

  const viewerNation = useCampaignStore((s) => s.viewerNation);
  const viewerMode = useCampaignStore((s) => s.viewerMode);
  const mode = useCampaignStore((s) => s.mode);
  const intelByTerritory = useCampaignStore((s) => s.intelByTerritory);

  const gmEffective = mode === "SETUP" || viewerMode === "GM";

  const intel = selectedTerritoryId
    ? gmEffective
      ? "FULL"
      : (intelByTerritory[selectedTerritoryId]?.[viewerNation] ?? "NONE")
    : null;

  const owner = selectedTerritoryId
    ? (ownerByTerritory[selectedTerritoryId] ?? "neutral")
    : null;

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 8,
        }}
      >
        <div style={{ fontWeight: 900 }}>Selected Territory</div>
        <div style={{ fontSize: 12, opacity: 0.75 }}>
          {gmEffective ? "GM view" : `Player view (${viewerNation})`}
        </div>
      </div>

      <div
        style={{
          border: "1px solid rgba(255,255,255,.12)",
          borderRadius: 10,
          padding: 10,
          background: "rgba(0,0,0,.10)",
        }}
      >
        <div>
          <b>ID:</b> {selectedTerritoryId ?? "—"}
        </div>

        {selectedTerritoryId ? (
          <>
            <div style={{ marginTop: 4 }}>
              <b>Intel:</b> {intel}
            </div>
            <div style={{ marginTop: 4 }}>
              <b>Owner:</b> {String(owner)}
            </div>
          </>
        ) : (
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
            Click a territory on the map to populate details and platoon
            controls.
          </div>
        )}
      </div>
    </div>
  );
}
function OrdersPhasePanel() {
  const viewerNation = useCampaignStore((s) => s.viewerNation);
  const turnNumber = useCampaignStore((s) => s.turnNumber);
  const ordersByTurn = useCampaignStore((s) => s.ordersByTurn);
  const platoonsById = useCampaignStore((s) => s.platoonsById);
  const selectedPlatoonId = useCampaignStore((s) => s.selectedPlatoonId);
  const adjacencyByTerritory = useCampaignStore((s) => s.adjacencyByTerritory);
  const setPlatoonOrderMove = useCampaignStore((s) => s.setPlatoonOrderMove);
  const setPlatoonOrderHold = useCampaignStore((s) => s.setPlatoonOrderHold);
  const submitFactionOrders = useCampaignStore((s) => s.submitFactionOrders);
  const setPlatoonOrderRecon = useCampaignStore((s) => s.setPlatoonOrderRecon);
  const selectedPlatoonId = useCampaignStore((s) => s.selectedPlatoonId);

  const setPlatoonOrderIntel = useCampaignStore((s) => s.setPlatoonOrderIntel);
  const orderDraftType = useCampaignStore((s) => s.orderDraftType);
  const setOrderDraftType = useCampaignStore((s) => s.setOrderDraftType);
  const setSelectedPlatoonId = useCampaignStore((s) => s.setSelectedPlatoonId);

  const [orderType, setOrderType] = useState<
    "MOVE" | "HOLD" | "RECON" | "INTEL"
  >("MOVE");
  const [orderType, setOrderType] = useState<
    "MOVE" | "HOLD" | "RECON" | "INTEL"
  >("MOVE");
  const [orderPlatoonId, setOrderPlatoonId] = useState<string>("");
  const [forcedMarch, setForcedMarch] = useState(false);
  const [step1, setStep1] = useState("");
  const [step2, setStep2] = useState("");
  const [reconTarget1, setReconTarget1] = useState("");
  const [reconTarget2, setReconTarget2] = useState("");

  useEffect(() => {
    if (selectedPlatoonId && selectedPlatoonId !== orderPlatoonId) {
      setOrderPlatoonId(selectedPlatoonId);
      setStep1("");
      setStep2("");
      setReconTarget1("");
      setReconTarget2("");
      setForcedMarch(false);
    }
  }, [orderPlatoonId, selectedPlatoonId]);

  useEffect(() => {
    if (orderDraftType) {
      setOrderType(orderDraftType);
    }
  }, [orderDraftType]);

  const currentOrders = useMemo(() => {
    const byTurn = ordersByTurn?.[turnNumber] ?? {};
    return Object.values(byTurn)
      .flat()
      .filter((o) => {
        const platoon = platoonsById[o.platoonId];
        return platoon?.nation === viewerNation && !o.submittedAt;
      });
  }, [ordersByTurn, platoonsById, turnNumber, viewerNation]);
  const eligiblePlatoons = useMemo(
    () => Object.values(platoonsById).filter((p) => p.nation === viewerNation),
    [platoonsById, viewerNation],
  );

  const selectedPlatoon = orderPlatoonId
    ? platoonsById[orderPlatoonId]
    : undefined;
  const step1Options = useMemo(() => {
    if (!selectedPlatoon) return [];
    return adjacencyByTerritory[selectedPlatoon.territoryId] ?? [];
  }, [adjacencyByTerritory, selectedPlatoon]);

  const step2Options = useMemo(() => {
    if (!forcedMarch || !step1) return [];
    return adjacencyByTerritory[step1] ?? [];
  }, [adjacencyByTerritory, forcedMarch, step1]);

  const reconOptions = step1Options;
  const canReconTwice = !!selectedPlatoon?.traits?.includes("RECON");

  const createOrder = () => {
    if (!orderPlatoonId || !selectedPlatoon) return;
    if (orderType === "HOLD") {
      setPlatoonOrderHold(turnNumber, selectedPlatoon.faction, orderPlatoonId);
      return;
    }
    if (orderType === "RECON") {
      if (!reconTarget1) return;
      const targets = canReconTwice
        ? [reconTarget1, reconTarget2].filter(Boolean)
        : [reconTarget1];
      setPlatoonOrderRecon(
        turnNumber,
        selectedPlatoon.faction,
        orderPlatoonId,
        targets,
      );
      return;
    }
    if (orderType === "INTEL") {
      if (!reconTarget1) return;
      setPlatoonOrderIntel(
        turnNumber,
        selectedPlatoon.faction,
        orderPlatoonId,
        reconTarget1,
      );
      return;
    }
    if (!step1) return;
    const path = forcedMarch && step2 ? [step1, step2] : [step1];
    setPlatoonOrderMove(
      turnNumber,
      selectedPlatoon.faction,
      orderPlatoonId,
      path,
      forcedMarch,
    );
  };
  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      <div>
        <h2 style={{ margin: 0 }}>Orders Phase</h2>
        <div style={{ opacity: 0.8 }}>
          Issue movement, hold, or recon orders for <b>{viewerNation}</b>. Turn{" "}
          <b>{turnNumber}</b>.
        </div>
      </div>

      <section
        style={{
          border: "1px solid rgba(255,255,255,.12)",
          borderRadius: 12,
          padding: 12,
        }}
      >
        <h3 style={{ marginTop: 0 }}>Available Orders</h3>
        <div style={{ display: "grid", gap: 8 }}>
          <OrderCard
            title="Move"
            detail="Relocate platoons to adjacent territories or forced march."
            isActive={orderDraftType === "MOVE"}
            onClick={() => {
              setOrderDraftType("MOVE");
              setOrderType("MOVE");
            }}
          />
          <OrderCard
            title="Hold"
            detail="Fortify positions and maintain defensive readiness."
            isActive={orderDraftType === "HOLD"}
            onClick={() => {
              setOrderDraftType("HOLD");
              setOrderType("HOLD");
            }}
          />
          <OrderCard
            title="Recon"
            detail="Gather intel and reveal enemy positions."
            isActive={orderDraftType === "RECON"}
            onClick={() => {
              setOrderDraftType("RECON");
              setOrderType("RECON");
            }}
          />
          <OrderCard
            title="Intel"
            detail="Assign intel assets to contested theatres."
            isActive={orderDraftType === "INTEL"}
            onClick={() => {
              setOrderDraftType("INTEL");
              setOrderType("INTEL");
            }}
          />
        </div>
      </section>
      <section
        style={{
          border: "1px solid rgba(255,255,255,.12)",
          borderRadius: 12,
          padding: 12,
        }}
      >
        <h3 style={{ marginTop: 0 }}>Create Order</h3>
        <div style={{ display: "grid", gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>
              Platoon
            </div>
            <select
              value={orderPlatoonId}
              onChange={(e) => {
                setOrderPlatoonId(e.target.value);
                setSelectedPlatoonId(e.target.value || null);
                setStep1("");
                setStep2("");
                setReconTarget1("");
                setReconTarget2("");
                setForcedMarch(false);
              }}
              style={{ width: "100%" }}
            >
              <option value="">— Select —</option>
              {eligiblePlatoons.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.territoryId})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>
              Order type
            </div>
            <select
              value={orderType}
              onChange={(e) => {
                const nextType = e.target.value as
                  | "MOVE"
                  | "HOLD"
                  | "RECON"
                  | "INTEL";
                setOrderType(nextType);
                setOrderDraftType(nextType);
                setStep1("");
                setStep2("");
                setReconTarget1("");
                setReconTarget2("");
              }}
              style={{ width: "100%" }}
            >
              <option value="MOVE">Move</option>
              <option value="HOLD">Hold</option>
              <option value="RECON">Recon</option>
              <option value="INTEL">Intel</option>
            </select>
          </div>

          {orderType === "MOVE" ? (
            <>
              <label style={{ fontSize: 12, opacity: 0.9 }}>
                <input
                  type="checkbox"
                  checked={forcedMarch}
                  onChange={(e) => {
                    setForcedMarch(e.target.checked);
                    setStep2("");
                  }}
                />{" "}
                Forced march (2 steps)
              </label>

              <div>
                <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>
                  Step 1
                </div>
                <select
                  value={step1}
                  onChange={(e) => {
                    setStep1(e.target.value);
                    setStep2("");
                  }}
                  style={{ width: "100%" }}
                >
                  <option value="">—</option>
                  {step1Options.map((tid) => (
                    <option key={tid} value={tid}>
                      {tid}
                    </option>
                  ))}
                </select>
              </div>

              {forcedMarch ? (
                <div>
                  <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>
                    Step 2
                  </div>
                  <select
                    value={step2}
                    onChange={(e) => setStep2(e.target.value)}
                    style={{ width: "100%" }}
                  >
                    <option value="">—</option>
                    {step2Options.map((tid) => (
                      <option key={tid} value={tid}>
                        {tid}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </>
          ) : orderType === "RECON" ? (
            <>
              <div>
                <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>
                  Recon target
                </div>
                <select
                  value={reconTarget1}
                  onChange={(e) => {
                    setReconTarget1(e.target.value);
                    if (e.target.value === reconTarget2) {
                      setReconTarget2("");
                    }
                  }}
                  style={{ width: "100%" }}
                >
                  <option value="">—</option>
                  {reconOptions.map((tid) => (
                    <option key={tid} value={tid}>
                      {tid}
                    </option>
                  ))}
                </select>
              </div>
              {canReconTwice ? (
                <div>
                  <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>
                    Recon target (second)
                  </div>
                  <select
                    value={reconTarget2}
                    onChange={(e) => setReconTarget2(e.target.value)}
                    style={{ width: "100%" }}
                  >
                    <option value="">—</option>
                    {reconOptions
                      .filter((tid) => tid !== reconTarget1)
                      .map((tid) => (
                        <option key={tid} value={tid}>
                          {tid}
                        </option>
                      ))}
                  </select>
                </div>
              ) : (
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  Recon reveals intel about one adjacent territory.
                </div>
              )}
            </>
          ) : orderType === "INTEL" ? (
            <div>
              <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>
                Intel target
              </div>
              <select
                value={reconTarget1}
                onChange={(e) => setReconTarget1(e.target.value)}
                style={{ width: "100%" }}
              >
                <option value="">—</option>
                {reconOptions.map((tid) => (
                  <option key={tid} value={tid}>
                    {tid}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                Intel orders focus assets on a single adjacent territory.
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Hold keeps the platoon in place for the turn.
            </div>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={createOrder}
              disabled={
                !orderPlatoonId ||
                (orderType === "MOVE" && (!step1 || (forcedMarch && !step2))) ||
                ((orderType === "RECON" || orderType === "INTEL") &&
                  !reconTarget1)
              }
            >
              Add Order
            </button>
            <button
              type="button"
              onClick={() => submitFactionOrders(turnNumber, viewerNation)}
            >
              Submit Orders
            </button>
          </div>
        </div>
      </section>

      <section
        style={{
          border: "1px solid rgba(255,255,255,.12)",
          borderRadius: 12,
          padding: 12,
        }}
      >
        <h3 style={{ marginTop: 0 }}>Draft Orders</h3>
        {currentOrders.length ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {currentOrders.map((order) => (
              <li key={order.id}>
                <b>{order.type}</b> · {order.platoonId} →{" "}
                {order.type === "RECON" || order.type === "INTEL"
                  ? (order.reconTargets ?? []).join(", ") || "—"
                  : (order.path?.join(" → ") ?? order.from ?? "Hold")}{" "}
              </li>
            ))}
          </ul>
        ) : (
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            No draft orders yet. Use the Platoons tab or map to issue orders.
          </div>
        )}
      </section>
    </div>
  );
}

function ResolutionPhasePanel() {
  const viewerNation = useCampaignStore((s) => s.viewerNation);
  const contestsByTerritory = useCampaignStore((s) => s.contestsByTerritory);
  const locksByTerritory = useCampaignStore((s) => s.locksByTerritory);
  const turnLog = useCampaignStore((s) => s.turnLog);

  const relevantContests = useMemo(() => {
    return Object.values(contestsByTerritory)
      .filter(Boolean)
      .filter(
        (contest) =>
          contest?.attackerFaction === viewerNation ||
          contest?.defenderFaction === viewerNation,
      );
  }, [contestsByTerritory, viewerNation]);

  const ongoingBattles = useMemo(() => {
    return relevantContests.filter(
      (contest) => contest?.status === "BATTLE_PENDING",
    );
  }, [relevantContests]);

  const recentNotes = useMemo(() => {
    return turnLog.slice(0, 5);
  }, [turnLog]);

  const [battlePlans, setBattlePlans] = useState<Record<string, string>>({});
  const [confirmedPlans, setConfirmedPlans] = useState<Record<string, string>>(
    {},
  );

  const updatePlan = (contestId: string, plan: string) => {
    setBattlePlans((prev) => ({ ...prev, [contestId]: plan }));
  };

  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      <div>
        <h2 style={{ margin: 0 }}>Resolution Phase</h2>
        <div style={{ opacity: 0.8 }}>
          Review intel, outcomes, and choose battle stances for engagements
          involving <b>{viewerNation}</b>.
        </div>
      </div>

      <section
        style={{
          border: "1px solid rgba(255,255,255,.12)",
          borderRadius: 12,
          padding: 12,
        }}
      >
        <h3 style={{ marginTop: 0 }}>Outcome Feed</h3>
        {recentNotes.length ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {recentNotes.map((entry) => (
              <li key={entry.id}>
                <b>{entry.type}</b> · {entry.text}
              </li>
            ))}
          </ul>
        ) : (
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            No outcomes logged yet.
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
        <h3 style={{ marginTop: 0 }}>Battle Initiation</h3>
        {relevantContests.length ? (
          <div style={{ display: "grid", gap: 10 }}>
            {relevantContests.map((contest) => {
              const lock = contest?.territoryId
                ? locksByTerritory[contest.territoryId]
                : undefined;
              const statusLabel = contest?.status ?? "OPEN";
              const ongoing = statusLabel === "BATTLE_PENDING";
              const selectedPlan = battlePlans[contest?.id ?? ""] ?? "hold";
              const confirmedPlan = confirmedPlans[contest?.id ?? ""];
              const isConfirmed = confirmedPlan === selectedPlan;

              return (
                <div
                  key={contest?.id}
                  style={{
                    border: `1px solid ${ongoing ? "rgba(239,68,68,.5)" : "rgba(255,255,255,.12)"}`,
                    borderRadius: 10,
                    padding: 10,
                    background: ongoing
                      ? "rgba(239,68,68,.08)"
                      : "rgba(0,0,0,.15)",
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <div style={{ fontWeight: 700 }}>
                    {contest?.territoryId} · {contest?.attackerFaction} vs{" "}
                    {contest?.defenderFaction}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    Status: <b>{statusLabel}</b>{" "}
                    {lock ? "· Territory locked for combat" : null}
                  </div>
                  <label style={{ display: "grid", gap: 4 }}>
                    <span style={{ fontSize: 12, opacity: 0.7 }}>
                      Battle stance
                    </span>
                    <select
                      value={selectedPlan}
                      onChange={(e) =>
                        updatePlan(contest?.id ?? "", e.target.value)
                      }
                    >
                      <option value="hold">Hold (keep fighting)</option>
                      {!ongoing ? (
                        <>
                          <option value="recon">Recon</option>
                          <option value="attack">Attack</option>
                        </>
                      ) : null}
                      <option value="retreat">Retreat (fall back)</option>
                    </select>
                  </label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmedPlans((prev) => ({
                          ...prev,
                          [contest?.id ?? ""]: selectedPlan,
                        }))
                      }
                      disabled={isConfirmed}
                    >
                      {isConfirmed ? "Stance confirmed" : "Confirm stance"}
                    </button>
                    <span style={{ fontSize: 12, opacity: 0.7 }}>
                      {isConfirmed
                        ? "Confirmed selection locked in for this turn."
                        : "Selection needs confirmation before proceeding."}
                    </span>
                  </div>
                  {ongoing ? (
                    <div style={{ fontSize: 12, opacity: 0.75 }}>
                      Ongoing battle requires a confirmed stance before the next
                      turn.
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <PhaseWaitingPanel phase="RESOLUTION" />
        )}
      </section>

      {ongoingBattles.length === 0 ? (
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          No ongoing battles requiring action. Await other factions to resolve
          engagements.
        </div>
      ) : null}
    </div>
  );
}

function OrderCard({
  title,
  detail,
  isActive,
  onClick,
}: {
  title: string;
  detail: string;
  isActive?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: "1px solid rgba(255,255,255,.12)",
        borderRadius: 10,
        padding: 10,
        display: "grid",
        gap: 4,
        background: isActive ? "rgba(59,130,246,.2)" : "rgba(0,0,0,.12)",
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      <div style={{ fontWeight: 700 }}>{title}</div>
      <div style={{ fontSize: 12, opacity: 0.75 }}>{detail}</div>
    </button>
  );
}

function PhaseWaitingPanel({ phase }: { phase: string }) {
  return (
    <div style={{ fontSize: 12, opacity: 0.7 }}>
      No actionable items for this phase ({phase}). Waiting on other players.
    </div>
  );
}

function GMPanelNotice({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: 16,
        border: "1px dashed rgba(255,255,255,.2)",
        borderRadius: 10,
        fontSize: 13,
        opacity: 0.85,
      }}
    >
      {message}
    </div>
  );
}
