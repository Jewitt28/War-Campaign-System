import { useEffect, useMemo, useState } from "react";
import type { NormalizedData } from "../data/theatres";
import { useCampaignStore, type FactionKey, type OwnerKey } from "../store/useCampaignStore";
import { factionLabel } from "../store/factionLabel";

type Props = {
  data: NormalizedData | null;
  variant?: "full" | "compact";
};

type RegionStatus = {
  id: string;
  name: string;
  theatreId: string;
  territories: string[];
  bonus?: string;
  status: "controlled" | "contested" | "neutral";
  controllingFaction?: FactionKey;
  contestedTerritories: string[];
};

type Member = {
  id: string;
  name: string;
  role: "Leader" | "Co-Leader" | "General";
  theatre?: string;
};

const RESOURCE_ICONS: Record<string, string> = {
  manpower: "🪖",
  industry: "🏭",
  fuel: "⛽",
  intel: "🛰️",
  requisition: "📦",
  resource: "📦",
};

const THEATRE_ICONS: Record<string, string> = {
  WE: "🌍",
  EE: "🌐",
  NA: "🌎",
  PA: "🌊",
};

const ROLE_OPTIONS: Member["role"][] = ["Leader", "Co-Leader", "General"];

function summarizeBonus(bonus?: string) {
  if (!bonus) return [];
  const lower = bonus.toLowerCase();
  const matches: Array<{ icon: string; label: string }> = [];

  if (lower.includes("manpower")) matches.push({ icon: RESOURCE_ICONS.manpower, label: "Manpower" });
  if (lower.includes("industry")) matches.push({ icon: RESOURCE_ICONS.industry, label: "Industry" });
  if (lower.includes("fuel")) matches.push({ icon: RESOURCE_ICONS.fuel, label: "Fuel" });
  if (lower.includes("intel")) matches.push({ icon: RESOURCE_ICONS.intel, label: "Intel" });
  if (lower.includes("requisition")) matches.push({ icon: RESOURCE_ICONS.requisition, label: "Requisition" });
  if (lower.includes("resource")) matches.push({ icon: RESOURCE_ICONS.resource, label: "Resource" });

  return matches;
}

function parseBonusAmount(bonus?: string) {
  if (!bonus) return null;
  const match = bonus.match(/\+?\d+/);
  return match ? match[0] : null;
}

function buildOwnerSet(owners: OwnerKey[]) {
  return new Set(owners.filter((o) => o !== "neutral"));
}

export default function CommandHub({ data, variant = "full" }: Props) {
  const viewerFaction = useCampaignStore((s) => s.viewerFaction);
  const viewerMode = useCampaignStore((s) => s.viewerMode);
  const customs = useCampaignStore((s) => s.customs);
  const suppliesByFaction = useCampaignStore((s) => s.suppliesByFaction);
  const regionsFromStore = useCampaignStore((s) => s.regions);
  const ownerByTerritory = useCampaignStore((s) => s.ownerByTerritory);
  const contestsByTerritory = useCampaignStore((s) => s.contestsByTerritory);
  const platoonsById = useCampaignStore((s) => s.platoonsById);

  const territoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const territory of data?.territories ?? []) map.set(territory.id, territory.name);
    return map;
  }, [data]);

  const regions = useMemo(() => {
    if (regionsFromStore.length) return regionsFromStore;
    return data?.territoryGroups ?? [];
  }, [regionsFromStore, data]);

  const regionStatusList = useMemo<RegionStatus[]>(() => {
    return regions.map((region) => {
      const owners = region.territories.map((tid) => ownerByTerritory[tid] ?? "neutral");
      const ownerSet = buildOwnerSet(owners);
      const hasContested = owners.includes("contested");
      const contestedTerritories = region.territories.filter((tid) => ownerByTerritory[tid] === "contested");

      if (hasContested || ownerSet.size > 1) {
        return {
          ...region,
          status: "contested",
          contestedTerritories,
        };
      }

      const onlyOwner = owners[0] ?? "neutral";
      if (onlyOwner !== "neutral" && onlyOwner !== "contested") {
        return {
          ...region,
          status: "controlled",
          controllingFaction: onlyOwner as FactionKey,
          contestedTerritories,
        };
      }

      return { ...region, status: "neutral", contestedTerritories };
    });
  }, [regions, ownerByTerritory]);

  const controlledByViewer = regionStatusList.filter(
    (region) => region.status === "controlled" && region.controllingFaction === viewerFaction
  );
  const contestedRegions = regionStatusList.filter((region) => region.status === "contested");

  const factionDisplayName = factionLabel(viewerFaction, customs);
  const canManageRoles = viewerMode === "GM";
  const isCompact = variant === "compact";

  const resourceSnapshot = useMemo(() => {
    const base = suppliesByFaction?.[viewerFaction] ?? 0;
    return [
      { key: "manpower", label: "Manpower", value: Math.max(0, Math.round(base * 1.5)) },
      { key: "industry", label: "Industry", value: base },
      { key: "fuel", label: "Fuel", value: Math.max(0, Math.round(base * 0.6)) },
      { key: "intel", label: "Intel", value: Math.max(0, Math.round(base * 0.3)) },
    ];
  }, [suppliesByFaction, viewerFaction]);

  const initialMembers = useMemo<Member[]>(
    () => [
      { id: "leader", name: `${factionDisplayName} Command`, role: "Leader", theatre: "HQ" },
      { id: "officer-1", name: "Field Marshal", role: "Co-Leader", theatre: "WE" },
      { id: "officer-2", name: "Operations Lead", role: "General", theatre: "EE" },
      { id: "officer-3", name: "Logistics Chief", role: "General", theatre: "NA" },
    ],
    [factionDisplayName]
  );

  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [chatMessages, setChatMessages] = useState<
    Array<{ id: string; sender: string; text: string; ts: string; system?: boolean }>
  >([
    { id: "sys-1", sender: "System", text: `Joined ${factionDisplayName} channel`, ts: "Just now", system: true },
    { id: "msg-1", sender: "HQ", text: "Secure your regional bonuses before the next strategic turn.", ts: "2m ago" },
  ]);
  const [chatInput, setChatInput] = useState("");

  useEffect(() => {
    // setMembers(initialMembers);
    // setChatMessages([
    //   { id: "sys-1", sender: "System", text: `Joined ${factionDisplayName} channel`, ts: "Just now", system: true },
    //   { id: "msg-1", sender: "HQ", text: "Secure your regional bonuses before the next strategic turn.", ts: "2m ago" },
    // ]);
  }, [initialMembers, factionDisplayName]);

  const handleRoleChange = (id: string, role: Member["role"]) => {
    setMembers((prev) => prev.map((member) => (member.id === id ? { ...member, role } : member)));
  };

  const sendChat = () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    setChatMessages((prev) => [
      { id: String(Date.now()), sender: "You", text: trimmed, ts: "now" },
      ...prev,
    ]);
    setChatInput("");
  };

  return (
    <div style={{ padding: isCompact ? 14 : 20, display: "grid", gap: isCompact ? 14 : 20 }}>
      <section style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "rgba(255,255,255,.12)",
              display: "grid",
              placeItems: "center",
              fontSize: 24,
            }}
            aria-hidden="true"
          >
            🛡️
          </div>
          <div>
            <h2 style={{ margin: 0 }}>{factionDisplayName} Command Hub</h2>
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              Faction overview · Resources include active region bonuses and supply status.
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 12,
          }}
        >
          {resourceSnapshot.map((resource) => (
            <div
              key={resource.key}
              style={{
                border: "1px solid rgba(255,255,255,.12)",
                borderRadius: 12,
                padding: 10,
                background: "rgba(0,0,0,.12)",
              }}
            >
              <div style={{ fontSize: 20 }}>{RESOURCE_ICONS[resource.key]}</div>
              <div style={{ fontWeight: 700 }}>{resource.label}</div>
              <div style={{ fontSize: 18 }}>{resource.value}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 14, padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Regions in Control</h3>
        {controlledByViewer.length ? (
          <div style={{ display: "grid", gap: 12 }}>
            {controlledByViewer.map((region) => {
              const bonusHighlights = summarizeBonus(region.bonus);
              const bonusAmount = parseBonusAmount(region.bonus);
              return (
                <div
                  key={region.id}
                  style={{
                    border: "1px solid rgba(255,255,255,.12)",
                    borderRadius: 12,
                    padding: 12,
                    background: "rgba(0,0,0,.15)",
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{THEATRE_ICONS[region.theatreId] ?? "🗺️"}</span>
                    <div style={{ fontWeight: 700 }}>{region.name}</div>
                    <span style={{ marginLeft: "auto", fontSize: 12, opacity: 0.8 }}>⭐ Bonus active</span>
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>{region.bonus ?? "No bonus listed."}</div>
                  {bonusHighlights.length ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {bonusHighlights.map((item) => (
                        <span
                          key={item.label}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 12,
                            padding: "4px 8px",
                            borderRadius: 999,
                            border: "1px solid rgba(255,255,255,.15)",
                            background: "rgba(255,255,255,.08)",
                          }}
                        >
                          <span>{item.icon}</span>
                          <span>
                            {bonusAmount ?? "+"} {item.label}
                          </span>
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ margin: 0, opacity: 0.7 }}>No regions fully controlled. Secure all territories to claim bonuses.</p>
        )}
      </section>

      {!isCompact ? (
        <section style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 14, padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Contested Regions</h3>
          {contestedRegions.length ? (
            <div style={{ display: "grid", gap: 14 }}>
              {contestedRegions.map((region) => {
                const contestedTerritories = region.territories.filter(
                  (tid) => ownerByTerritory[tid] === "contested" || contestsByTerritory[tid]
                );

                return (
                  <div
                    key={region.id}
                    style={{
                      border: "1px solid rgba(239,68,68,.35)",
                      borderRadius: 14,
                      padding: 14,
                      background: "rgba(239,68,68,.08)",
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 18 }}>⚔️</span>
                      <div style={{ fontWeight: 700 }}>{region.name}</div>
                      <span style={{ marginLeft: "auto", fontSize: 12, opacity: 0.8 }}>
                        {contestedTerritories.length} contested territories
                      </span>
                    </div>

                    {contestedTerritories.length ? (
                      <div style={{ display: "grid", gap: 10 }}>
                        {contestedTerritories.map((tid) => {
                          const contest = contestsByTerritory[tid];
                          const territoryName = territoryNameById.get(tid) ?? tid;
                          const attackers = contest?.attackerPlatoonIds ?? [];
                          const defenders = contest?.defenderPlatoonIds ?? [];

                          const renderPlatoon = (pid: string) => {
                            const platoon = platoonsById[pid];
                            if (!platoon) return null;
                            return (
                              <div
                                key={pid}
                                style={{
                                  border: "1px solid rgba(255,255,255,.12)",
                                  borderRadius: 10,
                                  padding: 8,
                                  display: "grid",
                                  gap: 4,
                                  background: "rgba(0,0,0,.15)",
                                }}
                              >
                                <div style={{ fontWeight: 700 }}>{platoon.name}</div>
                                <div style={{ fontSize: 12, opacity: 0.75 }}>
                                  {platoon.faction} · {platoon.condition} · {platoon.strengthPct}% strength
                                </div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, fontSize: 11 }}>
                                  <span style={{ padding: "2px 6px", borderRadius: 999, border: "1px solid rgba(255,255,255,.2)" }}>
                                    MP {platoon.mpBase}
                                  </span>
                                  {(platoon.traits ?? []).map((trait) => (
                                    <span
                                      key={trait}
                                      style={{
                                        padding: "2px 6px",
                                        borderRadius: 999,
                                        border: "1px solid rgba(255,255,255,.2)",
                                      }}
                                    >
                                      {trait}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          };

                          return (
                            <div key={tid} style={{ display: "grid", gap: 8 }}>
                              <div style={{ fontWeight: 600 }}>
                                {territoryName} <span style={{ opacity: 0.7 }}>({tid})</span>
                              </div>
                              {contest ? (
                                <div style={{ fontSize: 12, opacity: 0.8 }}>
                                  {contest.attackerFaction} vs {contest.defenderFaction} · {contest.status}
                                </div>
                              ) : (
                                <div style={{ fontSize: 12, opacity: 0.8 }}>Skirmish ongoing · details pending</div>
                              )}

                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                                {attackers.length ? (
                                  <div style={{ display: "grid", gap: 6 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700 }}>Attackers</div>
                                    {attackers.map((pid) => renderPlatoon(pid))}
                                  </div>
                                ) : null}
                                {defenders.length ? (
                                  <div style={{ display: "grid", gap: 6 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700 }}>Defenders</div>
                                    {defenders.map((pid) => renderPlatoon(pid))}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, opacity: 0.7 }}>
                        No active contests recorded yet. Monitor supply lines and reinforce positions.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ margin: 0, opacity: 0.7 }}>No contested regions at the moment.</p>
          )}
        </section>
      ) : (
        <section style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 14, padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Region Snapshot</h3>
          <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
            <div>
              Controlled regions: <b>{controlledByViewer.length}</b>
            </div>
            <div>
              Contested regions: <b>{contestedRegions.length}</b>
            </div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Expand below the map for full contest breakdowns.
            </div>
          </div>
        </section>
      )}

      <section style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 14, padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Strategy Links</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button type="button">Research</button>
          <button type="button">Doctrine</button>
          <button type="button">Upgrades</button>
          <button type="button">Diplomacy</button>
          <button type="button">Profile</button>
        </div>
      </section>

      {!isCompact ? (
        <section style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 14, padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Diplomacy & Resource Sharing</h3>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              Leaders can propose agreements or share resources with allied factions.
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>Target faction</span>
                <select disabled={!canManageRoles}>
                  <option>Allies</option>
                  <option>Axis</option>
                  <option>USSR</option>
                </select>
              </label>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>Agreement type</span>
                <select disabled={!canManageRoles}>
                  <option>Alliance (shared vision)</option>
                  <option>Non-Aggression Pact</option>
                  <option>Resource Treaty</option>
                </select>
              </label>
              <button type="button" disabled={!canManageRoles}>
                Send Proposal
              </button>
            </div>
            <div style={{ borderTop: "1px solid rgba(255,255,255,.12)", paddingTop: 10, display: "grid", gap: 6 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Active Agreements</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>No active agreements yet.</div>
            </div>
            <div style={{ borderTop: "1px solid rgba(255,255,255,.12)", paddingTop: 10, display: "grid", gap: 6 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Send Resources</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input type="number" placeholder="Fuel" disabled={!canManageRoles} />
                <input type="number" placeholder="Industry" disabled={!canManageRoles} />
                <input type="number" placeholder="Manpower" disabled={!canManageRoles} />
                <button type="button" disabled={!canManageRoles}>
                  Send Resources
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {!isCompact ? (
        <section style={{ display: "grid", gap: 14, gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}>
          <div style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 14, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>Faction Members</h3>
            <div style={{ display: "grid", gap: 10 }}>
              {members.map((member) => (
                <div
                  key={member.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 10,
                    alignItems: "center",
                    padding: 10,
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,.12)",
                    background: "rgba(0,0,0,.12)",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                      {member.name}
                      {member.role === "Leader" && <span title="Leader">👑</span>}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>
                      {member.role} · {member.theatre ?? "Global"}
                    </div>
                  </div>
                  {canManageRoles ? (
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.id, e.target.value as Member["role"])}
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
              ))}
            </div>
            {!canManageRoles && (
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.65 }}>
                Only the faction leader or GM can manage roles.
              </div>
            )}
          </div>

          <div style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 14, padding: 16, display: "grid", gap: 10 }}>
            <h3 style={{ marginTop: 0 }}>Faction Chat</h3>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Private channel · {factionDisplayName}</div>
            <div
              style={{
                border: "1px solid rgba(255,255,255,.12)",
                borderRadius: 10,
                padding: 8,
                height: 200,
                overflowY: "auto",
                display: "grid",
                gap: 8,
              }}
            >
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    padding: 6,
                    borderRadius: 8,
                    background: msg.system ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.2)",
                    fontSize: 12,
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 11, opacity: 0.8 }}>
                    {msg.sender} · {msg.ts}
                  </div>
                  <div>{msg.text}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Message your faction…"
                style={{ flex: 1 }}
              />
              <button type="button" onClick={sendChat} disabled={!chatInput.trim()}>
                Send
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
