import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  Search,
  Filter,
  ArrowRight,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { api } from "../api/client";
import { useFetch } from "../hooks/useFetch";
import RiskBadge from "../components/telemetry/RiskBadge";
import StatCard from "../components/ui/StatCard";
import { ErrorState, EmptyState, SkeletonLoader } from "../components/ui/PageState";
import { timeAgo } from "../lib/thresholds";

const TABS = [
  { key: "OPEN", label: "Open Alerts" },
  { key: "ACKNOWLEDGED", label: "Acknowledged" },
  { key: "CONFIRMED", label: "Confirmed Real" },
  { key: "FALSE_ALARM", label: "False Alarms" },
  { key: "ALL", label: "All Records" },
];

export default function Alerts() {
  const { data: alerts, loading, error, reload, setData } = useFetch(api.getAlerts);
  const [tab, setTab] = useState("OPEN");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);

  const allAlerts = alerts || [];

  const countOf = (k) => {
    if (k === "ALL") return allAlerts.length;
    return allAlerts.filter((a) => (a.status || "").toUpperCase() === k).length;
  };

  const filteredList = useMemo(() => {
    return allAlerts
      .filter((a) => {
        const matchesTab = tab === "ALL" || (a.status || "").toUpperCase() === tab;
        const q = search.trim().toLowerCase();
        const matchesSearch =
          !q ||
          a.message?.toLowerCase().includes(q) ||
          a.serial_number?.toLowerCase().includes(q) ||
          String(a.battery_id).includes(q);
        return matchesTab && matchesSearch;
      })
      .sort((a, b) => {
        // Critical and High first, then newest
        const rank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        const rankA = rank[a.priority_code || a.final_risk_level] ?? 4;
        const rankB = rank[b.priority_code || b.final_risk_level] ?? 4;
        return rankA - rankB || new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });
  }, [allAlerts, tab, search]);

  const handleAcknowledge = async (alertId) => {
    setBusyId(alertId);
    try {
      await api.acknowledgeAlert(alertId);
      setData((prev) =>
        prev.map((a) =>
          a.alert_id === alertId || a.id === alertId
            ? { ...a, status: "ACKNOWLEDGED", acknowledged_at: new Date().toISOString() }
            : a
        )
      );
    } catch (err) {
      console.error("Acknowledge failed:", err);
    } finally {
      setBusyId(null);
    }
  };

  const handleSendFeedback = async (alertId, verdict) => {
    setBusyId(alertId);
    try {
      await api.sendFeedback(alertId, verdict);
      const newStatus = verdict === "confirmed" ? "CONFIRMED" : "FALSE_ALARM";
      setData((prev) =>
        prev.map((a) =>
          a.alert_id === alertId || a.id === alertId ? { ...a, status: newStatus } : a
        )
      );
    } catch (err) {
      console.error("Feedback submission failed:", err);
    } finally {
      setBusyId(null);
    }
  };

  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Bell size={24} style={{ color: "var(--accent-primary)" }} />
            <span>Alerts & Safety Dispatch Center</span>
          </h1>
          <p className="page-description">
            Prioritized real-time battery thermal warnings, automated safety trigger dispatches, and human-in-the-loop validation for model retraining.
          </p>
        </div>

        <button className="btn" onClick={reload} disabled={loading}>
          <RefreshCw size={14} className={loading ? "spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Top Alert Stats */}
      <div className="stats-grid">
        <StatCard
          label="Active Open Alerts"
          value={countOf("OPEN")}
          sub="Requires operator review"
          icon={AlertTriangle}
          tone={countOf("OPEN") > 0 ? "warning" : "safe"}
        />

        <StatCard
          label="Acknowledged"
          value={countOf("ACKNOWLEDGED")}
          sub="Under investigation"
          icon={ShieldAlert}
          tone="normal"
        />

        <StatCard
          label="Confirmed Real Alerts"
          value={countOf("CONFIRMED")}
          sub="Verified battery hazard"
          icon={CheckCircle2}
          tone="critical"
        />

        <StatCard
          label="False Alarms"
          value={countOf("FALSE_ALARM")}
          sub="Sensor drift or noise"
          icon={Bell}
          tone="safe"
        />
      </div>

      {/* Filter Tabs and Search Toolbar */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div className="seg-control">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`seg-btn ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              <span>{t.label}</span>
              <span className="seg-badge">{countOf(t.key)}</span>
            </button>
          ))}
        </div>

        <div className="search-input-wrapper">
          <Search size={15} className="search-icon" />
          <input
            type="search"
            className="search-input"
            placeholder="Search alerts or pack serial…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Alert Feed */}
      {loading && !allAlerts.length ? (
        <SkeletonLoader rows={6} />
      ) : filteredList.length === 0 ? (
        <EmptyState
          title={tab === "OPEN" ? "All caught up" : "No alerts found"}
          hint={tab === "OPEN" ? "No open thermal alerts need attention." : "No records match the current filter."}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredList.map((a) => {
            const id = a.alert_id || a.id;
            const isCrit = (a.priority_code || a.final_risk_level) === "CRITICAL";
            const isHigh = (a.priority_code || a.final_risk_level) === "HIGH";
            const isOpen = (a.status || "").toUpperCase() === "OPEN";
            const isAck = (a.status || "").toUpperCase() === "ACKNOWLEDGED";

            return (
              <div
                key={id}
                className="card"
                style={{
                  borderLeft: `4px solid ${
                    isCrit ? "var(--status-critical)" : isHigh ? "var(--status-warning)" : "var(--accent-primary)"
                  }`,
                }}
              >
                <div className="card-body" style={{ padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 280 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <RiskBadge level={a.priority_code || a.final_risk_level} size="sm" />
                        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                          {a.message}
                        </span>
                      </div>

                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14, fontSize: 12.5, color: "var(--text-muted)" }}>
                        <span>
                          Target Pack:{" "}
                          <Link
                            to={`/battery/${a.battery_id}`}
                            style={{ color: "var(--accent-primary)", fontWeight: 600, textDecoration: "none" }}
                          >
                            {a.serial_number || `Pack #${a.battery_id}`}
                          </Link>
                        </span>
                        <span>•</span>
                        <span>Detected: <b className="mono">{timeAgo(a.created_at)}</b></span>
                        <span>•</span>
                        <span>Status: <b className="mono">{a.status}</b></span>
                      </div>

                      {a.recommendation && (
                        <div
                          style={{
                            marginTop: 6,
                            padding: "8px 12px",
                            backgroundColor: "var(--bg-surface-subtle)",
                            borderRadius: "var(--radius-sm)",
                            fontSize: 12.5,
                            color: "var(--text-secondary)",
                            borderLeft: "2px solid var(--accent-primary)",
                          }}
                        >
                          <b>Action:</b> {a.recommendation}
                        </div>
                      )}
                    </div>

                    {/* Operational Triage Actions */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Link to={`/battery/${a.battery_id}`} className="btn sm">
                        Inspect Pack
                        <ExternalLink size={12} />
                      </Link>

                      {isOpen && (
                        <button
                          className="btn sm"
                          onClick={() => handleAcknowledge(id)}
                          disabled={busyId === id}
                        >
                          Acknowledge
                        </button>
                      )}

                      {(isOpen || isAck) && (
                        <>
                          <button
                            className="btn sm primary"
                            onClick={() => handleSendFeedback(id, "confirmed")}
                            disabled={busyId === id}
                          >
                            Confirm Alert
                          </button>
                          <button
                            className="btn sm"
                            onClick={() => handleSendFeedback(id, "false_alarm")}
                            disabled={busyId === id}
                          >
                            False Alarm
                          </button>
                        </>
                      )}

                      {!isOpen && !isAck && (
                        <span
                          className="mono"
                          style={{
                            fontSize: 11,
                            padding: "3px 8px",
                            borderRadius: "var(--radius-sm)",
                            backgroundColor:
                              a.status === "CONFIRMED"
                                ? "var(--status-critical-bg)"
                                : "var(--status-safe-bg)",
                            color:
                              a.status === "CONFIRMED"
                                ? "var(--status-critical-text)"
                                : "var(--status-safe-text)",
                          }}
                        >
                          {a.status === "CONFIRMED" ? "✓ Verified Real Hazard" : "✓ False Alarm Recorded"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
