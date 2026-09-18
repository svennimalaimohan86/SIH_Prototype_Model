import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { MoneyFlow } from './pages/MoneyFlow';
import { GeoIntelligence } from './pages/GeoIntelligence';
import { Alerts } from './pages/Alerts';
import { api } from './services/api';

export function App() {
  const [alertCount, setAlertCount] = useState<number>(10);

  useEffect(() => {
    const fetchAlertCount = async () => {
      try {
        const alerts = await api.getAlerts();
        setAlertCount(alerts.length);
      } catch (e) {
        // Fallback default
        setAlertCount(10);
      }
    };
    fetchAlertCount();
  }, []);

  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-surface-bg font-sans antialiased text-slate-800">
        {/* Soft Lavender Sidebar matching Reference Image 2 */}
        <Sidebar alertCount={alertCount} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Bar matching Reference Image 2 */}
          <Header alertCount={alertCount} />

          {/* Page Routing */}
          <main className="flex-1 overflow-y-auto px-8 py-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/money-flow" element={<MoneyFlow />} />
              <Route path="/geo" element={<GeoIntelligence />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
