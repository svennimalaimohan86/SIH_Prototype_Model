import React, { useState } from 'react';
import {
  ShieldAlert,
  User,
  Camera,
  Car,
  Phone,
  FileText,
  Download,
  Copy,
  Check,
  X,
  Radio,
  Siren,
  MapPin,
  Clock,
  CreditCard,
  Building2,
  ExternalLink,
  Lock,
  Sparkles,
  AlertTriangle,
  Fingerprint
} from 'lucide-react';
import { WithdrawalIntel } from '../types';
import { generateWithdrawalForensicPDF } from '../utils/pdfGenerator';

interface WithdrawalIntelModalProps {
  intel: WithdrawalIntel | null;
  isOpen: boolean;
  onClose: () => void;
  onFreezeAccount?: (accountId: number) => void;
}

export const WithdrawalIntelModal: React.FC<WithdrawalIntelModalProps> = ({
  intel,
  isOpen,
  onClose,
  onFreezeAccount,
}) => {
  const [copied, setCopied] = useState(false);
  const [patrolDispatched, setPatrolDispatched] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen || !intel) return null;

  const handleCopyDossier = () => {
    const text = `
=== NEXORA FORENSIC SUSPECT DOSSIER ===
SUSPECT NAME   : ${intel.withdrawer_name} (${intel.withdrawer_alias})
ROLE           : ${intel.withdrawer_role}
PHONE          : ${intel.withdrawer_phone}
ID/KYC         : ${intel.withdrawer_id_number}
WITHDRAWAL AMT : ₹${intel.amount.toLocaleString('en-IN')}
ATM LOCATION   : ${intel.atm_name} (${intel.atm_location}, ${intel.atm_city})
TIMESTAMP      : ${intel.formatted_time}
CCTV REF       : ${intel.cctv_footage_ref} [Status: ${intel.cctv_status}]
FACIAL MATCH   : ${intel.face_match_confidence}% Match
VEHICLE        : ${intel.vehicle_details}
DESCRIPTION    : ${intel.physical_description}
PATROL UNIT    : ${intel.nearest_patrol_unit}
UTR REFERENCE  : ${intel.utr_number}
LINKED MULE    : ${intel.account_number} (${intel.account_holder_name})
========================================`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = () => {
    setIsExporting(true);
    try {
      generateWithdrawalForensicPDF(intel);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setTimeout(() => setIsExporting(false), 600);
    }
  };

  const handleDispatchPatrol = () => {
    setPatrolDispatched(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">

        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-rose-500 text-white">
                  CONFIDENTIAL // FORENSIC INTEL
                </span>
                <span className="text-xs text-slate-300 font-mono">
                  UTR: {intel.utr_number}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2 mt-0.5">
                <span>Who Withdrew The Money? — Suspect & CCTV Dossier</span>
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Alert Status Strip */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              <span className="font-semibold text-slate-700">Interception Status:</span>
              <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                {patrolDispatched ? '🚨 INTERCEPT PATROL EN ROUTE (ETA 2 MINS)' : intel.interception_status.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex items-center space-x-1 text-slate-600">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Facial AI Match:</span>
              <span className="font-bold text-indigo-700">{intel.face_match_confidence}% Match</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-slate-500">Cash-Out Amount:</span>
            <span className="font-black text-rose-600 text-sm font-mono bg-rose-100/70 px-2 py-0.5 rounded">
              ₹{intel.amount.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[72vh] overflow-y-auto">

          {/* Grid Layout: CCTV Camera Visual + Suspect Identity */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

            {/* Left Column: Simulated CCTV Frame & Physical Intel (5 cols) */}
            <div className="md:col-span-5 space-y-4">

              {/* CCTV Feed Frame */}
              <div className="relative bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-md">
                {/* Simulated CCTV Stream Overlay */}
                <div className="aspect-[4/3] bg-gradient-to-b from-slate-900 via-slate-950 to-black relative flex items-center justify-center p-4">

                  {/* Grid Lines Overlay */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:24px_24px] opacity-30"></div>

                  {/* CCTV Header Watermark */}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between text-[10px] font-mono text-emerald-400 z-10 bg-black/60 px-2 py-1 rounded">
                    <span className="flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      <span>{intel.cctv_footage_ref}</span>
                    </span>
                    <span>{intel.formatted_time.split('•')[1]?.trim() || '23:30:15'}</span>
                  </div>

                  {/* Target Facial Recognition Bounding Box */}
                  <div className="relative border-2 border-dashed border-emerald-400 rounded-lg p-6 bg-emerald-500/10 flex flex-col items-center justify-center text-center shadow-inner">
                    <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-emerald-400 flex items-center justify-center text-slate-300 shadow-lg mb-2 relative">
                      <User className="w-8 h-8 text-emerald-400" />
                      <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white rounded-full p-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-300 font-mono">
                      MATCH: {intel.face_match_confidence}%
                    </span>
                    <span className="text-[9px] text-slate-300">
                      {intel.cctv_status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* CCTV Camera Bottom Tag */}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[9px] font-mono text-slate-400 bg-black/60 px-2 py-0.5 rounded">
                    <span>TERMINAL CAM #01</span>
                    <span>1080P • 30 FPS</span>
                  </div>
                </div>
              </div>

              {/* Physical & Attire Observation Card */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center space-x-1.5 text-slate-700 font-bold">
                  <Fingerprint className="w-4 h-4 text-indigo-600" />
                  <span>Physical Observation</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200">
                  {intel.physical_description}
                </p>
              </div>

              {/* Vehicle Spotted Card */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center space-x-1.5 text-slate-700 font-bold">
                  <Car className="w-4 h-4 text-indigo-600" />
                  <span>Vehicle Spotted on CCTV</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-800 font-semibold flex items-center justify-between">
                  <span>{intel.vehicle_details}</span>
                  <span className="text-[10px] text-indigo-600 font-sans bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                    ANPR Traced
                  </span>
                </div>
              </div>

            </div>

            {/* Right Column: Suspect Dossier & Terminal Details (7 cols) */}
            <div className="md:col-span-7 space-y-4">

              {/* Suspect Identity Profile Box */}
              <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900 uppercase tracking-wide">
                    Suspect / Runner Identity Dossier
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white shadow-sm">
                    {intel.withdrawer_role.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Full Name</span>
                    <span className="font-bold text-slate-900 text-sm">{intel.withdrawer_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Syndicate Alias / Tag</span>
                    <span className="font-bold text-indigo-700">{intel.withdrawer_alias || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Contact / SIM Telemetry</span>
                    <span className="font-semibold text-slate-800 font-mono flex items-center space-x-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{intel.withdrawer_phone}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Identity / KYC Number</span>
                    <span className="font-semibold text-slate-800 font-mono">{intel.withdrawer_id_number}</span>
                  </div>
                </div>
              </div>

              {/* Terminal & Transaction Telemetry */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3 text-xs">
                <div className="flex items-center justify-between text-slate-700 font-bold border-b border-slate-200 pb-2">
                  <span className="flex items-center space-x-1.5">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    <span>ATM Terminal & Cash-Out Telemetry</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    ID #{intel.atm_id || 1}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Terminal Name</span>
                    <span className="font-bold text-slate-900">{intel.atm_name || 'Designated ATM'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Withdrawal Method</span>
                    <span className="font-semibold text-slate-800 flex items-center space-x-1">
                      <CreditCard className="w-3 h-3 text-indigo-500" />
                      <span>{intel.withdrawal_method.replace(/_/g, ' ')}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Location & City</span>
                    <span className="font-medium text-slate-700 flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{intel.atm_location}, {intel.atm_city}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Withdrawal Timestamp</span>
                    <span className="font-medium text-slate-700 flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{intel.formatted_time}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Linked Mule Account & NCRP Reference */}
              <div className="bg-rose-50/50 rounded-xl p-4 border border-rose-200/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-rose-900 font-bold">
                  <span className="flex items-center space-x-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>Originating Mule Account & Complaint Trail</span>
                  </span>
                  <span className="text-[10px] font-mono text-rose-700 bg-rose-100 px-2 py-0.5 rounded font-bold">
                    {intel.case_complaint_ref}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Mule Account</span>
                    <span className="font-mono font-bold text-slate-800">{intel.account_number}</span>
                    <span className="text-slate-500 ml-1">({intel.account_holder_name})</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block text-[10px]">Assigned Patrol Unit</span>
                    <span className="font-semibold text-indigo-700">{intel.nearest_patrol_unit}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="bg-slate-100/80 border-t border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3">

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyDossier}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-all flex items-center space-x-1.5 shadow-sm"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copied ? 'Dossier Copied' : 'Copy Dossier'}</span>
            </button>

            <button
              onClick={handleDispatchPatrol}
              disabled={patrolDispatched}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 shadow-sm ${patrolDispatched
                  ? 'bg-emerald-600 text-white'
                  : 'bg-rose-600 text-white hover:bg-rose-700'
                }`}
            >
              <Siren className="w-3.5 h-3.5" />
              <span>{patrolDispatched ? 'Patrol Intercept Dispatched' : 'Dispatch PCR Patrol Unit'}</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {onFreezeAccount && (
              <button
                onClick={() => {
                  onClose();
                  onFreezeAccount(intel.account_id);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-300 hover:bg-amber-100 transition-all flex items-center space-x-1.5 shadow-sm"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Issue Section 107 BNSS Freeze</span>
              </button>
            )}

            <button
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Generating PDF...' : 'Download Official PDF Report'}</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
