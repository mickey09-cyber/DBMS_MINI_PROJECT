// ============================================================================
// Battery Telemetry Thresholds & Utility Formatters
// ============================================================================

export const WARN_C = 48.0;
export const CRIT_C = 60.0;
export const TEMP_MIN = 15.0;
export const TEMP_MAX = 75.0;

// Per-chemistry temperature safety ceilings
export const CHEMISTRY_LIMITS = {
  NMC: { max_safe: 55.0, critical: 60.0, nominal_voltage: 3.7 },
  LFP: { max_safe: 60.0, critical: 65.0, nominal_voltage: 3.2 },
  NCA: { max_safe: 50.0, critical: 55.0, nominal_voltage: 3.6 },
};

export const tempStatus = (t, chemistry = "NMC") => {
  if (t == null) return { key: "unknown", label: "No Data", tone: "muted" };
  const limits = CHEMISTRY_LIMITS[chemistry] || { critical: CRIT_C, max_safe: WARN_C };
  if (t >= limits.critical) return { key: "critical", label: "Critical Hazard", tone: "critical" };
  if (t >= limits.max_safe) return { key: "warning", label: "Warning Zone", tone: "warning" };
  return { key: "safe", label: "Optimal", tone: "safe" };
};

export const healthStatus = (soh) => {
  if (soh == null) return { key: "unknown", label: "Unknown", tone: "muted" };
  if (soh >= 90) return { key: "safe", label: "Optimal Health", tone: "safe" };
  if (soh >= 80) return { key: "normal", label: "Good", tone: "safe" };
  if (soh >= 70) return { key: "warning", label: "Degraded", tone: "warning" };
  return { key: "critical", label: "End of Life", tone: "critical" };
};

export const gaugePos = (t) =>
  Math.min(100, Math.max(0, ((Number(t || 25) - TEMP_MIN) / (TEMP_MAX - TEMP_MIN)) * 100));

export const timeAgo = (iso) => {
  if (!iso) return "—";
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
};

export const formatTemp = (val) => (val != null ? `${Number(val).toFixed(1)}°C` : "—");
export const formatSoh = (val) => (val != null ? `${Number(val).toFixed(1)}%` : "—");
export const formatCycles = (val) => (val != null ? `${Number(val).toLocaleString()}` : "—");
export const formatMohm = (val) => (val != null ? `${Number(val).toFixed(2)} mΩ` : "—");
export const formatVoltage = (val) => (val != null ? `${Number(val).toFixed(1)} V` : "—");
export const formatCurrent = (val) => (val != null ? `${Number(val).toFixed(1)} A` : "—");
