import { useState } from "react";

type UserRole = "Leader" | "Officer" | "Player" | "GM";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRoles, setUserRoles] = useState<UserRole[]>(["Player"]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!username || !password) return;
    setIsAuthenticated(true);
    setUserRoles(["Player"]);
  };

  return (
    <div style={{ padding: 20, display: "grid", gap: 12, maxWidth: 420 }}>
      <h2 style={{ margin: 0 }}>Login</h2>
      <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>
        Stateless auth will use JWT or session tokens stored client-side once the backend is wired.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10 }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 12, opacity: 0.8 }}>Username</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Commander42" />
        </label>

        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 12, opacity: 0.8 }}>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </label>

        <button type="submit" disabled={!username || !password}>
          Sign In
        </button>
      </form>

      <div style={{ borderTop: "1px solid rgba(255,255,255,.12)", paddingTop: 10, fontSize: 12 }}>
        <div>
          Authenticated: <b>{isAuthenticated ? "Yes" : "No"}</b>
        </div>
        <div>
          Roles: <b>{userRoles.join(", ")}</b>
        </div>
      </div>
    </div>
  );
}
