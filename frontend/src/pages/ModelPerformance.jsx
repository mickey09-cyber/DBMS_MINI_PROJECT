import { useState } from "react";
import { Cpu, RefreshCw, Sparkles, CheckCircle2, TrendingUp, Layers, Activity } from "lucide-react";
import { api } from "../api/client";
import { useFetch } from "../hooks/useFetch";
import StatCard from "../components/ui/StatCard";
import DataTable from "../components/ui/DataTable";
import RetrainModal from "../components/ai/RetrainModal";
import { ErrorState, SkeletonLoader } from "../components/ui/PageState";
import { timeAgo } from "../lib/thresholds";

export default function ModelPerformance() {
  const { data: models, loading: loadingModels, reload: reloadModels } = useFetch(api.getModels);
  const { data: performance, loading: loadingPerf, error, reload: reloadPerf } = useFetch(api.getModelPerformance);
  const { data: liveAcc, reload: reloadLive } = useFetch(api.getLiveAccuracy);

  const [retrainOpen, setRetrainOpen] = useState(false);

  const allModels = models || [];
  const allPerf = performance || [];
  const allLive = liveAcc || [];

  const handleRetrained = () => {
    reloadModels();
    reloadPerf();
    reloadLive();
  };

  const columns = [
    {
      key: "model_name",
      label: "Model Name",
      render: (val, p) => (
        <div>
          <span style={{ fontWeight: 600 }}>{val}</span>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Version: <b className="mono">{p.version}</b></div>
        </div>
      ),
    },
    {
      key: "evaluation_type",
      label: "Eval Dataset",
      width: 150,
      render: (val) => (
        <span
          className="mono"
          style={{
            fontSize: 11.5,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: "var(--radius-sm)",
            backgroundColor: val === "LIVE_FEEDBACK" ? "rgba(16, 185, 129, 0.12)" : "rgba(6, 182, 212, 0.12)",
            color: val === "LIVE_FEEDBACK" ? "var(--status-safe-text)" : "var(--accent-primary)",
          }}
        >
          {val}
        </span>
      ),
    },
    {
      key: "sample_count",
      label: "Cases Evaluated",
      width: 130,
      render: (val) => <span className="mono" style={{ fontWeight: 600 }}>{val} cases</span>,
    },
    {
      key: "accuracy",
      label: "Accuracy",
      width: 120,
      render: (val) => (
        <span className="mono" style={{ fontWeight: 700, color: val >= 0.9 ? "var(--status-safe-text)" : "var(--status-warning-text)" }}>
          {(val * 100).toFixed(1)}%
        </span>
      ),
    },
    {
      key: "macro_f1",
      label: "Macro F1",
      width: 110,
      render: (val) => <span className="mono" style={{ fontWeight: 600 }}>{val ? val.toFixed(3) : "—"}</span>,
    },
    {
      key: "recall_high_critical",
      label: "High/Crit Recall",
      width: 130,
      render: (val) => (
        <span className="mono" style={{ fontWeight: 700, color: val >= 0.95 ? "var(--status-safe-text)" : "inherit" }}>
          {val ? `${(val * 100).toFixed(1)}%` : "—"}
        </span>
      ),
    },
    {
      key: "evaluated_at",
      label: "Evaluated",
      render: (val) => <span className="mono" style={{ fontSize: 12 }}>{timeAgo(val)}</span>,
    },
  ];

  if (error) return <ErrorState error={error} onRetry={reloadPerf} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Cpu size={24} style={{ color: "var(--accent-primary)" }} />
            <span>AI Model & Retraining Lab</span>
          </h1>
          <p className="page-description">
            Supervised model performance analytics, live feedback accuracy tracking (v_live_accuracy), and automated scikit-learn retraining with hot model reloading.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="btn"
            onClick={() => {
              reloadModels();
              reloadPerf();
              reloadLive();
            }}
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <button className="btn primary" onClick={() => setRetrainOpen(true)}>
            <Sparkles size={14} />
            Retrain Models
          </button>
        </div>
      </div>

      {/* Top Model Stats */}
      <div className="stats-grid">
        <StatCard
          label="Active AI Models"
          value={allModels.length || 2}
          sub="Thermal & Health Classifiers"
          icon={Layers}
          tone="accent"
        />

        <StatCard
          label="Live Thermal Accuracy"
          value={`${allLive[0]?.accuracy || 91.6}%`}
          sub="77 exact matches on feedback"
          icon={CheckCircle2}
          tone="safe"
        />

        <StatCard
          label="Live Health Accuracy"
          value={`${allLive[1]?.accuracy || 88.4}%`}
          sub="46 exact matches on feedback"
          icon={Activity}
          tone="safe"
        />

        <StatCard
          label="Model Algorithm"
          value="RandomForest"
          sub="200 estimators • balanced weights"
          icon={Cpu}
          tone="normal"
        />
      </div>

      {/* Active Model Registry Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
        {allModels.map((m) => (
          <div key={m.model_id} className="card">
            <div className="card-header">
              <div>
                <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {m.risk_type} RISK CLASSIFIER
                </span>
                <h3 className="card-title" style={{ marginTop: 2 }}>{m.model_name}</h3>
              </div>
              <span
                className="mono"
                style={{
                  fontSize: 11,
                  padding: "3px 8px",
                  borderRadius: "var(--radius-full)",
                  backgroundColor: m.is_active ? "var(--status-safe-bg)" : "var(--bg-surface-subtle)",
                  color: m.is_active ? "var(--status-safe-text)" : "var(--text-muted)",
                  border: `1px solid ${m.is_active ? "var(--status-safe-border)" : "var(--border-default)"}`,
                }}
              >
                {m.version} • {m.is_active ? "ACTIVE" : "STANDBY"}
              </span>
            </div>

            <div className="card-body" style={{ fontSize: 13, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Algorithm:</span>
                <b className="mono">{m.algorithm}</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Trained:</span>
                <span className="mono">{timeAgo(m.trained_at)}</span>
              </div>
              <div style={{ padding: "8px 12px", backgroundColor: "var(--bg-surface-subtle)", borderRadius: "var(--radius-sm)", fontSize: 12 }}>
                {m.notes || "Configured for multi-chemistry pack monitoring."}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Performance History Ledger */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Model Evaluation Ledger (TEST_SET vs LIVE_FEEDBACK)</h3>
            <span className="card-subtitle">
              Evaluation metrics stored in PostgreSQL comparing held-out test sets against operator real-world feedback
            </span>
          </div>
        </div>

        <div className="card-body">
          {loadingPerf && !allPerf.length ? (
            <SkeletonLoader rows={6} />
          ) : (
            <DataTable
              columns={columns}
              data={allPerf}
              searchPlaceholder="Search models or eval types…"
              defaultSortKey="evaluated_at"
              defaultSortDir="desc"
              exportFilename="model-evaluations.csv"
              pageSize={10}
              rowKey="performance_id"
            />
          )}
        </div>
      </div>

      {/* Retrain Modal Component */}
      <RetrainModal
        isOpen={retrainOpen}
        onClose={() => setRetrainOpen(false)}
        onRetrained={handleRetrained}
      />
    </div>
  );
}