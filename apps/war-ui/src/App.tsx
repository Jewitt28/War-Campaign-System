// apps/war-ui/src/App.tsx
import { useEffect, useState } from "react";
import SetupPanel from "./setup/SetupPanel";
import CommandPanel from "./ui/CommandPanel";
import MapBoard from "./map/MapBoard";
import { loadTheatresData, type NormalizedData } from "./data/theatres";
import { useCampaignStore } from "./store/useCampaignStore";
import PlayPanel from "./ui/PlayPanel";
import GMTools from "./gm/GMTools";

export default function App() {
  const [data, setData] = useState<NormalizedData | null>(null);
  const mode = useCampaignStore((s) => s.mode);
  const viewerMode = useCampaignStore((s) => s.viewerMode);

  useEffect(() => {
    loadTheatresData().then(setData).catch(console.error);
  }, []);

  const showSetup = (mode === "SETUP") && (viewerMode === "GM");
  const oneScreenPlay = (mode === "PLAY") && (viewerMode === "GM");
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "420px 1fr 420px",
        height: "100vh",
        gap: 12,
        padding: 12,
      }}
    >
      {/* LEFT: Setup */}
      <div style={{ display: "grid", gap: 12, alignContent: "start", minHeight: 0, overflow: "auto" }}>
        {showSetup && <SetupPanel />}
        {oneScreenPlay && <PlayPanel data={data} />}
        <GMTools data={data} tab="DASHBOARD" />
      </div>

      {/* CENTER: Map */}
      <div style={{ border: "1px solid rgba(255,255,255,.15)", borderRadius: 8, overflow: "hidden", minHeight: 0 }}>
        <MapBoard />
      </div>

      {/* RIGHT: Command panel */}
      <div style={{ minHeight: 0, overflow: "auto" }}>
        <CommandPanel data={data} />
      </div>
    </div>
  );
}
