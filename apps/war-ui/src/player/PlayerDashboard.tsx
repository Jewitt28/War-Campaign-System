import { useMemo } from "react";
import { useCampaignStore } from "../store/useCampaignStore";
import type { Platoon } from "../domain/types";
import type { NormalizedData } from "../data/theatres";
import type { Tab } from "../ui/CommandPanel";

type Props = {
  data: NormalizedData | null;
  tab: Tab;
};

export default function PlayerDashboard({ data, tab }: Props) {
  const viewerMode = useCampaignStore((s) => s.viewerMode);
  const viewerFaction = useCampaignStore((s) => s.viewerFaction);
  const turnNumber = useCampaignStore((s) => s.turnNumber);
  const platoonsById = useCampaignStore((s) => s.platoonsById);

  const myPlatoons = useMemo(() => {
    const all = Object.values(platoonsById) as Platoon[];
    return all.filter((p) => p.faction === viewerFaction);
  }, [platoonsById, viewerFaction]);

  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      <div>
        <h2 style={{ margin: 0 }}>Player Dashboard</h2>
        <div style={{ opacity: 0.8 }}>
          Tab: <b>{tab}</b> · Data: <b>{data ? "loaded" : "null"}</b>
        </div>
        <div style={{ opacity: 0.8, marginTop: 6 }}>
          Viewer: <b>{viewerMode}</b> · Acting faction: <b>{viewerFaction}</b> · Turn: <b>{turnNumber}</b>
        </div>
      </div>

      <section style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>Your Platoons</h3>

        {myPlatoons.length ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {myPlatoons.map((p) => (
              <li key={p.id}>
                <b>{p.name}</b> — {p.condition} · {p.strengthPct}% · {p.territoryId}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: 0, opacity: 0.8 }}>No platoons for this faction yet.</p>
        )}
      </section>

      <p style={{ margin: 0, opacity: 0.7 }}>
        Next: wire player orders + movement selection using NormalizedData (territories list) and submit orders.
      </p>
    </div>
  );
}
