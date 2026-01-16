// src/ui/PlayPanel.tsx
import { useMemo } from "react";
import { useCampaignStore, type FactionKey, type OwnerKey } from "../store/useCampaignStore";
import type { NormalizedData } from "../data/theatres";

function factionsInPlay(customs: {id:string; name:string}[]): Array<{ key: FactionKey; label: string }> {
  const base: Array<{ key: FactionKey; label: string }> = [
    { key: "allies", label: "Allies" },
    { key: "axis", label: "Axis" },
    { key: "ussr", label: "USSR" },
  ];
  const custom = customs.map(c => ({ key: `custom:${c.id}` as FactionKey, label: c.name }));
  return [...base, ...custom];
}

export default function PlayPanel({ data }: { data: NormalizedData | null }) {
  const {
    mode,
    selectedTerritoryId,
    setSelectedTerritory,
    ownerByTerritory,
    setOwner,
    visibilityByTerritory,
    setVisibility,
    moveFrom,
    startMoveFrom,
    confirmMoveTo,
    turnLog,
    customs,
  } = useCampaignStore();

  const terr = useMemo(() => {
    if (!data || !selectedTerritoryId) return null;
    return data.territoryById.get(selectedTerritoryId) ?? null;
  }, [data, selectedTerritoryId]);

  const factions = useMemo(() => factionsInPlay(customs), [customs]);

  const owner: OwnerKey = terr ? (ownerByTerritory[terr.id] ?? "neutral") : "neutral";

  const isAdjacent = (a: string, b: string) => {
    const ta = data?.territoryById.get(a);
    return !!ta?.adj?.includes(b);
  };

  return (
    <div style={{ padding: 12, border: "1px solid rgba(255,255,255,.15)", borderRadius: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div>
          <div style={{ fontWeight: 800 }}>Play Tools</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Mode: <b>{mode}</b></div>
        </div>
        <button onClick={() => setSelectedTerritory(null)}>Clear selection</button>
      </div>

      <hr style={{ borderColor: "rgba(255,255,255,.12)" }} />

      {!terr ? (
        <div style={{ fontSize: 13, opacity: 0.9 }}>Select a campaign territory on the map.</div>
      ) : (
        <>
          <div style={{ fontWeight: 800 }}>{terr.name}</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>{terr.id} · {terr.theatreTitle}</div>

          <h4 style={{ margin: "12px 0 8px" }}>Owner</h4>
          <select value={owner} onChange={(e) => setOwner(terr.id, e.target.value as OwnerKey)}>
            <option value="neutral">Neutral</option>
            <option value="contested">Contested</option>
            {factions.map(f => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>

          <h4 style={{ margin: "12px 0 8px" }}>Visibility (per faction)</h4>
          {factions.map(f => {
            const vis = (visibilityByTerritory[terr.id]?.[f.key] ?? false);
            return (
              <label key={f.key} style={{ display: "flex", alignItems: "center", gap: 8, margin: "4px 0" }}>
                <input
                  type="checkbox"
                  checked={vis}
                  onChange={(e) => setVisibility(terr.id, f.key, e.target.checked)}
                />
                <span>{f.label}</span>
              </label>
            );
          })}

          <h4 style={{ margin: "12px 0 8px" }}>Move helper</h4>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => startMoveFrom(terr.id)}>Set as Move From</button>
            {moveFrom && (
              <button onClick={() => confirmMoveTo(terr.id, isAdjacent)}>
                Confirm Move To (from {moveFrom})
              </button>
            )}
            {moveFrom && <button onClick={() => startMoveFrom(null)}>Cancel Move</button>}
          </div>

          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 8 }}>
            Adjacents: {terr.adj.join(", ") || "none"}
          </div>
        </>
      )}

      <hr style={{ borderColor: "rgba(255,255,255,.12)", marginTop: 12 }} />

      <div style={{ fontWeight: 800, marginBottom: 6 }}>Turn Log</div>
      <div style={{ maxHeight: 240, overflow: "auto", fontSize: 12, opacity: 0.95, lineHeight: 1.5 }}>
        {turnLog.length === 0 ? "No entries yet." : (
          turnLog.slice(0, 30).map((e) => (
            <div key={e.ts}>
              <b>{e.type}</b> · {new Date(e.ts).toLocaleTimeString()} · {e.text}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
