import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { AICopilotDrawer } from './components/AICopilotDrawer';
import { Dashboard } from './pages/Dashboard';
import { MoneyFlow } from './pages/MoneyFlow';
import { GeoIntelligence } from './pages/GeoIntelligence';
import { Alerts } from './pages/Alerts';
import { api } from './services/api';
import { Sparkles } from 'lucide-react';

export function App() {
  const [alertCount, setAlertCount] = useState<number>(10);
  const [isCopilotOpen, setIsCopilotOpen] = useState<boolean>(false);

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

    // Global Keyboard Shortcut: ⌘ J / Ctrl + J opens AI Copilot
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setIsCopilotOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-surface-bg font-sans antialiased text-slate-800 relative">
        {/* Soft Lavender Sidebar matching Reference Image 2 */}
        <Sidebar alertCount={alertCount} onOpenCopilot={() => setIsCopilotOpen(true)} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Bar matching Reference Image 2 */}
          <Header alertCount={alertCount} onOpenCopilot={() => setIsCopilotOpen(true)} />

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

        {/* Floating AI Copilot Trigger Button (Bottom-Right) */}
        <button
          onClick={() => setIsCopilotOpen(true)}
          className="fixed bottom-6 right-8 z-30 flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-purple-700 via-indigo-700 to-brand-800 text-white font-bold text-sm rounded-full shadow-lg shadow-indigo-700/30 hover:shadow-indigo-700/50 hover:scale-105 active:scale-95 transition-all group border border-purple-400/30"
          title="Open Nexora AI Forensic Copilot (⌘ J)"
        >
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" style={{ animationDuration: '4s' }} />
          </div>
          <span>AI Forensic Copilot</span>
          <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-black/20 rounded-md border border-white/20 text-purple-200">
            ⌘ J
          </span>
        </button>

        {/* AI Copilot Drawer */}
        <AICopilotDrawer
          isOpen={isCopilotOpen}
          onClose={() => setIsCopilotOpen(false)}
        />
      </div>
    </BrowserRouter>
  );
}

export default App;
