
import  { useEffect, useMemo, useState } from "react";

import { useCampaignStore, type BaseFactionKey } from "../store/useCampaignStore";
import { canPickNationHomeland, getFactionKeyForNation } from "./SetupRules";
import { NATIONS, type NationKey } from "./NationDefinitions";

import { loadTheatresData } from "../data/theatres";
import type { RegionDef } from "../data/regions";
import { deriveFactionsFromNations } from "./nationSelectors";

type Status = "TODO" | "DONE" | "LOCKED";

function SectionHeader({
  title,
  open,
  onToggle,
  status,
  subtitle,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  status?: Status;
  subtitle?: string;
}) {
  const badge =
    status === "DONE"
      ? { text: "DONE", bg: "rgba(34,197,94,.15)", border: "rgba(34,197,94,.35)" }
      : status === "LOCKED"
      ? { text: "LOCKED", bg: "rgba(239,68,68,.15)", border: "rgba(239,68,68,.35)" }
      : { text: "TODO", bg: "rgba(148,163,184,.12)", border: "rgba(148,163,184,.25)" };

  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        width: "100%",
        textAlign: "left",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        padding: "10px 10px",
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,.12)",
        background: "rgba(0,0,0,.12)",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "grid", gap: 2 }}>
        <div style={{ fontWeight: 800 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, opacity: 0.75 }}>{subtitle}</div>}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span
          style={{
            fontSize: 11,
            padding: "3px 8px",
            borderRadius: 999,
            background: badge.bg,
            border: `1px solid ${badge.border}`,
            opacity: 0.95,
          }}
        >
          {badge.text}
        </span>
        <span style={{ fontSize: 14, opacity: 0.8 }}>{open ? "▾" : "▸"}</span>
      </div>
    </button>
  );
}

export default function SetupPanel() {
  const {
    mode,
    setMode,
    playMode,
    setPlayMode,
    toggleTheatre,
    activeTheatres,
    resetAll,
    viewerMode,
    autoSetupWorld,

    selectedSetupNation,
    selectSetupNation,
    homelandsByNation,
    setNationHomeland,
    setViewerNation,
    setHomeland, // v1 bridge
    setSelectedTerritory,
    customNations,
    createCustomNation,
    homelandUnlock,
    setHomelandUnlock,
  } = useCampaignStore();

  const isGM = viewerMode === "GM";
  const locked = mode === "PLAY";
  const canEditSetup = isGM && !locked;

  // Reactively read nationsEnabled from the store (no getState() in render)
  const nationsEnabledMap = useCampaignStore((s) => s.nationsEnabled);

  // ----- Derived stage state -----
  const anyTheatreActive = useMemo(() => Object.values(activeTheatres).some(Boolean), [activeTheatres]);

  const enabledNationIds = useMemo(
    () => Object.entries(nationsEnabledMap).filter(([, v]) => v).map(([k]) => k),
    [nationsEnabledMap]
  );

  const allNations = useMemo(
    () => [
      ...NATIONS.map((n) => ({ ...n, id: n.id as NationKey })),
      ...customNations.map((n) => ({ ...n, id: n.id as NationKey })),
    ],
    [customNations],
  );

  const enabledCount = enabledNationIds.length;

  const homelandsCount = useMemo(() => Object.keys(homelandsByNation).length, [homelandsByNation]);

  const stage1Done = anyTheatreActive;
  const stage2Done = enabledNationIds.length > 0;
  const stage3Done = homelandsCount > 0;

  const homelandProgressLabel = `${homelandsCount}/${enabledCount || 0}`;

  const activeTheatreList = useMemo(
    () => (["WE", "EE", "NA", "PA"] as const).filter((k) => activeTheatres[k]),
    [activeTheatres]
  );

  const derivedFactionsLabel = useMemo(() => {
    const derived = deriveFactionsFromNations(nationsEnabledMap, customNations);
    const list = Object.entries(derived)
      .filter(([, v]) => v)
      .map(([k]) => k.toUpperCase());
    return list.join(", ") || "None";
  }, [nationsEnabledMap]);

  const summaryStatus: { s1: Status; s2: Status; s3: Status } = useMemo(() => {
    if (locked) return { s1: "LOCKED", s2: "LOCKED", s3: "LOCKED" };
    return {
      s1: stage1Done ? "DONE" : "TODO",
      s2: stage2Done ? "DONE" : "TODO",
      s3: stage3Done ? "DONE" : "TODO",
    };
  }, [locked, stage1Done, stage2Done, stage3Done]);

  // ----- Collapsible UI state -----
  // Important: no effect-driven setState (satisfy react-hooks/set-state-in-effect).
  // Instead, choose sane defaults based on current state using lazy init.
  const [open1, setOpen1] = useState<boolean>(() => !locked && !stage2Done); // theatres (start open unless already moved on)
  const [open2, setOpen2] = useState<boolean>(() => !locked); // nations (usually open)
  const [open3, setOpen3] = useState<boolean>(() => !locked); // homelands (usually open)

  const expandAll = () => {
    setOpen1(true);
    setOpen2(true);
    setOpen3(true);
  };

  const collapseAll = () => {
    setOpen1(false);
    setOpen2(false);
    setOpen3(false);
  };

  // ----- Map territory name lookup + region groups -----
  const [territoryNameById, setTerritoryNameById] = useState<Record<string, string>>({});
  const [regionGroups, setRegionGroups] = useState<RegionDef[]>([]);
  const [regionId, setRegionId] = useState<string>("");
  const setRegions = useCampaignStore((s) => s.setRegions);
  const setSelectedRegion = useCampaignStore((s) => s.setSelectedRegion);

  const [regionTerritoryId, setRegionTerritoryId] = useState<string>("");
  const [customNationName, setCustomNationName] = useState<string>("");
  const [customNationFaction, setCustomNationFaction] =
    useState<BaseFactionKey>("allies");

  useEffect(() => {
    loadTheatresData()
      .then((td) => {
        const map: Record<string, string> = {};
        for (const th of td.raw.theatres ?? []) {
          for (const t of th.territories ?? []) map[t.id] = t.name;
        }
        setTerritoryNameById(map);

        const groups = td.territoryGroups ?? [];
        setRegionGroups(groups);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setRegions(groups as any);

        const first = groups[0];
        if (first) {
          setRegionId(first.id);
          setSelectedRegion(first.id);
          const firstTid = first.territories?.[0] ?? "";
          setRegionTerritoryId(firstTid);
          if (firstTid) setSelectedTerritory(firstTid);
        }
      })
      .catch((e) => console.error("Failed to load theatres data", e));
  }, [setRegions, setSelectedRegion, setSelectedTerritory]);

  const activeRegion = useMemo(() => regionGroups.find((g) => g.id === regionId) ?? null, [regionGroups, regionId]);

  const safeRegionTerritoryId = useMemo(() => {
    const list = activeRegion?.territories ?? [];
    if (list.length === 0) return "";
    if (list.includes(regionTerritoryId)) return regionTerritoryId;
    return list[0];
  }, [activeRegion, regionTerritoryId]);

  const canSetHomeland = !!selectedSetupNation && !!safeRegionTerritoryId;

  const toggleNationEnabled = (nid: NationKey) => {
    const s = useCampaignStore.getState();
    const nextEnabled = !s.nationsEnabled[nid];

    useCampaignStore.setState({
      nationsEnabled: { ...s.nationsEnabled, [nid]: nextEnabled },
      // safety: unselect if we just disabled the selected nation
      selectedSetupNation: !nextEnabled && s.selectedSetupNation === nid ? null : s.selectedSetupNation,
    });
  };

  return (
    <div style={{ padding: 12, border: "1px solid rgba(255,255,255,.15)", borderRadius: 8 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div>
          <div style={{ fontWeight: 800 }}>Setup</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            Mode: <b>{mode}</b> · Viewer: <b>{viewerMode}</b>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button onClick={resetAll} disabled={!isGM}>
            Reset
          </button>

          {mode === "SETUP" ? (
            <button
              onClick={() => {
                if (!isGM) return;
                setMode("PLAY");
                collapseAll();
              }}
              disabled={!isGM}
            >
              Lock Setup
            </button>
          ) : (
            <button
              onClick={() => {
                if (!isGM) return;
                setMode("SETUP");
                expandAll();
              }}
              disabled={!isGM}
            >
              Unlock (GM)
            </button>
          )}

          <button
            onClick={() => {
              if (!isGM) return;
              autoSetupWorld();
              collapseAll();
            }}
            disabled={!isGM}
          >
            Lock Setup & Start Game
          </button>
        </div>
      </div>
 <div
        style={{
          marginTop: 10,
          padding: 10,
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,.12)",
          background: "rgba(0,0,0,.12)",
          display: "grid",
          gap: 8,
        }}
      >
        <div style={{ fontWeight: 700 }}>Play Mode</div>
        <div style={{ fontSize: 12, opacity: 0.75 }}>
          Choose how the Command Hub and GM tools are arranged during play.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setPlayMode("ONE_SCREEN")}
            disabled={!canEditSetup}
            style={{ fontWeight: playMode === "ONE_SCREEN" ? 800 : 600 }}
          >
            One Screen (shared GM/Player)
          </button>
          <button
            type="button"
            onClick={() => setPlayMode("ONE_SCREEN")}
            disabled={!canEditSetup}
            style={{ fontWeight: playMode !== "ONE_SCREEN" ? 800 : 600 }}
          >
            Multi Screen (player-only UI)
          </button>
        </div>
      </div>

      {!isGM && (
        <div
          style={{
            marginTop: 8,
            padding: 8,
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,.12)",
            opacity: 0.9,
          }}
        >
          GM-only: setup controls are disabled in <b>PLAYER</b> mode.
        </div>
      )}

      <hr style={{ borderColor: "rgba(255,255,255,.12)" }} />

      {/* Summary (always visible) */}
      <div
        style={{
          padding: 10,
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,.12)",
          background: "rgba(0,0,0,.10)",
          marginBottom: 10,
          display: "grid",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
          <div style={{ fontWeight: 800 }}>Summary</div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button type="button" onClick={expandAll} disabled={locked}>
              Expand
            </button>
            <button type="button" onClick={collapseAll}>
              Collapse
            </button>
          </div>
        </div>

        <div style={{ fontSize: 12, lineHeight: 1.6, opacity: 0.92 }}>
          <div>
            <b>Stage 1 (Theatres):</b> {summaryStatus.s1} · {activeTheatreList.length ? activeTheatreList.join(", ") : "None"}
          </div>

          <div>
            <b>Stage 2 (Nations):</b> {summaryStatus.s2} · Enabled: {enabledCount} · Derived factions: {derivedFactionsLabel}
          </div>

          <div>
            <b>Stage 3 (Homelands):</b> {summaryStatus.s3} · Progress: {homelandProgressLabel}
          </div>

          {selectedSetupNation && (
            <div style={{ marginTop: 4 }}>
              <b>Selected nation:</b> {selectedSetupNation} · Aligned faction: <b>{getFactionKeyForNation(selectedSetupNation)}</b>
            </div>
          )}
        </div>
      </div>

      {locked && (
        <div
          style={{
            marginBottom: 10,
            padding: 8,
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,.12)",
            opacity: 0.9,
          }}
        >
          Setup is locked (PLAY). GM can unlock to edit.
        </div>
      )}

      {/* Body (staged) */}
      <div
        style={{
          opacity: canEditSetup ? 1 : 0.6,
          pointerEvents: canEditSetup ? ("auto" as const) : ("none" as const),
          display: "grid",
          gap: 10,
        }}
      >
        {/* Stage 1 */}
        <SectionHeader
          title="1) Theatres in play"
          open={open1}
          onToggle={() => setOpen1((v) => !v)}
          status={locked ? "LOCKED" : stage1Done ? "DONE" : "TODO"}
          subtitle={
            anyTheatreActive
              ? `Active: ${(["WE", "EE", "NA", "PA"] as const).filter((k) => activeTheatres[k]).join(", ")}`
              : "Pick at least one theatre."
          }
        />

        {open1 && (
          <div style={{ padding: "10px 6px 2px" }}>
            {(["WE", "EE", "NA", "PA"] as const).map((id) => (
              <label key={id} style={{ display: "flex", alignItems: "center", gap: 8, margin: "4px 0" }}>
                <input type="checkbox" checked={activeTheatres[id]} onChange={() => toggleTheatre(id)} />
                <span>{id}</span>
              </label>
            ))}
          </div>
        )}

        {/* Stage 2 */}
        <SectionHeader
          title="2) Nations"
          open={open2}
          onToggle={() => setOpen2((v) => !v)}
          status={locked ? "LOCKED" : stage2Done ? "DONE" : "TODO"}
          subtitle={`${enabledNationIds.length} enabled · Selected: ${selectedSetupNation ?? "—"}`}
        />

        {open2 && (
          <div style={{ padding: "10px 0 0", display: "grid", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 6 }}>
              {allNations.map((n) => (
                <label
                  key={n.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: 6,
                    border: "1px solid rgba(255,255,255,.12)",
                    borderRadius: 6,
                    opacity: nationsEnabledMap[n.id] ? 1 : 0.75,
                  }}
                >
                  <input type="checkbox" checked={!!nationsEnabledMap[n.id]} onChange={() => toggleNationEnabled(n.id)} />
                  <span>
                    {n.flag ? `${n.flag} ` : ""}
                    {n.name}
                  </span>
                </label>
              ))}
            </div>

            <div>
              <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>Pick nation</div>
              <select
                value={selectedSetupNation ?? ""}
                onChange={(e) => {
                  const v = e.target.value as NationKey | "";
                  selectSetupNation(v === "" ? null : v);
                                    if (v) setViewerNation(v as NationKey);
                }}
                style={{ width: "100%" }}
              >
                <option value="">— Select —</option>
                {allNations.filter((n) => nationsEnabledMap[n.id]).map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.flag ? `${n.flag} ` : ""}
                    {n.name}
                  </option>
                ))}
              </select>

              {selectedSetupNation && (
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                  Aligned faction: <b>{getFactionKeyForNation(selectedSetupNation)}</b>
                </div>
              )}

              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
                <b>Factions in play:</b> {derivedFactionsLabel}
              </div>
            </div>

            <div style={{ border: "1px dashed rgba(255,255,255,.12)", borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>Create custom nation</div>
              <div style={{ display: "grid", gap: 8 }}>
                <input
                  value={customNationName}
                  onChange={(e) => setCustomNationName(e.target.value)}
                  placeholder="Nation name"
                />
                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 12, opacity: 0.8 }}>Default faction</span>
                  <select
                    value={customNationFaction}
                    onChange={(e) => setCustomNationFaction(e.target.value as BaseFactionKey)}
                  >
                    <option value="allies">Allies</option>
                    <option value="axis">Axis</option>
                    <option value="ussr">USSR</option>
                  </select>
                </label>
                <button
                  type="button"
                  disabled={!customNationName.trim() || !canEditSetup}
                  onClick={() => {
                    if (!customNationName.trim()) return;
                    createCustomNation(customNationName.trim(), customNationFaction);
                    setCustomNationName("");
                  }}
                >
                  Add Nation
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stage 3 */}
        <SectionHeader
          title="3) Homelands"
          open={open3}
          onToggle={() => setOpen3((v) => !v)}
          status={locked ? "LOCKED" : stage3Done ? "DONE" : "TODO"}
          subtitle={`Progress: ${homelandProgressLabel}`}
        />

        {open3 && (
          <div style={{ paddingTop: 10 }}>
            <div style={{ marginBottom: 12, padding: 10, border: "1px solid rgba(255,255,255,.12)", borderRadius: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={homelandUnlock}
                  onChange={(e) => setHomelandUnlock(e.target.checked)}
                  disabled={!canEditSetup}
                />
                <span style={{ fontSize: 12, opacity: 0.85 }}>
                  Unlock homelands (allow any territory/region regardless of theatre)
                </span>
              </label>
            </div>
            <div style={{ marginTop: 8, padding: 10, border: "1px solid rgba(255,255,255,.12)", borderRadius: 8 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Set from Region Group</div>

              {regionGroups.length === 0 ? (
                <div style={{ fontSize: 12, opacity: 0.8 }}>Loading region groups…</div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  <label style={{ display: "grid", gap: 4 }}>
                    <span style={{ fontSize: 12, opacity: 0.85 }}>Region</span>
                    <select
                      value={regionId}
                      onChange={(e) => {
                        const nextRegionId = e.target.value;
                        setRegionId(nextRegionId);
                        setSelectedRegion(nextRegionId);

                        const nextRegion = regionGroups.find((g) => g.id === nextRegionId);
                        const firstTid = nextRegion?.territories?.[0] ?? "";
                        setRegionTerritoryId(firstTid);
                        if (firstTid) setSelectedTerritory(firstTid);
                      }}
                      style={{ width: "100%" }}
                    >
                      {regionGroups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label style={{ display: "grid", gap: 4 }}>
                    <span style={{ fontSize: 12, opacity: 0.85 }}>Territory</span>
                    <select
                      value={safeRegionTerritoryId}
                      onChange={(e) => {
                        const tid = e.target.value;
                        setRegionTerritoryId(tid);
                        setSelectedTerritory(tid);
                      }}
                      style={{ width: "100%" }}
                    >
                      {(activeRegion?.territories ?? []).map((tid) => (
                        <option key={tid} value={tid}>
                          {territoryNameById[tid] ? `${territoryNameById[tid]} (${tid})` : tid}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button
                    disabled={!canSetHomeland}
                    onClick={() => {
                      if (!selectedSetupNation) return;

                      const ok = canPickNationHomeland(safeRegionTerritoryId);
                      if (!ok.ok) return;

                      // Nation homeland (primary)
                      setNationHomeland(selectedSetupNation, safeRegionTerritoryId);

                      // Bridge: faction homeland (legacy systems)
                      const fk = getFactionKeyForNation(selectedSetupNation);
                      setHomeland(fk, safeRegionTerritoryId);

                      setSelectedTerritory(safeRegionTerritoryId);

                      // UX: once you set a homeland, you normally don't need stages 1/2 open.
                      setOpen1(false);
                      setOpen2(false);
                      setOpen3(true);
                    }}
                  >
                    Set Homeland
                  </button>

                  <div style={{ fontSize: 12, opacity: 0.75 }}>You can still click the map instead if you prefer.</div>
                </div>
              )}
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Homelands (by nation)</div>
              <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                {Object.keys(homelandsByNation).length === 0
                  ? "None set yet."
                  : Object.entries(homelandsByNation).map(([nid, tid]) => {
                      const n =
                        allNations.find((x) => x.id === nid) ??
                        NATIONS.find((x) => x.id === nid);
                      return (
                        <div key={nid}>
                          <b>{n?.name ?? nid}</b>: {territoryNameById[tid] ? `${territoryNameById[tid]} (${tid})` : tid}
                        </div>
                      );
                    })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
