import { useMemo, useState } from "react";

const NATIONS = ["Germany", "Soviet Union", "United States", "Great Britain", "Japan", "Italy"];

export default function ProfileSetup() {
  const [displayName, setDisplayName] = useState("");
  const [selectedNation, setSelectedNation] = useState(NATIONS[0]);
  const [inviteCode, setInviteCode] = useState("");

  const pendingInvites = useMemo(() => ["Operation Torch", "Eastern Front Coalition"], []);

  return (
    <div style={{ padding: 20, display: "grid", gap: 12, maxWidth: 520 }}>
      <h2 style={{ margin: 0 }}>Profile Setup</h2>
      <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>
        Configure your commander profile before joining faction operations.
      </p>

      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ fontSize: 12, opacity: 0.8 }}>Display Name</span>
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Commander Raven" />
      </label>

      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ fontSize: 12, opacity: 0.8 }}>Select Nation</span>
        <select value={selectedNation} onChange={(e) => setSelectedNation(e.target.value)}>
          {NATIONS.map((nation) => (
            <option key={nation} value={nation}>
              {nation}
            </option>
          ))}
        </select>
      </label>

      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>Faction Links</div>
        <button type="button">Request Faction Invite</button>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 12, opacity: 0.8 }}>Join via Invite Code</span>
          <div style={{ display: "flex", gap: 6 }}>
            <input value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="INV-1234" />
            <button type="button" disabled={!inviteCode}>
              Join
            </button>
          </div>
        </label>
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,.12)", paddingTop: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>Pending Invites</div>
        {pendingInvites.length ? (
          <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12 }}>
            {pendingInvites.map((invite) => (
              <li key={invite}>{invite}</li>
            ))}
          </ul>
        ) : (
          <div style={{ fontSize: 12, opacity: 0.7 }}>No pending invites.</div>
        )}
      </div>
    </div>
  );
}
