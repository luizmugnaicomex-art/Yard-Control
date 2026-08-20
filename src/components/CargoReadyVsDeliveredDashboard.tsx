import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Area
} from 'recharts';
import {
  TrendingUp,
  AlertTriangle,
  Layers,
  Ship,
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  X,
  Flame,
  Zap,
  Info,
  Sliders,
  Copy,
  Check,
  Edit3,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Building2,
  Warehouse,
  CheckCircle
} from 'lucide-react';
import { Yard, Vessel, YardStockItem, VesselETAItem } from '../types';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

interface CargoReadyVsDeliveredDashboardProps {
  theme: string;
  language: string;
  yards: Record<string, Yard>;
  setYards?: React.Dispatch<React.SetStateAction<Record<string, Yard>>>;
  vessels: Vessel[];
  setVessels?: React.Dispatch<React.SetStateAction<Vessel[]>>;
  dailyDeliveryRate: number;
  setDailyDeliveryRate: (rate: number) => void;
  bondedSum?: { totalCheio: number; totalCap: number; pct: number };
  warehouseSum?: { totalCheio: number; totalCap: number; pct: number };
  bufferSum?: { totalCheio: number; totalCap: number; pct: number };
  additionalBacklog?: number;
  setAdditionalBacklog?: (val: number) => void;
  selectedScenario?: 'etapa1' | 'etapa2' | 'etapa3';
  setSelectedScenario?: (scen: 'etapa1' | 'etapa2' | 'etapa3') => void;
}

export interface WeeklyDataPoint {
  week: string;
  weekFull: string;
  dateRange: string;
  vesselArrivals: number; // TEUs (Future Inflow)
  deliveredDrain: number; // Drain applied
  inventoryBalance: number; // Cumulative Backlog (Bonded + Warehouses + Buffer)
  blVesselArrivals: number;
  blDeliveredDrain: number;
  blInventoryBalance: number;
  capacityThreshold: number;
  startingInventory: number;
  balanceBeforeDrain: number;
  status: 'critical' | 'warning' | 'optimal';
  vesselsInWeek: VesselETAItem[];
  drilldown: {
    containerList: Array<{
      id: string;
      bl: string;
      carrier: string;
      zone: string;
      type: string;
      status: string;
      daysInYard: number;
      priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
    }>;
    carrierShare: Record<string, number>;
    zoneBreakdown: Record<string, number>;
  };
}

export interface DailyDataPoint {
  day: string;
  dateStr: string;
  vesselArrivals: number;
  deliveredDrain: number;
  inventoryBalance: number;
  blVesselArrivals: number;
  blDeliveredDrain: number;
  blInventoryBalance: number;
  capacityThreshold: number;
  status: 'critical' | 'warning' | 'optimal';
}

export const CargoReadyVsDeliveredDashboard: React.FC<CargoReadyVsDeliveredDashboardProps> = ({
  theme,
  language,
  yards,
  setYards,
  vessels,
  setVessels,
  dailyDeliveryRate,
  setDailyDeliveryRate,
  bondedSum,
  warehouseSum,
  bufferSum,
  additionalBacklog = 0,
  setAdditionalBacklog,
  selectedScenario = 'etapa3',
  setSelectedScenario
}) => {
  // State for view controls
  const [granularity, setGranularity] = useState<'weeks' | 'days'>('weeks');
  const [metricUnit, setMetricUnit] = useState<'containers' | 'bls'>('containers');
  const [showInventoryOnly, setShowInventoryOnly] = useState<boolean>(false);
  const [activeDrilldownWeek, setActiveDrilldownWeek] = useState<WeeklyDataPoint | null>(null);
  const [isAiScriptModalOpen, setIsAiScriptModalOpen] = useState<boolean>(false);
  const [isDataEditorOpen, setIsDataEditorOpen] = useState<boolean>(false);
  const [editorTab, setEditorTab] = useState<'yards' | 'vessels'>('yards');
  const [activeTabSubView, setActiveTabSubView] = useState<'chart' | 'steps' | 'curves' | 'risk'>('chart');
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [activeActionCurve, setActiveActionCurve] = useState<'alert' | 'inflow' | 'drain'>('alert');

  // Vessel form state inside editor
  const [newVesselName, setNewVesselName] = useState('');
  const [newVesselEta, setNewVesselEta] = useState('2026-08-25');
  const [newVesselCntrs, setNewVesselCntrs] = useState(500);
  const [newVesselStatus, setNewVesselStatus] = useState<'SCHEDULED' | 'BERTHED' | 'DISCHARGED' | 'DELAYED'>('SCHEDULED');

  // Translation helper supporting Brazilian Portuguese, Simplified Chinese, English, and Multi
  const dt = (pt: string, zh: string, en: string): string => {
    if (language === 'zh') return zh;
    if (language === 'en') return en;
    if (language === 'bilingual') return `${pt} / ${zh}`;
    return pt;
  };

  // -------------------------------------------------------------
  // 1. DYNAMIC STATE MODELS & MAPPINGS (Zero Hardcoded Assumptions)
  // -------------------------------------------------------------

  // Helper for timezone-safe local date parsing
  const parseEtaToDate = (rawEta: string | undefined): { date: Date; year: number; month: number; day: number; formattedIso: string } | null => {
    if (!rawEta) return null;
    const str = String(rawEta).trim();
    if (!str) return null;

    let day = 1;
    let month = 8;
    let year = 2026;

    if (str.includes('/')) {
      const parts = str.split('/');
      if (parts.length >= 2) {
        day = parseInt(parts[0], 10) || 1;
        month = parseInt(parts[1], 10) || 8;
        if (parts.length >= 3) {
          let y = parseInt(parts[2], 10);
          if (!isNaN(y)) {
            if (y < 100) y += 2000;
            year = y;
          }
        }
      }
    } else if (str.includes('-')) {
      const parts = str.split('-');
      if (parts.length >= 3) {
        if (parts[0].length === 4) {
          year = parseInt(parts[0], 10) || 2026;
          month = parseInt(parts[1], 10) || 8;
          day = parseInt(parts[2], 10) || 1;
        } else {
          day = parseInt(parts[0], 10) || 1;
          month = parseInt(parts[1], 10) || 8;
          let y = parseInt(parts[2], 10);
          if (!isNaN(y)) {
            if (y < 100) y += 2000;
            year = y;
          }
        }
      } else if (parts.length === 2) {
        month = parseInt(parts[1], 10) || 8;
        let y = parseInt(parts[0], 10);
        if (!isNaN(y)) year = y < 100 ? y + 2000 : y;
      }
    } else {
      return null;
    }

    if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
      return null;
    }

    // Set local noon time (12:00:00) so there's never an off-by-one or DST/UTC timezone border issue
    const localDate = new Date(year, month - 1, day, 12, 0, 0, 0);
    const formattedIso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    return {
      date: localDate,
      year,
      month,
      day,
      formattedIso
    };
  };

  /**
   * Exact ISO 8601 Calendar Week Calculation
   * - Week 1 starts with the week containing Jan 4th (first Thursday).
   * - In 2026: Year goes up to Week 53 (Dec 28, 2026 – Jan 03, 2027).
   * - In 2027: Jan 04, 2027 begins Week 01 (Jan 04, 2027 – Jan 10, 2027).
   */
  const getISOWeekDetails = (d: Date): {
    isoYear: number;
    isoWeek: number;
    weekLabel: string;
    weekLabelShort: string;
    weekFull: string;
    dateRange: string;
    start: Date;
    end: Date;
  } => {
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
    
    // ISO Day of week: 0 = Mon, 1 = Tue, ..., 6 = Sun
    const dayNr = (target.getDay() + 6) % 7;

    // Monday of the given date's week
    const monday = new Date(target);
    monday.setDate(target.getDate() - dayNr);
    monday.setHours(0, 0, 0, 0);

    // Sunday of the given date's week
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    // Thursday in current week determines the ISO year
    const thursday = new Date(monday);
    thursday.setDate(monday.getDate() + 3);
    const isoYear = thursday.getFullYear();

    // First Thursday of ISO year is always in Jan 1-7 (Jan 4 is always in week 1)
    const jan4 = new Date(isoYear, 0, 4, 12, 0, 0, 0);
    const jan4DayNr = (jan4.getDay() + 6) % 7;
    const firstMondayOfYear = new Date(jan4);
    firstMondayOfYear.setDate(jan4.getDate() - jan4DayNr);
    firstMondayOfYear.setHours(0, 0, 0, 0);

    // Exact difference in ISO weeks
    const diffTime = monday.getTime() - firstMondayOfYear.getTime();
    const diffDays = Math.round(diffTime / 86400000);
    const isoWeek = 1 + Math.floor(diffDays / 7);

    const startDay = String(monday.getDate()).padStart(2, '0');
    const startMonth = String(monday.getMonth() + 1).padStart(2, '0');
    const endDay = String(sunday.getDate()).padStart(2, '0');
    const endMonth = String(sunday.getMonth() + 1).padStart(2, '0');

    const startStr = `${startDay}/${startMonth}`;
    const endStr = `${endDay}/${endMonth}`;
    
    const padWeek = `W${String(isoWeek).padStart(2, '0')}`;
    // For 2026: W34, W35, ... W52, W53
    // For 2027: W01'27, W02'27, etc.
    const weekLabel = isoYear === 2026 ? padWeek : `${padWeek}'${String(isoYear).slice(-2)}`;
    const dateRange = `${startStr} a ${endStr}`;
    const weekFull = `${weekLabel} (${dateRange}${isoYear !== 2026 ? `/${isoYear}` : ''})`;

    return {
      isoYear,
      isoWeek,
      weekLabel,
      weekLabelShort: padWeek,
      weekFull,
      dateRange,
      start: monday,
      end: sunday
    };
  };

  const yardStockList: YardStockItem[] = useMemo(() => {
    return (Object.entries(yards || {}) as [string, Yard][]).map(([id, y]) => {
      let cat: 'BONDED' | 'WAREHOUSE' | 'BUFFER' = 'WAREHOUSE';
      if (y.type === 'BONDED') cat = 'BONDED';
      else if (y.type === 'BUFFER') cat = 'BUFFER';
      return {
        id,
        name: y.name || id.toUpperCase(),
        category: cat,
        capacity: y.capacity || 0,
        currentFull: y.cheio || 0,
        currentEmpty: y.vazio || 0,
        inTransitPort: y.porto || 0,
        inTransitCollection: y.prontoColeta || 0,
        inTransitDelivery: y.delivered || 0
      };
    });
  }, [yards]);

  const vesselList: VesselETAItem[] = useMemo(() => {
    return (vessels || []).map((v) => {
      const parsed = parseEtaToDate(v.eta);
      return {
        id: String(v.id),
        vesselName: v.name,
        etaDate: parsed ? parsed.formattedIso : (v.eta || '2026-08-20'),
        containerCount: Number(v.cntrs) || 0,
        blCount: Math.round((Number(v.cntrs) || 0) / 3.2),
        status: 'SCHEDULED' as const
      };
    });
  }, [vessels]);

  // -------------------------------------------------------------
  // 2. REACTIVE CALCULATION ENGINE
  // -------------------------------------------------------------

  // A. Dynamic Inventory Rollup (Recalculates whenever any yard item updates)
  const activeBondedStock = useMemo(() => {
    return yardStockList.filter(y => y.category === 'BONDED').reduce((acc, y) => acc + y.currentFull, 0);
  }, [yardStockList]);

  const activeWarehouseStock = useMemo(() => {
    return yardStockList.filter(y => y.category === 'WAREHOUSE').reduce((acc, y) => acc + y.currentFull, 0);
  }, [yardStockList]);

  const activeBufferStock = useMemo(() => {
    return yardStockList.filter(y => y.category === 'BUFFER').reduce((acc, y) => acc + y.currentFull, 0);
  }, [yardStockList]);

  const totalInitialBacklog = activeBondedStock + activeWarehouseStock + activeBufferStock;

  const dynamicYardMaxCapacity = useMemo(() => {
    return yardStockList.reduce((acc, y) => acc + (y.capacity || 0), 0);
  }, [yardStockList]);

  const dynamicSafeYardCapacity = useMemo(() => {
    return Math.round(dynamicYardMaxCapacity * 0.75);
  }, [dynamicYardMaxCapacity]);

  const activeOccupancyRate = dynamicYardMaxCapacity > 0
    ? Math.round((totalInitialBacklog / dynamicYardMaxCapacity) * 100)
    : 0;

  // B. Dynamic ETA Week Aggregation & Simulation until Yard Drain reaches Zero
  const weeklyData: WeeklyDataPoint[] = useMemo(() => {
    const baseDate = new Date(2026, 7, 17, 0, 0, 0, 0); // Aug 17, 2026 is Monday of W34
    const teusPerBl = 3.2;
    const weeklyDrainCapacity = (dailyDeliveryRate || 140) * 7;

    // 1. Pre-group all scheduled vessels by week index relative to W34 base date (17/08/2026)
    const vesselMapByWeekIdx = new Map<number, { containers: number; vessels: VesselETAItem[] }>();
    let maxVesselWeekIdx = 0;

    vesselList.forEach(v => {
      const cntrs = Number(v.containerCount) || 0;
      if (cntrs <= 0) return;

      let targetIdx = 0;
      const parsed = parseEtaToDate(v.etaDate);
      if (parsed) {
        const vesselWeek = getISOWeekDetails(parsed.date);
        const diffMs = vesselWeek.start.getTime() - baseDate.getTime();
        targetIdx = Math.round(diffMs / (7 * 86400000));
        if (targetIdx < 0) targetIdx = 0;
      }

      maxVesselWeekIdx = Math.max(maxVesselWeekIdx, targetIdx);
      const current = vesselMapByWeekIdx.get(targetIdx) || { containers: 0, vessels: [] };
      current.containers += cntrs;
      current.vessels.push(v);
      vesselMapByWeekIdx.set(targetIdx, current);
    });

    // 2. Initial Backlog determined by active scenario
    let rollingBacklog = selectedScenario === 'etapa1'
      ? (activeBondedStock + activeWarehouseStock + additionalBacklog)
      : selectedScenario === 'etapa2'
        ? (activeBondedStock + activeWarehouseStock + activeBufferStock + additionalBacklog)
        : (totalInitialBacklog + additionalBacklog);

    const generatedWeeks: WeeklyDataPoint[] = [];
    let zeroBalanceCount = 0;

    // 3. Simulate rolling weekly drain until all vessels arrive AND the remaining balance line reaches zero
    // Following real calendar: 2026 extends until W53, and 2027 begins with W01 on January 04, 2027
    for (let i = 0; i < 70; i++) {
      const currentWeekMonday = new Date(2026, 7, 17 + i * 7, 12, 0, 0, 0);
      const weekInfo = getISOWeekDetails(currentWeekMonday);
      const weekLabel = weekInfo.weekLabel;
      const weekFull = weekInfo.weekFull;
      const dateRange = weekInfo.dateRange;

      const weekInflowData = vesselMapByWeekIdx.get(i);
      const weeklyArrivals = selectedScenario === 'etapa3' ? (weekInflowData?.containers || 0) : 0;
      const weekVessels = weekInflowData?.vessels || [];

      const startingInventory = rollingBacklog;
      const balanceBeforeDrain = startingInventory + weeklyArrivals;
      const actualDrain = Math.min(balanceBeforeDrain, weeklyDrainCapacity);
      rollingBacklog = Math.max(0, balanceBeforeDrain - actualDrain);

      const isCritical = rollingBacklog > 3000 || rollingBacklog > dynamicSafeYardCapacity;
      const isWarning = rollingBacklog > 2000;
      const status: 'critical' | 'warning' | 'optimal' = isCritical ? 'critical' : isWarning ? 'warning' : 'optimal';

      // Granular drilldown breakdown
      const yardBreakdown: Record<string, number> = {};
      if (activeBondedStock > 0) yardBreakdown['BONDED (TECON/TPC/INTER)'] = Math.round(rollingBacklog * (activeBondedStock / Math.max(1, totalInitialBacklog)));
      if (activeWarehouseStock > 0) yardBreakdown['WAREHOUSES (AG/CTS)'] = Math.round(rollingBacklog * (activeWarehouseStock / Math.max(1, totalInitialBacklog)));
      if (activeBufferStock > 0) yardBreakdown['BYD BUFFER'] = Math.round(rollingBacklog * (activeBufferStock / Math.max(1, totalInitialBacklog)));

      const sampleVessel = weekVessels[0]?.vesselName || 'MSC SAVONA';

      generatedWeeks.push({
        week: weekLabel,
        weekFull,
        dateRange,
        vesselArrivals: weeklyArrivals,
        deliveredDrain: actualDrain,
        inventoryBalance: rollingBacklog,
        blVesselArrivals: Math.round(weeklyArrivals / teusPerBl),
        blDeliveredDrain: Math.round(actualDrain / teusPerBl),
        blInventoryBalance: Math.round(rollingBacklog / teusPerBl),
        capacityThreshold: weeklyDrainCapacity,
        startingInventory,
        balanceBeforeDrain,
        status,
        vesselsInWeek: weekVessels,
        drilldown: {
          containerList: [
            { id: `BYDU${849201 + i * 17}`, bl: `BL-SSZ-${9021 + i}`, carrier: sampleVessel.startsWith('MSC') ? 'MSC MEDITERRANEAN' : 'COSCO SHIPPING', zone: 'TECON SALVADOR', type: "40' HC", status: 'PRONTO COLETA', daysInYard: 12 + (i % 8), priority: isCritical ? 'CRITICAL' : 'HIGH' },
            { id: `BYDU${512890 + i * 19}`, bl: `BL-SSZ-${9022 + i}`, carrier: 'CMA CGM', zone: 'INTERMARÍTIMA', type: "40' HC", status: 'CUSTOMS CLEARED', daysInYard: 8 + (i % 6), priority: 'HIGH' },
            { id: `BYDU${982314 + i * 23}`, bl: `BL-SSZ-${9023 + i}`, carrier: 'MSC MEDITERRANEAN', zone: 'TPC COMEX', type: "40' HC", status: 'BUFFER TERCAM', daysInYard: 5, priority: 'MEDIUM' },
            { id: `BYDU${349012 + i * 29}`, bl: `BL-SSZ-${9024 + i}`, carrier: 'ONE LINE', zone: 'AG - INTER CDEX', type: "20' GP", status: 'EN ROUTE TO CD', daysInYard: 2, priority: 'MEDIUM' }
          ],
          carrierShare: {
            'MSC MEDITERRANEAN': 45,
            'COSCO SHIPPING': 30,
            'CMA CGM': 15,
            'ONE / HAPAG': 10
          },
          zoneBreakdown: yardBreakdown
        }
      });

      // Once remaining balance reaches 0 and no more vessels are arriving in future weeks
      if (rollingBacklog === 0 && i >= maxVesselWeekIdx) {
        zeroBalanceCount++;
        // Display at least 13 weeks (i >= 12) and stop once zero is reached
        if (i >= 12 && zeroBalanceCount >= 1) {
          break;
        }
      }
    }

    return generatedWeeks;
  }, [
    vesselList,
    selectedScenario,
    activeBondedStock,
    activeWarehouseStock,
    activeBufferStock,
    additionalBacklog,
    totalInitialBacklog,
    dailyDeliveryRate,
    dynamicSafeYardCapacity
  ]);

  // D. Dynamic Days-to-Clear Metric & Totals
  const totalProjectedETA = useMemo(() => {
    return vesselList.reduce((acc, v) => acc + (v.containerCount || 0), 0);
  }, [vesselList]);

  const totalVolumeToProcess = useMemo(() => {
    const activeInv = selectedScenario === 'etapa1'
      ? (activeBondedStock + activeWarehouseStock)
      : (totalInitialBacklog);
    const eta = selectedScenario === 'etapa3' ? totalProjectedETA : 0;
    return activeInv + eta + additionalBacklog;
  }, [selectedScenario, activeBondedStock, activeWarehouseStock, totalInitialBacklog, totalProjectedETA, additionalBacklog]);

  const drainDays = dailyDeliveryRate > 0 ? totalVolumeToProcess / dailyDeliveryRate : 0;
  const weeklyDrainCapacity = (dailyDeliveryRate || 140) * 7;

  // Dynamic Peak Yard Risk Point
  const peakPoint = useMemo(() => {
    if (!weeklyData || weeklyData.length === 0) return { week: 'W36', inventoryBalance: 4202 };
    return weeklyData.reduce((max, pt) => pt.inventoryBalance > max.inventoryBalance ? pt : max, weeklyData[0]);
  }, [weeklyData]);

  // Dynamic Clear Week Point
  const clearPoint = useMemo(() => {
    if (!weeklyData || weeklyData.length === 0) return { week: 'W45', days: drainDays };
    const found = weeklyData.find(pt => pt.inventoryBalance <= 0);
    return {
      week: found ? found.week : (weeklyData[weeklyData.length - 1]?.week || 'W46+'),
      days: drainDays
    };
  }, [weeklyData, drainDays]);

  // Daily Dataset for day view
  const dailyData: DailyDataPoint[] = useMemo(() => {
    const baseDate = new Date(2026, 7, 17, 12, 0, 0, 0); // Mon 17/08/2026
    let runningInv = totalInitialBacklog;
    const teusPerBl = 3.2;
    const avgDailyArrival = totalProjectedETA > 0 ? Math.round(totalProjectedETA / 60) : 150;

    const dayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayNamesPt = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const dayNamesZh = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

    const points: DailyDataPoint[] = [];
    for (let d = 0; d < 28; d++) {
      const curDate = new Date(baseDate);
      curDate.setDate(baseDate.getDate() + d);

      const dayOfWeek = curDate.getDay();
      const localizedDay = dt(dayNamesPt[dayOfWeek], dayNamesZh[dayOfWeek], dayNamesEn[dayOfWeek]);
      const dateStr = `${String(curDate.getDate()).padStart(2, '0')}/${String(curDate.getMonth() + 1).padStart(2, '0')}`;
      const dayLabel = `${localizedDay} (${dateStr})`;

      const arrivals = selectedScenario === 'etapa3' ? (d % 3 === 0 ? Math.round(avgDailyArrival * 1.6) : (d % 2 === 0 ? Math.round(avgDailyArrival * 0.9) : Math.round(avgDailyArrival * 0.5))) : 0;
      const drain = Math.min(dailyDeliveryRate, runningInv + arrivals);
      runningInv = Math.max(0, runningInv + arrivals - drain);
      const isCritical = runningInv > 2200;
      const isWarning = runningInv > 1600;

      points.push({
        day: dayLabel,
        dateStr,
        vesselArrivals: arrivals,
        deliveredDrain: drain,
        inventoryBalance: runningInv,
        blVesselArrivals: Math.round(arrivals / teusPerBl),
        blDeliveredDrain: Math.round(drain / teusPerBl),
        blInventoryBalance: Math.round(runningInv / teusPerBl),
        capacityThreshold: dailyDeliveryRate,
        status: isCritical ? 'critical' : isWarning ? 'warning' : 'optimal'
      });
    }

    return points;
  }, [totalInitialBacklog, totalProjectedETA, dailyDeliveryRate, selectedScenario, language]);

  // -------------------------------------------------------------
  // 3. MUTATION HANDLERS (Live Edit Yard & Vessel Data)
  // -------------------------------------------------------------

  const handleUpdateYard = (yardKey: string, field: keyof Yard, value: number) => {
    if (!setYards) return;
    const sanitizedVal = Math.max(0, value);
    setYards(prev => {
      const current = prev[yardKey];
      if (!current) return prev;
      const updated = {
        ...current,
        [field]: sanitizedVal
      };
      setDoc(doc(db, 'yards', yardKey), updated, { merge: true }).catch(err => console.warn('Falha ao sincronizar yard no Firestore:', err));
      return {
        ...prev,
        [yardKey]: updated
      };
    });
  };

  const handleAddVessel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!setVessels || !newVesselName.trim()) return;
    const newId = Date.now();
    const newVesselObj: Vessel = {
      id: newId,
      name: newVesselName.toUpperCase().trim(),
      eta: newVesselEta,
      cntrs: Number(newVesselCntrs) || 100
    };
    setVessels(prev => [...prev, newVesselObj]);
    setDoc(doc(db, 'vessels', String(newId)), newVesselObj).catch(err => console.warn('Falha ao adicionar vessel no Firestore:', err));
    setNewVesselName('');
    setNewVesselCntrs(500);
  };

  const handleRemoveVessel = (vesselId: number) => {
    if (!setVessels) return;
    setVessels(prev => prev.filter(v => v.id !== vesselId));
    deleteDoc(doc(db, 'vessels', String(vesselId))).catch(err => console.warn('Falha ao remover vessel no Firestore:', err));
  };

  const handleUpdateVessel = (vesselId: number, field: keyof Vessel, value: any) => {
    if (!setVessels) return;
    setVessels(prev => prev.map(v => v.id === vesselId ? { ...v, [field]: value } : v));
    setDoc(doc(db, 'vessels', String(vesselId)), { [field]: value }, { merge: true }).catch(err => console.warn('Falha ao atualizar vessel no Firestore:', err));
  };

  // -------------------------------------------------------------
  // 4. EXECUTIVE SCRIPT GENERATION (Live Variables)
  // -------------------------------------------------------------

  const executiveScriptText = useMemo(() => {
    return `================================================================================
EXECUTIVE LOGISTICS CAPACITY ANALYSIS & RECOVERY SCRIPT
BYD AUTO BRAZIL — EXECUTIVE BOARD PRESENTATION
Date: ${new Date().toLocaleDateString('pt-BR')} | Scope: ${totalVolumeToProcess.toLocaleString()} Containers & Vessel Stream
================================================================================

1. THE EXECUTIVE SUMMARY (THE 'WHY')
"Members of the Executive Board:
We are currently managing a high-priority logistics throughput across port, bonded yards, and warehouse receiving operations in Salvador and Camaçari.
Our aggregate volume to process stands at ${totalVolumeToProcess.toLocaleString()} containers (composed of ${totalInitialBacklog.toLocaleString()} containers in active stock across Bonded (${activeBondedStock.toLocaleString()}), Warehouse (${activeWarehouseStock.toLocaleString()}), and Buffer yards (${activeBufferStock.toLocaleString()}), plus ${totalProjectedETA.toLocaleString()} containers across ${vesselList.length} scheduled vessel calls).

At our current factory throughput of ${dailyDeliveryRate} containers per day (${weeklyDrainCapacity.toLocaleString()}/week), our logistics network faces a ${drainDays.toFixed(1)}-day Critical Path (~${Math.ceil(drainDays / 7)} weeks) to drain this volume.
With incoming vessel waves reaching peak volume around ${peakPoint.week} (${peakPoint.inventoryBalance.toLocaleString()} TEUs peak backlog), dynamic clearance is projected for ${clearPoint.week}.
Without proactive fleet and receiving schedule coordination, yard utilization will test safe operating buffers."

--------------------------------------------------------------------------------

2. THE RISK ASSESSMENT (COST OF INACTION)
If the current ${drainDays.toFixed(1)}-day clearance timeline is not compressed:
• Dwell Time & Demurrage: Container dwell times exceeding standard free time thresholds (7–14 days).
• Terminal Saturation: Bonded facilities reaching physical storage limits, creating discharge queuing.
• Production Line Continuity: Component staging buffers must remain fluid to support Camaçari assembly schedules.

--------------------------------------------------------------------------------

3. THE 'ACTION CURVES' (3-TIER OPERATIONAL SOLUTION)

• 🚨 CURVA DE ALERTA DE VOLUME (Pre-Arrival D-30):
  - Trigger: Weekly vessel ETA forecast exceeding 1,400 containers.
  - Action: Proactive pre-allocation of external bonded space (CLIA / Buffer Tercam) 30 days prior to berthing, with dedicated tractor fleet reservation.

• 📦 CURVA DE INFLOW (Arrival D-14):
  - Trigger: Cargo Ready inflow exceeding 1,500 containers/week.
  - Action: Expedited customs clearance via Green Channel fast-tracking and off-dock diversion of non-critical components to secondary staging yards.

• ⚡ CURVA DE DRAIN (Execution D+1):
  - Trigger: Active yard backlog exceeding 2,000 containers.
  - Action: Scale receiving throughput from ${dailyDeliveryRate} containers/day to 300+ containers/day (2,100+/week) to advance clearance horizon to ${clearPoint.week}.
================================================================================`;
  }, [
    totalVolumeToProcess,
    totalInitialBacklog,
    activeBondedStock,
    activeWarehouseStock,
    activeBufferStock,
    totalProjectedETA,
    vesselList.length,
    dailyDeliveryRate,
    weeklyDrainCapacity,
    drainDays,
    peakPoint.week,
    peakPoint.inventoryBalance,
    clearPoint.week
  ]);

  const handleCopyScript = () => {
    navigator.clipboard.writeText(executiveScriptText);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  // Tooltip formatter for Recharts
  const CustomExecutiveTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint: WeeklyDataPoint | DailyDataPoint = payload[0]?.payload;
      const isBL = metricUnit === 'bls';
      const unitLabel = isBL ? 'BLs' : 'CNTRs';

      const arrivals = isBL ? dataPoint.blVesselArrivals : dataPoint.vesselArrivals;
      const drain = isBL ? dataPoint.blDeliveredDrain : dataPoint.deliveredDrain;
      const inventory = isBL ? dataPoint.blInventoryBalance : dataPoint.inventoryBalance;
      const threshold = isBL ? Math.round(dataPoint.capacityThreshold / 3.2) : dataPoint.capacityThreshold;

      const isCongested = arrivals > drain || inventory > (isBL ? 600 : 1800);

      return (
        <div className={`p-4 rounded-xl shadow-2xl border backdrop-blur-md transition-all min-w-[280px] max-w-[340px] z-50 ${
          theme === 'dark'
            ? 'bg-slate-900/95 border-slate-700 text-white'
            : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-300'
        }`}>
          {/* Card Header */}
          <div className="flex items-center justify-between border-b pb-2.5 mb-3 border-gray-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-blue-500/10 text-blue-500 font-mono text-xs font-black">
                {label}
              </span>
              <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                {'dateRange' in dataPoint ? dataPoint.dateRange : ('dateStr' in dataPoint ? dataPoint.dateStr : '')}
              </span>
            </div>
            {isCongested && (
              <span className="flex items-center gap-1 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse">
                <Flame className="w-3 h-3" /> Peak Gap
              </span>
            )}
          </div>

          {/* Breakdown List */}
          <div className="space-y-2.5 text-xs">
            {!showInventoryOnly && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300 font-semibold text-[11px]">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#F87171]" />
                  Vessel Arrivals (Inflow):
                </span>
                <span className="font-mono font-extrabold text-rose-500 text-[13px]">
                  {arrivals.toLocaleString()} <span className="text-[9px] font-normal text-gray-400">{unitLabel}</span>
                </span>
              </div>
            )}

            {!showInventoryOnly && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300 font-semibold text-[11px]">
                  <span className="w-2.5 h-1.5 rounded-full bg-[#10B981]" />
                  Drain Line (Delivered):
                </span>
                <span className="font-mono font-extrabold text-emerald-500 text-[13px]">
                  {drain.toLocaleString()} <span className="text-[9px] font-normal text-gray-400">{unitLabel}</span>
                </span>
              </div>
            )}

            {/* Remaining Inventory Balance */}
            <div className="flex items-center justify-between pt-1 border-t border-dashed border-gray-200 dark:border-slate-800">
              <span className="flex items-center gap-2 font-bold text-gray-800 dark:text-gray-100 text-[11px]">
                <span className="w-2.5 h-2.5 rounded bg-[#8B5CF6]" />
                Remaining Balance (Yard):
              </span>
              <span className="font-mono font-black text-purple-500 text-[14px]">
                {inventory.toLocaleString()} <span className="text-[9px] font-normal text-gray-400">{unitLabel}</span>
              </span>
            </div>

            {/* Baseline Reference */}
            <div className="flex items-center justify-between text-[10px] text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-0.5 bg-slate-400 border-t border-dashed border-slate-400" />
                Drain Rate:
              </span>
              <span className="font-mono font-semibold">{threshold.toLocaleString()} {unitLabel}/wk</span>
            </div>
          </div>

          {/* Quick Action Button inside Tooltip */}
          {'drilldown' in dataPoint && (
            <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-slate-800">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveDrilldownWeek(dataPoint as WeeklyDataPoint);
                }}
                className="w-full py-1.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-[10.5px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95"
              >
                <span>Ver Detalhes do Navio / Pátio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`p-5 rounded-2xl border transition-all relative ${
      theme === 'dark'
        ? 'bg-[#111827]/90 border-slate-800 text-slate-100 shadow-xl'
        : 'bg-white border-slate-200 text-slate-900 shadow-lg'
    }`}>
      {/* 1. COMPONENT HEADER & ACTIONS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500/20 via-amber-500/20 to-emerald-500/20 text-rose-500 border border-rose-500/30">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-sm md:text-base tracking-tight text-gray-900 dark:text-white uppercase">
                  {dt(
                    'ANÁLISE DE CHEGADA DE NAVIOS & ESCOAMENTO DE ESTOQUE: Entrada, Descarga e Saldo de Pátios',
                    '动态船期到港与工厂出清对比及库存平衡分析',
                    'VESSEL ARRIVALS & STOCK DRAIN ANALYSIS: Inflow, Discharge & Inventory Balance'
                  )}
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  <Zap className="w-3 h-3" /> {dt('Motor Reativo', '实时响应引擎', 'Reactive Engine')}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {dt(
                  'Capacidade semanal de chegada de navios vs estoques ativos em pátio (Alfandegados, Armazéns, Buffer) e velocidade de escoamento da fábrica.',
                  '每周船舶到港承载量 vs 活跃堆场库存（保税仓、普通仓、缓冲区）及工厂出清速度对比分析。',
                  'Weekly vessel arrival capacity vs active yard stocks (Bonded, Warehouses, Buffer) and factory drain velocity.'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Top Right Executive Controls & Presentation Trigger */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Live Data Editor Modal Trigger */}
          <button
            type="button"
            onClick={() => setIsDataEditorOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 transition-all active:scale-95 cursor-pointer shadow-3xs"
            title={dt('Editar valores de Pátio e Escala de Navios em tempo real', '实时编辑堆场及船舶靠泊数据', 'Edit Yard and Vessel ETA data in real time')}
          >
            <Edit3 className="w-3.5 h-3.5 text-blue-500" />
            <span>{dt('Editar Estoques & Navios', '编辑库存及船期', 'Edit Stocks & Vessels')}</span>
          </button>

          {/* AI Presentation Script Modal Trigger */}
          <button
            type="button"
            id="executive-ai-script-button"
            onClick={() => setIsAiScriptModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black shadow-md shadow-blue-500/20 hover:shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-spin" style={{ animationDuration: '3s' }} />
            <span>{dt('Resumir com IA / Script Executivo', 'AI 执行简报及汇报脚本', 'AI Executive Summary & Script')}</span>
          </button>
        </div>
      </div>

      {/* 2. EXECUTIVE METRIC KPI BADGES (MATCHING UPLOADED SLIDE / PRESENTATION) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 my-4">
        {/* 1. Bonded */}
        <div className={`p-3 rounded-xl border relative overflow-hidden transition-all hover:scale-[1.02] ${
          theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-blue-50/40 border-blue-100'
        }`}>
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-[10px] uppercase font-extrabold">
            <span>{dt('BONDED (ALFANDEGADOS)', '保税堆场 (BONDED)', 'BONDED YARDS')}</span>
            <Building2 className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400">{activeBondedStock.toLocaleString()}</span>
            <span className="text-[10px] font-bold text-gray-400">CNTRs</span>
          </div>
          <span className="text-[9px] text-gray-400 block mt-1 truncate" title={yardStockList.filter(y => y.category === 'BONDED').map(y => y.name).join(' • ')}>
            {yardStockList.filter(y => y.category === 'BONDED').map(y => y.name).join(' • ') || 'TECON • INTERMARÍTIMA • TPC • CLIA'}
          </span>
        </div>

        {/* 2. Warehouses */}
        <div className={`p-3 rounded-xl border relative overflow-hidden transition-all hover:scale-[1.02] ${
          theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-indigo-50/40 border-indigo-100'
        }`}>
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-[10px] uppercase font-extrabold">
            <span>{dt('WAREHOUSES (GERAIS)', '普通仓库 (WAREHOUSES)', 'GENERAL WAREHOUSES')}</span>
            <Warehouse className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">{activeWarehouseStock.toLocaleString()}</span>
            <span className="text-[10px] font-bold text-gray-400">CNTRs</span>
          </div>
          <span className="text-[9px] text-gray-400 block mt-1 truncate" title={yardStockList.filter(y => y.category === 'WAREHOUSE').map(y => y.name).join(' • ')}>
            {yardStockList.filter(y => y.category === 'WAREHOUSE').map(y => y.name).join(' • ') || 'AG INTER CDEX • CTS'}
          </span>
        </div>

        {/* 3. BYD Buffer */}
        <div className={`p-3 rounded-xl border relative overflow-hidden transition-all hover:scale-[1.02] ${
          theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-teal-50/40 border-teal-100'
        }`}>
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-[10px] uppercase font-extrabold">
            <span>{dt('BYD BUFFER (PROLONGADO)', '比亚迪智能缓冲区', 'BYD BUFFER')}</span>
            <Layers className="w-3.5 h-3.5 text-teal-500" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className="text-2xl font-black font-mono text-teal-600 dark:text-teal-400">{activeBufferStock.toLocaleString()}</span>
            <span className="text-[10px] font-bold text-gray-400">CNTRs</span>
          </div>
          <span className="text-[9px] text-gray-400 block mt-1 truncate" title={yardStockList.filter(y => y.category === 'BUFFER').map(y => y.name).join(' • ')}>
            {yardStockList.filter(y => y.category === 'BUFFER').map(y => y.name).join(' • ') || 'BYD BUFFER'}
          </span>
        </div>

        {/* 4. Total Projected Volume */}
        <div className={`p-3 rounded-xl border relative overflow-hidden transition-all hover:scale-[1.02] ${
          theme === 'dark' ? 'bg-purple-950/20 border-purple-800/40' : 'bg-purple-50/50 border-purple-200'
        }`}>
          <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 text-[10px] uppercase font-extrabold">
            <span>{dt('TOTAL PROJETADO (ETA)', '预计总到港量 (ETA)', 'TOTAL PROJECTED (ETA)')}</span>
            <Ship className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400">{totalProjectedETA.toLocaleString()}</span>
            <span className="text-[10px] font-bold text-purple-400">CNTRs</span>
          </div>
          <span className="text-[9px] text-purple-500 dark:text-purple-400 block mt-1 font-bold">
            {vesselList.length} {vesselList.length === 1 ? dt('Navio Agendado', '艘计划靠港', 'Scheduled Vessel') : dt('Navios Agendados', '艘计划靠港', 'Scheduled Vessels')}
          </span>
        </div>

        {/* 5. Cumulative Peak Yard Risk */}
        <div className={`p-3 rounded-xl border relative overflow-hidden transition-all hover:scale-[1.02] col-span-2 sm:col-span-1 ${
          peakPoint.inventoryBalance > 3000
            ? (theme === 'dark' ? 'bg-rose-950/20 border-rose-800/40' : 'bg-rose-50/60 border-rose-200')
            : (theme === 'dark' ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-emerald-50/60 border-emerald-200')
        }`}>
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 text-[10px] uppercase font-extrabold">
            <span>{dt('PICO DE RISCO EM PÁTIO', '堆场最高风险峰值', 'PEAK YARD RISK')}</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
              {peakPoint.inventoryBalance.toLocaleString()}
            </span>
            <span className="text-[10px] font-bold text-rose-500">CNTRs ({peakPoint.week})</span>
          </div>
          <span className="text-[9px] text-gray-500 dark:text-gray-400 block mt-1 font-bold">
            {dt('Capacidade Segura:', '安全承载容量:', 'Safe Capacity:')} {dynamicSafeYardCapacity.toLocaleString()} CNTRs
          </span>
        </div>
      </div>

      {/* DYNAMIC WEEKS TO CLEAR / CRITICAL PATH INDICATOR BANNER */}
      <div className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 mb-4 ${
        dailyDeliveryRate <= 220
          ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40'
          : dailyDeliveryRate < 290
            ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40'
            : 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40'
      }`}>
        <div className="flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <div>
            <div className="text-xs font-black uppercase tracking-wider flex items-center gap-2 flex-wrap">
              <span className="text-gray-800 dark:text-gray-200">
                {dt('Tempo Estimado para Escoar (Weeks to Clear):', '预计出清周期 (Weeks to Clear):', 'Estimated Drain Time (Weeks to Clear):')}
              </span>
              <span className="font-mono px-2 py-0.5 rounded bg-white dark:bg-slate-900 font-black border text-indigo-600 dark:text-indigo-400 text-xs shadow-xs">
                ~{drainDays.toFixed(1)} {dt('dias', '天', 'days')} ({Math.ceil(drainDays / 7)} {dt('semanas', '周', 'weeks')} — {dt('Escoa em', '出清于', 'Clears in')} {clearPoint.week})
              </span>
            </div>
            <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5">
              {dailyDeliveryRate <= 220 && dt(
                `Taxa Atual de ${dailyDeliveryRate} CNTRs/dia (${weeklyDrainCapacity.toLocaleString()}/sem): ~${drainDays.toFixed(1)} dias (Escoa em ${clearPoint.week}) — Risco Elevado de Demurrage.`,
                `当前出清速率 ${dailyDeliveryRate} 箱/天 (${weeklyDrainCapacity.toLocaleString()}/周): ~${drainDays.toFixed(1)} 天 (预计 ${clearPoint.week} 出清) — 存在滞期费风险。`,
                `Current Rate of ${dailyDeliveryRate} CNTRs/day (${weeklyDrainCapacity.toLocaleString()}/wk): ~${drainDays.toFixed(1)} days (Clears by ${clearPoint.week}) — High Demurrage Risk.`
              )}
              {dailyDeliveryRate > 220 && dailyDeliveryRate < 290 && dt(
                `Taxa Intermediária de ${dailyDeliveryRate} CNTRs/dia (${weeklyDrainCapacity.toLocaleString()}/sem): ~${drainDays.toFixed(1)} dias (Escoa em ${clearPoint.week}) — Ritmo Balanceado.`,
                `中等出清速率 ${dailyDeliveryRate} 箱/天 (${weeklyDrainCapacity.toLocaleString()}/周): ~${drainDays.toFixed(1)} 天 (预计 ${clearPoint.week} 出清) — 节奏平衡。`,
                `Intermediate Rate of ${dailyDeliveryRate} CNTRs/day (${weeklyDrainCapacity.toLocaleString()}/wk): ~${drainDays.toFixed(1)} days (Clears by ${clearPoint.week}) — Balanced Pace.`
              )}
              {dailyDeliveryRate >= 290 && dt(
                `Taxa Acelerada de ${dailyDeliveryRate} CNTRs/dia (${weeklyDrainCapacity.toLocaleString()}/sem): ~${drainDays.toFixed(1)} dias (Escoa em ${clearPoint.week}) — Meta Segura Recomendada.`,
                `加速出清速率 ${dailyDeliveryRate} 箱/天 (${weeklyDrainCapacity.toLocaleString()}/周): ~${drainDays.toFixed(1)} 天 (预计 ${clearPoint.week} 出清) — 推荐安全目标。`,
                `Accelerated Rate of ${dailyDeliveryRate} CNTRs/day (${weeklyDrainCapacity.toLocaleString()}/wk): ~${drainDays.toFixed(1)} days (Clears by ${clearPoint.week}) — Recommended Safe Target.`
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${
            dailyDeliveryRate <= 220
              ? 'bg-rose-600 text-white'
              : dailyDeliveryRate < 290
                ? 'bg-amber-600 text-white'
                : 'bg-emerald-600 text-white'
          }`}>
            {dailyDeliveryRate <= 220 ? dt('Risco Crítico', '严重风险', 'Critical Risk') : dailyDeliveryRate < 290 ? dt('Atenção', '注意', 'Caution') : dt('Meta Segura', '安全目标', 'Safe Target')}
          </span>
        </div>
      </div>

      {/* 3. INTERACTIVE CONTROL TOOLBAR & DRAIN SLIDER */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/60 mb-4">
        {/* Navigation / Sub-view Pills */}
        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-lg border border-gray-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setActiveTabSubView('chart')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTabSubView === 'chart'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {dt('Gráfico de Inflow & Drain', '到港与出清图表', 'Inflow & Drain Chart')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTabSubView('steps')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTabSubView === 'steps'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {dt('Cálculo Passo a Passo', '逐步计算明细', 'Step-by-Step Table')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTabSubView('curves')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTabSubView === 'curves'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {dt('Curvas de Ação (D-30 / D-14 / D+1)', '行动曲线 (D-30 / D-14 / D+1)', 'Action Curves (D-30 / D-14 / D+1)')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTabSubView('risk')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTabSubView === 'risk'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {dt('Matriz de Risco & Dial', '风险矩阵与仪表盘', 'Risk Matrix & Dial')}
          </button>
        </div>

        {/* Drain Slider & Presets */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700">
            <Sliders className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
              {dt('Taxa de Escoamento:', '出清速率:', 'Drain Rate:')}
            </span>
            <input
              type="range"
              min="50"
              max="500"
              step="10"
              value={dailyDeliveryRate}
              onChange={(e) => setDailyDeliveryRate(Number(e.target.value))}
              className="w-24 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <span className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              {dailyDeliveryRate}/{dt('dia', '天', 'day')}
            </span>
          </div>

          {/* Quick preset buttons */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-gray-200 dark:border-slate-700">
            {[150, 210, 260, 300, 350].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => setDailyDeliveryRate(rate)}
                className={`px-2 py-0.5 text-[10px] font-black rounded transition-all cursor-pointer ${
                  dailyDeliveryRate === rate
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                {rate}
              </button>
            ))}
          </div>

          {/* Granularity Toggle: Days vs Weeks */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-gray-200 dark:border-slate-700 text-xs">
            <button
              type="button"
              id="granularity-weeks-btn"
              onClick={() => setGranularity('weeks')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                granularity === 'weeks'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {dt('Semanas', '按周', 'Weeks')} (W34–{weeklyData[weeklyData.length - 1]?.week || 'W46'})
            </button>
            <button
              type="button"
              id="granularity-days-btn"
              onClick={() => setGranularity('days')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                granularity === 'days'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {dt('Dias (Diário)', '按日 (明细)', 'Days (Daily)')}
            </button>
          </div>
        </div>
      </div>

      {/* 4. MAIN CHART SUB-VIEW */}
      {activeTabSubView === 'chart' && (
        <div className="space-y-4">
          <div className="h-[360px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={(granularity === 'weeks' ? weeklyData : dailyData) as any}
                margin={{ top: 20, right: 25, left: 10, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="vesselInflowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F87171" stopOpacity={0.85} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0.7} />
                  </linearGradient>
                  <linearGradient id="purpleAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#334155' : '#E2E8F0'} />

                <XAxis
                  dataKey={granularity === 'weeks' ? 'week' : 'day'}
                  tick={{ fill: theme === 'dark' ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 'bold' }}
                  tickLine={false}
                />

                <YAxis
                  yAxisId="left"
                  tick={{ fill: theme === 'dark' ? '#94A3B8' : '#64748B', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => v.toLocaleString()}
                  label={{
                    value: metricUnit === 'bls' ? dt('Volume (BLs)', '单证量 (BLs)', 'Volume (BLs)') : dt('Volume (CNTRs)', '箱量 (CNTRs)', 'Volume (CNTRs)'),
                    angle: -90,
                    position: 'insideLeft',
                    fill: theme === 'dark' ? '#94A3B8' : '#64748B',
                    fontSize: 10,
                    fontWeight: 'bold',
                    offset: 0
                  }}
                />

                <Tooltip content={<CustomExecutiveTooltip />} />

                <Legend
                  verticalAlign="top"
                  height={36}
                  iconType="circle"
                  formatter={(value) => (
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{value}</span>
                  )}
                />

                {/* Safe yard threshold reference line */}
                <ReferenceLine
                  yAxisId="left"
                  y={dynamicSafeYardCapacity}
                  stroke="#F59E0B"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: `${dt('Capacidade Segura', '安全容量', 'Safe Capacity')} (${dynamicSafeYardCapacity.toLocaleString()} CNTRs)`,
                    fill: '#F59E0B',
                    fontSize: 10,
                    fontWeight: 'bold',
                    position: 'top'
                  }}
                />

                {/* Shaded Area for Remaining Backlog Balance */}
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey={metricUnit === 'bls' ? 'blInventoryBalance' : 'inventoryBalance'}
                  name={dt('Área de Backlog Acumulado', '累计库存积压面积', 'Cumulative Yard Backlog Area')}
                  fill="url(#purpleAreaGrad)"
                  stroke="none"
                />

                {/* Bar for Vessel Inflow */}
                {!showInventoryOnly && (
                  <Bar
                    yAxisId="left"
                    dataKey={metricUnit === 'bls' ? 'blVesselArrivals' : 'vesselArrivals'}
                    name={dt('Chegada de Navios (Inflow ETA)', '船舶到港 (Inflow ETA)', 'Vessel Arrivals (Inflow ETA)')}
                    fill="url(#vesselInflowGrad)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={45}
                  />
                )}

                {/* Drain Line (Green) */}
                {!showInventoryOnly && (
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey={metricUnit === 'bls' ? 'blDeliveredDrain' : 'deliveredDrain'}
                    name={dt('Linha de Escoamento / Drain', '出清曲线 / Drain Line', 'Drain Line (Delivered)')}
                    stroke="#10B981"
                    strokeWidth={2.5}
                    strokeDasharray="5 5"
                    dot={{ r: 4, fill: '#10B981', stroke: '#fff', strokeWidth: 1.5 }}
                    activeDot={{ r: 6 }}
                  />
                )}

                {/* Cumulative Backlog Balance Curve (Purple) - NEVER zero while incoming vessels remain */}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey={metricUnit === 'bls' ? 'blInventoryBalance' : 'inventoryBalance'}
                  name={dt('Saldo Restante (Backlog Pátio)', '堆场剩余库存 (Yard Balance)', 'Remaining Balance (Yard Backlog)')}
                  stroke="#8B5CF6"
                  strokeWidth={3.5}
                  dot={{ r: 4.5, fill: '#8B5CF6', stroke: '#fff', strokeWidth: 1.5 }}
                  activeDot={{ r: 7 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Scenario & Controls Bar at Chart Base */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-200 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-500 dark:text-gray-400">
                {dt('Cenário Ativo:', '当前推演场景:', 'Active Scenario:')}
              </span>
              <div className="flex rounded-lg border border-gray-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedScenario && setSelectedScenario('etapa1')}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                    selectedScenario === 'etapa1' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                  }`}
                >
                  {dt('Etapa 1 (Pátios + CDs)', '阶段一 (保税+外仓)', 'Stage 1 (Yards + CDs)')}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedScenario && setSelectedScenario('etapa2')}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                    selectedScenario === 'etapa2' ? 'bg-amber-600 text-white' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                  }`}
                >
                  {dt('Etapa 2 (+ Buffer)', '阶段二 (+缓冲区)', 'Stage 2 (+ Buffer)')}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedScenario && setSelectedScenario('etapa3')}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                    selectedScenario === 'etapa3' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                  }`}
                >
                  {dt('Etapa 3 (+ Navios ETA)', '阶段三 (+船期ETA)', 'Stage 3 (+ Vessel ETA)')}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-rose-500" />
                <span>Inflow: <strong>{totalProjectedETA.toLocaleString()} CNTRs</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
                <span>Drain: <strong>{weeklyDrainCapacity.toLocaleString()} CNTRs/{dt('sem', '周', 'wk')}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-purple-500" />
                <span>{dt('Pico:', '峰值:', 'Peak:')} <strong>{peakPoint.inventoryBalance.toLocaleString()} CNTRs ({peakPoint.week})</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. STEP-BY-STEP CALCULATION TABLE SUB-VIEW */}
      {activeTabSubView === 'steps' && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-xl text-xs flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>
              <strong>{dt('Fórmula Exata de Recálculo Contínuo:', '持续重计算精确公式:', 'Exact Continuous Recalculation Formula:')}</strong> {dt(
                `Saldo Restante [Semana] = Saldo Inicial [Semana] + Inflow Navios [Semana] - Capacidade de Escoamento (min(Volume Disponível, ${weeklyDrainCapacity.toLocaleString()}/sem)).`,
                `期末剩余库存 [第N周] = 期初库存 [第N周] + 船舶到港量 [第N周] - 出清能力 (min(可用箱量, 每周 ${weeklyDrainCapacity.toLocaleString()} 箱)).`,
                `Ending Balance [Week] = Starting Inventory [Week] + Vessel Inflow [Week] - Drain Capacity (min(Available Volume, ${weeklyDrainCapacity.toLocaleString()}/wk)).`
              )}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 dark:bg-slate-800 text-[10px] uppercase text-gray-500 font-extrabold">
                <tr>
                  <th className="p-3">{dt('Semana', '周次', 'Week')}</th>
                  <th className="p-3">{dt('Período', '时间段', 'Period')}</th>
                  <th className="p-3 text-right">{dt('Estoque Inicial (+)', '期初库存 (+)', 'Starting Inventory (+)')}</th>
                  <th className="p-3 text-right">{dt('Inflow Navios (+)', '船舶到港 (+)', 'Vessel Inflow (+)')}</th>
                  <th className="p-3 text-right">{dt('Volume Disponível', '可用总箱量', 'Available Volume')}</th>
                  <th className="p-3 text-right">{dt('Escoamento (-)', '工厂出清 (-)', 'Drain Delivery (-)')}</th>
                  <th className="p-3 text-right font-black text-purple-600 dark:text-purple-400">{dt('Saldo Final (=)', '期末结余 (=)', 'Ending Balance (=)')}</th>
                  <th className="p-3 text-center">{dt('Status Pátio', '堆场状态', 'Yard Status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-mono">
                {weeklyData.map((row) => (
                  <tr key={row.week} className="hover:bg-gray-50 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-bold text-blue-600 dark:text-blue-400">{row.week}</td>
                    <td className="p-3 font-sans text-gray-500 dark:text-gray-400">{row.dateRange}</td>
                    <td className="p-3 text-right text-gray-700 dark:text-gray-300">{row.startingInventory.toLocaleString()}</td>
                    <td className="p-3 text-right font-bold text-rose-500">+{row.vesselArrivals.toLocaleString()}</td>
                    <td className="p-3 text-right text-gray-800 dark:text-gray-200 font-bold">{row.balanceBeforeDrain.toLocaleString()}</td>
                    <td className="p-3 text-right font-bold text-emerald-500">-{row.deliveredDrain.toLocaleString()}</td>
                    <td className="p-3 text-right font-black text-purple-600 dark:text-purple-400 text-sm">
                      {row.inventoryBalance.toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9.5px] font-black uppercase ${
                        row.status === 'critical'
                          ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                          : row.status === 'warning'
                            ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                      }`}>
                        {row.status === 'critical' ? dt('Pico Crítico', '严重峰值', 'Critical Peak') : row.status === 'warning' ? dt('Atenção', '注意预警', 'Caution') : dt('Normal', '平稳正常', 'Normal')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. OPERATIONAL ACTION CURVES SUB-VIEW */}
      {activeTabSubView === 'curves' && (
        <div className="space-y-4">
          <div className="flex gap-2 border-b border-gray-200 dark:border-slate-800 pb-2">
            <button
              type="button"
              onClick={() => setActiveActionCurve('alert')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeActionCurve === 'alert' ? 'bg-amber-500 text-white' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {dt('1. Curva de Alerta (D-30)', '1. 预警曲线 (D-30)', '1. Alert Curve (D-30)')}
            </button>
            <button
              type="button"
              onClick={() => setActiveActionCurve('inflow')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeActionCurve === 'inflow' ? 'bg-orange-500 text-white' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {dt('2. Curva de Inflow (D-14)', '2. 到港清关曲线 (D-14)', '2. Inflow Curve (D-14)')}
            </button>
            <button
              type="button"
              onClick={() => setActiveActionCurve('drain')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeActionCurve === 'drain' ? 'bg-emerald-500 text-white' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {dt('3. Curva de Drain (D+1)', '3. 出清提货曲线 (D+1)', '3. Drain Curve (D+1)')}
            </button>
          </div>

          {activeActionCurve === 'alert' && (
            <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 space-y-2 text-xs">
              <h4 className="font-black text-amber-600 dark:text-amber-400 text-sm uppercase">
                {dt('Curva de Alerta de Volume (Gatilho D-30)', '吞吐量预警曲线 (D-30 触发机制)', 'Volume Alert Curve (D-30 Trigger)')}
              </h4>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>{dt('Gatilho Operacional:', '操作触发点:', 'Operational Trigger:')}</strong> {dt(
                  'Previsão de chegada semanal superior a 1.400 CNTRs em escala ETA.',
                  '根据船舶 ETA 预报，单周到港量超过 1,400 箱。',
                  'Weekly projected arrival exceeding 1,400 containers based on ETA schedule.'
                )}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>{dt('Ação Estratégica:', '战略应对措施:', 'Strategic Action:')}</strong> {dt(
                  'Pré-reserva de janelas alfandegadas externas (CLIA Empório / Buffer Tercam) com 30 dias de antecedência e contratação de carretas dedicadas para tracionamento rápido.',
                  '提前 30 天向外部保税仓（CLIA Empório / Tercam 缓冲区）预订堆存窗口，并锁定专属拖车运力以保障快速疏港。',
                  'Pre-reserve external bonded buffer capacity (CLIA Empório / Buffer Tercam) 30 days ahead and lock dedicated trucking capacity.'
                )}
              </p>
            </div>
          )}

          {activeActionCurve === 'inflow' && (
            <div className="p-4 rounded-xl border border-orange-200 dark:border-orange-900/40 bg-orange-50/40 dark:bg-orange-950/20 space-y-2 text-xs">
              <h4 className="font-black text-orange-600 dark:text-orange-400 text-sm uppercase">
                {dt('Curva de Inflow & Desembaraço (Gatilho D-14)', '进港与清关加速曲线 (D-14 触发机制)', 'Inflow & Customs Clearance Curve (D-14 Trigger)')}
              </h4>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>{dt('Gatilho Operacional:', '操作触发点:', 'Operational Trigger:')}</strong> {dt(
                  'Atracação confirmada e volume em canal verde/amarelo superior a 1.500 CNTRs/semana.',
                  '靠泊计划确认且绿/黄色通道放行量超过 1,500 箱/周。',
                  'Berthing confirmed and green/yellow channel clearance volume exceeding 1,500 CNTRs/week.'
                )}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>{dt('Ação Estratégica:', '战略应对措施:', 'Strategic Action:')}</strong> {dt(
                  'Priorização aduaneira para peças críticas de produção e desvio imediato de SKUs de menor giro para pátios satélites a fim de desobstruir o fluxo de fábrica.',
                  '优先清关生产急需关键零部件，将低周转 SKU 立即分流至外围卫星堆场，以全力保障主工厂物料通畅。',
                  'Prioritize customs clearance for critical production SKUs and divert slower SKUs to satellite yards to maintain factory flow.'
                )}
              </p>
            </div>
          )}

          {activeActionCurve === 'drain' && (
            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2 text-xs">
              <h4 className="font-black text-emerald-600 dark:text-emerald-400 text-sm uppercase">
                {dt('Curva de Escoamento & Execução (Gatilho D+1)', '出清与工厂提货执行曲线 (D+1 触发机制)', 'Drain & Factory Receiving Execution Curve (D+1 Trigger)')}
              </h4>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>{dt('Gatilho Operacional:', '操作触发点:', 'Operational Trigger:')}</strong> {dt(
                  'Acúmulo de estoque em pátio superior a 2.000 CNTRs.',
                  '堆场实际滞留库存总量超过 2,000 箱。',
                  'Cumulative yard inventory accumulation exceeding 2,000 containers.'
                )}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>{dt('Ação Estratégica:', '战略应对措施:', 'Strategic Action:')}</strong> {dt(
                  `Elevar a capacidade diária de recebimento de ${dailyDeliveryRate} para 300+ CNTRs/dia (2.100+/sem), antecipando a data final de escoamento para ${clearPoint.week}.`,
                  `将工厂日接卸能力从当前 ${dailyDeliveryRate} 箱提升至 300+ 箱/天 (2,100+ 箱/周)，将出清完成日期提前至 ${clearPoint.week}。`,
                  `Elevate daily factory receiving from ${dailyDeliveryRate} to 300+ CNTRs/day (2,100+/wk), advancing final clearance to ${clearPoint.week}.`
                )}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 7. RISK MATRIX SUB-VIEW */}
      {activeTabSubView === 'risk' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/10 space-y-2">
            <h4 className="font-black text-rose-600 dark:text-rose-400 uppercase flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" /> {dt('Risco de Demurrage', '滞期费风险 (Demurrage)', 'Demurrage Risk')}
            </h4>
            <p className="text-gray-700 dark:text-gray-300">
              {dt(
                `Contêineres com permanência superior a 14 dias geram sobrestadia diária. O escoamento a ${dailyDeliveryRate}/dia projeta eliminação do risco em ${clearPoint.week}.`,
                `滞留超过 14 天的集装箱将产生高昂超期使用费。按 ${dailyDeliveryRate} 箱/天的速率，预计将在 ${clearPoint.week} 完全解除滞期风险。`,
                `Containers staying over 14 days incur daily demurrage fees. Draining at ${dailyDeliveryRate}/day projects risk elimination by ${clearPoint.week}.`
              )}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/10 space-y-2">
            <h4 className="font-black text-amber-600 dark:text-amber-400 uppercase flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> {dt('Ocupação de Pátio', '堆场占用负荷', 'Yard Occupancy')}
            </h4>
            <p className="text-gray-700 dark:text-gray-300">
              {dt(
                `Taxa de ocupação atual em ${activeOccupancyRate}% da capacidade total (${dynamicYardMaxCapacity.toLocaleString()} CNTRs). Pico previsto em ${peakPoint.week} (${peakPoint.inventoryBalance.toLocaleString()} CNTRs).`,
                `当前堆场总占用率为 ${activeOccupancyRate}% (总容量 ${dynamicYardMaxCapacity.toLocaleString()} CNTRs)。预计峰值将于 ${peakPoint.week} 达到 ${peakPoint.inventoryBalance.toLocaleString()} CNTRs。`,
                `Current yard occupancy is ${activeOccupancyRate}% of total capacity (${dynamicYardMaxCapacity.toLocaleString()} CNTRs). Projected peak in ${peakPoint.week} (${peakPoint.inventoryBalance.toLocaleString()} CNTRs).`
              )}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/10 space-y-2">
            <h4 className="font-black text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" /> {dt('Meta Recomendada', '推荐控制目标', 'Recommended Target')}
            </h4>
            <p className="text-gray-700 dark:text-gray-300">
              {dt(
                'Manter capacidade em 300 CNTRs/dia estabiliza a operação em menos de 50 dias com folga operacional segura para os navios seguintes.',
                '将接卸能力稳定在 300 箱/天以上，可在 50 天内平稳出清存量，并为后续到港船只预留安全操作余量。',
                'Maintaining 300 CNTRs/day throughput stabilizes the operation in under 50 days with safe buffer for upcoming vessels.'
              )}
            </p>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 8. LIVE DATA EDITOR MODAL (YARDS & VESSELS MUTATION) */}
      {/* ------------------------------------------------------------- */}
      {isDataEditorOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-4xl max-h-[85vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden transition-all ${
            theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Modal Header */}
            <div className="p-4 border-b flex items-center justify-between border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-600 text-white">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-sm uppercase">
                    {dt('Gerenciador Interativo de Estoques e Navios ETA', '堆场库存与船期动态编辑器', 'Interactive Yard Stock & Vessel ETA Manager')}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {dt('Modifique capacidades, contêineres e escalas de navios com recálculo instantâneo no gráfico.', '修改堆场容量、在场箱量与船舶到港计划，图表实时重新计算。', 'Modify capacities, containers, and vessel schedules with real-time recalculation.')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDataEditorOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Buttons */}
            <div className="flex border-b border-gray-200 dark:border-slate-800 px-4 bg-gray-50 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setEditorTab('yards')}
                className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                  editorTab === 'yards'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>{dt('Pátios & Armazéns', '堆场与外仓', 'Yards & Warehouses')} ({yardStockList.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setEditorTab('vessels')}
                className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                  editorTab === 'vessels'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <Ship className="w-4 h-4" />
                <span>{dt('Escala de Navios ETA', '船舶到港船期', 'Vessel ETA Schedule')} ({vesselList.length})</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {editorTab === 'yards' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(Object.entries(yards || {}) as [string, Yard][]).map(([key, yard]) => (
                      <div
                        key={key}
                        className="p-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-800/40 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-gray-900 dark:text-white uppercase">{yard.name}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold ${
                            yard.type === 'BONDED' ? 'bg-blue-500/10 text-blue-500' : yard.type === 'BUFFER' ? 'bg-teal-500/10 text-teal-500' : 'bg-indigo-500/10 text-indigo-500'
                          }`}>
                            {yard.type}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <label className="text-[10px] text-gray-500 block">{dt('Capacidade:', '总容量:', 'Capacity:')}</label>
                            <input
                              type="number"
                              value={yard.capacity || 0}
                              onChange={(e) => handleUpdateYard(key, 'capacity', Number(e.target.value))}
                              className="w-full p-1.5 bg-white dark:bg-slate-900 border rounded font-mono text-xs font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 block">{dt('Cheios (Full):', '重箱 (Full):', 'Full (Loaded):')}</label>
                            <input
                              type="number"
                              value={yard.cheio || 0}
                              onChange={(e) => handleUpdateYard(key, 'cheio', Number(e.target.value))}
                              className="w-full p-1.5 bg-white dark:bg-slate-900 border rounded font-mono text-xs font-bold text-blue-600 dark:text-blue-400"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 block">{dt('Vazios (Empty):', '空箱 (Empty):', 'Empty:')}</label>
                            <input
                              type="number"
                              value={yard.vazio || 0}
                              onChange={(e) => handleUpdateYard(key, 'vazio', Number(e.target.value))}
                              className="w-full p-1.5 bg-white dark:bg-slate-900 border rounded font-mono text-xs font-bold"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Add New Vessel Form */}
                  <form onSubmit={handleAddVessel} className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20 space-y-3">
                    <h5 className="font-bold text-xs text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5" /> {dt('Adicionar Navio à Escala ETA', '新增船舶到港计划', 'Add Vessel to ETA Schedule')}
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
                      <div>
                        <label className="text-[10px] text-gray-500 block font-semibold">{dt('Nome do Navio:', '船名:', 'Vessel Name:')}</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: MSC SANTOS"
                          value={newVesselName}
                          onChange={(e) => setNewVesselName(e.target.value)}
                          className="w-full p-1.5 bg-white dark:bg-slate-900 border rounded text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 block font-semibold">{dt('Data ETA:', '预报到港日:', 'ETA Date:')}</label>
                        <input
                          type="date"
                          required
                          value={newVesselEta}
                          onChange={(e) => setNewVesselEta(e.target.value)}
                          className="w-full p-1.5 bg-white dark:bg-slate-900 border rounded font-mono text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 block font-semibold">{dt('Contêineres (CNTRs):', '箱量 (CNTRs):', 'Containers (CNTRs):')}</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={newVesselCntrs}
                          onChange={(e) => setNewVesselCntrs(Number(e.target.value))}
                          className="w-full p-1.5 bg-white dark:bg-slate-900 border rounded font-mono text-xs font-bold text-rose-500"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="submit"
                          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{dt('Adicionar', '添加', 'Add')}</span>
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* Existing Vessels List */}
                  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-100 dark:bg-slate-800 text-[10px] uppercase text-gray-500 font-extrabold">
                        <tr>
                          <th className="p-2.5">{dt('Navio', '船名', 'Vessel')}</th>
                          <th className="p-2.5">{dt('Data ETA', '到港日期', 'ETA Date')}</th>
                          <th className="p-2.5 text-right">{dt('Contêineres', '集装箱量', 'Containers')}</th>
                          <th className="p-2.5 text-center">{dt('Ações', '操作', 'Actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                        {vessels.map((v) => (
                          <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40">
                            <td className="p-2.5 font-bold text-gray-800 dark:text-gray-200">
                              <input
                                type="text"
                                value={v.name}
                                onChange={(e) => handleUpdateVessel(v.id, 'name', e.target.value)}
                                className="p-1 bg-transparent border-b border-dashed border-gray-300 dark:border-slate-700 font-bold text-xs"
                              />
                            </td>
                            <td className="p-2.5 font-mono text-gray-500">
                              <input
                                type="text"
                                value={v.eta}
                                onChange={(e) => handleUpdateVessel(v.id, 'eta', e.target.value)}
                                className="p-1 bg-transparent border-b border-dashed border-gray-300 dark:border-slate-700 font-mono text-xs w-28"
                              />
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-rose-500">
                              <input
                                type="number"
                                value={v.cntrs}
                                onChange={(e) => handleUpdateVessel(v.id, 'cntrs', Number(e.target.value))}
                                className="p-1 bg-transparent border-b border-dashed border-gray-300 dark:border-slate-700 font-mono font-bold text-xs text-right w-24"
                              />
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveVessel(v.id)}
                                className="p-1 text-gray-400 hover:text-rose-500 transition-colors cursor-pointer"
                                title={dt('Remover Navio', '删除船舶', 'Remove Vessel')}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-slate-800 flex justify-end bg-gray-50 dark:bg-slate-800/30">
              <button
                type="button"
                onClick={() => setIsDataEditorOpen(false)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                {dt('Concluir e Aplicar', '完成并应用', 'Apply & Close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 9. GRANULAR DATA DRILLDOWN MODAL */}
      {/* ------------------------------------------------------------- */}
      {activeDrilldownWeek && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden transition-all ${
            theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Modal Header */}
            <div className="p-4 border-b flex items-center justify-between border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-600 text-white font-mono font-black text-xs">
                  {activeDrilldownWeek.week}
                </div>
                <div>
                  <h4 className="font-black text-sm uppercase">
                    {dt('Detalhamento Operacional:', '周次操作明细:', 'Operational Breakdown:')} {activeDrilldownWeek.weekFull} ({activeDrilldownWeek.dateRange})
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {dt('Volume Inflow:', '到港进港:', 'Inflow Volume:')} {activeDrilldownWeek.vesselArrivals.toLocaleString()} CNTRs • {dt('Saldo Pátio:', '堆场结余:', 'Yard Balance:')} {activeDrilldownWeek.inventoryBalance.toLocaleString()} CNTRs
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveDrilldownWeek(null)}
                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Carrier Share & Zone Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700">
                  <h5 className="text-[11px] font-black uppercase text-gray-500 dark:text-gray-400 mb-2">
                    {dt('Distribuição por Armador (Carriers)', '船公司份额分布 (Carriers)', 'Carrier Share Breakdown')}
                  </h5>
                  <div className="space-y-1.5 text-xs">
                    {Object.entries(activeDrilldownWeek.drilldown.carrierShare).map(([carrier, pct]) => (
                      <div key={carrier} className="flex justify-between items-center">
                        <span className="font-semibold">{carrier}:</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                            <div className="bg-blue-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="font-mono font-bold text-[11px]">{pct}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700">
                  <h5 className="text-[11px] font-black uppercase text-gray-500 dark:text-gray-400 mb-2">
                    {dt('Estoque por Zona de Pátio', '堆场分区库存分布', 'Inventory by Yard Zone')}
                  </h5>
                  <div className="space-y-1.5 text-xs">
                    {Object.entries(activeDrilldownWeek.drilldown.zoneBreakdown).map(([zone, cntrs]) => (
                      <div key={zone} className="flex justify-between items-center">
                        <span className="font-semibold">{zone}:</span>
                        <span className="font-mono font-bold text-indigo-500">{cntrs} CNTRs</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Granular Container List Table */}
              <div>
                <h5 className="text-[11px] font-black uppercase text-gray-500 dark:text-gray-400 mb-2">
                  {dt('Amostragem de Contêineres / BLs em Pátio', '在场集装箱 / 提单明细抽样', 'Container / BL Yard Sampling')}
                </h5>
                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-100 dark:bg-slate-800 text-[10px] uppercase text-gray-500 font-extrabold">
                      <tr>
                        <th className="p-2.5">{dt('Container', '集装箱号', 'Container')}</th>
                        <th className="p-2.5">{dt('B/L No.', '提单号', 'B/L No.')}</th>
                        <th className="p-2.5">{dt('Armador', '船公司', 'Carrier')}</th>
                        <th className="p-2.5">{dt('Zona / Pátio', '堆场/区域', 'Zone / Yard')}</th>
                        <th className="p-2.5">{dt('Status', '状态', 'Status')}</th>
                        <th className="p-2.5 text-center">{dt('Dias Pátio', '在场天数', 'Yard Dwell')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-mono">
                      {activeDrilldownWeek.drilldown.containerList.map((cntr) => (
                        <tr key={cntr.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40">
                          <td className="p-2.5 font-bold text-blue-600 dark:text-blue-400">{cntr.id}</td>
                          <td className="p-2.5">{cntr.bl}</td>
                          <td className="p-2.5 font-sans font-medium">{cntr.carrier}</td>
                          <td className="p-2.5 font-sans">{cntr.zone}</td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded text-[9.5px] font-black bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                              {cntr.status}
                            </span>
                          </td>
                          <td className="p-2.5 text-center font-bold">{cntr.daysInYard}d</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-slate-800 flex justify-end bg-gray-50 dark:bg-slate-800/30">
              <button
                type="button"
                onClick={() => setActiveDrilldownWeek(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 dark:bg-slate-700 text-white text-xs font-bold hover:bg-slate-900 cursor-pointer"
              >
                {dt('Fechar', '关闭', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 10. AI EXECUTIVE PRESENTATION SCRIPT MODAL */}
      {/* ------------------------------------------------------------- */}
      {isAiScriptModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-4xl max-h-[88vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden transition-all ${
            theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Modal Header */}
            <div className="p-4 border-b flex items-center justify-between border-gray-200 dark:border-slate-800 bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-sm md:text-base uppercase flex items-center gap-2">
                    {dt('Roteiro de Apresentação Executiva — Logística BYD Auto', '高管汇报演讲稿 — 比亚迪汽车物流', 'Executive Board Presentation Script — BYD Auto Logistics')}
                  </h4>
                  <p className="text-xs text-gray-400">
                    {dt(
                      `Briefing de Logística & Supply Chain • Análise de Caminho Crítico (${totalVolumeToProcess.toLocaleString()} Contêineres)`,
                      `供应链物流专家汇报 • 关键路径出清推演 (${totalVolumeToProcess.toLocaleString()} 箱)`,
                      `Senior Supply Chain Logistics Consultant Briefing • Critical Path Analysis (${totalVolumeToProcess.toLocaleString()} Containers)`
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedScript ? dt('Copiado!', '已复制!', 'Copied!') : dt('Copiar Script', '复制演讲稿', 'Copy Script')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAiScriptModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content - Styled Script Document */}
            <div className="p-6 overflow-y-auto space-y-6 text-sm leading-relaxed font-sans">
              <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-black text-xs uppercase tracking-wider mb-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  {dt('1. Resumo Executivo (O Contexto Estratégico)', '1. 高管摘要 (战略背景与目标)', '1. The Executive Summary (The \'Why\')')}
                </div>
                <blockquote className="text-xs md:text-sm italic text-gray-800 dark:text-slate-200 font-serif border-l-4 border-blue-500 pl-3">
                  {dt(
                    `"Senhores Diretores e Membros do Conselho: Gerenciamos um fluxo logístico estratégico em nossos nós de recebimento. Nosso volume agregado para processamento é de ${totalVolumeToProcess.toLocaleString()} contêineres (${totalInitialBacklog.toLocaleString()} em estoque atual nos Pátios Alfandegados, Armazéns e Buffers, somados a ${totalProjectedETA.toLocaleString()} das escalas de navios programadas). Na nossa taxa operacional diária de ${dailyDeliveryRate} contêineres/dia (${weeklyDrainCapacity.toLocaleString()}/semana), enfrentamos um Caminho Crítico de ${drainDays.toFixed(1)} dias (~${Math.ceil(drainDays / 7)} semanas) para concluir este escoamento. As ondas de chegada atingem o pico máximo em ${peakPoint.week} (${peakPoint.inventoryBalance.toLocaleString()} CNTRs), com liberação total projetada para ${clearPoint.week}."`,
                    `"各位董事会与管理层领导：我们正在对全链条物流接收节点进行战略性推演。当前需处理的集装箱总规模达 ${totalVolumeToProcess.toLocaleString()} 箱（其中在场积压总计 ${totalInitialBacklog.toLocaleString()} 箱，后续计划到港 ${totalProjectedETA.toLocaleString()} 箱）。按当前日提货能力 ${dailyDeliveryRate} 箱/天（每周 ${weeklyDrainCapacity.toLocaleString()} 箱）计算，我们需要约 ${drainDays.toFixed(1)} 天（约 ${Math.ceil(drainDays / 7)} 周）的关键路径完成全部清关与入厂。船舶到港压力峰值将于 ${peakPoint.week} 达到最高点 (${peakPoint.inventoryBalance.toLocaleString()} CNTRs)，预计将于 ${peakPoint.week} 彻底出清完毕。"`,
                    `"Members of the Executive Board: We are managing a strategic logistics flow across our receiving nodes. Our aggregate volume to process is ${totalVolumeToProcess.toLocaleString()} containers (${totalInitialBacklog.toLocaleString()} in existing backlog across Bonded, Warehouse, and Buffer yards, plus ${totalProjectedETA.toLocaleString()} from upcoming vessel calls). At our current operational throughput of ${dailyDeliveryRate} containers/day (${weeklyDrainCapacity.toLocaleString()}/week), we face a ${drainDays.toFixed(1)}-day Critical Path (~${Math.ceil(drainDays / 7)} weeks) to complete this volume. Vessel arrival waves reach maximum backlog pressure in ${peakPoint.week} (${peakPoint.inventoryBalance.toLocaleString()} CNTRs), with complete clearance projected for ${clearPoint.week}."`
                  )}
                </blockquote>
              </div>

              <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black text-xs uppercase tracking-wider mb-2">
                  <ShieldAlert className="w-4 h-4" />
                  {dt(`2. Avaliação de Riscos (Impactos do Prazo de ${drainDays.toFixed(1)} Dias)`, `2. 风险评估 (${drainDays.toFixed(1)} 天出清周期的关键影响)`, `2. The Risk Assessment (Consequence of ${drainDays.toFixed(1)}-Day Clearance)`)}
                </div>
                <ul className="space-y-2 text-xs md:text-sm text-gray-700 dark:text-slate-300 list-disc pl-5">
                  <li>
                    <strong>{dt('Custos de Demurrage & Armazenagem Alfandegada:', '滞期费与保税堆存成本:', 'Demurrage & Bonded Storage Costs:')}</strong> {dt('Custos diários adicionais quando os prazos de permanência excedem o free time contratado (7 a 14 dias).', '集装箱在堆场停留超过免租期（7–14天）将产生高额超期滞箱费与堆存费。', 'Daily fees incurred when dwell times exceed standard free time (7–14 days).')}
                  </li>
                  <li>
                    <strong>{dt('Taxa de Ocupação dos Terminais:', '码头与保税仓负荷率:', 'Terminal Utilization:')}</strong> {dt(`Monitoramento constante para manter a capacidade de buffer dentro de parâmetros seguros (${dynamicSafeYardCapacity.toLocaleString()} CNTRs).`, `严密监控保税码头，确保峰值缓冲区容量处于安全阈值内 (${dynamicSafeYardCapacity.toLocaleString()} CNTRs)。`, `Monitoring bonded terminals to ensure peak buffer capacity remains within safe parameters (${dynamicSafeYardCapacity.toLocaleString()} CNTRs).`)}
                  </li>
                  <li>
                    <strong>{dt('Continuidade da Produção Fabril:', '工厂生产供应连续性:', 'Production Supply Continuity:')}</strong> {dt('Garantia de que os componentes críticos da fábrica de Camaçari permaneçam perfeitamente sincronizados com o cronograma de montagem.', '确保卡马萨里工厂急需的核心生产零部件与装配线节拍完全同步。', 'Ensuring Camaçari plant components remain synchronized with assembly operations.')}
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-black text-xs uppercase tracking-wider mb-3">
                  <TrendingUp className="w-4 h-4" />
                  {dt('3. Curvas de Ação (Estratégia Operacional em 3 Níveis)', '3. 行动曲线 (三级阶梯式运营策略)', '3. The \'Action Curves\' (3-Tier Operational Strategy)')}
                </div>
                <div className="space-y-3 text-xs md:text-sm">
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border">
                    <strong className="text-amber-600 dark:text-amber-400 block mb-1">
                      {dt('• Curva de Alerta (D-30) — Gatilho de Pré-Chegada:', '• 预警曲线 (D-30) — 到港前触发点:', '• Alert Curve (D-30) — Pre-Arrival Trigger:')}
                    </strong>
                    {dt(
                      'Identificação antecipada de picos semanais de chegada (>1.400 contêineres/semana) para pré-alocação de espaço e capacidade de buffer.',
                      '提前识别单周到港峰值 (>1,400 箱/周)，提前预定外部缓冲区与专属拖车车队。',
                      'Early identification of weekly arrival peaks (>1,400 containers/week) for pre-allocation of buffer space.'
                    )}
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border">
                    <strong className="text-orange-600 dark:text-orange-400 block mb-1">
                      {dt('• Curva de Inflow (D-14) — Gatilho de Desembaraço e Triagem:', '• 进港曲线 (D-14) — 清关与分流触发点:', '• Inflow Curve (D-14) — Staging & Customs Trigger:')}
                    </strong>
                    {dt(
                      'Canal aduaneiro expresso para SKUs críticas de produção e desvio de SKUs secundárias para pátios externos para manter a fluidez fabril.',
                      '急需件开辟海关绿色通道，非紧急慢转 SKU 分流至外围堆场，保障主厂区卸货通道畅通。',
                      'Expedited customs channel and diversion of secondary SKUs to off-dock yards to maintain factory fluidity.'
                    )}
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border">
                    <strong className="text-emerald-600 dark:text-emerald-400 block mb-1">
                      {dt('• Curva de Drain (D+1) — Otimização da Velocidade de Entrega:', '• 出清曲线 (D+1) — 提货速率优化:', '• Drain Curve (D+1) — Velocity Optimization:')}
                    </strong>
                    {dt(
                      `Ajustar o recebimento fabril para mais de 300 contêineres/dia para antecipar a liberação total para ${clearPoint.week}.`,
                      `将工厂日接卸能力提升至 300+ 箱/天，将最终出清日期大幅提前至 ${clearPoint.week}。`,
                      `Adjusting factory receiving towards 300+ containers/day to advance clearance to ${clearPoint.week}.`
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800/30">
              <span className="text-xs text-gray-500 font-mono">
                {dt('BYD Logística • Roteiro Executivo Pronto para Apresentação', '比亚迪汽车物流 • 高管推演报告已就绪', 'BYD Logistics Executive Briefing • Ready for Presentation')}
              </span>
              <button
                type="button"
                onClick={() => setIsAiScriptModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-sm cursor-pointer"
              >
                {dt('Concluir Visualização', '关闭报告', 'Done')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
