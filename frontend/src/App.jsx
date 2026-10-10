import { HashRouter, Routes, Route, Link } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import NavigationShell from "./components/layout/NavigationShell";

import Dashboard from "./pages/Dashboard";
import BatteryDetail from "./pages/BatteryDetail";
import Alerts from "./pages/Alerts";
import Predictions from "./pages/Predictions";
import Anomalies from "./pages/Anomalies";
import Recommendations from "./pages/Recommendations";
import DataEntry from "./pages/DataEntry";
import Feedback from "./pages/Feedback";
import ModelPerformance from "./pages/ModelPerformance";
import Analytics from "./pages/Analytics";
import Admin from "./pages/Admin";
import Login from "./pages/Login";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <HashRouter>
          <Routes>
            {/* Standalone Login Route */}
            <Route path="/login" element={<Login />} />

            {/* Standard Protected Telemetry Routes wrapped in Navigation Shell */}
            <Route
              path="/*"
              element={
                <NavigationShell>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/battery/:id" element={<BatteryDetail />} />
                    <Route path="/alerts" element={<Alerts />} />
                    <Route path="/predictions" element={<Predictions />} />
                    <Route path="/anomalies" element={<Anomalies />} />
                    <Route path="/model-performance" element={<ModelPerformance />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/recommendations" element={<Recommendations />} />
                    <Route path="/data-entry" element={<DataEntry />} />
                    <Route path="/feedback" element={<Feedback />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route
                      path="*"
                      element={
                        <div className="card" style={{ padding: 48, textAlign: "center" }}>
                          <h2>Page Not Found</h2>
                          <p style={{ color: "var(--text-muted)", marginBottom: 16 }}>
                            The telemetry route does not exist.
                          </p>
                          <Link to="/" className="btn primary">
                            Return to Fleet Overview
                          </Link>
                        </div>
                      }
                    />
                  </Routes>
                </NavigationShell>
              }
            />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}