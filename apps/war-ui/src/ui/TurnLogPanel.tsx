// apps/war-ui/src/panels/TurnLogPanel.tsx
import { useMemo, useState } from "react";
import { useCampaignStore } from "../store/useCampaignStore";
import { formatTerritoryText } from "./territoryLabel";

type Props = {
  defaultOpen?: boolean;
  maxHeight?: number;
};


export default function TurnLogPanel({defaultOpen = false, maxHeight = 520}: Props) {
  const turnLog = useCampaignStore((s) => s.turnLog);
  const territoryNameById = useCampaignStore((s) => s.territoryNameById);
  const entries = useMemo(() => turnLog.slice(0, 80), [turnLog]);
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ padding: 12 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <h3 style={{ margin: 0 }}>Turn Log</h3>
        <button type="button" onClick={() => setOpen((prev) => !prev)}>
          {open ? "Collapse" : "Expand"}
        </button>
      </div>
        {open ? (
        entries.length === 0 ? (
          <div style={{ opacity: 0.8 }}>No entries yet.</div>
        ) : (
          <div style={{ maxHeight, overflow: "auto", fontSize: 12, lineHeight: 1.5, marginTop: 8 }}>
            {entries.map((e) => (
              <div key={e.id} style={{ padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
                <b>{e.type}</b> · {new Date(e.ts).toLocaleTimeString()} ·{" "}
                {formatTerritoryText(e.text, territoryNameById)}
              </div>
            ))}
          </div>
        )
      ) : (
    <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
          Hidden · {entries.length} entries available.
        </div>
      )}
    </div>
  );
}
