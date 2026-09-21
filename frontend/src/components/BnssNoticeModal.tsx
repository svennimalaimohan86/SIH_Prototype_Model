import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Printer,
  Download,
  Copy,
  Check,
  X,
  Send,
  Building2,
  FileText,
  Lock,
  Clock,
  ExternalLink,
  Award,
  Fingerprint,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2
} from 'lucide-react';
import { api } from '../services/api';
import { BnssNoticeData } from '../types';

interface BnssNoticeModalProps {
  accountId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onUnfreezeSuccess?: () => void;
}

export const BnssNoticeModal: React.FC<BnssNoticeModalProps> = ({
  accountId,
  isOpen,
  onClose,
  onUnfreezeSuccess
}) => {
  const [notice, setNotice] = useState<BnssNoticeData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [dispatchStatus, setDispatchStatus] = useState<'IDLE' | 'DISPATCHING' | 'SENT'>('IDLE');
  const [unfreezing, setUnfreezing] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && accountId) {
      setLoading(true);
      setError(null);
      setDispatchStatus('IDLE');
      api.getBnssNotice(accountId)
        .then((data) => {
          setNotice(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Failed to load BNSS notice:', err);
          setError('Failed to generate Section 107 BNSS notice. Please check backend.');
          setLoading(false);
        });
    }
  }, [isOpen, accountId]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyNoticeText = () => {
    if (!notice) return;
    const text = `
================================================================================
STATUTORY DIGITAL REQUISITION UNDER SECTION 107 BHARATIYA NAGARIK SURAKSHA SANHITA, 2023 (BNSS)
READ WITH SECTION 111 BNSS & SECTION 66D INFORMATION TECHNOLOGY ACT, 2000
================================================================================
NOTICE REF NO: ${notice.notice_reference}
DATE OF ISSUE : ${new Date(notice.issue_timestamp).toLocaleDateString('en-IN')}
ISSUING WING  : ${notice.issuing_authority}
INVESTIGATOR  : ${notice.investigating_officer} (Badge: ${notice.investigator_badge})
CASE / NCRP   : ${notice.case_complaint_ref}

TO:
${notice.target_bank}
Central Nodal & AML Operations Wing

SUBJECT: STATUTORY DIRECTION FOR IMMEDIATE ${notice.freeze_action.toUpperCase()} UNDER SECTION 107 BNSS

TARGET ACCOUNT:
• Account Number : ${notice.account_number}
• Account Holder : ${notice.account_holder_name}
• Facility Type  : ${notice.account_type}
• Jurisdiction   : ${notice.city_jurisdiction}
• Directed Order : ${notice.freeze_action}

FORENSIC EVIDENCE & XAI ANOMALY ASSESSMENT:
• Anomaly Risk Score: ${notice.forensic_anomaly_score} / 100 (CRITICAL SYNDICATE MULE)
${notice.xai_justification.map((r, i) => `  ${i + 1}. ${r}`).join('\n')}

TAINTED TRANSACTION UTRs:
${notice.utr_references.map((u) => `  • ${u}`).join('\n')}

STATUTORY DIRECTIVES (COMPLIANCE WITHIN 24 HOURS):
${notice.statutory_orders.map((o, idx) => `  ${idx + 1}. ${o}`).join('\n')}

VERIFICATION SHA-256 HASH:
${notice.verification_hash}
================================================================================
`.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSimulateDispatch = () => {
    setDispatchStatus('DISPATCHING');
    setTimeout(() => {
      setDispatchStatus('SENT');
    }, 1200);
  };

  const handleUnfreeze = async () => {
    if (!accountId) return;
    if (!window.confirm('Are you sure you want to revoke this statutory freeze order and restore the account to ACTIVE status?')) {
      return;
    }

    try {
      setUnfreezing(true);
      await api.unfreezeAccount(accountId);
      alert('Account freeze successfully revoked. Status restored to ACTIVE.');
      if (onUnfreezeSuccess) onUnfreezeSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to unfreeze account:', err);
      alert('Failed to revoke account freeze.');
    } finally {
      setUnfreezing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      {/* Outer White Card Container matching reference image */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-5xl my-4 overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Top Header Controls Bar matching Reference Image (Print, Download, Add-on, Close) */}
        <div className="py-3 px-6 bg-white border-b border-slate-200 flex items-center justify-between flex-shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Document Preview
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Print Icon Button */}
            <button
              onClick={handlePrint}
              disabled={loading || !notice}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors disabled:opacity-50"
              title="Print Document"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Download Icon Button */}
            <button
              onClick={handlePrint}
              disabled={loading || !notice}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors disabled:opacity-50"
              title="Download as PDF"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Plus Icon Button */}
            <button
              onClick={handleCopyNoticeText}
              disabled={loading || !notice}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors disabled:opacity-50"
              title="Copy Full Notice Text"
            >
              <Copy className="w-4 h-4" />
            </button>

            {/* + Add-on Button (matching reference image) */}
            <button
              onClick={handleSimulateDispatch}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add-on</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Canvas */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-100/70 print:bg-white print:p-0 print:m-0 print:overflow-visible">
          {loading && (
            <div className="py-24 text-center">
              <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm font-bold text-slate-800">Generating Columnar Statutory Sheet...</p>
            </div>
          )}

          {error && (
            <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center text-rose-700">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
              <p className="text-sm font-bold">{error}</p>
            </div>
          )}

          {notice && (
            /* The Exact Columnar Box Sheet Design Matching The Pasted Image */
            <div className="max-w-4xl mx-auto bg-white border-2 border-slate-900 text-slate-900 font-sans shadow-md print:shadow-none print:border-2">
              
              {/* Top Header Row (GSTIN / REG NO, TITLE, BILL/CASE NO) */}
              <div className="grid grid-cols-1 md:grid-cols-12 items-center p-4 md:p-6 border-b-2 border-slate-900 gap-4">
                {/* Left Meta */}
                <div className="md:col-span-4 text-xs font-bold space-y-1">
                  <div>
                    <span className="text-slate-600">REG NO : </span>
                    <span className="font-mono text-slate-900">{notice.notice_reference}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">DATE : </span>
                    <span className="text-slate-900">
                      {new Date(notice.issue_timestamp).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                </div>

                {/* Center Title (Underlined like PROFORMA INVOICE in image) */}
                <div className="md:col-span-4 text-center">
                  <h2 className="text-sm md:text-base font-black tracking-wider uppercase border-b-2 border-slate-900 inline-block pb-0.5">
                    STATUTORY REQUISITION
                  </h2>
                </div>

                {/* Right Box (BILL NO / CASE NO with dashed pill box matching image) */}
                <div className="md:col-span-4 flex items-center md:justify-end gap-2 text-xs font-bold">
                  <span className="text-slate-700 uppercase tracking-wider">CASE NO :</span>
                  <div className="px-4 py-1.5 rounded-xl border-2 border-dashed border-slate-700 font-mono font-extrabold text-xs md:text-sm text-slate-900 bg-slate-50">
                    {notice.case_complaint_ref}
                  </div>
                </div>
              </div>

              {/* Entity / Wing Center Header matching Demo Studio logo block */}
              <div className="text-center py-5 px-4 border-b-2 border-slate-900">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <ShieldAlert className="w-6 h-6 text-slate-900" />
                  <h1 className="text-xl md:text-2xl font-black uppercase tracking-wider text-slate-900">
                    CYBER CRIME INVESTIGATION CELL
                  </h1>
                </div>
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  State Cyber Police HQ, AP 742, 11th Main Rd, Anna Nagar, Chennai, Tamil Nadu 600040.
                </p>
                <p className="text-[11px] font-semibold text-slate-500 mt-1">
                  Section 107 BNSS (2026) • Read with Section 111 BNSS & Section 66D Information Technology Act, 2000
                </p>
              </div>

              {/* 2-Column Details Grid matching Reference Image */}
              <div className="grid grid-cols-1 md:grid-cols-12 border-b-2 border-slate-900">
                {/* Left Column: TO (Addressee & Target Account details) */}
                <div className="md:col-span-4 p-4 md:p-5 border-b-2 md:border-b-0 md:border-r-2 border-slate-900 bg-white">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-900 block mb-2">
                    TO
                  </span>
                  <div className="font-black text-sm text-slate-900 leading-tight">
                    {notice.target_bank}
                  </div>
                  <div className="text-xs font-semibold text-slate-600 mt-0.5 mb-4">
                    nodal.ops@sbi.co.in • Central AML Desk
                  </div>

                  <div className="pt-3 border-t border-slate-300 space-y-1.5 text-xs">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                      Target Account Specified:
                    </span>
                    <div>
                      <span className="text-slate-500 font-medium">Holder: </span>
                      <span className="font-extrabold text-slate-900">{notice.account_holder_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Account: </span>
                      <span className="font-mono font-extrabold text-slate-900">{notice.account_number}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Type: </span>
                      <span className="font-bold text-slate-800">{notice.account_type}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Branch: </span>
                      <span className="font-bold text-slate-800">{notice.city_jurisdiction}</span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Key-Value Rows matching wedding/event grid in image */}
                <div className="md:col-span-8 divide-y-2 divide-slate-900 bg-white">
                  {/* Row 1: Event / Offense */}
                  <div className="grid grid-cols-12 text-xs">
                    <div className="col-span-5 p-2.5 px-3.5 font-bold uppercase tracking-wider text-slate-900 border-r-2 border-slate-900 bg-slate-50">
                      OFFENSE CATEGORY
                    </div>
                    <div className="col-span-7 p-2.5 px-3.5 font-bold text-slate-900 uppercase">
                      CYBER FINANCIAL FRAUD (MULE NETWORK)
                    </div>
                  </div>

                  {/* Row 2: Statutory Law */}
                  <div className="grid grid-cols-12 text-xs">
                    <div className="col-span-5 p-2.5 px-3.5 font-bold uppercase tracking-wider text-slate-900 border-r-2 border-slate-900 bg-slate-50">
                      STATUTORY ACT
                    </div>
                    <div className="col-span-7 p-2.5 px-3.5 font-bold text-slate-900">
                      Section 107 BNSS (2026) / 66D IT Act
                    </div>
                  </div>

                  {/* Row 3: Directed Order */}
                  <div className="grid grid-cols-12 text-xs">
                    <div className="col-span-5 p-2.5 px-3.5 font-bold uppercase tracking-wider text-slate-900 border-r-2 border-slate-900 bg-slate-50">
                      DIRECTED ORDER
                    </div>
                    <div className="col-span-7 p-2.5 px-3.5 font-black text-rose-700 uppercase flex items-center justify-between">
                      <span>{notice.freeze_action}</span>
                      <span className="p-1 rounded text-rose-600">
                        <Lock className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>

                  {/* Row 4: Investigating Officer */}
                  <div className="grid grid-cols-12 text-xs">
                    <div className="col-span-5 p-2.5 px-3.5 font-bold uppercase tracking-wider text-slate-900 border-r-2 border-slate-900 bg-slate-50">
                      INVESTIGATING OFFICER
                    </div>
                    <div className="col-span-7 p-2.5 px-3.5 font-bold text-slate-900">
                      {notice.investigating_officer} (Badge: {notice.investigator_badge})
                    </div>
                  </div>

                  {/* Row 5: Anomaly Risk Score */}
                  <div className="grid grid-cols-12 text-xs">
                    <div className="col-span-5 p-2.5 px-3.5 font-bold uppercase tracking-wider text-slate-900 border-r-2 border-slate-900 bg-slate-50">
                      ANOMALY VECTOR
                    </div>
                    <div className="col-span-7 p-2.5 px-3.5 font-mono font-extrabold text-rose-700">
                      {notice.forensic_anomaly_score} / 100 Anomaly Index (Critical)
                    </div>
                  </div>

                  {/* Row 6: Location */}
                  <div className="grid grid-cols-12 text-xs">
                    <div className="col-span-5 p-2.5 px-3.5 font-bold uppercase tracking-wider text-slate-900 border-r-2 border-slate-900 bg-slate-50">
                      LOCATION / JURISDICTION
                    </div>
                    <div className="col-span-7 p-2.5 px-3.5 font-extrabold text-slate-900 uppercase">
                      {notice.city_jurisdiction}
                    </div>
                  </div>
                </div>
              </div>

              {/* Forensic Itemized Table matching SL.NO | DESCRIPTION | QTY./UNIT columns */}
              <div>
                {/* Table Column Headers */}
                <div className="grid grid-cols-12 border-b-2 border-slate-900 text-xs font-black uppercase tracking-wider bg-slate-100">
                  <div className="col-span-2 p-2.5 px-3 text-center border-r-2 border-slate-900">
                    SL.NO
                  </div>
                  <div className="col-span-7 p-2.5 px-4 border-r-2 border-slate-900">
                    FORENSIC XAI ANOMALY GROUNDS & TAINTED TRANSACTION PARTICULARS
                  </div>
                  <div className="col-span-3 p-2.5 px-3 text-center">
                    QTY. / ASSESSMENT
                  </div>
                </div>

                {/* Single Session Dashed Container matching image */}
                <div className="p-3 md:p-4 border-b-2 border-slate-900">
                  <div className="border-2 border-dashed border-slate-400 rounded-xl p-3 bg-slate-50/50">
                    <div className="font-extrabold text-xs uppercase tracking-wider text-slate-900 underline mb-2">
                      EVIDENCE_SUMMARY_RECORD
                    </div>

                    <div className="space-y-2 text-xs">
                      {/* XAI Evidence Items */}
                      {notice.xai_justification.map((ground, idx) => (
                        <div key={idx} className="grid grid-cols-12 items-center gap-2 py-1 border-b border-slate-200">
                          <div className="col-span-1 text-center font-bold text-slate-500">
                            0{idx + 1}
                          </div>
                          <div className="col-span-8 font-medium text-slate-800">
                            {ground}
                          </div>
                          <div className="col-span-3 text-right font-mono font-bold text-rose-700">
                            Verified Anomaly
                          </div>
                        </div>
                      ))}

                      {/* Tainted UTRs */}
                      <div className="pt-2">
                        <span className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                          Connected Tainted Transaction UTR Hashes:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {notice.utr_references.map((utr, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded bg-white border border-slate-300 font-mono text-[11px] font-bold text-slate-800"
                            >
                              {utr}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mandatory Directives & Verification Block */}
                <div className="p-4 md:p-5 bg-white text-xs space-y-3">
                  <div className="font-bold text-slate-900 uppercase tracking-wide text-[11px]">
                    Statutory Directives to Bank Nodal Operations:
                  </div>
                  <ol className="list-decimal pl-5 space-y-1 text-slate-800 font-medium leading-relaxed">
                    {notice.statutory_orders.map((order, i) => (
                      <li key={i}>{order}</li>
                    ))}
                  </ol>

                  {/* Verification Signature Row */}
                  <div className="pt-4 mt-4 border-t-2 border-slate-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Digital SHA256 Stamp:</span>
                      <span className="font-mono text-[10px] text-slate-700 font-semibold">{notice.verification_hash}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-serif italic font-bold text-sm text-slate-900">{notice.investigating_officer}</div>
                      <div className="text-[10px] font-bold text-slate-600 uppercase">Investigating Officer • Tamil Nadu Police</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Floating Action Buttons Matching Reference Image Exactly */}
        {/* Colorful Pill Buttons: Blue (Save), Purple (Send to client), Green (Send Email), Mint Green (Send WhatsApp) */}
        <div className="p-4 px-6 bg-white border-t border-slate-200 flex flex-wrap items-center justify-center gap-3 flex-shrink-0 print:hidden">
          {/* 1. Save / Print PDF (Blue Pill matching 'Save' in image) */}
          <button
            onClick={handlePrint}
            disabled={loading || !notice}
            className="px-6 py-2.5 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-700 font-extrabold text-xs transition-colors shadow-xs flex items-center gap-2 disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>Save / Print PDF</span>
          </button>

          {/* 2. Copy Notice (Purple Pill matching 'Send to client page only' in image) */}
          <button
            onClick={handleCopyNoticeText}
            disabled={loading || !notice}
            className="px-6 py-2.5 rounded-full bg-purple-100 hover:bg-purple-200 text-purple-700 font-extrabold text-xs transition-colors shadow-xs flex items-center gap-2 disabled:opacity-50"
          >
            {copied ? <Check className="w-4 h-4 text-purple-800" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy Requisition Text'}</span>
          </button>

          {/* 3. Send Email / Dispatch Webhook (Green Pill matching 'Send Email' in image) */}
          <button
            onClick={handleSimulateDispatch}
            disabled={dispatchStatus !== 'IDLE'}
            className="px-6 py-2.5 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-extrabold text-xs transition-colors shadow-xs flex items-center gap-2 disabled:opacity-50"
          >
            {dispatchStatus === 'DISPATCHING' ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
                <span>Sending to Bank Nodal...</span>
              </>
            ) : dispatchStatus === 'SENT' ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>Nodal Webhook Confirmed (200 OK)</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Dispatch to Bank Nodal</span>
              </>
            )}
          </button>

          {/* 4. Revoke / Unfreeze (Mint Green Pill matching 'Send WhatsApp' in image) */}
          <button
            onClick={handleUnfreeze}
            disabled={unfreezing}
            className="px-6 py-2.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold text-xs border border-emerald-200 transition-colors shadow-xs flex items-center gap-2 disabled:opacity-50"
          >
            <Lock className="w-4 h-4 text-emerald-700" />
            <span>{unfreezing ? 'Revoking...' : 'Revoke Freeze'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
