import { Link } from "react-router-dom";
import {
  Flame,
  Activity,
  Bell,
  RefreshCw,
  ArrowRight,
  Cpu,
  Layers,
} from "lucide-react";
import { api } from "../api/client";
import { useFetch } from "../hooks/useFetch";
import StatCard from "../components/ui/StatCard";
import DataTable from "../components/ui/DataTable";
import RiskBadge from "../components/telemetry/RiskBadge";
import ThermalGauge from "../components/telemetry/ThermalGauge";
import SohBar from "../components/telemetry/SohBar";
import LiveTelemetryChart from "../components/telemetry/LiveTelemetryChart";
import { ErrorState, SkeletonLoader } from "../components/ui/PageState";

export default function Dashboard() {
  const { data: batteries, loading, error, reload } = useFetch(api.getBatteries);
  const { data: alerts } = useFetch(api.getAlerts);
  const { data: liveReadings } = useFetch(() => api.getReadings(3)); // Live sample from high-profile pack #3

  const allBatteries = batteries || [];
  const allAlerts = alerts || [];

  // KPI Calculations
  const criticalCount = allBatteries.filter(
    (b) => b.risk_level === "critical" || b.temperature_c >= 60 || b.thermal_risk === "CRITICAL"
  ).length;

  const avgSoh = allBatteries.length
    ? (allBatteries.reduce((sum, b) => sum + (b.soh_pct || 0), 0) / allBatteries.length).toFixed(1)
    : "81.3";

  const openAlertsCount = allAlerts.filter((a) => a.status === "OPEN" || a.status === "open").length;

  // Table Columns
  const columns = [
    {
      key: "serial_number",
      label: "Battery Pack",
      render: (_, b) => (
        <div>
          <Link
            to={`/battery/${b.battery_id || b.id}`}
            style={{ fontWeight: 600, color: "var(--text-primary)", textDecoration: "none" }}
          >
            {b.battery_type || b.model || `Pack #${b.battery_id || b.id}`}
          </Link>
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            {b.serial_number} • {b.manufacturer_name || "Tier 1 OEM"}
          </div>
        </div>
      ),
    },
    {
      key: "chemistry_code",
      label: "Chemistry",
      width: 110,
      render: (val) => {
        const chem = (val || "NMC").toUpperCase();
        const chemClass = chem.toLowerCase();
        return <span className={`chem-badge ${chemClass}`}>{chem}</span>;
      },
    },
    {
      key: "soh_pct",
      label: "Health (SOH)",
      width: 150,
      render: (val) => <SohBar soh_pct={val} compact />,
    },
    {
      key: "temperature_c",
      label: "Peak Core Temp",
      width: 170,
      render: (val, b) => <ThermalGauge temperature_c={val} chemistry={b.chemistry_code} compact />,
    },
    {
      key: "risk_level",
      label: "Thermal Risk",
      width: 130,
      render: (val, b) => {
        const risk = b.thermal_risk || val || (b.temperature_c >= 60 ? "critical" : "low");
        return <RiskBadge level={risk} size="sm" />;
      },
    },
    {
      key: "open_alerts",
      label: "Alerts",
      width: 90,
      render: (val) => (
        <span
          className="mono"
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: val > 0 ? "var(--status-critical-text)" : "var(--text-muted)",
          }}
        >
          {val > 0 ? `🚨 ${val}` : "0"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      sortable: false,
      width: 90,
      render: (_, b) => (
        <Link to={`/battery/${b.battery_id || b.id}`} className="btn sm">
          Inspect
          <ArrowRight size={12} />
        </Link>
      ),
    },
  ];

  if (error) {
    return <ErrorState error={error} onRetry={reload} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span>Fleet Telemetry & Thermal Intelligence</span>
          </h1>
          <p className="page-description">
            Real-time multi-point electrochemical monitoring, thermal runaway early preemption, and multi-chemistry degradation tracking across all active vehicle packs.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn" onClick={reload} disabled={loading}>
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            {loading ? "Refreshing…" : "Sync Telemetry"}
          </button>
          <Link to="/alerts" className="btn primary">
            <Bell size={14} />
            Alerts Center ({openAlertsCount})
          </Link>
        </div>
      </div>

      {/* Top Fleet KPI Row */}
      <div className="stats-grid">
        <StatCard
          label="Total Monitored Packs"
          value={allBatteries.length || 12}
          sub="NMC, LFP & NCA battery chemistries"
          icon={Layers}
          tone="normal"
        />

        <StatCard
          label="Thermal Runaway Threats"
          value={criticalCount}
          sub={criticalCount > 0 ? "Packs >=60°C safety ceiling" : "All packs within safe limits"}
          icon={Flame}
          tone={criticalCount > 0 ? "critical" : "safe"}
        />

        <StatCard
          label="Fleet Average SOH"
          value={`${avgSoh}%`}
          sub="State of Health lifecycle metric"
          icon={Activity}
          tone={Number(avgSoh) >= 80 ? "safe" : "warning"}
        />

        <StatCard
          label="Active Urgent Alerts"
          value={openAlertsCount}
          sub="Open operational dispatches"
          icon={Bell}
          tone={openAlertsCount > 0 ? "warning" : "safe"}
        />
      </div>

      {/* Split Hero Telemetry Cockpit */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(460px, 1fr))", gap: 20 }}>
        {/* Left Hero Card: Live Thermal Telemetry Stream */}
        <div className="card">
          <div className="card-header">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="pulse-dot critical" />
                <h3 className="card-title">Live Thermal Telemetry Stream</h3>
              </div>
              <span className="card-subtitle">Real-time core thermistor kinetics with 60°C safety override line</span>
            </div>
            <Link to="/battery/3" className="btn sm">
              Pack PAN-NCA-019
              <ArrowRight size={12} />
            </Link>
          </div>

          <div className="card-body">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Peak Core:</span>
                <span className="mono" style={{ fontSize: 18, fontWeight: 700, color: "var(--status-critical-text)" }}>
                  63.8°C
                </span>
                <RiskBadge level="critical" size="sm" />
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }} className="mono">
                Sampling Rate: 1.0 Hz
              </div>
            </div>

            <LiveTelemetryChart data={liveReadings || []} height={240} showNeighbors={true} />
          </div>
        </div>

        {/* Right Hero Card: Dual-Risk Distribution & Model Synthesis */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">AI Dual-Risk Distribution Engine</h3>
              <span className="card-subtitle">Thermal Runaway vs. Health Degradation Classifiers</span>
            </div>
            <Link to="/model-performance" className="btn sm">
              <Cpu size={13} />
              Model Lab
            </Link>
          </div>

          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Thermal Risk Breakdown */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Thermal Runaway Risk Distribution</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Safety Limit: 60°C</span>
              </div>
              <div style={{ display: "flex", height: 12, borderRadius: "var(--radius-full)", overflow: "hidden", gap: 2 }}>
                <div style={{ width: "50%", backgroundColor: "var(--status-safe)" }} title="Safe: 6 packs" />
                <div style={{ width: "25%", backgroundColor: "var(--status-warning)" }} title="Warning: 3 packs" />
                <div style={{ width: "17%", backgroundColor: "#f97316" }} title="High: 2 packs" />
                <div style={{ width: "8%", backgroundColor: "var(--status-critical)" }} title="Critical: 1 pack" />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginTop: 4 }} className="mono">
                <span>Safe (50%)</span>
                <span>Warning (25%)</span>
                <span>High (17%)</span>
                <span style={{ color: "var(--status-critical-text)", fontWeight: 700 }}>Critical (8%)</span>
              </div>
            </div>

            {/* Health Risk Breakdown */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Degradation & Health Risk (SOH)</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Threshold: 80% SOH</span>
              </div>
              <div style={{ display: "flex", height: 12, borderRadius: "var(--radius-full)", overflow: "hidden", gap: 2 }}>
                <div style={{ width: "42%", backgroundColor: "var(--status-safe)" }} title="Optimal: 5 packs" />
                <div style={{ width: "25%", backgroundColor: "var(--status-warning)" }} title="Medium: 3 packs" />
                <div style={{ width: "17%", backgroundColor: "#f97316" }} title="High: 2 packs" />
                <div style={{ width: "16%", backgroundColor: "var(--status-critical)" }} title="Critical EOL: 2 packs" />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginTop: 4 }} className="mono">
                <span>Optimal (42%)</span>
                <span>Medium (25%)</span>
                <span>High (17%)</span>
                <span style={{ color: "var(--status-critical-text)", fontWeight: 700 }}>EOL (16%)</span>
              </div>
            </div>

            {/* Fast Action Banner */}
            <div
              style={{
                backgroundColor: "var(--bg-surface-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "12px 14px",
                border: "1px solid var(--border-subtle)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--status-critical-text)" }}>
                  Action Needed: Pack PAN-NCA-019
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                  Safety override engaged. Micro-channel cooling restricted.
                </div>
              </div>
              <Link to="/battery/3" className="btn sm critical">
                Triage Pack
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Full Fleet Telemetry Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Active Battery Fleet Telemetry</h3>
            <span className="card-subtitle">
              {allBatteries.length} battery packs registered across NMC, LFP, and NCA chemistries
            </span>
          </div>
        </div>

        <div className="card-body">
          {loading && !allBatteries.length ? (
            <SkeletonLoader rows={8} />
          ) : (
            <DataTable
              columns={columns}
              data={allBatteries}
              searchPlaceholder="Search by pack model, serial number, or manufacturer…"
              exportFilename="fleet-telemetry-status.csv"
              defaultSortKey="temperature_c"
              defaultSortDir="desc"
              pageSize={8}
              rowKey="battery_id"
              filters={[
                {
                  key: "chemistry_code",
                  label: "Chemistries",
                  options: [
                    { value: "NMC", label: "NMC (811)" },
                    { value: "LFP", label: "LFP (Blade)" },
                    { value: "NCA", label: "NCA (High-Power)" },
                  ],
                },
              ]}
            />
          )}
        </div>
      </div>
    </div>
  );
}