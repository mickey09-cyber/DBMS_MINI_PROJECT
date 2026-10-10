import { useState, useEffect } from "react";
import { Shield, CheckCircle2, AlertTriangle, Users, Database, Cpu, RefreshCw } from "lucide-react";
import { api } from "../api/client";
import { useAuth, ROLES } from "../context/AuthContext";
import StatCard from "../components/ui/StatCard";

export default function Admin() {
  const { user, role, switchRole } = useAuth();
  const [adminVerified, setAdminVerified] = useState(null);
  const [dbTables, setDbTables] = useState(23);

  useEffect(() => {
    api.adminCheck()
      .then((res) => setAdminVerified(true))
      .catch(() => setAdminVerified(false));
  }, [role]);

  const permissions = [
    { name: "View Telemetry & Fleet Overview", roles: ["ALL"] },
    { name: "Acknowledge Operational Alerts", roles: ["FLEET_OPERATOR", "BMS_ENGINEER", "SERVICE_TECHNICIAN", "ADMIN"] },
    { name: "Submit Prediction Feedback", roles: ["FLEET_OPERATOR", "BMS_ENGINEER", "SERVICE_TECHNICIAN", "ADMIN"] },
    { name: "Trigger Anomaly Scanner", roles: ["BMS_ENGINEER", "ADMIN"] },
    { name: "Retrain AI Risk Models", roles: ["BMS_ENGINEER", "ADMIN"] },
    { name: "Inject Raw Sensor Telemetry", roles: ["BMS_ENGINEER", "RESEARCHER", "ADMIN"] },
    { name: "Modify System Governance", roles: ["ADMIN"] },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Shield size={24} style={{ color: "var(--accent-primary)" }} />
            <span>System Governance & Role Access</span>
          </h1>
          <p className="page-description">
            Role-based access control (RBAC), database security compliance, and system diagnostic integrity for the battery intelligence platform.
          </p>
        </div>
      </div>

      {/* Governance Stats */}
      <div className="stats-grid">
        <StatCard
          label="Active Role"
          value={role}
          sub={`Logged in as ${user.username}`}
          icon={Users}
          tone="accent"
        />

        <StatCard
          label="Database Schema"
          value={`${dbTables} Tables`}
          sub="PostgreSQL 18 relational engine"
          icon={Database}
          tone="safe"
        />

        <StatCard
          label="Model Architecture"
          value="RandomForest"
          sub="Dual classification + Safety Rules"
          icon={Cpu}
          tone="normal"
        />

        <StatCard
          label="Admin Privilege Check"
          value={role === "ADMIN" ? "AUTHORIZED" : "ROLE LOCKED"}
          sub={role === "ADMIN" ? "Full administrative authority" : "Switch role below to test"}
          icon={Shield}
          tone={role === "ADMIN" ? "safe" : "warning"}
        />
      </div>

      {/* Role Switcher Evaluation Sandbox */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Interactive Persona Switcher Sandbox</h3>
            <span className="card-subtitle">
              Quickly switch between all 5 project personas to experience role-tailored capabilities
            </span>
          </div>
        </div>

        <div className="card-body">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            {ROLES.map((r) => {
              const isActive = role === r.key;
              return (
                <div
                  key={r.key}
                  onClick={() => switchRole(r.key)}
                  style={{
                    padding: 14,
                    borderRadius: "var(--radius-md)",
                    backgroundColor: isActive ? "var(--accent-primary-glow)" : "var(--bg-surface-subtle)",
                    border: `1px solid ${isActive ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                    cursor: "pointer",
                    transition: "all var(--transition-fast)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: isActive ? "var(--accent-primary)" : "var(--text-primary)" }}>
                      {r.label}
                    </span>
                    {isActive && <CheckCircle2 size={16} style={{ color: "var(--accent-primary)" }} />}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>
                    {r.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Role Permission Matrix */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Role-Based Access Control (RBAC) Matrix</h3>
        </div>

        <div className="card-body">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Platform Capability</th>
                  <th>Fleet Operator</th>
                  <th>BMS Engineer</th>
                  <th>Service Tech</th>
                  <th>Researcher</th>
                  <th>Admin</th>
                </tr>
              </thead>
              <tbody>
                {permissions.map((p, idx) => {
                  const check = (rKey) => p.roles.includes("ALL") || p.roles.includes(rKey);
                  return (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{p.name}</td>
                      <td>{check("FLEET_OPERATOR") ? "✓ Allowed" : "—"}</td>
                      <td>{check("BMS_ENGINEER") ? "✓ Allowed" : "—"}</td>
                      <td>{check("SERVICE_TECHNICIAN") ? "✓ Allowed" : "—"}</td>
                      <td>{check("RESEARCHER") ? "✓ Allowed" : "—"}</td>
                      <td style={{ color: "var(--status-safe-text)", fontWeight: 700 }}>✓ Allowed</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}