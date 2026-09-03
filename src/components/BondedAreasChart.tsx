import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
  PieChart,
  Pie,
  LabelList
} from 'recharts';
import {
  Building2,
  Anchor,
  Layers,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Info,
  ArrowUpRight,
  Maximize2,
  PieChart as PieIcon,
  BarChart3,
  Sliders,
  Sparkles,
  Ship,
  Zap,
  Clock,
  Calendar,
  RotateCcw,
  Activity,
  Gauge,
  Check,
  Flame,
  ArrowRight
} from 'lucide-react';
import { Yard, Vessel } from '../types';

export interface BondedAreasChartProps {
  theme: string;
  language: string;
  yards: Record<string, Yard>;
  containers?: any[];
  vessels?: Vessel[];
  compact?: boolean;
}

export interface BondedYardData {
  id: string;
  key: string;
  name: string;
  cheio: number;
  capacity: number;
  occupancyPct: number;
  freeSlots: number;
  porto: number;
  prontoColeta: number;
  delivered: number;
  statusColor: string;
  statusLabel: string;
  vesselsConnected: string[];
  rampupAvg: number;
  weeklyDrain: number;
  daysToDrain: number;
  weeksToDrain: number;
  estimatedClearanceDate: string;
}

// Default Ramp-up Averages per Bonded Area as specified:
// TECON: 100 AVG
// TPC: 62 AVG
// INTERMARITIMA: 59 AVG
// CLIA: 10 AVG
export const DEFAULT_BONDED_RAMPUP: Record<string, number> = {
  tecon: 100,
  tpc: 62,
  intermaritima: 59,
  clia: 10,
};

// Distinctive palette for bonded areas
const BONDED_COLORS = [
  '#3B82F6', // Blue (TECON)
  '#F97316', // Orange (INTERMARITIMA)
  '#10B981', // Emerald (TPC)
  '#8B5CF6', // Purple (CLIA)
  '#06B6D4', // Cyan
  '#EC4899', // Pink
  '#F59E0B', // Amber
];

// Helper to normalize yard identifier to canonical key
export const getTerminalRampupKey = (id: string, name: string): string => {
  const norm = `${id} ${name}`.toLowerCase();
  if (norm.includes('tecon')) return 'tecon';
  if (norm.includes('tpc')) return 'tpc';
  if (norm.includes('intermar') || norm.includes('inter')) return 'intermaritima';
  if (norm.includes('clia') || norm.includes('emporio')) return 'clia';
  return id.toLowerCase();
};

// Add working days helper (skips Sundays, and Saturdays if 5-day week)
const addWorkingDays = (startDate: Date, workingDays: number, includeSaturday: boolean): Date => {
  const date = new Date(startDate.getTime());
  let added = 0;
  const targetDays = Math.ceil(workingDays);
  while (added < targetDays) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay(); // 0 = Sun, 6 = Sat
    if (day === 0) continue; // always skip Sunday
    if (!includeSaturday && day === 6) continue; // skip Saturday if 5 days
    added++;
  }
  return date;
};

const formatDateBr = (d: Date): string => {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

export const BondedAreasChart: React.FC<BondedAreasChartProps> = ({
  theme,
  language,
  yards,
  containers = [],
  vessels = [],
  compact = false
}) => {
  // Mode switcher: now includes 'rampup' as a primary view
  const [chartMode, setChartMode] = useState<'rampup' | 'bars' | 'composition' | 'donut'>('rampup');
  const [sortMode, setSortMode] = useState<'volume' | 'occupancy' | 'default'>('default');
  const [showNumbers, setShowNumbers] = useState<boolean>(true);
  const [selectedTerminal, setSelectedTerminal] = useState<string | null>(null);

  // Ramp-up specific settings
  const [rampupRates, setRampupRates] = useState<Record<string, number>>(() => ({ ...DEFAULT_BONDED_RAMPUP }));
  const [workingDaysPerWeek, setWorkingDaysPerWeek] = useState<5 | 6>(5);
  const [rampupGranularity, setRampupGranularity] = useState<'weeks' | 'days'>('weeks');
  const [rampupChartType, setRampupChartType] = useState<'area' | 'lines' | 'rates'>('area');
  const [includeVesselInflow, setIncludeVesselInflow] = useState<boolean>(false);
  const [showRateEditor, setShowRateEditor] = useState<boolean>(false);

  // Localization helper
  const dt = (pt: string, zh: string, en: string) => {
    if (language === 'zh') return zh;
    if (language === 'en') return en;
    if (language === 'bilingual') return `${pt} / ${zh}`;
    return pt;
  };

  // Base simulation date: 24/08/2026 (W35 Monday)
  const baseSimDate = useMemo(() => new Date(2026, 7, 24, 12, 0, 0), []);

  // Update a single terminal rampup rate
  const handleRateChange = (key: string, val: number) => {
    setRampupRates(prev => ({
      ...prev,
      [key]: Math.max(0, val)
    }));
  };

  // Reset to default averages (TECON: 100, TPC: 62, INTERMARITIMA: 59, CLIA: 10)
  const handleResetRates = () => {
    setRampupRates({ ...DEFAULT_BONDED_RAMPUP });
  };

  // Extract and compute data for all Bonded yards
  const bondedData: BondedYardData[] = useMemo(() => {
    const entries = (Object.entries(yards || {}) as [string, Yard][]).filter(
      ([_, y]) => y && y.type === 'BONDED'
    );

    const items: BondedYardData[] = entries.map(([id, y]) => {
      const key = getTerminalRampupKey(id, y.name || id);
      const capacity = y.capacity || 0;
      const cheio = y.cheio || 0;
      const occupancyPct = capacity > 0 ? Math.round((cheio / capacity) * 100) : 0;
      const freeSlots = Math.max(0, capacity - cheio);

      // Status assessment
      let statusColor = '#10B981'; // green
      let statusLabel = dt('Normal', '正常', 'Normal');
      if (occupancyPct >= 85) {
        statusColor = '#EF4444'; // red
        statusLabel = dt('Crítico (>85%)', '严重 (>85%)', 'Critical (>85%)');
      } else if (occupancyPct >= 70) {
        statusColor = '#F59E0B'; // amber
        statusLabel = dt('Atenção (70-85%)', '预警 (70-85%)', 'Warning (70-85%)');
      }

      // Find vessels mapped or discharging into this terminal
      const normId = id.toLowerCase();
      const normName = (y.name || '').toLowerCase();
      
      const directVessels = vessels
        .filter(v => v.terminal && (v.terminal.toLowerCase().includes(normId) || v.terminal.toLowerCase().includes(normName)))
        .map(v => v.name);

      // Also find containers associated with this yard
      const containerVessels = Array.from(
        new Set(
          containers
            .filter(c => c.yardId && (c.yardId.toLowerCase() === normId || c.yardId.toLowerCase() === normName))
            .map(c => c.vesselName)
            .filter(Boolean)
        )
      ) as string[];

      const combinedVessels = Array.from(new Set([...directVessels, ...containerVessels]));

      // Rampup calculations
      const rampupAvg = rampupRates[key] ?? 0;
      const weeklyDrain = rampupAvg * workingDaysPerWeek;
      const daysToDrain = rampupAvg > 0 ? (cheio / rampupAvg) : 0;
      const weeksToDrain = weeklyDrain > 0 ? (cheio / weeklyDrain) : 0;
      const clearanceDateObj = addWorkingDays(baseSimDate, daysToDrain, workingDaysPerWeek === 6);
      const estimatedClearanceDate = formatDateBr(clearanceDateObj);

      return {
        id,
        key,
        name: y.name || id.toUpperCase(),
        cheio,
        capacity,
        occupancyPct,
        freeSlots,
        porto: y.porto || 0,
        prontoColeta: y.prontoColeta || 0,
        delivered: y.delivered || 0,
        statusColor,
        statusLabel,
        vesselsConnected: combinedVessels,
        rampupAvg,
        weeklyDrain,
        daysToDrain,
        weeksToDrain,
        estimatedClearanceDate
      };
    });

    // Sorting
    if (sortMode === 'volume') {
      return [...items].sort((a, b) => b.cheio - a.cheio);
    }
    if (sortMode === 'occupancy') {
      return [...items].sort((a, b) => b.occupancyPct - a.occupancyPct);
    }
    return items;
  }, [yards, vessels, containers, sortMode, language, rampupRates, workingDaysPerWeek, baseSimDate]);

  // Aggregate stats across all bonded areas
  const totalBondedCheio = useMemo(() => bondedData.reduce((acc, y) => acc + y.cheio, 0), [bondedData]);
  const totalBondedCapacity = useMemo(() => bondedData.reduce((acc, y) => acc + y.capacity, 0), [bondedData]);
  const globalOccupancyPct = totalBondedCapacity > 0 ? Math.round((totalBondedCheio / totalBondedCapacity) * 100) : 0;
  const totalFreeSlots = Math.max(0, totalBondedCapacity - totalBondedCheio);
  const totalInPort = useMemo(() => bondedData.reduce((acc, y) => acc + y.porto, 0), [bondedData]);
  const totalProntoColeta = useMemo(() => bondedData.reduce((acc, y) => acc + y.prontoColeta, 0), [bondedData]);

  // Total Ramp-up calculations
  const totalBondedRampupAvg = useMemo(() => {
    return bondedData.reduce((acc, y) => acc + y.rampupAvg, 0);
  }, [bondedData]);

  const totalBondedWeeklyDrain = totalBondedRampupAvg * workingDaysPerWeek;
  const totalBondedDaysToDrain = totalBondedRampupAvg > 0 ? (totalBondedCheio / totalBondedRampupAvg) : 0;
  const totalBondedWeeksToDrain = totalBondedWeeklyDrain > 0 ? (totalBondedCheio / totalBondedWeeklyDrain) : 0;
  const totalClearanceDateObj = addWorkingDays(baseSimDate, totalBondedDaysToDrain, workingDaysPerWeek === 6);
  const totalEstimatedClearanceDate = formatDateBr(totalClearanceDateObj);

  // Helper map for terminal lookup
  const yardByKey = useMemo(() => {
    const map: Record<string, BondedYardData> = {};
    bondedData.forEach(item => {
      map[item.key] = item;
    });
    return map;
  }, [bondedData]);

  // Ramp-up Timeline Simulation Engine (Weekly and Daily)
  const rampupTimeline = useMemo(() => {
    // Initial stocks
    const initialTecon = yardByKey['tecon']?.cheio || 0;
    const initialTpc = yardByKey['tpc']?.cheio || 0;
    const initialInter = yardByKey['intermaritima']?.cheio || 0;
    const initialClia = yardByKey['clia']?.cheio || 0;

    // Rates
    const rateTecon = rampupRates['tecon'] || 100;
    const rateTpc = rampupRates['tpc'] || 62;
    const rateInter = rampupRates['intermaritima'] || 59;
    const rateClia = rampupRates['clia'] || 10;

    if (rampupGranularity === 'weeks') {
      const weeklyTecon = rateTecon * workingDaysPerWeek;
      const weeklyTpc = rateTpc * workingDaysPerWeek;
      const weeklyInter = rateInter * workingDaysPerWeek;
      const weeklyClia = rateClia * workingDaysPerWeek;

      let balTecon = initialTecon;
      let balTpc = initialTpc;
      let balInter = initialInter;
      let balClia = initialClia;

      const points: any[] = [];
      const baseWeekNumber = 35; // W35 2026

      for (let w = 0; w <= 8; w++) {
        const weekLabel = `W${baseWeekNumber + w}`;
        const totalBal = balTecon + balTpc + balInter + balClia;

        points.push({
          period: weekLabel,
          weekNum: baseWeekNumber + w,
          TECON: Math.round(balTecon),
          TPC: Math.round(balTpc),
          INTERMARITIMA: Math.round(balInter),
          CLIA: Math.round(balClia),
          TOTAL: Math.round(totalBal),
          drainedThisPeriod: w === 0 ? 0 : Math.min(totalBondedWeeklyDrain, points[w - 1]?.TOTAL || 0),
          cumulativeDrained: Math.max(0, totalBondedCheio - totalBal)
        });

        // Drain for next week
        balTecon = Math.max(0, balTecon - weeklyTecon);
        balTpc = Math.max(0, balTpc - weeklyTpc);
        balInter = Math.max(0, balInter - weeklyInter);
        balClia = Math.max(0, balClia - weeklyClia);

        if (totalBal === 0 && w >= 4) break;
      }
      return points;
    } else {
      // Daily simulation (up to 24 working days)
      let balTecon = initialTecon;
      let balTpc = initialTpc;
      let balInter = initialInter;
      let balClia = initialClia;

      const points: any[] = [];
      const maxDays = 22;

      for (let d = 0; d <= maxDays; d++) {
        const dayLabel = d === 0 ? dt('Hoje (D0)', '今天 (D0)', 'Today (D0)') : `D+${d}`;
        const totalBal = balTecon + balTpc + balInter + balClia;

        points.push({
          period: dayLabel,
          dayIndex: d,
          TECON: Math.round(balTecon),
          TPC: Math.round(balTpc),
          INTERMARITIMA: Math.round(balInter),
          CLIA: Math.round(balClia),
          TOTAL: Math.round(totalBal),
          cumulativeDrained: Math.max(0, totalBondedCheio - totalBal)
        });

        // Drain for next day
        balTecon = Math.max(0, balTecon - rateTecon);
        balTpc = Math.max(0, balTpc - rateTpc);
        balInter = Math.max(0, balInter - rateInter);
        balClia = Math.max(0, balClia - rateClia);

        if (totalBal === 0 && d >= 16) break;
      }
      return points;
    }
  }, [yardByKey, rampupRates, workingDaysPerWeek, rampupGranularity, totalBondedWeeklyDrain, totalBondedCheio, dt]);

  // Data for Donut Chart
  const donutData = useMemo(() => {
    return bondedData.map((d, idx) => ({
      name: d.name,
      value: d.cheio,
      pct: totalBondedCheio > 0 ? ((d.cheio / totalBondedCheio) * 100).toFixed(1) : '0',
      color: BONDED_COLORS[idx % BONDED_COLORS.length]
    }));
  }, [bondedData, totalBondedCheio]);

  // Custom bar tooltip
  const CustomBarTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data: BondedYardData = payload[0].payload;
    return (
      <div className={`p-3 rounded-xl shadow-xl border text-xs min-w-[240px] ${
        theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-200 dark:border-slate-800 mb-2">
          <div className="flex items-center gap-1.5 font-black text-sm">
            <Anchor className="w-4 h-4 text-blue-500" />
            <span>{data.name}</span>
          </div>
          <span
            className="text-[10px] font-black px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: `${data.statusColor}20`,
              color: data.statusColor
            }}
          >
            {data.occupancyPct}%
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-gray-500 dark:text-gray-400 font-medium">
              {dt('Contêineres em Pátio (Cheio):', '在场重箱 (已存):', 'Containers Stored (Full):')}
            </span>
            <span className="font-mono font-black text-blue-600 dark:text-blue-400">
              {data.cheio.toLocaleString()} CNTRs
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-500 dark:text-gray-400 font-medium">
              {dt('Capacidade Máxima:', '额定总容量:', 'Max Capacity:')}
            </span>
            <span className="font-mono font-bold text-gray-700 dark:text-gray-300">
              {data.capacity.toLocaleString()} CNTRs
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-500 dark:text-gray-400 font-medium">
              {dt('Vagas Livres (Folga):', '可用空余堆位:', 'Free Slots:')}
            </span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {data.freeSlots.toLocaleString()} CNTRs
            </span>
          </div>

          {/* Rampup highlight in tooltip */}
          <div className="flex justify-between items-center pt-1.5 border-t border-gray-100 dark:border-slate-800 bg-amber-50/40 dark:bg-amber-950/20 p-1.5 rounded-md">
            <span className="text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1 text-[11px]">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              {dt('Ramp-up (Média Diária):', '爬坡速率 (日均):', 'Ramp-up (Daily Avg):')}
            </span>
            <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-xs">
              {data.rampupAvg} CNTRs/{dt('dia', '天', 'day')}
            </span>
          </div>

          <div className="flex justify-between items-center text-[10.5px]">
            <span className="text-gray-400 font-medium">
              {dt('Tempo Estimado p/ Esvaziar:', '预计清空周期:', 'Est. Drain Time:')}
            </span>
            <span className="font-mono font-bold text-indigo-500">
              ~{data.daysToDrain.toFixed(1)} {dt('dias úteis', '工作日', 'days')}
            </span>
          </div>

          {data.porto > 0 && (
            <div className="flex justify-between items-center pt-1 border-t border-gray-100 dark:border-slate-800">
              <span className="text-gray-400 text-[10.5px]">
                {dt('No Porto (Atracado):', '在港靠泊:', 'In Port:')}
              </span>
              <span className="font-mono font-bold text-amber-500">
                {data.porto.toLocaleString()}
              </span>
            </div>
          )}

          {data.prontoColeta > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-[10.5px]">
                {dt('Pronto p/ Coleta (Liberado):', '已放行待提:', 'Ready Pickup:')}
              </span>
              <span className="font-mono font-bold text-purple-500">
                {data.prontoColeta.toLocaleString()}
              </span>
            </div>
          )}

          {data.vesselsConnected.length > 0 && (
            <div className="mt-2 pt-1.5 border-t border-gray-100 dark:border-slate-800 text-[10px] text-gray-400">
              <span className="font-bold block text-gray-500 dark:text-gray-300 mb-0.5">
                {dt('Navios com Carga no Terminal:', '该终端关联到港船舶:', 'Vessels with Cargo:')}
              </span>
              <span className="text-blue-500 font-medium">
                {data.vesselsConnected.join(' • ')}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Custom tooltip for Ramp-up Simulation chart
  const CustomRampupTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const point = payload[0].payload;
    return (
      <div className={`p-3.5 rounded-xl shadow-xl border text-xs min-w-[270px] ${
        theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-slate-800 mb-2">
          <div className="flex items-center gap-1.5 font-black text-sm">
            <TrendingDown className="w-4 h-4 text-emerald-500" />
            <span>{dt('Projeção de Escoamento:', '出清走势预测:', 'Drain Projection:')} {label}</span>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
            {workingDaysPerWeek} {dt('dias/sem', '天/周', 'days/wk')}
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center pb-1 border-b border-gray-100 dark:border-slate-800 font-bold">
            <span className="text-indigo-600 dark:text-indigo-400 uppercase text-[10.5px]">
              {dt('Saldo Total Bonded:', '保税区总剩余箱量:', 'Total Bonded Balance:')}
            </span>
            <span className="font-mono font-black text-sm text-indigo-600 dark:text-indigo-400">
              {point.TOTAL?.toLocaleString()} CNTRs
            </span>
          </div>

          <div className="flex justify-between items-center text-[11px]">
            <span className="flex items-center gap-1.5 font-bold text-blue-500">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              TECON ({rampupRates['tecon'] || 100} AVG/dia):
            </span>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
              {point.TECON?.toLocaleString()} CNTRs
            </span>
          </div>

          <div className="flex justify-between items-center text-[11px]">
            <span className="flex items-center gap-1.5 font-bold text-emerald-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              TPC ({rampupRates['tpc'] || 62} AVG/dia):
            </span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {point.TPC?.toLocaleString()} CNTRs
            </span>
          </div>

          <div className="flex justify-between items-center text-[11px]">
            <span className="flex items-center gap-1.5 font-bold text-orange-500">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              INTERMARITIMA ({rampupRates['intermaritima'] || 59} AVG/dia):
            </span>
            <span className="font-mono font-bold text-orange-600 dark:text-orange-400">
              {point.INTERMARITIMA?.toLocaleString()} CNTRs
            </span>
          </div>

          <div className="flex justify-between items-center text-[11px]">
            <span className="flex items-center gap-1.5 font-bold text-purple-500">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              CLIA ({rampupRates['clia'] || 10} AVG/dia):
            </span>
            <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
              {point.CLIA?.toLocaleString()} CNTRs
            </span>
          </div>

          {point.cumulativeDrained !== undefined && (
            <div className="pt-2 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center text-[10px]">
              <span className="text-gray-400">{dt('Volume Já Escoado:', '累计已出清箱量:', 'Cumulative Drained:')}</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                +{point.cumulativeDrained.toLocaleString()} CNTRs
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Custom label renderer for bars
  const renderBarLabel = (props: any) => {
    if (!showNumbers) return null;
    const { x, y, width, value } = props;
    if (value === undefined || value === null || value === 0) return null;
    return (
      <text
        x={x + width / 2}
        y={y - 8}
        fill={theme === 'dark' ? '#F8FAFC' : '#0F172A'}
        textAnchor="middle"
        fontSize={11}
        fontWeight="bold"
      >
        {value.toLocaleString()}
      </text>
    );
  };

  return (
    <div
      id="bonded-areas-chart-container"
      className={`rounded-2xl border transition-all ${
        theme === 'dark'
          ? 'bg-slate-900/90 border-slate-800 text-white'
          : 'bg-white border-slate-200/90 text-slate-900 shadow-sm'
      } ${compact ? 'p-3' : 'p-4 md:p-5'}`}
    >
      {/* 1. COMPONENT HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 pb-3.5 border-b border-gray-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-xs">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-sm md:text-base tracking-tight text-gray-900 dark:text-white uppercase flex items-center gap-1.5">
                <span>{dt('DISTRIBUIÇÃO POR ÁREA ALFANDEGADA (BONDED AREAS)', '各保税堆场及码头集装箱分布图表', 'CONTAINER DISTRIBUTION BY BONDED AREA')}</span>
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <Anchor className="w-3 h-3" /> {bondedData.length} {dt('Terminais', '个保税终端', 'Terminals')}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Zap className="w-3 h-3 text-amber-500" /> {totalBondedRampupAvg} {dt('AVG/dia Total', '日均合计', 'AVG/day Total')}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {dt(
                'Volume em pátio alfandegado, limite de capacidade e curva de escoamento/ramp-up por terminal (TECON 100 • TPC 62 • INTERMARITIMA 59 • CLIA 10).',
                '实时监控各大保税区（TECON 100, TPC 62, INTERMARÍTIMA 59, CLIA 10 箱/天）在场重箱数、额定容量及出清爬坡走势。',
                'Real-time bonded yard stock, capacity limits, and terminal ramp-up drain projection (TECON 100 • TPC 62 • INTERMARITIMA 59 • CLIA 10).'
              )}
            </p>
          </div>
        </div>

        {/* Action controls / Chart toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Chart mode switcher */}
          <div className="flex items-center bg-gray-100 dark:bg-slate-800 p-0.5 rounded-lg border border-gray-200 dark:border-slate-700 text-xs">
            {/* Primary Ramp-up Mode Button */}
            <button
              type="button"
              onClick={() => setChartMode('rampup')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-black transition-all cursor-pointer ${
                chartMode === 'rampup'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm ring-1 ring-white/20'
                  : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
              }`}
              title={dt('Ramp-up & Projeção de Escoamento por Terminal', '出清爬坡走势与日均出库预测', 'Ramp-up & Drain Projection by Terminal')}
            >
              <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
              <span>{dt('Ramp-up & Escoamento', '出清爬坡预测', 'Ramp-up & Drain')}</span>
            </button>

            <button
              type="button"
              onClick={() => setChartMode('bars')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                chartMode === 'bars'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              title={dt('Barras: Estoque Atual vs Capacidade', '柱状图: 现有库存 vs 总容量', 'Bars: Stock vs Capacity')}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>{dt('Estoque vs Capacidade', '库存 vs 容量', 'Stock vs Capacity')}</span>
            </button>

            <button
              type="button"
              onClick={() => setChartMode('composition')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                chartMode === 'composition'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              title={dt('Composição: Pátio + Porto + Pronto Coleta', '复合图: 堆场 + 港口 + 放行提货', 'Composition: Yard + Port + Pickup')}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{dt('Fluxo Completo', '全流程分布', 'Full Flow')}</span>
            </button>

            <button
              type="button"
              onClick={() => setChartMode('donut')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                chartMode === 'donut'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              title={dt('Distribuição Percentual (Share %)', '占比饼图 (Share %)', 'Share % (Donut)')}
            >
              <PieIcon className="w-3.5 h-3.5" />
              <span>{dt('Participação %', '占比 %', 'Share %')}</span>
            </button>
          </div>

          {/* Sort order toggle (for bars / composition mode) */}
          {chartMode !== 'rampup' && (
            <div className="flex items-center bg-gray-100 dark:bg-slate-800 p-0.5 rounded-lg border border-gray-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setSortMode(prev => (prev === 'volume' ? 'occupancy' : prev === 'occupancy' ? 'default' : 'volume'))}
                className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-gray-700 dark:text-gray-300 hover:text-blue-600 transition-colors cursor-pointer"
                title={dt('Alternar critério de ordenação', '切换排序方式', 'Toggle sort criteria')}
              >
                <Sliders className="w-3 h-3 text-blue-500" />
                <span>
                  {sortMode === 'volume'
                    ? dt('Ordem: Maior Volume', '排序: 按数量', 'Sort: Volume')
                    : sortMode === 'occupancy'
                    ? dt('Ordem: Maior Ocupação %', '排序: 按占用率 %', 'Sort: Occupancy %')
                    : dt('Ordem: Padrão', '排序: 默认', 'Sort: Default')}
                </span>
              </button>
            </div>
          )}

          {/* Data labels toggle */}
          {chartMode !== 'rampup' && (
            <button
              type="button"
              onClick={() => setShowNumbers(!showNumbers)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                showNumbers
                  ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                  : 'bg-white dark:bg-slate-850 text-gray-400 border-gray-200 dark:border-slate-700'
              }`}
              title={dt('Exibir/Ocultar valores numéricos no gráfico', '显示/隐藏图表数值标签', 'Toggle numbers on chart')}
            >
              <span className="text-[10px] font-black px-1 py-0.2 rounded bg-purple-200/60 dark:bg-purple-900/60">123</span>
              <span>{showNumbers ? dt('Valores: ON', '数值: 开', 'Values: ON') : dt('Valores: OFF', '数值: 关', 'Values: OFF')}</span>
            </button>
          )}

          {/* Quick Rate Config Toggle */}
          <button
            type="button"
            onClick={() => setShowRateEditor(!showRateEditor)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
              showRateEditor
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                : 'bg-white dark:bg-slate-850 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:border-amber-400'
            }`}
            title={dt('Configurar / Visualizar Médias de Ramp-up', '设置/查看各保税区爬坡日均', 'Configure/View Ramp-up Averages')}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>{dt('Médias Diárias (Avg)', '各区日均参数', 'Daily Averages')}</span>
          </button>
        </div>
      </div>

      {/* 2. SUMMARY KPI CHIPS (5-COLUMNS INCLUDING TOTAL BONDED RAMP-UP) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 my-3.5">
        <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${
          theme === 'dark' ? 'bg-slate-800/60 border-slate-700/80' : 'bg-blue-50/50 border-blue-100'
        }`}>
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-[10px] uppercase font-bold">
            <span>{dt('Total em Bonded', '保税区总在场箱量', 'Total in Bonded')}</span>
            <Building2 className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-black font-mono text-blue-600 dark:text-blue-400">
              {totalBondedCheio.toLocaleString()}
            </span>
            <span className="text-[10px] text-gray-400 font-bold">CNTRs</span>
          </div>
          <span className="text-[9.5px] text-gray-400 font-medium">
            {dt('Estoque ativo nos 4 recintos', '4个保税终端合计实际存箱', 'Active stock in all bonded terminals')}
          </span>
        </div>

        <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${
          theme === 'dark' ? 'bg-slate-800/60 border-slate-700/80' : 'bg-slate-50 border-slate-200/80'
        }`}>
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-[10px] uppercase font-bold">
            <span>{dt('Capacidade Homologada', '保税区核准总容量', 'Total Bonded Capacity')}</span>
            <Anchor className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-black font-mono text-indigo-600 dark:text-indigo-400">
              {totalBondedCapacity.toLocaleString()}
            </span>
            <span className="text-[10px] text-gray-400 font-bold">CNTRs</span>
          </div>
          <span className="text-[9.5px] text-gray-400 font-medium">
            {dt('Limite físico total de armazenamento', '各终端物理堆存容量上限', 'Total physical storage ceiling')}
          </span>
        </div>

        <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${
          theme === 'dark' ? 'bg-slate-800/60 border-slate-700/80' : 'bg-amber-50/50 border-amber-100'
        }`}>
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-[10px] uppercase font-bold">
            <span>{dt('Ocupação Média Global', '保税区平均负荷率', 'Global Utilization')}</span>
            <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-xl font-black font-mono ${
              globalOccupancyPct >= 85 ? 'text-rose-600 dark:text-rose-400' : globalOccupancyPct >= 70 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              {globalOccupancyPct}%
            </span>
            <span className="text-[10px] text-gray-400 font-bold">
              {globalOccupancyPct >= 85 ? dt('CRÍTICO', '严重', 'CRITICAL') : globalOccupancyPct >= 70 ? dt('ATENÇÃO', '注意', 'WARNING') : dt('SEGURO', '正常', 'SAFE')}
            </span>
          </div>
          <span className="text-[9.5px] text-gray-400 font-medium">
            {dt('Meta de segurança: < 80%', '安全控仓目标: < 80%', 'Safe operating threshold: < 80%')}
          </span>
        </div>

        <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${
          theme === 'dark' ? 'bg-slate-800/60 border-slate-700/80' : 'bg-emerald-50/50 border-emerald-100'
        }`}>
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-[10px] uppercase font-bold">
            <span>{dt('Vagas Livres (Buffer)', '可用富余堆位', 'Available Free Slots')}</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {totalFreeSlots.toLocaleString()}
            </span>
            <span className="text-[10px] text-gray-400 font-bold">CNTRs</span>
          </div>
          <span className="text-[9.5px] text-gray-400 font-medium">
            {dt('Folga para novas chegadas', '可接纳新到港进箱空间', 'Buffer for incoming discharges')}
          </span>
        </div>

        {/* 5th Highlighted Chip: RAMP-UP DIÁRIO TOTAL BONDED */}
        <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${
          theme === 'dark'
            ? 'bg-gradient-to-br from-indigo-950/60 to-slate-900 border-indigo-700/60 text-white'
            : 'bg-gradient-to-br from-indigo-50/90 to-blue-50/60 border-indigo-200 text-slate-900'
        }`}>
          <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-300 text-[10px] uppercase font-black">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500" />
              {dt('Ramp-up Total Bonded', '保税区合计爬坡日均', 'Total Bonded Ramp-up')}
            </span>
            <Gauge className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-black font-mono text-indigo-600 dark:text-indigo-400">
              {totalBondedRampupAvg}
            </span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold">CNTRs/{dt('dia', '天', 'day')}</span>
          </div>
          <span className="text-[9.5px] text-indigo-600/80 dark:text-indigo-400/80 font-medium truncate">
            {dt('TECON 100 • TPC 62 • INTER 59 • CLIA 10', 'TECON 100 • TPC 62 • INTER 59 • CLIA 10', 'TECON 100 • TPC 62 • INTER 59 • CLIA 10')}
          </span>
        </div>
      </div>

      {/* INLINE RAMP-UP RATES EDITOR & CONFIG PANEL (COLLAPSIBLE) */}
      {showRateEditor && (
        <div className={`mb-3.5 p-3.5 rounded-xl border transition-all ${
          theme === 'dark' ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <h4 className="font-black text-xs text-gray-900 dark:text-white uppercase">
                {dt('Parâmetros de Ramp-up por Terminal Alfandegado (Avg/Dia)', '各保税区爬坡速率与日均出清配额配置', 'Ramp-up Parameters per Bonded Terminal (Avg/Day)')}
              </h4>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={handleResetRates}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 transition-colors cursor-pointer"
                title={dt('Restaurar valores padrão (100, 62, 59, 10)', '重置为标准默认值 (100, 62, 59, 10)', 'Reset to default rates')}
              >
                <RotateCcw className="w-3 h-3" />
                <span>{dt('Restaurar Padrão', '恢复默认', 'Reset Default')}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            {/* TECON Rate */}
            <div className={`p-2.5 rounded-lg border ${
              theme === 'dark' ? 'bg-slate-900/60 border-slate-700' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-blue-600 dark:text-blue-400">TECON</span>
                <span className="text-[10px] text-gray-400 font-bold">{dt('Padrão: 100', '默认: 100', 'Def: 100')}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <input
                  type="number"
                  min="0"
                  max="1000"
                  step="5"
                  value={rampupRates['tecon'] || 0}
                  onChange={(e) => handleRateChange('tecon', Number(e.target.value))}
                  className="w-full font-mono font-black text-sm px-2 py-1 rounded border border-gray-300 dark:border-slate-700 bg-transparent text-gray-900 dark:text-white text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-[10px] text-gray-500 shrink-0 font-medium">CNTRs/{dt('d', '天', 'd')}</span>
              </div>
            </div>

            {/* TPC Rate */}
            <div className={`p-2.5 rounded-lg border ${
              theme === 'dark' ? 'bg-slate-900/60 border-slate-700' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400">TPC</span>
                <span className="text-[10px] text-gray-400 font-bold">{dt('Padrão: 62', '默认: 62', 'Def: 62')}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <input
                  type="number"
                  min="0"
                  max="1000"
                  step="5"
                  value={rampupRates['tpc'] || 0}
                  onChange={(e) => handleRateChange('tpc', Number(e.target.value))}
                  className="w-full font-mono font-black text-sm px-2 py-1 rounded border border-gray-300 dark:border-slate-700 bg-transparent text-gray-900 dark:text-white text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-gray-500 shrink-0 font-medium">CNTRs/{dt('d', '天', 'd')}</span>
              </div>
            </div>

            {/* INTERMARITIMA Rate */}
            <div className={`p-2.5 rounded-lg border ${
              theme === 'dark' ? 'bg-slate-900/60 border-slate-700' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-orange-600 dark:text-orange-400">INTERMARITIMA</span>
                <span className="text-[10px] text-gray-400 font-bold">{dt('Padrão: 59', '默认: 59', 'Def: 59')}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <input
                  type="number"
                  min="0"
                  max="1000"
                  step="5"
                  value={rampupRates['intermaritima'] || 0}
                  onChange={(e) => handleRateChange('intermaritima', Number(e.target.value))}
                  className="w-full font-mono font-black text-sm px-2 py-1 rounded border border-gray-300 dark:border-slate-700 bg-transparent text-gray-900 dark:text-white text-center focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
                <span className="text-[10px] text-gray-500 shrink-0 font-medium">CNTRs/{dt('d', '天', 'd')}</span>
              </div>
            </div>

            {/* CLIA Rate */}
            <div className={`p-2.5 rounded-lg border ${
              theme === 'dark' ? 'bg-slate-900/60 border-slate-700' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-purple-600 dark:text-purple-400">CLIA</span>
                <span className="text-[10px] text-gray-400 font-bold">{dt('Padrão: 10', '默认: 10', 'Def: 10')}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <input
                  type="number"
                  min="0"
                  max="1000"
                  step="2"
                  value={rampupRates['clia'] || 0}
                  onChange={(e) => handleRateChange('clia', Number(e.target.value))}
                  className="w-full font-mono font-black text-sm px-2 py-1 rounded border border-gray-300 dark:border-slate-700 bg-transparent text-gray-900 dark:text-white text-center focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <span className="text-[10px] text-gray-500 shrink-0 font-medium">CNTRs/{dt('d', '天', 'd')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. PRIMARY CANVAS AREA */}
      <div className="pt-2">
        {/* ========================================================= */}
        {/* MODE 1: RAMP-UP & DRAIN PROJECTION VIEW (REQUESTED FOCUS) */}
        {/* ========================================================= */}
        {chartMode === 'rampup' && (
          <div className="space-y-4">
            {/* Ramp-up Secondary Controls Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 text-xs">
              <div className="flex items-center gap-2">
                {/* Granularity: Weeks vs Days */}
                <div className="flex items-center bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-gray-200 dark:border-slate-700 shadow-3xs">
                  <button
                    type="button"
                    onClick={() => setRampupGranularity('weeks')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      rampupGranularity === 'weeks'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{dt('Por Semana (W35-W42)', '按周度预测 (W35-W42)', 'Weekly (W35-W42)')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRampupGranularity('days')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      rampupGranularity === 'days'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{dt('Por Dia Útil (D0 a D+20)', '按工作日走势 (D0 至 D+20)', 'Daily (D0 to D+20)')}</span>
                  </button>
                </div>

                {/* Working Days per week: 5 vs 6 */}
                <div className="flex items-center bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-gray-200 dark:border-slate-700 shadow-3xs">
                  <button
                    type="button"
                    onClick={() => setWorkingDaysPerWeek(5)}
                    className={`px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      workingDaysPerWeek === 5
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                    title={dt('5 Dias Úteis (Seg-Sex, Sábado/Domingo folga)', '5个工作日 (周一至周五，周末休息)', '5 Working Days (Mon-Fri)')}
                  >
                    5 {dt('Dias (Seg-Sex)', '天 (周一至五)', 'Days (Mon-Fri)')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkingDaysPerWeek(6)}
                    className={`px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      workingDaysPerWeek === 6
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                    title={dt('6 Dias Úteis (Seg-Sáb, Domingo folga)', '6个工作日 (周一至周六，仅周日休息)', '6 Working Days (Mon-Sat)')}
                  >
                    6 {dt('Dias (+Sábado)', '天 (+周六作业)', 'Days (+Sat)')}
                  </button>
                </div>
              </div>

              {/* Chart Visual Style: Area vs Lines */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-gray-200 dark:border-slate-700 shadow-3xs">
                  <button
                    type="button"
                    onClick={() => setRampupChartType('area')}
                    className={`px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      rampupChartType === 'area'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {dt('Área Empilhada', '堆叠出清面积图', 'Stacked Area')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRampupChartType('lines')}
                    className={`px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      rampupChartType === 'lines'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {dt('Linhas Individuais', '终端各独立曲线', 'Lines')}
                  </button>
                </div>

                <span className="hidden sm:inline-flex text-[11px] font-mono text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-md border border-gray-200 dark:border-slate-700">
                  {dt('Capacidade Semanal Total:', '每周出清总运力:', 'Weekly Drain:')} <strong className="text-emerald-600 dark:text-emerald-400 ml-1">{totalBondedWeeklyDrain.toLocaleString()} CNTRs/sem</strong>
                </span>
              </div>
            </div>

            {/* Ramp-up Burn-down Chart */}
            <div className="h-[310px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {rampupChartType === 'area' ? (
                  <AreaChart
                    data={rampupTimeline}
                    margin={{ top: 20, right: 25, left: 10, bottom: 20 }}
                  >
                    <defs>
                      <linearGradient id="colorTecon" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="colorTpc" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="colorInter" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F97316" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#F97316" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="colorClia" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#334155' : '#E2E8F0'} vertical={false} />
                    <XAxis
                      dataKey="period"
                      tick={{ fill: theme === 'dark' ? '#CBD5E1' : '#334155', fontSize: 11, fontWeight: 'bold' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: theme === 'dark' ? '#94A3B8' : '#64748B', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => v.toLocaleString()}
                      label={{
                        value: dt('Saldo Remanescente (CNTRs)', '剩余待出库集装箱数', 'Remaining Stock (CNTRs)'),
                        angle: -90,
                        position: 'insideLeft',
                        fill: theme === 'dark' ? '#94A3B8' : '#64748B',
                        fontSize: 10,
                        fontWeight: 'bold',
                        offset: 0
                      }}
                    />
                    <Tooltip content={<CustomRampupTooltip />} />
                    <Legend
                      verticalAlign="top"
                      height={32}
                      iconType="circle"
                      formatter={(val) => (
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 mr-2">{val}</span>
                      )}
                    />

                    {/* Stacked areas per terminal */}
                    <Area
                      type="monotone"
                      dataKey="TECON"
                      name={`TECON (${rampupRates['tecon'] || 100} AVG/dia)`}
                      stackId="1"
                      stroke="#3B82F6"
                      fill="url(#colorTecon)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="TPC"
                      name={`TPC (${rampupRates['tpc'] || 62} AVG/dia)`}
                      stackId="1"
                      stroke="#10B981"
                      fill="url(#colorTpc)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="INTERMARITIMA"
                      name={`INTERMARITIMA (${rampupRates['intermaritima'] || 59} AVG/dia)`}
                      stackId="1"
                      stroke="#F97316"
                      fill="url(#colorInter)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="CLIA"
                      name={`CLIA (${rampupRates['clia'] || 10} AVG/dia)`}
                      stackId="1"
                      stroke="#8B5CF6"
                      fill="url(#colorClia)"
                      strokeWidth={2}
                    />
                    <ReferenceLine y={0} stroke="#10B981" strokeDasharray="3 3" />
                  </AreaChart>
                ) : (
                  <LineChart
                    data={rampupTimeline}
                    margin={{ top: 20, right: 25, left: 10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#334155' : '#E2E8F0'} vertical={false} />
                    <XAxis
                      dataKey="period"
                      tick={{ fill: theme === 'dark' ? '#CBD5E1' : '#334155', fontSize: 11, fontWeight: 'bold' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: theme === 'dark' ? '#94A3B8' : '#64748B', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => v.toLocaleString()}
                    />
                    <Tooltip content={<CustomRampupTooltip />} />
                    <Legend
                      verticalAlign="top"
                      height={32}
                      iconType="circle"
                      formatter={(val) => (
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 mr-2">{val}</span>
                      )}
                    />

                    <Line
                      type="monotone"
                      dataKey="TOTAL"
                      name={`TOTAL BONDED (${totalBondedRampupAvg} AVG/dia)`}
                      stroke="#6366F1"
                      strokeWidth={3}
                      strokeDasharray="4 4"
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="TECON"
                      name={`TECON (${rampupRates['tecon'] || 100} AVG/dia)`}
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="TPC"
                      name={`TPC (${rampupRates['tpc'] || 62} AVG/dia)`}
                      stroke="#10B981"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="INTERMARITIMA"
                      name={`INTERMARITIMA (${rampupRates['intermaritima'] || 59} AVG/dia)`}
                      stroke="#F97316"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="CLIA"
                      name={`CLIA (${rampupRates['clia'] || 10} AVG/dia)`}
                      stroke="#8B5CF6"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <ReferenceLine y={0} stroke="#10B981" strokeDasharray="3 3" />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* RAMP-UP BREAKDOWN MATRIX TABLE */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`border-b border-gray-200 dark:border-slate-800 font-black text-[11px] uppercase tracking-wider ${
                    theme === 'dark' ? 'bg-slate-800/80 text-gray-300' : 'bg-slate-100 text-gray-700'
                  }`}>
                    <th className="py-2.5 px-3">{dt('Terminal Alfandegado', '保税堆场终端', 'Bonded Terminal')}</th>
                    <th className="py-2.5 px-3 text-right">{dt('Estoque Atual', '当前存箱', 'Current Stock')}</th>
                    <th className="py-2.5 px-3 text-right">{dt('Capacidade', '额定容量', 'Capacity')}</th>
                    <th className="py-2.5 px-3 text-right text-amber-600 dark:text-amber-400 bg-amber-500/10">
                      {dt('⚡ Ramp-up (Média Diária)', '⚡ 爬坡日均出库', '⚡ Ramp-up (Daily Avg)')}
                    </th>
                    <th className="py-2.5 px-3 text-right">{dt('Vazão Semanal', '周出清能力', 'Weekly Drain')}</th>
                    <th className="py-2.5 px-3 text-right text-indigo-600 dark:text-indigo-400">
                      {dt('Dias Úteis p/ Esvaziar', '出清所需工作日', 'Days to Clear')}
                    </th>
                    <th className="py-2.5 px-3 text-right">{dt('Semanas Estimadas', '折合周数', 'Est. Weeks')}</th>
                    <th className="py-2.5 px-3 text-center">{dt('Previsão Liberação Total', '预计全部出清日期', 'Target Date')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {bondedData.map((yard, idx) => (
                    <tr
                      key={yard.id}
                      className={`transition-colors ${
                        theme === 'dark' ? 'hover:bg-slate-800/50' : 'hover:bg-blue-50/40'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-bold flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: BONDED_COLORS[idx % BONDED_COLORS.length] }}
                        />
                        <span className="text-gray-900 dark:text-white uppercase font-black">{yard.name}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-blue-600 dark:text-blue-400">
                        {yard.cheio.toLocaleString()} <span className="text-[10px] text-gray-400 font-normal">CNTRs</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-gray-600 dark:text-gray-300">
                        {yard.capacity.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-amber-600 dark:text-amber-400 bg-amber-500/5">
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60">
                          {yard.rampupAvg} CNTRs/{dt('dia', '天', 'day')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-700 dark:text-gray-200">
                        {yard.weeklyDrain.toLocaleString()} CNTRs/{dt('sem', '周', 'wk')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-indigo-600 dark:text-indigo-400">
                        ~{yard.daysToDrain.toFixed(1)} {dt('dias', '天', 'days')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-600 dark:text-gray-300">
                        ~{yard.weeksToDrain.toFixed(1)} {dt('sem', '周', 'wks')}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-[11px]">
                          {yard.estimatedClearanceDate}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {/* TOTAL BONDED SUMMARY ROW */}
                  <tr className={`font-black text-xs ${
                    theme === 'dark' ? 'bg-indigo-950/40 text-white' : 'bg-indigo-50/80 text-indigo-950'
                  }`}>
                    <td className="py-3 px-3 uppercase tracking-wider font-black flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span>{dt('TOTAL BONDED (TODAS ÁREAS)', '保税区全域合计', 'TOTAL BONDED (ALL AREAS)')}</span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-sm font-black text-blue-600 dark:text-blue-400">
                      {totalBondedCheio.toLocaleString()} CNTRs
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold">
                      {totalBondedCapacity.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-amber-600 dark:text-amber-400 text-sm bg-amber-500/10">
                      <span className="px-2.5 py-1 rounded-md bg-amber-200/80 dark:bg-amber-900/80">
                        {totalBondedRampupAvg} CNTRs/{dt('dia', '天', 'day')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-gray-900 dark:text-white">
                      {totalBondedWeeklyDrain.toLocaleString()} CNTRs/{dt('sem', '周', 'wk')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-indigo-600 dark:text-indigo-400 text-sm">
                      ~{totalBondedDaysToDrain.toFixed(1)} {dt('dias úteis', '工作日', 'days')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-gray-700 dark:text-gray-200">
                      ~{totalBondedWeeksToDrain.toFixed(1)} {dt('semanas', '周', 'wks')}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-black text-emerald-600 dark:text-emerald-400">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-200/80 dark:bg-emerald-900/80 text-xs">
                        {totalEstimatedClearanceDate}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODE 2: BARS (ESTOQUE VS CAPACIDADE)                      */}
        {/* ========================================================= */}
        {chartMode === 'bars' && (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={bondedData}
                margin={{ top: 25, right: 20, left: 10, bottom: 20 }}
                barGap={8}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#334155' : '#E2E8F0'} vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: theme === 'dark' ? '#CBD5E1' : '#334155', fontSize: 11, fontWeight: 'bold' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: theme === 'dark' ? '#94A3B8' : '#64748B', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => v.toLocaleString()}
                  label={{
                    value: dt('Volume (CNTRs)', '箱量 (CNTRs)', 'Volume (CNTRs)'),
                    angle: -90,
                    position: 'insideLeft',
                    fill: theme === 'dark' ? '#94A3B8' : '#64748B',
                    fontSize: 10,
                    fontWeight: 'bold',
                    offset: 0
                  }}
                />
                <Tooltip content={<CustomBarTooltip />} />
                <Legend
                  verticalAlign="top"
                  height={32}
                  iconType="circle"
                  formatter={(val) => (
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 mr-2">{val}</span>
                  )}
                />

                {/* Stored Containers Bar (Cheio) with dynamic colors and clear labels */}
                <Bar
                  dataKey="cheio"
                  name={dt('Contêineres em Pátio (Cheio)', '在场重箱 (Cheio)', 'Containers in Yard (Full)')}
                  radius={[5, 5, 0, 0]}
                  maxBarSize={48}
                >
                  {bondedData.map((entry, index) => (
                    <Cell
                      key={`cell-cheio-${index}`}
                      fill={entry.occupancyPct >= 85 ? '#EF4444' : entry.occupancyPct >= 70 ? '#F59E0B' : '#3B82F6'}
                      opacity={selectedTerminal && selectedTerminal !== entry.name ? 0.35 : 1}
                      className="cursor-pointer transition-all"
                      onClick={() => setSelectedTerminal(selectedTerminal === entry.name ? null : entry.name)}
                    />
                  ))}
                  {showNumbers && (
                    <LabelList
                      dataKey="cheio"
                      position="top"
                      content={renderBarLabel}
                    />
                  )}
                </Bar>

                {/* Maximum Physical Capacity Bar */}
                <Bar
                  dataKey="capacity"
                  name={dt('Capacidade Máxima (Teto)', '额定最大总容量', 'Max Capacity')}
                  fill={theme === 'dark' ? '#475569' : '#CBD5E1'}
                  opacity={0.65}
                  radius={[5, 5, 0, 0]}
                  maxBarSize={48}
                >
                  {showNumbers && (
                    <LabelList
                      dataKey="capacity"
                      position="top"
                      formatter={(v: any) => `/${Number(v).toLocaleString()}`}
                      style={{ fill: theme === 'dark' ? '#94A3B8' : '#64748B', fontSize: '9px', fontWeight: 'bold' }}
                    />
                  )}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODE 3: COMPOSITION (PÁTIO + PORTO + PRONTO COLETA)       */}
        {/* ========================================================= */}
        {chartMode === 'composition' && (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={bondedData}
                margin={{ top: 25, right: 20, left: 10, bottom: 20 }}
                barGap={6}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#334155' : '#E2E8F0'} vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: theme === 'dark' ? '#CBD5E1' : '#334155', fontSize: 11, fontWeight: 'bold' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: theme === 'dark' ? '#94A3B8' : '#64748B', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => v.toLocaleString()}
                />
                <Tooltip content={<CustomBarTooltip />} />
                <Legend
                  verticalAlign="top"
                  height={32}
                  iconType="circle"
                  formatter={(val) => (
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 mr-2">{val}</span>
                  )}
                />

                {/* Cheio (em pátio) */}
                <Bar
                  dataKey="cheio"
                  name={dt('Em Pátio (Armazenado)', '在场存储 (重箱)', 'In Yard (Stored)')}
                  fill="#3B82F6"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={38}
                >
                  {showNumbers && <LabelList dataKey="cheio" position="top" content={renderBarLabel} />}
                </Bar>

                {/* No Porto (atracado/descarregando) */}
                <Bar
                  dataKey="porto"
                  name={dt('No Porto (Atracado / Descarga)', '在港靠泊/卸船中', 'In Port (Vessel Discharge)')}
                  fill="#F59E0B"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={38}
                >
                  {showNumbers && <LabelList dataKey="porto" position="top" content={renderBarLabel} />}
                </Bar>

                {/* Pronto para Coleta */}
                <Bar
                  dataKey="prontoColeta"
                  name={dt('Pronto p/ Coleta (Liberado RFB)', '口岸放行待提', 'Ready for Collection')}
                  fill="#8B5CF6"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={38}
                >
                  {showNumbers && <LabelList dataKey="prontoColeta" position="top" content={renderBarLabel} />}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODE 4: DONUT (PERCENTUAL DE PARTICIPAÇÃO)                */}
        {/* ========================================================= */}
        {chartMode === 'donut' && (
          <div className="h-[280px] w-full flex flex-col md:flex-row items-center justify-around gap-4">
            <div className="h-[240px] w-full md:w-1/2 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    formatter={(val: any, name: any, item: any) => [
                      `${Number(val).toLocaleString()} CNTRs (${item.payload.pct}%)`,
                      name
                    ]}
                  />
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {donutData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke={theme === 'dark' ? '#0F172A' : '#FFFFFF'}
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-black font-mono text-gray-900 dark:text-white">
                  {totalBondedCheio.toLocaleString()}
                </span>
                <span className="text-[10px] font-bold text-gray-400 uppercase">
                  {dt('CNTRs em Bonded', '保税区总箱量', 'Total Bonded')}
                </span>
              </div>
            </div>

            <div className="w-full md:w-1/2 space-y-2 max-w-sm">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                {dt('Participação Relativa de Estoque', '各保税堆场库存份额占比', 'Relative Inventory Share')}
              </h4>
              <div className="space-y-1.5">
                {donutData.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                      theme === 'dark' ? 'bg-slate-800/40 border-slate-700/60' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-xs font-extrabold text-gray-900 dark:text-white">
                        {item.value.toLocaleString()} <span className="text-[10px] text-gray-400 font-normal">CNTRs</span>
                      </span>
                      <span className="text-[11px] font-black px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
                        {item.pct}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. INDIVIDUAL BONDED TERMINAL CARDS WITH RAMP-UP STATS */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-blue-500" />
            <h4 className="font-extrabold text-xs text-gray-800 dark:text-gray-200 uppercase tracking-wider">
              {dt('Detalhamento & Taxas de Ramp-up por Terminal Alfandegado', '各保税终端详细运行与出清爬坡指标', 'Breakdown & Ramp-up Rates by Bonded Terminal')}
            </h4>
          </div>
          <span className="text-[10px] text-gray-400 font-medium">
            {dt('Clique em um terminal para destacar no gráfico', '点击下方卡片可在图表中联动高亮', 'Click card to highlight')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {bondedData.map((yard, idx) => {
            const isSelected = selectedTerminal === yard.name;
            return (
              <div
                key={yard.id}
                onClick={() => setSelectedTerminal(isSelected ? null : yard.name)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer transform hover:scale-[1.02] ${
                  isSelected
                    ? 'ring-2 ring-blue-500 shadow-md bg-blue-50/60 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600'
                    : theme === 'dark'
                    ? 'bg-slate-850/70 hover:bg-slate-800 border-slate-750'
                    : 'bg-white hover:bg-slate-50 border-slate-200 shadow-3xs'
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: BONDED_COLORS[idx % BONDED_COLORS.length] }}
                    />
                    <h5 className="font-black text-xs text-gray-900 dark:text-white uppercase tracking-tight">
                      {yard.name}
                    </h5>
                  </div>
                  <span
                    className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase"
                    style={{
                      backgroundColor: `${yard.statusColor}20`,
                      color: yard.statusColor
                    }}
                  >
                    {yard.occupancyPct}% {dt('Ocupado', '已占用', 'Full')}
                  </span>
                </div>

                {/* Primary volume number */}
                <div className="mt-2.5 flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
                      {yard.cheio.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 ml-1">CNTRs</span>
                  </div>
                  <span className="text-[11px] font-mono text-gray-400 font-semibold">
                    /{yard.capacity.toLocaleString()} max
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, yard.occupancyPct)}%`,
                      backgroundColor: yard.statusColor
                    }}
                  />
                </div>

                {/* RAMP-UP HIGHLIGHT PILL */}
                <div className="mt-2.5 p-2 rounded-lg bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <div>
                      <span className="block text-[9px] uppercase font-bold text-amber-700 dark:text-amber-400">
                        {dt('Ramp-up (Avg/Dia)', '日均出清爬坡', 'Ramp-up (Avg/Day)')}
                      </span>
                      <span className="font-mono font-black text-xs text-amber-800 dark:text-amber-300">
                        {yard.rampupAvg} CNTRs/{dt('dia', '天', 'day')}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-[9px] uppercase font-bold text-gray-400">
                      {dt('Desova em', '清空耗时', 'Clears in')}
                    </span>
                    <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                      ~{yard.daysToDrain.toFixed(0)}d ({yard.weeksToDrain.toFixed(1)}s)
                    </span>
                  </div>
                </div>

                {/* Secondary breakdown stats */}
                <div className="mt-2 pt-2 border-t border-dashed border-gray-100 dark:border-slate-800 text-[10px] grid grid-cols-2 gap-1 text-gray-500 dark:text-gray-400">
                  <div>
                    <span className="block text-gray-400 text-[9px]">{dt('Vagas Livres:', '空余堆位:', 'Free Slots:')}</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {yard.freeSlots.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="block text-gray-400 text-[9px]">{dt('Pronto Coleta:', '已放行待提:', 'Ready Pickup:')}</span>
                    <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                      {yard.prontoColeta.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Vessel highlights */}
                {yard.vesselsConnected.length > 0 && (
                  <div className="mt-2 pt-1.5 border-t border-gray-100 dark:border-slate-800 flex items-center gap-1 text-[9.5px] text-gray-400 truncate">
                    <Ship className="w-3 h-3 text-blue-500 shrink-0" />
                    <span className="truncate text-blue-600 dark:text-blue-400 font-medium" title={yard.vesselsConnected.join(', ')}>
                      {yard.vesselsConnected.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
