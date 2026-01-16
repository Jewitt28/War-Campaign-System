import { useEffect, useState } from "react";
import SetupPanel from "./setup/SetupPanel";
import PlayPanel from "./ui/PlayPanel";
import MapBoard from "./map/MapBoard";
import { loadTheatresData, type NormalizedData } from "./data/theatres";

export default function App() {
  const [data, setData] = useState<NormalizedData | null>(null);

  useEffect(() => {
    loadTheatresData().then(setData).catch(console.error);
  }, []);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", height: "100vh", gap: 12, padding: 12 }}>
      <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
        <SetupPanel />
        <PlayPanel data={data} />
      </div>

      <div style={{ border: "1px solid rgba(255,255,255,.15)", borderRadius: 8, overflow: "hidden" }}>
        <MapBoard data={data} />
      </div>
    </div>
  );
}
