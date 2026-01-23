import { useMemo, useState } from "react";
import type { NormalizedData } from "../data/theatres";
import { useCampaignStore } from "../store/useCampaignStore";

import PlayerDashboard from "../player/PlayerDashboard";
import GMTools from "../gm/GMTools";

import PlatoonsPanel from "./PlatoonsPanel";
import TurnLogPanel from "./TurnLogPanel";
import CommandHub from "./CommandHub";

type Props = { data: NormalizedData | null };

// Keep these compatible with your existing GMTools/PlayerDashboard expectations.
export type Tab = "DASHBOARD" | "ORDERS" | "INTEL" | "LOG";
type RightTab = Tab | "PLATOONS";

export default function CommandPanel({ data }: Props) {

  const mode = useCampaignStore((s) => s.mode);
  //  const viewerMode = useCampaignStore((s) => s.viewerMode);
  const commandHubExpanded = useCampaignStore((s) => s.commandHubExpanded);
  const setCommandHubExpanded = useCampaignStore((s) => s.setCommandHubExpanded);
  const viewerMode = useCampaignStore((s) => s.viewerMode);
  // Temporary: while in setup, treat UI as GM-capable so GM-only panels are available.
  const gmEffective = mode === "SETUP" || viewerMode === "GM";

  const [tab, setTab] = useState<RightTab>("DASHBOARD");

  const tabs: Array<{ id: RightTab; label: string; gmOnly?: boolean }> = useMemo(() => {
    return [
      { id: "DASHBOARD", label: "Dashboard" },
      { id: "ORDERS", label: "Orders" },
      { id: "PLATOONS", label: "Platoons" },
      { id: "INTEL", label: "Intel/Owners", gmOnly: true },
      { id: "LOG", label: "Log" },
    ];
  }, []);

  const visibleTabs = useMemo(() => tabs.filter((t) => !t.gmOnly || gmEffective), [tabs, gmEffective]);

  const content = (() => {
    switch (tab) {
      case "DASHBOARD":
                if (gmEffective) return <GMTools data={data} tab={tab} />;
        return <CommandHub data={data} variant={commandHubExpanded ? "compact" : "full"} />;
        // return gmEffective ? <GMTools data={data} setTab={tab} /> : <CommandHub data={data}  />;
      case "ORDERS":
      case "LOG":
        return gmEffective ? <GMTools data={data} tab={tab} /> : <PlayerDashboard data={data} tab={tab} />;
      case "INTEL":
        return gmEffective ? <GMTools data={data} tab="INTEL" /> : <div>Not available in PLAYER mode.</div>;
      case "PLATOONS":
        return <PlatoonsPanel data={data}  />;
      default:
        return null;
    }
  })();

  return (
    <div style={{ padding: 12, border: "1px solid rgba(255,255,255,.15)", borderRadius: 8 }}>
      {/* TOP: Always-visible inspector */}
      <MapInspector />

  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10, alignItems: "center" }}>
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{ opacity: tab === t.id ? 1 : 0.75, fontWeight: tab === t.id ? 800 : 600 }}
          >
            {t.label}
          </button>
        ))}
  {!gmEffective && tab === "DASHBOARD" ? (
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
      <div style={{ border: "1px solid rgba(255,255,255,.10)", borderRadius: 10, padding: 10 }}>{content}</div>

      {/* BOTTOM: Always-visible mini log */}
        <div style={{ marginTop: 12, borderTop: "1px solid rgba(255,255,255,.12)" }}>
        <TurnLogPanel defaultOpen={false} maxHeight={260} />
      </div>
    </div>
  );
}

function MapInspector() {
  const selectedTerritoryId = useCampaignStore((s) => s.selectedTerritoryId);
  const ownerByTerritory = useCampaignStore((s) => s.ownerByTerritory);

  const viewerFaction = useCampaignStore((s) => s.viewerFaction);
  const viewerMode = useCampaignStore((s) => s.viewerMode);
  const mode = useCampaignStore((s) => s.mode);
  const intelByTerritory = useCampaignStore((s) => s.intelByTerritory);

  const gmEffective = mode === "SETUP" || viewerMode === "GM";

  const intel = selectedTerritoryId
    ? gmEffective
      ? "FULL"
      : intelByTerritory[selectedTerritoryId]?.[viewerFaction] ?? "NONE"
    : null;

  const owner = selectedTerritoryId ? ownerByTerritory[selectedTerritoryId] ?? "neutral" : null;

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontWeight: 900 }}>Selected Territory</div>
        <div style={{ fontSize: 12, opacity: 0.75 }}>{gmEffective ? "GM view" : `Player view (${viewerFaction})`}</div>
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
            Click a territory on the map to populate details and platoon controls.
          </div>
        )}
      </div>
    </div>
  );
}
