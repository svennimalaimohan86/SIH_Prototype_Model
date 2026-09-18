import React from 'react';
import {
  X,
  ShieldAlert,
  Activity,
  GitFork,
  MapPin,
  Clock,
  Zap,
  TrendingUp,
  AlertOctagon,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AccountRiskScore } from '../types';
import { RiskBadge } from './RiskBadge';

interface ExplainabilityModalProps {
  account: AccountRiskScore | null;
  onClose: () => void;
}

export const ExplainabilityModal: React.FC<ExplainabilityModalProps> = ({ account, onClose }) => {
  const navigate = useNavigate();

  if (!account) return null;

  const handleTraceMoneyFlow = () => {
    onClose();
    navigate(`/money-flow?account_id=${account.account_id}`);
  };

  const handlePredictCashout = () => {
    onClose();
    navigate(`/geo?account_id=${account.account_id}`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header matching Demo Studio style */}
        <div className="px-7 py-5 bg-lavender-sidebar/60 border-b border-lavender-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900">Explainable AI Intelligence</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-brand-100 text-brand-700">
                  <Sparkles className="w-3 h-3" />
                  IsolationForest Anomaly
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Root-cause feature breakdown for {account.account_number} ({account.name})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-7 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Main Risk Score Card */}
          <div className="bg-surface-bg rounded-2xl border border-surface-border p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account Risk Rating</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold text-slate-900">{account.risk_score}</span>
                <span className="text-sm font-semibold text-slate-400">/ 100</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Calibrated via multidimensional cybercrime behavioral anomaly vector.
              </p>
            </div>
            <div className="text-right space-y-1.5">
              <RiskBadge level={account.risk_level} />
              {account.is_flagged && (
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-700">
                    NCRP Flagged Account
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Metrics Grid matching Image 2 Detail Cards */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Core Anomaly Drivers
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-white border border-slate-100 shadow-2xs">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Activity className="w-3.5 h-3.5 text-brand-600" />
                  <span className="text-[11px] font-semibold text-slate-500">Transaction Velocity</span>
                </div>
                <div className="text-sm font-bold text-slate-800">
                  {account.features.transaction_frequency} total txns
                </div>
                <div className="text-[11px] font-medium text-brand-600 mt-0.5">
                  {(account.features.transaction_frequency / 4.5).toFixed(1)}× above avg
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-slate-100 shadow-2xs">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-[11px] font-semibold text-slate-500">Night Activity</span>
                </div>
                <div className="text-sm font-bold text-slate-800">
                  {(account.features.night_transaction_ratio * 100).toFixed(0)}% at night
                </div>
                <div className="text-[11px] font-medium text-indigo-600 mt-0.5">
                  10 PM – 5 AM window
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-slate-100 shadow-2xs">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                  <span className="text-[11px] font-semibold text-slate-500">Flagged Links</span>
                </div>
                <div className="text-sm font-bold text-slate-800">
                  {account.features.flagged_account_connections} linked mules
                </div>
                <div className="text-[11px] font-medium text-rose-600 mt-0.5">
                  Direct counterparties
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-slate-100 shadow-2xs">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-[11px] font-semibold text-slate-500">Rapid Bursts</span>
                </div>
                <div className="text-sm font-bold text-slate-800">
                  {account.features.rapid_transaction_count} rapid bursts
                </div>
                <div className="text-[11px] font-medium text-amber-600 mt-0.5">
                  &lt;10 min intervals
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-slate-100 shadow-2xs">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[11px] font-semibold text-slate-500">Avg Transaction</span>
                </div>
                <div className="text-sm font-bold text-slate-800">
                  ₹{account.features.average_transaction_amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
                <div className="text-[11px] font-medium text-slate-400 mt-0.5">
                  INR per transfer
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-slate-100 shadow-2xs">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-purple-600" />
                  <span className="text-[11px] font-semibold text-slate-500">ATM Cash-outs</span>
                </div>
                <div className="text-sm font-bold text-slate-800">
                  {account.features.cashout_frequency} withdrawals
                </div>
                <div className="text-[11px] font-medium text-purple-600 mt-0.5">
                  Layering exit points
                </div>
              </div>
            </div>
          </div>

          {/* Feature Contribution Visual Bars */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Feature Weight Contribution to Anomaly Score
            </h4>
            <div className="space-y-2.5">
              {account.contributions.slice(0, 5).map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700">{item.feature_label}</span>
                    <span className="font-bold text-brand-700">{item.contribution_percentage}% weight</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-brand-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, item.contribution_percentage * 2)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">{item.explanation}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Forensic Detection Reasons */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Forensic Intelligence Triggers
            </h4>
            <div className="space-y-2">
              {account.reasons.map((r, i) => (
                <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/70 border border-amber-200/60 text-xs font-medium text-amber-900">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions matching Demo Studio flow */}
        <div className="px-7 py-4 bg-surface-bg border-t border-surface-border flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Dismiss
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTraceMoneyFlow}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-bold shadow-xs transition-all"
            >
              <GitFork className="w-4 h-4 text-brand-600" />
              <span>Trace Money Flow</span>
            </button>

            <button
              onClick={handlePredictCashout}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold shadow-sm shadow-brand-500/20 transition-all"
            >
              <MapPin className="w-4 h-4" />
              <span>Predict Cash-out</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
