import { BarChart3, RefreshCw, Zap, Flame, Activity, ShieldCheck } from "lucide-react";
import { api } from "../api/client";
import { useFetch } from "../hooks/useFetch";
import StatCard from "../components/ui/StatCard";
import DataTable from "../components/ui/DataTable";
import { ErrorState, SkeletonLoader } from "../components/ui/PageState";

export default function Analytics() {
  const { data: chemData, loading: loadingChem, reload: reloadChem } = useFetch(api.getChemistryComparison);
  const { data: mfgData, loading: loadingMfg, reload: reloadMfg } = useFetch(api.getManufacturerComparison);

  const chemistries = chemData || [];
  const manufacturers = mfgData || [];

  const chemColumns = [
    {
      key: "chemistry_code",
      label: "Chemistry Code",
      render: (val) => <span className={`chem-badge ${val?.toLowerCase()}`}>{val}</span>,
    },
    {
      key: "chemistry_name",
      label: "Full Specification",
      render: (val) => <span style={{ fontWeight: 600 }}>{val}</span>,
    },
    {
      key: "battery_count",
      label: "Monitored Packs",
      render: (val) => <span className="mono">{val} packs</span>,
    },
    {
      key: "avg_cycles",
      label: "Average Cycles",
      render: (val) => <span className="mono">{val} cyc</span>,
    },
    {
      key: "avg_resistance_mohm",
      label: "Avg Resistance",
      render: (val) => <span className="mono">{val} mΩ</span>,
    },
    {
      key: "avg_capacity_pct_of_nominal",
      label: "Capacity Retention",
      render: (val) => (
        <span className="mono" style={{ fontWeight: 700, color: val >= 85 ? "var(--status-safe-text)" : "var(--status-warning-text)" }}>
          {val}%
        </span>
      ),
    },
    {
      key: "max_peak_temp_c",
      label: "Max Peak Temp",
      render: (val) => (
        <span className="mono" style={{ fontWeight: 700, color: val >= 60 ? "var(--status-critical-text)" : "var(--text-primary)" }}>
          {val}°C
        </span>
      ),
    },
  ];

  const mfgColumns = [
    {
      key: "manufacturer_name",
      label: "Manufacturer (OEM)",
      render: (val) => <span style={{ fontWeight: 600 }}>{val}</span>,
    },
    {
      key: "battery_count",
      label: "Packs in Fleet",
      render: (val) => <span className="mono">{val} units</span>,
    },
    {
      key: "avg_cycles",
      label: "Avg Service Cycles",
      render: (val) => <span className="mono">{val} cycles</span>,
    },
    {
      key: "avg_resistance_mohm",
      label: "Avg Internal Resistance",
      render: (val) => <span className="mono">{val} mΩ</span>,
    },
    {
      key: "avg_capacity_pct_of_nominal",
      label: "Avg Health (SOH)",
      render: (val) => (
        <span className="mono" style={{ fontWeight: 700, color: val >= 85 ? "var(--status-safe-text)" : "inherit" }}>
          {val}%
        </span>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <BarChart3 size={24} style={{ color: "var(--accent-primary)" }} />
            <span>Multi-Chemistry & OEM Benchmark Analytics</span>
          </h1>
          <p className="page-description">
            Empirical comparative analysis across battery chemistries (NMC, LFP, NCA) and tier-1 cell manufacturers, correlating thermal stability, cycle endurance, and impedance growth.
          </p>
        </div>

        <button
          className="btn"
          onClick={() => {
            reloadChem();
            reloadMfg();
          }}
        >
          <RefreshCw size={14} />
          Sync
        </button>
      </div>

      {/* Chemistry Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        {/* NMC */}
        <div className="card" style={{ borderTop: "3px solid var(--chem-nmc)" }}>
          <div className="card-body">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span className="chem-badge nmc">NMC-811</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Balanced Fleet Standard</span>
            </div>
            <h4 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700 }}>Nickel Manganese Cobalt</h4>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.4 }}>
              High energy density (250 Wh/kg) with moderate thermal stability. Requires active micro-channel cooling above 48°C.
            </p>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, borderTop: "1px solid var(--border-subtle)", paddingTop: 10 }}>
              <span>Thermal Limit: <b className="mono">60°C</b></span>
              <span>Avg SOH: <b className="mono" style={{ color: "var(--status-safe-text)" }}>80.2%</b></span>
            </div>
          </div>
        </div>

        {/* LFP */}
        <div className="card" style={{ borderTop: "3px solid var(--chem-lfp)" }}>
          <div className="card-body">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span className="chem-badge lfp">LFP (Blade)</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>High Thermal Stability</span>
            </div>
            <h4 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700 }}>Lithium Iron Phosphate</h4>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.4 }}>
              Superior safety and cycle life (3000+ cycles). Virtually immune to thermal runaway below 65°C, with lowest internal resistance.
            </p>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, borderTop: "1px solid var(--border-subtle)", paddingTop: 10 }}>
              <span>Thermal Limit: <b className="mono">65°C</b></span>
              <span>Avg SOH: <b className="mono" style={{ color: "var(--status-safe-text)" }}>93.8%</b></span>
            </div>
          </div>
        </div>

        {/* NCA */}
        <div className="card" style={{ borderTop: "3px solid var(--chem-nca)" }}>
          <div className="card-body">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span className="chem-badge nca">NCA Pack</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>High Power Demand</span>
            </div>
            <h4 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700 }}>Nickel Cobalt Aluminum</h4>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.4 }}>
              Maximum specific energy (270 Wh/kg) for performance EVs, but narrow thermal tolerance (55°C ceiling) and accelerated aging.
            </p>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, borderTop: "1px solid var(--border-subtle)", paddingTop: 10 }}>
              <span>Thermal Limit: <b className="mono">55°C</b></span>
              <span>Avg SOH: <b className="mono" style={{ color: "var(--status-warning-text)" }}>62.6%</b></span>
            </div>
          </div>
        </div>
      </div>

      {/* Chemistry Comparison Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Multi-Chemistry Fleet Performance Matrix</h3>
            <span className="card-subtitle">
              Queried directly from PostgreSQL view <code>v_chemistry_comparison</code>
            </span>
          </div>
        </div>

        <div className="card-body">
          {loadingChem && !chemistries.length ? (
            <SkeletonLoader rows={4} />
          ) : (
            <DataTable
              columns={chemColumns}
              data={chemistries}
              searchPlaceholder="Search chemistries…"
              exportFilename="chemistry-comparison.csv"
              pageSize={5}
              rowKey="chemistry_code"
            />
          )}
        </div>
      </div>

      {/* Manufacturer Benchmark Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">OEM Manufacturer Reliability Ranking</h3>
            <span className="card-subtitle">
              Aggregated cycle count, capacity degradation, and average internal resistance across cell suppliers
            </span>
          </div>
        </div>

        <div className="card-body">
          {loadingMfg && !manufacturers.length ? (
            <SkeletonLoader rows={5} />
          ) : (
            <DataTable
              columns={mfgColumns}
              data={manufacturers}
              searchPlaceholder="Search manufacturers…"
              exportFilename="manufacturer-benchmark.csv"
              pageSize={5}
              rowKey="manufacturer_id"
            />
          )}
        </div>
      </div>
    </div>
  );
}