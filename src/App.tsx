import React, { useState, useEffect } from 'react';
import { Calculator, 
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
  List,
  Search, DollarSign
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { CargoReadyVsDeliveredDashboard } from './components/CargoReadyVsDeliveredDashboard';

// FIREBASE INTEGRATION
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch, 
  getDocs, 
  getDoc,
  onSnapshot 
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
// NOVAS ENUMS E INTERFACES (CONTRATO LOG√çSTICA)
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
  cntrsOriginal: string;         // Chave obrigat√≥ria do Container ou 'PENDING-BL-[numero]'
  isPlaceholder?: boolean;       // Flag para linhas sem equipamento/container definido ainda
  shipper?: string;
  freightForwarder?: string;
  shipowner?: string;
  bondedWarehouse?: string;      // Porto Seco / Armaz√©m Alfandegado
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
  di?: string;                   // Declara√ß√£o de Importa√ß√£o
  notaFiscal?: string;
  dateNotaFiscal?: string | Date;
  parametrization?: string;      // Canal Verde, Amarelo, Vermelho, Cinza
  channelDate?: string | Date;
  valuePerCntr?: number;         // Valor Unit√°rio da Di√°ria / Frete
  incoterm?: string;

  // Transporte & Entrega F√≠sica
  carrier?: string;              // Transportadora
  typeOfTruck?: string;
  tmsDespatchNo?: string;
  onSitePlaceOfDelivery?: string;
  depot?: string;                // Terminal de Devolu√ß√£o de Vazio
  voyage?: string;
  cargoPresence?: string;
  dsa?: string;                  // Declara√ß√£o de Tr√¢nsito Aduaneiro (DSA / DTA)
  cntrBbkAir?: string;
  operationScope?: string;
  
  // Datas e Cronogramas
  arrivalVessel?: string;        // Navio de Chegada
  ata?: string | Date;           // Actual Time of Arrival
  cargoReadyDate?: string | Date;
  deadlinePickUpDsa?: string | Date;
  desembaracoDeadlineReturnCntr?: string | Date;
  deadlineReturnCntr?: string | Date; // Free Time Limit Date (Devolu√ß√£o de Container)
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
  en: string;
}

const TRANSLATIONS: { [key: string]: TranslationItem } = {
  systemTitle: {
    pt: "SISTEMA DE CONTROLE DE P√ÅTIOS BYD",
    zh: "BYD Â†ÜÂú∫ÁÆ°ÊéßÁ≥ªÁªü",
    en: "BYD YARD CONTROL SYSTEM"
  },
  slideTitle: {
    pt: "DASHBOARD OPERACIONAL & CAPACIDADE DE P√ÅTIOS",
    zh: "Â†ÜÂú∫ËøêËê•‰∏éÂÆπÈáèÁõëÊéßÁªºÂêàÁúãÊùø",
    en: "OPERATIONAL DASHBOARD & YARD CAPACITY"
  },
  slideSubtitle: {
    pt: "Monitoramento de Ocupa√ß√£o, Backlog Projetado e Escalas de Navios",
    zh: "Â†ÜÂú∫‰ΩøÁî®Áéá„ÄÅÈ¢ÑÊµãÁßØÂéã‰∏éËàπËà∂Èù†Ê≥äËÆ°ÂàíÁõëÊéß",
    en: "Occupancy Monitoring, Projected Backlog & Vessel Schedules"
  },
  activeSupplier: {
    pt: "FORNECEDOR BYD ATIVO",
    zh: "ÊØî‰∫öËø™Âêà‰ΩúÂ†ÜÂú∫",
    en: "ACTIVE BYD SUPPLIER"
  },
  usedCapacity: {
    pt: "Capacidade Usada",
    zh: "Â∑≤Áî®ÂÆπÈáè",
    en: "Used Capacity"
  },
  totalCap: {
    pt: "Capacidade Total",
    zh: "ÊÄªÂÆπÈáè",
    en: "Total Capacity"
  },
  full: {
    pt: "Cheio (Full)",
    zh: "ÈáçÁÆ± (Full)",
    en: "Full (Loaded)"
  },
  empty: {
    pt: "Vazio (Empty)",
    zh: "Á©∫ÁÆ± (Empty)",
    en: "Empty (Vazio)"
  },
  porto: {
    pt: "No Porto",
    zh: "Âú®Ê∏Ø",
    en: "In Port"
  },
  prontoColeta: {
    pt: "Pronto para Coleta",
    zh: "ÂæÖÊèêË¥ß",
    en: "Ready for Pickup"
  },
  delivered: {
    pt: "Entregue (Delivered)",
    zh: "Â∑≤‰∫§‰ªò (Delivered)",
    en: "Delivered"
  },
  overflow: {
    pt: "Estouro / Excesso",
    zh: "Ë∂ÖÂÆπ / ÁàÜ‰ªì",
    en: "Overflow / Exceeded"
  },
  vesselSchedule: {
    pt: "Escala de Navios Ativos (ETA)",
    zh: "Ê¥ªË∑ÉËàπËà∂Èù†Ê≥äËÆ°Âàí (ETA)",
    en: "Active Vessel Schedule (ETA)"
  },
  projected: {
    pt: "Projetado",
    zh: "È¢ÑÊµã",
    en: "Projected"
  },
  vessel: {
    pt: "Navio (Vessel)",
    zh: "ËàπÂêç (Vessel)",
    en: "Vessel Name"
  },
  eta: {
    pt: "ETA (Chegada)",
    zh: "È¢ÑËÆ°ÊäµËææ (ETA)",
    en: "ETA (Arrival)"
  },
  cntrs: {
    pt: "Cont√™ineres",
    zh: "ÁÆ±Èáè (CNTRs/CNTRs)",
    en: "Containers"
  },
  totalContainers: {
    pt: "Soma Total de Cont√™ineres",
    zh: "ÈõÜË£ÖÁÆ±ÊÄªÊï∞",
    en: "Total Containers"
  },
  noVessels: {
    pt: "Nenhum navio programado.",
    zh: "ÊöÇÊó†ÊéíÊúüËàπËà∂„ÄÇ",
    en: "No scheduled vessels."
  },
  chartLeftTitle: {
    pt: "Backlog Projetado vs Capacidade de Entrega (Semanal)",
    zh: "È¢ÑÊµãÁßØÂéãÈáè vs ‰∫§‰ªòËÉΩÂäõ (Âë®Â∫¶)",
    en: "Projected Backlog vs Delivery Capacity (Weekly)"
  },
  chartRightTitle: {
    pt: "Fluxo de Entradas Di√°rias vs Meta Garantida (Gc)",
    zh: "ÊØèÊó•ËøõÁÆ±Èáè vs ‰øùËØÅÁõÆÊ†á (Gc)",
    en: "Daily Inflow vs Guaranteed Target (Gc)"
  },
  opHigh: {
    pt: "Opera√ß√£o Alta",
    zh: "È´òË¥üËç∑ËøêË°å",
    en: "High Operation"
  },
  opStable: {
    pt: "Opera√ß√£o Est√°vel",
    zh: "Á®≥ÂÆöËøêË°å",
    en: "Stable Operation"
  },
  metaGc: {
    pt: "Meta Gc (140)",
    zh: "Gc ÁõÆÊ†á (140)",
    en: "Target Gc (140)"
  },
  confidential: {
    pt: "CONFIDENCIAL BYD LOG√çSTICA",
    zh: "ÊØî‰∫öËø™Áâ©ÊµÅÊú∫ÂØÜ",
    en: "CONFIDENTIAL BYD LOGISTICS"
  },
  nationalOperations: {
    pt: "Opera√ß√µes Nacionais",
    zh: "ÂõΩÂÜÖËøêËê•",
    en: "National Operations"
  },
  logistics: {
    pt: "Log√≠stica Integrada",
    zh: "ÁªºÂêàÁâ©ÊµÅ",
    en: "Integrated Logistics"
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
  operatingDays: string;
  operatingHours: string;
  status: 'Open' | 'Closed';
  isAlert: boolean;
}


// DADOS INICIAIS DA IMAGEM ORIGINAL (Para restaura√ß√£o e estado inicial)
const ORIGINAL_YARDS: YardsState = {
  tecon: { name: 'TECON', type: 'BONDED', capacity: 2000, cheio: 1643, vazio: 0, porto: 576, prontoColeta: 2253, delivered: 5535, previous_total: 1600 },
  intermaritima: { name: 'INTERMARITIMA', type: 'BONDED', capacity: 800, cheio: 735, vazio: 0, porto: 252, prontoColeta: 671, delivered: 5948, previous_total: 750 },
  tpc: { name: 'TPC', type: 'BONDED', capacity: 1200, cheio: 843, vazio: 0, porto: 698, prontoColeta: 431, delivered: 3679, previous_total: 800 },
  clia: { name: 'CLIA EMPORIO', type: 'BONDED', capacity: 300, cheio: 109, vazio: 0, porto: 48, prontoColeta: 55, delivered: 371, previous_total: 120 },
  ag: { name: 'AG - INTER CDEX', type: 'WAREHOUSE', capacity: 2200, cheio: 844, vazio: 0, porto: 0, prontoColeta: 122, delivered: 144, previous_total: 850 },
  cts: { name: 'CTS - PONTUAL', type: 'WAREHOUSE', capacity: 1200, cheio: 0, vazio: 0, porto: 0, prontoColeta: 0, delivered: 0, previous_total: 0 },
  cts_jew: { name: 'CTS - JEW', type: 'WAREHOUSE', capacity: 500, cheio: 0, vazio: 0, porto: 0, prontoColeta: 0, delivered: 0, previous_total: 0 },
  cts_logic: { name: 'CTS - LOGIC', type: 'WAREHOUSE', capacity: 500, cheio: 0, vazio: 0, porto: 0, prontoColeta: 0, delivered: 0, previous_total: 0 },
  cts_uni: { name: 'CTS - UNI', type: 'WAREHOUSE', capacity: 500, cheio: 0, vazio: 0, porto: 0, prontoColeta: 0, delivered: 0, previous_total: 0 },
  cts_vbr: { name: 'CTS - VBR', type: 'WAREHOUSE', capacity: 500, cheio: 0, vazio: 0, porto: 0, prontoColeta: 0, delivered: 0, previous_total: 0 },
  logic: { name: 'LOGIC', type: 'WAREHOUSE', capacity: 1000, cheio: 0, vazio: 0, porto: 0, prontoColeta: 0, delivered: 0, previous_total: 0 },
  multilog: { name: 'MULTILOG', type: 'WAREHOUSE', capacity: 1500, cheio: 0, vazio: 0, porto: 0, prontoColeta: 0, delivered: 0, previous_total: 0 },
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

  // ESTADOS DE BACKLOG DE F√ÅBRICA
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

  const getSummary = (list: [string, Yard][], isBuffer = false) => {
    const totalCap = list.reduce((sum, [_, y]) => sum + (y?.capacity || 0), 0);
    const totalCheio = list.reduce((sum, [_, y]) => sum + (y?.cheio || 0), 0);
    const totalVazio = list.reduce((sum, [_, y]) => sum + (y?.vazio || 0), 0);
    const totalOccupied = isBuffer ? (totalCheio + totalVazio) : totalCheio;
    const pct = totalCap > 0 ? Math.round((totalOccupied / totalCap) * 100) : 0;
    return { totalCap, totalCheio, totalVazio, totalOccupied, pct };
  };

  const bondedSum = getSummary(bondedYards, false);
  const warehouseSum = getSummary(warehouseYards, false);
  const bufferSum = getSummary(bufferYards, true);

  const getDynamicChartLeft = () => {
    const bondedVal = bondedSum?.totalCheio || 0;
    const warehouseVal = warehouseSum?.totalCheio || 0;
    const bufferVal = bufferSum?.totalOccupied || (bufferSum?.totalCheio || 0) + (bufferSum?.totalVazio || 0);
    
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

  const matchContainerSearch = (c: Container, rawQuery: string) => {
    if (!rawQuery) return true;
    const q = rawQuery.trim().toLowerCase();
    if (q.startsWith('lot ') || q.startsWith('lote ')) {
      const lotTerm = q.replace(/^(lot|lote)\s+/, '').trim();
      if (!lotTerm) return true;
      const clote = String(c.lote || '').toLowerCase();
      return clote.includes(lotTerm);
    }
    const cid = String(c.id || '').toLowerCase();
    const cbl = String(c.bl || '').toLowerCase();
    const clote = String(c.lote || '').toLowerCase();
    const cmodel = String(c.modelo || '').toLowerCase();
    const ccomp = String(c.componente || '').toLowerCase();
    return cid.includes(q) || cbl.includes(q) || clote.includes(q) || cmodel.includes(q) || ccomp.includes(q);
  };

  // ESTADOS DE CONT√äINERES (Para detalhamento por √°rea)
  const [globalFilterQuery, setGlobalFilterQuery] = useState("");
  const [selectedYardKey, setSelectedYardKey] = useState<string | null>(null);
  const [containers, setContainers] = useState<Container[]>(() => JSON.parse(JSON.stringify(INITIAL_CONTAINERS)));
  
  // Estados para formul√°rio de cadastro de novo cont√™iner
  const [newContainerId, setNewContainerId] = useState("");
  const [newContainerSize, setNewContainerSize] = useState("40' HC");
  const [newContainerStatus, setNewContainerStatus] = useState<'CHEIO' | 'VAZIO'>('CHEIO');
  const [newContainerCategory, setNewContainerCategory] = useState<'PORTO' | 'PRONTO_COLETA' | 'DELIVERED' | 'GERAL'>('GERAL');
  const [newContainerVessel, setNewContainerVessel] = useState("N/A");

  // CONFIGURA√á√ïES DOS BUFFERS BYD
  const defaultBufferAreas: BufferArea[] = [
    {
      id: "buffer-e",
      name: "BYD Buffer E (Zona E / EÂå∫ - Ativo)",
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
      name: "BYD Buffer B (Zona B / BÂå∫ - Ativo)",
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
      name: "BYD Buffer Alfa (Zona R√°pida / Âø´ÈÄüÊã®Â§áÂå∫)",
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
      name: "BYD Buffer Beta (Estoque Auxiliar / Â§áÁî®ÁºìÂÜ≤Âå∫)",
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
  const [bufferViewMode, setBufferViewMode] = useState<'map' | 'list'>('map');
  const [bufferSearch, setBufferSearch] = useState("");
  const [bufferLoteFilter, setBufferLoteFilter] = useState("ALL");
  const [editingSlot, setEditingSlot] = useState<BufferSlot | null>(null);
  const [editingSlotAreaId, setEditingSlotAreaId] = useState<string | null>(null);
  const [editingStackIndex, setEditingStackIndex] = useState<number>(0);
  const [isBufferMapMaximized, setIsBufferMapMaximized] = useState<boolean>(false);
  const [bufferStatusFilter, setBufferStatusFilter] = useState<'ALL' | 'CHEIO' | 'VAZIO'>('ALL');
  
  // Efeito para salvar buffers no LocalStorage e sincronizar com yards
  useEffect(() => {
    localStorage.setItem('byd_buffer_areas', JSON.stringify(bufferAreas));

    let totalFull = 0;
    let totalEmpty = 0;
    bufferAreas.forEach(area => {
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
    });

    setYards(prev => {
        if (prev.buffer && (prev.buffer.cheio === totalFull && prev.buffer.vazio === totalEmpty)) {
            return prev;
        }
        return {
          ...prev,
          buffer: {
            ...prev.buffer,
            cheio: totalFull,
            vazio: totalEmpty
          }
        };
    });
  }, [bufferAreas]);

  // NAVEGA√á√ÉO DE SLIDES E COMENT√ÅRIOS DAS NOVAS P√ÅGINAS
  const [currentSlide, setCurrentSlide] = useState(0); // 0: Geral, 1: P√°tios, 2: Navios, 3: Gr√°ficos
  const [chartTab, setChartTab] = useState<'drain' | 'space'>('space');
  const [yardsComment, setYardsComment] = useState("Inserir coment√°rios sobre a capacidade e ocupa√ß√£o dos p√°tios de forma bil√≠ngue aqui. / Âú®Ê≠§ËæìÂÖ•ÂÖ≥‰∫éÂ†ÜÂú∫ÂÆπÈáè„ÄÅÂç†Áî®ÊØîÁéáÁöÑÂèåËØ≠ËØ¥Êòé„ÄÇ");
  const [vesselNote1, setVesselNote1] = useState("Escala regular de navios ativa - Monitoramento detalhado das janelas de atraca√ß√£o. / Â∏∏ËßÑÊ¥ªË∑ÉËàπËà∂Èù†Ê≥äËÆ°Âàí - ËØ¶ÁªÜÁõëÊéßÂíåÁÆ°ÁêÜÊ≥ä‰ΩçÁ™óÂè£„ÄÇ");
  const [vesselNote2, setVesselNote2] = useState("Destaques operacionais dos navios (Ex: Prioridades de descarga BYD). / ËàπËà∂ËøêËê•ÈáçÁÇπ‰∫ÆÁÇπ (‰æãÂ¶ÇÔºöÊØî‰∫öËø™ÈáçÁÆ±Âç∏Ëàπ‰ºòÂÖàÈ°∫Â∫è)„ÄÇ");
  const [chartNote1, setChartNote1] = useState("Coment√°rios sobre o Backlog Projetado vs Capacidade de Entrega Semanal. / È¢ÑÊµãÁßØÂéãÈáè‰∏éÂë®Â∫¶‰∫§‰ªòËÉΩÂäõÁöÑÂØπÊØîÂàÜÊûêËØ¥Êòé„ÄÇ");
  const [chartNote2, setChartNote2] = useState("An√°lise de gargalos e metas di√°rias garantidas (meta Gc de 140). / ÂÖ≥‰∫éÊØèÊó•ËøõÁÆ±Èáè‰∏é‰øùËØÅÁõÆÊ†á (Gc 140) ÁöÑÁì∂È¢àÂàÜÊûêÂíåÂª∫ËÆÆ„ÄÇ");

  // NEW TAB STATES: PLANO DE DIRECIONAMENTO (ALLOCATION PLANNER)
  const [plannerCostStrategy, setPlannerCostStrategy] = useState<Record<string, string>>({
    '48hs': 'tecon', '7d': 'inter', '10d': 'inter', '15d': 'tpc', '20d': 'tpc', '25d': 'tpc'
  });
  const [plannerJustification, setPlannerJustification] = useState("Cost optimization prioritizing TECON for short-term due to volume constraints, and TPC for extended storage considering competitive tiered rates.");
  const [plannerPeriods, setPlannerPeriods] = useState([
    {
      isHistoric: false,
      id: 1,
      dateRange: "30/07 - 03/08",
      totalVolume: 1315,
      allocTecon: 40,
      allocInter: 30,
      allocTpc: 30,
      outflowTecon: 150,
      outflowInter: 100,
      outflowTpc: 100,
    },
    {
      isHistoric: false,
      id: 2,
      dateRange: "04/08 - 09/08",
      totalVolume: 800,
      allocTecon: 30,
      allocInter: 30,
      allocTpc: 40,
      outflowTecon: 200,
      outflowInter: 150,
      outflowTpc: 150,
    }
  ]);

  // ESTADOS PARA CONTROLE E ALOCA√á√ÉO DE DEP√ìSITOS (DEPOT CONTROL & ALLOCATION)
  const [depots, setDepots] = useState<Depot[]>(() => {
    const saved = localStorage.getItem('byd_depots_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) return parsed;
      } catch (e) { console.error(e); }
    }
    return [
      { id: 'pontual', name: 'PONTUAL', avgVolume: 57, maxCapacity: 80, operatingDays: 'Mon - Fri', operatingHours: '07:30 - 17:00' },
      { id: 'lechman', name: 'LECHMAN', avgVolume: 48, maxCapacity: 60, operatingDays: 'Mon - Fri', operatingHours: '07:30 - 17:00' },
      { id: '3alog', name: '3ALOG', avgVolume: 26, maxCapacity: 40, operatingDays: 'Mon - Fri', operatingHours: '07:30 - 17:00' },
      { id: 'jw', name: 'J&W', avgVolume: 24, maxCapacity: 30, operatingDays: 'Mon - Fri', operatingHours: '07:30 - 17:00' },
      { id: 'ziran', name: 'ZIRAN', avgVolume: 23, maxCapacity: 35, operatingDays: 'Mon - Fri', operatingHours: '07:30 - 17:00' },
      { id: 'wilson', name: 'WILSON SONS', avgVolume: 23, maxCapacity: 24, operatingDays: 'Mon - Fri', operatingHours: '07:30 - 17:00' },
      { id: 'tecon', name: 'TECON', avgVolume: 14, maxCapacity: 20, operatingDays: 'Mon - Fri', operatingHours: '07:30 - 17:00' },
      { id: 'vbr', name: 'VBR', avgVolume: 8, maxCapacity: 10, operatingDays: 'Mon - Fri', operatingHours: '07:30 - 17:00' },
      { id: 'area23', name: 'AREA 23 - TECON', avgVolume: 7, maxCapacity: 5, operatingDays: 'Mon - Fri', operatingHours: '07:30 - 17:00' }
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

  
  // IDIOMA ATIVO: 'pt' (Portugu√™s) | 'zh' (Mandarim) | 'bilingual' (Ambos)
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

  // ESTADOS DO NOVO M√ìDULO DE LOG√çSTICA & ENTREGAS
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

  // ESTADOS DO NOVO FORM DE VINCULAR CONTAINER DOS P√ÅTIOS (WAREHOUSES)
  const [ydScheduleMode, setYdScheduleMode] = useState<'container' | 'bl'>('container');
  const [ydSearchFilter, setYdSearchFilter] = useState<string>("");
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
  
  // ESTADOS DO PAINEL DE ENTREGAS & CALEND√ÅRIO
  const [operationalMonth, setOperationalMonth] = useState("2026-07");
  const [selectedWeek, setSelectedWeek] = useState("2026-W29");
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState<string | null>(null);
  const [selectedDayCalendar, setSelectedDayCalendar] = useState<string | null>(null);
  const [calendarViewMode, setCalendarViewMode] = useState<'monthly' | 'shipment_info'>('shipment_info');

  // CONFIGURA√á√ïES VISUAIS DO SLIDE (Adaptativo com base no idioma)
  const [slideTitlePT, setSlideTitlePT] = useState("DASHBOARD OPERACIONAL & CAPACIDADE DE P√ÅTIOS");
  const [slideTitleZH, setSlideTitleZH] = useState("Â†ÜÂú∫ËøêËê•‰∏éÂÆπÈáèÁõëÊéßÁúãÊùø");
  const [slideSubtitlePT, setSlideSubtitlePT] = useState("Monitoramento de Ocupa√ß√£o, Backlog Projetado e Escalas de Navios");
  const [slideSubtitleZH, setSlideSubtitleZH] = useState("Â†ÜÂú∫‰ΩøÁî®Áéá„ÄÅÈ¢ÑÊµãÁßØÂéã‰∏éËàπËà∂Èù†Ê≥äËÆ°ÂàíÁõëÊéß");
  
  const [watermarkText, setWatermarkText] = useState("H2LUIZ-VI / luiz.vieira - 2026-05-21");
  const [showWatermark, setShowWatermark] = useState(true);
  const [theme, setTheme] = useState('light'); // 'light' ou 'dark'
  const [pdfStatus, setPdfStatus] = useState<'idle' | 'rendering' | 'success' | 'error'>('idle');
  
  // Controle de Menu Lateral Recolh√≠vel / Ocult√°vel
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('byd_sidebar_collapsed');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('byd_sidebar_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);
  
  // PARADIGMAS DE VISUALIZA√á√ÉO: 'website' (Estilo Site SaaS Fluido) ou 'ppt' (Apresenta√ß√£o Core)
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

  // ESTADOS DE INTERFACE E EDI√á√ÉO
  const [isEditMode, setIsEditMode] = useState(true);
  const [activeTab, setActiveTab] = useState('yards'); // yards | vessels | charts | config
  const [widescreenMode, setWidescreenMode] = useState(false); // Trava a propor√ß√£o de 16:9 de PPT
  const [slideWidth, setSlideWidth] = useState<number>(1480); // Default set wider (1480px) to prevent wrapping
  const [slideScale, setSlideScale] = useState<number>(1.0); // Content scaling zoom slider
  const [autoFit, setAutoFit] = useState<boolean>(true); // Auto-ajustar √† tela para evitar corte de informa√ß√µes
  const [sidePanelWidth, setSidePanelWidth] = useState<number>(440); // Width of the side editor panel (Wild slider option)
  const [isDesktop, setIsDesktop] = useState(true);

  // CONTROLE DE EXPANS√ÉO / RECOLHIMENTO DE NAVIOS POR M√äS
  const [expandedVesselMonths, setExpandedVesselMonths] = useState<Record<string, boolean>>({});

  const groupVesselsByMonth = (vesselList: Vessel[], lang: string) => {
    const ptMonths = ['Janeiro', 'Fevereiro', 'Mar√ßo', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const zhMonths = ['1Êúà', '2Êúà', '3Êúà', '4Êúà', '5Êúà', '6Êúà', '7Êúà', '8Êúà', '9Êúà', '10Êúà', '11Êúà', '12Êúà'];
    const enMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const groups: Record<string, {
      monthKey: string;
      year: number;
      month: number;
      monthLabel: string;
      vessels: Vessel[];
      totalCntrs: number;
    }> = {};

    vesselList.forEach(vessel => {
      let year = 2026;
      let month = 5;

      const etaStr = String(vessel.eta || '').trim();
      if (etaStr) {
        if (etaStr.includes('/')) {
          const parts = etaStr.split('/');
          if (parts.length >= 2) {
            const m = parseInt(parts[1], 10);
            if (!isNaN(m) && m >= 1 && m <= 12) month = m;
            if (parts.length >= 3) {
              let y = parseInt(parts[2], 10);
              if (!isNaN(y)) {
                if (y < 100) y += 2000;
                year = y;
              }
            }
          }
        } else if (etaStr.includes('-')) {
          const parts = etaStr.split('-');
          if (parts.length >= 2) {
            let y = parseInt(parts[0], 10);
            let m = parseInt(parts[1], 10);
            if (parts[0].length === 4 && !isNaN(y) && !isNaN(m)) {
              year = y;
              if (m >= 1 && m <= 12) month = m;
            } else if (parts.length >= 3) {
              const m2 = parseInt(parts[1], 10);
              const y2 = parseInt(parts[2], 10);
              if (!isNaN(m2) && m2 >= 1 && m2 <= 12) month = m2;
              if (!isNaN(y2)) year = y2 < 100 ? y2 + 2000 : y2;
            }
          }
        }
      }

      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      const ptLabel = `${ptMonths[month - 1]} ${year}`;
      const zhLabel = `${year}Âπ¥${zhMonths[month - 1]}`;
      const enLabel = `${enMonths[month - 1]} ${year}`;
      
      let monthLabel = ptLabel;
      if (lang === 'zh') monthLabel = zhLabel;
      else if (lang === 'en') monthLabel = enLabel;
      else if (lang === 'bilingual') monthLabel = `${ptMonths[month - 1]} / ${zhMonths[month - 1]} (${year})`;

      if (!groups[monthKey]) {
        groups[monthKey] = {
          monthKey,
          year,
          month,
          monthLabel,
          vessels: [],
          totalCntrs: 0,
        };
      }

      groups[monthKey].vessels.push(vessel);
      groups[monthKey].totalCntrs += (Number(vessel.cntrs) || 0);
    });

    return Object.values(groups).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  };

  const toggleVesselMonth = (monthKey: string) => {
    setExpandedVesselMonths(prev => ({
      ...prev,
      [monthKey]: !prev[monthKey]
    }));
  };

  const toggleAllVesselMonths = (groups: { monthKey: string }[]) => {
    const anyOpen = groups.some(g => expandedVesselMonths[g.monthKey]);
    const newMap: Record<string, boolean> = {};
    if (!anyOpen) {
      groups.forEach(g => { newMap[g.monthKey] = true; });
    }
    setExpandedVesselMonths(newMap);
  };
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
          console.error("Erro na confirma√ß√£o:", e);
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

  // C√ÅLCULO DE METRICAS DO HEADER / HEADER STATS
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
    if (language === 'en') return <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1 font-sans">{dyn.subEN}</p>;
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

  // 1. ESCUTA O ESTADO DE AUTENTICA√á√ÉO DO FIREBASE
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
      console.warn("Primeira inicializa√ß√£o de yards ignorada (sem permiss√£o ou j√° feito):", e);
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
      console.warn("Primeira inicializa√ß√£o de containers ignorada:", e);
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
      console.warn("Primeira inicializa√ß√£o de vessels ignorada:", e);
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
      console.log("Sincroniza√ß√£o for√ßada de chartLeft executada com sucesso!");
    } catch (e) {
      console.warn("Erro ao for√ßar inicializa√ß√£o de chartLeft:", e);
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
      console.warn("Primeira inicializa√ß√£o de chartLeft ignorada:", e);
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
      console.warn("Primeira inicializa√ß√£o de chartRight ignorada:", e);
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
      console.warn("Primeira inicializa√ß√£o de config ignorada:", e);
    }
  };

  // 3. SINCRONIZADOR EM TEMPO REAL ON-SNAPSHOT DO FIRESTORE (MULTI-USER REAL-TIME SYNCHRONIZATION)
  useEffect(() => {
    setDbStatus('connecting');

    // 1. Assinatura em Tempo Real de Yards (P√°tios)
    const unsubYards = onSnapshot(collection(db, 'yards'), (snapshot) => {
      if (snapshot.empty) {
        initializeYardsInDb();
      } else {
        const newYards: YardsState = {};
        snapshot.forEach((docSnap) => {
          newYards[docSnap.id] = docSnap.data() as Yard;
        });

        // Garante integridade de todos os p√°tios padr√£o
        Object.entries(ORIGINAL_YARDS).forEach(([key, originalYard]) => {
          if (!newYards[key]) {
            newYards[key] = { ...originalYard };
            setDoc(doc(db, 'yards', key), originalYard).catch(e => console.warn('Falha ao adicionar novo yard:', e));
          }
        });

        setYards(newYards);
        setDbStatus('online');
      }
    }, (err) => {
      console.warn("Falha no listener de yards:", err);
      setDbStatus('offline');
    });

    // 2. Assinatura em Tempo Real de Buffer Areas (BYD Buffer Interativo Multi-User)
    const unsubBuffers = onSnapshot(collection(db, 'bufferAreas'), (snapshot) => {
      if (snapshot.empty) {
        const batch = writeBatch(db);
        defaultBufferAreas.forEach(area => {
          batch.set(doc(db, 'bufferAreas', area.id), area);
        });
        batch.commit().catch(e => console.warn('Falha ao inicializar bufferAreas no Firestore:', e));
        setBufferAreas(defaultBufferAreas);
      } else {
        const list: BufferArea[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as BufferArea);
        });
        const order = ['buffer-e', 'buffer-b', 'buffer-alfa', 'buffer-beta', 'buffer-intermaritima'];
        list.sort((a, b) => {
          const idxA = order.indexOf(a.id);
          const idxB = order.indexOf(b.id);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return (a.name || '').localeCompare(b.name || '');
        });
        setBufferAreas(list);
      }
    }, (err) => {
      console.warn("Falha no listener de bufferAreas:", err);
    });

    // 3. Assinatura em Tempo Real de Navios (Vessels)
    const unsubVessels = onSnapshot(collection(db, 'vessels'), (snapshot) => {
      if (snapshot.empty) {
        initializeVesselsInDb();
      } else {
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
      }
    }, (err) => {
      console.warn("Falha no listener de vessels:", err);
    });

    // 4. Assinatura em Tempo Real de ChartLeft (Proje√ß√µes e Hist√≥rico)
    const unsubChartLeft = onSnapshot(collection(db, 'chartLeft'), (snapshot) => {
      if (!snapshot.empty) {
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
      }
    }, (err) => {
      console.warn("Falha no listener de chartLeft:", err);
    });

    // 5. Assinatura em Tempo Real de ChartRight
    const unsubChartRight = onSnapshot(collection(db, 'chartRight'), (snapshot) => {
      if (!snapshot.empty) {
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
      }
    }, (err) => {
      console.warn("Falha no listener de chartRight:", err);
    });

    // 6. Assinatura em Tempo Real de Cont√™ineres (Containers)
    const unsubContainers = onSnapshot(collection(db, 'containers'), (snapshot) => {
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
      console.warn("Falha no listener de containers:", err);
    });

    // 7. Assinatura em Tempo Real de Log√≠stica Geral
    const unsubLogistics = onSnapshot(collection(db, 'logisticsData'), (snapshot) => {
      const data: LogisticsEntry[] = [];
      snapshot.forEach(docSnap => {
        data.push({ id: docSnap.id, ...docSnap.data() } as LogisticsEntry);
      });
      setLogisticsEntries(data);
    }, (err) => {
      console.warn("Falha no listener de logisticsData:", err);
    });

    // 8. Assinatura em Tempo Real de Configura√ß√µes Globais
    const unsubConfig = onSnapshot(doc(db, 'config', 'global'), (configDoc) => {
      if (configDoc.exists()) {
        const data = configDoc.data();
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
        if (data.dailyDeliveryRate !== undefined) setDailyDeliveryRate(data.dailyDeliveryRate);
        if (data.additionalBacklog !== undefined) setAdditionalBacklog(data.additionalBacklog);
        if (data.selectedScenario !== undefined) setSelectedScenario(data.selectedScenario);
      } else {
        initializeConfigInDb();
      }
    }, (err) => {
      console.warn("Falha no listener de config:", err);
    });

    // 9. Assinatura em Tempo Real de Depots
    const unsubDepots = onSnapshot(doc(db, 'config', 'depots'), (depotDoc) => {
      if (depotDoc.exists()) {
        const data = depotDoc.data();
        if (data.depots) setDepots(data.depots);
        if (data.depotMatrix) setDepotMatrix(data.depotMatrix);
      }
    }, (err) => {
      console.warn("Falha no listener de depots:", err);
    });

    return () => {
      unsubYards();
      unsubBuffers();
      unsubVessels();
      unsubChartLeft();
      unsubChartRight();
      unsubContainers();
      unsubLogistics();
      unsubConfig();
      unsubDepots();
    };
  }, []);

  // FUN√á√ÉO AUXILIAR PARA OBTER ISO WEEK
  const getISOWeek = (date: Date): string => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  };

  // FUN√á√ÉO AUXILIAR PARA NORMALIZAR DATAS
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

  // FUN√á√ÉO AUXILIAR PARA FORMATAR COLUNA DE DIA DO SHIPMENT INFORMATION
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
          language === 'zh' ? 'ÊòüÊúüÊó•' : 'Sunday',
          language === 'zh' ? 'ÊòüÊúü‰∏Ä' : 'Monday',
          language === 'zh' ? 'ÊòüÊúü‰∫å' : 'Tuesday',
          language === 'zh' ? 'ÊòüÊúü‰∏â' : 'Wednesday',
          language === 'zh' ? 'ÊòüÊúüÂõõ' : 'Thursday',
          language === 'zh' ? 'ÊòüÊúü‰∫î' : 'Friday',
          language === 'zh' ? 'ÊòüÊúüÂÖ≠' : 'Saturday'
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

  // FUN√á√ÉO AUXILIAR PARA ATUALIZA√á√ÉO DO CONFIG SINGLETON NO FIRESTORE
  const updateGlobalDoc = async (field: string, value: any) => {
    try {
      await updateDoc(doc(db, 'config', 'global'), {
        [field]: value
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'config/global');
    }
  };

  // EFEITO DE AUTO-AJUSTE PARA REDIMENSIONAR O SLIDE SEM CORTAR INFORMA√á√ïES
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
      // Garante uma faixa de escalonamento ultra flex√≠vel (de 0.45x at√© 1.15x)
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

  // EFEITO DE ATALHOS DE TECLADO PARA MUDAN√áA DE SLIDES
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return; // Ignora se o usu√°rio estiver digitando
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

  // FUN√á√ïES AUXILIARES DO NOVO M√ìDULO DE LOG√çSTICA
  const handleClearAllLogisticsData = () => {
    const title = language === 'zh' ? 'Ê∏ÖÁ©∫ÂÖ®ÈÉ®Áâ©ÊµÅÊï∞ÊçÆ' : 'Zerar Tudo / Limpar Dados';
    const msg = language === 'zh'
      ? '‚ö†Ô∏è Ë≠¶ÂëäÔºÅËøôÂ∞ÜÊ∞∏‰πÖÂà†Èô§ÊâÄÊúâÂ∑≤ÁôªËÆ∞ÁöÑÈõÜÊàêÁâ©ÊµÅËÆ∞ÂΩï„ÄÇÊÇ®Á°ÆÂÆöË¶ÅÊâßË°åÂêóÔºü'
      : '‚ö†Ô∏è ATEN√á√ÉO! Isso remover√° definitivamente todos os registros de log√≠stica cadastrados no Firestore. Confirmar exclus√£o?';

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
      alert(language === 'zh' ? 'ËØ∑ÈÄâÊã©‰∏Ä‰∏™ÈõÜË£ÖÁÆ±' : 'Por favor, selecione um cont√™iner do p√°tio.');
      return;
    }
    if (ydScheduleMode === 'bl' && !selectedYdBl) {
      alert(language === 'zh' ? 'ËØ∑ÈÄâÊã©‰∏Ä‰∏™ BL' : 'Por favor, selecione um BL do p√°tio.');
      return;
    }
    if (!ydDeliveryDate) {
      alert(language === 'zh' ? 'ËØ∑ÈÄâÊã©‰∫§‰ªòÊéíÁ®ãÊó•Êúü' : 'Por favor, selecione uma data de entrega planejada.');
      return;
    }

    try {
      if (dbStatus === 'online') {
        const batchOp = writeBatch(db);
        
        const targetContainers = ydScheduleMode === 'container'
          ? containers.filter(c => c.id === selectedYdContainerId)
          : containers.filter(c => c.bl === selectedYdBl);

        if (targetContainers.length === 0) {
          alert("Nenhum cont√™iner correspondente encontrado para o agendamento.");
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
        ? (language === 'zh' ? `‚úÖ ÊàêÂäüÁªëÂÆö BL Âπ∂Âú®‰∫§‰ªòÊéíÁ®ã‰∏≠ÂàõÂª∫‰∫ÜÁõ∏ÂÖ≥ÈõÜË£ÖÁÆ±ÁöÑ‰∫§‰ªòÔºÅ` : `‚úÖ Todos os cont√™ineres do BL ${ydBl} foram vinculados e agendados com sucesso no Painel de entregas!`)
        : (language === 'zh' ? '‚úÖ ÊàêÂäüÂ∞Ü‰ªìÂ∫ìÈõÜË£ÖÁÆ±ÁªëÂÆöÂπ∂ÁîüÊàê‰∫§‰ªòÊéíÁ®ãÔºÅ' : '‚úÖ Cont√™iner do p√°tio vinculado e agendado com sucesso!');
      
      alert(successMsg);
    } catch (error) {
      console.error("Erro ao salvar agendamento do p√°tio:", error);
      alert("Houve um erro ao salvar o agendamento no banco de dados.");
    }
  };

  const handleImportParsedRows = async (rows: any[]) => {
    try {
      const batch = writeBatch(db);
      let count = 0;
      
      rows.forEach((row: any) => {
        // Encontrar as chaves dos dados de forma robusta e flex√≠vel (case-insensitive e traduzida)
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
        if (!container) return; // Pula linhas sem identifica√ß√£o de container

        const bl = String(getVal(['bl', 'bill of lading', 'conhecimento', 'hbl']) || '').trim();
        const vessel = String(getVal(['vessel', 'navio', 'ship', 'arrival']) || '').trim();
        const batchNo = String(getVal(['batch', 'lote']) || '').trim();
        const warehouse = String(getVal(['bonded', 'warehouse', 'porto seco', 'armazem', 'alfandegado']) || '').trim();
        const carrier = String(getVal(['carrier', 'transportadora', 'transp']) || '').trim();
        const comex = String(getVal(['comex', 'status comex', 'status_comex']) || 'PENDENTE').trim().toUpperCase();
        const deliveryDate = getVal(['delivery', 'estimated', 'entrega', 'agendada', 'agendamento']);
        const sap = String(getVal(['sap', 'po', 'sap po', 'sap_po']) || '').trim();
        const value = Number(getVal(['value', 'val', 'frete', 'unitario', 'valor'])) || 0;

        // Formata√ß√£o de data simples YYYY-MM-DD
        let formattedDate = "";
        if (deliveryDate) {
          if (typeof deliveryDate === 'number') {
            // Se for data num√©rica serial do Excel
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
        alert(`${count} registros de log√≠stica foram importados e salvos no banco de dados com sucesso!`);
      } else {
        alert("Nenhum registro v√°lido contendo identificador de Container foi encontrado na planilha.");
      }
    } catch (error) {
      console.error("Erro na importa√ß√£o log√≠stica:", error);
      alert("Houve um erro ao processar ou salvar os dados de log√≠stica no Firestore.");
    }
  };

  const handleSyncGoogleSheets = async () => {
    if (!sheetsUrl) {
      alert("Por favor, informe a URL publicada da planilha Google Sheets.");
      return;
    }
    try {
      // Converte URL de visualiza√ß√£o padr√£o do Sheets em exporta√ß√£o CSV se necess√°rio
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
      console.error("Erro na sincroniza√ß√£o:", error);
      alert("Erro ao conectar e sincronizar dados da planilha online. Certifique-se de publicar a planilha na web como CSV e habilitar permiss√µes de acesso p√∫blico.");
    }
  };

  // Estado para novo Navio
  const [newVesselName, setNewVesselName] = useState('');
  const [newVesselEta, setNewVesselEta] = useState('');
  const [newVesselCntrs, setNewVesselCntrs] = useState(1000);

  // Estado para novo P√°tio / Warehouse
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

  // FUN√á√ÉO DE TRADU√á√ÉO DIN√ÇMICA
  const t = (key: string): string => {
    if (!TRANSLATIONS[key]) return key;
    if (language === 'pt') return TRANSLATIONS[key].pt;
    if (language === 'zh') return TRANSLATIONS[key].zh;
    if (language === 'en') return TRANSLATIONS[key].en || TRANSLATIONS[key].pt;
    // Retorno Bil√≠ngue elegante com separador
    return `${TRANSLATIONS[key].pt} / ${TRANSLATIONS[key].zh}`;
  };

  // Elegant bilingual render helper - formats Chinese prominently for high-end feel
  const renderLabel = (key: string, colorClass = "text-gray-400 dark:text-gray-500") => {
    if (!TRANSLATIONS[key]) return <span>{key}</span>;
    const pt = TRANSLATIONS[key].pt;
    const zh = TRANSLATIONS[key].zh;
    const en = TRANSLATIONS[key].en || pt;
    if (language === 'pt') {
      return <span className={`${colorClass} font-semibold uppercase text-[9px] tracking-tight`}>{pt}</span>;
    }
    if (language === 'zh') {
      return <span className="text-slate-800 dark:text-slate-100 font-semibold text-xs tracking-wide font-sans">{zh}</span>;
    }
    if (language === 'en') {
      return <span className={`${colorClass} font-semibold uppercase text-[9px] tracking-tight`}>{en}</span>;
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
    if (language === 'en') return TRANSLATIONS.chartLeftTitle.en || TRANSLATIONS.chartLeftTitle.pt;
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
    if (language === 'en') return TRANSLATIONS.chartRightTitle.en || TRANSLATIONS.chartRightTitle.pt;
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
    if (language === 'en') return TRANSLATIONS[key].en || TRANSLATIONS[key].pt;
    return `${TRANSLATIONS[key].zh} (${TRANSLATIONS[key].pt})`;
  };

  // ==========================================
  // FUN√á√ïES AUXILIARES - BYD BUFFER MODULE
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

    setBufferAreas(prev => {
      const nextAreas = prev.map(area => {
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

        const modifiedArea = {
          ...area,
          slots: updatedSlots
        };

        setDoc(doc(db, 'bufferAreas', editingSlotAreaId), modifiedArea).catch(e => console.warn('Falha ao salvar buffer no Firestore:', e));
        return modifiedArea;
      });
      return nextAreas;
    });

    setEditingSlot(null);
    setEditingSlotAreaId(null);
  };

  const handleClearSlot = () => {
    if (!editingSlot || !editingSlotAreaId) return;

    setBufferAreas(prev => {
      const nextAreas = prev.map(area => {
        if (area.id !== editingSlotAreaId) return area;

        const updatedSlots = [...area.slots];
        const slotIndex = updatedSlots.findIndex(s => s.row === editingSlot.row && s.col === editingSlot.col);

        if (slotIndex > -1) {
          updatedSlots[slotIndex] = {
            row: editingSlot.row,
            col: editingSlot.col
          };
        }

        const modifiedArea = {
          ...area,
          slots: updatedSlots
        };

        setDoc(doc(db, 'bufferAreas', editingSlotAreaId), modifiedArea).catch(e => console.warn('Falha ao limpar slot no Firestore:', e));
        return modifiedArea;
      });
      return nextAreas;
    });

    setEditingSlot(null);
    setEditingSlotAreaId(null);
  };

  const handleCreateNewBufferZone = () => {
    const name = prompt(
      language === 'zh' ? 'ËØ∑ËæìÂÖ•Êñ∞ÂèåËØ≠ÁºìÂÜ≤Âå∫ÂêçÁß∞Ôºö' : 'Digite o nome da nova √Årea de Buffer:',
      `BYD Buffer Gamma (Pe√ßas / Èõ∂ÈÉ®‰ª∂Âå∫)`
    );
    if (!name) return;

    const rowsInput = prompt(language === 'zh' ? 'ËØ∑ËæìÂÖ•Ë°åÊï∞Ôºà1 - 10ÔºâÔºö' : 'Digite a quantidade de Linhas (1 - 10):', '5');
    const colsInput = prompt(language === 'zh' ? 'ËØ∑ËæìÂÖ•ÂàóÊï∞Ôºà1 - 15ÔºâÔºö' : 'Digite a quantidade de Colunas (1 - 15):', '6');

    const rows = parseInt(rowsInput || '') || 5;
    const cols = parseInt(colsInput || '') || 6;

    if (rows < 1 || rows > 10 || cols < 1 || cols > 15) {
      alert(language === 'zh' ? 'Ë°åÊï∞ÊàñÂàóÊï∞Ë∂ÖÂá∫ËåÉÂõ¥Ôºà1-10Ë°åÔºå1-15ÂàóÔºâ„ÄÇ' : 'Dimens√µes fora dos limites suportados (1-10 linhas, 1-15 colunas).');
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

    setDoc(doc(db, 'bufferAreas', id), newArea).catch(e => console.warn('Falha ao criar buffer no Firestore:', e));
    setBufferAreas(prev => [...prev, newArea]);
    setActiveBufferId(id);
  };

  const handleDeleteBufferZone = () => {
    const area = getCurrentBufferArea();
    if (!area) return;

    if (bufferAreas.length <= 1) {
      alert(language === 'zh'
        ? "Ëá≥Â∞ëÈúÄË¶Å‰øùÁïô‰∏Ä‰∏™ÁºìÂÜ≤Âå∫Âå∫ÂüüÔºåÊó†Ê≥ïÂà†Èô§ÊúÄÂêé‰∏Ä‰∏™„ÄÇ"
        : "√â necess√°rio manter pelo menos uma √°rea de buffer. N√£o √© poss√≠vel excluir a √∫ltima.");
      return;
    }

    const title = language === 'zh' ? 'Âà†Èô§ÁºìÂÜ≤Âå∫Âå∫Âüü' : 'Excluir √Årea de Buffer';
    const confirmMessage = language === 'zh'
      ? `ÊÇ®Á°ÆÂÆöË¶ÅÂà†Èô§ÁºìÂÜ≤Âå∫Âå∫Âüü "${area.name}" ÂêóÔºüÊ≠§Âå∫ÂüüÂÜÖÁöÑÊâÄÊúâÂ†Ü‰Ωç‰ø°ÊÅØÈÉΩÂ∞Ü‰∏¢Â§±ÔºÅ`
      : `Tem certeza que deseja excluir a √°rea de buffer "${area.name}"? Todos os cont√™ineres e informa√ß√µes desta √°rea ser√£o perdidos permanentemente!`;

    requestConfirmation(title, confirmMessage, () => {
      deleteDoc(doc(db, 'bufferAreas', area.id)).catch(e => console.warn('Falha ao remover buffer no Firestore:', e));
      const remainingAreas = bufferAreas.filter(a => a.id !== area.id);
      setBufferAreas(remainingAreas);
      setActiveBufferId(remainingAreas[0].id);

      alert(language === 'zh'
        ? `Â∑≤ÊàêÂäüÂà†Èô§ÁºìÂÜ≤Âå∫Âå∫Âüü "${area.name}"„ÄÇ`
        : `√Årea de buffer "${area.name}" exclu√≠da com sucesso.`);
    });
  };

  const handleExportBufferLayout = () => {
    const area = getCurrentBufferArea();
    
    const headers = [
      language === 'zh' ? 'Â†Ü‰ΩçÂùêÊ†á' : 'Posi√ß√£o',
      language === 'zh' ? 'ÈõÜË£ÖÁÆ±Âè∑' : 'Cont√™iner',
      language === 'zh' ? 'Ë¥ßÁâ©Á±ªÂûã / ËΩ¶Âûã' : 'Modelo / Carga',
      language === 'zh' ? 'Â∞∫ÂØ∏' : 'Tamanho',
      language === 'zh' ? '‰ºòÂÖàÁ∫ß' : 'Prioridade',
      language === 'zh' ? 'ÊúÄ‰Ω≥ÂèëËøê (‚ö°)' : 'Melhor Posicionado',
      language === 'zh' ? 'ÊúÄËøëÊõ¥Êñ∞Êó•Êúü' : '√öltima Atualiza√ß√£o'
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
            slot.isOptimalPickup ? 'SIM / YES' : 'N√ÉO / NO',
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
          alert(language === 'zh' ? 'Ë°®Ê†º‰∏∫Á©∫ÊàñÊó†Êï∞ÊçÆÔºÅ' : 'Planilha vazia ou sem dados!');
          return;
        }

        // Identify column headers (case-insensitive and trimmed)
        const headers = data[0].map(h => String(h || '').trim().toLowerCase());
        
        // Highly robust and targeted column identification
        const containerNoIdx = headers.findIndex(h => 
          h === 'c√≥d. cont√™iner' || h === 'cod. conteiner' || h === 'container' || h === 'container no' ||
          h.includes('c√≥d. cont√™iner') || h.includes('cod. conteiner') || h.includes('container') || h.includes('ÁÆ±Âè∑')
        );

        const locationIdx = headers.findIndex(h => 
          h === 'loca√ß√£o' || h === 'locacao' || h === 'location' || h === 'posi√ß√£o' || h === 'posicao' ||
          h.includes('loca√ß√£o') || h.includes('locacao') || h.includes('posi√ß√£o') || h.includes('posicao') || h.includes('Â†Ü‰Ωç')
        );

        // Avoid partial match with 'tipo de ve√≠culo'
        const typeIdx = headers.findIndex(h => 
          h === 'tipo' || h === 'tipo de cont√™iner' || h === 'tipo de container' || h === 'status' || h === 'estado' ||
          (h.includes('tipo') && !h.includes('ve√≠culo') && !h.includes('veiculo')) || h.includes('status') || h.includes('estado')
        );

        const carSystemIdx = headers.findIndex(h => 
          h === 'sistema de carro' || h === 'car system' || h === 'modelo' || h === 'ËΩ¶Âûã' ||
          h.includes('sistema de carro') || h.includes('car system') || h.includes('modelo') || h.includes('ËΩ¶Âûã')
        );

        // Target 'tempo de entrada no p√°tio'
        const entryTimeIdx = headers.findIndex(h => 
          h === 'tempo de entrada no p√°tio' || h === 'tempo de entrada no patio' || h === 'tempo de entrada' || h === 'entrada' ||
          h.includes('tempo de entrada') || h.includes('entrada') || h.includes('tempo') || h.includes('Êó∂Èó¥')
        );

        // Additional valuable WMS metadata columns
        const danfeIdx = headers.findIndex(h => 
          h === 'danfe' || h.includes('danfe') || h.includes('nota fiscal') || h.includes('nf-e')
        );

        const originIdx = headers.findIndex(h => 
          h === 'origem do cont√™iner' || h === 'origem do container' || h === 'origem' || h.includes('origem') || h.includes('origin')
        );

        const loteNoIdx = headers.findIndex(h => 
          h === 'n¬∫ do lote' || h === 'no do lote' || h === 'lote' || h.includes('lote') || h.includes('batch')
        );

        const statusRecebimentoIdx = headers.findIndex(h => 
          h === 'status do recebimento' || h.includes('recebimento') || h.includes('receipt')
        );

        const validadeIdx = headers.findIndex(h => 
          h === 'data de validade' || h === 'validade' || h === 'vencimento' || h === 'free time' ||
          h.includes('validade') || h.includes('free time') || h.includes('vencimento') || h.includes('validity') || h.includes('expire')
        );

        const vehicleTypeIdx = headers.findIndex(h => 
          h === 'tipo de ve√≠culo' || h === 'tipo de veiculo' || h.includes('ve√≠culo') || h.includes('veiculo') || h.includes('tamanho')
        );

        if (containerNoIdx === -1 || locationIdx === -1) {
          alert(language === 'zh' 
            ? 'Êú™ËÉΩËØÜÂà´‚ÄúC√≥d. Cont√™iner‚ÄùÔºàÈõÜË£ÖÁÆ±Âè∑ÔºâÊàñ‚ÄúLoca√ß√£o‚ÄùÔºàÂ†Ü‰ΩçÔºâÂàóÔºåËØ∑Ê£ÄÊü•Êñá‰ª∂Ë°®Â§¥„ÄÇ' 
            : 'Colunas "C√≥d. Cont√™iner" e/ou "Loca√ß√£o" n√£o encontradas! Verifique o cabe√ßalho da planilha.');
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
          let areaIdPrefix = areaPrefix.toLowerCase();
          if (areaPrefix === 'A23' || areaPrefix === 'TPS') {
              areaIdPrefix = 'intermaritima';
          }
          const areaId = `buffer-${areaIdPrefix}`;

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

            // Find if area already exists, or create new if not
            let areaIndex = updatedAreas.findIndex(a => a.id === areaId);
            const areaPrefix = areaId.split('-')[1].toUpperCase();
            
            let areaName = `BYD Buffer ${areaPrefix} (Zona ${areaPrefix} / ${areaPrefix}Âå∫ - Ativo)`;
            if (areaId === 'buffer-intermaritima') {
                areaName = 'BYD Buffer Intermaritima (Ativo)';
            }

            if (areaIndex === -1) {
              updatedAreas.push({
                id: areaId,
                name: areaName,
                rows: maxRow,
                cols: maxCol,
                slots: []
              });
              areaIndex = updatedAreas.length - 1;
            } else {
              // Update dimensions if new data exceeds existing area
              if (maxRow > updatedAreas[areaIndex].rows) updatedAreas[areaIndex].rows = maxRow;
              if (maxCol > updatedAreas[areaIndex].cols) updatedAreas[areaIndex].cols = maxCol;
            }
            
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

          // Sync to Firestore in batch so all users receive updates in real time
          try {
            const batch = writeBatch(db);
            Object.keys(parsedGroups).forEach(areaId => {
              const area = updatedAreas.find(a => a.id === areaId);
              if (area) {
                batch.set(doc(db, 'bufferAreas', area.id), area);
              }
            });
            batch.commit().catch(e => console.warn('Falha ao sincronizar buffer batch no Firestore:', e));
          } catch (batchErr) {
            console.warn('Erro ao preparar batch de buffer:', batchErr);
          }

          return updatedAreas;
        });

        // Set the active buffer to the first imported area
        const firstAreaId = Object.keys(parsedGroups)[0];
        if (firstAreaId) {
          setActiveBufferId(firstAreaId);
        }

        alert(language === 'zh'
          ? `ÂØºÂÖ•ÊàêÂäüÔºÅÂ∑≤Êõ¥Êñ∞ ${Object.keys(parsedGroups).length} ‰∏™ÁºìÂÜ≤Âå∫Âå∫Âüü„ÄÇ`
          : `Importa√ß√£o realizada com sucesso! Foram atualizadas ${Object.keys(parsedGroups).length} √°reas de buffer de acordo com as coordenadas da planilha.`);

        // Reset file input
        const fInput = document.getElementById('excel_upload_buffer_input') as HTMLInputElement;
        if (fInput) fInput.value = '';

      } catch (err) {
        console.error("Erro ao processar planilha de Buffer:", err);
        alert(language === 'zh'
          ? "Ëß£ÊûêÁºìÂÜ≤Âå∫Ë°®Ê†ºÂ§±Ë¥•ÔºåËØ∑È™åËØÅÊ†ºÂºè„ÄÇ"
          : "Erro ao processar planilha de Buffer. Verifique se o formato segue o padr√£o de loca√ß√µes (Ex: E_2_8).");
      }
    };
    reader.readAsBinaryString(file);
  };

  // RESETAR PARA DADOS DA IMAGEM ORIGINAL
  const resetToOriginal = () => {
    const title = language === 'bilingual' ? 'Restaurar Dados / ËøòÂéüÊï∞ÊçÆ' : 'Restaurar Dados';
    const message = language === 'bilingual'
      ? "Deseja restaurar todos os dados originais da imagem capturada? / ÊòØÂê¶Ë¶ÅËøòÂéüÂπ∂‰øùÂ≠ò‰∏∫ÈªòËÆ§ÂéüÂßãÊï∞ÊçÆÔºü"
      : "Deseja restaurar todos os dados originais da imagem capturada?";

    requestConfirmation(title, message, async () => {
      setYards(JSON.parse(JSON.stringify(ORIGINAL_YARDS)));
      setVessels(JSON.parse(JSON.stringify(ORIGINAL_VESSELS)));
      setChartLeft(JSON.parse(JSON.stringify(ORIGINAL_CHART_LEFT)));
      setChartRight(JSON.parse(JSON.stringify(ORIGINAL_CHART_RIGHT)));
      
      const defaultYardsComment = "Inserir coment√°rios sobre a capacidade e ocupa√ß√£o dos p√°tios de forma bil√≠ngue aqui. / Âú®Ê≠§ËæìÂÖ•ÂÖ≥‰∫éÂ†ÜÂú∫ÂÆπÈáè„ÄÅÂç†Áî®ÊØîÁéáÁöÑÂèåËØ≠ËØ¥Êòé„ÄÇ";
      const defaultVesselNote1 = "Escala regular de navios activa - Monitoramento detalhado das janelas de atraca√ß√£o. / Â∏∏ËßÑÊ¥ªË∑ÉËàπËà∂Èù†Ê≥äËÆ°Âàí - ËØ¶ÁªÜÁõëÊéß and ÁÆ°ÁêÜÊ≥ä‰ΩçÁ™óÂè£„ÄÇ";
      const defaultVesselNote2 = "Destaques operacionais dos navios (Ex: Prioridades de descarga BYD). / ËàπËà∂ËøêËê•ÈáçÁÇπ‰∫ÆÁÇπ (‰æãÂ¶ÇÔºöÊØî‰∫öËø™ÈáçÁÆ±Âç∏Ëàπ‰ºòÂÖàÈ°∫Â∫è)„ÄÇ";
      const defaultChartNote1 = "Coment√°rios sobre o Backlog Projetado vs Capacidade de Entrega Semanal. / È¢ÑÊµãÁßØÂéãÈáè‰∏éÂë®Â∫¶‰∫§‰ªòËÉΩÂäõÁöÑÂØπÊØîÂàÜÊûêËØ¥Êòé„ÄÇ";
      const defaultChartNote2 = "An√°lise de gargalos e metas di√°rias garantidas (meta Gc de 140). / ÂÖ≥‰∫éÊØèÊó•ËøõÁÆ±Èáè‰∏é‰øùËØÅÁõÆÊ†á (Gc 140) ÁöÑÁì∂È¢à analysis ÂíåÂª∫ËÆÆ„ÄÇ";

      setYardsComment(defaultYardsComment);
      setVesselNote1(defaultVesselNote1);
      setVesselNote2(defaultVesselNote2);
      setChartNote1(defaultChartNote1);
      setChartNote2(defaultChartNote2);
      setScenarioValue(210);

      try {
        // Encontra e atualiza cole√ß√£o 'config'
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

        // Grava p√°tios (yards)
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
    
    const title = language === 'bilingual' ? 'Confirmar Exclus√£o / Á°ÆËÆ§Âà†Èô§' : 'Confirmar Exclus√£o';
    const message = language === 'bilingual' 
      ? `Deseja realmente remover os ${selectedContainerIds.length} cont√™ineres selecionados? / Á°ÆÂÆöË¶ÅÂà†Èô§ÈÄâ‰∏≠ÁöÑ ${selectedContainerIds.length} ‰∏™ÈõÜË£ÖÁÆ±ÂêóÔºü` 
      : `Deseja realmente remover os ${selectedContainerIds.length} cont√™ineres selecionados?`;

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
        console.error("Erro ao deletar cont√™ineres em lote:", error);
        alert("Erro ao realizar a exclus√£o em lote / ÊâπÈáèÂà†Èô§Â§±Ë¥•");
      }
    });
  };

  const handleClearYard = () => {
    if (!selectedYardKey) return;
    const yardContainers = containers.filter(c => c.yardId === selectedYardKey);
    if (yardContainers.length === 0) {
      alert(language === 'bilingual' 
        ? 'N√£o h√° cont√™ineres neste p√°tio para limpar. / ËØ•Â†ÜÂú∫‰∏≠Ê≤°ÊúâÂèØÊ∏ÖÈô§ÁöÑÈõÜË£ÖÁÆ±„ÄÇ' 
        : 'N√£o h√° cont√™ineres neste p√°tio para limpar.');
      return;
    }

    const title = language === 'bilingual' ? 'Limpar P√°tio / Ê∏ÖÁ©∫Â†ÜÂú∫' : 'Limpar P√°tio';
    const message = language === 'bilingual'
      ? `ATEN√á√ÉO: Deseja realmente remover TODOS os ${yardContainers.length} cont√™ineres do p√°tio ${yards[selectedYardKey]?.name}? Esta a√ß√£o n√£o pode ser desfeita. / Ë≠¶ÂëäÔºöÁ°ÆÂÆöË¶ÅÂà†Èô§Â†ÜÂú∫ ${yards[selectedYardKey]?.name} ‰∏≠ÁöÑÊâÄÊúâ ${yardContainers.length} ‰∏™ÈõÜË£ÖÁÆ±ÂêóÔºüÊ≠§Êìç‰ΩúÊó†Ê≥ïÊí§ÈîÄ„ÄÇ`
      : `ATEN√á√ÉO: Deseja realmente remover TODOS os ${yardContainers.length} cont√™ineres do p√°tio ${yards[selectedYardKey]?.name}? Esta a√ß√£o n√£o pode ser desfeita.`;

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
        console.error("Erro ao esvaziar p√°tio:", error);
        alert("Erro ao esvaziar o p√°tio / Ê∏ÖÁ©∫Â†ÜÂú∫Â§±Ë¥•");
      }
    });
  };

  const handleDeleteContainer = (container: Container) => {
    const title = language === 'bilingual' ? 'Confirmar Exclus√£o / Á°ÆËÆ§Âà†Èô§' : 'Confirmar Exclus√£o';
    const message = language === 'bilingual' 
      ? `Deseja realmente remover o cont√™iner ${container.id}? / Á°ÆÂÆöË¶ÅÂà†Èô§ÈõÜË£ÖÁÆ± ${container.id} ÂêóÔºü` 
      : `Deseja realmente remover o cont√™iner ${container.id}?`;

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
        console.error("Erro ao deletar cont√™iner:", error);
      }
    });
  };

  const handleAddContainer = async (e: React.FormEvent) => {
    e.preventDefault();
    let rawYardKey = selectedYardKey || stockSelectedYardKey;
    const activeYardKey = (rawYardKey === 'a23' || rawYardKey === 'tps') ? 'intermaritima' : rawYardKey;
    
    if (!newContainerId.trim() || !activeYardKey) return;
    const cId = newContainerId.trim().toUpperCase();
    
    if (containers.some(c => c.id === cId)) {
      alert(language === 'bilingual' ? 'Cont√™iner j√° cadastrado! / ËØ•ÈõÜË£ÖÁÆ±Â∑≤Â≠òÂú®ÔºÅ' : 'Cont√™iner j√° cadastrado!');
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
      console.error("Erro ao adicionar cont√™iner:", error);
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
      ["Identificacao", "N√∫mero de identifica√ß√£o √∫nica do cont√™iner / Container unique ID number (11 chars)", "Texto livre (Ex: MSCU1234567) / String", "MSCU1234567"],
      ["Tamanho", "Tamanho ou dimens√£o do cont√™iner / Container physical size or dimensions", "20' GP, 40' HC, 40' OT (Default: 40' HC)", "40' HC"],
      ["Status", "Situa√ß√£o do cont√™iner (cheio ou vazio) / Container physical status (full/empty)", "CHEIO (ou FULL/ÈáçÁÆ±), VAZIO (ou EMPTY/Á©∫ÁÆ±) (Default: CHEIO)", "CHEIO"],
      ["Categoria", "Categoria log√≠stica no p√°tio / Logistic category for the yard slot", "PORTO (Ê∏ØÂè£), PRONTO_COLETA (ÂæÖÊî∂ÁÆ±), DELIVERED (Â∑≤‰∫§‰ªò), GERAL (ÈÄöÁî®) (Default: GERAL)", "PRONTO_COLETA"],
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
            ? 'Planilha vazia ou sem dados! / Ë°®Ê†º‰∏∫Á©∫ÊàñÊó†Êï∞ÊçÆÔºÅ' 
            : 'Planilha vazia ou sem dados!');
          return;
        }
        
        // Let's identify column headers (case-insensitive and trimmed)
        const headers = data[0].map(h => String(h || '').trim().toLowerCase());
        
        // Map common headers flexibly
        const idIdx = headers.findIndex(h => h.includes('ident') || h.includes('id') || h.includes('box') || h.includes('n¬∫') || h.includes('n√∫mero') || h.includes('numero') || h.includes('container') || h.includes('ÁÆ±Âè∑'));
        const sizeIdx = headers.findIndex(h => h.includes('taman') || h.includes('size') || h.includes('dimen') || h.includes('Â∞∫ÂØ∏'));
        const statusIdx = headers.findIndex(h => h.includes('stat') || h.includes('situa') || h.includes('estado') || h.includes('Áä∂ÊÄÅ'));
        const categoryIdx = headers.findIndex(h => h.includes('categ') || h.includes('tipo') || h.includes('class') || h.includes('Á±ªÂà´'));
        const vesselIdx = headers.findIndex(h => h.includes('navio') || h.includes('vessel') || h.includes('ship') || h.includes('barco') || h.includes('ËàπËà∂'));
        
        if (idIdx === -1) {
          alert(language === 'bilingual'
            ? 'Coluna "Identificacao" (ou similar) n√£o encontrada! Verifique o modelo. / Êú™ÊâæÂà∞‚ÄúÁÆ±Âè∑‚ÄùÂàóÔºÅËØ∑Ê£ÄÊü•Ê®°Êùø„ÄÇ'
            : 'Coluna "Identificacao" (ou similar) n√£o encontrada! Certifique-se de usar os cabe√ßalhos padr√£o.');
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
          if (rawStatus.includes("VAZ") || rawStatus.includes("EMP") || rawStatus.includes("Á©∫") || rawStatus === "K" || rawStatus === "VACIO") {
            status = 'VAZIO';
          }
          
          // Category parsing
          let rawCategory = categoryIdx !== -1 && row[categoryIdx] ? String(row[categoryIdx]).trim().toUpperCase() : "GERAL";
          let category: 'PORTO' | 'PRONTO_COLETA' | 'DELIVERED' | 'GERAL' = 'GERAL';
          
          if (rawCategory.includes("PORT") || rawCategory.includes("Ê∏Ø")) {
            category = 'PORTO';
          } else if (rawCategory.includes("PRON") || rawCategory.includes("COLE") || rawCategory.includes("REC") || rawCategory.includes("ÂæÖ")) {
            category = 'PRONTO_COLETA';
          } else if (rawCategory.includes("DELI") || rawCategory.includes("ENTR") || rawCategory.includes("PAG") || rawCategory.includes("‰∫§‰ªò")) {
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
            ? `Sucesso! Importados: ${successCount}. Duplicados ignorados: ${dupCount}. / ÂØºÂÖ•ÊàêÂäüÔºÅÂÖ± ${successCount} ‰∏™ÔºåÂøΩÁï•ÈáçÂ§ç ${dupCount} ‰∏™„ÄÇ`
            : `Sucesso! Foram importados ${successCount} cont√™iner(es) com sucesso. ${dupCount} cont√™ineres duplicados foram ignorados.`);
        } else {
          alert(language === 'bilingual'
            ? `Nenhum cont√™iner novo importado. Todos os ${dupCount} cont√™ineres j√° existiam no sistema. / Êú™ÂØºÂÖ•Êñ∞ÈõÜË£ÖÁÆ±„ÄÇÊâÄÊúâ ${dupCount} ‰∏™ÈõÜË£ÖÁÆ±Âú®Á≥ªÁªü‰∏≠ÂùáÂ∑≤Â≠òÂú®„ÄÇ`
            : `Nenhum cont√™iner novo foi importado. Todos os ${dupCount} cont√™ineres j√° existiam no sistema.`);
        }
        
        // Reset file input
        const fInput = document.getElementById('excel_upload_input') as HTMLInputElement;
        if (fInput) fInput.value = '';
        const fInputStock = document.getElementById('excel_upload_input_stock') as HTMLInputElement;
        if (fInputStock) fInputStock.value = '';
        
      } catch (err) {
        console.error("Erro ao processar planilha Excel:", err);
        alert(language === 'bilingual'
          ? "Erro ao ler o arquivo Excel. Verifique se o formato est√° correto. / ËØªÂèñExcelÊñá‰ª∂Â§±Ë¥•„ÄÇËØ∑Ê£ÄÊü•Ê†ºÂºèÊòØÂê¶Ê≠£Á°Æ„ÄÇ"
          : "Erro ao processar o arquivo Excel. Certifique-se de que o arquivo n√£o est√° corrompido e segue o padr√£o.");
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
      "Programa√ß√£o", 
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
      ["INSTRU√á√ïES PARA PREENCHIMENTO / Â°´ÂÜôËØ¥Êòé"],
      ["1. N√£o altere o nome das colunas do cabe√ßalho. / ËØ∑ÂãøÊõ¥ÊîπË°®Â§¥ÂàóÂêç„ÄÇ"],
      ["2. Coluna 'Warehouse' suporta os seguintes valores (case-insensitive): / 'Warehouse'ÂàóÊîØÊåÅ‰ª•‰∏ãÂÄº:"],
      ["   - TECON (Bonded / ‰øùÁ®é)"],
      ["   - INTERMARITIMA (Bonded / ‰øùÁ®é)"],
      ["   - TPC (Warehouse / ‰ªìÂ∫ì)"],
      ["   - CLIA (Warehouse / ‰ªìÂ∫ì)"],
      ["   - AG (Warehouse / ‰ªìÂ∫ì)"],
      ["   - CTS - PONTUAL (Warehouse / ‰ªìÂ∫ì)"],
      ["   - CTS - JEW (Warehouse / ‰ªìÂ∫ì)"],
      ["   - CTS - LOGIC (Warehouse / ‰ªìÂ∫ì)"],
      ["   - CTS - UNI (Warehouse / ‰ªìÂ∫ì)"],
      ["   - CTS - VBR (Warehouse / ‰ªìÂ∫ì)"],
      ["   - LOGIC (Warehouse / ‰ªìÂ∫ì)"],
      ["   - MULTILOG (Warehouse / ‰ªìÂ∫ì)"],
      ["3. Coluna 'CONTAINER' √© obrigat√≥ria. / 'CONTAINER'Âàó‰∏∫ÂøÖÂ°´È°π„ÄÇ"],
      ["4. Carga importada ser√° inserida como Cheio (CHEIO) por padr√£o. / ÂØºÂÖ•Ë¥ßÁâ©ÈªòËÆ§ËÆæÁΩÆ‰∏∫ÈáçÁÆ±(CHEIO)„ÄÇ"]
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
          alert(language === 'zh' ? 'Ë°®Ê†º‰∏∫Á©∫ÊàñÊó†Êï∞ÊçÆÔºÅ' : 'Planilha vazia ou sem dados!');
          return;
        }
        
        const headers = data[0].map(h => String(h || '').trim().toLowerCase());
        
        const blIdx = headers.findIndex(h => h === 'bl' || h.includes('conhecimento') || h.includes('bill of lading'));
        const containerIdx = headers.findIndex(h => h.includes('container') || h.includes('cont√™iner') || h.includes('conteiner') || h.includes('box') || h.includes('ÁÆ±Âè∑') || h === 'cntr');
        const warehouseIdx = headers.findIndex(h => h.includes('warehouse') || h.includes('armazem') || h.includes('armando') || h.includes('p√°tio') || h.includes('patio') || h.includes('local') || h.includes('‰ªìÂ∫ì') || h.includes('Â†ÜÂú∫'));
        const navioIdx = headers.findIndex(h => h.includes('navio') || h.includes('vessel') || h.includes('ship') || h.includes('ËàπËà∂'));
        const etaIdx = headers.findIndex(h => h === 'eta' || h.includes('chegada') || h.includes('prev'));
        const freeTimeIdx = headers.findIndex(h => h.includes('free time') || h.includes('freetime') || h.includes('demo') || h.includes('validade'));
        const componenteIdx = headers.findIndex(h => h.includes('comp') || h.includes('kd') || h.includes('skd'));
        const modeloIdx = headers.findIndex(h => h.includes('model') || h.includes('modelo') || h.includes('veiculo') || h.includes('ËΩ¶Âûã'));
        const loteIdx = headers.findIndex(h => h.includes('lote') || h.includes('lot') || h.includes('batch'));
        const progIdx = headers.findIndex(h => h.includes('prog') || h.includes('date') || h.includes('sched') || h.includes('data') || h.includes('entrega') || h.includes('saida'));
        const transIdx = headers.findIndex(h => h.includes('transp') || h.includes('carrier') || h.includes('logistica'));

        if (containerIdx === -1) {
          alert(language === 'zh'
            ? 'Êú™ÊâæÂà∞‚ÄúCONTAINER / ÁÆ±Âè∑‚ÄùÂàóÔºÅËØ∑Ê£ÄÊü•Ë°®Ê†ºÊ†ºÂºè„ÄÇ'
            : 'Coluna "CONTAINER" n√£o encontrada! Certifique-se de que a planilha possui a coluna "CONTAINER".');
          return;
        }

        const getYardKeyFromWarehouseName = (name: string): string | null => {
          const clean = String(name || '').trim().toLowerCase();
          if (clean.includes('tecon')) return 'tecon';
          if (clean.includes('intermaritima') || clean.includes('intermar') || clean.includes('inter') || clean.includes('maritima') || clean.includes('a23') || clean.includes('tps')) return 'intermaritima';
          if (clean.includes('tpc')) return 'tpc';
          if (clean.includes('clia') || clean.includes('emporio')) return 'clia';
          if (clean.includes('ag') || clean.includes('cdex')) return 'ag';
          if (clean.includes('multilog')) return 'multilog';
          
          if (clean.includes('cts')) {
            if (clean.includes('jew')) return 'cts_jew';
            if (clean.includes('logic')) return 'cts_logic';
            if (clean.includes('uni')) return 'cts_uni';
            if (clean.includes('vbr')) return 'cts_vbr';
            return 'cts'; // default CTS fallback to PONTUAL
          }
          if (clean.includes('pontual')) return 'cts';
          if (clean.includes('jew')) return 'cts_jew';
          if (clean.includes('uni')) return 'cts_uni';
          if (clean.includes('vbr')) return 'cts_vbr';
          if (clean.includes('logic')) return 'logic'; // Separate LOGIC warehouse from CTS - LOGIC

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
          cts: { total: 0, porto: 0, pronto: 0 },
          cts_jew: { total: 0, porto: 0, pronto: 0 },
          cts_logic: { total: 0, porto: 0, pronto: 0 },
          cts_uni: { total: 0, porto: 0, pronto: 0 },
          cts_vbr: { total: 0, porto: 0, pronto: 0 },
          logic: { total: 0, porto: 0, pronto: 0 },
          multilog: { total: 0, porto: 0, pronto: 0 }
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
          alertMsg = `üéâ Â∫ìÂ≠òÊàêÂäüÊõ¥Êñ∞ÔºÅ\n- ÂØºÂÖ•ÈõÜË£ÖÁÆ±Êï∞Èáè: ${successCount}\n- Ë¶ÜÁõñÊõ¥Êñ∞‰∫Ü ${yardsInExcel.size} ‰∏™Â†ÜÂú∫/‰ªìÂ∫ì„ÄÇ\n- ÂøΩÁï•‰∫Ü ${unknownYardsCount} Ë°åÊó†Ê≥ïÂåπÈÖçÂ†ÜÂú∫ÁöÑË°å„ÄÇ`;
        } else {
          alertMsg = `üéâ Estoque atualizado com sucesso!\n- Cont√™ineres importados: ${successCount}\n- P√°tios/Armar√©ns atualizados: ${Array.from(yardsInExcel).map(k => yards[k]?.name || k).join(', ')}\n- Linhas com recintos desconhecidos ignoradas: ${unknownYardsCount}`;
        }
        alert(alertMsg);

        const gInput = document.getElementById('global_excel_upload_input') as HTMLInputElement;
        if (gInput) gInput.value = '';

      } catch (err) {
        console.error("Erro ao processar planilha global:", err);
        alert(language === 'zh'
          ? "Â§ÑÁêÜ Excel Êó∂Âá∫ÈîôÔºåËØ∑Ê£ÄÊü•Ê†ºÂºèÊòØÂê¶Ê≠£Á°ÆÔºÅ"
          : "Erro ao processar arquivo Excel. Verifique se o formato est√° correto.");
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
        console.warn("Erro ao salvar altera√ß√£o de c√©lula no Firestore:", err);
      }
    }
  };

  const handleDeleteContainerFromStock = async (containerId: string) => {
    const c = containers.find(x => x.id === containerId);
    if (!c) return;

    if (!window.confirm(`Deseja realmente remover o cont√™iner ${containerId} do estoque?`)) {
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
        console.warn("Erro ao deletar cont√™iner no Firestore:", err);
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
      "Programa√ß√£o", 
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

  // HELPER PARA CONVERS√ÉO DE CORES OKLCH / OKLAB PARA COR RESPEITADA PELO HTML2CANVAS
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
    // Fallbacks baseados em padr√µes conhecidos caso falhe
    if (colorStr.includes('303.9')) return 'rgb(168, 85, 247)'; // purple-500
    if (colorStr.includes('0.5') || colorStr.includes('red')) return 'rgb(239, 68, 68)'; // red-500
    return 'rgb(100, 116, 139)'; // Slate neutro padr√£o
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

    // Estado e restaura√ß√£o de getComputedStyle para evitar o erro do parser html2canvas com oklch/oklab (Tailwind v4)
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
        scale: 2.5, // Resolu√ß√£o de alta defini√ß√£o 2.5x para textos e detalhes vetoriais super n√≠tidos
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

  // GERAR E EXPORTAR TODO O DECK DE APRESENTA√á√ÉO (4 P√ÅGINAS) COMO UM √öNICO PDF
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
        // Aguarda a renderiza√ß√£o do React a n√≠vel de DOM a cada p√°gina (250ms)
        await new Promise((resolve) => setTimeout(resolve, 250));

        // Patcheia computa√ß√£o de cor oklch
        const currentRestore: (() => void)[] = [];
        patchWindowGetComputedStyle(window);

        const canvas = await html2canvas(slideElement, {
          scale: 2.2, // Equil√≠brio perfeito entre clareza vetorial e tamanho final para multi-pagina
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

  // C√ÅLCULO DE OCUPA√á√ÉO DE P√ÅTIO
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

  // ADICIONAR NOVO P√ÅTIO / WAREHOUSE
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

  // EXCLUIR P√ÅTIO / WAREHOUSE
  const deleteYard = (key: string) => {
    const title = language === 'bilingual' ? 'Excluir P√°tio / Âà†Èô§Â†ÜÂú∫' : 'Excluir P√°tio';
    const message = language === 'bilingual'
      ? "Deseja realmente excluir este p√°tio/warehouse? / Á°ÆÂÆöË¶ÅÂà†Èô§ËØ•Â†ÜÂú∫ÂêóÔºü"
      : "Deseja realmente excluir este p√°tio/warehouse?";

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

  // ALTERAR DADO ESPEC√çFICO DO GR√ÅFICO DA ESQUERDA (Backlog/ETA)
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

  // MULTIPLICADOR EM MASSA DOS GR√ÅFICOS (Para simula√ß√µes r√°pidas de estresse)
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

  // ALTERAR DADO ESPEC√çFICO DO GR√ÅFICO DA DIREITA (Entregas Di√°rias / Dates)
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

  // Adicionar Semana para Gr√°fico da Esquerda (ChartLeft)
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

  // Remover Semana do Gr√°fico da Esquerda (ChartLeft)
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

  // Adicionar Entrega Di√°ria para Gr√°fico da Direita (ChartRight)
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

  // Remover Entrega Di√°ria do Gr√°fico da Direita (ChartRight)
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
          titleEN: "OPERATIONAL DASHBOARD & YARD CAPACITY",
          subPT: slideSubtitlePT,
          subZH: slideSubtitleZH,
          subEN: "Integrated Monitoring of Occupancy, Projected Backlog, and Vessel Schedules",
        };
      case 1:
        return {
          titlePT: "OCUPA√á√ÉO DETALHADA DE P√ÅTIOS & CAPACIDADE",
          titleZH: "BYD Âêà‰ΩúÂ†ÜÂú∫ÂÆπÈáè‰∏éÂç†Áî®ÊØîÁõëÊéß",
          titleEN: "DETAILED YARD OCCUPANCY & CAPACITY MANAGEMENT",
          subPT: "Monitoramento Detalhado de Capacidade Usada, Cont√™ineres Cheios, Vazios e Status de Ocupa√ß√£o",
          subZH: "Â∏∏ËßÑÂêà‰ΩúÂ†ÜÂú∫‰ΩøÁî®ÂÆπÈáè„ÄÅÈáçÁÆ±ÂèäÁ©∫ÁÆ±Âç†Áî®ÊØîÁõëÊéß‰∏éË∂ÖÂÆπÈ¢ÑË≠¶ÂàÜÊûê",
          subEN: "Detailed Monitoring of Used Capacity, Full/Empty Containers, and Occupancy Status",
        };
      case 2:
        return {
          titlePT: "ESCALA DE NAVIOS ATIVOS & JANELAS (ETA)",
          titleZH: "Ê¥ªË∑ÉËàπËà∂Èù†Ê≥äËÆ°Âàí‰∏éÂà∞Ê∏ØÈ¢ÑÊµã (ETA)",
          titleEN: "ACTIVE VESSEL SCHEDULE & BERTHING WINDOWS (ETA)",
          subPT: "Programa√ß√£o de Chegada de Navios, Volume de Cont√™ineres e Notas Operacionais",
          subZH: "Ê¥ªË∑ÉËàπËà∂Âà∞Ê∏Ø ETA„ÄÅÈõÜË£ÖÁÆ±Âç∏ËàπËÆ°Âàí„ÄÅÂè£Â≤∏ÊîæË°åÂèä‰Ωú‰∏öÊâãËÆ∞",
          subEN: "Vessel Arrival Schedules, Container Volumes, and Operational Highlights",
        };
      case 3:
        return {
          titlePT: "PLANO DE ESCALONAMENTO DE CAPACIDADE INBOUND & DRAIN",
          titleZH: "ËøõÊ∏ØËøêÂäõÁà¨Âù°‰∏éÂá∫Ê∏ÖÊéíÊ∞¥ËÆ°ÂàíÁúãÊùø",
          titleEN: "INBOUND CAPACITY RAMP-UP & DRAIN PROJECTION PLAN",
          subPT: "PROJE√á√ÉO DE CHEGADAS (ATA/ETA) VS ESCOAMENTO EFETIVO E EVOLU√á√ÉO DO SALDO DE INVENT√ÅRIO.",
          subZH: "È¢ÑÊµãÊØèÂë®ËàπËà∂Âà∞Ê∏ØËøõÁÆ±Èáè‰∏éÂ∑•ÂéÇÂá∫Ê∏ÖËÉΩÂäõÂØπÊØîÂèäÂ∫ìÂ≠òËµ∞ÂäøÂàÜÊûê„ÄÇ",
          subEN: "PROJECTION OF ARRIVALS (ATA/ETA) VS DELIVERY DRAIN AND WEEKLY INVENTORY BALANCE EVOLUTION.",
        };
      case 4:
        return {
          titlePT: "BYD BUFFER INTEGRATED HUB & TRANSPORTE R√ÅPIDO",
          titleZH: "ÊØî‰∫öËø™Êô∫ËÉΩÁºìÂÜ≤‰∏≠ËΩ¨Êû¢Á∫Ω‰∏éÂø´ÈÄüÁßªËøêÁõëÊéß",
          titleEN: "BYD BUFFER INTEGRATED HUB & RAPID TRANSFER",
          subPT: "Mapeamento em tempo real de posi√ß√µes, escoamento de cont√™ineres e otimiza√ß√£o de retirada r√°pida",
          subZH: "ÁºìÂÜ≤Âå∫Â†Ü‰Ωç„ÄÅÊîæË°åÊµÅÂêë‰∏éÊô∫ËÉΩÁßªÁÆ±‰ºòÂåñÁõëÊéß",
          subEN: "Real-time slot mapping, container flow, and rapid pickup optimization",
        };
      case 5:
        return {
          titlePT: "CONTROLE OPERACIONAL DE DEP√ìSITOS & ALOCA√á√ÉO",
          titleZH: "ÂçèËÆÆÂ†ÜÂ≠òÂÆπÈáèÂä®ÊÄÅÈÖçÈ¢ù‰∏éËàπ‰∏úÂáÜÂÖ•ÁÆ°ÁêÜÂ§ßÁõò",
          titleEN: "DEPOT OPERATIONAL CONTROL & CARRIER ALLOCATION",
          subPT: "Gest√£o integrada de capacidades di√°rias, port√µes ativos e matriz de compatibilidade com armadores principais",
          subZH: "ÂÆûÊó∂Âä®ÊÄÅÁÆ°ÊéßÂçèËÆÆÂ†ÜÂú∫ÊØèÊó•ÈôêÈ¢ù„ÄÅÂè£Â≤∏ÈÄöÈÅìÂºÄÈó≠ÂèäÈõÜË£ÖÁÆ±ÊµÅÂêëÂàÜÈÖçÁ¨¶ÂêàÁü©Èòµ",
          subEN: "Integrated daily capacity management, active gates, and carrier compatibility matrix",
        };
      case 6:
        return {
          titlePT: "PAINEL GERAL DE DEMURRAGE & CONTROLE DE DI√ÅRIAS (OVERDUE)",
          titleZH: "ÊªûÊúüË¥π‰∏éÈõÜË£ÖÁÆ±Ë∂ÖÊúüÁõëÊéßÂ°î",
          titleEN: "DEMURRAGE & OVERDUE CONTAINER MONITORING TOWER",
          subPT: "Painel de controle de vencimento de free time, cont√™ineres retidos e custos de demurrage",
          subZH: "ÈõÜË£ÖÁÆ±ÂÖçË¥πÊúüÂà∞ÊúüÈ¢ÑË≠¶„ÄÅÂ†ÜÂú∫ÊªûÊúüË∂ÖÊúüÁõëÊéßÂèäÂºÇÂ∏∏ÊªûÁÆ±ÊéßÂà∂Èù¢Êùø",
          subEN: "Free time expiration alert, retained containers, and demurrage cost management",
        };
      case 7:
        return {
          titlePT: "M√ìDULO DE GEST√ÉO LOG√çSTICA & REGISTROS OPERACIONAIS",
          titleZH: "ÊØî‰∫öËø™Â§ñË¥∏ËøõÂá∫Âè£ÂçïËØÅÂèäÈõÜÊàêÁâ©ÊµÅÊéßÂà∂Â§ßÁõò",
          titleEN: "LOGISTICS MANAGEMENT MODULE & OPERATIONAL RECORDS",
          subPT: "Cadastro integrado de equipamentos, containers WMS e importador Sheets",
          subZH: "ÈõÜË£ÖÁÆ±ÂçïËØÅÂè∞Ë¥¶„ÄÅWMS Áä∂ÊÄÅÂêåÊ≠•‰∏éË°®Ê†ºÊâπÈáèÂØºÂÖ•",
          subEN: "Integrated equipment registry, container WMS status, and Sheets importer",
        };
      case 8:
        return {
          titlePT: "PAINEL EXECUTIVO DE ENTREGAS & TRANSPORTE CD",
          titleZH: "Â∑•ÂéÇÂà∞Ë¥ß‰∫§Ë¥ßÁõëÊéßÈù¢Êùø‰∏éËøêÂäõÊéßÂà∂Âè∞",
          titleEN: "EXECUTIVE DELIVERY DASHBOARD & CD TRANSPORTATION",
          subPT: "Controle de status operacionais di√°rios, transportadores e fretes",
          subZH: "ÊØèÊó•Â∑•ÂéÇÂà∞Ë¥ßÁä∂ÊÄÅËøΩË∏™„ÄÅËøêËæìÊâøËøêÂïÜÂèäËøêË¥πÊ†∏ÁÆóÁõëÊéß",
          subEN: "Daily operational status tracking, transport carriers, and freight monitoring",
        };
      case 9:
        return {
          titlePT: "CALEND√ÅRIO MENSAL DE DISTRIBUI√á√ÉO & ENTREGAS",
          titleZH: "ÊúàÂ∫¶‰∫§‰ªòÊó•ÂéÜ‰∏éÁè≠ËΩÆÂêûÂêêÈ¢ÑÊµã",
          titleEN: "MONTHLY DISTRIBUTION & DELIVERY CALENDAR",
          subPT: "Agrupamento inteligente por House BL e volumes consolidados semanais",
          subZH: "ÊåâÊèêÂçï BL ‰∏éÂë®Â∫¶ÂêàÂπ∂ÁÆ±ÈáèÁöÑÊô∫ËÉΩÊéíÁ®ã‰∏é‰∫§‰ªòÊó•ÂéÜ",
          subEN: "Smart scheduling grouped by House BL and weekly consolidated volumes",
        };
      case 10:
        return {
          titlePT: "PLANO DIRECIONAL DE ARMAZENAGEM & FLUXOS",
          titleZH: "ÈõÜË£ÖÁÆ±ÊµÅÂêëÂàÜÈÖç‰∏éÂ§öÁ∫ß‰ªìÂÇ®ËßÑÂàí",
          titleEN: "CONTAINER ROUTING & STORAGE CAPACITY PLAN",
          subPT: "Aloca√ß√£o estrat√©gica de cont√™ineres entre terminais alfandegados, armaz√©ns gerais e buffer BYD",
          subZH: "‰øùÁ®éÂ†ÜÂú∫„ÄÅÊôÆÈÄöÂ§ñ‰ªìÂèäÊØî‰∫öËø™ÁºìÂÜ≤Âå∫ÁöÑÂ§öÊ¢ØÊ¨°ÈõÜË£ÖÁÆ±Êô∫ËÉΩÊµÅÂêë‰∏éËøêÂäõÈÖçÈ¢ùËßÑÂàí",
          subEN: "Strategic container allocation across bonded yards, general warehouses, and BYD buffer",
        };
      default:
        return {
          titlePT: slideTitlePT,
          titleZH: slideTitleZH,
          titleEN: "BYD LOGISTICS CONTROL DASHBOARD",
          subPT: slideSubtitlePT,
          subZH: slideSubtitleZH,
          subEN: "Operational yard management and container visibility",
        };
    }
  };

  // Retorna t√≠tulo din√¢mico conforme a sele√ß√£o de linguagem e o slide ativo
  const getSlideTitle = () => {
    const dyn = getDynamicSlideTitleAndSubtitle();
    if (currentSlide === 3) {
      const titleText = language === 'zh' ? dyn.titleZH : (language === 'en' ? dyn.titleEN : dyn.titlePT);
      return (
        <div className="flex items-center gap-2">
          <div className="w-[4px] h-[18px] bg-blue-600 rounded-xs self-center"></div>
          <span className="text-[18px] font-black text-slate-850 dark:text-white uppercase tracking-wider font-sans leading-none">
            {titleText}
          </span>
        </div>
      );
    }
    if (language === 'pt') return <span className="text-xl font-black">{dyn.titlePT}</span>;
    if (language === 'zh') return <span className="text-2xl font-black font-sans tracking-wide">{dyn.titleZH}</span>;
    if (language === 'en') return <span className="text-xl font-black">{dyn.titleEN}</span>;
    return <span className="text-xl font-black">{dyn.titlePT} / {dyn.titleZH}</span>;
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
              {language === 'zh' ? 'ÂØºËà™ËèúÂçï' : (language === 'en' ? 'PORTAL MODULES' : 'M√ìDULOS DO PORTAL')}
            </span>
            {[
              { index: 0, pt: "Vis√£o Geral", zh: "ÁªºÂêàÂ§ßÁõò", en: "Overview", icon: <Database className="w-4 h-4" /> },
              { index: 1, pt: "Gest√£o de P√°tios", zh: "Â†ÜÂú∫ÁÆ°ÁêÜ", en: "Yard Management", icon: <Building2 className="w-4 h-4" /> },
              { index: 4, pt: "BYD Buffer", zh: "Êô∫ËÉΩÁºìÂÜ≤Âå∫", en: "BYD Buffer", icon: <Layers className="w-4 h-4" /> },
              { index: 5, pt: "Dep√≥sitos & Aloca√ß√£o", zh: "ÂçèËÆÆÂ†ÜÂ≠òÂèäÊµÅÂêë", en: "Depots & Allocation", icon: <FileSpreadsheet className="w-4 h-4" /> },
              { index: 10, pt: "Plano de Direcionamento", zh: "ÊµÅÂêëÂèä‰ªìÂÇ®ËßÑÂàí", en: "Routing & Storage Plan", icon: <Calculator className="w-4 h-4" /> },
              { index: 6, pt: "Demurrage & Overdue", zh: "ÊªûÊúüË¥πÁõëÊéß", en: "Demurrage & Overdue", icon: <Clock className="w-4 h-4" /> },
              { index: 2, pt: "Escala de Navios", zh: "ËàπËà∂Èù†Ê≥äËÆ°Âàí", en: "Vessel Schedule", icon: <Ship className="w-4 h-4" /> },
              { index: 3, pt: "Gr√°ficos & Proje√ß√µes", zh: "Êô∫ËÉΩËøêËê•ÂõæË°®", en: "Charts & Projections", icon: <TrendingUp className="w-4 h-4" /> },
              { index: 7, pt: "M√≥dulo Log√≠stica", zh: "Áâ©ÊµÅÁÆ°ÁêÜÊ®°Âùó", en: "Logistics Module", icon: <Package className="w-4 h-4" /> },
              { index: 8, pt: "Painel de Entregas", zh: "‰∫§Ë¥ßÁõëÊéßÈù¢Êùø", en: "Delivery Dashboard", icon: <Truck className="w-4 h-4" /> },
              { index: 9, pt: "Calend√°rio", zh: "‰∫§‰ªòÊó•ÂéÜ", en: "Delivery Calendar", icon: <Calendar className="w-4 h-4" /> },
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
                    <span className="truncate tracking-wide">
                      {language === 'zh' ? s.zh : (language === 'en' ? s.en : s.pt)}
                    </span>
                    <span className="text-[8.5px] opacity-60 truncate font-normal tracking-wider uppercase mt-0.5">
                      {language === 'zh' ? s.pt : (language === 'en' ? s.zh : s.zh)}
                    </span>
                  </div>
                </button>
              );
            })}

            {/* CONTROLES DO SISTEMA INTEGRADO (Movidos do Topbar para limpar a visualiza√ß√£o) */}
            <div className="pt-4 border-t border-slate-200/50 dark:border-slate-800/50 mt-4 space-y-2">
              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider block px-3.5 mb-2">
                {language === 'zh' ? 'Á≥ªÁªüÂø´Êç∑ÊéßÂà∂' : 'A√á√ïES DO SISTEMA'}
              </span>

              {/* Sincronizar Google Sheets */}
              <button
                onClick={() => setSheetsModalOpen(true)}
                className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-3 hover:bg-red-50 dark:hover:bg-red-950/10 border border-gray-150 dark:border-slate-800 hover:border-red-200 dark:hover:border-red-900 cursor-pointer bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                title="Sincronizar com a Planilha de Entregas do Google Sheets"
              >
                <RefreshCw className="w-4 h-4 text-red-600 animate-spin-slow shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="truncate">{language === 'zh' ? 'ÂêåÊ≠•Ë∞∑Ê≠åË°®Ê†º' : 'Sinc Google Sheets'}</span>
                  <span className="text-[8.5px] text-red-600 dark:text-red-400 opacity-85 truncate font-normal tracking-wider uppercase">
                    {language === 'zh' ? 'ÂÆûÊó∂Êõ¥Êñ∞Êï∞ÊçÆ' : 'INTEGRA√á√ÉO PLANILHA'}
                  </span>
                </div>
              </button>

              {/* Editar P√°tio Toggle */}
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-3 border cursor-pointer ${
                  isEditMode
                    ? 'bg-slate-800 text-white border-slate-950 dark:bg-slate-800 dark:border-slate-700'
                    : 'bg-white dark:bg-slate-900 border-gray-150 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-755 dark:text-slate-300'
                }`}
                title="Alternar entre visualiza√ß√£o limpa e edi√ß√£o ativa dos p√°tios"
              >
                <Sliders className={`w-4 h-4 shrink-0 ${isEditMode ? 'text-yellow-400' : 'text-red-500'}`} />
                <div className="flex flex-col min-w-0">
                  <span className="truncate">
                    {isEditMode 
                      ? (language === 'zh' ? 'ÂÖ≥Èó≠ÁºñËæëÊ®°Âºè' : 'Fechar Edi√ß√£o') 
                      : (language === 'zh' ? 'ÁºñËæëÂ†ÜÂú∫ÂÆπÈáè' : 'Editar P√°tio')}
                  </span>
                  <span className="text-[8.5px] opacity-60 truncate font-normal tracking-wider">
                    {language === 'zh' ? 'Â†ÜÂú∫ÊéßÂà∂' : 'YARD MANAGEMENT'}
                  </span>
                </div>
              </button>

              {/* Excel Template & Import Section */}
              <div className="space-y-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-150 dark:border-slate-800/60">
                <span className="text-[8.5px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider block px-1.5">
                  {language === 'zh' ? 'Â∫ìÂ≠òÊï∞ÊçÆÂØºÂÖ•' : 'IMPORTA√á√ÉO DE ESTOQUE'}
                </span>
                
                <div className="flex gap-1.5">
                  {/* Upload Excel */}
                  <label className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2 px-2.5 rounded-lg text-[11px] cursor-pointer transition-all shadow-sm active:scale-95">
                    <Upload className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{language === 'zh' ? '‰∏ä‰º†Â∫ìÂ≠ò' : 'Importar'}</span>
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

              {/* Relat√≥rio PDF */}
              <button
                onClick={handleDownloadPDF}
                disabled={pdfStatus === 'rendering'}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-3 border cursor-pointer ${
                  pdfStatus === 'rendering'
                    ? 'bg-slate-100 dark:bg-slate-850 text-slate-400 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                    : 'bg-gradient-to-r from-red-600 to-rose-600 text-white border-red-500 hover:from-red-700 hover:to-rose-700 shadow-md shadow-red-500/10'
                }`}
                title="Exportar Painel Ativo para Relat√≥rio PDF"
              >
                {pdfStatus === 'rendering' ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white shrink-0" />
                ) : (
                  <Download className="w-4 h-4 text-white shrink-0" />
                )}
                <div className="flex flex-col min-w-0">
                  <span className="truncate">
                    {pdfStatus === 'rendering'
                      ? (language === 'zh' ? 'Ê≠£Âú®ÁîüÊàê PDF...' : 'Gerando PDF...')
                      : (language === 'zh' ? 'ÂØºÂá∫ PDF Êä•Âëä' : 'Relat√≥rio PDF')}
                  </span>
                  <span className="text-[8.5px] opacity-80 truncate font-normal tracking-wider">
                    {language === 'zh' ? 'PDF ÂØºÂá∫' : 'DOWNLOAD REPORT'}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Sidebar Config / Footer */}
          <div className="p-4 border-t border-gray-150/40 dark:border-slate-800/80 space-y-3.5 bg-slate-50/50 dark:bg-slate-900/40 shrink-0">
            {/* Language Segmented Control */}
            <div className="bg-white dark:bg-slate-900 p-0.5 rounded-lg flex items-center border border-gray-150 dark:border-slate-800 shadow-3xs">
              {[
                { id: 'pt', label: 'üáßüá∑ PT' },
                { id: 'zh', label: 'üá®üá≥ ‰∏≠Êñá' },
                { id: 'en', label: 'üá∫üá∏ EN' },
                { id: 'bilingual', label: 'üåê MULTI' }
              ].map(lang => (
                <button
                  key={lang.id}
                  onClick={() => { setLanguage(lang.id); updateGlobalDoc('language', lang.id); }}
                  className={`flex-1 py-1.5 text-[9.5px] font-black rounded-md transition-all cursor-pointer ${
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
                title="Mudar para Visualiza√ß√£o PPT Slideshow"
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

      {/* DIREITA: APP WORKSPACE WRAPPER (Acomoda os conte√∫dos de ambas as vis√µes) */}
      <div className={`flex-1 flex flex-col overflow-hidden ${viewParadigm === 'website' ? 'h-full' : 'min-h-screen'}`}>
        
        {/* BARRA DE MENU SUPERIOR DE CONTROLE (Ocultada em modo de apresenta√ß√£o limpo ou em modo de portal) */}
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
                <p className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400">Sistema Integrado de Controle de P√°tios, Escalas e Planejamento Operacional (Bilingue/Mandarim)</p>
              </div>
            </div>
          </div>

          {/* M√ìDULOS OPERACIONAIS (Navega√ß√£o principal centralizada) */}
          <div className="flex items-center gap-1.5 flex-wrap justify-center my-0.5">
            {[
              { index: 0, pt: "Vis√£o Geral", zh: "ÁªºÂêàÂ§ßÁõò", icon: <Database className="w-3.5 h-3.5" /> },
              { index: 1, pt: "Gest√£o de P√°tios", zh: "Â†ÜÂú∫ÁÆ°ÁêÜ", icon: <Building2 className="w-3.5 h-3.5" /> },
              { index: 4, pt: "BYD Buffer", zh: "Êô∫ËÉΩÁºìÂÜ≤Âå∫", icon: <Layers className="w-3.5 h-3.5" /> },
              { index: 5, pt: "Dep√≥sitos & Aloca√ß√£o", zh: "ÂçèËÆÆÂ†ÜÂ≠òÂèäÊµÅÂêë", icon: <FileSpreadsheet className="w-3.5 h-3.5" /> },
              { index: 10, pt: "Plano de Direcionamento", zh: "ÊµÅÂêëÂèä‰ªìÂÇ®ËßÑÂàí", icon: <Calculator className="w-3.5 h-3.5" /> },
              { index: 6, pt: "Demurrage & Overdue", zh: "ÊªûÊúüË¥πÁõëÊéß", icon: <Clock className="w-3.5 h-3.5" /> },
              { index: 2, pt: "Escala de Navios", zh: "ËàπËà∂Èù†Ê≥äËÆ°Âàí", icon: <Ship className="w-3.5 h-3.5" /> },
              { index: 3, pt: "Gr√°ficos & Proje√ß√µes", zh: "Êô∫ËÉΩËøêËê•ÂõæË°®", icon: <TrendingUp className="w-3.5 h-3.5" /> },
              { index: 7, pt: "M√≥dulo Log√≠stica", zh: "Áâ©ÊµÅÁÆ°ÁêÜÊ®°Âùó", icon: <Package className="w-3.5 h-3.5" /> },
              { index: 8, pt: "Painel de Entregas", zh: "‰∫§Ë¥ßÁõëÊéßÈù¢Êùø", icon: <Truck className="w-3.5 h-3.5" /> },
              { index: 9, pt: "Calend√°rio", zh: "‰∫§‰ªòÊó•ÂéÜ", icon: <Calendar className="w-3.5 h-3.5" /> },
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
                  title="Fa√ßa login com sua conta do Google para editar os dados online em tempo real!"
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
                title="Portugu√™s Brasileiro"
              >
                üáßüá∑ PT
              </button>
              <button 
                id="btn-lang-zh"
                onClick={() => { setLanguage('zh'); updateGlobalDoc('language', 'zh'); }}
                className={`px-2.5 py-1 text-xs font-bold rounded flex items-center gap-1 transition-all ${language === 'zh' ? 'bg-white dark:bg-slate-700 shadow text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
                title="ÁÆÄ‰Ωì‰∏≠Êñá (Chinese Simple)"
              >
                üá®üá≥ ‰∏≠Êñá
              </button>
              <button 
                id="btn-lang-en"
                onClick={() => { setLanguage('en'); updateGlobalDoc('language', 'en'); }}
                className={`px-2.5 py-1 text-xs font-bold rounded flex items-center gap-1 transition-all ${language === 'en' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
                title="English"
              >
                üá∫üá∏ EN
              </button>
              <button 
                id="btn-lang-bilingual"
                onClick={() => { setLanguage('bilingual'); updateGlobalDoc('language', 'bilingual'); }}
                className={`px-2.5 py-1 text-xs font-bold rounded flex items-center gap-1 transition-all ${language === 'bilingual' ? 'bg-white dark:bg-slate-700 shadow text-emerald-700 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
                title="Multi / Bil√≠ngue"
              >
                üåê MULTI
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
                title={language === 'zh' ? '‰∏ãËΩΩÂ∫ìÂ≠òÂØºÂÖ•Ê®°Êùø' : 'Baixar modelo de importa√ß√£o de estoque'}
              >
                <Download className="w-3.5 h-3.5 text-blue-500" />
                <span className="hidden sm:inline">{language === 'zh' ? 'Ê®°Êùø' : 'Modelo'}</span>
              </button>

              <label className="px-2.5 py-1.5 bg-emerald-550 bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700 border border-emerald-700 rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer transition-all shadow-xs">
                <Upload className="w-3.5 h-3.5" />
                <span>{language === 'zh' ? '‰∏ä‰º†Â∫ìÂ≠ò' : 'Atualizar Estoque'}</span>
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
                  ? (language === 'zh' ? 'Ê≠£Âú®ÁîüÊàê PDF...' : 'Gerando PDF...')
                  : pdfStatus === 'success'
                  ? (language === 'zh' ? 'PDF Â∑≤‰∏ãËΩΩ' : 'Relat√≥rio Exportado!')
                  : pdfStatus === 'error'
                  ? (language === 'zh' ? 'ÈîôËØØ' : 'Erro!')
                  : (language === 'zh' ? 'ÂØºÂá∫ PDF' : 'Exportar PDF')}
              </span>
            </button>

            {/* Modo Apresenta√ß√£o */}
            <button
              id="btn-presentation-mode"
              onClick={() => setIsEditMode(false)}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-lg text-xs font-bold shadow flex items-center gap-2 transition-all transform hover:-translate-y-0.5 cursor-pointer"
              title="Alternar para visualiza√ß√£o limpa e expansiva em tela cheia do Portal"
            >
              <Tv className="w-4 h-4" />
              Modo Monitor
            </button>
          </div>
        </header>
      )}

      {/* BOT√ïES FLUTUANTES NO MODO APRESENTA√á√ÉO */}
      {viewParadigm === 'ppt' && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
          <button
            id="btn-back-to-portal"
            onClick={() => setViewParadigm('website')}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-full shadow-2xl flex items-center gap-2 font-black transition-all hover:scale-105 border border-red-500 cursor-pointer"
            title="Retornar para o Inbound Portal"
          >
            <LayoutGrid className="w-5 h-5 text-white" />
            <span>Retornar ao Inbound Portal</span>
          </button>

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
                ? (language === 'zh' ? 'Ê≠£Âú®ÁîüÊàê PDF...' : 'Gerando PDF...')
                : (language === 'zh' ? 'ÂØºÂá∫ PDF' : 'Exportar PDF')}
            </span>
          </button>

          {!isEditMode && (
            <button
              id="btn-back-to-editor"
              onClick={() => setIsEditMode(true)}
              className="bg-[#1e293b] text-white hover:bg-slate-800 px-4 py-3 rounded-full shadow-2xl flex items-center gap-2 font-semibold transition-all hover:scale-105 border border-slate-700"
            >
              <Sliders className="w-5 h-5 text-emerald-400" />
              <span>Voltar ao Editor</span>
            </button>
          )}
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
                  {language === 'zh' ? 'ÊØî‰∫öËø™Áâ©ÊµÅÊéßÂà∂Â°î' : 'BYD Inbound Portal'}
                </span>
                <span className="text-[9px] text-slate-400 font-mono font-bold uppercase tracking-wider">MODERN LOGISTICS PORTAL VIEW</span>
              </div>
              <h2 className="text-xl font-black text-slate-850 dark:text-white tracking-tight leading-none">
                {language === 'zh' 
                  ? getDynamicSlideTitleAndSubtitle().titleZH 
                  : (language === 'en' ? getDynamicSlideTitleAndSubtitle().titleEN : getDynamicSlideTitleAndSubtitle().titlePT)}
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-medium mt-1.5">
                {language === 'zh' 
                  ? getDynamicSlideTitleAndSubtitle().subZH 
                  : (language === 'en' ? getDynamicSlideTitleAndSubtitle().subEN : getDynamicSlideTitleAndSubtitle().subPT)}
              </p>
            </div>
          </div>

          {/* Telemetry Metrics & Quick Language Switcher on the Right Side of Topbar */}
          <div className="flex flex-wrap items-center gap-3 text-xs select-none">
            {/* Quick Topbar Language Pills */}
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-0.5 rounded-xl flex items-center shadow-3xs">
              {[
                { id: 'pt', label: 'üáßüá∑ PT' },
                { id: 'zh', label: 'üá®üá≥ ‰∏≠Êñá' },
                { id: 'en', label: 'üá∫üá∏ EN' },
                { id: 'bilingual', label: 'üåê MULTI' }
              ].map(lang => (
                <button
                  key={lang.id}
                  onClick={() => { setLanguage(lang.id); updateGlobalDoc('language', lang.id); }}
                  className={`px-2 py-1 text-[9.5px] font-black rounded-lg transition-all cursor-pointer ${
                    language === lang.id 
                      ? 'bg-white dark:bg-slate-800 shadow-xs text-red-600 dark:text-red-400 font-bold' 
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-3 py-1.5 rounded-xl shadow-3xs transition-transform hover:scale-101 duration-300">
              <Activity className="w-3.5 h-3.5 text-red-600 animate-pulse" />
              <div className="flex flex-col">
                <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider">
                  {language === 'zh' ? 'ÊÄªÂ†ÜÂ≠ò‰ΩøÁî®Áéá' : (language === 'en' ? 'YARDS OCCUPANCY' : 'OCUPA√á√ÉO DE P√ÅTIOS')}
                </span>
                <span className="text-xs font-black text-slate-800 dark:text-white font-mono">{globalOccupancyPercentForHeader}%</span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-3 py-1.5 rounded-xl shadow-3xs transition-transform hover:scale-101 duration-300">
              <Ship className="w-3.5 h-3.5 text-blue-500 animate-bounce-slow" />
              <div className="flex flex-col">
                <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider">
                  {language === 'zh' ? 'Ê¥ªË∑ÉËàπËà∂Âà∞Ê∏Ø' : (language === 'en' ? 'ACTIVE VESSELS' : 'ESCALA DE NAVIOS')}
                </span>
                <span className="text-xs font-black text-slate-800 dark:text-white font-mono">
                  {totalExpectedVesselsForHeader} <span className="text-[9.5px] text-slate-400 font-normal">({totalExpectedContainersForHeader} CNTRs)</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-3 py-1.5 rounded-xl shadow-3xs transition-transform hover:scale-101 duration-300">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
              <div className="flex flex-col">
                <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider">
                  {language === 'zh' ? 'ÂçèËÆÆÂ†ÜÂú∫Âπ≥ÂùáÊµÅÈáè' : (language === 'en' ? 'DEPOTS VOLUME' : 'DEP√ìSITOS REGULARES')}
                </span>
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

      {/* √ÅREA PRINCIPAL DA INTERFACE */}
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
                      {language === 'zh' ? 'ÊØî‰∫öËø™Áâ©ÊµÅÊéßÂà∂Â°î' : 'BYD Logistics Portal'}
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
                    <span className="text-[8px] text-gray-400 font-bold uppercase">{language === 'zh' ? 'ÊÄªÂ†ÜÂ≠ò‰ΩøÁî®Áéá' : 'Yards Occupancy'}</span>
                    <span className="text-xs font-black text-slate-800 dark:text-white font-mono">{globalOccupancyPercentForHeader}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg">
                  <Ship className="w-3.5 h-3.5 text-blue-500" />
                  <div className="flex flex-col">
                    <span className="text-[8px] text-gray-400 font-bold uppercase">{language === 'zh' ? 'Ê¥ªË∑ÉËàπËà∂Âà∞Ê∏Ø' : 'Active Vessels'}</span>
                    <span className="text-xs font-black text-slate-800 dark:text-white font-mono">{totalExpectedVesselsForHeader} <span className="text-[9px] text-gray-400 font-normal">({totalExpectedContainersForHeader} CNTRs)</span></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                  <div className="flex flex-col">
                    <span className="text-[8px] text-gray-400 font-bold uppercase">{language === 'zh' ? 'ÂçèËÆÆÂ†ÜÂú∫Âπ≥ÂùáÊµÅÈáè' : 'Depots Volume'}</span>
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
              {/* CABE√áALHO DO SLIDE (Apenas no Modo PPT ou ao gerar PDF) */}
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

              {/* CONTE√öDO CONDICIONAL CONFORME O SLIDE ATIVO */}
              {currentSlide === 0 ? (
                <div id="website-dashboard-container" className="flex flex-col gap-6 w-full">
                  
                  {/* DESIGN REFRESH: MODERN CATEGORIZED SECTIONS WITH CAPACITY ROLLUPS */}
                  {(() => {
                    const bondedYards = (Object.entries(yards) as [string, Yard][]).filter(([_, y]) => y && y.type === 'BONDED');
                    const warehouseYards = (Object.entries(yards) as [string, Yard][]).filter(([_, y]) => y && y.type === 'WAREHOUSE');
                    const bufferYards = (Object.entries(yards) as [string, Yard][]).filter(([_, y]) => y && y.type === 'BUFFER');
                    const otherYards = (Object.entries(yards) as [string, Yard][]).filter(([_, y]) => y && y.type !== 'BONDED' && y.type !== 'WAREHOUSE' && y.type !== 'BUFFER');

                    // Calculate live executive telemetry summaries
                    const getSummary = (list: [string, Yard][], isBuffer = false) => {
                      const totalCap = list.reduce((sum, [_, y]) => sum + (y?.capacity || 0), 0);
                      const totalCheio = list.reduce((sum, [_, y]) => sum + (y?.cheio || 0), 0);
                      const totalVazio = list.reduce((sum, [_, y]) => sum + (y?.vazio || 0), 0);
                      const totalOccupied = isBuffer ? (totalCheio + totalVazio) : totalCheio;
                      const pct = totalCap > 0 ? Math.round((totalOccupied / totalCap) * 100) : 0;
                      return { totalCap, totalCheio, totalVazio, totalOccupied, pct };
                    };

                    const bondedSum = getSummary(bondedYards, false);
                    const warehouseSum = getSummary(warehouseYards, false);
                    const bufferSum = getSummary(bufferYards, true);

                    return (
                      <div className="flex flex-col gap-6">
                        
                        {/* GLOBAL QUICK FILTER FOR BL, CONTAINER, LOT */}
                        <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/60 p-4 rounded-xl shadow-sm flex flex-col gap-3">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-red-500/10 dark:bg-red-500/20 text-red-600 rounded-lg">
                                <Search className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="font-extrabold text-xs text-gray-900 dark:text-gray-100 uppercase tracking-tight">
                                  {language === 'bilingual' ? 'Pesquisa R√°pida Global (BL, Container, Lote) / ÂÖ®Â±ÄÂø´ÈÄüÊ£ÄÁ¥¢ (ÊèêÂçï, ÈõÜË£ÖÁÆ±Âè∑, ÊâπÊ¨°)' : 'Pesquisa R√°pida Global (BL, Container, Lote)'}
                                </h4>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                  {language === 'bilingual' ? 'Digite para localizar instantaneamente em qual p√°tio/armaz√©m o cont√™iner, BL ou lote est√° / ËæìÂÖ•‰ª•ÂÆûÊó∂ÂÆö‰ΩçÈõÜË£ÖÁÆ±„ÄÅÊèêÂçïÊàñÊâπÊ¨°ÊâÄÂú®ÁöÑ‰ªìÂ∫ì/Â†ÜÂú∫' : 'Digite para localizar instantaneamente em qual p√°tio ou armaz√©m o item est√° alocado.'}
                                </p>
                              </div>
                            </div>
                            {globalFilterQuery && (
                              <button
                                onClick={() => setGlobalFilterQuery("")}
                                className="text-[11px] font-bold text-red-600 hover:text-red-700 bg-red-50 dark:bg-red-950/40 px-2.5 py-1 rounded-lg cursor-pointer transition-all"
                              >
                                {language === 'bilingual' ? 'Limpar Filtro / Ê∏ÖÈô§Á≠õÈÄâ' : 'Limpar Filtro'}
                              </button>
                            )}
                          </div>
                          
                          <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                            <input
                              type="text"
                              value={globalFilterQuery}
                              onChange={(e) => setGlobalFilterQuery(e.target.value)}
                              placeholder={language === 'bilingual' ? 'üîç Digite BL, Container ou Lote (ex: lot 442) para ver o armaz√©m...' : 'üîç Digite BL, N¬∫ do Container ou Lote (ex: lot 442) para localizar o armaz√©m...'}
                              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-red-500 transition-all font-mono"
                            />
                          </div>

                          {globalFilterQuery.trim() !== '' && (() => {
                            const matchedContainers = containers.filter(c => matchContainerSearch(c, globalFilterQuery));

                            return (
                              <div className="flex flex-col gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between text-[11px] font-bold text-gray-600 dark:text-gray-400">
                                  <span>{language === 'bilingual' ? `Resultados encontrados: ${matchedContainers.length} cont√™iner(es) / ÊâæÂà∞ÁªìÊûú: ${matchedContainers.length} ‰∏™ÈõÜË£ÖÁÆ±` : `Resultados encontrados: ${matchedContainers.length} cont√™iner(es)`}</span>
                                  <span className="text-red-600 font-mono text-[10px]">{language === 'bilingual' ? 'Clique no p√°tio para abrir / ÁÇπÂáªÂ†ÜÂú∫ÊâìÂºÄ' : 'Clique no bot√£o para abrir o p√°tio'}</span>
                                </div>
                                {matchedContainers.length === 0 ? (
                                  <div className="text-center py-4 text-xs text-gray-400 font-medium bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                                    {language === 'bilingual' ? 'Nenhum cont√™iner, BL ou lote encontrado com este termo. / Êú™ÊâæÂà∞ÂåπÈÖçÁöÑÈõÜË£ÖÁÆ±„ÄÅÊèêÂçïÊàñÊâπÊ¨°„ÄÇ' : 'Nenhum cont√™iner, BL ou lote encontrado com este termo.'}
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[280px] overflow-y-auto pr-1">
                                    {matchedContainers.map((mc, idx) => {
                                      const yardObj = yards[mc.yardId];
                                      const yardName = yardObj ? yardObj.name : mc.yardId;
                                      return (
                                        <div key={mc.id || idx} className="bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 p-2.5 rounded-lg flex flex-col justify-between gap-2 shadow-xs hover:border-red-500 transition-all">
                                          <div className="flex items-start justify-between gap-2">
                                            <div>
                                              <span className="font-mono font-black text-xs text-slate-900 dark:text-white select-all">{mc.id}</span>
                                              <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">BL: <span className="font-bold text-slate-700 dark:text-slate-300">{mc.bl || 'N/A'}</span></div>
                                            </div>
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${mc.status === 'CHEIO' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}>
                                              {mc.status || 'CHEIO'}
                                            </span>
                                          </div>
                                          <div className="text-[10.5px] font-sans flex flex-col gap-0.5 border-t border-slate-200/60 dark:border-slate-700/60 pt-1.5">
                                            <div className="flex justify-between">
                                              <span className="text-gray-400">{language === 'bilingual' ? 'Lote / ÊâπÊ¨°:' : 'Lote:'}</span>
                                              <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{mc.lote || '-'}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                              <span className="text-gray-400">{language === 'bilingual' ? 'Armaz√©m / ‰ªìÂ∫ì:' : 'Warehouse / P√°tio:'}</span>
                                              <span className="font-extrabold text-blue-600 dark:text-blue-400 uppercase text-[10px] truncate max-w-[140px]" title={yardName}>{yardName}</span>
                                            </div>
                                          </div>
                                          <button
                                            onClick={() => {
                                              setSelectedYardKey(mc.yardId);
                                              setGlobalFilterQuery("");
                                            }}
                                            className="mt-1 w-full bg-red-600 hover:bg-red-700 text-white text-[10px] font-black py-1.5 rounded transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                                          >
                                            <span>{language === 'bilingual' ? `Ir para ${yardName} / ÊâìÂºÄËØ•Â†ÜÂú∫` : `Abrir P√°tio (${yardName})`}</span>
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        {/* MAIN TITLE BLOCK */}
                        <div className="flex items-center gap-2 border-b pb-1.5 border-gray-200 dark:border-slate-800">
                          <Database className="w-4 h-4 text-red-500 animate-pulse" />
                          <h3 className="font-extrabold text-[12px] text-gray-800 dark:text-gray-100 uppercase tracking-widest">
                            {language === 'bilingual' ? 'Painel Integrado de Capacidade & Monitoramento de P√°tios / ‰æõÂ∫îÈìæ‰∏éÂ†ÜÂú∫Âä®ÊÄÅÊÄªËßàÁõëÊéßÂ°î' : 'Grade Operacional de Monitoramento'}
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
                                    {language === 'bilingual' ? 'Terminais & Recintos Alfandegados / ‰øùÁ®éÂ†ÜÂú∫‰∏éÊ∏ØÂè£ÁªàÁ´Ø' : 'Terminais & Recintos Alfandegados'}
                                  </h4>
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-normal">
                                    {language === 'bilingual' ? 'Portos, CLIAs e recintos prim√°rios integrados √† aduana nacional / ËøõÂ¢ÉÈõÜË£ÖÁÆ±‰∏Ä‰∫åÁ∫ß‰øùÁ®éÂ†ÜÂú∫ÂèäÈÄöÂÖ≥ÊîæË°åÂçïÂÖÉÔºàCLIA & PortosÔºâ' : 'Desembara√ßo aduaneiro e portu√°rio.'}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3 bg-white dark:bg-slate-800/80 border dark:border-slate-700/60 px-2.5 py-1 rounded-lg text-[11px] font-bold shadow-xs">
                                <div className="flex flex-col">
                                  <span className="text-[7.5px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">{language === 'bilingual' ? 'Capacidade / ÂÆπÈáè' : 'Capacidade'}</span>
                                  <span className="font-mono text-gray-700 dark:text-slate-300">{(bondedSum.totalCap).toLocaleString()} <span className="text-[9px] text-gray-400">CNTRs</span></span>
                                </div>
                                <div className="h-4 w-px bg-gray-200 dark:bg-slate-700"></div>
                                <div className="flex flex-col">
                                  <span className="text-[7.5px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">{language === 'bilingual' ? 'Ocupado / Â∑≤Áî®' : 'Ocupado'}</span>
                                  <span className="font-mono text-gray-700 dark:text-slate-300">{(bondedSum.totalCheio).toLocaleString()} <span className="text-[9px] text-gray-400">CNTRs</span></span>
                                </div>
                                <div className="h-4 w-px bg-gray-200 dark:bg-slate-700"></div>
                                <div className="flex flex-col items-center">
                                  <span className="text-[7.5px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">{language === 'bilingual' ? 'Geral / Âç†ÊØî' : 'Ocupa√ß√£o'}</span>
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
                                {language === 'bilingual' ? 'Nenhum terminal alfandegado cadastrado. / Êú™ËÆ∞ÂΩï‰øùÁ®éÂ†ÜÂú∫„ÄÇ' : 'Nenhum terminal alfandegado cadastrado.'}
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
                                    {language === 'bilingual' ? 'Centros de Distribui√ß√£o & Armaz√©ns (Warehouses) / ‰ªìÂ∫ì„ÄÅÊÄªË£Ö‰∏≠ÂøÉ‰∏éÂàÜÊã®Á´ô' : 'Centros de Distribui√ß√£o & Armaz√©ns'}
                                  </h4>
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-normal">
                                    {language === 'bilingual' ? 'Estocagem nacionalizada, processos de desova, kit de autope√ßas e expedi√ß√£o dom√©stica / Èõ∂ÈÉ®‰ª∂Êé•Êî∂Â≠òÊîæÂú®Á∫ø„ÄÅÂºÄÁÆ±ÊãÜÂåÖ„ÄÅÂõΩÂÜÖÁîü‰∫ß‰ª∂ÂèäÊàêÂìÅÈÖçÂ•ó‰∏éÈÖçÈÄÅ‰∏≠ÂøÉÔºàCD/WAREHOUSEÔºâ' : 'Estocagem nacionalizada e expedi√ß√£o.'}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3 bg-white dark:bg-slate-800/80 border dark:border-slate-700/60 px-2.5 py-1 rounded-lg text-[11px] font-bold shadow-xs">
                                <div className="flex flex-col">
                                  <span className="text-[7.5px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">{language === 'bilingual' ? 'Capacidade / ÂÆπÈáè' : 'Capacidade'}</span>
                                  <span className="font-mono text-gray-700 dark:text-slate-300">{(warehouseSum.totalCap).toLocaleString()} <span className="text-[9px] text-gray-400">CNTRs</span></span>
                                </div>
                                <div className="h-4 w-px bg-gray-200 dark:bg-slate-700"></div>
                                <div className="flex flex-col">
                                  <span className="text-[7.5px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">{language === 'bilingual' ? 'Ocupado / Â∑≤Áî®' : 'Ocupado'}</span>
                                  <span className="font-mono text-gray-700 dark:text-slate-300">{(warehouseSum.totalCheio).toLocaleString()} <span className="text-[9px] text-gray-400">CNTRs</span></span>
                                </div>
                                <div className="h-4 w-px bg-gray-200 dark:bg-slate-700"></div>
                                <div className="flex flex-col items-center">
                                  <span className="text-[7.5px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">{language === 'bilingual' ? 'Geral / Âç†ÊØî' : 'Ocupa√ß√£o'}</span>
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
                                {language === 'bilingual' ? 'Nenhum centro de distribui√ß√£o cadastrado. / Êú™ËÆ∞ÂΩïÂàÜÊã®‰ªìÂ∫ì„ÄÇ' : 'Nenhum centro de distribui√ß√£o cadastrado.'}
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
                                    {language === 'bilingual' ? 'P√°tios de Apoio & Janela de Atraca√ß√£o / ËæÖÂä©ÁºìÂÜ≤Â†ÜÂú∫‰∏éËàπÂè™ÊäµÊ∏ØÁõëÊéß' : 'P√°tios de Apoio & Janela de Atraca√ß√£o'}
                                  </h4>
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-normal">
                                    {language === 'bilingual' ? 'Estocagem pulm√£o reguladora de fluxo e roteiriza√ß√£o mar√≠tima iminente / Ë∞ÉËäÇÁü≠È©≥ÊµÅÈáèÁöÑÁºìÂÜ≤Â†ÜÊä§Ôºå‰ª•ÂèäÊúÄËøëÂπ≤Á∫øËàπÊúüÂèäÈ¢ÑÊúüÂà∞Ë¥ßÈõÜË£ÖÁÆ±Èáè' : 'Capacidade buffer e ETA de navios em tempo real.'}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3 bg-white dark:bg-slate-800/80 border dark:border-slate-700/60 px-2.5 py-1 rounded-lg text-[11px] font-bold shadow-xs">
                                <div className="flex flex-col">
                                  <span className="text-[7.5px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">{language === 'bilingual' ? 'Capacidade Buffer / ÁºìÂÜ≤ÂÆπÈáè' : 'Buffer'}</span>
                                  <span className="font-mono text-gray-700 dark:text-slate-300">{(bufferSum.totalCap).toLocaleString()} <span className="text-[9px] text-gray-400">CNTRs</span></span>
                                </div>
                                <div className="h-4 w-px bg-gray-200 dark:bg-slate-700"></div>
                                <div className="flex flex-col">
                                  <span className="text-[7.5px] text-gray-400 dark:text-gray-500 uppercase tracking-wider" title="Total no Buffer: Soma Cheio + Vazio (espa√ßo ocupado)">{language === 'bilingual' ? 'Total Buffer (Cheio + Vazio) / ÁºìÂÜ≤ÊÄªÂ∫ìÂ≠ò(Èáç+Á©∫)' : language === 'zh' ? 'ÁºìÂÜ≤ÊÄªÂ∫ìÂ≠ò (Èáç+Á©∫)' : 'Total Buffer (Cheio + Vazio)'}</span>
                                  <span className="font-mono text-amber-600 dark:text-amber-400 font-extrabold flex items-baseline gap-1">
                                    {(bufferSum.totalOccupied).toLocaleString()} <span className="text-[9px] text-gray-400 font-normal">CNTRs</span>
                                    <span className="text-[8px] text-gray-400 font-normal">({bufferSum.totalCheio}C + {bufferSum.totalVazio}V)</span>
                                  </span>
                                </div>
                                <div className="h-4 w-px bg-gray-200 dark:bg-slate-700"></div>
                                <div className="flex flex-col items-center">
                                  <span className="text-[7.5px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">{language === 'bilingual' ? 'Geral / Âç†ÊØî' : 'Ocupa√ß√£o'}</span>
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
                                    {language === 'bilingual' ? 'Nenhum p√°tio de apoio regulador cadastrado. / Êú™ËÆ∞ÂΩïÁºìÂÜ≤/ËæÖÂä©Â†ÜÂú∫„ÄÇ' : 'Nenhum p√°tio de apoio cadastrado.'}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Vessels Table Card - Minimizable by Month */}
                            <div className="col-span-1">
                              <div className="flex flex-col h-full min-h-[220px]">
                                <div className={`p-3 rounded-xl flex-1 border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-100 shadow-sm'} flex flex-col justify-between`}>
                                  <div>
                                    {/* Card Header */}
                                    <div className="flex items-center justify-between border-b pb-1.5 mb-2.5 border-gray-100 dark:border-slate-800">
                                      <div className="flex items-center gap-1.5">
                                        <Ship className="w-4 h-4 text-blue-500" />
                                        <h3 className="font-extrabold text-xs text-[#2563eb] tracking-tight">
                                          {language === 'bilingual' ? 'Ê¥ªË∑ÉËàπËà∂Èù†Ê≥äËÆ°Âàí (ETA)' : t('vesselSchedule')}
                                        </h3>
                                      </div>
                                      
                                      <div className="flex items-center gap-1.5">
                                        {/* Quick Toggle All Months */}
                                        {(() => {
                                          const monthlyGroups = groupVesselsByMonth(vessels, language);
                                          const anyOpen = monthlyGroups.some(g => expandedVesselMonths[g.monthKey]);
                                          return (
                                            <button
                                              type="button"
                                              onClick={() => toggleAllVesselMonths(monthlyGroups)}
                                              className="text-[9px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/80 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded cursor-pointer transition-all flex items-center gap-1 border border-blue-200/60 dark:border-blue-800/60 shadow-2xs"
                                              title={anyOpen ? 'Recolher todos os meses' : 'Abrir todos os navios'}
                                            >
                                              {anyOpen ? (
                                                <>
                                                  <Minimize2 className="w-2.5 h-2.5" />
                                                  <span>{language === 'bilingual' ? 'Recolher / ÊäòÂè†' : language === 'zh' ? 'ÂÖ®ÈÉ®ÊäòÂè†' : 'Recolher'}</span>
                                                </>
                                              ) : (
                                                <>
                                                  <Maximize2 className="w-2.5 h-2.5" />
                                                  <span>{language === 'bilingual' ? 'Abrir Todos / Â±ïÂºÄ' : language === 'zh' ? 'ÂÖ®ÈÉ®Â±ïÂºÄ' : 'Abrir Todos'}</span>
                                                </>
                                              )}
                                            </button>
                                          );
                                        })()}
                                        <span className="text-[9px] bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200 font-bold px-1.5 py-0.5 rounded-full">
                                          {t('projected')}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Monthly Groups Accordion */}
                                    {(() => {
                                      const monthlyGroups = groupVesselsByMonth(vessels, language);

                                      if (monthlyGroups.length === 0) {
                                        return (
                                          <div className="text-center py-6 text-gray-400 text-xs font-semibold">
                                            {t('noVessels')}
                                          </div>
                                        );
                                      }

                                      return (
                                        <div className="flex flex-col gap-2">
                                          {monthlyGroups.map((group) => {
                                            const isExpanded = !!expandedVesselMonths[group.monthKey];
                                            return (
                                              <div
                                                key={group.monthKey}
                                                className={`rounded-lg border transition-all duration-200 overflow-hidden ${
                                                  theme === 'dark'
                                                    ? isExpanded ? 'bg-slate-800/80 border-blue-900/60' : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
                                                    : isExpanded ? 'bg-blue-50/40 border-blue-200/80' : 'bg-slate-50/80 border-slate-200/70 hover:border-blue-300'
                                                }`}
                                              >
                                                {/* Month Accordion Header Bar */}
                                                <button
                                                  type="button"
                                                  onClick={() => toggleVesselMonth(group.monthKey)}
                                                  className="w-full px-2.5 py-2 flex items-center justify-between text-left cursor-pointer select-none transition-colors hover:bg-blue-500/5"
                                                >
                                                  <div className="flex items-center gap-1.5 min-w-0">
                                                    <div className={`p-0.5 rounded transition-transform duration-200 ${isExpanded ? 'text-blue-600 rotate-0' : 'text-gray-400 -rotate-90'}`}>
                                                      <ChevronDown className="w-3.5 h-3.5" />
                                                    </div>
                                                    <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                                    <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200 tracking-tight truncate">
                                                      {group.monthLabel}
                                                    </span>
                                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                                      {group.vessels.length} {language === 'zh' ? 'Ëâò' : 'navio(s)'}
                                                    </span>
                                                  </div>

                                                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                                    <span className="font-mono font-black text-[11px] text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                                                      {group.totalCntrs.toLocaleString()} <span className="text-[8.5px] font-normal text-gray-400">CNTRs</span>
                                                    </span>
                                                  </div>
                                                </button>

                                                {/* Collapsible Vessel Table Body */}
                                                {isExpanded && (
                                                  <div className="border-t border-slate-200/70 dark:border-slate-700/60 p-2 bg-white/70 dark:bg-slate-900/60 animate-in fade-in-50 duration-150">
                                                    <table className="w-full text-left text-xs">
                                                      <thead>
                                                        <tr className="border-b border-gray-100 dark:border-slate-800 text-gray-400 font-bold uppercase text-[9px] tracking-wider">
                                                          <th className="py-1">{getColHeader('vessel')}</th>
                                                          <th className="py-1 text-center">{getColHeader('eta')}</th>
                                                          <th className="py-1 text-right">{getColHeader('cntrs')}</th>
                                                          {isEditMode && <th className="py-1 text-center w-8">A√ß√£o</th>}
                                                        </tr>
                                                      </thead>
                                                      <tbody className="divide-y divide-gray-50 dark:divide-slate-800/40">
                                                        {group.vessels.map((vessel) => (
                                                          <tr key={vessel.id} className="hover:bg-blue-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                                            <td className={`font-extrabold text-gray-800 dark:text-gray-200 text-xs tracking-tight ${widescreenMode ? 'py-1' : 'py-1.5'}`}>
                                                              {isEditMode ? (
                                                                <input
                                                                  type="text"
                                                                  value={vessel.name}
                                                                  onChange={(e) => {
                                                                    const newName = e.target.value;
                                                                    setVessels(prev => prev.map(v => v.id === vessel.id ? { ...v, name: newName } : v));
                                                                    setDoc(doc(db, 'vessels', String(vessel.id)), { name: newName }, { merge: true });
                                                                  }}
                                                                  className="w-full p-1 text-xs border rounded bg-white dark:bg-slate-800 font-bold"
                                                                />
                                                              ) : (
                                                                vessel.name
                                                              )}
                                                            </td>
                                                            <td className={`text-center text-gray-650 dark:text-gray-400 font-mono font-medium text-xs ${widescreenMode ? 'py-1' : 'py-1.5'}`}>
                                                              {isEditMode ? (
                                                                <input
                                                                  type="text"
                                                                  value={vessel.eta}
                                                                  onChange={(e) => {
                                                                    const newEta = e.target.value;
                                                                    setVessels(prev => prev.map(v => v.id === vessel.id ? { ...v, eta: newEta } : v));
                                                                    setDoc(doc(db, 'vessels', String(vessel.id)), { eta: newEta }, { merge: true });
                                                                  }}
                                                                  className="w-20 p-1 text-xs text-center border rounded bg-white dark:bg-slate-800 font-mono"
                                                                />
                                                              ) : (
                                                                vessel.eta
                                                              )}
                                                            </td>
                                                            <td className={`text-right font-black text-blue-600 dark:text-blue-400 text-xs ${widescreenMode ? 'py-1' : 'py-1.5'}`}>
                                                              {isEditMode ? (
                                                                <input
                                                                  type="number"
                                                                  value={vessel.cntrs}
                                                                  onChange={(e) => {
                                                                    const newCntrs = Number(e.target.value) || 0;
                                                                    setVessels(prev => prev.map(v => v.id === vessel.id ? { ...v, cntrs: newCntrs } : v));
                                                                    setDoc(doc(db, 'vessels', String(vessel.id)), { cntrs: newCntrs }, { merge: true });
                                                                  }}
                                                                  className="w-16 p-1 text-xs text-right border rounded bg-white dark:bg-slate-800 font-mono font-black text-blue-600"
                                                                />
                                                              ) : (
                                                                vessel.cntrs.toLocaleString()
                                                              )}
                                                            </td>
                                                            {isEditMode && (
                                                              <td className="text-center py-1">
                                                                <button
                                                                  type="button"
                                                                  onClick={() => {
                                                                    setVessels(prev => prev.filter(v => v.id !== vessel.id));
                                                                    deleteDoc(doc(db, 'vessels', String(vessel.id)));
                                                                  }}
                                                                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                                                  title="Remover navio"
                                                                >
                                                                  <Trash2 className="w-3 h-3" />
                                                                </button>
                                                              </td>
                                                            )}
                                                          </tr>
                                                        ))}
                                                      </tbody>
                                                    </table>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      );
                                    })()}
                                  </div>

                                  {/* Card Footer: Overall Total */}
                                  <div className="mt-2.5 pt-2 border-t border-dashed border-gray-100 dark:border-slate-800 text-[10px] text-gray-400 flex justify-between items-center">
                                    <div className="flex items-center gap-1">
                                      <span className="font-bold uppercase tracking-tight text-[9.5px]">
                                        {language === 'bilingual' ? 'ÈõÜË£ÖÁÆ±ÊÄªÊï∞ / Total:' : t('totalContainers') + ':'}
                                      </span>
                                      <span className="text-[9px] text-gray-400 font-medium">({vessels.length} {language === 'zh' ? 'ËâòËàπ' : 'navios'})</span>
                                    </div>
                                    <span className="font-extrabold text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/80 border border-blue-200/50 dark:border-blue-900/50 px-2 py-0.5 rounded font-mono">
                                      {vessels.reduce((acc, curr) => acc + (Number(curr.cntrs) || 0), 0).toLocaleString()} <span className="text-[9px] font-normal">CNTRs</span>
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* EXECUTIVE LOGISTICS TRACKING DASHBOARD COMPONENT - FULL WIDTH */}
                          <div className="w-full mt-2">
                            <CargoReadyVsDeliveredDashboard
                              theme={theme}
                              language={language}
                              yards={yards}
                              setYards={setYards}
                              vessels={vessels}
                              setVessels={setVessels}
                              dailyDeliveryRate={dailyDeliveryRate}
                              setDailyDeliveryRate={setDailyDeliveryRate}
                              bondedSum={bondedSum}
                              warehouseSum={warehouseSum}
                              bufferSum={bufferSum}
                              additionalBacklog={additionalBacklog}
                              setAdditionalBacklog={setAdditionalBacklog}
                              selectedScenario={selectedScenario}
                              setSelectedScenario={setSelectedScenario}
                            />
                          </div>

                        </div>

                        {/* OTHER DYNAMIC EXTRA YARDS FALLBACK */}
                        {otherYards.length > 0 && (
                          <div className="flex flex-col gap-3">
                            <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Outros P√°tios Adicionais / ÂÖ∂‰ªñÂ†ÜÂú∫</h4>
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

                </div>
              ) : currentSlide === 1 ? (
                /* SLIDE 2: P√ÅTIOS (YARDS ONLY) COM OBSERVA√á√ïES AMPLAS */
                <div id="slide-dashboard-grid-yards" className={`flex flex-col justify-between ${widescreenMode ? 'h-[calc(100%-85px)] overflow-hidden' : 'min-h-[660px] gap-4'}`}>
                  
                  {/* BARRA DE CONTROLE LOCAL DE P√ÅTIOS / SPREADSHEET */}
                  <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-slate-800 shadow-xs mb-2">
                    <div className="flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4 text-red-500 animate-pulse" />
                      <div>
                        <h4 className="font-extrabold text-xs text-gray-850 dark:text-gray-150 uppercase tracking-tight">
                          {language === 'zh' ? 'ËßÜÂõæ‰∏éÊï∞ÊçÆÁÆ°ÁêÜ' : 'Modo de Visualiza√ß√£o & Gest√£o de Dados'}
                        </h4>
                        <p className="text-[10px] text-gray-400">
                          {language === 'zh' ? 'Âú®ÁªèÂÖ∏ÁöÑÊ®°ÂùóÁΩëÊ†ºÂíåÊï∞ÊçÆË°®ËßÜÂõæ‰πãÈó¥ËøõË°åÈÄâÊã©' : 'Alterne entre cart√µes executivos e planilha detalhada de estoque.'}
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
                        <span>{language === 'zh' ? 'Âç°ÁâáÊ®°Âºè' : 'Visualiza√ß√£o em Cards'}</span>
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
                        <span>{language === 'zh' ? 'ÂÖ®ÂäüËÉΩÁîµÂ≠êË°®Ê†º' : 'Planilha Geral de Estoque'}</span>
                      </button>
                    </div>
                  </div>

                  {yardsViewMode === 'cards' ? (
                    /* Cards de P√°tio expandidos horizontalmente */
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
                                  placeholder={language === 'zh' ? 'ÊêúÁ¥¢ÁÆ±Âè∑, BL, ËàπËà∂...' : 'Buscar Cont√™iner, BL, Navio, Lote...'}
                                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-red-500 font-sans"
                                />
                              </div>

                              {/* Warehouse Filter */}
                              <select
                                value={globalStockWarehouseFilter}
                                onChange={(e) => setGlobalStockWarehouseFilter(e.target.value)}
                                className="p-1.5 text-xs font-bold rounded-lg border dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-hidden"
                              >
                                <option value="ALL">{language === 'zh' ? 'ÊâÄÊúâÂ†ÜÂú∫' : 'Todos os P√°tios / Armar√©ns'}</option>
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
                                <option value="ALL">{language === 'zh' ? 'ÊâÄÊúâÊâπÊ¨°' : 'Todos os Lotes'}</option>
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
                                <span>{language === 'zh' ? 'ÂØºÂá∫Ë°®Ê†º' : 'Exportar Excel'}</span>
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
                                  <th className="p-2.5 w-[100px]">Programa√ß√£o</th>
                                  <th className="p-2.5 w-[120px]">Transportadora</th>
                                  {isEditMode && <th className="p-2.5 w-[60px] text-center">A√ß√£o</th>}
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

                                    {/* Programa√ß√£o */}
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
                                          title={language === 'zh' ? 'Âà†Èô§ÈõÜË£ÖÁÆ±' : 'Remover cont√™iner'}
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
                                      {language === 'zh' ? 'Ê≤°ÊúâÂåπÈÖçÁöÑÈõÜË£ÖÁÆ±ËÆ∞ÂΩï„ÄÇ' : 'Nenhum cont√™iner registrado para as buscas atuais.'}
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

                  {/* Campo de Escrita Livre para P√°tios */}
                  <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-100 shadow-sm'} flex-1 mt-2 flex flex-col justify-between min-h-[140px]`}>
                    <div className="flex items-center gap-2 border-b pb-1.5 mb-2 border-gray-100 dark:border-slate-800">
                      <FileText className="w-4.5 h-4.5 text-red-500 animate-pulse" />
                      <h4 className="font-extrabold text-[11px] text-red-600 dark:text-red-400 uppercase tracking-wider block">
                        {language === 'bilingual' ? 'COMENT√ÅRIOS DE CAPACIDADE & DIRETRIZES DE P√ÅTIO / Â†ÜÂú∫ÂÆπÈáèÂ§áÂøòÂΩï‰∏éËøêË°åËØÑËÆ∫' : language === 'zh' ? 'Â†ÜÂú∫ÂÆπÈáèÂ§áÂøòÂΩï‰∏éËøêË°åËØÑËÆ∫' : 'COMENT√ÅRIOS DE CAPACIDADE & DIRETRIZES DE P√ÅTIO'}
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
                          placeholder="Digite suas observa√ß√µes de p√°tio... / Âú®Ê≠§ËæìÂÖ•ÊÇ®ÁöÑÂ†ÜÂú∫Â§áÊ≥®..."
                          rows={4}
                          className="w-full flex-1 p-2 text-xs font-semibold border border-gray-200 dark:border-gray-700 dark:bg-slate-800 rounded-lg focus:ring-1 focus:ring-red-500 outline-none resize-none text-slate-800 dark:text-slate-100 placeholder:text-gray-400 font-sans"
                        />
                      ) : (
                        <div className="text-xs leading-relaxed font-bold text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans p-1.5 bg-slate-50/40 dark:bg-slate-900/40 rounded-lg border border-slate-50 dark:border-none">
                          {yardsComment || "Sem observa√ß√µes adicionadas para este per√≠odo. / Êú¨ÊúüÊó†ÈôÑÂä†ËØ¥Êòé„ÄÇ"}
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              ) : currentSlide === 2 ? (
                /* SLIDE 3: NAVIOS (VESSELS ONLY) COM DUAS √ÅREAS DE NOTAS */
                <div id="slide-dashboard-grid-vessels" className={`grid grid-cols-12 gap-4 ${widescreenMode ? 'h-[calc(100%-85px)] overflow-hidden' : 'min-h-[660px]'}`}>
                  
                  {/* LADO ESQUERDO: TABELA DE NAVIOS INTEGRAL EXPANDIDA POR M√äS */}
                  <div className="col-span-12 lg:col-span-5 flex flex-col h-full justify-between">
                    <div className={`p-4 rounded-xl flex-1 border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-100 shadow-sm'} flex flex-col justify-between`}>
                      <div>
                        {/* Header */}
                        <div className="flex items-center justify-between border-b pb-2 mb-3 border-gray-100 dark:border-slate-800">
                          <h3 className="font-extrabold text-sm flex items-center gap-2 text-[#2563eb] tracking-tight">
                            <Ship className="w-5 h-5 text-blue-500" /> 
                            {language === 'bilingual' ? 'Ê¥ªË∑ÉËàπËà∂Èù†Ê≥äËÆ°Âàí (ETA) / ËàπËà∂ËÆ°Âàí' : t('vesselSchedule')}
                          </h3>
                          <div className="flex items-center gap-1.5">
                            {(() => {
                              const monthlyGroups = groupVesselsByMonth(vessels, language);
                              const anyOpen = monthlyGroups.some(g => expandedVesselMonths[g.monthKey]);
                              return (
                                <button
                                  type="button"
                                  onClick={() => toggleAllVesselMonths(monthlyGroups)}
                                  className="text-[9.5px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/80 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded cursor-pointer transition-all flex items-center gap-1 border border-blue-200/60 dark:border-blue-800/60 shadow-2xs"
                                  title={anyOpen ? 'Recolher todos os meses' : 'Abrir todos os navios'}
                                >
                                  {anyOpen ? (
                                    <>
                                      <Minimize2 className="w-2.5 h-2.5" />
                                      <span>{language === 'bilingual' ? 'Recolher / ÊäòÂè†' : language === 'zh' ? 'ÂÖ®ÈÉ®ÊäòÂè†' : 'Recolher'}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Maximize2 className="w-2.5 h-2.5" />
                                      <span>{language === 'bilingual' ? 'Abrir Todos / Â±ïÂºÄ' : language === 'zh' ? 'ÂÖ®ÈÉ®Â±ïÂºÄ' : 'Abrir Todos'}</span>
                                    </>
                                  )}
                                </button>
                              );
                            })()}
                            <span className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200 font-bold px-2 py-0.5 rounded-full">{t('projected')}</span>
                          </div>
                        </div>

                        {/* Monthly Groups Accordion */}
                        {(() => {
                          const monthlyGroups = groupVesselsByMonth(vessels, language);

                          if (monthlyGroups.length === 0) {
                            return (
                              <div className="text-center py-10 text-gray-400 text-sm font-semibold">
                                {t('noVessels')}
                              </div>
                            );
                          }

                          return (
                            <div className="flex flex-col gap-2.5">
                              {monthlyGroups.map((group) => {
                                const isExpanded = !!expandedVesselMonths[group.monthKey];
                                return (
                                  <div
                                    key={group.monthKey}
                                    className={`rounded-lg border transition-all duration-200 overflow-hidden ${
                                      theme === 'dark'
                                        ? isExpanded ? 'bg-slate-800/80 border-blue-900/60' : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
                                        : isExpanded ? 'bg-blue-50/40 border-blue-200/80' : 'bg-slate-50/80 border-slate-200/70 hover:border-blue-300'
                                    }`}
                                  >
                                    {/* Month Header Bar */}
                                    <button
                                      type="button"
                                      onClick={() => toggleVesselMonth(group.monthKey)}
                                      className="w-full px-3 py-2.5 flex items-center justify-between text-left cursor-pointer select-none transition-colors hover:bg-blue-500/5"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className={`p-0.5 rounded transition-transform duration-200 ${isExpanded ? 'text-blue-600 rotate-0' : 'text-gray-400 -rotate-90'}`}>
                                          <ChevronDown className="w-4 h-4" />
                                        </div>
                                        <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
                                        <span className="font-extrabold text-sm text-slate-800 dark:text-slate-200 tracking-tight truncate">
                                          {group.monthLabel}
                                        </span>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                          {group.vessels.length} {language === 'zh' ? 'Ëâò' : 'navio(s)'}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0 ml-2">
                                        <span className="font-mono font-black text-xs text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                                          {group.totalCntrs.toLocaleString()} <span className="text-[9px] font-normal text-gray-400">CNTRs</span>
                                        </span>
                                      </div>
                                    </button>

                                    {/* Collapsible Body */}
                                    {isExpanded && (
                                      <div className="border-t border-slate-200/70 dark:border-slate-700/60 p-2.5 bg-white/70 dark:bg-slate-900/60 animate-in fade-in-50 duration-150">
                                        <table className="w-full text-left text-xs">
                                          <thead>
                                            <tr className="border-b border-gray-200 dark:border-slate-800 text-gray-400 font-extrabold uppercase text-[9.5px] tracking-wider">
                                              <th className="py-1.5">{getColHeader('vessel')}</th>
                                              <th className="py-1.5 text-center">{getColHeader('eta')}</th>
                                              <th className="py-1.5 text-right">{getColHeader('cntrs')}</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-100 dark:divide-slate-800/40">
                                            {group.vessels.map((vessel, idx) => (
                                              <tr key={vessel.id || idx} className="hover:bg-blue-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                                <td className="font-extrabold text-gray-800 dark:text-gray-200 text-xs tracking-tight py-2">{vessel.name}</td>
                                                <td className="text-center text-gray-650 dark:text-gray-400 font-mono font-bold text-xs py-2">{vessel.eta}</td>
                                                <td className="text-right font-black text-blue-600 dark:text-blue-400 text-xs py-2">{vessel.cntrs.toLocaleString()}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Resumo do Volume Total a Descarregar */}
                      <div className="mt-4 pt-3 border-t border-dashed border-gray-200 dark:border-slate-800 text-xs text-gray-400 flex justify-between items-center bg-blue-50/20 dark:bg-blue-950/20 p-2.5 rounded-lg border border-blue-50 dark:border-none">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold uppercase tracking-tight text-[10px]">
                            {language === 'bilingual' ? 'ÈõÜË£ÖÁÆ±Âà∞Ê∏ØÊÄªÈáè / Total Containers:' : t('totalContainers') + ':'}
                          </span>
                          <span className="text-[10px] text-gray-400 font-medium">({vessels.length} {language === 'zh' ? 'ËâòËàπ' : 'navios'})</span>
                        </div>
                        <span className="font-black text-sm text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950 px-3 py-1 rounded font-mono">
                          {vessels.reduce((acc, curr) => acc + (Number(curr.cntrs) || 0), 0).toLocaleString()} <span className="text-[10px] font-normal">CNTRs</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* LADO DIREITO: DUAS √ÅREAS EM BRANCO PARA NOTAS OPERACIONAIS */}
                  <div className="col-span-12 lg:col-span-7 flex flex-col gap-3 h-full justify-between">
                    
                    {/* Nota 1: Janelas e Atraca√ß√µes */}
                    <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-100 shadow-sm'} flex-1 flex flex-col justify-between min-h-[160px]`}>
                      <div className="flex items-center gap-2 border-b pb-1.5 mb-2 border-gray-100 dark:border-slate-800">
                        <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <h4 className="font-bold text-xs text-blue-800 dark:text-blue-200 uppercase tracking-wider block">
                          {language === 'bilingual' ? '1. JANELAS OPERACIONAIS DE ATRACA√á√ÉO / ËàπÊúü‰∏éÈù†Ê≥äËØ¥Êòé' : language === 'zh' ? '1. ËàπÊúü‰∏éÈù†Ê≥äËØ¥Êòé' : '1. JANELAS OPERACIONAIS DE ATRACA√á√ÉO'}
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
                            placeholder="Digite as notas operacionais e janelas de atraca√ß√£o... / Âú®Ê≠§ÁºñÂÜôÈù†Ê≥ä‰∏éËàπÊúüÂ§áÂøòËÆ∞ÂΩï..."
                            className="w-full flex-1 p-2 text-xs font-semibold border border-gray-200 dark:border-gray-700 dark:bg-slate-800 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none resize-none text-slate-800 dark:text-slate-100 placeholder:text-gray-400 font-sans"
                          />
                        ) : (
                          <div className="text-xs leading-relaxed font-bold text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans p-2 bg-slate-50/40 dark:bg-slate-900/40 rounded-lg border border-slate-50 dark:border-none">
                            {vesselNote1 || "Sem observa√ß√µes operacionais para este per√≠odo. / Êú¨ÊúüÊó†ÈôÑÂä†Èù†Ê≥äËØ¥Êòé„ÄÇ"}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Nota 2: Escoamento de Contentores e Prioridade */}
                    <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-100 shadow-sm'} flex-1 flex flex-col justify-between min-h-[160px]`}>
                      <div className="flex items-center gap-2 border-b pb-1.5 mb-2 border-gray-100 dark:border-slate-800">
                        <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-450" />
                        <h4 className="font-bold text-xs text-emerald-800 dark:text-emerald-200 uppercase tracking-wider block">
                          {language === 'bilingual' ? '2. LOG√çSTICA DE LIBERA√á√ÉO E PRIORIDADE BYD / Âè£Â≤∏ÊèêËøê‰∏éÂá∫ÁÆ±‰ºòÂÖàÁ∫ß' : language === 'zh' ? '2. Âè£Â≤∏ÊèêËøê‰∏éÂá∫ÁÆ±‰ºòÂÖàÁ∫ß' : '2. LOG√çSTICA DE LIBERA√á√ÉO E PRIORIDADE BYD'}
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
                            placeholder="Digite os destaques de escoamento e prioriza√ß√µes... / Âú®Ê≠§ÁºñÂÜôÈõÜË£ÖÁÆ±ÊèêËøêÂíåÂè£Â≤∏ÊîæË°åÂ§áÂøòË¶ÅÁÇπ..."
                            className="w-full flex-1 p-2 text-xs font-semibold border border-gray-200 dark:border-gray-700 dark:bg-slate-800 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none resize-none text-slate-800 dark:text-slate-100 placeholder:text-gray-400 font-sans"
                          />
                        ) : (
                          <div className="text-xs leading-relaxed font-bold text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans p-2 bg-slate-50/40 dark:bg-slate-900/40 rounded-lg border border-slate-50 dark:border-none">
                            {vesselNote2 || "Sem notas de prioriza√ß√£o para este per√≠odo. / Êú¨ÊúüÊó†ÊèêËøêÊîæË°åÊåáÁ§∫„ÄÇ"}
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              ) : currentSlide === 3 ? (
                /* SLIDE 4: GR√ÅFICOS (CHARTS ONLY) COM CAIXAS DE COMENT√ÅRIOS */
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
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className="font-extrabold text-[12px] text-gray-800 dark:text-gray-100 uppercase tracking-tight flex items-center gap-1.5">
                                  {language === 'bilingual' ? 'Simula√ß√£o de Escoamento / ‰ªøÁúüÊ®°ÊãüÂô®' : 'Cargo Drain Simulation'}
                                </h3>
                                <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                  <button
                                    onClick={() => setChartTab('drain')}
                                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${chartTab === 'drain' ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                                  >
                                    {language === 'zh' ? 'ÊµÅÈÄüÊ®°Êãü' : 'Drain'}
                                  </button>
                                  <button
                                    onClick={() => setChartTab('space')}
                                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${chartTab === 'space' ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                                  >
                                    {language === 'zh' ? 'Á©∫Èó¥Âç†Áî®' : 'Space'}
                                  </button>
                                </div>
                              </div>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-sans">
                                {chartTab === 'drain' 
                                  ? (language === 'bilingual' ? 'Ajuste os cen√°rios e capacidades para recalcular o gr√°fico de backlog / Ë∞ÉËäÇ‰∏çÂêåÂèëËøêÂú∫ÊôØ‰∏éÊØèÊó•‰∫§‰ªòËÉΩÂäõÔºåÂÆûÊó∂ÈáçÁÆóÁßØÂéãÂá∫Ê∏ÖÊõ≤Á∫ø' : 'Adjust scenarios and rates to dynamically recalculate the backlog burn-down.')
                                  : (language === 'bilingual' ? 'An√°lise visual de capacidade vs ocupa√ß√£o nos terminais / ÂêÑÂ†ÜÂú∫/‰ªìÂ∫ìÂÆπÈáèÂèäÂΩìÂâçÂç†Áî®ÁéáÁöÑÂèØËßÜÂåñÂàÜÊûê' : 'Visual analysis of capacity vs occupancy across yards.')}
                              </p>
                            </div>
                          </div>

                          {/* Toggles & Sliders (Only show if on drain tab) */}
                          {chartTab === 'drain' && (
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
                                {language === 'bilingual' ? 'Etapa 1 (P√°tios+CDs)' : 'Etapa 1'}
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
                                {language === 'bilingual' ? 'Capacidade / ËÉΩÂäõ:' : 'Capacity:'}
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
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-sans">{language === 'bilingual' ? 'Previs√£o / È¢ÑËÆ°ÂÆåÊàê' : 'Completion'}:</span>
                              <span className="text-[11px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md font-mono">
                                {(() => {
                                  const activeVol = selectedScenario === 'etapa1'
                                    ? (bondedSum.totalCheio + warehouseSum.totalCheio + additionalBacklog)
                                    : selectedScenario === 'etapa2'
                                      ? (bondedSum.totalCheio + warehouseSum.totalCheio + bufferSum.totalOccupied + additionalBacklog)
                                      : (bondedSum.totalCheio + warehouseSum.totalCheio + bufferSum.totalOccupied + vessels.reduce((sum, v) => sum + (v.cntrs || 0), 0) + additionalBacklog);
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
                          )}
                        </div>

                        {chartTab === 'drain' ? (
                          <>
                            {/* Metade Superior: Gr√°ficos Lado a Lado em Escala Maior */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
                          
                          {/* Gr√°fico 1 Expandido */}
                          <div className={`p-3.5 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 font-sans' : 'bg-white border-slate-100 shadow-sm font-sans'} flex flex-col justify-between h-[270px]`}>
                            <div className="flex justify-between items-center mb-1">
                              <h4 className="text-[11px] font-black text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                                <TrendingUp className="w-4 h-4 text-emerald-500" /> {getChartLeftTitle()}
                              </h4>
                              <div className="flex gap-2 text-[9px] font-bold">
                                <span className="flex items-center gap-1 text-slate-850 dark:text-slate-200"><span className="w-1.5 h-1.5 bg-slate-805 dark:bg-slate-400 inline-block rounded-sm"></span>{language === 'bilingual' ? 'Âà∞Ê∏Ø / ATA' : 'ATA'}</span>
                                <span className="flex items-center gap-1 text-emerald-500">
                                  <span className="w-1.5 h-0.5 border-t border-emerald-500 border-dashed inline-block"></span>
                                  {language === 'pt' ? `Capacidade (${dailyDeliveryRate}/dia)` : (language === 'zh' ? `‰∫§‰ªòËÉΩÂäõ (${dailyDeliveryRate}/Â§©)` : `‰∫§‰ªò / Capacidade (${dailyDeliveryRate}/d)`)}
                                </span>
                                <span className="flex items-center gap-1 text-red-500">
                                  <span className="w-1.5 h-1.5 bg-red-500 inline-block rounded-full"></span>
                                  {language === 'pt' ? 'Backlog' : (language === 'zh' ? 'È¢ÑÊµãÁßØÂéã' : 'ÁßØÂéã / Backlog')}
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
                                    <g key={`cl-bar-${i}`}>
                                      <rect 
                                        x={x - 2.5} 
                                        y={y} 
                                        width="5" 
                                        height={Math.max(0, barHeight)} 
                                        fill={theme === 'dark' ? '#64748b' : '#334155'} 
                                        rx="1"
                                      />
                                      {item.arrivals > 0 && (
                                        <text 
                                          x={x} 
                                          y={y - 3} 
                                          fill={theme === 'dark' ? '#cbd5e1' : '#334155'} 
                                          fontSize="5.5" 
                                          fontWeight="black" 
                                          textAnchor="middle" 
                                          className="font-mono"
                                        >
                                          {item.arrivals}
                                        </text>
                                      )}
                                    </g>
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
                                      <circle cx={x} cy={y} r="2.2" fill="#ef4444" stroke="#fff" strokeWidth="0.5" />
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

                    {/* Gr√°fico 2 Expandido */}
                    <div className={`p-3.5 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 font-sans' : 'bg-white border-slate-100 shadow-sm font-sans'} flex flex-col justify-between h-[270px]`}>
                      <div className="flex justify-between items-center mb-1">
                        <h4 className="text-[11px] font-black text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Database className="w-4 h-4 text-cyan-500" /> {getChartRightTitle()}
                        </h4>
                        <div className="flex gap-2 text-[9px] font-bold">
                          <span className="flex items-center gap-1 text-emerald-500"><span className="w-1.5 h-1.5 bg-[#059669] inline-block rounded-sm"></span>{language === 'bilingual' ? 'È´òÊïà / High' : t('opHigh')}</span>
                          <span className="flex items-center gap-1 text-indigo-500"><span className="w-1.5 h-1.5 bg-[#6366f1] inline-block rounded-sm"></span>{language === 'bilingual' ? 'Á®≥ÂÆö / Stable' : t('opStable')}</span>
                          <span className="flex items-center gap-1 text-[#f59e0b]"><span className="w-1.5 h-0.5 border-t border-[#f59e0b] border-dashed inline-block"></span>{language === 'bilingual' ? 'ÁõÆÊ†á / Gc (140)' : t('metaGc')}</span>
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

                  {/* Metade Inferior: Caixas em Branco de Coment√°rios */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-2">
                    
                    {/* Nota do Gr√°fico 1 */}
                    <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-100 shadow-sm'} flex flex-col justify-between min-h-[145px]`}>
                      <div className="flex items-center gap-2 border-b pb-1.5 mb-2 border-gray-100 dark:border-slate-800">
                        <FileText className="w-4 h-4 text-emerald-500" />
                        <h4 className="font-bold text-xs text-slate-800 dark:text-[#a7f3d0] uppercase tracking-wider block">
                          {language === 'bilingual' ? 'AN√ÅLISE DE BACKLOG & CAPACIDADE / È¢ÑÊµãÁßØÂéã‰∏é‰∫§‰ªòÂàÜÊûê' : language === 'zh' ? 'È¢ÑÊµãÁßØÂéã‰∏é‰∫§‰ªòÂàÜÊûê' : 'AN√ÅLISE DE BACKLOG & CAPACIDADE'}
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
                            placeholder="An√°lise do backlog projetado vs entrega... / ÂàÜÊûêÁßØÂéãË∂ãÂäø‰∏éÂë®ÂèëË¥ßËÆ°ÂàíÂØπÊØî..."
                            className="w-full flex-1 p-2 text-xs font-semibold border border-gray-200 dark:border-gray-700 dark:bg-slate-800 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none resize-none text-slate-800 dark:text-slate-100 placeholder:text-gray-400 font-sans"
                          />
                        ) : (
                          <div className="text-xs leading-relaxed font-bold text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans p-2 bg-slate-50/40 dark:bg-slate-900/40 rounded-lg border border-slate-50 dark:border-none">
                            {chartNote1 || "Sem an√°lises semanais para este per√≠odo. / Êú¨ÊúüÈó¥ÂÜÖÊó†ÈôÑÂä†ÁßØÂéã analysis„ÄÇ"}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Nota do Gr√°fico 2 */}
                    <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-100 shadow-sm'} flex flex-col justify-between min-h-[145px]`}>
                      <div className="flex items-center gap-2 border-b pb-1.5 mb-2 border-gray-100 dark:border-slate-800">
                        <FileText className="w-4 h-4 text-cyan-500" />
                        <h4 className="font-bold text-xs text-slate-800 dark:text-[#bae6fd] uppercase tracking-wider block">
                          {language === 'bilingual' ? 'RETROSPEC√á√ÉO DE ENTRADAS VS METAS (Gc 140) / ËøõÁÆ±ÂêûÂêê‰∏éÁõÆÊ†áÂØπÊØîÂèçÈ¶à' : language === 'zh' ? 'ËøõÁÆ±ÂêûÂêê‰∏éÁõÆÊ†áÂØπÊØîÂèçÈ¶à' : 'RETROSPEC√á√ÉO DE ENTRADAS VS METAS (Gc 140)'}
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
                            placeholder="Notas de desempenho e desvios de metas... / ËÆ∞ÂΩïËøõÁÆ±Ë°®Áé∞‰∏éÂêÑ‰æõÂ∫îÂïÜÁõÆÊ†áÂÅèÂ∑Æ..."
                            className="w-full flex-1 p-2 text-xs font-semibold border border-gray-200 dark:border-gray-700 dark:bg-slate-800 rounded-lg focus:ring-1 focus:ring-cyan-500 outline-none resize-none text-slate-800 dark:text-slate-100 placeholder:text-gray-400 font-sans"
                          />
                        ) : (
                          <div className="text-xs leading-relaxed font-bold text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans p-2 bg-slate-50/40 dark:bg-slate-900/40 rounded-lg border border-slate-50 dark:border-none">
                            {chartNote2 || "Sem diretrizes de desempenho para este per√≠odo. / Êú¨ÊúüÈó¥ÂÜÖÊó†ÈôÑÂä†ÂêûÂêêÂàÜÊûê„ÄÇ"}
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                          </>
                        ) : (
                          <div className="flex-1 flex flex-col mt-2">
                            <div className={`p-5 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-100 shadow-sm'} flex flex-col flex-1 min-h-[400px]`}>
                              <h4 className="text-[12px] font-black text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-700/50 pb-2">
                                <Package className="w-5 h-5 text-indigo-500" />
                                {language === 'bilingual' ? 'Distribui√ß√£o de Ocupa√ß√£o nos P√°tios e CDs / ÂêÑÂ†ÜÂú∫/‰ªìÂ∫ìÂÆπÈáèÂèäÂΩìÂâçÂç†Áî®Áéá' : 'Yard & Warehouse Occupancy Distribution'}
                              </h4>
                              <div className="flex-1 relative w-full h-full pt-4 pr-6 pb-6 pl-10 text-sans">
                                {(() => {
                                   const yardsData = Object.entries(yards).map(([key, y]) => {
                                     const occupancy = (y as any).cheio || 0;
                                     const capacity = (y as any).capacity || 1;
                                     const percentage = (occupancy / capacity) * 100;
                                     const isOverloaded = percentage > 90;
                                     const backlog = ((y as any).porto || 0) + ((y as any).prontoColeta || 0);
                                     return {
                                       key,
                                       name: (y as any).name,
                                       occupancy,
                                       capacity,
                                       percentage,
                                       isOverloaded,
                                       backlog
                                     };
                                   }).filter(d => d.capacity > 0);
                                   
                                   const maxCap = Math.max(...yardsData.map(d => d.capacity), 2500);
                                   const maxOcc = Math.max(...yardsData.map(d => d.occupancy), 2000);
                                   const xAxisMax = Math.ceil(maxCap / 500) * 500;
                                   const yAxisMax = Math.ceil(maxOcc / 500) * 500;
                                   
                                   return (
                                     <svg className="w-full h-full overflow-visible" viewBox="0 0 800 400" preserveAspectRatio="none">
                                       {/* Background Grid */}
                                       {[0, 1, 2, 3, 4].map(i => {
                                         const y = 400 - (i * 100);
                                         const labelVal = Math.round((i / 4) * yAxisMax);
                                         return (
                                           <g key={`grid-y-${i}`}>
                                             <line x1="0" y1={y} x2="800" y2={y} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} strokeWidth="1" strokeDasharray="4 4" />
                                             <text x="-10" y={y + 4} fill={theme === 'dark' ? '#94a3b8' : '#64748b'} fontSize="12" fontWeight="600" textAnchor="end">{labelVal}</text>
                                           </g>
                                         );
                                       })}
                                       {[0, 1, 2, 3, 4].map(i => {
                                         const x = i * 200;
                                         const labelVal = Math.round((i / 4) * xAxisMax);
                                         return (
                                           <g key={`grid-x-${i}`}>
                                             <line x1={x} y1="0" x2={x} y2="400" stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} strokeWidth="1" strokeDasharray="4 4" />
                                             <text x={x} y="420" fill={theme === 'dark' ? '#94a3b8' : '#64748b'} fontSize="12" fontWeight="600" textAnchor="middle">{labelVal}</text>
                                           </g>
                                         );
                                       })}
                                       
                                       {/* Diagonal 100% capacity line */}
                                       <line x1="0" y1="400" x2={(yAxisMax / xAxisMax) * 800} y2="0" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="6 6" />
                                       <text x={((yAxisMax / xAxisMax) * 800) - 10} y="15" fill="#ef4444" fontSize="11" fontWeight="bold" transform={`rotate(-${Math.atan((400)/( (yAxisMax/xAxisMax)*800 )) * (180/Math.PI)}, ${((yAxisMax / xAxisMax) * 800) - 10}, 15)`}>100% Capacity</text>
                                       
                                       {/* X and Y Axes labels */}
                                       <text x="400" y="445" fill={theme === 'dark' ? '#cbd5e1' : '#334155'} fontSize="14" fontWeight="800" textAnchor="middle">TOTAL YARD CAPACITY (CNTRs)</text>
                                       <text x="-30" y="200" fill={theme === 'dark' ? '#cbd5e1' : '#334155'} fontSize="14" fontWeight="800" textAnchor="middle" transform="rotate(-90, -30, 200)">CURRENT OCCUPANCY (CNTRs)</text>
                                       
                                       {/* Dots (Scatter) */}
                                       {yardsData.map((d, i) => {
                                         const cx = (d.capacity / xAxisMax) * 800;
                                         const cy = 400 - ((d.occupancy / yAxisMax) * 400);
                                         const radius = 10 + Math.min(d.backlog / 20, 30); 
                                         const color = d.isOverloaded ? '#ef4444' : (d.percentage > 70 ? '#f59e0b' : '#10b981');
                                         
                                         return (
                                           <g key={`scatter-${i}`}>
                                             <circle cx={cx} cy={cy} r={radius} fill={color} fillOpacity="0.4" stroke={color} strokeWidth="2" className="transition-all hover:fill-opacity-80 cursor-pointer" />
                                             <circle cx={cx} cy={cy} r="3" fill={color} />
                                             <text x={cx} y={cy - radius - 8} fill={theme === 'dark' ? '#f8fafc' : '#0f172a'} fontSize="12" fontWeight="bold" textAnchor="middle" className="pointer-events-none drop-shadow-md">
                                               {d.name}
                                             </text>
                                             <text x={cx} y={cy - radius + 5} fill={theme === 'dark' ? '#cbd5e1' : '#475569'} fontSize="10" fontWeight="600" textAnchor="middle" className="pointer-events-none drop-shadow-md">
                                               {Math.round(d.percentage)}%
                                             </text>
                                           </g>
                                         );
                                       })}
                                     </svg>
                                   );
                                })()}
                              </div>
                              <div className="flex justify-center gap-6 mt-12 mb-2">
                                 <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-emerald-500 opacity-60 border border-emerald-500"></div>
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Healthy (&lt; 70%)</span>
                                 </div>
                                 <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-amber-500 opacity-60 border border-amber-500"></div>
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Warning (70% - 90%)</span>
                                 </div>
                                 <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500 opacity-60 border border-red-500"></div>
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Overloaded (&gt; 90%)</span>
                                 </div>
                                 <div className="flex items-center gap-2 ml-4">
                                    <div className="w-4 h-4 rounded-full border-2 border-slate-400 border-dashed flex items-center justify-center">
                                      <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                                    </div>
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Bubble Size = Backlog Volume</span>
                                 </div>
                              </div>
                            </div>
                          </div>
                        )}
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
                          {language === 'bilingual' ? 'HUB DE BUFFER INTEGRADO BYD / ÊØî‰∫öËø™Êô∫ËÉΩÁºìÂÜ≤‰∏≠ËΩ¨Êû¢Á∫Ω' : language === 'zh' ? 'ÊØî‰∫öËø™Êô∫ËÉΩÁºìÂÜ≤‰∏≠ËΩ¨Êû¢Á∫Ω' : 'HUB DE BUFFER INTEGRADO BYD'}
                        </h3>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                          {language === 'zh' ? 'ÂÆûÊó∂ÁõëÊéß„ÄÅÁ©∫‰ΩôÂÆπÈáèÁÆ°ÁêÜ‰∏é 2D Â†Ü‰ΩçÂèØËßÜÂåñÂú∞Âõæ' : 'Mapeamento de slots, otimiza√ß√£o de retirada r√°pida e indicador de capacidade'}
                        </p>
                      </div>
                    </div>

                    {/* SELECT BUFFER AREA DROPDOWN & EXPORT ACTIONS */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* VIEW MODE TOGGLE */}
                      <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-800">
                        <button
                          onClick={() => setBufferViewMode('map')}
                          className={`px-3 py-1.5 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all ${bufferViewMode === 'map' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                        >
                          <LayoutGrid className="w-3.5 h-3.5" />
                          {language === 'zh' ? 'Âú∞ÂõæËßÜÂõæ' : 'Cards'}
                        </button>
                        <button
                          onClick={() => setBufferViewMode('list')}
                          className={`px-3 py-1.5 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all ${bufferViewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                        >
                          <List className="w-3.5 h-3.5" />
                          {language === 'zh' ? 'ÂàóË°®ËßÜÂõæ' : 'List'}
                        </button>
                      </div>

                      {bufferViewMode === 'list' && (
                        <>
                          <input
                            type="text"
                            placeholder="Buscar cont√™iner..."
                            value={bufferSearch}
                            onChange={(e) => setBufferSearch(e.target.value)}
                            className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 text-[11px] bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-red-500"
                          />
                          <select
                            value={bufferLoteFilter}
                            onChange={(e) => setBufferLoteFilter(e.target.value)}
                            className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 text-[11px] bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-red-500"
                          >
                            <option value="ALL">Todos Lotes</option>
                            {Array.from(new Set(bufferAreas.flatMap(a => a.slots.map(s => s.loteNo).filter(Boolean)))).sort().map(lote => (
                              <option key={lote} value={lote}>{lote}</option>
                            ))}
                          </select>
                        </>
                      )}

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
                        title="Exportar dados de ocupa√ß√£o para Excel"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        Exportar Excel
                      </button>

                      <label className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 hover:bg-amber-100 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{language === 'zh' ? 'ÂØºÂÖ• Excel' : 'Importar Excel'}</span>
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
                        title="Criar uma nova √°rea de buffer personalizada"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {language === 'zh' ? 'Êñ∞Âª∫Âå∫' : 'Nova √Årea'}
                      </button>

                      <button
                        onClick={handleDeleteBufferZone}
                        className="px-3 py-1.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/40 hover:bg-red-100 dark:hover:bg-red-950/60 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                        title={language === 'zh' ? 'Âà†Èô§ÂΩìÂâçÈÄâ‰∏≠ÁöÑÁºìÂÜ≤Âå∫Âå∫Âüü' : 'Excluir √°rea de buffer atual selecionada'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {language === 'zh' ? 'Âà†Èô§ÂΩìÂâçÂå∫' : 'Excluir √Årea'}
                      </button>
                    </div>
                  </div>

                  {/* STATS AND GRID MAP WRAPPER */}
                  {bufferViewMode === 'map' ? (
                  <div className="grid grid-cols-12 gap-4">
                    
                    {/* STATS PANEL (LEFT COLUMN / 3 SPAN) */}
                    <div className="col-span-12 xl:col-span-3 flex flex-col gap-3">
                      
                      {/* STAT 1: OCCUPANCY */}
                      <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-100 shadow-sm'} flex flex-col justify-between`}>
                        <div className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">
                          {language === 'zh' ? 'Â†Ü‰Ωç‰ΩøÁî®Áéá / Âç†Áî®ÊÉÖÂÜµ' : 'Ocupa√ß√£o do Buffer'}
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
                            <span className="text-[8.5px] text-gray-400 uppercase font-black tracking-tight">{language === 'zh' ? 'ÈáçÁÆ±' : 'Cheios'}</span>
                            <span className="text-sm font-black text-blue-600 dark:text-blue-400 font-mono">
                              {getCurrentBufferOccupancy().totalFull}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[8.5px] text-gray-400 uppercase font-black tracking-tight">{language === 'zh' ? 'Á©∫ÁÆ±' : 'Vazios (Swap)'}</span>
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
                          <span>{getCurrentBufferOccupancy().percentage}% {language === 'zh' ? 'Â∑≤Êª°' : 'Ocupado'}</span>
                          <span className="text-emerald-500">{getCurrentBufferOccupancy().empty} {language === 'zh' ? 'ÂèØÁî®' : 'livres'}</span>
                        </div>
                      </div>

                      {/* STAT 2: OPTIMIZED QUICK OUTS */}
                      <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-100 shadow-sm'} flex flex-col justify-between`}>
                        <div className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-yellow-500" />
                          {language === 'zh' ? 'ÊúÄ‰Ω≥ÂèëËøêÁÆ± / Quick-Out' : 'Melhor Posicionamento'}
                        </div>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                            {getCurrentBufferOccupancy().optimalCount}
                          </span>
                          <span className="text-xs text-gray-400 font-bold uppercase">{language === 'zh' ? 'Êó†Ê≠ªËßíÁõ¥Êé•Âá∫Ë¥ß' : 'Prontos p/ Retirada'}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2 leading-tight">
                          {language === 'zh' ? 'Â†ÜÊîæÂú®Â§ñ‰æßÊàñ‰∏äÂ±ÇÔºåÂèëËøêÊó∂Êó†ÈúÄÊå™Âä®ÂÖ∂‰ªñÁÆ±ÔºåÂèØÂÆûÁé∞Èõ∂ÊàêÊú¨Âø´ÈÄüÊèêÂá∫„ÄÇ' : 'Cont√™ineres situados nas bordas de f√°cil acesso, otimizados para retirada r√°pida sem necessidade de movimenta√ß√µes extras.'}
                        </p>
                      </div>

                      {/* STAT 3: DISPATCH RECO LIST */}
                      <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-100 shadow-sm'} flex-1 flex flex-col justify-between min-h-[220px]`}>
                        <div>
                          <div className="text-[10px] text-red-600 dark:text-red-400 font-extrabold uppercase tracking-widest border-b pb-1.5 mb-2 border-gray-105 dark:border-slate-800">
                            {language === 'zh' ? 'Èõ∂ÁßªÁÆ±ÂèëËøêÂª∫ËÆÆ‰ºòÂÖàÈ°∫Â∫è' : 'Sugest√µes de Retirada R√°pida'}
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
                                    {slot.cargoType} ‚Ä¢ <span className="font-mono text-red-600 dark:text-red-400">Pos {getSlotCoordsLabel(slot.row, slot.col)}</span>
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
                                {language === 'zh' ? 'ÂΩìÂâçÊ≤°ÊúâÊ†áËÆ∞‰∏∫ÊúÄ‰Ω≥ÂèëËøê‰ΩçÁΩÆÁöÑÁÆ±Â≠ê„ÄÇ' : 'Nenhum cont√™iner na rota r√°pida de retirada.'}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="mt-3 pt-2.5 border-t border-dashed border-gray-100 dark:border-slate-850 text-[9.5px] text-gray-400 text-center font-bold uppercase">
                          ‚ö° BYD Quick-Out Optimizer v1.1
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
                              {language === 'zh' ? 'Êô∫ËÉΩ 2D Âú∞ÂõæÔºö‰øØËßÜ‰∏éÈÄöÈÅìÂ∏ÉÂ±ÄÁõëÊéß' : 'Mapa 2D do Buffer: Vista A√©rea e Aloca√ß√£o Espacial'}
                            </h4>
                            <div className="flex gap-3 text-[9px] font-bold flex-wrap">
                              <span className="flex items-center gap-1 text-slate-500"><span className="w-2.5 h-2.5 border border-dashed border-slate-300 dark:border-slate-700 rounded-sm inline-block"></span>{language === 'zh' ? 'Á©∫‰Ωô' : 'Vazio'}</span>
                              <span className="flex items-center gap-1 text-red-500"><span className="w-2.5 h-2.5 bg-red-500/10 border border-red-500/30 rounded-sm inline-block"></span>{language === 'zh' ? '‰∏¥Áïå/È´ò‰ºòÂÖàÁ∫ß' : 'Alta Pri'}</span>
                              <span className="flex items-center gap-1 text-blue-500"><span className="w-2.5 h-2.5 bg-blue-500/10 border border-blue-500/30 rounded-sm inline-block"></span>{language === 'zh' ? 'ÊôÆÈÄö‰ºòÂÖàÁ∫ß' : 'Normal Pri'}</span>
                              <span className="flex items-center gap-1 text-emerald-500"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm inline-block animate-pulse"></span>{language === 'zh' ? 'ÊúÄ‰Ω≥ÂèëËøê (‚ö° Quick-Out)' : 'Melhor Posicionado (‚ö°)'}</span>
                            </div>
                          </div>

                          {/* CONTROL ROW: STATUS FILTERS & MAXIMIZE */}
                          <div className="flex flex-wrap justify-between items-center gap-2 mb-4 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-505 flex items-center gap-1">
                                <Filter className="w-3 h-3 text-red-500" />
                                {language === 'zh' ? 'ËøáÊª§Áä∂ÊÄÅ:' : 'Filtrar por Status:'}
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
                                  {language === 'zh' ? 'ÂÖ®ÈÉ®' : 'Todos'}
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
                                  {language === 'zh' ? '‰ªÖÈáçÁÆ±' : 'Cheios'}
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
                                  {language === 'zh' ? '‰ªÖÁ©∫ÁÆ±' : 'Vazios'}
                                </button>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setIsBufferMapMaximized(true)}
                              className="px-2.5 py-1 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-950/60 rounded text-[9.5px] font-black flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                            >
                              <Maximize2 className="w-3 h-3" />
                              {language === 'zh' ? 'ÂÖ®Â±èÊîæÂ§ß' : 'Maximizar Mapa'}
                            </button>
                          </div>

                          {/* THE ACTUAL GRID MAP */}
                          <div className="w-full overflow-x-auto bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-100 dark:border-slate-850/50 flex flex-col items-center">
                            
                            {/* Columns indexes header */}
                            <div className="flex mb-1.5 pl-6">
                              {Array.from({ length: getCurrentBufferArea().cols }).map((_, c) => (
                                <div key={c} className="w-28 text-center text-[10px] font-black text-gray-400 font-mono">
                                  {language === 'zh' ? `Á¨¨ ${c + 1} Âàó` : `COL ${c + 1}`}
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
                                                      {language === 'zh' ? 'Á©∫' : 'V'}
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
                                                  {language === 'zh' ? 'Ê∑ªÂä†' : 'Adicionar'}
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
                                                    ‚ö° Quick
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
                              {language === 'zh' ? 'üí° ÂèåÂáªÊàñÂçïÂáª‰ªª‰ΩïÊ†ºÂ≠êÂèØ‰ª•ÁºñËæë„ÄÅÊõ¥ÊîπÁä∂ÊÄÅ„ÄÅË∞ÉÊï¥Âá∫Ë¥ß‰ºòÂÖàÁ∫ßÊàñÂ∞ÜÂÖ∂Ê†áËÆ∞‰∏∫‚ÄúÈõ∂ÈòªÁ¢çÂø´ÈÄüÊèêËΩ¶‚Äù‰ΩçÁΩÆ„ÄÇ' : 'üí° Clique em qualquer slot para alocar um cont√™iner, desocupar a vaga ou marcar como "Melhor Posicionamento" para prioridade de entrega.'}
                            </span>
                          </div>
                          <span className="font-mono text-[10px] text-red-600 dark:text-red-400 uppercase font-black shrink-0">
                            COORD: {getCurrentBufferArea().rows}x{getCurrentBufferArea().cols} GRID MAP
                          </span>
                        </div>

                      </div>
                    </div>

                  </div>

                ) : (
                  <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg min-h-[400px]">
                    <table className="w-full text-xs text-left">
                      <thead className="text-gray-500 uppercase font-bold border-b dark:border-slate-700">
                        <tr>
                          <th className="p-2">Area</th>
                          <th className="p-2">Slot</th>
                          <th className="p-2">Cont√™iner</th>
                          <th className="p-2">Tipo</th>
                          <th className="p-2">Status</th>
                          <th className="p-2">Lote</th>
                          <th className="p-2">Data Entrada</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-slate-700">
                        {bufferAreas.flatMap(area =>
                          area.slots
                            .filter(s => {
                              if (!s.containerNo) return false;
                              if (bufferSearch && !s.containerNo.toLowerCase().includes(bufferSearch.toLowerCase())) return false;
                              if (bufferLoteFilter !== 'ALL' && String(s.loteNo || '') !== bufferLoteFilter) return false;
                              return true;
                            })
                            .map((slot, idx) => (
                            <tr key={`${area.id}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                              <td className="p-2">{area.name}</td>
                              <td className="p-2 font-mono">{getSlotCoordsLabel(slot.row, slot.col)}</td>
                              <td className="p-2 font-mono font-bold text-slate-800 dark:text-white">{slot.containerNo}</td>
                              <td className="p-2">{slot.cargoType}</td>
                              <td className="p-2">{slot.status}</td>
                              <td className="p-2">{slot.loteNo}</td>
                              <td className="p-2">{slot.entryTime}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
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
                      { label: 'Overdue', zh: 'Â∑≤Ë∂ÖÊúü', color: 'bg-[#EF4444]', filter: (d: number) => d < 0 },
                      { label: '1-5 days', zh: '1-5 Â§©', color: 'bg-[#F43F5E]', filter: (d: number) => d >= 0 && d <= 5 },
                      { label: '6-10 days', zh: '6-10 Â§©', color: 'bg-[#F97316]', filter: (d: number) => d >= 6 && d <= 10 },
                      { label: '11-15 days', zh: '11-15 Â§©', color: 'bg-[#F59E0B]', filter: (d: number) => d >= 11 && d <= 15 },
                      { label: '16-20 days', zh: '16-20 Â§©', color: 'bg-[#EAB308]', filter: (d: number) => d >= 16 && d <= 20 },
                      { label: '21-25 days', zh: '21-25 Â§©', color: 'bg-[#Y9D308] bg-yellow-400', filter: (d: number) => d >= 21 && d <= 25 },
                      { label: '26-30 days', zh: '26-30 Â§©', color: 'bg-[#34D399]', filter: (d: number) => d >= 26 && d <= 30 },
                      { label: '31-35 days', zh: '31-35 Â§©', color: 'bg-[#10B981]', filter: (d: number) => d >= 31 && d <= 35 },
                      { label: '>35 days', zh: '>35 Â§©', color: 'bg-[#14B8A6]', filter: (d: number) => d > 35 }
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

                    // Buffer metrics - dynamically matching "Vis√£o Geral" and "BYD Buffer"
                    const bufFull = yards.buffer && (yards.buffer.cheio > 0)
                      ? yards.buffer.cheio 
                      : filteredContainersForDemurrage.filter(c => (c.yardId === 'buffer' || c.yardId === 'intermaritima') && c.status === 'CHEIO').length;
                    
                    const bufEmpty = yards.buffer && (yards.buffer.vazio > 0)
                      ? yards.buffer.vazio 
                      : filteredContainersForDemurrage.filter(c => (c.yardId === 'buffer' || c.yardId === 'intermaritima') && c.status === 'VAZIO').length;
                    
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
                                  {language === 'bilingual' ? '1. General Overview - Demurrage Control / ÈõÜË£ÖÁÆ±ÊªûÊúüË¥πË∂ÖÊúüÁõëÊéßÂ§ßÁõò' : language === 'zh' ? '1. ÈõÜË£ÖÁÆ±ÊªûÊúüË¥πË∂ÖÊúüÁõëÊéßÂ§ßÁõò' : '1. General Overview - Demurrage Control'}
                                </h3>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                                  {language === 'zh' ? 'ÁÆ°ÁêÜ‰øùÁ®éÂ†ÜÂú∫„ÄÅ‰ªìÂ∫ì„ÄÅÊØî‰∫öËø™Êô∫ËÉΩÁºìÂÜ≤Âå∫‰∏≠ÊâÄÊúâÈõÜË£ÖÁÆ±ÁöÑÂÖçË¥πÊúü„ÄÅË∂ÖÊúüÊªûÁïôÁä∂ÊÄÅ' : 'Gest√£o integrada de free time, tempo de estadia de cont√™ineres e devolu√ß√£o r√°pida.'}
                                </p>
                              </div>
                            </div>

                            {/* Reference date picker */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs">
                              <span className="font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-[10px]">
                                {language === 'zh' ? 'ËÆ°ÁÆóÂü∫ÂáÜÊó• / Data de Refer√™ncia:' : 'Data de Refer√™ncia:'}
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
                                title="Restaurar data original (19/07/2026) / ÊÅ¢Â§çÂéüÂßãÊó•Êúü"
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
                                {language === 'zh' ? '‰∫§‰ªòÁä∂ÊÄÅ / Delivered Status' : 'Status de Entrega'}
                              </label>
                              <select
                                value={demurrageFilterDelivered}
                                onChange={(e) => setDemurrageFilterDelivered(e.target.value)}
                                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 text-xs font-bold rounded-lg outline-none cursor-pointer focus:ring-1 focus:ring-red-500 text-slate-800 dark:text-slate-100"
                              >
                                <option value="ALL">{language === 'zh' ? 'ÂÖ®ÈÉ® / Todos' : 'Todos os Status'}</option>
                                <option value="DELIVERED">{language === 'zh' ? 'Â∑≤Êî∂Ë¥ßÂæÖËøòÁÆ± / Delivered' : 'Entregue (Pendente Devolu√ß√£o)'}</option>
                                <option value="NOT_DELIVERED">{language === 'zh' ? 'Êú™Âá∫Ë¥ßÂú®Ê∏ØÂè£/Â†ÜÂú∫ / Not Delivered' : 'N√£o Entregue (No Porto/P√°tio)'}</option>
                              </select>
                            </div>

                            {/* Filter 2: Component */}
                            <div className="flex flex-col gap-1">
                              <label className="text-[9.5px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest">
                                {language === 'zh' ? 'Èõ∂ÈÉ®‰ª∂Á±ªÂà´ / Component' : 'Componente'}
                              </label>
                              <select
                                value={demurrageFilterComponent}
                                onChange={(e) => setDemurrageFilterComponent(e.target.value)}
                                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 text-xs font-bold rounded-lg outline-none cursor-pointer focus:ring-1 focus:ring-red-500 text-slate-800 dark:text-slate-100"
                              >
                                <option value="ALL">{language === 'zh' ? 'ÂÖ®ÈÉ®Èõ∂‰ª∂ / Todos' : 'Todos'}</option>
                                {componentsListOptions.map(comp => (
                                  <option key={comp} value={comp}>{comp}</option>
                                ))}
                              </select>
                            </div>

                            {/* Filter 3: Carrier */}
                            <div className="flex flex-col gap-1">
                              <label className="text-[9.5px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest">
                                {language === 'zh' ? 'ËøêËæìÂÖ¨Âè∏ / Carrier' : 'Transportadora'}
                              </label>
                              <select
                                value={demurrageFilterCarrier}
                                onChange={(e) => setDemurrageFilterCarrier(e.target.value)}
                                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 text-xs font-bold rounded-lg outline-none cursor-pointer focus:ring-1 focus:ring-red-500 text-slate-800 dark:text-slate-100"
                              >
                                <option value="ALL">{language === 'zh' ? 'ÂÖ®ÈÉ®ËøêËæìÂÖ¨Âè∏ / Todos' : 'Todas'}</option>
                                {carrierListOptions.map(carrier => (
                                  <option key={carrier} value={carrier}>{carrier}</option>
                                ))}
                              </select>
                            </div>

                            {/* Filter 4: Vessel Name */}
                            <div className="flex flex-col gap-1">
                              <label className="text-[9.5px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest">
                                {language === 'zh' ? 'Ëàπ‰∏úÊàñËàπËà∂ / Shipowner / Vessel' : 'Navio / Armador'}
                              </label>
                              <select
                                value={demurrageFilterVessel}
                                onChange={(e) => setDemurrageFilterVessel(e.target.value)}
                                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 text-xs font-bold rounded-lg outline-none cursor-pointer focus:ring-1 focus:ring-red-500 text-slate-800 dark:text-slate-100"
                              >
                                <option value="ALL">{language === 'zh' ? 'ÂÖ®ÈÉ®ËàπËà∂ / Todos' : 'Todos'}</option>
                                {vesselListOptions.map(vessel => (
                                  <option key={vessel} value={vessel}>{vessel}</option>
                                ))}
                              </select>
                            </div>

                            {/* Info panel */}
                            <div className="flex items-center justify-end h-full pt-4 pr-1">
                              <div className="text-right text-[10px] font-bold text-gray-400 dark:text-slate-500">
                                {language === 'zh' ? 'ÂΩìÂâçËøáÊª§Êï∞:' : 'Filtrados:'}{' '}
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
                                {language === 'zh' ? 'Êú™ËøòÁ©∫ÂæÖÈÄÄ / Pending' : 'Return Pending'}
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
                              {language === 'zh' ? 'Ë∂ÖÊúüÁÆ±Èáè / Overdue' : 'Overdue'}
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
                              {language === 'zh' ? 'Êú™Êù•15Â§©Âà∞Êúü' : 'Next 15 Days'}
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
                              {language === 'zh' ? 'Â∑≤ÊéíÁ®ã‰∫§‰ªò / Scheduled' : 'Scheduled Delivery'}
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
                                {language === 'zh' ? 'ÁºìÂÜ≤Âå∫Â≠òÁÆ± / Buffer' : 'BYD Buffer'}
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
                                {language === 'bilingual' ? 'Matriz Expiration Light / ÂÖçË¥πÊúüÂâ©‰ΩôÂ§©Êï∞Á≤æÁªÜÁÆ°ÊéßÁÅØ' : 'Expiration Light'}
                              </h4>
                              <span className="text-[9px] text-red-600 font-black tracking-wider uppercase bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded">
                                aging control
                              </span>
                            </div>

                            <div className="overflow-x-auto mt-3">
                              <table className="w-full text-center border-collapse text-xs">
                                <thead>
                                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-black border-b border-gray-200 dark:border-slate-800">
                                    <th className="p-2 text-left pl-2 font-black">{language === 'zh' ? 'ËåÉÂõ¥ / Range' : 'Range'}</th>
                                    <th className="p-2 font-black text-center">{language === 'zh' ? 'ÁºìÂÜ≤Âå∫ / At BYD Buffer' : 'At BYD Buffer'}</th>
                                    <th className="p-2 font-black text-center">{language === 'zh' ? 'ÁºìÂÜ≤Âå∫Â∑≤ÊéíÁ®ã / At BYD Buffer - Scheduled' : 'At BYD Buffer - Scheduled'}</th>
                                    <th className="p-2 font-black text-center">{language === 'zh' ? 'Â∑≤‰∫§‰ªòÊú™ËøòÁÆ± / Delivered/No EIR' : 'Delivered (Pending Return)'}</th>
                                    <th className="p-2 font-black text-center">{language === 'zh' ? 'Âú®‰øùÁ®éÂå∫/Â§ñÈÉ® / Outside BYD' : 'Outside BYD'}</th>
                                    <th className="p-2 font-black text-center text-slate-800 dark:text-slate-100">{language === 'zh' ? 'ÂÖ±ËÆ°' : 'Total'}</th>
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
                                    <td className="p-2 text-left pl-2 font-sans font-extrabold uppercase">{language === 'zh' ? 'ÊÄªËÆ°' : 'Total'}</td>
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
                                  {language === 'bilingual' ? 'BLs Cr√≠ticos (Free Time Expiring ‚â§ 5 dias) / 5Â§©ÂÜÖÂà∞ÊúüÁ¥ßÊÄ•ÊèêÂçï' : 'BLs Cr√≠ticos'}
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
                                          {language === 'zh' ? 'ÊöÇÊó†‰∏¥ËøëÂà∞ÊúüÊàñË∂ÖÊúüÊèêÂçï' : 'Nenhum BL cr√≠tico encontrado para os filtros ativos.'}
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
                                {language === 'bilingual' ? 'Distribui√ß√£o de Pendentes por Componente / ÂæÖ‰∫§‰ªòÈõÜË£ÖÁÆ±ÂàÜÁ±ªÂç†ÊØî' : 'Pendentes por Componente'}
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
                                    {language === 'zh' ? 'ÊöÇÊó†Èõ∂‰ª∂ÂàÜÂ∏ÉÊï∞ÊçÆ' : 'Sem dados para o gr√°fico de componentes.'}
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
                          const colLabel = selectedDemurrageRange.col === 'buffer' ? (language === 'zh' ? 'Âú®ÁºìÂÜ≤Âå∫ / At BYD Buffer' : 'At BYD Buffer')
                            : selectedDemurrageRange.col === 'buffer-scheduled' ? (language === 'zh' ? 'ÁºìÂÜ≤Âå∫Â∑≤ÊéíÁ®ã / At BYD Buffer - Scheduled' : 'At BYD Buffer - Scheduled')
                            : selectedDemurrageRange.col === 'delivered' ? (language === 'zh' ? 'Â∑≤‰∫§‰ªòÊú™ËøòÁÆ± / Delivered (Pending Return)' : 'Delivered (Pending Return)')
                            : selectedDemurrageRange.col === 'outside' ? (language === 'zh' ? 'Âú®‰øùÁ®éÂå∫/Â§ñÈÉ® / Outside BYD' : 'Outside BYD')
                            : (language === 'zh' ? 'ÂÖ®ÈÉ® / Total' : 'Total');

                          const rangeLabel = r ? (language === 'zh' ? r.zh : r.label) : selectedDemurrageRange.label;

                          return (
                            <div className={`p-4 rounded-xl border mt-4 transition-all ${theme === 'dark' ? 'bg-[#1e293b]/95 border-red-900/40 text-white' : 'bg-red-50/20 border-red-250/60 shadow-xs'}`}>
                              <div className="flex justify-between items-center border-b pb-2.5 border-red-150/40 dark:border-slate-800 mb-3">
                                <div>
                                  <h4 className="font-extrabold text-xs text-red-700 dark:text-red-400 uppercase tracking-widest flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-red-600 animate-ping shrink-0"></span>
                                    {language === 'bilingual' 
                                      ? `Cont√™ineres Filtrados: ${rangeLabel} (${colLabel}) / Á≠õÈÄâÂá∫ÁöÑÈõÜË£ÖÁÆ±` 
                                      : `Cont√™ineres Filtrados: ${rangeLabel} (${colLabel})`}
                                  </h4>
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold mt-0.5">
                                    {language === 'zh' 
                                      ? `ÂÖ± ${matchingContainers.length} ‰∏™ÂåπÈÖçÁöÑÈõÜË£ÖÁÆ±„ÄÇÂú®ËøôÈáåÔºåÊÇ®ÂèØ‰ª•Áõ¥Êé•Êõ¥Êñ∞‚ÄúËÆ°ÂàíÊèêË¥ßÊó∂Èó¥ (Programa√ß√£o)‚ÄùÂíå‚ÄúËøêËæìÂÖ¨Âè∏ (Carrier)‚ÄùÔºåÊï∞ÊçÆÂ∞ÜËá™Âä®ÂêåÊ≠•Êõ¥Êñ∞Ôºå‰ª•ÂçèÂä©ÂèäÊó∂ÂΩíËøòÁ©∫ÁÆ±ÔºåÈÅøÂÖç‰∫ßÁîüË∂ÖÊúüÊªûÊúüË¥π„ÄÇ`
                                      : `Mostrando ${matchingContainers.length} cont√™iner(es). Agende a retirada e devolu√ß√£o preenchendo as colunas abaixo para mitigar custos de demurrage.`}
                                  </p>
                                </div>
                                <button
                                  onClick={() => setSelectedDemurrageRange(null)}
                                  className="px-2.5 py-1 bg-red-100 hover:bg-red-200 dark:bg-red-950/40 dark:hover:bg-red-900/40 text-red-700 dark:text-red-400 font-extrabold text-[10px] rounded-md transition-all active:scale-95 border border-red-200 dark:border-red-900/30 cursor-pointer"
                                >
                                  {language === 'zh' ? 'Ê∏ÖÈô§Á≠õÈÄâ ‚úï' : 'Fechar Detalhes ‚úï'}
                                </button>
                              </div>

                              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                                <table className="w-full text-[11px] text-left border-collapse">
                                  <thead>
                                    <tr className="bg-slate-100 dark:bg-slate-800 text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-black border-b border-gray-200 dark:border-slate-700">
                                      <th className="p-2 pl-3">ID Container</th>
                                      <th className="p-2">Batch / Lote</th>
                                      <th className="p-2">Yard / P√°tio</th>
                                      <th className="p-2">Vessel / Navio</th>
                                      <th className="p-2 text-center">ETA</th>
                                      <th className="p-2 text-center">Free Time</th>
                                      <th className="p-2 text-center">Dias Restantes</th>
                                      <th className="p-2 text-center">Status / Devolu√ß√£o</th>
                                      <th className="p-2 min-w-[130px] font-black text-red-700 dark:text-red-400 bg-red-100/40 dark:bg-red-950/20">üìÖ Programa√ß√£o (Agendamento)</th>
                                      <th className="p-2 min-w-[130px] font-black text-slate-700 dark:text-slate-300">üöõ Transportadora (Carrier)</th>
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
                                          {language === 'zh' ? 'Ê≤°ÊúâÂú®Ê≠§ÂàÜÁ±ª‰∏ãÊâæÂà∞ÂåπÈÖçÁöÑÈõÜË£ÖÁÆ±' : 'Nenhum cont√™iner correspondente encontrado para este filtro.'}
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
                          {language === 'bilingual' ? 'DEPOT CONTROL & ALLOCATION / ÂçèËÆÆÂ†ÜÂ≠ò‰∏éÊ∏ØÂè£ÊµÅÂêëÂä®ÊÄÅË∞ÉÈÖç' : language === 'zh' ? 'ÂçèËÆÆÂ†ÜÂ≠ò‰∏éÊ∏ØÂè£ÊµÅÂêëÂä®ÊÄÅË∞ÉÈÖç' : 'DEPOT CONTROL & ALLOCATION'}
                        </h3>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                          {language === 'zh' ? 'ÊØèÊó•ÊµÅÈáèÂπ≥ÂùáÁõëÊéß„ÄÅÊúÄÂ§ßÂä®ÊÄÅÂÆπÈáèÈÖçÈ¢ù„ÄÅ‰∏éËàπ‰∏úÂêà‰ΩúÁä∂ÊÄÅ‰∫§ÂèâÁÆ°ÁêÜÁü©Èòµ' : 'Controle din√¢mico de limites di√°rios, capacidade sob contrato e compatibilidade de armadores.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-red-600 text-white font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">
                        {language === 'zh' ? 'È´òÁ∫ßÁâ©ÊµÅÊû∂ÊûÑÊùø' : 'Senior Logistics Panel'}
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
                            <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">{language === 'zh' ? 'Êó•Â∏∏Âπ≥ÂùáÊÄªÂêûÂêêÈáè' : 'VOLUME DI√ÅRIO TOTAL (AVG)'}</span>
                            <span className="text-gray-400 font-mono text-xs font-bold">AVG baseline</span>
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-black font-mono tracking-tight text-slate-800 dark:text-slate-100">{totalAvg}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">CNTRs/Dia</span>
                          </div>
                        </div>

                        <div className={`p-3.5 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-150 shadow-xs'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">{language === 'zh' ? 'Á©∫‰ΩôÂèØÁî®‰ªì‰ΩçÊï∞' : 'VAGAS DI√ÅRIAS DISPON√çVEIS'}</span>
                            <span className="text-emerald-500 font-bold text-[10px] px-1 py-0.1 bg-emerald-50 dark:bg-emerald-950/20 rounded">Slots Livres</span>
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">{totalRemainingSlots}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">CNTRs Slots</span>
                          </div>
                        </div>

                        <div className={`p-3.5 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-150 shadow-xs'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">{language === 'zh' ? 'ÈÄöÈÅìÂºÄÂêØÊØî‰æã' : 'SITUA√á√ÉO DE PORT√ïES'}</span>
                            <span className="text-blue-500 font-bold text-[10px] px-1 py-0.1 bg-blue-50 dark:bg-blue-950/20 rounded">Gates Status</span>
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-black font-mono tracking-tight text-slate-800 dark:text-slate-100">{openGates} <span className="text-xs text-gray-400 font-bold">/ {depots.length}</span></span>
                            <span className="text-xs text-emerald-600 dark:text-emerald-450 font-extrabold">{language === 'zh' ? 'Ê≠£Â∏∏ËøêËê•‰∏≠' : 'Ativos'}</span>
                          </div>
                        </div>

                        <div className={`p-3.5 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-150 shadow-xs'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">{language === 'zh' ? 'È´òÂç±ÂèóÈôê/Êª°ËΩΩÁ´ôÁÇπ' : 'PONTOS CR√çTICOS / ALERTA'}</span>
                            <span className="text-red-500 font-bold text-[10px] px-1 py-0.1 bg-red-50 dark:bg-red-950/20 rounded">Alert Count</span>
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-black font-mono tracking-tight text-red-600 dark:text-red-400">{criticalCount}</span>
                            <span className="text-xs text-red-500 dark:text-red-400 font-bold uppercase">{language === 'zh' ? '‰∏•ÈáçÁ∫¢Ëâ≤ÈôêÂà∂' : 'Gargalos'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* BOTTOM WORKSPACE WORKGRID */}
                  <div className="grid grid-cols-12 gap-4 flex-1">
                    
                    <div className={`col-span-7 p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-150 shadow-sm'} flex flex-col justify-between`}>
                      <div className="space-y-3 flex-1">
                        {/* EXECUTIVE SUMMARY WIDGETS */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
                          <div className={`p-3 rounded-lg border ${theme === 'dark' ? 'bg-[#1e293b]/50 border-slate-700/50' : 'bg-white border-slate-100'} shadow-sm flex flex-col justify-between`}>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold mb-1 block">
                              {language === 'zh' ? 'Êó•Â∏∏Âπ≥ÂùáÊÄªÂêûÂêêÈáè' : language === 'pt' ? 'M√©dia Di√°ria Total' : 'Total Daily Return Average'}
                            </span>
                            <span className="text-xl font-black text-slate-800 dark:text-white">{depots.reduce((sum, d) => sum + d.avgVolume, 0).toLocaleString()} <span className="text-xs font-bold text-slate-400">{language === 'zh' ? 'CNTRs/Â§©' : language === 'pt' ? 'CNTRs/Dia' : 'CNTRs/Day'}</span></span>
                          </div>
                          <div className={`p-3 rounded-lg border ${theme === 'dark' ? 'bg-[#1e293b]/50 border-slate-700/50' : 'bg-white border-slate-100'} shadow-sm flex flex-col justify-between`}>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold mb-1 block">
                              {language === 'zh' ? '25Â§©È¢Ñ‰º∞ÊÄªÂêûÂêêÈáè' : language === 'pt' ? 'Estimativa Total (25 Dias)' : 'Total 25-Day Estimated Return'}
                            </span>
                            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{(depots.reduce((sum, d) => sum + d.avgVolume, 0) * 25).toLocaleString()} <span className="text-xs font-bold text-emerald-600/50 dark:text-emerald-400/50">CNTRs</span></span>
                          </div>
                          <div className={`p-3 rounded-lg border ${theme === 'dark' ? 'bg-[#1e293b]/50 border-slate-700/50' : 'bg-white border-slate-100'} shadow-sm flex flex-col justify-between`}>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold mb-1 block">
                              {language === 'zh' ? '25Â§©ÂçèËÆÆÊÄªÈ¢ùÂ∫¶‰∏äÈôê' : language === 'pt' ? 'Limite Total Acordado (25 Dias)' : 'Total 25-Day Max Agreed Limit'}
                            </span>
                            <span className="text-xl font-black text-blue-600 dark:text-blue-400">{(depots.reduce((sum, d) => sum + d.maxCapacity, 0) * 25).toLocaleString()} <span className="text-xs font-bold text-blue-600/50 dark:text-blue-400/50">CNTRs</span></span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center border-b pb-2 border-gray-100 dark:border-slate-800">
                          <div className="flex items-center gap-1.5">
                            <Sliders className="w-4 h-4 text-slate-500" />
                            <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                              {language === 'zh' ? 'Á©∫ÁÆ±Â†ÜÂú∫ÂêûÂêêËÉΩÂäõ‰∏é25Â§©È¢ÑÊµã‰ª™Ë°®Áõò' : language === 'pt' ? 'Capacidade de Retorno de Vazios e Previs√£o (25 Dias)' : 'EMPTY DEPOT RETURN CAPACITY & 25-DAY FORECASTING DASHBOARD'}
                            </h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-gray-400 font-mono font-bold mr-2">{language === 'zh' ? '100% Ëá™Âä®ËÆ°ÁÆóÂºïÊìé' : language === 'pt' ? '100% C√ÅLCULO AUTOM√ÅTICO' : '100% FORMULA ENGINE'}</span>
                            <button
                              onClick={() => {
                                const newId = `depot_${Date.now()}`;
                                const newName = `NEW DEPOT ${depots.length + 1}`;
                                setDepots([...depots, { id: newId, name: newName, avgVolume: 0, maxCapacity: 0, operatingDays: 'Mon - Fri', operatingHours: '08:00 - 17:00' }]);
                                setDepotMatrix(prev => ({...prev, [newName]: { 'MSC': 'Authorized', 'Maersk': 'Authorized', 'CMA CGM': 'Authorized', 'Hapag-Lloyd': 'Authorized', 'ONE': 'Authorized', 'COSCO': 'Authorized', 'Evergreen': 'Authorized' }}));
                              }}
                              className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded transition-colors flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" /> {language === 'zh' ? 'Êñ∞Â¢ûÂ†ÜÂú∫' : language === 'pt' ? 'Novo Dep√≥sito' : 'Add New Depot'}
                            </button>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-800/60 text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-black border-b border-gray-200 dark:border-slate-800">
                                <th className="p-2 pl-2.5">{language === 'zh' ? 'Â†ÜÂ≠òÁÇπÂêçÁß∞' : language === 'pt' ? 'Nome do Dep√≥sito' : 'Depot Name'}</th>
                                <th className="p-2 text-center">{language === 'zh' ? 'Êó•Â∏∏Âπ≥ÂùáÂêûÂêêÈáè (CNTRs)' : language === 'pt' ? 'M√©dia Di√°ria (CNTRs)' : 'Daily Avg Returns (CNTRs)'}</th>
                                <th className="p-2 text-center">{language === 'zh' ? 'ÂçèËÆÆÊúÄÂ§ßÊó•ÈôêÈ¢ù (CNTRs)' : language === 'pt' ? 'Limite Di√°rio Acordado (CNTRs)' : 'Max Daily Agreed Limit (CNTRs)'}</th>
                                <th className="p-2 text-center">{language === 'zh' ? '25Â§©È¢Ñ‰º∞ÂêûÂêêÈáè' : language === 'pt' ? 'Estimativa Retorno (25d)' : '25-Day Return Estimate'}</th>
                                <th className="p-2 text-center">{language === 'zh' ? '25Â§©ÊΩúÂú®ÊúÄÂ§ßÈáè' : language === 'pt' ? 'M√°ximo Potencial (25d)' : '25-Day Max Potential Return'}</th>
                                <th className="p-2 text-center">{language === 'zh' ? 'ËøêËê•Êó•' : language === 'pt' ? 'Dias de Opera√ß√£o' : 'Operating Days'}</th>
                                <th className="p-2 text-center">{language === 'zh' ? 'Èó∏Âè£Ëê•‰∏öÊó∂Èó¥' : language === 'pt' ? 'Hor√°rio do Gate' : 'Gate Operating Hours'}</th>
                                <th className="p-2 text-center">{language === 'zh' ? 'ËøêËê•È¢ÑË≠¶Áä∂ÊÄÅ' : language === 'pt' ? 'Alerta Operacional' : 'Operational Alert Status'}</th>
                                <th className="p-2 text-center w-8"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-bold text-slate-850 dark:text-slate-200">
                              {depots.map((depot, idx) => {
                                const utilPercent = depot.maxCapacity > 0 ? Math.round((depot.avgVolume / depot.maxCapacity) * 100) : 0;
                                const remaining = depot.maxCapacity - depot.avgVolume;
                                const estimate25 = depot.avgVolume * 25;
                                const max25 = depot.maxCapacity * 25;
                                
                                let alertConfig = { bg: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-450 border-emerald-200 dark:border-emerald-900/30', label: language === 'zh' ? 'Ê≠£Â∏∏ - È¢ùÂ∫¶ÂÖÖË∂≥' : language === 'pt' ? 'NORMAL - Cota Dispon√≠vel' : 'NORMAL - Quota Available' };
                                if (depot.avgVolume > depot.maxCapacity) {
                                  alertConfig = { bg: 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-450 border-rose-300 dark:border-rose-900/50', label: language === 'zh' ? 'Ë∂ÖÈ¢ù - ÈúÄÈáçÊñ∞ÂçèÂïÜÈôêÂà∂' : language === 'pt' ? 'COTA EXCEDIDA - Renegociar' : 'OVER QUOTA - Renegotiate Limit' };
                                } else if (utilPercent > 95) {
                                  alertConfig = { bg: 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-450 border-red-200 dark:border-red-900/30', label: language === 'zh' ? 'Áì∂È¢à - Êó•Â∏∏È¢ùÂ∫¶Â∑≤Êª°/Ë∂ÖÂá∫' : language === 'pt' ? 'GARGALO - Cota M√°xima Atingida' : 'BOTTLENECK - Daily Quota Maxed/Exceeded' };
                                } else if (utilPercent >= 75) {
                                  alertConfig = { bg: 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-450 border-amber-200 dark:border-amber-900/30', label: language === 'zh' ? 'Ê≥®ÊÑè - Êé•ËøëÈôêÂà∂' : language === 'pt' ? 'ATEN√á√ÉO - Limite Pr√≥ximo' : 'ATTENTION - Approaching Limit' };
                                }

                                const handleUpdate = (field: keyof Depot, value: string | number) => {
                                  const oldName = depots[idx].name;
                                  const newDepots = [...depots];
                                  newDepots[idx] = { ...newDepots[idx], [field]: value };
                                  setDepots(newDepots);
                                  if (field === 'name' && typeof value === 'string') {
                                    setDepotMatrix(prev => {
                                      const newMatrix = { ...prev };
                                      if (newMatrix[oldName]) {
                                        newMatrix[value] = newMatrix[oldName];
                                        delete newMatrix[oldName];
                                      }
                                      return newMatrix;
                                    });
                                  }
                                };

                                return (
                                  <tr
                                    key={depot.id}
                                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all"
                                  >
                                    <td className="p-1 pl-2.5 font-sans">
                                      <input 
                                        type="text" 
                                        value={depot.name || ''} 
                                        onChange={(e) => handleUpdate('name', e.target.value)}
                                        className="w-full bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-blue-500 rounded px-1.5 py-1 text-[11px] font-extrabold outline-none"
                                      />
                                    </td>
                                    <td className="p-1 text-center font-mono">
                                      <input 
                                        type="number" 
                                        value={depot.avgVolume || 0} 
                                        onChange={(e) => handleUpdate('avgVolume', parseInt(e.target.value) || 0)}
                                        className="w-16 bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-blue-500 rounded px-1 py-1 text-center font-bold text-gray-500 dark:text-slate-400 outline-none"
                                      />
                                    </td>
                                    <td className="p-1 text-center font-mono">
                                      <input 
                                        type="number" 
                                        value={depot.maxCapacity || 0} 
                                        onChange={(e) => handleUpdate('maxCapacity', parseInt(e.target.value) || 0)}
                                        className="w-16 bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-blue-500 rounded px-1 py-1 text-center font-bold text-slate-800 dark:text-slate-100 outline-none"
                                      />
                                    </td>
                                    <td className="p-2 text-center font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                      {estimate25}
                                    </td>
                                    <td className="p-2 text-center font-mono text-blue-600 dark:text-blue-400 font-bold">
                                      {max25}
                                    </td>
                                    <td className="p-1 text-center">
                                      <input 
                                        type="text" 
                                        value={depot.operatingDays || ''} 
                                        onChange={(e) => handleUpdate('operatingDays', e.target.value)}
                                        className="w-20 bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-blue-500 rounded px-1 py-1 text-[10px] text-center outline-none"
                                      />
                                    </td>
                                    <td className="p-1 text-center">
                                      <input 
                                        type="text" 
                                        value={depot.operatingHours || ''} 
                                        onChange={(e) => handleUpdate('operatingHours', e.target.value)}
                                        className="w-24 bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-blue-500 rounded px-1 py-1 text-[10px] text-center font-mono outline-none"
                                      />
                                    </td>
                                    <td className="p-2 text-center">
                                      <span className={`text-[8.5px] px-1.5 py-0.5 rounded font-black border uppercase tracking-wider ${alertConfig.bg}`}>
                                        {alertConfig.label}
                                      </span>
                                    </td>
                                    <td className="p-1 text-center">
                                      <button 
                                        onClick={() => {
                                          setDepots(depots.filter(d => d.id !== depot.id));
                                          setDepotMatrix(prev => {
                                            const newMatrix = { ...prev };
                                            delete newMatrix[depot.name];
                                            return newMatrix;
                                          });
                                        }}
                                        className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
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
                        <span>{language === 'zh' ? 'üí° Á≥ªÁªüÈÄªËæëÔºöÁªø‰ªìË°®Á§∫Á©∫Èó≤Â∫¶È´òÔºåÈªÑ‰ªì‰∏∫Ë≠¶ÊàíË£ÖËΩΩÔºåÁ∫¢‰ªìÔºàÂà©Áî®ÁéáË∂ÖËøá95%ÔºâÈôêÂà∂ÊµÅÂÖ•ÔºåVBR / AREA 23 Âú®‰ªª‰ΩïÁä∂ÊÄÅ‰∏ãÂùáËß¶ÂèëÈªÑËâ≤Ë≠¶ÊàíË≠¶Âëä„ÄÇ' : 'üí° Legenda do Motor de Regras: Utiliza√ß√£o <75% Verde (Liberado), 75-95% Amarelo (Aten√ß√£o), >95% Vermelho (Gargalo - Bloqueio de novos volumes).'}</span>
                      </div>
                    </div>

                    {/* RIGHT WORKSPACE: DYNAMIC INTERACTIVE SHIPOWNER COMPATIBILITY MATRIX */}
                    <div className={`col-span-5 p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-150 shadow-sm'} flex flex-col justify-between`}>
                      <div className="space-y-3 flex-1">
                        <div className="flex justify-between items-center border-b pb-2 border-gray-100 dark:border-slate-800">
                          <div className="flex items-center gap-1.5">
                            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                            <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                              {language === 'bilingual' ? 'MATRIZ DE COMPATIBILIDADE DE ARMADORES / Ëàπ‰∏úÂçèËÆÆÁ¨¶ÂêàÁü©Èòµ' : language === 'zh' ? 'Ëàπ‰∏úÂçèËÆÆÁ¨¶ÂêàÁü©Èòµ' : 'MATRIZ DE ARMADORES'}
                            </h4>
                          </div>
                          <span className="text-[9px] text-emerald-600 font-black animate-pulse bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.2 rounded">Interactive</span>
                        </div>

                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                          {language === 'zh' ? 'üí° ÁÇπÂáªÁü©Èòµ‰∏≠ÁöÑ‰ªª‰ΩïÁä∂ÊÄÅÂèØ‰ª•Áõ¥Êé•Âæ™ÁéØÂàáÊç¢ÔºöAuthorized (ÊéàÊùÉ) ‚ûú Blocked (ÈîÅÂÆö) ‚ûú Contract Only (ÁâπËÆ∏ÂêàÂêå)„ÄÇ' : 'üí° Clique diretamente sobre qualquer status na matriz para alternar: Liberado (‚úÖ Auth) ‚ûú Bloqueado (‚ùå Block) ‚ûú Contrato (üìù Contract).'}
                        </p>

                        <div className="overflow-x-auto mt-2">
                          <table className="w-full text-center border-collapse text-[10.5px]">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-800/60 text-[8.5px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-black border-b border-gray-200 dark:border-slate-800">
                                <th className="p-1.5 text-left pl-2 font-black">{language === 'zh' ? 'Â†ÜÂ≠òÁÇπ' : 'DEP√ìSITO'}</th>
                                {['MSC', 'Maersk', 'CMA CGM', 'Hapag-Lloyd', 'ONE', 'COSCO', 'Evergreen'].map(armador => (
                                  <th key={armador} className="p-1.5 font-black text-center text-slate-750 dark:text-gray-300">{armador}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-850 font-bold text-slate-800 dark:text-slate-200">
                              {depots.map((depot) => { const depotName = depot.name; return (
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
                                          title={`${armador} @ ${depotName}: Clique para alterar status / ÁÇπÂáªÂàáÊç¢Áä∂ÊÄÅ`}
                                        >
                                          {cellText}
                                        </button>
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-dashed border-gray-100 dark:border-slate-800 text-[10px] text-gray-400 font-bold flex items-center justify-between">
                        <span>{language === 'zh' ? 'üí° Â•ëÁ∫¶ÈôêÂà∂ÔºöVBRÂèäTEON 23 ÈªòËÆ§ÈîÅÂÆöÂ§ßÂ§öÊï∞Áõ¥Êé•ÊîæË°åÔºå‰ªÖÊé•ÂèóÁâπÂÆöÈ¢ÑÁ∫¶„ÄÇ' : 'üí° AUTH: Liberado | LOCK: Bloqueado | CONT: Requer Contrato.'}</span>
                        <span className="text-[8px] bg-emerald-500/10 text-emerald-600 px-1 rounded uppercase tracking-widest font-black">Excel Friendly</span>
                      </div>
                    </div>

                  </div>

                </div>
              ) : currentSlide === 10 ? (
                /* SLIDE 6: PLANO DE DIRECIONAMENTO (ALLOCATION PLANNER) */
                <div id="slide-dashboard-allocation-planner" className={`flex flex-col justify-between ${widescreenMode ? 'h-[calc(100%-85px)] overflow-y-auto overflow-x-hidden scrollbar-thin' : 'min-h-[660px] gap-4'}`}>
                  
                  {/* TOP CONTROL HUB */}
                  <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-100 shadow-sm'} flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shrink-0`}>
                    <div className="flex items-center gap-3">
                      <div className="bg-red-100 dark:bg-red-950 p-2.5 rounded-xl text-red-600 dark:text-red-400">
                        <FileSpreadsheet className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm flex items-center gap-2 text-red-600 dark:text-red-400 tracking-tight">
                          {language === 'bilingual' ? 'BONDED WAREHOUSE SPACE & ALLOCATION PLANNER / ‰ªìÂÇ®Á©∫Èó¥‰∏éÊµÅÂêëËßÑÂàí' : 'BONDED WAREHOUSE SPACE & ALLOCATION PLANNER'}
                        </h3>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                          {language === 'zh' ? 'Âä®ÊÄÅÂÆπÈáèËßÑÂàíÔºåÊàêÊú¨‰ºòÂåñÂèäÂÆûÊó∂Â∫ìÂ≠òÊï∞ÊçÆÂêåÊ≠•' : 'Planejamento din√¢mico de capacidade, otimiza√ß√£o de custos e sincroniza√ß√£o de estoque em tempo real.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin pb-4">
                    {(() => {
                  {/* MAIN CONTENT AREA */}
                      // Fetch Live Inventory Data
                      const liveTecon = { 
                        inv: yards.tecon?.cheio || 0, 
                        cap: yards.tecon?.capacity || 2000 
                      };
                      const liveInter = { 
                        inv: yards.intermaritima?.cheio || 0, 
                        cap: yards.intermaritima?.capacity || 800 
                      };
                      const liveTpc = { 
                        inv: yards.tpc?.cheio || 0, 
                        cap: yards.tpc?.capacity || 1200 
                      };

                      const activePeriods = plannerPeriods.filter(p => !p.isHistoric);
                      const totalExpectedVolume = activePeriods.reduce((sum, p) => sum + p.totalVolume, 0);

                      const getProjections = (liveInv: number, allocKey: "allocTecon" | "allocInter" | "allocTpc", outflowKey: "outflowTecon" | "outflowInter" | "outflowTpc") => {
                        let prevEnd = liveInv;
                        let maxPeak = liveInv;
                        const peaks: { start: number, end: number }[] = [];
                        
                        for (const p of activePeriods) {
                          const pVol = Math.round(p.totalVolume * ((p as any)[allocKey] / 100));
                          const currentOutflow = (p as any)[outflowKey];
                          
                          const start = prevEnd - currentOutflow;
                          const end = start + pVol;
                          
                          peaks.push({ start, end });
                          maxPeak = Math.max(maxPeak, end);
                          prevEnd = end;
                        }
                        
                        return { peaks, maxPeak };
                      };

                      const teconData = getProjections(liveTecon.inv, "allocTecon", "outflowTecon");
                      const teconPeaks = teconData.peaks;
                      const teconPeakOcc = teconData.maxPeak;
                      const teconPeakOccPct = (teconPeakOcc / liveTecon.cap) * 100;

                      const interData = getProjections(liveInter.inv, "allocInter", "outflowInter");
                      const interPeaks = interData.peaks;
                      const interPeakOcc = interData.maxPeak;
                      const interPeakOccPct = (interPeakOcc / liveInter.cap) * 100;

                      const tpcData = getProjections(liveTpc.inv, "allocTpc", "outflowTpc");
                      const tpcPeaks = tpcData.peaks;
                      const tpcPeakOcc = tpcData.maxPeak;
                      const tpcPeakOccPct = (tpcPeakOcc / liveTpc.cap) * 100;

                      const getAlertStatus = (pct: number) => {
                        if (pct > 95) return { color: 'text-red-600 bg-red-100 border-red-500', text: 'CRITICAL RISK - Storage Overflow / Reallocate Cargo' };
                        if (pct > 80) return { color: 'text-amber-600 bg-amber-100 border-amber-500', text: 'CAUTION - High Yard Density / Monitor Outflow' };
                        return { color: 'text-emerald-600 bg-emerald-100 border-emerald-500', text: 'SAFE - Operational Capacity Available' };
                      };

                      return (
                        <div className="flex flex-col gap-4">
                          
                          {/* Executive Summary Widget */}
                          <div className={`p-4 rounded-xl border-l-4 border-slate-800 ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-200'} shadow-sm`}>
                            <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mb-2">Executive Yard Overview</h4>
                            <div className="flex gap-6 items-center flex-wrap">
                              <div>
                                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Planning Volume</span>
                                <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{totalExpectedVolume} <span className="text-sm font-bold text-slate-500">CNTRs</span></span>
                              </div>
                              <div className="h-10 w-px bg-slate-200 dark:bg-slate-700 hidden md:block"></div>
                              <div className="flex-1 flex flex-wrap gap-3">
                                {[
                                  { name: 'TECON', pct: teconPeakOccPct },
                                  { name: 'INTER', pct: interPeakOccPct },
                                  { name: 'TPC', pct: tpcPeakOccPct },
                                ].map(t => (
                                  <div key={t.name} className={`px-3 py-1.5 rounded-lg border flex flex-col min-w-[100px] ${t.pct > 95 ? 'bg-red-50 border-red-200' : t.pct > 80 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'} dark:bg-opacity-10`}>
                                    <span className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-400">{t.name} Peak</span>
                                    <span className={`text-sm font-bold ${t.pct > 95 ? 'text-red-600' : t.pct > 80 ? 'text-amber-600' : 'text-emerald-600'}`}>{t.pct.toFixed(1)}%</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* SECTION A: Cost Strategy & Facility Selection */}
                          <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-100'} shadow-sm`}>
                            <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider mb-3 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-emerald-500" /> 
                              A. Cost Strategy & Facility Selection
                            </h4>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-[11px] mb-3">
                                <thead>
                                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                                    <th className="py-2 px-3 font-bold border-b border-slate-200 dark:border-slate-700">Bonded Period</th>
                                    <th className="py-2 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-center">TECON</th>
                                    <th className="py-2 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-center">INTER</th>
                                    <th className="py-2 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-center">TPC</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {['48hs', '7d', '10d', '15d', '20d', '25d'].map((milestone) => (
                                    <tr key={milestone} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                                      <td className="py-1.5 px-3 font-extrabold text-slate-700 dark:text-slate-300">{milestone}</td>
                                      {['tecon', 'inter', 'tpc'].map((fac) => {
                                        const isSelected = plannerCostStrategy[milestone] === fac;
                                        return (
                                          <td key={fac} className={`py-1 px-3 text-center transition-colors ${isSelected ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''}`}>
                                            <label className="flex items-center justify-center gap-1.5 cursor-pointer w-full h-full">
                                              <input 
                                                type="radio" 
                                                name={`strat_${milestone}`} 
                                                checked={isSelected}
                                                onChange={() => setPlannerCostStrategy(prev => ({...prev, [milestone]: fac}))}
                                                className="w-3.5 h-3.5 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                              />
                                              {isSelected && <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">Best Rate</span>}
                                            </label>
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Strategic Allocation Justification</label>
                              <textarea
                                value={plannerJustification}
                                onChange={(e) => setPlannerJustification(e.target.value)}
                                className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500/50 outline-none resize-none font-medium leading-relaxed min-h-[60px]"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* SECTION B & C: Inbound Arrivals & Percentage Allocation */}
                            <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-100'} shadow-sm`}>
                              <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                                <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                  <Ship className="w-4 h-4 text-blue-500" /> 
                                  B & C. Inbound Arrivals & Outflow Parameters
                                </h4>
                                <button
                                  onClick={() => {
                                    const nextId = plannerPeriods.length > 0 ? Math.max(...plannerPeriods.map(p => p.id)) + 1 : 1;
                                    setPlannerPeriods([...plannerPeriods, {
                                      id: nextId,
                                      isHistoric: false,
                                      dateRange: "New Period",
                                      totalVolume: 0,
                                      allocTecon: 0,
                                      allocInter: 0,
                                      allocTpc: 0,
                                      outflowTecon: 0,
                                      outflowInter: 0,
                                      outflowTpc: 0,
                                    }]);
                                  }}
                                  className="px-2.5 py-1 text-[10px] font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 rounded transition-colors"
                                >
                                  + ADD PERIOD
                                </button>
                              </div>
                              
                              <div className="space-y-4">
                                {plannerPeriods.map((period, idx) => {
                                  const updatePeriod = (field: string, val: number | string | boolean) => {
                                    const next = [...plannerPeriods];
                                    (next[idx] as any)[field] = val;
                                    setPlannerPeriods(next);
                                  };

                                  const isHistoric = period.isHistoric;

                                  return (
                                    <div key={period.id} className={`border ${isHistoric ? 'border-dashed border-gray-300 dark:border-gray-600 opacity-60' : 'border-slate-200 dark:border-slate-700'} rounded-lg overflow-hidden transition-opacity`}>
                                      {/* Header */}
                                      <div className={`${isHistoric ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-slate-100 dark:bg-slate-800'} p-2 flex flex-wrap justify-between items-center border-b border-slate-200 dark:border-slate-700 gap-2`}>
                                        <div className="flex items-center gap-2">
                                          <button 
                                            onClick={() => updatePeriod('isHistoric', !isHistoric)}
                                            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border cursor-pointer transition-colors ${isHistoric ? 'bg-gray-200 text-gray-500 border-gray-300 dark:bg-gray-700 dark:border-gray-600' : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}
                                            title="Toggle active/historic status"
                                          >
                                            {isHistoric ? 'HISTORIC' : `PERIOD ${period.id}`}
                                          </button>
                                          <input 
                                            type="text" 
                                            value={period.dateRange} 
                                            onChange={e => updatePeriod('dateRange', e.target.value)}
                                            disabled={isHistoric}
                                            className={`text-[11px] font-bold px-2 py-0.5 rounded border w-28 text-center ${isHistoric ? 'bg-transparent border-transparent text-gray-500' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}
                                          />
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Total Arr. Vol (CNTRs):</span>
                                          <input 
                                            type="number" 
                                            value={period.totalVolume} 
                                            onChange={e => updatePeriod('totalVolume', Number(e.target.value))}
                                            disabled={isHistoric}
                                            className={`font-black text-[11px] px-2 py-0.5 rounded border w-20 text-right outline-none ${isHistoric ? 'bg-transparent border-transparent text-gray-500' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 focus:ring-1 focus:ring-indigo-500'}`}
                                          />
                                          <button
                                            onClick={() => setPlannerPeriods(plannerPeriods.filter(p => p.id !== period.id))}
                                            className="text-red-400 hover:text-red-600 transition-colors ml-1"
                                            title="Remove Period"
                                          >
                                            <span className="text-lg leading-none">&times;</span>
                                          </button>
                                        </div>
                                      </div>
                                      
                                      {/* Table */}
                                      <div className="overflow-x-auto">
                                        <table className={`w-full text-left text-[11px] ${isHistoric ? 'grayscale' : ''}`}>
                                          <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                              <th className="py-1.5 px-2 font-bold border-b border-slate-200 dark:border-slate-700">Facility</th>
                                              <th className="py-1.5 px-2 font-bold border-b border-slate-200 dark:border-slate-700 text-center">Alloc %</th>
                                              <th className="py-1.5 px-2 font-bold border-b border-slate-200 dark:border-slate-700 text-right">Alloc Vol</th>
                                              <th className="py-1.5 px-2 font-bold border-b border-slate-200 dark:border-slate-700 text-right">Est Outflow</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {[
                                              { name: 'TECON', allocField: 'allocTecon', outField: 'outflowTecon', vol: Math.round(period.totalVolume * (period.allocTecon / 100)) },
                                              { name: 'INTER', allocField: 'allocInter', outField: 'outflowInter', vol: Math.round(period.totalVolume * (period.allocInter / 100)) },
                                              { name: 'TPC', allocField: 'allocTpc', outField: 'outflowTpc', vol: Math.round(period.totalVolume * (period.allocTpc / 100)) },
                                            ].map(row => (
                                              <tr key={row.name} className="border-b border-slate-100 dark:border-slate-800/50 last:border-0 whitespace-nowrap">
                                                <td className="py-1.5 px-2 font-black text-slate-700 dark:text-slate-300">{row.name}</td>
                                                <td className="py-1.5 px-2 text-center">
                                                  <input 
                                                    type="number" 
                                                    value={(period as any)[row.allocField] || 0}
                                                    onChange={e => updatePeriod(row.allocField, Number(e.target.value))}
                                                    disabled={isHistoric}
                                                    className={`w-14 text-center text-[11px] font-bold py-0.5 rounded border outline-none ${isHistoric ? 'bg-transparent border-transparent' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-1 focus:ring-indigo-500'}`}
                                                  />
                                                </td>
                                                <td className="py-1.5 px-2 text-right font-bold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/30">
                                                  {row.vol}
                                                </td>
                                                <td className="py-1.5 px-2 text-right">
                                                  <input 
                                                    type="number" 
                                                    value={(period as any)[row.outField] || 0}
                                                    onChange={e => updatePeriod(row.outField, Number(e.target.value))}
                                                    disabled={isHistoric}
                                                    className={`w-16 text-right text-[11px] font-bold py-0.5 px-1 rounded border outline-none ${isHistoric ? 'bg-transparent border-transparent text-emerald-700 dark:text-emerald-500' : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 focus:ring-1 focus:ring-emerald-500'}`}
                                                  />
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                          <tfoot className="bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 whitespace-nowrap">
                                            <tr>
                                              <td className="py-1.5 px-2 font-black text-[10px] uppercase text-slate-600 dark:text-slate-400">Total</td>
                                              <td className={`py-1.5 px-2 text-center font-black ${period.allocTecon + period.allocInter + period.allocTpc === 100 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                {period.allocTecon + period.allocInter + period.allocTpc}%
                                              </td>
                                              <td className="py-1.5 px-2 text-right font-black text-slate-700 dark:text-slate-300">
                                                {Math.round(period.totalVolume * (period.allocTecon / 100)) + Math.round(period.totalVolume * (period.allocInter / 100)) + Math.round(period.totalVolume * (period.allocTpc / 100))}
                                              </td>
                                              <td className="py-1.5 px-2 text-right font-black text-slate-700 dark:text-slate-300">
                                                {period.outflowTecon + period.outflowInter + period.outflowTpc}
                                              </td>
                                            </tr>
                                          </tfoot>
                                        </table>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* SECTION D: Inventory Projections & Capacity Stress-Testing */}
                            <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-100'} shadow-sm`}>
                              <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider mb-3 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                                <Database className="w-4 h-4 text-rose-500" /> 
                                D. Inventory Projections & Stress-Testing
                              </h4>
                              
                              <div className="flex flex-col gap-3">
                                {[
                                  { name: 'TECON', live: liveTecon.inv, cap: liveTecon.cap, peaks: teconPeaks, peakOcc: teconPeakOcc, peakOccPct: teconPeakOccPct },
                                  { name: 'INTER', live: liveInter.inv, cap: liveInter.cap, peaks: interPeaks, peakOcc: interPeakOcc, peakOccPct: interPeakOccPct },
                                  { name: 'TPC', live: liveTpc.inv, cap: liveTpc.cap, peaks: tpcPeaks, peakOcc: tpcPeakOcc, peakOccPct: tpcPeakOccPct },
                                ].map((fac) => {
                                  const alert = getAlertStatus(fac.peakOccPct);
                                  return (
                                    <div key={fac.name} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50 dark:bg-slate-900/50">
                                      <div className="flex justify-between items-center mb-2">
                                        <h5 className="font-black text-sm text-slate-800 dark:text-slate-100">{fac.name}</h5>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-bold text-slate-500 uppercase">Live Inventory:</span>
                                          <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">{fac.live} <span className="font-bold opacity-60">/ {fac.cap}</span></span>
                                        </div>
                                      </div>
                                      
                                      <div className="flex gap-2 overflow-x-auto mb-3 pb-2 scrollbar-thin">
                                        {activePeriods.map((p, idx) => (
                                          <React.Fragment key={p.id}>
                                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1.5 text-center shadow-sm min-w-[60px]">
                                              <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-tighter mb-0.5">P{p.id} Start Inv.</span>
                                              <span className="block text-xs font-black text-slate-700 dark:text-slate-300">{fac.peaks[idx]?.start || 0}</span>
                                            </div>
                                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1.5 text-center shadow-sm min-w-[60px]">
                                              <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-tighter mb-0.5">P{p.id} End Inv.</span>
                                              <span className="block text-xs font-black text-slate-700 dark:text-slate-300">{fac.peaks[idx]?.end || 0}</span>
                                            </div>
                                          </React.Fragment>
                                        ))}
                                        {activePeriods.length === 0 && (
                                          <div className="text-[10px] text-gray-500 italic py-2">No active planning periods to project.</div>
                                        )}
                                      </div>

                                      <div className={`p-2 rounded flex items-center justify-between border ${alert.color}`}>
                                        <div className="flex flex-col">
                                          <span className="text-[9px] font-black uppercase tracking-wider opacity-80">Capacity Alert</span>
                                          <span className="text-[10px] font-bold">{alert.text}</span>
                                        </div>
                                        <div className="text-right">
                                          <span className="block text-[10px] font-bold uppercase opacity-80">Max Peak Occ.</span>
                                          <span className="block text-sm font-black">{fac.peakOccPct.toFixed(1)}%</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                          
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ) : currentSlide === 7 ? (
                /* SLIDE 7: M√ìDULO DE GEST√ÉO LOG√çSTICA CRUDS */
                <div id="slide-logistics-cruds" className={`flex flex-col justify-between ${widescreenMode ? 'h-[calc(100%-85px)] overflow-hidden' : 'min-h-[660px] gap-4'}`}>
                  
                  {/* TOP CONTROL HUB FOR LOGISTICS */}
                  <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-100 shadow-sm'} flex flex-col md:flex-row justify-between items-start md:items-center gap-3`}>
                    <div className="flex items-center gap-3">
                      <div className="bg-red-100 dark:bg-red-950 p-2.5 rounded-xl text-red-600 dark:text-red-400">
                        <Package className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm flex items-center gap-2 text-red-600 dark:text-red-400 tracking-tight">
                          {language === 'bilingual' ? 'LOGISTICS MANAGEMENT MODULE / ÊØî‰∫öËø™Â§ñË¥∏ËøõÂá∫Âè£ÂçïËØÅÂèäÈõÜÊàêÁâ©ÊµÅÊéßÂà∂' : language === 'zh' ? 'ÊØî‰∫öËø™Â§ñË¥∏ËøõÂá∫Âè£ÂçïËØÅÂèäÈõÜÊàêÁâ©ÊµÅÊéßÂà∂' : 'LOGISTICS MANAGEMENT'}
                        </h3>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                          {language === 'zh' ? 'Âú®Ê≠§Â§ßÁõòÁÆ°ÁêÜÊÇ®ÁöÑÂÖ®ÈÉ®Áâ©ÊµÅÈõÜË£ÖÁÆ±Êï∞ÊçÆ„ÄÅËøõË°åÂ¢ûÂà†ÊîπÊü•Êìç‰ΩúÔºåÂπ∂ËøûÊé•Âú®Á∫øË°®Ê†ºËøõË°åÂÆûÊó∂Âà∑Êñ∞' : 'M√≥dulo CRUD central de equipamentos, BLs, ordem de compra SAP e importador autom√°tico.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setSheetsModalOpen(true)} 
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 uppercase tracking-wider"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" /> {language === 'zh' ? 'Google Sheets ÂêåÊ≠•' : 'Google Sheets Sync'}
                      </button>
                      <button 
                        onClick={handleClearAllLogisticsData} 
                        className="px-4 py-1.5 bg-gradient-to-r from-red-50 to-rose-100 hover:from-rose-100 hover:to-rose-200 text-rose-700 border border-rose-300 dark:from-red-950/40 dark:to-rose-900/20 dark:border-rose-900/60 dark:text-rose-350 font-extrabold text-[10px] rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 uppercase tracking-wider hover:shadow-md hover:shadow-rose-100/30 dark:hover:shadow-none"
              xúÏ}k{’’ˆ˜˜Wl\ZÀ≠ÂSÏ‹ƒ\ä≠$zPlc+·°yÛ6cilM3“àôQb◊ıu%î@8Ñî%M°¥Ñ>%§-Öêp¯‡B#Ÿ˘‘˛ÑwÊ∞g¥O#…éC=\ƒ“hf◊^{Ìu∏ ‰ö¯?Äs,ÿöSESsúi≠¢Í9üﬁ30 Ëﬂ08VM≠∫T◊ñtpË–!–˚Ûr/xÙ6Ô\⁄¯Ën„“ÕøºŸ|ÛvÛ ≠^0z¢€ö
ıí’ª∆©Ù‡‡B›u≠*ªQK∆9÷Oﬁå_VÊgÛπxzfÓ…˘ŸÃdùÀMÅ≤⁄pñC˜w…6J ˝ì.Z¶ìÊ“8ıu,iµÙ(X4ıe¯£uN∑MÎ|∫lîJzT‹Ùpª+Ãõ®±˘Ï™≠„ üõ~<ùôÀõ91üì3”ÖLn:;7œÈAKVœ¿6√Ê¶ùöVÖmEÌµ≠zµ§ó“À&X∞ÏínÉ«W›≤^Ò¶±§ŸgÒD.,•O}oX9∞g·¥˜d⁄15WOÔÆæÏ¶œóW«”∆_¢èß¨ï‡®8ïﬁ5<Tdº`õ¿œÍék,Æ§t˜ºG,¡ï¥Vw≠3k<Í<∏hŸ`UÁÎ√=¥Z÷™%Sü◊ŒÈœî&≠™´U›Œ[K,øË¨—s
«°®√
ˆp¶ÜE—V£IÒªπ j·∑%[[A}h«#É±hHP)ßZ8§']‘´.ú'\µ∞X ·∫añåÍRlÈé¬Ö;JfÕÜì?6Ñf∆6™g”Ch1ãÀ,èFá8≤µÀ,ë2Oè‘ñOìœAw… P˜Ü·Ωz≠¶€EÕ—,†x∂4ÌKeW“/¿a7˜˛ßqÎ⁄˝{o4ÓæÒ‡∑/l˛·“∆≠øÇ‘˝o~∑qÛµ¡ø˚=˘‘á©Ù§Q-÷M»á*%ÃÆﬂp>[Ú∆`∞<*ú={
s¬MÜ·
ÇL.ßpƒ)-Q„Í/asIFÑ£JF÷]©¡ëG{$œZ’I”(û=¥öÍá‡ y Gwü)ÕÀz©nÍ«≠íûÍ-˙£ﬂ€˜cÈ˚dqS{ﬁY“S==“ó◊ƒS
"å≤óÆGÀ)c*_0!âR$Î|•Ñ®∑Íêp™iÕ4!ïˆd%2Ñä√°êæ<¶åñÔﬁ1ö˚<vŸQ)Æ¸*ÊVcëUäoç¬[eƒãÈïªœÆÂóë°!Y≠kgƒ—ﬁ oæ˙R∞‡õØ˝j„Ê+xçœZ‘Úñ.jëƒ<µ#—Çôdı6øSÀv~wΩp/Óziæ˘i„ õ‡pƒºìÉ"ÜaÀ∑A˘äëlÖ|y›˚ΩFoìût1H¢i0uâ>È*î5ì–bE/ıäpüdåóp‡`ﬁø˜,ÔΩ–∏~˜__^.d°x˛œs”ÖÏ‹ÒÃ\Æê;ûŸ¯¯•}˘RÛÚ[˜Ô\ÿº¸"¶‹øÛÒÉ/5_˘®Ò˘ﬂÓﬂy˘˛óÔm\{>deóﬂÚ¶Èúï‘·|ÿ¸Ê∑õ7^Ω˜É˚˜~C&Óüûì¥NÏºnÍE∏–tPØ ¥—¨ˇã<V›ÄÖ≠JÕ‘]5€÷ó‡ö UÀ5,¡øö≠Å¢m@y©^—@Õ∂‡@W¥ı◊ˇ`∏°PäﬁêÃ¡¡öh¶c"ë/úè@	OÏ≤#û7xd
%9B∆∏”.8o∏e¯Y≥ãeHŸµ∫À=1ÖMëÏ¶∂†õtsLr9ö@ôÃOLµê1U∏'E™ØJOÄì+JåÀœ?Ï•	@ˆŸ∫QÉΩÆBj	Df¯Xü¥‚qa≈qRo©˛ê§>˜¬ì( Itaµ!ù#Üâ^*‘JŒh^!%€:‰˚∆9]:≈ΩJŸ*†-8ñYáªó©/∫dçXµp≠¯LPzöÉ®?“ô#*\&œ pN3ÎPÄDä˚@∆M&G`Aã%P“±(D™åî>‡jˆíÓ‡*˙‰e÷‡˙”Àd™€áò;aJºîq˛˚›__Õ◊Øo|˙~∞(W?Gº˘•/öπëj¸È9`Z.È¿TKΩÑ»v4ØæâõˇRZäçô2ñê‰RŸ]ï•Éîæ<Œnä˜
l
˜YÖ·åP„b l53ΩÓÈ= 	ÙiuåuXıîL]»»KC≤/r¥ı∑ o∑™ñ«_•K—@<´Óöpî†  wøE´Xw∆m$”_<=àå∏e â8É.	ÛF4)[≤Ÿ◊T"y\/QÁÊ\iM˛zÀÇ‰ø/ÀV:JB6òªÒ©©‰( ·R§¶m§Ü”j’–Q»õµûûâtö#Ωo~Ú9Ÿ1~‘ïÒ,˙‘“ÈÉÉ§ly#VJt	”-™K0AÍ±(◊ÔÉ;û[∑´®W◊Â'T‡?^—‹b9Ë)1UÏ±“Â%ÆıT¥öz`˜¨hv	ë'8Ñ?:ßäËoÆt˙âÅ*∫ˇã_ ˇñJØH©Ü„/¸,ÿÙu“Y(:∫3‡X=eÍ®•¶>PÑwù≤Ì*<Ω†Ÿ/%Öc(c#‰Ú©Ó¨ærhU±Ê≥¸EN1‰Ú^ÖÊÚ8s*?å√C=πµv˙¢QDéêz„ªRg«’‹∫≥÷VÈÇt˛ÌÖ˜¡©‡ŒÈ^RÄZ∑î) %2íU{pê∞YqÖxóﬂ2ˆ~ÿÏÑ´j°]v˛êÿypÙiaÁáÛI˘x∆Ü√:∞h[ïTU?œ0näbÌO,,ò}>ß?lY¶ÆU˚˙Ç;ÊIƒ}∂èˇN˘,bºëÇ è¨§˙\+oùáÇ<Lßîò!j‘≥à≈ÿÆÛ¥·ñSΩHÊÖ‚6d·-˜u¯CüR_˝ñ¬ó
∫]ÅÌ}v¿÷Òq#5¯ˇRˆ/Py}ˇ◊˘—`?‰Z}^Töppj¬ÊÃ&27?¯òwÂ¶<÷˚Ö´£j¿®ÕzIwR^{˚î¢¬jΩ¶zm¿m‚V˛,u≈^•–é".…Ôr|ËSÈπ'4$"~Bx◊ûÑ‹ Ö¡•¢]Ì0ıÍí[V_˛ÊÈ¿*ƒ´\Tk¿§˙‹”C1üMl≠,Ç€#‰õ≤4‚Ω•ã`B÷»‰Ù—Úá33À®¶z˙Aè¬6áõ∏CÂ
°>Sz*EZÆ£»ΩhŸ‡©∫Q<2u◊J√	7m©‘ñ-ıTê™\eJWæ¡)j®, £zœÑø’j@IÂXM&óÆ⁄“ìAπ≠MÌÿas«IkXÕ⁄¯î8Z’Òï„√Bﬂ"©Ö¢-≥uG9#|d€…pZ;gX uRw‡2ﬂƒHö“.Aí∑wâ2∏:%J9Û~Da§‚É ©	v›„ˆ¥Õá—ÀªT\è"+ˆÏäHÁ¶WvE>≠ŸzŸ™;˙£µ“L’\ëæ\2m¡‘Kùê^´ü·Å$¥∑?!ÌÊp6©Åb›v,~vëó<÷ï>œEÛînÁt{¯Jb˛n»Àæ_∞ø8˛˝Óó¿îÊj`r
Ãö<cÇÓÑE‚œlõﬁ.˜¶ÀËÃ∆‹Ûº“«èßß¶‰}`.A¬ue¨MO|ı°{∏k´L;Ê˚û¶î™ë,‹m0™
ŸˆÕb€,@ñ∏=©.ÑÑö˝ï©¶≠>qû¿ØÔ %¡ïXm?õùû N≤P<>©kÄbEe¿dÊxn˙ÿLœD±˝¬¶rô)T˛€v1∞CsŸ£'`˜¸Om5ôôûÃÊq£Çè™Ö©)π˛sœJ‰(]≥lW+Y∂2∑Ÿ mwR≥m£}Ø.Ôı]Œ\ªzû‡yÌ@éR&ˆ3ˆ6\ê
§o¸õ≤Ê,ÒÏ◊É´i{#éîÚDı€nfü ŒOfÊéfz&¸O u¢jZZ©ØÌùm˛ÈÃ,î¯‡ø 5^´µ_“‰L~6
LœÄ…cÎøD[eÏHÕBû]≤ŒW€Øe*{r&b˝ET‹TúÃ¸$7É∆£ı.HÕ˚ú^©π+ 5viª~8«ÿ+ o5ìÕLÊ!)o/ô©¢Úg—yqf—Ø≥mû¬,mó∑lo	ÉÔG )—ﬂ⁄^™T!˚"EÓkª»√'é…ŒÅ·°ûâ‡c7⁄7i_Wäé9‹vëG≥sô|œ˛≥√é“ﬂIùà˘‹¡¯"öf8ÁØ <Ç%¥HKÜ◊êk•mÄºEH $ÇnÄw,G«üIxbÛæ0ñ—{(äı@≥]:âr÷‚°ûZE¡å;êÎÈcæé∑f‹ÄÅpﬁ@\ß¡é†`À©∏PîÂñpFvˆ(1÷…∆ç[õ∑> !yç/>kº˛jÛ„?FëtêY“´êª	£‰ƒAï‡ÖÖ˘“XœÂéã`ä…ÂA$3=
ô√˘,é¢à*“CÉäÏÁÄäA¸˝%Dao$äh!oÖsÜcyTJ„¯≥mù«T¥áMg~ïP¢Âûï‚5˘a_¿[òm9çñÖxD ’p√¡Ñ`r•=Ê	8ÅG;i∫P∞aâ4JÀ,\[ûœqFÎ’„≈cq˝‡pæl^˛¢Ò˙ïÅÅÅ∏X{◊!S≤AçF œaWÙò∞c[+N≈£≠(^ç$U$ö
	V|V…•ÒŒ¶`#Dﬁëã◊q∫#Æ¬ìVE_nü¯®BZ®Oq‚∑LÄé¬%–2	∑ºòn9Ö)ˆ&G†º ∞ÒÚgÕâØ:1á‡˚„†`ï,ßwMEkQ"œE«”|Ódv.;ÖT…ëmŸé?˘è¥KŸ$>a÷{ŸX1ÒßuéIs»˚Æ†Û%LΩX÷ãg¨e!cáTç”K‘"Cn≥PäÅBô‰Ë*\fT1·2Ûj/¥»RÛVFx⁄ﬂµG˙
 Ù*:“¬Œ5≤ëº√Y$˜Ô]j˛ÊÎçÓ6Øˇô 5‡5í©ÈUÕ®”à<¡•»P®àNDÃ9Œö·iC≠˘vHF)ßOÌŸèÖ˙_Úqë˚	cƒÑƒì»¡ﬂ„wP˛2µö#¢ÌÉnY◊J¬)qmu&LièT—÷ù^PdﬁÙ)réë)Ÿ›à‹G˚·ﬁ∑À‹T(ñtÀ…Ç<’™¬uf á‘1Ï›^Iƒ€§∞h‘v)yéé]Ë⁄,ÉÃ·∫=ÿMÖú¥J»_•›v∂0k	‹∞∫—6z£l{˛àÒ¨ìÊÿeKí=‚"+˛nã8ïdyt¨“
›»Ö‡RHØ ÔC`¢w?\≥Ñ-‡Óã¨Uroè_q5}+G?EW	Bg±ìêJHâÌqÛ8vâ&≈$~√Òx±Hb^dUqäßíé.X¯Ç˘D∑ãD‘e7¬[îJ¢5”ëÜ T‚ë	§N‡1¥«C·∏ıF˜¬ñ√üXÔ$kY§fJ@¢Î#íÜÔ≠—õ¨Â`Ã51∂ŒÄcE=6ùÿA˜ÅÇ˝˝ zﬁíáÇ—RBj•êÈ.cqQ(7|*Üﬂ0p§~=ÛJtòî80ËK±_ è
›Â§ =®	•á≈˚4ú‰ „$Ó	ˆöi¬#ÈGdΩB—J=‹vÑg{ø‡ÖNKCvõ†¥»2mø`<§;·[£>◊«#Fè∞œ~gu{gµÿå˘Gâ∞AËÇTÚÎ÷!ÅW‡¥FºGqÙm∫∑„åiµàä$ ¬S√#HÔÆ·ö∫OÛXD	≈'ÿ˜q≥¶34,"≈(∞r|@ä¢C.£’±Ç1m#«6ë7™˛‹ÎÕz1?å©	|ÃjΩ¢€öâNÄ1≠ãˇ√ào¬ıˆ»2F¢2~”íW|‘k≠≤ k©å‹™"_Èä»F5ﬁ§í5>vÙbö_˝°Ñ†!;öÜœuLË≠À∫H‹nQm(Ï“lLe‰∆πä„∏™ΩÂ~xU#ëè©uª¸ﬁÉw>ÿxÈ£Ê?.nﬁ∫›¯ÍMLqŸe(6vcÄ'ù^5lø∆ä≥ƒ™O±"x¶˘‹Õç∑∑Æm˛È‚˝{ØÅ#Üπ¢eÎ‡˛ùèI£C¡«ô€ÿ∏ˆ<›±∆ÎoˇÎÀwœ(∑búô“˝g
ë1—ëVáü*hcF•Dg@(è¨åRóúF¡áÇæ<qFu\≥ıgÎ∞hx
_4l∏ÉV5ÖßøÕI?–úïj®¢˚ÏEÇß–ŒkÜJP¸pı)´ò*°ˇ˙Ao ª°cto?†Ö´ﬁﬁææ´ˆJë†àÉ¸R∫m[∂*∞π*M0YT)ßÃ¿Ìè[a•¶@Æü-d˚¡ôHÀƒ¬µ3ä∞∏ÕäOÆ)ñπ¶‡ﬂÉÆ„
î∆æ˙íB&rc ∫˙Ç
e"àÓ>ÿÚ^Éí@’ıﬂ
£7∞Ä»4ﬂ¢õ‡íΩ¬ºÔiPπ<ÈE¿Êh÷¶¥U©mäÚ&Jª¢
F8yRæcâU*ËÍ<[îî‘!å°"QI™˜∂TÀúá≤¿°’kQ*›†£ö“òÚ4ÔSE$Ÿä9 ÷◊ûkæ˝…+Ûœœm~Ú˘∆s_4^º◊∏˙˜˚w^næı8jYKp[ù/Î∫Î ‚í—º¸¡Pn^ˇK„˙ÌÊ[/ﬁø˜YÛï∑öØ|Öëî!ıMÎ’rΩ5^˚G∞6vÑQÒ¸Òº]{C)•=àæäÙk|KVÀ∑Á5œpWƒ&5Uül
ã{LDLc±—?>õRNú¬@YémÂ=ﬂdÅ%›ÇÂßPﬁ™Z£|BÅ¬rBJpƒB≥öI\Ñ˛¨ è˙Òøî¡n÷_7√2£8-ø∆˝1R5t˜∏Êñ‡Å~KÉ·~0,ÊP4ªN√≤|&~∆≠öV4\4ù2w ø4fﬂkÀ˛Ì€œÉz›∞Ï∂˝¥ZO¿xêaù÷50VÒ®u√LÒ8˙ ÿèØÜÂ6√ˆid‚PkIÁtT?Ç¥Û›#ùY{˝ÔÀF≈ﬂæu∑m“iÀÆÀ˚Ö}üYßÑÉÄ$≈y”†â˜3â*z>7ï˚«¡,JCñŸˇŒNû(‰N‚Ë¢üŒÃ£hÒ∂6
±B£t®«Aı§Kû-)[7{"Z#±„ﬂ„´H1‰m¯£)C±†ú>e◊b
“»˜”˚«jÀ}ß„ÇxóØUd‡ﬁªo$8O«¬∏Öv∆cŸÃTv ÍøRπ’3€ùumHîuçˆydo◊ =◊Íª≈SGuÍ˙ﬂ;‰–Ká∫èalP ;jŸîÍn˘kí·ıªûˆ≠ä’ºÈZ›tt¡9AË*.t9Xﬁ#À©ÊTæœ$˝ú∏œI2´≈ƒÏ√4–w£ß\}üôŒfÊr”G¡|!S»ÕL√MÆÛ∆kœ5^∏‘∏rgÛ”ˇy·‚Ê7Øo~˝Òk\}πqÎ˜Õ∑?ª˜ÉÊıwõØ}ÿ∏¸¢Z¶\ﬂfYaΩf	Ω¨À{Û¡ :√ ,axàtêfùhpgHo\¯ı˝;√Œ7‡Ò‰˙ªË√Á#ÓDçÀ∑· —âb6_~û}˛ıÂ´ç+W/D8çK7õˇ∏∏qÛ8XÕ7/o‹∫±Ò˙ôÔ\πˇ’kÕ{øG/~˙≈É?ºˆ‡ùè’%t—óıb›5ŒiH ˆÏéR∫‡DÜ”·=€œ¢ÉE[wux€ç*; y=√?H'G•å˘'dâbx?u≈Â)i:≈Qé≤[P:òxlD∏ÜY∂ûïC@7{%üô.d¿Tn~6Sò<∆'æîÿnÚ‘«èg‡‚öÃÃMÕwê:uÌ&·◊Ω¬›`ıßÉ´Yéã|?¿ûròÑm»∞˙ë÷¬≤…∂ÓÑ1aêìÜbâ//‚ÇÎUwºæ›ìè◊˙Â-,1a≥}Ø¿hÀ…Yÿox‡A ˆ>£Õÿ£,Ê$h<Ì‡ı4⁄äéè˘øı%ÈnÄvAıﬁ”† V∂¢∆V__j«_ˆQnwË;›_|É6õE,«mu7lk≤.b∫%≤¿hÁÛ`Ãÿb&‰€©7G«⁄Ï!ij¢ÓÓ&aIÏl=F∞î¡µ≈¨ 0Ωä,≠ë˜€ùŒ–O&Iw¸™øìZµ®õ-sä„‚¸ﬁAræÜ}ß˚âo¥tﬂmw:√∂ ∫xö`>kvI‰\Éπ7w"Y"`~“Óì≠j ﬂOÇ∏@zù®≤<ÚD˛UOÄ*Ú‘œmAÙ|µáqæä>¡àPÀÒ*jaõAˆ /}·	ïÚ‹Gπ0P0˘¨¡o%∆àêT‘®@±{≤è ⁄°›ÀÖ¡Mô@-E´SCôÑÎªH¯ΩØbŸ7÷3A∫ÖWä\?Ø>ÜNÊßx Uì∫H˙t0ñ∑∞∏ :Ô#ˆ3[ºû≥OyÌî®l˘‚&[Ò)°2ìx@°0≥Û(3d!;Ç√À¸:Ot
º‘Ó,qñŒ:O|Ù˛1<(A∂s‰KnsıÃ¨ƒ-Ï1Ãã<ÿ}]‡5ØW0p`/¬ﬁ'û~%¯€Q∏Hk„êÁ¢Ñ∂n‚Æ∞Ñû˜Ígeœ°9d¢V·¥[Õc.L¯ZÑıÚJqó5%L¡jBaäüì yÑ“=èX¯ﬂOƒ,ÃUÚsMz1(˜–cè•¸êãxPs¿ú^Ñ< ôë~»91 ˇDﬂ©`pNs+ÑÚúâ¢úëOcΩR—Ï≤ô9SﬁPA 8¬ñ÷1ZãüC!“˘Ë.X¢1u»¯˙ò/æ∞yDñi¡Û¿>Ø’⁄´ƒÙ™UR´ªS÷˘j{ıƒ!cÎ$¥íE@/Ìn+ÄU7ßriÃÃ∞\–Ÿ⁄hL˜â‘§cC‘ñﬁªrK±”ù\±óÇ¢⁄V^™Z=pπ:—pÂ0Ù†$r.‚è‚î!ì8õVJ0 ‹©ÉË∆>¬ÎÍ-áGsÜ∂+4[’¢m˚lﬁ∫—∏¸+O≈ÜêÉìSÕ∑?{ˆßˇ˙ÚQ1¢–"
9!·Í?”J⁄x/íI\€™.	Ñæñ∂fb'\P0¡•)∏ö(•§GWí¥ÙËJúö]P“üåÏ-©ö≠üK‚ÃÊ•“±j+êG≠ÇÅÅ\¬ö`ìRw}¨≠Ñ˚*êîtmä‹UK“6’Vù√‘“0©xAE˝«ËÛÛó0e˘åuba√±É≠´ò»ïW ¢jY/œMåñZxI´}≥ÒÂœk≤öíaìd∫l˚ıç€WØæÖ_8nTçäÒsÕVI~´‚ kÒ¡…≤~Æb¥ŸÀx*Üñ^9Q„æ‡€–Úf´˙¨©x|+B∫uc#äå§‘ï◊ﬂhà≠8ïq£ä$˙tB‘£c±⁄
≠F◊)@ «¡*%ÀÆÅ_ Ô"&∫áHﬁ£%BtÀi~\j[ßf\≈w_ûyJtƒñxb»√3ôâYfíD)£· 8.≠—)Î%^Z˛vû" ∆ºíØ|¨?ok5œ–[sÖﬁaä≥vñrãÅüÈ8Ùk'«Ë;KËÕR ?ú8†_hË
ƒ4Ö•ÚÔwﬂ¯#G#ñ_œ™√ÒÏ]ã≠¨.06˘∏’ÍvÕUΩﬁWzÙº[-Ë›ﬂ™1¸ıÛú1DˆÒ+Ôxñªè^»Å∂eÏxÜÜùcåeÁÿÇq˚ˆ//˛ÎŒUﬁA‡ıØ¸ú⁄\V<Ç~Ω-É»∂4¥Z∆ñÖ≠¿wÓÒ¡Ö›ıño®5`aŒ‚—lŸÂ∂CVëÁbñ •»yÒVÅ°Ñ»@Q¬'méˇ[ÂÓ’£å˝{åáÖ2Ã‹ò˜”nH* (Tˇ"õ_=≈AÉ Á¢îM2<A±tB»éä°¡L`√Ê!„ùùÈ∞L¯Ûé*PIf≥£[(…ám’{ÑŒ}°Ê+ÔCf“H‹1ŒBîAzJÕ&ŸàÇ,ı?ö_§<ÑÂaïGÚxO©-◊.Ä•ÓÂ„•04l{∆í·@Ò6"gcÉ
∑S◊ÛxQ®h°Ë•I¯n<crµ‰g.6JxwaÑj*·y™}/OW	qîgUjVE«!€›xÍ§æÜÍÿüºçùè8'yõ>,¸nÔdPòFwYß¶çE£à‘˙§ÙP¢ÙÀDçéÄ4¢j%EñOöQ‚∞}Â"G™.Br(¿÷ãöBÌæ
mh¡ˆë àA◊à !"Ù≠ú+õ\ê≥˛	ƒJH“√dC¢œ<Õ 2(z≈àœË—°x"ØâF>!®#psgãÏûùœêb≠^5kûÎ)Äœ°ã≠M2}™©ËÀC_ı˘ m/D˝
l±ä–˛¢FzÅz2<ˇB¶Û(~+µâD√õT'W“ê{rë¿˚zíﬁ˜√!à4{ƒ∫∑ñ$6ü\tÑ~≤¯|rÒ¢Ù„1˙'fë[K∑bÙΩ∂'z^…à^—¯µ§å›d†—Ï3ëVV˙ñr®vÌf2˙J∂slEA˘$„î∫EâyÑ„¥≈Iz"u+%ªàæ—·N¥Õ˚èÁó≈9⁄ÅèÁÒı»Ï8æOÙÓVì‡ÈÔˆV≥m[I'πW≈vñáUTpõ9YEvíüUPl'πZ#≈n˚æ2Lká[5Üc…ˆ≈©Ù•ò•ı*ÈãZ›tO“€◊AπGúe§ı≤™áÕ∫›Èﬁµ˝sv˜õDO∑ΩﬂúOèÏ˜_∞˘†mÑëÄ~,∫˝x	Ë«¸…“ƒÀ”2Uxº-ã∆¶jw˚R#◊6ÃõqQù=ˇ5üˇO·V^∑w˘S¢ß;ëáÖ*é©ä∞¥‡O™¶Îäp∞ “∫Ü‚¨bj5‰®£û„iBÓµòîöM]jNÃ
∂;Í1>ö]¯êÃ˝C@!xó”[vˇ$®L±íY¯Kƒ¯K∆·&èGÎÁr3‡xvz>ìG™£©‹|a.w¯Dé(ìÄ0!‡Oî§Ú—¡aí%≠î RèêZΩÃGúçòy’ûœâ$’<>3]8ñ∆õóÃ¡ Û«r≥p~
 7}d∆K∑©®∏z&H±	ª›Rc")I*N~¯T|R¸à+bı®•¯‰Nî?Y«tr4∞·‹ÉÛÜ[Á˝<p≠•%˛ƒõVõ£Mt*jhZ»!ùvBo7$Ãsb±™Ö∆â23‚Úòa‹LÕ“≤£ﬂ≈ıÕó{ŸMz+Q‘öL\„˙‘ﬁø˜í‰∑˘ˆØΩ ~ ÊÀFπñÉ\u—¬â¥h˝Üm–^[NÀ≥‚-Q≈ÀQ¯#"¯ìπÏ”†0sÙh>;'§m\£D)‰@H íƒ Ñà‘Ú)TaK¿÷
A·S I∏‡—6ïÍ≠@≤-õ+*Ò?Ò\æ?≠,á?–*Ü)Ò∏ !†Î!OøJÚŸ†UT¨RAê“•ÄhT‰Y,§Â»‰ıÚ!/¸´m8ÈÎó7?|°Ò€ØIhò^u4S’Y1∫Í°Q∏„qúüà„Ï:ÁqïË?⁄…›U†≤
˛˝ÓØ¬o˛Áf„Óü·G6ºÕ7A*≤uıë∏˙|BØhUÕú2÷◊◊•’£å%x†+Aâ´*¥'ı‚¥FÜ˝ºå5
ÑI8	>œ™(<c:1ÁË•ß·k*Zõñø 1‚ÛTMÒ<€jÍ(™ê)m≈g|)Ü≤%a’I≤z{Kyågüçb  ÌP`±¿Æ%»’…t⁄
J¢ÑîÖ‘ßmP5UDØ∫=dFSH‘∂K+Ù•‡Ì+ÆR7bz√"ÆÇÂ¬£7ÀWÇkÊqÙ¶ÇÅÇïØ|&VLúxä}D»B÷	UK	¡»Ç©9ØËëlπ¥4°+!⁄NL°∏œh[“„®g:åa,®@˜†Aú≤*d4Ò∑y}â˙V@9£ÉoO’µ»7#Úﬁ2˝m˝∆Ç
ÚÉ4$ûh$ˆçdÃNbΩ{º·AE®¡•öAÅ‹≠0ˆÉ5°Óß˝†§∏—xh5Do{3è#ôŒ<ﬁ Å“èØz»t%ú˛b†¶ïÊëF05“zá‡ŸL!’©Æ§≠(b·D„Á:Ú´HâëÒ˙^§/
€£ÙÅQHb¯Q˙"êaävÁñ‰å»I3DVoÅÍq§Üÿ®®Z5È”¥gÈA\ ©n[ì∂âïÎ¥9v∆V:<£ãŸku„uxl&öi «FÚ“Ò£:n#q-A4›},Wo-2jƒ¬ìÈ¯µéf}pl(∆Å}–Ω
ást…ËËRYÂC¶≤C∂YQmæ∏`ÍJ)Nˆ¸âUÃâ§†≠Ùµ & %àN»ﬁ∏_Ç¶ÔphãÏ <h,¶·íç%ÓP7í∑vpdüR∂ö´è§Ç.N9≤N ¶eˆ˜Nï,2ÅŸﬁrGè•è‰“m·ô®9tÓ8I$Út6˚‰‡T&ó': ©ÏOfÛë˘Ÿ‹\v™èe«¶ö(¡≈•QqGâπ9ôÃMÒÎê…d≈é@ ZΩÚN}ohqxﬂàvZ~B-‹	e«5£
≤ÀE›úä1eb©ƒéùpN}oa˙ÔtÏàZ¯L*é)ß∑Œ«^)&f0
a
À·°µ∏ﬂ]´î≈¶‰àËéK9ÙlEªA‘VËe
LE ‡HCÄÒ€⁄ÇÆƒjT–‘¸ÇM0·ó±≈].„„≤[àIdLË*¬9aú∫‚VyÖ9›ß<ßLDìe|vÒ≈!UfÑ"¡ITGLr¬»=„W]™,ﬂT|íIß	ÑÑ¿d!Ô9,#X¯dï),;‚+F(9#"ßé†ÈõÑíë≠û‡ó\J[∏Í Í&uÙLŒo≠ò&˜!öÏôò
ë1F˜’Aw∫:Ë»•˜aT<9]òOûyu?≠ŸzŸ™;˙√®<P–>å 	X6s—™+ù7 -÷iäC›€èëá‰∏C±∏√8ÍPr(Ü}-vˇä¿<…•ãî:"ı‡ »,Ÿı‹~tOeVC	zîÁU;a
Ωƒ◊ª)mÂ\2DÏ@ïáR8$”Î©:¯#µ]Œk¶ yã<Q´	«ﬂKÅ±∞|° i°4â!K$	ô”dD;∆(TµOkb-w¥Ò*^Iz„•ê–l◊°È†4‡‘L√Mı¶{ƒsxÍdTê~`ZöÆ#‹ÕÆ‡‘–Èæ~π3|∫è‰˛é‹9≠Nd¡Ñ,Ènn~{ î˙"sÇÓ©OF¢JÈCäTÁi√-ß‚ z≈Œ¨ı©-z(e÷ãz*•ã^\Q3v®ÙáGdﬁ Ááì™O©f¡∞—Ã Q!7}4}8ØàMÊuV_!∂‘Ùµ_<æ∫`™ÿ8»Ö÷Œcp¿N¡RN'Y ˛;~ˆ ‹ó~ÿØ~<Ñ˝˛>0Nùk›&3øˆØñÅZ›)ì˘QûèTaQI#≥¯◊Z?Xe•PXá
1ßN£ÅÚÛ2ëø°é˘ﬂN„Á¡⁄D7˜}y|ñ©ÛI}±ÆôÖü¡≈> ÀtR—Õµo =òR+oAπ±IjTì&/a®'_ˇ4ÃP@E≥	G°y€D¯‚¯˘}ıF„•+ÕÎóÔﬂ˚™˘∑ÕÎ/◊ˆçkœ{ûÓoﬁn^πEêêıjJu∞∏ôëƒøz«Qh%KîŒ∑e@böÍæ›ÈÂEñÿ¨I=ﬂßƒN?YS∞BÉCñ´äπF¬=ÑX®qyË{˜x√8ùÚV9vóâØsØ}ﬁﬂSß˚|Òx	”“ ŸÚºmj÷Ë∞òÁÊJÀ‡mÙD¿¢πjI_ˆÎX ˘≠»x,$É5ú#ÜÌ∏˛Üâ+CåGâqæ’ßÍZ’5‹ï`b¸›√óúzeT±»7∞q2lH≠◊‰èÄ/¥Èœzaú—a(º%Í–"ÍNñ πF[E¡ˇü‰†≠aÅ-»≠lTV™'<ÃT‘“ñX´G¡Q÷n@´zCÅuÓ.>mëœË§`ôıJ5íc≤=Åˆ”ábÖˇtÖ'M∏o˛)}È7HUt{	éHQ7Mxé÷—9zÖLDüíÜü*Ÿ_;âî¬dhJIÉÌmÎ<ŸÄ∂›ÑE©©’}I˙b¬¡¢ﬁéÎ•T’±ÿ∑8
ˇ;Máµëë=cße÷8~Hüá&O!K’t≈(ïêÅ3jÑàc†2ä›èe⁄ı(4—†%CBíqäÚX%SRµ‘Àt„¿ˆ√PŒÛ›3HnªX™;â¡kDŸ
ΩVNá˜€§$õÃÈ!Ú”$Ùz$VJ‡Mw∑&Çôa‰'ÍãOZtyt>˛+3ã™¡±.∂54â±¨ì"›`Y¬Áp>·^¬ÍÙπy*⁄Ä	ßybBXı•Œ∏û%¯6öê§õ:%6=¥¡]`‚ÄOxe˙xÁ˚∫èwﬁ	‘y£=;≥c(√ìGyæ5∏Kt@»1XÛ≠Vln}»‰€—∫«Ìﬂ∂·
3Ê«ÕùBïÌç"}rﬁÚ—Ã‹ Âb](5Äg4ªîÙÏ≥£h–Bæ1aÁz
ª_∂Å&˚}«C8L<Ç`¬Ak©:JÛ5› ï–=–Ív¡Ù∞}˜∆“HÚMÏF∏e√!™Å6J% }≥∂U1} ñúä™≈∞:Î‹BUÿ÷‰TËKÌ◊9∏_‡˝»xµÔó‡/1ƒü‰ØS∏Íëxf⁄›:‚€…Ç˝Û‘L÷¡¯mﬂÎ4‡ÜGÿ-÷g0úòŒœd¶⁄å‰]ËRÅ≠)fO¿‘Ã””]™Äùaa.[817≤«gë≥\[X⁄âAØ€‹#ﬁeˇ9€#-€˚_Û˘GqO‹æ›ãHªªo©<øªoÌî}´0;Ÿ3ˇÈ˜üÀNŒGÏ˛ÈRëÖÏ—„p[≈∫Tdn∫êù;ûô[øR»°≤£ﬂªTI~Êhé-˛”•"èü»r∞¿û	ˇS∑∆x.3=?õÅˇÆ_ÑCM}ÎR¨|˛”•‚œÂÚ«28IIqáãÛ.âAL∞™®˝≥ê…Í3ãAü–Œ¯tf.{lÊƒ|ååÌJ"ÈÅ9Üª≤Ñ◊˛]Y‚Qï%h–3AÎ€ßä‹©`_∑ˆïGédÁ¿0ä)Û?vøÌCë∂oA√ë
ÜªT¡—Ï\Ó‚¯œé›l’]WùW£÷˙RRØ#•D
idòºvﬁ„£H%Œ•ÄBõ£- èb)(;=féÄüÃÃÛ™<=óôùı@≤#oa|ÑÃ‹dLıÆ_<z"‡cÛ3”ô|Ó'ô©R.ëdì3s≥3sôBÓd´πw’)[ÁüÜ¸“Æ@>äúﬁÍ¸¨fk%c©Bº≤k5∑óÂ˜X“À¨cº◊µ*¢Y—”{˘0ÍÇÕËêÔ∫Äwœ_+≠üÉè;,LÎ¸g®8ø@yË{Fµ=˚ŸÊ©’Û˛ê‡√k‡€Ô«}’∏è¡Ô&Ai˛‰◊˜Ô^€¸Êœ/}‘¸«≈ÊıªçO^ ÉpÏß¥»Ùd.ìáüôB>În™∑hUac™Æﬂg–#€kÜARQ/ñ8-∆øcõ&7ùÕÉ<MÊHNéÏTêç#l…™·dKÜã#√bsPsPêH;p¬t©√óêøùV’Õxü„Æ ˇàU ÁõŒîÓúu≠äx|Ω>ã^{˝ºV[∆(MGo\àiE-âÁàÛOÑ9r¢˛teÚZ,}Éü≤lÜ†¸T≈—°oYå˛:√#Zòô«≤ô)º}|›‘“{B¯ß1à°ñÖﬂí¡}Ïk’ñ∂<|ßÄ±iRÉ(Ã¶Ò áŸ,ÔiqGÑ%€mñf∏»QÓnœdÊ¶–⁄+ÃÕ‰ÛŸπÉÉÂ=Ã™jº'JhÂºÙL˘Aﬁ˘¡1c©úŒC>fL›ê)‹ˇ˙∑çªø~∆◊Õ◊>l\˛¨q„◊~˜~Ûwﬂ‡ÄñY‰
a¢¸ì$à`aÎ£“¨ﬁµÉÉ5∆P≤ˆˆÕÿÃ31Æ Y´w!Ê•û;@,◊Tkæ1T X∫	BQ	G2É◊‡®5øπ–¸Ù£º’ö¶Ç—a÷Êåmô√ÛxÉÃÊ≥≠ºè5PxâƒWX¿\h’ú:?0 GiƒL°êì^p´ÈÕ.1<è„»Å‚vtóå]A[Hı‚rÿ!∏ÉÉ`^w=d;‰7Ú§æ\∏oñu'¥söabÿTéü4A’Çøò∂ÆïP5¢9∑å«’·÷0É¬ÊŒRsà€c¯ûQ-öu∏áß"mÌ„„Éƒ£ÿaV≈≠õ0„‰O=E†ﬁˆN∆>Ωƒ‡úb>È-êâö?md=ê©√á·†Ë¸/¡eòΩÿ`ÀY>»@¡˝„{êp{[±•+◊èﬂ{ÔÖ∆ıª®ÊËœHéÑ?œÆﬂÄùu∑#ü·Úˆ^j]‘lË•≈„∏VëÅ3üxÒ‡rÿãgÀH◊È«p(P˙<„˘Gî‡…p?J˜ç∆«ø·|vËŸ:IfÊ}FO^Í*¡ü”xäíÔQÚˆﬁbD ¸˚ÌyÑ(`ÛÚÕÎÔr)`Z;Ás<ÚŒø˜JWÁøXF–	ßüº¥cfﬂkŒ#4˘çﬂ~Ωy„&wÚè⁄Î7°NÊ?¯ÜX y±´$P“kñ	»7=R{◊C)ù®î†©±æcD#ÑÁú7ê}ßÔDb‰.ê‹°ÁÀ:Rÿ¯‹–ëA≥˝G`vÏû‰ç∆£DïWÆnﬁ∫Öƒ*¡÷G~˝Ô∞ﬂqz)ì~πª,
©æñí≤(¸“ŒaQ§9è1<∏te„´[\2òƒ Y"…gHﬁKj”œ;j#-Lv˝⁄‘ò †s7>sOÊf¶ëéZÂ‘MC%ØàMîj6HÃ⁄rÆé}ıŒ˚„`v˝b!73œ-‡ú∏ò!‡‹±lE2ò5@°ZË…Ÿ|ñW√p4ÍîmßEî2îZ°bçõÛ£õr=)Ñ∫õ\µÑl›A
-rÿŒz˛˜7çø>GÊh<Z©3rûd=ŒÆÅ"
Eï§ÚÒí⁄Ú3ÂÄwjÿ‰—öπ%o1√ßu,Hù√ÍVΩq4UCí;T(3€¡ç›	1ƒ€ŒF#¬“ób	IT´ì2ï48›À’êBµy·^„÷^º %°»-EÙJSí0¿π †+.v?ô1WS1î¢R@®4Ë|è`i(ñ~¿B^Yyb†®Ü^¬–+}Æï∑†á”÷∑ñt ‹Axu§£'¸]hÆ›%zLø3≈zM[ˇ!«’müËÔıF„ {øæπÒ⁄ã"“è?◊R\Ú∞zÜA˜Ñ®#)0Œß+⁄r`(¶ÉQBO%˙6≠Z∏ä[ëú∫∂Fƒæt3 :‹‘∫’TX;≠8©˝º{≠8á
Kÿä∫k Ñ∆`fêVÛ	p\sÀxˆS©5\?¢Z›âŸ≠¸¿Eä¸$Üƒµz–E∏⁄âC`ˇÅH†ñÏ>{b‡Î-D*_JÎ¥ "e¯∑Ër¸{—≤¸ª®<QÛë7˜g(ÂK∂Ö›uÚ(Æèb∑iÖ`á´ÔÔn…[∂%·O“ò<xÒ ∆≠ø¬ÕV$Ü∆ä≤%RhÄ´±çglmÓJõèiœ⁄Rù¥L›’–y˝ÎKÕ´ØKh;˛P¥î-!nª›^˙Æ·~ën=ädŒ˝I‡‰[|9k$Æ	ìHR™“¯ í-BÈäß◊bxjÂn √ÌoëÍˆƒR?¯(v∂njÀ:Àâ\L*OÚƒÊ'ü7ÆﬂºÁïÊ[_<∏RÛïè_|F4®ç◊üøÁœDã’¯’´ìS◊ûo‹˙˝Éw.5Æ>◊|Ûˆ?/<'ûÃ>éﬁV÷¶¨yJY∞Ô5¢{Éã	πŸ∫ñ¥ÕX∂bø4∑é∞€5˛ZwêCªØQ+™í~†{∂kù#@C re≠–1‹Í˙üäèÓ»{#hπ–≥õ…#Zº!#àê∆Å±8i`ß-¢ÿ‹ âc∂Ÿwyﬁ?ºÃQÎ⁄ô”Ö¯w*yöVÜì¢àø 59∂ ∑Ÿ©¨ß™lüuØ∞N¥‰¶∂†õr5˘ÿˆ®…±◊éÅ‹ﬁ-_GéßôXbÍ6úg(_“ƒ¥∏˘Õo7oº ≥È¯≤¶‡Ö*πJt<v<Îˆ?‚åÅ'Ò›„Öb∞íﬁG}˘‚Ô9q\F2‘G˜ß¿©SölSlÿ?¶îêƒ®!Åeø¯é‘~¿ÒPg«´q©ŒówºMJ‡9Â'O@„yâ>8~∏C¡Á4sìˆ"üB(hor—g°∂2PÖì±RìªR”¡C≤™>.˜·GQâY ¯z"ø~q.7	åòöQ·Hb≈—A`ˇŸC¯ès*≤N≥Û8›»
sÛ3≈@"f?+AÛf∆¥äfc—å$’¶-[A≤Ì·Vp,0ŒÓQ ¡Ùµf'Ád¡‰ î§·µf0É§¨x%YV]˘dŸëH&tÜfú¨ ]ﬁ1ÉàAîcˇ∞LﬂÓÿ˛˛úM–o7^◊
Çë4∑3œüÑæPe@ÇüGÛ*x@—W		^xu∆‹ÕeQë(µòfö¯òjq]Ë%•Hã˝ågQWŒÇ«‡∆ü¨ï/‰ædÛ·%â1'¿∏=ŸÂ¢Y7l ‡Ú{ﬁ˘ÄH(‚©„ÇqáÃrúâ‡e«Óè≤ ﬁ·ñ>Py$ÎÿX(ûb/QÔ!QO$À∏`kNy$*≥ÏÅÎÆå˛eQQ/KsƒJ÷õ2{Ê¯F»e)ñèTjh F°,X‡ùøTÂ@yÂ›†eFµVó‚ÜNEí•Ù»ˆ‰)ÃO}´Å»êBá¥»Œ∞-iÚCîüıÉ^ø«°&V˚◊Vâ◊ÄDsÆäi∂ª!Z˚ódÌ…v≤.∑![N‹ÿ¶‰[)@
k˚vq„ñme£“w…ö{=|≤5-Òæ*6±ÁÇçèÓÓ0¬∆∆·-#l\˙.asØGû∞g-€EÑ›ºÛI„Íva◊pÀ∂ä∞qÈªÑÕΩ>akàbbíπßFÿL„Úé l ∞ªuÙMU≤KÊ‹Î·ì9Ì\¿Ùìì∫á]áwêÃµ;ÅÃKA´∂ä∆Év	ú{uN‡ÙX-3çÙ≠=∑
›€ñ?g‚[äÃ]?Ñe‹øÛrÛ˙ªƒ#hG	0∞ëÜUw~JÏ‚HwähdN]	<XœåÉ°-ŸËJv˜Íd±à˛¯?≤A30å!«|89ìœgfÁsáÛY09ó√Y$N¶C57ÂÈ⁄?7»	"”‚8gR	¢KÊöä…Öëè∂lùœî04…ÀÆ§s¢7ò=ƒ4û/&&ƒ0œ=àÎ Cpb¡ÿ qŸTå\™l1#∂aè<8k÷é-!Ç’&4,àCÒlC≥¡¥uŒ¢å:ÔˇæÒÚ{Õ∑nÛPÄ|w—÷ÁZÀ„&˙í8?ä3∏ÜªXœƒjå
Q”æΩ¸+‹úâùV≈ÊÕñ⁄Y¶¢¸´ªæP1‹C´ymçm¬Oªä<√_7É˚Z≈–∫È€ÓG|2ÒL>€D¥Eˆü˝î∑üä“%Í∆H/ÿo⁄™@éb≈CïØ_Ÿ¯v◊e‘<©‰RC8Ëeÿh›>‘3=s<ãZÖ€#Øˆdû™~2ô@¡rªö_Wu∫ÚØ-üÑ$êDA^6œ÷»:w‰Òµõk°`‘¬∞Ò◊{çﬂø¢∂‘“(D©!Êw@ùËı]Íî‘«·‹g¶ß≤S=‰/öÎKoºpIºú∞ﬁ319~ Bàuxº˜F„ÓmL†Ê»˘A∞ÒÂç˛÷xıÆZÅ*∞Íjáàv7¿=€Gb	OòÙ] ≠‹˙b„√O÷y>≤+¬%9îl3Ù˚—ÀÒã#Éb‹á=L‘íçg≈®Íë<ı–v¡®”Dî⁄cNBjèxMÏRKLÈ®ùê9zó∆π◊√ßÒNÂº®≈é†rÖπâR9ÓCTéﬂﬂ•rÓ’ÏºÏıËÿÎl,·2√]Ë`ô·˜wó˜z¯õIá”ŒpÍàÓ%#IâúÚ–ËÑ÷©bvIû{=|íüƒé"¬«û›À#B˜˚í}‡¨“ÕeÏ<˜⁄jQJXºt1`WèËJàyEú.∏®¨ã´"~ÆêÃN|+ ∏Kb≤ÓT)¨åGu]»WÖ`MHI^$J®≈¡vTQ+òiÂ¸¬H‡ﬂæ°hñ6∂õZT5ÇH!âúµ°à™QÖ¬p{6"ËÁ˜/ø'…“ì) BÛ„5I‚≠ÿMtö¡ÖqıÚ¿ƒÉÉ»–ÕÒ¡a∫Ã∞y$;·fã≥N >_òô|§≤ÔS'≤`*[»‰èe¶p‰ˇ$'_ø8óÕÙ)¿Ö{˘jí¡Ö´$KªÈ0@ô$‡ïrp&ˇÈx0}P –– #°†◊ 1Hì_∆~¶úµ≠`MçÎ77øyÁ¡ãØ˛ÎÀWõœ›l\˝‰˛Ω?6~yﬁˇˆ¬ı)(±õeÿ	‰ß^“!!ÿ∫ˆÌÖﬂ›øÛÒ˝;öÔ}æqÎ∆∆Î/–Ë@◊û€6ˇp	¡˚˝Êµç{/l®”Q(_UãBn)Ejà?ãÎ;F—5ÀÎ7`„¿˙K˘äÓT,Äû®Ÿ:,§'æ⁄ZLç§ ¨Ÿ¨ß¶ô˝@[≤lî>â”—kEíü°ØD≤pwÚE˘z£†v50˚»EäzÑi l#úîá&Ö9òÕÃe¿˘˝√Eï‚jÍu“ô˚®¿–“‹¿1«p•ØﬁmºÀ»b≈@î
m)tÀê£X)Òí H1S‰Ì|)5áë®õ◊˚öRv|W∞§åfª§éÂéKÁ≥'≥yî°œÊrìÛW É∑ÀNyrg±§ˆq§RxÜìb-¶TPÇ∞©”*Î5CGUzgÿ†å0ä®¸®ıÁ öáëÎŒOP‘P7UáÔ{ÇÄ≥9SÍ·i√g
.ä˛∫v–˛AF°>¨vØd.‹vB‘-¶uÀÛ„yC°{/›˘Ç{xh`ª˝∂H„¬ìáƒ’7ë√4¢q∞{ƒ[†zbÏù$+f%ÉëcÛ‰PåRnaß∏ñ ’É∞ÒiÖñTb•·éù1*	J9á2îg,¯ôz≠ù[=NŒT¢îú0òI;!Q	áY)Üá(ÙµÄ0B(©VÙ‚^Y·—îA-'Ì®Ä}˙Ó‘ÖRR¨∂¿⁄˜ø≥îÉıó ˙>¢‚üÑá0b,$‹ªÃ?∫!7õùÍDn>≤‡H._òcf„√µ
Œa‘F9»‹+G•j.qåÔ|áúa¢:1ìpö—€û◊5ªXN|àâΩØzà°m!"ÚÔô’ùgÎÜOt!PÙ¿  	Ÿ|˝˙∆ßÔCöo\˝ﬁÈ·,å∆sºR{∂˚Ã’˝nù∑8 •à*Q †¯DÕ#GWsÎŒ-…?W)ê%UézXGyºm∆-^∞ßZÜÄøF√2˘|œ°q±∫¶`ïHûËK7¸R ?ì7–$ããàµiÚX67”3ÅˇPœ	K9ô˘	*ˇ°J≈•»¢3⁄"‰I8wKñΩ“9)GK⁄%f1√1⁄1î|4;óÅM¬∞zÛ<6$.evfÆ )ˇ°\6ìñ273]ò˘È‰L>[»¿“W ;.aqSŸ|ÓdvEl)ü£NñY9a¸‰Œô‹tv‰sÛdWÕÛ4Î*Z-bWñB>._|ƒ„¢º©∂äH#ñ+a`ñZ,–x-j¶£Û†çQQ,aŸy+%,hüG¬—S}Fµh÷K∫√|)˙l_€-†ˆU‹Ω^∏˛∞Âπ8‡‡ﬂ¬N3_j∑‚(åW]Ù~eT}Q≠z?Qû]Á<≤O›–≈0ı	B€€ËÄê8á ø¢¢-ßÀp√ÿãwåXÚs±ìªã!∆9Ç3Üƒ⁄•HS´°L`B√A∑¨k%iº¶k«d∂?PYÉC—^œ	 ôîÜ˝Ï
p≠ZzH0íÒÒ∆(ä…ÄÛMÑw ÷1á $+·ìwc¶^Cª£[nØÅí∂û€5o¸\Á∑ÍÂœö.¢Ìˆ›∆'wà5øŸI”»‹úI33ÎÆˇCGÌlæqÂ˛W◊˘IêÉü˝w‘Zü±e¡≈
K‰†ª`ïVËûBÆÈ<ΩºòZØÔf´˙^ƒAÆ’¯FJrEâ%.l≠M¨qhóã‡çNp—ıªΩ;	≈uYÌËvïÿ
4•rZôz¿|\c©ÏB¢√=ózü
L™®D~Ä—k]ﬂ^x¿Át
r®ﬂ7=òÈUo($V)3«œ1FZuhŸâ¬…X–ô¡˝#WO+—«áW ˚‡èœ∞RÕyxΩ˜B©]ÉîˇkTséo©ËË√ãhÎÉïR¡ﬁ!÷F…ÿÛD:˙¬⁄zPî»¯óT·.ﬁë+&V~k5Ó	ö–	ÅF˜µ˛
qŒ‚óz™ôä·†H¿)úZ&`œê1ÀB"¸+⁄ÁoÈ(Û	;ÎIú¡∑ïı$º‘ftñ	Ö*FöÖ~VÖÚ‰Ú ﬂ≠$ºZ˜g/	b`C"P0™%ÚÜê«‡B±Ãy∏˛≠ÓâÅáç“Kƒs|ÅèEΩWòP|õ÷´ÂzÖ≤Ä¢V“Hú%ﬁ~ØÒ˘ﬂ6ﬁπ∑yÎv‡P˘œœÒ≈<¡‚⁄Ï‘`vèFƒ’¡"ê¿(é¬gΩˆ'ê˛f.{47_ò#>Ô3”Öıó±2g:2áyÓI^È¨drs«‡”}8û+[ÕÂú∆∫§Íƒß·Ú®≤«∞¯ *v]«á—v3∆	P•|é8ÑKúbâ{∞ä—3'^'Õ∑nã,‹Òá¯%*ôæÀ£¬ﬂc†ádøÃîJØ\c)pF"˛M*9qe
R≥0bÆõ⁄ãH]n
˘`3Jë•Sux…ç÷·•{áÆ0Ç.ò≥ú4¶î?Gïëﬂ-˚ó]áüô:1<≤gtlÔ>yè·`Ìõy…ÏcÆ);¬$^2˛#?wvl«¶Rÿ{ r-h≠Z∂Eò‚*ï€6√ã±™êjNEjë≠,TNÚµ’Õı!¢{e-RÎ
ê/q%	:jÑÅ'˛£≥=‰Ø*¢!£†QX¿±…û	Ú∑√Çf
§†ôÇzA*∞à‰9ï}r/œ@ôMÙ’€¥:âˆ•Îó[°(ÓB´ÆÏ.‘ÍéK∑º∂ú[®“∫∑⁄v∑]åÎ∆∆Üâ/ˇÔˆ,mﬂ¶›ç≈Ìóı]^ﬁﬁ·Ï 1^m≈Zo”Èá[^õÓ?¸Ú:t‚‹ëKUÍä(0≠ù√®õóøÿº¸Ÿˆ∞ãìÿb◊fAJ˙N Í[œ#¶· Éˇ$Ym´ƒ⁄JÏÁÁ‘¨Át’ÿä~[—=¬8GbV'¸IZ#7,lªò°d?S≈ﬂAÉáN≈ò¢¸õb,ûZ~«◊Ω¥è∂É.©˚Ö–e%Ä–â®˜<Æa#¯ôYÄƒz°b¡êﬂÂÊÑÏOfÛ wÌõ 7]»Œ…LÚBΩbŸvÜí2"¯6¯V˛%n> èÛm€d9¿Õà≤¿O≥]õ¡√‘Ák∂Æïú≤Æª[h>òÖ?fYŸÂ¢é@›ü|Ÿ∏Ù«Õ7õÔ}…w„é=+¶+ÜÇÓp‘X`ƒ˜Ã˜÷˘™ii•Ç^©°Ì,û!?oM¡
à0º¿+%ŒÌ£[AÆ5À≠ÏŒ3ätì¡ÙG FyàÓåÛ
tw‹*È&Üªy£˘ªo¯|1¯Ÿ{EÖ∂TZETıÈ#	ë«Ë˘Û&wa9ª<Q€“Ÿ UP÷nÕ¯ÉÑ3‡˘Ú_Rõ1eõñQ:‘£#.Û”:ÓÙOÒk?≈^Èrπíà*ãêø ü’äEΩÊÍX6ùÂ~Ä˛»_
E|¬K»(`∂(ÓhOL%≈ô‘~#G„‹ˆ‰öJ•p˝¶3'sÃ∏‚8lü'€opü*\üÔtÿ"‚`†æ=¸¯eôƒì†o8ä˝ÕêU‚–|ò¢–^+›h€Ëk~¸¡ÉKW6æ∫’¸Õ◊‹Öw6Æøô}„ÍﬂÔ˝!.Óﬂ˘a≠Ωˇ¸Ê≠çÀ∑õw>!{¸ıW[¡ÔEc©nÎ@∫S‘L†∂*R.8[M´i∂^‘+p—”¿˙{<Õpµ_Ì°„Âçƒ<;pÎDã‚c2V·IA3{∂iñò›â ‡§y\ûﬂRœëzª&l∏#/®ßabgıyFIÉáÖRÚ¿%ﬂeôá∂06$=Tqg/åà≈9≈£~ÒÒ$cC≠ ÿ…WÍ°d≤óo˚™=A‚V!¬¥BjŒ÷îúS3dﬂ!™≈∆ÎW$(U˝¸…¿ë?	¸√4˝‚√Øì)Pá„Æ˘Ø¯∫ÅÓ„)ï2Pr•|ÆQw§BY*(¶»Ê‚Dì%¶R|≥≠ˆGCL,	Ym∆•Ùë9 -Å…™k;ƒüÔ¡ãW’Áø◊Ê¨„w9¿ÛªÛœ∫-8∫H ÁUî›ååˆ¥ëöﬁ'Æ–'DQEAi¿5XGŸÍ%.Ã ‘X˚È·9cŒW ¯⁄iÖsïTâ=èÃ£›=ØCrä`m!=,¿Ÿa…6ë)	e(«t^Ã3}◊ÍÚh “q„Ú€Pàó‰ªóh1’ó-'
3ü∑ló0Á îP……ëÎDÁ€—8ygŸËmÕãî=ù2N«q.î∑∑≈D\[Ü˚?VøÀJ¥:xz˚Pÿ·è±k∏&ßÿ$x–è h»+ök=hÌ¢UHlÇOï4r!C„›ª˜ÔæFÀÕ∑ˇÿº˛ÓÊãnº|≥˘⁄Øwπªä‡ÿ2œ?gM=æé—*ˆŒäﬂ+ÿ∑ohÔi†Uç
"‹Z›Ñ]Èò8È'^}â4ü4ú4ôõáÇïçqÃ!j“ø9àÔ°’Buük´}E.uC0f/î›7r&aÌó√cíSê≥(üÈ¥d¿‚àéá_©…t¯”¿¸Õ<˝≤´°πãZT5	CÖgŒ‡  Á~†Üø±D%lÅ~•ÿ<†bÖBöÀ√ñãÅJ:ò2lù`¢¶N‘ë•ÖïÉ$“#ñzÏj,b’)ãﬁNêB›zÎµ^ıLE¬0’(æe¸á—)H 80.ó∏•$nÏ˜ﬂc—«Q rE!ø#˘¨6>º'zY¢mü,ÎÁl´z¢e≤£ê…éJ1J¸m&É$Õˇ,BX–åeS¬+]°¥∏;°¶Úú≥$ª\4ÎÜ≠∆GTRØµAA%ÙNëP§Cb“á‘É‘ªJ	˛(˙˙∆∆Â˜ºÛAd¿ärÔ7h€.∑ï∑éŒ≠_<íõT2ŒÀöÌnÖmN ∏EÄÓ≤∞ÂπÏte
á3ìOÊgé*ÇSÓ Å\Fn®ÿ˙»ìqcü˜æ¢˛]l˜#eE«ã‹S∞¸u◊Ó˜‡¬µÕo^‹º˝ÀÊõüB.€|Îãçkœo|¯I„µW6˛~Ø˘Êmî¢ÈÊçÊ+ÔnºÙQÛW˛⁄º~∑y˘≠∆7ˇ˚‡¬ªÕœ.ìÄˇ≠±˚Õï:ÇW≥ j¶µ¥˛1Ç”`’‰:ué ^øQ3J»Ö	ÌZﬁ, _uç‰à8Yd ZÒ,,hx[ŸA¶¿Ä6[ËÅJöµ=3≈lDÀ ±¸=ƒ)Îû1∞Ón“Ω=∂[kµöπr‹Îøn¨√§Î©·Å=}k¸bË]{Ö∏B˘πbÈ≈éüP≥%˝•Bc9DEˆ˚ëÆ∆”â’9¡ÜêXm"ˆÙ≠ìljæ“¸hœ–˜˘ûQ—gÇ∑Òçˆ]úı°Å}	gΩ÷#ä2ÀU• ΩÚˇ  ˇˇÏ}{wGñÁˇ˚)¬èU⁄÷[àáƒ)§¥#$V∏›,kRU	 uUeufï÷Í‹6⁄∆∏«¯1è°«n”›c∞€ûnÃ√>gıMzT%ÒWœGÿ∏ëôëôëë•í6ylTïïqÔç{o‹˚ªë™ê…T¿ˆSè$Úƒ®aä ZÍ‰‚’˙WøE]Jz_√›ﬂ’<E4	Û;ù[Ω∏˙˙$9öùöA„π√3C¯‹±ÏDvøMJe(UŸ".rõEÜ'ñ~A]•“P€m`ä¬@=°◊r!<„òeXùÑ.ÄX5zÖê∞ÎDS∞Näu·¿cù⁄â{˜j˝∑∑ÈzøvÔÍâ¶ï0Q¶˛Ò˜∑n˜uHù∫¨~•· ◊,eºÏkkÊ^ãœBÈJ⁄@˚4ª‰tHtâú *W/®˚<∆çÅh–a€¡¡Í-[2KöFÁH:º†∂I+G84ª+é9è©q‘<k`ÅúëNÉ# …£i‹<[ÕîÕÖMÛ†çNƒæd«ö7äÆÇß¢Âûî≠UÌ.´úwLXè—ç†Ó‹ãàÓ}ªÚEÅ`zóåj~@\è∫…πLœˇ~1Ûø
?ÎxæG—Ä¢&ów(À{VS˜6SÄª∆5« UzÔ©æ”PñÆO˛ƒˆÀΩ.fŒº¯¸2knÂå¢2Í[—à≈Q@@'‘ØIõ1\§>iVùT¬DÖ§»h¯áæææΩ˝{NÖKIµm*ì+˚◊˜Y.Ds˝ˆ66$WÓH	\0kòïJ"9§ø˙	W°á»%â ô¢Yﬂ/≈˛ã7{ΩI¯fâg7Hƒ•±¶ΩA¬c£#û*á.‘Tˆ‚±¢⁄K(â{Ò˘8UÆ¨∆U(¢Á≈Å%I”3Ùπ:öÖõ*’Vô≤+éõ	Ú©Ω@õ≤]V&E(<ñ)∑—û8˝≥ùv¢”¥î˛Y∏X
Ì¶π¿k C£ãôﬁN$	k{<#xÙÙºßX˜ ™—?a¢g›iöÊ=Ø≈3íﬂ!$Ø˛1…I•á ™D°ëàl˚Ÿ.˛ô=íçÂH÷fª>îÀOG&
’l"ò+) Sb“ç8YÁ¬9ßU;z2Ä4h÷S%¯§&:çòúÀ‘.[ØBÃd¡DûØ@jûÀÎä¶å‹TˆJ)ÄI·î¶“}˙ﬁuTˇÎüi˛û7+ä2ı´wÆ◊sªZ¯¡∆˜ø•ûrá7D^NÿG(Cá3W∞™´∑ÊÕbœî]$:Üör∞ƒGö5‹≠gÑ*piS^Al+C…˜q¶0\ÊŒ¸`´\V&M/Á=?
≠õ,⁄â¨¬br˝î ˙Ôåâ«íî\Íz~ﬂªr&¯#ØùòËÏÌ‘Ü|È‡„í˝Á˜˜
:≈*¬∞ÏvR ƒ˜n$gØÎÏ_™Gæ&tªø¿+∫yÁ:Q1pÑ"cí/WUÜ˝x@t©Ú¬+dhµ„cBQ5Z—œ9Ù4ZÜºäÔ·M∫MÉk≥5!4AZÆ®ò5#W<éS\p-ãW,Åô ∞	⁄Ü≥3ŸÑÑÓQf =Ùçz0ìÄ∞´¡åXR·º)$5 ^>c—_ÅΩ:Qª◊z{'⁄,¥ZﬂÓfuˇ¡ﬁ∞VI∞¬)7oV˚˜¶XWÀßá?iÇÓH"g6‚#tolKËú5˛åÃ˘£dûxI¬r/Ñ*±{˘ScGéŒ°‹ƒÃTÓHvçé≠æ65ñEhí¶ümÊÜÃ#í£%€ œ/Âß`øÒ·Áıã˜Îø{ù¢∆RÎüïﬁV~ø|+ﬂ7#î+WÛ∂&G-ÿ$≥“ﬂ®ß-¥'\≤{˘¨O…f˛D1¬n>÷¶-¨æìTL≤ÅÔù8	<tfØ?“<€óﬁÙæ4·ûW“ÏNõî¸d€”ÏÁ`:˛∞gª‘Ã]&h$©îå/IÕ-v¬‹⁄ƒÊŸ∂©ÌæÅ≠ﬁÃÓÔÎÈ|∂ùMè—ÓûòQ†b¬øæEe∆™ÿzLB¡•’\ß~Xë6E˝–@:ÍˇÈjÇiAœ∂√d£, Lì˙ëz ‰ëf±f°ÃQ¨°4◊»kde&†úV3… Áœv";ëZ*V∞Ôò„4´ÿŸ'¥7w~zìtıˆ&˝Ò
êpûÌMÜG<ÔõÖi7'£{ì4Úlsr6'≠r¡:gG¿UŸ… ≈ñ€û,Äπ∞≥∑'©g‚G∞?…LÓgîâÕÏòΩâ÷˛Wè/^"´…I£h;C∫–Ú€µªCKªµboáp_hsá¥˝lká?~‰;ò*≥~»∑Î”0ÅéuOû™´â÷==“—3¥⁄rﬁY$Ã3W:rNû@ëπü™ﬁY‹Ã?¥â€±Åü¢ÆÒvV.€˚±i·sFs«Wﬂõõ—¬œ)ò{·Á‡æOŒL£Ò±ÈÙ‚ÿÃQ4í=ûõy	çLNÃLMéÔºÁ∑ﬂ<]õ‹ïn735y'Ô6◊Ø\›∏sß~ÛÕ˙ó’Ô|á’µµ{Ô<>˝ÒkÔ—⁄‹Úmf ^
F¡$âfeılÿê8~‹vx"YÚ∏Î^~iıæ≤sO3u&ú$nëGAôDπñˆ‰s`ŸÀwóiÓs≠jè„iÅ$Ìà‹©/t<™Khı‚q$1Ñ+ÿ∫ç˘s'Ìb≠d¢û¯]Ëø#º≤¯PØ|À:Ë¿Ä©·«ÛùF˚a}›MóJﬁÙ„åæÅAò«p{ÇÇ"ZjT-⁄L{RÅ› ,ÅIùÚWï˛‡ò’öS÷Ùø–qNDáM·j“s2µ⁄±íﬁ;8iB∏±∫KGç¡∆jπF¥Du≤º˘Ä⁄ìGÜpU«.üãµq˜ÕÖ<CA√˛H¯ú√A⁄÷◊Ù√Ô≥|&Ê:jÚ@Ÿæã¨ﬂ'øR=øÏsˇ ôï·eé}W˛Qs≤∂ØÓΩûÁCcU%¨õﬂ∞ÂÍ€W∫—±’[ã∂q„|˝≥/Ë≤©_πzÀ%´|†M∫'ƒÃXåØIM{BTP ¡A◊%¸tº"˘©†}“TP:H¥QÄ¡≠ûÍÓÓ¶kˆiΩª·æSxI?á–IΩ\≥:JòÅ¶¥˙,˘‚èÙµ>“Ïösäws’>x´ôO‚Mtœa¸§‹EO^tÕó`çÒ⁄µæ‘–*ãá>0="€
iyÛ<ÁVçjÕ%`D—S`jLVÃ256ä∂kh•8∑SXs˘O 0ﬁB y^iÄX≠s∆«Ì<Ø7TÄ«FLÎ^„Væôƒ‡q˚ƒàÄΩ?,q"Ë~qAÃD∫}"}dñ	kü†Kä∞*9´%“'{2åj©Ÿ¨Dµƒ∏,ô2¿∫Ëœ◊ﬂΩã≈∆‰Ò‹•¿Ke’n'¯≥‚[.|Û¯√/Ò-#„ì”πQr”a3€ŸIËpËmzmè€O4-Ökm.„ËÿÒ…'rSËXvfjÏ(7:639ıÃñ‰S÷Ω˙07.}∑vÔıây˘Îü˛·ÒGˇ!O∑¿z¨cΩ
>∞ªT1™†åwW&Îî ßÿti@MÙwˇÁ÷{√‚˚haVuË>Åkñ9∆ƒíÁ∆mÜ<MmÌﬁó¯ˆ˙«ﬂ6ﬁ˘¸Ò˘Àç∑˛P˜Ík\ˇ5ÈwËxØ_£˛Ó•µG7∞‡ZˇÊ¡ﬂ^jºs©Ò…Îˇy˛5|~˝˛ÔÒáıﬂø÷¯Úwx˘?œˇöaPMà(3Ù32\‰ò¯-H…ñ¢ÖÖ§A—YÒ◊<ç˛%x¸†rÑÌ¢
VMÛV≈∞\dxS—-ôÇù Û8‡˚{[·w§ Sº»xúÔX'Ãœì}^èAs€I./Y ]ü(Ä.aÔè®ﬂ!Å~ß(Ä?'Ó∏——@C◊Òp,≤ø:^øÂSÌ«¶G⁄;A∂òé˚
|9ñE#Gé¡«£ÿH=◊5^¥ó
ur"G.òúôÑ9LgÁÎß)˘0⁄÷“Ó)yÂkéÉ◊çìƒN'CAÑ‹‚)XNÏ>≈⁄=NÉˆl≠:gc9àïÙ$5[√1À,!Vˆ®ï&v˝˘Ë[ø¢,~,RFk∑ÄË† ªﬂU]«üø…Ø•3«M0A:ÊJ”ÓﬁŒ£ƒˆ–ÄÃ5 Kz∆X`éQb @âê‘ÌBÿ–Ñª:µo‡(vH˚•ŸìHπÄŒóW:ÙéÔÒ»ê7Ü⁄7ÎM,h¬ön2-À	\–˚|Ÿ+ˆ;ë¶tÂ‡ù<d\¿çê5P”¨E!	˙'^¥Gi0o¡¿çæÎ!X∏“ø®¿FÓ›^Ÿ{°v~#0T«Ô˝ ˜)T~G\W'‘/zZªg:ˆªûÈÒi≥m¯o7. >˜\öùxê% ‹⁄'o#ÚeSÕç`÷uå|MñãKm√ˇıÈ{ü Ô\™X"Õp M∑lÇÿíY¯ZOP˛ºıNÖ¥qD#ìá«éúò R çZ\$≈bâÑí4FÊéê∏“£uB%π/äº…ô’/´µ¢çÃ:>5f{k„›7÷/ˇÀ∆›/7/>˛›G(s|¶CÈUWÔøq	≈≤KòÊBœDÆüëëj
ΩãﬂkY›U˚ƒNVØ¶π>eÕä´kHi8R¥gç‚®ùœ¥ÛÔÉÌ’›:ê;Ø>˝Ê˜¶Ñé+πfGÚÕ1R-¬*ë¢ô_6>∏ËÒÕ/èn7ﬂ¸ÚËñÚç&ß¸ÚhÛúÚÀ£œ8•úB|„c£9Ù‚ÿ(ƒ¢“Tî!'ßdÂñ•Ü*U9óµ,¶jÎ¯uìqÕ!5Êèx§ãx$ÄË: ¸∆[çO~h<º∂˛Ÿ˝˙ùGı˚øOÿDV{’√°LÅΩ†é	Ï'Ÿy˝∞´±PÑ=^¥
’πï ¢Ü[¯ìÜ∞q@BH•ÜïFzÖ±àØÿ3(øÇóXÙÖZ+Øƒa/…rãÙ•)©EÓlùÃöÛÑMD8ùã&pòŒ<myÊà‰ºy`8ü˙JUYÇªdI›¯êƒpPáqd˚#ÁÊÌ‚ÊD´dñ]Rò≤dX∞S@∑p;p¬E&~¯ÍxâEÊºYåy€©“˙ÒEc	KÃn–WÔ|ø˛ËN„„o1„BqN¬ k>_˚·ìçªØ¡Ê»€˜Îü~∫vÔJ˝Ío◊Ø}⁄¯ÕGı´7Òø_¸≥≤2gÇh…z<;ë&_%Ú†
ñWpÌ˚/7Ø“dxòí≠≥~âıhuÔ{¢§≈}‹¿›ﬂ“v`oÇ∞›£ê∆û¨øíÆº…∫3#	)|¬≤ÕüÚ!‹hESS"…Vo¢’[éI`3Lè7¢‚ÕÆ°_’ÃY€µ<á?ò}xÖû-€Ò≈Ó<Ê∫ıÊﬂæ˝¯£?7æ¸Â2|Q’@ø˚yè_ª”x˚Vì"è’˘T∞ Ã˛è”3¯œâô…c´ØÕåç‡≥ìDÊVØèä‹.‰1rê‘RPπ[EÅ¸¬:ºdk‹=›É<ﬁæ«4‚–ÓSDtà˙ÌCTe®∂TÜ‹„a´√wöÛH≥jweIÂg(q,†ˇXˇÕm¸Ô„ÛøÆﬂøñXÓysLaó)ìjÄcÉlD*†o ¢1lÍóVoA)k PaF¡∑TÒ;t˚/±˛çkﬂ3=Ø1o^®ﬂ˘Îı;oØˇ}ø∆ØoCpƒ◊WÎﬂΩø˛«ÎWˇ-±>∑N)!ˆúä˙¸úôe÷^T`RêKÃ¬ÅexÎ√VUÓ´âÍ,Ω)Œ¨9ÖÀóõ√PH%üIƒY™\º!a∆Z ˇä•2◊à,bV&ïõå7#∂.=3hz$;û˚…Îdø¥Ì(d∞5aÆﬁ/ê≤ÃÑ)(ß§TøÿÓ•Dˇ´TËyèû˝Ï6~oP#S≠7»q”‘Ó⁄!=GJˆÀ\z ë7”y£h≤¿ïD~_xµeÄØ:⁄6L&¸©5 ao˜Æ¡Sºª_zÅ[5+–FØ4ΩÖ∑’… …Ü°`π ≥ó,ªÑJ¶ﬂ|Û
¶3N5LÖ	Jbò&=u¥/¶é¬™ §[ŸÆèΩÄÖ$ìpﬁ*◊Œ∂g:≠“(oóÌ£n£÷*`ò§ÃtµçöÆ;ix˘iF2∫»≤mÒk√)¨„â&ÍÔ´ õJFπfâ∆LîYeΩvÔ7Óx˝çàfÚ¯¸Â«∑æk|Úy„Ú[p˛´◊ÔK^¬ÂyC®-Î`m⁄” ÷A≤√å≈óQï{ﬁt@œ†ùâ˜¥ 1é`÷B?o}Ä;Äæçª◊÷æz"€ÚLØvÔúÌé±Î,°ÇÌ¿hLŸ£≤˙Hæπıo\o|ım˝ Wçõ7Óæπ-õòª∞íËº2É/~rª/Ú›HÎ@Ω√≥}è≠ÿ!‘≤E„”'Få⁄Üå°§ôMF$ô~™òIﬁÍ;fS‰ıõ7>˙L<+ı˛M4w|c«ù≥|⁄*.fOSÔIΩ¿ﬂ‹>⁄cÉJ{¨±[lPfã©XLÎt4Gƒû`§eßß«&≤3'¶≤hl‚pnjlr
Fê≥Õ#[ºËa˝∞¿<Òõùµm0•¬Òıª<æ≠j∏Ω‘|`\eY∑S%0bÏ™Ñ®’ÀsuÕíE5<tË•QDîct®fx=öwVÊóG—4^ü¡RËsjrèº©∏¸+íº'%@RÏÈX¬Œu`
dëö£åUE¸ËJ≠FÏù–»Dœ°)0^Àfæ√¯ΩyúÓˆ˜@?¡e<©IüÃŒåMA«&G≥„Ë0¶H G8sËƒaL£hz|2LùÀ@åòßãv5/[~¨EÃ«VKòÆ^Ù*ÃAÔÈd(jb–˘WzÒåˇª&.¶‚äßqÉtŸéÛç¿4¢Q√ÿ"˜f°±Ë≠{ó∑ü$–Ìé«WÁÃKKrigv”©Ë3˚˜ÃûF1Ç—<˚à*±tëÚé<ÿÒëØ0ÉG±-Éﬂ!Ó€iCóKmP”“l \TJÅpﬂ2K,R6∞ã‘´·S ˘xôjq»^4# [ ·*pï˚‰‰>éπ]qòüp$‰Lƒ¬¶SÊœ—ΩêıáÔ’ﬂ¸3¯ÑoæπˆËJ˝ìw±•Bã5àK˘∏Ì≤Ìl€™ù=k:“¥µπ]íW§ä!|é‰•àå±1µπC±.“-}èF0ﬁm√ÀÁ¿€bWis„`¢e8Q÷Ìÿùà?ë∑ã ¨í¬':≠Ø: ∏sBhŸ\–˝Lã=°Û(:Ç˛ÃPtfÅ~˝ÅD›«0"ÍWàÊ˝Dè¯{àÜo7ﬁåü8ã\lë≈J{	#)˘‘ˆ¢•”∆º	„∂"Ú8ÏPhÏŸ$è
∂Ëä#Ùπ´∑ƒTeö‰Íˇ“Æ–+Ø aF±|y¸Òõˇva˝Œ◊ı´| ˇı«(J¿ƒÍ}¨~€û~ıè£P¥(º&*õ+©^ì≤DR®4Rnqa•Ûƒæ}}ΩxY7«º/a1¡ﬁy¬&âã¡)r˛ÚÏÍ%Øëø—≤üöÜ∏)#π—
r)€ãñ–-b)td⁄¶rû»∂H(IÚtpÇ>r>ÖPÆWíˇ$Ÿ#öF¡"/Û®–ÍÇŒ9ÿ;:f0Ôë4qlå˝ÿ9{„€/÷/ˇÅBM7.}∞ÒË˜¯∞8®÷‰„O®|⁄…ﬁπ>j+sV≥  ù‘ÁrxmxÎ-‚qØ˘(áÔ4û&ä€÷±+≠‹®«≥R$‚ˇY√Z≥UdUy‰ª‡%Ã˚Ú©∂(1u"ˇTÓ$ö>AŒLõFæé◊kŒúy©ÜıXR6âﬁ3òë‰˚Ë±.Œ¸5ÚãõÇQÜSáäÄq»®b›j	«|Ì¬iLpÆkπ¿wµ¢IN≥A<e]◊,Õ-|é¶Ìóà¯RêIB#âÛ§yTÖVòZq’‚˙6	ÃÔ+c{ÙXùx€SØvIà†w«eÒ ∑õÕ|¶Aõ·*'aÆ$?V»‰ı: ƒM_™K=yjî&Ò>¥⁄‘Æ¶Sˆ¬ö¶hU/†iÎUSk%b`à·ãö_ÑüË2,Ö¿˘Í~˝ÓΩêr£FW_£dîÁƒÀ≠r¡Mâ¨Ä.L^¸⁄vı∂££#“®êÊAxB⁄ıoá≠Ä—¢{[¢ø**'áµŸL”øI©Ÿëõ˚{œ¥√øÍUY‹)7*ü^&•‡õòI©d£ÄRÙ„∂&ïß†öéÕçMJÒø6¡ú‰œÿ≥ÖÏI¶JV‰ÁÒ≈+ÎwæFôë9”≤‹ù⁄î||2˚K˘S÷ˇpü<Â§Ò™˜r}“S4ò^rZ®w,€ò‰H}»%4cïûÈ˛âk°]}O›⁄√èÍ.≠ﬂˇÀo…4“/ ∏-®‚Õ »†â…©cŸÒ-BﬁSûâ°Vä°©±ô±ëÏx€∞˜)•Ñ9:v‰h€0¸õÚFJ'm√Ùo õ«'_l∆ˇ<”N∏CbB\¯º~ˇΩ∆áy¸·∑XN"ñfâ˙‡ºQ0öíƒÅ'ÈTíO‡¶ÎÔÌﬂ›’ªˇá˙Ü˙vHÌ]Å0ÇzüKd	Q8Î6#á¸<ÂÇh´$O!UBΩ‡≈c”ËòY5H.ﬂ(˛`≈ûºÂ–Vn¡(ü%sœüƒ«9´=ãˇ7È∆M\üû2ÛÊ,$hUÌ12R\RTH‰èûπÇ·Œ˘∏v>¶ö3m0àÍÈåE>
J,˜E¶›R™∏J©tí"»$ASjÃgN_VW,ÓÄj÷øy∞˛‡”˙›áXˆ≠˝p´Ò⁄]"Î∆ $∑nıíxèeﬁ$¶
≥Ñ2¯û©‡ìá ào–™P√„àFπE.Eﬂ™
âÛÄÑj≈˝åTosË∫Ç¢IÇ–?.¸c4;q8ßå+DR%€år®‡û›Ω,ñ;Ç*©Ó¨±g¡¢—¿Ö[ujÂ<>ﬂ∆JP«ßDëõ%ûC5j]B∫™∂N÷Ú≤@@>%Ñ$1ï.◊¯˜[4Da‹fAyˇÔ>Ñ%êÔ:†Ã;ìˆ<Ç„àPH{t”ª„…R[¥ünÍ˚‰Û∆˝w°‡yZsÜ,;M—›”@mt⁄“Pª„…R[LÌ{ 	Ôùœ◊˛T]mÁﬁÏ©#=é‚RêUlF∑õ¬íÚ˘Õ-°cµb’Í [ÄU™sS‡]ªX‘å5Ñ
1ö÷I•ÊTäÒJÏ4À$aﬂxîeˇ§‘L—wœ6)ê“¿a}Î⁄Ï$$É¥ŒÃ7ñbµùõ7r¸»À«Ø‘ØﬁTØkﬂ?˛”Gı˚øW∞E0∆L.ÍíUO¶ød|˙°Ωj∆ˆQßbã ø˙ƒ"∑aé≈œ‘¡®uû•ªhñœUÁ+ıµ.„8çM”ºÂ÷å"*Zn5uÏêÔ$‘®!x[ºËƒ_óTﬁ rKÆM≥ -ó˘≤fÊ,óº$≤v°…1,	M·e˘zz`BïD·®o™äÅ==bµ=î{ √	fb√Î%V5?áﬂPŸ´fMÚd,∏°·©
∆Œü∆4w*°0!ﬂˆ©ÿ†ü∆èK*\‡@úL4?!·LwC—Ü‰{¯ËbI\ÛAŸ/›U«*e:"q»XÃ¥'>óãxî«Y&µ¬BFa*I-p[J	€YI-YÓd•jïå‚qLÀµ zÓ9æ…»œâoÊÌ∑´∂˘ì·˝‘rˇxR+åò≥U(:≤ÄFÒ2Âc”ì”U„on•hU3Ì3ÌßzO+€[˘π∏Ïïwb<°b&(È©ÊΩ/~¬ÀjVÑ	±çﬂŸx2@
6‡ZiÜ	Ç€õgÅ†ç1@–`ì‰œΩ’&à?h%%ÈÅ?¢@5q{€?⁄$Í/
X÷U∑)ÎÌ)Ø…ôûaS-ö∏%åJM®¥#–6Üñ&—2ïêè√Â¨á]ΩcƒO kñ{DZ¸ †%tÜO“ïÌæEÅí¢yıaÎ‹éGŒ«≤~√á™ L:o•*ìºò	VµDŸ'≈¨É9ÎL£72ú›õ"∏*@˘¶)l_çÉ⁄à~Üı{ù“g§É√ÀäQ),.jª˛á˚ıØiÈ«ì∆9(d´·IÔ3·=:û˜åï∞ÍÎßvÎtHËOÙdì]4ÕT•◊§QõDŸ<HÿPféá4›ÏÚƒëY.®pu≠!f¸£>ïã.)£°©lï‹j√¬:ã2|Îﬁ8Ï?Ä˙:ò≠¶∫?t/®ly3≥N:q[™FmÛÁD1Igz;ˆeóvkBuè=Ü’ S™éõ—˚¥¥æ÷Ë|õ◊¯6ßÔµF€kùÆ∑iMoÛzŸgÂÔˆHíÓ§€¸≠AòI“ΩtÉçø7FI$Å®_;>~¸6Ü^ã)4]-=W®Â2ÜV‹®–sÖ…\±‘™xÙä≤Óàßáº˙4 ö»¿áÁ]∫˘¯_>´?zØ~˘äßíLô%Ë1JÚêºƒ§-¡fπKπ.Í¨ä⁄k‚÷ÆàJ_ Äüñ*_‡Êºti=tiΩsO¬3∑yØ‹Ê<r≠Ò∆µŒ∑i/‹Ê=plq∆7™ÔÙ'q§˙^oq«J&ê@|qRÔ≤'∂ÿ:§JÖÙT—≤å1 $ÇA¥É$Å6∑G“”5ÿ6ã6≈ägç¢kÍ∞\:Ê“‚!=v—cå‘,∞çûj˛UjÓ\∆#vÖ:5˜Dˆ'6Ú|’ºa¶añ=„ÒÒ#‚ç4¶âÜa“îY¢É[´eípÒ&âÓÔÅ¡∏q¬yLõ≥ORf˛ıY"—%ÿ6A„ÌËg(#R‡•N∫ü°><)˝D˘Ã¨<TªI0lTfMi$3ˆπsEç0\Ê!4Ê"∆zàÚûvÏî:MGY•Üœ‰câ úøÍesà•¡í| j·5Ä*úü{•À¶# æ»á®V(Œ†∑ë’j4§ò`åbYß@E"%/ zŒ´WŒ9¸~öxÿANT2èâ≥üî—B°ä—G(ÛÁ™•‚a€	O©¥j`d€LrMSM6]¡ç£H´~»Ì¬í	ÖE»»Ze»LK	UÓ|µvÔ~„∆˘∆GÔ5Ææ[ø˙¡⁄£+ÎèÓ†ÃﬂÆﬂ¢xP]ìµ*Mp?fÁläyJdµA¢W6ï4≠_õ§$ﬂëæÁóüA¬˜£+k˜ﬂ©ˆA˝„oó>®_yãÂø?|ªÒ·Õ«7ŒØ=x∞ˆË˝ı/‡+Ô]Y{t£~Âõ˙’ªÎ¯‚w>Ø_º_øˇﬁûß.¶‘…˚ÒÅ»t´´∑P¡tÌY∑Í‘Vø,ÿPdX√Ä‘kÜâ"+œ[6fÁ&∑JrG≥d”¨™Ó‘°ÑMHÙC
T/≈.T•
"\óû⁄XÌ@Kvü5â€ä¢/%∫ñ†|É&öï_rA∏Ìgé_’ƒI•~mÜ&4í4†Ñò±πD¡0†™Q—êÅâz˙ÉhGìg´…¯øCŒ6ÈVc™çv/ƒÛ†ßvÓÚ	¡Û]Ä≤C˛Ì8¯âßΩIôü-'2H$ãÍ)·%KGö7Œ≠Pc_¸(∞˛öêèˇú&4P±[=Y&∏pX¢oIY€õá–DÖAÊµg‚yXÇp©‡}bÄ$„÷rÎ⁄ü‘ø¸àb!≈˘D^çˇ"Z ˆ˜@
Ô∞∞‰ÜÙD0e˚{Jòù˝€Ix√T.ã∆«¶g¶π2P=1;6ëõöFŸâQt27=ùüÊúeöëb^2ú¬?ôK ñG˜T‰á”DnD7J®[Öøê‹ˇÛ»Mp’$oﬁ∞ÒMXúΩƒù…∑sˆ¨ˇ°ß∂†&Ñ~y“Õç<„,ª¬ùsÒìÇ´ªÈÔô|t˜"Ú›–√±zC‰eº(j8¸<zß˜Äi,˛Úsl£#‚#Ç+ü+’¸‹H¯˙LûCK¶ß:‰\ë>ú8(Ëëwhœécªœbﬁs˛√Y·ıöÔ7Çó”s∂≥$~Hû˝~L¯˘Éÿy¨¬qßW:8¶Ä¨ãÂü˛4o∫xí∞Å‡ÿ%®u¡M3V…ÒÀ%$°êZŸ˙UÕ<…n>Ä† ‹R74^E4mV˘µR@hpÑË»ßõq∫°Cª
b2ˆù!DMuÑ y¨ı‡Í‡ö~\…IM{Éj%ª{#’J¿ÍJ™uRâÅÀ«Jò8Xœ!5˘⁄%\—íPâì¡E˙iÆÎ‘ﬁ¡˘π”ë¸+XDŒÇ¡5g
fŸsSD÷à‰(1a≠¨â≤∑7\%v˜I9få¢v©îÂ3\U•YîN+àç÷åTb:ıΩg˚ˆÙßi°òH†iP™)$*,Ú*´G≤n ñπıîP©@’ºYHvKSÆ…+™–∆Yµ⁄^©iø_ÁQ.f≠¢ﬂãä†ﬁÉË†≈Áòqè‘’◊”¬S≈ñn∞˛W†ˆÊÕ7Î7ÓØ?x≥˛ˆ‚ãŒH6îÍaíÄ^ïu<7 <ØYo•TU§!K«VÚ∂òäOíƒ8ÿ”7±Í·òÂºe"€Â<	òLT6Ê-|∂Çø˝∏®l#(gï1'ˆ†∆ßüØﬂx´˛›_÷Ô‹Z˜Õıó÷ˇt∑˛ÊÖıÎo5%˛˘ÌçKﬂm\˙ã¨7C-ÈçD+‘vI_¬%nÍOá◊5≠2-ïh]_ﬂ#A≈cÀ#AÈ1„LØÀ~N.‡n«Æ“¢i¥ePÃÖ<ûævïÿáÏ¬Ã®/Pπ{±v∞TæRxHíÔ“*yLlÒôÕx}ÎÎ€€øÁ¥o&/
k¿≈v˙√K6à.úí^±UﬂS,¸e=©HÈî6ÿÄ∞Dì\o∂=⁄$”;ﬂ=æxïyiºÛ™hv∂
∑"E6“‰n*ÂQˇjX˛ÊIg™K›U{‹Üí€ﬁŒ˙äNµQ` Ä UlôòôrŸK…ﬁM&1~jÙAåSZa”«ïõÎ◊nØøCKê?)IDØúú Ø}øÂ3°Uî¥ OEe	/ö~]9yÚS»>ÄˆÓS)%Ì|p©ÁQ€+÷F›nÍ¶°X?v™2ûhO(PÙÖ~Â{Cœƒ˙CO'eUQçﬁ+æÍ?≈;¡?«;{í˜√Ä,I
¥‡e˛›W˛±	ƒeï∫∂·Ãr&,F ë˝,d°vœ eÅd!RBR®îÙ)]µ∏üö‡ ◊.‘Y'xÿtQ!Á6≥†¯<Ô€?d≠ªª…©`Øn9N⁄âúƒû-&ÈiÇÄïMPÙrñ¬˜jÀi¬WõE@~g û£.hÄjø˛∑>Ù£ßå„tìzƒ.bÉ4çÔ/ £ë–Ø≠%o•
KÔÏÆ@!/%tSùu˜ˇ˛_‘+ZA∂ù¢í¨≤»Æ»:¶°YuSûÔv\Í2jFÄ∞HÃπ!ÚŸ±à*∑a„ºkÆK¥/	7œV—¥U0áêÁî6 î-@è∞hº∑Ãìä˚≤–uj†üB≥∆`}D’@•≈»ºæË	Å˚Q",QCÂı©˚{¢æÿ¡^Ø(µ…uπä¥-°«ët?\ÎX‰]<’◊CôK´{Pcqûï ëŒMœYïìP0EîÀ$W…ô	ÍNbõ(≤’/|≥Ò⁄5Ê∞" £—ã‘	›Ú  ‚À#§Îï™ÖAc˛ˇ>*"bºÁ®BèB€:ujæCU6éuÖ‡<ÕØƒl¥ä˛V,GçÒoDuWÿ'b©J$ÈﬁêB]lÉ¯eâ ~ŸÕ¡&é ˜pv9¡Ç7"î?¿ b¶j8¢d7’÷\3ﬂ¡¬{Òåó´ë]Ω»l
≈@é‹¶Tl}ÎM€IF’#»%/JT¥æ*W-0ÃÚ\≠D›–»$*ì ó’[x-Ì∆"d„ÓÁP§˝”Oæ’∏qôó(^–ûFC“d—≠A∞î¨{∞ÓÎ$•∏I3œV?ıÍß°[&¨Åq˜}÷¿£`∏¯M4aœÉ[o˝_l‹˘™Ò¡W˛sÛ◊µvVr«îÁû∞ö{ø7≤Bﬂ=kZ¡(HZ„eüdûiX∑Ã∫ô-⁄˘WhÂ€aa¡t\Rb]~L:¶»†Gr18îEïÈ¡ÍÆîÕ¥«
	(è±|Äâ–›ôp1EU◊h…ò_–⁄Ì}˝ªwÔQΩY\€Áïñ JƒY	Ê]°«H√ÓΩ@>»7j¥∞YïO ã¡Jí‡êãoÚ´V≈Ç®f†≠d!VTrR:5ëiêWÓLç& x(ƒ™"“d¢á“ê˝f	XAöB⁄ãëπä∑∫¢ıE€—ë„Pa˛&ˇ6ëÆæ©¥â…⁄ƒdB•S÷Ä¢¢òwÖzÒxbú¡ .„’Ñ`¬o%cê'mí5HÊ¿:/2 K?aB…§):gU@…ﬂsæ‰æ©U¶oØ2,◊7Û˙◊Íó˛¥ÖÏ‰Ö˛né°ºV~“,u$7%'…`©Û◊◊Ø›nä•éONÕ`ñ" ¢Ìﬁ›˙’kÆ•©…âô…óG&«s3Y‹"˘äËW~£©∆Gs„c'sSπ—∂aˇ#4˙◊?Ø›ˇlÌ¡G?Ú5èxa',º˘›ÔÍ˜ô[eyñ:¶6«±¥çü¶~8—ÉYˇÉ2ÃÁÖYÏ√õz<∞<œ9∞Á’ÓÎ”©ª€*¨xì:OwáΩz=ê;.…”∂tUï«£“#îé&ø,NIâŸû„äãÍ	ÂÆy'E˘kÅ◊,≤-¿%≤n3n:ûrH6[%Ô•ÚÙ~2-Oz¡ªt(¥FÿY&∫4	XçË•Àâ~Q˘osãy,ê«J€©ˆ@â` °SxÊ«›ö]LuÅ‘ÈäcwŒ4´-wÂé·Œ‚eî∆g“â«JÌµˇ®˘Ó∆≠€çõ1ë6.ΩÀ*®FØ’qÈä“Õ`òÌ2 jQ±œï6£ÅDC2¨EŸ®dÃ"Äx=ªÔòÁ∞í\+‡s,ìÚI!Ô;∂K´˜ãU´RåÊËmÓÍ7hﬁ|vx÷ÓΩµÒËQ„Ê≈˙≈7∑o5>˘°qÈÉµ{øY{xìéÙ⁄Éœ◊Óùo¸˚≠∆˘/ﬂ‹Æø˘v˝≥Îk˜˛Ëã	ÿíæ –vΩä4k∫"õk…vµúÍò‘7ÑFÌÖr—6
Ä?^.ÄÚeíXëá&‡GíÓΩgx-k·–6±2˙Ç¿_˝≠ﬂ≠[õX˝1o˝íTä©Ì%R_¥{ƒÏ_¶ø&STˇ:Q!ÔF≈HX!≈Ãì&¶ù∆MájC–Sª∑Väñ˜∂ªUé6<≠üz™R‡Y=Óâ 0…†N7õã∆◊–öÿµ5»òBı¯+Ùrçº‚À‰ïŸB’Â≥òDTW˘ºY©hÎ^,∫ãù˛®.L?*|Ë´í–´Û“F-∞¶v~T F
”»óøEc	€ÇË\”XÑ§:DÕï‘°$MG÷ ¨•ÉÜ(Ââ`’h°Úêg(n§äõ¿è_‡LPsU“¸8+Rè±X+$^Ï“áı{Ø◊ø>øÒ≈oøNË=vù¯[)
e¡a°ÿñËXÇì5e\ƒ$)v¬˙¢·‹E˛‰^o”à#uµ¬˙€Ü«0˚‡w∞Úê9“l,óO6°%)èç¢Ln1¥aMÅ…Ñ?lÆÃèwÚÿ.oKßçnEv"∫üHˇ¬¶‡≥	L ›ûkÈ¯{˚\dóÍŸ∞á›ﬂwjÈ»ìMåN‰ot"≤A“››˝§¶aÜíllü‹ü∞K&ÿ· RCB9πÔõìÚäSGo™Pß»ÆÕ±†JùJ
ΩÄ8§®cVbNI“C¬94Ò„Tˇ ’RŒ…3A§i¨[êB{ä2ÕTÕÍñ¬â)=®∏îº£á‚#W]b˜t"˜ÿñEKnPà6†¢†Z⁄ªO|Hûä⁄’‹<ûl†2çwƒÇ<‚ÔﬁXˇˆw4‘üi√\"æ∂-çk&ÕˆW•HÊ7)Ä/˜ßÈìÕï	GŒ ⁄ƒñ5ë∏°#"ﬂ¨YR‚ö–'(ÓΩZ¥á©Ω]©êƒ·m Ï¯xÇ‹üf†˝36Mj\>ﬂ∏qôÜ`QpD˛Çvç˝≈÷D	µ"B(ÿ«l±ÖQÓö$∑p#?5ÇÛUDBRGs$NâEÂáØiÇÏöå§iMM34©[UÑŒ$«Õ®∑¯õÃ™9T+æ‚ócù±Ì‚l:≠FË™ˆ‘pÜ†2K í˙Â≈¬QÇßéØò–#*ö–”üFëaæ‡E[ÅBØ•U©+&¿n„Y<˙/”Y}Ÿ(_Æ⁄˘~Ö8îjPæñ§™	.0ÁMgâ¶ÊyŸx\ûÑ€mïÛ≈Z¡t3˘n´†
5ââIUπÄ(çñZàÇØ∆^”+öEÅÕÄ{êb~(|ΩC'‘{º:ÿâ_Ìtá≤ .‚!’¯÷3|è‘e’ëYtM≠∑Ùzã€«/ôÿ˜Ê:.úoñ´i†ÒÁ∏~î t†~QÈoz7=0§h≠å8€˚;ôæ˘Õe≠x`êà/°á.ﬂ—à‘¬1™(÷ í0Å˝à‰ Ôäóƒ†èË*€eπY◊Ä%Å∞$‰A£Å™5∫x·ˆ„ÛóQ& ñQâóë€ÉûóKùïé3j‹¶ÿs7˚8˘FÚ>î'ΩuAY†xO&+“áÇ
ba∞fè‚'VÕ`p4∑¯‰EiÄ·πΩ‰EX€ó¢píûí⁄D¯Ä:®sˇåÉuÖ~IÂN≤÷^rn?ÀA>≈2(RPÎºòYh©¡u:>7U`ù4a:u‹	)ˆ …ˆZbXI~åAO_,Ã Œˆá¿ﬁ¬‡âÙú`4Åj¬ a¯Y-àBô2œ:¶;7≤–È–êPNc∞z˜îÿ ∞ıK!ÅY•ú–%õ»lJÛ◊rØ
¢0£ <dsAô*ÎûÅ^…: ÒÊÕÄ˛î°ôUÚ¬qœ°¿"‡˛ÑÃlq"/‡5&ƒ5/õ+¸ÜFAA@U'4ú*xòG∏ÿ∫¿ä>©∞ıïe	aÂÑ@…céï‚L¶õÊ|àCäÜÊAG(ù
–¢uÒ†˚z°E§Öƒ<uÚ∆ö∂=vÜ¡EèTf=ö1æÿã?aåõ6ƒË°eéÒÔ›R£L˝*[fö±WO∏Ba¶±ŸI∆=‘^Ou.µúa∞Vm√á∆õºü·∫Ã~≠ü&‹E;Ù¢·òsvÕ5õlf7mÜmK7”ƒ>⁄Bn&ª©˚;¶â†vpì/¬ñ‹ªT¡ñ1&íÕç+ˇ›\_∆Ì¶{¡Z8ÓÿòãJ4Ûa3î◊6<j1âl-ÿéë‘÷≤ÂB}@XºƒMÔÚ&Œó:™Ñ™:r5V©ÌØŒ:?◊¨zb-ßk	±~"tÿI_UÅr9T]3KVt#uO‹˝2†ƒﬂ-˙ºŒﬂXJ\Ü’DoÌ–Aø]í*»´à·‚|[º<XiÒÄm•GÇÜ¬ı¨ÉeQyrºg0å.GN=QÆ¬ë†“ë)lR)$≠h)Üp§S·ƒ„ó¥‰¬—Ñ≤GÛ
2EÆÎÒÔuZKJ•ç©:ï¨8YÖp±3¢ekˆQ„™D’	é®>¡°T°‡¿ÇZa¡“#·g≤∑8Æ»ÄÒüÂÚ>SÉª˘•Ï`bJ6y^R:GpË!õG4Ú†{∂ÃÌ
¸D˛àq=uÊù®Œ”{ÿ2ãÖêHÈƒπÿﬁâR%ı{G‹íP¸&(Ï†SÌ◊1{æ!‰º):öH¶u‡ÖFk“£ó‰-HÜ¬Í¯≈'∞+ŸµÎ˜(ëﬁ	oipèoC4√D∞ú∏ŒÕ>Qù!—((⁄óÜC⁄K´Ü¿∑v¢°’ú`†ÿ∏[.Ëcû2—ê& “Ôçé<I¶8ñ'gˇû◊n¨_:VﬁH›O∑»úzπ-ù&Û@på3K⁄Q7,¥jË°áÁ¶⁄;®¡p
´˜˛M:§G=ˇ„Éá¿Á·eÓ±) Dº#Ÿ›H∫ê)‚∑◊j1ÃÄDò	  |Ω¶Eë£‹x˙ J¯Õ0Íˆ/àhJ∆m‘∞8ÒÌ—¥Ç>ebı)—∏"˙D4/Ò¸i≥´≥¸Ösû.FÚ…ˆÈ`(o*ü'˘~ˇü8?ù≈„@Üa{ò {‹3Œj1g≈¨j_-ÄWÒO!Ü—¬ìÒ,¯€h?q∂Ã±=å<knÂ¢ôÿ'¬eäÍßÕa4n{∏ã>Ïgm…¢uƒ∆që•éõ˝'¬Ç£Òg¿¢Ωmã<ÍÛµö˘Á†–È…W'Õ˚aºPh”Oú+l,Ú∆v≠É‹üÒ„V™ô—©}"ºé˝˚â3[5<€√o·á>cπ≠d9¡?ÆÛ íŸ-mõ<8Ç`>WgpìÍ5áü;ò·»>í^ Ω¶&f⁄w≥¿˚ßˆD≥M£ë≠p*zè‰ÅÆF±ÿ∫ aíi2T1◊@Bû'er§]¬ê´"Æ…ÌÚ†«E”ä§'çí»$Æ9!c»‹.Nc∆=^T˙∞ÈÎ_âQQ Ë∑7EeÚ6©A¸Ω#®µ¿◊„èécb1T.ìYÜﬂ,íËÿç?6._øÙU˝ÌÔ_∏≤~˝=¨}ÔJ˜ƒÑı-â¬‘‰#œHÓ!—˙≤åTí`πyî@ÒYÊ]3äË∞mWÖ¯–¢⁄!$t2f§ºvÑ ñ>uNk<èí^¿‚˚£$"åïOND>3cWÒqïºápÔõ®◊ŒUf˜	2c∫|ÅÒ˙ÖØ7€8_î‚¿FluˇœHı≈Y.π uˆ¥LÎnBæ·ƒY∫¢4x≥≤à°a-àXSô‘~ÿÃœA˘ÊÒá_
¶ÁÚG∂˛âÿ9ñΩ9·/_+<™Ïê¡YÀ)ç¿üs∞ÖNt[ÓdÛthçä°|XãfYe<Ö$]≥N”rx∏{ˆ¢Y¸∑‡ÿòáxBì™3T∞ézô®Ú@;˘åy6s˝¯#”¸K∆b◊BW	j5Ïˆt¸∞∂ïC1zøˆÉëã…ßÄÊb˜“™Hîci¯·ÿL^t≈ƒ÷˛πÅÿí>ÓëiÔ â)J°ãÀ"ÿ eÌH˘Ì‚π∂·ø]ø˘˜{WôdàZw’™#e\ˆ˜ÃDﬁ3^Ü»GR”"’á‡mw#ªb‰≠ÍR◊æ^DFõ¢ÏW≥Í!ƒ^3“∑íÈ∫ò{£Ω´D:ß¬O6Àí6>®í∏@·ª%á°≈ôI6a]íhın†GO–#i±F·O∫ì4≠ËÉVÌÓé∑+,7∂É>äÚ$«rS‰W?h¸Â√n§gc¢\*»ıh!Lü¯G˙=£$á∂dj†¢B±H∏.
Ï≈¥#IﬂÖÂ˙≠;w>£CÈù÷À§Â/Ùï[ˇ@ûÕéC)´#ììG∆sh˙h.73ç^@„ì#¯á‹/Fr„hÏ a¢Èó&F85yôî}sâ›ÃBŸ«/î{{∑e°ÏW¨îò@∂g•‹≥M+ejê{F¶hõx5ŸÔÄ^·—*Ì9£k¥>Pö∫‰ d2≤¢Ü|ïOwŒ± Øtı
›.Ó|ué∞%-,ÿxˇ´∆ï;ç˚Ô˛˝·ı˙ç€Î˜@Gl˚\—D”Ñ±≠ÒN„∆ø◊o|EKDıåLü‰ÎCl·k≠rﬁ±À÷´‰;÷?∆Ìs´_»é!‡Ó®†∞"6Dò3gç¢kv¨ƒoïV‡=k∂Kó©r2Tù'·ø›x?çSR∞W0hó ¿8¶◊`·6Y°{áŸ!¡4`¢@;2•âN eâ@Iô'Œ¿¶§ì[•.Ï∂aa˜T$=7ÇJeÏ2«k≥ò"vHMRi;∑i"˙ôÌëPâ¬)
àJ~=Ì›°wÕCı∑ÕU´w®ßß`Á›Ós‰!$øôœˇnO°ßªªª«\Ü;%eçÍÅº;/|≈ﬁHòËo°maâï@û”
2]√◊ÿΩ:’õ3÷GÅÄ“q"Po˚ÙR9O)ÅéyÇÛÄQëR÷EÊﬁR(–#bIôÂ"7OÔ>ùOñaÏ6Â(àÛ≥Ø"êeàøâ∏\TI„‚àñãS–Y4%†{ÒÚ1∫é°“¢'˛|©Cyãaº ï?Sm√vM* ∂ˆ›‰ÆXO÷B£éqéîH≈  ^.ÛF1X`iMÃq€(Ë∏l7)≠}Ôö∂®∆›!m1›ŒØj÷ºÕıΩÔ¢;ÙlH˚ST|äo“btZ~„#b"∆6ÀòÅ¡®VèQa¶pµ+≈ V‚eíù_zÀAî y‚c¥aΩ/ÿháÔÓ¡ÓSΩRd9 G05‹:≈Âë]Xuñ$ÙÒ∞å·A< yÑ¨ß»âåbØçﬁÇç`Rı Ú^væöàBü9ÎV·â¯ˆ“ª”≠´*PzÎ¬,æÒ„”øËÜ^d†•N¥L¶,´l8KÌhE	è‚çª„R≈ ∑∏0€M◊´Sﬁ' OÇﬂè°Ω‡zΩ™U≠¢€MÙÇó´ˆÀˇ«µ±Ï?IŸ-c¡∞™àØxz‹p\≥0Öõœ¿3îwK5o≈ûi‚√ü¨{àåÍt`[2ÑÓd7Æ†ºQÕœaZp\åõç5)|ôÌêãÂ]1ä¶SÕ¥Â•»∞˛Ül_™πhqwõº[¬Û‹N¯≥∏ó5¨kxœ´;gzÃ˘#⁄æn∂´ãk%ïNñÅx«D8€éÒ˜pﬁπ˜Ûæ¡®˛HﬁE
q¶¥Çw„°ÿ-1P·óó√ê∑,V·ÖŸÀç∑>hºı®qÈÉı_Wø¯ÄVéÁMc‘É<„8Î8Ü[%%ÊÚEÎW5ì÷zwtwè¬»j©Àë’’e0∑!-â3≥y”™®‰F'˘ÉˇÖ∂ˆÃ2∂
Û¥–ÌP p‹âçwí`Nö4Ø¨B(”Ïtï¢M{Ù˙ááâô£„/°ëÏxnb4;ÖF≥/°—‹Lvl|:‰∆c[è£∆“fy®£¸¥ªÚv1ΩÁô/oÁ˙Ú|Zì9Ò<ø|zﬁô˙•Ø6æ˝¢qÔB˝ ˚wﬂx˝ÍBœã(}Ö	‰∞ƒ©‡î´∂ã≤Á‡¿Ï…4$ªØ’Œª¯3ÿÆ◊è«Á√Ω/R¿w`÷πÆSb0Ù ÎåÜ±‘.o/XR¶Ué≠FUoS{á8S;b˚ïZ¢5{}¥sqI*~ùØvQåUP*≈ÆÅ∂·±—`•í#∑äP#KÓ ™fR√◊äÔ‡∏zX·Ç¥-êúH|w Ø¯Ó„éù7]®«·ïäNw?ΩÂ U∞Ú”ﬁâ≥œÄ≥¿2ùY;‚¿:)Æ.˙-ˇ∫	 \∂ù=(éú\.⁄Á,ÿÁpsK8L^¸ï	b∞‹¢ı™9äŒ0≥€*∏ïí≤—,ZÄà?wtÑ¢¥8±Ÿ!~Å—@Æ•N¨ªÃEA	›,åîâ’ä+¯v““twˇÎN:÷9lπ•fmΩhW'jOÇ€Êût–œª¢MŒn£AÍÍ<ﬁ"–7°F!ÕÇBVq'„†UÒ!üı‚F>ˇ™ªB≤6„›8»•s≤Û≤¨ﬁPr:ŸáF¶è√ìÖüCÊ?Ûäı(c}ÍX·XÏ=)8 NÅC(≤h>[\∫ZIå«çı¿oh∂ôªπL>S–'‡Õ5ı_≥
h¯!ÇnAø”¿¿-˚$‹¢∑K*>±eIDÑií“Û~£Ω|ë8¢Ñ?œ&ÿ%‘à]¬ö8—âG≤SG&ë_*¥ù4ﬁÊéDƒÔ yÍéwn-è√Ã/NZ‚ˇŒÓ—¿Ëéw<)=)QÁ)ú0:Wπâô©‹ëπË$˘Ê¢wÇDå—ÈÉøÌœFÍÅ'Ú˜xnb˜!óò∞•3¿À&˛®ûD˙8—ìmO`IU>ÇdQ•±HÚÑô	Õzl,˜PÌÏY”9fTéãV	k?Ö¥Óó~Í~a
Êª}{#.ÿ™π8}SlŒ*Ãr,ZúÃÉQ&zW◊YkàV9ƒ‹G:5;rj/k©0D>√Ó¢ÿïÅ	”©¬u1è¬.l÷∆,∂Bz±ó≥Ωg˚ˆùé;§JÖhï´˛Ëäæ_‰®k∫¬„˛Cˆ¢È*=`0z„]©±ÙÜ$˙b¢îë≈5 ª’àﬁgÓ›˙Ö€ıØØ¢˛Q‘¯ó˚Ø?Zˇ¯∑çwæÄ®(RåÓÒ˘Îè_{‡Ø%ª†D0≥ÀV€8ƒ©˜2Í∆ÜÑ›P¢Ü˝‹(B∑id6¬’S%æ_T™P‚ÇcT4'Qî,„—£˜ÍóØ–,ñ!Ú˛´Ø9¶Å≤Ukﬁí;±Â –,‚∆»É”ìéñCVuì›•zˆ{D*≈Û˛Kâ˚3R∂ñê¢∑ ‚e±ü.äÉ° ò¶"Cñg…[eÒË≤Z*XG4∞»!d∏ñîFÒÜó}ó-ÙÇé,ŸOëC&ã íÂp»Ò†?´ ∞=`£àÃêÜ°LcôúúBÀòFjéÉ	˝ê?åôénÿ„\Yî˝äÖµ öHL“Vy…F^y Úk.:$®Ø'owq|Ãì.x8D$K≥ﬁ˘BÚqœ£r›RóéëmI≈ÖÁ5Ám*°xπrs˝⁄Ìıw.—2ôØUò§UQ7"KEdÕó8LQúl&Û–Ör~	Sáü-≥ óïV!oMc´—EÂ•00¯HD˘«∏;GõÚ‚39◊µ-tUoœÀÇï∂í
|‰ùT¯‚ïı;_”Å9”R÷û˛0Ps@&ˆp≠X‹Ñêÿ¡SEûrÆ÷ˇpﬂõ´ì∆´xÆPfz¡®t¥` Ç,¢ÕŒYÆT©.˝8'Õ≥ì”N€«ﬂ6ﬁ˘ºqı›çGø'ì7Ö«	M≠ﬁ™X£s«wk32∑Ò‚^¬™[∞2{∏$/@XZä;7∑4Ä'Û,6„\ÿÿê#ﬂ…ﬁ_ƒ‚”[Ée∆W™t≈gjø⁄TL®t˘é[_éd;ºO/I«:l$@uÆêë(	ÌìÛ∆>£	4ÔÿCBìKô¿.xçﬂ§?ãbÆ‚€€îÜÈÊ}—L{v|º=¡!>5±æÀ&%<¯ä`UI˝¬ŸX«ËBÁ$FuÕëÑ¡PÙá‰zÍ¶£†C0tÑí∏]{i;Òx≠¸˚¿Ç'40c@kPÄkf´i`‰hnlrÁRÌûí¸MÑßÅ∞
“w%úÃ˛r'SÌûíº≠√ßÉ∞Ü ©ßõ‡êìáö8‚§1&á{ôå±€Ö	ﬂö)›Çdp>±I™n∞òC|˚ƒ©ö+†∏∞n¬Õ}r÷˛cVôåEPÃØﬂô"ªµqÌ/ˇÒ◊˙çØÍË;?\´¸Ø*,ñtIÁëçÅ#éU@‡HB](∑XÅÒô7ëõwl<@.ò¯õXmÛ7,àˆHÇ;πè0õ1nA‡›ÜzÌ£0–<g*—*agÅAUëó¨2`±ã1’/ÚïñV(÷JX˝Ó©»ÜàBùTä]{⁄Â2D]/uüuÏRfQ £!§p˜°VwÓÂNîó:WI?h›Èï0]Ó
UXñªà√sêJHèñlƒéLé£Â<˙Í-íÏ∏WVûî˘iíÃÄ')«û$¥pc/ØN√l,w¢ÜMJ+O8Ï 
o’£€È≤÷e∂w¿j“e≥Ì¬]R?Èf‹¨íÖ1Ú¸Éà≈l90)9Døìó¡¢eƒ.òô›É¯Wqﬁâ2ö'†6gE√ˆîÓﬁ≥ôE„∆¨YT`oFßy¡‰â:ºÄvù|Œ
U’éèéÌô©Áó˝±'qÀ¡7Ÿ+HÄÚÇÅdç˛0ê·ñ·˚pço^‰$ß≥πEr»p´‡UŒV3‹õú7fπìÃkçÔ~Ó9hÊ`∑ﬁ7aÎ¥@Ù&|;Ωô∆PÏÆ⁄„ˆÇÈåÆâﬂ+`¨y„U zzóõ•äò£Ω8Ã 6'kU¬é˛{%¢ƒf‘64¿^˙›\STiÜ¶ûÛ⁄R4Ñ_XÒkb§@¨ ê∑^%\%¥"#ß)ù%µ¡õ-	ó"D÷ÃπÆ˛Ω|ÓnDü,‘É|ÁoDπd1Éd_5ú”Ók$— òƒ“3áÈ3n)±«œ/‰ñx1ÿH†}Ç™Gºó«Ò@÷*w¢H0â,Û£?Ç86_ﬂˇ∞´W i mÏ‘0‘¬«{âäcŸéU]b35636ío˜<Ú˚—±#Gı⁄ÁùK·◊És'wEÌú&_çº„RÕ¬Ü/”ùcÒ°GldoE∑èûÂÏ%NˆÙy^}ã–˝Æ0BÊ>ü~êT,›U:◊o·Ùˇ ÔEàë«`omé=À¯›*„Ö/yíÅªA*ã¶/w».^!ñSCB±NıvÔõÄâ±.søÖKƒ1IÅ˜>˛HÅÑ‚vçïVﬁ®⁄éKtCç˙y"Tÿ§xÛÅèÂ™
ŒPê˙^≤È·«£j®ú‹∞ƒîœÁóul<€92oá⁄W^Ê’U¸ÖZj$ﬂéˇ≈ˇ!ô∂ºçäƒó”(B¨môö€óÑ#ÏÄh©”Ì
ÈéÙ<ë4W\æ°Ÿ®pàç4ƒÂ‹ì-ˆDír«2Ô¯¸t5àœ„Ú=É∞ﬂ´WJA⁄1_É·˚z:?°hˆﬁ¥èOsµfÂ	'ÔQpr∏*áàq9fÔ◊ÆSÔë¢kΩ ºÄªzˇW;::Æ¿∂]Ω±≥dÑ˜ûi”|?Ì!S áFMï%Î‘¢efò{P¬Ÿãz56|°°SîFø ¢&èúÍU‹G¥ˆâΩfA∑ƒmñåPØICqjˆä´âJﬁGÇ 7Lié3®µã´¿±Ï◊õëóqéÛ–πçxJoÌìfΩdO"ˆ∞èmÅ`“dF%ÓÜ“O°Úuè’ü‡`b8ÁÏô•ä$∫Vÿ{ÌãÅèM£cf’(Uç‚V—Eôqª
Q-~EÒ¿åA6©Ü| -SÛ4'lﬂ⁄õ7äV¡(‡V¥)V<¬Ò$!ü’‰“%Õ∆≠#UI∞â›¯WK¡z2ÊBSD¡§{Ñ«ﬂÇmB¢\*◊¯‰Ln(≠^¢ÀˆÖmï÷T‚«/ïº#œIuΩ¶‚Õ©Gü≠òUøπtZ¡∑?–Á2înƒÒ9f{â‡T.áf∆ém%xÔ∏3hA[ˆk¥ß’ñ^7…nØ>W(ÈQOÕ:^¨…s±·)3F|V±¢(öµº$ñ}<`EíªU“‰R%dÌ—ïıGw ¥ˇá?=>ˇi˝“õè/–h†,§n9$2_K9—%P=:Y——ÍYë¶„û_Aèö¿nXú–≈=ùÜØWE/5ÏRlbΩ§3=“T¶Gû‚ ≠$¶)z(]ÿ!tz∫+\K.È†LDÕ>ó∏∆Ÿ3mÚÿÇ«≤ÔÒ'{nˆ·ìS«ÇWˆ±¯¬⁄K¯—Ù¢Tnèû÷¨„t÷»„¶«rË”±é‚KΩU†2Ã:¡7Øûﬂ0ÍK°˝ÍZk‰|•ÊTä¶Á·dﬂò_Ã·9cwÄSt◊Êµ—˝„∆Ñƒ‚¥©≥*‘iyƒ∂t\Ü≥„3'¶≤C¸ò{≈«“®˙◊&ã`86È”‘nG‡9B…¬YÉ9'MÎéÙﬂÆﬂBˇÛƒÿ»?uMûòi˝p&7¶∑2n™ç¶äv™Be?	Ä<Ãj‹ƒ=Ì:åmx9›	)ìÈ˛ÇÛ¯»ùh›¨â¸cÂ≥v$‘j∫rk∆`d·~â5∑ˇ˙Ùüo°˙ç€4øq˚V˝·’µ{o˝˝·€ç_ﬂÆ_Ωªˆ‡söµ¥~„≠˙•Øóœ7n\ˆk Æ_£q˘ª∆øﬂ™_˝+x?Ãé˙?øç/hº	.æÒi„√œ3ƒR√Lmv¸Á˘_◊ØºÆ4ﬁ∏⁄∏˘∞˛Âª¯!Ù	_Ω^øx˝·ﬂˇvÌ˚/6æˇÆqÛ*t‰⁄›∆€Ø’Øﬁl\˚˛Òü>™ﬂˇ˝˙ù[ÎÔæ	ïJAø$Ø0a(‘H+(?gZF'≤—ƒˇªp Ò Däà(„õë»àıíÌíö•.*XV˝J§ñ©kœ:&≤π‚å›hÑ‚Àö%Ù´öQƒ0D gÕÇU]Ω’U÷>UfP˝7¡9È		Ï=M˝’E€ÖÌRôπÀ«ÌÇÌºBÇ
d5W8¶õ√,áÎÈA”'çL;>9∞-h4áF≤S£˜¯Ík3cì(shl|l‚»â\«#;¨g°Y®29Çˇ?ÓÿóƒYΩb.BS¶ëØvˇìπ¯_C‰R¯fCˆYﬁ∞áPô@>¡9ZpwØ≥6f©2=5ç◊Ü‚¡–IÇ∞:Ñ\HN`”?—;Ecø˝_=6‡Ôp∞Ñ0≤æ∑KlXÚ`®A˙2‰ﬂ	ª@ à]ï«U¿p'Yƒ>IC~Êm´@˘l≠LÚ·¸QÀ,ì±ÈÙ«§ìçDß˜˙Ë "!ÎùÙ’ÒüNˇ≠:˘wÈåt)∏ëu≠ÖgãÇ{{·_S$ÇÕÎ>ÄˆÓ˚9˜˚Kf±h/Ñ.Aªa—ˆOÏ'∑¯˜‰ix-õzÄÇ∆uªwgo˙;7O\Ù‰\ƒäcŒ[vÕın'Wz'_&IßdÜÕ*6vÒ0å·€ øV$Á_?‹ƒsXÇNw≥41⁄¬?Cè®—˜Ü:?æ6@EÁüÃ¡ÏDı~Î1n„|’¡v9 J©ÿ’«‹ﬁÆËﬁ^œ/∂|&[£†(x∫qe∫ ®`E¢ï$Ã`∆_˝D¶è≈j= <øzß(ü€∏{mÌﬁo∞(ØˇÓ_Îøπ)∏(lAÏüÅ˜«\r¢QbÖ…aY»ñ˙db*çè˘˛-s>‘+v^MLyÃ.5:ºÚ±ˇˇ   ˇˇƒªnA∞Á+,£»±Dbá		¢‡•Dà;>K±çÓ.dπB=PÅ@
~%	|3≥œŸ›€3N¡èı‹ÓÃÏŒcÁ1!Ó∑wˆﬁ=˜KÉ{˝…±ˇ©}Ñ'ÃE<µ’pBZıLEÓ.⁄êòì#tå[ÁWñ/_øπ∫\S§Ú¿Ÿu·làG8p/‹ºtiy•®i£ÍÇTÀ¬cúu¸EUt‚)®læ¡™BØ’Srf¨«RhzÆ|Ç8ÒUY≤N.LË§GÁöÌ”ãs∂¯QùµÓ$ïu<ÍC´)ÇßcCãØ§íA∫Ÿ<ñ;ﬂÅØ÷Ÿ∆∞}%a%˘@”ÓtacŒ‰Éô¥Ç1ﬁF˜Öè∫¿‚Îr»	IÀïªT¶s…2CP¥bq√dJ»Õ§C|Â•≤™Û&#L˙tdJ<◊ã◊ı:° »˘&Ø0jwí7âwîÑsà°hÄÅ@ii§gÉÕR´Àë¸˘»Ü+v?i{Áhë{Ol|]8!Ω€T‹ó:‚‰2.èjÖ°ÓcôÖ^kÄ≤–;xúá¿ZØçﬁBºú„Â›Íog7¯oªˇ±å—PqW„‘Wf(≈l;Æ[¬*Ã]öµ|ú`∑y¿êŒ„æ(^∫±¿÷‚Êæa+tQ71Leh)ß”5Ú∑
SﬁÏ&iÌX≈©7o÷¶mo„ Ø÷G1c(‰Ì+l+«VÑ.ÈQD/°ÙZ∏[4_j"ÁR#∑/ÏPÀªëµ:[TscŸ˘B+M…∂=§@ñ@Å0µú"‡ﬁ‹poé‹Ày∑|{X.⁄¡=b£…Ê9L¥vÎãÜ›{&j,Ø+Áæ≠,ªG®q„^ï˘ú|ﬁÁ7†0óï£¢â∫N¯°≤üFS¸s≠ËrØ¬Pÿjoiºáçá∫º+æY¥jÌÍÄfà`⁄™#t]„V€zw•°‰E€¥ÑIºV åb-Æ=yº˚ı9p˙rñ∂R*9æ¢§ëƒgjl=#Ô˝û?˜èÌﬂﬂæa«!–‡ÛÓZ‰âb®(à†È{2}ÔP›#∑4Ω'°x®¿≤MtS`y¡◊Ââ1ÔxΩˇpP|>O˙∫‰g«b¨∏f÷£Œ·î∫\Q‚Âj™e]ô∑†ƒ´wä‚˙âÿ¸ÏÉd#]îºuÇt;¶Ω∫¡ÔY˛ Ì’! 5LõÑÉÍj+ﬂòÌu˚”∆È´™è¶nÛvjç˘Úhâú®◊∂z?ﬂ§¿˘YÂ"÷Znu≥òÆµéÈ¸¯ ≤ôy}£PmUŒgÈ¶)eØ√ºÒ1=ó§[Â.v(´A‰)Ì÷’€äCrΩ¸∑BÁâI1°Ÿöö´#ëSƒ‘òj±∫#ß|®∏›mékï&Fi\˝≤È»˙πà~π&Ö3•±Æµ6ô˛ÌØ≤dªéC'eZlÍ¯ﬁWß®üU„dÛ†$∆Ì¨…´›@”Ä……iEˇ»ã^ﬂB€É(¡BÜöB&Ñ€ÌUs∞-hr]∏ˇìJ‰áˇK*˘¬`u´=”ÌSu—ì¨†Üå :-º3€&ŸnuÔ«lïb	à»ƒ e]¬~.¯eöWò"Aa‚‘çÛÉù…1a°S°„‹»‡yu$EÈÛ€ΩùóçÉ4è©H4äV!F÷G*>5ˆ¯a‡pÆ≥mƒÖ>Âo˜±%≤A{ﬂÌÔ<mÄ&î‰≠bâaBQCKQ§èi√vAT§ı@ ù#©˘=4Ñ|zø˚Â’Ó◊ç•+|®QÑjã5[é˚˙$éïéh¥ït∆?F¯ÕÙ   ˇˇ [ÀP