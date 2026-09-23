import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  GitFork,
  MapPin,
  Bell,
  Shield,
  Lightbulb,
  LogOut,
  Radio
} from 'lucide-react';

interface SidebarProps {
  alertCount?: number;
  onOpenCopilot?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ alertCount = 10, onOpenCopilot }) => {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Money Flow', path: '/money-flow', icon: GitFork },
    { name: 'Geo Intelligence', path: '/geo', icon: MapPin },
    { name: 'Alerts', path: '/alerts', icon: Bell, badge: alertCount },
  ];

  return (
    <aside className="w-64 min-h-screen bg-lavender-sidebar border-r border-lavender-border flex flex-col justify-between p-5 select-none transition-all">
      {/* Brand Header */}
      <div>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-2xl bg-brand-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-slate-900 tracking-tight text-lg">NEXORA</h1>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <div className="inline-block mt-0.5 px-2 py-0.5 bg-lavender-pill text-brand-700 text-xs font-semibold rounded-md">
              Investigator • SIH 2026
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-semibold transition-all duration-150 ${isActive
                    ? 'bg-white text-brand-700 shadow-sm shadow-brand-500/10'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-1.5 rounded-lg transition-colors ${isActive ? 'text-brand-600' : 'text-slate-500'
                      }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span>{item.name}</span>
                </div>

                {item.badge ? (
                  <span
                    className={`px-2 py-0.5 text-xs font-bold rounded-full ${isActive
                        ? 'bg-rose-100 text-rose-600'
                        : 'bg-rose-50 text-rose-500'
                      }`}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </NavLink>
            );
          })}

          {/* AI Copilot Quick Action in Nav */}
          {onOpenCopilot && (
            <button
              onClick={onOpenCopilot}
              className="w-full mt-2 flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold bg-gradient-to-r from-purple-100/80 to-indigo-100/80 text-purple-900 hover:from-purple-200/90 hover:to-indigo-200/90 border border-purple-200/60 shadow-2xs transition-all duration-150"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-purple-600 text-white shadow-2xs">
                  <Radio className="w-4 h-4 animate-pulse" />
                </div>
                <span>AI Copilot</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-white/80 rounded border border-purple-200 text-purple-800">
                ⌘ J
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom Area: Status Card & Logout matching Reference Image 2 */}
      <div className="space-y-3 pt-6 border-t border-lavender-border/70">
        {/* Status Widget */}
        <div className="bg-white/90 backdrop-blur-sm border border-lavender-border rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">Intelligence Active!</h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                IsolationForest anomaly model & NetworkX tracing online.
              </p>
            </div>
          </div>
        </div>

        {/* Logout / Switch User */}
        <button
          onClick={() => window.location.reload()}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-white/60 transition-colors"
        >
          <LogOut className="w-4 h-4 text-slate-500" />
          <span>Reset Session</span>
        </button>
      </div>
    </aside>
  );
};
