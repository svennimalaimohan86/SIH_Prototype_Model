import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ForceGraph2D from 'react-force-graph-2d';
import {
  GitFork,
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
  MapPin,
  RefreshCw,
  Search,
  Sparkles,
  Info,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Maximize,
  Minimize,
  Filter,
  Layers,
  ChevronRight,
  User,
  CreditCard,
  Wallet,
  Activity,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';
import { MoneyFlowGraph, GraphNode, AccountRiskScore } from '../types';
import { RiskBadge } from '../components/RiskBadge';

export const MoneyFlow: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const graphRef = useRef<any>(null);

  const initialAccountId = searchParams.get('account_id') || '127';
  const [selectedAccountId, setSelectedAccountId] = useState<string>(initialAccountId);
  const [graphData, setGraphData] = useState<MoneyFlowGraph | null>(null);
  const [allAccounts, setAllAccounts] = useState<AccountRiskScore[]>([]);
  const [selectedNodeDetails, setSelectedNodeDetails] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [hoveredLink, setHoveredLink] = useState<any | null>(null);

  // Filters & display options
  const [minAmountFilter, setMinAmountFilter] = useState<number>(0);
  const [showOnlySuspicious, setShowOnlySuspicious] = useState<boolean>(false);
  const [showLinkAmounts, setShowLinkAmounts] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ width: 0, height: 520 });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Resize listener for responsive canvas in standard and fullscreen mode
  useEffect(() => {
    const updateSize = () => {
      if (canvasContainerRef.current) {
        setCanvasSize({
          width: canvasContainerRef.current.clientWidth,
          height: canvasContainerRef.current.clientHeight
        });
      }
    };

    updateSize();
    const timer = setTimeout(updateSize, 100);
    window.addEventListener('resize', updateSize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateSize);
    };
  }, [isFullscreen]);

  // Handle ESC key to exit full screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
        if (document.fullscreenElement) {
          document.exitFullscreen?.().catch(() => {});
        }
        setTimeout(() => {
          if (graphRef.current) {
            graphRef.current.zoomToFit(400, 60);
          }
        }, 200);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const list = await api.getRiskScores();
        setAllAccounts(list);
      } catch (e) {
        console.error('Failed to load accounts for selector:', e);
      }
    };
    fetchAccounts();
  }, []);

  const loadGraph = async (accId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getMoneyFlow(accId);
      setGraphData(data);
      const rootNode = data.nodes.find((n) => n.id === accId) || data.nodes[0] || null;
      setSelectedNodeDetails(rootNode);

      setTimeout(() => {
        if (graphRef.current) {
          graphRef.current.zoomToFit(400, 60);
        }
      }, 500);
    } catch (err: any) {
      console.error('Failed to load money-flow graph:', err);
      setError('Unable to compute clean NetworkX money-flow subgraph for this account.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const accId = searchParams.get('account_id') || initialAccountId;
    setSelectedAccountId(accId);
    loadGraph(accId);
  }, [searchParams]);

  const handleAccountChange = (newId: string) => {
    setSelectedAccountId(newId);
    setSearchParams({ account_id: newId });
  };

  const handleZoomIn = () => {
    if (graphRef.current) {
      graphRef.current.zoom(graphRef.current.zoom() * 1.3, 300);
    }
  };

  const handleZoomOut = () => {
    if (graphRef.current) {
      graphRef.current.zoom(graphRef.current.zoom() / 1.3, 300);
    }
  };

  const handleResetZoom = () => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400, 60);
    }
  };

  const handleToggleFullscreen = () => {
    setIsFullscreen((prev) => {
      const next = !prev;
      setTimeout(() => {
        if (graphRef.current) {
          graphRef.current.zoomToFit(400, 60);
        }
      }, 250);
      return next;
    });
  };

  const filteredData = React.useMemo(() => {
    if (!graphData) return { nodes: [], links: [] };

    let links = graphData.links.filter((l) => l.amount >= minAmountFilter);

    if (showOnlySuspicious) {
      const suspiciousIds = new Set(
        graphData.nodes
          .filter((n) => n.risk_score >= 70 || n.is_flagged || n.id === selectedAccountId)
          .map((n) => n.id)
      );
      links = links.filter(
        (l) =>
          suspiciousIds.has(typeof l.source === 'object' ? (l.source as any).id : l.source) &&
          suspiciousIds.has(typeof l.target === 'object' ? (l.target as any).id : l.target)
      );
    }

    const connectedNodeIds = new Set<string>();
    connectedNodeIds.add(selectedAccountId);
    links.forEach((l) => {
      connectedNodeIds.add(typeof l.source === 'object' ? (l.source as any).id : l.source);
      connectedNodeIds.add(typeof l.target === 'object' ? (l.target as any).id : l.target);
    });

    const nodes = graphData.nodes.filter((n) => connectedNodeIds.has(n.id));

    return { nodes, links };
  }, [graphData, minAmountFilter, showOnlySuspicious, selectedAccountId]);

  const getNodeColor = useCallback(
    (node: GraphNode) => {
      if (node.id === selectedAccountId) return '#6925EB';
      if (node.risk_score >= 85 || node.is_flagged) return '#EF4444';
      if (node.risk_score >= 70) return '#F97316';
      if (node.risk_score >= 40) return '#F59E0B';
      return '#3B82F6';
    },
    [selectedAccountId]
  );

  const drawNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const isTarget = node.id === selectedAccountId;
      const isHovered = hoveredNode?.id === node.id;
      const isSelected = selectedNodeDetails?.id === node.id;
      const baseRadius = isTarget ? 11 : 8.5;
      const radius = isHovered || isSelected ? baseRadius * 1.25 : baseRadius;
      const color = getNodeColor(node);

      if (isTarget || node.risk_score >= 85) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 5, 0, 2 * Math.PI, false);
        ctx.fillStyle = isTarget ? 'rgba(105, 37, 235, 0.18)' : 'rgba(239, 68, 68, 0.18)';
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = isTarget ? 3 / globalScale : 2 / globalScale;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();

      const iconSize = Math.max(7 / globalScale, 2);
      ctx.font = `bold ${iconSize}px 'Plus Jakarta Sans', sans-serif`;
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (isTarget) {
        ctx.fillText('★', node.x, node.y);
      } else {
        ctx.fillText(`${node.risk_score}`, node.x, node.y);
      }

      const labelText = node.label || `NX-${node.id}`;
      const nameText = node.name ? node.name.split(' ')[0] : '';
      const displayStr = `${labelText} ${nameText ? '• ' + nameText : ''}`;

      const fontSize = Math.max(9 / globalScale, 3);
      ctx.font = `${isTarget ? 'bold' : '600'} ${fontSize}px 'Plus Jakarta Sans', sans-serif`;
      const textWidth = ctx.measureText(displayStr).width;
      const pillHeight = fontSize + 6 / globalScale;
      const pillWidth = textWidth + 10 / globalScale;
      const pillY = node.y + radius + 4 / globalScale;

      ctx.beginPath();
      const r = 3 / globalScale;
      ctx.roundRect
        ? ctx.roundRect(node.x - pillWidth / 2, pillY, pillWidth, pillHeight, r)
        : ctx.rect(node.x - pillWidth / 2, pillY, pillWidth, pillHeight);
      ctx.fillStyle = isTarget ? '#F4F0FF' : '#FFFFFF';
      ctx.fill();
      ctx.lineWidth = 1 / globalScale;
      ctx.strokeStyle = isTarget ? '#7E43F4' : '#E2E8F0';
      ctx.stroke();

      ctx.fillStyle = isTarget ? '#5A1ACD' : '#1E293B';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(displayStr, node.x, pillY + pillHeight / 2);
    },
    [selectedAccountId, selectedNodeDetails, hoveredNode, getNodeColor]
  );

  const drawLink = useCallback(
    (link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const start = link.source;
      const end = link.target;
      if (!start || !end || start.x === undefined || end.x === undefined) return;

      const isHighValue = link.amount >= 100000;
      const isConnectedToTarget = start.id === selectedAccountId || end.id === selectedAccountId;

      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.lineWidth = Math.min(Math.max((link.amount || 20000) / 40000, 1.2), 3.5) / globalScale;
      ctx.strokeStyle = isHighValue
        ? '#F87171'
        : isConnectedToTarget
          ? '#CBD5E1'
          : '#E2E8F0';
      ctx.stroke();

      if (showLinkAmounts && globalScale > 0.8) {
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;

        const amtStr =
          link.amount >= 100000
            ? `₹${(link.amount / 100000).toFixed(1)}L`
            : `₹${(link.amount / 1000).toFixed(0)}k`;

        const tagFontSize = Math.max(7.5 / globalScale, 2.5);
        ctx.font = `600 ${tagFontSize}px 'Plus Jakarta Sans', sans-serif`;
        const tagWidth = ctx.measureText(amtStr).width + 6 / globalScale;
        const tagHeight = tagFontSize + 4 / globalScale;

        ctx.beginPath();
        const tr = 2 / globalScale;
        ctx.roundRect
          ? ctx.roundRect(midX - tagWidth / 2, midY - tagHeight / 2, tagWidth, tagHeight, tr)
          : ctx.rect(midX - tagWidth / 2, midY - tagHeight / 2, tagWidth, tagHeight);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.lineWidth = 0.7 / globalScale;
        ctx.strokeStyle = isHighValue ? '#FCA5A5' : '#E2E8F0';
        ctx.stroke();

        ctx.fillStyle = isHighValue ? '#B91C1C' : '#64748B';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(amtStr, midX, midY);
      }
    },
    [selectedAccountId, showLinkAmounts]
  );

  const rootAccount = graphData?.nodes.find((n) => n.id === selectedAccountId);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header with Title, Badge, Subtitle and Account Dropdown */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-0.5">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight whitespace-nowrap leading-tight">
              Money Flow Intelligence
            </h2>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200/80 shadow-2xs whitespace-nowrap shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              NetworkX Ego-Subgraph
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1 font-medium leading-relaxed">
            Clean directed financial corridor analysis isolating primary money-laundering routes.
          </p>
        </div>

        {/* Account Selector */}
        <div className="flex items-center gap-2.5 bg-white px-3.5 py-2 rounded-2xl border border-surface-border shadow-soft shrink-0 self-start xl:self-center">
          <label className="text-xs font-bold text-slate-500 whitespace-nowrap">Investigating Account:</label>
          <select
            value={selectedAccountId}
            onChange={(e) => handleAccountChange(e.target.value)}
            className="bg-transparent text-xs font-extrabold text-slate-800 focus:outline-none cursor-pointer pr-1"
          >
            {allAccounts.map((acc) => (
              <option key={acc.account_id} value={acc.account_id}>
                {acc.account_number} — {acc.name} (Risk: {acc.risk_score} [{acc.risk_level}])
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Top Metric Cards Row matching Demo Studio Reference Image 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Target Identity */}
        <div className="p-4 rounded-2xl bg-white border border-surface-border shadow-soft flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-lavender-iconBg text-brand-700 flex items-center justify-center font-extrabold text-sm shadow-2xs flex-shrink-0">
            {rootAccount?.name?.substring(0, 2).toUpperCase() || 'NX'}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
              Investigating Target
            </span>
            <div className="text-base font-extrabold text-slate-900 truncate mt-0.5">
              {rootAccount?.label || `NX-${selectedAccountId}`}
            </div>
            <div className="text-xs font-semibold text-slate-600 truncate">
              {rootAccount?.name || 'Account Holder'}
            </div>
          </div>
        </div>

        {/* Card 2: Total Inflow */}
        <div className="p-4 rounded-2xl bg-white border border-surface-border shadow-soft flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
              Total Inflow Volume
            </span>
            <div className="text-base font-extrabold text-slate-900 truncate mt-0.5">
              ₹{graphData ? graphData.total_inflow.toLocaleString('en-IN') : '0'}
            </div>
            <div className="text-xs font-semibold text-emerald-600 truncate">
              Credits from Linked Mules
            </div>
          </div>
        </div>

        {/* Card 3: Total Outflow */}
        <div className="p-4 rounded-2xl bg-white border border-surface-border shadow-soft flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
              Total Outflow Volume
            </span>
            <div className="text-base font-extrabold text-slate-900 truncate mt-0.5">
              ₹{graphData ? graphData.total_outflow.toLocaleString('en-IN') : '0'}
            </div>
            <div className="text-xs font-semibold text-rose-600 truncate">
              Layered Transfers & Cash-outs
            </div>
          </div>
        </div>

        {/* Card 4: Network Corridors */}
        <div className="p-4 rounded-2xl bg-white border border-surface-border shadow-soft flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
            <GitFork className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
              Network Corridor Scope
            </span>
            <div className="text-base font-extrabold text-slate-900 truncate mt-0.5">
              {filteredData.nodes.length} Active Nodes
            </div>
            <div className="text-xs font-semibold text-purple-700 truncate">
              {filteredData.links.length} Primary Corridors
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Side-by-Side Area: Graph Canvas (Left 7 cols or Full Screen overlay) + Inspector Card (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Force Graph Canvas */}
        <div
          className={
            isFullscreen
              ? 'fixed inset-0 z-50 bg-white p-6 w-screen h-screen flex flex-col justify-between overflow-hidden shadow-2xl animate-in fade-in duration-200'
              : 'lg:col-span-7 bg-white rounded-3xl border border-surface-border shadow-soft p-5 relative min-h-[620px] flex flex-col justify-between overflow-hidden'
          }
        >
          {/* Top Floating Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-2 border-b border-slate-100 z-10">
            {/* Legend Chips */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              {isFullscreen && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-brand-50 text-brand-700 border border-brand-200 font-extrabold mr-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Full Screen Network</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-100">
                <span className="w-2 h-2 rounded-full bg-brand-600"></span>
                <span>Target</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-100">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span>Suspicious</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-100">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>Medium</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-100">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span>Standard</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowLinkAmounts(!showLinkAmounts)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors ${showLinkAmounts
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                title="Toggle transfer amount badges"
              >
                ₹ Amounts
              </button>

              <button
                onClick={() => setShowOnlySuspicious(!showOnlySuspicious)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors ${showOnlySuspicious
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                title="Show only high-risk / flagged links"
              >
                Suspicious Only
              </button>

              <div className="h-4 w-px bg-slate-200 mx-0.5" />

              <button
                onClick={handleZoomIn}
                className="p-1.5 rounded-xl bg-surface-bg hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-1.5 rounded-xl bg-surface-bg hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleResetZoom}
                className="p-1.5 rounded-xl bg-surface-bg hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors"
                title="Recenter Graph"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>

              {/* Full Screen Toggle Button */}
              <button
                onClick={handleToggleFullscreen}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shadow-2xs ${
                  isFullscreen
                    ? 'bg-brand-600 text-white border-brand-600 shadow-brand-500/25 hover:bg-brand-700'
                    : 'bg-surface-bg hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
                title={isFullscreen ? 'Exit Full Screen (Esc)' : 'Enter Full Screen'}
              >
                {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
                <span>{isFullscreen ? 'Exit Full Screen' : 'Full Screen'}</span>
              </button>
            </div>
          </div>

          {/* Graph Canvas */}
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-24">
              <RefreshCw className="w-8 h-8 text-brand-600 animate-spin mb-3" />
              <p className="text-xs font-bold text-slate-700">Structuring Clean Financial Network...</p>
            </div>
          ) : filteredData.nodes.length > 0 ? (
            <div
              ref={canvasContainerRef}
              className={`w-full rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing bg-radial from-white via-surface-bg/40 to-slate-50/50 ${
                isFullscreen ? 'flex-1 my-2 min-h-[calc(100vh-160px)]' : 'h-[520px]'
              }`}
            >
              <ForceGraph2D
                ref={graphRef}
                width={canvasSize.width > 0 ? canvasSize.width : undefined}
                height={canvasSize.height > 0 ? canvasSize.height : (isFullscreen ? window.innerHeight - 160 : 520)}
                graphData={filteredData}
                nodeCanvasObject={drawNode}
                linkCanvasObject={drawLink}
                nodePointerAreaPaint={(node: any, color, ctx) => {
                  ctx.fillStyle = color;
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, 14, 0, 2 * Math.PI, false);
                  ctx.fill();
                }}
                linkDirectionalArrowLength={6}
                linkDirectionalArrowRelPos={0.92}
                linkDirectionalParticles={2}
                linkDirectionalParticleSpeed={0.006}
                linkDirectionalParticleWidth={2}
                linkDirectionalParticleColor={() => '#7E43F4'}
                cooldownTicks={120}
                warmupTicks={80}
                d3VelocityDecay={0.35}
                onNodeClick={(node: any) => {
                  setSelectedNodeDetails(node);
                }}
                onNodeHover={(node: any) => setHoveredNode(node || null)}
                onLinkHover={(link: any) => setHoveredLink(link || null)}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
              No transactions match the selected filter.
            </div>
          )}

          {/* Footer Guidance */}
          <div className="text-[11px] text-slate-400 font-medium pt-3 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span>Click any node to inspect account forensic parameters. Drag nodes to reposition.</span>
              {isFullscreen && (
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200">
                  Press ESC or click button to exit full screen
                </span>
              )}
            </div>
            <span className="font-semibold text-slate-500">
              Showing {filteredData.nodes.length} Accounts & {filteredData.links.length} Clean Directed Corridors
            </span>
          </div>
        </div>

        {/* Right: Node Forensic Inspector (5 cols on desktop, spacious & cleanly aligned) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-surface-border p-6 shadow-soft space-y-4">
          {/* Card Top Header */}
          <div className="flex items-center justify-between pb-3 border-b border-surface-border">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                Node Forensic Inspector
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Key forensic intelligence about this account node.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-100 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{selectedNodeDetails?.id === selectedAccountId ? 'Primary Target' : 'Monitored Node'}</span>
            </div>
          </div>

          {selectedNodeDetails ? (
            <div className="space-y-3.5">
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
                    {selectedNodeDetails.label}
                  </div>
                  <div className="text-xs font-semibold text-slate-600 truncate">
                    {selectedNodeDetails.name}
                  </div>
                </div>
                {selectedNodeDetails.is_flagged && (
                  <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-100 text-rose-700 flex-shrink-0">
                    Flagged Mule
                  </span>
                )}
              </div>

              {/* 2. Calculated Risk Card (Single Line with clean RiskBadge pill) */}
              <div className="p-4 rounded-2xl bg-surface-bg/80 border border-slate-100 shadow-2xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
                      Calculated Risk
                    </span>
                    <span className="text-xs font-bold text-slate-800 block truncate mt-0.5">
                      Anomaly Vector Score
                    </span>
                  </div>
                </div>
                <div className="shrink-0 flex items-center whitespace-nowrap">
                  <RiskBadge
                    level={selectedNodeDetails.risk_level}
                    score={selectedNodeDetails.risk_score}
                    showScore={true}
                  />
                </div>
              </div>

              {/* 3. Account Type Card */}
              <div className="p-4 rounded-2xl bg-surface-bg/80 border border-slate-100 shadow-2xs flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
                    Account Type
                  </span>
                  <div className="text-base font-extrabold text-slate-900 truncate mt-0.5">
                    {selectedNodeDetails.account_type}
                  </div>
                  <div className="text-xs font-semibold text-indigo-600 truncate">
                    Commercial / Savings Facility
                  </div>
                </div>
              </div>

              {/* 4. Ledger Balance Card */}
              <div className="p-4 rounded-2xl bg-surface-bg/80 border border-slate-100 shadow-2xs flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
                    Ledger Balance
                  </span>
                  <div className="text-base font-extrabold text-slate-900 truncate mt-0.5">
                    ₹{selectedNodeDetails.balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-xs font-semibold text-emerald-600 truncate">
                    INR Available Balance
                  </div>
                </div>
              </div>

              {/* 5. Network Corridor Metrics Card */}
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
                    16 Flow Corridors (2-Hop Depth)
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2.5">
                {selectedNodeDetails.id !== selectedAccountId && (
                  <button
                    onClick={() => handleAccountChange(selectedNodeDetails.id)}
                    className="w-full py-2.5 rounded-2xl bg-lavender-pill hover:bg-lavender-active text-brand-700 font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-2xs"
                  >
                    <GitFork className="w-4 h-4" />
                    <span>Focus Graph on {selectedNodeDetails.label}</span>
                  </button>
                )}

                <button
                  onClick={() => navigate(`/geo?account_id=${selectedNodeDetails.id}`)}
                  className="w-full py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm shadow-brand-500/20"
                >
                  <MapPin className="w-4 h-4" />
                  <span>Trace Cash-Out Terminals</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-8 text-center">Click any node on the graph to inspect forensic parameters.</p>
          )}
        </div>
      </div>
    </div>
  );
};

