import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Shield, ArrowRight, Zap, Users } from "lucide-react";
import { useAuth, ROLES } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState("fleet1");
  const [password, setPassword] = useState("secret123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (userKey) => {
    setUsername(userKey);
    setPassword("secret123");
    setLoading(true);
    try {
      await login(userKey, "secret123");
      navigate("/");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "radial-gradient(ellipse at top, #162238 0%, #090d14 70%)",
      }}
    >
      <div className="card" style={{ maxWidth: 440, width: "100%", boxShadow: "var(--shadow-lg)" }}>
        <div className="card-header" style={{ flexDirection: "column", alignItems: "center", textAlign: "center", padding: "28px 24px 16px" }}>
          <div className="brand-icon" style={{ width: 44, height: 44, marginBottom: 10 }}>
            <Zap size={22} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>BatteryIntel Telemetry</h2>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Micro-Channel Thermal & Aging Platform (KJS-CES-02)
          </span>
        </div>

        <div className="card-body" style={{ padding: 24 }}>
          {error && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--status-critical-bg)",
                color: "var(--status-critical-text)",
                border: "1px solid var(--status-critical-border)",
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
                Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-default)",
                  backgroundColor: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  fontSize: 13.5,
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-default)",
                  backgroundColor: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  fontSize: 13.5,
                }}
              />
            </div>

            <button type="submit" className="btn primary" style={{ width: "100%", marginTop: 8 }} disabled={loading}>
              {loading ? "Authenticating…" : "Sign In to Cockpit"}
              <ArrowRight size={14} />
            </button>
          </form>

          {/* Quick Demo Switcher */}
          <div style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid var(--border-subtle)" }}>
            <span style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              1-Click Demo Evaluation Sign-In:
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {ROLES.slice(0, 4).map((r) => {
                const uname = `${r.key.toLowerCase().split("_")[0]}1`;
                return (
                  <button
                    key={r.key}
                    type="button"
                    className="btn sm"
                    onClick={() => handleQuickLogin(uname)}
                    style={{ fontSize: 11.5, justifyContent: "flex-start" }}
                  >
                    <span>{r.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}