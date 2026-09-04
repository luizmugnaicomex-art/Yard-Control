import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
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
  Info,
  ArrowUpRight,
  Maximize2,
  PieChart as PieIcon,
  BarChart3,
  Sliders,
  Sparkles,
  Ship
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
}

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

export const BondedAreasChart: React.FC<BondedAreasChartProps> = ({
  theme,
  language,
  yards,
  containers = [],
  vessels = [],
  compact = false
}) => {
  const [chartMode, setChartMode] = useState<'bars' | 'composition' | 'donut'>('bars');
  const [sortMode, setSortMode] = useState<'volume' | 'occupancy' | 'default'>('default');
  const [showNumbers, setShowNumbers] = useState<boolean>(true);
  const [selectedTerminal, setSelectedTerminal] = useState<string | null>(null);

  // Localization helper
  const dt = (pt: string, zh: string, en: string) => {
    if (language === 'zh') return zh;
    if (language === 'en') return en;
    if (language === 'bilingual') return `${pt} / ${zh}`;
    return pt;
  };

  // Extract and compute data for all Bonded yards
  const bondedData: BondedYardData[] = useMemo(() => {
    const entries = (Object.entries(yards || {}) as [string, Yard][]).filter(
      ([_, y]) => y && y.type === 'BONDED'
    );

    const items: BondedYardData[] = entries.map(([id, y], index) => {
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

      return {
        id,
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
        vesselsConnected: combinedVessels
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
  }, [yards, vessels, containers, sortMode, language]);

  // Aggregate stats across all bonded areas
  const totalBondedCheio = useMemo(() => bondedData.reduce((acc, y) => acc + y.cheio, 0), [bondedData]);
  const totalBondedCapacity = useMemo(() => bondedData.reduce((acc, y) => acc + y.capacity, 0), [bondedData]);
  const globalOccupancyPct = totalBondedCapacity > 0 ? Math.round((totalBondedCheio / totalBondedCapacity) * 100) : 0;
  const totalFreeSlots = Math.max(0, totalBondedCapacity - totalBondedCheio);
  const totalInPort = useMemo(() => bondedData.reduce((acc, y) => acc + y.porto, 0), [bondedData]);
  const totalProntoColeta = useMemo(() => bondedData.reduce((acc, y) => acc + y.prontoColeta, 0), [bondedData]);

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
      <div className={`p-3 rounded-xl shadow-xl border text-xs min-w-[220px] ${
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
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {dt(
                'Volume de contêineres armazenados em cada terminal alfandegado, limite de capacidade e folga operacional.',
                '实时监控各大保税区（TECON, INTERMARÍTIMA, TPC, CLIA）在场重箱数、容量极限及可用富余量。',
                'Real-time volume of stored containers across each bonded terminal, physical capacity limits, and operating buffer.'
              )}
            </p>
          </div>
        </div>

        {/* Action controls / Chart toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Chart mode switcher */}
          <div className="flex items-center bg-gray-100 dark:bg-slate-800 p-0.5 rounded-lg border border-gray-200 dark:border-slate-700 text-xs">
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

          {/* Sort order toggle */}
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

          {/* Data labels toggle */}
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
        </div>
      </div>

      {/* 2. SUMMARY KPI CHIPS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3.5">
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
      </div>

      {/* 3. CHART CANVAS */}
      <div className="pt-2">
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

      {/* 4. INDIVIDUAL BONDED TERMINAL CARDS (INTERACTIVE & DETAILED) */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-blue-500" />
            <h4 className="font-extrabold text-xs text-gray-800 dark:text-gray-200 uppercase tracking-wider">
              {dt('Detalhamento por Terminal Alfandegado', '各保税终端详细运行指标', 'Breakdown by Bonded Terminal')}
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

                {/* Secondary breakdown stats */}
                <div className="mt-2.5 pt-2 border-t border-dashed border-gray-100 dark:border-slate-800 text-[10px] grid grid-cols-2 gap-1 text-gray-500 dark:text-gray-400">
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
