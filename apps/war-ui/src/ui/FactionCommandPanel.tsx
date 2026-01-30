import { useMemo, useState } from "react";
import { NATION_BY_ID } from "../setup/NationDefinitions";
import { factionLabel } from "../store/factionLabel";
import { useCampaignStore } from "../store/useCampaignStore";
import { getFactionAccent } from "./factionColors";

type ChatMessage = {
  id: string;
  sender: string;
  text: string;
  ts: string;
  system?: boolean;
};

export default function FactionCommandPanel() {
  const viewerNation = useCampaignStore((s) => s.viewerNation);
  const viewerFaction = useCampaignStore((s) => s.viewerFaction);
  const customNations = useCampaignStore((s) => s.customNations);
  const customs = useCampaignStore((s) => s.customs);
  const factions = useCampaignStore((s) => s.factions);

  const accentColor = getFactionAccent({
    viewerNation,
    viewerFaction,
    customNations,
    customs,
  });

  const allNations = useMemo(() => {
    const base = Object.values(NATION_BY_ID).map((nation) => ({
      id: nation.id,
      name: nation.name,
      faction: nation.defaultFaction,
    }));
    const custom = customNations.map((nation) => ({
      id: nation.id,
      name: nation.name,
      faction: nation.defaultFaction,
    }));
    return [...base, ...custom];
  }, [customNations]);

  const factionsWithNations = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        label: string;
        nations: { id: string; name: string }[];
      }
    >();

    for (const faction of factions) {
      map.set(faction.id, {
        id: faction.id,
        label: factionLabel(faction.id, customs),
        nations: [],
      });
    }

    for (const custom of customs) {
      const id = `custom:${custom.id}`;
      map.set(id, {
        id,
        label: custom.name,
        nations: [],
      });
    }

    for (const nation of allNations) {
      const entry = map.get(nation.faction);
      if (entry) {
        entry.nations.push({ id: nation.id, name: nation.name });
      }
    }

    return Array.from(map.values()).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [allNations, customs, factions]);

  const viewerFactionEntry = factionsWithNations.find(
    (entry) => entry.id === viewerFaction,
  );

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "sys-1",
      sender: "System",
      text: `Joined ${factionLabel(viewerFaction, customs)} channel`,
      ts: "Just now",
      system: true,
    },
    {
      id: "msg-1",
      sender: "HQ",
      text: "Coordinate reinforcements before the next phase.",
      ts: "2m ago",
    },
  ]);
  const [chatInput, setChatInput] = useState("");

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
    <div
      style={{
        padding: 18,
        display: "grid",
        gap: 16,
        border: `1px solid ${accentColor}55`,
        borderRadius: 14,
        background: `linear-gradient(135deg, ${accentColor}18, rgba(0,0,0,0))`,
      }}
    >
      <section style={{ display: "grid", gap: 8 }}>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          Faction Command
        </div>
        <h2 style={{ margin: 0 }}>{factionLabel(viewerFaction, customs)}</h2>
        <div style={{ fontSize: 13, opacity: 0.8 }}>
          Strategic overview for allied nations and shared objectives.
        </div>
      </section>

      <section
        style={{
          border: "1px solid rgba(255,255,255,.12)",
          borderRadius: 12,
          padding: 12,
          display: "grid",
          gap: 8,
        }}
      >
        <h3 style={{ marginTop: 0 }}>Aligned Nations</h3>
        {viewerFactionEntry?.nations.length ? (
          <div style={{ display: "grid", gap: 6 }}>
            {viewerFactionEntry.nations.map((nation) => (
              <div
                key={nation.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                }}
              >
                <span>{nation.name}</span>
                <span style={{ opacity: 0.7 }}>{nation.id}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            No aligned nations assigned yet.
          </div>
        )}
      </section>

      <section
        style={{
          border: "1px solid rgba(255,255,255,.12)",
          borderRadius: 12,
          padding: 12,
          display: "grid",
          gap: 10,
        }}
      >
        <h3 style={{ marginTop: 0 }}>Factions in Play</h3>
        <div style={{ display: "grid", gap: 10 }}>
          {factionsWithNations.map((entry) => (
            <div
              key={entry.id}
              style={{
                border: "1px solid rgba(255,255,255,.12)",
                borderRadius: 10,
                padding: 10,
                background:
                  entry.id === viewerFaction
                    ? "rgba(59,130,246,.15)"
                    : "rgba(0,0,0,.2)",
              }}
            >
              <div style={{ fontWeight: 700 }}>
                {entry.label}
                {entry.id === viewerFaction ? " · Your faction" : ""}
              </div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                Nations:{" "}
                {entry.nations.length
                  ? entry.nations.map((n) => n.name).join(", ")
                  : "None"}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        style={{
          border: "1px solid rgba(255,255,255,.12)",
          borderRadius: 12,
          padding: 12,
          display: "grid",
          gap: 10,
        }}
      >
        <h3 style={{ marginTop: 0 }}>Faction Chat</h3>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          Private channel · {factionLabel(viewerFaction, customs)}
        </div>

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
                background: msg.system
                  ? "rgba(255,255,255,.08)"
                  : "rgba(0,0,0,.2)",
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
          <button
            type="button"
            onClick={sendChat}
            disabled={!chatInput.trim()}
          >
            Send
          </button>
        </div>
      </section>
    </div>
  );
}
