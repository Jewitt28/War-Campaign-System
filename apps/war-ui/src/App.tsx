// apps/war-ui/src/App.tsx
import { useEffect, useState, useMemo } from "react";
import SetupPanel from "./setup/SetupPanel";
import CommandHub from "./ui/CommandHub";
import CommandPanel from "./ui/CommandPanel";
import MapBoard from "./map/MapBoard";
import { loadTheatresData, type NormalizedData } from "./data/theatres";
import { useCampaignStore } from "./store/useCampaignStore";
import { NATIONS, type NationKey } from "./setup/NationDefinitions";
import GMTools from "./gm/GMTools";
import NationCommandPanel from "./ui/NationCommandPanel";

export default function App() {
  const [data, setData] = useState<NormalizedData | null>(null);
  const mode = useCampaignStore((s) => s.mode);
  const viewerMode = useCampaignStore((s) => s.viewerMode);
  const leftPanelView = useCampaignStore((s) => s.leftPanelView);
  const commandHubExpanded = useCampaignStore((s) => s.commandHubExpanded);
  const setAdjacencyByTerritory = useCampaignStore(
    (s) => s.setAdjacencyByTerritory,
  );
  const setTerritoryNameById = useCampaignStore(
    (s) => s.setTerritoryNameById,
  );

  useEffect(() => {
    loadTheatresData()
      .then((loaded) => {
        setData(loaded);
        const adjacency: Record<string, string[]> = {};
        for (const territory of loaded.territories) {
          adjacency[territory.id] = territory.adj ?? [];
        }
        setAdjacencyByTerritory(adjacency);
        setTerritoryNameById(
          Object.fromEntries(
            loaded.territories.map((territory) => [
              territory.id,
              territory.name,
            ]),
          ),
        );
      })
      .catch(console.error);
  }, [setAdjacencyByTerritory, setTerritoryNameById]);

  const showSetup = mode === "SETUP" && viewerMode === "GM";
  const showLeftPanel =
    (viewerMode === "GM" && (mode === "SETUP" || leftPanelView !== "NONE")) ||
    (viewerMode === "PLAYER" && leftPanelView !== "NONE");

  const gridTemplateColumns = showLeftPanel ? "380px 1fr 420px" : "1fr 420px";

  return (
    <div
      style={{ display: "grid", gridTemplateRows: "auto 1fr", height: "100vh" }}
    >
      <TopBar data={data} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns,
          minHeight: 0,
          gap: 12,
          padding: 12,
        }}
      >
        {/* LEFT: Command/GM panel */}{" "}
        {showLeftPanel ? (
          <div
            style={{
              display: "grid",
              gap: 12,
              alignContent: "start",
              minHeight: 0,
              overflow: "auto",
            }}
          >
            {showSetup && <SetupPanel />}
            {viewerMode === "GM" && mode !== "SETUP" ? (
              <GMTools data={data} tab="DASHBOARD" />
            ) : leftPanelView === "FACTION_COMMAND" ? (
              <CommandHub data={data} variant="full" />
            ) : leftPanelView === "NATION_COMMAND" ? (
              <NationCommandPanel data={data} />
            ) : null}
          </div>
        ) : null}
        {/* CENTER: Map + expanded Command Hub */}
        <div style={{ display: "grid", gap: 12, minHeight: 0 }}>
          <div
            style={{
              border: "1px solid rgba(255,255,255,.15)",
              borderRadius: 8,
              overflow: "hidden",
              minHeight: 0,
            }}
          >
            <MapBoard />
          </div>
          {commandHubExpanded && viewerMode === "PLAYER" ? (
            <div
              style={{
                border: "1px solid rgba(255,255,255,.12)",
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              <CommandHub data={data} variant="full" />
            </div>
          ) : null}
        </div>
        {/* RIGHT: Command panel */}
        <div style={{ minHeight: 0, overflow: "auto" }}>
          <CommandPanel data={data} />
        </div>
      </div>
    </div>
  );
}

function TopBar({ data }: { data: NormalizedData | null }) {
  const viewerMode = useCampaignStore((s) => s.viewerMode);
  const setViewerMode = useCampaignStore((s) => s.setViewerMode);
  const viewerNation = useCampaignStore((s) => s.viewerNation);
  const setViewerNation = useCampaignStore((s) => s.setViewerNation);
  const viewerFaction = useCampaignStore((s) => s.viewerFaction);
  const customNations = useCampaignStore((s) => s.customNations);

  const playMode = useCampaignStore((s) => s.playMode);
  const mode = useCampaignStore((s) => s.mode);
  const phase = useCampaignStore((s) => s.phase);
  const turnNumber = useCampaignStore((s) => s.turnNumber);
  const nextPhase = useCampaignStore((s) => s.nextPhase);
  const resetAll = useCampaignStore((s) => s.resetAll);
  const ordersByTurn = useCampaignStore((s) => s.ordersByTurn);
  const platoonsById = useCampaignStore((s) => s.platoonsById);
  const suppliesByFaction = useCampaignStore((s) => s.suppliesByFaction);
  const nationsEnabled = useCampaignStore((s) => s.nationsEnabled);
  const leftPanelView = useCampaignStore((s) => s.leftPanelView);
  const setLeftPanelView = useCampaignStore((s) => s.setLeftPanelView);

  const isAdjacent = useMemo(() => {
    if (!data) return null;
    return (a: string, b: string) => {
      const A = data.territoryById.get(a);
      return !!A && A.adj.includes(b);
    };
  }, [data]);

  const ordersPending = useMemo(() => {
    const byTurn = ordersByTurn?.[turnNumber] ?? {};
    return Object.values(byTurn)
      .flat()
      .filter((order) => {
        const platoon = platoonsById[order.platoonId];
        return platoon?.nation === viewerNation && !order.submittedAt;
      }).length;
  }, [ordersByTurn, platoonsById, turnNumber, viewerNation]);

  const resourceSnapshot = useMemo(() => {
    const base = suppliesByFaction?.[viewerFaction] ?? 0;
    return [
      {
        key: "🪖",
        value: Math.max(0, Math.round(base * 1.5)),
        label: "Manpower",
      },
      { key: "🏭", value: base, label: "Industry" },
      { key: "⛽", value: Math.max(0, Math.round(base * 0.6)), label: "Fuel" },
      { key: "🛰️", value: Math.max(0, Math.round(base * 0.3)), label: "Intel" },
    ];
  }, [suppliesByFaction, viewerFaction]);
  const nationOptions = useMemo(() => {
    const base = NATIONS.map((nation) => ({
      id: nation.id as NationKey,
      name: nation.name,
      flag: nation.flag,
    }));
    const custom = customNations.map((nation) => ({
      id: nation.id as NationKey,
      name: nation.name,
    }));
    const all = [...base, ...custom];
    const enabled = all.filter((nation) => nationsEnabled[nation.id]);
    if (enabled.length === 0) return all;
    if (enabled.some((nation) => nation.id === viewerNation)) return enabled;
    const current = all.find((nation) => nation.id === viewerNation);
    return current ? [...enabled, current] : enabled;
  }, [customNations, nationsEnabled, viewerNation]);

  const toggleViewerMode = () => {
    const next = viewerMode === "GM" ? "PLAYER" : "GM";
    setViewerMode(next);
    setLeftPanelView(next === "GM" ? "GM_TOOLS" : "NONE");
  };
  return (
    <div
      style={{
        padding: "10px 16px",
        borderBottom: "1px solid rgba(255,255,255,.12)",
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: 12,
        alignItems: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontWeight: 800 }}>Turn {turnNumber}</div>
          <div style={{ fontSize: 12, opacity: 0.75 }}>Phase: {phase}</div>
          <div style={{ fontSize: 12, opacity: 0.75 }}>
            Play Mode: {playMode}
          </div>
          <div style={{ fontSize: 12, opacity: 0.75 }}>
            Outstanding orders: {ordersPending}
          </div>
        </div>
        {resourceSnapshot.map((resource) => (
          <div
            key={resource.label}
            style={{
              padding: "4px 8px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,.12)",
              background: "rgba(255,255,255,.06)",
              fontSize: 12,
              display: "inline-flex",
              gap: 6,
              alignItems: "center",
            }}
            title={resource.label}
          >
            <span>{resource.key}</span>
            <span>{resource.value}</span>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
        {viewerMode === "GM" && (
          <label
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              fontSize: 12,
            }}
          >
            Player Nation
            <select
              value={viewerNation}
              onChange={(e) => setViewerNation(e.target.value as NationKey)}
            >
              {nationOptions.map((nation) => (
                <option key={nation.id} value={nation.id}>
                  {nation.flag ? `${nation.flag} ` : ""}
                  {nation.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {viewerMode === "PLAYER" ? (
          <>
            <button
              type="button"
              onClick={() =>
                setLeftPanelView(
                  leftPanelView === "FACTION_COMMAND"
                    ? "NONE"
                    : "FACTION_COMMAND",
                )
              }
            >
              Faction Command
            </button>
            <button
              type="button"
              onClick={() =>
                setLeftPanelView(
                  leftPanelView === "NATION_COMMAND"
                    ? "NONE"
                    : "NATION_COMMAND",
                )
              }
            >
              Nation Command
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() =>
              setLeftPanelView(
                leftPanelView === "GM_TOOLS" ? "NONE" : "GM_TOOLS",
              )
            }
          >
            GM Tools
          </button>
        )}
        <button type="button" onClick={toggleViewerMode}>
          {viewerMode === "GM"
            ? "Switch to Player View"
            : "Switch to GM View"}
        </button>

        <button
          type="button"
          disabled={viewerMode !== "GM" || !isAdjacent || mode === "SETUP"}
          onClick={() => {
            if (!isAdjacent) return;
            nextPhase(isAdjacent);
          }}
          title={
            !isAdjacent
              ? "Load theatres_all.json so adjacency exists."
              : undefined
          }
        >
          Advance Phase
        </button>

        <button
          type="button"
          disabled={viewerMode !== "GM"}
          onClick={() => resetAll()}
          title="Reset campaign state and return to setup."
        >
          New Campaign
        </button>
      </div>
    </div>
  );
}
