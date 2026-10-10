import { useState } from "react";
import { Link } from "react-router-dom";
import { Cpu, RefreshCw, Sparkles, AlertOctagon, Filter, Search, Plus } from "lucide-react";
import { api } from "../api/client";
import { useFetch } from "../hooks/useFetch";
import DataTable from "../components/ui/DataTable";
import RiskBadge from "../components/telemetry/RiskBadge";
import { ErrorState, SkeletonLoader } from "../components/ui/PageState";
import { timeAgo } from "../lib/thresholds";

export default function Predictions() {
  const { data: predictions, loading, error, reload, setData } = useFetch(api.getPredictions);
  const { data: batteries } = useFetch(api.getBatteries);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBattery, setSelectedBattery] = useState("1");
  const [selectedRiskType, setSelectedRiskType] = useState("THERMAL");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const allPredictions = predictions || [];

  const handleCreatePrediction = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.createRiskPrediction({
        battery_id: Number(selectedBattery),
        risk_type: selectedRiskType,
        notes,
      });
      setData((prev) => [res, ...(prev || [])]);
      setModalOpen(false);
      setNotes("");
    } catch (err) {
      console.error("Prediction creation failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: "serial_number",
      label: "Battery Pack",
      render: (val, p) => (
        <div>
          <Link
            to={`/battery/${p.battery_id}`}
            style={{ fontWeight: 600, color: "var(--text-primary)", textDecoration: "none" }}
          >
            {val || `Pack #${p.battery_id}`}
          </Link>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>ID: #{p.battery_id}</div>
        </div>
      ),
    },
    {
      key: "risk_type",
      label: "Risk Classifier",
      width: 140,
      render: (val) => (
        <span
          className="mono"
          style={{
            fontSize: 11.5,
            fontWeight: 600,
            padding: "2px 7px",
            borderRadius: "var(--radius-sm)",
            backgroundColor: val === "THERMAL" ? "rgba(239, 68, 68, 0.12)" : "rgba(59, 130, 246, 0.12)",
            color: val === "THERMAL" ? "var(--status-critical-text)" : "var(--status-info-text)",
          }}
        >
          {val}
        </span>
      ),
    },
    {
      key: "predicted_label",
      label: "Model Output",
      width: 130,
      render: (val) => <RiskBadge level={val} size="sm" />,
    },
    {
      key: "confidence",
      label: "Confidence",
      width: 110,
      render: (val) => (
        <span className="mono" style={{ fontWeight: 700 }}>
          {val != null ? `${(val * 100).toFixed(1)}%` : "—"}
        </span>
      ),
    },
    {
      key: "final_risk_level",
      label: "Final Assessment",
      width: 150,
      render: (val, p) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <RiskBadge level={val} size="sm" />
          {p.rule_override && (
            <span style={{ fontSize: 10, color: "var(--status-critical-text)", display: "flex", alignItems: "center", gap: 3 }}>
              <AlertOctagon size={10} />
              Safety Override
            </span>
          )}
        </div>
      ),
    },
    {
      key: "model_name",
      label: "AI Model",
      render: (val) => <span className="mono" style={{ fontSize: 12 }}>{val}</span>,
    },
    {
      key: "predicted_at",
      label: "Timestamp",
      render: (val) => <span className="mono" style={{ fontSize: 12 }}>{timeAgo(val)}</span>,
    },
  ];

  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Cpu size={24} style={{ color: "var(--accent-primary)" }} />
            <span>AI Risk Predictions & Safety Engine</span>
          </h1>
          <p className="page-description">
            Dual machine-learning risk inference records (Thermal & Health), confidence probabilities, and deterministic physical safety rule overrides.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn" onClick={reload} disabled={loading}>
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            Sync
          </button>
          <button className="btn primary" onClick={() => setModalOpen(true)}>
            <Plus size={14} />
            Evaluate New Assessment
          </button>
        </div>
      </div>

      {/* Main Predictions Data Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Historical Prediction Ledger</h3>
            <span className="card-subtitle">
              Verified risk assessments computed by active scikit-learn models
            </span>
          </div>
        </div>

        <div className="card-body">
          {loading && !allPredictions.length ? (
            <SkeletonLoader rows={6} />
          ) : (
            <DataTable
              columns={columns}
              data={allPredictions}
              searchPlaceholder="Search by pack, model, or label…"
              defaultSortKey="predicted_at"
              defaultSortDir="desc"
              exportFilename="predictions-ledger.csv"
              pageSize={10}
              rowKey="prediction_id"
              filters={[
                {
                  key: "risk_type",
                  label: "Risk Type",
                  options: [
                    { value: "THERMAL", label: "THERMAL" },
                    { value: "HEALTH", label: "HEALTH" },
                  ],
                },
              ]}
            />
          )}
        </div>
      </div>

      {/* Evaluate Prediction Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <h3 className="card-title">Trigger On-Demand Risk Assessment</h3>
            </div>
            <form onSubmit={handleCreatePrediction}>
              <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
                    Select Battery Pack
                  </label>
                  <select
                    value={selectedBattery}
                    onChange={(e) => setSelectedBattery(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-default)",
                      backgroundColor: "var(--bg-surface)",
                      color: "var(--text-primary)",
                      fontSize: 13.5,
                    }}
                  >
                    {(batteries || []).map((b) => (
                      <option key={b.battery_id || b.id} value={b.battery_id || b.id}>
                        {b.battery_type || b.model} ({b.serial_number}) - {b.temperature_c}°C
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
                    Risk Evaluation Type
                  </label>
                  <div className="seg-control" style={{ width: "100%" }}>
                    <button
                      type="button"
                      className={`seg-btn ${selectedRiskType === "THERMAL" ? "active" : ""}`}
                      onClick={() => setSelectedRiskType("THERMAL")}
                      style={{ flex: 1, justifyContent: "center" }}
                    >
                      THERMAL RISK
                    </button>
                    <button
                      type="button"
                      className={`seg-btn ${selectedRiskType === "HEALTH" ? "active" : ""}`}
                      onClick={() => setSelectedRiskType("HEALTH")}
                      style={{ flex: 1, justifyContent: "center" }}
                    >
                      HEALTH RISK
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
                    Operator Notes & Diagnostic Context
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Post DC fast-charge evaluation or scheduled service inspection…"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-default)",
                      backgroundColor: "var(--bg-surface)",
                      color: "var(--text-primary)",
                      fontSize: 13,
                      resize: "vertical",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 20px", borderTop: "1px solid var(--border-subtle)" }}>
                <button type="button" className="btn" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn primary" disabled={submitting}>
                  <Sparkles size={14} />
                  {submitting ? "Computing Model…" : "Execute Assessment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}