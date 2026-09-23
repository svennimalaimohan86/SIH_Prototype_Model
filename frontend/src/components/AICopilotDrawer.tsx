import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  GitFork,
  MapPin,
  FileText,
  ShieldAlert,
  Clock,
  Copy,
  Check,
  Printer,
  Zap,
  Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  CopilotQueryResponse,
  CaseBriefingData,
  CopilotAccountCard,
  CopilotATMCard
} from '../types';

// Rich Markdown & Typography Renderer Helper
const FormattedMarkdown: React.FC<{ content: string; className?: string }> = ({
  content,
  className = '',
}) => {
  if (!content) return null;

  // Split lines
  const lines = content.split('\n');

  return (
    <div className={`space-y-2 text-sm leading-relaxed ${className}`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Empty line
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Horizontal Rule
        if (trimmed === '---' || trimmed === '***') {
          return <hr key={idx} className="my-3 border-slate-200" />;
        }

        // Header 3 (###)
        if (trimmed.startsWith('### ')) {
          return (
            <h4
              key={idx}
              className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5 pt-1"
            >
              {renderInlineSpans(trimmed.replace(/^###\s+/, ''))}
            </h4>
          );
        }

        // Header 4 (####)
        if (trimmed.startsWith('#### ')) {
          return (
            <h5
              key={idx}
              className="text-xs font-bold uppercase tracking-wider text-slate-600 pt-1"
            >
              {renderInlineSpans(trimmed.replace(/^####\s+/, ''))}
            </h5>
          );
        }

        // Bullet items (- or *)
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-600 flex-shrink-0 mt-2" />
              <div className="flex-1 text-slate-700">
                {renderInlineSpans(trimmed.replace(/^[-*]\s+/, ''))}
              </div>
            </div>
          );
        }

        // Numbered list items (1. , 2. )
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1.5">
              <span className="w-5 h-5 rounded-md bg-brand-100 text-brand-800 text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {numMatch[1]}
              </span>
              <div className="flex-1 text-slate-700">
                {renderInlineSpans(numMatch[2])}
              </div>
            </div>
          );
        }

        // Standard Paragraph
        return (
          <p key={idx} className="text-slate-700">
            {renderInlineSpans(trimmed)}
          </p>
        );
      })}
    </div>
  );
};

// Inline spans parser (bold, code, quotes, currency badges)
function renderInlineSpans(text: string): React.ReactNode[] {
  // Tokenize by code, bold, links
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);

  return tokens.map((token, i) => {
    if (!token) return null;

    // Inline Code: `...`
    if (token.startsWith('`') && token.endsWith('`') && token.length >= 2) {
      const codeContent = token.slice(1, -1);
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-brand-800 font-mono text-[12px] font-semibold"
        >
          {codeContent}
        </code>
      );
    }

    // Bold: **...**
    if (token.startsWith('**') && token.endsWith('**') && token.length >= 4) {
      const boldContent = token.slice(2, -2);
      return (
        <strong key={i} className="font-bold text-slate-900">
          {boldContent}
        </strong>
      );
    }

    // Italic: *...*
    if (token.startsWith('*') && token.endsWith('*') && token.length >= 2) {
      const italicContent = token.slice(1, -1);
      return (
        <em key={i} className="italic text-slate-600">
          {italicContent}
        </em>
      );
    }

    // Normal text
    return <React.Fragment key={i}>{token}</React.Fragment>;
  });
}

interface Message {
  id: string;
  sender: 'user' | 'copilot';
  text: string;
  timestamp: string;
  queryResponse?: CopilotQueryResponse;
  briefingData?: CaseBriefingData;
  isLoading?: boolean;
}

interface AICopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  contextAccountId?: number;
}

export const AICopilotDrawer: React.FC<AICopilotDrawerProps> = ({
  isOpen,
  onClose,
  contextAccountId,
}) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'copilot',
      text: `### 🤖 Nexora Cybercrime Copilot Online\n\nI am your **AI Forensic Intelligence Assistant** equipped with live access to the financial network graph, IsolationForest anomaly ratings, and ATM cash-out heuristics.\n\nAsk me anything about suspect connections, midnight bursts, or predict tactical cash-out windows.`,
      timestamp: 'Just now',
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeBriefing, setActiveBriefing] = useState<CaseBriefingData | null>(null);
  const [copiedBriefing, setCopiedBriefing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedPrompts = [
    "Show me all accounts linked to Dinesh M with transfers over ₹50,000 between midnight and 5 AM.",
    "Which ATM has the highest probability of cash-out in the next 2 hours?",
    "Summarize active high-risk mule syndicate nodes",
    "Explain Section 107 BNSS freeze powers for cyber investigation",
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (queryText?: string) => {
    const query = (queryText || inputQuery).trim();
    if (!query || loading) return;

    const userMsgId = Date.now().toString();
    const copilotMsgId = (Date.now() + 1).toString();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Add user message
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: 'user',
        text: query,
        timestamp: timeStr,
      },
      {
        id: copilotMsgId,
        sender: 'copilot',
        text: '',
        timestamp: timeStr,
        isLoading: true,
      },
    ]);

    setInputQuery('');
    setLoading(true);

    try {
      const response = await api.copilotQuery(query, contextAccountId);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === copilotMsgId
            ? {
                ...msg,
                text: response.answer,
                queryResponse: response,
                isLoading: false,
              }
            : msg
        )
      );
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === copilotMsgId
            ? {
                ...msg,
                text: `❌ **Failed to retrieve AI intelligence**: ${err?.message || 'Server connection error.'}`,
                isLoading: false,
              }
            : msg
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBriefing = async (accountId: number) => {
    setLoading(true);
    try {
      const briefing = await api.getCaseBriefing(accountId);
      setActiveBriefing(briefing);
    } catch (err: any) {
      alert(`Could not generate briefing: ${err?.message || 'Error'}`);
    } finally {
      setLoading(false);
    }
  };

  const copyBriefingToClipboard = () => {
    if (!activeBriefing) return;
    const text = `NEXORA CYBERCRIME CASE BRIEFING
Case Reference: ${activeBriefing.case_id}
Generated: ${activeBriefing.timestamp}
Suspect: ${activeBriefing.suspect_info.name} (${activeBriefing.suspect_info.account_number})
Modus Operandi: ${activeBriefing.modus_operandi}
Risk Score: ${activeBriefing.suspect_info.risk_score}/100 [${activeBriefing.suspect_info.risk_level}]
Executive Summary: ${activeBriefing.executive_summary}
Predicted Cash-Out: ${activeBriefing.predicted_cashout.atm_name} (${activeBriefing.predicted_cashout.time_window}) - ${activeBriefing.predicted_cashout.confidence}% Confidence
Statutory Directives:
${activeBriefing.statutory_directives.map((d, i) => `${i + 1}. ${d}`).join('\n')}`;

    navigator.clipboard.writeText(text);
    setCopiedBriefing(true);
    setTimeout(() => setCopiedBriefing(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop for Copilot Drawer */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 transition-opacity"
      />

      {/* Slide-out Intelligence Drawer */}
      <div className="fixed inset-y-0 right-0 w-full sm:w-[540px] md:w-[600px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200 transition-transform duration-300 ease-out">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-brand-900 via-indigo-900 to-purple-900 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-300 shadow-inner">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">Nexora AI Copilot</h2>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-full">
                  GenAI Forensic Engine
                </span>
              </div>
              <p className="text-xs text-indigo-200">
                Natural Language Financial Network & Threat Investigator
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-indigo-200 hover:text-white hover:bg-white/10 transition-colors"
              title="Close Copilot"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Suggested Prompts Banner */}
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 overflow-x-auto no-scrollbar flex items-center gap-2">
          <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1 flex-shrink-0">
            <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" /> Prompts:
          </span>
          {suggestedPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(p)}
              className="text-xs whitespace-nowrap px-3.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-brand-600 text-white border border-slate-700/80 hover:border-brand-500 transition-all shadow-xs font-semibold flex-shrink-0"
            >
              {p.length > 42 ? p.substring(0, 42) + '...' : p}
            </button>
          ))}
        </div>

        {/* Chat Stream Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-surface-bg/40">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3.5 ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.sender === 'copilot' && (
                <div className="w-8 h-8 rounded-xl bg-brand-700 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-4 shadow-2xs ${
                  msg.sender === 'user'
                    ? 'bg-brand-700 text-white rounded-tr-none'
                    : 'bg-white border border-slate-200/80 text-slate-800 rounded-tl-none'
                }`}
              >
                {msg.isLoading ? (
                  <div className="flex items-center gap-2.5 py-1 text-slate-500 text-sm">
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-600"></span>
                    </span>
                    <span className="font-medium animate-pulse">
                      Analyzing transaction graph & anomaly matrix...
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Render Formatted Markdown Content */}
                    <FormattedMarkdown content={msg.text} />

                    {/* Render Interactive Suspect Cards if returned */}
                    {msg.queryResponse?.relevant_accounts &&
                      msg.queryResponse.relevant_accounts.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 space-y-2">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Target Suspect Profiles ({msg.queryResponse.relevant_accounts.length})
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                            {msg.queryResponse.relevant_accounts.map((acc) => (
                              <div
                                key={acc.id}
                                className="p-2.5 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center justify-between hover:bg-slate-100/80 transition-colors"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs text-slate-900 truncate">
                                      {acc.name}
                                    </span>
                                    <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600">
                                      {acc.account_number}
                                    </span>
                                    <span
                                      className={`px-1.5 py-0.2 text-[10px] font-bold rounded ${
                                        acc.risk_level === 'CRITICAL'
                                          ? 'bg-rose-100 text-rose-700'
                                          : acc.risk_level === 'HIGH'
                                          ? 'bg-orange-100 text-orange-700'
                                          : 'bg-amber-100 text-amber-700'
                                      }`}
                                    >
                                      {acc.risk_score}/100
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-500 mt-0.5">
                                    {acc.city || 'Jurisdiction'}{' '}
                                    {acc.is_frozen ? ' • 🔒 Frozen' : ''}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 ml-2">
                                  <button
                                    onClick={() => {
                                      onClose();
                                      navigate(`/money-flow?account=${acc.account_number}`);
                                    }}
                                    className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-brand-700 text-xs font-semibold hover:bg-brand-50 flex items-center gap-1 shadow-2xs"
                                    title="Trace on Money Flow Canvas"
                                  >
                                    <GitFork className="w-3 h-3" />
                                    Trace
                                  </button>
                                  <button
                                    onClick={() => handleGenerateBriefing(acc.id)}
                                    className="px-2 py-1 rounded-lg bg-brand-700 text-white text-xs font-semibold hover:bg-brand-800 flex items-center gap-1 shadow-2xs"
                                    title="Generate Executive Dossier"
                                  >
                                    <FileText className="w-3 h-3" />
                                    Briefing
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Render Interactive ATM Cards if returned */}
                    {msg.queryResponse?.relevant_atms &&
                      msg.queryResponse.relevant_atms.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 space-y-2">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Predicted Cashout Terminals
                          </div>
                          <div className="space-y-2">
                            {msg.queryResponse.relevant_atms.map((atm) => (
                              <div
                                key={atm.id}
                                className="p-2.5 bg-rose-50/50 border border-rose-200/80 rounded-xl flex items-center justify-between"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs text-slate-900">
                                      {atm.name}
                                    </span>
                                    <span className="px-1.5 py-0.2 text-[10px] font-bold bg-rose-500 text-white rounded">
                                      {atm.confidence}% Conf.
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-600 mt-0.5">
                                    {atm.location}, {atm.city} • Window:{' '}
                                    <code className="text-slate-800 font-semibold bg-white/70 px-1 py-0.5 rounded">
                                      {atm.time_window}
                                    </code>
                                  </div>
                                </div>

                                <button
                                  onClick={() => {
                                    onClose();
                                    navigate('/geo');
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 flex items-center gap-1 shadow-2xs"
                                >
                                  <MapPin className="w-3 h-3" />
                                  View Map
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Suggested follow-up actions */}
                    {msg.queryResponse?.suggested_actions &&
                      msg.queryResponse.suggested_actions.length > 0 && (
                        <div className="pt-2 flex flex-wrap gap-2">
                          {msg.queryResponse.suggested_actions.map((act, i) => (
                            <button
                              key={i}
                              onClick={() => handleSend(act)}
                              className="text-[11px] px-3 py-1.5 rounded-xl bg-gradient-to-r from-brand-700 via-indigo-700 to-purple-800 hover:from-brand-800 hover:via-indigo-800 hover:to-purple-900 text-white font-bold transition-all shadow-xs border border-indigo-400/30 flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
                            >
                              <span>→</span>
                              <span>{act}</span>
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                )}

                <div
                  className={`text-[10px] mt-2 flex items-center gap-1 ${
                    msg.sender === 'user' ? 'text-indigo-200 justify-end' : 'text-slate-400'
                  }`}
                >
                  <Clock className="w-2.5 h-2.5" />
                  {msg.timestamp}
                </div>
              </div>

              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask about suspect links, night transfers, ATM predictions..."
                className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-inner"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !inputQuery.trim()}
              className="p-3 rounded-2xl bg-brand-700 text-white hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-brand-700/20 flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="text-[11px] text-slate-400 mt-2 text-center flex items-center justify-center gap-1.5">
            <span>Powered by Nexora Neural Anomaly Engine & Graph Forensics</span>
          </div>
        </div>
      </div>

      {/* Case Briefing Dossier Modal - Fixed with High Z-Index z-[99999] */}
      {activeBriefing && (
        <div className="fixed inset-0 z-[99999] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden relative my-auto">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-brand-600 flex items-center justify-center text-white shadow-md shadow-brand-500/30 flex-shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-extrabold tracking-tight text-white">
                      Automated Cybercrime Case Briefing
                    </h3>
                    <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-brand-500/20 border border-brand-400/40 text-brand-300 rounded-md">
                      {activeBriefing.case_id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Confidential Intelligence Dossier • Generated {activeBriefing.timestamp}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={copyBriefingToClipboard}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
                >
                  {copiedBriefing ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copiedBriefing ? 'Copied' : 'Copy Dossier'}
                </button>
                <button
                  onClick={() => window.print()}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
                  title="Print Report"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setActiveBriefing(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Dossier Content */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 bg-slate-50/50">
              {/* Suspect Header Card */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Target Subject Profile
                  </div>
                  <h4 className="text-2xl font-black text-slate-900 mt-0.5">
                    {activeBriefing.suspect_info.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-slate-100 rounded text-slate-700 border border-slate-200">
                      {activeBriefing.suspect_info.account_number}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      • {activeBriefing.suspect_info.city}
                    </span>
                    {activeBriefing.suspect_info.is_frozen && (
                      <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                        🔒 FROZEN ({activeBriefing.suspect_info.freeze_status})
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs font-semibold text-slate-500">Anomaly Rating</div>
                    <div className="text-2xl font-black text-rose-600 leading-none mt-0.5">
                      {activeBriefing.suspect_info.risk_score}
                      <span className="text-sm font-bold text-slate-400">/100</span>
                    </div>
                  </div>
                  <span
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-xl border ${
                      activeBriefing.suspect_info.risk_level === 'CRITICAL'
                        ? 'bg-rose-100 text-rose-700 border-rose-200'
                        : 'bg-orange-100 text-orange-700 border-orange-200'
                    }`}
                  >
                    {activeBriefing.suspect_info.risk_level}
                  </span>
                </div>
              </div>

              {/* Executive Summary */}
              <div>
                <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-brand-600" /> Executive Intelligence Summary
                </h5>
                <div className="p-4 rounded-2xl bg-white border border-indigo-100/90 shadow-2xs">
                  <FormattedMarkdown content={activeBriefing.executive_summary} />
                </div>
              </div>

              {/* Modus Operandi & Typology */}
              <div>
                <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Identified Modus Operandi (M.O.)
                </h5>
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-slate-900 text-sm font-bold flex items-center gap-3 shadow-2xs">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <span>{activeBriefing.modus_operandi}</span>
                </div>
              </div>

              {/* Financial Trail Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs text-center">
                  <div className="text-[11px] font-semibold text-slate-500">Total Inflow</div>
                  <div className="text-base font-black text-slate-900 mt-1">
                    ₹{activeBriefing.financial_trail.total_inflow.toLocaleString()}
                  </div>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs text-center">
                  <div className="text-[11px] font-semibold text-slate-500">Total Outflow</div>
                  <div className="text-base font-black text-slate-900 mt-1">
                    ₹{activeBriefing.financial_trail.total_outflow.toLocaleString()}
                  </div>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs text-center">
                  <div className="text-[11px] font-semibold text-slate-500">Mule Counterparties</div>
                  <div className="text-base font-black text-brand-700 mt-1">
                    {activeBriefing.financial_trail.direct_counterparties} Nodes
                  </div>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs text-center">
                  <div className="text-[11px] font-semibold text-slate-500">Laundering Hops</div>
                  <div className="text-base font-black text-slate-900 mt-1">
                    {activeBriefing.financial_trail.total_hops} Transfers
                  </div>
                </div>
              </div>

              {/* 🏧 ATM Cash-Out Event Intelligence Table */}
              {activeBriefing.atm_cashout_events && activeBriefing.atm_cashout_events.length > 0 && (
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-rose-600" /> ATM Physical Cash-Out Intelligence ({activeBriefing.atm_cashout_events.length} Events)
                    </h5>
                    <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      Terminal Surveillance Ready
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Exact accounts, mule holder names, and physical ATM withdrawal terminals linked to this suspect's syndicate:
                  </p>

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <tr>
                          <th className="py-2.5 px-3">ATM Terminal & Address</th>
                          <th className="py-2.5 px-3">Withdrawing Mule (Name & A/C)</th>
                          <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                          <th className="py-2.5 px-3">Time Window / Timestamp</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {activeBriefing.atm_cashout_events.slice(0, 6).map((evt) => (
                          <tr
                            key={evt.id}
                            className={evt.is_predicted ? "bg-rose-50/60 font-semibold" : "hover:bg-slate-50"}
                          >
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900">{evt.atm_name}</div>
                              <div className="text-[10px] text-slate-500">{evt.location}, {evt.city}</div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900">{evt.mule_name}</div>
                              <div className="text-[10px] font-mono text-brand-700">{evt.mule_account_number}</div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-black text-slate-900">
                              ₹{evt.amount.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                              {evt.timestamp}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  evt.is_predicted
                                    ? "bg-rose-600 text-white animate-pulse"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {evt.is_predicted ? "🚨 IMMINENT" : "COMPLETED"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 🔄 Multi-Hop Laundering Flow Chain */}
              {activeBriefing.laundering_hops && activeBriefing.laundering_hops.length > 0 && (
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
                  <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <GitFork className="w-4 h-4 text-brand-600" /> Multi-Hop Laundering Chain (Money Trail)
                  </h5>
                  <div className="space-y-2.5">
                    {activeBriefing.laundering_hops.map((hop) => (
                      <div
                        key={hop.hop_number}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="w-6 h-6 rounded-full bg-brand-700 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                            {hop.hop_number}
                          </span>
                          <div>
                            <div className="text-xs font-bold text-slate-900">{hop.stage_name}</div>
                            <div className="text-[11px] text-slate-600 mt-0.5">
                              <span className="font-semibold text-slate-800">{hop.source}</span> → <span className="font-semibold text-brand-700">{hop.destination}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{hop.description}</div>
                          </div>
                        </div>

                        <div className="text-right sm:pl-4">
                          <div className="text-xs font-black text-slate-900">₹{hop.amount.toLocaleString()}</div>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-white rounded border border-slate-200 text-slate-600">
                            {hop.channel}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Legal UTR & Notice Export Box */}
              {activeBriefing.utr_references && activeBriefing.utr_references.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      ⚖️ Section 107 BNSS Evidentiary UTR Hashes
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">
                      VERIFIED BY NEXORA ENGINE
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activeBriefing.utr_references.map((utr, i) => (
                      <span
                        key={i}
                        className="text-xs font-mono bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg text-amber-300"
                      >
                        {utr}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Statutory Directives */}
              <div>
                <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Mandatory Statutory Next Steps (Section 107 BNSS / 102 CrPC)
                </h5>
                <ul className="space-y-2.5">
                  {activeBriefing.statutory_directives.map((dir, i) => (
                    <li
                      key={i}
                      className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 font-semibold flex items-start gap-3 shadow-2xs"
                    >
                      <span className="w-6 h-6 rounded-lg bg-brand-700 text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{dir}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 bg-white border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => {
                  const targetAcc = activeBriefing.suspect_info.account_number;
                  setActiveBriefing(null);
                  onClose();
                  navigate(`/money-flow?account=${targetAcc}`);
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold hover:bg-brand-50 hover:text-brand-800 hover:border-brand-300 flex items-center gap-2 transition-all shadow-2xs"
              >
                <GitFork className="w-4 h-4 text-brand-600" />
                Trace Money Trail
              </button>

              <button
                onClick={() => setActiveBriefing(null)}
                className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all shadow-sm"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
