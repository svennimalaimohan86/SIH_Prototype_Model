import React, { useState, useEffect } from 'react';
import { Search, Bell, Calendar, ChevronDown, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onSearch?: (query: string) => void;
  alertCount?: number;
  onOpenCopilot?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSearch, alertCount = 10, onOpenCopilot }) => {
  const [searchValue, setSearchValue] = useState('');
  const [currentTime, setCurrentTime] = useState('17 Sept 2026 • 12:11:09 pm');
  const navigate = useNavigate();

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      // Format as "17 Sept 2026 • 12:11:09 pm"
      const datePart = "17 Sept 2026";
      const timePart = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).toLowerCase();
      setCurrentTime(`${datePart} • ${timePart}`);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchValue(val);
    if (onSearch) onSearch(val);
  };

  return (
    <header className="h-20 bg-white/70 backdrop-blur-md border-b border-surface-border px-8 flex items-center justify-between sticky top-0 z-20">
      {/* Search Input Bar matching Image 2 */}
      <div className="relative w-96">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchValue}
          onChange={handleSearchChange}
          placeholder="Search accounts, IFSC, complaint number..."
          className="w-full pl-10 pr-12 py-2.5 bg-surface-bg/70 border border-slate-200/80 rounded-2xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-sm"
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <kbd className="px-1.5 py-0.5 text-[11px] font-semibold text-slate-400 bg-white border border-slate-200 rounded shadow-xs">
            ⌘ K
          </kbd>
        </div>
      </div>

      {/* Right Controls matching Image 2 */}
      <div className="flex items-center gap-4">
        {/* AI Copilot Quick Launch Pill */}
        <button
          onClick={onOpenCopilot}
          className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-brand-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/35 hover:scale-[1.02] active:scale-[0.98] transition-all"
          title="Open AI Cybercrime Copilot (⌘ J)"
        >
          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          <span>AI Copilot</span>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white/20 text-white rounded">
            ⌘ J
          </kbd>
        </button>

        {/* Notification Bell */}
        <button
          onClick={() => navigate('/alerts')}
          className="relative p-2.5 rounded-2xl bg-surface-bg border border-slate-200/60 hover:bg-slate-100/80 text-slate-600 transition-colors shadow-xs"
          title="Active Intelligence Alerts"
        >
          <Bell className="w-4 h-4" />
          {alertCount > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
          )}
        </button>

        {/* Date / Time Chip matching Image 2 */}
        <div className="hidden md:flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-surface-bg border border-slate-200/70 text-slate-600 shadow-xs">
          <Calendar className="w-4 h-4 text-brand-600" />
          <span className="text-xs font-semibold text-slate-700">{currentTime}</span>
        </div>

        {/* User Profile Avatar & Name Chip matching Image 2 */}
        <div className="flex items-center gap-3 pl-2 cursor-pointer hover:opacity-90 transition-opacity">
          <div className="w-10 h-10 rounded-2xl bg-brand-700 text-white font-bold text-sm flex items-center justify-center shadow-sm shadow-brand-700/30">
            KS
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-sm font-bold text-slate-900 leading-tight">Krishna S</div>
            <div className="text-xs text-slate-400 font-medium">Lead Investigator • ID: 21</div>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
        </div>
      </div>
    </header>
  );
};
