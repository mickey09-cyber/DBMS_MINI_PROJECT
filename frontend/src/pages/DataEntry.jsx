import { useState } from "react";
import { Database, Plus, CheckCircle2, Thermometer, Zap, Layers, RefreshCw } from "lucide-react";
import { api } from "../api/client";
import { useFetch } from "../hooks/useFetch";

export default function DataEntry() {
  const { data: batteries } = useFetch(api.getBatteries);
  const [activeTab, setActiveTab] = useState("reading"); // 'reading', 'aging', 'battery'

  // Reading Form
  const [readingBat, setReadingBat] = useState("1");
  const [tempVal, setTempVal] = useState("38.5");
  const [voltageVal, setVoltageVal] = useState("395.0");
  const [currentVal, setCurrentVal] = useState("120.0");
  const [readingSuccess, setReadingSuccess] = useState(false);

  // Aging Form
  const [agingBat, setAgingBat] = useState("1");
  const [cycles, setCycles] = useState("500");
  const [capacity, setCapacity] = useState("142.5");
  const [resistance, setResistance] = useState("1.65");
  const [agingSuccess, setAgingSuccess] = useState(false);

  // Battery Form
  const [serial, setSerial] = useState("");
  const [bType, setBType] = useState("");
  const [chemistry, setChemistry] = useState("1"); // 1=NMC, 2=LFP, 3=NCA
  const [mfg, setMfg] = useState("1"); // 1=CATL
  const [nomCap, setNomCap] = useState("160");
  const [batterySuccess, setBatterySuccess] = useState(false);

  const [loading, setLoading] = useState(false);

  const handleInjectReading = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.addReading({
        temperature: [
          {
            sensor_id: Number(readingBat) * 10 + 1,
            recorded_at: new Date().toISOString(),
            temperature_c: parseFloat(tempVal),
            data_source_id: 1,
          },
        ],
        electrical: [
          {
            sensor_id: Number(readingBat) * 10 + 4,
            recorded_at: new Date().toISOString(),
            voltage_v: parseFloat(voltageVal),
            current_a: parseFloat(currentVal),
            data_source_id: 1,
          },
        ],
        coolant: [],
      });
      setReadingSuccess(true);
      setTimeout(() => setReadingSuccess(false), 4000);
    } catch (err) {
      console.error("Reading ingestion failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogAging = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.addAging(Number(agingBat), {
        battery_id: Number(agingBat),
        measured_at: new Date().toISOString(),
        cycle_count: parseInt(cycles, 10),
        calendar_age_days: Math.round(parseInt(cycles, 10) * 0.8),
        capacity_ah: parseFloat(capacity),
        internal_resistance_mohm: parseFloat(resistance),
        data_source_id: 1,
      });
      setAgingSuccess(true);
      setTimeout(() => setAgingSuccess(false), 4000);
    } catch (err) {
      console.error("Aging record failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBattery = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.addBattery({
        serial_number: serial || `OEM-CUSTOM-${Date.now().toString().slice(-4)}`,
        battery_type: bType || "Custom Evaluation Pack",
        manufacturer_id: parseInt(mfg, 10),
        chemistry_id: parseInt(chemistry, 10),
        nominal_capacity_ah: parseFloat(nomCap),
        install_date: new Date().toISOString().slice(0, 10),
        status: "ACTIVE",
      });
      setBatterySuccess(true);
      setSerial("");
      setBType("");
      setTimeout(() => setBatterySuccess(false), 4000);
    } catch (err) {
      console.error("Battery creation failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Database size={24} style={{ color: "var(--accent-primary)" }} />
            <span>Telemetry & Lab Ingestion Simulator</span>
          </h1>
          <p className="page-description">
            Simulate real-time edge thermistor telemetry streams, ingest laboratory cyclic aging measurements, and register new multi-chemistry battery packs.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="seg-control" style={{ width: "100%" }}>
        <button
          className={`seg-btn ${activeTab === "reading" ? "active" : ""}`}
          onClick={() => setActiveTab("reading")}
          style={{ flex: 1, justifyContent: "center" }}
        >
          <Thermometer size={15} />
          Inject Sensor Readings
        </button>

        <button
          className={`seg-btn ${activeTab === "aging" ? "active" : ""}`}
          onClick={() => setActiveTab("aging")}
          style={{ flex: 1, justifyContent: "center" }}
        >
          <Zap size={15} />
          Log Lab Aging Record
        </button>

        <button
          className={`seg-btn ${activeTab === "battery" ? "active" : ""}`}
          onClick={() => setActiveTab("battery")}
          style={{ flex: 1, justifyContent: "center" }}
        >
          <Layers size={15} />
          Register New Pack
        </button>
      </div>

      {/* Tab 1: Sensor Readings Form */}
      {activeTab === "reading" && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Real-Time Sensor Telemetry Injection</h3>
              <span className="card-subtitle">
                POST /api/readings — atomic multi-sensor batch transaction
              </span>
            </div>
          </div>
          <div className="card-body">
            {readingSuccess && (
              <div
                style={{
                  padding: "10px 16px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--status-safe-bg)",
                  color: "var(--status-safe-text)",
                  border: "1px solid var(--status-safe-border)",
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <CheckCircle2 size={16} />
                <span>Reading successfully injected and committed to PostgreSQL database!</span>
              </div>
            )}

            <form onSubmit={handleInjectReading} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
                  Target Battery Pack
                </label>
                <select
                  value={readingBat}
                  onChange={(e) => setReadingBat(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-default)",
                    backgroundColor: "var(--bg-surface)",
                    color: "var(--text-primary)",
                  }}
                >
                  {(batteries || []).map((b) => (
                    <option key={b.battery_id || b.id} value={b.battery_id || b.id}>
                      {b.battery_type || b.model} ({b.serial_number})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
                  Temperature (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={tempVal}
                  onChange={(e) => setTempVal(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-default)",
                    backgroundColor: "var(--bg-surface)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
                  Pack Voltage (V)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={voltageVal}
                  onChange={(e) => setVoltageVal(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-default)",
                    backgroundColor: "var(--bg-surface)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
                  Current Draw (A)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={currentVal}
                  onChange={(e) => setCurrentVal(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-default)",
                    backgroundColor: "var(--bg-surface)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button type="submit" className="btn primary" disabled={loading}>
                  <Thermometer size={14} />
                  {loading ? "Streaming Reading…" : "Inject Telemetry Packet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab 2: Lab Aging Record Form */}
      {activeTab === "aging" && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Laboratory Aging & Impedance Entry</h3>
              <span className="card-subtitle">
                POST /api/batteries/{`{id}`}/aging — recalculates capacity retention and SOH %
              </span>
            </div>
          </div>
          <div className="card-body">
            {agingSuccess && (
              <div
                style={{
                  padding: "10px 16px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--status-safe-bg)",
                  color: "var(--status-safe-text)",
                  border: "1px solid var(--status-safe-border)",
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <CheckCircle2 size={16} />
                <span>Aging record logged. State-of-Health trajectory updated!</span>
              </div>
            )}

            <form onSubmit={handleLogAging} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
                  Battery Under Test
                </label>
                <select
                  value={agingBat}
                  onChange={(e) => setAgingBat(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-default)",
                    backgroundColor: "var(--bg-surface)",
                    color: "var(--text-primary)",
                  }}
                >
                  {(batteries || []).map((b) => (
                    <option key={b.battery_id || b.id} value={b.battery_id || b.id}>
                      {b.battery_type || b.model} ({b.serial_number})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
                  Cycle Count Completed
                </label>
                <input
                  type="number"
                  value={cycles}
                  onChange={(e) => setCycles(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-default)",
                    backgroundColor: "var(--bg-surface)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
                  Measured Capacity (Ah)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-default)",
                    backgroundColor: "var(--bg-surface)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
                  Internal Resistance (mΩ)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={resistance}
                  onChange={(e) => setResistance(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-default)",
                    backgroundColor: "var(--bg-surface)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button type="submit" className="btn primary" disabled={loading}>
                  <Zap size={14} />
                  {loading ? "Recording..." : "Record Lab Aging Point"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab 3: Register New Battery Pack */}
      {activeTab === "battery" && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Register New Multi-Chemistry Pack</h3>
              <span className="card-subtitle">
                POST /api/batteries — provision serial number, chemistry, and nominal rating
              </span>
            </div>
          </div>
          <div className="card-body">
            {batterySuccess && (
              <div
                style={{
                  padding: "10px 16px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--status-safe-bg)",
                  color: "var(--status-safe-text)",
                  border: "1px solid var(--status-safe-border)",
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <CheckCircle2 size={16} />
                <span>New battery pack registered into fleet monitoring database!</span>
              </div>
            )}

            <form onSubmit={handleCreateBattery} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
                  Serial Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. CATL-NMC-2024-099"
                  value={serial}
                  onChange={(e) => setSerial(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-default)",
                    backgroundColor: "var(--bg-surface)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
                  Model Descriptor
                </label>
                <input
                  type="text"
                  placeholder="e.g. EnerOne High-Density NMC"
                  value={bType}
                  onChange={(e) => setBType(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-default)",
                    backgroundColor: "var(--bg-surface)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
                  Chemistry
                </label>
                <select
                  value={chemistry}
                  onChange={(e) => setChemistry(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-default)",
                    backgroundColor: "var(--bg-surface)",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="1">NMC (Nickel Manganese Cobalt)</option>
                  <option value="2">LFP (Lithium Iron Phosphate)</option>
                  <option value="3">NCA (Nickel Cobalt Aluminum)</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
                  OEM Manufacturer
                </label>
                <select
                  value={mfg}
                  onChange={(e) => setMfg(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-default)",
                    backgroundColor: "var(--bg-surface)",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="1">CATL Automotive Energy</option>
                  <option value="2">LG Energy Solution</option>
                  <option value="3">Panasonic Energy</option>
                  <option value="4">BYD FinDreams Battery</option>
                  <option value="5">Samsung SDI</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
                  Nominal Capacity (Ah)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={nomCap}
                  onChange={(e) => setNomCap(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-default)",
                    backgroundColor: "var(--bg-surface)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button type="submit" className="btn primary" disabled={loading}>
                  <Plus size={14} />
                  {loading ? "Registering..." : "Provision Battery Pack"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}