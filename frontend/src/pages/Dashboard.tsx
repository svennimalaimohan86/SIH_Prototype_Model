import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  ShieldAlert,
  Bell,
  MapPin,
  GitFork,
  ArrowUpDown,
  Filter,
  Eye,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  User,
  CreditCard,
  Wallet,
  Activity,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Tag
} from 'lucide-react';
import { api } from '../services/api';
import { AccountRiskScore, OverviewStats } from '../types';
import { MetricCard } from '../components/MetricCard';
import { RiskBadge } from '../components/RiskBadge';
import { ExplainabilityModal } from '../components/ExplainabilityModal';

export const Dashboard: React.FC = () => {
  const [accounts, setAccounts] = useState<AccountRiskScore[]>([]);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<string>('ALL');
  const [selectedAccountForModal, setSelectedAccountForModal] = useState<AccountRiskScore | null>(null);
  const [inspectedAccount, setInspectedAccount] = useState<AccountRiskScore | null>(null);

  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [scoresData, statsData] = await Promise.all([
        api.getRiskScores(),
        api.getOverviewStats()
      ]);
      setAccounts(scoresData);
      setStats(statsData);

      // Default inspected account: Dinesh M (NX-00127) or highest risk account
      const dineshTarget = scoresData.find((a) => a.account_number === 'NX-00127') || scoresData[0] || null;
      setInspectedAccount(dineshTarget);
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setError('Unable to connect to Nexora intelligence backend. Ensure the FastAPI server is running on http://localhost:8000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredAccounts = accounts.filter((acc) => {
    const matchesSearch =
      acc.account_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.city.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      selectedRiskFilter === 'ALL' || acc.risk_level === selectedRiskFilter;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-7 pb-12">
      {/* Top Banner & Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Risk Intelligence Dashboard
            </h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-100 text-brand-700">
              <Sparkles className="w-3.5 h-3.5" />
              Live Telemetry
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            IsolationForest anomaly detection & NetworkX graph engine tracing ~200 synthetic accounts.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="self-start md:self-auto flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-600' : ''}`} />
          <span>Refresh Analysis</span>
        </button>
      </div>

      {/* 4 Metric Cards matching Demo Studio structure in Reference Image 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Monitored Accounts"
          value={stats ? stats.total_accounts : 200}
          subValue="Active synthetic ledger"
          icon={Users}
          iconColor="text-brand-600"
          bgColor="bg-lavender-iconBg"
        />

        <MetricCard
          label="High & Critical Risk"
          value={stats ? stats.high_risk_accounts : 18}
          subValue="Flagged by IsolationForest"
          icon={ShieldAlert}
          iconColor="text-rose-600"
          bgColor="bg-rose-50"
          statusDot="bg-rose-500 animate-pulse"
        />

        <MetricCard
          label="Active Intelligence Alerts"
          value={stats ? stats.active_alerts : 10}
          subValue="Velocity & network triggers"
          icon={Bell}
          iconColor="text-amber-600"
          bgColor="bg-amber-50"
          statusDot="bg-amber-500"
        />

        <MetricCard
          label="Predicted Cash-outs"
          value={stats ? stats.predicted_cashouts : 30}
          subValue="Active ATM terminals mapped"
          icon={MapPin}
          iconColor="text-indigo-600"
          bgColor="bg-indigo-50"
        />
      </div>

      {/* NODE FORENSIC INSPECTOR CARD (Alighted directly on Dashboard matching Demo Studio design) */}
      {inspectedAccount && (
        <div className="bg-white rounded-3xl border border-surface-border p-6 shadow-soft space-y-5">
          {/* Card Header matching Demo Studio */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-surface-border">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-lavender-iconBg text-brand-700 flex items-center justify-center shadow-xs">
                <ShieldAlert className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                    Node Forensic Inspector
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-100 shadow-2xs">
                    <Sparkles className="w-3 h-3" />
                    Priority Target
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Key forensic intelligence and graph corridor metrics for this account node.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setSelectedAccountForModal(inspectedAccount)}
                className="px-3.5 py-2 rounded-2xl bg-lavender-pill hover:bg-lavender-active text-brand-700 text-xs font-bold transition-all shadow-2xs"
              >
                Explain Risk (XAI)
              </button>
              <button
                onClick={() => navigate(`/money-flow?account_id=${inspectedAccount.account_id}`)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs"
              >
                <GitFork className="w-3.5 h-3.5 text-brand-600" />
                <span>Trace Money Flow</span>
              </button>
              <button
                onClick={() => navigate(`/geo?account_id=${inspectedAccount.account_id}`)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all shadow-xs"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Cash-out Terminals</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Clean 6-Card Details Grid matching Demo Studio Reference Image 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Account Number & Holder */}
            <div className="p-4 rounded-2xl bg-surface-bg/80 border border-slate-100 shadow-2xs flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-lavender-iconBg text-brand-700 flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
                  Account Identifier
                </span>
                <div className="text-base font-extrabold text-slate-900 truncate mt-0.5">
                  {inspectedAccount.account_number}
                </div>
                <div className="text-xs font-semibold text-slate-600 truncate">
                  {inspectedAccount.name}
                </div>
              </div>
            </div>

            {/* 2. Calculated Risk (Single Line with whitespace-nowrap badge) */}
            <div className="p-4 rounded-2xl bg-surface-bg/80 border border-slate-100 shadow-2xs flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
                  Calculated Risk
                </span>
                <div className="mt-1 flex items-center whitespace-nowrap">
                  <RiskBadge
                    level={inspectedAccount.risk_level}
                    score={inspectedAccount.risk_score}
                    showScore={true}
                  />
                </div>
                <div className="text-[11px] font-medium text-slate-400 truncate mt-0.5">
                  Anomaly Vector: {inspectedAccount.risk_score}/100
                </div>
              </div>
            </div>

            {/* 3. Account Type */}
            <div className="p-4 rounded-2xl bg-surface-bg/80 border border-slate-100 shadow-2xs flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
                  Account Type
                </span>
                <div className="text-base font-extrabold text-slate-900 truncate mt-0.5">
                  {inspectedAccount.account_type}
                </div>
                <div className="text-xs font-semibold text-indigo-600 truncate">
                  Primary Banking Facility
                </div>
              </div>
            </div>

            {/* 4. Ledger Balance */}
            <div className="p-4 rounded-2xl bg-surface-bg/80 border border-slate-100 shadow-2xs flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <Wallet className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
                  Ledger Balance
                </span>
                <div className="text-base font-extrabold text-slate-900 truncate mt-0.5">
                  ₹{inspectedAccount.balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
                <div className="text-xs font-semibold text-emerald-600 truncate">
                  INR Available Ledger
                </div>
              </div>
            </div>

            {/* 5. Network Corridor Metrics */}
            <div className="p-4 rounded-2xl bg-surface-bg/80 border border-slate-100 shadow-2xs flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                <GitFork className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
                  Network Corridor Metrics
                </span>
                <div className="text-base font-extrabold text-slate-900 truncate mt-0.5">
                  14 Active Nodes
                </div>
                <div className="text-xs font-semibold text-purple-700 truncate">
                  16 Flow Corridors Mapped
                </div>
              </div>
            </div>

            {/* 6. Operational Location */}
            <div className="p-4 rounded-2xl bg-surface-bg/80 border border-slate-100 shadow-2xs flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
                  Location & ATM Hub
                </span>
                <div className="text-base font-extrabold text-slate-900 truncate mt-0.5">
                  {inspectedAccount.city || 'Tiruchengode'}
                </div>
                <div className="text-xs font-semibold text-amber-700 truncate">
                  3 Predicted Cash-out Terminals
                </div>
              </div>
            </div>
          </div>

          {/* Investigation Pipeline Stepper matching Reference Image 2 */}
          <div className="p-4 rounded-2xl bg-surface-bg/60 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700">Forensic Pipeline Status:</span>
              <span className="text-xs text-slate-500 font-medium truncate">
                {inspectedAccount.reasons[0] || 'Unusual night-time transaction bursts detected'}
              </span>
            </div>

            {/* Steps matching Image 2 */}
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mule Flagged</span>
              </span>
              <span className="text-slate-300">→</span>
              <span className="flex items-center gap-1 text-brand-700 bg-brand-50 px-2.5 py-1 rounded-xl border border-brand-100">
                <GitFork className="w-3.5 h-3.5" />
                <span>16 Links Mapped</span>
              </span>
              <span className="text-slate-300">→</span>
              <span className="flex items-center gap-1 text-slate-600 bg-slate-100 px-2.5 py-1 rounded-xl">
                <MapPin className="w-3.5 h-3.5" />
                <span>3 ATMs Predicted</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Intelligence Table Card */}
      <div className="bg-white rounded-3xl border border-surface-border shadow-soft overflow-hidden">
        {/* Table Toolbar matching Image 2 */}
        <div className="p-6 border-b border-surface-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Ranked Suspicious Accounts</h3>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Click any account row or risk score to update the Forensic Inspector above.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 bg-surface-bg rounded-2xl border border-slate-200/70">
              {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedRiskFilter(filter)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedRiskFilter === filter
                      ? 'bg-white text-brand-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Quick Search */}
            <input
              type="text"
              placeholder="Filter by name / ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3.5 py-1.5 text-xs bg-surface-bg border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-slate-800 placeholder-slate-400"
            />
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-24 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-lavender-iconBg text-brand-600 mb-3 animate-pulse">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">Running AI Anomaly Engine...</h4>
            <p className="text-xs text-slate-400 mt-1">
              Extracting temporal features & computing IsolationForest scores...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="py-16 text-center px-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">Connection Error</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">{error}</p>
            <button
              onClick={loadData}
              className="px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold hover:bg-brand-700 transition-colors shadow-xs"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Table Content */}
        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-bg/80 border-b border-surface-border text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Account ID & Holder</th>
                  <th className="py-3.5 px-6">Type & City</th>
                  <th className="py-3.5 px-6">Balance</th>
                  <th className="py-3.5 px-6">Risk Score</th>
                  <th className="py-3.5 px-6">Top Anomaly Driver</th>
                  <th className="py-3.5 px-6 text-right">Investigative Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAccounts.map((acc) => {
                  const isInspected = inspectedAccount?.account_id === acc.account_id;

                  return (
                    <tr
                      key={acc.account_id}
                      onClick={() => setInspectedAccount(acc)}
                      className={`hover:bg-slate-50/70 transition-colors cursor-pointer group ${
                        isInspected ? 'bg-brand-50/30 font-medium' : ''
                      }`}
                    >
                      {/* Account Info */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center text-xs transition-colors ${
                              isInspected
                                ? 'bg-brand-600 text-white'
                                : 'bg-lavender-iconBg text-brand-700'
                            }`}
                          >
                            {acc.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                              <span>{acc.account_number}</span>
                              {isInspected && (
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-600"></span>
                              )}
                            </div>
                            <div className="text-slate-500 font-medium text-xs flex items-center gap-1.5 mt-0.5">
                              <span>{acc.name}</span>
                              {acc.is_flagged && (
                                <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                                  Flagged
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Type & City */}
                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-700">{acc.account_type}</div>
                        <div className="text-slate-400 text-[11px] font-medium">{acc.city}</div>
                      </td>

                      {/* Balance */}
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900">
                          ₹{acc.balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </div>
                        <div className="text-slate-400 text-[11px] font-medium">INR</div>
                      </td>

                      {/* Risk Score Pill - Clickable for Explainability! */}
                      <td className="py-4 px-6">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAccountForModal(acc);
                          }}
                          className="group-hover:scale-105 transition-transform text-left"
                          title="Click to view Explainability Decomposition"
                        >
                          <RiskBadge level={acc.risk_level} score={acc.risk_score} showScore={true} />
                        </button>
                      </td>

                      {/* Top Anomaly Reason */}
                      <td className="py-4 px-6 max-w-xs">
                        <p className="text-slate-600 text-xs truncate font-medium">
                          {acc.reasons[0] || 'Peer baseline compliant'}
                        </p>
                        {acc.features.flagged_account_connections > 0 && (
                          <p className="text-[11px] font-semibold text-rose-600 mt-0.5">
                            ⚠ Linked to {acc.features.flagged_account_connections} flagged accounts
                          </p>
                        )}
                      </td>

                      {/* Action Buttons matching Demo Studio style */}
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center gap-2">
                          {/* Explain Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAccountForModal(acc);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-lavender-pill hover:bg-lavender-active text-brand-700 text-xs font-bold transition-colors"
                            title="Explain Risk Factors"
                          >
                            Explain
                          </button>

                          {/* Money Flow Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/money-flow?account_id=${acc.account_id}`);
                            }}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
                            title="View Connected Money-Flow Graph"
                          >
                            <GitFork className="w-3.5 h-3.5" />
                          </button>

                          {/* Geo Prediction Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/geo?account_id=${acc.account_id}`);
                            }}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
                            title="Predict ATM Cash-out Locations"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredAccounts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No accounts matched the selected filter or search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Explainability Side Drawer / Modal */}
      <ExplainabilityModal
        account={selectedAccountForModal}
        onClose={() => setSelectedAccountForModal(null)}
      />
    </div>
  );
};
