// apps/war-ui/src/panels/TurnLogPanel.tsx
import { useMemo } from "react";
import { useCampaignStore } from "../store/useCampaignStore";

export default function TurnLogPanel() {
  const turnLog = useCampaignStore((s) => s.turnLog);
  const entries = useMemo(() => turnLog.slice(0, 80), [turnLog]);

  return (
    <div style={{ padding: 12 }}>
      <h3 style={{ marginTop: 0 }}>Turn Log</h3>

      {entries.length === 0 ? (
        <div style={{ opacity: 0.8 }}>No entries yet.</div>
      ) : (
        <div style={{ maxHeight: 520, overflow: "auto", fontSize: 12, lineHeight: 1.5 }}>
          {entries.map((e) => (
            <div key={e.id} style={{ padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
              <b>{e.type}</b> · {new Date(e.ts).toLocaleTimeString()} · {e.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
