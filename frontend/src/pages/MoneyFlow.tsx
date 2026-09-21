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
  Sparkles,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Maximize,
  Minimize,
  User,
  CreditCard,
  Wallet,
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Clock,
  Zap,
  Activity,
  ChevronRight,
  Sliders
} from 'lucide-react';
import { api } from '../services/api';
import { MoneyFlowGraph, GraphNode, AccountRiskScore, GraphLink } from '../types';
import { RiskBadge } from '../components/RiskBadge';

export const MoneyFlow: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const graphRef = useRef<any>(null);

  // Default to NX-00012 (Kavita Mohan) or query param
  const initialAccountId = searchParams.get('account_id') || '12';
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

  // Canvas dimensions
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ width: 0, height: 500 });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // =========================================================================
  // ⏳ TIME-SCRUBBER / "MONEY FLOW REPLAY" MODE STATE
  // =========================================================================
  const MAX_TIMELINE_MINUTES = 150; // 00:00 to 02:30 hours
  const [replayEnabled, setReplayEnabled] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [timelineMinute, setTimelineMinute] = useState<number>(150); // Start at full view, easy to hit replay
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 0.5x, 1x, 2x, 5x

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

  // =========================================================================
  // 60 FPS SMOOTH PLAYBACK LOOP VIA requestAnimationFrame
  // =========================================================================
  useEffect(() => {
    let animationFrameId: number;
    let lastTimestamp: number = performance.now();

    const renderLoop = (now: number) => {
      const deltaSeconds = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      if (isPlaying) {
        setTimelineMinute((prev) => {
          // At 1x speed: 150 minutes replays over 50 seconds (3 min/sec)
          const increment = deltaSeconds * 3.0 * playbackSpeed;
          const next = prev + increment;
          if (next >= MAX_TIMELINE_MINUTES) {
            setIsPlaying(false);
            return MAX_TIMELINE_MINUTES;
          }
          return next;
        });
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, playbackSpeed, MAX_TIMELINE_MINUTES]);

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

  // Replay Control Handlers
  const handlePlayPause = () => {
    if (timelineMinute >= MAX_TIMELINE_MINUTES) {
      setTimelineMinute(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleResetReplay = () => {
    setTimelineMinute(0);
    setIsPlaying(true);
  };

  const handleStepBack = () => {
    setIsPlaying(false);
    setTimelineMinute((prev) => Math.max(0, prev - 10));
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    setTimelineMinute((prev) => Math.min(MAX_TIMELINE_MINUTES, prev + 10));
  };

  const handleSeekStage = (targetMinute: number) => {
    setIsPlaying(false);
    setTimelineMinute(targetMinute);
  };

  // Format Helper: 00:00 to 02:30
  const formatTimeOffset = (mins: number) => {
    const clamped = Math.max(0, Math.min(MAX_TIMELINE_MINUTES, mins));
    const h = Math.floor(clamped / 60);
    const m = Math.floor(clamped % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // Format Clock: Base time 10:00 AM + offset
  const formatClockTime = (mins: number) => {
    const totalMinutes = 10 * 60 + mins;
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = Math.floor(totalMinutes % 60);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${displayH}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  // Detect Current Forensic Stage
  const getCurrentStage = (mins: number) => {
    if (mins < 28) {
      return {
        stage: 1,
        title: 'Stage 1: Victim Compromise & Fraud Inflow',
        color: 'text-amber-700',
        badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
        range: 'T + 00:00 - 00:25'
      };
    }
    if (mins < 75) {
      return {
        stage: 2,
        title: 'Stage 2: Layer 1 Primary Mule Concentration',
        color: 'text-rose-700',
        badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
        range: 'T + 00:25 - 01:10'
      };
    }
    if (mins < 115) {
      return {
        stage: 3,
        title: 'Stage 3: Layer 2 Smurfing Fan-Out Split',
        color: 'text-purple-700',
        badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
        range: 'T + 01:10 - 01:50'
      };
    }
    return {
      stage: 4,
      title: 'Stage 4: ATM Cash-out & Liquidation',
      color: 'text-emerald-700',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      range: 'T + 01:50 - 02:30'
    };
  };

  // Filtered dataset based on standard filters
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

  // Compute live cumulative volume and active events for HUD
  const cumulativeRoutedVolume = React.useMemo(() => {
    if (!filteredData.links) return 0;
    return filteredData.links
      .filter((l) => (l.time_offset_minutes ?? 0) <= timelineMinute)
      .reduce((sum, l) => sum + l.amount, 0);
  }, [filteredData.links, timelineMinute]);

  const totalPossibleVolume = React.useMemo(() => {
    if (!filteredData.links) return 1;
    return filteredData.links.reduce((sum, l) => sum + l.amount, 0) || 1;
  }, [filteredData.links]);

  const currentActiveEvent = React.useMemo(() => {
    if (!filteredData.links) return null;
    // Find link occurring closest to current timeline minute (within past 15 mins)
    const activeLinks = filteredData.links
      .filter((l) => (l.time_offset_minutes ?? 0) <= timelineMinute)
      .sort((a, b) => (b.time_offset_minutes ?? 0) - (a.time_offset_minutes ?? 0));

    return activeLinks[0] || null;
  }, [filteredData.links, timelineMinute]);

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

  // =========================================================================
  // DYNAMIC NODE DRAWING WITH HALO PULSE ON RECEIVING FUNDS
  // =========================================================================
  const drawNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const isTarget = node.id === selectedAccountId;
      const isHovered = hoveredNode?.id === node.id;
      const isSelected = selectedNodeDetails?.id === node.id;

      // Check if node has been reached on the timeline
      const isActivated =
        !replayEnabled ||
        isTarget ||
        filteredData.links.some(
          (l) =>
            (l.time_offset_minutes ?? 0) <= timelineMinute &&
            (String(typeof l.source === 'object' ? (l.source as any).id : l.source) === node.id ||
              String(typeof l.target === 'object' ? (l.target as any).id : l.target) === node.id)
        );

      // Check if node is actively receiving money right at this moment (within last 12 minutes)
      const isActivelyReceiving =
        replayEnabled &&
        filteredData.links.some(
          (l) =>
            (l.time_offset_minutes ?? 0) <= timelineMinute &&
            (l.time_offset_minutes ?? 0) >= timelineMinute - 12 &&
            String(typeof l.target === 'object' ? (l.target as any).id : l.target) === node.id
        );

      const baseRadius = isTarget ? 11 : 8.5;
      const radius = isHovered || isSelected ? baseRadius * 1.25 : baseRadius;
      const color = isActivated ? getNodeColor(node) : '#94A3B8';

      // Animated Glowing Ripple Shockwave on Receiving Funds
      if (isActivelyReceiving) {
        const pulseRatio = (Date.now() % 1000) / 1000;
        const shockRadius = radius + 6 + pulseRatio * 12;
        ctx.beginPath();
        ctx.arc(node.x, node.y, shockRadius, 0, 2 * Math.PI, false);
        ctx.strokeStyle = `rgba(245, 158, 11, ${1 - pulseRatio})`;
        ctx.lineWidth = 2.5 / globalScale;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 4, 0, 2 * Math.PI, false);
        ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
        ctx.fill();
      } else if (isTarget || (node.risk_score >= 85 && isActivated)) {
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
      ctx.strokeStyle = isActivated ? '#FFFFFF' : '#E2E8F0';
      ctx.stroke();

      // Node Icon / Score Badge
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

      // Label Pill
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
      ctx.fillStyle = isTarget ? '#F4F0FF' : isActivated ? '#FFFFFF' : 'rgba(241, 245, 249, 0.8)';
      ctx.fill();
      ctx.lineWidth = 1 / globalScale;
      ctx.strokeStyle = isTarget ? '#7E43F4' : isActivated ? '#E2E8F0' : '#CBD5E1';
      ctx.stroke();

      ctx.fillStyle = isTarget ? '#5A1ACD' : isActivated ? '#1E293B' : '#94A3B8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(displayStr, node.x, pillY + pillHeight / 2);
    },
    [selectedAccountId, selectedNodeDetails, hoveredNode, getNodeColor, replayEnabled, timelineMinute, filteredData.links]
  );

  // =========================================================================
  // DYNAMIC LINK DRAWING WITH TIME ILLUMINATION & TRANSLUCENT FUTURE EDGES
  // =========================================================================
  const drawLink = useCallback(
    (link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const start = link.source;
      const end = link.target;
      if (!start || !end || start.x === undefined || end.x === undefined) return;

      const offset = link.time_offset_minutes ?? 0;
      const isPast = !replayEnabled || offset <= timelineMinute;
      const isCurrentlyTransmitting = replayEnabled && offset <= timelineMinute && offset >= timelineMinute - 14;
      const isHighValue = link.amount >= 100000;
      const isConnectedToTarget = start.id === selectedAccountId || end.id === selectedAccountId;

      // Future Link: subtle translucent dashed track
      if (!isPast) {
        ctx.beginPath();
        ctx.setLineDash([4 / globalScale, 4 / globalScale]);
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.lineWidth = 1 / globalScale;
        ctx.strokeStyle = 'rgba(203, 213, 225, 0.28)';
        ctx.stroke();
        ctx.setLineDash([]);
        return;
      }

      // Active / Settled Link
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);

      if (isCurrentlyTransmitting) {
        // Glowing gold/crimson active money transfer corridor
        ctx.lineWidth = Math.max(3.6 / globalScale, 2.4);
        ctx.strokeStyle = '#F59E0B';
      } else {
        ctx.lineWidth = Math.min(Math.max((link.amount || 20000) / 40000, 1.2), 3.2) / globalScale;
        ctx.strokeStyle = isHighValue ? '#F87171' : isConnectedToTarget ? '#93C5FD' : '#CBD5E1';
      }
      ctx.stroke();

      // Amount Badge
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

        ctx.fillStyle = isCurrentlyTransmitting ? '#FEF3C7' : '#FFFFFF';
        ctx.fill();
        ctx.lineWidth = 0.7 / globalScale;
        ctx.strokeStyle = isCurrentlyTransmitting ? '#F59E0B' : isHighValue ? '#FCA5A5' : '#E2E8F0';
        ctx.stroke();

        ctx.fillStyle = isCurrentlyTransmitting ? '#B45309' : isHighValue ? '#B91C1C' : '#64748B';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(amtStr, midX, midY);
      }
    },
    [selectedAccountId, showLinkAmounts, replayEnabled, timelineMinute]
  );

  const rootAccount = graphData?.nodes.find((n) => n.id === selectedAccountId);
  const currentStageInfo = getCurrentStage(timelineMinute);

  return (
    <div className="space-y-5 pb-12">
      {/* 1. Top Header: Title, Live Telemetry, Account Switcher */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight whitespace-nowrap">
              Money Flow Intelligence
            </h2>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#5B4DF6]/10 text-[#5B4DF6] border border-[#5B4DF6]/20 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5" />
              NetworkX Forensic Replay Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
            Sequential timeline simulation mapping stolen fund hops from Victim Origin → Layer 1 Mule → Smurfing Nodes → ATM Cash-outs.
          </p>
        </div>

        {/* Account Selector */}
        <div className="flex items-center gap-2.5 bg-white px-3.5 py-2 rounded-2xl border border-slate-200 shadow-sm shrink-0 self-start xl:self-center">
          <label className="text-xs font-bold text-slate-500 whitespace-nowrap">Investigating Account:</label>
          <select
            value={selectedAccountId}
            onChange={(e) => handleAccountChange(e.target.value)}
            className="bg-transparent text-xs font-extrabold text-slate-800 focus:outline-none cursor-pointer pr-1"
          >
            {allAccounts.map((acc) => (
              <option key={acc.account_id} value={acc.account_id}>
                {acc.account_number} — {acc.name} (Risk: {acc.risk_score})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Target Identity */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-indigo-700 flex items-center justify-center font-black text-sm shadow-2xs flex-shrink-0">
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
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3.5">
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
              Credits from Victim / Feeder Accounts
            </div>
          </div>
        </div>

        {/* Card 3: Total Outflow */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3.5">
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
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <GitFork className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
              Network Corridor Scope
            </span>
            <div className="text-base font-extrabold text-slate-900 truncate mt-0.5">
              {filteredData.nodes.length} Active Nodes
            </div>
            <div className="text-xs font-semibold text-indigo-700 truncate">
              {filteredData.links.length} Clean Directed Corridors
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Area: Graph Canvas with Docked Replay Console (Left) + Inspector Card (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Force Graph Canvas Card */}
        <div
          className={
            isFullscreen
              ? 'fixed inset-0 z-50 bg-white p-6 w-screen h-screen flex flex-col justify-between overflow-hidden shadow-2xl animate-in fade-in duration-200'
              : 'lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 relative flex flex-col justify-between overflow-hidden'
          }
        >
          {/* Top Floating Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-2 border-b border-slate-100 z-10">
            {/* Legend Chips */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-100">
                <span className="w-2 h-2 rounded-full bg-brand-600"></span>
                <span>Target Node</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-100">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span>Mule / Critical</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-100">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>Smurfing</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-100">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span>Standard</span>
              </div>
            </div>

            {/* Quick Controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowLinkAmounts(!showLinkAmounts)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-colors ${
                  showLinkAmounts
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
                title="Toggle transfer amount badges"
              >
                ₹ Amounts
              </button>

              <button
                onClick={() => setShowOnlySuspicious(!showOnlySuspicious)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-colors ${
                  showOnlySuspicious
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
                className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleResetZoom}
                className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors"
                title="Recenter Graph"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>

              {/* Full Screen Toggle Button */}
              <button
                onClick={handleToggleFullscreen}
                className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shadow-2xs ${
                  isFullscreen
                    ? 'bg-[#5B4DF6] text-white border-[#5B4DF6] hover:bg-indigo-700'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
                title={isFullscreen ? 'Exit Full Screen (Esc)' : 'Enter Full Screen'}
              >
                {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
                <span>{isFullscreen ? 'Exit' : 'Full Screen'}</span>
              </button>
            </div>
          </div>

          {/* Graph Canvas */}
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-24">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
              <p className="text-xs font-bold text-slate-700">Structuring Clean Financial Network...</p>
            </div>
          ) : filteredData.nodes.length > 0 ? (
            <div
              ref={canvasContainerRef}
              className={`w-full rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing bg-gradient-to-b from-slate-50/40 via-white to-slate-50/60 relative ${
                isFullscreen ? 'flex-1 my-2 min-h-[calc(100vh-280px)]' : 'h-[440px]'
              }`}
            >
              <ForceGraph2D
                ref={graphRef}
                width={canvasSize.width > 0 ? canvasSize.width : undefined}
                height={canvasSize.height > 0 ? canvasSize.height : isFullscreen ? window.innerHeight - 280 : 440}
                graphData={filteredData}
                nodeCanvasObject={drawNode}
                linkCanvasObject={drawLink}
                nodePointerAreaPaint={(node: any, color, ctx) => {
                  ctx.fillStyle = color;
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, 14, 0, 2 * Math.PI, false);
                  ctx.fill();
                }}
                linkDirectionalArrowLength={5.5}
                linkDirectionalArrowRelPos={0.92}
                // Dynamic Particle Hop Animation based on Time-Scrubber
                linkDirectionalParticles={(link: any) => {
                  if (!replayEnabled) return 2;
                  const offset = link.time_offset_minutes ?? 0;
                  if (offset > timelineMinute) return 0; // Future: no particles
                  if (offset <= timelineMinute && offset >= timelineMinute - 14) return 6; // Active Hop: Burst of 6 fast glowing particles!
                  return 1; // Settled: 1 subtle trailing particle
                }}
                linkDirectionalParticleSpeed={(link: any) => {
                  const offset = link.time_offset_minutes ?? 0;
                  if (offset <= timelineMinute && offset >= timelineMinute - 14) {
                    return 0.016 * Math.max(1, playbackSpeed * 0.8);
                  }
                  return 0.004;
                }}
                linkDirectionalParticleWidth={(link: any) => {
                  const offset = link.time_offset_minutes ?? 0;
                  if (offset <= timelineMinute && offset >= timelineMinute - 14) return 3.8;
                  return 1.8;
                }}
                linkDirectionalParticleColor={(link: any) => {
                  const offset = link.time_offset_minutes ?? 0;
                  if (offset <= timelineMinute && offset >= timelineMinute - 14) {
                    return '#F59E0B'; // Glowing amber/gold for active money transfer
                  }
                  return '#8B5CF6'; // Subtle purple for settled trail
                }}
                cooldownTicks={100}
                warmupTicks={60}
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

          {/* ========================================================================= */}
          {/* ⏳ TIME-SCRUBBER & "MONEY FLOW REPLAY" DOCKED FORENSIC CONTROLLER (DASHBOARD PALETTE) */}
          {/* ========================================================================= */}
          <div className="mt-3 p-4 rounded-2xl bg-[#F8F9FE] border border-slate-200/90 shadow-sm space-y-3 relative overflow-hidden">
            
            {/* Top HUD Row: Stage Pill, Stolen Volume Counter, Clock */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 relative z-10">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Active Stage Indicator Badge matching Dashboard pills */}
                <div className={`px-3 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 shadow-2xs ${currentStageInfo.badgeBg}`}>
                  <span className="flex h-2 w-2 relative">
                    {isPlaying && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    )}
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                  </span>
                  <span>{currentStageInfo.title}</span>
                </div>

                <span className="text-[11px] text-slate-500 font-mono font-medium">
                  ({currentStageInfo.range})
                </span>
              </div>

              {/* Volume & Clock Stats matching Dashboard card styles */}
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Traversed Volume</span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    ₹{cumulativeRoutedVolume.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-xs font-bold text-rose-600 ml-1">
                    ({Math.round((cumulativeRoutedVolume / totalPossibleVolume) * 100)}%)
                  </span>
                </div>

                <div className="h-6 w-px bg-slate-200 hidden sm:block" />

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Simulated Timestamp</span>
                  <span className="font-extrabold text-[#5B4DF6] font-mono text-sm">
                    {formatClockTime(timelineMinute)} (T+{formatTimeOffset(timelineMinute)})
                  </span>
                </div>
              </div>
            </div>

            {/* Middle Controls & Scrubbing Slider Row */}
            <div className="flex items-center gap-3 relative z-10">
              {/* Play / Pause Button - Crimson matching Dashboard Action buttons */}
              <button
                onClick={handlePlayPause}
                className="w-10 h-10 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white flex items-center justify-center shadow-md shadow-rose-600/30 transition-all flex-shrink-0 cursor-pointer"
                title={isPlaying ? 'Pause Timeline' : 'Play Money Flow Replay'}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>

              {/* Step Back / Step Forward Buttons */}
              <button
                onClick={handleStepBack}
                className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs"
                title="Step Back -10 mins"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleStepForward}
                className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs"
                title="Step Forward +10 mins"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>

              {/* Timeline Slider Track */}
              <div className="flex-1 relative flex flex-col justify-center">
                <input
                  type="range"
                  min={0}
                  max={MAX_TIMELINE_MINUTES}
                  step={0.5}
                  value={timelineMinute}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setTimelineMinute(parseFloat(e.target.value));
                  }}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#E11D48] bg-slate-200"
                  style={{
                    background: `linear-gradient(to right, #5B4DF6 0%, #8B5CF6 ${
                      (timelineMinute / MAX_TIMELINE_MINUTES) * 100
                    }%, #E2E8F0 ${(timelineMinute / MAX_TIMELINE_MINUTES) * 100}%, #E2E8F0 100%)`
                  }}
                />

                {/* Timeline Tick Labels */}
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1 px-0.5 font-medium">
                  <span>00:00 (Start)</span>
                  <span>00:30</span>
                  <span>01:00</span>
                  <span>01:30</span>
                  <span>02:00</span>
                  <span>02:30 (Max)</span>
                </div>
              </div>

              {/* Reset / Replay Button */}
              <button
                onClick={handleResetReplay}
                className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs"
                title="Restart Replay from 00:00"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* Playback Speed Multipliers */}
              <div className="hidden sm:flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl border border-slate-200">
                {[0.5, 1, 2, 5].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setPlaybackSpeed(speed)}
                    className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                      playbackSpeed === speed
                        ? 'bg-[#5B4DF6] text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Row: Quick Stage Jump Pills & Forensic Event Ticker */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2.5 border-t border-slate-200/80 relative z-10 text-xs">
              {/* Stage Jump Buttons matching Dashboard Filter Button styling */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Seek Stage:</span>
                <button
                  onClick={() => handleSeekStage(15)}
                  className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 hover:border-amber-300 hover:bg-amber-50 text-slate-700 hover:text-amber-800 text-[11px] font-bold shadow-2xs transition-all"
                >
                  1. Victim Inflow
                </button>
                <button
                  onClick={() => handleSeekStage(45)}
                  className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-700 hover:text-rose-800 text-[11px] font-bold shadow-2xs transition-all"
                >
                  2. Layer 1 Mule
                </button>
                <button
                  onClick={() => handleSeekStage(95)}
                  className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50 text-slate-700 hover:text-purple-800 text-[11px] font-bold shadow-2xs transition-all"
                >
                  3. Smurfing Split
                </button>
                <button
                  onClick={() => handleSeekStage(135)}
                  className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 text-[11px] font-bold shadow-2xs transition-all"
                >
                  4. ATM Cash-out
                </button>
              </div>

              {/* Live Forensic Event Ticker */}
              <div className="flex items-center gap-2 min-w-0 bg-white border border-slate-200/90 rounded-xl px-3 py-1.5 shadow-2xs text-xs">
                <Zap className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <span className="truncate font-semibold text-slate-800 text-[11px]">
                  {currentActiveEvent?.narration || 'Awaiting initial unauthorized transaction trigger...'}
                </span>
              </div>
            </div>
          </div>


          {/* Footer Guidance */}
          <div className="text-[11px] text-slate-400 font-medium pt-3 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-2 mt-2">
            <span>Click any node to inspect account parameters. Drag nodes to customize topological positioning.</span>
            <span className="font-semibold text-slate-500">
              Showing {filteredData.nodes.length} Accounts & {filteredData.links.length} Clean Directed Corridors
            </span>
          </div>
        </div>

        {/* Right Side: Node Forensic Inspector Card */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          {/* Card Top Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                Node Forensic Inspector
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Key forensic intelligence about this account node.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{selectedNodeDetails?.id === selectedAccountId ? 'Primary Target' : 'Monitored Node'}</span>
            </div>
          </div>

          {selectedNodeDetails ? (
            <div className="space-y-3.5">
              {/* 1. Account Number & Holder */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 shadow-2xs flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-purple-50 text-indigo-700 flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
                    Account Identifier
                  </span>
                  <div className="text-base font-extrabold text-slate-900 truncate mt-0.5 font-mono">
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

              {/* 2. Calculated Risk Card */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 shadow-2xs flex items-center justify-between gap-3">
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
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 shadow-2xs flex items-center gap-3.5">
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
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 shadow-2xs flex items-center gap-3.5">
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
                    Available Balance
                  </div>
                </div>
              </div>

              {/* 5. Network Corridor Metrics Card */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 shadow-2xs flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                  <GitFork className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
                    Network Corridor Metrics
                  </span>
                  <div className="text-base font-extrabold text-slate-900 truncate mt-0.5">
                    {filteredData.nodes.length} Active Nodes
                  </div>
                  <div className="text-xs font-semibold text-purple-700 truncate">
                    {filteredData.links.length} Flow Corridors (2-Hop Depth)
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2.5">
                {selectedNodeDetails.id !== selectedAccountId && (
                  <button
                    onClick={() => handleAccountChange(selectedNodeDetails.id)}
                    className="w-full py-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-2xs"
                  >
                    <GitFork className="w-4 h-4" />
                    <span>Focus Graph on {selectedNodeDetails.label}</span>
                  </button>
                )}

                <button
                  onClick={() => navigate(`/geo?account_id=${selectedNodeDetails.id}`)}
                  className="w-full py-3 rounded-2xl bg-[#5B4DF6] hover:bg-indigo-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 cursor-pointer"
                >
                  <MapPin className="w-4 h-4" />
                  <span>Trace Predicted Cash-Out Terminals</span>
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

export default MoneyFlow;
