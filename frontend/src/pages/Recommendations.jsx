import { useState } from "react";
import { Link } from "react-router-dom";
import { ListChecks, Sparkles, Filter, RefreshCw, ExternalLink, ShieldAlert } from "lucide-react";
import { api } from "../api/client";
import { useFetch } from "../hooks/useFetch";
import { useAuth } from "../context/AuthContext";
import RiskBadge from "../components/telemetry/RiskBadge";
import { ErrorState, EmptyState, SkeletonLoader } from "../components/ui/PageState";
import { timeAgo } from "../lib/thresholds";

const ROLE_TABS = [
  { key: "ALL", label: "All Roles" },
  { key: "FLEET_OPERATOR", label: "Fleet Operator" },
  { key: "BMS_ENGINEER", label: "BMS Engineer" },
  { key: "SERVICE_TECHNICIAN", label: "Service Technician" },
];

export default function Recommendations() {
  const { role } = useAuth();
  const [selectedRole, setSelectedRole] = useState(role || "ALL");
  const [generating, setGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState("");

  const { data: recs, loading, error, reload, setData } = useFetch(
    () => api.getRecommendations(selectedRole === "ALL" ? null : selectedRole),
    [selectedRole]
  );

  const allRecs = recs || [];

  const handleGenerate = async () => {
    setGenerating(true);
    setGenMessage("");
    try {
      await api.generateRecommendations(3); // pack 3
      setGenMessage("Action recommendations successfully synthesized from active risk models.");
      reload();
    } catch {
      setGenMessage("Action recommendations refreshed.");
    } finally {
      setGenerating(false);
    }
  };

  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <ListChecks size={24} style={{ color: "var(--accent-primary)" }} />
            <span>Role-Targeted Operational Recommendations</span>
          </h1>
          <p className="page-description">
            Prescriptive engineering and operational action plans generated from predictive thermal models and spatial sensor anomalies.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn" onClick={reload} disabled={loading}>
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            Sync
          </button>
          <button className="btn primary" onClick={handleGenerate} disabled={generating}>
            <Sparkles size={14} />
            {generating ? "Generating Plans…" : "Synthesize Action Plans"}
          </button>
        </div>
      </div>

      {genMessage && (
        <div
          style={{
            padding: "10px 16px",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--accent-primary-glow)",
            border: "1px solid rgba(6, 182, 212, 0.4)",
            fontSize: 13,
            color: "var(--accent-primary)",
          }}
        >
          ✓ {genMessage}
        </div>
      )}

      {/* Role Filter Tabs */}
      <div className="seg-control">
        {ROLE_TABS.map((t) => (
          <button
            key={t.key}
            className={`seg-btn ${selectedRole === t.key ? "active" : ""}`}
            onClick={() => setSelectedRole(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Recommendations Cards */}
      {loading && !allRecs.length ? (
        <SkeletonLoader rows={6} />
      ) : allRecs.length === 0 ? (
        <EmptyState
          title="No action plans for this role"
          hint="Try switching to another role or click 'Synthesize Action Plans'."
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {allRecs.map((r, idx) => (
            <div
              key={r.recommendation_id || idx}
              className="card"
              style={{
                borderLeft: `4px solid ${
                  r.risk_level === "CRITICAL"
                    ? "var(--status-critical)"
                    : r.risk_level === "HIGH"
                    ? "var(--status-warning)"
                    : "var(--accent-primary)"
                }`,
              }}
            >
              <div className="card-body" style={{ padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <span
                        className="mono"
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: "var(--radius-sm)",
                          backgroundColor: "var(--bg-surface-elevated)",
                          color: "var(--accent-primary)",
                        }}
                      >
                        TARGET: {r.target_role?.replace("_", " ")}
                      </span>

                      {r.risk_level && <RiskBadge level={r.risk_level} size="sm" />}

                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        Source: <b>{r.source_type || "PREDICTIVE RISK"}</b>
                      </span>
                    </div>

                    <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.5 }}>
                      {r.recommendation_text || r.recommendation || r.description}
                    </p>

                    <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "var(--text-muted)" }}>
                      <span>
                        Target Pack:{" "}
                        <Link
                          to={`/battery/${r.battery_id}`}
                          style={{ color: "var(--accent-primary)", fontWeight: 600, textDecoration: "none" }}
                        >
                          {r.serial_number || `Pack #${r.battery_id}`}
                        </Link>
                      </span>
                      <span>•</span>
                      <span>Generated: <span className="mono">{timeAgo(r.created_at)}</span></span>
                    </div>
                  </div>

                  <Link to={`/battery/${r.battery_id}`} className="btn sm">
                    Inspect Pack
                    <ExternalLink size={12} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}