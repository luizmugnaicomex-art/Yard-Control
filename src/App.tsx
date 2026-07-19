import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Tv, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Check, 
  Edit3, 
  Eye, 
  Sliders, 
  TrendingUp, 
  TrendingDown,
  Ship, 
  Database,
  FileText,
  Sparkles,
  RefreshCw,
  Sun,
  Moon,
  Globe,
  Download,
  LogOut,
  LogIn,
  User as UserIcon,
  Lock,
  Unlock,
  Wifi,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Anchor,
  Building2,
  Package,
  Layers,
  Boxes,
  Percent,
  FileSpreadsheet,
  Upload,
  Info,
  Maximize2,
  Minimize2,
  Filter,
  Truck,
  Calendar,
  AlertTriangle,
  Clock,
  Activity,
  LayoutGrid,
  Search
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

// FIREBASE INTEGRATION
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch,
  getDocs,
  getDoc
} from 'firebase/firestore';
import { 
  db, 
  auth, 
  loginWithGoogle, 
  logoutUser, 
  OperationType, 
  handleFirestoreError 
} from './firebase';

// ==========================================
// NOVAS ENUMS E INTERFACES (CONTRATO LOGÍSTICA)
// ==========================================
export enum ComexStatus {
  CargoDelivered = 'CARGO DELIVERED',
  Pending = 'PENDENTE',
  Default = 'N/A',
}

export enum CntrWarehouseStatus {
  Loaded = 'LOADED',
  Pending = 'PENDENTE',
  SemInfo = 'SEM INFO',
  Default = 'N/A',
}

export enum DepotStatus {
  Entregue = 'ENTREGUE',
  Pendente = 'PENDENTE',
}

export interface LogisticsEntry {
  id?: string;
  cntrsOriginal: string;         // Chave obrigatória do Container ou 'PENDING-BL-[numero]'
  isPlaceholder?: boolean;       // Flag para linhas sem equipamento/container definido ainda
  shipper?: string;
  freightForwarder?: string;
  shipowner?: string;
  bondedWarehouse?: string;      // Porto Seco / Armazém Alfandegado
  bl?: string;                   // Bill of Lading (Conhecimento de Embarque)
  responsibleAnalyst?: string;
  poSap?: string;                // Ordem de Compra SAP
  batch?: string;                // Lote (Batch)
  component?: string;
  description?: string;
  typeOfCargo?: string;
  costCenter?: string;
  comexSponsor?: string;
  quantity?: number;

  // Status & Fluxo de Trabalho
  statusComex?: string;          // CARGO DELIVERED, CARGO CLEARED, IN TRANSIT, etc.
  status?: string;               // Status de Entrega: PENDENTE, A CAMINHO, ADIADO, ENTREGUE, CANCELADO
  statusDepot?: string;
  statusCntrWarehouse?: string;
  damageStatus?: string;
  pendingDepotReturn?: string;

  // Aduana e Financeiro
  di?: string;                   // Declaração de Importação
  notaFiscal?: string;
  dateNotaFiscal?: string | Date;
  parametrization?: string;      // Canal Verde, Amarelo, Vermelho, Cinza
  channelDate?: string | Date;
  valuePerCntr?: number;         // Valor Unitário da Diária / Frete
  incoterm?: string;

  // Transporte & Entrega Física
  carrier?: string;              // Transportadora
  typeOfTruck?: string;
  tmsDespatchNo?: string;
  onSitePlaceOfDelivery?: string;
  depot?: string;                // Terminal de Devolução de Vazio
  voyage?: string;
  cargoPresence?: string;
  dsa?: string;                  // Declaração de Trânsito Aduaneiro (DSA / DTA)
  cntrBbkAir?: string;
  operationScope?: string;
  
  // Datas e Cronogramas
  arrivalVessel?: string;        // Navio de Chegada
  ata?: string | Date;           // Actual Time of Arrival
  cargoReadyDate?: string | Date;
  deadlinePickUpDsa?: string | Date;
  desembaracoDeadlineReturnCntr?: string | Date;
  deadlineReturnCntr?: string | Date; // Free Time Limit Date (Devolução de Container)
  unloadDate?: string | Date;
  estimatedDeliveryDate?: string | Date; // Data agendada para entrega na Planta
  deliveryDateAtByd?: string | Date;     // Data real de entrega na Planta
  estimatedDepotDate?: string | Date;
  actualDepotReturnDate?: string | Date;
  storageDeadline?: string | Date;
  deliveryModel?: string;                // DESCARGA, SWAP, PUT DOWN, RETURN EMPTY
  
  // Custos & Demurrage
  freeTime?: number;
  demurrageStarted1Periodo?: string | Date;
  daysDemurrage1Period?: number;
}

// STYLES & DICTIONARY TYPES
interface TranslationItem {
  pt: string;
  zh: string;
}

const TRANSLATIONS: { [key: string]: TranslationItem } = {
  systemTitle: {
    pt: "SISTEMA DE CONTROLE DE PÁTIOS BYD",
    zh: "BYD 堆场控制系统"
  },
  slideTitle: {
    pt: "DASHBOARD OPERACIONAL & CAPACIDADE DE PÁTIOS",
    zh: "堆场运营与容量监控看板"
  },
  slideSubtitle: {
    pt: "Monitoramento de Ocupação, Backlog Projetado e Escalas de Navios",
    zh: "堆场使用率、预测积压与船舶靠泊计划监控"
  },
  activeSupplier: {
    pt: "FORNECEDOR BYD ATIVO",
    zh: "比亚迪常规合作堆场"
  },
  usedCapacity: {
    pt: "Capacidade Usada",
    zh: "已用容量"
  },
  totalCap: {
    pt: "Total Cap",
    zh: "总容量"
  },
  full: {
    pt: "Cheio (Full)",
    zh: "重箱 (Full)"
  },
  empty: {
    pt: "Vazio (Empty)",
    zh: "空箱 (Empty)"
  },
  porto: {
    pt: "Porto",
    zh: "港口"
  },
  prontoColeta: {
    pt: "Pronto Coleta",
    zh: "待提货"
  },
  delivered: {
    pt: "Delivered",
    zh: "已交付"
  },
  overflow: {
    pt: "Estouro",
    zh: "爆仓"
  },
  vesselSchedule: {
    pt: "Escala de Navios Ativos (ETA)",
    zh: "活跃船舶靠泊计划 (ETA)"
  },
  projected: {
    pt: "Projetado",
    zh: "预测"
  },
  vessel: {
    pt: "Vessel",
    zh: "船名"
  },
  eta: {
    pt: "ETA",
    zh: "预计抵达"
  },
  cntrs: {
    pt: "Cntrs",
    zh: "箱量"
  },
  totalContainers: {
    pt: "Soma Total de Conteiners",
    zh: "集装箱总数"
  },
  noVessels: {
    pt: "Nenhum navio programado.",
    zh: "暂无船舶计划。"
  },
  chartLeftTitle: {
    pt: "Backlog Projetado vs Capacidade de Entrega (Semanal)",
    zh: "预测积压量 vs 交付能力 (周度)"
  },
  chartRightTitle: {
    pt: "Fluxo de Entradas Diárias vs Meta Garantida (Gc)",
    zh: "每日进箱量 vs 保证目标 (Gc)"
  },
  opHigh: {
    pt: "Operação Alta",
    zh: "高效运行"
  },
  opStable: {
    pt: "Operação Estável",
    zh: "稳定运行"
  },
  metaGc: {
    pt: "Meta Gc (140)",
    zh: "Gc 目标 (140)"
  },
  confidential: {
    pt: "CONFIDENCIAL BYD LOGÍSTICA",
    zh: "比亚迪物流机密"
  },
  nationalOperations: {
    pt: "Ativo Nacional",
    zh: "国内运营"
  },
  logistics: {
    pt: "Logística",
    zh: "物流"
  }
};

// YARD STRUCT TYPES
export interface Yard {
  name: string;
  type: 'BONDED' | 'WAREHOUSE' | 'BUFFER' | string;
  capacity: number;
  cheio: number;
  vazio: number;
  porto: number;
  prontoColeta: number;
  delivered: number;
  previous_total?: number;
}

export type YardsState = {
  [key: string]: Yard;
};

export interface Container {
  id: string;
  yardId: string;
  vesselName: string;
  size: string;
  status: 'CHEIO' | 'VAZIO';
  category: 'PORTO' | 'PRONTO_COLETA' | 'DELIVERED' | 'GERAL';
  bl?: string;
  eta?: string;
  freeTime?: string;
  componente?: string;
  modelo?: string;
  lote?: string | number;
  programacao?: string;
  transportadora?: string;
}

export interface Vessel {
  id: number;
  name: string;
  eta: string;
  cntrs: number;
  order?: number;
}

export interface ChartLeftItem {
  docId?: string;
  week: string;
  arrivals: number;
  backlog: number;
}

export interface ChartRightItem {
  docId?: string;
  date: string;
  value: number;
  type: string;
}

export interface BufferSlot {
  row?: number;
  col?: number;
  containerNo?: string;
  cargoType?: string;
  size?: '20FT' | '40FT' | string;
  priority?: 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW' | string;
  isOptimalPickup?: boolean;
  status?: 'CHEIO' | 'VAZIO' | string;
  entryTime?: string;
  stack?: BufferSlot[];
  danfe?: string;
  origin?: string;
  loteNo?: string;
  statusRecebimento?: string;
  validade?: string;
  updatedAt?: string;
}

export interface BufferArea {
  id: string;
  name: string;
  rows: number;
  cols: number;
  slots: BufferSlot[];
}

export interface Depot {
  id: string;
  name: string;
  avgVolume: number;
  maxCapacity: number;
  currentGateIn: number;
  status: 'Open' | 'Closed';
  isAlert: boolean;
}


// DADOS INICIAIS DA IMAGEM ORIGINAL (Para restauração e estado inicial)
const ORIGINAL_YARDS: YardsState = {
  tecon: { name: 'TECON', type: 'BONDED', capacity: 2000, cheio: 1643, vazio: 0, porto: 576, prontoColeta: 2253, delivered: 5535, previous_total: 1600 },
  intermaritima: { name: 'INTERMARITIMA', type: 'BONDED', capacity: 800, cheio: 735, vazio: 0, porto: 252, prontoColeta: 671, delivered: 5948, previous_total: 750 },
  tpc: { name: 'TPC', type: 'BONDED', capacity: 1200, cheio: 843, vazio: 0, porto: 698, prontoColeta: 431, delivered: 3679, previous_total: 800 },
  clia: { name: 'CLIA EMPORIO', type: 'BONDED', capacity: 300, cheio: 109, vazio: 0, porto: 48, prontoColeta: 55, delivered: 371, previous_total: 120 },
  ag: { name: 'AG - INTER CDEX', type: 'WAREHOUSE', capacity: 2200, cheio: 844, vazio: 0, porto: 0, prontoColeta: 122, delivered: 144, previous_total: 850 },
  cts: { name: 'CTS - PONTUAL', type: 'WAREHOUSE', capacity: 1200, cheio: 0, vazio: 0, porto: 0, prontoColeta: 0, delivered: 0, previous_total: 0 },
  buffer: { name: 'BYD BUFFER', type: 'BUFFER', capacity: 800, cheio: 500, vazio: 483, porto: 0, prontoColeta: 0, delivered: 0, previous_total: 950 },
};

const ORIGINAL_VESSELS: Vessel[] = [
  { id: 1, name: 'MSC SAVONA', eta: '17/05/2026', cntrs: 935 },
  { id: 2, name: 'MSC LA SPEZIA', eta: '22/05/2026', cntrs: 1712 },
  { id: 3, name: 'MSC MARIACRISTINA', eta: '30/05/2026', cntrs: 1799 },
  { id: 4, name: 'MSC AURIGA', eta: '05/06/2026', cntrs: 1329 },
];

const INITIAL_CONTAINERS: Container[] = [
  // TECON containers
  { id: 'MSCU4829104', yardId: 'tecon', vesselName: 'MSC SAVONA', size: "40' HC", status: 'CHEIO', category: 'PORTO' },
  { id: 'BYDU9012487', yardId: 'tecon', vesselName: 'MSC LA SPEZIA', size: "40' HC", status: 'CHEIO', category: 'PRONTO_COLETA' },
  { id: 'MEDU7384910', yardId: 'tecon', vesselName: 'MSC MARIACRISTINA', size: "20' GP", status: 'CHEIO', category: 'DELIVERED' },
  { id: 'BYDU2840192', yardId: 'tecon', vesselName: 'MSC AURIGA', size: "40' HC", status: 'CHEIO', category: 'PORTO' },

  // INTERMARITIMA containers
  { id: 'MSCU1948502', yardId: 'intermaritima', vesselName: 'MSC LA SPEZIA', size: "40' HC", status: 'CHEIO', category: 'PORTO' },
  { id: 'BYDU8392019', yardId: 'intermaritima', vesselName: 'MSC MARIACRISTINA', size: "40' HC", status: 'CHEIO', category: 'PRONTO_COLETA' },
  { id: 'SUDU4820194', yardId: 'intermaritima', vesselName: 'MSC AURIGA', size: "20' GP", status: 'CHEIO', category: 'DELIVERED' },

  // TPC containers
  { id: 'BYDU7482910', yardId: 'tpc', vesselName: 'MSC SAVONA', size: "40' HC", status: 'CHEIO', category: 'PORTO' },
  { id: 'MSCU8491029', yardId: 'tpc', vesselName: 'MSC MARIACRISTINA', size: "40' HC", status: 'CHEIO', category: 'PRONTO_COLETA' },
  { id: 'BYDU3849102', yardId: 'tpc', vesselName: 'MSC AURIGA', size: "20' GP", status: 'CHEIO', category: 'PORTO' },

  // CLIA EMPORIO containers
  { id: 'BYDU9201847', yardId: 'clia', vesselName: 'MSC SAVONA', size: "40' HC", status: 'CHEIO', category: 'PORTO' },
  { id: 'MSCU3849201', yardId: 'clia', vesselName: 'MSC LA SPEZIA', size: "20' GP", status: 'CHEIO', category: 'PRONTO_COLETA' },

  // AG - INTER CDEX containers
  { id: 'BYDU8491028', yardId: 'ag', vesselName: 'N/A', size: "40' HC", status: 'CHEIO', category: 'GERAL' },
  { id: 'MSCU1849102', yardId: 'ag', vesselName: 'MSC SAVONA', size: "40' HC", status: 'CHEIO', category: 'PRONTO_COLETA' },

  // CTS - PONTUAL containers
  { id: 'BYDU1029481', yardId: 'cts', vesselName: 'N/A', size: "40' HC", status: 'VAZIO', category: 'GERAL' },

  // BYD BUFFER containers
  { id: 'BYDU9910481', yardId: 'buffer', vesselName: 'MSC AURIGA', size: "40' HC", status: 'CHEIO', category: 'GERAL' },
  { id: 'BYDU5510294', yardId: 'buffer', vesselName: 'N/A', size: "40' HC", status: 'VAZIO', category: 'GERAL' }
];

const ORIGINAL_CHART_LEFT: ChartLeftItem[] = [
  { week: 'W1', arrivals: 0, backlog: 1416 },
  { week: 'W2', arrivals: 861, backlog: 807 },
  { week: 'W3', arrivals: 935, backlog: 272 },
  { week: 'W4', arrivals: 1198, backlog: 0 },
  { week: 'W5', arrivals: 500, backlog: 0 },
  { week: 'W6', arrivals: 950, backlog: 0 },
  { week: 'W7', arrivals: 1100, backlog: 0 },
  { week: 'W8', arrivals: 1250, backlog: 0 },
  { week: 'W9', arrivals: 2043, backlog: 573 },
  { week: 'W10', arrivals: 500, backlog: 0 },
  { week: 'W11', arrivals: 1000, backlog: 0 },
  { week: 'W12', arrivals: 750, backlog: 0 },
  { week: 'W13', arrivals: 2023, backlog: 553 },
  { week: 'W14', arrivals: 350, backlog: 0 },
  { week: 'W15', arrivals: 1841, backlog: 371 },
  { week: 'W16', arrivals: 2182, backlog: 1083 },
  { week: 'W17', arrivals: 899, backlog: 512 },
  { week: 'W18', arrivals: 2902, backlog: 1944 },
  { week: 'W19', arrivals: 1641, backlog: 2115 },
  { week: 'W20', arrivals: 1309, backlog: 1954 },
  { week: 'W21', arrivals: 3084, backlog: 3568 },
  { week: 'W22', arrivals: 2579, backlog: 4677 },
  { week: 'W23', arrivals: 2028, backlog: 5235 },
  { week: 'W24', arrivals: 1670, backlog: 5435 },
  { week: 'W25', arrivals: 1779, backlog: 5744 },
  { week: 'W26', arrivals: 452, backlog: 4726 },
  { week: 'W27', arrivals: 521, backlog: 3777 },
  { week: 'W28', arrivals: 900, backlog: 3207 },
  { week: 'W29', arrivals: 468, backlog: 2205 },
  { week: 'W30', arrivals: 420, backlog: 1155 },
  { week: 'W31', arrivals: 420, backlog: 105 },
  { week: 'W32', arrivals: 100, backlog: 0 }
];

const ORIGINAL_CHART_RIGHT: ChartRightItem[] = [
  { date: '15/05', value: 38, type: 'A' },
  { date: '21/01', value: 89, type: 'B' },
  { date: '22/01', value: 110, type: 'C' },
  { date: '25/01', value: 192, type: 'A' },
  { date: '29/01', value: 129, type: 'B' },
  { date: '02/02', value: 158, type: 'C' },
  { date: '05/02', value: 159, type: 'A' },
  { date: '10/02', value: 120, type: 'B' },
  { date: '12/02', value: 171, type: 'C' },
  { date: '15/02', value: 169, type: 'A' },
  { date: '20/02', value: 127, type: 'B' },
  { date: '22/02', value: 118, type: 'C' },
  { date: '25/02', value: 191, type: 'A' },
  { date: '28/02', value: 186, type: 'B' },
  { date: '02/03', value: 184, type: 'C' },
  { date: '05/03', value: 228, type: 'A' },
  { date: '10/03', value: 173, type: 'B' },
  { date: '12/03', value: 143, type: 'C' },
  { date: '15/03', value: 123, type: 'A' },
  { date: '18/03', value: 163, type: 'B' },
  { date: '22/03', value: 158, type: 'C' },
  { date: '25/03', value: 125, type: 'A' },
  { date: '28/03', value: 110, type: 'B' },
  { date: '02/04', value: 160, type: 'C' },
  { date: '05/04', value: 158, type: 'A' },
  { date: '08/04', value: 131, type: 'B' },
  { date: '12/04', value: 123, type: 'C' },
  { date: '15/04', value: 203, type: 'A' },
  { date: '18/04', value: 171, type: 'B' },
  { date: '20/04', value: 98, type: 'C' },
  { date: '23/04', value: 189, type: 'A' },
  { date: '25/04', value: 182, type: 'B' },
  { date: '28/04', value: 154, type: 'C' },
  { date: '01/05', value: 133, type: 'A' },
  { date: '03/05', value: 124, type: 'B' },
  { date: '05/05', value: 144, type: 'C' },
  { date: '08/05', value: 213, type: 'A' },
  { date: '10/05', value: 153, type: 'B' },
  { date: '12/05', value: 177, type: 'C' },
  { date: '15/05', value: 164, type: 'A' },
  { date: '18/05', value: 201, type: 'B' },
  { date: '19/05', value: 203, type: 'C' },
  { date: '21/05', value: 203, type: 'A' },
  { date: '22/05', value: 239, type: 'B' },
  { date: '23/05', value: 261, type: 'C' },
  { date: '24/05', value: 224, type: 'A' },
  { date: '25/05', value: 235, type: 'B' },
  { date: '26/05', value: 257, type: 'C' },
  { date: '27/05', value: 267, type: 'A' },
  { date: '28/05', value: 245, type: 'B' },
  { date: '29/05', value: 84, type: 'C' },
  { date: '30/05', value: 49, type: 'A' },
  { date: '01/06', value: 214, type: 'B' },
  { date: '03/06', value: 238, type: 'C' },
  { date: '04/06', value: 265, type: 'A' },
  { date: '05/06', value: 257, type: 'B' },
  { date: '06/06', value: 222, type: 'C' },
  { date: '08/06', value: 247, type: 'A' },
  { date: '09/06', value: 273, type: 'B' },
  { date: '10/06', value: 249, type: 'C' },
  { date: '12/06', value: 316, type: 'A' },
  { date: '15/06', value: 297, type: 'B' },
  { date: '18/06', value: 271, type: 'C' },
  { date: '19/06', value: 265, type: 'A' },
  { date: '20/06', value: 254, type: 'B' },
  { date: '22/06', value: 226, type: 'C' },
  { date: '25/06', value: 200, type: 'A' }
];

// Helper to parse dates from Excel, handling numeric serial numbers and standard formats nicely
function formatExcelDateIfNeeded(val: any): string {
  if (val === undefined || val === null) return "";
  const str = String(val).trim();
  if (!str) return "";
  
  // If it is a number or a string containing only digits (Excel serial number)
  const num = Number(str);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    try {
      // Excel epoch starts on 1899-12-30 due to 1900 leap year bug
      const date = new Date(Math.round((num - 25569) * 86400 * 1000));
      const day = String(date.getUTCDate()).padStart(2, '0');
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const year = date.getUTCFullYear();
      return `${day}/${month}/${year}`;
    } catch (err) {
      return str;
    }
  }
  
  // Support ISO date format translation (e.g., 2026-06-18 -> 18/06/2026)
  const matchIso = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (matchIso) {
    return `${matchIso[3]}/${matchIso[2]}/${matchIso[1]}`;
  }
  
  const matchIsoTime = str.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (matchIsoTime) {
    return `${matchIsoTime[3]}/${matchIsoTime[2]}/${matchIsoTime[1]}`;
  }

  const matchIsoSpace = str.match(/^(\d{4})-(\d{2})-(\d{2})\s/);
  if (matchIsoSpace) {
    return `${matchIsoSpace[3]}/${matchIsoSpace[2]}/${matchIsoSpace[1]}`;
  }
  
  return str;
}

export default function App() {
  // ESTADOS PRINCIPAIS
  const [yards, setYards] = useState<YardsState>(() => JSON.parse(JSON.stringify(ORIGINAL_YARDS)));
  const bondedYards = (Object.entries(yards) as [string, Yard][]).filter(([_, y]) => y && y.type === 'BONDED');
  const warehouseYards = (Object.entries(yards) as [string, Yard][]).filter(([_, y]) => y && y.type === 'WAREHOUSE');
  const bufferYards = (Object.entries(yards) as [string, Yard][]).filter(([_, y]) => y && y.type !== 'BONDED' && y.type !== 'WAREHOUSE');
  const nonBondedYards = (Object.entries(yards) as [string, Yard][]).filter(([_, y]) => y && y.type !== 'BONDED');
  const [vessels, setVessels] = useState<Vessel[]>(() => JSON.parse(JSON.stringify(ORIGINAL_VESSELS)));
  const [chartLeft, setChartLeft] = useState<ChartLeftItem[]>(() => JSON.parse(JSON.stringify(ORIGINAL_CHART_LEFT)));
  const [chartRight, setChartRight] = useState<ChartRightItem[]>(() => JSON.parse(JSON.stringify(ORIGINAL_CHART_RIGHT)));
  const [scenarioValue, setScenarioValue] = useState(210);

  // ESTADOS DE BACKLOG DE FÁBRICA
  const [dailyDeliveryRate, setDailyDeliveryRate] = useState<number>(() => {
    const saved = localStorage.getItem('byd_daily_delivery_rate');
    return saved ? Number(saved) : 140;
  });
  const [additionalBacklog, setAdditionalBacklog] = useState<number>(() => {
    const saved = localStorage.getItem('byd_additional_backlog');
    return saved ? Number(saved) : 0;
  });
  const [selectedScenario, setSelectedScenario] = useState<'etapa1' | 'etapa2' | 'etapa3'>('etapa3');
  const [chartMode, setChartMode] = useState<'historical' | 'projection'>('projection');

  useEffect(() => {
    localStorage.setItem('byd_daily_delivery_rate', String(dailyDeliveryRate));
  }, [dailyDeliveryRate]);

  useEffect(() => {
    localStorage.setItem('byd_additional_backlog', String(additionalBacklog));
  }, [additionalBacklog]);

  const getSummary = (list: [string, Yard][]) => {
    const totalCap = list.reduce((sum, [_, y]) => sum + (y?.capacity || 0), 0);
    const totalCheio = list.reduce((sum, [_, y]) => sum + (y?.cheio || 0), 0);
    const pct = totalCap > 0 ? Math.round((totalCheio / totalCap) * 100) : 0;
    return { totalCap, totalCheio, pct };
  };

  const bondedSum = getSummary(bondedYards);
  const warehouseSum = getSummary(warehouseYards);
  const bufferSum = getSummary(bufferYards);

  const getDynamicChartLeft = () => {
    const bondedVal = bondedSum?.totalCheio || 0;
    const warehouseVal = warehouseSum?.totalCheio || 0;
    const bufferVal = bufferSum?.totalCheio || 0;
    
    // Starting backlog for W28 projection
    let currentBacklog = 0;
    if (selectedScenario === 'etapa1') {
      currentBacklog = bondedVal + warehouseVal + additionalBacklog;
    } else {
      currentBacklog = bondedVal + warehouseVal + bufferVal + additionalBacklog;
    }
    
    const upcomingArrivals = vessels.reduce((sum, v) => sum + (v.cntrs || 0), 0);
    
    // We preserve historical data for weeks W1 to W27
    const result: { week: string; arrivals: number; backlog: number }[] = [];
    for (let i = 0; i < 27; i++) {
      if (ORIGINAL_CHART_LEFT[i]) {
        result.push({ ...ORIGINAL_CHART_LEFT[i] });
      }
    }
    
    // We calculate arrivals ratio for remaining weeks (W28 to W32)
    const originalRemainingArrivals = [900, 468, 420, 420, 100];
    const sumOriginalRemaining = 2308;
    const ratio = sumOriginalRemaining > 0 ? (upcomingArrivals / sumOriginalRemaining) : 0;
    
    const weeklyCapacity = dailyDeliveryRate * 7;
    
    // Generate from W28 onwards
    let w = 28;
    const maxWeeks = 45; // safety ceiling
    
    while (w <= maxWeeks) {
      let arrivals = 0;
      if (selectedScenario === 'etapa3') {
        const arrIndex = w - 28;
        if (arrIndex >= 0 && arrIndex < originalRemainingArrivals.length) {
          arrivals = Math.round(originalRemainingArrivals[arrIndex] * ratio);
        }
      }
      
      const weekBacklog = Math.max(0, currentBacklog + arrivals - weeklyCapacity);
      
      result.push({
        week: `W${w}`,
        arrivals,
        backlog: Math.round(weekBacklog)
      });
      
      currentBacklog = weekBacklog;
      
      if (currentBacklog <= 0 && w >= 32) {
        break;
      }
      
      w++;
    }
    
    return result;
  };

  // ESTADOS DE CONTÊINERES (Para detalhamento por área)
  const [selectedYardKey, setSelectedYardKey] = useState<string | null>(null);
  const [containers, setContainers] = useState<Container[]>(() => JSON.parse(JSON.stringify(INITIAL_CONTAINERS)));
  
  // Estados para formulário de cadastro de novo contêiner
  const [newContainerId, setNewContainerId] = useState("");
  const [newContainerSize, setNewContainerSize] = useState("40' HC");
  const [newContainerStatus, setNewContainerStatus] = useState<'CHEIO' | 'VAZIO'>('CHEIO');
  const [newContainerCategory, setNewContainerCategory] = useState<'PORTO' | 'PRONTO_COLETA' | 'DELIVERED' | 'GERAL'>('GERAL');
  const [newContainerVessel, setNewContainerVessel] = useState("N/A");

  // CONFIGURAÇÕES DOS BUFFERS BYD
  const defaultBufferAreas: BufferArea[] = [
    {
      id: "buffer-e",
      name: "BYD Buffer E (Zona E / E区 - Ativo)",
      rows: 12,
      cols: 10,
      slots: [
        {
          row: 1, col: 7,
          containerNo: "MSBU7855741",
          cargoType: "EQEKL",
          size: "40' HC",
          priority: "NORMAL",
          isOptimalPickup: true,
          status: "CHEIO",
          entryTime: "2026-07-07 13:14:30",
          stack: [
            { containerNo: "MSBU7855741", cargoType: "EQEKL", size: "40' HC", priority: "NORMAL", status: "CHEIO", entryTime: "2026-07-07 13:14:30", isOptimalPickup: true }
          ]
        },
        {
          row: 10, col: 7,
          containerNo: "MSBU7659712",
          cargoType: "EQEKL",
          size: "40' HC",
          priority: "HIGH",
          isOptimalPickup: false,
          status: "CHEIO",
          entryTime: "2026-07-07 13:04:14",
          stack: [
            { containerNo: "MSBU7665762", cargoType: "EQEKL", size: "40' HC", priority: "NORMAL", status: "CHEIO", entryTime: "2026-07-07 13:02:41", isOptimalPickup: false },
            { containerNo: "MSBU7659712", cargoType: "EQEKL", size: "40' HC", priority: "HIGH", status: "CHEIO", entryTime: "2026-07-07 13:04:14", isOptimalPickup: false }
          ]
        },
        {
          row: 10, col: 6,
          containerNo: "MSBU7659585",
          cargoType: "EQEKL",
          size: "40' HC",
          priority: "NORMAL",
          isOptimalPickup: true,
          status: "CHEIO",
          entryTime: "2026-07-07 12:44:59",
          stack: [
            { containerNo: "MSBU7659585", cargoType: "EQEKL", size: "40' HC", priority: "NORMAL", status: "CHEIO", entryTime: "2026-07-07 12:44:59", isOptimalPickup: true }
          ]
        }
      ]
    },
    {
      id: "buffer-b",
      name: "BYD Buffer B (Zona B / B区 - Ativo)",
      rows: 13,
      cols: 6,
      slots: [
        {
          row: 11, col: 0,
          containerNo: "CAAU5967121",
          cargoType: "S3CH",
          size: "40' HC",
          priority: "NORMAL",
          isOptimalPickup: true,
          status: "CHEIO",
          entryTime: "2026-07-07 12:49:10",
          stack: [
            { containerNo: "CMAU8726186", cargoType: "S3CH", size: "40' HC", priority: "NORMAL", status: "CHEIO", entryTime: "2026-07-07 12:48:33", isOptimalPickup: false },
            { containerNo: "CAAU5967121", cargoType: "S3CH", size: "40' HC", priority: "NORMAL", status: "CHEIO", entryTime: "2026-07-07 12:49:10", isOptimalPickup: true }
          ]
        },
        {
          row: 11, col: 1,
          containerNo: "TIIU4357285",
          cargoType: "S3CH",
          size: "40' HC",
          priority: "NORMAL",
          isOptimalPickup: true,
          status: "CHEIO",
          entryTime: "2026-07-07 12:47:18",
          stack: [
            { containerNo: "CMAU9747990", cargoType: "S3CH", size: "40' HC", priority: "NORMAL", status: "CHEIO", entryTime: "2026-07-07 12:46:24", isOptimalPickup: false },
            { containerNo: "TIIU4357285", cargoType: "S3CH", size: "40' HC", priority: "NORMAL", status: "CHEIO", entryTime: "2026-07-07 12:47:18", isOptimalPickup: true }
          ]
        }
      ]
    },
    {
      id: "buffer-alfa",
      name: "BYD Buffer Alfa (Zona Rápida / 快速拨备区)",
      rows: 4,
      cols: 6,
      slots: [
        { row: 0, col: 0 },
        { row: 0, col: 1, containerNo: "BYDU8812903", cargoType: "Dolphin Mini EV", size: "40' HC", priority: "CRITICAL", isOptimalPickup: true },
        { row: 0, col: 2 },
        { row: 0, col: 3, containerNo: "BYDU4556102", cargoType: "Seal EV Luxury", size: "40' HC", priority: "HIGH", isOptimalPickup: true },
        { row: 0, col: 4 },
        { row: 0, col: 5 },
        { row: 1, col: 0 },
        { row: 1, col: 1, containerNo: "BYDU9920194", cargoType: "Song Plus DM-i", size: "40' HC", priority: "NORMAL", isOptimalPickup: false },
        { row: 1, col: 2, containerNo: "BYDU3388410", cargoType: "Blade Battery Packs", size: "20FT", priority: "CRITICAL", isOptimalPickup: true },
        { row: 1, col: 3 },
        { row: 1, col: 4 },
        { row: 1, col: 5 },
        { row: 2, col: 0, containerNo: "BYDU1122334", cargoType: "King DM-i Sedan", size: "40' HC", priority: "LOW", isOptimalPickup: true },
        { row: 2, col: 1 },
        { row: 2, col: 2 },
        { row: 2, col: 3 },
        { row: 2, col: 4, containerNo: "BYDU7722991", cargoType: "Chassis Modules", size: "20FT", priority: "NORMAL", isOptimalPickup: false },
        { row: 2, col: 5 },
        { row: 3, col: 0 },
        { row: 3, col: 1 },
        { row: 3, col: 2 },
        { row: 3, col: 3 },
        { row: 3, col: 4 },
        { row: 3, col: 5, containerNo: "BYDU5544332", cargoType: "Dolphin EV SUV", size: "40' HC", priority: "HIGH", isOptimalPickup: true }
      ]
    },
    {
      id: "buffer-beta",
      name: "BYD Buffer Beta (Estoque Auxiliar / 备用缓冲区)",
      rows: 5,
      cols: 8,
      slots: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2, containerNo: "BYDU1234567", cargoType: "Yuan Plus EV", size: "40' HC", priority: "NORMAL", isOptimalPickup: true },
        { row: 0, col: 3 },
        { row: 0, col: 4 },
        { row: 0, col: 5 },
        { row: 0, col: 6 },
        { row: 0, col: 7 },
        { row: 1, col: 0 },
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 1, col: 3 },
        { row: 1, col: 4, containerNo: "BYDU6543210", cargoType: "Blade Battery Packs", size: "20FT", priority: "HIGH", isOptimalPickup: false },
        { row: 1, col: 5 },
        { row: 1, col: 6 },
        { row: 1, col: 7 },
        { row: 2, col: 0 },
        { row: 2, col: 1 },
        { row: 2, col: 2 },
        { row: 2, col: 3 },
        { row: 2, col: 4 },
        { row: 2, col: 5 },
        { row: 2, col: 6 },
        { row: 2, col: 7, containerNo: "BYDU1112223", cargoType: "Dolphin EV SUV", size: "40' HC", priority: "CRITICAL", isOptimalPickup: true },
        { row: 3, col: 0 },
        { row: 3, col: 1 },
        { row: 3, col: 2 },
        { row: 3, col: 3, containerNo: "BYDU4445556", cargoType: "Motor Assemblies", size: "20FT", priority: "NORMAL", isOptimalPickup: false },
        { row: 3, col: 4 },
        { row: 3, col: 5 },
        { row: 3, col: 6 },
        { row: 3, col: 7 },
        { row: 4, col: 0 },
        { row: 4, col: 1 },
        { row: 4, col: 2 },
        { row: 4, col: 3 },
        { row: 4, col: 4 },
        { row: 4, col: 5, containerNo: "BYDU9998887", cargoType: "Tan EV Luxury", size: "40' HC", priority: "HIGH", isOptimalPickup: true },
        { row: 4, col: 6 },
        { row: 4, col: 7 }
      ]
    }
  ];

  const [bufferAreas, setBufferAreas] = useState<BufferArea[]>(() => {
    const saved = localStorage.getItem('byd_buffer_areas');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Clean up or migrate any stored formats if necessary, or just load them.
        if (parsed && parsed.length > 0) return parsed;
      } catch (e) { console.error(e); }
    }
    return defaultBufferAreas;
  });

  const [activeBufferId, setActiveBufferId] = useState<string>('buffer-e');
  const [editingSlot, setEditingSlot] = useState<BufferSlot | null>(null);
  const [editingSlotAreaId, setEditingSlotAreaId] = useState<string | null>(null);
  const [editingStackIndex, setEditingStackIndex] = useState<number>(0);
  const [isBufferMapMaximized, setIsBufferMapMaximized] = useState<boolean>(false);
  const [bufferStatusFilter, setBufferStatusFilter] = useState<'ALL' | 'CHEIO' | 'VAZIO'>('ALL');
  
  // Efeito para salvar buffers no LocalStorage
  useEffect(() => {
    localStorage.setItem('byd_buffer_areas', JSON.stringify(bufferAreas));
  }, [bufferAreas]);

  // NAVEGAÇÃO DE SLIDES E COMENTÁRIOS DAS NOVAS PÁGINAS
  const [currentSlide, setCurrentSlide] = useState(0); // 0: Geral, 1: Pátios, 2: Navios, 3: Gráficos
  const [yardsComment, setYardsComment] = useState("Inserir comentários sobre a capacidade e ocupação dos pátios de forma bilíngue aqui. / 在此输入关于堆场容量、占用比率的双语说明。");
  const [vesselNote1, setVesselNote1] = useState("Escala regular de navios ativa - Monitoramento detalhado das janelas de atracação. / 常规活跃船舶靠泊计划 - 详细监控和管理泊位窗口。");
  const [vesselNote2, setVesselNote2] = useState("Destaques operacionais dos navios (Ex: Prioridades de descarga BYD). / 船舶运营重点亮点 (例如：比亚迪重箱卸船优先顺序)。");
  const [chartNote1, setChartNote1] = useState("Comentários sobre o Backlog Projetado vs Capacidade de Entrega Semanal. / 预测积压量与周度交付能力的对比分析说明。");
  const [chartNote2, setChartNote2] = useState("Análise de gargalos e metas diárias garantidas (meta Gc de 140). / 关于每日进箱量与保证目标 (Gc 140) 的瓶颈分析和建议。");

  // ESTADOS PARA CONTROLE E ALOCAÇÃO DE DEPÓSITOS (DEPOT CONTROL & ALLOCATION)
  const [depots, setDepots] = useState<Depot[]>(() => {
    const saved = localStorage.getItem('byd_depots_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) return parsed;
      } catch (e) { console.error(e); }
    }
    return [
      { id: 'pontual', name: 'PONTUAL', avgVolume: 57, maxCapacity: 80, currentGateIn: 57, status: 'Open', isAlert: false },
      { id: 'lechman', name: 'LECHMAN', avgVolume: 48, maxCapacity: 60, currentGateIn: 48, status: 'Open', isAlert: false },
      { id: '3alog', name: '3ALOG', avgVolume: 26, maxCapacity: 40, currentGateIn: 26, status: 'Open', isAlert: false },
      { id: 'jw', name: 'J&W', avgVolume: 24, maxCapacity: 30, currentGateIn: 24, status: 'Open', isAlert: false },
      { id: 'ziran', name: 'ZIRAN', avgVolume: 23, maxCapacity: 35, currentGateIn: 23, status: 'Open', isAlert: false },
      { id: 'wilson', name: 'WILSON SONS', avgVolume: 23, maxCapacity: 24, currentGateIn: 23, status: 'Open', isAlert: false },
      { id: 'tecon', name: 'TECON', avgVolume: 14, maxCapacity: 20, currentGateIn: 14, status: 'Open', isAlert: false },
      { id: 'vbr', name: 'VBR', avgVolume: 8, maxCapacity: 10, currentGateIn: 8, status: 'Open', isAlert: true },
      { id: 'area23', name: 'AREA 23 - TECON', avgVolume: 7, maxCapacity: 5, currentGateIn: 7, status: 'Open', isAlert: true }
    ];
  });

  const [depotMatrix, setDepotMatrix] = useState<Record<string, Record<string, 'Authorized' | 'Blocked' | 'Contract Only'>>>(() => {
    const saved = localStorage.getItem('byd_depot_matrix');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && Object.keys(parsed).length > 0) return parsed;
      } catch (e) { console.error(e); }
    }
    return {
      'PONTUAL': { 'MSC': 'Authorized', 'Maersk': 'Authorized', 'CMA CGM': 'Contract Only', 'Hapag-Lloyd': 'Authorized', 'ONE': 'Blocked', 'COSCO': 'Authorized', 'Evergreen': 'Contract Only' },
      'LECHMAN': { 'MSC': 'Authorized', 'Maersk': 'Contract Only', 'CMA CGM': 'Authorized', 'Hapag-Lloyd': 'Contract Only', 'ONE': 'Authorized', 'COSCO': 'Blocked', 'Evergreen': 'Authorized' },
      '3ALOG': { 'MSC': 'Authorized', 'Maersk': 'Authorized', 'CMA CGM': 'Authorized', 'Hapag-Lloyd': 'Blocked', 'ONE': 'Authorized', 'COSCO': 'Contract Only', 'Evergreen': 'Authorized' },
      'J&W': { 'MSC': 'Contract Only', 'Maersk': 'Authorized', 'CMA CGM': 'Blocked', 'Hapag-Lloyd': 'Authorized', 'ONE': 'Authorized', 'COSCO': 'Authorized', 'Evergreen': 'Blocked' },
      'ZIRAN': { 'MSC': 'Blocked', 'Maersk': 'Authorized', 'CMA CGM': 'Authorized', 'Hapag-Lloyd': 'Contract Only', 'ONE': 'Blocked', 'COSCO': 'Authorized', 'Evergreen': 'Authorized' },
      'WILSON SONS': { 'MSC': 'Authorized', 'Maersk': 'Blocked', 'CMA CGM': 'Authorized', 'Hapag-Lloyd': 'Authorized', 'ONE': 'Contract Only', 'COSCO': 'Authorized', 'Evergreen': 'Contract Only' },
      'TECON': { 'MSC': 'Authorized', 'Maersk': 'Authorized', 'CMA CGM': 'Authorized', 'Hapag-Lloyd': 'Authorized', 'ONE': 'Authorized', 'COSCO': 'Authorized', 'Evergreen': 'Authorized' },
      'VBR': { 'MSC': 'Blocked', 'Maersk': 'Contract Only', 'CMA CGM': 'Blocked', 'Hapag-Lloyd': 'Contract Only', 'ONE': 'Blocked', 'COSCO': 'Contract Only', 'Evergreen': 'Blocked' },
      'AREA 23 - TECON': { 'MSC': 'Blocked', 'Maersk': 'Blocked', 'CMA CGM': 'Blocked', 'Hapag-Lloyd': 'Blocked', 'ONE': 'Blocked', 'COSCO': 'Contract Only', 'Evergreen': 'Contract Only' },
    };
  });

  // Efeitos para salvar depot data no LocalStorage
  useEffect(() => {
    localStorage.setItem('byd_depots_data', JSON.stringify(depots));
  }, [depots]);

  useEffect(() => {
    localStorage.setItem('byd_depot_matrix', JSON.stringify(depotMatrix));
  }, [depotMatrix]);

  
  // IDIOMA ATIVO: 'pt' (Português) | 'zh' (Mandarim) | 'bilingual' (Ambos)
  const [language, setLanguage] = useState<string>('bilingual');
  const [yardsViewMode, setYardsViewMode] = useState<'cards' | 'spreadsheet'>('cards');
  const [globalStockSearch, setGlobalStockSearch] = useState("");
  const [globalStockWarehouseFilter, setGlobalStockWarehouseFilter] = useState("ALL");
  const [globalStockLoteFilter, setGlobalStockLoteFilter] = useState("ALL");

  // ESTADOS PARA O CONTROLE DE DEMURRAGE (DEMURRAGE & OVERDUE CONTROL)
  const [demurrageRefDate, setDemurrageRefDate] = useState<string>("2026-07-19");
  const [demurrageFilterDelivered, setDemurrageFilterDelivered] = useState<string>("ALL");
  const [demurrageFilterComponent, setDemurrageFilterComponent] = useState<string>("ALL");
  const [demurrageFilterCarrier, setDemurrageFilterCarrier] = useState<string>("ALL");
  const [demurrageFilterVessel, setDemurrageFilterVessel] = useState<string>("ALL");
  const [selectedDemurrageRange, setSelectedDemurrageRange] = useState<{ label: string; col: 'buffer' | 'buffer-scheduled' | 'delivered' | 'outside' | 'total' } | null>(null);

  // ESTADOS DO NOVO MÓDULO DE LOGÍSTICA & ENTREGAS
  const [logisticsEntries, setLogisticsEntries] = useState<LogisticsEntry[]>([]);
  const [logisticsPage, setLogisticsPage] = useState(1);
  const [logisticsSearch, setLogisticsPageSearch] = useState("");
  const [logisticsFilterComex, setLogisticsFilterComex] = useState("ALL");
  const [logisticsFilterWarehouse, setLogisticsFilterWarehouse] = useState("ALL");
  const [logisticsFilterVessel, setLogisticsFilterVessel] = useState("ALL");
  const [logisticsOnlyPending, setLogisticsOnlyPending] = useState(false);
  const [sheetsModalOpen, setSheetsModalOpen] = useState(false);
  const [sheetsUrl, setSheetsUrl] = useState("");
  const [sheetsRange, setSheetsRange] = useState("Engenharia CD");

  // ESTADOS DO NOVO FORM DE VINCULAR CONTAINER DOS PÁTIOS (WAREHOUSES)
  const [ydScheduleMode, setYdScheduleMode] = useState<'container' | 'bl'>('container');
  const [selectedYdContainerId, setSelectedYdContainerId] = useState<string>("");
  const [selectedYdBl, setSelectedYdBl] = useState<string>("");
  const [ydBl, setYdBl] = useState<string>("");
  const [ydVessel, setYdVessel] = useState<string>("");
  const [ydBatch, setYdBatch] = useState<string>("");
  const [ydWarehouse, setYdWarehouse] = useState<string>("");
  const [ydDeliveryDate, setYdDeliveryDate] = useState<string>("2026-07-25");
  const [ydCarrier, setYdCarrier] = useState<string>("JSL");
  const [ydValue, setYdValue] = useState<number>(1200);
  const [ydStatus, setYdStatus] = useState<string>("PENDENTE");
  const [ydDeliveryModel, setYdDeliveryModel] = useState<string>("DESCARGA");
  const [ydOnSitePlaceOfDelivery, setYdOnSitePlaceOfDelivery] = useState<string>("WAREHOUSE 25");
  const [collapsedDates, setCollapsedDates] = useState<Record<string, boolean>>({});
  
  // ESTADOS DO PAINEL DE ENTREGAS & CALENDÁRIO
  const [operationalMonth, setOperationalMonth] = useState("2026-07");
  const [selectedWeek, setSelectedWeek] = useState("2026-W29");
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState<string | null>(null);
  const [selectedDayCalendar, setSelectedDayCalendar] = useState<string | null>(null);
  const [calendarViewMode, setCalendarViewMode] = useState<'monthly' | 'shipment_info'>('shipment_info');

  // CONFIGURAÇÕES VISUAIS DO SLIDE (Adaptativo com base no idioma)
  const [slideTitlePT, setSlideTitlePT] = useState("DASHBOARD OPERACIONAL & CAPACIDADE DE PÁTIOS");
  const [slideTitleZH, setSlideTitleZH] = useState("堆场运营与容量监控看板");
  const [slideSubtitlePT, setSlideSubtitlePT] = useState("Monitoramento de Ocupação, Backlog Projetado e Escalas de Navios");
  const [slideSubtitleZH, setSlideSubtitleZH] = useState("堆场使用率、预测积压与船舶靠泊计划监控");
  
  const [watermarkText, setWatermarkText] = useState("H2LUIZ-VI / luiz.vieira - 2026-05-21");
  const [showWatermark, setShowWatermark] = useState(true);
  const [theme, setTheme] = useState('light'); // 'light' ou 'dark'
  const [pdfStatus, setPdfStatus] = useState<'idle' | 'rendering' | 'success' | 'error'>('idle');
  
  // Controle de Menu Lateral Recolhível / Ocultável
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('byd_sidebar_collapsed');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('byd_sidebar_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);
  
  // PARADIGMAS DE VISUALIZAÇÃO: 'website' (Estilo Site SaaS Fluido) ou 'ppt' (Apresentação Core)
  const [viewParadigm, setViewParadigm] = useState<'ppt' | 'website'>(() => {
    const saved = localStorage.getItem('byd_view_paradigm');
    return (saved as 'ppt' | 'website') || 'website';
  });
  const [websiteLayout, setWebsiteLayout] = useState<'tabbed' | 'scroll'>(() => {
    const saved = localStorage.getItem('byd_website_layout');
    return (saved as 'tabbed' | 'scroll') || 'tabbed';
  });
  const [websiteWidth, setWebsiteWidth] = useState<'fluid' | 'balanced'>(() => {
    const saved = localStorage.getItem('byd_website_width');
    return (saved as 'fluid' | 'balanced') || 'balanced';
  });

  useEffect(() => {
    localStorage.setItem('byd_view_paradigm', viewParadigm);
  }, [viewParadigm]);

  useEffect(() => {
    localStorage.setItem('byd_website_layout', websiteLayout);
  }, [websiteLayout]);

  useEffect(() => {
    localStorage.setItem('byd_website_width', websiteWidth);
  }, [websiteWidth]);

  // ESTADOS DE INTERFACE E EDIÇÃO
  const [isEditMode, setIsEditMode] = useState(true);
  const [activeTab, setActiveTab] = useState('yards'); // yards | vessels | charts | config
  const [widescreenMode, setWidescreenMode] = useState(false); // Trava a proporção de 16:9 de PPT
  const [slideWidth, setSlideWidth] = useState<number>(1480); // Default set wider (1480px) to prevent wrapping
  const [slideScale, setSlideScale] = useState<number>(1.0); // Content scaling zoom slider
  const [autoFit, setAutoFit] = useState<boolean>(true); // Auto-ajustar à tela para evitar corte de informações
  const [sidePanelWidth, setSidePanelWidth] = useState<number>(440); // Width of the side editor panel (Wild slider option)
  const [isDesktop, setIsDesktop] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [dbStatus, setDbStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');
  const [configExistsInDb, setConfigExistsInDb] = useState<boolean | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  const requestConfirmation = (title: string, message: string, onConfirm: () => void | Promise<void>) => {
    setConfirmConfig({
      isOpen: true,
      title,
      message,
      onConfirm: async () => {
        try {
          await onConfirm();
        } catch (e) {
          console.error("Erro na confirmação:", e);
        } finally {
          setConfirmConfig(null);
        }
      }
    });
  };

  // NOVOS ESTADOS PARA ADICIONAR SEMANAS E DIAS DE ENTREGA
  const [newWeekName, setNewWeekName] = useState('W30');
  const [newWeekArrivals, setNewWeekArrivals] = useState<number>(1000);
  const [newWeekBacklog, setNewWeekBacklog] = useState<number>(1000);

  const [newDeliveryDate, setNewDeliveryDate] = useState('21/06');
  const [newDeliveryValue, setNewDeliveryValue] = useState<number>(200);
  const [newDeliveryType, setNewDeliveryType] = useState('A');

  // CÁLCULO DE METRICAS DO HEADER / HEADER STATS
  const totalYardsCapacity = (Object.values(yards) as Yard[]).reduce((acc, y) => acc + (y?.capacity || 0), 0);
  const totalYardsCheio = (Object.values(yards) as Yard[]).reduce((acc, y) => acc + (y?.cheio || 0), 0);
  const globalOccupancyPercentForHeader = totalYardsCapacity > 0 ? Math.round((totalYardsCheio / totalYardsCapacity) * 100) : 0;

  const totalExpectedVesselsForHeader = vessels.filter(v => v && !v.arrived).length;
  const totalExpectedContainersForHeader = vessels.filter(v => v && !v.arrived).reduce((acc, v) => acc + (v.cntrs || 0), 0);

  const totalContractedDepotsVolumeForHeader = depots.reduce((acc, d) => acc + (d.currentGateIn || 0), 0);
  const totalContractedDepotsCapacity = depots.reduce((acc, d) => acc + (d.maxCapacity || 0), 0);
  const depotsOccupancyPercentForHeader = totalContractedDepotsCapacity > 0 ? Math.round((totalContractedDepotsVolumeForHeader / totalContractedDepotsCapacity) * 100) : 0;

  const getMaxWidthClass = () => {
    return websiteWidth === 'fluid' ? 'max-w-full px-4' : 'max-w-7xl mx-auto px-6 md:px-8';
  };

  const getSlideSubtitle = () => {
    const dyn = getDynamicSlideTitleAndSubtitle();
    if (language === 'pt') return <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1 font-sans">{dyn.subPT}</p>;
    if (language === 'zh') return <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1 font-sans tracking-wide">{dyn.subZH}</p>;
    return (
      <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1 font-sans">
        {dyn.subPT} / {dyn.subZH}
      </p>
    );
  };

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 1. ESCUTA O ESTADO DE AUTENTICAÇÃO DO FIREBASE
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
    });
    return () => unsubscribe();
  }, []);

  // 2. INICIALIZADORES SE O BANCO ESTIVER COMPLETAMENTE VAZIO
  const initializeYardsInDb = async () => {
    try {
      const batch = writeBatch(db);
      Object.entries(ORIGINAL_YARDS).forEach(([key, yard]) => {
        batch.set(doc(db, 'yards', key), yard);
      });
      await batch.commit();
    } catch (e) {
      console.warn("Primeira inicialização de yards ignorada (sem permissão ou já feito):", e);
    }
  };

  const initializeContainersInDb = async () => {
    try {
      const batch = writeBatch(db);
      INITIAL_CONTAINERS.forEach((c) => {
        batch.set(doc(db, 'containers', c.id), {
          id: c.id,
          yardId: c.yardId,
          vesselName: c.vesselName,
          size: c.size,
          status: c.status,
          category: c.category
        });
      });
      await batch.commit();
    } catch (e) {
      console.warn("Primeira inicialização de containers ignorada:", e);
    }
  };

  const initializeVesselsInDb = async () => {
    try {
      const batch = writeBatch(db);
      ORIGINAL_VESSELS.forEach((vessel) => {
        batch.set(doc(db, 'vessels', String(vessel.id)), {
          id: String(vessel.id),
          name: vessel.name,
          eta: vessel.eta,
          cntrs: vessel.cntrs
        });
      });
      await batch.commit();
    } catch (e) {
      console.warn("Primeira inicialização de vessels ignorada:", e);
    }
  };

  const forceInitializeChartLeft = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'chartLeft'));
      const batchDel = writeBatch(db);
      querySnapshot.forEach((docSnap) => {
        batchDel.delete(doc(db, 'chartLeft', docSnap.id));
      });
      await batchDel.commit();

      const batch = writeBatch(db);
      ORIGINAL_CHART_LEFT.forEach((item, index) => {
        const id = String(index).padStart(3, '0');
        batch.set(doc(db, 'chartLeft', id), item);
      });
      await batch.commit();
      console.log("Sincronização forçada de chartLeft executada com sucesso!");
    } catch (e) {
      console.warn("Erro ao forçar inicialização de chartLeft:", e);
    }
  };

  const initializeChartLeftInDb = async () => {
    try {
      const batch = writeBatch(db);
      ORIGINAL_CHART_LEFT.forEach((item, index) => {
        const id = String(index).padStart(3, '0');
        batch.set(doc(db, 'chartLeft', id), item);
      });
      await batch.commit();
    } catch (e) {
      console.warn("Primeira inicialização de chartLeft ignorada:", e);
    }
  };

  const initializeChartRightInDb = async () => {
    try {
      const batch = writeBatch(db);
      ORIGINAL_CHART_RIGHT.forEach((item, index) => {
        const id = String(index).padStart(3, '0');
        batch.set(doc(db, 'chartRight', id), item);
      });
      await batch.commit();
    } catch (e) {
      console.warn("Primeira inicialização de chartRight ignorada:", e);
    }
  };

  const initializeConfigInDb = async () => {
    try {
      await setDoc(doc(db, 'config', 'global'), {
        language,
        slideTitlePT,
        slideTitleZH,
        watermarkText,
        showWatermark,
        theme,
        widescreenMode,
        slideWidth,
        yardsComment,
        vesselNote1,
        vesselNote2,
        chartNote1,
        chartNote2,
        scenarioValue
      });
    } catch (e) {
      console.warn("Primeira inicialização de config ignorada:", e);
    }
  };

  // 3. SINCRONIZADOR EM TEMPO REAL ON-SNAPSHOT DO FIRESTORE
  useEffect(() => {
    setDbStatus('connecting');
    
    // Yards
    const unsubYards = onSnapshot(collection(db, 'yards'), async (snapshot) => {
      setDbStatus('online');
      if (snapshot.empty) {
        try {
          const configDoc = await getDoc(doc(db, 'config', 'global'));
          if (!configDoc.exists()) {
            initializeYardsInDb();
          } else {
            setYards({});
          }
        } catch (e) {
          console.warn("Erro ao verificar config para yards:", e);
        }
        return;
      }
      const newYards: YardsState = {};
      snapshot.forEach((docSnap) => {
        newYards[docSnap.id] = docSnap.data() as Yard;
      });
      setYards(newYards);
    }, (err) => {
      console.warn("Falha ao ler yards do Firestore; usando fallback local offline:", err);
      setDbStatus('offline');
    });

    // Vessels
    const unsubVessels = onSnapshot(collection(db, 'vessels'), async (snapshot) => {
      if (snapshot.empty) {
        try {
          const configDoc = await getDoc(doc(db, 'config', 'global'));
          if (!configDoc.exists()) {
            initializeVesselsInDb();
          } else {
            setVessels([]);
          }
        } catch (e) {
          console.warn("Erro ao verificar config para vessels:", e);
        }
        return;
      }
      const newVessels: Vessel[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        newVessels.push({
          id: Number(docSnap.id) || Date.now(),
          name: data.name,
          eta: data.eta,
          cntrs: Number(data.cntrs) || 0,
          order: data.order !== undefined ? Number(data.order) : undefined
        });
      });
      newVessels.sort((a, b) => {
        const orderA = a.order !== undefined ? a.order : a.id;
        const orderB = b.order !== undefined ? b.order : b.id;
        return orderA - orderB;
      });
      setVessels(newVessels);
    }, (err) => {
      console.warn("Falha ao ler vessels do Firestore:", err);
    });

    // ChartLeft
    const unsubChartLeft = onSnapshot(collection(db, 'chartLeft'), async (snapshot) => {
      if (snapshot.empty) {
        try {
          const configDoc = await getDoc(doc(db, 'config', 'global'));
          if (!configDoc.exists()) {
            initializeChartLeftInDb();
          } else {
            setChartLeft([]);
          }
        } catch (e) {
          console.warn("Erro ao verificar config para chartLeft:", e);
        }
        return;
      }
      const newChartLeft: ChartLeftItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        newChartLeft.push({
          docId: docSnap.id,
          week: data.week,
          arrivals: Number(data.arrivals) || 0,
          backlog: Number(data.backlog) || 0
        });
      });
      newChartLeft.sort((a, b) => {
        const numA = parseInt(a.week.replace('W', '')) || 0;
        const numB = parseInt(b.week.replace('W', '')) || 0;
        return numA - numB;
      });
      setChartLeft(newChartLeft);
    }, (err) => {
      console.warn("Falha ao ler chartLeft do Firestore:", err);
    });

    // ChartRight
    const unsubChartRight = onSnapshot(collection(db, 'chartRight'), async (snapshot) => {
      if (snapshot.empty) {
        try {
          const configDoc = await getDoc(doc(db, 'config', 'global'));
          if (!configDoc.exists()) {
            initializeChartRightInDb();
          } else {
            setChartRight([]);
          }
        } catch (e) {
          console.warn("Erro ao verificar config para chartRight:", e);
        }
        return;
      }
      const newChartRight: { index: string, item: ChartRightItem }[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        newChartRight.push({
          index: docSnap.id,
          item: {
            docId: docSnap.id,
            date: data.date,
            value: Number(data.value) || 0,
            type: data.type
          }
        });
      });
      newChartRight.sort((a, b) => a.index.localeCompare(b.index));
      setChartRight(newChartRight.map(x => x.item));
    }, (err) => {
      console.warn("Falha ao ler chartRight do Firestore:", err);
    });

    // Global Config
    const unsubConfig = onSnapshot(doc(db, 'config', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.language !== undefined) setLanguage(data.language);
        if (data.slideTitlePT !== undefined) setSlideTitlePT(data.slideTitlePT);
        if (data.slideTitleZH !== undefined) setSlideTitleZH(data.slideTitleZH);
        if (data.watermarkText !== undefined) setWatermarkText(data.watermarkText);
        if (data.showWatermark !== undefined) setShowWatermark(data.showWatermark);
        if (data.theme !== undefined) setTheme(data.theme);
        if (data.widescreenMode !== undefined) setWidescreenMode(data.widescreenMode);
        if (data.slideWidth !== undefined) setSlideWidth(data.slideWidth);
        if (data.yardsComment !== undefined) setYardsComment(data.yardsComment);
        if (data.vesselNote1 !== undefined) setVesselNote1(data.vesselNote1);
        if (data.vesselNote2 !== undefined) setVesselNote2(data.vesselNote2);
        if (data.chartNote1 !== undefined) setChartNote1(data.chartNote1);
        if (data.chartNote2 !== undefined) setChartNote2(data.chartNote2);
        if (data.scenarioValue !== undefined) setScenarioValue(data.scenarioValue);
      } else {
        initializeConfigInDb();
      }
    }, (err) => {
      console.warn("Falha ao ler config global do Firestore:", err);
    });

    // Containers
    const unsubContainers = onSnapshot(collection(db, 'containers'), async (snapshot) => {
      if (snapshot.empty) {
        try {
          const configDoc = await getDoc(doc(db, 'config', 'global'));
          if (!configDoc.exists()) {
            initializeContainersInDb();
          } else {
            setContainers([]);
          }
        } catch (e) {
          console.warn("Erro ao verificar config para containers:", e);
        }
        return;
      }
      const newContainers: Container[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        newContainers.push({
          id: docSnap.id,
          yardId: data.yardId || "",
          vesselName: data.vesselName || "N/A",
          size: data.size || "40' HC",
          status: data.status || "CHEIO",
          category: data.category || "GERAL",
          bl: data.bl || "",
          eta: formatExcelDateIfNeeded(data.eta),
          freeTime: formatExcelDateIfNeeded(data.freeTime),
          componente: data.componente || "",
          modelo: data.modelo || "",
          lote: data.lote || "",
          programacao: formatExcelDateIfNeeded(data.programacao),
          transportadora: data.transportadora || ""
        });
      });
      setContainers(newContainers);
    }, (err) => {
      console.warn("Falha ao ler containers do Firestore:", err);
    });

    // Logistics Entries
    const unsubLogistics = onSnapshot(collection(db, 'logisticsData'), (snapshot) => {
      if (snapshot.empty) {
        setLogisticsEntries([]);
        return;
      }
      const data: LogisticsEntry[] = [];
      snapshot.forEach(docSnap => {
        data.push({ id: docSnap.id, ...docSnap.data() } as LogisticsEntry);
      });
      setLogisticsEntries(data);
    }, (err) => {
      console.warn("Falha ao ler logisticsData do Firestore:", err);
    });

    return () => {
      unsubYards();
      unsubVessels();
      unsubChartLeft();
      unsubChartRight();
      unsubConfig();
      unsubContainers();
      unsubLogistics();
    };
  }, [user]);

  // FUNÇÃO AUXILIAR PARA OBTER ISO WEEK
  const getISOWeek = (date: Date): string => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  };

  // FUNÇÃO AUXILIAR PARA NORMALIZAR DATAS
  const normalizeDate = (dateStr: string | Date | undefined): string => {
    if (!dateStr) return 'Sem Data';
    const str = String(dateStr);
    // If it's already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    // If it's DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
      const [d, m, y] = str.split('/');
      return `${y}-${m}-${d}`;
    }
    return str;
  };

  // FUNÇÃO AUXILIAR PARA FORMATAR COLUNA DE DIA DO SHIPMENT INFORMATION
  const formatDayColumn = (dateStr: string) => {
    if (!dateStr || dateStr === 'Sem Data') return { date: 'Sem Data', dayOfWeek: '-' };
    const normalized = normalizeDate(dateStr);
    try {
      const parts = normalized.split('-');
      if (parts.length === 3) {
        const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = parts[0];
        const weekdayNames = [
          language === 'zh' ? '星期日' : 'Sunday',
          language === 'zh' ? '星期一' : 'Monday',
          language === 'zh' ? '星期二' : 'Tuesday',
          language === 'zh' ? '星期三' : 'Wednesday',
          language === 'zh' ? '星期四' : 'Thursday',
          language === 'zh' ? '星期五' : 'Friday',
          language === 'zh' ? '星期六' : 'Saturday'
        ];
        return {
          date: `${day}/${month}/${year}`,
          dayOfWeek: weekdayNames[date.getDay()]
        };
      }
    } catch (e) {
      console.error(e);
    }
    return { date: dateStr, dayOfWeek: '-' };
  };

  // FUNÇÃO AUXILIAR PARA ATUALIZAÇÃO DO CONFIG SINGLETON NO FIRESTORE
  const updateGlobalDoc = async (field: string, value: any) => {
    try {
      await updateDoc(doc(db, 'config', 'global'), {
        [field]: value
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'config/global');
    }
  };

  // EFEITO DE AUTO-AJUSTE PARA REDIMENSIONAR O SLIDE SEM CORTAR INFORMAÇÕES
  useEffect(() => {
    if (!autoFit) return;

    const scaleToFit = () => {
      const container = document.getElementById('slide-viewport-container');
      const slide = document.getElementById('slide-capture-area');
      if (!container || !slide) return;

      const paddingWidth = isEditMode ? 16 : 8;
      const paddingHeight = isEditMode ? 16 : 8;
      const maxW = container.clientWidth - paddingWidth;
      const maxH = container.clientHeight - paddingHeight;

      // A largura base do slide em pixels virturas
      const baseWidth = widescreenMode ? slideWidth : 1380;
      // Altura base proporcional para 16:9 widescreen, ou estimada de ~730px para Livre
      const baseHeight = widescreenMode ? (slideWidth * 9 / 16) : 730;

      const scaleX = maxW / baseWidth;
      const scaleY = maxH / baseHeight;

      let scale = widescreenMode ? Math.min(scaleX, scaleY) : scaleX;
      // Garante uma faixa de escalonamento ultra flexível (de 0.45x até 1.15x)
      scale = Math.min(Math.max(scale, 0.45), 1.15);

      const roundedScale = Math.round(scale * 1000) / 1000;
      setSlideScale(roundedScale);
    };

    scaleToFit();

    const container = document.getElementById('slide-viewport-container');
    if (!container) return;

    const observer = new ResizeObserver(() => {
      scaleToFit();
    });
    observer.observe(container);

    window.addEventListener('resize', scaleToFit);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', scaleToFit);
    };
  }, [autoFit, widescreenMode, slideWidth, isEditMode, sidePanelWidth]);

  // EFEITO DE ATALHOS DE TECLADO PARA MUDANÇA DE SLIDES
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return; // Ignora se o usuário estiver digitando
      }
      
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        setCurrentSlide(prev => (prev + 1) % 10);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        setCurrentSlide(prev => (prev - 1 + 10) % 10);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // FUNÇÕES AUXILIARES DO NOVO MÓDULO DE LOGÍSTICA
  const handleClearAllLogisticsData = () => {
    const title = language === 'zh' ? '清空全部物流数据' : 'Zerar Tudo / Limpar Dados';
    const msg = language === 'zh'
      ? '⚠️ 警告！这将永久删除所有已登记的集成物流记录。您确定要执行吗？'
      : '⚠️ ATENÇÃO! Isso removerá definitivamente todos os registros de logística cadastrados no Firestore. Confirmar exclusão?';

    requestConfirmation(title, msg, async () => {
      try {
        const batch = writeBatch(db);
        logisticsEntries.forEach(entry => {
          if (entry.id) {
            batch.delete(doc(db, 'logisticsData', entry.id));
          }
        });
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'logisticsData_batch');
      }
    });
  };

  const handleYdContainerChange = (cntrId: string) => {
    setSelectedYdContainerId(cntrId);
    if (!cntrId) {
      setYdBl("");
      setYdVessel("");
      setYdBatch("");
      setYdWarehouse("");
      setYdDeliveryDate("2026-07-25");
      setYdCarrier("JSL");
      setYdValue(1200);
      setYdStatus("PENDENTE");
      return;
    }
    const c = containers.find(item => item.id === cntrId);
    if (c) {
      setYdBl(c.bl || "");
      setYdVessel(c.vesselName || "");
      setYdBatch(c.lote ? String(c.lote) : "");
      const yardName = yards[c.yardId]?.name || c.yardId || "";
      setYdWarehouse(yardName);
      setYdDeliveryDate(c.programacao || c.eta || "2026-07-25");
      setYdCarrier(c.transportadora || "JSL");
      setYdValue(1200);
      setYdStatus("PENDENTE");
    }
  };

  const handleYdBlChange = (blVal: string) => {
    setSelectedYdBl(blVal);
    if (!blVal) {
      setYdBl("");
      setYdVessel("");
      setYdBatch("");
      setYdWarehouse("");
      setYdDeliveryDate("2026-07-25");
      setYdCarrier("JSL");
      setYdValue(1200);
      setYdStatus("PENDENTE");
      return;
    }
    const matching = containers.filter(item => item.bl === blVal);
    if (matching.length > 0) {
      setYdBl(blVal);
      const first = matching[0];
      setYdVessel(first.vesselName || "");
      setYdBatch(first.lote ? String(first.lote) : "");
      
      const uniqueYards = Array.from(new Set(matching.map(c => yards[c.yardId]?.name || c.yardId || ""))).filter(Boolean);
      setYdWarehouse(uniqueYards.join(", ") || "CD PLANTA");
      
      setYdDeliveryDate(first.programacao || first.eta || "2026-07-25");
      setYdCarrier(first.transportadora || "JSL");
      setYdValue(1200);
      setYdStatus("PENDENTE");
    }
  };

  const handleSaveYdContainerLogistics = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ydScheduleMode === 'container' && !selectedYdContainerId) {
      alert(language === 'zh' ? '请选择一个集装箱' : 'Por favor, selecione um contêiner do pátio.');
      return;
    }
    if (ydScheduleMode === 'bl' && !selectedYdBl) {
      alert(language === 'zh' ? '请选择一个 BL' : 'Por favor, selecione um BL do pátio.');
      return;
    }
    if (!ydDeliveryDate) {
      alert(language === 'zh' ? '请选择交付排程日期' : 'Por favor, selecione uma data de entrega planejada.');
      return;
    }

    try {
      if (dbStatus === 'online') {
        const batchOp = writeBatch(db);
        
        const targetContainers = ydScheduleMode === 'container'
          ? containers.filter(c => c.id === selectedYdContainerId)
          : containers.filter(c => c.bl === selectedYdBl);

        if (targetContainers.length === 0) {
          alert("Nenhum contêiner correspondente encontrado para o agendamento.");
          return;
        }

        for (const c of targetContainers) {
          const existingEntry = logisticsEntries.find(entry => entry.cntrsOriginal === c.id);
          const yardName = yards[c.yardId]?.name || c.yardId || "";
          
          if (existingEntry && existingEntry.id) {
            batchOp.update(doc(db, 'logisticsData', existingEntry.id), {
              bl: ydBl || c.bl || "PENDING-BL",
              arrivalVessel: ydVessel || c.vesselName || "N/A",
              batch: ydBatch || (c.lote ? String(c.lote) : "N/A"),
              bondedWarehouse: yardName || "CD PLANTA",
              estimatedDeliveryDate: ydDeliveryDate,
              carrier: ydCarrier || "JSL",
              valuePerCntr: Number(ydValue) || 1200,
              status: ydStatus,
              deliveryModel: ydDeliveryModel,
              onSitePlaceOfDelivery: ydOnSitePlaceOfDelivery
            });
          } else {
            const newRef = doc(collection(db, 'logisticsData'));
            batchOp.set(newRef, {
              cntrsOriginal: c.id,
              bl: ydBl || c.bl || "PENDING-BL",
              arrivalVessel: ydVessel || c.vesselName || "N/A",
              batch: ydBatch || (c.lote ? String(c.lote) : "N/A"),
              bondedWarehouse: yardName || "CD PLANTA",
              statusComex: "PENDENTE",
              carrier: ydCarrier || "JSL",
              estimatedDeliveryDate: ydDeliveryDate,
              poSap: "N/A",
              valuePerCntr: Number(ydValue) || 1200,
              status: ydStatus,
              deliveryModel: ydDeliveryModel,
              onSitePlaceOfDelivery: ydOnSitePlaceOfDelivery
            });
          }

          try {
            batchOp.update(doc(db, 'containers', c.id), {
              programacao: ydDeliveryDate,
              transportadora: ydCarrier
            });
          } catch (err) {
            console.warn("Nao foi possivel enfileirar atualizacao no doc container do patio:", err);
          }
        }

        await batchOp.commit();
      } else {
        alert("Modo offline: Conecte ao Firebase para salvar.");
        return;
      }

      // Reset selection
      setSelectedYdContainerId("");
      setSelectedYdBl("");
      setYdBl("");
      setYdVessel("");
      setYdBatch("");
      setYdWarehouse("");
      setYdDeliveryDate("2026-07-25");
      setYdCarrier("JSL");
      setYdValue(1200);
      setYdStatus("PENDENTE");
      setYdDeliveryModel("DESCARGA");
      setYdOnSitePlaceOfDelivery("WAREHOUSE 25");

      const successMsg = ydScheduleMode === 'bl'
        ? (language === 'zh' ? `✅ 成功绑定 BL 并在交付排程中创建了相关集装箱的交付！` : `✅ Todos os contêineres do BL ${ydBl} foram vinculados e agendados com sucesso no Painel de entregas!`)
        : (language === 'zh' ? '✅ 成功将仓库集装箱绑定并生成交付排程！' : '✅ Contêiner do pátio vinculado e agendado com sucesso!');
      
      alert(successMsg);
    } catch (error) {
      console.error("Erro ao salvar agendamento do pátio:", error);
      alert("Houve um erro ao salvar o agendamento no banco de dados.");
    }
  };

  const handleImportParsedRows = async (rows: any[]) => {
    try {
      const batch = writeBatch(db);
      let count = 0;
      
      rows.forEach((row: any) => {
        // Encontrar as chaves dos dados de forma robusta e flexível (case-insensitive e traduzida)
        const getVal = (possibleKeys: string[], defaultVal: any = "") => {
          for (const key of Object.keys(row)) {
            const normalizedKey = key.toLowerCase().trim();
            if (possibleKeys.some(pk => normalizedKey === pk.toLowerCase() || normalizedKey.includes(pk.toLowerCase()))) {
              return row[key];
            }
          }
          return defaultVal;
        };

        const container = String(getVal(['container', 'original', 'equipamento', 'cntr', 'equip']) || '').trim();
        if (!container) return; // Pula linhas sem identificação de container

        const bl = String(getVal(['bl', 'bill of lading', 'conhecimento', 'hbl']) || '').trim();
        const vessel = String(getVal(['vessel', 'navio', 'ship', 'arrival']) || '').trim();
        const batchNo = String(getVal(['batch', 'lote']) || '').trim();
        const warehouse = String(getVal(['bonded', 'warehouse', 'porto seco', 'armazem', 'alfandegado']) || '').trim();
        const carrier = String(getVal(['carrier', 'transportadora', 'transp']) || '').trim();
        const comex = String(getVal(['comex', 'status comex', 'status_comex']) || 'PENDENTE').trim().toUpperCase();
        const deliveryDate = getVal(['delivery', 'estimated', 'entrega', 'agendada', 'agendamento']);
        const sap = String(getVal(['sap', 'po', 'sap po', 'sap_po']) || '').trim();
        const value = Number(getVal(['value', 'val', 'frete', 'unitario', 'valor'])) || 0;

        // Formatação de data simples YYYY-MM-DD
        let formattedDate = "";
        if (deliveryDate) {
          if (typeof deliveryDate === 'number') {
            // Se for data numérica serial do Excel
            const dateObj = XLSX.SSF.parse_date_code(deliveryDate);
            formattedDate = `${dateObj.y}-${String(dateObj.m).padStart(2, '0')}-${String(dateObj.d).padStart(2, '0')}`;
          } else {
            const dateStr = String(deliveryDate).trim();
            if (dateStr.includes('/')) {
              const pts = dateStr.split('/');
              if (pts.length === 3) {
                formattedDate = `${pts[2]}-${pts[1].padStart(2, '0')}-${pts[0].padStart(2, '0')}`;
              }
            } else if (dateStr.includes('-')) {
              formattedDate = dateStr.slice(0, 10);
            } else {
              formattedDate = dateStr;
            }
          }
        }
        if (!formattedDate) {
          formattedDate = "2026-07-25"; // Data default de exemplo
        }

        const newEntryRef = doc(collection(db, 'logisticsData'));
        batch.set(newEntryRef, {
          cntrsOriginal: container,
          bl: bl || "PENDING-BL",
          arrivalVessel: vessel || "N/A",
          batch: batchNo || "N/A",
          bondedWarehouse: warehouse || "CD PLANTA",
          statusComex: comex || "PENDENTE",
          carrier: carrier || "JSL",
          estimatedDeliveryDate: formattedDate,
          poSap: sap || "N/A",
          valuePerCntr: value || 1200,
          status: "PENDENTE"
        });
        count++;
      });

      if (count > 0) {
        await batch.commit();
        alert(`${count} registros de logística foram importados e salvos no banco de dados com sucesso!`);
      } else {
        alert("Nenhum registro válido contendo identificador de Container foi encontrado na planilha.");
      }
    } catch (error) {
      console.error("Erro na importação logística:", error);
      alert("Houve um erro ao processar ou salvar os dados de logística no Firestore.");
    }
  };

  const handleSyncGoogleSheets = async () => {
    if (!sheetsUrl) {
      alert("Por favor, informe a URL publicada da planilha Google Sheets.");
      return;
    }
    try {
      // Converte URL de visualização padrão do Sheets em exportação CSV se necessário
      let fetchUrl = sheetsUrl.trim();
      if (fetchUrl.includes("/edit")) {
        fetchUrl = fetchUrl.replace(/\/edit.*$/, "/export?format=csv");
      } else if (!fetchUrl.includes("format=csv")) {
        fetchUrl += (fetchUrl.includes("?") ? "&" : "?") + "format=csv";
      }

      const res = await fetch(fetchUrl);
      if (!res.ok) throw new Error("Erro de resposta HTTP ao obter planilha.");
      const csvText = await res.text();

      // Parse CSV usando XLSX
      const wb = XLSX.read(csvText, { type: 'string' });
      const firstSheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet);

      await handleImportParsedRows(rows);
      setSheetsModalOpen(false);
    } catch (error) {
      console.error("Erro na sincronização:", error);
      alert("Erro ao conectar e sincronizar dados da planilha online. Certifique-se de publicar a planilha na web como CSV e habilitar permissões de acesso público.");
    }
  };

  // Estado para novo Navio
  const [newVesselName, setNewVesselName] = useState('');
  const [newVesselEta, setNewVesselEta] = useState('');
  const [newVesselCntrs, setNewVesselCntrs] = useState(1000);

  // Estado para novo Pátio / Warehouse
  const [newYardName, setNewYardName] = useState('');
  const [newYardType, setNewYardType] = useState<string>('WAREHOUSE');
  const [newYardCapacity, setNewYardCapacity] = useState<number>(1000);
  const [newYardCheio, setNewYardCheio] = useState<number>(0);
  const [newYardVazio, setNewYardVazio] = useState<number>(0);
  const [newYardPorto, setNewYardPorto] = useState<number>(0);
  const [newYardProntoColeta, setNewYardProntoColeta] = useState<number>(0);
  const [newYardDelivered, setNewYardDelivered] = useState<number>(0);
  const [newYardPreviousTotal, setNewYardPreviousTotal] = useState<number>(0);

  // ESTADOS PARA O CONTROLLER E ABA DE ESTOQUE
  const [activeYardKey, setActiveYardKey] = useState<string>('tecon');
  const [showAddYardForm, setShowAddYardForm] = useState(false);
  const [stockSelectedYardKey, setStockSelectedYardKey] = useState<string>('tecon');
  const [stockContainerSearch, setStockContainerSearch] = useState('');
  const [stockContainerStatusFilter, setStockContainerStatusFilter] = useState('ALL');
  const [stockContainerCategoryFilter, setStockContainerCategoryFilter] = useState('ALL');

  // FUNÇÃO DE TRADUÇÃO DINÂMICA
  const t = (key: string): string => {
    if (!TRANSLATIONS[key]) return key;
    if (language === 'pt') return TRANSLATIONS[key].pt;
    if (language === 'zh') return TRANSLATIONS[key].zh;
    // Retorno Bilíngue elegante com separador
    return `${TRANSLATIONS[key].pt} / ${TRANSLATIONS[key].zh}`;
  };

  // Elegant bilingual render helper - formats Chinese prominently for high-end feel
  const renderLabel = (key: string, colorClass = "text-gray-400 dark:text-gray-500") => {
    if (!TRANSLATIONS[key]) return <span>{key}</span>;
    const pt = TRANSLATIONS[key].pt;
    const zh = TRANSLATIONS[key].zh;
    if (language === 'pt') {
      return <span className={`${colorClass} font-semibold uppercase text-[9px] tracking-tight`}>{pt}</span>;
    }
    if (language === 'zh') {
      return <span className="text-slate-800 dark:text-slate-100 font-semibold text-xs tracking-wide font-sans">{zh}</span>;
    }
    // Bilingual: stacked neatly with custom size and colors, making Chinese larger and Portugues small/muted
    return (
      <span className="flex flex-col text-left leading-tight py-0.5">
        <span className={`${colorClass} text-[8px] uppercase font-mono tracking-tight leading-none block font-semibold`}>{pt}</span>
        <span className="text-slate-900 dark:text-white text-[11px] font-black tracking-wide leading-none block font-sans mt-0.5">{zh}</span>
      </span>
    );
  };

  const getChartLeftTitle = () => {
    if (language === 'pt') return TRANSLATIONS.chartLeftTitle.pt;
    if (language === 'zh') return TRANSLATIONS.chartLeftTitle.zh;
    return (
      <span className="flex flex-col text-left leading-tight">
        <span className="text-[8px] text-gray-400 dark:text-gray-500 uppercase font-mono tracking-tight font-medium">{TRANSLATIONS.chartLeftTitle.pt}</span>
        <span className="text-[11px] font-extrabold text-slate-800 dark:text-slate-100 tracking-wide font-sans mt-0.5">{TRANSLATIONS.chartLeftTitle.zh}</span>
      </span>
    );
  };

  const getChartRightTitle = () => {
    if (language === 'pt') return TRANSLATIONS.chartRightTitle.pt;
    if (language === 'zh') return TRANSLATIONS.chartRightTitle.zh;
    return (
      <span className="flex flex-col text-left leading-tight">
        <span className="text-[8px] text-gray-400 dark:text-gray-500 uppercase font-mono tracking-tight font-medium">{TRANSLATIONS.chartRightTitle.pt}</span>
        <span className="text-[11px] font-extrabold text-slate-800 dark:text-slate-100 tracking-wide font-sans mt-0.5">{TRANSLATIONS.chartRightTitle.zh}</span>
      </span>
    );
  };

  const getColHeader = (key: string) => {
    if (!TRANSLATIONS[key]) return key;
    if (language === 'pt') return TRANSLATIONS[key].pt;
    if (language === 'zh') return TRANSLATIONS[key].zh;
    return `${TRANSLATIONS[key].zh} (${TRANSLATIONS[key].pt})`;
  };

  // ==========================================
  // FUNÇÕES AUXILIARES - BYD BUFFER MODULE
  // ==========================================
  const getCurrentBufferArea = (): BufferArea => {
    return bufferAreas.find(area => area.id === activeBufferId) || bufferAreas[0];
  };

  const getSlotAt = (row: number, col: number): BufferSlot | undefined => {
    const area = getCurrentBufferArea();
    return area.slots.find(slot => slot.row === row && slot.col === col);
  };

  const getSlotCoordsLabel = (row: number, col: number): string => {
    const area = getCurrentBufferArea();
    const isNumericArea = area.id.includes('buffer-e') || area.id.includes('buffer-b') || area.id.includes('real');
    if (isNumericArea) {
      const prefix = area.id.includes('buffer-e') ? 'E' : (area.id.includes('buffer-b') ? 'B' : 'BUF');
      return `${prefix}_${row + 1}_${col + 1}`;
    }
    const rowLetter = String.fromCharCode(65 + row);
    return `${rowLetter}${col + 1}`;
  };

  const getCurrentBufferOccupancy = () => {
    const area = getCurrentBufferArea();
    const total = area.rows * area.cols;
    const occupiedSlots = area.slots.filter(slot => !!slot.containerNo);
    const occupied = occupiedSlots.length;
    
    let totalFull = 0;
    let totalEmpty = 0;

    area.slots.forEach(slot => {
      if (!slot.containerNo) return;
      
      if (slot.stack && slot.stack.length > 0) {
        slot.stack.forEach(stackedSlot => {
          const status = (stackedSlot.status || 'CHEIO').toUpperCase();
          if (status.includes('VAZIO') || status.includes('EMP')) {
            totalEmpty++;
          } else {
            totalFull++;
          }
        });
      } else {
        const status = (slot.status || 'CHEIO').toUpperCase();
        if (status.includes('VAZIO') || status.includes('EMP')) {
          totalEmpty++;
        } else {
          totalFull++;
        }
      }
    });

    const empty = total - occupied;
    const percentage = total > 0 ? Math.round((occupied / total) * 100) : 0;
    const optimalCount = occupiedSlots.filter(slot => !!slot.isOptimalPickup).length;
    return { total, occupied, empty, percentage, optimalCount, totalFull, totalEmpty };
  };

  const getOptimalPickupList = () => {
    const area = getCurrentBufferArea();
    return area.slots
      .filter(slot => !!slot.containerNo && !!slot.isOptimalPickup)
      .map(slot => ({
        ...slot,
        areaId: area.id,
        areaName: area.name
      }));
  };

  const handleSlotClick = (row: number, col: number) => {
    const slot = getSlotAt(row, col) || { row, col };
    
    // Normalize slot to have a stack array
    const stack = slot.stack && slot.stack.length > 0
      ? [...slot.stack]
      : (slot.containerNo ? [{
          row: slot.row,
          col: slot.col,
          containerNo: slot.containerNo,
          cargoType: slot.cargoType || '',
          size: slot.size || "40' HC",
          priority: slot.priority || 'NORMAL',
          isOptimalPickup: !!slot.isOptimalPickup,
          status: slot.status || 'CHEIO',
          entryTime: slot.entryTime || '',
          danfe: slot.danfe || '',
          origin: slot.origin || '',
          loteNo: slot.loteNo || '',
          statusRecebimento: slot.statusRecebimento || '',
          validade: slot.validade || '',
          updatedAt: slot.updatedAt
        }] : []);

    const activeIndex = stack.length > 0 ? stack.length - 1 : 0;
    const activeLayer: Partial<BufferSlot> = stack[activeIndex] || {};

    setEditingSlot({
      row: slot.row,
      col: slot.col,
      containerNo: activeLayer.containerNo || '',
      cargoType: activeLayer.cargoType || 'Dolphin Mini EV',
      size: activeLayer.size || "40' HC",
      priority: activeLayer.priority || 'NORMAL',
      isOptimalPickup: !!activeLayer.isOptimalPickup,
      status: activeLayer.status || 'CHEIO',
      entryTime: activeLayer.entryTime || '',
      danfe: activeLayer.danfe || '',
      origin: activeLayer.origin || '',
      loteNo: activeLayer.loteNo || '',
      statusRecebimento: activeLayer.statusRecebimento || '',
      validade: activeLayer.validade || '',
      updatedAt: slot.updatedAt || new Date().toISOString().split('T')[0],
      stack: stack
    });
    setEditingStackIndex(activeIndex);
    setEditingSlotAreaId(activeBufferId);
  };

  const handleSaveSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot || !editingSlotAreaId) return;

    // Update the active layer in our local stack copy
    const updatedStack = editingSlot.stack ? [...editingSlot.stack] : [];
    const layerData: BufferSlot = {
      row: editingSlot.row,
      col: editingSlot.col,
      containerNo: editingSlot.containerNo ? editingSlot.containerNo.trim().toUpperCase() : '',
      cargoType: editingSlot.cargoType || '',
      size: editingSlot.size || "40' HC",
      priority: editingSlot.priority || 'NORMAL',
      isOptimalPickup: !!editingSlot.isOptimalPickup,
      status: editingSlot.status || 'CHEIO',
      entryTime: editingSlot.entryTime || '',
      danfe: editingSlot.danfe || '',
      origin: editingSlot.origin || '',
      loteNo: editingSlot.loteNo || '',
      statusRecebimento: editingSlot.statusRecebimento || '',
      validade: editingSlot.validade || '',
      updatedAt: new Date().toISOString().split('T')[0]
    };

    if (updatedStack.length > 0 && editingStackIndex >= 0 && editingStackIndex < updatedStack.length) {
      updatedStack[editingStackIndex] = layerData;
    } else {
      updatedStack.push(layerData);
    }

    setBufferAreas(prev => prev.map(area => {
      if (area.id !== editingSlotAreaId) return area;

      const updatedSlots = [...area.slots];
      const slotIndex = updatedSlots.findIndex(s => s.row === editingSlot.row && s.col === editingSlot.col);

      // Main slot container is the topmost container in the stack
      const validLayers = updatedStack.filter(item => !!item.containerNo);
      const topLayer: Partial<BufferSlot> = validLayers[validLayers.length - 1] || {};

      const newSlotData: BufferSlot = {
        row: editingSlot.row,
        col: editingSlot.col,
        containerNo: topLayer.containerNo || '',
        cargoType: topLayer.cargoType || '',
        size: topLayer.size || "40' HC",
        priority: topLayer.priority || 'NORMAL',
        isOptimalPickup: !!topLayer.isOptimalPickup,
        status: topLayer.status || 'CHEIO',
        entryTime: topLayer.entryTime || '',
        danfe: topLayer.danfe || '',
        origin: topLayer.origin || '',
        loteNo: topLayer.loteNo || '',
        statusRecebimento: topLayer.statusRecebimento || '',
        validade: topLayer.validade || '',
        updatedAt: new Date().toISOString().split('T')[0],
        stack: validLayers
      };

      if (slotIndex > -1) {
        if (!newSlotData.containerNo) {
          // If no containers left, clear slot
          updatedSlots[slotIndex] = { row: editingSlot.row, col: editingSlot.col };
        } else {
          updatedSlots[slotIndex] = newSlotData;
        }
      } else if (newSlotData.containerNo) {
        updatedSlots.push(newSlotData);
      }

      return {
        ...area,
        slots: updatedSlots
      };
    }));

    setEditingSlot(null);
    setEditingSlotAreaId(null);
  };

  const handleClearSlot = () => {
    if (!editingSlot || !editingSlotAreaId) return;

    setBufferAreas(prev => prev.map(area => {
      if (area.id !== editingSlotAreaId) return area;

      const updatedSlots = [...area.slots];
      const slotIndex = updatedSlots.findIndex(s => s.row === editingSlot.row && s.col === editingSlot.col);

      if (slotIndex > -1) {
        updatedSlots[slotIndex] = {
          row: editingSlot.row,
          col: editingSlot.col
        };
      }

      return {
        ...area,
        slots: updatedSlots
      };
    }));

    setEditingSlot(null);
    setEditingSlotAreaId(null);
  };

  const handleCreateNewBufferZone = () => {
    const name = prompt(
      language === 'zh' ? '请输入新双语缓冲区名称：' : 'Digite o nome da nova Área de Buffer:',
      `BYD Buffer Gamma (Peças / 零部件区)`
    );
    if (!name) return;

    const rowsInput = prompt(language === 'zh' ? '请输入行数（1 - 10）：' : 'Digite a quantidade de Linhas (1 - 10):', '5');
    const colsInput = prompt(language === 'zh' ? '请输入列数（1 - 15）：' : 'Digite a quantidade de Colunas (1 - 15):', '6');

    const rows = parseInt(rowsInput || '') || 5;
    const cols = parseInt(colsInput || '') || 6;

    if (rows < 1 || rows > 10 || cols < 1 || cols > 15) {
      alert(language === 'zh' ? '行数或列数超出范围（1-10行，1-15列）。' : 'Dimensões fora dos limites suportados (1-10 linhas, 1-15 colunas).');
      return;
    }

    const id = `buffer-custom-${Date.now()}`;
    const newArea: BufferArea = {
      id,
      name,
      rows,
      cols,
      slots: []
    };

    setBufferAreas(prev => [...prev, newArea]);
    setActiveBufferId(id);
  };

  const handleDeleteBufferZone = () => {
    const area = getCurrentBufferArea();
    if (!area) return;

    if (bufferAreas.length <= 1) {
      alert(language === 'zh'
        ? "至少需要保留一个缓冲区区域，无法删除最后一个。"
        : "É necessário manter pelo menos uma área de buffer. Não é possível excluir a última.");
      return;
    }

    const title = language === 'zh' ? '删除缓冲区区域' : 'Excluir Área de Buffer';
    const confirmMessage = language === 'zh'
      ? `您确定要删除缓冲区区域 "${area.name}" 吗？此区域内的所有堆位信息都将丢失！`
      : `Tem certeza que deseja excluir a área de buffer "${area.name}"? Todos os contêineres e informações desta área serão perdidos permanentemente!`;

    requestConfirmation(title, confirmMessage, () => {
      const remainingAreas = bufferAreas.filter(a => a.id !== area.id);
      setBufferAreas(remainingAreas);
      setActiveBufferId(remainingAreas[0].id);

      alert(language === 'zh'
        ? `已成功删除缓冲区区域 "${area.name}"。`
        : `Área de buffer "${area.name}" excluída com sucesso.`);
    });
  };

  const handleExportBufferLayout = () => {
    const area = getCurrentBufferArea();
    
    const headers = [
      language === 'zh' ? '堆位坐标' : 'Posição',
      language === 'zh' ? '集装箱号' : 'Contêiner',
      language === 'zh' ? '货物类型 / 车型' : 'Modelo / Carga',
      language === 'zh' ? '尺寸' : 'Tamanho',
      language === 'zh' ? '优先级' : 'Prioridade',
      language === 'zh' ? '最佳发运 (⚡)' : 'Melhor Posicionado',
      language === 'zh' ? '最近更新日期' : 'Última Atualização'
    ];

    const dataRows = [];
    for (let r = 0; r < area.rows; r++) {
      for (let c = 0; c < area.cols; c++) {
        const slot = area.slots.find(s => s.row === r && s.col === c);
        const coords = getSlotCoordsLabel(r, c);
        
        if (slot && slot.containerNo) {
          dataRows.push([
            coords,
            slot.containerNo,
            slot.cargoType || 'N/A',
            slot.size || "40' HC",
            slot.priority || 'NORMAL',
            slot.isOptimalPickup ? 'SIM / YES' : 'NÃO / NO',
            slot.updatedAt || ''
          ]);
        } else {
          dataRows.push([
            coords,
            'LIVRE / VACANT',
            '',
            '',
            '',
            '',
            ''
          ]);
        }
      }
    }

    const ws = XLSX.utils.aoa_to_sheet([
      [area.name],
      [],
      headers,
      ...dataRows
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Buffer Map");

    XLSX.writeFile(wb, `${area.name.replace(/\s+/g, '_')}_Layout.xlsx`);
  };

  const handleImportBufferExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        if (!bstr) return;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        
        // Convert sheet to JSON array of arrays
        const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        if (data.length <= 1) {
          alert(language === 'zh' ? '表格为空或无数据！' : 'Planilha vazia ou sem dados!');
          return;
        }

        // Identify column headers (case-insensitive and trimmed)
        const headers = data[0].map(h => String(h || '').trim().toLowerCase());
        
        // Highly robust and targeted column identification
        const containerNoIdx = headers.findIndex(h => 
          h === 'cód. contêiner' || h === 'cod. conteiner' || h === 'container' || h === 'container no' ||
          h.includes('cód. contêiner') || h.includes('cod. conteiner') || h.includes('container') || h.includes('箱号')
        );

        const locationIdx = headers.findIndex(h => 
          h === 'locação' || h === 'locacao' || h === 'location' || h === 'posição' || h === 'posicao' ||
          h.includes('locação') || h.includes('locacao') || h.includes('posição') || h.includes('posicao') || h.includes('堆位')
        );

        // Avoid partial match with 'tipo de veículo'
        const typeIdx = headers.findIndex(h => 
          h === 'tipo' || h === 'tipo de contêiner' || h === 'tipo de container' || h === 'status' || h === 'estado' ||
          (h.includes('tipo') && !h.includes('veículo') && !h.includes('veiculo')) || h.includes('status') || h.includes('estado')
        );

        const carSystemIdx = headers.findIndex(h => 
          h === 'sistema de carro' || h === 'car system' || h === 'modelo' || h === '车型' ||
          h.includes('sistema de carro') || h.includes('car system') || h.includes('modelo') || h.includes('车型')
        );

        // Target 'tempo de entrada no pátio'
        const entryTimeIdx = headers.findIndex(h => 
          h === 'tempo de entrada no pátio' || h === 'tempo de entrada no patio' || h === 'tempo de entrada' || h === 'entrada' ||
          h.includes('tempo de entrada') || h.includes('entrada') || h.includes('tempo') || h.includes('时间')
        );

        // Additional valuable WMS metadata columns
        const danfeIdx = headers.findIndex(h => 
          h === 'danfe' || h.includes('danfe') || h.includes('nota fiscal') || h.includes('nf-e')
        );

        const originIdx = headers.findIndex(h => 
          h === 'origem do contêiner' || h === 'origem do container' || h === 'origem' || h.includes('origem') || h.includes('origin')
        );

        const loteNoIdx = headers.findIndex(h => 
          h === 'nº do lote' || h === 'no do lote' || h === 'lote' || h.includes('lote') || h.includes('batch')
        );

        const statusRecebimentoIdx = headers.findIndex(h => 
          h === 'status do recebimento' || h.includes('recebimento') || h.includes('receipt')
        );

        const validadeIdx = headers.findIndex(h => 
          h === 'data de validade' || h === 'validade' || h === 'vencimento' || h === 'free time' ||
          h.includes('validade') || h.includes('free time') || h.includes('vencimento') || h.includes('validity') || h.includes('expire')
        );

        const vehicleTypeIdx = headers.findIndex(h => 
          h === 'tipo de veículo' || h === 'tipo de veiculo' || h.includes('veículo') || h.includes('veiculo') || h.includes('tamanho')
        );

        if (containerNoIdx === -1 || locationIdx === -1) {
          alert(language === 'zh' 
            ? '未能识别“Cód. Contêiner”（集装箱号）或“Locação”（堆位）列，请检查文件表头。' 
            : 'Colunas "Cód. Contêiner" e/ou "Locação" não encontradas! Verifique o cabeçalho da planilha.');
          return;
        }

        // We will group containers by area and location
        // Map of areaId -> { [coords]: BufferSlot[] }
        const parsedGroups: { [areaId: string]: { [coords: string]: BufferSlot[] } } = {};
        
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length === 0) continue;

          const rawContainerNo = row[containerNoIdx];
          const rawLocation = row[locationIdx];
          if (!rawContainerNo || !rawLocation) continue;

          const containerNo = String(rawContainerNo).trim().toUpperCase();
          const locationStr = String(rawLocation).trim();

          // Parse location e.g. E_2_8 or B_12_1
          const match = locationStr.match(/^([A-Za-z0-9]+)_([0-9]+)_([0-9]+)$/);
          if (!match) continue;

          const areaPrefix = match[1].toUpperCase();
          const rowNum = parseInt(match[2]);
          const colNum = parseInt(match[3]);

          if (isNaN(rowNum) || isNaN(colNum)) continue;

          // Convert to 0-based indices
          const rIdx = rowNum - 1;
          const cIdx = colNum - 1;

          // Resolve area ID and Area Name
          const areaId = `buffer-${areaPrefix.toLowerCase()}`;

          let rawType = typeIdx !== -1 && row[typeIdx] ? String(row[typeIdx]).trim() : 'Cheio';
          let statusStr = rawType.toLowerCase().includes('vaz') || rawType.toLowerCase().includes('emp') ? 'VAZIO' : 'CHEIO';

          let rawCarSystem = carSystemIdx !== -1 && row[carSystemIdx] ? String(row[carSystemIdx]).trim() : 'EQEKL';
          let entryTimeStr = entryTimeIdx !== -1 && row[entryTimeIdx] ? String(row[entryTimeIdx]).trim() : '';

          let rawDanfe = danfeIdx !== -1 && row[danfeIdx] ? String(row[danfeIdx]).trim() : '';
          let rawOrigin = originIdx !== -1 && row[originIdx] ? String(row[originIdx]).trim() : '';
          let rawLoteNo = loteNoIdx !== -1 && row[loteNoIdx] ? String(row[loteNoIdx]).trim() : '';
          let rawStatusRecebimento = statusRecebimentoIdx !== -1 && row[statusRecebimentoIdx] ? String(row[statusRecebimentoIdx]).trim() : '';
          let rawValidade = validadeIdx !== -1 && row[validadeIdx] ? String(row[validadeIdx]).trim() : '';
          
          let rawVehicleType = vehicleTypeIdx !== -1 && row[vehicleTypeIdx] ? String(row[vehicleTypeIdx]).trim() : '';
          let sizeStr = "40' HC";
          if (rawVehicleType.includes('20')) {
            sizeStr = "20' GP";
          } else if (rawVehicleType.includes('40')) {
            sizeStr = "40' HC";
          }

          const slotData: BufferSlot = {
            row: rIdx,
            col: cIdx,
            containerNo,
            cargoType: rawCarSystem,
            size: sizeStr,
            priority: "NORMAL",
            isOptimalPickup: false,
            status: statusStr,
            entryTime: entryTimeStr,
            danfe: rawDanfe,
            origin: rawOrigin,
            loteNo: rawLoteNo,
            statusRecebimento: rawStatusRecebimento,
            validade: rawValidade,
            updatedAt: new Date().toISOString().split('T')[0]
          };

          if (!parsedGroups[areaId]) {
            parsedGroups[areaId] = {};
          }

          const coordKey = `${rIdx}_${cIdx}`;
          if (!parsedGroups[areaId][coordKey]) {
            parsedGroups[areaId][coordKey] = [];
          }

          parsedGroups[areaId][coordKey].push(slotData);
        }

        // Now we integrate these into bufferAreas
        setBufferAreas(prev => {
          const updatedAreas = [...prev];

          Object.keys(parsedGroups).forEach(areaId => {
            const coordsMap = parsedGroups[areaId];

            // Calculate max rows and cols needed
            let maxRow = 4;
            let maxCol = 6;
            Object.keys(coordsMap).forEach(key => {
              const [r, c] = key.split('_').map(Number);
              if (r >= maxRow) maxRow = r + 1;
              if (c >= maxCol) maxCol = c + 1;
            });

            // Ensure we have some safe padding or standard sizes
            if (areaId.includes('-e') && maxRow < 12) maxRow = 12;
            if (areaId.includes('-e') && maxCol < 10) maxCol = 10;
            if (areaId.includes('-b') && maxRow < 13) maxRow = 13;
            if (areaId.includes('-b') && maxCol < 6) maxCol = 6;

            // Find if area already exists
            let areaIndex = updatedAreas.findIndex(a => a.id === areaId);
            const areaPrefix = areaId.split('-')[1].toUpperCase();
            const areaName = `BYD Buffer ${areaPrefix} (Zona ${areaPrefix} / ${areaPrefix}区 - Ativo)`;

            const slots: BufferSlot[] = [];

            // Process slots and stacks
            Object.keys(coordsMap).forEach(key => {
              const [r, c] = key.split('_').map(Number);
              const containersInSlot = coordsMap[key];

              // Sort by entryTime to preserve stacking order (earliest entry = bottom, latest entry = top)
              containersInSlot.sort((a, b) => {
                const parseDate = (str: string | undefined) => {
                  if (!str) return 0;
                  const d = Date.parse(str.replace(/-/g, '/'));
                  return isNaN(d) ? 0 : d;
                };
                return parseDate(a.entryTime) - parseDate(b.entryTime);
              });

              const topContainer = containersInSlot[containersInSlot.length - 1];

              slots.push({
                row: r,
                col: c,
                containerNo: topContainer.containerNo,
                cargoType: topContainer.cargoType,
                size: topContainer.size,
                priority: topContainer.priority,
                isOptimalPickup: topContainer.isOptimalPickup,
                status: topContainer.status,
                entryTime: topContainer.entryTime,
                danfe: topContainer.danfe,
                origin: topContainer.origin,
                loteNo: topContainer.loteNo,
                statusRecebimento: topContainer.statusRecebimento,
                validade: topContainer.validade,
                updatedAt: topContainer.updatedAt,
                stack: containersInSlot // all containers in stack from bottom to top
              });
            });

            const newArea: BufferArea = {
              id: areaId,
              name: areaName,
              rows: maxRow,
              cols: maxCol,
              slots: slots
            };

            if (areaIndex > -1) {
              // Update existing area
              updatedAreas[areaIndex] = newArea;
            } else {
              // Add new area
              updatedAreas.push(newArea);
            }
          });

          return updatedAreas;
        });

        // Set the active buffer to the first imported area
        const firstAreaId = Object.keys(parsedGroups)[0];
        if (firstAreaId) {
          setActiveBufferId(firstAreaId);
        }

        alert(language === 'zh'
          ? `导入成功！已更新 ${Object.keys(parsedGroups).length} 个缓冲区区域。`
          : `Importação realizada com sucesso! Foram atualizadas ${Object.keys(parsedGroups).length} áreas de buffer de acordo com as coordenadas da planilha.`);

        // Reset file input
        const fInput = document.getElementById('excel_upload_buffer_input') as HTMLInputElement;
        if (fInput) fInput.value = '';

      } catch (err) {
        console.error("Erro ao processar planilha de Buffer:", err);
        alert(language === 'zh'
          ? "解析缓冲区表格失败，请验证格式。"
          : "Erro ao processar planilha de Buffer. Verifique se o formato segue o padrão de locações (Ex: E_2_8).");
      }
    };
    reader.readAsBinaryString(file);
  };

  // RESETAR PARA DADOS DA IMAGEM ORIGINAL
  const resetToOriginal = () => {
    const title = language === 'bilingual' ? 'Restaurar Dados / 还原数据' : 'Restaurar Dados';
    const message = language === 'bilingual'
      ? "Deseja restaurar todos os dados originais da imagem capturada? / 是否要还原并保存为默认原始数据？"
      : "Deseja restaurar todos os dados originais da imagem capturada?";

    requestConfirmation(title, message, async () => {
      setYards(JSON.parse(JSON.stringify(ORIGINAL_YARDS)));
      setVessels(JSON.parse(JSON.stringify(ORIGINAL_VESSELS)));
      setChartLeft(JSON.parse(JSON.stringify(ORIGINAL_CHART_LEFT)));
      setChartRight(JSON.parse(JSON.stringify(ORIGINAL_CHART_RIGHT)));
      
      const defaultYardsComment = "Inserir comentários sobre a capacidade e ocupação dos pátios de forma bilíngue aqui. / 在此输入关于堆场容量、占用比率的双语说明。";
      const defaultVesselNote1 = "Escala regular de navios activa - Monitoramento detalhado das janelas de atracação. / 常规活跃船舶靠泊计划 - 详细监控 and 管理泊位窗口。";
      const defaultVesselNote2 = "Destaques operacionais dos navios (Ex: Prioridades de descarga BYD). / 船舶运营重点亮点 (例如：比亚迪重箱卸船优先顺序)。";
      const defaultChartNote1 = "Comentários sobre o Backlog Projetado vs Capacidade de Entrega Semanal. / 预测积压量与周度交付能力的对比分析说明。";
      const defaultChartNote2 = "Análise de gargalos e metas diárias garantidas (meta Gc de 140). / 关于每日进箱量与保证目标 (Gc 140) 的瓶颈 analysis 和建议。";

      setYardsComment(defaultYardsComment);
      setVesselNote1(defaultVesselNote1);
      setVesselNote2(defaultVesselNote2);
      setChartNote1(defaultChartNote1);
      setChartNote2(defaultChartNote2);
      setScenarioValue(210);

      try {
        // Encontra e atualiza coleção 'config'
        await setDoc(doc(db, 'config', 'global'), {
          language,
          slideTitlePT,
          slideTitleZH,
          watermarkText,
          showWatermark,
          theme,
          widescreenMode,
          slideWidth,
          yardsComment: defaultYardsComment,
          vesselNote1: defaultVesselNote1,
          vesselNote2: defaultVesselNote2,
          chartNote1: defaultChartNote1,
          chartNote2: defaultChartNote2,
          scenarioValue: 210
        });

        // Grava pátios (yards)
        const yardsSnap = await getDocs(collection(db, 'yards'));
        const batchY = writeBatch(db);
        yardsSnap.forEach(dSnap => batchY.delete(doc(db, 'yards', dSnap.id)));
        await batchY.commit();

        const batchY2 = writeBatch(db);
        Object.entries(ORIGINAL_YARDS).forEach(([key, val]) => {
          batchY2.set(doc(db, 'yards', key), val);
        });
        await batchY2.commit();

        // Grava navios (vessels)
        const vesselsSnap = await getDocs(collection(db, 'vessels'));
        const batchV = writeBatch(db);
        vesselsSnap.forEach(dSnap => batchV.delete(doc(db, 'vessels', dSnap.id)));
        await batchV.commit();

        const batchV2 = writeBatch(db);
        ORIGINAL_VESSELS.forEach((vessel) => {
          batchV2.set(doc(db, 'vessels', String(vessel.id)), vessel);
        });
        await batchV2.commit();

        // Grava chartLeft
        const clSnap = await getDocs(collection(db, 'chartLeft'));
        const batchCL = writeBatch(db);
        clSnap.forEach(dSnap => batchCL.delete(doc(db, 'chartLeft', dSnap.id)));
        await batchCL.commit();

        const batchCL2 = writeBatch(db);
        ORIGINAL_CHART_LEFT.forEach((item, index) => {
          const id = String(index).padStart(3, '0');
          batchCL2.set(doc(db, 'chartLeft', id), item);
        });
        await batchCL2.commit();

        // Grava chartRight
        const crSnap = await getDocs(collection(db, 'chartRight'));
        const batchCR = writeBatch(db);
        crSnap.forEach(dSnap => batchCR.delete(doc(db, 'chartRight', dSnap.id)));
        await batchCR.commit();

        const batchCR2 = writeBatch(db);
        ORIGINAL_CHART_RIGHT.forEach((item, index) => {
          const id = String(index).padStart(3, '0');
          batchCR2.set(doc(db, 'chartRight', id), item);
        });
        await batchCR2.commit();

        // Grava containers
        setContainers(JSON.parse(JSON.stringify(INITIAL_CONTAINERS)));
        const containersSnap = await getDocs(collection(db, 'containers'));
        const batchC = writeBatch(db);
        containersSnap.forEach(dSnap => batchC.delete(doc(db, 'containers', dSnap.id)));
        await batchC.commit();

        const batchC2 = writeBatch(db);
        INITIAL_CONTAINERS.forEach((c) => {
          batchC2.set(doc(db, 'containers', c.id), {
            id: c.id,
            yardId: c.yardId,
            vesselName: c.vesselName,
            size: c.size,
            status: c.status,
            category: c.category
          });
        });
        await batchC2.commit();

      } catch (err) {
        console.error("Erro ao resetar dados no Firestore:", err);
      }
    });
  };

  // Local filter states for container modal
  const [containerSearch, setContainerSearch] = useState("");
  const [containerStatusFilter, setContainerStatusFilter] = useState("ALL");
  const [containerCategoryFilter, setContainerCategoryFilter] = useState("ALL");
  const [selectedContainerIds, setSelectedContainerIds] = useState<string[]>([]);

  // Clear selection when yard or filters change to avoid accidental out-of-view deletions
  useEffect(() => {
    setSelectedContainerIds([]);
  }, [selectedYardKey, containerSearch, containerStatusFilter, containerCategoryFilter]);

  const handleBulkDeleteContainers = () => {
    if (selectedContainerIds.length === 0) return;
    
    const title = language === 'bilingual' ? 'Confirmar Exclusão / 确认删除' : 'Confirmar Exclusão';
    const message = language === 'bilingual' 
      ? `Deseja realmente remover os ${selectedContainerIds.length} contêineres selecionados? / 确定要删除选中的 ${selectedContainerIds.length} 个集装箱吗？` 
      : `Deseja realmente remover os ${selectedContainerIds.length} contêineres selecionados?`;

    requestConfirmation(title, message, async () => {
      try {
        const batch = writeBatch(db);
        
        let decCheio = 0;
        let decVazio = 0;
        let decPorto = 0;
        let decProntoColeta = 0;
        let decDelivered = 0;

        selectedContainerIds.forEach(id => {
          const container = containers.find(c => c.id === id);
          if (container && container.yardId === selectedYardKey) {
            batch.delete(doc(db, 'containers', id));
            
            if (container.status === 'CHEIO') decCheio++;
            else decVazio++;

            if (container.category === 'PORTO') decPorto++;
            else if (container.category === 'PRONTO_COLETA') decProntoColeta++;
            else if (container.category === 'DELIVERED') decDelivered++;
          }
        });

        const yardRef = doc(db, 'yards', selectedYardKey);
        const currentYard = yards[selectedYardKey];
        if (currentYard) {
          batch.update(yardRef, {
            cheio: Math.max(0, (currentYard.cheio || 0) - decCheio),
            vazio: Math.max(0, (currentYard.vazio || 0) - decVazio),
            porto: Math.max(0, (currentYard.porto || 0) - decPorto),
            prontoColeta: Math.max(0, (currentYard.prontoColeta || 0) - decProntoColeta),
            delivered: Math.max(0, (currentYard.delivered || 0) - decDelivered)
          });
        }

        await batch.commit();
        setSelectedContainerIds([]);
      } catch (error) {
        console.error("Erro ao deletar contêineres em lote:", error);
        alert("Erro ao realizar a exclusão em lote / 批量删除失败");
      }
    });
  };

  const handleClearYard = () => {
    if (!selectedYardKey) return;
    const yardContainers = containers.filter(c => c.yardId === selectedYardKey);
    if (yardContainers.length === 0) {
      alert(language === 'bilingual' 
        ? 'Não há contêineres neste pátio para limpar. / 该堆场中没有可清除的集装箱。' 
        : 'Não há contêineres neste pátio para limpar.');
      return;
    }

    const title = language === 'bilingual' ? 'Limpar Pátio / 清空堆场' : 'Limpar Pátio';
    const message = language === 'bilingual'
      ? `ATENÇÃO: Deseja realmente remover TODOS os ${yardContainers.length} contêineres do pátio ${yards[selectedYardKey]?.name}? Esta ação não pode ser desfeita. / 警告：确定要删除堆场 ${yards[selectedYardKey]?.name} 中的所有 ${yardContainers.length} 个集装箱吗？此操作无法撤销。`
      : `ATENÇÃO: Deseja realmente remover TODOS os ${yardContainers.length} contêineres do pátio ${yards[selectedYardKey]?.name}? Esta ação não pode ser desfeita.`;

    requestConfirmation(title, message, async () => {
      try {
        const batch = writeBatch(db);
        yardContainers.forEach(container => {
          batch.delete(doc(db, 'containers', container.id));
        });

        const yardRef = doc(db, 'yards', selectedYardKey);
        batch.update(yardRef, {
          cheio: 0,
          vazio: 0,
          porto: 0,
          prontoColeta: 0,
          delivered: 0
        });

        await batch.commit();
        setSelectedContainerIds([]);
      } catch (error) {
        console.error("Erro ao esvaziar pátio:", error);
        alert("Erro ao esvaziar o pátio / 清空堆场失败");
      }
    });
  };

  const handleDeleteContainer = (container: Container) => {
    const title = language === 'bilingual' ? 'Confirmar Exclusão / 确认删除' : 'Confirmar Exclusão';
    const message = language === 'bilingual' 
      ? `Deseja realmente remover o contêiner ${container.id}? / 确定要删除集装箱 ${container.id} 吗？` 
      : `Deseja realmente remover o contêiner ${container.id}?`;

    requestConfirmation(title, message, async () => {
      try {
        await deleteDoc(doc(db, 'containers', container.id));
        
        const yardRef = doc(db, 'yards', container.yardId);
        const currentYard = yards[container.yardId];
        if (currentYard) {
          const updateObj: any = {};
          if (container.status === 'CHEIO') {
            updateObj.cheio = Math.max(0, (currentYard.cheio || 0) - 1);
          } else {
            updateObj.vazio = Math.max(0, (currentYard.vazio || 0) - 1);
          }
          
          if (container.category === 'PORTO') {
            updateObj.porto = Math.max(0, (currentYard.porto || 0) - 1);
          } else if (container.category === 'PRONTO_COLETA') {
            updateObj.prontoColeta = Math.max(0, (currentYard.prontoColeta || 0) - 1);
          } else if (container.category === 'DELIVERED') {
            updateObj.delivered = Math.max(0, (currentYard.delivered || 0) - 1);
          }
          
          await updateDoc(yardRef, updateObj);
        }
      } catch (error) {
        console.error("Erro ao deletar contêiner:", error);
      }
    });
  };

  const handleAddContainer = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeYardKey = selectedYardKey || stockSelectedYardKey;
    if (!newContainerId.trim() || !activeYardKey) return;
    const cId = newContainerId.trim().toUpperCase();
    
    if (containers.some(c => c.id === cId)) {
      alert(language === 'bilingual' ? 'Contêiner já cadastrado! / 该集装箱已存在！' : 'Contêiner já cadastrado!');
      return;
    }
    
    try {
      await setDoc(doc(db, 'containers', cId), {
        id: cId,
        yardId: activeYardKey,
        size: newContainerSize,
        status: newContainerStatus,
        category: newContainerCategory,
        vesselName: newContainerVessel
      });
      
      const yardRef = doc(db, 'yards', activeYardKey);
      const currentYard = yards[activeYardKey];
      if (currentYard) {
        const updateObj: any = {};
        if (newContainerStatus === 'CHEIO') {
          updateObj.cheio = (currentYard.cheio || 0) + 1;
        } else {
          updateObj.vazio = (currentYard.vazio || 0) + 1;
        }
        
        if (newContainerCategory === 'PORTO') {
          updateObj.porto = (currentYard.porto || 0) + 1;
        } else if (newContainerCategory === 'PRONTO_COLETA') {
          updateObj.prontoColeta = (currentYard.prontoColeta || 0) + 1;
        } else if (newContainerCategory === 'DELIVERED') {
          updateObj.delivered = (currentYard.delivered || 0) + 1;
        }
        
        await updateDoc(yardRef, updateObj);
      }
      
      setNewContainerId("");
    } catch (error) {
      console.error("Erro ao adicionar contêiner:", error);
    }
  };

  const handleDownloadTemplate = () => {
    // Worksheet 1: Layout_Importacao
    const headers = [
      ["Identificacao", "Tamanho", "Status", "Categoria", "Navio"],
      ["MSCU4829104", "40' HC", "CHEIO", "PORTO", "MSC SAVONA"],
      ["BYDU9012487", "40' HC", "CHEIO", "PRONTO_COLETA", "MSC LA SPEZIA"],
      ["BYDU1029481", "40' HC", "VAZIO", "GERAL", "N/A"],
      ["MEDU7384910", "20' GP", "CHEIO", "DELIVERED", "MSC MARIACRISTINA"]
    ];
    
    // Worksheet 2: Instrucoes
    const instructions = [
      ["Coluna / Column", "Descricao / Description", "Valores Aceitos / Accepted Values", "Exemplo / Example"],
      ["Identificacao", "Número de identificação única do contêiner / Container unique ID number (11 chars)", "Texto livre (Ex: MSCU1234567) / String", "MSCU1234567"],
      ["Tamanho", "Tamanho ou dimensão do contêiner / Container physical size or dimensions", "20' GP, 40' HC, 40' OT (Default: 40' HC)", "40' HC"],
      ["Status", "Situação do contêiner (cheio ou vazio) / Container physical status (full/empty)", "CHEIO (ou FULL/重箱), VAZIO (ou EMPTY/空箱) (Default: CHEIO)", "CHEIO"],
      ["Categoria", "Categoria logística no pátio / Logistic category for the yard slot", "PORTO (港口), PRONTO_COLETA (待收箱), DELIVERED (已交付), GERAL (通用) (Default: GERAL)", "PRONTO_COLETA"],
      ["Navio", "Nome do navio associado ou N/A se nenhum / Name of the associated vessel", "Texto livre ou N/A (Default: N/A)", "MSC SAVONA"]
    ];

    const wb = XLSX.utils.book_new();
    
    const ws1 = XLSX.utils.aoa_to_sheet(headers);
    XLSX.utils.book_append_sheet(wb, ws1, "Layout_Importacao");
    
    const ws2 = XLSX.utils.aoa_to_sheet(instructions);
    XLSX.utils.book_append_sheet(wb, ws2, "Instrucoes_Layout");
    
    XLSX.writeFile(wb, "layout_importacao_conteineres.xlsx");
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const activeYardKey = selectedYardKey || stockSelectedYardKey;
    if (!file || !activeYardKey) return;
    
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        if (!bstr) return;
        const wb = XLSX.read(bstr, { type: 'binary' });
        
        // Find the sheet (either the first sheet, or named "Layout_Importacao" or "Template")
        const sheetName = wb.SheetNames.find(name => name.toLowerCase().includes('import') || name.toLowerCase().includes('template')) || wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        
        // Convert sheet to JSON array of arrays
        const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        if (data.length <= 1) {
          alert(language === 'bilingual' 
            ? 'Planilha vazia ou sem dados! / 表格为空或无数据！' 
            : 'Planilha vazia ou sem dados!');
          return;
        }
        
        // Let's identify column headers (case-insensitive and trimmed)
        const headers = data[0].map(h => String(h || '').trim().toLowerCase());
        
        // Map common headers flexibly
        const idIdx = headers.findIndex(h => h.includes('ident') || h.includes('id') || h.includes('box') || h.includes('nº') || h.includes('número') || h.includes('numero') || h.includes('container') || h.includes('箱号'));
        const sizeIdx = headers.findIndex(h => h.includes('taman') || h.includes('size') || h.includes('dimen') || h.includes('尺寸'));
        const statusIdx = headers.findIndex(h => h.includes('stat') || h.includes('situa') || h.includes('estado') || h.includes('状态'));
        const categoryIdx = headers.findIndex(h => h.includes('categ') || h.includes('tipo') || h.includes('class') || h.includes('类别'));
        const vesselIdx = headers.findIndex(h => h.includes('navio') || h.includes('vessel') || h.includes('ship') || h.includes('barco') || h.includes('船舶'));
        
        if (idIdx === -1) {
          alert(language === 'bilingual'
            ? 'Coluna "Identificacao" (ou similar) não encontrada! Verifique o modelo. / 未找到“箱号”列！请检查模板。'
            : 'Coluna "Identificacao" (ou similar) não encontrada! Certifique-se de usar os cabeçalhos padrão.');
          return;
        }
        
        const importedContainers: Container[] = [];
        const existingIds = new Set(containers.map(c => c.id));
        
        let dupCount = 0;
        let successCount = 0;
        
        // Stats increment counters for this import session
        let addCheio = 0;
        let addVazio = 0;
        let addPorto = 0;
        let addProntoColeta = 0;
        let addDelivered = 0;
        
        const batch = writeBatch(db);
        
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length === 0) continue;
          
          const rawId = row[idIdx];
          if (rawId === undefined || rawId === null || String(rawId).trim() === '') continue;
          
          const id = String(rawId).trim().toUpperCase();
          if (!id) continue;
          
          // Check for duplicate in the same upload file or in firestore
          if (existingIds.has(id) || importedContainers.some(c => c.id === id)) {
            dupCount++;
            continue;
          }
          
          // Size parsing
          let size = sizeIdx !== -1 && row[sizeIdx] ? String(row[sizeIdx]).trim() : "40' HC";
          if (!size.includes("'")) {
            if (size === "40" || size === "40HC" || size.toLowerCase().includes("hc")) size = "40' HC";
            else if (size === "20" || size === "20GP" || size.toLowerCase().includes("gp")) size = "20' GP";
            else if (size === "40OT" || size.toLowerCase().includes("ot")) size = "40' OT";
          }
          
          // Status parsing
          let rawStatus = statusIdx !== -1 && row[statusIdx] ? String(row[statusIdx]).trim().toUpperCase() : "CHEIO";
          let status: 'CHEIO' | 'VAZIO' = 'CHEIO';
          if (rawStatus.includes("VAZ") || rawStatus.includes("EMP") || rawStatus.includes("空") || rawStatus === "K" || rawStatus === "VACIO") {
            status = 'VAZIO';
          }
          
          // Category parsing
          let rawCategory = categoryIdx !== -1 && row[categoryIdx] ? String(row[categoryIdx]).trim().toUpperCase() : "GERAL";
          let category: 'PORTO' | 'PRONTO_COLETA' | 'DELIVERED' | 'GERAL' = 'GERAL';
          
          if (rawCategory.includes("PORT") || rawCategory.includes("港")) {
            category = 'PORTO';
          } else if (rawCategory.includes("PRON") || rawCategory.includes("COLE") || rawCategory.includes("REC") || rawCategory.includes("待")) {
            category = 'PRONTO_COLETA';
          } else if (rawCategory.includes("DELI") || rawCategory.includes("ENTR") || rawCategory.includes("PAG") || rawCategory.includes("交付")) {
            category = 'DELIVERED';
          }
          
          // Vessel parsing
          let vesselName = vesselIdx !== -1 && row[vesselIdx] ? String(row[vesselIdx]).trim() : "N/A";
          if (!vesselName || vesselName.toUpperCase() === "N/A" || vesselName === "-") {
            vesselName = "N/A";
          }
          
          const newCntr: Container = {
            id,
            yardId: activeYardKey,
            size,
            status,
            category,
            vesselName
          };
          
          importedContainers.push(newCntr);
          
          // Add to firestore batch
          batch.set(doc(db, 'containers', id), {
            id,
            yardId: activeYardKey,
            size,
            status,
            category,
            vesselName
          });
          
          // Update stat counters
          if (status === 'CHEIO') addCheio++;
          else addVazio++;
          
          if (category === 'PORTO') addPorto++;
          else if (category === 'PRONTO_COLETA') addProntoColeta++;
          else if (category === 'DELIVERED') addDelivered++;
          
          successCount++;
        }
        
        if (successCount > 0) {
          // Update Yard document stats in firestore
          const yardRef = doc(db, 'yards', activeYardKey);
          const currentYard = yards[activeYardKey];
          if (currentYard) {
            await updateDoc(yardRef, {
              cheio: (currentYard.cheio || 0) + addCheio,
              vazio: (currentYard.vazio || 0) + addVazio,
              porto: (currentYard.porto || 0) + addPorto,
              prontoColeta: (currentYard.prontoColeta || 0) + addProntoColeta,
              delivered: (currentYard.delivered || 0) + addDelivered
            });
          }
          
          await batch.commit();
          
          alert(language === 'bilingual'
            ? `Sucesso! Importados: ${successCount}. Duplicados ignorados: ${dupCount}. / 导入成功！共 ${successCount} 个，忽略重复 ${dupCount} 个。`
            : `Sucesso! Foram importados ${successCount} contêiner(es) com sucesso. ${dupCount} contêineres duplicados foram ignorados.`);
        } else {
          alert(language === 'bilingual'
            ? `Nenhum contêiner novo importado. Todos os ${dupCount} contêineres já existiam no sistema. / 未导入新集装箱。所有 ${dupCount} 个集装箱在系统中均已存在。`
            : `Nenhum contêiner novo foi importado. Todos os ${dupCount} contêineres já existiam no sistema.`);
        }
        
        // Reset file input
        const fInput = document.getElementById('excel_upload_input') as HTMLInputElement;
        if (fInput) fInput.value = '';
        const fInputStock = document.getElementById('excel_upload_input_stock') as HTMLInputElement;
        if (fInputStock) fInputStock.value = '';
        
      } catch (err) {
        console.error("Erro ao processar planilha Excel:", err);
        alert(language === 'bilingual'
          ? "Erro ao ler o arquivo Excel. Verifique se o formato está correto. / 读取Excel文件失败。请检查格式是否正确。"
          : "Erro ao processar o arquivo Excel. Certifique-se de que o arquivo não está corrompido e segue o padrão.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDownloadGlobalStockTemplate = () => {
    const headers = [
      "BL", 
      "CONTAINER", 
      "Warehouse", 
      "Navio", 
      "ETA", 
      "Free Time", 
      "Component", 
      "Modelo", 
      "Lote", 
      "Programação", 
      "Transportadora"
    ];
    
    const sampleData = [
      [
        "BL123456789", 
        "BYDU9876543", 
        "TPC", 
        "COSCO SHIPPING BRAZIL", 
        "2026-07-20", 
        "7 Dias", 
        "CKD", 
        "BYD SONG PLUS", 
        "LOTE 01", 
        "2026-07-25", 
        "SADA"
      ],
      [
        "BL987654321", 
        "BYDU4567890", 
        "TECON", 
        "MSC SINDY", 
        "2026-07-22", 
        "10 Dias", 
        "SKD", 
        "BYD DOLPHIN MINI", 
        "LOTE 02", 
        "2026-07-27", 
        "TEGMA"
      ]
    ];
    
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo_Estoque");
    
    const instructions = [
      ["INSTRUÇÕES PARA PREENCHIMENTO / 填写说明"],
      ["1. Não altere o nome das colunas do cabeçalho. / 请勿更改表头列名。"],
      ["2. Coluna 'Warehouse' suporta os seguintes valores (case-insensitive): / 'Warehouse'列支持以下值:"],
      ["   - TECON (Bonded / 保税)"],
      ["   - INTERMARITIMA (Bonded / 保税)"],
      ["   - TPC (Warehouse / 仓库)"],
      ["   - CLIA (Warehouse / 仓库)"],
      ["   - AG (Warehouse / 仓库)"],
      ["   - CTS (Warehouse / 仓库)"],
      ["3. Coluna 'CONTAINER' é obrigatória. / 'CONTAINER'列为必填项。"],
      ["4. Carga importada será inserida como Cheio (CHEIO) por padrão. / 导入货物默认设置为重箱(CHEIO)。"]
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(instructions);
    XLSX.utils.book_append_sheet(wb, ws2, "Instrucoes");
    
    XLSX.writeFile(wb, "modelo_atualizacao_estoque.xlsx");
  };

  const handleImportGlobalStockExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        if (!bstr) return;
        const wb = XLSX.read(bstr, { type: 'binary' });
        
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        
        const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        if (data.length <= 1) {
          alert(language === 'zh' ? '表格为空或无数据！' : 'Planilha vazia ou sem dados!');
          return;
        }
        
        const headers = data[0].map(h => String(h || '').trim().toLowerCase());
        
        const blIdx = headers.findIndex(h => h === 'bl' || h.includes('conhecimento') || h.includes('bill of lading'));
        const containerIdx = headers.findIndex(h => h.includes('container') || h.includes('contêiner') || h.includes('conteiner') || h.includes('box') || h.includes('箱号') || h === 'cntr');
        const warehouseIdx = headers.findIndex(h => h.includes('warehouse') || h.includes('armazem') || h.includes('armando') || h.includes('pátio') || h.includes('patio') || h.includes('local') || h.includes('仓库') || h.includes('堆场'));
        const navioIdx = headers.findIndex(h => h.includes('navio') || h.includes('vessel') || h.includes('ship') || h.includes('船舶'));
        const etaIdx = headers.findIndex(h => h === 'eta' || h.includes('chegada') || h.includes('prev'));
        const freeTimeIdx = headers.findIndex(h => h.includes('free time') || h.includes('freetime') || h.includes('demo') || h.includes('validade'));
        const componenteIdx = headers.findIndex(h => h.includes('comp') || h.includes('kd') || h.includes('skd'));
        const modeloIdx = headers.findIndex(h => h.includes('model') || h.includes('modelo') || h.includes('veiculo') || h.includes('车型'));
        const loteIdx = headers.findIndex(h => h.includes('lote') || h.includes('lot') || h.includes('batch'));
        const progIdx = headers.findIndex(h => h.includes('prog') || h.includes('date') || h.includes('sched') || h.includes('data') || h.includes('entrega') || h.includes('saida'));
        const transIdx = headers.findIndex(h => h.includes('transp') || h.includes('carrier') || h.includes('logistica'));

        if (containerIdx === -1) {
          alert(language === 'zh'
            ? '未找到“CONTAINER / 箱号”列！请检查表格格式。'
            : 'Coluna "CONTAINER" não encontrada! Certifique-se de que a planilha possui a coluna "CONTAINER".');
          return;
        }

        const getYardKeyFromWarehouseName = (name: string): string | null => {
          const clean = String(name || '').trim().toLowerCase();
          if (clean.includes('tecon')) return 'tecon';
          if (clean.includes('intermaritima') || clean.includes('intermar') || clean.includes('inter') || clean.includes('maritima')) return 'intermaritima';
          if (clean.includes('tpc')) return 'tpc';
          if (clean.includes('clia') || clean.includes('emporio')) return 'clia';
          if (clean.includes('ag') || clean.includes('cdex')) return 'ag';
          if (clean.includes('cts') || clean.includes('pontual')) return 'cts';
          return null;
        };

        let successCount = 0;
        let unknownYardsCount = 0;

        const yardsInExcel = new Set<string>();
        const parsedContainers: Container[] = [];

        const yardStatsMap: { [key: string]: { total: number; porto: number; pronto: number } } = {
          tecon: { total: 0, porto: 0, pronto: 0 },
          intermaritima: { total: 0, porto: 0, pronto: 0 },
          tpc: { total: 0, porto: 0, pronto: 0 },
          clia: { total: 0, porto: 0, pronto: 0 },
          ag: { total: 0, porto: 0, pronto: 0 },
          cts: { total: 0, porto: 0, pronto: 0 }
        };

        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length === 0) continue;

          const rawId = row[containerIdx];
          if (rawId === undefined || rawId === null || String(rawId).trim() === '') continue;

          const id = String(rawId).trim().toUpperCase();
          if (!id) continue;

          const rawWh = warehouseIdx !== -1 ? row[warehouseIdx] : '';
          const yardKey = getYardKeyFromWarehouseName(String(rawWh));

          if (!yardKey) {
            unknownYardsCount++;
            continue;
          }

          yardsInExcel.add(yardKey);

          const bl = blIdx !== -1 && row[blIdx] !== undefined && row[blIdx] !== null ? String(row[blIdx]).trim() : "";
          const vesselName = navioIdx !== -1 && row[navioIdx] !== undefined && row[navioIdx] !== null ? String(row[navioIdx]).trim() : "N/A";
          const eta = etaIdx !== -1 && row[etaIdx] !== undefined && row[etaIdx] !== null ? formatExcelDateIfNeeded(row[etaIdx]) : "";
          const freeTime = freeTimeIdx !== -1 && row[freeTimeIdx] !== undefined && row[freeTimeIdx] !== null ? formatExcelDateIfNeeded(row[freeTimeIdx]) : "";
          const componente = componenteIdx !== -1 && row[componenteIdx] !== undefined && row[componenteIdx] !== null ? String(row[componenteIdx]).trim() : "KD";
          const modelo = modeloIdx !== -1 && row[modeloIdx] !== undefined && row[modeloIdx] !== null ? String(row[modeloIdx]).trim() : "";
          const lote = loteIdx !== -1 && row[loteIdx] !== undefined && row[loteIdx] !== null ? String(row[loteIdx]).trim() : "";
          const programacao = progIdx !== -1 && row[progIdx] !== undefined && row[progIdx] !== null ? formatExcelDateIfNeeded(row[progIdx]) : "";
          const transportadora = transIdx !== -1 && row[transIdx] !== undefined && row[transIdx] !== null ? String(row[transIdx]).trim() : "";

          const category = (yards[yardKey]?.type === 'BONDED' ? 'PRONTO_COLETA' : 'GERAL') as 'PORTO' | 'PRONTO_COLETA' | 'DELIVERED' | 'GERAL';

          if (yardStatsMap[yardKey]) {
            yardStatsMap[yardKey].total++;
            if (category === 'PORTO') yardStatsMap[yardKey].porto++;
            else yardStatsMap[yardKey].pronto++;
          }

          parsedContainers.push({
            id,
            yardId: yardKey,
            vesselName: vesselName || "N/A",
            size: "40' HC",
            status: "CHEIO",
            category,
            bl,
            eta,
            freeTime,
            componente,
            modelo,
            lote,
            programacao,
            transportadora
          });

          successCount++;
        }

        setContainers(prev => {
          const kept = prev.filter(c => !yardsInExcel.has(c.yardId));
          return [...kept, ...parsedContainers];
        });

        setYards(prev => {
          const updated = { ...prev };
          yardsInExcel.forEach(yardKey => {
            if (updated[yardKey]) {
              const stats = yardStatsMap[yardKey];
              updated[yardKey] = {
                ...updated[yardKey],
                cheio: stats.total,
                vazio: 0,
                porto: stats.porto,
                prontoColeta: stats.pronto
              };
            }
          });
          return updated;
        });

        if (dbStatus === 'online') {
          const batch = writeBatch(db);

          const containersSnap = await getDocs(collection(db, 'containers'));
          containersSnap.forEach(dSnap => {
            const cData = dSnap.data();
            if (cData.yardId && yardsInExcel.has(cData.yardId)) {
              batch.delete(doc(db, 'containers', dSnap.id));
            }
          });

          parsedContainers.forEach(c => {
            batch.set(doc(db, 'containers', c.id), {
              id: c.id,
              yardId: c.yardId,
              vesselName: c.vesselName,
              size: c.size,
              status: c.status,
              category: c.category,
              bl: c.bl,
              eta: c.eta,
              freeTime: c.freeTime,
              componente: c.componente,
              modelo: c.modelo,
              lote: c.lote,
              programacao: c.programacao,
              transportadora: c.transportadora
            });
          });

          for (const yardKey of Array.from(yardsInExcel)) {
            const stats = yardStatsMap[yardKey];
            const yardRef = doc(db, 'yards', yardKey);
            if (stats && yards[yardKey]) {
              batch.update(yardRef, {
                cheio: stats.total,
                vazio: 0,
                porto: stats.porto,
                prontoColeta: stats.pronto
              });
            }
          }

          await batch.commit();
        }

        let alertMsg = '';
        if (language === 'zh') {
          alertMsg = `🎉 库存成功更新！\n- 导入集装箱数量: ${successCount}\n- 覆盖更新了 ${yardsInExcel.size} 个堆场/仓库。\n- 忽略了 ${unknownYardsCount} 行无法匹配堆场的行。`;
        } else {
          alertMsg = `🎉 Estoque atualizado com sucesso!\n- Contêineres importados: ${successCount}\n- Pátios/Armaréns atualizados: ${Array.from(yardsInExcel).map(k => yards[k]?.name || k).join(', ')}\n- Linhas com recintos desconhecidos ignoradas: ${unknownYardsCount}`;
        }
        alert(alertMsg);

        const gInput = document.getElementById('global_excel_upload_input') as HTMLInputElement;
        if (gInput) gInput.value = '';

      } catch (err) {
        console.error("Erro ao processar planilha global:", err);
        alert(language === 'zh'
          ? "处理 Excel 时出错，请检查格式是否正确！"
          : "Erro ao processar arquivo Excel. Verifique se o formato está correto.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleUpdateContainerField = async (containerId: string, field: keyof Container, value: string) => {
    setContainers(prev => prev.map(c => c.id === containerId ? { ...c, [field]: value } : c));
    
    if (dbStatus === 'online') {
      try {
        await updateDoc(doc(db, 'containers', containerId), {
          [field]: value
        });
      } catch (err) {
        console.warn("Erro ao salvar alteração de célula no Firestore:", err);
      }
    }
  };

  const handleDeleteContainerFromStock = async (containerId: string) => {
    const c = containers.find(x => x.id === containerId);
    if (!c) return;

    if (!window.confirm(`Deseja realmente remover o contêiner ${containerId} do estoque?`)) {
      return;
    }

    setContainers(prev => prev.filter(x => x.id !== containerId));

    const yardKey = c.yardId;
    if (yardKey && yards[yardKey]) {
      setYards(prev => {
        const updated = { ...prev };
        if (updated[yardKey]) {
          updated[yardKey].cheio = Math.max(0, (updated[yardKey].cheio || 0) - 1);
        }
        return updated;
      });
    }

    if (dbStatus === 'online') {
      try {
        await deleteDoc(doc(db, 'containers', containerId));
        if (yardKey && yards[yardKey]) {
          await updateDoc(doc(db, 'yards', yardKey), {
            cheio: Math.max(0, (yards[yardKey].cheio || 0) - 1)
          });
        }
      } catch (err) {
        console.warn("Erro ao deletar contêiner no Firestore:", err);
      }
    }
  };

  const handleExportStockToExcel = () => {
    const headers = [
      "BL", 
      "CONTAINER", 
      "Warehouse", 
      "Navio", 
      "ETA", 
      "Free Time", 
      "Component", 
      "Modelo", 
      "Lote", 
      "Programação", 
      "Transportadora"
    ];
    
    // We filter containers that belong to active non-buffer yards
    const stockList = containers.filter(c => {
      const yard = yards[c.yardId];
      if (!yard || yard.type === 'BUFFER') return false;
      if (globalStockWarehouseFilter !== 'ALL' && c.yardId !== globalStockWarehouseFilter) return false;
      if (globalStockLoteFilter !== 'ALL' && String(c.lote || '') !== globalStockLoteFilter) return false;
      if (globalStockSearch.trim()) {
        const q = globalStockSearch.trim().toLowerCase();
        const matchId = c.id.toLowerCase().includes(q);
        const matchBl = (c.bl || '').toLowerCase().includes(q);
        const matchVessel = (c.vesselName || '').toLowerCase().includes(q);
        const matchModelo = (c.modelo || '').toLowerCase().includes(q);
        const matchLote = String(c.lote || '').toLowerCase().includes(q);
        if (!matchId && !matchBl && !matchVessel && !matchModelo && !matchLote) return false;
      }
      return true;
    });

    const rows = stockList.map(c => [
      c.bl || "",
      c.id,
      yards[c.yardId]?.name || c.yardId,
      c.vesselName || "N/A",
      c.eta || "",
      c.freeTime || "",
      c.componente || "KD",
      c.modelo || "",
      c.lote || "",
      c.programacao || "",
      c.transportadora || ""
    ]);
    
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Estoque_Atual");
    XLSX.writeFile(wb, "estoque_patio_armazens_byd.xlsx");
  };

  // HELPER PARA CONVERSÃO DE CORES OKLCH / OKLAB PARA COR RESPEITADA PELO HTML2CANVAS
  const convertColorToRgb = (colorStr: string): string => {
    if (!colorStr) return colorStr;
    if (!colorStr.includes('oklch') && !colorStr.includes('oklab') && !colorStr.includes('color(')) {
      return colorStr;
    }
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = colorStr;
        const resolved = ctx.fillStyle;
        if (resolved && !resolved.includes('oklch') && !resolved.includes('oklab')) {
          return resolved;
        }
      }
    } catch (e) {
      // ignore
    }
    // Fallbacks baseados em padrões conhecidos caso falhe
    if (colorStr.includes('303.9')) return 'rgb(168, 85, 247)'; // purple-500
    if (colorStr.includes('0.5') || colorStr.includes('red')) return 'rgb(239, 68, 68)'; // red-500
    return 'rgb(100, 116, 139)'; // Slate neutro padrão
  };

  const replaceOklchInString = (str: string): string => {
    if (!str || (!str.includes('oklch') && !str.includes('oklab'))) return str;
    return str.replace(/(oklch|oklab)\([^)]+\)/g, (match) => {
      return convertColorToRgb(match);
    });
  };

  // GERAR E EXPORTAR SLIDE COMO PDF DE ALTA QUALIDADE
  const handleDownloadPDF = async () => {
    const slideElement = document.getElementById('slide-capture-area');
    if (!slideElement) return;

    // Estado e restauração de getComputedStyle para evitar o erro do parser html2canvas com oklch/oklab (Tailwind v4)
    const restoreFns: (() => void)[] = [];

    const patchWindowGetComputedStyle = (win: any) => {
      try {
        const original = win.getComputedStyle;
        win.getComputedStyle = function (elt: any, pseudoElt: any) {
          const style = original.call(win, elt, pseudoElt);
          return new Proxy(style, {
            get(target, prop) {
              const val = Reflect.get(target, prop);
              if (typeof val === 'string') {
                if (val.includes('oklch') || val.includes('oklab')) {
                  return replaceOklchInString(val);
                }
                return val;
              }
              if (typeof val === 'function') {
                if (prop === 'getPropertyValue') {
                  return function(propertyName: string) {
                    const originalVal = target.getPropertyValue(propertyName);
                    if (originalVal && (originalVal.includes('oklch') || originalVal.includes('oklab'))) {
                      return replaceOklchInString(originalVal);
                    }
                    return originalVal;
                  };
                }
                return val.bind(target);
              }
              return val;
            }
          });
        };
        restoreFns.push(() => {
          win.getComputedStyle = original;
        });
      } catch (err) {
        console.warn('Could not patch getComputedStyle on:', win, err);
      }
    };

    const originalScale = slideScale;
    const originalAutoFit = autoFit;

    try {
      setPdfStatus('rendering');
      
      // Salva escala atual e reseta para 1.0 para capturar o layout perfeitamente proporcional
      setAutoFit(false);
      setSlideScale(1.0);
      
      // Aguarda o React renderizar o slide em escala natural de 1.0 (200ms)
      await new Promise((resolve) => setTimeout(resolve, 220));

      // Patcheia a janela principal
      patchWindowGetComputedStyle(window);

      const canvas = await html2canvas(slideElement, {
        scale: 2.5, // Resolução de alta definição 2.5x para textos e detalhes vetoriais super nítidos
        useCORS: true,
        allowTaint: true,
        backgroundColor: theme === 'dark' ? '#0f172a' : '#FAFCFF',
        logging: false,
        onclone: (clonedDoc) => {
          // Patcheia a janela do iframe clonado
          const clonedWin = clonedDoc.defaultView;
          if (clonedWin) {
            patchWindowGetComputedStyle(clonedWin);
          }
        }
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      const pdf = new jsPDF({
        orientation: imgWidth > imgHeight ? 'l' : 'p',
        unit: 'px',
        format: [imgWidth, imgHeight],
        hotfixes: ['px_scaling']
      });

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      const today = new Date().toISOString().slice(0, 10);
      const fileName = `BYD_Logistics_Dashboard_${today}.pdf`;
      pdf.save(fileName);
      
      setPdfStatus('success');
      setTimeout(() => setPdfStatus('idle'), 3000);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setPdfStatus('error');
      setTimeout(() => setPdfStatus('idle'), 4000);
    } finally {
      // Sempre restaura o getComputedStyle original para evitar vazamentos de proxies
      restoreFns.forEach(restore => restore());
      setSlideScale(originalScale);
      setAutoFit(originalAutoFit);
    }
  };

  // GERAR E EXPORTAR TODO O DECK DE APRESENTAÇÃO (4 PÁGINAS) COMO UM ÚNICO PDF
  const handleDownloadAllSlidesPDF = async () => {
    const slideElement = document.getElementById('slide-capture-area');
    if (!slideElement) return;

    const restoreFns: (() => void)[] = [];
    const patchWindowGetComputedStyle = (win: any) => {
      try {
        const original = win.getComputedStyle;
        win.getComputedStyle = function (elt: any, pseudoElt: any) {
          const style = original.call(win, elt, pseudoElt);
          return new Proxy(style, {
            get(target, prop) {
              const val = Reflect.get(target, prop);
              if (typeof val === 'string') {
                if (val.includes('oklch') || val.includes('oklab')) {
                  return replaceOklchInString(val);
                }
                return val;
              }
              if (typeof val === 'function') {
                if (prop === 'getPropertyValue') {
                  return function(propertyName: string) {
                    const originalVal = target.getPropertyValue(propertyName);
                    if (originalVal && (originalVal.includes('oklch') || originalVal.includes('oklab'))) {
                      return replaceOklchInString(originalVal);
                    }
                    return originalVal;
                  };
                }
                return val.bind(target);
              }
              return val;
            }
          });
        };
        restoreFns.push(() => {
          win.getComputedStyle = original;
        });
      } catch (err) {
        console.warn('Could not patch getComputedStyle on:', win, err);
      }
    };

    const originalScale = slideScale;
    const originalAutoFit = autoFit;
    const originalSlide = currentSlide;

    try {
      setPdfStatus('rendering');
      setAutoFit(false);
      setSlideScale(1.0);

      let pdfInstance: jsPDF | null = null;

      for (let s = 0; s < 6; s++) {
        setCurrentSlide(s);
        // Aguarda a renderização do React a nível de DOM a cada página (250ms)
        await new Promise((resolve) => setTimeout(resolve, 250));

        // Patcheia computação de cor oklch
        const currentRestore: (() => void)[] = [];
        patchWindowGetComputedStyle(window);

        const canvas = await html2canvas(slideElement, {
          scale: 2.2, // Equilíbrio perfeito entre clareza vetorial e tamanho final para multi-pagina
          useCORS: true,
          allowTaint: true,
          backgroundColor: theme === 'dark' ? '#0f172a' : '#FAFCFF',
          logging: false,
          onclone: (clonedDoc) => {
            const clonedWin = clonedDoc.defaultView;
            if (clonedWin) {
              patchWindowGetComputedStyle(clonedWin);
            }
          }
        });

        restoreFns.forEach(restore => restore());
        restoreFns.length = 0;

        const imgData = canvas.toDataURL('image/png', 0.95);
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;

        if (!pdfInstance) {
          pdfInstance = new jsPDF({
            orientation: imgWidth > imgHeight ? 'l' : 'p',
            unit: 'px',
            format: [imgWidth, imgHeight],
            hotfixes: ['px_scaling']
          });
        } else {
          pdfInstance.addPage([imgWidth, imgHeight], imgWidth > imgHeight ? 'l' : 'p');
        }

        pdfInstance.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      }

      if (pdfInstance) {
        const today = new Date().toISOString().slice(0, 10);
        const fileName = `BYD_Logistics_Full_Deck_${today}.pdf`;
        pdfInstance.save(fileName);
      }

      setPdfStatus('success');
      setTimeout(() => setPdfStatus('idle'), 3000);
    } catch (error) {
      console.error('Error generating multipage PDF:', error);
      setPdfStatus('error');
      setTimeout(() => setPdfStatus('idle'), 4000);
    } finally {
      restoreFns.forEach(restore => restore());
      setCurrentSlide(originalSlide);
      setSlideScale(originalScale);
      setAutoFit(originalAutoFit);
    }
  };
  const handleYardChange = async (key: string, field: keyof Yard, value: string) => {
    const numericValue = Number(value);
    const finalVal = isNaN(numericValue) ? 0 : (numericValue >= 0 ? numericValue : 0);
    
    setYards(prev => {
      const updated = { ...prev };
      if (updated[key]) {
        updated[key] = {
          ...updated[key],
          [field]: finalVal
        };
      }
      return updated;
    });

    try {
      await updateDoc(doc(db, 'yards', key), {
        [field]: finalVal
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `yards/${key}`);
    }
  };

  // CÁLCULO DE OCUPAÇÃO DE PÁTIO
  const getYardOcupacao = (yard: Yard) => {
    const totalCap = yard.capacity || 1;
    const ocupado = yard.cheio + yard.vazio;
    return parseFloat(((ocupado / totalCap) * 100).toFixed(1));
  };

  // EXCLUIR NAVIO
  const deleteVessel = async (id: number) => {
    setVessels(vessels.filter(v => v.id !== id));

    try {
      await deleteDoc(doc(db, 'vessels', String(id)));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `vessels/${id}`);
    }
  };

  // ADICIONAR NAVIO
  const addVessel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVesselName || !newVesselEta) return;
    const newId = Date.now();
    const newV: Vessel = {
      id: newId,
      name: newVesselName.toUpperCase(),
      eta: newVesselEta,
      cntrs: Number(newVesselCntrs) || 0,
      order: vessels.length
    };
    
    setVessels([...vessels, newV]);
    setNewVesselName('');
    setNewVesselEta('');
    setNewVesselCntrs(1000);

    try {
      await setDoc(doc(db, 'vessels', String(newId)), {
        id: String(newId),
        name: newV.name,
        eta: newV.eta,
        cntrs: newV.cntrs,
        order: newV.order
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `vessels/${newId}`);
    }
  };

  // SHIFT / MOVER NAVIO NA FILA (MANUAL)
  const shiftVessel = async (id: number, direction: 'up' | 'down') => {
    const sorted = [...vessels];
    const index = sorted.findIndex(v => v.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sorted.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = sorted[index];
    sorted[index] = sorted[targetIndex];
    sorted[targetIndex] = temp;

    // Atualiza campo 'order' sequencialmente de 0 a n
    const updatedVessels = sorted.map((v, idx) => ({
      ...v,
      order: idx
    }));

    setVessels(updatedVessels);

    try {
      const batch = writeBatch(db);
      updatedVessels.forEach(v => {
        batch.set(doc(db, 'vessels', String(v.id)), {
          id: String(v.id),
          name: v.name,
          eta: v.eta,
          cntrs: v.cntrs,
          order: v.order
        });
      });
      await batch.commit();
    } catch (e) {
      console.warn("Erro ao salvar ordem dos navios:", e);
    }
  };

  // PARSER DE DATAS PARA ETA (DD/MM/YYYY ou DD/MM)
  const parseVesselEta = (etaStr: string): Date => {
    const parts = etaStr.replace(/[^0-9/]/g, '').split('/');
    const day = parseInt(parts[0]) || 1;
    const month = parseInt(parts[1]) || 1;
    let year = parseInt(parts[2]) || 2026;
    if (year < 100) year += 2000;
    return new Date(year, month - 1, day);
  };

  // ORDENAR AUTOMATICAMENTE POR DATA DE ETA
  const autoSortVesselsByDate = async () => {
    const sorted = [...vessels].sort((a, b) => {
      const dateA = parseVesselEta(a.eta);
      const dateB = parseVesselEta(b.eta);
      return dateA.getTime() - dateB.getTime();
    });

    const updatedVessels = sorted.map((v, idx) => ({
      ...v,
      order: idx
    }));

    setVessels(updatedVessels);

    try {
      const batch = writeBatch(db);
      updatedVessels.forEach(v => {
        batch.set(doc(db, 'vessels', String(v.id)), {
          id: String(v.id),
          name: v.name,
          eta: v.eta,
          cntrs: v.cntrs,
          order: v.order
        });
      });
      await batch.commit();
    } catch (e) {
      console.warn("Erro ao ordenar navios automaticamente:", e);
    }
  };

  // ADICIONAR NOVO PÁTIO / WAREHOUSE
  const addYard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newYardName.trim()) return;

    // Generate safe document ID
    const docId = newYardName.toLowerCase().trim().replace(/[^a-z0-9_\-]/g, '_');
    if (!docId) return;

    const newY: Yard = {
      name: newYardName.trim().toUpperCase(),
      type: newYardType,
      capacity: Number(newYardCapacity) || 0,
      cheio: Number(newYardCheio) || 0,
      vazio: Number(newYardVazio) || 0,
      porto: Number(newYardPorto) || 0,
      prontoColeta: Number(newYardProntoColeta) || 0,
      delivered: Number(newYardDelivered) || 0,
      previous_total: Number(newYardPreviousTotal) || 0
    };

    setYards(prev => ({
      ...prev,
      [docId]: newY
    }));

    setNewYardName('');
    setNewYardCapacity(1000);
    setNewYardCheio(0);
    setNewYardVazio(0);
    setNewYardPorto(0);
    setNewYardProntoColeta(0);
    setNewYardDelivered(0);
    setNewYardPreviousTotal(0);

    try {
      await setDoc(doc(db, 'yards', docId), newY);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `yards/${docId}`);
    }
  };

  // EXCLUIR PÁTIO / WAREHOUSE
  const deleteYard = (key: string) => {
    const title = language === 'bilingual' ? 'Excluir Pátio / 删除堆场' : 'Excluir Pátio';
    const message = language === 'bilingual'
      ? "Deseja realmente excluir este pátio/warehouse? / 确定要删除该堆场吗？"
      : "Deseja realmente excluir este pátio/warehouse?";

    requestConfirmation(title, message, async () => {
      setYards(prev => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });

      try {
        await deleteDoc(doc(db, 'yards', key));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `yards/${key}`);
      }
    });
  };

  // ALTERAR DADO ESPECÍFICO DO GRÁFICO DA ESQUERDA (Backlog/ETA)
  const handleChartLeftChange = async (index: number, field: keyof ChartLeftItem, value: string) => {
    const numValue = Number(value);
    const finalVal = isNaN(numValue) ? 0 : numValue;
    
    const updated = [...chartLeft];
    const item = updated[index];
    if (!item) return;

    if (field === 'backlog' || field === 'arrivals') {
      updated[index] = {
        ...item,
        [field]: finalVal
      };
    }
    setChartLeft(updated);

    const docId = item.docId || String(index).padStart(3, '0');
    try {
      await updateDoc(doc(db, 'chartLeft', docId), {
        [field]: finalVal
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `chartLeft/${docId}`);
    }
  };

  // MULTIPLICADOR EM MASSA DOS GRÁFICOS (Para simulações rápidas de estresse)
  const applyMultiplierToBacklog = async (multiplier: number) => {
    const updated = chartLeft.map(item => ({
      ...item,
      backlog: Math.round(item.backlog * multiplier)
    }));
    setChartLeft(updated);

    try {
      const batch = writeBatch(db);
      updated.forEach((item, index) => {
        const docId = String(index).padStart(3, '0');
        batch.update(doc(db, 'chartLeft', docId), { backlog: item.backlog });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `chartLeft/batch-multiplier`);
    }
  };

  // ALTERAR DADO ESPECÍFICO DO GRÁFICO DA DIREITA (Entregas Diárias / Dates)
  const handleChartRightChange = async (index: number, field: keyof ChartRightItem, value: string) => {
    const updated = [...chartRight];
    if (!updated[index]) return;

    if (field === 'value') {
      const numVal = Number(value);
      updated[index].value = isNaN(numVal) ? 0 : numVal;
    } else if (field === 'date' || field === 'type') {
      updated[index][field] = value;
    }
    
    setChartRight(updated);

    const item = updated[index];
    const docId = item.docId || String(index).padStart(3, '0');
    try {
      await updateDoc(doc(db, 'chartRight', docId), {
        [field]: field === 'value' ? (isNaN(Number(value)) ? 0 : Number(value)) : value
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `chartRight/${docId}`);
    }
  };

  // Adicionar Semana para Gráfico da Esquerda (ChartLeft)
  const handleAddChartLeft = async (week: string, arrivals: number, backlog: number) => {
    if (!week) return;
    
    let nextIndex = chartLeft.length;
    chartLeft.forEach(item => {
      if (item.docId && !isNaN(Number(item.docId))) {
        nextIndex = Math.max(nextIndex, Number(item.docId) + 1);
      }
    });
    const docId = String(nextIndex).padStart(3, '0');

    const newItem: ChartLeftItem = {
      docId,
      week,
      arrivals,
      backlog
    };

    setChartLeft(prev => {
      const updated = [...prev, newItem];
      return updated.sort((a, b) => {
        const numA = parseInt(a.week.replace('W', '')) || 0;
        const numB = parseInt(b.week.replace('W', '')) || 0;
        return numA - numB;
      });
    });

    try {
      await setDoc(doc(db, 'chartLeft', docId), {
        week,
        arrivals,
        backlog
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `chartLeft/${docId}`);
    }
  };

  // Remover Semana do Gráfico da Esquerda (ChartLeft)
  const handleDeleteChartLeft = async (index: number) => {
    const item = chartLeft[index];
    if (!item) return;

    setChartLeft(prev => prev.filter((_, i) => i !== index));

    const docId = item.docId || String(index).padStart(3, '0');
    try {
      await deleteDoc(doc(db, 'chartLeft', docId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `chartLeft/${docId}`);
    }
  };

  // Adicionar Entrega Diária para Gráfico da Direita (ChartRight)
  const handleAddChartRight = async (date: string, value: number, type: string) => {
    if (!date) return;

    let nextIndex = chartRight.length;
    chartRight.forEach(item => {
      if (item.docId && !isNaN(Number(item.docId))) {
        nextIndex = Math.max(nextIndex, Number(item.docId) + 1);
      }
    });
    const docId = String(nextIndex).padStart(3, '0');

    const newItem: ChartRightItem = {
      docId,
      date,
      value,
      type
    };

    setChartRight(prev => [...prev, newItem]);

    try {
      await setDoc(doc(db, 'chartRight', docId), {
        date,
        value,
        type
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `chartRight/${docId}`);
    }
  };

  // Remover Entrega Diária do Gráfico da Direita (ChartRight)
  const handleDeleteChartRight = async (index: number) => {
    const item = chartRight[index];
    if (!item) return;

    setChartRight(prev => prev.filter((_, i) => i !== index));

    const docId = item.docId || String(index).padStart(3, '0');
    try {
      await deleteDoc(doc(db, 'chartRight', docId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `chartRight/${docId}`);
    }
  };

  const getDynamicSlideTitleAndSubtitle = () => {
    switch (currentSlide) {
      case 0:
        return {
          titlePT: slideTitlePT,
          titleZH: slideTitleZH,
          subPT: slideSubtitlePT,
          subZH: slideSubtitleZH,
        };
      case 1:
        return {
          titlePT: "OCUPAÇÃO DETALHADA DE PÁTIOS & CAPACIDADE",
          titleZH: "BYD 合作堆场容量与占用比监控",
          subPT: "Monitoramento Detalhado de Capacidade Usada, Contentores Cheios, Vazios e Status de Ocupação",
          subZH: "常规合作堆场使用容量、重箱及空箱占用比监控与爆仓预警分析",
        };
      case 2:
        return {
          titlePT: "ESCALA DE NAVIOS ATIVOS & JANELAS (ETA)",
          titleZH: "活跃船舶靠泊计划与到港预测",
          subPT: "Programação de Chegada de Navios, Volume de Contentores e Notas Operacionais",
          subZH: "活跃船舶到港ETA、集装箱卸船计划、口岸放行及作业手记",
        };
      case 3:
        return {
          titlePT: "INBOUND CAPACITY RAMP-UP PLAN",
          titleZH: "INBOUND CAPACITY RAMP-UP PLAN",
          subPT: "PROJECTION OF ARRIVALS SHOWING ACTUAL VS ESTIMATED CONTAINER VOLUME PER WEEK.",
          subZH: "PROJECTION OF ARRIVALS SHOWING ACTUAL VS ESTIMATED CONTAINER VOLUME PER WEEK.",
        };
      case 4:
        return {
          titlePT: "BYD BUFFER INTEGRATED HUB & TRANSPORTE RÁPIDO",
          titleZH: "比亚迪智能缓冲中转枢纽与快速移运监控",
          subPT: "Mapeamento em tempo real de posições, escoamento de contêineres e otimização de retirada rápida",
          subZH: "缓冲区堆位、放行流向与智能移箱优化监控",
        };
      case 5:
        return {
          titlePT: "CONTROLE OPERACIONAL DE DEPÓSITOS & ALOCAÇÃO",
          titleZH: "协议堆存容量动态配额与船东准入管理大盘",
          subPT: "Gestão integrada de capacidades diárias, portões ativos e matriz de compatibilidade com armadores principais",
          subZH: "实时动态管控协议堆场每日限额、口岸通道开闭及集装箱流向分配符合矩阵",
        };
      case 6:
        return {
          titlePT: "1. GENERAL OVERVIEW - DEMURRAGE & OVERDUE CONTROL",
          titleZH: "1. 综合大盘 - 滞期费与集装箱超期监控塔",
          subPT: "Painel de controle de vencimento de free time, contêineres retidos e custos de demurrage",
          subZH: "集装箱免费期到期预警、堆场滞期超期监控及异常滞箱控制面板",
        };
      case 7:
        return {
          titlePT: "MÓDULO DE GESTÃO LOGÍSTICA CRUDS",
          titleZH: "比亚迪外贸进出口单证及集成物流控制大盘",
          subPT: "Cadastro integrado de equipamentos, containers WMS e importador Sheets",
          subZH: "数据流控制中心",
        };
      case 8:
        return {
          titlePT: "PAINEL EXECUTIVO DE ENTREGAS CD",
          titleZH: "每日工厂到货及运输节点控制台",
          subPT: "Controle de status operacionais diários, transportadores e fretes",
          subZH: "运输管理",
        };
      case 9:
        return {
          titlePT: "CALENDÁRIO MENSAL DE DISTRIBUIÇÃO",
          titleZH: "月度交付日历与班轮吞吐预测",
          subPT: "Agrupamento inteligente por House BL e volumes consolidados semanais",
          subZH: "日历看板",
        };
      default:
        return {
          titlePT: slideTitlePT,
          titleZH: slideTitleZH,
          subPT: slideSubtitlePT,
          subZH: slideSubtitleZH,
        };
    }
  };

  // Retorna título dinâmico conforme a seleção de linguagem e o slide ativo
  const getSlideTitle = () => {
    const dyn = getDynamicSlideTitleAndSubtitle();
    if (currentSlide === 3) {
      return (
        <div className="flex items-center gap-2">
          <div className="w-[4px] h-[18px] bg-blue-600 rounded-xs self-center"></div>
          <span className="text-[18px] font-black text-slate-850 dark:text-white uppercase tracking-wider font-sans leading-none">
            {dyn.titlePT}
          </span>
        </div>
      );
    }
    if (language === 'pt') return <span className="text-xl font-black">{dyn.titlePT}</span>;
    if (language === 'zh') return <span className="text-2xl font-black font-sans tracking-wide">{dyn.titleZH}</span>;
    return <span className="text-xl font-black">{dyn.titlePT}</span>;
  };

  return (
    <div className={`h-screen w-screen flex overflow-hidden ${theme === 'dark' ? 'bg-[#0f172a] text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      {/* 1. ESQUERDA: PORTAL NAVIGATION SIDEBAR (Apenas no Modo Website) */}
      {viewParadigm === 'website' && (
        <aside 
          id="portal-sidebar" 
          className={`h-full shrink-0 border-r flex flex-col justify-between transition-all duration-300 z-20 ${
            isSidebarCollapsed ? 'w-0 overflow-hidden border-r-0 opacity-0 pointer-events-none' : 'w-72 opacity-100'
          } ${
            theme === 'dark' ? 'bg-[#111827] border-slate-800 text-gray-100 shadow-2xl' : 'bg-white border-slate-150 text-slate-800 shadow-lg'
          }`}
        >
          {/* Branding / Logo */}
          <div className="p-5 border-b border-gray-150/40 dark:border-slate-800/80 flex flex-col gap-3 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="bg-gradient-to-br from-red-600 to-rose-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-black tracking-widest shadow-md">BYD</span>
                <div>
                  <span className="text-xs font-black uppercase text-slate-900 dark:text-white leading-none block tracking-wide">
                    INBOUND PORTAL
                  </span>
                  <span className="text-[9px] text-red-600 dark:text-red-400 font-mono font-extrabold uppercase tracking-widest block mt-0.5">
                    CONTROL TOWER
                  </span>
                </div>
              </div>

              {/* Sidebar Collapse Button inside branding header */}
              <button
                onClick={() => setIsSidebarCollapsed(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer shrink-0"
                title="Ocultar Menu Lateral"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Pulsing indicator */}
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800/60 text-[10px] text-gray-500 dark:text-gray-400 font-bold select-none shadow-3xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-mono uppercase text-[8.5px] tracking-wider text-slate-450 dark:text-slate-400">CONTROL TOWER STATUS: LIVE</span>
            </div>
          </div>

          {/* Dynamic Navigation Links & System Controls */}
          <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5 scrollbar-thin">
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider block px-3.5 mb-2">
              {language === 'zh' ? '导航菜单' : 'MÓDULOS DO PORTAL'}
            </span>
            {[
              { index: 0, pt: "Visão Geral", zh: "综合大盘", icon: <Database className="w-4 h-4" /> },
              { index: 1, pt: "Gestão de Pátios", zh: "堆场管理", icon: <Building2 className="w-4 h-4" /> },
              { index: 4, pt: "BYD Buffer", zh: "智能缓冲区", icon: <Layers className="w-4 h-4" /> },
              { index: 5, pt: "Depósitos & Alocação", zh: "协议堆存及港口流向", icon: <FileSpreadsheet className="w-4 h-4" /> },
              { index: 6, pt: "Demurrage & Overdue", zh: "滞期费监控", icon: <Clock className="w-4 h-4" /> },
              { index: 2, pt: "Escala de Navios", zh: "船舶靠泊计划", icon: <Ship className="w-4 h-4" /> },
              { index: 3, pt: "Gráficos & Projeções", zh: "智能运营图表", icon: <TrendingUp className="w-4 h-4" /> },
              { index: 7, pt: "Módulo Logística", zh: "物流管理模块", icon: <Package className="w-4 h-4" /> },
              { index: 8, pt: "Painel de Entregas", zh: "交货监控面板", icon: <Truck className="w-4 h-4" /> },
              { index: 9, pt: "Calendário", zh: "交付日历", icon: <Calendar className="w-4 h-4" /> },
            ].map(s => {
              const isActive = currentSlide === s.index;
              return (
                <button
                  key={s.index}
                  onClick={() => setCurrentSlide(s.index)}
                  className={`w-full text-left px-3.5 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-3.5 cursor-pointer transform active:scale-98 ${
                    isActive
                      ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-500/20'
                      : theme === 'dark' 
                        ? 'text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent hover:border-slate-800' 
                        : 'text-slate-600 hover:text-slate-850 hover:bg-slate-50 border border-transparent hover:border-slate-100'
                  }`}
                >
                  <span className={`transition-transform duration-300 shrink-0 ${isActive ? 'text-white scale-110' : 'text-slate-400 dark:text-slate-500'}`}>
                    {s.icon}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="truncate tracking-wide">{language === 'zh' ? s.zh : s.pt}</span>
                    <span className="text-[8.5px] opacity-60 truncate font-normal tracking-wider uppercase mt-0.5">
                      {language === 'zh' ? s.pt : s.zh}
                    </span>
                  </div>
                </button>
              );
            })}

            {/* CONTROLES DO SISTEMA INTEGRADO (Movidos do Topbar para limpar a visualização) */}
            <div className="pt-4 border-t border-slate-200/50 dark:border-slate-800/50 mt-4 space-y-2">
              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider block px-3.5 mb-2">
                {language === 'zh' ? '系统快捷控制' : 'AÇÕES DO SISTEMA'}
              </span>

              {/* Sincronizar Google Sheets */}
              <button
                onClick={() => setSheetsModalOpen(true)}
                className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-3 hover:bg-red-50 dark:hover:bg-red-950/10 border border-gray-150 dark:border-slate-800 hover:border-red-200 dark:hover:border-red-900 cursor-pointer bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                title="Sincronizar com a Planilha de Entregas do Google Sheets"
              >
                <RefreshCw className="w-4 h-4 text-red-600 animate-spin-slow shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="truncate">{language === 'zh' ? '同步谷歌表格' : 'Sinc Google Sheets'}</span>
                  <span className="text-[8.5px] text-red-600 dark:text-red-400 opacity-85 truncate font-normal tracking-wider uppercase">
                    {language === 'zh' ? '实时更新数据' : 'INTEGRAÇÃO PLANILHA'}
                  </span>
                </div>
              </button>

              {/* Editar Pátio Toggle */}
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-3 border cursor-pointer ${
                  isEditMode
                    ? 'bg-slate-800 text-white border-slate-950 dark:bg-slate-800 dark:border-slate-700'
                    : 'bg-white dark:bg-slate-900 border-gray-150 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-755 dark:text-slate-300'
                }`}
                title="Alternar entre visualização limpa e edição ativa dos pátios"
              >
                <Sliders className={`w-4 h-4 shrink-0 ${isEditMode ? 'text-yellow-400' : 'text-red-500'}`} />
                <div className="flex flex-col min-w-0">
                  <span className="truncate">
                    {isEditMode 
                      ? (language === 'zh' ? '关闭编辑模式' : 'Fechar Edição') 
                      : (language === 'zh' ? '编辑堆场容量' : 'Editar Pátio')}
                  </span>
                  <span className="text-[8.5px] opacity-60 truncate font-normal tracking-wider">
                    {language === 'zh' ? '堆场控制' : 'YARD MANAGEMENT'}
                  </span>
                </div>
              </button>

              {/* Excel Template & Import Section */}
              <div className="space-y-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-150 dark:border-slate-800/60">
                <span className="text-[8.5px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider block px-1.5">
                  {language === 'zh' ? '库存数据导入' : 'IMPORTAÇÃO DE ESTOQUE'}
                </span>
                
                <div className="flex gap-1.5">
                  {/* Upload Excel */}
                  <label className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2 px-2.5 rounded-lg text-[11px] cursor-pointer transition-all shadow-sm active:scale-95">
                    <Upload className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{language === 'zh' ? '上传库存' : 'Importar'}</span>
                    <input
                      id="sidebar_excel_upload_input"
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={handleImportGlobalStockExcel}
                      className="hidden"
                    />
                  </label>
                  
                  {/* Download template */}
                  <button
                    onClick={handleDownloadGlobalStockTemplate}
                    className="p-2 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-350 border border-slate-200 dark:border-slate-700 rounded-lg transition-all cursor-pointer active:scale-95"
                    title="Baixar Modelo de Planilha de Estoque"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-500" />
                  </button>
                </div>
              </div>

              {/* Relatório PDF */}
              <button
                onClick={handleDownloadPDF}
                disabled={pdfStatus === 'rendering'}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-3 border cursor-pointer ${
                  pdfStatus === 'rendering'
                    ? 'bg-slate-100 dark:bg-slate-850 text-slate-400 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                    : 'bg-gradient-to-r from-red-600 to-rose-600 text-white border-red-500 hover:from-red-700 hover:to-rose-700 shadow-md shadow-red-500/10'
                }`}
                title="Exportar Painel Ativo para Relatório PDF"
              >
                {pdfStatus === 'rendering' ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white shrink-0" />
                ) : (
                  <Download className="w-4 h-4 text-white shrink-0" />
                )}
                <div className="flex flex-col min-w-0">
                  <span className="truncate">
                    {pdfStatus === 'rendering'
                      ? (language === 'zh' ? '正在生成 PDF...' : 'Gerando PDF...')
                      : (language === 'zh' ? '导出 PDF 报告' : 'Relatório PDF')}
                  </span>
                  <span className="text-[8.5px] opacity-80 truncate font-normal tracking-wider">
                    {language === 'zh' ? 'PDF 导出' : 'DOWNLOAD REPORT'}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Sidebar Config / Footer */}
          <div className="p-4 border-t border-gray-150/40 dark:border-slate-800/80 space-y-3.5 bg-slate-50/50 dark:bg-slate-900/40 shrink-0">
            
            {/* Database & Google Login Info */}
            <div className="flex flex-col gap-2 p-3 rounded-xl border bg-white dark:bg-slate-900 border-gray-150 dark:border-slate-800 text-xs shadow-3xs">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider">DATABASE STATUS</span>
                <span className="flex items-center gap-1">
                  {dbStatus === 'online' ? (
                    <Wifi className="w-3 h-3 text-emerald-500" />
                  ) : dbStatus === 'connecting' ? (
                    <RefreshCw className="w-3 h-3 animate-spin text-amber-500" />
                  ) : (
                    <WifiOff className="w-3 h-3 text-rose-400" />
                  )}
                  <span className={`text-[9.5px] font-mono font-black uppercase tracking-wider ${
                    dbStatus === 'online' ? 'text-emerald-500' : dbStatus === 'connecting' ? 'text-amber-500' : 'text-rose-400'
                  }`}>
                    {dbStatus === 'online' ? 'Online' : dbStatus === 'connecting' ? 'Sinc' : 'Offline'}
                  </span>
                </span>
              </div>

              <div className="h-px bg-gray-100 dark:bg-slate-800 my-0.5"></div>

              {user ? (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <UserIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="truncate text-[10px] text-slate-700 dark:text-slate-300 font-black leading-none">{user.displayName || user.email?.split('@')[0]}</span>
                  </div>
                  <button
                    onClick={logoutUser}
                    className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer shrink-0"
                    title="Desconectar do Firebase"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={loginWithGoogle}
                  className="w-full flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-750 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-extrabold py-1.5 px-2 rounded-lg text-[9px] uppercase tracking-wider cursor-pointer transition-colors shadow-3xs"
                  title="Conectar com o Google"
                >
                  <Lock className="w-3 h-3 text-red-500" />
                  <span>Conectar Firebase</span>
                </button>
              )}
            </div>

            {/* Language Segmented Control */}
            <div className="bg-white dark:bg-slate-900 p-0.5 rounded-lg flex items-center border border-gray-150 dark:border-slate-800 shadow-3xs">
              {[
                { id: 'pt', label: '🇧🇷 PT' },
                { id: 'zh', label: '🇨🇳 中文' },
                { id: 'bilingual', label: '🌐 PT/ZH' }
              ].map(lang => (
                <button
                  key={lang.id}
                  onClick={() => { setLanguage(lang.id); updateGlobalDoc('language', lang.id); }}
                  className={`flex-1 py-1.5 text-[10px] font-black rounded-md transition-all cursor-pointer ${
                    language === lang.id 
                      ? 'bg-red-50 dark:bg-slate-800 shadow-3xs text-red-600 dark:text-red-400' 
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            {/* Theme & Paradigm Switches */}
            <div className="flex gap-2.5">
              <button
                onClick={() => { const val = theme === 'light' ? 'dark' : 'light'; setTheme(val); updateGlobalDoc('theme', val); }}
                className={`flex-1 py-2 rounded-lg border flex items-center justify-center gap-1.5 text-[9.5px] uppercase tracking-wider font-extrabold transition-all cursor-pointer shadow-3xs ${
                  theme === 'dark'
                    ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-yellow-400'
                    : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'
                }`}
                title="Alternar Tema (Claro / Escuro)"
              >
                {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                <span>{theme === 'light' ? 'Escuro' : 'Claro'}</span>
              </button>

              <button
                onClick={() => setViewParadigm('ppt')}
                className={`flex-1 py-2 rounded-lg border flex items-center justify-center gap-1.5 text-[9.5px] uppercase tracking-wider font-extrabold transition-all cursor-pointer shadow-3xs bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-red-600 dark:text-red-400`}
                title="Mudar para Visualização PPT Slideshow"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>PPT Slides</span>
              </button>
            </div>

            {/* Reset System Trigger */}
            <button
              onClick={resetToOriginal}
              className="w-full py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200 rounded-lg text-[9.5px] uppercase tracking-widest font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-3xs"
              title="Resetar todos os dados do sistema"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Resetar Sistema</span>
            </button>
          </div>
        </aside>
      )}

      {/* DIREITA: APP WORKSPACE WRAPPER (Acomoda os conteúdos de ambas as visões) */}
      <div className={`flex-1 flex flex-col overflow-hidden ${viewParadigm === 'website' ? 'h-full' : 'min-h-screen'}`}>
        
        {/* BARRA DE MENU SUPERIOR DE CONTROLE (Ocultada em modo de apresentação limpo ou em modo de portal) */}
        {isEditMode && viewParadigm === 'ppt' && (
        <header id="control-panel-header" className="bg-white dark:bg-[#1e293b] border-b border-gray-200 dark:border-slate-800 px-6 py-3 flex flex-col xl:flex-row items-center justify-between gap-4 z-10 shadow-sm transition-colors duration-300">
          <div className="flex items-center gap-3 w-full xl:w-auto justify-between xl:justify-start">
            <div className="flex items-center gap-3">
              <div className="bg-red-600 text-white p-2 rounded-lg shadow-sm">
                <Globe className="w-5 h-5 animate-spin-slow" />
              </div>
              <div>
                <h1 className="font-bold text-base md:text-lg text-gray-800 dark:text-white flex items-center gap-2 tracking-tight">
                  Portal BYD Logistics <span className="text-[10px] bg-red-100 dark:bg-red-950/40 text-red-850 dark:text-red-400 font-extrabold px-2 py-0.5 rounded-full tracking-wider">CONTROL TOWER</span>
                </h1>
                <p className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400">Sistema Integrado de Controle de Pátios, Escalas e Planejamento Operacional (Bilingue/Mandarim)</p>
              </div>
            </div>
          </div>

          {/* MÓDULOS OPERACIONAIS (Navegação principal centralizada) */}
          <div className="flex items-center gap-1.5 flex-wrap justify-center my-0.5">
            {[
              { index: 0, pt: "Visão Geral", zh: "综合大盘", icon: <Database className="w-3.5 h-3.5" /> },
              { index: 1, pt: "Gestão de Pátios", zh: "堆场管理", icon: <Building2 className="w-3.5 h-3.5" /> },
              { index: 4, pt: "BYD Buffer", zh: "智能缓冲区", icon: <Layers className="w-3.5 h-3.5" /> },
              { index: 5, pt: "Depósitos & Alocação", zh: "协议堆存及港口流向", icon: <FileSpreadsheet className="w-3.5 h-3.5" /> },
              { index: 6, pt: "Demurrage & Overdue", zh: "滞期费监控", icon: <Clock className="w-3.5 h-3.5" /> },
              { index: 2, pt: "Escala de Navios", zh: "船舶靠泊计划", icon: <Ship className="w-3.5 h-3.5" /> },
              { index: 3, pt: "Gráficos & Projeções", zh: "智能运营图表", icon: <TrendingUp className="w-3.5 h-3.5" /> },
              { index: 7, pt: "Módulo Logística", zh: "物流管理模块", icon: <Package className="w-3.5 h-3.5" /> },
              { index: 8, pt: "Painel de Entregas", zh: "交货监控面板", icon: <Truck className="w-3.5 h-3.5" /> },
              { index: 9, pt: "Calendário", zh: "交付日历", icon: <Calendar className="w-3.5 h-3.5" /> },
            ].map(s => (
              <button
                key={s.index}
                id={`nav-module-btn-${s.index}`}
                onClick={() => setCurrentSlide(s.index)}
                className={`px-3 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border rounded-lg ${
                  currentSlide === s.index
                    ? 'bg-red-600 text-white border-red-700 shadow-sm shadow-red-500/15'
                    : 'bg-gray-50 dark:bg-slate-850 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                {s.icon}
                <span>{language === 'zh' ? s.zh : language === 'pt' ? s.pt : `${s.pt} / ${s.zh}`}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap xl:w-auto justify-center xl:justify-end">
            {/* Status do Banco e Login do Google */}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs mr-1 select-none">
              <span className="flex items-center gap-1">
                {dbStatus === 'online' ? (
                  <Wifi className="w-3.5 h-3.5 text-emerald-500" title="Banco Online Sincronizado" />
                ) : dbStatus === 'connecting' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" title="Conectando..." />
                ) : (
                  <WifiOff className="w-3.5 h-3.5 text-rose-400" title="Usando fallback Offline local" />
                )}
                <span className="text-[10px] font-mono font-bold uppercase text-slate-500 dark:text-slate-400">
                  {dbStatus === 'online' ? 'Online' : dbStatus === 'connecting' ? 'Sinc' : 'Offline'}
                </span>
              </span>

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>

              {user ? (
                <div id="firebase-logged-in-container" className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                    <UserIcon className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>{user.displayName || user.email?.split('@')[0]}</span>
                  </div>
                  <button
                    id="btn-google-signout"
                    onClick={logoutUser}
                    className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer"
                    title="Desconectar do Firebase"
                  >
                    <LogOut className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  id="btn-google-signin"
                  onClick={loginWithGoogle}
                  className="flex items-center gap-1 text-[10px] bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-650 hover:border-red-400 dark:hover:border-red-400 text-gray-700 dark:text-gray-300 font-extrabold px-2 py-0.5 rounded cursor-pointer transition-colors shadow-sm"
                  title="Faça login com sua conta do Google para editar os dados online em tempo real!"
                >
                  <Lock className="w-3 h-3 text-red-500" />
                  <span>Conectar Firebase</span>
                </button>
              )}
            </div>

            {/* Seletor de Idiomas */}
            <div className="bg-gray-100 dark:bg-slate-800 p-1 rounded-lg flex items-center gap-1 border border-gray-200 dark:border-slate-700">
              <button 
                id="btn-lang-pt"
                onClick={() => { setLanguage('pt'); updateGlobalDoc('language', 'pt'); }}
                className={`px-2.5 py-1 text-xs font-bold rounded flex items-center gap-1 transition-all ${language === 'pt' ? 'bg-white dark:bg-slate-700 shadow text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
                title="Português"
              >
                🇧🇷 PT
              </button>
              <button 
                id="btn-lang-zh"
                onClick={() => { setLanguage('zh'); updateGlobalDoc('language', 'zh'); }}
                className={`px-2.5 py-1 text-xs font-bold rounded flex items-center gap-1 transition-all ${language === 'zh' ? 'bg-white dark:bg-slate-700 shadow text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
                title="Mandarim (中文)"
              >
                🇨🇳 中文
              </button>
              <button 
                id="btn-lang-bilingual"
                onClick={() => { setLanguage('bilingual'); updateGlobalDoc('language', 'bilingual'); }}
                className={`px-2.5 py-1 text-xs font-bold rounded flex items-center gap-1 transition-all ${language === 'bilingual' ? 'bg-white dark:bg-slate-700 shadow text-emerald-700 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
                title="Bilíngue (Lado a Lado)"
              >
                🌐 PT / 中文
              </button>
            </div>

            {/* Alternador de Tema do slide */}
            <button
              id="btn-toggle-theme"
              onClick={() => { const val = theme === 'light' ? 'dark' : 'light'; setTheme(val); updateGlobalDoc('theme', val); }}
              className="p-2 rounded-lg bg-gray-150 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-650 dark:text-gray-350 transition-all cursor-pointer"
              title="Alternar Tema do Portal"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {/* Resetar Dados */}
            <button
              id="btn-reset-data"
              onClick={resetToOriginal}
              className="px-3 py-1.5 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Resetar dados aos valores originais do sistema"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>

            {/* Atualizar Estoque Geral (Excel) */}
            <div className="flex items-center gap-1.5 border-l border-gray-200 dark:border-slate-800 pl-2">
              <button
                id="btn-download-stock-template"
                onClick={handleDownloadGlobalStockTemplate}
                className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                title={language === 'zh' ? '下载库存导入模板' : 'Baixar modelo de importação de estoque'}
              >
                <Download className="w-3.5 h-3.5 text-blue-500" />
                <span className="hidden sm:inline">{language === 'zh' ? '模板' : 'Modelo'}</span>
              </button>

              <label className="px-2.5 py-1.5 bg-emerald-550 bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700 border border-emerald-700 rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer transition-all shadow-xs">
                <Upload className="w-3.5 h-3.5" />
                <span>{language === 'zh' ? '上传库存' : 'Atualizar Estoque'}</span>
                <input
                  id="global_excel_upload_input"
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleImportGlobalStockExcel}
                  className="hidden"
                />
              </label>
            </div>

            {/* Salvar PDF */}
            <button
              id="btn-download-pdf"
              onClick={handleDownloadPDF}
              disabled={pdfStatus === 'rendering'}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm border flex items-center gap-1.5 transition-all transform hover:-translate-y-0.5 cursor-pointer ${
                pdfStatus === 'rendering'
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : pdfStatus === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : pdfStatus === 'error'
                  ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                  : 'bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border-red-200 hover:from-red-100 hover:to-rose-100'
              }`}
            >
              {pdfStatus === 'rendering' ? (
                <RefreshCw className="w-4 h-4 animate-spin text-red-600" />
              ) : (
                <Download className="w-4 h-4 text-red-600" />
              )}
              <span>
                {pdfStatus === 'rendering'
                  ? (language === 'zh' ? '正在生成 PDF...' : 'Gerando PDF...')
                  : pdfStatus === 'success'
                  ? (language === 'zh' ? 'PDF 已下载' : 'Relatório Exportado!')
                  : pdfStatus === 'error'
                  ? (language === 'zh' ? '错误' : 'Erro!')
                  : (language === 'zh' ? '导出 PDF' : 'Exportar PDF')}
              </span>
            </button>

            {/* Modo Apresentação */}
            <button
              id="btn-presentation-mode"
              onClick={() => setIsEditMode(false)}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-lg text-xs font-bold shadow flex items-center gap-2 transition-all transform hover:-translate-y-0.5 cursor-pointer"
              title="Alternar para visualização limpa e expansiva em tela cheia do Portal"
            >
              <Tv className="w-4 h-4" />
              Modo Monitor
            </button>
          </div>
        </header>
      )}

      {/* BOTÕES FLUTUANTES NO MODO APRESENTAÇÃO */}
      {!isEditMode && viewParadigm === 'ppt' && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
          {/* Exportar PDF Flutuante */}
          <button
            id="btn-presentation-pdf"
            onClick={handleDownloadPDF}
            disabled={pdfStatus === 'rendering'}
            className={`px-4 py-3 rounded-full shadow-2xl flex items-center gap-2 font-bold cursor-pointer transition-all hover:scale-105 border ${
              pdfStatus === 'rendering'
                ? 'bg-slate-800 text-slate-400 border-slate-700 cursor-not-allowed'
                : 'bg-gradient-to-r from-rose-600 to-red-600 text-white hover:from-rose-700 hover:to-red-700 border-red-500 shadow-rose-300 dark:shadow-none'
            }`}
          >
            {pdfStatus === 'rendering' ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Download className="w-5 h-5" />
            )}
            <span>
              {pdfStatus === 'rendering'
                ? (language === 'zh' ? '正在生成 PDF...' : 'Gerando PDF...')
                : (language === 'zh' ? '导出 PDF' : 'Exportar PDF')}
            </span>
          </button>

          <button
            id="btn-back-to-editor"
            onClick={() => setIsEditMode(true)}
            className="bg-[#1e293b] text-white hover:bg-slate-800 px-4 py-3 rounded-full shadow-2xl flex items-center gap-2 font-semibold transition-all hover:scale-105 border border-slate-700"
          >
            <Sliders className="w-5 h-5 text-emerald-400" />
            <span>Voltar ao Editor</span>
          </button>
        </div>
      )}

      {/* 2. TOPBAR HEADER (Apenas no Modo Website) */}
      {viewParadigm === 'website' && (
        <header className={`px-6 py-4.5 border-b flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 z-10 transition-colors duration-300 shrink-0 ${
          theme === 'dark' ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-150'
        }`}>
          <div className="flex items-start gap-4">
            {isSidebarCollapsed && (
              <button
                onClick={() => setIsSidebarCollapsed(false)}
                className="mt-1 p-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-red-600 dark:text-red-400 border border-red-200/40 dark:border-slate-700 cursor-pointer transition-all shrink-0 shadow-xs flex items-center justify-center"
                title="Mostrar Menu Lateral"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[9px] bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                  {language === 'zh' ? '比亚迪物流控制塔' : 'BYD Inbound Portal'}
                </span>
                <span className="text-[9px] text-slate-400 font-mono font-bold uppercase tracking-wider">MODERN LOGISTICS PORTAL VIEW</span>
              </div>
              <h2 className="text-xl font-black text-slate-850 dark:text-white tracking-tight leading-none">
                {language === 'zh' ? getDynamicSlideTitleAndSubtitle().titleZH : getDynamicSlideTitleAndSubtitle().titlePT}
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-medium mt-1.5">
                {language === 'zh' ? getDynamicSlideTitleAndSubtitle().subZH : getDynamicSlideTitleAndSubtitle().subPT}
              </p>
            </div>
          </div>

          {/* Telemetry Metrics on the Right Side of Topbar */}
          <div className="flex flex-wrap items-center gap-3 text-xs select-none">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-3 py-1.5 rounded-xl shadow-3xs transition-transform hover:scale-101 duration-300">
              <Activity className="w-3.5 h-3.5 text-red-600 animate-pulse" />
              <div className="flex flex-col">
                <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider">{language === 'zh' ? '总堆存使用率' : 'Yards Occupancy'}</span>
                <span className="text-xs font-black text-slate-800 dark:text-white font-mono">{globalOccupancyPercentForHeader}%</span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-3 py-1.5 rounded-xl shadow-3xs transition-transform hover:scale-101 duration-300">
              <Ship className="w-3.5 h-3.5 text-blue-500 animate-bounce-slow" />
              <div className="flex flex-col">
                <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider">{language === 'zh' ? '活跃船舶到港' : 'Active Vessels'}</span>
                <span className="text-xs font-black text-slate-800 dark:text-white font-mono">
                  {totalExpectedVesselsForHeader} <span className="text-[9.5px] text-slate-400 font-normal">({totalExpectedContainersForHeader} FEU)</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-3 py-1.5 rounded-xl shadow-3xs transition-transform hover:scale-101 duration-300">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
              <div className="flex flex-col">
                <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider">{language === 'zh' ? '协议堆场平均流量' : 'Depots Volume'}</span>
                <span className="text-xs font-black text-slate-800 dark:text-white font-mono">
                  {totalContractedDepotsVolumeForHeader} <span className="text-[9.5px] text-emerald-500">({depotsOccupancyPercentForHeader}%)</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-3 py-1.5 rounded-xl shadow-3xs font-mono text-[10px] text-slate-500 dark:text-slate-400 shrink-0">
              <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              <span>UTC-3: <strong>{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</strong></span>
            </div>
          </div>
        </header>
      )}

      {/* ÁREA PRINCIPAL DA INTERFACE */}
      <main 
        id="main-content-area" 
        className={`flex-1 flex overflow-hidden relative ${
          viewParadigm === 'website' ? 'flex-col lg:flex-row w-full h-full bg-slate-50 dark:bg-[#0b0f19]' : 'flex-col md:flex-row'
        }`}
      >
        
        {/* VIEWPORT DO SLIDE (ESQUERDA) */}
        <div 
          id="slide-viewport-container" 
          className={`flex-1 flex flex-col items-center justify-start overflow-y-auto w-full transition-all duration-300 ${
            viewParadigm === 'website' ? 'p-6 h-full' : 'px-2 py-1'
          }`}
        >
          
          {/* HEADER DO WEBSITE PORTAL (Apenas no Modo Website - Ocultado pois agora temos o Topbar global) */}
          {viewParadigm === 'website' && false && (
            <div className={`w-full ${getMaxWidthClass()} mb-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-slate-800 rounded-xl p-4 shadow-sm`}>
              <div className="flex items-center gap-3">
                <div className="bg-red-600 text-white p-3 rounded-xl shadow-md">
                  <Globe className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                      {language === 'zh' ? '比亚迪物流控制塔' : 'BYD Logistics Portal'}
                    </span>
                    <span className="flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[9px] text-gray-400 dark:text-gray-500 font-mono font-bold">LIVE METRICS FEED</span>
                  </div>
                  <h2 className="text-xl font-black text-slate-850 dark:text-white tracking-tight">
                    {language === 'zh' ? getDynamicSlideTitleAndSubtitle().titleZH : getDynamicSlideTitleAndSubtitle().titlePT}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-450 font-medium mt-0.5">
                    {language === 'zh' ? getDynamicSlideTitleAndSubtitle().subZH : getDynamicSlideTitleAndSubtitle().subPT}
                  </p>
                </div>
              </div>

              {/* LIVE METRICS CARDS INSIDE THE HEADER */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg">
                  <Activity className="w-3.5 h-3.5 text-red-600 animate-pulse" />
                  <div className="flex flex-col">
                    <span className="text-[8px] text-gray-400 font-bold uppercase">{language === 'zh' ? '总堆存使用率' : 'Yards Occupancy'}</span>
                    <span className="text-xs font-black text-slate-800 dark:text-white font-mono">{globalOccupancyPercentForHeader}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg">
                  <Ship className="w-3.5 h-3.5 text-blue-500" />
                  <div className="flex flex-col">
                    <span className="text-[8px] text-gray-400 font-bold uppercase">{language === 'zh' ? '活跃船舶到港' : 'Active Vessels'}</span>
                    <span className="text-xs font-black text-slate-800 dark:text-white font-mono">{totalExpectedVesselsForHeader} <span className="text-[9px] text-gray-400 font-normal">({totalExpectedContainersForHeader} FEU)</span></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                  <div className="flex flex-col">
                    <span className="text-[8px] text-gray-400 font-bold uppercase">{language === 'zh' ? '协议堆场平均流量' : 'Depots Volume'}</span>
                    <span className="text-xs font-black text-slate-800 dark:text-white font-mono">{totalContractedDepotsVolumeForHeader} <span className="text-[9px] text-emerald-500">({depotsOccupancyPercentForHeader}%)</span></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg font-mono text-[10px] text-gray-500 dark:text-gray-400">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>UTC-3: <strong>10:17:48</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* CONTAINER DO WEBSITE DASHBOARD (COMPARTIMENTO FLUIDO SEM ESCALONAMENTO INTERNO) */}
          <div 
            id="slide-capture-area" 
            className={`
              w-full transition-all relative overflow-visible
              ${(viewParadigm === 'website' && pdfStatus !== 'rendering') 
                ? 'shadow-none border-none bg-transparent p-0' 
                : `shadow-lg rounded-2xl border p-6 md:p-8 ${theme === 'dark' ? 'bg-[#0f172a] border-slate-800 text-white' : 'bg-[#FAFCFF] border-slate-100 text-slate-800'}`
              }
              ${getMaxWidthClass()}
            `}
            style={(pdfStatus === 'rendering' || viewParadigm === 'ppt') ? {
              maxWidth: widescreenMode ? `${slideWidth}px` : '100%',
              aspectRatio: widescreenMode ? '16/9' : 'auto',
              minHeight: widescreenMode ? '720px' : 'auto',
            } : {
              maxWidth: '100%',
              minHeight: 'auto',
            }}
          >
            {/* ZOOM SCALE CONTENT WRAPPER */}
            <div 
              style={pdfStatus === 'rendering' ? {
                transform: `scale(${slideScale})`,
                transformOrigin: 'top left',
                width: `${100 / slideScale}%`,
                height: widescreenMode ? `${100 / slideScale}%` : 'auto',
              } : {
                width: '100%',
                height: 'auto',
              }}
              className="flex flex-col justify-between"
            >
              {/* CABEÇALHO DO SLIDE (Apenas no Modo PPT ou ao gerar PDF) */}
              {(viewParadigm === 'ppt' || pdfStatus === 'rendering') && (
                <div id="slide-header" className={`flex justify-between items-start border-b border-dashed border-gray-200 dark:border-gray-800 ${widescreenMode ? 'mb-2 pb-1.5' : 'mb-4 pb-3'}`}>
                  <div className="w-4/5">
                    {currentSlide !== 3 && (
                      <div className="flex items-center gap-2 text-[10px] font-bold text-red-600 dark:text-red-400 mb-1 tracking-widest uppercase">
                        <span>{language === 'bilingual' ? `${TRANSLATIONS.systemTitle.pt} | ${TRANSLATIONS.systemTitle.zh}` : t('systemTitle')}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                      </div>
                    )}
                    {currentSlide === 3 && <div className="mt-1"></div>}
                    <div className="focus:ring-0 focus:outline-none w-full">
                      {getSlideTitle()}
                    </div>
                    <div>{getSlideSubtitle()}</div>
                  </div>

                  {/* LOGO BYD estilizado em SVG */}
                  <div className="flex flex-col items-end">
                    {currentSlide === 3 ? (
                      <div className="flex items-center gap-2 mb-1 bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                        <span className="text-[9px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
                          SCENARIO (/DAY):
                        </span>
                        <input
                          type="number"
                          value={scenarioValue}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setScenarioValue(val);
                            updateGlobalDoc('scenarioValue', val);
                          }}
                          className="w-14 px-1 py-0.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-750 text-slate-900 dark:text-white rounded text-[11px] text-center font-bold font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 font-bold tracking-widest text-lg text-red-600 dark:text-red-500">
                        <span className="border-2 border-red-600 dark:border-red-500 px-1 py-0.5 rounded text-xs font-black">BYD</span>
                        <span className="text-[11px] text-gray-400 dark:text-gray-500 font-sans tracking-normal">{t('logistics')}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      {currentSlide === 3 && (
                        <div className="flex items-center gap-0.5 font-bold tracking-widest text-[9px] text-red-605 dark:text-red-500 mr-1.5">
                          <span className="border border-red-600 dark:border-red-500 px-0.5 py-0 rounded-[2px] text-[7px] font-black leading-none">BYD</span>
                          <span className="text-[8px] text-gray-400 dark:text-gray-500 font-sans tracking-normal leading-none">{t('logistics')}</span>
                        </div>
                      )}
                      <span className="text-[8px] text-gray-400 uppercase font-mono tracking-wider">{t('nationalOperations')}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* CONTEÚDO CONDICIONAL CONFORME O SLIDE ATIVO */}
              {currentSlide === 0 ? (
                <div id="website-dashboard-container" className="flex flex-col gap-6 w-full">
                  
                  {/* DESIGN REFRESH: MODERN CATEGORIZED SECTIONS WITH CAPACITY ROLLUPS */}
                  {(() => {
                    const bondedYards = (Object.entries(yards) as [string, Yard][]).filter(([_, y]) => y && y.type === 'BONDED');
                    const warehouseYards = (Object.entries(yards) as [string, Yard][]).filter(([_, y]) => y && y.type === 'WAREHOUSE');
                    const bufferYards = (Object.entries(yards) as [string, Yard][]).filter(([_, y]) => y && y.type === 'BUFFER');
                    const otherYards = (Object.entries(yards) as [string, Yard][]).filter(([_, y]) => y && y.type !== 'BONDED' && y.type !== 'WAREHOUSE' && y.type !== 'BUFFER');

                    // Calculate live executive telemetry summaries
                    const getSummary = (list: [string, Yard][]) => {
                      const totalCap = list.reduce((sum, [_, y]) => sum + (y?.capacity || 0), 0);
                      const totalCheio = list.reduce((sum, [_, y]) => sum + (y?.cheio || 0), 0);
                      const pct = totalCap > 0 ? Math.round((totalCheio / totalCap) * 100) : 0;
                      return { totalCap, totalCheio, pct };
                    };

                    const bondedSum = getSummary(bondedYards);
                    const warehouseSum = getSummary(warehouseYards);
                    const bufferSum = getSummary(bufferYards);

                    return (
                      <div className="flex flex-col gap-6">
                        
                        {/* MAIN TITLE BLOCK */}
                        <div className="flex items-center gap-2 border-b pb-1.5 border-gray-200 dark:border-slate-800">
                          <Database className="w-4 h-4 text-red-500 animate-pulse" />
                          <h3 className="font-extrabold text-[12px] text-gray-800 dark:text-gray-100 uppercase tracking-widest">
                            {language === 'bilingual' ? 'Painel Integrado de Capacidade & Monitoramento de Pátios / 供应链与堆场动态总览监控塔' : 'Grade Operacional de Monitoramento'}
                          </h3>
                        </div>

                        {/* SECTION 1: BONDED TERMINALS */}
                        <div className="flex flex-col gap-3">
                          <div className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-[#0f172a]/40 border-slate-800' : 'bg-slate-50/70 border-slate-200/80'} border-l-4 border-l-blue-500`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5">
                                <div className="p-1.5 bg-blue-500/10 dark:bg-blue-500/20 text-blue-500 rounded-lg">
                                  <Anchor className="w-4.5 h-4.5" />
                                </div>
                                <div>
                                  <h4 className="font-extrabold text-[12px] text-gray-900 dark:text-gray-100 uppercase tracking-tight flex items-center gap-1.5">
                                    {language === 'bilingual' ? 'Terminais & Recintos Alfandegados / 保税堆场与港口终端' : 'Terminais & Recintos Alfandegados'}
                                  </h4>
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-normal">
                                    {language === 'bilingual' ? 'Portos, CLIAs e recintos primários integrados à aduana nacional / 进境集装箱一二级保税堆场及通关放行单元（CLIA & Portos）' : 'Desembaraço aduaneiro e portuário.'}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3 bg-white dark:bg-slate-800/80 border dark:border-slate-700/60 px-2.5 py-1 rounded-lg text-[11px] font-bold shadow-xs">
                                <div className="flex flex-col">
                                  <span className="text-[7.5px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">{language === 'bilingual' ? 'Capacidade / 容量' : 'Capacidade'}</span>
                                  <span className="font-mono text-gray-700 dark:text-slate-300">{(bondedSum.totalCap).toLocaleString()} <span className="text-[9px] text-gray-400">FEU</span></span>
                                </div>
                                <div className="h-4 w-px bg-gray-200 dark:bg-slate-700"></div>
                                <div className="flex flex-col">
                                  <span className="text-[7.5px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">{language === 'bilingual' ? 'Ocupado / 已用' : 'Ocupado'}</span>
                                  <span className="font-mono text-gray-700 dark:text-slate-300">{(bondedSum.totalCheio).toLocaleString()} <span className="text-[9px] text-gray-400">FEU</span></span>
                                </div>
                                <div className="h-4 w-px bg-gray-200 dark:bg-slate-700"></div>
                                <div className="flex flex-col items-center">
                                  <span className="text-[7.5px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">{language === 'bilingual' ? 'Geral / 占比' : 'Ocupação'}</span>
                                  <span className={`text-[10px] px-1 py-0.2 rounded font-black ${
                                    bondedSum.pct >= 89 
                                      ? 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300' 
                                      : bondedSum.pct >= 65 
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' 
                                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                                  }`}>
                                    {bondedSum.pct}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                            {bondedYards.map(([key, yardItem]) => (
                              <YardCard 
                                key={key}
                                yard={yardItem} 
                                ocupacao={getYardOcupacao(yardItem)} 
                                isEdit={isEditMode} 
                                theme={theme} 
                                t={t} 
                                language={language} 
                                renderLabel={renderLabel} 
                                widescreenMode={widescreenMode} 
                                onClick={() => setSelectedYardKey(key)}
                              />
                            ))}
                            {bondedYards.length === 0 && (
                              <div className="col-span-full text-center py-6 text-gray-450 dark:text-gray-500 text-xs font-semibold bg-gray-50 dark:bg-slate-800/40 rounded-lg border border-dashed border-gray-100 dark:border-slate-800">
                                {language === 'bilingual' ? 'Nenhum terminal alfandegado cadastrado. / 未记录保税堆场。' : 'Nenhum terminal alfandegado cadastrado.'}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* SECTION 2: WAREHOUSES */}
                        <div className="flex flex-col gap-3">
                          <div className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-[#0f172a]/40 border-slate-800' : 'bg-slate-50/70 border-slate-200/80'} border-l-4 border-l-emerald-500`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5">
                                <div className="p-1.5 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-500 rounded-lg">
                                  <Building2 className="w-4.5 h-4.5" />
                                </div>
                                <div>
                                  <h4 className="font-extrabold text-[12px] text-gray-900 dark:text-gray-100 uppercase tracking-tight flex items-center gap-1.5">
                                    {language === 'bilingual' ? 'Centros de Distribuição & Armazéns (Warehouses) / 仓库、总装中心与分拨站' : 'Centros de Distribuição & Armazéns'}
                                  </h4>
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-normal">
                                    {language === 'bilingual' ? 'Estocagem nacionalizada, processos de desova, kit de autopeças e expedição doméstica / 零部件接收存放在线、开箱拆包、国内生产件及成品配套与配送中心（CD/WAREHOUSE）' : 'Estocagem nacionalizada e expedição.'}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3 bg-white dark:bg-slate-800/80 border dark:border-slate-700/60 px-2.5 py-1 rounded-lg text-[11px] font-bold shadow-xs">
                                <div className="flex flex-col">
                                  <span className="text-[7.5px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">{language === 'bilingual' ? 'Capacidade / 容量' : 'Capacidade'}</span>
                                  <span className="font-mono text-gray-700 dark:text-slate-300">{(warehouseSum.totalCap).toLocaleString()} <span className="text-[9px] text-gray-400">FEU</span></span>
                                </div>
                                <div className="h-4 w-px bg-gray-200 dark:bg-slate-700"></div>
                                <div className="flex flex-col">
                                  <span className="text-[7.5px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">{language === 'bilingual' ? 'Ocupado / 已用' : 'Ocupado'}</span>
                                  <span className="font-mono text-gray-700 dark:text-slate-300">{(warehouseSum.totalCheio).toLocaleString()} <span className="text-[9px] text-gray-400">FEU</span></span>
                                </div>
                                <div className="h-4 w-px bg-gray-200 dark:bg-slate-700"></div>
                                <div className="flex flex-col items-center">
                                  <span className="text-[7.5px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">{language === 'bilingual' ? 'Geral / 占比' : 'Ocupação'}</span>
                                  <span className={`text-[10px] px-1 py-0.2 rounded font-black ${
                                    warehouseSum.pct >= 89 
                                      ? 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300' 
                                      : warehouseSum.pct >= 65 
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' 
                                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                                  }`}>
                                    {warehouseSum.pct}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                            {warehouseYards.map(([key, yardItem]) => (
                              <YardCard 
                                key={key}
                                yard={yardItem} 
                                ocupacao={getYardOcupacao(yardItem)} 
                                isEdit={isEditMode} 
                                theme={theme} 
                                t={t} 
                                language={language} 
                                renderLabel={renderLabel} 
                                widescreenMode={widescreenMode} 
                                onClick={() => setSelectedYardKey(key)}
                              />
                            ))}
                            {warehouseYards.length === 0 && (
                              <div className="col-span-full text-center py-6 text-gray-450 dark:text-gray-500 text-xs font-semibold bg-gray-50 dark:bg-slate-800/40 rounded-lg border border-dashed border-gray-100 dark:border-slate-800">
                                {language === 'bilingual' ? 'Nenhum centro de distribuição cadastrado. / 未记录分拨仓库。' : 'Nenhum centro de distribuição cadastrado.'}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* SECTION 3: BUFFER YARDS & VESSELS FLUX */}
                        <div className="flex flex-col gap-3">
                          <div className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-[#0f172a]/40 border-slate-800' : 'bg-slate-50/70 border-slate-200/80'} border-l-4 border-l-amber-500`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5">
                                <div className="p-1.5 bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 rounded-lg">
                                  <Layers className="w-4.5 h-4.5" />
                                </div>
                                <div>
                                  <h4 className="font-extrabold text-[12px] text-gray-900 dark:text-gray-100 uppercase tracking-tight flex items-center gap-1.5">
                                    {language === 'bilingual' ? 'Pátios de Apoio & Janela de Atracação / 辅助缓冲堆场与船只抵港监控' : 'Pátios de Apoio & Janela de Atracação'}
                                  </h4>
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-normal">
                                    {language === 'bilingual' ? 'Estocagem pulmão reguladora de fluxo e roteirização marítima iminente / 调节短驳流量的缓冲堆护，以及最近干线船期及预期到货集装箱量' : 'Capacidade buffer e ETA de navios em tempo real.'}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3 bg-white dark:bg-slate-800/80 border dark:border-slate-700/60 px-2.5 py-1 rounded-lg text-[11px] font-bold shadow-xs">
                                <div className="flex flex-col">
                                  <span className="text-[7.5px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">{language === 'bilingual' ? 'Capacidade Buffer / 缓冲容量' : 'Buffer'}</span>
                                  <span className="font-mono text-gray-700 dark:text-slate-300">{(bufferSum.totalCap).toLocaleString()} <span className="text-[9px] text-gray-400">FEU</span></span>
                                </div>
                                <div className="h-4 w-px bg-gray-200 dark:bg-slate-700"></div>
                                <div className="flex flex-col">
                                  <span className="text-[7.5px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">{language === 'bilingual' ? 'Ocupado Buffer / 缓冲已用' : 'Ocupado'}</span>
                                  <span className="font-mono text-gray-700 dark:text-slate-300">{(bufferSum.totalCheio).toLocaleString()} <span className="text-[9px] text-gray-400">FEU</span></span>
                                </div>
                                <div className="h-4 w-px bg-gray-200 dark:bg-slate-700"></div>
                                <div className="flex flex-col items-center">
                                  <span className="text-[7.5px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">{language === 'bilingual' ? 'Geral / 占比' : 'Ocupação'}</span>
                                  <span className={`text-[10px] px-1 py-0.2 rounded font-black ${
                                    bufferSum.pct >= 89 
                                      ? 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300' 
                                      : bufferSum.pct >= 65 
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' 
                                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                                  }`}>
                                    {bufferSum.pct}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                            {/* Buffer cards grid layout */}
                            <div className="col-span-1 lg:col-span-2 flex flex-col gap-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {bufferYards.map(([key, yardItem]) => (
                                  <YardCard 
                                    key={key}
                                    yard={yardItem} 
                                    ocupacao={getYardOcupacao(yardItem)} 
                                    isEdit={isEditMode} 
                                    theme={theme} 
                                    t={t} 
                                    language={language} 
                                    renderLabel={renderLabel} 
                                    widescreenMode={widescreenMode} 
                                    onClick={() => setSelectedYardKey(key)}
                                  />
                                ))}
                                {bufferYards.length === 0 && (
                                  <div className="col-span-full text-center py-6 text-gray-450 dark:text-gray-500 text-xs font-semibold bg-gray-50 dark:bg-slate-800/40 rounded-lg border border-dashed border-gray-100 dark:border-slate-800">
                                    {language === 'bilingual' ? 'Nenhum pátio de apoio regulador cadastrado. / 未记录缓冲/辅助堆场。' : 'Nenhum pátio de apoio cadastrado.'}
                                  </div>
                                )}
                              </div>

                              {/* NEW SECTION: Factory Backlog Tracking & Delivery Projection */}
                              <div className={`p-5 rounded-xl border relative transition-all ${
                                theme === 'dark' 
                                  ? 'bg-[#1e293b] border-slate-700 text-white' 
                                  : 'bg-white border-slate-100 shadow-md'
                              }`}>
                                <div className="flex items-center justify-between border-b pb-3 mb-4 border-gray-150/45 dark:border-slate-800">
                                  <div className="flex items-center gap-2.5">
                                    <div className="p-1.5 bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 rounded-lg animate-pulse">
                                      <Truck className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <h3 className="font-extrabold text-[13px] text-gray-800 dark:text-gray-100 uppercase tracking-tight flex items-center gap-1.5">
                                        {language === 'bilingual' ? 'Consolidado de Backlog e Projeção de Escoamento / 厂区积压与发运监控' : 'Consolidated Backlog & Drain Projection'}
                                      </h3>
                                      <p className="text-[10.5px] text-gray-500 dark:text-gray-400 leading-normal">
                                        {language === 'bilingual' ? 'Cálculo automático em tempo real combinando pátios, armazéns e fluxo de navios / 自动同步保税堆场、仓库、辅助堆场及在途船舶数据进行发运测算' : 'Automatic real-time calculation combining yards, warehouses, and incoming vessels.'}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Dynamic calculations */}
                                {(() => {
                                  // 1. Core inventories
                                  const bondedVal = bondedSum.totalCheio;
                                  const warehouseVal = warehouseSum.totalCheio;
                                  const bufferVal = bufferSum.totalCheio;

                                  // 2. Sum of Inventory Backlog
                                  const inventoryBacklog = bondedVal + warehouseVal + bufferVal;

                                  // 3. Upcoming Arrivals
                                  const upcomingArrivals = vessels.reduce((sum, v) => sum + (v.cntrs || 0), 0);

                                  // 4. Grand Total Pending Volume (including additional if any)
                                  const totalPendingVolume = inventoryBacklog + upcomingArrivals + additionalBacklog;

                                  // Active volume selection based on scenario
                                  const activeScenarioVolume = selectedScenario === 'etapa1'
                                    ? (bondedVal + warehouseVal + additionalBacklog)
                                    : selectedScenario === 'etapa2'
                                      ? (bondedVal + warehouseVal + bufferVal + additionalBacklog)
                                      : (bondedVal + warehouseVal + bufferVal + upcomingArrivals + additionalBacklog);

                                  // 5. Drain Days
                                  const drainTimeDays = dailyDeliveryRate > 0 ? (activeScenarioVolume / dailyDeliveryRate) : 0;

                                  const getCompletionWeek = (days: number) => {
                                    const weeksNeeded = Math.ceil(days / 7);
                                    return `W${28 + weeksNeeded}`;
                                  };

                                  const getCompletionDateStr = (days: number) => {
                                    const baseDate = new Date('2026-07-08');
                                    baseDate.setDate(baseDate.getDate() + Math.round(days));
                                    const d = String(baseDate.getDate()).padStart(2, '0');
                                    const m = String(baseDate.getMonth() + 1).padStart(2, '0');
                                    return `${d}/${m}`;
                                  };

                                  // Status levels
                                  let statusColor = "text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
                                  let statusLabel = language === 'bilingual' ? "Fluxo Seguro / 安全流速" : language === 'zh' ? "安全流速" : "Fluxo Seguro";
                                  let progressColor = "stroke-emerald-500";
                                  let statusBgLight = "bg-emerald-50/40 dark:bg-emerald-950/20";
                                  if (drainTimeDays > 45.0) {
                                    statusColor = "text-red-500 dark:text-red-400 bg-red-500/10 border-red-500/20 animate-pulse";
                                    statusLabel = language === 'bilingual' ? "Gargalo Crítico / 严重积压" : language === 'zh' ? "严重积压" : "Gargalo Crítico";
                                    progressColor = "stroke-red-500";
                                    statusBgLight = "bg-red-50/40 dark:bg-red-950/20";
                                  } else if (drainTimeDays > 25.0) {
                                    statusColor = "text-amber-500 dark:text-amber-400 bg-amber-500/10 border-amber-500/20";
                                    statusLabel = language === 'bilingual' ? "Alerta de Acúmulo / 积压警示" : language === 'zh' ? "积压警示" : "Alerta de Acúmulo";
                                    progressColor = "stroke-amber-500";
                                    statusBgLight = "bg-amber-50/40 dark:bg-amber-950/20";
                                  }

                                  return (
                                    <div className="flex flex-col gap-5">
                                      {/* Phase 1: Real-time Area Inventory KPIs */}
                                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                        {/* STAT 1: Bonded */}
                                        <div className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-[#0f172a]/60 border-slate-800' : 'bg-slate-50 border-slate-100'} flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-transform`}>
                                          <div className="absolute top-0 right-0 w-12 h-12 bg-blue-500/5 rounded-full -mr-4 -mt-4 transition-all group-hover:scale-125" />
                                          <span className="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-extrabold tracking-wider leading-none">
                                            {language === 'bilingual' ? 'Bonded / 保税' : 'Bonded'}
                                          </span>
                                          <div className="flex items-baseline gap-1 mt-2">
                                            <span className="text-xl font-black text-blue-600 dark:text-blue-400 font-mono">
                                              {bondedVal.toLocaleString()}
                                            </span>
                                            <span className="text-[10px] text-gray-450 font-medium">CNTRs</span>
                                          </div>
                                          <span className="text-[8px] text-gray-400 mt-1 block">
                                            {language === 'bilingual' ? 'Sumado dos portos / 港口及保税库重箱' : 'Sum of ports & primary yards'}
                                          </span>
                                        </div>

                                        {/* STAT 2: Warehouses */}
                                        <div className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-[#0f172a]/60 border-slate-800' : 'bg-slate-50 border-slate-100'} flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-transform`}>
                                          <div className="absolute top-0 right-0 w-12 h-12 bg-indigo-500/5 rounded-full -mr-4 -mt-4 transition-all group-hover:scale-125" />
                                          <span className="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-extrabold tracking-wider leading-none">
                                            {language === 'bilingual' ? 'Warehouses / 仓库' : 'Warehouses'}
                                          </span>
                                          <div className="flex items-baseline gap-1 mt-2">
                                            <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                                              {warehouseVal.toLocaleString()}
                                            </span>
                                            <span className="text-[10px] text-gray-450 font-medium">CNTRs</span>
                                          </div>
                                          <span className="text-[8px] text-gray-400 mt-1 block">
                                            {language === 'bilingual' ? 'CDs e recintos secundários / 二级仓库与配送中心' : 'Secondary warehousing total'}
                                          </span>
                                        </div>

                                        {/* STAT 3: BYD Buffer */}
                                        <div className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-[#0f172a]/60 border-slate-800' : 'bg-slate-50 border-slate-100'} flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-transform`}>
                                          <div className="absolute top-0 right-0 w-12 h-12 bg-teal-500/5 rounded-full -mr-4 -mt-4 transition-all group-hover:scale-125" />
                                          <span className="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-extrabold tracking-wider leading-none">
                                            {language === 'bilingual' ? 'BYD Buffer / 缓冲堆场' : 'BYD Buffer'}
                                          </span>
                                          <div className="flex items-baseline gap-1 mt-2">
                                            <span className="text-xl font-black text-teal-600 dark:text-teal-400 font-mono">
                                              {bufferVal.toLocaleString()}
                                            </span>
                                            <span className="text-[10px] text-gray-450 font-medium">CNTRs</span>
                                          </div>
                                          <span className="text-[8px] text-gray-400 mt-1 block">
                                            {language === 'bilingual' ? 'Pátios de apoio ativos / 工厂外协缓冲堆场' : 'Active factory support yards'}
                                          </span>
                                        </div>

                                        {/* STAT 4: TOTAL CONSOLIDATED BACKLOG */}
                                        <div className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-[#0f172a]/80 border-amber-500/20' : 'bg-amber-50/30 border-amber-100'} flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-transform`}>
                                          <div className="absolute top-0 right-0 w-12 h-12 bg-amber-500/10 rounded-full -mr-4 -mt-4 transition-all group-hover:scale-125" />
                                          <span className="text-[9.5px] text-amber-600 dark:text-amber-400 uppercase font-black tracking-wider leading-none">
                                            {language === 'bilingual' ? 'Backlog Consolidado / 综合总积压' : 'Consolidated Backlog'}
                                          </span>
                                          <div className="flex items-baseline gap-1 mt-2">
                                            <span className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
                                              {inventoryBacklog.toLocaleString()}
                                            </span>
                                            <span className="text-[10px] text-amber-500 font-bold">CNTRs</span>
                                          </div>
                                          <span className="text-[8px] text-slate-500 dark:text-slate-400 mt-1 block font-semibold">
                                            {language === 'bilingual' ? 'Soma das 3 áreas de estoque / 三方库存总和' : 'Sum of 3 storage areas'}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Main Calculation & Slider Block */}
                                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                                        
                                        {/* Math Breakdown Box (Left 8 columns) */}
                                        <div className={`lg:col-span-8 p-4 rounded-xl border ${
                                          theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50/50 border-slate-150/80'
                                        } flex flex-col gap-4`}>
                                          
                                          {/* Step-by-Step Math Visualization */}
                                          <div className="flex flex-col gap-2.5">
                                            <div className="flex items-center justify-between">
                                              <h4 className="text-[11px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                {language === 'bilingual' ? 'Demonstração do Cálculo de Carga / 货量流速测算步骤' : 'Step-by-Step Volume Calculation'}
                                              </h4>
                                              <span className="text-[8.5px] text-red-500 dark:text-red-400 font-black animate-pulse bg-red-50 dark:bg-red-950/20 px-1.5 py-0.5 rounded border border-red-150 dark:border-red-900">
                                                {language === 'bilingual' ? 'CLIQUE PARA SELECIONAR CENÁRIO DE PROJEÇÃO / 点击选择预测场景' : 'CLICK TO SELECT PROJECTION SCENARIO'}
                                              </span>
                                            </div>

                                            {/* Step 1 */}
                                            <div 
                                              onClick={() => setSelectedScenario('etapa1')}
                                              className={`p-2.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs cursor-pointer transition-all select-none ${
                                                selectedScenario === 'etapa1'
                                                  ? 'ring-2 ring-blue-500 bg-blue-50/40 dark:bg-blue-950/30 border-blue-400'
                                                  : theme === 'dark' ? 'bg-slate-805/30 border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-700' : 'bg-white border-slate-200/50 shadow-xs opacity-60 hover:opacity-100 hover:border-slate-350'
                                              }`}
                                            >
                                              <div className="flex flex-wrap items-center gap-1.5">
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${selectedScenario === 'etapa1' ? 'bg-blue-600 text-white' : 'bg-blue-500/10 text-blue-500'}`}>Etapa 1</span>
                                                <span className="text-gray-600 dark:text-slate-300 font-bold">
                                                  {language === 'bilingual' ? 'Pátios + CDs (Sem Buffer/ETA):' : 'Yards + Warehouses:'}
                                                </span>
                                                <span className="font-mono font-bold bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400">
                                                  {bondedVal.toLocaleString()} <span className="text-[8.5px] font-normal text-gray-500">Bonded</span>
                                                </span>
                                                <span className="text-gray-400 font-black">+</span>
                                                <span className="font-mono font-bold bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-indigo-600 dark:text-indigo-400">
                                                  {warehouseVal.toLocaleString()} <span className="text-[8.5px] font-normal text-gray-500">Warehouse</span>
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-gray-200 dark:border-slate-800 pt-1.5 sm:pt-0 sm:pl-3">
                                                <span className="text-[10px] text-gray-450 uppercase font-black font-sans">Subtotal =</span>
                                                <span className="font-mono font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded text-[13px]">
                                                  {(bondedVal + warehouseVal).toLocaleString()}
                                                </span>
                                                {selectedScenario === 'etapa1' && <span className="text-[9px] font-black text-blue-600">●</span>}
                                              </div>
                                            </div>

                                            {/* Step 2 */}
                                            <div 
                                              onClick={() => setSelectedScenario('etapa2')}
                                              className={`p-2.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs cursor-pointer transition-all select-none ${
                                                selectedScenario === 'etapa2'
                                                  ? 'ring-2 ring-amber-500 bg-amber-50/40 dark:bg-amber-950/30 border-amber-400'
                                                  : theme === 'dark' ? 'bg-slate-805/30 border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-700' : 'bg-white border-slate-200/50 shadow-xs opacity-60 hover:opacity-100 hover:border-slate-350'
                                              }`}
                                            >
                                              <div className="flex flex-wrap items-center gap-1.5">
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${selectedScenario === 'etapa2' ? 'bg-amber-600 text-white' : 'bg-amber-500/10 text-amber-500'}`}>Etapa 2</span>
                                                <span className="text-gray-600 dark:text-slate-300 font-bold">
                                                  {language === 'bilingual' ? 'Pátios + CDs + Buffer (Sem ETA):' : 'Yards + Warehouses + Buffer:'}
                                                </span>
                                                <span className="font-mono font-bold bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400">
                                                  {(bondedVal + warehouseVal).toLocaleString()} <span className="text-[8.5px] font-normal text-gray-500">Subtotal</span>
                                                </span>
                                                <span className="text-gray-400 font-black">+</span>
                                                <span className="font-mono font-bold bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-teal-600 dark:text-teal-400">
                                                  {bufferVal.toLocaleString()} <span className="text-[8.5px] font-normal text-gray-500">BYD Buffer</span>
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-gray-200 dark:border-slate-800 pt-1.5 sm:pt-0 sm:pl-3">
                                                <span className="text-[10px] text-gray-450 uppercase font-black font-sans">Backlog =</span>
                                                <span className="font-mono font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded text-[13px]">
                                                  {inventoryBacklog.toLocaleString()}
                                                </span>
                                                {selectedScenario === 'etapa2' && <span className="text-[9px] font-black text-amber-600">●</span>}
                                              </div>
                                            </div>

                                            {/* Step 3 */}
                                            <div 
                                              onClick={() => setSelectedScenario('etapa3')}
                                              className={`p-2.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs cursor-pointer transition-all select-none ${
                                                selectedScenario === 'etapa3'
                                                  ? 'ring-2 ring-purple-500 bg-purple-50/40 dark:bg-purple-950/30 border-purple-400'
                                                  : theme === 'dark' ? 'bg-slate-805/30 border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-700' : 'bg-white border-slate-200/50 shadow-xs opacity-60 hover:opacity-100 hover:border-slate-350'
                                              }`}
                                            >
                                              <div className="flex flex-wrap items-center gap-1.5">
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${selectedScenario === 'etapa3' ? 'bg-purple-600 text-white' : 'bg-purple-500/10 text-purple-500'}`}>Etapa 3</span>
                                                <span className="text-gray-600 dark:text-slate-300 font-bold">
                                                  {language === 'bilingual' ? 'Carga Total para Escoar (Com ETA + Adj):' : 'Total Volume to Drain:'}
                                                </span>
                                                <span className="font-mono font-bold bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-amber-600 dark:text-amber-400">
                                                  {inventoryBacklog.toLocaleString()} <span className="text-[8.5px] font-normal text-gray-500">Backlog</span>
                                                </span>
                                                <span className="text-gray-400 font-black">+</span>
                                                <span className="font-mono font-bold bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-yellow-600 dark:text-yellow-400">
                                                  {upcomingArrivals.toLocaleString()} <span className="text-[8.5px] font-normal text-gray-500">ETA Arrivals</span>
                                                </span>
                                                {additionalBacklog > 0 && (
                                                  <>
                                                    <span className="text-gray-400 font-black">+</span>
                                                    <span className="font-mono font-bold bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">
                                                      {additionalBacklog.toLocaleString()} <span className="text-[8.5px] font-normal text-gray-450">Adj</span>
                                                    </span>
                                                  </>
                                                )}
                                              </div>
                                              <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-gray-200 dark:border-slate-800 pt-1.5 sm:pt-0 sm:pl-3">
                                                <span className="text-[10px] text-gray-450 uppercase font-black font-sans">Total =</span>
                                                <span className="font-mono font-black text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded text-[13px]">
                                                  {totalPendingVolume.toLocaleString()}
                                                </span>
                                                {selectedScenario === 'etapa3' && <span className="text-[9px] font-black text-purple-600">●</span>}
                                              </div>
                                            </div>
                                          </div>

                                          {/* Fine Tuning Controls */}
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-dashed border-gray-200 dark:border-slate-800 pt-3">
                                            <div>
                                              <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-black flex justify-between mb-1.5">
                                                <span>{language === 'bilingual' ? 'Ajuste Fino de Volume / 手动体积微调' : 'Manual Fine-Tuning Adjustment'}</span>
                                                <span className="font-mono text-slate-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 px-1.5 py-0.2 rounded font-bold">+{additionalBacklog}</span>
                                              </label>
                                              <input 
                                                type="range"
                                                min="0"
                                                max="1500"
                                                step="50"
                                                value={additionalBacklog}
                                                onChange={(e) => setAdditionalBacklog(Number(e.target.value))}
                                                className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-slate-600 dark:bg-slate-700"
                                              />
                                              <span className="text-[8.5px] text-gray-400 block mt-1">
                                                {language === 'bilingual' ? 'Simule volumes adicionais não listados nos pátios / 模拟未登记录入的额外库存体积' : 'Simulate custom additional loads'}
                                              </span>
                                            </div>

                                            <div>
                                              <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-black flex justify-between mb-1.5">
                                                <span>{language === 'bilingual' ? 'Capacidade de Escoamento Diário / 工厂每日发运能力' : 'Daily Factory Delivery Rate'}</span>
                                                <span className="font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded font-bold">{dailyDeliveryRate} cntrs/dia</span>
                                              </label>
                                              <input 
                                                type="range"
                                                min="50"
                                                max="500"
                                                step="10"
                                                value={dailyDeliveryRate}
                                                onChange={(e) => setDailyDeliveryRate(Number(e.target.value))}
                                                className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-550 dark:bg-slate-700"
                                              />
                                              <span className="text-[8.5px] text-gray-400 block mt-1">
                                                {language === 'bilingual' ? 'Regule a taxa de carregamento de carretas na fábrica / 调节工厂集卡日出库平均流速' : 'Adjust average container truck exits per day'}
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Visual Day Counter Ring / Widget (Right 4 columns) */}
                                        <div className={`lg:col-span-4 p-4 rounded-xl border flex flex-col justify-center items-center text-center ${statusBgLight} border-dashed border-gray-300 dark:border-slate-700 relative overflow-hidden`}>
                                          <span className="text-[9.5px] text-gray-450 dark:text-gray-400 uppercase font-black tracking-wider mb-2">
                                            {selectedScenario === 'etapa1'
                                              ? (language === 'bilingual' ? 'Tempo de Escoamento Backlog (Etapa 1) / 预计现有库存出清周期' : 'Projected Backlog Drain (Step 1)')
                                              : (language === 'bilingual' ? 'Tempo de Escoamento Total (Etapa 2) / 预计总货量出清周期' : 'Projected Total Drain (Step 2)')
                                            }
                                          </span>

                                          {/* Stunning Progress Ring Container */}
                                          <div className="relative w-28 h-28 flex items-center justify-center my-1">
                                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                              {/* Background circle */}
                                              <circle
                                                cx="50"
                                                cy="50"
                                                r="40"
                                                className="stroke-gray-200 dark:stroke-slate-800"
                                                strokeWidth="7"
                                                fill="transparent"
                                              />
                                              {/* Progress circle */}
                                              <circle
                                                cx="50"
                                                cy="50"
                                                r="40"
                                                className={`transition-all duration-500 ${progressColor}`}
                                                strokeWidth="8"
                                                strokeDasharray="251.2"
                                                strokeDashoffset={Math.max(0, 251.2 - (Math.min(100, (drainTimeDays / 90) * 100) / 100) * 251.2)}
                                                strokeLinecap="round"
                                                fill="transparent"
                                              />
                                            </svg>
                                            
                                            {/* Centered Big Value */}
                                            <div className="absolute flex flex-col items-center">
                                              <span className="text-2xl font-black font-mono tracking-tight text-gray-800 dark:text-white leading-none">
                                                {drainTimeDays.toFixed(1)}
                                              </span>
                                              <span className="text-[9px] text-gray-500 dark:text-gray-400 font-bold mt-1 uppercase">
                                                {language === 'bilingual' ? 'Dias / 天' : 'Days'}
                                              </span>
                                            </div>
                                          </div>

                                          <div className="mt-2 flex flex-col items-center gap-1 w-full">
                                            <span className={`inline-block text-[8.5px] px-2.5 py-0.5 rounded font-black uppercase tracking-wider text-center border ${statusColor}`}>
                                              {statusLabel}
                                            </span>
                                            <p className="text-[9px] text-gray-400 max-w-[180px] leading-tight mt-0.5">
                                              {language === 'bilingual' 
                                                ? `Escoamento de ${activeScenarioVolume.toLocaleString()} contêineres à média de ${dailyDeliveryRate}/dia.` 
                                                : `Draining ${activeScenarioVolume.toLocaleString()} cntrs at ${dailyDeliveryRate}/day.`
                                              }
                                            </p>
                                          </div>

                                          <div className="mt-3.5 border-t border-dashed border-gray-200 dark:border-slate-700/60 pt-2 w-full flex flex-col items-center">
                                            <span className="text-[8px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-widest">{language === 'bilingual' ? 'Previsão de Conclusão / 预计完成' : 'Completion Week'}:</span>
                                            <span className="text-sm font-black text-amber-600 dark:text-amber-400 mt-0.5 bg-amber-500/10 px-2 py-0.5 rounded-md">
                                              {getCompletionWeek(drainTimeDays)} <span className="text-[10px] text-gray-500">({getCompletionDateStr(drainTimeDays)})</span>
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>

                            {/* Vessels Table Card */}
                            <div className="col-span-1">
                              <div className="flex flex-col h-full min-h-[220px]">
                                <div className={`p-3 rounded-xl flex-1 border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-100 shadow-sm'} flex flex-col justify-between`}>
                                  <div>
                                    <div className="flex items-center justify-between border-b pb-1.5 mb-2 border-gray-100 dark:border-slate-800">
                                      <h3 className="font-extrabold text-xs flex items-center gap-2 text-[#2563eb] tracking-tight">
                                        <Ship className="w-4 h-4 text-blue-500" /> {language === 'bilingual' ? '活跃船舶靠泊计划 (ETA)' : t('vesselSchedule')}
                                      </h3>
                                      <span className="text-[9px] bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200 font-bold px-1.5 py-0.5 rounded-full">{t('projected')}</span>
                                    </div>

                                    <div className="overflow-x-auto">
                                      <table className="w-full text-left text-xs">
                                        <thead>
                                          <tr className="border-b border-gray-100 dark:border-slate-800 text-gray-400 font-bold uppercase text-[9.5px] tracking-wider">
                                            <th className="py-1.5">{getColHeader('vessel')}</th>
                                            <th className="py-1.5 text-center">{getColHeader('eta')}</th>
                                            <th className="py-1.5 text-right">{getColHeader('cntrs')}</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 dark:divide-slate-800/40">
                                          {vessels.map((vessel) => (
                                            <tr key={vessel.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors">
                                              <td className={`font-extrabold text-gray-800 dark:text-gray-200 text-xs tracking-tight ${widescreenMode ? 'py-1.5' : 'py-2.5'}`}>{vessel.name}</td>
                                              <td className={`text-center text-gray-650 dark:text-gray-400 font-mono font-medium ${widescreenMode ? 'py-1.5' : 'py-2.5'}`}>{vessel.eta}</td>
                                              <td className={`text-right font-black text-blue-600 dark:text-blue-400 text-xs ${widescreenMode ? 'py-1.5' : 'py-2.5'}`}>{vessel.cntrs.toLocaleString()}</td>
                                            </tr>
                                          ))}
                                          {vessels.length === 0 && (
                                            <tr>
                                              <td colSpan={3} className="text-center py-6 text-gray-400">{t('noVessels')}</td>
                                            </tr>
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>

                                  <div className="mt-2.5 pt-2 border-t border-dashed border-gray-100 dark:border-slate-800 text-[10px] text-gray-400 flex justify-between items-center">
                                    <span className="font-bold uppercase tracking-tight text-[9.5px]">
                                      {language === 'bilingual' ? '集装箱总数 / Total Containers:' : t('totalContainers') + ':'}
                                    </span>
                                    <span className="font-extrabold text-xs text-gray-700 dark:text-gray-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono">
                                      {vessels.reduce((acc, curr) => acc + curr.cntrs, 0).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                          </div>
                        </div>

                        {/* OTHER DYNAMIC EXTRA YARDS FALLBACK */}
                        {otherYards.length > 0 && (
                          <div className="flex flex-col gap-3">
                            <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Outros Pátios Adicionais / 其他堆场</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                              {otherYards.map(([key, yardItem]) => (
                                <YardCard 
                                  key={key}
                                  yard={yardItem} 
                                  ocupacao={getYardOcupacao(yardItem)} 
                                  isEdit={isEditMode} 
                                  theme={theme} 
                                  t={t} 
                                  language={language} 
                                  renderLabel={renderLabel} 
                                  widescreenMode={widescreenMode} 
                                  onClick={() => setSelectedYardKey(key)}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                      </div>
                    );
                  })()}

                  {/* SEÇÃO 2: GRÁFICOS ANALÍTICOS (DISTRIBUÍDOS SEPARADAMENTE NO FIM DO SITE SEM CORTAR!) */}
                  <div className="flex flex-col gap-4 mt-4">
                    <div className="flex items-center gap-2 border-b pb-1.5 border-gray-200 dark:border-slate-800">
                      <TrendingUp className="w-4 h-4 text-[#ef4444] animate-pulse" />
                      <h3 className="font-extrabold text-[12px] text-gray-800 dark:text-gray-100 uppercase tracking-widest">
                        {language === 'bilingual' ? 'Análise e Capacidades Gráficas / 运营数据与预测趋势图表' : 'Análise e Capacidades Gráficas'}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Gráfico 1 Expandido */}
                      {(() => {
                        const chartLeftData = getDynamicChartLeft();
                        const maxVal = Math.max(...chartLeftData.map(item => item.backlog), 6000);
                        return (
                          <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-100 shadow-sm'} flex flex-col justify-between h-[280px]`}>
                            <div className="flex justify-between items-center mb-1">
                              <h4 className="text-[11px] font-black text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                                <TrendingUp className="w-4 h-4 text-emerald-500" /> {getChartLeftTitle()}
                              </h4>
                              <div className="flex gap-2 text-[9px] font-bold font-sans">
                                <span className="flex items-center gap-1 text-slate-800 dark:text-slate-300"><span className="w-1.5 h-1.5 bg-slate-800 dark:bg-slate-400 inline-block rounded-sm"></span>{language === 'bilingual' ? '到港 / ATA' : language === 'zh' ? '到港' : 'ATA'}</span>
                                <span className="flex items-center gap-1 text-emerald-500">
                                  <span className="w-1.5 h-0.5 border-t border-emerald-500 border-dashed inline-block"></span>
                                  {language === 'pt' ? `Capacidade (${dailyDeliveryRate}/dia)` : (language === 'zh' ? `交付能力 (${dailyDeliveryRate}/天)` : `交付 / Capacidade (${dailyDeliveryRate}/d)`)}
                                </span>
                                <span className="flex items-center gap-1 text-red-500">
                                  <span className="w-1.5 h-1.5 bg-red-500 inline-block rounded-full"></span>
                                  {language === 'pt' ? 'Backlog' : (language === 'zh' ? '预测积压' : '积压 / Backlog')}
                                </span>
                              </div>
                            </div>

                            <div className="relative flex-1 w-full pt-1.5">
                              <svg className="w-full h-full overflow-visible" style={{ overflow: 'visible' }} viewBox="0 0 600 135" preserveAspectRatio="none">
                                <line x1="30" y1="100" x2="580" y2="100" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="3 3" />
                                <line x1="30" y1="65" x2="580" y2="65" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="3 3" />
                                <line x1="30" y1="30" x2="580" y2="30" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="3 3" />
                                
                                {/* Dynamic green dashed line connecting the actual delivery capped by max capacity (dailyDeliveryRate * 7) */}
                                <path
                                  d={chartLeftData.reduce((acc, item, i) => {
                                    const x = 35 + i * (540 / (chartLeftData.length - 1));
                                    const prevBacklog = i === 0 ? 1416 : chartLeftData[i-1].backlog;
                                    const delivery = Math.min(dailyDeliveryRate * 7, prevBacklog + item.arrivals);
                                    const y = 100 - (delivery / maxVal) * 85;
                                    return acc + `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                                  }, '')}
                                  fill="none"
                                  stroke="#10b981"
                                  strokeWidth="1.25"
                                  strokeDasharray="4 4"
                                />

                                {chartLeftData.map((item, i) => {
                                  const x = 35 + i * (540 / (chartLeftData.length - 1));
                                  const barHeight = (item.arrivals / maxVal) * 85;
                                  const y = 100 - barHeight;
                                  return (
                                    <rect 
                                      key={i}
                                      x={x - 2} 
                                      y={y} 
                                      width="4" 
                                      height={barHeight} 
                                      fill={theme === 'dark' ? '#475569' : '#1e293b'} 
                                      rx="0.5"
                                    />
                                  );
                                })}

                                <path
                                  d={chartLeftData.reduce((acc, item, i) => {
                                    const x = 35 + i * (540 / (chartLeftData.length - 1));
                                    const y = 100 - (item.backlog / maxVal) * 85;
                                    return acc + `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                                  }, '')}
                                  fill="none"
                                  stroke="#ef4444"
                                  strokeWidth="1.5"
                                />

                                {chartLeftData.map((item, i) => {
                                  const x = 35 + i * (540 / (chartLeftData.length - 1));
                                  const y = 100 - (item.backlog / maxVal) * 85;
                                  return (
                                    <g key={`cl-${i}`}>
                                      <circle cx={x} cy={y} r="2" fill="#ef4444" stroke="#fff" strokeWidth="0.5" />
                                      {(i % 2 === 0 || i === chartLeftData.length - 1 || item.backlog > 0) && (
                                        <text 
                                          x={x} 
                                          y={y - 4} 
                                          fill="#ef4444" 
                                          fontSize="6" 
                                          fontWeight="black" 
                                          textAnchor="middle" 
                                          className="font-mono"
                                        >
                                          {item.backlog}
                                        </text>
                                      )}
                                    </g>
                                  );
                                })}

                                {chartLeftData.map((item, i) => {
                                  const x = 35 + i * (540 / (chartLeftData.length - 1));
                                  return (
                                    <text 
                                      key={`cl-lbl-${i}`} 
                                      x={x} 
                                      y="112" 
                                      fill="#94a3b8" 
                                      fontSize="5.5" 
                                      textAnchor="end" 
                                      fontWeight="bold" 
                                      className="font-mono"
                                      transform={`rotate(-45, ${x}, 112)`}
                                    >
                                      {item.week} - 2026
                                    </text>
                                  );
                                })}
                              </svg>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Gráfico 2 Expandido */}
                      <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-100 shadow-sm'} flex flex-col justify-between h-[280px]`}>
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="text-[11px] font-black text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                            <Database className="w-4 h-4 text-cyan-500" /> {getChartRightTitle()}
                          </h4>
                          <div className="flex gap-2 text-[9px] font-bold">
                            <span className="flex items-center gap-1 text-emerald-500"><span className="w-1.5 h-1.5 bg-[#059669] inline-block rounded-sm"></span>{language === 'bilingual' ? '高效 / High' : t('opHigh')}</span>
                            <span className="flex items-center gap-1 text-indigo-500"><span className="w-1.5 h-1.5 bg-[#6366f1] inline-block rounded-sm"></span>{language === 'bilingual' ? '稳定 / Stable' : t('opStable')}</span>
                            <span className="flex items-center gap-1 text-[#f59e0b]"><span className="w-1.5 h-0.5 border-t border-[#f59e0b] border-dashed inline-block"></span>{language === 'bilingual' ? '目标 / Gc (140)' : t('metaGc')}</span>
                          </div>
                        </div>

                        <div className="relative flex-1 w-full pt-1.5">
                          <svg className="w-full h-full overflow-visible" style={{ overflow: 'visible' }} viewBox="0 0 600 135" preserveAspectRatio="none">
                            <line x1="30" y1="100" x2="580" y2="100" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="3 3" />
                            <line x1="30" y1="65" x2="580" y2="65" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="3 3" />
                            <line x1="30" y1="30" x2="580" y2="30" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="3 3" />
                            <line x1="30" y1="67" x2="580" y2="67" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 4" />
                            <text x="582" y="70" fill="#f59e0b" fontSize="7" fontWeight="bold">Gc</text>

                            {chartRight.map((item, i) => {
                              const x = 32 + i * (540 / (chartRight.length - 1));
                              const barHeight = (item.value / 320) * 85;
                              const y = 100 - barHeight;
                              
                              let barColor = "#059669"; 
                              if (item.value < 140) {
                                barColor = "#6366f1"; 
                              }
                              if (i % 3 === 0 && item.value > 180) {
                                barColor = "#10b981"; 
                              }

                              return (
                                <g key={`cr-${i}`}>
                                  <rect 
                                    x={x - 2} 
                                    y={y} 
                                    width="4" 
                                    height={barHeight} 
                                    fill={barColor} 
                                    rx="0.5"
                                  />
                                  {item.value > 0 && (
                                    <text 
                                      x={x} 
                                      y={y - 3} 
                                      fill={theme === 'dark' ? '#cbd5e1' : '#1e293b'} 
                                      fontSize="5.5" 
                                      fontWeight="black" 
                                      textAnchor="middle" 
                                      className="font-mono"
                                    >
                                      {item.value}
                                    </text>
                                  )}
                                </g>
                              );
                            })}

                            {chartRight.map((item, i) => {
                              if (i % 11 === 0 || i === chartRight.length - 1) {
                                const x = 32 + i * (540 / (chartRight.length - 1));
                                return (
                                  <text key={`cr-lbl-${i}`} x={x} y="118" fill="#94a3b8" fontSize="6.5" textAnchor="middle" fontWeight="bold">{item.date}</text>
                                );
                              }
                              return null;
                            })}
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* COMENTÁRIOS E DIRETRIZES DE OPERAÇÃO */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-100 shadow-sm'} flex flex-col justify-between min-h-[140px]`}>
                      <div className="flex items-center gap-2 border-b pb-1.5 mb-2 border-gray-100 dark:border-slate-800">
                        <FileText className="w-4 h-4 text-red-500 animate-pulse" />
                        <h4 className="font-extrabold text-[11px] text-red-600 dark:text-red-400 uppercase tracking-wider block">
                          {language === 'bilingual' ? 'DIRETRIZES & COMENTÁRIOS GERAIS DE PÁTIOS / 堆场备忘录与运行评论' : 'DIRETRIZES & COMENTÁRIOS GERAIS DE PÁTIOS'}
                        </h4>
                      </div>
                      <div className="flex-1 flex flex-col pt-1">
                        {isEditMode ? (
                          <textarea
                            value={yardsComment}
                            onChange={(e) => {
                              setYardsComment(e.target.value);
                              updateGlobalDoc('yardsComment', e.target.value);
                            }}
                            className="w-full flex-1 p-2 text-xs font-semibold border border-gray-200 dark:border-gray-700 dark:bg-slate-800 rounded-lg focus:ring-1 focus:ring-red-500 outline-none resize-none text-slate-800 dark:text-slate-100 placeholder:text-gray-400 font-sans"
                            rows={3}
                          />
                        ) : (
                          <div className="text-xs leading-relaxed font-bold text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans p-1.5 bg-slate-50/40 dark:bg-slate-900/40 rounded-lg border border-slate-50 dark:border-none">
                            {yardsComment}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-100 shadow-sm'} flex flex-col justify-between min-h-[140px]`}>
                      <div className="flex items-center gap-2 border-b pb-1.5 mb-2 border-gray-100 dark:border-slate-800">
                        <FileText className="w-4 h-4 text-emerald-500" />
                        <h4 className="font-extrabold text-[11px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                          {language === 'bilingual' ? 'ANÁLISE DE BACKLOG & CAPACIDADE / 预测积压与交付分析' : 'ANÁLISE DE BACKLOG & CAPACIDADE'}
                        </h4>
                      </div>
                      <div className="flex-1 flex flex-col pt-1">
                        {isEditMode ? (
                          <textarea
                            value={chartNote1}
                            onChange={(e) => {
                              setChartNote1(e.target.value);
                              updateGlobalDoc('chartNote1', e.target.value);
                            }}
                            className="w-full flex-1 p-2 text-xs font-semibold border border-gray-200 dark:border-gray-700 dark:bg-slate-800 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none resize-none text-slate-800 dark:text-slate-100 placeholder:text-gray-400 font-sans"
                            rows={3}
                          />
                        ) : (
                          <div className="text-xs leading-relaxed font-bold text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans p-1.5 bg-slate-50/40 dark:bg-slate-900/40 rounded-lg border border-slate-50 dark:border-none">
                            {chartNote1}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              ) : currentSlide === 1 ? (
                /* SLIDE 2: PÁTIOS (YARDS ONLY) COM OBSERVAÇÕES AMPLAS */
                <div id="slide-dashboard-grid-yards" className={`flex flex-col justify-between ${widescreenMode ? 'h-[calc(100%-85px)] overflow-hidden' : 'min-h-[660px] gap-4'}`}>
                  
                  {/* BARRA DE CONTROLE LOCAL DE PÁTIOS / SPREADSHEET */}
                  <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-slate-800 shadow-xs mb-2">
                    <div className="flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4 text-red-500 animate-pulse" />
                      <div>
                        <h4 className="font-extrabold text-xs text-gray-850 dark:text-gray-150 uppercase tracking-tight">
                          {language === 'zh' ? '视图与数据管理' : 'Modo de Visualização & Gestão de Dados'}
                        </h4>
                        <p className="text-[10px] text-gray-400">
                          {language === 'zh' ? '在经典的模块网格和数据表视图之间进行选择' : 'Alterne entre cartões executivos e planilha detalhada de estoque.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Toggle Buttons */}
                      <button
                        onClick={() => setYardsViewMode('cards')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                          yardsViewMode === 'cards'
                            ? 'bg-red-600 text-white shadow-sm shadow-red-500/10'
                            : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>{language === 'zh' ? '卡片模式' : 'Visualização em Cards'}</span>
                      </button>

                      <button
                        onClick={() => setYardsViewMode('spreadsheet')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                          yardsViewMode === 'spreadsheet'
                            ? 'bg-red-600 text-white shadow-sm shadow-red-500/10'
                            : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>{language === 'zh' ? '全功能电子表格' : 'Planilha Geral de Estoque'}</span>
                      </button>
                    </div>
                  </div>

                  {yardsViewMode === 'cards' ? (
                    /* Cards de Pátio expandidos horizontalmente */
                    <div className={`flex flex-col ${widescreenMode ? 'gap-1.5' : 'gap-2.5'}`}>
                      {bondedYards.length > 0 && (
                        <div className={`grid grid-cols-2 ${widescreenMode ? 'gap-1.5' : 'gap-2.5'}`}>
                          {bondedYards.map(([key, yard]) => (
                            <YardCard 
                              key={key} 
                              yard={yard} 
                              ocupacao={getYardOcupacao(yard)} 
                              isEdit={isEditMode} 
                              theme={theme} 
                              t={t} 
                              language={language} 
                              renderLabel={renderLabel} 
                              widescreenMode={widescreenMode} 
                              onClick={() => setSelectedYardKey(key)}
                            />
                          ))}
                        </div>
                      )}
                      {nonBondedYards.length > 0 && (
                        <div className={`grid ${widescreenMode ? 'grid-cols-4 gap-1.5' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5'}`}>
                          {nonBondedYards.map(([key, yard]) => (
                            <YardCard 
                              key={key} 
                              yard={yard} 
                              ocupacao={getYardOcupacao(yard)} 
                              isEdit={isEditMode} 
                              theme={theme} 
                              isSmall 
                              t={t} 
                              language={language} 
                              renderLabel={renderLabel} 
                              widescreenMode={widescreenMode} 
                              onClick={() => {
                                if (yard.type === 'BUFFER') {
                                  setCurrentSlide(4);
                                } else {
                                  setSelectedYardKey(key);
                                }
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* PLANILHA DETALHADA E INTERATIVA DE ESTOQUE */
                    (() => {
                      const uniqueLots = Array.from(new Set(
                        containers
                          .filter(c => {
                            const yard = yards[c.yardId];
                            return yard && yard.type !== 'BUFFER' && c.lote;
                          })
                          .map(c => String(c.lote))
                      )).sort();

                      const filteredStockContainers = containers.filter(c => {
                        const yard = yards[c.yardId];
                        if (!yard || yard.type === 'BUFFER') return false;
                        
                        // Warehouse Filter
                        if (globalStockWarehouseFilter !== 'ALL' && c.yardId !== globalStockWarehouseFilter) {
                          return false;
                        }
                        
                        // Lot Filter
                        if (globalStockLoteFilter !== 'ALL' && String(c.lote || '') !== globalStockLoteFilter) {
                          return false;
                        }
                        
                        // Search Filter
                        if (globalStockSearch.trim()) {
                          const q = globalStockSearch.trim().toLowerCase();
                          const matchId = c.id.toLowerCase().includes(q);
                          const matchBl = (c.bl || '').toLowerCase().includes(q);
                          const matchVessel = (c.vesselName || '').toLowerCase().includes(q);
                          const matchModelo = (c.modelo || '').toLowerCase().includes(q);
                          const matchLote = String(c.lote || '').toLowerCase().includes(q);
                          if (!matchId && !matchBl && !matchVessel && !matchModelo && !matchLote) {
                            return false;
                          }
                        }
                        
                        return true;
                      });

                      return (
                        <div className={`p-4 rounded-xl border flex flex-col gap-3.5 ${
                          theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-100 shadow-sm'
                        } flex-1 min-h-[420px]`}>
                          
                          {/* Toolbar da Planilha */}
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50 dark:bg-[#152033]/60 p-3 rounded-lg border dark:border-slate-800">
                            <div className="flex items-center gap-2 flex-wrap flex-1">
                              {/* Search */}
                              <div className="relative min-w-[200px]">
                                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                                <input
                                  type="text"
                                  value={globalStockSearch}
                                  onChange={(e) => setGlobalStockSearch(e.target.value)}
                                  placeholder={language === 'zh' ? '搜索箱号, BL, 船舶...' : 'Buscar Contêiner, BL, Navio, Lote...'}
                                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-red-500 font-sans"
                                />
                              </div>

                              {/* Warehouse Filter */}
                              <select
                                value={globalStockWarehouseFilter}
                                onChange={(e) => setGlobalStockWarehouseFilter(e.target.value)}
                                className="p-1.5 text-xs font-bold rounded-lg border dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-hidden"
                              >
                                <option value="ALL">{language === 'zh' ? '所有堆场' : 'Todos os Pátios / Armaréns'}</option>
                                {Object.entries(yards).filter(([_, y]) => y && (y as any).type !== 'BUFFER').map(([key, y]) => (
                                  <option key={key} value={key}>{(y as any).name}</option>
                                ))}
                              </select>

                              {/* Lot Filter */}
                              <select
                                value={globalStockLoteFilter}
                                onChange={(e) => setGlobalStockLoteFilter(e.target.value)}
                                className="p-1.5 text-xs font-bold rounded-lg border dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-hidden"
                              >
                                <option value="ALL">{language === 'zh' ? '所有批次' : 'Todos os Lotes'}</option>
                                {uniqueLots.map(l => (
                                  <option key={l} value={l}>{l}</option>
                                ))}
                              </select>
                            </div>

                            {/* Export Stock Button */}
                            <div className="flex items-center gap-2 self-end md:self-auto">
                              <span className="text-[10px] font-mono font-bold text-slate-400">
                                {filteredStockContainers.length} cntr(s)
                              </span>
                              <button
                                onClick={handleExportStockToExcel}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>{language === 'zh' ? '导出表格' : 'Exportar Excel'}</span>
                              </button>
                            </div>
                          </div>

                          {/* Tabela Interativa de Estoque */}
                          <div className="overflow-auto max-h-[360px] border dark:border-slate-800 rounded-lg">
                            <table className="w-full text-left text-xs table-fixed min-w-[1200px]">
                              <thead className={`sticky top-0 z-10 font-bold uppercase tracking-wider text-[9px] ${
                                theme === 'dark' ? 'bg-[#0f172a] text-gray-400 border-b border-slate-850' : 'bg-gray-100 text-gray-500 border-b border-gray-200'
                              }`}>
                                <tr>
                                  <th className="p-2.5 w-[110px]">BL</th>
                                  <th className="p-2.5 w-[120px]">CONTAINER</th>
                                  <th className="p-2.5 w-[140px]">Warehouse</th>
                                  <th className="p-2.5 w-[160px]">Navio</th>
                                  <th className="p-2.5 w-[90px]">ETA</th>
                                  <th className="p-2.5 w-[90px]">Free Time</th>
                                  <th className="p-2.5 w-[80px]">Component</th>
                                  <th className="p-2.5 w-[140px]">Modelo</th>
                                  <th className="p-2.5 w-[100px]">Lote</th>
                                  <th className="p-2.5 w-[100px]">Programação</th>
                                  <th className="p-2.5 w-[120px]">Transportadora</th>
                                  {isEditMode && <th className="p-2.5 w-[60px] text-center">Ação</th>}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-medium">
                                {filteredStockContainers.map((c) => (
                                  <tr 
                                    key={c.id} 
                                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors ${
                                      theme === 'dark' ? 'text-slate-200' : 'text-slate-700'
                                    }`}
                                  >
                                    {/* BL */}
                                    <td className="p-1 truncate">
                                      {isEditMode ? (
                                        <input
                                          type="text"
                                          value={c.bl || ''}
                                          onChange={(e) => handleUpdateContainerField(c.id, 'bl', e.target.value)}
                                          className="w-full bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 rounded-sm font-sans"
                                        />
                                      ) : (
                                        <span className="p-1 block truncate">{c.bl || '-'}</span>
                                      )}
                                    </td>

                                    {/* CONTAINER */}
                                    <td className="p-2.5 font-mono font-bold text-gray-900 dark:text-gray-100 select-all truncate">
                                      {c.id}
                                    </td>

                                    {/* Warehouse / Yard */}
                                    <td className="p-1 truncate">
                                      {isEditMode ? (
                                        <select
                                          value={c.yardId}
                                          onChange={(e) => handleUpdateContainerField(c.id, 'yardId', e.target.value)}
                                          className="w-full bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 rounded-sm font-sans text-xs font-bold text-slate-800 dark:text-slate-100"
                                        >
                                          {Object.entries(yards).filter(([_, y]) => y && (y as any).type !== 'BUFFER').map(([key, y]) => (
                                            <option key={key} value={key}>{(y as any).name}</option>
                                          ))}
                                        </select>
                                      ) : (
                                        <span className="p-1 block truncate text-[11px] font-extrabold text-blue-600 dark:text-blue-400">
                                          {yards[c.yardId]?.name || c.yardId}
                                        </span>
                                      )}
                                    </td>

                                    {/* Navio */}
                                    <td className="p-1 truncate">
                                      {isEditMode ? (
                                        <input
                                          type="text"
                                          value={c.vesselName || ''}
                                          onChange={(e) => handleUpdateContainerField(c.id, 'vesselName', e.target.value)}
                                          className="w-full bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 rounded-sm font-sans"
                                        />
                                      ) : (
                                        <span className="p-1 block truncate">{c.vesselName || '-'}</span>
                                      )}
                                    </td>

                                    {/* ETA */}
                                    <td className="p-1 truncate">
                                      {isEditMode ? (
                                        <input
                                          type="text"
                                          value={c.eta || ''}
                                          onChange={(e) => handleUpdateContainerField(c.id, 'eta', e.target.value)}
                                          className="w-full bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 rounded-sm font-sans text-xs"
                                        />
                                      ) : (
                                        <span className="p-1 block truncate text-xs">{c.eta || '-'}</span>
                                      )}
                                    </td>

                                    {/* Free Time */}
                                    <td className="p-1 truncate">
                                      {isEditMode ? (
                                        <input
                                          type="text"
                                          value={c.freeTime || ''}
                                          onChange={(e) => handleUpdateContainerField(c.id, 'freeTime', e.target.value)}
                                          className="w-full bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 rounded-sm font-sans text-xs"
                                        />
                                      ) : (
                                        <span className="p-1 block truncate text-xs font-mono font-bold text-amber-600 dark:text-amber-400">{c.freeTime || '-'}</span>
                                      )}
                                    </td>

                                    {/* Component */}
                                    <td className="p-1 truncate">
                                      {isEditMode ? (
                                        <input
                                          type="text"
                                          value={c.componente || ''}
                                          onChange={(e) => handleUpdateContainerField(c.id, 'componente', e.target.value)}
                                          className="w-full bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 rounded-sm font-sans text-xs"
                                        />
                                      ) : (
                                        <span className="p-1 block truncate text-xs">{c.componente || '-'}</span>
                                      )}
                                    </td>

                                    {/* Modelo */}
                                    <td className="p-1 truncate">
                                      {isEditMode ? (
                                        <input
                                          type="text"
                                          value={c.modelo || ''}
                                          onChange={(e) => handleUpdateContainerField(c.id, 'modelo', e.target.value)}
                                          className="w-full bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 rounded-sm font-sans text-xs"
                                        />
                                      ) : (
                                        <span className="p-1 block truncate text-xs font-bold text-slate-550 dark:text-slate-300">{c.modelo || '-'}</span>
                                      )}
                                    </td>

                                    {/* Lote */}
                                    <td className="p-1 truncate">
                                      {isEditMode ? (
                                        <input
                                          type="text"
                                          value={c.lote || ''}
                                          onChange={(e) => handleUpdateContainerField(c.id, 'lote', e.target.value)}
                                          className="w-full bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 rounded-sm font-sans text-xs"
                                        />
                                      ) : (
                                        <span className="p-1 block truncate text-xs text-blue-500 dark:text-blue-400 font-bold">{c.lote || '-'}</span>
                                      )}
                                    </td>

                                    {/* Programação */}
                                    <td className="p-1 truncate">
                                      {isEditMode ? (
                                        <input
                                          type="text"
                                          value={c.programacao || ''}
                                          onChange={(e) => handleUpdateContainerField(c.id, 'programacao', e.target.value)}
                                          className="w-full bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 rounded-sm font-sans text-xs"
                                        />
                                      ) : (
                                        <span className="p-1 block truncate text-xs">{c.programacao || '-'}</span>
                                      )}
                                    </td>

                                    {/* Transportadora */}
                                    <td className="p-1 truncate">
                                      {isEditMode ? (
                                        <input
                                          type="text"
                                          value={c.transportadora || ''}
                                          onChange={(e) => handleUpdateContainerField(c.id, 'transportadora', e.target.value)}
                                          className="w-full bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 rounded-sm font-sans text-xs"
                                        />
                                      ) : (
                                        <span className="p-1 block truncate text-xs">{c.transportadora || '-'}</span>
                                      )}
                                    </td>

                                    {/* Actions */}
                                    {isEditMode && (
                                      <td className="p-1 text-center">
                                        <button
                                          onClick={() => handleDeleteContainerFromStock(c.id)}
                                          className="p-1 hover:bg-red-100 text-red-500 hover:text-red-700 dark:hover:bg-red-950/40 rounded transition-colors cursor-pointer"
                                          title={language === 'zh' ? '删除集装箱' : 'Remover contêiner'}
                                        >
                                          <Trash2 className="w-4 h-4 mx-auto" />
                                        </button>
                                      </td>
                                    )}
                                  </tr>
                                ))}
                                {filteredStockContainers.length === 0 && (
                                  <tr>
                                    <td colSpan={isEditMode ? 12 : 11} className="py-12 text-center text-sm text-gray-400">
                                      {language === 'zh' ? '没有匹配的集装箱记录。' : 'Nenhum contêiner registrado para as buscas atuais.'}
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()
                  )}

                  {/* Campo de Escrita Livre para Pátios */}
                  <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-100 shadow-sm'} flex-1 mt-2 flex flex-col justify-between min-h-[140px]`}>
                    <div className="flex items-center gap-2 border-b pb-1.5 mb-2 border-gray-100 dark:border-slate-800">
                      <FileText className="w-4.5 h-4.5 text-red-500 animate-pulse" />
                      <h4 className="font-extrabold text-[11px] text-red-600 dark:text-red-400 uppercase tracking-wider block">
                        {language === 'bilingual' ? 'COMENTÁRIOS DE CAPACIDADE & DIRETRIZES DE PÁTIO / 堆场容量备忘录与运行评论' : language === 'zh' ? '堆场容量备忘录与运行评论' : 'COMENTÁRIOS DE CAPACIDADE & DIRETRIZES DE PÁTIO'}
                      </h4>
                    </div>
                    <div className="flex-1 flex flex-col pt-1">
                      {isEditMode ? (
                        <textarea
                          id="input-yards-comment"
                          value={yardsComment}
                          onChange={(e) => {
                            setYardsComment(e.target.value);
                            updateGlobalDoc('yardsComment', e.target.value);
                          }}
                          placeholder="Digite suas observações de pátio... / 在此输入您的堆场备注..."
                          rows={4}
                          className="w-full flex-1 p-2 text-xs font-semibold border border-gray-200 dark:border-gray-700 dark:bg-slate-800 rounded-lg focus:ring-1 focus:ring-red-500 outline-none resize-none text-slate-800 dark:text-slate-100 placeholder:text-gray-400 font-sans"
                        />
                      ) : (
                        <div className="text-xs leading-relaxed font-bold text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans p-1.5 bg-slate-50/40 dark:bg-slate-900/40 rounded-lg border border-slate-50 dark:border-none">
                          {yardsComment || "Sem observações adicionadas para este período. / 本期无附加说明。"}
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              ) : currentSlide === 2 ? (
                /* SLIDE 3: NAVIOS (VESSELS ONLY) COM DUAS ÁREAS DE NOTAS */
                <div id="slide-dashboard-grid-vessels" className={`grid grid-cols-12 gap-4 ${widescreenMode ? 'h-[calc(100%-85px)] overflow-hidden' : 'min-h-[660px]'}`}>
                  
                  {/* LADO ESQUERDO: TABELA DE NAVIOS INTEGRAL EXPANDIDA */}
                  <div className="col-span-12 lg:col-span-5 flex flex-col h-full justify-between">
                    <div className={`p-4 rounded-xl flex-1 border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-100 shadow-sm'} flex flex-col justify-between`}>
                      <div>
                        <div className="flex items-center justify-between border-b pb-2 mb-3 border-gray-100 dark:border-slate-800">
                          <h3 className="font-extrabold text-sm flex items-center gap-2 text-[#2563eb] tracking-tight">
                            <Ship className="w-5 h-5 text-blue-500 animate-bounce" /> 
                            {language === 'bilingual' ? '活跃船舶靠泊计划 (ETA) / 船舶计划' : t('vesselSchedule')}
                          </h3>
                          <span className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200 font-bold px-2 py-0.5 rounded-full">{t('projected')}</span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-gray-200 dark:border-slate-800 text-gray-400 font-extrabold uppercase text-[10px] tracking-wider">
                                <th className="py-2 pb-2.5">{getColHeader('vessel')}</th>
                                <th className="py-2 pb-2.5 text-center">{getColHeader('eta')}</th>
                                <th className="py-2 pb-2.5 text-right">{getColHeader('cntrs')}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800/40">
                              {vessels.map((vessel, idx) => (
                                <tr key={vessel.id || idx} className="hover:bg-gray-50 dark:hover:bg-slate-800/10 transition-colors">
                                  <td className="font-extrabold text-gray-800 dark:text-gray-200 text-sm tracking-tight py-3">{vessel.name}</td>
                                  <td className="text-center text-gray-650 dark:text-gray-400 font-mono font-bold text-xs py-3">{vessel.eta}</td>
                                  <td className="text-right font-black text-blue-600 dark:text-blue-400 text-sm py-3 animate-pulse">{vessel.cntrs.toLocaleString()}</td>
                                </tr>
                              ))}
                              {vessels.length === 0 && (
                                <tr>
                                  <td colSpan={3} className="text-center py-10 text-gray-400">{t('noVessels')}</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Resumo do Volume Total a Descarregar */}
                      <div className="mt-4 pt-3 border-t border-dashed border-gray-200 dark:border-slate-800 text-xs text-gray-400 flex justify-between items-center bg-blue-50/20 dark:bg-blue-950/20 p-2.5 rounded-lg border border-blue-50 dark:border-none">
                        <span className="font-bold uppercase tracking-tight text-[10px]">
                          {language === 'bilingual' ? '集装箱到港总量 / Total Containers:' : t('totalContainers') + ':'}
                        </span>
                        <span className="font-black text-sm text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950 px-3 py-1 rounded font-mono">
                          {vessels.reduce((acc, curr) => acc + curr.cntrs, 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* LADO DIREITO: DUAS ÁREAS EM BRANCO PARA NOTAS OPERACIONAIS */}
                  <div className="col-span-12 lg:col-span-7 flex flex-col gap-3 h-full justify-between">
                    
                    {/* Nota 1: Janelas e Atracações */}
                    <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-100 shadow-sm'} flex-1 flex flex-col justify-between min-h-[160px]`}>
                      <div className="flex items-center gap-2 border-b pb-1.5 mb-2 border-gray-100 dark:border-slate-800">
                        <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <h4 className="font-bold text-xs text-blue-800 dark:text-blue-200 uppercase tracking-wider block">
                          {language === 'bilingual' ? '1. JANELAS OPERACIONAIS DE ATRACAÇÃO / 船期与靠泊说明' : language === 'zh' ? '1. 船期与靠泊说明' : '1. JANELAS OPERACIONAIS DE ATRACAÇÃO'}
                        </h4>
                      </div>
                      <div className="flex-1 flex flex-col pt-1">
                        {isEditMode ? (
                          <textarea
                            id="input-vessel-note1"
                            value={vesselNote1}
                            onChange={(e) => {
                              setVesselNote1(e.target.value);
                              updateGlobalDoc('vesselNote1', e.target.value);
                            }}
                            placeholder="Digite as notas operacionais e janelas de atracação... / 在此编写靠泊与船期备忘记录..."
                            className="w-full flex-1 p-2 text-xs font-semibold border border-gray-200 dark:border-gray-700 dark:bg-slate-800 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none resize-none text-slate-800 dark:text-slate-100 placeholder:text-gray-400 font-sans"
                          />
                        ) : (
                          <div className="text-xs leading-relaxed font-bold text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans p-2 bg-slate-50/40 dark:bg-slate-900/40 rounded-lg border border-slate-50 dark:border-none">
                            {vesselNote1 || "Sem observações operacionais para este período. / 本期无附加靠泊说明。"}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Nota 2: Escoamento de Contentores e Prioridade */}
                    <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-100 shadow-sm'} flex-1 flex flex-col justify-between min-h-[160px]`}>
                      <div className="flex items-center gap-2 border-b pb-1.5 mb-2 border-gray-100 dark:border-slate-800">
                        <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-450" />
                        <h4 className="font-bold text-xs text-emerald-800 dark:text-emerald-200 uppercase tracking-wider block">
                          {language === 'bilingual' ? '2. LOGÍSTICA DE LIBERAÇÃO E PRIORIDADE BYD / 口岸提运与出箱优先级' : language === 'zh' ? '2. 口岸提运与出箱优先级' : '2. LOGÍSTICA DE LIBERAÇÃO E PRIORIDADE BYD'}
                        </h4>
                      </div>
                      <div className="flex-1 flex flex-col pt-1">
                        {isEditMode ? (
                          <textarea
                            id="input-vessel-note2"
                            value={vesselNote2}
                            onChange={(e) => {
                              setVesselNote2(e.target.value);
                              updateGlobalDoc('vesselNote2', e.target.value);
                            }}
                            placeholder="Digite os destaques de escoamento e priorizações... / 在此编写集装箱提运和口岸放行备忘要点..."
                            className="w-full flex-1 p-2 text-xs font-semibold border border-gray-200 dark:border-gray-700 dark:bg-slate-800 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none resize-none text-slate-800 dark:text-slate-100 placeholder:text-gray-400 font-sans"
                          />
                        ) : (
                          <div className="text-xs leading-relaxed font-bold text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans p-2 bg-slate-50/40 dark:bg-slate-900/40 rounded-lg border border-slate-50 dark:border-none">
                            {vesselNote2 || "Sem notas de priorização para este período. / 本期无提运放行指示。"}
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              ) : currentSlide === 3 ? (
                /* SLIDE 4: GRÁFICOS (CHARTS ONLY) COM CAIXAS DE COMENTÁRIOS */
                <div id="slide-dashboard-grid-charts" className={`flex flex-col justify-between ${widescreenMode ? 'h-[calc(100%-85px)] overflow-hidden' : 'min-h-[660px] gap-4'}`}>
                  {(() => {
                    const chartLeftData = getDynamicChartLeft();
                    const maxVal = Math.max(...chartLeftData.map(item => item.backlog), 6000);
                    return (
                      <>
                        {/* CONTROL HUB FOR SLIDE 4 */}
                        <div className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-100 shadow-sm'} flex flex-col md:flex-row justify-between items-center gap-3 mb-2`}>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg animate-pulse">
                              <TrendingUp className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-extrabold text-[12px] text-gray-800 dark:text-gray-100 uppercase tracking-tight flex items-center gap-1.5">
                                {language === 'bilingual' ? 'Simulador de Escoamento de Carga / 货量流速仿真模拟器' : 'Cargo Drain Simulation'}
                              </h3>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-sans">
                                {language === 'bilingual' ? 'Ajuste os cenários e capacidades para recalcular o gráfico de backlog / 调节不同发运场景与每日交付能力，实时重算积压出清曲线' : 'Adjust scenarios and rates to dynamically recalculate the backlog burn-down.'}
                              </p>
                            </div>
                          </div>

                          {/* Toggles & Sliders */}
                          <div className="flex flex-wrap items-center gap-4">
                            {/* Scenario Selector */}
                            <div className="flex rounded-lg border border-gray-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800">
                              <button 
                                onClick={() => setSelectedScenario('etapa1')}
                                className={`px-2.5 py-1 text-[10px] font-black rounded-md transition-all ${
                                  selectedScenario === 'etapa1' 
                                    ? 'bg-blue-600 text-white shadow-xs' 
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                                }`}
                              >
                                {language === 'bilingual' ? 'Etapa 1 (Pátios+CDs)' : 'Etapa 1'}
                              </button>
                              <button 
                                onClick={() => setSelectedScenario('etapa2')}
                                className={`px-2.5 py-1 text-[10px] font-black rounded-md transition-all ${
                                  selectedScenario === 'etapa2' 
                                    ? 'bg-amber-600 text-white shadow-xs' 
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                                }`}
                              >
                                {language === 'bilingual' ? 'Etapa 2 (+Buffer)' : 'Etapa 2'}
                              </button>
                              <button 
                                onClick={() => setSelectedScenario('etapa3')}
                                className={`px-2.5 py-1 text-[10px] font-black rounded-md transition-all ${
                                  selectedScenario === 'etapa3' 
                                    ? 'bg-purple-600 text-white shadow-xs' 
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                                }`}
                              >
                                {language === 'bilingual' ? 'Etapa 3 (+ETA)' : 'Etapa 3'}
                              </button>
                            </div>

                            {/* Daily Delivery Slider */}
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 font-sans">
                                {language === 'bilingual' ? 'Capacidade / 能力:' : 'Capacity:'}
                              </span>
                              <input 
                                type="range"
                                min="50"
                                max="500"
                                step="10"
                                value={dailyDeliveryRate}
                                onChange={(e) => setDailyDeliveryRate(Number(e.target.value))}
                                className="w-24 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-550 dark:bg-slate-700"
                              />
                              <span className="font-mono text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                {dailyDeliveryRate}/dia
                              </span>
                            </div>

                            {/* KPI Projection Result */}
                            <div className="flex items-center gap-1.5 border-l border-dashed border-gray-250 dark:border-slate-700 pl-3">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-sans">{language === 'bilingual' ? 'Previsão / 预计完成' : 'Completion'}:</span>
                              <span className="text-[11px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md font-mono">
                                {(() => {
                                  const activeVol = selectedScenario === 'etapa1'
                                    ? (bondedSum.totalCheio + warehouseSum.totalCheio + additionalBacklog)
                                    : selectedScenario === 'etapa2'
                                      ? (bondedSum.totalCheio + warehouseSum.totalCheio + bufferSum.totalCheio + additionalBacklog)
                                      : (bondedSum.totalCheio + warehouseSum.totalCheio + bufferSum.totalCheio + vessels.reduce((sum, v) => sum + (v.cntrs || 0), 0) + additionalBacklog);
                                  const days = dailyDeliveryRate > 0 ? (activeVol / dailyDeliveryRate) : 0;
                                  const weeksNeeded = Math.ceil(days / 7);
                                  const complWeek = `W${28 + weeksNeeded}`;
                                  const baseDate = new Date('2026-07-08');
                                  baseDate.setDate(baseDate.getDate() + Math.round(days));
                                  const d = String(baseDate.getDate()).padStart(2, '0');
                                  const m = String(baseDate.getMonth() + 1).padStart(2, '0');
                                  return `${complWeek} (${d}/${m})`;
                                })()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Metade Superior: Gráficos Lado a Lado em Escala Maior */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
                          
                          {/* Gráfico 1 Expandido */}
                          <div className={`p-3.5 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 font-sans' : 'bg-white border-slate-100 shadow-sm font-sans'} flex flex-col justify-between h-[270px]`}>
                            <div className="flex justify-between items-center mb-1">
                              <h4 className="text-[11px] font-black text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                                <TrendingUp className="w-4 h-4 text-emerald-500" /> {getChartLeftTitle()}
                              </h4>
                              <div className="flex gap-2 text-[9px] font-bold">
                                <span className="flex items-center gap-1 text-slate-850 dark:text-slate-200"><span className="w-1.5 h-1.5 bg-slate-805 dark:bg-slate-400 inline-block rounded-sm"></span>{language === 'bilingual' ? '到港 / ATA' : 'ATA'}</span>
                                <span className="flex items-center gap-1 text-emerald-500">
                                  <span className="w-1.5 h-0.5 border-t border-emerald-500 border-dashed inline-block"></span>
                                  {language === 'pt' ? `Capacidade (${dailyDeliveryRate}/dia)` : (language === 'zh' ? `交付能力 (${dailyDeliveryRate}/天)` : `交付 / Capacidade (${dailyDeliveryRate}/d)`)}
                                </span>
                                <span className="flex items-center gap-1 text-red-500">
                                  <span className="w-1.5 h-1.5 bg-red-500 inline-block rounded-full"></span>
                                  {language === 'pt' ? 'Backlog' : (language === 'zh' ? '预测积压' : '积压 / Backlog')}
                                </span>
                              </div>
                            </div>

                            <div className="relative flex-1 w-full pt-1.5">
                              <svg className="w-full h-full overflow-visible" style={{ overflow: 'visible' }} viewBox="0 0 600 135" preserveAspectRatio="none">
                                <line x1="30" y1="100" x2="580" y2="100" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="3 3" />
                                <line x1="30" y1="65" x2="580" y2="65" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="3 3" />
                                <line x1="30" y1="30" x2="580" y2="30" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="3 3" />
                                
                                {/* Dynamic green dashed line connecting the actual delivery capped by max capacity (dailyDeliveryRate * 7) */}
                                <path
                                  d={chartLeftData.reduce((acc, item, i) => {
                                    const x = 35 + i * (540 / (chartLeftData.length - 1));
                                    const prevBacklog = i === 0 ? 1416 : chartLeftData[i-1].backlog;
                                    const delivery = Math.min(dailyDeliveryRate * 7, prevBacklog + item.arrivals);
                                    const y = 100 - (delivery / maxVal) * 85;
                                    return acc + `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                                  }, '')}
                                  fill="none"
                                  stroke="#10b981"
                                  strokeWidth="1.25"
                                  strokeDasharray="4 4"
                                />

                                {chartLeftData.map((item, i) => {
                                  const x = 35 + i * (540 / (chartLeftData.length - 1));
                                  const barHeight = (item.arrivals / maxVal) * 85;
                                  const y = 100 - barHeight;
                                  return (
                                    <rect 
                                      key={i}
                                      x={x - 2} 
                                      y={y} 
                                      width="4" 
                                      height={barHeight} 
                                      fill={theme === 'dark' ? '#475569' : '#1e293b'} 
                                      rx="0.5"
                                    />
                                  );
                                })}

                                <path
                                  d={chartLeftData.reduce((acc, item, i) => {
                                    const x = 35 + i * (540 / (chartLeftData.length - 1));
                                    const y = 100 - (item.backlog / maxVal) * 85;
                                    return acc + `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                                  }, '')}
                                  fill="none"
                                  stroke="#ef4444"
                                  strokeWidth="1.5"
                                />

                                {chartLeftData.map((item, i) => {
                                  const x = 35 + i * (540 / (chartLeftData.length - 1));
                                  const y = 100 - (item.backlog / maxVal) * 85;
                                  return (
                                    <g key={`cl-${i}`}>
                                      <circle cx={x} cy={y} r="2" fill="#ef4444" stroke="#fff" strokeWidth="0.5" />
                                      {/* Prevent overlapping text nodes by showing labels at key points */}
                                      {(i % 2 === 0 || i === chartLeftData.length - 1 || item.backlog > 0) && (
                                        <text 
                                          x={x} 
                                          y={y - 4} 
                                          fill="#ef4444" 
                                          fontSize="6" 
                                          fontWeight="black" 
                                          textAnchor="middle" 
                                          className="font-mono"
                                        >
                                          {item.backlog}
                                        </text>
                                      )}
                                    </g>
                                  );
                                })}

                                {chartLeftData.map((item, i) => {
                                  const x = 35 + i * (540 / (chartLeftData.length - 1));
                                  return (
                                    <text 
                                      key={`cl-lbl-${i}`} 
                                      x={x} 
                                      y="112" 
                                      fill="#94a3b8" 
                                      fontSize="5.5" 
                                      textAnchor="end" 
                                      fontWeight="bold" 
                                      className="font-mono"
                                      transform={`rotate(-45, ${x}, 112)`}
                                    >
                                      {item.week} - 2026
                                    </text>
                                  );
                                })}
                              </svg>
                            </div>
                          </div>

                    {/* Gráfico 2 Expandido */}
                    <div className={`p-3.5 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 font-sans' : 'bg-white border-slate-100 shadow-sm font-sans'} flex flex-col justify-between h-[270px]`}>
                      <div className="flex justify-between items-center mb-1">
                        <h4 className="text-[11px] font-black text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Database className="w-4 h-4 text-cyan-500" /> {getChartRightTitle()}
                        </h4>
                        <div className="flex gap-2 text-[9px] font-bold">
                          <span className="flex items-center gap-1 text-emerald-500"><span className="w-1.5 h-1.5 bg-[#059669] inline-block rounded-sm"></span>{language === 'bilingual' ? '高效 / High' : t('opHigh')}</span>
                          <span className="flex items-center gap-1 text-indigo-500"><span className="w-1.5 h-1.5 bg-[#6366f1] inline-block rounded-sm"></span>{language === 'bilingual' ? '稳定 / Stable' : t('opStable')}</span>
                          <span className="flex items-center gap-1 text-[#f59e0b]"><span className="w-1.5 h-0.5 border-t border-[#f59e0b] border-dashed inline-block"></span>{language === 'bilingual' ? '目标 / Gc (140)' : t('metaGc')}</span>
                        </div>
                      </div>

                      <div className="relative flex-1 w-full pt-1.5">
                        <svg className="w-full h-full overflow-visible" style={{ overflow: 'visible' }} viewBox="0 0 600 135" preserveAspectRatio="none">
                          <line x1="30" y1="100" x2="580" y2="100" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="3 3" />
                          <line x1="30" y1="65" x2="580" y2="65" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="3 3" />
                          <line x1="30" y1="30" x2="580" y2="30" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="3 3" />
                          <line x1="30" y1="67" x2="580" y2="67" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 4" />
                          <text x="582" y="70" fill="#f59e0b" fontSize="7" fontWeight="bold">Gc</text>

                          {chartRight.map((item, i) => {
                            const x = 32 + i * (540 / (chartRight.length - 1));
                            const barHeight = (item.value / 320) * 85;
                            const y = 100 - barHeight;
                            
                            let barColor = "#059669"; 
                            if (item.value < 140) {
                              barColor = "#6366f1"; 
                            }
                            if (i % 3 === 0 && item.value > 180) {
                              barColor = "#10b981"; 
                            }

                            return (
                              <g key={`cr-${i}`}>
                                <rect 
                                  x={x - 2} 
                                  y={y} 
                                  width="4" 
                                  height={barHeight} 
                                  fill={barColor} 
                                  rx="0.5"
                                />
                                {item.value > 0 && (
                                  <text 
                                    x={x} 
                                    y={y - 3} 
                                    fill={theme === 'dark' ? '#cbd5e1' : '#1e293b'} 
                                    fontSize="5.5" 
                                    fontWeight="black" 
                                    textAnchor="middle" 
                                    className="font-mono"
                                  >
                                    {item.value}
                                  </text>
                                )}
                              </g>
                            );
                          })}

                          {chartRight.map((item, i) => {
                            if (i % 11 === 0 || i === chartRight.length - 1) {
                              const x = 32 + i * (540 / (chartRight.length - 1));
                              return (
                                <text key={`cr-lbl-${i}`} x={x} y="118" fill="#94a3b8" fontSize="6.5" textAnchor="middle" fontWeight="bold">{item.date}</text>
                              );
                            }
                            return null;
                          })}
                        </svg>
                      </div>
                    </div>

                  </div>

                  {/* Metade Inferior: Caixas em Branco de Comentários */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-2">
                    
                    {/* Nota do Gráfico 1 */}
                    <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-100 shadow-sm'} flex flex-col justify-between min-h-[145px]`}>
                      <div className="flex items-center gap-2 border-b pb-1.5 mb-2 border-gray-100 dark:border-slate-800">
                        <FileText className="w-4 h-4 text-emerald-500" />
                        <h4 className="font-bold text-xs text-slate-800 dark:text-[#a7f3d0] uppercase tracking-wider block">
                          {language === 'bilingual' ? 'ANÁLISE DE BACKLOG & CAPACIDADE / 预测积压与交付分析' : language === 'zh' ? '预测积压与交付分析' : 'ANÁLISE DE BACKLOG & CAPACIDADE'}
                        </h4>
                      </div>
                      <div className="flex-1 flex flex-col pt-1">
                        {isEditMode ? (
                          <textarea
                            id="input-chart-note1"
                            value={chartNote1}
                            onChange={(e) => {
                              setChartNote1(e.target.value);
                              updateGlobalDoc('chartNote1', e.target.value);
                            }}
                            placeholder="Análise do backlog projetado vs entrega... / 分析积压趋势与周发货计划对比..."
                            className="w-full flex-1 p-2 text-xs font-semibold border border-gray-200 dark:border-gray-700 dark:bg-slate-800 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none resize-none text-slate-800 dark:text-slate-100 placeholder:text-gray-400 font-sans"
                          />
                        ) : (
                          <div className="text-xs leading-relaxed font-bold text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans p-2 bg-slate-50/40 dark:bg-slate-900/40 rounded-lg border border-slate-50 dark:border-none">
                            {chartNote1 || "Sem análises semanais para este período. / 本期间内无附加积压 analysis。"}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Nota do Gráfico 2 */}
                    <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-100 shadow-sm'} flex flex-col justify-between min-h-[145px]`}>
                      <div className="flex items-center gap-2 border-b pb-1.5 mb-2 border-gray-100 dark:border-slate-800">
                        <FileText className="w-4 h-4 text-cyan-500" />
                        <h4 className="font-bold text-xs text-slate-800 dark:text-[#bae6fd] uppercase tracking-wider block">
                          {language === 'bilingual' ? 'RETROSPECÇÃO DE ENTRADAS VS METAS (Gc 140) / 进箱吞吐与目标对比反馈' : language === 'zh' ? '进箱吞吐与目标对比反馈' : 'RETROSPECÇÃO DE ENTRADAS VS METAS (Gc 140)'}
                        </h4>
                      </div>
                      <div className="flex-1 flex flex-col pt-1">
                        {isEditMode ? (
                          <textarea
                            id="input-chart-note2"
                            value={chartNote2}
                            onChange={(e) => {
                              setChartNote2(e.target.value);
                              updateGlobalDoc('chartNote2', e.target.value);
                            }}
                            placeholder="Notas de desempenho e desvios de metas... / 记录进箱表现与各供应商目标偏差..."
                            className="w-full flex-1 p-2 text-xs font-semibold border border-gray-200 dark:border-gray-700 dark:bg-slate-800 rounded-lg focus:ring-1 focus:ring-cyan-500 outline-none resize-none text-slate-800 dark:text-slate-100 placeholder:text-gray-400 font-sans"
                          />
                        ) : (
                          <div className="text-xs leading-relaxed font-bold text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans p-2 bg-slate-50/40 dark:bg-slate-900/40 rounded-lg border border-slate-50 dark:border-none">
                            {chartNote2 || "Sem diretrizes de desempenho para este período. / 本期间内无附加吞吐分析。"}
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </>
              );
            })()}
                </div>
              ) : currentSlide === 4 ? (
                /* SLIDE 5: BYD BUFFER (2D MAP GRID AND COORDINATE LAYOUT) */
                <div id="slide-dashboard-grid-buffer" className="flex flex-col gap-4 w-full h-full min-h-[660px]">
                  
                  {/* TOP CONTROL HUB FOR BYD BUFFER */}
                  <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-100 shadow-sm'} flex flex-col md:flex-row justify-between items-start md:items-center gap-3`}>
                    <div className="flex items-center gap-3">
                      <div className="bg-red-100 dark:bg-red-950 p-2.5 rounded-xl text-red-600 dark:text-red-400">
                        <Layers className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm flex items-center gap-2 text-red-600 dark:text-red-400 tracking-tight">
                          {language === 'bilingual' ? 'HUB DE BUFFER INTEGRADO BYD / 比亚迪智能缓冲中转枢纽' : language === 'zh' ? '比亚迪智能缓冲中转枢纽' : 'HUB DE BUFFER INTEGRADO BYD'}
                        </h3>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                          {language === 'zh' ? '实时监控、空余容量管理与 2D 堆位可视化地图' : 'Mapeamento de slots, otimização de retirada rápida e indicador de capacidade'}
                        </p>
                      </div>
                    </div>

                    {/* SELECT BUFFER AREA DROPDOWN & EXPORT ACTIONS */}
                    <div className="flex flex-wrap items-center gap-2">
                      <select 
                        value={activeBufferId}
                        onChange={(e) => setActiveBufferId(e.target.value)}
                        className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-bold rounded-lg outline-none cursor-pointer focus:ring-1 focus:ring-red-500 text-slate-800 dark:text-slate-100"
                      >
                        {bufferAreas.map(area => (
                          <option key={area.id} value={area.id}>{area.name}</option>
                        ))}
                      </select>

                      <button
                        onClick={handleExportBufferLayout}
                        className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 hover:bg-emerald-100 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Exportar dados de ocupação para Excel"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        Exportar Excel
                      </button>

                      <label className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 hover:bg-amber-100 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{language === 'zh' ? '导入 Excel' : 'Importar Excel'}</span>
                        <input
                          id="excel_upload_buffer_input"
                          type="file"
                          accept=".xlsx, .xls"
                          onChange={handleImportBufferExcel}
                          className="hidden"
                        />
                      </label>

                      <button
                        onClick={handleCreateNewBufferZone}
                        className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40 hover:bg-blue-100 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Criar uma nova área de buffer personalizada"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {language === 'zh' ? '新建区' : 'Nova Área'}
                      </button>

                      <button
                        onClick={handleDeleteBufferZone}
                        className="px-3 py-1.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/40 hover:bg-red-100 dark:hover:bg-red-950/60 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                        title={language === 'zh' ? '删除当前选中的缓冲区区域' : 'Excluir área de buffer atual selecionada'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {language === 'zh' ? '删除当前区' : 'Excluir Área'}
                      </button>
                    </div>
                  </div>

                  {/* STATS AND GRID MAP WRAPPER */}
                  <div className="grid grid-cols-12 gap-4">
                    
                    {/* STATS PANEL (LEFT COLUMN / 3 SPAN) */}
                    <div className="col-span-12 xl:col-span-3 flex flex-col gap-3">
                      
                      {/* STAT 1: OCCUPANCY */}
                      <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-100 shadow-sm'} flex flex-col justify-between`}>
                        <div className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">
                          {language === 'zh' ? '堆位使用率 / 占用情况' : 'Ocupação do Buffer'}
                        </div>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-2xl font-black text-slate-800 dark:text-white font-mono">
                            {getCurrentBufferOccupancy().occupied}
                          </span>
                          <span className="text-sm text-gray-400">/ {getCurrentBufferOccupancy().total} slots</span>
                        </div>

                        {/* Breakdown of Cheios / Vazios */}
                        <div className="mt-2.5 mb-2 grid grid-cols-2 gap-2 border-t border-b border-gray-150/45 dark:border-slate-800 py-1.5">
                          <div className="flex flex-col">
                            <span className="text-[8.5px] text-gray-400 uppercase font-black tracking-tight">{language === 'zh' ? '重箱' : 'Cheios'}</span>
                            <span className="text-sm font-black text-blue-600 dark:text-blue-400 font-mono">
                              {getCurrentBufferOccupancy().totalFull}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[8.5px] text-gray-400 uppercase font-black tracking-tight">{language === 'zh' ? '空箱' : 'Vazios (Swap)'}</span>
                            <span className="text-sm font-black text-slate-500 dark:text-slate-400 font-mono">
                              {getCurrentBufferOccupancy().totalEmpty}
                            </span>
                          </div>
                        </div>

                        <div className="mt-1 w-full bg-gray-200 dark:bg-slate-850 rounded-full h-2">
                          <div 
                            className="bg-red-650 h-2 rounded-full transition-all duration-500" 
                            style={{ width: `${getCurrentBufferOccupancy().percentage}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono mt-1.5 font-bold">
                          <span>{getCurrentBufferOccupancy().percentage}% {language === 'zh' ? '已满' : 'Ocupado'}</span>
                          <span className="text-emerald-500">{getCurrentBufferOccupancy().empty} {language === 'zh' ? '可用' : 'livres'}</span>
                        </div>
                      </div>

                      {/* STAT 2: OPTIMIZED QUICK OUTS */}
                      <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-100 shadow-sm'} flex flex-col justify-between`}>
                        <div className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-yellow-500" />
                          {language === 'zh' ? '最佳发运箱 / Quick-Out' : 'Melhor Posicionamento'}
                        </div>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                            {getCurrentBufferOccupancy().optimalCount}
                          </span>
                          <span className="text-xs text-gray-400 font-bold uppercase">{language === 'zh' ? '无死角直接出货' : 'Prontos p/ Retirada'}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2 leading-tight">
                          {language === 'zh' ? '堆放在外侧或上层，发运时无需挪动其他箱，可实现零成本快速提出。' : 'Contêineres situados nas bordas de fácil acesso, otimizados para retirada rápida sem necessidade de movimentações extras.'}
                        </p>
                      </div>

                      {/* STAT 3: DISPATCH RECO LIST */}
                      <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-100 shadow-sm'} flex-1 flex flex-col justify-between min-h-[220px]`}>
                        <div>
                          <div className="text-[10px] text-red-600 dark:text-red-400 font-extrabold uppercase tracking-widest border-b pb-1.5 mb-2 border-gray-105 dark:border-slate-800">
                            {language === 'zh' ? '零移箱发运建议优先顺序' : 'Sugestões de Retirada Rápida'}
                          </div>
                          <div className="space-y-1.5 max-h-[220px] overflow-y-auto w-full">
                            {getOptimalPickupList().map((slot, idx) => (
                              <div 
                                key={idx} 
                                onClick={() => handleSlotClick(slot.row, slot.col)}
                                className="p-1.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-200 transition-all cursor-pointer flex justify-between items-center"
                              >
                                <div>
                                  <div className="text-[10px] font-black text-slate-800 dark:text-gray-100 font-mono flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-ping"></span>
                                    {slot.containerNo}
                                  </div>
                                  <div className="text-[9px] text-gray-400 font-bold">
                                    {slot.cargoType} • <span className="font-mono text-red-600 dark:text-red-400">Pos {getSlotCoordsLabel(slot.row, slot.col)}</span>
                                  </div>
                                </div>
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${
                                  slot.priority === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                                  slot.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {slot.priority}
                                </span>
                              </div>
                            ))}
                            {getOptimalPickupList().length === 0 && (
                              <div className="text-center py-8 text-gray-400 text-[11px] font-bold">
                                {language === 'zh' ? '当前没有标记为最佳发运位置的箱子。' : 'Nenhum contêiner na rota rápida de retirada.'}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="mt-3 pt-2.5 border-t border-dashed border-gray-100 dark:border-slate-850 text-[9.5px] text-gray-400 text-center font-bold uppercase">
                          ⚡ BYD Quick-Out Optimizer v1.1
                        </div>
                      </div>

                    </div>

                    {/* GRID MAP AREA (MIDDLE / COLUMN 9 SPAN) */}
                    <div className="col-span-12 xl:col-span-9 flex flex-col gap-3">
                      
                      {/* THE MAP CANVAS CARD */}
                      <div className={`p-5 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-100 shadow-sm'} flex flex-col justify-between h-full`}>
                        <div>
                          <div className="flex justify-between items-center border-b pb-2 mb-3 border-gray-100 dark:border-slate-800">
                            <h4 className="text-xs font-black text-slate-800 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                              <Boxes className="w-4 h-4 text-red-500" />
                              {language === 'zh' ? '智能 2D 地图：俯视与通道布局监控' : 'Mapa 2D do Buffer: Vista Aérea e Alocação Espacial'}
                            </h4>
                            <div className="flex gap-3 text-[9px] font-bold flex-wrap">
                              <span className="flex items-center gap-1 text-slate-500"><span className="w-2.5 h-2.5 border border-dashed border-slate-300 dark:border-slate-700 rounded-sm inline-block"></span>{language === 'zh' ? '空余' : 'Vazio'}</span>
                              <span className="flex items-center gap-1 text-red-500"><span className="w-2.5 h-2.5 bg-red-500/10 border border-red-500/30 rounded-sm inline-block"></span>{language === 'zh' ? '临界/高优先级' : 'Alta Pri'}</span>
                              <span className="flex items-center gap-1 text-blue-500"><span className="w-2.5 h-2.5 bg-blue-500/10 border border-blue-500/30 rounded-sm inline-block"></span>{language === 'zh' ? '普通优先级' : 'Normal Pri'}</span>
                              <span className="flex items-center gap-1 text-emerald-500"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm inline-block animate-pulse"></span>{language === 'zh' ? '最佳发运 (⚡ Quick-Out)' : 'Melhor Posicionado (⚡)'}</span>
                            </div>
                          </div>

                          {/* CONTROL ROW: STATUS FILTERS & MAXIMIZE */}
                          <div className="flex flex-wrap justify-between items-center gap-2 mb-4 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-505 flex items-center gap-1">
                                <Filter className="w-3 h-3 text-red-500" />
                                {language === 'zh' ? '过滤状态:' : 'Filtrar por Status:'}
                              </span>
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => setBufferStatusFilter('ALL')}
                                  className={`px-2 py-0.5 rounded text-[9px] font-extrabold transition-all cursor-pointer ${
                                    bufferStatusFilter === 'ALL'
                                      ? 'bg-red-650 text-white shadow-xs'
                                      : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                                  }`}
                                >
                                  {language === 'zh' ? '全部' : 'Todos'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setBufferStatusFilter('CHEIO')}
                                  className={`px-2 py-0.5 rounded text-[9px] font-extrabold transition-all cursor-pointer ${
                                    bufferStatusFilter === 'CHEIO'
                                      ? 'bg-blue-600 text-white shadow-xs'
                                      : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                                  }`}
                                >
                                  {language === 'zh' ? '仅重箱' : 'Cheios'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setBufferStatusFilter('VAZIO')}
                                  className={`px-2 py-0.5 rounded text-[9px] font-extrabold transition-all cursor-pointer ${
                                    bufferStatusFilter === 'VAZIO'
                                      ? 'bg-slate-500 text-white shadow-xs'
                                      : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                                  }`}
                                >
                                  {language === 'zh' ? '仅空箱' : 'Vazios'}
                                </button>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setIsBufferMapMaximized(true)}
                              className="px-2.5 py-1 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-950/60 rounded text-[9.5px] font-black flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                            >
                              <Maximize2 className="w-3 h-3" />
                              {language === 'zh' ? '全屏放大' : 'Maximizar Mapa'}
                            </button>
                          </div>

                          {/* THE ACTUAL GRID MAP */}
                          <div className="w-full overflow-x-auto bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-100 dark:border-slate-850/50 flex flex-col items-center">
                            
                            {/* Columns indexes header */}
                            <div className="flex mb-1.5 pl-6">
                              {Array.from({ length: getCurrentBufferArea().cols }).map((_, c) => (
                                <div key={c} className="w-28 text-center text-[10px] font-black text-gray-400 font-mono">
                                  {language === 'zh' ? `第 ${c + 1} 列` : `COL ${c + 1}`}
                                </div>
                              ))}
                            </div>

                            {/* Rows block */}
                            <div className="space-y-2">
                              {Array.from({ length: getCurrentBufferArea().rows }).map((_, r) => {
                                const isNumericArea = activeBufferId.includes('buffer-e') || activeBufferId.includes('buffer-b');
                                const rowLetter = isNumericArea ? String(r + 1) : String.fromCharCode(65 + r); // A, B, C, D... or 1, 2, 3...
                                return (
                                  <div key={r} className="flex items-center gap-2">
                                    {/* Row label */}
                                    <div className="w-5 text-center text-xs font-black text-gray-500 dark:text-gray-400 font-mono">
                                      {isNumericArea ? `R${rowLetter}` : rowLetter}
                                    </div>

                                    {/* Column cells */}
                                    <div className="flex gap-2">
                                      {Array.from({ length: getCurrentBufferArea().cols }).map((_, c) => {
                                        const slot = getSlotAt(r, c);
                                        const isOccupied = !!slot?.containerNo;
                                        const isVazio = slot?.status?.toLowerCase().includes('vaz') || slot?.status?.toLowerCase().includes('emp');
                                        const isFilteredOut = isOccupied && (
                                          (bufferStatusFilter === 'CHEIO' && isVazio) ||
                                          (bufferStatusFilter === 'VAZIO' && !isVazio)
                                        );
                                        
                                        return (
                                          <div 
                                            key={c}
                                            onClick={() => handleSlotClick(r, c)}
                                            className={`
                                              w-28 h-20 rounded-xl transition-all duration-250 cursor-pointer select-none relative flex flex-col justify-between p-2 text-left border
                                              ${isOccupied 
                                                ? (slot.isOptimalPickup 
                                                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 shadow-md shadow-emerald-500/10' 
                                                  : (slot.priority === 'CRITICAL' || slot.priority === 'HIGH'
                                                    ? 'bg-red-50/80 dark:bg-red-950/20 border-red-400'
                                                    : (isVazio 
                                                      ? 'bg-slate-50 dark:bg-slate-900/40 border-gray-400/80 text-gray-500'
                                                      : 'bg-blue-50/80 dark:bg-blue-950/15 border-blue-400'
                                                    )
                                                  )
                                                ) 
                                                : 'border-dashed border-gray-300 dark:border-slate-800 bg-transparent hover:border-red-400 hover:bg-slate-100/30 hover:shadow-inner'
                                              }
                                              ${isFilteredOut ? 'opacity-15 saturate-50 blur-[0.3px] pointer-events-none' : ''}
                                            `}
                                          >
                                            {/* Top indicators */}
                                            <div className="flex justify-between items-start">
                                              <span className="text-[7.5px] font-mono font-bold text-gray-400 bg-white/70 dark:bg-slate-800/80 px-1 py-0.2 rounded">
                                                {isNumericArea ? `${activeBufferId.includes('buffer-e') ? 'E' : 'B'}_${rowLetter}_${c + 1}` : `${rowLetter}${c + 1}`}
                                              </span>

                                              {isOccupied && (
                                                <div className="flex gap-1 items-center">
                                                  {slot.isOptimalPickup && (
                                                    <span className="flex h-2 w-2 relative">
                                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                    </span>
                                                  )}
                                                  <span className={`text-[7px] font-black px-1.5 py-0.2 rounded ${
                                                    slot.size === '40\' HC' ? 'bg-[#3b82f6] text-white' : 'bg-amber-600 text-white'
                                                  }`}>
                                                    {slot.size === '40\' HC' ? "40'" : "20'"}
                                                  </span>
                                                </div>
                                              )}
                                            </div>

                                            {/* Main Info */}
                                            {isOccupied ? (
                                              <div className="flex flex-col gap-0.2 mt-0.5 leading-tight">
                                                <div className="text-[10.5px] font-black text-slate-800 dark:text-gray-100 font-mono tracking-tight truncate flex items-center justify-between">
                                                  <span className="truncate">{slot.containerNo}</span>
                                                  {isVazio && (
                                                    <span className="text-[7.5px] font-extrabold px-1 py-0.2 bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-gray-400 rounded-sm scale-90 shrink-0" title="Vazio / Empty">
                                                      {language === 'zh' ? '空' : 'V'}
                                                    </span>
                                                  )}
                                                </div>
                                                <div className="text-[8.5px] font-bold text-gray-400 dark:text-gray-450 truncate">
                                                  {slot.cargoType}
                                                </div>
                                                {(slot.loteNo || slot.validade) && (
                                                  <div className="text-[8px] font-extrabold truncate flex flex-col gap-0.1 border-t border-slate-150/40 dark:border-slate-800/60 pt-0.5 mt-0.5">
                                                    {slot.loteNo && (
                                                      <span className="text-blue-600 dark:text-blue-400 font-black truncate">
                                                        L:{slot.loteNo}
                                                      </span>
                                                    )}
                                                    {slot.validade && (
                                                      <span className="text-amber-600 dark:text-amber-450 truncate" title={`Validade / Free Time End: ${slot.validade}`}>
                                                        F.T:{slot.validade}
                                                      </span>
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            ) : (
                                              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 group">
                                                <Plus className="w-4 h-4 text-gray-300 dark:text-slate-700 hover:text-red-500 transition-colors" />
                                                <span className="text-[7.5px] font-bold uppercase tracking-widest mt-1 opacity-0 hover:opacity-100 transition-all text-gray-400">
                                                  {language === 'zh' ? '添加' : 'Adicionar'}
                                                </span>
                                              </div>
                                            )}

                                            {/* Bottom Pill */}
                                            {isOccupied && (
                                              <div className="flex justify-between items-center text-[7.5px] font-bold mt-1">
                                                <span className={`px-1 rounded ${
                                                  slot.priority === 'CRITICAL' ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' :
                                                  slot.priority === 'HIGH' ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300' :
                                                  slot.priority === 'NORMAL' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                                                  'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400'
                                                }`}>
                                                  {slot.priority}
                                                </span>

                                                {slot.stack && slot.stack.length > 1 && (
                                                  <span className="text-[7.5px] font-black text-purple-600 dark:text-purple-450 bg-purple-50 dark:bg-purple-950/20 px-1 rounded border border-purple-200/50 dark:border-purple-800/40 flex items-center gap-0.5">
                                                    <Layers className="w-2.5 h-2.5 inline" />
                                                    <span>H:{slot.stack.length}</span>
                                                  </span>
                                                )}

                                                {slot.isOptimalPickup && (
                                                  <span className="text-[8px] font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                                    ⚡ Quick
                                                  </span>
                                                )}
                                              </div>
                                            )}

                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                          </div>
                        </div>

                        {/* DESCRITORES ADICIONAIS */}
                        <div className="mt-4 pt-3 border-t border-dashed border-gray-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-gray-400 font-bold bg-slate-50/40 dark:bg-slate-900/40 p-3 rounded-lg">
                          <div className="flex items-center gap-1.5 leading-snug">
                            <Info className="w-4 h-4 text-blue-500 shrink-0" />
                            <span>
                              {language === 'zh' ? '💡 双击或单击任何格子可以编辑、更改状态、调整出货优先级或将其标记为“零阻碍快速提车”位置。' : '💡 Clique em qualquer slot para alocar um contêiner, desocupar a vaga ou marcar como "Melhor Posicionamento" para prioridade de entrega.'}
                            </span>
                          </div>
                          <span className="font-mono text-[10px] text-red-600 dark:text-red-400 uppercase font-black shrink-0">
                            COORD: {getCurrentBufferArea().rows}x{getCurrentBufferArea().cols} GRID MAP
                          </span>
                        </div>

                      </div>
                    </div>

                  </div>

                </div>
              ) : currentSlide === 6 ? (
                /* SLIDE 7: DEMURRAGE & OVERDUE MONITORING DASHBOARD (HIGH FIDELITY) */
                <div id="slide-dashboard-demurrage" className="flex flex-col gap-4 w-full">
                  {(() => {
                    // 1. Dynamic filtering logic
                    const componentsListOptions = Array.from(new Set(containers.map(c => c.componente).filter(Boolean)));
                    const carrierListOptions = Array.from(new Set(containers.map(c => c.transportadora).filter(Boolean)));
                    const vesselListOptions = Array.from(new Set(containers.map(c => c.vesselName).filter(v => v && v !== 'N/A')));

                    const filteredContainersForDemurrage = containers.filter(c => {
                      if (demurrageFilterDelivered === 'DELIVERED' && c.category !== 'DELIVERED') return false;
                      if (demurrageFilterDelivered === 'NOT_DELIVERED' && c.category === 'DELIVERED') return false;
                      if (demurrageFilterComponent !== 'ALL' && c.componente !== demurrageFilterComponent) return false;
                      if (demurrageFilterCarrier !== 'ALL' && c.transportadora !== demurrageFilterCarrier) return false;
                      if (demurrageFilterVessel !== 'ALL' && c.vesselName !== demurrageFilterVessel) return false;
                      return true;
                    });

                    // Helper to compute days remaining dynamically based on freeTime and the selected demurrageRefDate
                    const getDaysRemainingForContainer = (c: Container) => {
                      if (!c.freeTime) return null;
                      const parts = c.freeTime.split('/');
                      if (parts.length < 2) return null;
                      const day = parseInt(parts[0], 10);
                      const month = parseInt(parts[1], 10) - 1;
                      const year = parts.length === 3 ? parseInt(parts[2], 10) : 2026;
                      const freeTimeDate = new Date(year, month, day);

                      const refParts = demurrageRefDate.split('-');
                      if (refParts.length < 3) return null;
                      const refYear = parseInt(refParts[0], 10);
                      const refMonth = parseInt(refParts[1], 10) - 1;
                      const refDay = parseInt(refParts[2], 10);
                      const referenceDate = new Date(refYear, refMonth, refDay);

                      const diffTime = freeTimeDate.getTime() - referenceDate.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      return diffDays;
                    };

                    const getMatchingContainersForSelectedRange = () => {
                      if (!selectedDemurrageRange) return [];
                      const r = ranges.find(x => x.label === selectedDemurrageRange.label);
                      if (!r) return [];

                      return filteredContainersForDemurrage.filter(c => {
                        const days = getDaysRemainingForContainer(c);
                        if (days === null) return false;

                        // First check range condition
                        if (!r.filter(days)) return false;

                        // Then check column condition
                        const col = selectedDemurrageRange.col;
                        if (col === 'buffer') {
                          return c.yardId === 'buffer';
                        }
                        if (col === 'buffer-scheduled') {
                          return c.yardId === 'buffer' && c.programacao && c.programacao.trim() !== '';
                        }
                        if (col === 'delivered') {
                          return c.category === 'DELIVERED';
                        }
                        if (col === 'outside') {
                          return c.yardId !== 'buffer';
                        }
                        // 'total' is all matching the range
                        return true;
                      });
                    };

                    // Helper to calculate row metrics for Expiration Light aging ranges
                    const getRowMetrics = (filterFn: (days: number) => boolean) => {
                      let atBuffer = 0;
                      let atBufferScheduled = 0;
                      let deliveredPending = 0;
                      let outsideByd = 0;

                      filteredContainersForDemurrage.forEach(c => {
                        const days = getDaysRemainingForContainer(c);
                        if (days === null) return;

                        if (filterFn(days)) {
                          if (c.yardId === 'buffer') {
                            atBuffer++;
                            if (c.programacao && c.programacao.trim() !== '') {
                              atBufferScheduled++;
                            }
                          } else {
                            outsideByd++;
                          }

                          if (c.category === 'DELIVERED') {
                            deliveredPending++;
                          }
                        }
                      });

                      return {
                        atBuffer,
                        atBufferScheduled,
                        deliveredPending,
                        outsideByd,
                        total: atBuffer + atBufferScheduled + deliveredPending + outsideByd
                      };
                    };

                    // Define Expiration Light Ranges (mockup color codes)
                    const ranges = [
                      { label: 'Overdue', zh: '已超期', color: 'bg-[#EF4444]', filter: (d: number) => d < 0 },
                      { label: '1-5 days', zh: '1-5 天', color: 'bg-[#F43F5E]', filter: (d: number) => d >= 0 && d <= 5 },
                      { label: '6-10 days', zh: '6-10 天', color: 'bg-[#F97316]', filter: (d: number) => d >= 6 && d <= 10 },
                      { label: '11-15 days', zh: '11-15 天', color: 'bg-[#F59E0B]', filter: (d: number) => d >= 11 && d <= 15 },
                      { label: '16-20 days', zh: '16-20 天', color: 'bg-[#EAB308]', filter: (d: number) => d >= 16 && d <= 20 },
                      { label: '21-25 days', zh: '21-25 天', color: 'bg-[#Y9D308] bg-yellow-400', filter: (d: number) => d >= 21 && d <= 25 },
                      { label: '26-30 days', zh: '26-30 天', color: 'bg-[#34D399]', filter: (d: number) => d >= 26 && d <= 30 },
                      { label: '31-35 days', zh: '31-35 天', color: 'bg-[#10B981]', filter: (d: number) => d >= 31 && d <= 35 },
                      { label: '>35 days', zh: '>35 天', color: 'bg-[#14B8A6]', filter: (d: number) => d > 35 }
                    ];

                    // Process Expiration Light range values
                    const rangeMetrics = ranges.map(r => ({
                      ...r,
                      metrics: getRowMetrics(r.filter)
                    }));

                    const sumAtBuffer = rangeMetrics.reduce((sum, r) => sum + r.metrics.atBuffer, 0);
                    const sumAtBufferScheduled = rangeMetrics.reduce((sum, r) => sum + r.metrics.atBufferScheduled, 0);
                    const sumDeliveredPending = rangeMetrics.reduce((sum, r) => sum + r.metrics.deliveredPending, 0);
                    const sumOutsideByd = rangeMetrics.reduce((sum, r) => sum + r.metrics.outsideByd, 0);
                    const sumTotal = sumAtBuffer + sumAtBufferScheduled + sumDeliveredPending + sumOutsideByd;

                    // 2. Compute dynamic KPIs
                    const pendingCount = filteredContainersForDemurrage.length;
                    
                    const delCount = filteredContainersForDemurrage.filter(c => c.category === 'DELIVERED').length;
                    const notDelCount = pendingCount - delCount;

                    const overdueCount = filteredContainersForDemurrage.filter(c => {
                      const d = getDaysRemainingForContainer(c);
                      return d !== null && d < 0;
                    }).length;

                    const next15Count = filteredContainersForDemurrage.filter(c => {
                      const d = getDaysRemainingForContainer(c);
                      return d !== null && d >= 0 && d <= 15;
                    }).length;

                    const schedCount = filteredContainersForDemurrage.filter(c => c.programacao && c.programacao.trim() !== '').length;

                    // Buffer metrics - dynamically matching "Visão Geral" and "BYD Buffer"
                    const bufFull = yards.buffer && (yards.buffer.cheio > 0)
                      ? yards.buffer.cheio 
                      : filteredContainersForDemurrage.filter(c => c.yardId === 'buffer' && c.status === 'CHEIO').length;
                    
                    const bufEmpty = yards.buffer && (yards.buffer.vazio > 0)
                      ? yards.buffer.vazio 
                      : filteredContainersForDemurrage.filter(c => c.yardId === 'buffer' && c.status === 'VAZIO').length;
                    
                    const bufCount = bufFull + bufEmpty;

                    // Percentages calculated based on active uploaded (pending) containers
                    const pendingPct = "100.00";
                    const overduePct = pendingCount > 0 ? ((overdueCount / pendingCount) * 100).toFixed(2) : "0.00";
                    const next15Pct = pendingCount > 0 ? ((next15Count / pendingCount) * 100).toFixed(2) : "0.00";
                    const schedPct = pendingCount > 0 ? ((schedCount / pendingCount) * 100).toFixed(2) : "0.00";
                    const bufPct = pendingCount > 0 ? ((bufCount / pendingCount) * 100).toFixed(2) : "0.00";

                    // 3. Process BLs with expired or free time expiring within 5 days
                    const blsMap: Record<string, { bl: string, lote: string, count: number, minFreeTime: string, eta: string, warehouse: string, model: string }> = {};
                    filteredContainersForDemurrage.forEach(c => {
                      const d = getDaysRemainingForContainer(c);
                      if (d !== null && d <= 5) {
                        const blKey = c.bl || 'N/A';
                        const wName = yards[c.yardId]?.name || c.yardId || '-';
                        const mName = c.modelo || '-';
                        if (!blsMap[blKey]) {
                          blsMap[blKey] = {
                            bl: blKey,
                            lote: String(c.lote || '-'),
                            count: 0,
                            minFreeTime: c.freeTime || '-',
                            eta: c.eta || c.programacao || '-',
                            warehouse: wName,
                            model: mName
                          };
                        } else {
                          if (c.lote && !blsMap[blKey].lote.split(', ').includes(String(c.lote))) {
                            blsMap[blKey].lote = blsMap[blKey].lote === '-' ? String(c.lote) : `${blsMap[blKey].lote}, ${c.lote}`;
                          }
                          if (wName && !blsMap[blKey].warehouse.split(', ').includes(wName)) {
                            blsMap[blKey].warehouse = blsMap[blKey].warehouse === '-' ? wName : `${blsMap[blKey].warehouse}, ${wName}`;
                          }
                          if (mName && !blsMap[blKey].model.split(', ').includes(mName)) {
                            blsMap[blKey].model = blsMap[blKey].model === '-' ? mName : `${blsMap[blKey].model}, ${mName}`;
                          }
                        }
                        blsMap[blKey].count++;
                      }
                    });
                    const blsList = Object.values(blsMap);

                    // 4. Process component counts
                    const componentsMap: Record<string, number> = {};
                    filteredContainersForDemurrage.forEach(c => {
                      const compKey = c.componente || 'GERAL';
                      componentsMap[compKey] = (componentsMap[compKey] || 0) + 1;
                    });
                    const componentsList = Object.entries(componentsMap).map(([name, count]) => ({ name, count }));
                    componentsList.sort((a, b) => b.count - a.count);

                    return (
                      <>
                        {/* TOP CONTROLS AND INTERACTIVE FILTERS */}
                        <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-100 shadow-sm'} flex flex-col gap-4`}>
                          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                            <div className="flex items-center gap-3">
                              <div className="bg-red-100 dark:bg-red-950 p-2.5 rounded-xl text-red-600 dark:text-red-400">
                                <Clock className="w-6 h-6 animate-pulse" />
                              </div>
                              <div>
                                <h3 className="font-extrabold text-sm flex items-center gap-2 text-red-600 dark:text-red-400 tracking-tight">
                                  {language === 'bilingual' ? '1. General Overview - Demurrage Control / 集装箱滞期费超期监控大盘' : language === 'zh' ? '1. 集装箱滞期费超期监控大盘' : '1. General Overview - Demurrage Control'}
                                </h3>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                                  {language === 'zh' ? '管理保税堆场、仓库、比亚迪智能缓冲区中所有集装箱的免费期、超期滞留状态' : 'Gestão integrada de free time, tempo de estadia de contêineres e devolução rápida.'}
                                </p>
                              </div>
                            </div>

                            {/* Reference date picker */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs">
                              <span className="font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-[10px]">
                                {language === 'zh' ? '计算基准日 / Data de Referência:' : 'Data de Referência:'}
                              </span>
                              <input 
                                type="date"
                                value={demurrageRefDate}
                                onChange={(e) => setDemurrageRefDate(e.target.value)}
                                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg font-bold font-mono text-xs text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-red-500 cursor-pointer"
                              />
                              <button 
                                onClick={() => setDemurrageRefDate("2026-07-19")}
                                className="px-2 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30 text-[10px] font-extrabold rounded-md transition-all active:scale-95"
                                title="Restaurar data original (19/07/2026) / 恢复原始日期"
                              >
                                Reset
                              </button>
                            </div>
                          </div>

                          {/* FILTERS PANEL */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                            
                            {/* Filter 1: Delivered Status */}
                            <div className="flex flex-col gap-1">
                              <label className="text-[9.5px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest">
                                {language === 'zh' ? '交付状态 / Delivered Status' : 'Status de Entrega'}
                              </label>
                              <select
                                value={demurrageFilterDelivered}
                                onChange={(e) => setDemurrageFilterDelivered(e.target.value)}
                                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 text-xs font-bold rounded-lg outline-none cursor-pointer focus:ring-1 focus:ring-red-500 text-slate-800 dark:text-slate-100"
                              >
                                <option value="ALL">{language === 'zh' ? '全部 / Todos' : 'Todos os Status'}</option>
                                <option value="DELIVERED">{language === 'zh' ? '已收货待还箱 / Delivered' : 'Entregue (Pendente Devolução)'}</option>
                                <option value="NOT_DELIVERED">{language === 'zh' ? '未出货在港口/堆场 / Not Delivered' : 'Não Entregue (No Porto/Pátio)'}</option>
                              </select>
                            </div>

                            {/* Filter 2: Component */}
                            <div className="flex flex-col gap-1">
                              <label className="text-[9.5px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest">
                                {language === 'zh' ? '零部件类别 / Component' : 'Componente'}
                              </label>
                              <select
                                value={demurrageFilterComponent}
                                onChange={(e) => setDemurrageFilterComponent(e.target.value)}
                                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 text-xs font-bold rounded-lg outline-none cursor-pointer focus:ring-1 focus:ring-red-500 text-slate-800 dark:text-slate-100"
                              >
                                <option value="ALL">{language === 'zh' ? '全部零件 / Todos' : 'Todos'}</option>
                                {componentsListOptions.map(comp => (
                                  <option key={comp} value={comp}>{comp}</option>
                                ))}
                              </select>
                            </div>

                            {/* Filter 3: Carrier */}
                            <div className="flex flex-col gap-1">
                              <label className="text-[9.5px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest">
                                {language === 'zh' ? '运输公司 / Carrier' : 'Transportadora'}
                              </label>
                              <select
                                value={demurrageFilterCarrier}
                                onChange={(e) => setDemurrageFilterCarrier(e.target.value)}
                                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 text-xs font-bold rounded-lg outline-none cursor-pointer focus:ring-1 focus:ring-red-500 text-slate-800 dark:text-slate-100"
                              >
                                <option value="ALL">{language === 'zh' ? '全部运输公司 / Todos' : 'Todas'}</option>
                                {carrierListOptions.map(carrier => (
                                  <option key={carrier} value={carrier}>{carrier}</option>
                                ))}
                              </select>
                            </div>

                            {/* Filter 4: Vessel Name */}
                            <div className="flex flex-col gap-1">
                              <label className="text-[9.5px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest">
                                {language === 'zh' ? '船东或船舶 / Shipowner / Vessel' : 'Navio / Armador'}
                              </label>
                              <select
                                value={demurrageFilterVessel}
                                onChange={(e) => setDemurrageFilterVessel(e.target.value)}
                                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 text-xs font-bold rounded-lg outline-none cursor-pointer focus:ring-1 focus:ring-red-500 text-slate-800 dark:text-slate-100"
                              >
                                <option value="ALL">{language === 'zh' ? '全部船舶 / Todos' : 'Todos'}</option>
                                {vesselListOptions.map(vessel => (
                                  <option key={vessel} value={vessel}>{vessel}</option>
                                ))}
                              </select>
                            </div>

                            {/* Info panel */}
                            <div className="flex items-center justify-end h-full pt-4 pr-1">
                              <div className="text-right text-[10px] font-bold text-gray-400 dark:text-slate-500">
                                {language === 'zh' ? '当前过滤数:' : 'Filtrados:'}{' '}
                                <span className="font-mono text-xs font-black text-red-600 dark:text-red-400">
                                  {filteredContainersForDemurrage.length}
                                </span>{' '}
                                / {containers.length}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* EXECUTIVE METRICS DASHBOARD (Only uploaded active tracking metrics) */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                          
                          {/* CARD 1: Return Pending */}
                          <div className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-red-950/40' : 'bg-white border-red-150'} flex flex-col justify-between min-h-[105px]`}>
                            <div className="text-center">
                              <span className="text-[9px] text-red-600 dark:text-red-400 font-extrabold uppercase tracking-wider block">
                                {language === 'zh' ? '未还空待退 / Pending' : 'Return Pending'}
                              </span>
                              <div className="my-0.5">
                                <span className="text-2xl font-black font-mono tracking-tight text-red-600 dark:text-red-400">
                                  {pendingCount.toLocaleString()}
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-between gap-1 border-t border-dashed border-red-100 dark:border-rose-950/20 pt-1 text-[8px] font-black text-gray-500 dark:text-slate-400 leading-none">
                              <div className="flex flex-col items-center flex-1 border-r border-slate-100 dark:border-slate-800">
                                <span className="text-slate-700 dark:text-slate-300 font-bold">{delCount}</span>
                                <span className="scale-90 opacity-70">Delivered</span>
                              </div>
                              <div className="flex flex-col items-center flex-1">
                                <span className="text-slate-700 dark:text-slate-300 font-bold">{notDelCount}</span>
                                <span className="scale-90 opacity-70">Not Del.</span>
                              </div>
                            </div>
                          </div>

                          {/* CARD 2: Overdue */}
                          <div className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-red-950/40' : 'bg-white border-red-150'} flex flex-col justify-between text-center min-h-[105px]`}>
                            <span className="text-[9px] text-red-600 dark:text-red-400 font-extrabold uppercase tracking-wider block">
                              {language === 'zh' ? '超期箱量 / Overdue' : 'Overdue'}
                            </span>
                            <div className="my-1 flex items-center justify-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse"></span>
                              <span className="text-2xl font-black font-mono tracking-tight text-red-600 dark:text-red-400">
                                {overdueCount}
                              </span>
                            </div>
                            <span className="text-[9px] font-bold text-red-600 bg-red-50 dark:bg-red-950/20 py-0.5 rounded">
                              {overduePct}%
                            </span>
                          </div>

                          {/* CARD 3: Next 15 Days */}
                          <div className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-amber-950/40' : 'bg-white border-orange-150'} flex flex-col justify-between text-center min-h-[105px]`}>
                            <span className="text-[9px] text-amber-600 dark:text-amber-450 font-extrabold uppercase tracking-wider block">
                              {language === 'zh' ? '未来15天到期' : 'Next 15 Days'}
                            </span>
                            <div className="my-1">
                              <span className="text-2xl font-black font-mono tracking-tight text-amber-600 dark:text-amber-450">
                                {next15Count.toLocaleString()}
                              </span>
                            </div>
                            <span className="text-[9px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/20 py-0.5 rounded">
                              {next15Pct}%
                            </span>
                          </div>

                          {/* CARD 4: Scheduled */}
                          <div className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-150'} flex flex-col justify-between text-center min-h-[105px]`}>
                            <span className="text-[9px] text-slate-700 dark:text-slate-300 font-extrabold uppercase tracking-wider block">
                              {language === 'zh' ? '已排程交付 / Scheduled' : 'Scheduled Delivery'}
                            </span>
                            <div className="my-1">
                              <span className="text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                                {schedCount.toLocaleString()}
                              </span>
                            </div>
                            <span className="text-[9px] font-bold text-slate-500 bg-slate-50 dark:bg-slate-800 py-0.5 rounded">
                              {schedPct}%
                            </span>
                          </div>

                          {/* CARD 5: BYD Buffer */}
                          <div className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-sky-950' : 'bg-white border-sky-100'} flex flex-col justify-between min-h-[105px]`}>
                            <div className="text-center">
                              <span className="text-[9px] text-sky-600 dark:text-sky-450 font-extrabold uppercase tracking-wider block">
                                {language === 'zh' ? '缓冲区存箱 / Buffer' : 'BYD Buffer'}
                              </span>
                              <div className="my-0.5">
                                <span className="text-2xl font-black font-mono tracking-tight text-sky-600 dark:text-sky-400">
                                  {bufCount.toLocaleString()}
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-between gap-1 border-t border-dashed border-sky-100 dark:border-sky-950/20 pt-1 text-[8px] font-black text-sky-600 dark:text-sky-400 leading-none">
                              <div className="flex flex-col items-center flex-1 border-r border-slate-100 dark:border-slate-800">
                                <span className="font-bold">{bufFull}</span>
                                <span className="scale-90 opacity-70">Full</span>
                              </div>
                              <div className="flex flex-col items-center flex-1">
                                <span className="font-bold">{bufEmpty}</span>
                                <span className="scale-90 opacity-70">Empty</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* DOUBLE BLOCK: EXPIRATION LIGHT & CRITICAL LISTINGS */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                          
                          {/* LEFT PANEL: ENVELHECIMENTO FREE TIME (7 cols) */}
                          <div className={`col-span-1 lg:col-span-7 p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-150 shadow-xs'}`}>
                            <div className="flex justify-between items-center border-b pb-2 border-gray-150 dark:border-slate-800">
                              <h4 className="font-extrabold text-[11px] text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-red-600"></span>
                                {language === 'bilingual' ? 'Matriz Expiration Light / 免费期剩余天数精细管控灯' : 'Expiration Light'}
                              </h4>
                              <span className="text-[9px] text-red-600 font-black tracking-wider uppercase bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded">
                                aging control
                              </span>
                            </div>

                            <div className="overflow-x-auto mt-3">
                              <table className="w-full text-center border-collapse text-xs">
                                <thead>
                                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-black border-b border-gray-200 dark:border-slate-800">
                                    <th className="p-2 text-left pl-2 font-black">{language === 'zh' ? '范围 / Range' : 'Range'}</th>
                                    <th className="p-2 font-black text-center">{language === 'zh' ? '缓冲区 / At BYD Buffer' : 'At BYD Buffer'}</th>
                                    <th className="p-2 font-black text-center">{language === 'zh' ? '缓冲区已排程 / At BYD Buffer - Scheduled' : 'At BYD Buffer - Scheduled'}</th>
                                    <th className="p-2 font-black text-center">{language === 'zh' ? '已交付未还箱 / Delivered/No EIR' : 'Delivered (Pending Return)'}</th>
                                    <th className="p-2 font-black text-center">{language === 'zh' ? '在保税区/外部 / Outside BYD' : 'Outside BYD'}</th>
                                    <th className="p-2 font-black text-center text-slate-800 dark:text-slate-100">{language === 'zh' ? '共计' : 'Total'}</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-850 font-bold text-slate-700 dark:text-slate-300 font-mono">
                                  {rangeMetrics.map((r, idx) => {
                                    const isRowSelected = selectedDemurrageRange && selectedDemurrageRange.label === r.label;
                                    
                                    const getCellClasses = (colType: 'buffer' | 'buffer-scheduled' | 'delivered' | 'outside' | 'total', val: number) => {
                                      const isSelected = isRowSelected && selectedDemurrageRange.col === colType;
                                      let base = "p-2 text-center cursor-pointer transition-all border text-xs ";
                                      if (isSelected) {
                                        base += "bg-red-500/10 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-300 dark:border-red-900 font-black shadow-inner scale-[1.02] relative z-10";
                                      } else {
                                        base += "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-red-600 dark:hover:text-red-400";
                                        if (colType === 'delivered') {
                                          base += " text-red-650 dark:text-rose-400";
                                        } else if (colType === 'total') {
                                          base += " text-slate-900 dark:text-white font-black bg-slate-50/20 dark:bg-slate-800/5";
                                        }
                                      }
                                      return base;
                                    };

                                    const handleCellClick = (colType: 'buffer' | 'buffer-scheduled' | 'delivered' | 'outside' | 'total') => {
                                      if (selectedDemurrageRange && selectedDemurrageRange.label === r.label && selectedDemurrageRange.col === colType) {
                                        setSelectedDemurrageRange(null);
                                      } else {
                                        setSelectedDemurrageRange({ label: r.label, col: colType });
                                      }
                                    };

                                    return (
                                      <tr key={idx} className="hover:bg-slate-50/20 dark:hover:bg-slate-850/10 transition-all">
                                        <td 
                                          onClick={() => handleCellClick('total')}
                                          className={`p-2 text-left pl-2 flex items-center gap-1.5 font-sans font-extrabold text-[11px] cursor-pointer transition-all hover:bg-slate-100/50 dark:hover:bg-slate-800/40 ${isRowSelected && selectedDemurrageRange.col === 'total' ? 'text-red-600 dark:text-red-400 font-black bg-slate-100/30' : ''}`}
                                        >
                                          <span className={`h-2.5 w-2.5 rounded-full ${r.color} shrink-0`}></span>
                                          <span>{language === 'zh' ? r.zh : r.label}</span>
                                        </td>
                                        <td 
                                          onClick={() => handleCellClick('buffer')}
                                          className={getCellClasses('buffer', r.metrics.atBuffer)}
                                        >
                                          {r.metrics.atBuffer > 0 ? r.metrics.atBuffer : <span className="opacity-15">-</span>}
                                        </td>
                                        <td 
                                          onClick={() => handleCellClick('buffer-scheduled')}
                                          className={getCellClasses('buffer-scheduled', r.metrics.atBufferScheduled)}
                                        >
                                          {r.metrics.atBufferScheduled > 0 ? r.metrics.atBufferScheduled : <span className="opacity-15">-</span>}
                                        </td>
                                        <td 
                                          onClick={() => handleCellClick('delivered')}
                                          className={getCellClasses('delivered', r.metrics.deliveredPending)}
                                        >
                                          {r.metrics.deliveredPending > 0 ? r.metrics.deliveredPending : <span className="opacity-15">-</span>}
                                        </td>
                                        <td 
                                          onClick={() => handleCellClick('outside')}
                                          className={getCellClasses('outside', r.metrics.outsideByd)}
                                        >
                                          {r.metrics.outsideByd > 0 ? r.metrics.outsideByd : <span className="opacity-15">-</span>}
                                        </td>
                                        <td 
                                          onClick={() => handleCellClick('total')}
                                          className={getCellClasses('total', r.metrics.total)}
                                        >
                                          {r.metrics.total > 0 ? r.metrics.total : <span className="opacity-15">-</span>}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                  <tr className="bg-slate-100/60 dark:bg-slate-800/40 text-slate-900 dark:text-white font-black border-t border-slate-200 dark:border-slate-700">
                                    <td className="p-2 text-left pl-2 font-sans font-extrabold uppercase">{language === 'zh' ? '总计' : 'Total'}</td>
                                    <td className="p-2 text-center">{sumAtBuffer}</td>
                                    <td className="p-2 text-center">{sumAtBufferScheduled}</td>
                                    <td className="p-2 text-center text-red-600 dark:text-red-400 font-extrabold">{sumDeliveredPending}</td>
                                    <td className="p-2 text-center">{sumOutsideByd}</td>
                                    <td className="p-2 text-center text-red-600 dark:text-red-400 font-black text-xs">{sumTotal}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* RIGHT PANEL: CRITICAL BL LIST & COMPONENT CHART (5 cols) */}
                          <div className="col-span-1 lg:col-span-5 flex flex-col gap-4">
                            
                            {/* BL table */}
                            <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-150 shadow-xs'} flex-1`}>
                              <div className="flex justify-between items-center border-b pb-1.5 border-gray-150 dark:border-slate-800 mb-2">
                                <h5 className="font-extrabold text-[10.5px] text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                                  {language === 'bilingual' ? 'BLs Críticos (Free Time Expiring ≤ 5 dias) / 5天内到期紧急提单' : 'BLs Críticos'}
                                </h5>
                                <span className="text-[8px] bg-red-600 text-white font-black px-1.5 py-0.2 rounded font-mono">
                                  {blsList.length}
                                </span>
                              </div>

                              <div className="overflow-y-auto max-h-[175px]">
                                <table className="w-full text-[10px] border-collapse font-sans">
                                  <thead>
                                    <tr className="bg-red-700 text-white uppercase text-[8px] tracking-wider font-black">
                                      <th className="p-1.5 text-left pl-2">BL</th>
                                      <th className="p-1.5 text-center">Lot/Batch</th>
                                      <th className="p-1.5 text-center">Warehouse</th>
                                      <th className="p-1.5 text-center">Free Time</th>
                                      <th className="p-1.5 text-center">Model</th>
                                      <th className="p-1.5 text-right pr-2">CNTR</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 dark:divide-slate-850 font-bold text-slate-700 dark:text-slate-300 font-mono text-[9.5px]">
                                    {blsList.slice(0, 12).map((item, i) => (
                                      <tr key={i} className="hover:bg-red-50/20 dark:hover:bg-red-950/10 transition-all">
                                        <td className="p-1.5 text-left pl-2 font-black text-slate-900 dark:text-white truncate max-w-[85px]" title={item.bl}>
                                          {item.bl}
                                        </td>
                                        <td className="p-1.5 text-center text-gray-500 dark:text-gray-400 truncate max-w-[80px]" title={item.lote}>
                                          {item.lote}
                                        </td>
                                        <td className="p-1.5 text-center text-blue-600 dark:text-blue-450 font-extrabold truncate max-w-[100px]" title={item.warehouse}>
                                          {item.warehouse}
                                        </td>
                                        <td className="p-1.5 text-center text-amber-600 dark:text-amber-400 font-black">
                                          {item.minFreeTime}
                                        </td>
                                        <td className="p-1.5 text-center text-emerald-600 dark:text-emerald-400 font-extrabold truncate max-w-[90px]" title={item.model}>
                                          {item.model}
                                        </td>
                                        <td className="p-1.5 text-right pr-2 text-red-600 dark:text-red-400 font-black">
                                          {item.count}
                                        </td>
                                      </tr>
                                    ))}
                                    {blsList.length === 0 && (
                                      <tr>
                                        <td colSpan={6} className="p-4 text-center text-gray-400 font-bold font-sans">
                                          {language === 'zh' ? '暂无临近到期或超期提单' : 'Nenhum BL crítico encontrado para os filtros ativos.'}
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Component Chart */}
                            <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-150 shadow-xs'}`}>
                              <h5 className="font-extrabold text-[10.5px] text-slate-800 dark:text-slate-100 uppercase tracking-tight border-b pb-1.5 border-gray-150 dark:border-slate-800 mb-2">
                                {language === 'bilingual' ? 'Distribuição de Pendentes por Componente / 待交付集装箱分类占比' : 'Pendentes por Componente'}
                              </h5>

                              <div className="relative h-[110px] w-full flex items-end">
                                {componentsList.length > 0 ? (
                                  <div className="flex justify-around items-end w-full h-[95px] font-mono text-[8.5px] font-bold">
                                    {componentsList.slice(0, 5).map((comp, idx) => {
                                      const maxCount = Math.max(...componentsList.map(c => c.count), 1);
                                      const heightPercent = (comp.count / maxCount) * 65; // ensure it fits safely
                                      return (
                                        <div key={idx} className="flex flex-col items-center gap-1 w-1/5 group">
                                          <span className="text-slate-900 dark:text-white font-black scale-90">
                                            {comp.count}
                                          </span>
                                          <div 
                                            style={{ height: `${heightPercent}px` }}
                                            className="w-8 bg-[#10B981] hover:bg-emerald-600 dark:bg-emerald-650 rounded-t transition-all cursor-pointer shadow-xs"
                                            title={`${comp.name}: ${comp.count}`}
                                          />
                                          <span className="text-gray-400 dark:text-gray-500 font-sans font-black truncate max-w-[45px] text-center" title={comp.name}>
                                            {comp.name}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="text-center w-full text-gray-400 font-bold py-4">
                                    {language === 'zh' ? '暂无零件分布数据' : 'Sem dados para o gráfico de componentes.'}
                                  </div>
                                )}
                              </div>
                            </div>

                          </div>

                        </div>

                        {/* DETAILED MATCHING CONTAINERS SECTION (Interactive based on clicked Expiration Light range/cell) */}
                        {selectedDemurrageRange && (() => {
                          const matchingContainers = getMatchingContainersForSelectedRange();
                          const r = ranges.find(x => x.label === selectedDemurrageRange.label);
                          
                          // Column translation for header
                          const colLabel = selectedDemurrageRange.col === 'buffer' ? (language === 'zh' ? '在缓冲区 / At BYD Buffer' : 'At BYD Buffer')
                            : selectedDemurrageRange.col === 'buffer-scheduled' ? (language === 'zh' ? '缓冲区已排程 / At BYD Buffer - Scheduled' : 'At BYD Buffer - Scheduled')
                            : selectedDemurrageRange.col === 'delivered' ? (language === 'zh' ? '已交付未还箱 / Delivered (Pending Return)' : 'Delivered (Pending Return)')
                            : selectedDemurrageRange.col === 'outside' ? (language === 'zh' ? '在保税区/外部 / Outside BYD' : 'Outside BYD')
                            : (language === 'zh' ? '全部 / Total' : 'Total');

                          const rangeLabel = r ? (language === 'zh' ? r.zh : r.label) : selectedDemurrageRange.label;

                          return (
                            <div className={`p-4 rounded-xl border mt-4 transition-all ${theme === 'dark' ? 'bg-[#1e293b]/95 border-red-900/40 text-white' : 'bg-red-50/20 border-red-250/60 shadow-xs'}`}>
                              <div className="flex justify-between items-center border-b pb-2.5 border-red-150/40 dark:border-slate-800 mb-3">
                                <div>
                                  <h4 className="font-extrabold text-xs text-red-700 dark:text-red-400 uppercase tracking-widest flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-red-600 animate-ping shrink-0"></span>
                                    {language === 'bilingual' 
                                      ? `Contêineres Filtrados: ${rangeLabel} (${colLabel}) / 筛选出的集装箱` 
                                      : `Contêineres Filtrados: ${rangeLabel} (${colLabel})`}
                                  </h4>
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold mt-0.5">
                                    {language === 'zh' 
                                      ? `共 ${matchingContainers.length} 个匹配的集装箱。在这里，您可以直接更新“计划提货时间 (Programação)”和“运输公司 (Carrier)”，数据将自动同步更新，以协助及时归还空箱，避免产生超期滞期费。`
                                      : `Mostrando ${matchingContainers.length} contêiner(es). Agende a retirada e devolução preenchendo as colunas abaixo para mitigar custos de demurrage.`}
                                  </p>
                                </div>
                                <button
                                  onClick={() => setSelectedDemurrageRange(null)}
                                  className="px-2.5 py-1 bg-red-100 hover:bg-red-200 dark:bg-red-950/40 dark:hover:bg-red-900/40 text-red-700 dark:text-red-400 font-extrabold text-[10px] rounded-md transition-all active:scale-95 border border-red-200 dark:border-red-900/30 cursor-pointer"
                                >
                                  {language === 'zh' ? '清除筛选 ✕' : 'Fechar Detalhes ✕'}
                                </button>
                              </div>

                              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                                <table className="w-full text-[11px] text-left border-collapse">
                                  <thead>
                                    <tr className="bg-slate-100 dark:bg-slate-800 text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-black border-b border-gray-200 dark:border-slate-700">
                                      <th className="p-2 pl-3">ID Container</th>
                                      <th className="p-2">Batch / Lote</th>
                                      <th className="p-2">Yard / Pátio</th>
                                      <th className="p-2">Vessel / Navio</th>
                                      <th className="p-2 text-center">ETA</th>
                                      <th className="p-2 text-center">Free Time</th>
                                      <th className="p-2 text-center">Dias Restantes</th>
                                      <th className="p-2 text-center">Status / Devolução</th>
                                      <th className="p-2 min-w-[130px] font-black text-red-700 dark:text-red-400 bg-red-100/40 dark:bg-red-950/20">📅 Programação (Agendamento)</th>
                                      <th className="p-2 min-w-[130px] font-black text-slate-700 dark:text-slate-300">🚛 Transportadora (Carrier)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-150/40 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                                    {matchingContainers.map((c, i) => {
                                      const days = getDaysRemainingForContainer(c);
                                      const isOverdue = days !== null && days < 0;
                                      const isUrgent = days !== null && days >= 0 && days <= 5;
                                      
                                      const daysBadgeColor = isOverdue ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-450'
                                        : isUrgent ? 'bg-rose-105 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400'
                                        : 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400';

                                      return (
                                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all font-mono">
                                          <td className="p-2 pl-3 font-bold text-slate-900 dark:text-white select-all">{c.id}</td>
                                          <td className="p-2 font-sans font-bold">{c.lote || '-'}</td>
                                          <td className="p-2 font-sans font-extrabold text-blue-600 dark:text-blue-400">{yards[c.yardId]?.name || c.yardId}</td>
                                          <td className="p-2 font-sans truncate max-w-[120px]" title={c.vesselName}>{c.vesselName}</td>
                                          <td className="p-2 text-center font-sans">{c.eta || '-'}</td>
                                          <td className="p-2 text-center text-amber-600 dark:text-amber-450 font-bold">{c.freeTime || '-'}</td>
                                          <td className="p-2 text-center">
                                            {days !== null ? (
                                              <span className={`px-2 py-0.5 border text-[10px] font-extrabold rounded-md ${daysBadgeColor}`}>
                                                {days < 0 ? `${days} d (Atrasado)` : `${days} d`}
                                              </span>
                                            ) : (
                                              <span className="text-gray-400">-</span>
                                            )}
                                          </td>
                                          <td className="p-2 text-center font-sans">
                                            {c.category === 'DELIVERED' ? (
                                              <span className="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 text-[9px] font-black rounded uppercase">
                                                DELIVERED
                                              </span>
                                            ) : (
                                              <span className="px-1.5 py-0.5 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200/50 text-[9px] font-black rounded uppercase">
                                                PENDING
                                              </span>
                                            )}
                                          </td>
                                          {/* AGENDAMENTO FIELD */}
                                          <td className="p-2 bg-red-100/10 dark:bg-red-950/5">
                                            <input
                                              type="text"
                                              placeholder="Ex: 25/07/2026"
                                              value={c.programacao || ''}
                                              onChange={(e) => handleUpdateContainerField(c.id, 'programacao', e.target.value)}
                                              className="w-full bg-white dark:bg-slate-800 p-1.5 border border-red-250 dark:border-red-900/50 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-md font-sans text-xs font-bold text-slate-800 dark:text-slate-100 text-center outline-none"
                                            />
                                          </td>
                                          {/* TRANSPORTADORA FIELD */}
                                          <td className="p-2">
                                            <input
                                              type="text"
                                              placeholder="Ex: JSL"
                                              value={c.transportadora || ''}
                                              onChange={(e) => handleUpdateContainerField(c.id, 'transportadora', e.target.value)}
                                              className="w-full bg-white dark:bg-slate-800 p-1.5 border border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-md font-sans text-xs font-bold text-slate-800 dark:text-slate-100 text-center outline-none"
                                            />
                                          </td>
                                        </tr>
                                      );
                                    })}
                                    {matchingContainers.length === 0 && (
                                      <tr>
                                        <td colSpan={10} className="p-8 text-center text-gray-400 dark:text-gray-500 font-extrabold font-sans">
                                          {language === 'zh' ? '没有在此分类下找到匹配的集装箱' : 'Nenhum contêiner correspondente encontrado para este filtro.'}
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })()}

                      </>
                    );
                  })()}
                </div>
              ) : currentSlide === 5 ? (
                /* SLIDE 6: DEPOT CONTROL & ALLOCATION */
                <div id="slide-dashboard-grid-depots" className={`flex flex-col justify-between ${widescreenMode ? 'h-[calc(100%-85px)] overflow-hidden' : 'min-h-[660px] gap-4'}`}>
                  
                  {/* TOP CONTROL HUB FOR DEPOT ALLOCATION */}
                  <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-100 shadow-sm'} flex flex-col md:flex-row justify-between items-start md:items-center gap-3`}>
                    <div className="flex items-center gap-3">
                      <div className="bg-red-100 dark:bg-red-950 p-2.5 rounded-xl text-red-600 dark:text-red-400">
                        <FileSpreadsheet className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm flex items-center gap-2 text-red-600 dark:text-red-400 tracking-tight">
                          {language === 'bilingual' ? 'DEPOT CONTROL & ALLOCATION / 协议堆存与港口流向动态调配' : language === 'zh' ? '协议堆存与港口流向动态调配' : 'DEPOT CONTROL & ALLOCATION'}
                        </h3>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                          {language === 'zh' ? '每日流量平均监控、最大动态容量配额、与船东合作状态交叉管理矩阵' : 'Controle dinâmico de limites diários, capacidade sob contrato e compatibilidade de armadores.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-red-600 text-white font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">
                        {language === 'zh' ? '高级物流架构板' : 'Senior Logistics Panel'}
                      </span>
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold px-2 py-0.5 rounded border border-slate-200 dark:border-slate-750">
                        UTC-3 LIVE
                      </span>
                    </div>
                  </div>

                  {/* HIGH-LEVEL INTEGRATED LOGISTICS KPIs */}
                  {(() => {
                    const totalAvg = depots.reduce((sum, d) => sum + d.avgVolume, 0);
                    const totalCap = depots.reduce((sum, d) => sum + d.maxCapacity, 0);
                    const openGates = depots.filter(d => d.status === 'Open').length;
                    const criticalCount = depots.filter(d => {
                      const util = d.maxCapacity > 0 ? (d.avgVolume / d.maxCapacity) * 100 : 0;
                      return d.isAlert || util > 95;
                    }).length;
                    
                    const totalRemainingSlots = depots.reduce((sum, d) => {
                      if (d.status === 'Closed') return sum;
                      const remaining = d.maxCapacity - d.avgVolume;
                      return sum + (remaining > 0 ? remaining : 0);
                    }, 0);

                    return (
                      <div className="grid grid-cols-4 gap-3">
                        <div className={`p-3.5 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-150 shadow-xs'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">{language === 'zh' ? '日常平均总吞吐量' : 'VOLUME DIÁRIO TOTAL (AVG)'}</span>
                            <span className="text-gray-400 font-mono text-xs font-bold">AVG baseline</span>
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-black font-mono tracking-tight text-slate-800 dark:text-slate-100">{totalAvg}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">FEU/Dia</span>
                          </div>
                        </div>

                        <div className={`p-3.5 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-150 shadow-xs'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">{language === 'zh' ? '空余可用仓位数' : 'VAGAS DIÁRIAS DISPONÍVEIS'}</span>
                            <span className="text-emerald-500 font-bold text-[10px] px-1 py-0.1 bg-emerald-50 dark:bg-emerald-950/20 rounded">Slots Livres</span>
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">{totalRemainingSlots}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">FEU Slots</span>
                          </div>
                        </div>

                        <div className={`p-3.5 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-150 shadow-xs'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">{language === 'zh' ? '通道开启比例' : 'SITUAÇÃO DE PORTÕES'}</span>
                            <span className="text-blue-500 font-bold text-[10px] px-1 py-0.1 bg-blue-50 dark:bg-blue-950/20 rounded">Gates Status</span>
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-black font-mono tracking-tight text-slate-800 dark:text-slate-100">{openGates} <span className="text-xs text-gray-400 font-bold">/ {depots.length}</span></span>
                            <span className="text-xs text-emerald-600 dark:text-emerald-450 font-extrabold">{language === 'zh' ? '正常运营中' : 'Ativos'}</span>
                          </div>
                        </div>

                        <div className={`p-3.5 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-150 shadow-xs'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">{language === 'zh' ? '高危受限/满载站点' : 'PONTOS CRÍTICOS / ALERTA'}</span>
                            <span className="text-red-500 font-bold text-[10px] px-1 py-0.1 bg-red-50 dark:bg-red-950/20 rounded">Alert Count</span>
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-black font-mono tracking-tight text-red-600 dark:text-red-400">{criticalCount}</span>
                            <span className="text-xs text-red-500 dark:text-red-400 font-bold uppercase">{language === 'zh' ? '严重红色限制' : 'Gargalos'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* BOTTOM WORKSPACE WORKGRID */}
                  <div className="grid grid-cols-12 gap-4 flex-1">
                    
                    {/* LEFT WORKSPACE: MAIN DEPOT CAPACITY CONTROL TABLE */}
                    <div className={`col-span-7 p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-150 shadow-sm'} flex flex-col justify-between`}>
                      <div className="space-y-3 flex-1">
                        <div className="flex justify-between items-center border-b pb-2 border-gray-100 dark:border-slate-800">
                          <div className="flex items-center gap-1.5">
                            <Sliders className="w-4 h-4 text-slate-500" />
                            <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                              {language === 'bilingual' ? 'CONTROLE DE CAPACIDADE DE DEPÓSITOS / 协议堆存容量监控大盘' : language === 'zh' ? '协议堆存容量监控大盘' : 'CONTROLE DE CAPACIDADE DE DEPÓSITOS'}
                            </h4>
                          </div>
                          <span className="text-[9px] text-gray-400 font-mono font-bold">100% FORMULA ENGINE</span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-800/60 text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-black border-b border-gray-200 dark:border-slate-800">
                                <th className="p-2 pl-2.5">{language === 'zh' ? '堆存点名称' : 'DEPÓSITO'}</th>
                                <th className="p-2 text-center">{language === 'zh' ? '日均平均量' : 'AVG DIÁRIO'}</th>
                                <th className="p-2 text-center">{language === 'zh' ? '最大动态限制' : 'CAP. MÁXIMA'}</th>
                                <th className="p-2 text-center">{language === 'zh' ? '当前占用率' : 'OCUPAÇÃO %'}</th>
                                <th className="p-2 text-center">{language === 'zh' ? '剩余库位' : 'SLOTS DISP.'}</th>
                                <th className="p-2 text-center">{language === 'zh' ? '通道 portão' : 'PORTÃO'}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-bold text-slate-850 dark:text-slate-200">
                              {depots.map((depot) => {
                                const utilPercent = depot.maxCapacity > 0 ? Math.round((depot.avgVolume / depot.maxCapacity) * 100) : 0;
                                const remaining = depot.maxCapacity - depot.avgVolume;
                                
                                // COLOR CALCULATION: Green < 75%, Yellow 75-95%, Red > 95%
                                let utilBg = 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-450';
                                let utilBorder = 'border-emerald-200 dark:border-emerald-900/30';
                                if (utilPercent > 95) {
                                  utilBg = 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-450';
                                  utilBorder = 'border-red-200 dark:border-red-900/30';
                                } else if (utilPercent >= 75) {
                                  utilBg = 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-450';
                                  utilBorder = 'border-amber-200 dark:border-amber-900/30';
                                }

                                // HIGH ALERT STYLING (For VBR and AREA 23 - TECON)
                                const isSpecialAlert = depot.isAlert;

                                return (
                                  <tr 
                                    key={depot.id} 
                                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all ${
                                      isSpecialAlert 
                                        ? 'bg-rose-50/30 dark:bg-red-950/5 border-l-4 border-l-rose-500' 
                                        : ''
                                    }`}
                                  >
                                    <td className="p-2.5 pl-2.5 font-sans">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-extrabold tracking-tight text-[11px]">{depot.name}</span>
                                        {isSpecialAlert && (
                                          <span className="text-[7.5px] font-black text-rose-600 bg-rose-100 dark:text-rose-450 dark:bg-rose-950/35 px-1 rounded uppercase tracking-wider animate-pulse flex items-center gap-0.5">
                                            <AlertTriangle className="w-2 h-2" /> Alert
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="p-2 text-center font-mono text-gray-500 dark:text-slate-400 font-bold">{depot.avgVolume} FEU</td>
                                    <td className="p-2 text-center font-mono text-slate-800 dark:text-slate-100">
                                      {depot.maxCapacity} FEU
                                    </td>
                                    <td className="p-2 text-center font-mono">
                                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${utilBg} ${utilBorder}`}>
                                        {utilPercent}%
                                      </span>
                                    </td>
                                    <td className="p-2 text-center font-mono">
                                      {remaining <= 0 ? (
                                        <span className="text-[9px] font-black text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-950/40 px-1.5 py-0.5 rounded">
                                          LOTAÇÃO / FULL
                                        </span>
                                      ) : (
                                        <span className={`font-bold ${remaining < 5 ? 'text-amber-600' : 'text-slate-700 dark:text-slate-200'}`}>
                                          {remaining} FEU
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-2 text-center">
                                      <span className={`text-[9.5px] px-2 py-0.5 rounded font-black border uppercase tracking-wider ${
                                        depot.status === 'Open'
                                          ? 'bg-emerald-100/10 border-emerald-300 text-emerald-600 dark:text-emerald-400'
                                          : 'bg-red-100/10 border-red-300 text-red-600 dark:text-red-400'
                                      }`}>
                                        {depot.status === 'Open' ? 'Open' : 'Closed'}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-dashed border-gray-100 dark:border-slate-800 text-[10px] text-gray-400 font-bold flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>{language === 'zh' ? '💡 系统逻辑：绿仓表示空闲度高，黄仓为警戒装载，红仓（利用率超过95%）限制流入，VBR / AREA 23 在任何状态下均触发黄色警戒警告。' : '💡 Legenda do Motor de Regras: Utilização <75% Verde (Liberado), 75-95% Amarelo (Atenção), >95% Vermelho (Gargalo - Bloqueio de novos volumes).'}</span>
                      </div>
                    </div>

                    {/* RIGHT WORKSPACE: DYNAMIC INTERACTIVE SHIPOWNER COMPATIBILITY MATRIX */}
                    <div className={`col-span-5 p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-150 shadow-sm'} flex flex-col justify-between`}>
                      <div className="space-y-3 flex-1">
                        <div className="flex justify-between items-center border-b pb-2 border-gray-100 dark:border-slate-800">
                          <div className="flex items-center gap-1.5">
                            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                            <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                              {language === 'bilingual' ? 'MATRIZ DE COMPATIBILIDADE DE ARMADORES / 船东协议符合矩阵' : language === 'zh' ? '船东协议符合矩阵' : 'MATRIZ DE ARMADORES'}
                            </h4>
                          </div>
                          <span className="text-[9px] text-emerald-600 font-black animate-pulse bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.2 rounded">Interactive</span>
                        </div>

                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                          {language === 'zh' ? '💡 点击矩阵中的任何状态可以直接循环切换：Authorized (授权) ➜ Blocked (锁定) ➜ Contract Only (特许合同)。' : '💡 Clique diretamente sobre qualquer status na matriz para alternar: Liberado (✅ Auth) ➜ Bloqueado (❌ Block) ➜ Contrato (📝 Contract).'}
                        </p>

                        <div className="overflow-x-auto mt-2">
                          <table className="w-full text-center border-collapse text-[10.5px]">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-800/60 text-[8.5px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-black border-b border-gray-200 dark:border-slate-800">
                                <th className="p-1.5 text-left pl-2 font-black">{language === 'zh' ? '堆存点' : 'DEPÓSITO'}</th>
                                {['MSC', 'Maersk', 'CMA CGM', 'Hapag-Lloyd', 'ONE', 'COSCO', 'Evergreen'].map(armador => (
                                  <th key={armador} className="p-1.5 font-black text-center text-slate-750 dark:text-gray-300">{armador}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-850 font-bold text-slate-800 dark:text-slate-200">
                              {Object.keys(depotMatrix).map((depotName) => (
                                <tr key={depotName} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                                  <td className="p-1.5 text-left pl-2 font-extrabold text-[10px] text-slate-750 dark:text-gray-300">{depotName}</td>
                                  {['MSC', 'Maersk', 'CMA CGM', 'Hapag-Lloyd', 'ONE', 'COSCO', 'Evergreen'].map((armador) => {
                                    const value = depotMatrix[depotName]?.[armador] || 'Authorized';
                                    
                                    // Visual color states
                                    let cellStyle = 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/45 dark:text-emerald-400';
                                    let cellText = 'AUTH';
                                    if (value === 'Blocked') {
                                      cellStyle = 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-900/45 dark:text-red-400';
                                      cellText = 'LOCK';
                                    } else if (value === 'Contract Only') {
                                      cellStyle = 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900/45 dark:text-amber-400';
                                      cellText = 'CONT';
                                    }

                                    return (
                                      <td key={armador} className="p-1 text-center">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            // Click interaction to toggle through Authorized -> Blocked -> Contract Only
                                            const states: ('Authorized' | 'Blocked' | 'Contract Only')[] = ['Authorized', 'Blocked', 'Contract Only'];
                                            const currentIndex = states.indexOf(value);
                                            const nextState = states[(currentIndex + 1) % states.length];
                                            setDepotMatrix(prev => ({
                                              ...prev,
                                              [depotName]: {
                                                ...(prev[depotName] || {}),
                                                [armador]: nextState
                                              }
                                            }));
                                          }}
                                          className={`px-1 py-0.5 text-[8.5px] font-extrabold rounded-md border tracking-tighter cursor-pointer select-none transition-all active:scale-95 ${cellStyle}`}
                                          title={`${armador} @ ${depotName}: Clique para alterar status / 点击切换状态`}
                                        >
                                          {cellText}
                                        </button>
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-dashed border-gray-100 dark:border-slate-800 text-[10px] text-gray-400 font-bold flex items-center justify-between">
                        <span>{language === 'zh' ? '💡 契约限制：VBR及TEON 23 默认锁定大多数直接放行，仅接受特定预约。' : '💡 AUTH: Liberado | LOCK: Bloqueado | CONT: Requer Contrato.'}</span>
                        <span className="text-[8px] bg-emerald-500/10 text-emerald-600 px-1 rounded uppercase tracking-widest font-black">Excel Friendly</span>
                      </div>
                    </div>

                  </div>

                </div>
              ) : currentSlide === 7 ? (
                /* SLIDE 7: MÓDULO DE GESTÃO LOGÍSTICA CRUDS */
                <div id="slide-logistics-cruds" className={`flex flex-col justify-between ${widescreenMode ? 'h-[calc(100%-85px)] overflow-hidden' : 'min-h-[660px] gap-4'}`}>
                  
                  {/* TOP CONTROL HUB FOR LOGISTICS */}
                  <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-100 shadow-sm'} flex flex-col md:flex-row justify-between items-start md:items-center gap-3`}>
                    <div className="flex items-center gap-3">
                      <div className="bg-red-100 dark:bg-red-950 p-2.5 rounded-xl text-red-600 dark:text-red-400">
                        <Package className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm flex items-center gap-2 text-red-600 dark:text-red-400 tracking-tight">
                          {language === 'bilingual' ? 'LOGISTICS MANAGEMENT MODULE / 比亚迪外贸进出口单证及集成物流控制' : language === 'zh' ? '比亚迪外贸进出口单证及集成物流控制' : 'LOGISTICS MANAGEMENT'}
                        </h3>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                          {language === 'zh' ? '在此大盘管理您的全部物流集装箱数据、进行增删改查操作，并连接在线表格进行实时刷新' : 'Módulo CRUD central de equipamentos, BLs, ordem de compra SAP e importador automático.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setSheetsModalOpen(true)} 
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 uppercase tracking-wider"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" /> {language === 'zh' ? 'Google Sheets 同步' : 'Google Sheets Sync'}
                      </button>
                      <button 
                        onClick={handleClearAllLogisticsData} 
                        className="px-4 py-1.5 bg-gradient-to-r from-red-50 to-rose-100 hover:from-rose-100 hover:to-rose-200 text-rose-700 border border-rose-300 dark:from-red-950/40 dark:to-rose-900/20 dark:border-rose-900/60 dark:text-rose-350 font-extrabold text-[10px] rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 uppercase tracking-wider hover:shadow-md hover:shadow-rose-100/30 dark:hover:shadow-none"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> {language === 'zh' ? '清空全部数据' : 'Zerar Tudo'}
                      </button>
                    </div>
                  </div>

                  {/* SPLIT WORKSPACE GRID */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 overflow-hidden mt-1">
                    
                    {/* LEFT WORKSPACE: LINK WAREHOUSE CONTAINERS */}
                    <div className={`lg:col-span-4 p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-150 shadow-sm'} flex flex-col justify-between overflow-y-auto`}>
                      <form onSubmit={handleSaveYdContainerLogistics} className="space-y-3">
                        <div className="flex flex-col gap-2 border-b pb-2 border-gray-150/40 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-red-500 shrink-0" />
                            <h4 className="font-extrabold text-[12px] text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                              {language === 'zh' ? '绑定仓库集装箱 (保税/非保税)' : 'Vincular Container do Pátio'}
                            </h4>
                          </div>
                          <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                            <button
                              type="button"
                              onClick={() => {
                                setYdScheduleMode('container');
                                handleYdContainerChange("");
                              }}
                              className={`py-1 text-[9px] font-black uppercase rounded-md transition-all ${
                                ydScheduleMode === 'container'
                                  ? 'bg-red-650 text-white shadow-xs'
                                  : 'text-gray-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-slate-200'
                              }`}
                            >
                              {language === 'zh' ? '按集装箱排程' : 'Por Container'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setYdScheduleMode('bl');
                                handleYdBlChange("");
                              }}
                              className={`py-1 text-[9px] font-black uppercase rounded-md transition-all ${
                                ydScheduleMode === 'bl'
                                  ? 'bg-red-650 text-white shadow-xs'
                                  : 'text-gray-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-slate-200'
                              }`}
                            >
                              {language === 'zh' ? '按整单 BL 排程' : 'Por BL Inteiro'}
                            </button>
                          </div>
                        </div>

                        <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-normal font-medium">
                          {language === 'zh' 
                            ? '从保税堆场（TECON、INTERMARITIMA等）或一般仓库中选择已上传的集装箱或整单 HBL (BL) 进行交付排程。' 
                            : 'Selecione um contêiner ou um BL completo carregado nos pátios para criar uma programação de entrega.'}
                        </p>

                        <div className="space-y-2.5 text-xs">
                          {/* Container or BL Select */}
                          <div>
                            <label className="block text-[10px] font-black uppercase text-gray-500 dark:text-gray-450 mb-1">
                              {ydScheduleMode === 'container'
                                ? (language === 'zh' ? '选择仓库集装箱 *' : 'Selecionar Equipamento do Pátio *')
                                : (language === 'zh' ? '选择整单 HBL (BL) *' : 'Selecionar BL do Pátio *')
                              }
                            </label>
                            {ydScheduleMode === 'container' ? (
                              <select 
                                value={selectedYdContainerId} 
                                onChange={(e) => handleYdContainerChange(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-2 rounded-lg font-mono font-bold text-xs text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-red-500"
                              >
                                <option value="">-- {language === 'zh' ? '请选择集装箱' : 'Selecione o Container'} --</option>
                                {containers.map(c => {
                                  const yardName = yards[c.yardId]?.name || c.yardId;
                                  const isScheduled = logisticsEntries.some(le => le.cntrsOriginal === c.id);
                                  return (
                                    <option key={c.id} value={c.id}>
                                      {c.id} - {yardName} ({c.status}) {isScheduled ? '• [Scheduled]' : ''}
                                    </option>
                                  );
                                })}
                              </select>
                            ) : (
                              <select 
                                value={selectedYdBl} 
                                onChange={(e) => handleYdBlChange(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-2 rounded-lg font-mono font-bold text-xs text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-red-500"
                              >
                                <option value="">-- {language === 'zh' ? '请选择 HBL (BL)' : 'Selecione o BL'} --</option>
                                {Array.from(new Set(containers.map(c => c.bl).filter(Boolean))).map(blVal => {
                                  const cntrsCount = containers.filter(c => c.bl === blVal).length;
                                  const yardNames = Array.from(new Set(containers.filter(c => c.bl === blVal).map(c => yards[c.yardId]?.name || c.yardId || ""))).filter(Boolean);
                                  return (
                                    <option key={blVal} value={blVal}>
                                      {blVal} ({cntrsCount} cntrs) - {yardNames.join(", ")}
                                    </option>
                                  );
                                })}
                              </select>
                            )}
                          </div>

                          {/* Grid for Quick Auto-fills */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] font-black uppercase text-gray-400 mb-0.5">HBL (BL)</label>
                              <input 
                                type="text"
                                value={ydBl}
                                onChange={(e) => setYdBl(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-1.5 rounded-md font-sans text-[11px] text-slate-800 dark:text-white font-bold outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-black uppercase text-gray-400 mb-0.5">Navio (Vessel)</label>
                              <input 
                                type="text"
                                value={ydVessel}
                                onChange={(e) => setYdVessel(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-1.5 rounded-md font-sans text-[11px] text-slate-800 dark:text-white font-bold outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] font-black uppercase text-gray-400 mb-0.5">Batch / Lote</label>
                              <input 
                                type="text"
                                value={ydBatch}
                                onChange={(e) => setYdBatch(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-1.5 rounded-md font-sans text-[11px] text-slate-800 dark:text-white font-bold outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-black uppercase text-gray-400 mb-0.5">Pátio Origem</label>
                              <input 
                                type="text"
                                value={ydWarehouse}
                                disabled
                                className="w-full bg-slate-100 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-1.5 rounded-md font-sans text-[11px] text-gray-500 font-bold outline-none cursor-not-allowed"
                              />
                            </div>
                          </div>

                          {/* Delivery Schedule Inputs */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] font-black uppercase text-red-500 mb-0.5">📅 Data CD Planta *</label>
                              <input 
                                type="text"
                                value={ydDeliveryDate}
                                onChange={(e) => setYdDeliveryDate(e.target.value)}
                                placeholder="YYYY-MM-DD"
                                className="w-full bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900 p-1.5 rounded-md font-mono text-[11px] text-slate-800 dark:text-white font-bold outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-black uppercase text-gray-400 mb-0.5">Status Entrega</label>
                              <select 
                                value={ydStatus} 
                                onChange={(e) => setYdStatus(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-1.5 rounded-md font-sans text-[11px] text-slate-800 dark:text-white font-bold outline-none"
                              >
                                <option value="PENDENTE">PENDENTE</option>
                                <option value="A CAMINHO">A CAMINHO</option>
                                <option value="ADIADO">ADIADO</option>
                                <option value="ENTREGUE">ENTREGUE</option>
                                <option value="CANCELADO">CANCELADO</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] font-black uppercase text-gray-400 mb-0.5">Transportadora</label>
                              <input 
                                type="text"
                                value={ydCarrier}
                                onChange={(e) => setYdCarrier(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-1.5 rounded-md font-sans text-[11px] text-slate-800 dark:text-white font-bold outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] font-black uppercase text-red-500 mb-0.5">🚚 Modelo de Entrega (Delivery Model)</label>
                              <select 
                                value={ydDeliveryModel} 
                                onChange={(e) => setYdDeliveryModel(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-1.5 rounded-md font-sans text-[11px] text-slate-800 dark:text-white font-bold outline-none focus:ring-1 focus:ring-red-500"
                              >
                                <option value="DESCARGA">DESCARGA (Unload)</option>
                                <option value="SWAP">SWAP (Swap)</option>
                                <option value="COLOCAR NO CHÃO">COLOCAR NO CHÃO (Put down)</option>
                                <option value="DEVOLUÇÃO DE VAZIO">DEVOLUÇÃO DE VAZIO (Return empty)</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[9px] font-black uppercase text-red-500 mb-0.5">📍 Local de Entrega (Delivery Site)</label>
                              <select 
                                value={ydOnSitePlaceOfDelivery} 
                                onChange={(e) => setYdOnSitePlaceOfDelivery(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-1.5 rounded-md font-sans text-[11px] text-slate-800 dark:text-white font-bold outline-none focus:ring-1 focus:ring-red-500"
                              >
                                <option value="WAREHOUSE 25">WAREHOUSE 25</option>
                                <option value="WAREHOUSE 27">WAREHOUSE 27</option>
                                <option value="BUFFER 10">BUFFER 10</option>
                                <option value="WAREHOUSE 20">WAREHOUSE 20</option>
                                <option value="WAREHOUSE 21">WAREHOUSE 21</option>
                                <option value="GERAL">GERAL</option>
                              </select>
                            </div>
                          </div>

                        </div>

                        <button 
                          type="submit"
                          className="w-full py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-black text-[10px] rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer uppercase tracking-wider flex items-center justify-center gap-1.5 mt-2"
                        >
                          <Truck className="w-3.5 h-3.5" /> {language === 'zh' ? '确认排程并同步' : 'Vincular e Agendar'}
                        </button>
                      </form>
                    </div>

                    {/* RIGHT WORKSPACE: FILTERS AND TABLE WORKSPACE */}
                    <div className="lg:col-span-8 p-4 rounded-xl border bg-white border-slate-150 dark:bg-[#1e293b] dark:border-slate-700 flex flex-col justify-between overflow-hidden">
                    <div className="flex flex-col md:flex-row gap-3 items-center justify-between mb-4">
                      <div className="relative w-full max-w-sm">
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                        <input 
                          type="text" 
                          value={logisticsSearch} 
                          onChange={(e) => setLogisticsPageSearch(e.target.value)}
                          placeholder={language === 'zh' ? "搜索 Container, BL, 船名..." : "Buscar por Container, BL, Navio..."} 
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 pl-8 pr-3 py-1.5 rounded-lg outline-none text-slate-800 dark:text-white text-xs font-bold"
                        />
                      </div>

                      <div className="flex items-center gap-3">
                        <select 
                          value={logisticsFilterComex} 
                          onChange={(e) => setLogisticsFilterComex(e.target.value)} 
                          className="bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-1.5 rounded-lg text-xs font-bold outline-none"
                        >
                          <option value="ALL">{language === 'zh' ? '全部 Comex 状态' : 'Status Comex: Todos'}</option>
                          <option value="CARGO DELIVERED">CARGO DELIVERED</option>
                          <option value="PENDENTE">PENDENTE</option>
                        </select>

                        <label className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 cursor-pointer text-xs font-bold select-none">
                          <input 
                            type="checkbox" 
                            checked={logisticsOnlyPending} 
                            onChange={(e) => setLogisticsOnlyPending(e.target.checked)} 
                            className="rounded text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer" 
                          />
                          <span>{language === 'zh' ? '仅显示未交付' : 'Apenas Pendentes'}</span>
                        </label>
                      </div>
                    </div>

                    <div className="overflow-x-auto flex-1 max-h-[380px] overflow-y-auto">
                      <table className="w-full text-left text-[11px] border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800 text-[9px] uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-slate-700 font-black tracking-wider">
                            <th className="p-2.5 pl-3">ID Container</th>
                            <th className="p-2.5">Conhecimento (HBL)</th>
                            <th className="p-2.5">Vessel (Navio)</th>
                            <th className="p-2.5">Lote (Batch)</th>
                            <th className="p-2.5 text-center">Data Agendada CD</th>
                            <th className="p-2.5">Bonded Warehouse</th>
                            <th className="p-2.5 text-center">Status Comex</th>
                            <th className="p-2.5">Carrier</th>
                            <th className="p-2.5 text-right pr-3">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-150/40 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                          {logisticsEntries
                            .filter(e => {
                              if (logisticsSearch) {
                                const searchLower = logisticsSearch.toLowerCase();
                                if (!e.cntrsOriginal.toLowerCase().includes(searchLower) && 
                                    !e.bl?.toLowerCase().includes(searchLower) && 
                                    !e.arrivalVessel?.toLowerCase().includes(searchLower)) return false;
                              }
                              if (logisticsFilterComex !== 'ALL' && e.statusComex !== logisticsFilterComex) return false;
                              if (logisticsOnlyPending && e.status === 'ENTREGUE') return false;
                              return true;
                            })
                            .slice((logisticsPage - 1) * 8, logisticsPage * 8)
                            .map((entry, index) => (
                              <tr key={entry.id || index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 font-mono">
                                <td className="p-2 pl-3 font-bold text-slate-900 dark:text-white select-all">{entry.cntrsOriginal}</td>
                                <td className="p-2 font-bold">{entry.bl}</td>
                                <td className="p-2 font-sans">{entry.arrivalVessel}</td>
                                <td className="p-2 text-blue-600 dark:text-blue-400 font-sans font-bold">{entry.batch}</td>
                                <td className="p-2 text-center font-bold text-red-600 dark:text-red-400">{entry.estimatedDeliveryDate || '-'}</td>
                                <td className="p-2 font-sans truncate max-w-[120px]" title={entry.bondedWarehouse}>{entry.bondedWarehouse || 'N/A'}</td>
                                <td className="p-2 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${entry.statusComex === 'CARGO DELIVERED' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/40' : 'bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900/40'}`}>
                                    {entry.statusComex || 'PENDENTE'}
                                  </span>
                                </td>
                                <td className="p-2 font-sans font-bold">{entry.carrier || 'N/A'}</td>
                                <td className="p-2 text-right pr-3 font-sans">
                                  <button 
                                    onClick={() => { 
                                      const title = language === 'zh' ? '删除物流记录' : 'Excluir Entrada';
                                      const msg = language === 'zh'
                                        ? `您确定要从 Firestore 中删除集装箱 ${entry.cntrsOriginal} 的物流记录吗？`
                                        : `Deseja realmente remover a entrada logística do contêiner ${entry.cntrsOriginal} do Firestore?`;
                                      
                                      requestConfirmation(title, msg, async () => {
                                        try {
                                          await deleteDoc(doc(db, 'logisticsData', entry.id || '')); 
                                        } catch (error) {
                                          handleFirestoreError(error, OperationType.DELETE, `logisticsData/${entry.id}`);
                                        }
                                      });
                                    }} 
                                    className="p-1.5 text-red-500 hover:text-white hover:bg-red-600 rounded-lg border border-transparent hover:border-red-600 transition-all active:scale-90 cursor-pointer shadow-xs hover:shadow-md"
                                    title={language === 'zh' ? '删除' : 'Excluir'}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          {logisticsEntries.length === 0 && (
                            <tr>
                              <td colSpan={9} className="p-8 text-center text-gray-400 dark:text-gray-500 font-extrabold font-sans">
                                {language === 'zh' ? '暂无数据。请点击右上方 Google Sheets 同步或进行本地文件拖拽。' : 'Nenhum registro de container ou HBL importado ainda.'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-150/40 dark:border-slate-800 text-[10px] font-bold text-gray-500 dark:text-gray-400">
                      <span>Total de {logisticsEntries.length} containers logísticos importados</span>
                      <div className="flex items-center gap-1">
                        <button 
                          disabled={logisticsPage === 1} 
                          onClick={() => setLogisticsPage(p => Math.max(p - 1, 1))}
                          className="px-2 py-1 bg-slate-100 dark:bg-slate-800 disabled:opacity-50 text-slate-800 dark:text-white rounded-md cursor-pointer"
                        >
                          ◄ Anterior
                        </button>
                        <span className="px-2">{logisticsPage} / {Math.ceil(logisticsEntries.length / 8) || 1}</span>
                        <button 
                          disabled={logisticsPage >= Math.ceil(logisticsEntries.length / 8)} 
                          onClick={() => setLogisticsPage(p => p + 1)}
                          className="px-2 py-1 bg-slate-100 dark:bg-slate-800 disabled:opacity-50 text-slate-800 dark:text-white rounded-md cursor-pointer"
                        >
                          Próximo ►
                        </button>
                      </div>
                    </div>

                  </div>

                </div>

              </div>
              ) : currentSlide === 8 ? (
                /* SLIDE 8: PAINEL EXECUTIVO DE ENTREGAS CD */
                <div id="slide-delivery-panel" className={`flex flex-col justify-between ${widescreenMode ? 'h-[calc(100%-85px)] overflow-hidden' : 'min-h-[660px] gap-4'}`}>
                  
                  {/* HEADER PANEL */}
                  <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-100 shadow-sm'} flex flex-col md:flex-row justify-between items-start md:items-center gap-3`}>
                    <div className="flex items-center gap-3">
                      <div className="bg-red-100 dark:bg-red-950 p-2.5 rounded-xl text-red-600 dark:text-red-400">
                        <Truck className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm flex items-center gap-2 text-red-600 dark:text-red-400 tracking-tight">
                          {language === 'bilingual' ? 'DELIVERY MONITORING STATION / CD 厂内卸货、运输状态及实时交期控制' : language === 'zh' ? 'CD 厂内卸货、运输状态及实时交期控制' : 'DELIVERY STATION'}
                        </h3>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                          {language === 'zh' ? '控制运输途中、延期、已交付到厂的集装箱节点，协助进行全流程时效管理，降低滞箱费风险' : 'Gestão executiva de status operacionais, faturamento de fretes, transportadoras ativas e reprogramações.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[9px] bg-red-600 text-white font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">
                        CD PLANTA DISPATCH
                      </span>
                    </div>
                  </div>

                  {/* SUMMARY CARDS GRID */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    {[
                      { status: 'ALL', label: 'Geral', color: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-white', count: logisticsEntries.length },
                      { status: 'PENDENTE', label: 'Pendente', color: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-slate-800/40 dark:text-gray-400', count: logisticsEntries.filter(e => e.status === 'PENDENTE' || !e.status).length },
                      { status: 'A CAMINHO', label: 'A Caminho', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400', count: logisticsEntries.filter(e => e.status === 'A CAMINHO').length },
                      { status: 'ADIADO', label: 'Adiado', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-450', count: logisticsEntries.filter(e => e.status === 'ADIADO').length },
                      { status: 'ENTREGUE', label: 'Entregue', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400', count: logisticsEntries.filter(e => e.status === 'ENTREGUE').length },
                      { status: 'CANCELADO', label: 'Cancelado', color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-450', count: logisticsEntries.filter(e => e.status === 'CANCELADO').length },
                    ].map(card => (
                      <div 
                        key={card.status}
                        onClick={() => setDeliveryStatusFilter(card.status === 'ALL' ? null : card.status)}
                        className={`p-3 rounded-xl border hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer shadow-3xs flex flex-col justify-between select-none ${card.color} ${deliveryStatusFilter === card.status ? 'ring-2 ring-red-500' : ''}`}
                      >
                        <span className="text-[10px] uppercase font-black tracking-wider block opacity-75">{card.label}</span>
                        <span className="font-mono text-lg font-black block mt-1">{card.count} <span className="text-[10px] font-normal font-sans opacity-80">EQ</span></span>
                      </div>
                    ))}
                  </div>

                  {/* ACTIVE WORKSPACE: ESTIMATED DELIVERY DATES PANELS */}
                  <div className="flex-1 overflow-y-auto max-h-[350px] space-y-3.5 pr-1">
                    {Array.from(new Set(logisticsEntries.map(e => String(e.estimatedDeliveryDate || 'Sem Data')))).map((dateGroup: string) => {
                      const groupEntries = logisticsEntries.filter(e => String(e.estimatedDeliveryDate || 'Sem Data') === dateGroup && (!deliveryStatusFilter || e.status === deliveryStatusFilter || (deliveryStatusFilter === 'PENDENTE' && !e.status)));
                      if (groupEntries.length === 0) return null;

                      const isCollapsed = !!(collapsedDates as Record<string, boolean>)[dateGroup];

                      // Calculate summary counts for delivery model
                      const unloadCount = groupEntries.filter(e => e.deliveryModel === 'DESCARGA' || !e.deliveryModel).length;
                      const swapCount = groupEntries.filter(e => e.deliveryModel === 'SWAP').length;
                      const putDownCount = groupEntries.filter(e => e.deliveryModel === 'COLOCAR NO CHÃO').length;
                      const returnEmptyCount = groupEntries.filter(e => e.deliveryModel === 'DEVOLUÇÃO DE VAZIO').length;

                      return (
                        <div key={dateGroup} className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-150 shadow-3xs'} space-y-3`}>
                          <div className="flex items-center justify-between border-b pb-2.5 border-gray-150/40 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                              <Truck className="w-4 h-4 text-red-500 shrink-0" />
                              <span className="text-xs font-black text-slate-850 dark:text-slate-200 uppercase tracking-tight flex items-center">
                                {language === 'zh' ? '计划交付厂内/CD时间：' : 'Data de Entrega Planejada:'} <strong className="font-mono text-red-600 dark:text-red-400 pl-1">{dateGroup}</strong>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCollapsedDates(prev => {
                                      const copy = { ...prev } as Record<string, boolean>;
                                      copy[dateGroup as string] = !copy[dateGroup as string];
                                      return copy;
                                    });
                                  }}
                                  className="p-1 text-slate-500 hover:text-red-500 rounded-md transition-all hover:bg-slate-100 dark:hover:bg-slate-800 ml-2 flex items-center justify-center cursor-pointer"
                                  title={isCollapsed ? (language === 'zh' ? '展开' : 'Expandir') : (language === 'zh' ? '最小化' : 'Minimizar')}
                                >
                                  {isCollapsed ? <ChevronDown className="w-4 h-4 text-red-500" /> : <ChevronUp className="w-4 h-4 text-gray-500" />}
                                </button>
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {isCollapsed && (
                                <span className="hidden sm:inline-flex items-center gap-1.5 text-[9px] font-bold text-gray-400 mr-2">
                                  [ Unload: {unloadCount} | Swap: {swapCount} | Down: {putDownCount} | Empty: {returnEmptyCount} ]
                                </span>
                              )}
                              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">{groupEntries.length} Equipamentos</span>
                            </div>
                          </div>

                          {isCollapsed ? (
                            <div className="flex flex-wrap gap-2 pt-1">
                              <span className="text-[10px] bg-sky-50 text-sky-700 dark:bg-sky-950/25 dark:text-sky-400 px-2.5 py-1 rounded-md font-extrabold uppercase">
                                📥 {language === 'zh' ? '卸货' : 'DESCARGA (Unload)'}: {unloadCount}
                              </span>
                              <span className="text-[10px] bg-purple-50 text-purple-700 dark:bg-purple-950/25 dark:text-purple-400 px-2.5 py-1 rounded-md font-extrabold uppercase">
                                🔄 {language === 'zh' ? '交换' : 'SWAP (Swap)'}: {swapCount}
                              </span>
                              <span className="text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-950/25 dark:text-amber-450 px-2.5 py-1 rounded-md font-extrabold uppercase">
                                ⬇️ {language === 'zh' ? '落箱' : 'NO CHÃO (Put down)'}: {putDownCount}
                              </span>
                              <span className="text-[10px] bg-rose-50 text-rose-700 dark:bg-rose-950/25 dark:text-rose-450 px-2.5 py-1 rounded-md font-extrabold uppercase">
                                ♻️ {language === 'zh' ? '退空' : 'DEVOLUÇÃO VAZIO (Return empty)'}: {returnEmptyCount}
                              </span>
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-[11px] border-collapse">
                                <thead>
                                  <tr className="text-[9px] uppercase font-black text-slate-400 dark:text-slate-500 border-b border-gray-100 dark:border-slate-800 tracking-wider">
                                    <th className="py-2 pl-2">ID Container / Item</th>
                                    <th className="py-2">HBL (BL)</th>
                                    <th className="py-2">Lote (Batch) / SAP PO</th>
                                    <th className="py-2">Modelo de Entrega (Delivery Model)</th>
                                    <th className="py-2">Status Operacional</th>
                                    <th className="py-2 font-black text-red-700 dark:text-red-400 bg-red-100/40 dark:bg-red-950/20 text-center">📅 Alterar Data Entrega</th>
                                    <th className="py-2">Transportadora (Carrier)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-150/40 dark:divide-slate-800/60 font-medium text-slate-750 dark:text-slate-350 font-mono">
                                  {groupEntries.map(entry => {
                                    const matchedCntr = containers.find(c => c.id === entry.cntrsOriginal);
                                    const scheduledItem = entry.component || (matchedCntr && matchedCntr.componente) || entry.description || (matchedCntr && matchedCntr.modelo) || 'Componente Não Especificado';
                                    
                                    return (
                                      <tr key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-all">
                                        <td className="py-2 pl-2">
                                          <div className="font-bold text-slate-900 dark:text-white select-all">{entry.cntrsOriginal}</div>
                                          <div className="text-[9px] text-slate-400 dark:text-slate-500 font-sans max-w-[150px] truncate" title={scheduledItem}>
                                            📦 {scheduledItem}
                                          </div>
                                        </td>
                                        <td className="py-2 font-semibold text-slate-500">{entry.bl}</td>
                                        <td className="py-2 font-sans">{entry.batch} / <span className="text-blue-500 font-bold font-mono">{entry.poSap || 'N/A'}</span></td>
                                        <td className="py-2 font-sans">
                                          <select 
                                            value={entry.deliveryModel || 'DESCARGA'} 
                                            onChange={async (e) => { 
                                              try {
                                                await updateDoc(doc(db, 'logisticsData', entry.id || ''), { deliveryModel: e.target.value }); 
                                              } catch (err) {
                                                handleFirestoreError(err, OperationType.UPDATE, `logisticsData/${entry.id}`);
                                              }
                                            }}
                                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1 text-[10px] font-black uppercase text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-red-500"
                                          >
                                            <option value="DESCARGA">DESCARGA (Unload)</option>
                                            <option value="SWAP">SWAP (Swap)</option>
                                            <option value="COLOCAR NO CHÃO">COLOCAR NO CHÃO (Put down)</option>
                                            <option value="DEVOLUÇÃO DE VAZIO">DEVOLUÇÃO DE VAZIO (Return empty)</option>
                                          </select>
                                        </td>
                                        <td className="py-2">
                                          <select 
                                            value={entry.status || 'PENDENTE'} 
                                            onChange={async (e) => { 
                                              try {
                                                await updateDoc(doc(db, 'logisticsData', entry.id || ''), { status: e.target.value }); 
                                              } catch (err) {
                                                handleFirestoreError(err, OperationType.UPDATE, `logisticsData/${entry.id}`);
                                              }
                                            }}
                                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1 text-[10px] font-black uppercase text-slate-800 dark:text-slate-100 outline-none"
                                          >
                                            <option value="PENDENTE">PENDENTE</option>
                                            <option value="A CAMINHO">A CAMINHO</option>
                                            <option value="ADIADO">ADIADO</option>
                                            <option value="ENTREGUE">ENTREGUE</option>
                                            <option value="CANCELADO">CANCELADO</option>
                                          </select>
                                        </td>
                                        <td className="py-1 bg-red-100/10 dark:bg-red-950/5">
                                          <input 
                                            type="text" 
                                            defaultValue={entry.estimatedDeliveryDate || ""} 
                                            onBlur={async (e) => { 
                                              try {
                                                await updateDoc(doc(db, 'logisticsData', entry.id || ''), { estimatedDeliveryDate: e.target.value }); 
                                              } catch (err) {
                                                handleFirestoreError(err, OperationType.UPDATE, `logisticsData/${entry.id}`);
                                              }
                                            }}
                                            className="w-28 mx-auto bg-white dark:bg-slate-800 p-1 border border-red-250 dark:border-red-900/50 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-md font-sans text-[11px] font-bold text-slate-800 dark:text-slate-100 text-center outline-none"
                                          />
                                        </td>
                                        <td className="py-2">
                                          <input 
                                            type="text" 
                                            defaultValue={entry.carrier || "JSL"} 
                                            onBlur={async (e) => { 
                                              try {
                                                await updateDoc(doc(db, 'logisticsData', entry.id || ''), { carrier: e.target.value }); 
                                              } catch (err) {
                                                handleFirestoreError(err, OperationType.UPDATE, `logisticsData/${entry.id}`);
                                              }
                                            }}
                                            className="bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 border border-transparent focus:border-gray-200 px-1 py-0.5 rounded outline-none w-24 text-[11px] font-bold font-sans text-slate-800 dark:text-slate-100"
                                          />
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                </div>
              ) : currentSlide === 9 ? (
                /* SLIDE 9: CALENDÁRIO MENSAL DE DISTRIBUIÇÃO */
                <div id="slide-delivery-calendar" className={`flex flex-col justify-between ${widescreenMode ? 'h-[calc(100%-85px)] overflow-hidden' : 'min-h-[660px] gap-4'}`}>
                  
                  {/* WORKSPACE */}
                  <div className="grid grid-cols-12 gap-4 flex-1">
                    
                    {/* LEFT WORKSPACE: MONTHLY CALENDAR GRID / SHIPMENT INFO TABLE */}
                    <div className={`col-span-12 p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-150 shadow-sm'} flex flex-col justify-between overflow-hidden`}>
                      <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
                        
                        {/* Header controls with view toggler */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-2.5 border-gray-150/40 dark:border-slate-800 gap-2 shrink-0">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="font-black uppercase text-xs text-slate-850 dark:text-slate-200 flex items-center gap-1.5">
                              <Calendar className="w-4 h-4 text-red-500 shrink-0" /> 
                              {language === 'zh' ? '交付排程日历 & Shipment Info' : 'Calendário de Entregas & Shipment Info'}
                            </span>
                            
                            {/* VIEW TOGGLER */}
                            <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                              <button
                                type="button"
                                onClick={() => setCalendarViewMode('monthly')}
                                className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-md transition-all cursor-pointer ${
                                  calendarViewMode === 'monthly'
                                    ? 'bg-red-600 text-white shadow-3xs'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                              >
                                {language === 'zh' ? '月视图' : 'Mensal'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setCalendarViewMode('shipment_info')}
                                className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                                  calendarViewMode === 'shipment_info'
                                    ? 'bg-red-600 text-white shadow-3xs'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                              >
                                📋 {language === 'zh' ? '周度/日交付表 (Shipment Info)' : 'Shipment Info (Semanal/Diário)'}
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {calendarViewMode === 'shipment_info' ? (
                              <div className="flex gap-1">
                                <input
                                  type="week"
                                  value={selectedWeek}
                                  onChange={(e) => {
                                    setSelectedWeek(e.target.value);
                                    setSelectedDayCalendar(null);
                                  }}
                                  className="bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 text-xs font-bold rounded px-2 py-1 text-slate-800 dark:text-white outline-none"
                                />
                                <input
                                  type="date"
                                  value={selectedDayCalendar || ''}
                                  onChange={(e) => {
                                    setSelectedDayCalendar(e.target.value);
                                  }}
                                  className="bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 text-xs font-bold rounded px-2 py-1 text-slate-800 dark:text-white outline-none"
                                />
                              </div>
                            ) : (
                              <input 
                                type="month" 
                                value={operationalMonth} 
                                onChange={(e) => setOperationalMonth(e.target.value)} 
                                className="bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 text-xs font-bold rounded px-2 py-1 text-slate-800 dark:text-white outline-none" 
                              />
                            )}
                          </div>
                        </div>

                        {calendarViewMode === 'monthly' ? (
                          <div className="flex-1 flex flex-col justify-between">
                            <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black uppercase tracking-wider text-gray-400 mb-2">
                              <div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div>
                            </div>

                            {/* Calendar Grid Days */}
                            <div className="grid grid-cols-7 gap-1.5 flex-1">
                              {Array.from({ length: 31 }).map((_, d) => {
                                const currentDayStr = `${operationalMonth}-${String(d + 1).padStart(2, '0')}`;
                                const dayEntries = logisticsEntries.filter(e => normalizeDate(String(e.estimatedDeliveryDate)) === currentDayStr);
                                
                                return (
                                  <div 
                                    key={d} 
                                    onClick={() => { if (dayEntries.length > 0) setSelectedDayCalendar(currentDayStr); }}
                                    className={`min-h-[52px] p-2 rounded-lg border flex flex-col justify-between items-start transition-all ${
                                      dayEntries.length > 0 
                                        ? 'bg-red-50/40 border-red-350 hover:bg-red-100/40 dark:bg-red-950/20 dark:border-red-900 cursor-pointer active:scale-95 shadow-3xs' 
                                        : 'border-gray-100 bg-slate-50/20 dark:border-slate-800/50 text-gray-400 opacity-60'
                                    }`}
                                  >
                                    <span className="font-mono font-black text-slate-900 dark:text-white text-xs leading-none">{d + 1}</span>
                                    {dayEntries.length > 0 && (
                                      <span className="text-[8px] bg-red-600 text-white font-mono font-black px-1 py-0.2 rounded-xs self-end animate-pulse">
                                        {dayEntries.length} EQ
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          /* HIGH-FIDELITY SHIPMENT INFORMATION WEEK/DAILY PLAN (EXCEL INSPIRED) */
                          <div className="flex-1 overflow-auto max-h-[460px] border border-slate-250 dark:border-slate-700 rounded-lg shadow-3xs">
                            <table className="w-full text-left text-[11px] border-collapse bg-white dark:bg-[#0f172a]">
                              <thead>
                                {/* Main Excel Title row */}
                                <tr className="bg-[#b3b3b3] dark:bg-slate-700 text-slate-900 dark:text-white border-b border-slate-350 dark:border-slate-600">
                                  <th colSpan={10} className="py-2 text-center text-xs font-black uppercase tracking-widest font-sans border-b border-slate-350 dark:border-slate-600">
                                    Shipment Information {selectedDayCalendar ? ` - ${selectedDayCalendar}` : ''}
                                  </th>
                                </tr>
                                {/* Table headers */}
                                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-[9px] uppercase font-black tracking-wider text-center border-b border-slate-350 dark:border-slate-700">
                                    <th className="py-2 px-1.5 border-r border-slate-250 dark:border-slate-700 w-[110px] cursor-pointer group" onClick={() => setSelectedDayCalendar(null)}>
                                      Day
                                      {selectedDayCalendar && (
                                        <button className="block mx-auto mt-1 px-2 py-0.5 bg-red-100 text-red-700 rounded text-[8px] hover:bg-red-200">Clear</button>
                                      )}
                                    </th>
                                  <th className="py-2 px-1.5 border-r border-slate-250 dark:border-slate-700">BL</th>
                                  <th className="py-2 px-1.5 border-r border-slate-250 dark:border-slate-700 w-[170px]">Description</th>
                                  <th className="py-2 px-1.5 border-r border-slate-250 dark:border-slate-700">PO</th>
                                  <th className="py-2 px-1.5 border-r border-slate-250 dark:border-slate-700">Batch</th>
                                  <th className="py-2 px-1.5 border-r border-slate-250 dark:border-slate-700">CNTR QTY</th>
                                  <th className="py-2 px-1.5 border-r border-slate-250 dark:border-slate-700">Warehouse</th>
                                  <th className="py-2 px-1.5 border-r border-slate-250 dark:border-slate-700">Operation</th>
                                  <th className="py-2 px-1.5 border-r border-slate-250 dark:border-slate-700">Truck Company</th>
                                  <th className="py-2 px-1.5">Delivery Site</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium font-mono text-slate-850 dark:text-slate-200 text-center">
                                {(() => {
                                  // Agrupar entries por data e BL
                                  const groupedEntries = logisticsEntries
                                    .filter(e => {
                                      const normalized = normalizeDate(String(e.estimatedDeliveryDate));
                                      if (normalized === 'Sem Data') return false;
                                      // Filter by selected day
                                      if (selectedDayCalendar) {
                                        return normalized === selectedDayCalendar;
                                      }

                                      if (calendarViewMode === 'shipment_info') {
                                        const parts = normalized.split('-');
                                        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                                        return getISOWeek(d) === selectedWeek;
                                      }
                                      return normalized.startsWith(operationalMonth);
                                    })
                                    .reduce((acc, entry) => {
                                      const date = normalizeDate(String(entry.estimatedDeliveryDate));
                                      const bl = entry.bl || 'PENDING-BL';
                                      const key = `${date}|${bl}`;
                                      if (!acc[key]) {
                                        acc[key] = { ...entry, bl, date, entries: [] };
                                      }
                                      acc[key].entries.push(entry);
                                      return acc;
                                                                        }, {} as Record<string, { entries: any[], bl: string, date: string, [key: string]: any }>);

                                  const sortedKeys = Object.keys(groupedEntries).sort();

                                  if (sortedKeys.length === 0) {
                                    return (
                                      <tr>
                                        <td colSpan={10} className="py-12 text-center text-gray-400 font-bold uppercase font-sans">
                                          {language === 'zh' ? '当前月份没有排程的交付数据' : 'Nenhum agendamento encontrado.'}
                                        </td>
                                      </tr>
                                    );
                                  }

                                                                                                      return sortedKeys.map((key) => {
                                    const group = groupedEntries[key] as any;
                                    const dateStr = group.date;
                                                                        const dayEntries = (Object.values(groupedEntries as any) as any[]).filter(g => g.date === dateStr);
                                    const entryIdx = dayEntries.findIndex(g => g.bl === group.bl);
                                    const isFirst = entryIdx === 0;

                                    const cntrQuantity = group.entries.reduce((sum: number, e: any) => sum + (Number(e.quantity) || 1), 0);
                                    const firstEntry = group.entries[0];
const matchedCntr = containers.find(c => c.id === firstEntry.cntrsOriginal);
const scheduledItem = matchedCntr?.modelo || group.component || group.description || 'Componente Não Especificado';
                                    const formatted = formatDayColumn(dateStr);

                                      return (
                                        <tr key={key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                                          {/* Day Column (merged cells per day group) */}
                                          {isFirst && (
                                            <td 
                                              rowSpan={dayEntries.length} 
                                              onClick={() => setSelectedDayCalendar(dateStr)}
                                              className="py-3 px-2 border-r border-b border-slate-250 dark:border-slate-700 bg-[#f4f4f5] dark:bg-[#1a2235] text-slate-900 dark:text-white font-black uppercase text-[10px] align-middle cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                            >
                                              <div className="flex flex-col items-center justify-center text-center">
                                                <span className="font-sans font-bold leading-tight tracking-tight text-slate-800 dark:text-slate-200">
                                                  {formatted.date}
                                                </span>
                                                <span className="text-gray-400 my-0.5 font-sans">-</span>
                                                <span className="text-[9px] tracking-wider text-red-600 dark:text-red-400 font-sans font-black uppercase">
                                                  {formatted.dayOfWeek}
                                                </span>
                                              </div>
                                            </td>
                                          )}

                                          {/* BL */}
                                          <td className="py-2 px-1.5 border-r border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-white select-all text-[10px]">
                                            {group.bl || 'PENDING-BL'}
                                          </td>

                                          {/* Description */}
                                          <td className="py-2 px-1.5 border-r border-slate-200 dark:border-slate-800 text-left font-sans text-[9px] max-w-[170px] truncate" title={scheduledItem}>
                                            {scheduledItem}
                                          </td>

                                          {/* PO */}
                                          <td className="py-2 px-1.5 border-r border-slate-200 dark:border-slate-800 font-bold text-blue-600 dark:text-blue-400 text-[10px]">
                                            {group.poSap || 'N/A'}
                                          </td>

                                          {/* Batch */}
                                          <td className="py-2 px-1.5 border-r border-slate-200 dark:border-slate-800 text-[10px]">
                                            {group.batch || 'N/A'}
                                          </td>

                                          {/* Container Quantity */}
                                          <td className="py-2 px-1.5 border-r border-slate-200 dark:border-slate-800 font-bold text-[10px]">
                                            {cntrQuantity}
                                          </td>

                                          {/* Warehouse (Originating Yard) */}
                                          <td className="py-2 px-1.5 border-r border-slate-200 dark:border-slate-800 text-[10px]">
                                            {group.bondedWarehouse || 'CD PLANTA'}
                                          </td>

                                          {/* Operation */}
                                          <td className="py-1 px-1 border-r border-slate-200 dark:border-slate-800">
                                            <select 
                                              value={group.deliveryModel || 'DESCARGA'} 
                                              onChange={async (e) => { 
                                                try {
                                                  // Update all entries in this group
                                                  await Promise.all(group.entries.map((entry: any) => updateDoc(doc(db, 'logisticsData', entry.id || ''), { deliveryModel: e.target.value }))); 
                                                } catch (err) {
                                                  handleFirestoreError(err, OperationType.UPDATE, `logisticsData/${group.id}`);
                                                }
                                              }}
                                              className="bg-transparent text-[10px] font-black uppercase text-slate-800 dark:text-slate-200 outline-none w-full text-center border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-red-500 rounded p-0.5"
                                            >
                                              <option value="DESCARGA">UNLOAD</option>
                                              <option value="SWAP">SWAP</option>
                                              <option value="COLOCAR NO CHÃO">PUT DOWN</option>
                                              <option value="DEVOLUÇÃO DE VAZIO">RETURN EMPTY</option>
                                            </select>
                                          </td>

                                          {/* Truck Company */}
                                          <td className="py-1 px-1 border-r border-slate-200 dark:border-slate-800">
                                            <select 
                                              value={group.carrier || 'JSL'} 
                                              onChange={async (e) => { 
                                                try {
                                                  await Promise.all(group.entries.map((entry: any) => updateDoc(doc(db, 'logisticsData', entry.id || ''), { carrier: e.target.value }))); 
                                                } catch (err) {
                                                  handleFirestoreError(err, OperationType.UPDATE, `logisticsData/${group.id}`);
                                                }
                                              }}
                                              className="bg-transparent text-[10px] font-black uppercase text-slate-800 dark:text-slate-200 outline-none w-full text-center border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-red-500 rounded p-0.5"
                                            >
                                              <option value="TPC">TPC</option>
                                              <option value="RECOM">RECOM</option>
                                              <option value="TEGMA">TEGMA</option>
                                              <option value="INTERMARÍTIMA">INTERMARÍTIMA</option>
                                              <option value="LOGIC">LOGIC</option>
                                              <option value="MULTILOG">MULTILOG</option>
                                              <option value="TRANSPARANÁ">TRANSPARANÁ</option>
                                              <option value="JSL">JSL</option>
                                              <option value="BRILHANTE">BRILHANTE</option>
                                            </select>
                                          </td>

                                          {/* Delivery Site */}
                                          <td className="py-1 px-1">
                                            <select 
                                              value={group.onSitePlaceOfDelivery || 'WAREHOUSE 25'} 
                                              onChange={async (e) => { 
                                                try {
                                                  await Promise.all(group.entries.map((entry: any) => updateDoc(doc(db, 'logisticsData', entry.id || ''), { onSitePlaceOfDelivery: e.target.value }))); 
                                                } catch (err) {
                                                  handleFirestoreError(err, OperationType.UPDATE, `logisticsData/${group.id}`);
                                                }
                                              }}
                                              className="bg-transparent text-[10px] font-black uppercase text-slate-800 dark:text-slate-200 outline-none w-full text-center border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-red-500 rounded p-0.5"
                                            >
                                              <option value="WAREHOUSE 25">WAREHOUSE 25</option>
                                              <option value="WAREHOUSE 27">WAREHOUSE 27</option>
                                              <option value="BUFFER 10">BUFFER 10</option>
                                              <option value="WAREHOUSE 20">WAREHOUSE 20</option>
                                              <option value="WAREHOUSE 21">WAREHOUSE 21</option>
                                              <option value="GERAL">GERAL</option>
                                            </select>
                                          </td>

                                        </tr>
                                      );
                                    })
                                  })()}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                </div>
              ) : null}
            </div> {/* END OF ZOOM SCALE WRAPPER */}

            {/* MARCA D'ÁGUA PERSONALIZADA DE SLIDE CORPORATIVO */}
            {showWatermark && viewParadigm === 'ppt' && (
              <div className="absolute bottom-2.5 left-6 flex items-center gap-1.5 opacity-40 select-none pointer-events-none">
                <span className="text-[9px] font-mono tracking-widest text-[#94a3b8]">
                  {watermarkText} • {language === 'bilingual' ? '比亚迪物流机密 / CONFIDENCIAL BYD' : t('confidential')}
                </span>
              </div>
            )}

          </div>

        </div>

        {/* PAINEL LATERAL DE EDIÇÃO */}
        {isEditMode && (
          <aside 
            id="side-editor-panel" 
            style={{ width: isDesktop ? `${sidePanelWidth}px` : '100%' }}
            className="w-full bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden shadow-xl shrink-0"
          >
            
            {/* CORPORATE EDITOR HEADER */}
            <div className="p-3 bg-slate-900 text-white flex items-center justify-between font-sans border-b border-slate-850">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-red-500 animate-pulse" />
                <div>
                  <h3 className="font-extrabold text-[11px] tracking-wider uppercase">YARD CONTROLLER</h3>
                  <p className="text-[8px] text-slate-400 font-bold uppercase">{language === 'bilingual' ? 'Logistics High-Level Panel / 供应链控制塔面板' : 'Painel de Controle Logístico'}</p>
                </div>
              </div>
              <div className="text-[8px] bg-red-600/20 text-red-400 font-mono px-1.5 py-0.5 rounded border border-red-500/25 uppercase font-bold">
                {language === 'bilingual' ? 'Active / 激活' : 'Ativo'}
              </div>
            </div>

            {/* TABS DE SELEÇÃO */}
            <div className="flex border-b border-gray-200 bg-slate-50 text-slate-700 font-sans">
              <button 
                id="tab-btn-yards"
                onClick={() => {
                  setActiveTab('yards');
                  // Set activeYardKey to the first available yard key if not already set
                  const keys = Object.keys(yards);
                  if (keys.length > 0 && !keys.includes(activeYardKey)) {
                    setActiveYardKey(keys[0]);
                  }
                }}
                className={`flex-1 py-3 text-[10px] font-black border-b-2 text-center cursor-pointer transition-all ${activeTab === 'yards' ? 'border-red-600 text-red-600 bg-white font-extrabold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                {language === 'zh' ? '堆场' : language === 'pt' ? 'Pátios' : 'Pátios / 堆场'}
              </button>
              <button 
                id="tab-btn-stock"
                onClick={() => {
                  setActiveTab('stock');
                  const keys = Object.keys(yards);
                  if (keys.length > 0 && !keys.includes(stockSelectedYardKey)) {
                    setStockSelectedYardKey(keys[0]);
                  }
                }}
                className={`flex-1 py-3 text-[10px] font-black border-b-2 text-center cursor-pointer transition-all ${activeTab === 'stock' ? 'border-red-600 text-red-600 bg-white font-extrabold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                {language === 'zh' ? '库存' : language === 'pt' ? 'Estoque' : 'Estoque / 库存'}
              </button>
              <button 
                id="tab-btn-vessels"
                onClick={() => setActiveTab('vessels')}
                className={`flex-1 py-3 text-[10px] font-black border-b-2 text-center cursor-pointer transition-all ${activeTab === 'vessels' ? 'border-red-600 text-red-600 bg-white font-extrabold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                {language === 'zh' ? '船期' : language === 'pt' ? 'Navios' : 'Navios / 船期'}
              </button>
              <button 
                id="tab-btn-charts"
                onClick={() => setActiveTab('charts')}
                className={`flex-1 py-3 text-[10px] font-black border-b-2 text-center cursor-pointer transition-all ${activeTab === 'charts' ? 'border-red-600 text-red-600 bg-white font-extrabold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                {language === 'zh' ? '图表' : language === 'pt' ? 'Gráficos' : 'Gráficos / 图表'}
              </button>
              <button 
                id="tab-btn-depots"
                onClick={() => {
                  setActiveTab('depots');
                  setCurrentSlide(5); // Auto switch slide to Depots Slide when clicking sidebar Depots tab
                }}
                className={`flex-1 py-3 text-[10px] font-black border-b-2 text-center cursor-pointer transition-all ${activeTab === 'depots' ? 'border-red-600 text-red-600 bg-white font-extrabold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                {language === 'zh' ? '协议堆存' : language === 'pt' ? 'Depósitos' : 'Depots / 协议堆存'}
              </button>
              <button 
                id="tab-btn-config"
                onClick={() => setActiveTab('config')}
                className={`flex-1 py-3 text-[10px] font-black border-b-2 text-center cursor-pointer transition-all ${activeTab === 'config' ? 'border-red-600 text-red-600 bg-white font-extrabold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                {language === 'zh' ? '配置' : language === 'pt' ? 'Config.' : 'Config. / 配置'}
              </button>
            </div>

            {/* CONTEÚDO DA TAB SELECIONADA */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* TAB: PÁTIOS */}
              {activeTab === 'yards' && (
                <div className="space-y-4">
                  {/* High-Level Logistics KPIs */}
                  <div className="space-y-1.5 font-sans">
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">
                      {language === 'bilingual' ? 'Indicadores de Pátio / 堆场高层物流 KPI' : language === 'zh' ? '堆场高层物流 KPI' : 'Indicadores de Pátio'}
                    </span>
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-150 dark:border-slate-850 text-xs">
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-3xs flex flex-col justify-between">
                        <span className="text-[8px] text-gray-400 font-bold uppercase">{language === 'bilingual' ? 'Capacidade Total / 总容量' : language === 'zh' ? '总容量' : 'Capacidade Total'}</span>
                        <span className="font-mono text-xs font-black text-slate-800 dark:text-slate-100 mt-0.5">
                          {((Object.values(yards) as Yard[]).reduce((sum, y) => sum + (Number(y?.capacity) || 0), 0)).toLocaleString()} <span className="text-[8px] text-gray-400 font-normal">FEU</span>
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-3xs flex flex-col justify-between">
                        <span className="text-[8px] text-gray-400 font-bold uppercase">{language === 'bilingual' ? 'Ocupação Geral / 总体占用率' : language === 'zh' ? '总体占用率' : 'Ocupação Geral'}</span>
                        <span className={`text-xs font-black mt-0.5 px-1 py-0.2 w-max rounded ${
                          (() => {
                            const totalCap = (Object.values(yards) as Yard[]).reduce((sum, y) => sum + (Number(y?.capacity) || 0), 0);
                            const totalCheio = (Object.values(yards) as Yard[]).reduce((sum, y) => sum + (Number(y?.cheio) || 0), 0);
                            const totalVazio = (Object.values(yards) as Yard[]).reduce((sum, y) => sum + (Number(y?.vazio) || 0), 0);
                            const util = totalCap > 0 ? Math.round(((totalCheio + totalVazio) / totalCap) * 100) : 0;
                            return util >= 89 ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400';
                          })()
                        }`}>
                          {(() => {
                            const totalCap = (Object.values(yards) as Yard[]).reduce((sum, y) => sum + (Number(y?.capacity) || 0), 0);
                            const totalCheio = (Object.values(yards) as Yard[]).reduce((sum, y) => sum + (Number(y?.cheio) || 0), 0);
                            const totalVazio = (Object.values(yards) as Yard[]).reduce((sum, y) => sum + (Number(y?.vazio) || 0), 0);
                            return totalCap > 0 ? Math.round(((totalCheio + totalVazio) / totalCap) * 100) : 0;
                          })()}%
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-3xs flex flex-col justify-between">
                        <span className="text-[8px] text-gray-400 font-bold uppercase">{language === 'bilingual' ? 'Total Cheios / 重箱总量' : language === 'zh' ? '重箱总量' : 'Total Cheios'}</span>
                        <span className="font-mono text-xs font-black text-blue-600 mt-0.5">
                          {((Object.values(yards) as Yard[]).reduce((sum, y) => sum + (Number(y?.cheio) || 0), 0)).toLocaleString()} <span className="text-[8px] text-gray-400 font-normal">FEU</span>
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-3xs flex flex-col justify-between">
                        <span className="text-[8px] text-gray-400 font-bold uppercase">{language === 'bilingual' ? 'Pronto Coleta / 待提总量' : language === 'zh' ? '待提总量' : 'Pronto Coleta'}</span>
                        <span className="font-mono text-xs font-black text-emerald-600 mt-0.5">
                          {((Object.values(yards) as Yard[]).reduce((sum, y) => sum + (Number(y?.prontoColeta) || 0), 0)).toLocaleString()} <span className="text-[8px] text-gray-400 font-normal">FEU</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-red-50 dark:bg-red-950/20 p-2.5 rounded-lg border border-red-100 dark:border-red-900/30">
                    <p className="text-[10px] text-red-800 dark:text-red-300 font-medium leading-relaxed">
                      {language === 'zh' ? (
                        <span>请在下方选择并配置各个堆场和CD的实际参数。</span>
                      ) : language === 'pt' ? (
                        <span>Escolha um pátio no seletor abaixo para atualizar seus valores de capacidade, estoque e total anterior de contêineres.</span>
                      ) : (
                        <>
                          <span className="font-extrabold text-[10.5px] text-red-950 dark:text-red-200 block">请在下方选择并配置各个堆场和CD的实际参数。</span>
                          <span className="opacity-85 block mt-0.5">Escolha um pátio no seletor abaixo para atualizar seus valores de capacidade, estoque e total anterior de contêineres.</span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* SELECTOR DE PÁTIO ATIVO */}
                  <div className="space-y-1.5 font-sans">
                    <label className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider block">
                      {language === 'bilingual' ? 'Selecione o Pátio para Configurar / 选择堆场进行配置' : language === 'zh' ? '选择堆场进行配置' : 'Selecione o Pátio para Configurar'}
                    </label>
                    <select
                      value={activeYardKey}
                      onChange={(e) => setActiveYardKey(e.target.value)}
                      className="w-full text-xs font-bold border border-gray-200 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-red-500 outline-hidden"
                    >
                      {(Object.entries(yards) as [string, Yard][]).map(([key, y]) => (
                        <option key={key} value={key}>
                          {y.name} ({y.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* FORMULÁRIO DE EDIÇÃO DO PÁTIO ATIVO */}
                  {(() => {
                    const yard = yards[activeYardKey];
                    if (!yard) return null;
                    return (
                      <div className="p-3 border border-red-150 dark:border-red-950/40 rounded-xl bg-red-50/10 dark:bg-red-950/5 space-y-3 font-sans">
                        <div className="flex justify-between items-center border-b border-red-100 dark:border-red-950/40 pb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-xs text-red-950 dark:text-red-200">{yard.name}</span>
                            <span className="text-[8.5px] bg-red-600/10 text-red-700 dark:text-red-400 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wide">{yard.type}</span>
                          </div>
                          <button 
                            type="button"
                            onClick={() => {
                              deleteYard(activeYardKey);
                              // Fallback to first available yard key
                              const keys = Object.keys(yards).filter(k => k !== activeYardKey);
                              if (keys.length > 0) setActiveYardKey(keys[0]);
                            }}
                            title="Excluir Pátio / 删除堆场"
                            className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1 rounded hover:bg-red-55 dark:hover:bg-red-950/40 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-slate-800 dark:text-slate-100">
                          <div>
                            <label className="text-[9px] text-gray-500 dark:text-gray-400 font-black uppercase block mb-1">Capacidade / 总容量</label>
                            <input 
                              type="number" 
                              value={yard.capacity} 
                              onChange={(e) => handleYardChange(activeYardKey, 'capacity', e.target.value)}
                              className="w-full text-xs font-bold border border-gray-200 dark:border-slate-700 rounded p-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-red-500 outline-hidden"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-blue-600 dark:text-blue-400 font-black uppercase block mb-1">Cheio / 重箱 (FEU)</label>
                            <input 
                              type="number" 
                              value={yard.cheio} 
                              onChange={(e) => handleYardChange(activeYardKey, 'cheio', e.target.value)}
                              className="w-full text-xs font-bold border border-gray-200 dark:border-slate-700 rounded p-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-red-500 outline-hidden"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-slate-500 dark:text-slate-400 font-black uppercase block mb-1">Vazio / 空箱 (FEU)</label>
                            <input 
                              type="number" 
                              value={yard.vazio} 
                              onChange={(e) => handleYardChange(activeYardKey, 'vazio', e.target.value)}
                              className="w-full text-xs font-bold border border-gray-200 dark:border-slate-700 rounded p-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-red-500 outline-hidden"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-slate-500 dark:text-slate-400 font-black uppercase block mb-1">Porto / 港口 (FEU)</label>
                            <input 
                              type="number" 
                              value={yard.porto} 
                              onChange={(e) => handleYardChange(activeYardKey, 'porto', e.target.value)}
                              className="w-full text-xs font-bold border border-gray-200 dark:border-slate-700 rounded p-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-red-500 outline-hidden"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-amber-600 dark:text-amber-400 font-black uppercase block mb-1">Pronto Coleta / 待提</label>
                            <input 
                              type="number" 
                              value={yard.prontoColeta} 
                              onChange={(e) => handleYardChange(activeYardKey, 'prontoColeta', e.target.value)}
                              className="w-full text-xs font-bold border border-gray-200 dark:border-slate-700 rounded p-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-red-500 outline-hidden"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-emerald-600 dark:text-emerald-400 font-black uppercase block mb-1">Delivered / 交付</label>
                            <input 
                              type="number" 
                              value={yard.delivered} 
                              onChange={(e) => handleYardChange(activeYardKey, 'delivered', e.target.value)}
                              className="w-full text-xs font-bold border border-gray-200 dark:border-slate-700 rounded p-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-red-500 outline-hidden"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-[9px] text-rose-600 dark:text-rose-400 font-black uppercase block mb-1">Prev Total / 上期总量 (FEU)</label>
                            <input 
                              type="number" 
                              value={yard.previous_total !== undefined ? yard.previous_total : 0} 
                              onChange={(e) => handleYardChange(activeYardKey, 'previous_total', e.target.value)}
                              className="w-full text-xs font-bold border border-gray-200 dark:border-slate-700 rounded p-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-red-500 outline-hidden"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* COLLAPSIBLE CRIAR NOVO PÁTIO */}
                  <div className="border border-gray-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
                    <button
                      type="button"
                      onClick={() => setShowAddYardForm(!showAddYardForm)}
                      className="w-full p-3 bg-white dark:bg-slate-900 text-left font-extrabold text-[10.5px] uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5 text-red-500" />
                        {language === 'bilingual' ? 'Criar Novo Pátio / 增加新堆场' : language === 'zh' ? '增加新堆场' : 'Criar Novo Pátio'}
                      </span>
                      <span className="text-gray-400 font-black">{showAddYardForm ? '−' : '+'}</span>
                    </button>
                    
                    {showAddYardForm && (
                      <form onSubmit={addYard} className="p-3 border-t border-gray-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 space-y-2.5 text-[10.5px]">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[8.5px] text-slate-500 dark:text-slate-400 font-bold uppercase block mb-0.5">Nome do Pátio / 堆场名称</label>
                            <input 
                              type="text" 
                              placeholder="NOME / 名称"
                              value={newYardName}
                              onChange={(e) => setNewYardName(e.target.value)}
                              className="w-full text-xs font-bold border border-gray-200 dark:border-slate-700 rounded p-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 uppercase outline-hidden"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[8.5px] text-slate-500 dark:text-slate-400 font-bold uppercase block mb-0.5">Tipo / 堆场类型</label>
                            <select 
                              value={newYardType}
                              onChange={(e) => setNewYardType(e.target.value)}
                              className="w-full text-xs font-bold border border-gray-200 dark:border-slate-700 rounded p-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 uppercase outline-hidden"
                            >
                              <option value="BONDED">BONDED / 关内</option>
                              <option value="WAREHOUSE">CD & WAREHOUSE / 仓库</option>
                              <option value="BUFFER">BUFFER / 缓冲区</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-slate-800 dark:text-slate-100">
                          <div>
                            <label className="text-[8px] text-gray-500 dark:text-gray-400 font-bold uppercase block mb-0.5">Capacity / 容积</label>
                            <input 
                              type="number" 
                              placeholder="2000"
                              value={newYardCapacity}
                              onChange={(e) => setNewYardCapacity(Number(e.target.value) || 0)}
                              className="w-full text-xs font-bold border border-gray-200 dark:border-slate-700 rounded p-1 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                              min="0"
                            />
                          </div>
                          <div>
                            <label className="text-[8px] text-blue-500 dark:text-blue-400 font-bold uppercase block mb-0.5">Cheio / 重箱</label>
                            <input 
                              type="number" 
                              placeholder="500"
                              value={newYardCheio}
                              onChange={(e) => setNewYardCheio(Number(e.target.value) || 0)}
                              className="w-full text-xs font-bold border border-gray-200 dark:border-slate-700 rounded p-1 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                              min="0"
                            />
                          </div>
                          <div>
                            <label className="text-[8px] text-slate-500 dark:text-slate-400 font-bold uppercase block mb-0.5">Vazio / 空箱</label>
                            <input 
                              type="number" 
                              placeholder="100"
                              value={newYardVazio}
                              onChange={(e) => setNewYardVazio(Number(e.target.value) || 0)}
                              className="w-full text-xs font-bold border border-gray-200 dark:border-slate-700 rounded p-1 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                              min="0"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-slate-800 dark:text-slate-100">
                          <div>
                            <label className="text-[8px] text-gray-500 dark:text-gray-400 font-bold uppercase block mb-0.5">Porto / 港口</label>
                            <input 
                              type="number" 
                              placeholder="50"
                              value={newYardPorto}
                              onChange={(e) => setNewYardPorto(Number(e.target.value) || 0)}
                              className="w-full text-xs font-bold border border-gray-200 dark:border-slate-700 rounded p-1 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                              min="0"
                            />
                          </div>
                          <div>
                            <label className="text-[8px] text-blue-500 dark:text-blue-400 font-bold uppercase block mb-0.5">Coleta / 待提</label>
                            <input 
                              type="number" 
                              placeholder="120"
                              value={newYardProntoColeta}
                              onChange={(e) => setNewYardProntoColeta(Number(e.target.value) || 0)}
                              className="w-full text-xs font-bold border border-gray-200 dark:border-slate-700 rounded p-1 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                              min="0"
                            />
                          </div>
                          <div>
                            <label className="text-[8px] text-emerald-500 dark:text-emerald-400 font-bold uppercase block mb-0.5">Deliv / 交付</label>
                            <input 
                              type="number" 
                              placeholder="80"
                              value={newYardDelivered}
                              onChange={(e) => setNewYardDelivered(Number(e.target.value) || 0)}
                              className="w-full text-xs font-bold border border-gray-200 dark:border-slate-700 rounded p-1 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                              min="0"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[8px] text-rose-500 dark:text-rose-400 font-bold uppercase block mb-0.5">Prev Total / 上期总量 (FEU)</label>
                          <input 
                            type="number" 
                            placeholder="1000"
                            value={newYardPreviousTotal}
                            onChange={(e) => setNewYardPreviousTotal(Number(e.target.value) || 0)}
                            className="w-full text-xs font-bold border border-gray-200 dark:border-slate-700 rounded p-1 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                            min="0"
                          />
                        </div>

                        <button 
                          type="submit"
                          className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold text-[10px] py-1.5 rounded uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          {language === 'zh' ? '添加堆场' : language === 'pt' ? 'Adicionar Pátio' : 'Adicionar Pátio / 添加'}
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: STOCK (ESTOQUE DETALHADO DE CADA ÁREA) */}
              {activeTab === 'stock' && (
                <div className="space-y-4 text-slate-800 dark:text-slate-200 font-sans">
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
                    <p className="text-[10px] text-emerald-800 dark:text-emerald-300 font-medium leading-relaxed">
                      {language === 'zh' ? (
                        <span>在这里，您可以像在“Detalhamento de Área”中一样管理各个堆场的集装箱明细。</span>
                      ) : language === 'pt' ? (
                        <span>Gerencie o detalhamento do estoque físico por área. É o mesmo que preencher no detalhamento do painel principal, agora diretamente no controlador lateral.</span>
                      ) : (
                        <>
                          <span className="font-extrabold text-[10.5px] text-emerald-950 dark:text-emerald-200 block">在这里，您可以像在“Detalhamento de Área”中一样管理各个堆场的集装箱明细。</span>
                          <span className="opacity-85 block mt-0.5">Gerencie o detalhamento do estoque físico por área. É o mesmo que preencher no detalhamento do painel principal, agora diretamente no controlador lateral.</span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* SELETOR DE ÁREA PARA O ESTOQUE */}
                  <div className="space-y-1.5 font-sans">
                    <label className="text-[9px] text-slate-500 dark:text-slate-400 font-extrabold uppercase block tracking-wider">
                      {language === 'bilingual' ? 'Selecionar Área / 选择堆场区域' : language === 'zh' ? '选择堆场区域' : 'Selecionar Área'}
                    </label>
                    <select
                      value={stockSelectedYardKey}
                      onChange={(e) => setStockSelectedYardKey(e.target.value)}
                      className="w-full text-xs font-bold border border-gray-200 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-hidden focus:ring-1 focus:ring-emerald-500"
                    >
                      {(Object.entries(yards) as [string, Yard][]).map(([key, y]) => (
                        <option key={key} value={key}>
                          {y.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* HIGH-LEVEL KPI METRICS FOR SELECTED STOCK AREA */}
                  {(() => {
                    const stockYard = yards[stockSelectedYardKey];
                    if (!stockYard) return null;
                    const occupied = Number(stockYard.cheio || 0) + Number(stockYard.vazio || 0);
                    const stockYardOcupacao = stockYard.capacity > 0 
                      ? Math.min(100, Math.round((occupied / stockYard.capacity) * 100)) 
                      : 0;
                    return (
                      <div className="grid grid-cols-3 gap-1.5 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px] text-slate-800 dark:text-slate-200">
                        <div>
                          <span className="text-[8px] text-gray-400 dark:text-gray-500 font-extrabold uppercase block">{language === 'bilingual' ? 'Capacidade / 容量' : language === 'zh' ? '容量' : 'Capacidade'}</span>
                          <span className="font-mono font-bold text-gray-800 dark:text-slate-100">{(stockYard.capacity || 0).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-gray-400 dark:text-gray-500 font-extrabold uppercase block">{language === 'bilingual' ? 'Ocupação / 占用' : language === 'zh' ? '占用' : 'Ocupação'}</span>
                          <span className={`font-bold px-1 rounded ${
                            stockYardOcupacao >= 89 
                              ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' 
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}>{stockYardOcupacao}%</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-gray-400 dark:text-gray-500 font-extrabold uppercase block">{language === 'bilingual' ? 'Cheios / 重箱' : language === 'zh' ? '重箱' : 'Cheios'}</span>
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{(stockYard.cheio || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* PESQUISA E FILTROS */}
                  <div className="space-y-1.5 bg-slate-50/50 dark:bg-slate-900/40 p-2.5 rounded-lg border border-gray-200 dark:border-slate-800">
                    <input
                      type="text"
                      value={stockContainerSearch}
                      onChange={(e) => setStockContainerSearch(e.target.value)}
                      placeholder={language === 'bilingual' ? "Pesquisar contêiner... / 搜索箱号..." : language === 'zh' ? "搜索箱号..." : "Pesquisar contêiner..."}
                      className="w-full text-xs font-bold border border-gray-200 dark:border-slate-700 rounded p-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-hidden focus:ring-1 focus:ring-emerald-500"
                    />
                    <div className="grid grid-cols-2 gap-1.5">
                      <select
                        value={stockContainerStatusFilter}
                        onChange={(e) => setStockContainerStatusFilter(e.target.value)}
                        className="text-[10px] font-bold border border-gray-200 dark:border-slate-700 rounded p-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-hidden"
                      >
                        <option value="ALL">Status: {language === 'bilingual' ? 'Todos / 全部' : language === 'zh' ? '全部' : 'Todos'}</option>
                        <option value="CHEIO">CHEIO / 重箱</option>
                        <option value="VAZIO">VAZIO / 空箱</option>
                      </select>
                      <select
                        value={stockContainerCategoryFilter}
                        onChange={(e) => setStockContainerCategoryFilter(e.target.value)}
                        className="text-[10px] font-bold border border-gray-200 dark:border-slate-700 rounded p-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-hidden"
                      >
                        <option value="ALL">Cat: {language === 'bilingual' ? 'Todos / 全部' : language === 'zh' ? '全部' : 'Todos'}</option>
                        <option value="GERAL">GERAL / 通用</option>
                        <option value="PORTO">PORTO / 港口</option>
                        <option value="PRONTO_COLETA">PRONTO / 待提</option>
                        <option value="DELIVERED">DELIVERED / 交付</option>
                      </select>
                    </div>
                  </div>

                  {/* CONTAINER LIST TABLE */}
                  {(() => {
                    const activeContainers = containers.filter(c => {
                      if (c.yardId !== stockSelectedYardKey) return false;
                      if (stockContainerSearch && !c.id.toLowerCase().includes(stockContainerSearch.toLowerCase())) return false;
                      if (stockContainerStatusFilter !== 'ALL' && c.status !== stockContainerStatusFilter) return false;
                      if (stockContainerCategoryFilter !== 'ALL' && c.category !== stockContainerCategoryFilter) return false;
                      return true;
                    });

                    return (
                      <div className="space-y-3">
                        <div className="border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900 max-h-[160px] overflow-y-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-800 text-[8.5px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-extrabold border-b border-gray-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900">
                                <th className="p-1.5 pl-2">{language === 'bilingual' ? 'Contêiner / 箱号' : language === 'zh' ? '箱号' : 'Contêiner'}</th>
                                <th className="p-1.5">{language === 'bilingual' ? 'Status / Size' : language === 'zh' ? '状态 / 尺寸' : 'Status'}</th>
                                <th className="p-1.5 text-center">{language === 'bilingual' ? 'Ações / 操作' : language === 'zh' ? '操作' : 'Ações'}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-[10.5px]">
                              {activeContainers.map((c) => (
                                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 font-bold text-slate-800 dark:text-slate-200">
                                  <td className="p-1.5 pl-2 font-mono">
                                    <div className="tracking-tight">{c.id}</div>
                                    <div className="text-[8px] text-gray-400 dark:text-gray-500 font-sans tracking-tight">{c.category} • {c.vesselName || 'N/A'}</div>
                                  </td>
                                  <td className="p-1.5">
                                    <span className={`text-[8px] px-1 py-0.2 rounded font-extrabold uppercase ${
                                      c.status === 'CHEIO' 
                                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' 
                                        : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400'
                                    }`}>{c.status}</span>
                                    <span className="text-[8px] text-slate-500 dark:text-slate-400 ml-1 font-mono">{c.size}</span>
                                  </td>
                                  <td className="p-1.5 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteContainer(c)}
                                      className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                              {activeContainers.length === 0 && (
                                <tr>
                                  <td colSpan={3} className="p-4 text-center text-slate-400 dark:text-slate-500 text-[10px]">
                                    {language === 'bilingual' ? 'Nenhum contêiner cadastrado. / 无已登记集装箱。' : language === 'zh' ? '无已登记集装箱。' : 'Nenhum contêiner cadastrado.'}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* REGISTRO DE CONTÊINER NA ABA */}
                        <div className="p-3 bg-emerald-500/5 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/50 rounded-xl space-y-2.5">
                          <h4 className="font-extrabold text-[10.5px] uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                            <Plus className="w-3.5 h-3.5" />
                            <span>{language === 'bilingual' ? 'Cadastrar Novo Contêiner / 登记新箱' : language === 'zh' ? '登记新箱' : 'Cadastrar Novo Contêiner'}</span>
                          </h4>
                          <form onSubmit={handleAddContainer} className="space-y-2 text-[10px] font-sans">
                            <div>
                              <label className="text-[8px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-extrabold block mb-0.5">ID do Contêiner / 箱号</label>
                              <input
                                type="text"
                                required
                                value={newContainerId}
                                onChange={(e) => setNewContainerId(e.target.value)}
                                placeholder="Ex: BYDU1234567"
                                className="w-full border border-gray-200 dark:border-slate-700 rounded p-1.5 font-mono text-xs font-bold uppercase bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-hidden focus:ring-1 focus:ring-emerald-500"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              <div>
                                <label className="text-[8px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-extrabold block mb-0.5">Tamanho / 尺寸</label>
                                <select
                                  value={newContainerSize}
                                  onChange={(e) => setNewContainerSize(e.target.value)}
                                  className="w-full border border-gray-200 dark:border-slate-700 rounded p-1 bg-white dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-100 outline-hidden"
                                >
                                  <option value="20' GP">20' GP</option>
                                  <option value="40' HC">40' HC</option>
                                  <option value="40' OT">40' OT</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[8px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-extrabold block mb-0.5">Status / 状态</label>
                                <select
                                  value={newContainerStatus}
                                  onChange={(e) => setNewContainerStatus(e.target.value as any)}
                                  className="w-full border border-gray-200 dark:border-slate-700 rounded p-1 bg-white dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-100 outline-hidden"
                                >
                                  <option value="CHEIO">CHEIO / 重箱</option>
                                  <option value="VAZIO">VAZIO / 空箱</option>
                                </select>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              <div>
                                <label className="text-[8px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-extrabold block mb-0.5">Categoria / 类别</label>
                                <select
                                  value={newContainerCategory}
                                  onChange={(e) => setNewContainerCategory(e.target.value as any)}
                                  className="w-full border border-gray-200 dark:border-slate-700 rounded p-1 bg-white dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-100 outline-hidden text-[9.5px]"
                                >
                                  <option value="GERAL">GERAL / 通用</option>
                                  <option value="PORTO">PORTO / 港口</option>
                                  <option value="PRONTO_COLETA">PRONTO / 待提</option>
                                  <option value="DELIVERED">DELIVERED / 交付</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[8px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-extrabold block mb-0.5">Navio / 船舶</label>
                                <select
                                  value={newContainerVessel}
                                  onChange={(e) => setNewContainerVessel(e.target.value)}
                                  className="w-full border border-gray-200 dark:border-slate-700 rounded p-1 bg-white dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-100 outline-hidden text-[9.5px]"
                                >
                                  <option value="N/A">N/A</option>
                                  {vessels.map(v => (
                                    <option key={v.id} value={v.name}>{v.name}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <button
                              type="submit"
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold p-1.5 rounded text-xs transition-colors cursor-pointer"
                            >
                              {language === 'bilingual' ? 'Adicionar Contêiner / 添加' : language === 'zh' ? '添加' : 'Adicionar Contêiner'}
                            </button>
                          </form>
                        </div>

                        {/* EXCEL IMPORT INTERFACE */}
                        <div className="p-3 bg-blue-500/5 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/50 rounded-xl space-y-2">
                          <h4 className="font-extrabold text-[10.5px] uppercase tracking-wider text-blue-800 dark:text-blue-400 flex items-center gap-1.5">
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            <span>{language === 'bilingual' ? 'Planilha Excel / 导入表格' : language === 'zh' ? '导入表格' : 'Planilha Excel'}</span>
                          </h4>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              onClick={handleDownloadTemplate}
                              className="flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-1.5 rounded text-[10px] cursor-pointer"
                            >
                              <Download className="w-3 h-3" />
                              <span>{language === 'bilingual' ? 'Modelo / 模板' : language === 'zh' ? '模板' : 'Modelo'}</span>
                            </button>
                            <label className="flex items-center justify-center gap-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-1 px-1.5 rounded text-[10px] cursor-pointer text-center">
                              <Upload className="w-3 h-3" />
                              <span>{language === 'bilingual' ? 'Importar / 导入' : language === 'zh' ? '导入' : 'Importar'}</span>
                              <input
                                id="excel_upload_input_stock"
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={handleImportExcel}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* TAB: NAVIOS */}
              {activeTab === 'vessels' && (
                <div className="space-y-4 text-slate-800 dark:text-slate-200">
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-100 dark:border-blue-900/50">
                    <p className="text-[11px] text-blue-800 dark:text-blue-300 font-medium flex flex-col gap-1.5">
                      {language === 'zh' ? (
                        <span>在此配置显示在看板右侧表格中的预计到港船舶计划。</span>
                      ) : language === 'pt' ? (
                        <span>Configure a escala dos navios que aparecem na tabela à direita do painel.</span>
                      ) : (
                        <>
                          <span className="font-extrabold text-[12px] text-slate-900 dark:text-slate-100 block leading-normal">在此配置显示在看板右侧表格中的预计到港船舶计划。</span>
                          <span className="text-[10.5px] block opacity-85 leading-tight">Configure a escala dos navios que aparecem na tabela à direita do painel.</span>
                        </>
                      )}
                    </p>
                  </div>

                  <form onSubmit={addVessel} className="p-3 border border-dashed border-gray-200 dark:border-slate-800 rounded-lg bg-gray-50/50 dark:bg-slate-900/50 space-y-2">
                    <span className="text-[10px] font-black text-gray-500 dark:text-gray-450 uppercase block">Novo Navio / 新到船舶</span>
                    <input 
                      type="text" 
                      placeholder="NOME DO NAVIO / 船名"
                      value={newVesselName}
                      onChange={(e) => setNewVesselName(e.target.value)}
                      className="w-full text-xs font-bold border border-gray-200 dark:border-slate-700 rounded p-1.5 bg-white dark:bg-slate-800 uppercase text-slate-800 dark:text-slate-100 outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        type="text" 
                        placeholder="ETA / 预计到港"
                        value={newVesselEta}
                        onChange={(e) => setNewVesselEta(e.target.value)}
                        className="w-full text-xs font-bold border border-gray-200 dark:border-slate-700 rounded p-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-hidden focus:ring-1 focus:ring-blue-500"
                      />
                      <input 
                        type="number" 
                        placeholder="Qtd Cntrs / 箱量"
                        value={newVesselCntrs}
                        onChange={(e) => setNewVesselCntrs(Number(e.target.value))}
                        className="w-full text-xs font-bold border border-gray-200 dark:border-slate-700 rounded p-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-hidden focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <button 
                      type="submit"
                      className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar / 增加
                    </button>
                  </form>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center pb-1">
                      <span className="text-xs font-bold text-gray-700 dark:text-slate-300">Lista Cadastrada / 计划列表:</span>
                      <button
                        type="button"
                        onClick={autoSortVesselsByDate}
                        className="text-[10px] bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 font-extrabold px-2 py-1 rounded transition-all cursor-pointer flex items-center gap-1 uppercase"
                        title="Ordena os navios automaticamente com base na data do ETA / 基于预计到港日期自动排序"
                      >
                        <Sparkles className="w-3 h-3 text-[#d97706] animate-pulse" />
                        {language === 'zh' ? '按预计日期排序' : language === 'pt' ? 'Ordenar por Data' : 'Ordenar p/ Data / 自动排序'}
                      </button>
                    </div>

                    {vessels.map(v => (
                      <div key={v.id} className="p-2 border border-gray-150 dark:border-slate-800 rounded flex justify-between items-center text-xs bg-white dark:bg-slate-900">
                        <div className="flex-1">
                          <p className="font-extrabold text-gray-800 dark:text-slate-100">{v.name}</p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">ETA: {v.eta} | Qtd: {v.cntrs}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {/* Botões de Direção (Up/Down) */}
                          <button
                            type="button"
                            onClick={() => shiftVessel(v.id, 'up')}
                            className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800/40 rounded cursor-pointer transition-colors"
                            title="Mover para cima / 上移"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => shiftVessel(v.id, 'down')}
                            className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800/40 rounded cursor-pointer transition-colors"
                            title="Mover para baixo / 下移"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>

                          {/* Botão de Excluir */}
                          <button 
                            type="button"
                            onClick={() => deleteVessel(v.id)}
                            className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded cursor-pointer transition-colors"
                            title="Excluir Navio / 删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: GRÁFICOS */}
              {activeTab === 'charts' && (
                <div className="space-y-4 text-slate-800 dark:text-slate-200 font-sans">
                  
                  {/* COEFICIENTE DE BACKLOG */}
                  <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-100 dark:border-amber-900/50 space-y-2">
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium flex flex-col gap-1">
                      {language === 'zh' ? (
                        <span>通过调整下方的积压系数，模拟物流危机或快速消箱。</span>
                      ) : language === 'pt' ? (
                        <span>Simule crises logísticas ou reduções rápidas ajustando o multiplicador de backlog abaixo.</span>
                      ) : (
                        <>
                          <span className="font-extrabold text-[12px] text-amber-950 dark:text-amber-200 block">通过调整下方的积压系数，模拟物流危机或快速消箱。</span>
                          <span className="text-[10px] block opacity-85 leading-tight">Simule crises logísticas ou reduções rápidas ajustando o multiplicador de backlog abaixo.</span>
                        </>
                      )}
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button 
                        onClick={() => applyMultiplierToBacklog(1.3)} 
                        className="py-1 bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-bold rounded text-[10px] hover:bg-red-200 dark:hover:bg-red-900/40 transition-all cursor-pointer font-sans"
                      >
                        {language === 'bilingual' ? 'Aumento / 增加 +30%' : language === 'zh' ? '增加 +30%' : 'Aumento +30%'}
                      </button>
                      <button 
                        onClick={() => applyMultiplierToBacklog(0.7)} 
                        className="py-1 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold rounded text-[10px] hover:bg-emerald-200 dark:hover:bg-emerald-900/40 transition-all cursor-pointer font-sans"
                      >
                        {language === 'bilingual' ? 'Redução / 减少 -30%' : language === 'zh' ? '减少 -30%' : 'Redução -30%'}
                      </button>
                    </div>
                  </div>

                  {/* SEÇÃO CHART LEFT: SEMANAS / BACKLOG */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-900/40 space-y-3.5">
                    <div className="flex items-center gap-1.5 border-b pb-1.5 border-slate-200 dark:border-slate-800">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-black text-slate-850 dark:text-slate-200 uppercase">
                        {language === 'zh' ? '每周积压与到港管理 (图表1)' : language === 'pt' ? 'Gerenciar semanas e backlog (Gráfico 1)' : 'Semanas & Backlog (Gráfico 1)'}
                      </span>
                    </div>

                    {/* Cadastrar Nova Semana Formulário */}
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleAddChartLeft(newWeekName, newWeekArrivals, newWeekBacklog);
                        // Auto-increment standard W numbers
                        const match = newWeekName.match(/^W(\d+)$/);
                        if (match) {
                          const nextNum = parseInt(match[1]) + 1;
                          setNewWeekName(`W${nextNum}`);
                        }
                      }}
                      className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2 text-[11px]"
                    >
                      <div className="font-extrabold text-[#111827] dark:text-slate-200 mb-1">
                        {language === 'zh' ? '➕ 添加新周数据' : language === 'pt' ? '➕ Cadastrar nova semana' : '➕ Cadastrar nova semana / 添加新周数据'}
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <div className="space-y-0.5">
                          <label className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase block">Semana / 周</label>
                          <input 
                            type="text"
                            value={newWeekName}
                            onChange={(e) => setNewWeekName(e.target.value)}
                            required
                            placeholder="W30"
                            className="w-full text-center border border-slate-200 dark:border-slate-700 rounded p-1 font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 focus:ring-1 focus:ring-slate-400 outline-none"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase block">ETA / 到港</label>
                          <input 
                            type="number"
                            value={newWeekArrivals}
                            onChange={(e) => setNewWeekArrivals(Math.max(0, Number(e.target.value)))}
                            required
                            className="w-full text-center border border-slate-200 dark:border-slate-700 rounded p-1 font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 focus:ring-1 focus:ring-slate-400 outline-none"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase block">Backlog / 积压</label>
                          <input 
                            type="number"
                            value={newWeekBacklog}
                            onChange={(e) => setNewWeekBacklog(Math.max(0, Number(e.target.value)))}
                            required
                            className="w-full text-center border border-slate-200 dark:border-slate-700 rounded p-1 font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 focus:ring-1 focus:ring-slate-400 outline-none"
                          />
                        </div>
                      </div>
                      <button 
                        type="submit"
                        className="w-full py-1 bg-slate-800 hover:bg-slate-900 dark:bg-slate-750 dark:hover:bg-slate-600 text-white rounded font-bold text-[10px] uppercase transition-all cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> {language === 'zh' ? '添加周数据' : language === 'pt' ? 'Adicionar Semana' : 'Adicionar Semana / 添加'}
                      </button>
                    </form>

                    {/* Lista Sincronizada de Semanas */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black text-gray-500 dark:text-gray-450 uppercase tracking-wider block">
                        {language === 'zh' ? '📚 已配置周列表 (可滚动/可编辑)' : '📚 Semanas Configuradas (Lista Editável/Rolável):'}
                      </span>
                      <div className="max-h-56 overflow-y-auto pr-1 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 bg-white dark:bg-slate-900 space-y-1.5 shadow-inner">
                        {chartLeft.map((item, idx) => (
                           <div key={`edit-left-${idx}`} className="p-1.5 border border-slate-250 dark:border-slate-800 rounded bg-slate-50/50 dark:bg-slate-900/50 flex flex-col gap-1 text-[11px]">
                            <div className="flex justify-between items-center bg-slate-200/50 dark:bg-slate-800/50 px-1.5 py-0.5 rounded">
                              <span className="font-extrabold text-slate-800 dark:text-slate-100 font-mono">{item.week}</span>
                              <button 
                                type="button" 
                                onClick={() => handleDeleteChartLeft(idx)}
                                className="p-0.5 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500 rounded transition-all cursor-pointer"
                                title="Deletar semana"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[9px] text-gray-400 font-bold uppercase">ATA:</span>
                                <input 
                                  type="number"
                                  value={item.arrivals}
                                  onChange={(e) => handleChartLeftChange(idx, 'arrivals', e.target.value)}
                                  className="w-16 text-center border border-slate-200 dark:border-slate-750 rounded font-mono p-0.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 font-bold outline-none"
                                />
                              </div>
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[9px] text-gray-400 font-bold uppercase">Backlog:</span>
                                <input 
                                  type="number"
                                  value={item.backlog}
                                  onChange={(e) => handleChartLeftChange(idx, 'backlog', e.target.value)}
                                  className="w-16 text-center border border-slate-200 dark:border-slate-750 rounded font-mono p-0.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 font-bold outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* SEÇÃO CHART RIGHT: ENTREGAS DIÁRIAS */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-900/40 space-y-3.5">
                    <div className="flex items-center gap-1.5 border-b pb-1.5 border-slate-200 dark:border-slate-800">
                      <Database className="w-4 h-4 text-cyan-500" />
                      <span className="text-xs font-black text-slate-850 dark:text-slate-200 uppercase">
                        {language === 'zh' ? '每日出境交付数据配置 (图表2)' : language === 'pt' ? 'Configurar Entregas Diárias (Gráfico 2)' : 'Entregas Diárias (Gráfico 2)'}
                      </span>
                    </div>

                    {/* Cadastrar Nova Entrega Formulário */}
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleAddChartRight(newDeliveryDate, newDeliveryValue, newDeliveryType);
                      }}
                      className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2 text-[11px]"
                    >
                      <div className="font-extrabold text-[#111827] dark:text-slate-200 mb-1">
                        {language === 'zh' ? '➕ 添加每日交付数据' : language === 'pt' ? '➕ Cadastrar nova entrega' : '➕ Cadastrar nova entrega / 添加每日交付数据'}
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <div className="space-y-0.5">
                          <label className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase block">{language === 'zh' ? '日期' : 'Data Ex.'}</label>
                          <input 
                            type="text"
                            value={newDeliveryDate}
                            onChange={(e) => setNewDeliveryDate(e.target.value)}
                            required
                            placeholder="21/05"
                            className="w-full text-center border border-slate-200 dark:border-slate-700 rounded p-1 font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 focus:ring-1 focus:ring-slate-400 outline-none"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase block">{language === 'zh' ? '类型' : 'Tipo'}</label>
                          <select 
                            value={newDeliveryType}
                            onChange={(e) => setNewDeliveryType(e.target.value)}
                            className="w-full text-center border border-slate-200 dark:border-slate-700 rounded p-1 font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 focus:ring-1 focus:ring-slate-400 outline-none"
                          >
                            <option value="A">Tipo A (Stable)</option>
                            <option value="B">Tipo B (High)</option>
                            <option value="C">Tipo C (Normal)</option>
                          </select>
                        </div>
                      </div>
                      <button 
                        type="submit"
                        className="w-full py-1 bg-slate-800 hover:bg-slate-900 dark:bg-slate-750 dark:hover:bg-slate-600 text-white rounded font-bold text-[10px] uppercase transition-all cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> {language === 'zh' ? '添加交付数据' : language === 'pt' ? 'Adicionar Entrega' : 'Adicionar Entrega / 添加'}
                      </button>
                    </form>

                    {/* Lista Sincronizada de Entregas Diárias */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black text-gray-500 dark:text-gray-450 uppercase tracking-wider block">
                        {language === 'zh' ? '📚 已配置交付列表 (可滚动/可编辑)' : '📚 Entregas Cadastradas (Lista Editável/Rolável):'}
                      </span>
                      <div className="max-h-56 overflow-y-auto pr-1 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 bg-white dark:bg-slate-900 space-y-1.5 shadow-inner">
                        {chartRight.map((item, idx) => (
                          <div key={`edit-right-${idx}`} className="p-1.5 border border-slate-250 dark:border-slate-800 rounded bg-slate-50/50 dark:bg-slate-900/50 flex flex-col gap-1 text-[11px]">
                            <div className="flex justify-between items-center bg-slate-200/50 dark:bg-slate-800/50 px-1.5 py-0.5 rounded">
                              <span className="font-extrabold text-indigo-900 dark:text-indigo-300 font-mono">{item.date}</span>
                              <button 
                                type="button" 
                                onClick={() => handleDeleteChartRight(idx)}
                                className="p-0.5 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500 rounded transition-all cursor-pointer"
                                title="Deletar entrega"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[9px] text-gray-400 font-bold uppercase">{language === 'zh' ? '数量:' : 'Valor:'}</span>
                                <input 
                                  type="number"
                                  value={item.value}
                                  onChange={(e) => handleChartRightChange(idx, 'value', e.target.value)}
                                  className="w-16 text-center border border-slate-200 dark:border-slate-750 rounded font-mono p-0.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 font-bold outline-none"
                                />
                              </div>
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[9px] text-gray-400 font-bold uppercase">{language === 'zh' ? '类型:' : 'Tipo:'}</span>
                                <select 
                                  value={item.type}
                                  onChange={(e) => handleChartRightChange(idx, 'type', e.target.value)}
                                  className="w-16 border border-slate-200 dark:border-slate-750 rounded font-mono p-0.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 font-bold text-center outline-none"
                                >
                                  <option value="A">A</option>
                                  <option value="B">B</option>
                                  <option value="C">C</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB: DEPÓSITOS */}
              {activeTab === 'depots' && (
                <div className="space-y-4 text-slate-800 dark:text-slate-200 font-sans">
                  
                  {/* DEPOTS LIST WITH CAPACITY CONTROLS */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                    <div className="flex items-center gap-1.5 border-b pb-1.5 border-slate-200 dark:border-slate-800">
                      <Sliders className="w-4 h-4 text-red-500" />
                      <span className="text-xs font-black text-slate-850 dark:text-slate-200 uppercase">
                        {language === 'zh' ? '协议堆存容量与通道状态' : language === 'pt' ? 'Capacidade de Depósitos e Portões' : 'Capacidade & Portões'}
                      </span>
                    </div>

                    <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                      {depots.map((depot, idx) => {
                        const utilPercent = depot.maxCapacity > 0 ? Math.round((depot.avgVolume / depot.maxCapacity) * 100) : 0;
                        const utilColor = utilPercent > 95 ? 'text-red-600 bg-red-50 dark:bg-red-950/35' : utilPercent > 75 ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/35' : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/35';
                        
                        return (
                          <div key={depot.id} className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 space-y-1.5">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">{depot.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] text-gray-400 font-bold uppercase">AVG: <strong className="text-slate-750 dark:text-gray-300 font-mono font-bold">{depot.avgVolume}</strong></span>
                                <span className={`text-[10px] font-mono font-extrabold px-1.5 py-0.2 rounded-md ${utilColor}`}>{utilPercent}%</span>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase block mb-0.5">Cap. Máxima / 最大容量</label>
                                <input 
                                  type="number"
                                  min="1"
                                  value={depot.maxCapacity}
                                  onChange={(e) => {
                                    const val = Math.max(1, Number(e.target.value));
                                    const next = [...depots];
                                    next[idx].maxCapacity = val;
                                    setDepots(next);
                                  }}
                                  className="w-full text-xs font-bold border border-slate-200 dark:border-slate-700 rounded p-1 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-center font-mono focus:ring-1 focus:ring-red-500 outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase block mb-0.5">Portão / 通道状态</label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = [...depots];
                                    next[idx].status = next[idx].status === 'Open' ? 'Closed' : 'Open';
                                    setDepots(next);
                                  }}
                                  className={`w-full py-1 text-xs font-black rounded text-center transition-colors border uppercase ${
                                    depot.status === 'Open'
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-400'
                                      : 'bg-red-50 border-red-250 text-red-700 dark:bg-red-950/20 dark:border-red-900/40 dark:text-red-400'
                                  }`}
                                >
                                  {depot.status === 'Open' ? (language === 'zh' ? '开启 / OPEN' : 'Aberto') : (language === 'zh' ? '关闭 / CLOSED' : 'Fechado')}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* SHIPOWNER MATRIX EDITOR */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                    <div className="flex items-center gap-1.5 border-b pb-1.5 border-slate-200 dark:border-slate-800">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-black text-slate-850 dark:text-slate-200 uppercase">
                        {language === 'zh' ? '船东协议配置 (矩阵)' : language === 'pt' ? 'Matriz de Compatibilidade (Armadores)' : 'Compatibilidade Armadores'}
                      </span>
                    </div>

                    <p className="text-[9.5px] text-gray-500 dark:text-gray-400 leading-tight">
                      {language === 'zh' ? '在下方矩阵中，直接选择各堆存点与船东的合作关系（授权、合约、禁止）。' : 'Selecione abaixo as regras de liberação de cada depósto para os principais armadores.'}
                    </p>

                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {Object.keys(depotMatrix).map((depotName) => (
                        <div key={depotName} className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 space-y-1.5">
                          <span className="text-[11px] font-black text-slate-800 dark:text-slate-100 block border-b pb-1 border-slate-100 dark:border-slate-800">{depotName}</span>
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                            {['MSC', 'Maersk', 'CMA CGM', 'Hapag-Lloyd', 'ONE', 'COSCO', 'Evergreen'].map((armador) => {
                              const currentVal = depotMatrix[depotName]?.[armador] || 'Authorized';
                              return (
                                <div key={armador} className="flex items-center justify-between gap-1 text-[10px]">
                                  <span className="font-bold text-gray-600 dark:text-slate-350">{armador}</span>
                                  <select
                                    value={currentVal}
                                    onChange={(e) => {
                                      const nextVal = e.target.value as any;
                                      setDepotMatrix(prev => ({
                                        ...prev,
                                        [depotName]: {
                                          ...(prev[depotName] || {}),
                                          [armador]: nextVal
                                        }
                                      }));
                                    }}
                                    className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border outline-none max-w-[90px] ${
                                      currentVal === 'Authorized'
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-400'
                                        : currentVal === 'Blocked'
                                        ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-900/40 dark:text-red-400'
                                        : 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900/40 dark:text-amber-400'
                                    }`}
                                  >
                                    <option value="Authorized">✅ Auth</option>
                                    <option value="Blocked">❌ Block</option>
                                    <option value="Contract Only">📝 Contract</option>
                                  </select>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* TAB: CONFIGURAÇÃO */}
              {activeTab === 'config' && (
                <div className="space-y-4 text-slate-800 dark:text-slate-200">
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 dark:text-gray-450 font-bold uppercase block">Título em PT / 葡萄牙语标题 (PT)</label>
                    <input 
                      type="text" 
                      value={slideTitlePT}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setSlideTitlePT(val);
                        updateGlobalDoc('slideTitlePT', val);
                      }}
                      className="w-full text-xs font-bold border border-gray-200 dark:border-slate-700 rounded p-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-red-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 dark:text-gray-450 font-bold uppercase block">Título em Mandarim / 中文标题 (ZH)</label>
                    <input 
                      type="text" 
                      value={slideTitleZH}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSlideTitleZH(val);
                        updateGlobalDoc('slideTitleZH', val);
                      }}
                      className="w-full text-xs font-bold border border-gray-200 dark:border-slate-700 rounded p-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-red-500 outline-none"
                    />
                  </div>

                  {/* SLIDE WIDTH CONTROL (SLIDER) */}
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] text-gray-500 dark:text-gray-450 font-bold uppercase block">Largura do Painel (Slide) / 看板演示宽度</label>
                      <span className="text-xs font-mono font-bold text-red-600 bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded-md">{slideWidth}px</span>
                    </div>
                    <input 
                      type="range" 
                      min="1200" 
                      max="1750" 
                      value={slideWidth}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setSlideWidth(val);
                        updateGlobalDoc('slideWidth', val);
                      }}
                      className="w-full h-1.5 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-600 mt-1"
                    />
                    <span className="text-[9.5px] text-gray-400 dark:text-gray-500 block leading-tight">Escolha dimensões maiores para dar mais espaço e evitar cortes de layout. / 设置更宽的看板以保证各区域不发生折叠折角。</span>
                  </div>

                  {/* SIDE PANEL WIDTH CONTROL (SLIDER) */}
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] text-gray-500 dark:text-gray-450 font-bold uppercase block">Largura do Painel de Edição / 侧栏编辑区宽度</label>
                      <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/20 px-2 py-0.5 rounded-md">{sidePanelWidth}px</span>
                    </div>
                    <input 
                      type="range" 
                      min="380" 
                      max="700" 
                      value={sidePanelWidth}
                      onChange={(e) => setSidePanelWidth(Number(e.target.value))}
                      className="w-full h-1.5 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600 mt-1"
                    />
                    <span className="text-[9.5px] text-gray-400 dark:text-gray-500 block leading-tight">Aumente para dar mais espaço à área de edição e evitar cortes ou quebras de linhas nas tabelas de dados. / 加宽侧框，防止编辑 data 被折叠遮挡。</span>
                  </div>

                   {/* CONFIGURAÇÃO DE AJUSTE AUTOMÁTICO DO CONTEÚDO */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between p-2.5 border border-emerald-100 dark:border-emerald-900/30 rounded-lg bg-emerald-50/40 dark:bg-emerald-950/10">
                      <div className="flex flex-col pr-2">
                        <span className="text-xs text-emerald-800 dark:text-emerald-450 font-bold">Auto-Ajustar à Tela / 自动自适应</span>
                        <span className="text-[9.5px] text-gray-400 dark:text-gray-500 leading-tight">Redimensiona o slide de forma automática para evitar cortes na tela. / 自动缩放演示区内容以完美适应您的屏幕窗口。</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={autoFit}
                        onChange={(e) => setAutoFit(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500 h-4.5 w-4.5 cursor-pointer accent-emerald-600"
                      />
                    </div>
                  </div>

                  {/* SLIDE CONTENT SCALE CONTROL (SLIDER) */}
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] text-gray-500 dark:text-gray-450 font-bold uppercase block">Zoom do Conteúdo / 内容缩放</label>
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${autoFit ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30' : 'text-blue-600 bg-blue-50 dark:bg-blue-950/20'}`}>
                        {Math.round(slideScale * 100)}% {autoFit && "(Auto)"}
                      </span>
                    </div>
                    <input 
                      type="range" 
                      min="0.45" 
                      max="1.2" 
                      step="0.01"
                      value={slideScale}
                      disabled={autoFit}
                      onChange={(e) => setSlideScale(Number(e.target.value))}
                      className={`w-full h-1.5 rounded-lg appearance-none mt-1 ${autoFit ? 'bg-gray-100 dark:bg-slate-800 cursor-not-allowed accent-gray-400' : 'bg-gray-200 dark:bg-slate-700 cursor-pointer accent-red-600'}`}
                    />
                    <span className="text-[9.5px] text-gray-400 dark:text-gray-500 block leading-tight">
                      {autoFit 
                        ? "Desative o Auto-Ajustar acima para alterar a escala de zoom manualmente. / 关闭上方的自动自适应选项来手动调整缩放。"
                        : "Arraste para ajustar horizontal ou verticalmente a escala de zoom do painel. / 拖动以调整缩放比例。"}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 dark:text-gray-450 font-bold uppercase block">Identificador do Rodapé / 页脚水印标识</label>
                    <input 
                      type="text" 
                      value={watermarkText}
                      onChange={(e) => {
                        const val = e.target.value;
                        setWatermarkText(val);
                        updateGlobalDoc('watermarkText', val);
                      }}
                      className="w-full text-xs font-bold border border-gray-200 dark:border-slate-700 rounded p-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-red-500 outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between p-2 border border-gray-150 dark:border-slate-850 rounded-lg bg-gray-50/50 dark:bg-slate-900/40 text-slate-800 dark:text-slate-200">
                    <span className="text-xs text-gray-600 dark:text-slate-350 font-bold">Mostrar Identificador de Rodapé / 显示页脚水印</span>
                    <input 
                      type="checkbox" 
                      checked={showWatermark}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setShowWatermark(val);
                        updateGlobalDoc('showWatermark', val);
                      }}
                      className="rounded text-emerald-500 focus:ring-emerald-500 h-4 w-4 cursor-pointer accent-emerald-500"
                    />
                  </div>
                </div>
              )}

            </div>

            {/* ASSINATURA INFERIOR DO EDIT */}
            <div id="side-editor-footer" className="p-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 flex items-center justify-between">
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold font-sans">BYD Slide Builder v2.5 (ZH Supported)</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-450 font-bold flex items-center gap-1 font-sans">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> CN/BR Connected
              </span>
            </div>

          </aside>
        )}

        {/* FLOATING MODAL FOR EDITING BUFFER SLOT */}
        {editingSlot && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 select-none">
            <div className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 ${
              theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-100 text-slate-800'
            }`}>
              
              {/* Header */}
              <div className="flex justify-between items-center border-b pb-3.5 mb-4 border-gray-150 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="bg-red-50 dark:bg-red-950/40 p-2 rounded-xl text-red-600">
                    <Boxes className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-wider text-red-600 dark:text-red-400">
                      {language === 'zh' ? '编辑缓冲区堆位坐标' : 'Editar Posição do Buffer'}
                    </h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">
                      Slot Coords: <span className="text-slate-800 dark:text-gray-100 font-black">{getSlotCoordsLabel(editingSlot.row, editingSlot.col)}</span>
                    </p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setEditingSlot(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer text-sm font-extrabold"
                >
                  ✕
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveSlot} className="space-y-4">
                
                {/* Container Number */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10.5px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {language === 'zh' ? '集装箱号 / Container ID' : 'Número do Contêiner'}
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="Ex: BYDU9910293"
                    value={editingSlot.containerNo || ''}
                    onChange={(e) => setEditingSlot(prev => prev ? { ...prev, containerNo: e.target.value.toUpperCase() } : null)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-xs font-mono font-black tracking-widest uppercase rounded-lg outline-none focus:ring-1 focus:ring-red-500 text-slate-800 dark:text-slate-100"
                  />
                </div>

                {/* Cargo / Model Selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10.5px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {language === 'zh' ? '货物类型或车型 / Cargo Type' : 'Tipo de Carga / Modelo'}
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="Ex: Dolphin Mini EV"
                    value={editingSlot.cargoType || ''}
                    onChange={(e) => setEditingSlot(prev => prev ? { ...prev, cargoType: e.target.value } : null)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-xs font-bold rounded-lg outline-none focus:ring-1 focus:ring-red-500 text-slate-800 dark:text-slate-100 mb-1"
                  />
                  
                  {/* Quick select buttons */}
                  <div className="flex flex-wrap gap-1">
                    {["Dolphin Mini EV", "Dolphin EV SUV", "Seal EV Luxury", "Yuan Plus EV", "Song Plus DM-i", "King DM-i Sedan", "Blade Battery Packs", "Chassis Modules", "Motor Assemblies"].map(model => (
                      <button
                        key={model}
                        type="button"
                        onClick={() => setEditingSlot(prev => prev ? { ...prev, cargoType: model } : null)}
                        className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-600 dark:text-gray-300 rounded text-[9px] font-bold transition-all border border-transparent hover:border-red-200"
                      >
                        {model}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Row: Status & Size */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10.5px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {language === 'zh' ? '尺寸 / Container Size' : 'Tamanho'}
                    </label>
                    <select
                      value={editingSlot.size || "40' HC"}
                      onChange={(e) => setEditingSlot(prev => prev ? { ...prev, size: e.target.value } : null)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-xs font-bold rounded-lg outline-none cursor-pointer focus:ring-1 focus:ring-red-500 text-slate-800 dark:text-slate-100"
                    >
                      <option value="40' HC">40' HC</option>
                      <option value="20FT">20FT</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10.5px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {language === 'zh' ? '状态 / Status' : 'Status'}
                    </label>
                    <select
                      value={editingSlot.status || 'CHEIO'}
                      onChange={(e) => setEditingSlot(prev => prev ? { ...prev, status: e.target.value } : null)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-xs font-bold rounded-lg outline-none cursor-pointer focus:ring-1 focus:ring-red-500 text-slate-800 dark:text-slate-100"
                    >
                      <option value="CHEIO">{language === 'zh' ? '重箱 (Cheio)' : 'CHEIO'}</option>
                      <option value="VAZIO">{language === 'zh' ? '空箱 (Vazio)' : 'VAZIO'}</option>
                    </select>
                  </div>
                </div>

                {/* Priority & Entry Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10.5px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {language === 'zh' ? '提箱优先级 / Priority' : 'Prioridade'}
                    </label>
                    <select
                      value={editingSlot.priority || 'NORMAL'}
                      onChange={(e) => setEditingSlot(prev => prev ? { ...prev, priority: e.target.value } : null)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-xs font-bold rounded-lg outline-none cursor-pointer focus:ring-1 focus:ring-red-500 text-slate-800 dark:text-slate-100"
                    >
                      <option value="CRITICAL">CRITICAL</option>
                      <option value="HIGH">HIGH</option>
                      <option value="NORMAL">NORMAL</option>
                      <option value="LOW">LOW</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10.5px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {language === 'zh' ? '入库时间 / Entry Time' : 'Tempo de Entrada'}
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 2026-07-07 13:14:30"
                      value={editingSlot.entryTime || ''}
                      onChange={(e) => setEditingSlot(prev => prev ? { ...prev, entryTime: e.target.value } : null)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-xs font-bold rounded-lg outline-none focus:ring-1 focus:ring-red-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* WMS Metadata Details */}
                {(editingSlot.danfe || editingSlot.origin || editingSlot.loteNo || editingSlot.statusRecebimento) && (
                  <div className="p-3.5 rounded-xl border border-dashed border-red-200 dark:border-red-900/45 bg-red-50/15 dark:bg-red-950/5 flex flex-col gap-2.5 shadow-sm">
                    <span className="text-[10.5px] font-black text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      {language === 'zh' ? 'WMS 系统导入信息' : 'Informações de Origem (WMS)'}
                    </span>
                    
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                      {editingSlot.danfe && (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] text-gray-400 dark:text-gray-500 uppercase">DANFE</span>
                          <span className="font-mono bg-white dark:bg-slate-900/60 p-1.5 rounded border border-gray-150 dark:border-slate-850 text-slate-800 dark:text-slate-100 select-all truncate" title={editingSlot.danfe}>
                            {editingSlot.danfe}
                          </span>
                        </div>
                      )}
                      {editingSlot.loteNo && (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] text-gray-400 dark:text-gray-500 uppercase">{language === 'zh' ? '批次号 / Lote' : 'Nº do Lote'}</span>
                          <span className="font-mono bg-white dark:bg-slate-900/60 p-1.5 rounded border border-gray-150 dark:border-slate-850 text-slate-800 dark:text-slate-100 truncate select-all" title={editingSlot.loteNo}>
                            {editingSlot.loteNo}
                          </span>
                        </div>
                      )}
                      {editingSlot.origin && (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] text-gray-400 dark:text-gray-500 uppercase">{language === 'zh' ? '来源 / Origin' : 'Origem'}</span>
                          <span className="bg-white dark:bg-slate-900/60 p-1.5 rounded border border-gray-150 dark:border-slate-850 text-slate-800 dark:text-slate-100 truncate select-all" title={editingSlot.origin}>
                            {editingSlot.origin}
                          </span>
                        </div>
                      )}
                      {editingSlot.statusRecebimento && (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] text-gray-400 dark:text-gray-500 uppercase">{language === 'zh' ? '接收状态' : 'Recebimento'}</span>
                          <span className="bg-white dark:bg-slate-900/60 p-1.5 rounded border border-gray-150 dark:border-slate-850 text-slate-800 dark:text-slate-100 select-all">
                            {editingSlot.statusRecebimento}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Multi-container Stacking Controller */}
                <div className="p-3 rounded-xl border border-dashed border-purple-200 dark:border-purple-800 bg-purple-50/20 dark:bg-purple-950/5 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10.5px] font-black text-purple-600 dark:text-purple-450 uppercase tracking-wider flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" />
                      {language === 'zh' ? '集装箱重叠叠放高度 / Pilha de Contêineres' : 'Pilha (Stacking Layers)'}
                    </span>
                    <span className="text-[9.5px] font-extrabold text-purple-500">
                      H: {editingSlot.stack ? editingSlot.stack.length : 1}
                    </span>
                  </div>

                  {/* Layers visual list */}
                  <div className="flex flex-col gap-1 text-[10px]">
                    {editingSlot.stack && editingSlot.stack.map((item, idx) => {
                      const isEditingThisLayer = editingStackIndex === idx;
                      return (
                        <div 
                          key={idx}
                          onClick={() => {
                            // Save current layer before switching
                            const updatedStack = editingSlot.stack ? [...editingSlot.stack] : [];
                            updatedStack[editingStackIndex] = {
                              row: editingSlot.row,
                              col: editingSlot.col,
                              containerNo: editingSlot.containerNo ? editingSlot.containerNo.trim().toUpperCase() : '',
                              cargoType: editingSlot.cargoType || '',
                              size: editingSlot.size || "40' HC",
                              priority: editingSlot.priority || 'NORMAL',
                              isOptimalPickup: !!editingSlot.isOptimalPickup,
                              status: editingSlot.status || 'CHEIO',
                              entryTime: editingSlot.entryTime || '',
                              updatedAt: new Date().toISOString().split('T')[0]
                            };

                            const nextLayer = updatedStack[idx];
                            setEditingSlot(prev => prev ? {
                              ...prev,
                              containerNo: nextLayer.containerNo || '',
                              cargoType: nextLayer.cargoType || '',
                              size: nextLayer.size || "40' HC",
                              priority: nextLayer.priority || 'NORMAL',
                              isOptimalPickup: !!nextLayer.isOptimalPickup,
                              status: nextLayer.status || 'CHEIO',
                              entryTime: nextLayer.entryTime || '',
                              stack: updatedStack
                            } : null);
                            setEditingStackIndex(idx);
                          }}
                          className={`flex justify-between items-center p-1.5 rounded cursor-pointer transition-all border ${
                            isEditingThisLayer 
                              ? 'bg-purple-100 dark:bg-purple-950/40 border-purple-400 font-extrabold text-purple-700 dark:text-purple-300' 
                              : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 text-gray-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span className="flex items-center gap-1 font-mono">
                            <span className="text-[8px] bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-1 rounded-sm">L{idx + 1}</span>
                            <span>{item.containerNo || (language === 'zh' ? '空层' : 'Vago')}</span>
                          </span>
                          <span className="text-[9px] truncate max-w-[120px]">{item.cargoType || 'N/A'}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Actions for Stack */}
                  <div className="flex gap-2 justify-end pt-1">
                    {editingSlot.stack && editingSlot.stack.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updatedStack = editingSlot.stack ? [...editingSlot.stack] : [];
                          if (updatedStack.length <= 1) return;
                          updatedStack.splice(editingStackIndex, 1);
                          const nextIdx = Math.max(0, editingStackIndex - 1);
                          const nextLayer = updatedStack[nextIdx] || {};

                          setEditingSlot(prev => prev ? {
                            ...prev,
                            containerNo: nextLayer.containerNo || '',
                            cargoType: nextLayer.cargoType || '',
                            size: nextLayer.size || "40' HC",
                            priority: nextLayer.priority || 'NORMAL',
                            isOptimalPickup: !!nextLayer.isOptimalPickup,
                            status: nextLayer.status || 'CHEIO',
                            entryTime: nextLayer.entryTime || '',
                            danfe: nextLayer.danfe || '',
                            origin: nextLayer.origin || '',
                            loteNo: nextLayer.loteNo || '',
                            statusRecebimento: nextLayer.statusRecebimento || '',
                            stack: updatedStack
                          } : null);
                          setEditingStackIndex(nextIdx);
                        }}
                        className="px-2 py-1 text-[9px] font-black text-red-600 bg-red-50 dark:bg-red-950/20 rounded hover:bg-red-100 transition-colors cursor-pointer"
                      >
                        {language === 'zh' ? '删除当前层' : 'Remover Camada'}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        const updatedStack = editingSlot.stack ? [...editingSlot.stack] : [];
                        // Save current layer before appending
                        updatedStack[editingStackIndex] = {
                          row: editingSlot.row,
                          col: editingSlot.col,
                          containerNo: editingSlot.containerNo ? editingSlot.containerNo.trim().toUpperCase() : '',
                          cargoType: editingSlot.cargoType || '',
                          size: editingSlot.size || "40' HC",
                          priority: editingSlot.priority || 'NORMAL',
                          isOptimalPickup: !!editingSlot.isOptimalPickup,
                          status: editingSlot.status || 'CHEIO',
                          entryTime: editingSlot.entryTime || '',
                          danfe: editingSlot.danfe || '',
                          origin: editingSlot.origin || '',
                          loteNo: editingSlot.loteNo || '',
                          statusRecebimento: editingSlot.statusRecebimento || '',
                          updatedAt: new Date().toISOString().split('T')[0]
                        };

                        const newLayer: BufferSlot = {
                          row: editingSlot.row,
                          col: editingSlot.col,
                          containerNo: '',
                          cargoType: 'Dolphin Mini EV',
                          size: "40' HC",
                          priority: 'NORMAL',
                          isOptimalPickup: false,
                          status: 'CHEIO',
                          entryTime: '',
                          danfe: '',
                          origin: '',
                          loteNo: '',
                          statusRecebimento: '',
                          updatedAt: new Date().toISOString().split('T')[0]
                        };
                        updatedStack.push(newLayer);
                        const nextIdx = updatedStack.length - 1;

                        setEditingSlot(prev => prev ? {
                          ...prev,
                          containerNo: '',
                          cargoType: 'Dolphin Mini EV',
                          size: "40' HC",
                          priority: 'NORMAL',
                          isOptimalPickup: false,
                          status: 'CHEIO',
                          entryTime: '',
                          danfe: '',
                          origin: '',
                          loteNo: '',
                          statusRecebimento: '',
                          stack: updatedStack
                        } : null);
                        setEditingStackIndex(nextIdx);
                      }}
                      className="px-2 py-1 text-[9px] font-black text-purple-600 bg-purple-100 dark:bg-purple-950/35 rounded hover:bg-purple-200 transition-colors cursor-pointer"
                    >
                      {language === 'zh' ? '添加叠放层 L' + (editingSlot.stack ? editingSlot.stack.length + 1 : 2) : 'Adicionar Camada'}
                    </button>
                  </div>
                </div>

                {/* Toggle Checkbox: Is Optimal Pickup */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-gray-150 dark:border-slate-800 flex items-start gap-2.5">
                  <input 
                    type="checkbox"
                    id="chk-optimal"
                    checked={editingSlot.isOptimalPickup || false}
                    onChange={(e) => setEditingSlot(prev => prev ? { ...prev, isOptimalPickup: e.target.checked } : null)}
                    className="mt-1 w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500 cursor-pointer"
                  />
                  <div className="flex flex-col leading-tight cursor-pointer">
                    <label htmlFor="chk-optimal" className="text-xs font-extrabold text-slate-800 dark:text-slate-100 cursor-pointer flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-yellow-500 inline" />
                      {language === 'zh' ? '标记为最易提取位置 (⚡ Quick-Out)' : 'Melhor Posicionamento (⚡ Quick-Out)'}
                    </label>
                    <span className="text-[9.5px] text-gray-400 mt-1">
                      {language === 'zh' ? '此箱位于外围或单层，无需任何移箱操作即可直接出库。' : 'Este contêiner está desobstruído na borda, pronto para envio sem custo de remoções.'}
                    </span>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-2 pt-3 border-t border-gray-150 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingSlot(null)}
                    className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    {language === 'zh' ? '取消' : 'Cancelar'}
                  </button>

                  {getSlotAt(editingSlot.row, editingSlot.col)?.containerNo && (
                    <button
                      type="button"
                      onClick={handleClearSlot}
                      className="px-4 py-2 bg-red-100 dark:bg-red-950/40 hover:bg-red-200 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                      title="Desocupar esta vaga"
                    >
                      {language === 'zh' ? '释放堆位' : 'Desocupar'}
                    </button>
                  )}

                  <button
                    type="submit"
                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition-all shadow-md shadow-red-600/15 cursor-pointer"
                  >
                    {language === 'zh' ? '保存' : 'Salvar'}
                  </button>
                </div>

              </form>

            </div>
          </div>
        )}

      </main>

      {/* AREA LISTS MODAL FOR CONTAINERS AND VESSELS */}
      {selectedYardKey && yards[selectedYardKey] && (() => {
        const selectedYard = yards[selectedYardKey];
        const yardOcupacao = getYardOcupacao(selectedYard);
        
        // Filtered containers
        const filteredContainers = containers.filter(c => {
          if (c.yardId !== selectedYardKey) return false;
          if (containerSearch.trim()) {
            const s = containerSearch.trim().toLowerCase();
            if (!c.id.toLowerCase().includes(s)) return false;
          }
          if (containerStatusFilter !== 'ALL' && c.status !== containerStatusFilter) return false;
          if (containerCategoryFilter !== 'ALL' && c.category !== containerCategoryFilter) return false;
          return true;
        });

        // Associated vessels from the containers in this yard
        const uniqueVessels = Array.from(new Set(
          containers
            .filter(c => c.yardId === selectedYardKey && c.vesselName && c.vesselName !== 'N/A')
            .map(c => c.vesselName)
        ));

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className={`relative rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden border transition-all ${
              theme === 'dark' 
                ? 'bg-[#1e293b] border-slate-800 text-white' 
                : 'bg-white border-slate-100 text-slate-800'
            }`}>
              
              {/* Modal Header */}
              <div className={`p-4 border-b flex justify-between items-center ${
                theme === 'dark' ? 'border-slate-800 bg-[#0f172a]' : 'border-gray-100 bg-gray-50'
              }`}>
                <div>
                  <h3 className="font-extrabold text-sm md:text-base flex items-center gap-2">
                    <Boxes className="w-5 h-5 text-blue-500" />
                    <span>
                      {language === 'bilingual' 
                        ? `Detalhamento de Área: ${selectedYard.name} / 堆场细化: ${selectedYard.name}`
                        : `Detalhamento de Área: ${selectedYard.name}`}
                    </span>
                  </h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {language === 'bilingual'
                      ? 'Visualize e gerencie os contêineres e navios presentes no terminal / 查看并管理终端内的集装箱和船舶'
                      : 'Visualize e gerencie os contêineres e navios presentes no terminal'}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedYardKey(null)}
                  className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-800 text-gray-500 transition-colors"
                >
                  <Plus className="w-5 h-5 rotate-45 transform" />
                </button>
              </div>

              {/* Modal Body Info Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 border-b dark:border-slate-800 bg-blue-50/20 dark:bg-[#111827]/40 text-xs">
                <div className="p-2.5 rounded-lg bg-white dark:bg-[#1e293b] border dark:border-slate-800 shadow-xs flex flex-col justify-between">
                  <span className="text-[9px] text-gray-400 font-bold uppercase">{language === 'bilingual' ? 'Capacidade / 容量' : 'Capacidade'}</span>
                  <span className="font-mono text-base font-black text-slate-700 dark:text-slate-150 mt-1">{selectedYard.capacity.toLocaleString()} <span className="text-xs text-gray-400 font-normal">FEU</span></span>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-[#1e293b] border dark:border-slate-800 shadow-xs flex flex-col justify-between">
                  <span className="text-[9px] text-gray-400 font-bold uppercase">{language === 'bilingual' ? 'Ocupação / 占用率' : 'Ocupação'}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-sm font-black px-1.5 py-0.2 rounded ${
                      yardOcupacao >= 89 
                        ? 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300' 
                        : yardOcupacao >= 65 
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' 
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                    }`}>{yardOcupacao}%</span>
                    <span className="text-[10px] text-gray-400 font-bold">({(selectedYard.cheio + selectedYard.vazio).toLocaleString()} FEU)</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-[#1e293b] border dark:border-slate-800 shadow-xs flex flex-col justify-between">
                  <span className="text-[9px] text-gray-400 font-bold uppercase">{language === 'bilingual' ? 'Cheios / 重箱' : 'Cheios'}</span>
                  <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400 mt-1">{selectedYard.cheio.toLocaleString()} <span className="text-[10px] text-gray-400 font-normal">FEU</span></span>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-[#1e293b] border dark:border-slate-800 shadow-xs flex flex-col justify-between">
                  <span className="text-[9px] text-gray-400 font-bold uppercase">{language === 'bilingual' ? 'Vazios / 空箱' : 'Vazios'}</span>
                  <span className="font-mono text-sm font-bold text-gray-500 mt-1">{selectedYard.vazio.toLocaleString()} <span className="text-[10px] text-gray-400 font-normal">FEU</span></span>
                </div>
                <div className="col-span-2 md:col-span-1 p-2.5 rounded-lg bg-white dark:bg-[#1e293b] border dark:border-slate-800 shadow-xs flex flex-col justify-between">
                  <span className="text-[9px] text-gray-400 font-bold uppercase">{language === 'bilingual' ? 'Pronto Coleta / 待收箱' : 'Pronto Coleta'}</span>
                  <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-450 mt-1">{(selectedYard.prontoColeta || 0).toLocaleString()} <span className="text-[10px] text-gray-400 font-normal">FEU</span></span>
                </div>
              </div>

              {/* Modal Core Area */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col lg:flex-row gap-4 min-h-0">
                
                {/* Left Side: Vessels and Add form */}
                <div className="w-full lg:w-[320px] flex flex-col gap-4">
                  
                  {/* Vessels list */}
                  <div className={`p-3.5 rounded-xl border ${
                    theme === 'dark' ? 'bg-[#152033] border-slate-850' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <h4 className="font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-1.5 text-blue-600 dark:text-blue-400 mb-2.5">
                      <Ship className="w-4 h-4" />
                      <span>{language === 'bilingual' ? 'Navios Associados / 关联船舶' : 'Navios Associados'}</span>
                    </h4>
                    
                    <div className="space-y-1.5 max-h-[110px] overflow-y-auto pr-1">
                      {uniqueVessels.map((v) => (
                        <div key={v} className="flex justify-between items-center p-2 rounded-lg bg-white dark:bg-[#1e293b] border dark:border-slate-800 text-[11.5px] font-bold">
                          <span className="text-gray-850 dark:text-gray-250 truncate mr-1">{v}</span>
                          <span className="text-[9px] bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 px-1.5 py-0.2 rounded">
                            {containers.filter(c => c.yardId === selectedYardKey && c.vesselName === v).length} cntrs
                          </span>
                        </div>
                      ))}
                      {uniqueVessels.length === 0 && (
                        <div className="text-center py-4 text-[10px] text-gray-400">
                          {language === 'bilingual' ? 'Nenhum navio associado nesta área. / 该区域没有关联船舶。' : 'Nenhum navio associado nesta área.'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Add Container Form */}
                  <div className={`p-3.5 rounded-xl border ${
                    theme === 'dark' ? 'bg-[#152033] border-slate-850' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <h4 className="font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-1.5 text-emerald-600 dark:text-emerald-450 mb-2.5">
                      <Plus className="w-4 h-4" />
                      <span>{language === 'bilingual' ? 'Cadastrar Novo / 登记新集装箱' : 'Cadastrar Novo'}</span>
                    </h4>
                    
                    <form onSubmit={handleAddContainer} className="space-y-2.5 text-xs">
                      <div>
                        <label className="text-[9px] uppercase tracking-tight text-gray-400 font-bold block mb-1">Número do Contêiner / 箱号</label>
                        <input 
                          type="text"
                          required
                          value={newContainerId}
                          onChange={(e) => setNewContainerId(e.target.value)}
                          placeholder="EX: BYDU1234567"
                          className="w-full rounded-lg border dark:border-slate-800 p-2 font-mono text-xs font-bold uppercase bg-white dark:bg-[#1e293b] text-slate-800 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] uppercase tracking-tight text-gray-400 font-bold block mb-1">Tamanho / 尺寸</label>
                          <select 
                            value={newContainerSize}
                            onChange={(e) => setNewContainerSize(e.target.value)}
                            className="w-full rounded-lg border dark:border-slate-800 p-2 bg-white dark:bg-[#1e293b] focus:outline-hidden text-xs font-bold"
                          >
                            <option value="20' GP">20' GP</option>
                            <option value="40' HC">40' HC</option>
                            <option value="40' OT">40' OT</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] uppercase tracking-tight text-gray-400 font-bold block mb-1">Status / 状态</label>
                          <select 
                            value={newContainerStatus}
                            onChange={(e) => setNewContainerStatus(e.target.value as any)}
                            className="w-full rounded-lg border dark:border-slate-800 p-2 bg-white dark:bg-[#1e293b] focus:outline-hidden text-xs font-bold"
                          >
                            <option value="CHEIO">CHEIO / 重箱</option>
                            <option value="VAZIO">VAZIO / 空箱</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        <div>
                          <label className="text-[9px] uppercase tracking-tight text-gray-400 font-bold block mb-1">Categoria / 类别</label>
                          <select 
                            value={newContainerCategory}
                            onChange={(e) => setNewContainerCategory(e.target.value as any)}
                            className="w-full rounded-lg border dark:border-slate-800 p-2 bg-white dark:bg-[#1e293b] focus:outline-hidden text-xs font-bold"
                          >
                            <option value="GERAL">GERAL / 通用</option>
                            <option value="PORTO">PORTO / 港口</option>
                            <option value="PRONTO_COLETA">PRONTO COLETA / 待收箱</option>
                            <option value="DELIVERED">DELIVERED / 已交付</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] uppercase tracking-tight text-gray-400 font-bold block mb-1">Navio Associado / 对应船舶</label>
                          <select 
                            value={newContainerVessel}
                            onChange={(e) => setNewContainerVessel(e.target.value)}
                            className="w-full rounded-lg border dark:border-slate-800 p-2 bg-white dark:bg-[#1e293b] focus:outline-hidden text-xs font-bold"
                          >
                            <option value="N/A">N/A (Nenhum / 无)</option>
                            {vessels.map(v => (
                              <option key={v.id} value={v.name}>{v.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <button 
                        type="submit" 
                        className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold p-2 rounded-lg text-xs tracking-wide shadow-xs transition-colors mt-1"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{language === 'bilingual' ? 'Adicionar Contêiner / 添加集装箱' : 'Adicionar Contêiner'}</span>
                      </button>
                    </form>
                  </div>

                  {/* Excel Import/Template card */}
                  <div className={`p-3.5 rounded-xl border ${
                    theme === 'dark' ? 'bg-[#152033] border-slate-850' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <h4 className="font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-1.5 text-blue-600 dark:text-blue-400 mb-2">
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>{language === 'bilingual' ? 'Integração Excel / 电子表格集成' : 'Integração Excel'}</span>
                    </h4>

                    <p className="text-[10px] text-gray-400 mb-3 leading-relaxed">
                      {language === 'bilingual'
                        ? 'Baixe o modelo padrão ou carregue uma planilha para cadastrar múltiplos contêineres de uma só vez. / 下载标准模板或上传表格以一次性注册多个集装箱。'
                        : 'Baixe o modelo padrão ou carregue uma planilha para cadastrar múltiplos contêineres de uma só vez.'}
                    </p>

                    <div className="space-y-2">
                      {/* Button 1: Download Standard Template */}
                      <button
                        onClick={handleDownloadTemplate}
                        className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold p-2 rounded-lg text-xs tracking-wide shadow-xs transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>{language === 'bilingual' ? 'Baixar Modelo / 下载标准模板' : 'Baixar Modelo'}</span>
                      </button>

                      {/* Button 2: Upload Excel File */}
                      <label className="w-full flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold p-2 rounded-lg text-xs tracking-wide shadow-xs transition-colors cursor-pointer text-center">
                        <Upload className="w-4 h-4" />
                        <span>{language === 'bilingual' ? 'Importar Planilha / 导入 Excel 文件' : 'Importar Planilha'}</span>
                        <input
                          id="excel_upload_input"
                          type="file"
                          accept=".xlsx, .xls"
                          onChange={handleImportExcel}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Standard layout guideline for user */}
                    <div className="mt-3.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                      <span className="text-[9px] uppercase tracking-wider text-gray-400 font-extrabold block mb-1.5">
                        {language === 'bilingual' ? 'Layout de Colunas / 列布局规范' : 'Layout de Colunas'}
                      </span>
                      <div className="space-y-1 text-[10px] leading-tight">
                        <div className="flex justify-between items-center py-0.5 border-b border-dashed border-gray-200 dark:border-gray-800 font-mono">
                          <span className="font-bold text-blue-600 dark:text-blue-400">Identificacao</span>
                          <span className="text-gray-400 text-[9px]">{language === 'bilingual' ? 'ID (Ex: BYDU1234567)' : 'ID (Ex: BYDU1234567)'}</span>
                        </div>
                        <div className="flex justify-between items-center py-0.5 border-b border-dashed border-gray-200 dark:border-gray-800 font-mono">
                          <span className="font-bold text-blue-600 dark:text-blue-400">Tamanho</span>
                          <span className="text-gray-400 text-[9px]">20' GP, 40' HC, 40' OT</span>
                        </div>
                        <div className="flex justify-between items-center py-0.5 border-b border-dashed border-gray-200 dark:border-gray-800 font-mono">
                          <span className="font-bold text-blue-600 dark:text-blue-400">Status</span>
                          <span className="text-gray-400 text-[9px]">CHEIO / VAZIO</span>
                        </div>
                        <div className="flex justify-between items-center py-0.5 border-b border-dashed border-gray-200 dark:border-gray-800 font-mono">
                          <span className="font-bold text-blue-600 dark:text-blue-400">Categoria</span>
                          <span className="text-gray-400 text-[9px]">PORTO, DELIVERED, GERAL...</span>
                        </div>
                        <div className="flex justify-between items-center py-0.5 font-mono">
                          <span className="font-bold text-blue-600 dark:text-blue-400">Navio</span>
                          <span className="text-gray-400 text-[9px]">{language === 'bilingual' ? 'Nome ou N/A' : 'Nome ou N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Right Side: Search, Filter & Containers Table */}
                <div className="flex-1 flex flex-col min-h-[250px] lg:min-h-0">
                  
                  {/* Filter and Search Bar */}
                  <div className="flex flex-col sm:flex-row gap-2.5 mb-2.5">
                    <div className="flex-1 relative">
                      <input 
                        type="text"
                        value={containerSearch}
                        onChange={(e) => setContainerSearch(e.target.value)}
                        placeholder={language === 'bilingual' ? "Buscar por número... / 搜索箱号..." : "Buscar por número..."}
                        className="w-full rounded-lg border dark:border-slate-800 p-2 pl-2.5 bg-white dark:bg-[#1e293b] text-xs font-bold text-slate-800 dark:text-white"
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <select 
                        value={containerStatusFilter}
                        onChange={(e) => setContainerStatusFilter(e.target.value)}
                        className="rounded-lg border dark:border-slate-800 p-2 bg-white dark:bg-[#1e293b] text-xs font-bold"
                      >
                        <option value="ALL">{language === 'bilingual' ? 'Status: Todos / 所有状态' : 'Status: Todos'}</option>
                        <option value="CHEIO">CHEIO / 重箱</option>
                        <option value="VAZIO">VAZIO / 空箱</option>
                      </select>

                      <select 
                        value={containerCategoryFilter}
                        onChange={(e) => setContainerCategoryFilter(e.target.value)}
                        className="rounded-lg border dark:border-slate-800 p-2 bg-white dark:bg-[#1e293b] text-xs font-bold"
                      >
                        <option value="ALL">{language === 'bilingual' ? 'Categoria: Todas / 所有类别' : 'Categoria: Todas'}</option>
                        <option value="GERAL">GERAL / 通用</option>
                        <option value="PORTO">PORTO / 港口</option>
                        <option value="PRONTO_COLETA">PRONTO COLETA / 待收</option>
                        <option value="DELIVERED">DELIVERED / 已付</option>
                      </select>
                    </div>
                  </div>

                  {/* Bulk Actions Toolbar */}
                  <div className="flex items-center justify-between gap-2 mb-3 p-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/25">
                    <div className="flex items-center gap-2 pl-1">
                      <input 
                        type="checkbox"
                        id="bulk_select_all_top"
                        checked={filteredContainers.length > 0 && filteredContainers.every(c => selectedContainerIds.includes(c.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const newSelection = [...new Set([...selectedContainerIds, ...filteredContainers.map(c => c.id)])];
                            setSelectedContainerIds(newSelection);
                          } else {
                            const filteredIds = filteredContainers.map(c => c.id);
                            setSelectedContainerIds(selectedContainerIds.filter(id => !filteredIds.includes(id)));
                          }
                        }}
                        className="rounded border-gray-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                      />
                      <label htmlFor="bulk_select_all_top" className="text-[10.5px] font-bold text-gray-500 dark:text-gray-400 cursor-pointer select-none">
                        {language === 'bilingual' 
                          ? `Selecionar tudo / 全选 (${selectedContainerIds.length} / ${filteredContainers.length})` 
                          : `Selecionar tudo (${selectedContainerIds.length} / ${filteredContainers.length})`}
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedContainerIds.length > 0 && (
                        <button
                          onClick={handleBulkDeleteContainers}
                          className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs shadow-xs transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{language === 'bilingual' ? 'Excluir Selecionados / 删除所选' : 'Excluir Selecionados'}</span>
                        </button>
                      )}
                      <button
                        onClick={handleClearYard}
                        className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-extrabold px-3 py-1.5 rounded-lg text-xs border border-amber-500/20 transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>{language === 'bilingual' ? 'Esvaziar Pátio / 清空堆场' : 'Esvaziar Pátio'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Containers Table */}
                  <div className={`flex-1 overflow-auto rounded-xl border ${
                    theme === 'dark' ? 'border-slate-800 bg-[#0f172a]/30' : 'border-slate-100 bg-slate-50/20'
                  }`}>
                    <table className="w-full text-left text-xs font-sans min-w-[1200px]">
                      <thead>
                        <tr className={`border-b font-extrabold uppercase text-[9.5px] tracking-wider text-gray-400 sticky top-0 z-10 ${
                          theme === 'dark' ? 'border-slate-800 bg-[#1e293b]' : 'border-gray-150 bg-slate-50'
                        }`}>
                          <th className="p-3 w-10 text-center">
                            <input 
                              type="checkbox"
                              checked={filteredContainers.length > 0 && filteredContainers.every(c => selectedContainerIds.includes(c.id))}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const newSelection = [...new Set([...selectedContainerIds, ...filteredContainers.map(c => c.id)])];
                                  setSelectedContainerIds(newSelection);
                                } else {
                                  const filteredIds = filteredContainers.map(c => c.id);
                                  setSelectedContainerIds(selectedContainerIds.filter(id => !filteredIds.includes(id)));
                                }
                              }}
                              className="rounded border-gray-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                            />
                          </th>
                          <th className="p-3 w-[110px]">BL</th>
                          <th className="p-3 w-[120px] font-mono">CONTAINER</th>
                          <th className="p-3 w-[140px]">Warehouse</th>
                          <th className="p-3 w-[160px]">Navio</th>
                          <th className="p-3 w-[90px]">ETA</th>
                          <th className="p-3 w-[90px]">Free Time</th>
                          <th className="p-3 w-[100px]">Componente</th>
                          <th className="p-3 w-[140px]">Modelo</th>
                          <th className="p-3 w-[100px]">Lote</th>
                          <th className="p-3 w-[100px]">Programação</th>
                          <th className="p-3 w-[120px]">Transportadora</th>
                          {isEditMode && <th className="p-3 w-[60px] text-right">Ação</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60 font-semibold text-slate-700 dark:text-gray-300">
                        {filteredContainers.map((container) => {
                          return (
                            <tr key={container.id} className={`hover:bg-gray-50/40 dark:hover:bg-slate-800/10 transition-colors ${
                              selectedContainerIds.includes(container.id) ? 'bg-blue-500/5 dark:bg-blue-500/5' : ''
                            }`}>
                              <td className="p-3 w-10 text-center">
                                <input 
                                  type="checkbox"
                                  checked={selectedContainerIds.includes(container.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedContainerIds([...selectedContainerIds, container.id]);
                                    } else {
                                      setSelectedContainerIds(selectedContainerIds.filter(id => id !== container.id));
                                    }
                                  }}
                                  className="rounded border-gray-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                                />
                              </td>
                              
                              {/* BL */}
                              <td className="p-1 truncate">
                                {isEditMode ? (
                                  <input
                                    type="text"
                                    value={container.bl || ''}
                                    onChange={(e) => handleUpdateContainerField(container.id, 'bl', e.target.value)}
                                    className="w-full bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 rounded-sm font-sans"
                                  />
                                ) : (
                                  <span className="p-1 block truncate text-xs">{container.bl || '-'}</span>
                                )}
                              </td>

                              {/* CONTAINER */}
                              <td className="p-3 font-mono font-black text-slate-900 dark:text-slate-100 select-all truncate">
                                {container.id}
                              </td>

                              {/* Warehouse */}
                              <td className="p-1 truncate">
                                {isEditMode ? (
                                  <select
                                    value={container.yardId}
                                    onChange={(e) => handleUpdateContainerField(container.id, 'yardId', e.target.value)}
                                    className="w-full bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 rounded-sm font-sans text-xs font-bold text-slate-800 dark:text-slate-100"
                                  >
                                    {Object.entries(yards).filter(([_, y]) => y && (y as any).type !== 'BUFFER').map(([key, y]) => (
                                      <option key={key} value={key}>{(y as any).name}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="p-1 block truncate text-[11px] font-extrabold text-blue-600 dark:text-blue-400">
                                    {yards[container.yardId]?.name || container.yardId}
                                  </span>
                                )}
                              </td>

                              {/* Navio */}
                              <td className="p-1 truncate">
                                {isEditMode ? (
                                  <input
                                    type="text"
                                    value={container.vesselName || ''}
                                    onChange={(e) => handleUpdateContainerField(container.id, 'vesselName', e.target.value)}
                                    className="w-full bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 rounded-sm font-sans"
                                  />
                                ) : (
                                  <span className="p-1 block truncate text-xs">{container.vesselName || '-'}</span>
                                )}
                              </td>

                              {/* ETA */}
                              <td className="p-1 truncate">
                                {isEditMode ? (
                                  <input
                                    type="text"
                                    value={container.eta || ''}
                                    onChange={(e) => handleUpdateContainerField(container.id, 'eta', e.target.value)}
                                    className="w-full bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 rounded-sm font-sans text-xs"
                                  />
                                ) : (
                                  <span className="p-1 block truncate text-xs">{container.eta || '-'}</span>
                                )}
                              </td>

                              {/* Free Time */}
                              <td className="p-1 truncate">
                                {isEditMode ? (
                                  <input
                                    type="text"
                                    value={container.freeTime || ''}
                                    onChange={(e) => handleUpdateContainerField(container.id, 'freeTime', e.target.value)}
                                    className="w-full bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 rounded-sm font-sans text-xs"
                                  />
                                ) : (
                                  <span className="p-1 block truncate text-xs font-mono font-bold text-amber-600 dark:text-amber-400">{container.freeTime || '-'}</span>
                                )}
                              </td>

                              {/* Componente */}
                              <td className="p-1 truncate">
                                {isEditMode ? (
                                  <input
                                    type="text"
                                    value={container.componente || ''}
                                    onChange={(e) => handleUpdateContainerField(container.id, 'componente', e.target.value)}
                                    className="w-full bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 rounded-sm font-sans text-xs"
                                  />
                                ) : (
                                  <span className="p-1 block truncate text-xs">{container.componente || '-'}</span>
                                )}
                              </td>

                              {/* Modelo */}
                              <td className="p-1 truncate">
                                {isEditMode ? (
                                  <input
                                    type="text"
                                    value={container.modelo || ''}
                                    onChange={(e) => handleUpdateContainerField(container.id, 'modelo', e.target.value)}
                                    className="w-full bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 rounded-sm font-sans text-xs"
                                  />
                                ) : (
                                  <span className="p-1 block truncate text-xs font-bold text-slate-550 dark:text-slate-300">{container.modelo || '-'}</span>
                                )}
                              </td>

                              {/* Lote */}
                              <td className="p-1 truncate">
                                {isEditMode ? (
                                  <input
                                    type="text"
                                    value={container.lote || ''}
                                    onChange={(e) => handleUpdateContainerField(container.id, 'lote', e.target.value)}
                                    className="w-full bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 rounded-sm font-sans text-xs"
                                  />
                                ) : (
                                  <span className="p-1 block truncate text-xs text-blue-500 dark:text-blue-400 font-bold">{container.lote || '-'}</span>
                                )}
                              </td>

                              {/* Programação */}
                              <td className="p-1 truncate">
                                {isEditMode ? (
                                  <input
                                    type="text"
                                    value={container.programacao || ''}
                                    onChange={(e) => handleUpdateContainerField(container.id, 'programacao', e.target.value)}
                                    className="w-full bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 rounded-sm font-sans text-xs"
                                  />
                                ) : (
                                  <span className="p-1 block truncate text-xs">{container.programacao || '-'}</span>
                                )}
                              </td>

                              {/* Transportadora */}
                              <td className="p-1 truncate">
                                {isEditMode ? (
                                  <input
                                    type="text"
                                    value={container.transportadora || ''}
                                    onChange={(e) => handleUpdateContainerField(container.id, 'transportadora', e.target.value)}
                                    className="w-full bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 rounded-sm font-sans text-xs"
                                  />
                                ) : (
                                  <span className="p-1 block truncate text-xs">{container.transportadora || '-'}</span>
                                )}
                              </td>

                              {/* Actions */}
                              {isEditMode && (
                                <td className="p-3 text-right">
                                  <button 
                                    onClick={() => handleDeleteContainer(container)}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 p-1.5 rounded-lg transition-all"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                        {filteredContainers.length === 0 && (
                          <tr>
                            <td colSpan={isEditMode ? 13 : 12} className="text-center py-8 text-gray-400">
                              {language === 'bilingual'
                                ? 'Nenhum contêiner correspondente encontrado. / 未找到匹配的集装箱。'
                                : 'Nenhum contêiner correspondente encontrado.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                </div>

              </div>

              {/* Modal Footer */}
              <div className={`p-3 border-t flex justify-between items-center text-[10px] text-gray-400 ${
                theme === 'dark' ? 'border-slate-800 bg-[#0f172a]' : 'border-gray-100 bg-gray-50'
              }`}>
                <span>{language === 'bilingual' ? `Total nesta área: ${containers.filter(c => c.yardId === selectedYardKey).length} contêiner(es) / 该区域共 ${containers.filter(c => c.yardId === selectedYardKey).length} 个集装箱` : `Total nesta área: ${containers.filter(c => c.yardId === selectedYardKey).length} contêiner(es)`}</span>
                <button 
                  onClick={() => setSelectedYardKey(null)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black px-4 py-1.5 rounded-lg text-xs shadow-xs transition-colors"
                >
                  {language === 'bilingual' ? 'Fechar / 关闭' : 'Fechar'}
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {confirmConfig && confirmConfig.isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`relative rounded-xl shadow-2xl w-full max-w-md p-6 border transition-all ${
            theme === 'dark' 
              ? 'bg-[#1e293b] border-slate-800 text-white' 
              : 'bg-white border-slate-100 text-slate-800'
          }`}>
            <h3 className="text-base font-black uppercase mb-2 tracking-wide flex items-center gap-2">
              <span className="text-amber-500 font-bold font-mono text-lg">⚠️</span> {confirmConfig.title}
            </h3>
            <p className="text-xs font-semibold leading-relaxed mb-6 opacity-90 whitespace-pre-line">
              {confirmConfig.message}
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setConfirmConfig(null)}
                className={`px-4 py-2 rounded-lg text-xs font-extrabold border transition-all ${
                  theme === 'dark' 
                    ? 'border-slate-800 bg-[#0f172a] text-slate-300 hover:bg-slate-800' 
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {language === 'bilingual' ? 'Cancelar / 取消' : 'Cancelar'}
              </button>
              <button
                onClick={() => confirmConfig.onConfirm()}
                className="px-4 py-2 rounded-lg text-xs font-black bg-red-600 hover:bg-red-700 text-white shadow-xs transition-all"
              >
                {language === 'bilingual' ? 'Confirmar / 确认' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: GOOGLE SHEETS & LOCAL EXCEL IMPORT SYNC */}
      {sheetsModalOpen && (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`relative rounded-2xl shadow-2xl w-full max-w-lg p-6 border transition-all ${
            theme === 'dark' 
              ? 'bg-[#1e293b] border-slate-700 text-white' 
              : 'bg-white border-slate-100 text-slate-800'
          }`}>
            <div className="flex justify-between items-center border-b pb-3 mb-4 border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-black uppercase flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
                {language === 'zh' ? '集成数据源：在线 Google Sheets 与本地 Excel/CSV' : 'Importador e Sincronizador de Logística'}
              </h3>
              <button 
                onClick={() => setSheetsModalOpen(false)} 
                className="text-gray-400 hover:text-rose-600 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs font-bold">
              {/* Opção A: Sincronizador de Link do Google Sheets */}
              <div className="space-y-2">
                <span className="text-[10px] text-emerald-600 uppercase tracking-widest block">Opção A: Sincronizar link da Planilha Google (Publicado)</span>
                <input 
                  type="text" 
                  value={sheetsUrl} 
                  onChange={(e) => setSheetsUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv" 
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-2.5 rounded-lg text-xs font-semibold outline-none"
                />
                <button 
                  onClick={handleSyncGoogleSheets}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-black uppercase tracking-wider cursor-pointer"
                >
                  Sincronizar Planilha Online
                </button>
              </div>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-gray-200 dark:border-slate-800"></div>
                <span className="flex-shrink mx-4 text-gray-400 uppercase text-[9px] tracking-widest font-black">ou</span>
                <div className="flex-grow border-t border-gray-200 dark:border-slate-800"></div>
              </div>

              {/* Opção B: Drag and Drop Local Excel/CSV File Loader */}
              <div className="space-y-2">
                <span className="text-[10px] text-blue-600 uppercase tracking-widest block">Opção B: Carregar arquivo Excel/CSV local</span>
                <div className="border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl p-6 text-center hover:bg-slate-50 dark:hover:bg-slate-800/35 transition-all cursor-pointer relative">
                  <input 
                    type="file" 
                    accept=".xlsx, .xls, .csv" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const reader = new FileReader();
                        reader.onload = async (evt) => {
                          const bstr = evt.target?.result;
                          const wb = XLSX.read(bstr, { type: 'binary' });
                          const firstSheet = wb.Sheets[wb.SheetNames[0]];
                          const rows = XLSX.utils.sheet_to_json(firstSheet);
                          await handleImportParsedRows(rows);
                          setSheetsModalOpen(false);
                        };
                        reader.readAsBinaryString(file);
                      } catch (err) {
                        console.error(err);
                        alert("Erro ao ler o arquivo selecionado.");
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="bg-blue-100 text-blue-600 dark:bg-blue-950 p-2.5 rounded-full">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-black">{language === 'zh' ? '拖拽或点击上传本地 Excel / CSV' : 'Arraste ou clique para selecionar arquivo local'}</span>
                    <span className="text-[9.5px] text-gray-400 font-bold">Aceita .XLSX, .XLS, .CSV contendo colunas: Container, BL, Lote, Navio...</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: MONTHLY CALENDAR DAY DETAILS */}
      {selectedDayCalendar && (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`relative rounded-2xl shadow-2xl w-full max-w-4xl p-6 border transition-all ${
            theme === 'dark' 
              ? 'bg-[#1e293b] border-slate-700 text-white' 
              : 'bg-white border-slate-100 text-slate-800'
          }`}>
            <div className="flex justify-between items-center border-b pb-3 mb-4 border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-black uppercase flex items-center gap-2">
                <Calendar className="w-5 h-5 text-red-600 shrink-0" />
                {language === 'zh' ? `到货清单详情 - ${selectedDayCalendar}` : `Equipamentos Agendados para: ${selectedDayCalendar}`}
              </h3>
              <button 
                onClick={() => setSelectedDayCalendar(null)} 
                className="text-gray-400 hover:text-rose-600 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-x-auto max-h-[300px]">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 text-[9px] uppercase text-gray-500 border-b border-gray-150 dark:border-slate-800 font-black">
                    <th className="p-2.5 pl-3">ID Container</th>
                    <th className="p-2.5">BL</th>
                    <th className="p-2.5">Batch / Lote</th>
                    <th className="p-2.5">Warehouse / Pátio</th>
                    <th className="p-2.5">Model / Modelo</th>
                    <th className="p-2.5">Process / Status</th>
                    <th className="p-2.5">Status Entrega</th>
                    <th className="p-2.5">Transportadora (Carrier)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150/40 dark:divide-slate-800/60 font-semibold text-slate-700 dark:text-slate-350">
                  {logisticsEntries
                    .filter(e => normalizeDate(String(e.estimatedDeliveryDate)) === selectedDayCalendar)
                    .map((entry, index) => {
                      const matchedCntr = containers.find(c => c.id === entry.cntrsOriginal);
                      const lotNumber = matchedCntr?.lote || entry.batch || '-';
                      const warehouseName = matchedCntr ? (yards[matchedCntr.yardId]?.name || matchedCntr.yardId) : entry.bondedWarehouse;
                      const modelName = matchedCntr?.modelo || entry.component || '-';
                      
                      return (
                        <tr key={entry.id || index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                          <td className="p-2 pl-3 font-bold text-slate-900 dark:text-white select-all">{entry.cntrsOriginal}</td>
                          <td className="p-2">{entry.bl}</td>
                          <td className="p-2 font-sans font-bold">{lotNumber}</td>
                          <td className="p-2 font-sans uppercase text-[10.5px]">{warehouseName}</td>
                          <td className="p-2 font-sans font-extrabold text-blue-600 dark:text-blue-400">{modelName}</td>
                          <td className="p-2 font-sans uppercase">
                            <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-black ${entry.statusComex === 'CARGO DELIVERED' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/20'}`}>
                              {entry.statusComex}
                            </span>
                          </td>
                          <td className="p-2 font-sans uppercase">
                            <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-black ${entry.status === 'ENTREGUE' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
                              {entry.status || 'PENDENTE'}
                            </span>
                          </td>
                          <td className="p-2 font-sans font-bold">{entry.carrier || 'N/A'}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {isBufferMapMaximized && (
        <div className="fixed inset-0 z-[120] bg-slate-950/98 backdrop-blur-lg flex flex-col overflow-hidden text-white font-sans animate-fade-in">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-5 border-b border-slate-850 bg-[#0b0f19]/80 backdrop-blur-md sticky top-0 z-20">
            <div>
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-red-500 animate-pulse" />
                <h3 className="text-sm font-black tracking-widest uppercase text-slate-100">
                  {language === 'zh' ? '全屏 2D 智能监控：堆场通道 alocação' : 'Monitoramento 2D Maximizado do Buffer'}
                </h3>
              </div>
              <div className="text-[10.5px] text-gray-400 font-bold mt-1.5 flex flex-wrap items-center gap-2">
                <span>{language === 'zh' ? '当前区域:' : 'Área Ativa:'}</span>
                <select
                  value={activeBufferId}
                  onChange={(e) => setActiveBufferId(e.target.value)}
                  className="bg-[#1e293b] text-white border border-slate-700 text-[10.5px] font-black rounded px-2 py-0.5 outline-none cursor-pointer"
                >
                  {bufferAreas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
                <span className="font-mono bg-slate-850 px-2 py-0.5 rounded text-gray-400">
                  COORD: {getCurrentBufferArea().rows}x{getCurrentBufferArea().cols}
                </span>
              </div>
            </div>

            {/* Middle Stats Bar */}
            <div className="flex items-center gap-4 flex-wrap bg-[#1e293b]/40 border border-slate-800 p-2 rounded-xl">
              <div className="flex flex-col text-center">
                <span className="text-[9px] text-gray-400 uppercase font-bold">{language === 'zh' ? '占用率' : 'Ocupação'}</span>
                <span className="text-sm font-black text-white font-mono">
                  {getCurrentBufferOccupancy().occupied} / {getCurrentBufferOccupancy().total} Slots ({getCurrentBufferOccupancy().percentage}%)
                </span>
              </div>
              <div className="h-6 w-px bg-slate-800"></div>
              <div className="flex flex-col text-center">
                <span className="text-[9px] text-blue-400 uppercase font-bold">{language === 'zh' ? '重箱' : 'Cheios'}</span>
                <span className="text-sm font-black text-blue-400 font-mono">
                  {getCurrentBufferOccupancy().totalFull}
                </span>
              </div>
              <div className="h-6 w-px bg-slate-800"></div>
              <div className="flex flex-col text-center">
                <span className="text-[9px] text-slate-400 uppercase font-bold">{language === 'zh' ? '空箱' : 'Vazios (Swap)'}</span>
                <span className="text-sm font-black text-slate-300 font-mono">
                  {getCurrentBufferOccupancy().totalEmpty}
                </span>
              </div>
              <div className="h-6 w-px bg-slate-800"></div>
              <div className="flex flex-col text-center">
                <span className="text-[9px] text-emerald-400 uppercase font-bold">{language === 'zh' ? '直接提车' : 'Rota Rápida'}</span>
                <span className="text-sm font-black text-emerald-400 font-mono">
                  {getCurrentBufferOccupancy().optimalCount}
                </span>
              </div>
            </div>

            {/* Actions & Filters */}
            <div className="flex items-center gap-3 self-stretch md:self-auto justify-between">
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg">
                <span className="text-[10px] text-gray-400 uppercase font-black tracking-wider flex items-center gap-1">
                  <Filter className="w-3 h-3 text-red-500" />
                  {language === 'zh' ? '过滤:' : 'Filtro:'}
                </span>
                <button
                  type="button"
                  onClick={() => setBufferStatusFilter('ALL')}
                  className={`px-2 py-0.5 rounded text-[10px] font-black transition-all cursor-pointer ${
                    bufferStatusFilter === 'ALL'
                      ? 'bg-red-650 text-white'
                      : 'bg-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  {language === 'zh' ? '全' : 'Todos'}
                </button>
                <button
                  type="button"
                  onClick={() => setBufferStatusFilter('CHEIO')}
                  className={`px-2 py-0.5 rounded text-[10px] font-black transition-all cursor-pointer ${
                    bufferStatusFilter === 'CHEIO'
                      ? 'bg-blue-600 text-white'
                      : 'bg-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  {language === 'zh' ? '重' : 'Cheios'}
                </button>
                <button
                  type="button"
                  onClick={() => setBufferStatusFilter('VAZIO')}
                  className={`px-2 py-0.5 rounded text-[10px] font-black transition-all cursor-pointer ${
                    bufferStatusFilter === 'VAZIO'
                      ? 'bg-slate-500 text-white'
                      : 'bg-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  {language === 'zh' ? '空' : 'Vazios'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsBufferMapMaximized(false)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-lg flex items-center gap-1.5 shadow-lg shadow-red-600/10 transition-all cursor-pointer border border-transparent"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                {language === 'zh' ? '收起地图 / 返回' : 'Fechar'}
              </button>
            </div>
          </div>

          {/* Grid Area - Expansive scroll stage */}
          <div className="flex-1 overflow-auto p-6 bg-slate-950 flex justify-center items-start">
            <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 shadow-2xl flex flex-col items-center min-w-max">
              
              {/* Columns Header */}
              <div className="flex mb-2 pl-8">
                {Array.from({ length: getCurrentBufferArea().cols }).map((_, c) => (
                  <div key={c} className="w-40 text-center text-[10.5px] font-black text-gray-500 font-mono tracking-wider">
                    COL {c + 1}
                  </div>
                ))}
              </div>

              {/* Rows */}
              <div className="space-y-2.5">
                {Array.from({ length: getCurrentBufferArea().rows }).map((_, r) => {
                  const isNumericArea = activeBufferId.includes('buffer-e') || activeBufferId.includes('buffer-b');
                  const rowLetter = isNumericArea ? String(r + 1) : String.fromCharCode(65 + r);
                  return (
                    <div key={r} className="flex items-center gap-3">
                      {/* Row Label */}
                      <div className="w-8 text-center text-xs font-black text-gray-400 font-mono bg-slate-850 py-1 rounded">
                        {isNumericArea ? `R${rowLetter}` : rowLetter}
                      </div>

                      {/* Columns */}
                      <div className="flex gap-2.5">
                        {Array.from({ length: getCurrentBufferArea().cols }).map((_, c) => {
                          const slot = getSlotAt(r, c);
                          const isOccupied = !!slot?.containerNo;
                          const isVazio = slot?.status?.toLowerCase().includes('vaz') || slot?.status?.toLowerCase().includes('emp');
                          const isFilteredOut = isOccupied && (
                            (bufferStatusFilter === 'CHEIO' && isVazio) ||
                            (bufferStatusFilter === 'VAZIO' && !isVazio)
                          );

                          return (
                            <div
                              key={c}
                              onClick={() => handleSlotClick(r, c)}
                              className={`
                                w-40 h-28 rounded-xl transition-all duration-300 cursor-pointer select-none relative flex flex-col justify-between p-3 text-left border shadow-sm
                                ${isOccupied
                                  ? (slot.isOptimalPickup
                                    ? 'bg-emerald-950/25 border-emerald-500 hover:border-emerald-400 hover:bg-emerald-950/45 text-white'
                                    : (slot.priority === 'CRITICAL' || slot.priority === 'HIGH'
                                      ? 'bg-red-950/25 border-red-500 hover:border-red-400 hover:bg-red-950/45 text-white'
                                      : (isVazio
                                        ? 'bg-slate-900/60 border-slate-700 hover:border-slate-500 text-slate-400'
                                        : 'bg-blue-950/20 border-blue-500 hover:border-blue-400 hover:bg-blue-950/40 text-white'
                                      )
                                    )
                                  )
                                  : 'border-dashed border-slate-800 bg-transparent hover:border-red-500 hover:bg-slate-850/45 hover:shadow-inner'
                                }
                                ${isFilteredOut ? 'opacity-10 saturate-50 blur-[0.4px] pointer-events-none' : ''}
                              `}
                            >
                              {/* Top Indicators Row */}
                              <div className="flex justify-between items-start">
                                <span className="text-[8.5px] font-mono font-black text-gray-400 bg-slate-800/80 px-1.5 py-0.5 rounded">
                                  {isNumericArea ? `${activeBufferId.includes('buffer-e') ? 'E' : 'B'}_${rowLetter}_${c + 1}` : `${rowLetter}${c + 1}`}
                                </span>

                                {isOccupied && (
                                  <div className="flex gap-1 items-center">
                                    {slot.isOptimalPickup && (
                                      <span className="flex h-2.5 w-2.5 relative">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                      </span>
                                    )}
                                    <span className="text-[7.5px] font-mono font-black bg-slate-800 px-1.5 py-0.5 rounded text-gray-200">
                                      {slot.size === '40\' HC' ? "40' HC" : "20' FT"}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Container Identity Box */}
                              {isOccupied ? (
                                <div className="flex flex-col gap-0.5 mt-1.5">
                                  <div className="text-[11.5px] font-black text-slate-100 font-mono tracking-wide flex justify-between items-center">
                                    <span className="truncate select-all select-text">{slot.containerNo}</span>
                                    {isVazio && (
                                      <span className="text-[7.5px] font-black px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded">
                                        {language === 'zh' ? '空箱' : 'VAZIO'}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[9px] font-bold text-gray-400 truncate">
                                    {slot.cargoType}
                                  </div>

                                  {/* WMS Metadata Details (Lot & Free Time End Date) */}
                                  {(slot.loteNo || slot.validade) && (
                                    <div className="text-[8.5px] font-black truncate flex flex-col gap-0.5 mt-1 border-t border-slate-800 pt-1">
                                      {slot.loteNo && (
                                        <span className="text-blue-400 flex items-center gap-1">
                                          <span className="text-[7.5px] text-gray-500 font-bold uppercase">LOTE:</span>
                                          <span className="font-mono tracking-tight">{slot.loteNo}</span>
                                        </span>
                                      )}
                                      {slot.validade && (
                                        <span className="text-amber-400 flex items-center gap-1" title="Free Time End Date (Data de validade)">
                                          <span className="text-[7.5px] text-gray-500 font-bold uppercase">FREE TIME:</span>
                                          <span className="font-mono tracking-tight">{slot.validade}</span>
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
                                  <Plus className="w-5 h-5 text-slate-800 hover:text-red-500 transition-colors" />
                                  <span className="text-[8px] font-black tracking-widest uppercase mt-1">
                                    {language === 'zh' ? '空位置 / 快速分配' : 'Alocar Slot'}
                                  </span>
                                </div>
                              )}

                              {/* Footer Priority and Height details */}
                              {isOccupied && (
                                <div className="flex justify-between items-center text-[8px] font-bold mt-1">
                                  <span className={`px-1.5 py-0.5 rounded text-[7.5px] font-black ${
                                    slot.priority === 'CRITICAL' ? 'bg-red-950 text-red-400 border border-red-900/50' :
                                    slot.priority === 'HIGH' ? 'bg-orange-950 text-orange-400 border border-orange-900/50' :
                                    slot.priority === 'NORMAL' ? 'bg-blue-950 text-blue-400 border border-blue-900/50' :
                                    'bg-slate-800 text-gray-400'
                                  }`}>
                                    {slot.priority}
                                  </span>

                                  {slot.stack && slot.stack.length > 1 && (
                                    <span className="text-[7.5px] font-black text-purple-400 bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-800/40 flex items-center gap-1">
                                      <Layers className="w-3 h-3 inline text-purple-500" />
                                      <span>ALTURA: {slot.stack.length}</span>
                                    </span>
                                  )}

                                  {slot.isOptimalPickup && (
                                    <span className="text-[8.5px] font-extrabold text-emerald-400 flex items-center gap-0.5 animate-pulse">
                                      ⚡ QUICK-OUT
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend Footer */}
              <div className="mt-6 text-[10.5px] text-gray-500 font-bold max-w-2xl text-center leading-relaxed flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-500 shrink-0" />
                <span>
                  {language === 'zh' ? '💡 在全屏模式下，您可以直接看到所有集装箱的批次号(Lote)和有效到期日(Free time)。单击任意格子可直接调出编辑侧边栏，支持叠放高度管理。' : '💡 No modo tela cheia, o Nº do lote e a Data de validade (Free Time) são mostrados diretamente sobre o contêiner. Clique em qualquer slot para editá-lo.'}
                </span>
              </div>

            </div>
          </div>
        </div>
      )}

      </div> {/* Closing right-side workspace wrapper */}
    </div>
  );
}

// SUBCOMPONENTE DE CARD DE PÁTIO (BILINGUE)
interface YardCardProps {
  key?: React.Key;
  yard: Yard;
  ocupacao: number;
  isEdit: boolean;
  isSmall?: boolean;
  theme: string;
  t: (key: string) => string;
  language: string;
  renderLabel: (key: string, colorClass?: string) => React.ReactNode;
  widescreenMode?: boolean;
  onClick?: () => void;
}

function YardCard({ yard, ocupacao, isEdit, isSmall = false, theme, t, language, renderLabel, widescreenMode = false, onClick }: YardCardProps) {
  const isRed = ocupacao >= 89;
  const isYellow = ocupacao > 65 && ocupacao < 89;

  const currentTotal = (yard.cheio || 0) + (yard.vazio || 0);
  const previousTotal = yard.previous_total;
  let trendIcon = null;
  if (previousTotal !== undefined && previousTotal > 0) {
    if (currentTotal > previousTotal) {
      trendIcon = (
        <span className="inline-flex items-center text-rose-500 dark:text-rose-400 ml-1 hover:opacity-80" title={`Aumento de contêineres em relação ao período anterior (${previousTotal}) / 比上期增加 (${previousTotal})`}>
          <TrendingUp className="w-3.5 h-3.5" />
        </span>
      );
    } else if (currentTotal < previousTotal) {
      trendIcon = (
        <span className="inline-flex items-center text-emerald-500 dark:text-emerald-400 ml-1 hover:opacity-80" title={`Redução de contêineres em relação ao período anterior (${previousTotal}) / 比上期减少 (${previousTotal})`}>
          <TrendingDown className="w-3.5 h-3.5" />
        </span>
      );
    }
  }

  let themeColor = "bg-blue-600 text-white"; 
  if (yard.type === 'WAREHOUSE') {
    themeColor = "bg-emerald-600 text-white";
  } else if (yard.type === 'BUFFER') {
    themeColor = "bg-amber-500 text-white";
  }

  let ringClass = "";
  if (isRed) {
    ringClass = "ring-2 ring-red-500 animate-pulse";
  } else if (isYellow) {
    ringClass = "ring-2 ring-amber-500";
  }

  let textStatusColor = "text-[#10b981] font-black"; // safe green
  if (isRed) {
    textStatusColor = "text-red-500 font-black";
  } else if (isYellow) {
    textStatusColor = "text-amber-500 dark:text-amber-400 font-black";
  }

  let barColorClass = "bg-gradient-to-r from-blue-500 to-indigo-600";
  if (isRed) {
    barColorClass = "bg-red-550 bg-red-500";
  } else if (isYellow) {
    barColorClass = "bg-amber-500";
  }

  return (
    <div 
      onClick={onClick}
      className={`rounded-lg border relative transition-all cursor-pointer hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 ${
        widescreenMode ? (isSmall ? 'p-1.5' : 'p-2') : 'p-2.5'
      } ${
        theme === 'dark' 
          ? 'bg-[#1e293b] border-slate-800 text-white' 
          : 'bg-white border-slate-100 shadow-sm'
        } ${ringClass}`}
    >
      
      {/* Topo do Card */}
      <div className={`flex justify-between items-start ${widescreenMode ? 'mb-0.5' : 'mb-1'}`}>
        <div>
          <h4 className={`font-extrabold tracking-tight text-gray-900 dark:text-white uppercase leading-none ${
            widescreenMode ? 'text-[11px]' : 'text-[12.5px]'
          }`}>{yard.name}</h4>
          <div className="block mt-0.5">{renderLabel('activeSupplier', "text-gray-400 dark:text-gray-500 text-[8px]")}</div>
        </div>
        <span className={`font-black rounded uppercase tracking-wider ${
          widescreenMode ? 'text-[7.5px] px-1 py-0.5' : 'text-[8.5px] px-1.5 py-0.5'
        } ${themeColor}`}>
          {yard.type}
        </span>
      </div>

      {/* Barra de Progresso / Ocupação */}
      <div className={widescreenMode ? 'mt-0.5' : 'mt-1'}>
        <div className={`flex justify-between font-bold mb-0.5 ${widescreenMode ? 'text-[8.5px]' : 'text-[10px]'}`}>
          <span className="text-gray-400 flex items-center gap-1">
            {renderLabel('usedCapacity', "text-gray-400 dark:text-gray-500")}
          </span>
          <span className={`${textStatusColor} flex items-center gap-1`}>
            {ocupacao}%
            {trendIcon}
            {isRed && (
              <span className="text-[9.5px] bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200 px-1 py-0.5 rounded font-bold flex items-center">
                {ocupacao >= 100
                  ? (language === 'bilingual' ? '爆仓 / Estouro' : (language === 'zh' ? '爆仓' : 'Estouro'))
                  : (language === 'bilingual' ? '过载 / Crítico' : (language === 'zh' ? '过载' : 'Crítico'))
                }
              </span>
            )}
            {isYellow && (
              <span className="text-[9.5px] bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200 px-1 py-0.5 rounded font-bold flex items-center">
                {language === 'bilingual' ? '注意 / Atenção' : (language === 'zh' ? '注意' : 'Atenção')}
              </span>
            )}
          </span>
        </div>
        <div className="w-full bg-gray-100 dark:bg-slate-700 h-1 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${barColorClass}`}
            style={{ width: `${Math.min(ocupacao, 100)}%` }}
          />
        </div>
      </div>

      {/* Dados Numéricos Centrais */}
      <div className={`grid grid-cols-3 gap-0.5 bg-gray-50/50 dark:bg-slate-800/40 rounded-md text-center ${
        widescreenMode ? 'mt-1 p-0.5' : 'mt-1.5 p-1'
      }`}>
        <div className="flex flex-col justify-between py-0.5">
          <span className="block leading-none">{renderLabel('totalCap', "text-gray-400 dark:text-gray-500")}</span>
          <span className={`font-extrabold text-gray-700 dark:text-gray-200 block mt-0.5 leading-none font-mono ${
            widescreenMode ? 'text-[10px]' : 'text-[11.5px]'
          }`}>{yard.capacity.toLocaleString()}</span>
        </div>
        <div className="flex flex-col justify-between py-0.5 border-l border-r border-gray-100 dark:border-slate-800/60">
          <span className="block leading-none">{renderLabel('full', "text-blue-500 dark:text-blue-400")}</span>
          <span className={`font-extrabold text-blue-600 dark:text-blue-400 block mt-0.5 leading-none font-mono ${
            widescreenMode ? 'text-[10px]' : 'text-[11.5px]'
          }`}>{yard.cheio.toLocaleString()}</span>
        </div>
        <div className="flex flex-col justify-between py-0.5">
          <span className="block leading-none">{renderLabel('empty', "text-slate-400 dark:text-slate-500")}</span>
          <span className={`font-extrabold text-slate-500 dark:text-slate-400 block mt-0.5 leading-none font-mono ${
            widescreenMode ? 'text-[10px]' : 'text-[11.5px]'
          }`}>{yard.vazio.toLocaleString()}</span>
        </div>
      </div>

      {/* Sub-informações adicionais da parte de baixo */}
      <div className={`grid grid-cols-3 gap-0.5 font-bold uppercase pt-0.5 leading-tight ${
        widescreenMode ? 'mt-0.5 text-[8.2px]' : 'mt-1 text-[9px]'
      } text-gray-400`}>
        <div className="text-left">
          <span className="text-gray-400">{language === 'bilingual' ? '港口/Porto' : (language === 'zh' ? '港口' : 'Porto')}:</span> <span className="text-gray-700 dark:text-gray-200 font-extrabold leading-none">{yard.porto}</span>
        </div>
        <div className="text-center">
          <span className="text-gray-400">{language === 'bilingual' ? '待提/Coleta' : (language === 'zh' ? '待提' : 'Coleta')}:</span> <span className="text-blue-500 font-bold leading-none">{yard.prontoColeta}</span>
        </div>
        <div className="text-right">
          <span className="text-gray-400">{language === 'bilingual' ? '已交付/DL' : (language === 'zh' ? '已交付' : 'Deliv.')}:</span> <span className="text-emerald-500 font-bold leading-none">{yard.delivered}</span>
        </div>
      </div>

    </div>
  );
}
