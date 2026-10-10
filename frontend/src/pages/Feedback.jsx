import { useState } from "react";
import { Link } from "react-router-dom";
import { MessageSquareCheck, CheckCircle2, XCircle, RefreshCw, Plus, ThumbsUp, ThumbsDown } from "lucide-react";
import { api } from "../api/client";
import { useFetch } from "../hooks/useFetch";
import DataTable from "../components/ui/DataTable";
import { ErrorState, SkeletonLoader } from "../components/ui/PageState";
import { timeAgo } from "../lib/thresholds";

export default function Feedback() {
  const { data: feedbackData, loading, error, reload } = useFetch(async () => {
    // In mock mode or API
    return [
      {
        feedback_id: 1,
        prediction_id: 101,
        serial_number: "PAN-NCA-2023-019",
        risk_type: "THERMAL",
        predicted_label: "CRITICAL",
        actual_outcome: "CRITICAL",
        matches_prediction: true,
        outcome_source: "PHYSICAL_INSPECTION",
        submitted_by_role: "SERVICE_TECHNICIAN",
        observed_at: new Date(Date.now() - 3600e3 * 2).toISOString(),
        notes: "Cell pouch swelling and coolant channel blockage verified on physical teardown.",
      },
      {
        feedback_id: 2,
        prediction_id: 105,
        serial_number: "LG-NMC-2024-004",
        risk_type: "HEALTH",
        predicted_label: "HIGH",
        actual_outcome: "HIGH",
        matches_prediction: true,
        outcome_source: "LAB_TEST",
        submitted_by_role: "BMS_ENGINEER",
        observed_at: new Date(Date.now() - 3600e3 * 18).toISOString(),
        notes: "Capacity tested at 78.1% on cyclic cycler bench, matching predicted high degradation.",
      },
      {
        feedback_id: 3,
        prediction_id: 106,
        serial_number: "CATL-NMC-2023-088",
        risk_type: "THERMAL",
        predicted_label: "MEDIUM",
        actual_outcome: "LOW",
        matches_prediction: false,
        outcome_source: "OPERATOR_CONFIRMATION",
        submitted_by_role: "FLEET_OPERATOR",
        observed_at: new Date(Date.now() - 3600e3 * 42).toISOString(),
        notes: "Transient high ambient cabin heat soak, not internal cell heating. Marked false alarm.",
      },
    ];
  });

  const allFeedback = feedbackData || [];

  const columns = [
    {
      key: "serial_number",
      label: "Battery Pack",
      render: (val, f) => (
        <div>
          <span style={{ fontWeight: 600 }}>{val}</span>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Pred ID #{f.prediction_id}</div>
        </div>
      ),
    },
    {
      key: "risk_type",
      label: "Classifier",
      width: 120,
      render: (val) => <span className="mono" style={{ fontSize: 11.5, fontWeight: 600 }}>{val}</span>,
    },
    {
      key: "predicted_label",
      label: "Predicted",
      width: 120,
      render: (val) => <span className="mono" style={{ fontWeight: 700 }}>{val}</span>,
    },
    {
      key: "actual_outcome",
      label: "Ground Truth Outcome",
      width: 160,
      render: (val, f) => (
        <span
          className="mono"
          style={{
            fontSize: 12,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: "var(--radius-sm)",
            backgroundColor: f.matches_prediction ? "var(--status-safe-bg)" : "var(--status-warning-bg)",
            color: f.matches_prediction ? "var(--status-safe-text)" : "var(--status-warning-text)",
          }}
        >
          {f.matches_prediction ? "✓ " : "≠ "} {val}
        </span>
      ),
    },
    {
      key: "submitted_by_role",
      label: "Submitted By",
      render: (val) => <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{val?.replace("_", " ")}</span>,
    },
    {
      key: "notes",
      label: "Inspection Observations & Notes",
      render: (val) => <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>{val}</span>,
    },
    {
      key: "observed_at",
      label: "Observed",
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
            <MessageSquareCheck size={24} style={{ color: "var(--accent-primary)" }} />
            <span>Human-in-the-Loop Feedback Supervision</span>
          </h1>
          <p className="page-description">
            Verified actual outcomes submitted by technicians and fleet operators against earlier model predictions, directly feeding active accuracy metrics (v_live_accuracy) and retraining datasets.
          </p>
        </div>

        <button className="btn" onClick={reload} disabled={loading}>
          <RefreshCw size={14} />
          Sync
        </button>
      </div>

      {/* Feedback Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Ground-Truth Feedback Ledger</h3>
            <span className="card-subtitle">
              POST /api/feedback records feeding the AI retraining pipeline
            </span>
          </div>
        </div>

        <div className="card-body">
          {loading && !allFeedback.length ? (
            <SkeletonLoader rows={5} />
          ) : (
            <DataTable
              columns={columns}
              data={allFeedback}
              searchPlaceholder="Search feedback notes or packs…"
              defaultSortKey="observed_at"
              defaultSortDir="desc"
              exportFilename="model-feedback.csv"
              pageSize={10}
              rowKey="feedback_id"
            />
          )}
        </div>
      </div>
    </div>
  );
}