type Medal = {
  id: string;
  label: string;
  description: string;
};

const MEDALS: Medal[] = [
  { id: "m1", label: "Iron Guard", description: "Campaign veteran medal." },
  { id: "m2", label: "Shield of Europe", description: "Theatre specialization." },
  { id: "m3", label: "Strategist Star", description: "Awarded for key victories." },
];

export default function ProfilePage() {
  return (
    <div style={{ padding: 20, display: "grid", gap: 12, maxWidth: 640 }}>
      <h2 style={{ margin: 0 }}>Player Profile</h2>
      <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
        <div>
          Nation: <b>Germany</b>
        </div>
        <div>
          Rank: <b>Field Marshal</b>
        </div>
        <div>
          Skill Trees: <b>Armored Doctrine</b>, <b>Logistics</b>
        </div>
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,.12)", paddingTop: 10, display: "grid", gap: 6 }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>Player Record</div>
        <div style={{ fontSize: 12, opacity: 0.8 }}>Battles won: 12 · Platoons commanded: 8 · Campaigns: 3</div>
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,.12)", paddingTop: 10, display: "grid", gap: 6 }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>Medals</div>
        <div style={{ display: "grid", gap: 8 }}>
          {MEDALS.map((medal) => (
            <div
              key={medal.id}
              style={{
                border: "1px solid rgba(255,255,255,.12)",
                borderRadius: 10,
                padding: 10,
                background: "rgba(0,0,0,.12)",
              }}
            >
              <div style={{ fontWeight: 700 }}>{medal.label}</div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>{medal.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
