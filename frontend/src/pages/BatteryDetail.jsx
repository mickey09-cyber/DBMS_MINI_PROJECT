import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Flame,
  Activity,
  Zap,
  Wind,
  Cpu,
  Bell,
  Sparkles,
  ExternalLink,
  Layers,
} from "lucide-react";
import { api } from "../api/client";
import { useFetch } from "../hooks/useFetch";
import StatCard from "../components/ui/StatCard";
import RiskBadge from "../components/telemetry/RiskBadge";
import ThermalGauge from "../components/telemetry/ThermalGauge";
import SohBar from "../components/telemetry/SohBar";
import LiveTelemetryChart from "../components/telemetry/LiveTelemetryChart";
import AgingCurveChart from "../components/telemetry/AgingCurveChart";
import CfdSimulationView from "../components/telemetry/CfdSimulationView";
import SpatialSensorGrid from "../components/telemetry/SpatialSensorGrid";
import AIInsightsPanel from "../components/ai/AIInsightsPanel";
import { ErrorState, SkeletonLoader } from "../components/ui/PageState";
import { formatMohm, formatCycles, timeAgo } from "../lib/thresholds";

export default function BatteryDetail() {
  const { id } = useParams();
  const batteryId = Number(id);

  const [activeTab, setActiveTab] = useState("thermal");
  const [evaluating, setEvaluating] = useState(false);
  const [_scanResult, setScanResult] = useState(null);

  const {
    data,
    loading,
    error,
    reload,
  } = useFetch(async () => {
    const [battery, readings, agingHistory, sensors, twin, alerts, predictions, anomalies] =
      await Promise.all([
        api.getBattery(batteryId),
        api.getReadings(batteryId),
        api.getAgingHistory(batteryId),
        api.getSensors(batteryId),
        api.getDigitalTwin(batteryId),
        api.getAlerts(),
        api.getPredictions(),
        api.getAnomalies(),
      ]);

    return {
      battery,
      readings,
      agingHistory,
      sensors,
      twin,
      alerts: alerts.filter((a) => Number(a.battery_id) === batteryId),
      predictions: predictions.filter((p) => Number(p.battery_id) === batteryId),
      anomalies: anomalies.filter((a) => Number(a.battery_id) === batteryId),
    };
  }, [batteryId]);

  const handleRunAssessment = async () => {
    setEvaluating(true);
    try {
      await api.createRiskPrediction({
        battery_id: batteryId,
        risk_type: "THERMAL",
        notes: "On-demand operator evaluation triggered from studio",
      });
      reload();
    } catch (err) {
      console.error("Assessment run failed:", err);
    } finally {
      setEvaluating(false);
    }
  };

  const handleScanAnomalies = async () => {
    try {
      const res = await api.detectAnomalies(batteryId);
      setScanResult(res);
      reload();
    } catch (err) {
      console.error("Anomaly scan failed:", err);
    }
  };

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (loading && !data) return <SkeletonLoader rows={8} />;

  const { battery, readings, agingHistory, sensors, twin, alerts, predictions, anomalies } = data;

  if (!battery) {
    return (
      <div className="card" style={{ padding: 32, textAlign: "center" }}>
        <h3>Battery Pack #{id} Not Found</h3>
        <p style={{ color: "var(--text-muted)" }}>This pack may not be registered in the active database.</p>
        <Link to="/" className="btn primary">
          Back to Fleet Overview
        </Link>
      </div>
    );
  }

  const latestReading = readings && readings.length > 0 ? readings[readings.length - 1] : null;
  const currentTemp = latestReading?.temperature_c ?? battery.temperature_c ?? 34.0;
  const currentSoh = battery.soh_pct ?? 92.0;
  const isCritical = battery.risk_level === "critical" || currentTemp >= 60.0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Back navigation & Quick Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link to="/" className="btn sm" style={{ gap: 6 }}>
          <ArrowLeft size={14} />
          Back to Fleet
        </Link>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn sm" onClick={handleScanAnomalies}>
            <Sparkles size={13} />
            Scan Anomalies
          </button>
          <button className="btn sm primary" onClick={handleRunAssessment} disabled={evaluating}>
            <Cpu size={13} />
            {evaluating ? "Evaluating…" : "Evaluate AI Model"}
          </button>
        </div>
      </div>

      {/* Hero Header Ribbon */}
      <div className="card" style={{ borderLeft: `4px solid ${isCritical ? "var(--status-critical)" : "var(--accent-primary)"}` }}>
        <div className="card-body" style={{ padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span className={`chem-badge ${battery.chemistry_code?.toLowerCase() || "nmc"}`}>
                  {battery.chemistry_code || "NMC"}
                </span>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>
                  {battery.battery_type || battery.model || `Pack #${battery.battery_id}`}
                </h1>
                <RiskBadge level={isCritical ? "critical" : battery.risk_level} />
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13, color: "var(--text-muted)" }}>
                <span><b>Serial:</b> <span className="mono">{battery.serial_number}</span></span>
                <span><b>OEM:</b> {battery.manufacturer_name || "Tier 1"}</span>
                <span><b>Nominal Capacity:</b> <span className="mono">{battery.nominal_capacity_ah || 150} Ah</span></span>
                <span><b>Installed:</b> <span className="mono">{battery.install_date || "2024-01-15"}</span></span>
              </div>
            </div>

            {/* Quick Diagnostic Pill */}
            <div
              style={{
                backgroundColor: "var(--bg-surface-subtle)",
                padding: "8px 14px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                textAlign: "right",
              }}
            >
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Active Operating State</div>
              <div style={{ fontWeight: 600, fontSize: 13.5, color: isCritical ? "var(--status-critical-text)" : "var(--status-safe-text)" }}>
                {isCritical ? "⚠️ Critical Thermal Runaway Threat" : "✓ Nominal Operational Envelope"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Telemetry KPI Row */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-accent-line" style={{ backgroundColor: isCritical ? "var(--status-critical)" : "var(--status-warning)" }} />
          <ThermalGauge temperature_c={currentTemp} chemistry={battery.chemistry_code} />
        </div>

        <div className="stat-card">
          <div className="stat-card-accent-line" style={{ backgroundColor: currentSoh >= 80 ? "var(--status-safe)" : "var(--status-warning)" }} />
          <SohBar soh_pct={currentSoh} />
        </div>

        <StatCard
          label="Internal Resistance"
          value={formatMohm(battery.internal_resistance_mohm || 1.85)}
          sub="Impedance measurement"
          icon={Zap}
          tone={Number(battery.internal_resistance_mohm) > 2.5 ? "warning" : "safe"}
        />

        <StatCard
          label="Cumulative Cycles"
          value={formatCycles(battery.cycle_count || 450)}
          sub="Equivalent full charge cycles"
          icon={Layers}
          tone="normal"
        />
      </div>

      {/* Studio Navigation Tabs */}
      <div className="seg-control" style={{ width: "100%", overflowX: "auto" }}>
        <button
          className={`seg-btn ${activeTab === "thermal" ? "active" : ""}`}
          onClick={() => setActiveTab("thermal")}
          style={{ flex: 1, justifyContent: "center" }}
        >
          <Flame size={15} />
          Thermal Dynamics & Probes
        </button>

        <button
          className={`seg-btn ${activeTab === "aging" ? "active" : ""}`}
          onClick={() => setActiveTab("aging")}
          style={{ flex: 1, justifyContent: "center" }}
        >
          <Activity size={15} />
          Aging & Degradation Curve
        </button>

        <button
          className={`seg-btn ${activeTab === "cfd" ? "active" : ""}`}
          onClick={() => setActiveTab("cfd")}
          style={{ flex: 1, justifyContent: "center" }}
        >
          <Wind size={15} />
          Micro-Channel CFD Twin
        </button>

        <button
          className={`seg-btn ${activeTab === "insights" ? "active" : ""}`}
          onClick={() => setActiveTab("insights")}
          style={{ flex: 1, justifyContent: "center" }}
        >
          <Cpu size={15} />
          AI Diagnostic Intelligence
        </button>

        <button
          className={`seg-btn ${activeTab === "alerts" ? "active" : ""}`}
          onClick={() => setActiveTab("alerts")}
          style={{ flex: 1, justifyContent: "center" }}
        >
          <Bell size={15} />
          Pack Alerts ({alerts.length})
        </button>
      </div>

      {/* Tab 1: Thermal Dynamics */}
      {activeTab === "thermal" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Real-Time Thermal Kinetics & Sensor Probes</h3>
                <span className="card-subtitle">
                  High-frequency thermistor readings with 60°C physical runaway ceiling
                </span>
              </div>
              <div className="status-pill">
                <span className="pulse-dot" />
                <span>1.0 Hz High-Speed Telemetry</span>
              </div>
            </div>
            <div className="card-body">
              <LiveTelemetryChart data={readings || []} height={320} showNeighbors={true} />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Spatial Multi-Sensor Topology & Divergence Map</h3>
              <span className="card-subtitle">
                Distinguishes individual thermistor probe fault from genuine electrochemical core heating
              </span>
            </div>
            <div className="card-body">
              <SpatialSensorGrid sensors={sensors} readings={readings} chemistry={battery.chemistry_code} />
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Aging & Degradation Curve */}
      {activeTab === "aging" && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Multi-Cycle Capacity Degradation & Resistance Growth</h3>
              <span className="card-subtitle">
                State-of-Health (%) and Internal Resistance (mΩ) trajectory versus cycle count
              </span>
            </div>
          </div>
          <div className="card-body">
            <AgingCurveChart data={agingHistory || []} height={340} />
          </div>
        </div>
      )}

      {/* Tab 3: Micro-Channel CFD Twin */}
      {activeTab === "cfd" && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Micro-Channel Cooling & Digital Twin Telemetry</h3>
              <span className="card-subtitle">
                Coupled thermal fluid simulation: pump flow rate, inlet coolant temperature, and pressure drops
              </span>
            </div>
          </div>
          <div className="card-body">
            <CfdSimulationView twin={twin} />
          </div>
        </div>
      )}

      {/* Tab 4: AI Insights & Hero Diagnostic Breakdown */}
      {activeTab === "insights" && (
        <AIInsightsPanel
          battery={battery}
          predictions={predictions}
          anomalies={anomalies}
          onRunAssessment={handleRunAssessment}
          evaluating={evaluating}
        />
      )}

      {/* Tab 5: Pack Alerts & Direct Actions */}
      {activeTab === "alerts" && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Pack Alerts & Human-in-the-Loop Triage</h3>
          </div>
          <div className="card-body">
            {alerts.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>
                No active or historical alerts recorded for this battery pack.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {alerts.map((a) => (
                  <div
                    key={a.alert_id || a.id}
                    style={{
                      padding: 16,
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--bg-surface-subtle)",
                      border: "1px solid var(--border-subtle)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <RiskBadge level={a.final_risk_level || a.priority_code} size="sm" />
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{a.message}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        Logged: {timeAgo(a.created_at)} • Status: <b>{a.status}</b>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      {a.status === "OPEN" && (
                        <>
                          <button
                            className="btn sm primary"
                            onClick={async () => {
                              await api.sendFeedback(a.alert_id || a.id, "confirmed");
                              reload();
                            }}
                          >
                            Confirm Real Alert
                          </button>
                          <button
                            className="btn sm"
                            onClick={async () => {
                              await api.sendFeedback(a.alert_id || a.id, "false_alarm");
                              reload();
                            }}
                          >
                            Mark False Alarm
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}