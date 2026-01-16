// src/setup/SetupPanel.tsx
import { useState } from "react";
import { useCampaignStore } from "../store/useCampaignStore";
import { getSelectedFactionKey } from "./SetupRules";

export default function SetupPanel() {
  const {
    mode,
    setMode,
    toggleTheatre,
    activeTheatres,
    selectedSetupFaction,
    selectSetupFaction,
    customs,
    createCustomFaction,
    selectedCustomId,
    selectCustomFaction,
    homelands,
    resetAll,
  } = useCampaignStore();

  const [customName, setCustomName] = useState("");
  const [customColor, setCustomColor] = useState("#6aa84f");

  const locked = mode === "PLAY";
  const selectedKey = getSelectedFactionKey();

  return (
    <div style={{ padding: 12, border: "1px solid rgba(255,255,255,.15)", borderRadius: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div>
          <div style={{ fontWeight: 800 }}>Setup</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Mode: <b>{mode}</b></div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={resetAll}>Reset</button>
          {mode === "SETUP" ? (
            <button onClick={() => setMode("PLAY")}>Lock Setup</button>
          ) : (
            <button onClick={() => setMode("SETUP")}>Unlock (GM)</button>
          )}
        </div>
      </div>

      <hr style={{ borderColor: "rgba(255,255,255,.12)" }} />

      <div style={{ opacity: locked ? 0.6 : 1, pointerEvents: locked ? "none" : "auto" as const }}>
        <h4 style={{ margin: "8px 0" }}>1) Theatres in play</h4>
        {(["WE","EE","NA","PA"] as const).map((id) => (
          <label key={id} style={{ display: "flex", alignItems: "center", gap: 8, margin: "4px 0" }}>
            <input type="checkbox" checked={activeTheatres[id]} onChange={() => toggleTheatre(id)} />
            <span>{id}</span>
          </label>
        ))}

        <h4 style={{ margin: "12px 0 8px" }}>2) Pick faction for homeland</h4>
<select
  value={selectedSetupFaction ?? ""}
  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    if (v === "") return selectSetupFaction(null);
    if (v === "custom") return selectSetupFaction("custom");
    if (v === "allies" || v === "axis" || v === "ussr") return selectSetupFaction(v);
    // fallback (should never happen)
    selectSetupFaction(null);
  }}
>
          <option value="">— Select —</option>
          <option value="allies">Allies</option>
          <option value="axis">Axis</option>
          <option value="ussr">USSR</option>
          <option value="custom">Custom</option>
        </select>

        {selectedSetupFaction === "custom" && (
          <div style={{ marginTop: 10, padding: 10, border: "1px solid rgba(255,255,255,.12)", borderRadius: 8 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Custom faction</div>
            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 12, opacity: 0.85 }}>Name</span>
              <input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. Free France" />
            </label>
            <label style={{ display: "grid", gap: 4, marginTop: 8 }}>
              <span style={{ fontSize: 12, opacity: 0.85 }}>Colour</span>
              <input type="color" value={customColor} onChange={(e) => setCustomColor(e.target.value)} />
            </label>
            <button style={{ marginTop: 10 }} onClick={() => createCustomFaction(customName, customColor)}>
              Create + Select
            </button>

            {customs.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, opacity: 0.85 }}>Existing customs</div>
                <select value={selectedCustomId ?? ""} onChange={(e) => selectCustomFaction(e.target.value || null)}>
                  <option value="">— Select —</option>
                  {customs.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        <h4 style={{ margin: "12px 0 8px" }}>3) Click map to set homeland</h4>
        <div style={{ fontSize: 12, opacity: 0.85 }}>
          Selected faction key: <b>{selectedKey ?? "none"}</b>
        </div>

        <h4 style={{ margin: "12px 0 8px" }}>Homelands</h4>
        <div style={{ fontSize: 12, lineHeight: 1.6 }}>
          {Object.keys(homelands).length === 0 ? "None set yet." : (
            Object.entries(homelands).map(([fk, tid]) => <div key={fk}><b>{fk}</b>: {tid}</div>)
          )}
        </div>
      </div>
    </div>
  );
}
