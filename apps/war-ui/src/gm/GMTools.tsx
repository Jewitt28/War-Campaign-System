// src/gm/GMTools.tsx
import { useMemo, useState } from "react";
import { useCampaignStore } from "../store/useCampaignStore";
import type { NormalizedData } from "../data/theatres";
import type { Tab } from "../ui/CommandPanel";

type Props = {
  data: NormalizedData | null;
  tab: Tab;
};

export default function GMTools({ data, tab }: Props) {
  const mode = useCampaignStore((s) => s.mode);
  const viewerMode = useCampaignStore((s) => s.viewerMode);
  const setViewerMode = useCampaignStore((s) => s.setViewerMode);

  const phase = useCampaignStore((s) => s.phase);
  const turnNumber = useCampaignStore((s) => s.turnNumber);

  const nextPhase = useCampaignStore((s) => s.nextPhase);
  const resolveCurrentTurn = useCampaignStore((s) => s.resolveCurrentTurn);

  const addNote = useCampaignStore((s) => s.addNote);

  const [note, setNote] = useState("");

  // ✅ adjacency fn derived from NormalizedData (typed)
  const isAdjacent = useMemo(() => {
    if (!data) return null;
    return (a: string, b: string) => {
      const A = data.territoryById.get(a);
      return !!A && A.adj.includes(b);
    };
  }, [data]);

  const gmEffective = mode === "SETUP" || viewerMode === "GM";

  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      <div>
        <h2 style={{ margin: 0 }}>GM Tools</h2>
        <div style={{ opacity: 0.8 }}>
          Tab: <b>{tab}</b> · Data: <b>{data ? "loaded" : "null"}</b>
        </div>
        <div style={{ opacity: 0.8, marginTop: 6 }}>
          Mode: <b>{mode}</b> · Viewer: <b>{viewerMode}</b> · Phase: <b>{phase}</b> · Turn: <b>{turnNumber}</b>
        </div>
      </div>

      <section style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>Viewer Mode</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => setViewerMode("PLAYER")}>PLAYER</button>
          <button type="button" onClick={() => setViewerMode("GM")}>GM</button>
        </div>
      </section>

      <section style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>Turn Controls</h3>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => { if (isAdjacent) nextPhase(isAdjacent); }}
            disabled={!gmEffective || !isAdjacent}
            title={!data ? "Load theatres_all.json so adjacency exists." : undefined}
          >
            Next Phase
          </button>

          <button
            type="button"
            onClick={() => { if (isAdjacent) resolveCurrentTurn(isAdjacent); }}
            disabled={!gmEffective || !isAdjacent}
            title={!data ? "Load theatres_all.json so adjacency exists." : undefined}
          >
            Resolve Turn Now
          </button>
        </div>

        {!data ? (
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
            Resolver needs adjacency. Data is null right now.
          </div>
        ) : null}
      </section>

      <section style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>GM Note</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note to the log…"
            style={{ flex: 1 }}
          />
          <button
            type="button"
            onClick={() => {
              const t = note.trim();
              if (!t) return;
              addNote(t);
              setNote("");
            }}
            disabled={!note.trim()}
          >
            Add
          </button>
        </div>
      </section>
    </div>
  );
}
