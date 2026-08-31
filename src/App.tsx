import React, { useState, useEffect } from 'react';
import { Calculator, ArrowUp, ArrowDown, X,  
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
    zh: "ÁÆ±Èáè (CNTRs)",
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
  },
  overview: {
    pt: "Vis√£o Geral",
    zh: "ÁªºÂêàÂ§ßÁõò",
    en: "Overview"
  },
  yardManagement: {
    pt: "Gest√£o de P√°tios",
    zh: "Â†ÜÂú∫ÁÆ°ÁêÜ",
    en: "Yard Management"
  },
  bydBuffer: {
    pt: "BYD Buffer",
    zh: "Êô∫ËÉΩÁºìÂÜ≤Âå∫",
    en: "BYD Buffer"
  },
  depotsAllocation: {
    pt: "Dep√≥sitos & Aloca√ß√£o",
    zh: "ÂçèËÆÆÂ†ÜÂ≠òÂèäÊµÅÂêë",
    en: "Depots & Allocation"
  },
  routingPlan: {
    pt: "Plano de Direcionamento",
    zh: "ÊµÅÂêëÂèä‰ªìÂÇ®ËßÑÂàí",
    en: "Routing & Storage Plan"
  },
  demurrageOverdue: {
    pt: "Demurrage & Overdue",
    zh: "ÊªûÊúüË¥πÁõëÊéß",
    en: "Demurrage & Overdue"
  },
  vesselScheduleNav: {
    pt: "Escala de Navios",
    zh: "ËàπËà∂Èù†Ê≥äËÆ°Âàí",
    en: "Vessel Schedule"
  },
  chartsProjections: {
    pt: "Gr√°ficos & Proje√ß√µes",
    zh: "Êô∫ËÉΩËøêËê•ÂõæË°®",
    en: "Charts & Projections"
  },
  logisticsModule: {
    pt: "M√≥dulo Log√≠stica",
    zh: "Áâ©ÊµÅÁÆ°ÁêÜÊ®°Âùó",
    en: "Logistics Module"
  },
  deliveryDashboard: {
    pt: "Painel de Entregas",
    zh: "‰∫§Ë¥ßÁõëÊéßÈù¢Êùø",
    en: "Delivery Dashboard"
  },
  calendar: {
    pt: "Calend√°rio",
    zh: "‰∫§‰ªòÊó•ÂéÜ",
    en: "Calendar"
  },
  navMenu: {
    pt: "M√ìDULOS DO PORTAL",
    zh: "ÂØºËà™ËèúÂçï",
    en: "PORTAL MODULES"
  },
  systemActions: {
    pt: "A√á√ïES DO SISTEMA",
    zh: "Á≥ªÁªüÂø´Êç∑ÊéßÂà∂",
    en: "SYSTEM ACTIONS"
  },
  syncGoogleSheets: {
    pt: "Sinc Google Sheets",
    zh: "ÂêåÊ≠•Ë∞∑Ê≠åË°®Ê†º",
    en: "Sync Google Sheets"
  },
  liveDataUpdate: {
    pt: "INTEGRA√á√ÉO PLANILHA",
    zh: "ÂÆûÊó∂Êõ¥Êñ∞Êï∞ÊçÆ",
    en: "SHEET INTEGRATION"
  },
  editYard: {
    pt: "Editar P√°tio",
    zh: "ÁºñËæëÂ†ÜÂú∫ÂÆπÈáè",
    en: "Edit Yard"
  },
  closeEditYard: {
    pt: "Fechar Edi√ß√£o",
    zh: "ÂÖ≥Èó≠ÁºñËæëÊ®°Âºè",
    en: "Close Edit Mode"
  },
  yardControl: {
    pt: "YARD MANAGEMENT",
    zh: "Â†ÜÂú∫ÊéßÂà∂",
    en: "YARD MANAGEMENT"
  },
  stockImport: {
    pt: "IMPORTA√á√ÉO DE ESTOQUE",
    zh: "Â∫ìÂ≠òÊï∞ÊçÆÂØºÂÖ•",
    en: "STOCK IMPORT"
  },
  importStock: {
    pt: "Importar",
    zh: "‰∏ä‰º†Â∫ìÂ≠ò",
    en: "Import"
  },
  downloadTemplate: {
    pt: "Modelo",
    zh: "Ê®°Êùø",
    en: "Template"
  },
  exportPdf: {
    pt: "Relat√≥rio PDF",
    zh: "ÂØºÂá∫ PDF Êä•Âëä",
    en: "PDF Report"
  },
  generatingPdf: {
    pt: "Gerando PDF...",
    zh: "Ê≠£Âú®ÁîüÊàê PDF...",
    en: "Generating PDF..."
  },
  pdfReady: {
    pt: "Relat√≥rio Exportado!",
    zh: "PDF Â∑≤‰∏ãËΩΩ",
    en: "PDF Exported!"
  },
  themeLight: {
    pt: "Claro",
    zh: "‰∫ÆËâ≤",
    en: "Light"
  },
  themeDark: {
    pt: "Escuro",
    zh: "ÊöóËâ≤",
    en: "Dark"
  },
  resetData: {
    pt: "Reset",
    zh: "ÈáçÁΩÆÊï∞ÊçÆ",
    en: "Reset"
  },
  onlineStatus: {
    pt: "Online",
    zh: "Âú®Á∫ø",
    en: "Online"
  },
  connectingStatus: {
    pt: "Sinc",
    zh: "ÂêåÊ≠•‰∏≠",
    en: "Syncing"
  },
  offlineStatus: {
    pt: "Offline",
    zh: "Á¶ªÁ∫ø",
    en: "Offline"
  },
  connectFirebase: {
    pt: "Conectar Firebase",
    zh: "ËøûÊé• Firebase",
    en: "Connect Firebase"
  },
  occupancyRate: {
    pt: "Taxa de Ocupa√ß√£o",
    zh: "‰ΩøÁî®Áéá",
    en: "Occupancy Rate"
  },
  totalStock: {
    pt: "Estoque Total",
    zh: "ÊÄªÂ∫ìÂ≠òÈáè",
    en: "Total Stock"
  },
  activeYards: {
    pt: "P√°tios Ativos",
    zh: "Ê¥ªË∑ÉÂ†ÜÂú∫",
    en: "Active Yards"
  },
  status: {
    pt: "Status",
    zh: "Áä∂ÊÄÅ",
    en: "Status"
  },
  action: {
    pt: "A√ß√£o",
    zh: "Êìç‰Ωú",
    en: "Action"
  },
  actions: {
    pt: "A√ß√µes",
    zh: "Êìç‰ΩúÈÄâÈ°π",
    en: "Actions"
  },
  save: {
    pt: "Salvar",
    zh: "‰øùÂ≠ò",
    en: "Save"
  },
  cancel: {
    pt: "Cancelar",
    zh: "ÂèñÊ∂à",
    en: "Cancel"
  },
  confirm: {
    pt: "Confirmar",
    zh: "Á°ÆËÆ§",
    en: "Confirm"
  },
  close: {
    pt: "Fechar",
    zh: "ÂÖ≥Èó≠",
    en: "Close"
  },
  delete: {
    pt: "Excluir",
    zh: "Âà†Èô§",
    en: "Delete"
  },
  edit: {
    pt: "Editar",
    zh: "ÁºñËæë",
    en: "Edit"
  },
  search: {
    pt: "Buscar",
    zh: "ÊêúÁ¥¢",
    en: "Search"
  },
  filter: {
    pt: "Filtrar",
    zh: "Á≠õÈÄâ",
    en: "Filter"
  },
  all: {
    pt: "Todos",
    zh: "ÂÖ®ÈÉ®",
    en: "All"
  },
  carrier: {
    pt: "Transportadora",
    zh: "ÊâøËøêÂïÜ/ËΩ¶Èòü",
    en: "Carrier"
  },
  driver: {
    pt: "Motorista",
    zh: "Âè∏Êú∫",
    en: "Driver"
  },
  plate: {
    pt: "Placa do Caminh√£o",
    zh: "ËΩ¶ÁâåÂè∑",
    en: "Truck Plate"
  },
  deliveryDate: {
    pt: "Data de Entrega",
    zh: "‰∫§‰ªòÊó•Êúü",
    en: "Delivery Date"
  },
  notes: {
    pt: "Observa√ß√µes",
    zh: "Â§áÊ≥®/ËØ¥Êòé",
    en: "Notes"
  },
  container: {
    pt: "Cont√™iner",
    zh: "ÈõÜË£ÖÁÆ±",
    en: "Container"
  },
  containers: {
    pt: "Cont√™ineres",
    zh: "ÈõÜË£ÖÁÆ±Ê∏ÖÂçï",
    en: "Containers"
  },
  yard: {
    pt: "P√°tio",
    zh: "Â†ÜÂú∫",
    en: "Yard"
  },
  yards: {
    pt: "P√°tios",
    zh: "Âêà‰ΩúÂ†ÜÂú∫",
    en: "Yards"
  },
  newYard: {
    pt: "Novo P√°tio",
    zh: "Ê∑ªÂä†Â†ÜÂú∫",
    en: "New Yard"
  },
  editYards: {
    pt: "Editar P√°tios",
    zh: "ÁºñËæëÂ†ÜÂú∫",
    en: "Edit Yards"
  },
  manageContainers: {
    pt: "Gerenciar Cont√™ineres",
    zh: "ÁÆ°ÁêÜÈõÜË£ÖÁÆ±ÊòéÁªÜ",
    en: "Manage Containers"
  },
  viewDetails: {
    pt: "Ver Detalhes / Gerenciar",
    zh: "Êü•ÁúãËØ¶ÊÉÖ & ÁÆ°ÁêÜ",
    en: "View Details / Manage"
  },
  deleteYard: {
    pt: "Excluir P√°tio",
    zh: "Âà†Èô§Â†ÜÂú∫",
    en: "Delete Yard"
  },
  freeTimeDays: {
    pt: "Free Time (Dias)",
    zh: "ÂÖçÂ†ÜÊúü (Â§©)",
    en: "Free Time (Days)"
  },
  daysOverdue: {
    pt: "Dias em Atraso",
    zh: "Ë∂ÖÊúüÂ§©Êï∞",
    en: "Days Overdue"
  },
  estimatedCost: {
    pt: "Custo Estimado",
    zh: "È¢ÑËÆ°Ë¥πÁî®",
    en: "Estimated Cost"
  },
  criticalAction: {
    pt: "A√ß√£o Priorit√°ria",
    zh: "‰ºòÂÖàÂ§ÑÁêÜ",
    en: "Priority Action"
  },
  shipowner: {
    pt: "Armador",
    zh: "Ëàπ‰∏ú/ËàπÂÖ¨Âè∏",
    en: "Shipowner"
  },
  berthingWindow: {
    pt: "Janela de Atraca√ß√£o",
    zh: "Èù†Ê≥äÁ™óÂè£",
    en: "Berthing Window"
  },
  discharged: {
    pt: "Descarregado",
    zh: "Â∑≤Âç∏Ëàπ",
    en: "Discharged"
  },
  scheduled: {
    pt: "Agendado",
    zh: "Â∑≤ÊéíÊúü",
    en: "Scheduled"
  },
  inTransit: {
    pt: "Em Tr√¢nsito",
    zh: "Âú®ÈÄî‰∏≠",
    en: "In Transit"
  },
  completed: {
    pt: "Conclu√≠do",
    zh: "Â∑≤ÂÆåÊàê",
    en: "Completed"
  },
  delayed: {
    pt: "Atrasado",
    zh: "Â∑≤Âª∂ËØØ",
    en: "Delayed"
  },
  pending: {
    pt: "Pendente",
    zh: "ÂæÖÂ§ÑÁêÜ",
    en: "Pending"
  },
  currentWeek: {
    pt: "Semana Atual",
    zh: "ÂΩìÂâçÂë®",
    en: "Current Week"
  },
  startWeek: {
    pt: "Semana Inicial",
    zh: "Ëµ∑ÂßãÂë®",
    en: "Start Week"
  },
  endWeek: {
    pt: "Semana Final",
    zh: "Êà™Ê≠¢Âë®",
    en: "End Week"
  },
  inboundFlow: {
    pt: "Aporte de Navios",
    zh: "ËøõÊ∏ØÂà∞ÁÆ±",
    en: "Inbound Flow"
  },
  drainCapacity: {
    pt: "Escoamento / Dreno",
    zh: "Â∑•ÂéÇÂá∫Ê∏ÖËÉΩÂäõ",
    en: "Drain Capacity"
  },
  inventoryBalance: {
    pt: "Saldo de Estoque",
    zh: "Â∫ìÂ≠òÁªì‰ΩôËµ∞Âäø",
    en: "Inventory Balance"
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
  carrier?: string;
  status?: string;
  terminal?: string;
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

interface YardCardProps {
  key?: string;
  yardKey: string;
  yard: Yard;
  ocupacao: number;
  isEdit?: boolean;
  theme?: string;
  isSmall?: boolean;
  t?: any;
  language?: string;
  renderLabel?: any;
  widescreenMode?: boolean;
  onClick?: () => void;
  onYardChange?: (key: string, field: keyof Yard, value: string) => void;
  onDeleteYard?: (key: string) => void;
}

function YardCard({
  yardKey,
  yard,
  ocupacao,
  isEdit,
  theme,
  isSmall,
  language = "pt",
  renderLabel,
  widescreenMode,
  onClick,
  onYardChange,
  onDeleteYard
}: YardCardProps) {
  if (!yard) return null;
  const isHighOcc = ocupacao >= 85;
  const isMedOcc = ocupacao >= 70;

  return (
    <div
      onClick={isEdit ? undefined : onClick}
      className={`rounded-xl border transition-all select-none relative overflow-hidden flex flex-col justify-between ${
        isEdit
          ? "p-3 border-amber-500/80 bg-amber-50/15 dark:bg-amber-950/20 shadow-md ring-1 ring-amber-400/50"
          : `${theme === "dark" ? "bg-[#1e293b] border-slate-700 hover:border-slate-500 shadow-sm" : "bg-white border-slate-200/90 hover:border-slate-300 shadow-xs hover:shadow-md"} cursor-pointer p-3`
      } ${isSmall ? "min-h-[140px]" : "min-h-[160px]"}`}
    >
      <div>
        {/* HEADER */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`p-1.5 rounded-lg shrink-0 ${
              yard.type === "BONDED"
                ? "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400"
                : yard.type === "BUFFER"
                ? "bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400"
                : "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
            }`}>
              {yard.type === "BONDED" ? <Anchor className="w-4 h-4" /> : yard.type === "BUFFER" ? <Layers className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <h4 className="font-extrabold text-xs text-slate-800 dark:text-white truncate tracking-tight">
                {yard.name}
              </h4>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                {yard.type}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-black tracking-tight ${
              isHighOcc
                ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                : isMedOcc
                ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
            }`}>
              {ocupacao}%
            </span>

            {isEdit && onDeleteYard && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteYard(yardKey);
                }}
                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                title={language === 'zh' ? 'Âà†Èô§Â†ÜÂú∫' : 'Excluir P√°tio'}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* OCCUPANCY BAR */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2">
          <div
            className={`h-full transition-all duration-500 ${
              isHighOcc
                ? "bg-rose-500"
                : isMedOcc
                ? "bg-amber-500"
                : "bg-emerald-500"
            }`}
            style={{ width: `${Math.min(100, Math.max(0, ocupacao))}%` }}
          />
        </div>

        {/* METRICS DISPLAY OR INLINE EDIT MODE */}
        {isEdit ? (
          <div className="space-y-1.5 my-1" onClick={(e) => e.stopPropagation()}>
            <div className="grid grid-cols-3 gap-1 text-[10px]">
              <div>
                <label className="block text-[8px] font-extrabold uppercase text-slate-500 dark:text-slate-400 truncate">
                  {language === 'zh' ? 'ÂÆπÈáè' : 'Capacidade'}
                </label>
                <input
                  type="number"
                  value={yard.capacity}
                  onChange={(e) => onYardChange?.(yardKey, 'capacity', e.target.value)}
                  className="w-full p-1 text-xs font-mono font-bold rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 text-center"
                />
              </div>
              <div>
                <label className="block text-[8px] font-extrabold uppercase text-slate-500 dark:text-slate-400 truncate">
                  {language === 'zh' ? 'ÂÆûÈáç' : 'Cheios'}
                </label>
                <input
                  type="number"
                  value={yard.cheio}
                  onChange={(e) => onYardChange?.(yardKey, 'cheio', e.target.value)}
                  className="w-full p-1 text-xs font-mono font-bold rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-center"
                />
              </div>
              <div>
                <label className="block text-[8px] font-extrabold uppercase text-slate-500 dark:text-slate-400 truncate">
                  {language === 'zh' ? 'Á©∫ÁÆ±' : 'Vazios'}
                </label>
                <input
                  type="number"
                  value={yard.vazio}
                  onChange={(e) => onYardChange?.(yardKey, 'vazio', e.target.value)}
                  className="w-full p-1 text-xs font-mono font-bold rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-center"
                />
              </div>
            </div>

            {!isSmall && (
              <div className="grid grid-cols-3 gap-1 text-[10px] pt-1 border-t border-dashed border-slate-200 dark:border-slate-700/60">
                <div>
                  <label className="block text-[7.5px] font-extrabold uppercase text-slate-400 truncate">
                    {language === 'zh' ? 'Ê∏ØÂè£' : 'Porto'}
                  </label>
                  <input
                    type="number"
                    value={yard.porto || 0}
                    onChange={(e) => onYardChange?.(yardKey, 'porto', e.target.value)}
                    className="w-full p-1 text-[11px] font-mono font-bold rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-center"
                  />
                </div>
                <div>
                  <label className="block text-[7.5px] font-extrabold uppercase text-slate-400 truncate">
                    {language === 'zh' ? 'ÂæÖÊî∂' : 'Pronto Col.'}
                  </label>
                  <input
                    type="number"
                    value={yard.prontoColeta || 0}
                    onChange={(e) => onYardChange?.(yardKey, 'prontoColeta', e.target.value)}
                    className="w-full p-1 text-[11px] font-mono font-bold rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-center"
                  />
                </div>
                <div>
                  <label className="block text-[7.5px] font-extrabold uppercase text-slate-400 truncate">
                    {language === 'zh' ? 'Â∑≤‰∫§‰ªò' : 'Entregue'}
                  </label>
                  <input
                    type="number"
                    value={yard.delivered || 0}
                    onChange={(e) => onYardChange?.(yardKey, 'delivered', e.target.value)}
                    className="w-full p-1 text-[11px] font-mono font-bold rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-center"
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="bg-slate-50 dark:bg-slate-900/60 p-1.5 rounded-lg border border-slate-150 dark:border-slate-800/80">
              <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-tight">
                {language === "zh" ? "ÂÆûÈáç" : "Cheios"}
              </span>
              <span className="font-mono font-black text-xs text-slate-800 dark:text-slate-200">
                {yard.cheio || 0}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/60 p-1.5 rounded-lg border border-slate-150 dark:border-slate-800/80">
              <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-tight">
                {language === "zh" ? "Á©∫ÁÆ±" : "Vazios"}
              </span>
              <span className="font-mono font-black text-xs text-slate-800 dark:text-slate-200">
                {yard.vazio || 0}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/60 p-1.5 rounded-lg border border-slate-150 dark:border-slate-800/80">
              <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-tight">
                {language === "zh" ? "ÂÆπÈáè" : "Capacidade"}
              </span>
              <span className="font-mono font-black text-xs text-indigo-600 dark:text-indigo-400">
                {yard.capacity || 0}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER BUTTON / ACTION */}
      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
          className={`w-full py-1 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            isEdit
              ? "bg-amber-500 hover:bg-amber-600 text-white shadow-xs"
              : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
          }`}
        >
          <Sliders className="w-3 h-3" />
          <span>
            {isEdit
              ? (language === 'zh' ? 'ÁÆ°ÁêÜÈõÜË£ÖÁÆ±ÊòéÁªÜ' : 'Gerenciar Cont√™ineres')
              : (language === 'zh' ? 'Êü•ÁúãËØ¶ÊÉÖ & ÁÆ°ÁêÜ' : 'Ver Detalhes / Gerenciar')}
          </span>
        </button>
      </div>
    </div>
  );
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
            name: data.name || '',
            eta: data.eta || '',
            cntrs: Number(data.cntrs) || 0,
            order: data.order !== undefined ? Number(data.order) : undefined,
            carrier: data.carrier || 'BYD CHARTER',
            status: data.status || 'SCHEDULED',
            terminal: data.terminal || 'Porto de Santos'
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
  // ESTADOS EXPANDIDOS PARA GEST√ÉO COMPLETA DE NAVIOS (VESSELS CONTROL TOWER)
  const [showAddVesselForm, setShowAddVesselForm] = useState(false);
  const [vesselFilterSearch, setVesselFilterSearch] = useState('');
  const [vesselViewMode, setVesselViewMode] = useState<'monthly' | 'list'>('monthly');
  const [newVesselCarrier, setNewVesselCarrier] = useState('BYD CHARTER');
  const [newVesselStatus, setNewVesselStatus] = useState<string>('SCHEDULED');
  const [newVesselTerminal, setNewVesselTerminal] = useState('Porto de Santos');
  const [editingVesselId, setEditingVesselId] = useState<number | null>(null);
  const [editVesselName, setEditVesselName] = useState('');
  const [editVesselEta, setEditVesselEta] = useState('');
  const [editVesselCntrs, setEditVesselCntrs] = useState<number>(0);
  const [editVesselCarrier, setEditVesselCarrier] = useState('');
  const [editVesselStatus, setEditVesselStatus] = useState('SCHEDULED');
  const [editVesselTerminal, setEditVesselTerminal] = useState('');


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
    return `${TRANSLATIONS[key].pt} / ${TRANSLATIONS[key].zh}`;
  };

  const tt = (pt: string, zh: string, en?: string): string => {
    if (language === 'zh') return zh;
    if (language === 'en') return en || pt;
    if (language === 'bilingual') return `${pt} / ${zh}`;
    return pt;
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

    if (!window.confirm(language === 'zh' ? `Á°ÆÂÆöË¶Å‰ªéÂ∫ìÂ≠ò‰∏≠Âà†Èô§ÈõÜË£ÖÁÆ± ${containerId} ÂêóÔºü` : language === 'en' ? `Are you sure you want to remove container ${containerId} from stock?` : `Deseja realmente remover o cont√™iner ${containerId} do estoque?`)) {
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
  const addVessel = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newVesselName.trim() || !newVesselEta.trim()) {
      alert(language === 'zh' ? 'ËØ∑ËæìÂÖ•ËàπÂêçÂíåÈ¢ÑÊä•Âà∞Ê∏ØÊó•ÊúüÔºàETAÔºâ' : language === 'en' ? 'Please enter vessel name and ETA date' : 'Por favor, informe o nome do navio e a data de ETA.');
      return;
    }
    const newId = Date.now();
    const newV: Vessel = {
      id: newId,
      name: newVesselName.toUpperCase().trim(),
      eta: newVesselEta.trim(),
      cntrs: Number(newVesselCntrs) || 0,
      order: vessels.length,
      carrier: newVesselCarrier.trim() || 'BYD CHARTER',
      status: newVesselStatus || 'SCHEDULED',
      terminal: newVesselTerminal.trim() || 'Porto de Santos'
    };
    
    setVessels([...vessels, newV]);
    setNewVesselName('');
    setNewVesselEta('');
    setNewVesselCntrs(1000);
    setNewVesselCarrier('BYD CHARTER');
    setNewVesselStatus('SCHEDULED');
    setNewVesselTerminal('Porto de Santos');
    setShowAddVesselForm(false);
    
    try {
      await setDoc(doc(db, 'vessels', String(newId)), {
        id: String(newId),
        name: newV.name,
        eta: newV.eta,
        cntrs: newV.cntrs,
        order: newV.order,
        carrier: newV.carrier,
        status: newV.status,
        terminal: newV.terminal
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `vessels/${newId}`);
    }
  };

  // INICIAR EDI√á√ÉO DE UM NAVIO
  const startEditVessel = (v: Vessel) => {
    setEditingVesselId(v.id);
    setEditVesselName(v.name);
    setEditVesselEta(v.eta);
    setEditVesselCntrs(v.cntrs);
    setEditVesselCarrier(v.carrier || 'BYD CHARTER');
    setEditVesselStatus(v.status || 'SCHEDULED');
    setEditVesselTerminal(v.terminal || 'Porto de Santos');
  };

  // SALVAR EDI√á√ÉO DE UM NAVIO
  const saveEditVessel = async (id: number) => {
    const updated = vessels.map(v => {
      if (v.id === id) {
        return {
          ...v,
          name: editVesselName.toUpperCase().trim() || v.name,
          eta: editVesselEta.trim() || v.eta,
          cntrs: Number(editVesselCntrs) || 0,
          carrier: editVesselCarrier.trim() || v.carrier,
          status: editVesselStatus.trim() || v.status,
          terminal: editVesselTerminal.trim() || v.terminal
        };
      }
      return v;
    });
    setVessels(updated);
    setEditingVesselId(null);
    try {
      const vTarget = updated.find(v => v.id === id);
      if (vTarget) {
        await setDoc(doc(db, 'vessels', String(id)), {
          id: String(id),
          name: vTarget.name,
          eta: vTarget.eta,
          cntrs: vTarget.cntrs,
          order: vTarget.order !== undefined ? vTarget.order : 0,
          carrier: vTarget.carrier || 'BYD CHARTER',
          status: vTarget.status || 'SCHEDULED',
          terminal: vTarget.terminal || 'Porto de Santos'
        }, { merge: true });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `vessels/${id}`);
    }
  };

  // ATUALIZA√á√ÉO R√ÅPIDA DE CAMPO DE NAVIO
  const handleUpdateVesselField = async (id: number, field: keyof Vessel, value: any) => {
    const updated = vessels.map(v => v.id === id ? { ...v, [field]: value } : v);
    setVessels(updated);
    try {
      await setDoc(doc(db, 'vessels', String(id)), {
        [field]: value
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `vessels/${id}`);
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
                <p className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400">{tt("Sistema Integrado de Controle de P√°tios, Escalas e Planejamento Operacional", "ÊØî‰∫öËø™ÈõÜË£ÖÁÆ±Â†ÜÂú∫„ÄÅÁè≠ËΩÆËàπÊúü‰∏éËøêËê•ËÆ°Âàí‰∏Ä‰ΩìÂåñÊéßÂà∂Á≥ªÁªü", "Integrated Yard, Vessel Schedule & Operational Planning Control System")}</p>
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
            <div id="ppt-language-selector-container" className="bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-md p-1 rounded-xl flex items-center gap-1 border border-slate-200 dark:border-slate-700 shadow-sm">
              {[
                { id: 'pt', label: 'üáßüá∑ PT', name: 'Portugu√™s Brasileiro', activeClass: 'text-blue-700 dark:text-blue-300' },
                { id: 'zh', label: 'üá®üá≥ ‰∏≠Êñá', name: 'ÁÆÄ‰Ωì‰∏≠Êñá (Chinese)', activeClass: 'text-red-600 dark:text-red-400' },
                { id: 'en', label: 'üá∫üá∏ EN', name: 'English', activeClass: 'text-indigo-600 dark:text-indigo-400' },
                { id: 'bilingual', label: 'üåê MULTI', name: 'Multi / Bil√≠ngue', activeClass: 'text-emerald-700 dark:text-emerald-400' }
              ].map(lang => (
                <button
                  key={lang.id}
                  id={`btn-lang-${lang.id}`}
                  onClick={() => { setLanguage(lang.id); updateGlobalDoc('language', lang.id); }}
                  title={lang.name}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                    language === lang.id 
                      ? `bg-white dark:bg-slate-700 shadow-sm ${lang.activeClass} font-bold scale-[1.02]`
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
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
              {tt("Modo Monitor", "ÁõëËßÜÂ§ßÂ±èÊ®°Âºè", "Monitor Mode")}
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
            <span>{tt("Retornar ao Inbound Portal", "ËøîÂõûÁªºÂêàÈó®Êà∑", "Return to Portal")}</span>
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
              <span>{tt("Voltar ao Editor", "ËøîÂõûÁºñËæëÊ®°Âºè", "Back to Editor")}</span>
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
            <div id="topbar-language-selector-container" className="bg-slate-100/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-750 p-1 rounded-xl flex items-center gap-1 shadow-sm ring-1 ring-black/5 dark:ring-white/5">
              {[
                { id: 'pt', label: 'üáßüá∑ PT', name: 'Portugu√™s Brasileiro' },
                { id: 'zh', label: 'üá®üá≥ ‰∏≠Êñá', name: 'ÁÆÄ‰Ωì‰∏≠Êñá (Chinese)' },
                { id: 'en', label: 'üá∫üá∏ EN', name: 'English' },
                { id: 'bilingual', label: 'üåê MULTI', name: 'Multi / Bil√≠ngue' }
              ].map(lang => (
                <button
                  key={lang.id}
                  id={`topbar-lang-${lang.id}`}
                  onClick={() => { setLanguage(lang.id); updateGlobalDoc('language', lang.id); }}
                  title={lang.name}
                  className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                    language === lang.id 
                      ? 'bg-white dark:bg-slate-800 shadow-sm text-red-600 dark:text-red-400 font-bold scale-[1.02]' 
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
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

            <div 
                id="topbar-vessels-metric-button"
                onClick={() => setCurrentSlide(2)}
                title={tt("Clique para abrir a Escala de Navios", "ÁÇπÂáªÊâìÂºÄËàπËà∂ËÆ°ÂàíÊéßÂà∂Âè∞", "Click to open Vessel Schedule")}
                className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-3 py-1.5 rounded-xl shadow-3xs transition-all hover:scale-105 hover:border-blue-400 cursor-pointer">
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

                <div 
                  id="slide0-vessels-metric-button"
                  onClick={() => setCurrentSlide(2)}
                  title={tt("Clique para abrir a Escala de Navios", "ÁÇπÂáªÊâìÂºÄËàπËà∂ËÆ°ÂàíÊéßÂà∂Âè∞", "Click to open Vessel Schedule")}
                  className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg transition-all hover:scale-105 hover:border-blue-400 cursor-pointer">
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
    yardKey={key}
    yard={yardItem} 
    ocupacao={getYardOcupacao(yardItem)} 
    isEdit={isEditMode} 
    theme={theme} 
    t={t} 
    language={language} 
    renderLabel={renderLabel} 
    widescreenMode={widescreenMode} 
    onClick={() => setSelectedYardKey(key)}
    onYardChange={handleYardChange}
    onDeleteYard={deleteYard}
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
    yardKey={key}
    yard={yardItem} 
    ocupacao={getYardOcupacao(yardItem)} 
    isEdit={isEditMode} 
    theme={theme} 
    t={t} 
    language={language} 
    renderLabel={renderLabel} 
    widescreenMode={widescreenMode} 
    onClick={() => setSelectedYardKey(key)}
    onYardChange={handleYardChange}
    onDeleteYard={deleteYard}
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
    yardKey={key}
    yard={yardItem} 
    ocupacao={getYardOcupacao(yardItem)} 
    isEdit={isEditMode} 
    theme={theme} 
    t={t} 
    language={language} 
    renderLabel={renderLabel} 
    widescreenMode={widescreenMode} 
    onClick={() => setSelectedYardKey(key)}
    onYardChange={handleYardChange}
    onDeleteYard={deleteYard}
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
                                                          {isEditMode && <th className="py-1 text-center w-8">{tt("A√ß√£o", "Êìç‰Ωú", "Action")}</th>}
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
                            <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{tt("Outros P√°tios Adicionais", "ÂÖ∂‰ªñÈôÑÂä†Â†ÜÂú∫", "Additional Yards")}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                              {otherYards.map(([key, yardItem]) => (
                                <YardCard 
    key={key}
    yardKey={key}
    yard={yardItem} 
    ocupacao={getYardOcupacao(yardItem)} 
    isEdit={isEditMode} 
    theme={theme} 
    t={t} 
    language={language} 
    renderLabel={renderLabel} 
    widescreenMode={widescreenMode} 
    onClick={() => setSelectedYardKey(key)}
    onYardChange={handleYardChange}
    onDeleteYard={deleteYard}
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

                    <div className="flex items-center gap-2">
                      {/* Add Yard Button */}
                      <button
                        onClick={() => setShowAddYardForm(true)}
                        className="px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer transition-all"
                        title={language === 'zh' ? 'Ê∑ªÂä†Êñ∞Â†ÜÂú∫Êàñ‰ªìÂ∫ì' : 'Adicionar Novo P√°tio'}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{language === 'zh' ? 'Êñ∞Âª∫Â†ÜÂú∫' : 'Novo P√°tio'}</span>
                      </button>

                      {/* Edit Mode Quick Toggle */}
                      <button
                        onClick={() => setIsEditMode(!isEditMode)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all border ${
                          isEditMode
                            ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                        }`}
                        title="Alternar modo de edi√ß√£o dos p√°tios"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>{isEditMode ? (language === 'zh' ? 'ÈÄÄÂá∫ÁºñËæë' : 'Concluir Edi√ß√£o') : (language === 'zh' ? 'ÁºñËæëÂ†ÜÂú∫' : 'Editar P√°tios')}</span>
                      </button>

                      <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5"></div>

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
    yardKey={key}
    yard={yard} 
    ocupacao={getYardOcupacao(yard)} 
    isEdit={isEditMode} 
    theme={theme} 
    t={t} 
    language={language} 
    renderLabel={renderLabel} 
    widescreenMode={widescreenMode} 
    onClick={() => setSelectedYardKey(key)}
    onYardChange={handleYardChange}
    onDeleteYard={deleteYard}
  />
                          ))}
                        </div>
                      )}
                      {nonBondedYards.length > 0 && (
                        <div className={`grid ${widescreenMode ? 'grid-cols-4 gap-1.5' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5'}`}>
                          {nonBondedYards.map(([key, yard]) => (
                            <YardCard 
    key={key}
    yardKey={key}
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
      if (yard.type === "BUFFER") {
        setCurrentSlide(4);
      } else {
        setSelectedYardKey(key);
      }
    }}
    onYardChange={handleYardChange}
    onDeleteYard={deleteYard}
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
                                  <th className="p-2.5 w-[100px]">{tt("Programa√ß√£o", "‰∫§Ë¥ßÊéíÁ®ã", "Schedule")}</th>
                                  <th className="p-2.5 w-[120px]">Transportadora</th>
                                  {isEditMode && <th className="p-2.5 w-[60px] text-center">{tt("A√ß√£o", "Êìç‰Ωú", "Action")}</th>}
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
                /* SLIDE 2: ESCALA DE NAVIOS (VESSELS MANAGEMENT & CONTROL TOWER) */
                <div id="slide-dashboard-grid-vessels" className="flex flex-col gap-4">
                  
                  {/* TOP CONTROL & ACTIONS BAR FOR VESSELS */}
                  <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-200/80 shadow-sm'} flex flex-col md:flex-row md:items-center justify-between gap-4`}>
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-200/60 dark:border-blue-800/60 shadow-xs">
                        <Ship className="w-6 h-6 animate-bounce-slow" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-base text-slate-850 dark:text-white tracking-tight flex items-center gap-2">
                            {tt("Gest√£o de Escala de Navios & Janelas (ETA)", "ËàπËà∂Èù†Ê≥äËÆ°Âàí‰∏éÂà∞Ê∏ØÁÆ°ÁêÜÊéßÂà∂Âè∞ (ETA)", "Active Vessel Schedule & Berthing Control")}
                          </h3>
                          <span className="text-[10px] bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            {vessels.length} {tt("Navios", "ËâòËàπËà∂", "Vessels")} ‚Ä¢ {vessels.reduce((acc, curr) => acc + (Number(curr.cntrs) || 0), 0).toLocaleString()} CNTRs
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                          {tt("Cadastre novos navios, edite ETAs, organize a ordem de atraca√ß√£o e monitore o fluxo de entrada.", "Âú®Ê≠§Ê∑ªÂä†Êñ∞Âà∞Ê∏ØËàπËà∂„ÄÅÁºñËæëÈ¢ÑÊä•ETAËàπÊúü„ÄÅË∞ÉÊï¥Èù†Ê≥äÈ°∫Â∫èÂπ∂ÂÆûÊó∂ÁõëÊéßÈõÜË£ÖÁÆ±ÊµÅÂÖ•„ÄÇ", "Register new vessels, edit ETAs, adjust berthing sequence and monitor container inflows in real-time.")}
                        </p>
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Search / Filter input */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={vesselFilterSearch}
                          onChange={(e) => setVesselFilterSearch(e.target.value)}
                          placeholder={tt("Buscar navio, ETA, armador...", "ÊåâËàπÂêç„ÄÅETA„ÄÅËàπÂè∏ÊêúÁ¥¢...", "Search vessel, ETA, carrier...")}
                          className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200 placeholder:text-gray-400 w-44 sm:w-52 font-medium"
                        />
                        {vesselFilterSearch && (
                          <button
                            onClick={() => setVesselFilterSearch('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* View Mode Toggle (Monthly vs List) */}
                      <div className="bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center">
                        <button
                          onClick={() => setVesselViewMode('monthly')}
                          className={`px-2.5 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                            vesselViewMode === 'monthly'
                              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                              : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
                          }`}
                          title={tt("Vis√£o Agrupada por M√™s", "ÊåâÊúà‰ªΩÂàÜÁªÑÂ±ïÁ§∫", "Grouped by Month")}
                        >
                          <Calendar className="w-3 h-3" />
                          <span>{tt("Mensal", "ÊåâÊúà", "Monthly")}</span>
                        </button>
                        <button
                          onClick={() => setVesselViewMode('list')}
                          className={`px-2.5 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                            vesselViewMode === 'list'
                              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                              : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
                          }`}
                          title={tt("Lista Cont√≠nua Cronol√≥gica", "Âπ≥Èì∫È°∫Â∫èÂàóË°®", "Full List")}
                        >
                          <List className="w-3 h-3" />
                          <span>{tt("Lista", "ÂàóË°®", "List")}</span>
                        </button>
                      </div>

                      {/* PRIMARY ADD VESSEL BUTTON - VERY PROMINENT */}
                      <button
                        id="btn-open-add-vessel"
                        onClick={() => setShowAddVesselForm(!showAddVesselForm)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-lg text-xs font-black shadow-md flex items-center gap-2 transition-all transform hover:scale-[1.03] active:scale-[0.98] cursor-pointer ring-2 ring-blue-400/30"
                        title={tt("Cadastrar novo navio no sistema", "Âú®Á≥ªÁªü‰∏≠ÁôªËÆ∞Êñ∞Èù†Ê≥äËàπËà∂", "Add new vessel to schedule")}
                      >
                        {showAddVesselForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        <span className="tracking-wide">{showAddVesselForm ? tt("Fechar Formul√°rio", "Êî∂Ëµ∑Ë°®Âçï", "Close Form") : tt("+ Adicionar Navio", "+ Ê∑ªÂä†Êñ∞ËàπËà∂", "+ Add Vessel")}</span>
                      </button>
                    </div>
                  </div>

                  {/* FORMUL√ÅRIO DE CADASTRO DE NOVO NAVIO (EXPANS√çVEL) */}
                  {showAddVesselForm && (
                    <form
                      id="form-add-vessel"
                      onSubmit={addVessel}
                      className={`p-5 rounded-xl border-2 border-blue-500/40 ${
                        theme === 'dark' ? 'bg-slate-850/95 text-white' : 'bg-blue-50/70 text-slate-850'
                      } shadow-lg animate-in fade-in slide-in-from-top-2 duration-200`}
                    >
                      <div className="flex items-center justify-between pb-3 mb-4 border-b border-blue-200 dark:border-slate-700">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 bg-blue-600 text-white rounded-lg">
                            <Plus className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-sm text-blue-700 dark:text-blue-400 uppercase tracking-tight">
                              {tt("Cadastrar Novo Navio na Escala (Inbound Arrival)", "ÁôªËÆ∞Êñ∞Â¢ûÈù†Ê≥äËàπËà∂ (Inbound Arrival)", "Register New Vessel (Inbound)")}
                            </h4>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                              {tt("Preencha os dados do navio e clique em 'Salvar Navio no Sistema'", "Â°´ÂÜôËàπÂêç„ÄÅETAÊó•ÊúüÂèäÈõÜË£ÖÁÆ±ÁÆ±ÈáèÂêéÁÇπÂáª‰øùÂ≠ò", "Fill the vessel info and click 'Save Vessel to System'")}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAddVesselForm(false)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
                        {/* Nome do Navio */}
                        <div className="col-span-1 sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            {tt("Nome do Navio / ËàπÂêç *", "ËàπÂêç (Vessel Name) *", "Vessel Name *")}
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: BYD EXPLORER NO.1, MSC SANTOS"
                            value={newVesselName}
                            onChange={(e) => setNewVesselName(e.target.value)}
                            className="w-full p-2.5 text-xs font-bold uppercase bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                          />
                        </div>

                        {/* Data ETA */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            {tt("Data ETA / È¢ÑÊä•Âà∞Ê∏ØÊó• *", "È¢ÑÊä•Âà∞Ê∏ØÊó• (ETA Date) *", "ETA Date *")}
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="2026-08-28 ou 28/08/2026"
                            value={newVesselEta}
                            onChange={(e) => setNewVesselEta(e.target.value)}
                            className="w-full p-2.5 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                          />
                        </div>

                        {/* Volume CNTRs */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            {tt("Volume (CNTRs) / ÁÆ±Èáè *", "ÈõÜË£ÖÁÆ±ÁÆ±Èáè (CNTRs) *", "Containers (CNTRs) *")}
                          </label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={newVesselCntrs}
                            onChange={(e) => setNewVesselCntrs(Number(e.target.value))}
                            className="w-full p-2.5 text-xs font-mono font-black text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                          />
                        </div>

                        {/* Armador / Carrier */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            {tt("Armador / ËàπÂÖ¨Âè∏", "ËàπÂÖ¨Âè∏ (Carrier)", "Carrier / Line")}
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: MSC, COSCO, ONE"
                            value={newVesselCarrier}
                            onChange={(e) => setNewVesselCarrier(e.target.value)}
                            className="w-full p-2.5 text-xs font-bold uppercase bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                          />
                        </div>

                        {/* Status Operacional */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            {tt("Status Operacional", "Èù†Ê≥äÁä∂ÊÄÅ (Status)", "Status")}
                          </label>
                          <select
                            value={newVesselStatus}
                            onChange={(e) => setNewVesselStatus(e.target.value)}
                            className="w-full p-2.5 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                          >
                            <option value="SCHEDULED">{tt("AGENDADO (Scheduled)", "ËÆ°Âàí‰∏≠ (Scheduled)", "SCHEDULED")}</option>
                            <option value="BERTHED">{tt("ATRACADO (Berthed)", "Â∑≤Èù†Ê≥ä (Berthed)", "BERTHED")}</option>
                            <option value="DISCHARGED">{tt("DESCARREGADO (Discharged)", "Â∑≤Âç∏Ëàπ (Discharged)", "DISCHARGED")}</option>
                            <option value="DELAYED">{tt("ATRASADO (Delayed)", "Âª∂ËØØ (Delayed)", "DELAYED")}</option>
                          </select>
                        </div>
                      </div>

                      {/* Bot√µes de A√ß√£o do Formul√°rio */}
                      <div className="flex items-center justify-end gap-2.5 mt-4 pt-3.5 border-t border-blue-200 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => setShowAddVesselForm(false)}
                          className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                        >
                          {tt("Cancelar", "ÂèñÊ∂à", "Cancel")}
                        </button>
                        <button
                          type="submit"
                          id="btn-submit-add-vessel"
                          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black shadow-md flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <Check className="w-4 h-4" />
                          <span>{tt("Salvar Navio no Sistema", "‰øùÂ≠òËàπËà∂Âà∞Á≥ªÁªü", "Save Vessel to System")}</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {/* CARDS DE KPI & RESUMO DOS NAVIOS */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-200/70'} flex flex-col justify-between shadow-xs`}>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                        {tt("Total de Navios", "Âà∞Ê∏ØËàπËà∂ÊÄªÊï∞", "Total Vessels")}
                      </span>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-xl font-black font-mono text-blue-600 dark:text-blue-400">
                          {vessels.length}
                        </span>
                        <span className="text-[11px] text-gray-500 font-medium">{tt("navios programados", "ËâòËÆ°Âàí‰∏≠", "vessels scheduled")}</span>
                      </div>
                    </div>

                    <div className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-200/70'} flex flex-col justify-between shadow-xs`}>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                        {tt("Volume Total Previsto", "È¢ÑËÆ°ÈõÜË£ÖÁÆ±ÊÄªÈáè", "Total Expected Cargo")}
                      </span>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                          {vessels.reduce((acc, curr) => acc + (Number(curr.cntrs) || 0), 0).toLocaleString()}
                        </span>
                        <span className="text-[11px] text-gray-500 font-medium">CNTRs</span>
                      </div>
                    </div>

                    <div className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-200/70'} flex flex-col justify-between shadow-xs`}>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                        {tt("Pr√≥xima Chegada (Next ETA)", "‰∏ã‰∏ÄËâòÊäµÊ∏ØËàπ", "Next ETA")}
                      </span>
                      <div className="flex flex-col mt-1 truncate">
                        <span className="text-xs font-black truncate text-slate-800 dark:text-white">
                          {vessels[0]?.name || '-'}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-blue-500">
                          {vessels[0]?.eta ? `ETA: ${vessels[0].eta}` : '-'}
                        </span>
                      </div>
                    </div>

                    <div className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-200/70'} flex flex-col justify-between shadow-xs`}>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                        {tt("M√©dia por Navio", "ÂçïËàπÂπ≥ÂùáÁÆ±Èáè", "Avg per Vessel")}
                      </span>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-xl font-black font-mono text-purple-600 dark:text-purple-400">
                          {vessels.length > 0 ? Math.round(vessels.reduce((acc, curr) => acc + (Number(curr.cntrs) || 0), 0) / vessels.length).toLocaleString() : 0}
                        </span>
                        <span className="text-[11px] text-gray-500 font-medium">CNTRs/navio</span>
                      </div>
                    </div>
                  </div>

                  {/* GRID PRINCIPAL: TABELA/LISTA DE NAVIOS + NOTAS OPERACIONAIS */}
                  <div className="grid grid-cols-12 gap-4">
                    
                    {/* LADO ESQUERDO: TABELA & LISTA DE NAVIOS COM EDI√á√ÉO INLINE E BOT√ÉO ADICIONAR */}
                    <div className="col-span-12 lg:col-span-6 flex flex-col gap-4">
                      <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-200/80 shadow-sm'} flex flex-col justify-between`}>
                        
                        {/* Subheader da Tabela */}
                        <div className="flex items-center justify-between border-b pb-2 mb-3 border-gray-100 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <Ship className="w-4 h-4 text-blue-500" />
                            <h4 className="font-extrabold text-xs text-blue-800 dark:text-blue-300 uppercase tracking-tight">
                              {vesselViewMode === 'monthly' ? tt("Cronograma Agrupado por M√™s", "ÊåâÊúàÂàíÂàÜÈù†Ê≥äËÆ°Âàí", "Monthly Berthing Schedule") : tt("Escala Completa Cronol√≥gica", "ÊåâÂà∞Ê∏ØÂÖàÂêéÂπ≥Èì∫ÂàóË°®", "Chronological Vessel Queue")}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Bot√£o r√°pido adicionar navio no cabe√ßalho da tabela */}
                            <button
                              type="button"
                              onClick={() => setShowAddVesselForm(true)}
                              className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/80 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded cursor-pointer transition-all flex items-center gap-1 border border-emerald-200/60 dark:border-emerald-800/60 shadow-2xs"
                              title={tt("Adicionar novo navio", "Ê∑ªÂä†Êñ∞ËàπËà∂", "Add new vessel")}
                            >
                              <Plus className="w-3 h-3" />
                              <span>{tt("Novo Navio", "Êñ∞Â¢ûËàπËà∂", "New Vessel")}</span>
                            </button>

                            {vesselViewMode === 'monthly' && (
                              (() => {
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
                                        <span>{tt("Recolher Todos", "ÂÖ®ÈÉ®ÊäòÂè†", "Collapse All")}</span>
                                      </>
                                    ) : (
                                      <>
                                        <Maximize2 className="w-2.5 h-2.5" />
                                        <span>{tt("Expandir Todos", "ÂÖ®ÈÉ®Â±ïÂºÄ", "Expand All")}</span>
                                      </>
                                    )}
                                  </button>
                                );
                              })()
                            )}
                          </div>
                        </div>

                        {/* LISTAGEM DOS NAVIOS */}
                        {(() => {
                          // Filtragem por busca
                          const filteredVessels = vessels.filter(v => {
                            if (!vesselFilterSearch.trim()) return true;
                            const query = vesselFilterSearch.toLowerCase();
                            return (
                              v.name.toLowerCase().includes(query) ||
                              v.eta.toLowerCase().includes(query) ||
                              (v.carrier && v.carrier.toLowerCase().includes(query)) ||
                              (v.status && v.status.toLowerCase().includes(query)) ||
                              String(v.cntrs).includes(query)
                            );
                          });

                          if (filteredVessels.length === 0) {
                            return (
                              <div className="text-center py-12 text-gray-400 flex flex-col items-center gap-3">
                                <Ship className="w-10 h-10 opacity-40 text-gray-400" />
                                <span className="text-xs font-semibold">
                                  {vesselFilterSearch 
                                    ? tt("Nenhum navio encontrado para a busca atual.", "Êú™ÊâæÂà∞Á¨¶ÂêàÊêúÁ¥¢Êù°‰ª∂ÁöÑËàπËà∂ËÆ∞ÂΩï„ÄÇ", "No vessels match your search query.")
                                    : tt("Nenhum navio cadastrado.", "ÊöÇÊó†ËàπËà∂ËÆ∞ÂΩï„ÄÇ", "No vessels registered.")}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setShowAddVesselForm(true)}
                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>{tt("Adicionar Primeiro Navio", "Ê∑ªÂä†Á¨¨‰∏ÄËâòËàπËà∂", "Add First Vessel")}</span>
                                </button>
                              </div>
                            );
                          }

                          // VIS√ÉO MENSAL AGRUPADA
                          if (vesselViewMode === 'monthly') {
                            const monthlyGroups = groupVesselsByMonth(filteredVessels, language);
                            return (
                              <div className="flex flex-col gap-3">
                                {monthlyGroups.map((group) => {
                                  const isExpanded = !!expandedVesselMonths[group.monthKey];
                                  return (
                                    <div
                                      key={group.monthKey}
                                      className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                                        theme === 'dark'
                                          ? isExpanded ? 'bg-slate-800/80 border-blue-900/60' : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
                                          : isExpanded ? 'bg-blue-50/40 border-blue-200/80' : 'bg-slate-50/80 border-slate-200/70 hover:border-blue-300'
                                      }`}
                                    >
                                      {/* Month Header Bar */}
                                      <button
                                        type="button"
                                        onClick={() => toggleVesselMonth(group.monthKey)}
                                        className="w-full px-3.5 py-2.5 flex items-center justify-between text-left cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                                      >
                                        <div className="flex items-center gap-2.5">
                                          <div className={`p-1 rounded-md transition-transform duration-200 ${isExpanded ? 'rotate-180 bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                                            <ChevronDown className="w-3.5 h-3.5" />
                                          </div>
                                          <span className="font-extrabold text-xs text-slate-800 dark:text-white tracking-tight">
                                            {group.monthLabel}
                                          </span>
                                          <span className="text-[10px] bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold px-2 py-0.5 rounded-full">
                                            {group.vessels.length} {tt("navios", "Ëâò", "vessels")}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <span className="font-mono font-black text-xs text-blue-600 dark:text-blue-400 bg-white/80 dark:bg-slate-900/80 px-2.5 py-1 rounded-md border border-blue-200/60 dark:border-blue-800/50 shadow-2xs">
                                            {group.totalCntrs.toLocaleString()} <span className="text-[9.5px] font-normal text-gray-400">CNTRs</span>
                                          </span>
                                        </div>
                                      </button>

                                      {/* Collapsible Body Table */}
                                      {isExpanded && (
                                        <div className="border-t border-slate-200/70 dark:border-slate-700/60 p-2 bg-white dark:bg-slate-900/80 overflow-x-auto">
                                          <table className="w-full text-left text-xs">
                                            <thead>
                                              <tr className="border-b border-gray-200 dark:border-slate-800 text-gray-400 font-extrabold uppercase text-[9px] tracking-wider">
                                                <th className="py-2 px-2">{tt("Navio / ËàπÂêç", "ËàπÂêç", "Vessel")}</th>
                                                <th className="py-2 px-2 text-center">{tt("Data ETA", "È¢ÑÊä•Âà∞Ê∏ØÊó•", "ETA Date")}</th>
                                                <th className="py-2 px-2 text-center">{tt("Armador / Status", "ËàπÂè∏/Áä∂ÊÄÅ", "Carrier / Status")}</th>
                                                <th className="py-2 px-2 text-right">{tt("Volume", "ÁÆ±Èáè", "Containers")}</th>
                                                <th className="py-2 px-2 text-center w-28">{tt("A√ß√µes", "Êìç‰Ωú", "Actions")}</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800/40">
                                              {group.vessels.map((vessel, idx) => {
                                                const isEditing = editingVesselId === vessel.id;
                                                return (
                                                  <tr key={vessel.id || idx} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors">
                                                    {/* Navio Name */}
                                                    <td className="py-2 px-2">
                                                      {isEditing ? (
                                                        <input
                                                          type="text"
                                                          value={editVesselName}
                                                          onChange={(e) => setEditVesselName(e.target.value)}
                                                          className="w-full p-1 text-xs font-bold uppercase bg-white dark:bg-slate-800 border border-blue-400 rounded outline-none"
                                                        />
                                                      ) : (
                                                        <div className="flex flex-col">
                                                          <span className="font-black text-gray-850 dark:text-gray-100 text-xs tracking-tight">
                                                            {vessel.name}
                                                          </span>
                                                          <span className="text-[9.5px] text-gray-400 font-medium">
                                                            {vessel.terminal || 'Porto de Santos'}
                                                          </span>
                                                        </div>
                                                      )}
                                                    </td>

                                                    {/* ETA */}
                                                    <td className="py-2 px-2 text-center">
                                                      {isEditing ? (
                                                        <input
                                                          type="text"
                                                          value={editVesselEta}
                                                          onChange={(e) => setEditVesselEta(e.target.value)}
                                                          className="w-24 p-1 text-xs font-mono font-bold text-center bg-white dark:bg-slate-800 border border-blue-400 rounded outline-none"
                                                        />
                                                      ) : (
                                                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs">
                                                          {vessel.eta}
                                                        </span>
                                                      )}
                                                    </td>

                                                    {/* Carrier / Status */}
                                                    <td className="py-2 px-2 text-center">
                                                      {isEditing ? (
                                                        <div className="flex flex-col gap-1">
                                                          <input
                                                            type="text"
                                                            value={editVesselCarrier}
                                                            placeholder="Carrier"
                                                            onChange={(e) => setEditVesselCarrier(e.target.value)}
                                                            className="w-full p-1 text-[10px] font-bold uppercase bg-white dark:bg-slate-800 border border-blue-400 rounded outline-none"
                                                          />
                                                          <select
                                                            value={editVesselStatus}
                                                            onChange={(e) => setEditVesselStatus(e.target.value)}
                                                            className="w-full p-1 text-[9.5px] font-bold bg-white dark:bg-slate-800 border border-blue-400 rounded"
                                                          >
                                                            <option value="SCHEDULED">SCHEDULED</option>
                                                            <option value="BERTHED">BERTHED</option>
                                                            <option value="DISCHARGED">DISCHARGED</option>
                                                            <option value="DELAYED">DELAYED</option>
                                                          </select>
                                                        </div>
                                                      ) : (
                                                        <div className="flex flex-col items-center gap-0.5">
                                                          <span className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                                                            {vessel.carrier || 'BYD CHARTER'}
                                                          </span>
                                                          <span className={`text-[8.5px] font-extrabold px-1.5 py-0.2 rounded-full uppercase ${
                                                            vessel.status === 'BERTHED' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                                                            vessel.status === 'DISCHARGED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                                                            vessel.status === 'DELAYED' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                                                            'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                                          }`}>
                                                            {vessel.status || 'SCHEDULED'}
                                                          </span>
                                                        </div>
                                                      )}
                                                    </td>

                                                    {/* Volume (CNTRs) */}
                                                    <td className="py-2 px-2 text-right">
                                                      {isEditing ? (
                                                        <input
                                                          type="number"
                                                          value={editVesselCntrs}
                                                          onChange={(e) => setEditVesselCntrs(Number(e.target.value))}
                                                          className="w-20 p-1 text-xs font-mono font-black text-right text-blue-600 bg-white dark:bg-slate-800 border border-blue-400 rounded outline-none"
                                                        />
                                                      ) : (
                                                        <span className="font-black text-blue-600 dark:text-blue-400 text-xs font-mono">
                                                          {vessel.cntrs.toLocaleString()} <span className="text-[9px] font-normal text-gray-400">CNTRs</span>
                                                        </span>
                                                      )}
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="py-2 px-2 text-center">
                                                      {isEditing ? (
                                                        <div className="flex items-center justify-center gap-1">
                                                          <button
                                                            type="button"
                                                            onClick={() => saveEditVessel(vessel.id)}
                                                            className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer transition-colors shadow-2xs"
                                                            title={tt("Salvar altera√ß√µes", "‰øùÂ≠ò‰øÆÊîπ", "Save changes")}
                                                          >
                                                            <Check className="w-3.5 h-3.5" />
                                                          </button>
                                                          <button
                                                            type="button"
                                                            onClick={() => setEditingVesselId(null)}
                                                            className="p-1 bg-gray-300 hover:bg-gray-400 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded cursor-pointer transition-colors"
                                                            title={tt("Cancelar", "ÂèñÊ∂à", "Cancel")}
                                                          >
                                                            <X className="w-3.5 h-3.5" />
                                                          </button>
                                                        </div>
                                                      ) : (
                                                        <div className="flex items-center justify-center gap-1">
                                                          <button
                                                            type="button"
                                                            onClick={() => startEditVessel(vessel)}
                                                            className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/60 rounded cursor-pointer transition-colors"
                                                            title={tt("Editar navio", "ÁºñËæëËàπËà∂", "Edit vessel")}
                                                          >
                                                            <Edit3 className="w-3.5 h-3.5" />
                                                          </button>
                                                          <button
                                                            type="button"
                                                            onClick={() => shiftVessel(vessel.id, 'up')}
                                                            className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded cursor-pointer transition-colors"
                                                            title={tt("Mover para cima", "‰∏äÁßª‰ºòÂÖàÁ∫ß", "Move up")}
                                                          >
                                                            <ArrowUp className="w-3.5 h-3.5" />
                                                          </button>
                                                          <button
                                                            type="button"
                                                            onClick={() => shiftVessel(vessel.id, 'down')}
                                                            className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded cursor-pointer transition-colors"
                                                            title={tt("Mover para baixo", "‰∏ãÁßª‰ºòÂÖàÁ∫ß", "Move down")}
                                                          >
                                                            <ArrowDown className="w-3.5 h-3.5" />
                                                          </button>
                                                          <button
                                                            type="button"
                                                            onClick={() => {
                                                              if (window.confirm(tt(`Remover o navio ${vessel.name} da escala?`, `Á°ÆÂÆöË¶ÅÂ∞ÜËàπËà∂ ${vessel.name} ‰ªéÈù†Ê≥äËÆ°Âàí‰∏≠Âà†Èô§ÂêóÔºü`, `Remove vessel ${vessel.name} from schedule?`))) {
                                                                deleteVessel(vessel.id);
                                                              }
                                                            }}
                                                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded cursor-pointer transition-colors"
                                                            title={tt("Excluir navio", "Âà†Èô§ËàπËà∂", "Delete vessel")}
                                                          >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                          </button>
                                                        </div>
                                                      )}
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
                            );
                          }

                          // VIS√ÉO EM LISTA CRONOL√ìGICA CONT√çNUA
                          return (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="border-b border-gray-200 dark:border-slate-800 text-gray-400 font-extrabold uppercase text-[9.5px] tracking-wider">
                                    <th className="py-2 px-2.5">#</th>
                                    <th className="py-2 px-2.5">{tt("Navio / ËàπÂêç", "ËàπÂêç", "Vessel")}</th>
                                    <th className="py-2 px-2.5 text-center">{tt("Data ETA", "È¢ÑÊä•Âà∞Ê∏ØÊó•", "ETA Date")}</th>
                                    <th className="py-2 px-2.5 text-center">{tt("Armador / Status", "ËàπÂè∏/Áä∂ÊÄÅ", "Carrier / Status")}</th>
                                    <th className="py-2 px-2.5 text-right">{tt("Volume", "ÁÆ±Èáè", "Containers")}</th>
                                    <th className="py-2 px-2.5 text-center w-28">{tt("A√ß√µes", "Êìç‰Ωú", "Actions")}</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-800/40">
                                  {filteredVessels.map((vessel, idx) => {
                                    const isEditing = editingVesselId === vessel.id;
                                    return (
                                      <tr key={vessel.id || idx} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="py-2 px-2.5 text-gray-400 font-mono text-[10px] font-bold">
                                          {idx + 1}
                                        </td>
                                        <td className="py-2 px-2.5">
                                          {isEditing ? (
                                            <input
                                              type="text"
                                              value={editVesselName}
                                              onChange={(e) => setEditVesselName(e.target.value)}
                                              className="w-full p-1 text-xs font-bold uppercase bg-white dark:bg-slate-800 border border-blue-400 rounded outline-none"
                                            />
                                          ) : (
                                            <div className="flex flex-col">
                                              <span className="font-black text-gray-850 dark:text-gray-100 text-xs">
                                                {vessel.name}
                                              </span>
                                              <span className="text-[9.5px] text-gray-400 font-medium">
                                                {vessel.terminal || 'Porto de Santos'}
                                              </span>
                                            </div>
                                          )}
                                        </td>
                                        <td className="py-2 px-2.5 text-center">
                                          {isEditing ? (
                                            <input
                                              type="text"
                                              value={editVesselEta}
                                              onChange={(e) => setEditVesselEta(e.target.value)}
                                              className="w-24 p-1 text-xs font-mono font-bold text-center bg-white dark:bg-slate-800 border border-blue-400 rounded outline-none"
                                            />
                                          ) : (
                                            <span className="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs">
                                              {vessel.eta}
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-2 px-2.5 text-center">
                                          {isEditing ? (
                                            <div className="flex flex-col gap-1">
                                              <input
                                                type="text"
                                                value={editVesselCarrier}
                                                placeholder="Carrier"
                                                onChange={(e) => setEditVesselCarrier(e.target.value)}
                                                className="w-full p-1 text-[10px] font-bold uppercase bg-white dark:bg-slate-800 border border-blue-400 rounded outline-none"
                                              />
                                              <select
                                                value={editVesselStatus}
                                                onChange={(e) => setEditVesselStatus(e.target.value)}
                                                className="w-full p-1 text-[9.5px] font-bold bg-white dark:bg-slate-800 border border-blue-400 rounded"
                                              >
                                                <option value="SCHEDULED">SCHEDULED</option>
                                                <option value="BERTHED">BERTHED</option>
                                                <option value="DISCHARGED">DISCHARGED</option>
                                                <option value="DELAYED">DELAYED</option>
                                              </select>
                                            </div>
                                          ) : (
                                            <div className="flex flex-col items-center gap-0.5">
                                              <span className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                                                {vessel.carrier || 'BYD CHARTER'}
                                              </span>
                                              <span className={`text-[8.5px] font-extrabold px-1.5 py-0.2 rounded-full uppercase ${
                                                vessel.status === 'BERTHED' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                                                vessel.status === 'DISCHARGED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                                                vessel.status === 'DELAYED' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                                                'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                              }`}>
                                                {vessel.status || 'SCHEDULED'}
                                              </span>
                                            </div>
                                          )}
                                        </td>
                                        <td className="py-2 px-2.5 text-right">
                                          {isEditing ? (
                                            <input
                                              type="number"
                                              value={editVesselCntrs}
                                              onChange={(e) => setEditVesselCntrs(Number(e.target.value))}
                                              className="w-20 p-1 text-xs font-mono font-black text-right text-blue-600 bg-white dark:bg-slate-800 border border-blue-400 rounded outline-none"
                                            />
                                          ) : (
                                            <span className="font-black text-blue-600 dark:text-blue-400 text-xs font-mono">
                                              {vessel.cntrs.toLocaleString()} <span className="text-[9px] font-normal text-gray-400">CNTRs</span>
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-2 px-2.5 text-center">
                                          {isEditing ? (
                                            <div className="flex items-center justify-center gap-1">
                                              <button
                                                type="button"
                                                onClick={() => saveEditVessel(vessel.id)}
                                                className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer transition-colors shadow-2xs"
                                                title={tt("Salvar altera√ß√µes", "‰øùÂ≠ò‰øÆÊîπ", "Save changes")}
                                              >
                                                <Check className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setEditingVesselId(null)}
                                                className="p-1 bg-gray-300 hover:bg-gray-400 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded cursor-pointer transition-colors"
                                                title={tt("Cancelar", "ÂèñÊ∂à", "Cancel")}
                                              >
                                                <X className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          ) : (
                                            <div className="flex items-center justify-center gap-1">
                                              <button
                                                type="button"
                                                onClick={() => startEditVessel(vessel)}
                                                className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/60 rounded cursor-pointer transition-colors"
                                                title={tt("Editar navio", "ÁºñËæëËàπËà∂", "Edit vessel")}
                                              >
                                                <Edit3 className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => shiftVessel(vessel.id, 'up')}
                                                className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded cursor-pointer transition-colors"
                                                title={tt("Mover para cima", "‰∏äÁßª‰ºòÂÖàÁ∫ß", "Move up")}
                                              >
                                                <ArrowUp className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => shiftVessel(vessel.id, 'down')}
                                                className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded cursor-pointer transition-colors"
                                                title={tt("Mover para baixo", "‰∏ãÁßª‰ºòÂÖàÁ∫ß", "Move down")}
                                              >
                                                <ArrowDown className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  if (window.confirm(tt(`Remover o navio ${vessel.name} da escala?`, `Á°ÆÂÆöË¶ÅÂ∞ÜËàπËà∂ ${vessel.name} ‰ªéÈù†Ê≥äËÆ°Âàí‰∏≠Âà†Èô§ÂêóÔºü`, `Remove vessel ${vessel.name} from schedule?`))) {
                                                    deleteVessel(vessel.id);
                                                  }
                                                }}
                                                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded cursor-pointer transition-colors"
                                                title={tt("Excluir navio", "Âà†Èô§ËàπËà∂", "Delete vessel")}
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          );
                        })()}

                        {/* Rodap√© da tabela com soma de cont√™ineres */}
                        <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
                          <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                            {tt("Soma Total de Cont√™ineres / ÁÆ±ÈáèÊÄªËÆ°", "È¢ÑËÆ°ÊäµÊ∏ØÈõÜË£ÖÁÆ±ÊÄªËÆ°", "Total Scheduled Containers")}:
                          </span>
                          <span className="font-mono font-black text-sm text-blue-600 dark:text-blue-400">
                            {vessels.reduce((acc, curr) => acc + (Number(curr.cntrs) || 0), 0).toLocaleString()} <span className="text-xs font-normal text-gray-400">CNTRs</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* LADO DIREITO: 2 √ÅREAS DE NOTAS OPERACIONAIS */}
                    <div className="col-span-12 lg:col-span-6 flex flex-col gap-4">
                      
                      {/* NOTA 1: JANELAS OPERACIONAIS DE ATRACA√á√ÉO */}
                      <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-200/80 shadow-sm'} flex flex-col justify-between min-h-[220px]`}>
                        <div className="flex items-center justify-between border-b pb-2 mb-2 border-gray-100 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <h4 className="font-bold text-xs text-blue-850 dark:text-blue-200 uppercase tracking-wider block">
                              {language === 'bilingual' ? '1. JANELAS OPERACIONAIS DE ATRACA√á√ÉO / ËàπÊúü‰∏éÈù†Ê≥äËØ¥Êòé' : language === 'zh' ? '1. ËàπÊúü‰∏éÈù†Ê≥äËØ¥Êòé' : '1. JANELAS OPERACIONAIS DE ATRACA√á√ÉO'}
                            </h4>
                          </div>
                          <span className="text-[10px] bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold px-2 py-0.5 rounded">
                            {isEditMode ? tt("Modo Edi√ß√£o Ativo", "ÁºñËæëÊ®°Âºè", "Edit Mode") : tt("Notas Ativas", "ÂÆûÊó∂Â§áÊ≥®", "Active Notes")}
                          </span>
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
                              placeholder="Digite as observa√ß√µes de escala, janelas de atraca√ß√£o e detalhes dos navios... / Âú®Ê≠§ÁºñÂÜôÈù†Ê≥äÁ™óÂè£‰∏éËàπÊúüÂ§áÂøòË¶ÅÁÇπ..."
                              className="w-full flex-1 min-h-[140px] p-2.5 text-xs font-semibold border border-gray-200 dark:border-gray-700 dark:bg-slate-800 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none resize-none text-slate-800 dark:text-slate-100 placeholder:text-gray-400 font-sans"
                            />
                          ) : (
                            <div className="text-xs leading-relaxed font-bold text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans p-3 bg-slate-50/60 dark:bg-slate-900/60 rounded-lg border border-slate-100 dark:border-none flex-1">
                              {vesselNote1 || "Escala regular de navios ativa - Monitoramento detalhado das janelas de atraca√ß√£o. / Â∏∏ËßÑÊ¥ªË∑ÉËàπËà∂Èù†Ê≥äËÆ°Âàí - ËØ¶ÁªÜÁõëÊéßÂíåÁÆ°ÁêÜÊ≥ä‰ΩçÁ™óÂè£„ÄÇ"}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* NOTA 2: LOG√çSTICA DE LIBERA√á√ÉO E PRIORIDADE BYD */}
                      <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-200/80 shadow-sm'} flex flex-col justify-between min-h-[220px]`}>
                        <div className="flex items-center justify-between border-b pb-2 mb-2 border-gray-100 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-450" />
                            <h4 className="font-bold text-xs text-emerald-800 dark:text-emerald-200 uppercase tracking-wider block">
                              {language === 'bilingual' ? '2. LOG√çSTICA DE LIBERA√á√ÉO E PRIORIDADE BYD / Âè£Â≤∏ÊèêËøê‰∏éÂá∫ÁÆ±‰ºòÂÖàÁ∫ß' : language === 'zh' ? '2. Âè£Â≤∏ÊèêËøê‰∏éÂá∫ÁÆ±‰ºòÂÖàÁ∫ß' : '2. LOG√çSTICA DE LIBERA√á√ÉO E PRIORIDADE BYD'}
                            </h4>
                          </div>
                          <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded">
                            {isEditMode ? tt("Modo Edi√ß√£o Ativo", "ÁºñËæëÊ®°Âºè", "Edit Mode") : tt("Prioridades", "‰ºòÂÖàÁ∫ß", "Priorities")}
                          </span>
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
                              className="w-full flex-1 min-h-[140px] p-2.5 text-xs font-semibold border border-gray-200 dark:border-gray-700 dark:bg-slate-800 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none resize-none text-slate-800 dark:text-slate-100 placeholder:text-gray-400 font-sans"
                            />
                          ) : (
                            <div className="text-xs leading-relaxed font-bold text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans p-3 bg-slate-50/60 dark:bg-slate-900/60 rounded-lg border border-slate-100 dark:border-none flex-1">
                              {vesselNote2 || "Destaques operacionais dos navios (Ex: Prioridades de descarga BYD). / ËàπËà∂ËøêËê•ÈáçÁÇπ‰∫ÆÁÇπ (‰æãÂ¶Ç: ÊØî‰∫öËø™ÈáçÁÆ±Âç∏Ëàπ‰ºòÂÖàÈ°∫Â∫è)„ÄÇ"}
                            </div>
                          )}
                        </div>
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
                            placeholder={tt("Buscar cont√™iner...", "ÊêúÁ¥¢ÈõÜË£ÖÁÆ±...", "Search container...")}
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
                             xúÏΩÎ{’µ¸˝˝+6~)ñ[À∑ƒ!¯$Êï%%—©m˘HJ8ú<yö±4±Á i‘ô±c„˙yJH†‰“ÖB(Ñ[-ÅJs·Ú¡ˇ	µd˚SœüÆµ˜\ˆ‹˜»vH z ñffÔŸóµ◊^kÌµ~ã˙Y©KÕπiN&$ΩœŒ˜íˇá}û$'€Á˛F]iHFu^iŒe’¶!)MY”ÍrsŒò_%Î∑>iø|{Î‹≈ç7üﬂzÎÖÕ˜œm‹¸€øŒ<◊æzcÛª?mù˘ﬂ_ø‹yÓF˚ÚgÎw?‹xÎÀŒ•;Ô?ˇ˛Ã’Õõ◊⁄˛–π|eÛÀÎù◊ø⁄z˝Kíö—‘9MjHk◊◊ﬁW˚æ?Ûv˚/„£ﬂ]Ÿ¸ˆïˆπø∂/ﬂ"©¨§iä¨·m¨˛µœ;o∂?aÛ¸'Ìón¥Øº‹˘‘|	‹Ö◊∂/^nøÙq˚ÚKíˆ7ÿ¸ÓççèÔ@3·Ó÷ŸÔ⁄Á.ÆﬂπæÒÍ;õ_ùÎ\}ßs˜œÔÊó∑°'jåúúRuCìö55z∏™piÌºñíıæíôìõ5ôHDìEìjëIM^TÎt HKìÂfu^∆ä%ä◊öWöïî%∏+ii(Ü2'i§∫†™•·ø∆Ç¶¡åú\Ë¡Å¡÷xÏck ¢¿c≥Ü°6ﬁ™6≥u•˙Ã¡ïT98NtŸ(Àuπj»µú’¸Æúj.‘Î}"˝®÷%]üñÚ¡û÷Rzd`î¥ñ”√dv.≠…µÙ–ôWemÃº0jíˆåı˚â—°¡ΩÊ%◊ÉO—Üºd–ﬂè[Ì+{· )òŸ4\–§Yµ^cOj-ù ö∫ ì\K7‡2–à¶6”RΩN§™°, czU™À– 2´j5Y3ˇxZÈ\√ÌÇ	◊tUK∑T•i»ZOÏ≈œ^ ≥xíÙvnù€˙”üæµuÊEÚ˝’◊zÅ‚{…’y ªúlHıyYß◊„ßÈ¿ £ê∏∆òÙ˜<ƒœ;N€©∫z:Ωîñï4§•Ù|˙¯û!:ˆ›ez∑GÄúi∂.Ûo8ù>ÙhMÔ0VKø◊ÂSÜ5o∞JÎRKó^ÄØòó•ö»ì¯¨∆∑ËSØKÜLi€"eveˇêI∞«ü¿&.¥Z≤Vït	∞˙¶Ùi)ç>√äå∫»ö]≥	{∂≈¨˛ÕZ_ÄS/˚(îïÑE"‘}s\ã7=BZıÙûûÒBéÿ<Ù¿†1ﬂ}Ö=„»î… ôTyªu=-i5®jfÌ¨‰ÌVvL÷uπ’MKã€≠çÕgU¶a<_…Ïduá`/"•±Õ·sWöS`;+…∫!¡o}'k.í±†√∏Êú˝tõı7îf˙4,˚=îùp#fop∂ {á·6ùX)ˇ˜Œ+ÁàKˆ!)*¿ªõÜ⁄∑´∑W¨o˝Ô¢m{Û-R¡ç´•jÜTSAË∞E0ÒÜ¡ìöCÊàåYµ∂Ãwˆ‡kÈeb~°jò€ŸÕÎó§É—êk BCh4Ñ˙$6§V*UÌ'
ïwV'F›Äñ,Î‰ ôìç|+…®j?§jˆR’æˇHTß¢a?¨-¿VœÍv|∂»cè±»P“*èj@¥Fhç„…êS˝A2*Z‚—öêjsrV≠´4∆È*3ú<ËZ∂ÅBó_4tˆËPØ`≥PC∞«∆lÇ™„æ=j∂Òç¿ﬂÆV‡∆,¯f‡U`0I⁄Å/ó≤&’π1∞.pM∞.Ò≠∞Æ˘b›¿∂¸Gú–f}@ÂY–ö$%‹xûëóÆ(´¸ö∑ÖuKéÒ»ˆZ«6{p∂˙’¶à0»7§$∞òå’ˇŸãüpqí”Ûä!É∂É™∂†g|•:†‘VÅÎ	
Å°M†o◊°{N;hÌuêx»o~Cz”Ωªè 3[_ê”˚\]¶óˆ"Ô\Y¡I?^¿øÖ⁄â'öP-∂Õ∫¥≥4¥ÖfÊÄÍ∏ˇç‡˛◊C≈®Àah©ÏÖEW«›?w†ú4‚¥âŒ®L;8!¸{Ëw©1ÿ=	Ï,qú°e∫›iO¢U€¶{◊x2o0[£∑§&◊ûïìh	@;¿–Ä≠]Û™πáÑ9M˝—˜6≤zr5Ygú¡>ä∂4V„*©Åh/‘AíÍ;â∂#˚Üêπ∆’ﬂAÏp≤vı¡+∑;Æ=t©pEv∫´Ü$ÈÌÓ≠«dZ@Ü2ßjÀÃBíÀOéÂK˘\Ôê+⁄≠Üô›ä“´≥„éo¬{<˚∑{Õsª≤«≤ƒmÓÉ£.Kßòã¡1$+¸ÿ√Û†∂oP‘ıãÉ{8Èq_∞“dÀ€›—û…OÁ
”áÔ≈XÔÊ⁄]¸9…Üæd¶Ú”ï"9T»OÊ»œΩ”ø˛9-|ÿ?°£	«˚Ä“l-	á⁄XnôÃ3ﬁ\Î˛¥ÄH‰yÿ£dÌ`O~iååå=Ì»æ§U-J ê°Ù”2ÌUI•€øÄ˘÷˝QõŸy¥—\I…T´Ö_µ∫|¥Uik¶áπ^K°î€Ozπwˆˆy¿ê@+2hõ~¸vYòP&a˚Õ°-∫∞VÂh∞ÖùäJ’ùø>:d]‘–Ü:Ãˇ∞Ós2'â‚ö_“É5Ñ˝∂[537,u¡®√`¶õjSN6·Éâ∂Õ.ñj•îô.œKïLÆX Ï–j}¿V„ñ'ª^ÜÜ€¥vØV¢˚µ˜¡bdwCè‹´ë*ïQÀ—~‡'¥EM¨¯¥Æ
“A¯°7ïì©’OT8; ﬁìu®ı2à0WÜáV›|dø_;∂¥näÈ•Qˇ!nwZB»ÍﬂØuÆæÿæz£ÛÈÌ/l¸ÌÓ˙≠ﬂu^¸∂}·sø=`ùñõÛŒe æjökË˙C‰&ﬁ”`˝2O Yáãßî∫°©	8Hß0!∫ÅÍ–Ç/‚~@ObOç∑ıHƒ¬XÌKA∑BnYÿÅı±öÑ⁄ÜjMu&æiîÎJçQ’h†∂	õqy≤êÀì}c†yÕ+$[úÆîäì‰1íôú,f3ïBqˆfˇõÒ ]©Ï—ÒÈö§œœ™íVÉ•°‘“5π•zèÀ∞r™./¸èª…ˇ.ËÜrj9=+ßeπI]¡ÛeΩäÓ+SjçﬁÁ”«´RΩöV˙≥Ù˛—÷Rw$?Ø‘Ä®)›„a<ªoµ–ÃI≠ÙﬁﬁÎK¿%*ëgÏû9:AKÊx∏F!àB=+'·Ìˆ≤T∑∂¨GWåyP¢Ÿ
GF“k⁄ıèˇø√Ú»{fOﬂ˛Âÿ{M;<€]‚>£œ√í>ù÷Ω´ƒ=Ãç⁄˝Æ©ß}CU5Ù¥{∏Åœ±ü&„√A‹f¿Ú:Q–W˙ãáÚ@oyÓÄ≈£d¡∂èn9‹pFÎ–l˜¿!•.ó[ö,’ÙyY6‹‚«>2üﬁ◊æ’F2Åë‚¿¸◊`ÿ¿ı	√ë8õÅÌùa(sÛF‰Æ„ŸefG‡wùbƒ‚$Ìãó7oﬁlø˚B˚”7÷o]Í‹˙¨}˘˝Œ?Œ∂Ø¸æ˝“çŒô≥õüˇˆ#$“¿ù,A˘àÜDlPÁ˜DL@Àgà‰qÏΩ‹≥Ω€Æ,Ï¨7…ÿZ;¯gó;Ø›:π}˚ãˆ€Á7ﬁ˙}Á“ıù9€πz¶˝¡u÷˚ˆÕ€ ¿÷{o√-°Õ∑◊o]m_π∞˛Õ’çóæÇg÷Ô|–æ¸‚∆ÕkW^ÿxÁ„≠7˛AGe'M≠É¿¨4◊ﬁk(U›˘ÍJ(Iáãk◊4E’˚IUjIU•&¡M]ù%L
0T"√◊FK2§z}µJ¯≤%D¯ F¨ï('-1ÆÆÁõúM≥Ω…Rˆπ∏™Wz„Mˇ>Îö«*ÇÇâaÎ/ol‹πæÒ‚«@ù?’˘ÛÛù∑ø£ìXñõä™ëIuN]’…å‘îÎ°cm}ãÖXˇØHoÁ¯ìSÑÇÜ-Å¢6≈µèV≤È=M¬]åF(!Üì!
G
áè§'Û«Úì§0]….e*˘ô,.î+Ölô¸r¶†á+©TÑ≥s60TC™gÁ–ÁÅäI@ôU9ï“˝§∆º[Aéˇ©Hãs«‘˙BCÓ'C!r&WkVj	’⁄êñ≤î#Àqı™-πyXBnbWå
É¨•jXcm@g^Sî‘ãpoü©∆E’Z’†th0êã\sòø´`¡PÍXéÔ
ß«f)n‘`Ûr=“G~Nêˆ«¬UL'É⁄Ä¢gÍ2àFø˘{€8y"ƒ˚d5∫Àq≥f{ÁîÎ0ë6( )Ï6?Ÿ∫™Àµﬁ>´?PIXèYS4´æaMÛt3lå¬RNelNúﬂc°Ù∂ H1^åÁáwÎ@ÑPEd`‰Òhy4Pàﬂ„ñ;w]åµ≈¯%=L{	ÎØ´Ù ˙çŸÙpåM"rÁãú}3|èëã^ˇ∞}Îìà:gÓ∂Ø¸π}Â
à@txé'èNÂIÆ∞v∂T(ÇfV…LíTÊÿ·>Ù5à?xä>yÊ60üEØgﬁBf°h®ãW¨a bö¨∑P à;K
Ó‘Rù?‰zÊR
ï0Q÷Æ¥ç1^“j6ÿYÒı¡ú"m{§„\ˇÆÓ{π∫7>æ≥˛Õü⁄ó?€xı∆˙›W÷øπÿyÌs∂¥3á3ese”/Âô‚Ù⁄≈c˘By;k€qyÚöÁÕ˛·=ìPá|$FÏ#Äûq∂%O*ã˙öˇ®8B¨à≈‹Ú…=fÑæÙ!ãàlÓÉ∆"∂Œºπuˆïˆ◊g⁄W>Î|ˆÍ˙∑øcäp°r4≥v~Ì∑EíÀ< ^{-ø-÷¿˙	Ûiõ)–ﬂ^é¿î!+Ú#„q2Ç≠Æä,pœj$+¶^cÜ∂öÉ∑}v√»FΩ‰*ñ~˙>à•8|Â√ı[üRíÃ ¢™ãê‡CÙ 1†øº—æ¯∑ˆÂ◊∑˛te∞s˜⁄Ê7ﬂl¸ÂOœ›¶„RI•X&Ÿ“⁄≈J!ﬂIf2_™d∂√äo N‚C»Û!fú†îä8›Yqév@±f%$<€M\a‘¥~Î√≠Û7Óº∑˘‚ﬂÅ†⁄æ¢dtX“Ê§˙Nrèƒ7#éíCåü≈J•8Eû*ñ~Yû…dÛÙ€·R!ÃA+∆Ù2<¬ŒcŸâd9X9	¶q”èì{}∆:u∆Í·t·å”;V–ô™ú^∆8†®—±¶&ˇﬂ˘Ï—J·XûîèNMeJOìß
π√˘J9“w.nÇË◊˘πáô ê[G{‘ÌWˆî‘Áƒß›&Ω≥◊¢OºaÏ˘Ëv6Ã~ƒÓ9N∞{hPºg7¬≠éÃ÷’Í3±n@…dÓ-ÉòZ˚∏¶H$G¸$RAµçé ˝FríR_&%fDÕ, àï„Ô≥÷Íbı°Ç%ùX‡®	œ@uREÙã≤Å^{¿…¬9|†Ø€GáùY§⁄|:Œ∂Õäùæ≤_“rØ∏0õt'~∏∞vraçå¬ÏnΩ˜¸˙◊ü≠´<tπ!Å`Æ)í%à@–«≠Æë—4– 1üïkÊBªóLƒñìJ∏“»œ°g€Yo\£GC⁄5àßøt=\Ab≥?¨ Ê–+hÎΩ∑€w>ZøıàΩ°ãhí∫£ò(SÖÒB‘àï4%-ëÃú&√R¢eÔÂJäGXCû≥ımØ"´AÓ%dµiÁ◊OBC”É]MKÄ‘ö≈†*	»qC·—˛‘1G!Mïz«j∫€p/ôáˇ›À+¬1–¨j~oúèü•qFGt·nƒ>°g17ˇÜûwWÔ∞›nÛ∑ﬂ¥_zk˝÷%k+Ï¸„wÎw?Ÿºvc„≠7¬Â«˛É˝M’ö‘’ÏòÙ¨¢ÍD&3öº®ËÜ∆µ∞ÛS3ïßM_⁄Rær¥4M≤P,pı1∫‡3O£ªm>õ)W
”áI.S>2QÃîr±´~~Ônô<Ñ¸ÕÃZÇôÙ!&+èÎTC√œz=ÜP∏yÛ⁄∆Õ◊€_ø÷yÂRË—Á≥kg'≥G'ã$s‘¯µ≥hø¢Û@Ô¬8OùÃê¸Ù·¬t^–ö%–ÁÁã´aN'M˘t°FíìîØ˛Í—ï,ÑÅ¶z8‰…¯xªz¨f:ˇîIkè∫≠Õ¿öáEj‘e#GÀ•é∞*˙…
Qjc¨±˝(∆¨óˆ[f#C˝Ñ„˛Ù∑
À‰«Ê¬¿4L©Mí&á4•óªwD]–Ê–˛1†ì4~˛ˆí’!7VÉß$ÿYñR-XÜ8©h>˛Ë'«Õ¶ûÉ~ÙNï≥Ωh◊^0ÊUMyVÆACzß$`Éœ¯Øgß2${x „Ùq.=YWók˛õE -U≈2P¢ÔrîQ‹Èõû[duµ/∂˜´q#nsƒ∆∆z·Qk|»6Aß√>ƒG˚&Ï∆˚¬¢È}L‰€,ü a€£í√°©"ºÑ‚2>\3S_Ïà{`G‹É[`òµ‚èü∑ﬂ˚3€dBπ”¥∫®†‘µ/†*;[©’»¥|öP˙çÂˆÒ(ê;,ÿx†!£EíHÿ« ®GK(à€^Ñ†Õ¬`Gº|ëFπ=Íﬁ=∆âwv«ìFP®¶B^∞Ò‹Ìˆïã◊?è Dÿ*j^Z§4H]—F °.M0ﬁ≤gõHäJ}¢Ê=ÓÒ^f⁄Cwbfu–Ìªª⁄S§Q–'Pˇ@åÌá©	≤~®ú.»uï?≥Sú
xoz≈ôáŸÜ,ÅDﬂÎÖ©…ö&WÀ4tZﬂ˘Ê*Üå“ââ∂_[R*ôQπYUòiÀ›xú	z€¿€ñQk7{¿ŒﬁÅûBõM—?AÔ(¢ÏDa/iããñ(EPŒ⁄›FnΩ~´}˘}Í#&!mÌUcî4ééÊ±†a∂ü6ò
˜bXÅÆ7?˝àÖÖ∂òû*K¨yUê5Ãc≥π¯õ∞ÉgÊ ≥3Ì&ß”˚{∆Ejäè&ÖµˆØ`P
¿®õÿÏ,MÖ‚}“Ô˝†o,%R§0Ba6rŸ	ßç %a~Ä
îÊã‹ëﬁRf¥D_T∏Ñ∑!Æ0_3“ƒÛZ—jeìÉéå⁄ı:MGõhE–Ææmbµƒ>Pó"·…™ÕS
√
ôùs√hÜ;û´ >á¶P»M˜uÜ˚zV]öïÎ!—ôÃÌ	¶Üs€ÁŒm~ıE∏¯T,Me&·È¨j†DÇ‡kü. åOÿwˇkoga#G…Ùπ¯°•A,û©¢J(‹∞)0aTÄRmƒ~Z’õ:ÍF[›„⁄ß±ÇËﬂ¸ÍJK0‚Wœlùøà˙”≈ÀÌ◊^p|GÇçp≈JÜ‰ˇ;õœr(]íõÚú
{∑∆xÙ±|â¸◊Q|»∫7Ï5ÃÜ.2´DÆÉ&Ä¡3å|⁄Ê®á˙3Ÿ>7@ÿ£!ªﬁƒ1√ΩÒ W[Ô]ÄAa¬∑IÊˇ¸{ÁÓµAòäˆ˘p≠ıp¶t83Y¥»ù	M@◊∏s+5v
å3ì˘È|ˆóì\ıÉ¸$◊ÛKUêb©I£˚	8HﬂÊ08Onÿ~ÿ˜<8(†Ê®≥ﬁπ0+b7_‹Ë<g„“áõﬂ˝>ÜÊ3ï¸4ÛNS{ò—÷æ@—ïŸ* SOìL´•©≈îIBÛÒË√lÁ‡í`hSßiÒÖ’SÃÜ—œ ö∆àNOy»oHsFø€π¨◊L{&éÉ0pÇﬂä ÿ6Qf«ÑZKÊ	ë
Ï¢ÙΩîà†˜’~rúvˇƒÎ≤»@Û∆Uª6!P!\Ùuå4p$z·∏`ÏYË-6ΩbK%‘xöj˙¬ [CE´´sv«Õπ?!⁄¸8•ÈH‡î˘+m¢FﬁF¢@BfPß˝"Q|)ëÁ‚€∞* ;û p¸Ä°	5ü¬ë3ôF©âçTr˘`x˘/xπÏòVì~oÿ¥ŒuÅÄ≈ê¯D˚] |‚ÖLÏ<6ÜxoÔ™xëÄy)∆î∂âÜ«˜$DrÚ *wÃ©ÑZ∏éåg58ê∂√ÆºEûcÌnÌ±Ïƒ∆(ë∑,$áÎÔéŸFﬂ-A:˙PÂ–Œ•]/P&ã.öF C¢Ùï›ÍæòL9"Âg‹1Õƒ:)?;A¡º!egiò´˘ßK≈—NC˜'‡Á;∏Ò¯Û\Ë†`óV#°!ÏVÁ"|ªÈ5YÓzèÜ›'	˜≠ÊÚ®Ÿi)ŒU˘éâs#C˜·›á∑ÅL|èw¡ÅÈAﬁÆ$;&‹1ä‹{_S§√OÔO⁄Ï.eë?◊Îˇ˛ÅQ+ÿI$bñœ«&‹cÁ—Œ¯;0;ó(ë´,µﬂäíVíl ˜û0∑±DÎ1ô#´ÛqÃõÅ@yJç&™≤l?ÒÓçAuwi©dü±W≤èœHËXVòÒ”ùê}ƒlÅÊ≥]±JN“ﬁcªç∫"«˝~ô±>òŒG|}®hí>?‚ô)ºT≈ri[Oã-V1à˜xoﬁòÕL ˙=ÙΩ€8zøwh√`	„'§≈ˆÒD0t5&“≈ø˙¡S¬<}##\ößTπ@ÉÁÈønp}^Söœ§£√\ËÓ‚`ÙÔ¸·Ÿ¯‚Ó∆›w∂Œ‹›¸ˆ˜ˇ˛˙Õçªﬂ≠ﬂ}„J>∏≥ÒÒù≠◊ˇﬁæÛ—÷_ﬁ¯˜◊/o›}Å¡n›Ÿ¸Ù£ŒÖ?lænÛõo‡˙∆ù˜‡˙øøæ–æÒ∆´76.ùﬂ¸Í‹ÊwÁü˝Ÿøø~ëù"lÙπ··c%ƒÂ(Â3ddi_Ω±~˜Ó˙7Øôp…∑~◊~˚¸Êıè⁄óo€|ÒÔÊ´>˝®˝˚ó˛uÊ9zxHõ=)”¨…Ë¢5•™∆\`Ù1r‘PÍ ≥fzÂèè˛åìa˙HjRôï1çB_?y|4Ì#ôHKuL¬l»MZ Óç?¡ä4‰˙<‹2!HöL‘’_/»
°i™ã™N©ùNÔàã Ë]JÖ√G*¥√…==ùô*d)Ãm)ìeÿG
3≈ß¶Û%í-NÕd*Öâ¬$ÎLe*•¬áBÑ£5å˛Ù–~D1rë®˘\¨¬˜‡EÀπ±)•ˇBêq+ óÅﬂ_¶4ÖY´Ú
d¬¥SWËçø~‘ær¡Åfv¸â(¿Ω÷~«Æá¿≈ØÒf:Nëö‘Œñn-†∑äêcØ›å8(F§E©j(ã±Ä´±ÒA0ˇC˜ ÊüÌ~œ›nüøÀ¶s˝÷ßo>œÔGÌÀü≠ﬂ˝p„≠/;ó>l˚…∆•œ⁄Œw.æ˚§ÙDRùK:oˇ∂è|ˇÁ´∏ETü¡ã[Øûmﬂ|ì]§xˇ0\§ÿ¨/ì‘∆ã∑7oﬁ2j_yπœµ´Å©) ^√x`Ú]ù’dÚk†r∏£,∫)ë ›œ≤å@j,MI#÷GRﬂ_=G∞ïvª†<ªÒˆÀ¨ô|„∏ÒÔºÚ∂›÷æÿ4¬|‘íCP€F\éõ˜∫#sÄt®Z˛∆ÁòvÅ&Bgÿ,iº˙pÔè€±≤¨ΩR.Tä¢éÂ+«iD£√»E-z‚Õ»D;—}xÇz_õô/h •êœ«<ÛÁ0À≠˙«√/¿Á≥ÛxY“ä5`U*6}±¶¿˚¬w~4Ãw>ÄÄªÛùgf”÷AØŒtÃçN‹±WÆ„≤É5π&yõ˛8B⁄µœ≤Ã<î'$î“úæâ™¸;ªÏ¨uó¿‚∆¶◊Ù¸cSÀ¢®ø⁄ì«ÕäOP≥<^,f6zhpêStÿU	5ˇ–}U÷Öäb®@UÆ◊À∆rª·	pÚäP	ÿ;|⁄*8 VÉ+P€õ9Z9"X›9GMS∫ˆ‘$æÅ2] =‚~wr∑ªyêπkPL¯G¡^◊pL≥ø,»9zs£‚Ô∂16∂≥∑œi;»—€ÎÏÿÌ%”-ºÀq¬Ï^¢„Ô§âüéö¯Aûµqwu‘ 
ï¡ÿÒ#+ñ$)Ï6N)(«¢•âb)_jìÄ4m®ss@B∆<hgsÛÑSL“„∂:_]T⁄≈„êc$Â|¯ç√ªg)GØÊ„Î˘~Ô„	è ÃúD,efS<a≠PgÒ[•âélúÛñ%£%eª“„)◊ª~AÜ˚»œ¨2ºíÑ=EIT±NÉ˙„6›±Ñƒhæï6ô´7Ïï’æ§Å¶X[˛ò3	+Iñ«Z ßƒıxí⁄] v6BÙ®[?Ù\ˆj”–Í∆X∆¨¿öÆjÈñJ O]ÆÙà›#†fô”∫∂ÚËäΩ’¨ûL“C1ÍÿãGñ˚ˇY=TÚ≥LéB≤çÉ¶yÖMòI%¡Î≈98H∂÷Fï$ríSµ$á‡b°N "GtÃ›ÉqBÁ1˜Gùƒù¨µ?¸˝∆ùèÿ˘◊øø~ÛÿD©}˘•Jæ8ç'_[wﬂÿº˘3bJ—ﬁÏºˆ9≥4v^˝vÛ⁄Àˇ˛˙ÂıªÁ–x˘ıço√c[Ô=ıπÏÖ(…s6øﬂîe«8cﬂohN÷1Rí©ı–≤ı≈WÖô˜õ	)πÉÉ¡·!øŸôÚΩòlú∞ÀÚñ&π¨#»ñ‹¨’ów·8-Ïéx:Ó·°ÿ|‹3ìôiö%W(Â≥Ö‚tf*?])íóõüôŒó˙eË∆ÆV)öC∫D◊DØÔ]L‘ΩÃlµúÌñ•Ó&PáZØœJ∞.Áï› ‰˝ìK⁄müÊ?ÃﬁÌî˛ëgÔû(NÁÚ9ÚT¶î?R<ZŒñ∫¡ï∆€d K≠ﬂ}•˝‹ÍìÒ%¶„¶â∏7Ø?ﬂæ3†]∏∂/'7ürõıˆ«ŒÖ+ù´]ˇ˙çˆÀÑ≠µ}Ûœù◊øjﬂy•˝È∞ôv.ﬁl_yπÛÈá,9T+ˇ/=SS›i∑ù$€˝D5îÜÌ9Ç˜`SúT]i€kÚ˜`˚¬]ñ»Ë|£•†Ú˙ÆÂﬁΩœ&{ò„Éèµ[û{IKÉ€næé{C&**]22Û©Laörsÿ¯ò´Ox¶ã¡ArH6™Ûò¨O&ÖÊ"Nê∂Lrí!Öa˙yûØ»ù˙CÜ∫“\#À∞Í>˝‰@u=x0®?ºÖ∑'52R6‘#”i6==n6’ˆf–iH…õÔ-Œucˇ∂zQiU≈áæUÌb‡i!ÆΩ√#ëél1SâgdMQkàÆ`äPÊÀÁ∑Öd˝Hk@—è(∞º5•™^qô†ÛK-–ƒÂöz–˝27ÍxãCo–‚|¶»óÕ…∆å¶˛ØLMÿâ£&fÿO®ê¯KyyåÙ–ØtÖÙÄ¿~R s~¬ˆÙ£≥>≤V ¸·î3/8%≠'†låœ–@îo"X∞Ÿ÷puoHK3≤Ùå»„lLZ¥éπT∂rtÎYef»„\ËçS™FRÊõàz =≥—ñ~≥Ã.ºúÉrÕ:˘9I’I:ëöÀ}«≠È;˚=BxE*˜.˚gëÕ
ÖSù3≥ëÜ…ÿw0πı†=ôiœ[„[)S`ı¸ÇJó¢Û=–Z–ÁSÊú”πéÒ)w»äN¸LôóhÈ»≤√ì·ÜÔ˚°7Ã„è÷©~ªï°Ã7é…—≠
wNh¨õY§ÏÌ6Ñ≈~wË˜¨˙8ñáa;ëŸo†},Y¨V]eÕéãóû©"9¶\:"Ó&
^Ãà—›1|ƒ(◊„Gå±¡~[å1˙kƒÏ7äåò]íçòSVhƒ¯“Êàπ*t§ÒÉ]9Ç¬ZU}—˝≈µcƒÃq´jS{è]±R&UôÂƒh .iQîS’†%ÂàèåÖŸd(õîWÌ=)f≥ƒ3ex⁄Dm≥YıN ˝≈•ír∫;w(äWo?Uƒ0…U©P)d3ì§T(#¬Y§T™ä¶ ›+…¶II&YIõS#q∑úÊÌ
k;^6»~pM¥N∑˘Fféö `G@ì&OÉÿGr2ûd,C˚¶@ﬂBœ~sìâl^pÉxÉ§Iﬁ„e·jV9s(m‚—Smîlƒp6{‡hÂ±-L‘≤©=G)÷òãpIÆ.†C P
ñ…SJ®62°®›-]á´>3|∆∏‹à;SSl.&∑À∫m˜MtÓ≈…2-:„Ii◊¢"üéÛôgúﬁ}n{ù˙”ö‘äıgà∂áŸOy≠˙4©TòÎô;Òm∏€>KÖ&
!ÀD[— S·OJ≥¶Ã©õúyëÀ{Ô÷∆¬26ŸT‡Òhƒ@àÑôôh'‚|ˆ≠)rπ!'"ß”≠%b;éy}ã—8mZﬁµ13XWØ3Õ@KA∫ä±;üï„áö+föïﬁJ>[úF‡‹ˇºí€™àÄ]çr≤™Úä4…™™ÃdÌ6πv~Åjòœ£!ÏdåÉOùïòÛÍ™◊+`ç•ÁÏÏNä;œ±Ç“Lü∆≈IW'∞”KL0i†KÚPÎ…˝CÊì°f«çtc∆kë¶ vC†_—`ı®òï‡Ã*ŒötØx>®5∂8ïâ⁄Éc˙]L¡;“ºÊ]∑ D«”+Ç–#1VÈÄ°Rñ‰Zj∏oıg‚ZˆbNÂ±≈G!≈ˆ0â£úœR/3F≤™é Ù S…sÀ‰1rh®é2Uôz≤†;€Nà!;,qo_‚∞≥nW‚ÿ„ä3úıN{Btó"˙í√ÿ≠¨Ã5›w·ÑqŒ◊ô2à°À§≤Uíå@¥||V ˛‰ÁE,ÓF ‰à=ô ÏhtH †H–÷¥åŸ{pßròb0È«#=é/ûP©≥òä≈ƒÏNS‹Œ¡T>πöCeú˚ß9 'â6FEB(Dâı,ŒÕ˙¨Ô›ª±ïzßæƒ√CÏœ(˝3¬~ç¿/3Z•°‘Ò»∂…öƒ|ŒÌ8"ª∞ÀÁ<)#ÜíÜuïKf'Ö4"∫à˝°GLÃtË√Îa”Äós∞0#ßÎ‚êtz®ÿèì@Öv¸B∑5ß§jBx”¶©≥mBÆ9áx∏£X qªπ'®  Ô˜ÛMèÄ;&^‰ëÒ*ãé∫+Ñ–á;ÛË
◊ß'=b¯`Ph6uπ£"KòóUD{)HT¥#ëÂº‰Ü˙õõ‚<˝ì ‹¬lGBƒ7Î√B/4©¶®	†ﬂ¨OìMçéƒÚ´G9“>ô ˚Õ˙TÁeåc8»Õ_2t¸p@rÏdX6f¸Tò ‘°Ù1$Û’x±?†@3nÑÜCî~^‚ÛêDíP¸ Y~•<ˆò®N)à\ xõû˜ ≈†Øj	¶¬‘’íÙÅA∫ËíÙ6	´t8«èà”π˘zÅ]]D”Ú/7ãˆ1g≈Î≠"ñ1ÙõA√¨ÉÅ˚QJ€pœ∏πåï*…ÿNº‰?)óUÿ/A9ÄÔï49Ã5 ˘ò`óÊÈzW¸î˘–-Æ‰™…Á_≥_©bŒ¶ñûÆÏ<a⁄àä¥úa-^–·9‹ˇ√40è2]ã∂qAWû5øsÓç§¢.’‰:Ê"ñ{4“Uèå√‡ŸæU∆´œiJç‡?(êË ≥‘Á∆úü#áNnKœËÙŸ1RhŒ‚¯ìå¶)@:\5Û"·1$∑¢m>Ü’ßÏ®ÆÌ9"∆Ü]≥BukK¢≠*œ+≠PKíÖk'bF¬•≥Å :≥|°f$^måèÎè∑*—ßÑ#ÖªäÙuO5øã"ã0ÂSB¢äÉÓÁPΩ¢~å-
Wäq™@Á√b"Ç√ËÕÍR«}oËV⁄î⁄òŸ—àP«Òe⁄∫.ãD‹ÂÓYc§≥ì≥∂ˆàÁ\Ú∆»êh)«â*i!Ítì¯M≠jÇ"ºOWÚbIË¯¯Z=!()"≤Úˆé%@ËE™Êlcs≥Ò ˇ€vzÖç°X¢º†Ù V†õOªèWâDÁ/H&ó#3˘R°ò`ebq≠BáI	w=;§@‰@9Äo•ZÙGíD∫v*]
ΩŒ*„Ú¸±‘r4≈üÌ¸'”ﬂ¨™Ç¥÷ÏäIõ9˙‹›D Ha,SüÂ¨À2ÛA•–‘nô5÷*∂®“®9&7ã'„¶Dﬂƒ9»Uî»∞Êù[/´π-k∂ƒ«µeΩ– aoŒWzºuéΩœîÖ9’¬>]2ù48`÷.n¢C1˙(–π8©ÿ3\¸¯∆eŒ
Ã≤Ÿ˝Õéè,!ÿ+tr∆gË0F≈yGƒÄQu5*D&±eäÖCä…•vùIQÁÒ„ëÙx6îÍu&¢∑ü<¬Eï$3 ˘ìp[öcŒwÑv‹Ω)	ÃU„±‚€£É»«∆!≤£¸Çóò˘¯„!kŒ≠tŸV\*êµEtô&Ç∫∞¿.z*OáEzŒ[#¡0-íò8ìY7=£~§PÆKÖ,◊I∂Û√Ã81QﬂíB]–2]ËªJÀÇÀZ≈∫gÀÚ	çÚéŸJˆ/Eª“Ìdc¡OM——PIÌ˛÷åm{9ª%‘àı{:=≤ﬂu¢∞^˝b\ó\´ÿΩ˝P¿t∂+Î1¡·Ä†[î˝¯Ål{j>åHnL∂‹i3ö6ÄÆ¥$E›Q˚∆í8∏ômÍz'N+à˜*ÊTÍù\«\µ∞íßi;ΩvËtE{çlÊ‚é^“"8πçÃ;¥ºm3∂ΩƒÕ+¶RÀ;Sª◊πyë[ËÊÔJ7/Ôw”áÉçÈª«∫ÙÛâq~’*"`∏e%	≤∑Á§Ëe“Ñ'qÕæ¿ƒ5ç∫xÊˆ1%ùí‹Ä˙-SŸÆI6¡úT'ÎúÑf	ÃP≤˛]pπƒ“M¢#—√	Ω
ı2ÏZœKÏ÷»’‰up\9È·ËeA»[(∂\W>(‚éê|ô.ë{D\"	ïwòΩ™©
Eÿt$ÿœjd;ìñ;¨∏7‡Ó∂»ÌHœÌ»œÓØ∆iÜáµDÉ˚≤uy›∞¶í∑O‘É{>È"˜ºt>B1AÆﬁ¯ zÆqàôj{ù„î^äJa]ÁO2‡Œ¢Zs*¯‰MDU0Ø:uZê
b1CÅ≠∂Bë¸≠.ò.é˛V[wí∑ö¡ƒlø’,Í)`§[’‡q¶◊ªÂVµ€÷2ßPNvÕu>∂ì.î˜≈Z%ı—E'∑õÓˆ7äó‹ëê3˘pw\ªì…\ƒZ“z6Wuó.ù¯ŸÜ÷i}LÌ”$I˚X«À°˝,Õ}W/àRK›oŸ!Ω‘˙l_?µ>nëoxØ?ªâﬂ®≤nOEMpÿB"LS;ÆeZüƒé©I6ÌR1´ëŸ≠G!AëtL6ÓjiSÆ;BÚ¡‹≈q˘ë1)k#ﬁMeΩ„AaP˚¯e…ü\x√;¬§B≤∂x£y^∆Á|	 Â≤ﬂçC€1ñ0∆Á≤∆ ˘Ê›◊0©^#ÊqÓ™?©Vs¿8•™F†µ!p‹R∑°mWû<êt»âüÊÅE≤8|z`—’¸ª∆b¶ƒQæïˆ!(ßŸ˝Ç¯ı&˜5
VIºùh}>4üKÊ≤Iæ∫m⁄ÍœíØõméu¥¨!¨é$¢m(Óøÿé˛ú∞0ßÃ&Âü‰ò#¿\jÂæ´H≈ª>N]ò¡êô'9B‚>~T¿}/>äKﬂ#Ú>¨#7∆°3Û0¥è9‡heCìu=]ëu›+$ë?"DƒÙêÄƒ±1aqö™'à√»ÑíÖõb)6> #°3≤;o˜pÆ*råx@V)ñµî¥ﬂ¬+v@TŸ•bµÍ∆…≤/œÏÇñ”H◊‘n§çj7“¡-Â…#pππÿ\‹8ZP¢Œ(2(NgM∞P~mT/œ¯uáˆï•¿ƒG¸Oé AÅbENÉÑ\¥ªÙô∆7Ö¡ªúƒÃ$ë1ôÉ£	Ä)∫âëK‚¬{`~‘óıÉg—ç∏‹≈√‘ƒn!0•—ÿ%π+Ø2{«ÈwßUË∆á,§√AQˆ1çD¿)¬OJ‘˝»úB‰èŒ®9ﬁˇ=„ÉÑñ˛≤ö¯ë®⁄©$StÑx|E8…√ùı#mÆ∏ì∞Ë'p'ÜJIÜ i“Êg1c?–À9°z‡Oqtt‡m2D¬eÒ6W¥-GZ0ç,»;±˙À˙ÑÿZ˜'åÑYB/÷6ò ê!¸>0ÉÅ‰l Æï°q¯I¶µ'Í4Í…ñÄøªi_B/`Z‰!¡D¶=∏o…≥>‹;b90ËfR	¿Yê<L’˘F≈wo1Um˚ ûÌ0≈êÍJ˜\êM¶U3ÚÖÖü£ﬂ2ìÊ¿æ—b
ﬁ@¬·£Dh—~0b/Ωÿ‘ûéyÅ Ï‘õ6ëŸ7R·‹	1/◊mI∞$ô˝^mC’c∑vN‡sãú∞ Ÿ∞·›ƒKpõ]ûÄü°ùÛÉ;%-Q∞aä\l1™.\zéﬂ1ï±Kƒ`Ûµª$öﬁØFÕm<z+≤dHˇV˚RÅΩ
©K<Ì„—ih#SkØ‰éN“D¥áÛÂ ⁄oãd≤xxÌb≥ÇêlÈhÆ,ê}∂ÆŒ)¿4´¿CµÖöæ´	gY¸Ù.Âì=T,aˇÿ˝ÚO/ªÏè+©Ï0HëzòLñK&ÎP˜Tf:s8èYß…Tò@ûíŒgØÆﬂysÛªO⁄¸qÛÀ[õﬂΩ’>ß}˘˝ˆ≈◊6?;€æ¸“÷[/t.\ŸxÒ„Œ?Œv.]o_¯
)50kóu∂ÃD{ıFÁ”⁄\ﬂxÎççõ◊6Æº–yÓ∆∆õœ∑œ›ÿ˙Ì÷iÄÕ˜œm‹¸KC˚Ø3gaê6ØΩ‹~ÔœÌÔv^Ω›yÁ√Œ+◊øπ˙ÔØ_nﬂ˛jÛª?c¢˜´76Ó|∑yÌFÁ›ØÕÁYF€ˇÏ¸Òs:ÑSk_‘Í*Âﬂ©LìÍ4ÌØîKn´˜ìâI¯9KÉÊ∞U-M"ÂÃëâ“h©ö<F#hj¨]ÓÆÓZ÷⁄m0ùp;i,LÉ?ñØå…ßuÿÜ§z±%7SÜÜaﬂYH]pBv™ŒQÀƒ{jqAå¬î39ªcDé mêÍuSa£!Y¿k√ıÑÙ7bïEÊÔ∂ÒbÈQar9¨™à¶¿&Äp	ô›7 ÀÕj(∆¯âƒº‘¨’Âl]ñ¥LΩ>iI7x&*L{9jòC bò™¥°¶5rJSV6ºÄ©√6ù∞ªÓk÷S6∂˝ı∏œﬁD/€ˆ{`_‹kÒ8≥*”Éê∑KŸ◊˜π6 ZÁËP22E√Õ.ì©96Ê5˜okm$.◊]JöúÃ+ö§œè$ßÓŒ≠sﬂa¨üÒz∂”õï4RY®©]uYøygç·1RŒ…√Ê_ò>å¬Ô9T*Nëß3•‹Ω≈eﬁÓÂTØHºÛËö€?ﬁ;ê o¬[C}/ú»ÖIv[.)NÔ√”π%ñâ÷Ô^Zø˚J˚Œ+ÉìÌÔ˛≤uÊùŒ•?l‹¯›˙ù÷ÔæAß?3«z>Hé)ÕÍBæf°πkü(MπöJfP	_.—"±¬Ω ﬁâÒÛmÒGí¿£&:ÄÄÖ∞«¢"Ô˝¢Ã”µru^)PF≠:’[ÖQîp{#(ûÏc·âŒF`uµQÛrÚGWñ]≠`ƒ‡¥ƒ‰Ag)∂àwTlÔ7éoÆsÜ¡·"xà‹wgOå|rjÔº¸¢-‡”∆Õ®<1GípR¡Ω§úŸ˙N2≥ı?≠Ä:F:óØÄvlÀƒ‰6à§[≠Îî™5Ä* ≥≈∞D·≤¥(?]ÀZ+◊ñà]ﬁC>ÑFÕÖÓﬂÀLF÷1_(óåg!€…í;πã˘ÒˇªkÍn£ñ≠3/v~˜±õπ$‹%âH∂â:Õ¢ŸB3RM7ÛmpDRàIs‚À¿Hç´Å›Oñ=ÄW¬úc>.k¶x<iDÜπâôè‘¶ ÜE¥<Ê¿BmQ|6⁄==„Èt⁄†…Pån[h†ˇ°Ωët˙¿ ´:ÜÌ«\x™"æ;V£©üNïz
ò‘Rs⁄1•Vñ%≠¶Ø‡ﬂBÌƒì‘ÌOı≠K¯Ω◊"zí∆í≥uz±,7(Ìã=5áËC˙ÉlDÏ€ëßC0W?Uf∆v>íöòÏ£$õa
¯¿<–-5Wˆ˝ ºl"&í9îÖM‘Ú.{‰Ú.Nr1.\≈‚+£i“Ú ö¿RM˘4)ÀF*àá!üË≥P⁄&LîÔæ>˙ pê§\n∂nÛ8¯*¿·∞@äÁÆfSÏ∆—¬62'üU¬P n∂Êü≥=NˆCÛ±`“›ºp{Û¬WdêLKã∞!Ò“o$uL÷a£¯W,˜b`± ‘çx $ÃÂkR‘‹evz⁄,óÑßµÍRUûáÈêµÉ=˘•12UŒíÃ·LÆPäjÈ˝¬√€w~¸"}f““oø˚B˚ÍK{5T`∫UÆòÏÓÒxJ“Ä*t9˘∞ãnk–x0<ÎŒ>\	?íï¿[≥;Øÿπ˙]xlHòaª&ëTæihÚút/vÑuZ9£`¥ehjkÇ/ùdY‹/ƒÌ»ª…‹ı	!Ûø€¸ÓJ˚µÄÅU(éÈ+"Qr˜\⁄ï«Íl6g%MSd-9Ìö\≤çVŒ"Ub∑bˆüÂ…ûq¯GDw=:Y(íra™ò/C‹Ø.*´î2”eR ˇO~:óÔw˝Ï¢:ÀùåLî2Ât—s°ã*ãG+•"tî˝çØ Nì˙È±êıoÆÆﬂz≥s„Z˚ÎÀÃcM≠…u˝–äiÌ˙⁄˚€ì≈Yáµ{—&tø˘—‚ŸHO._ŒfJá3=„÷7í …zÜE"9Eì©Øã5W~*3”3éˇíTES´“
2Ô.Îõ9Z!π‚S”=„+Üë≤“∂™ãëIN^TÎî˚z˙	˜HÁw/l‹¸u»|c„„;ûªGõuU™ë«HâFÊ˜ıÙ≠v—æRær¥4MÚS3ïßÕ6Úó∞ùvÛ»1ÈYÖ5“˝Ã∆[_v.}»µ“}õ5ê‰-cY¨ô9ôœœ˜“sÌóÔÄÃø˘Âıˆ’œ7ûªÕ\ªÄB©À≠)Ìì¶D0SÑqØ¢b≥¨Ú*û≈SèJŒ›´y»Âzû îÚGäGÀy22⁄3ŒˇÍb≠gsdf23]ûi%©,Û€ÓÜπM¶èd,&ˆ%ó'SE®Ûp~äw]›HPu#]T7qÙ–°|âdÛ” €Å@Ê˛M&ûŒ˝ åàπzÅñæ[:ıû4Ï∏2‹;@.◊q.ÂN∏Á∏†∑∏Âπ;^πñCGw´,;/Wü	{åÙsï2ø{ª˝ÈÃ*c9IúR¥Ü§¡ˆnzÓñá∫—tÔò;2Ff2á”ôJ>G(.SnÀs¡iïÃƒd˛ÅQKj∂3—mªÈ≤;©ËF Ÿ:Q]€˜’ç^q1`Eâ◊ãP⁄º˘y˚õ◊:gÓn^ø¿å;(†H‰∞lFïdÙ”TùL™skü¢Sò™wÈù˜Ïì‹á“qæ∏1†¥)Ä#DŸqÃêYp(ﬁ)≤nüŒÜXÃﬁæ∆Fíé!PV3zå¢¬∂ªﬁŸ\—ÜN~^s˜Ås:.Aî∑rHÅb@–⁄ÜY˚¢©Ì@Yñ¥Íº{≠ÿ1ƒ#®K≥:(9¿^0Ÿ›v´¡¬ ∏ÈÉÀx!fÉà5òãû!πsB¶˚ ’ç/ﬂ≥}∞˛uÊÏƒ$¸CÑòÉÀ™ƒÙ4#Ò˙â}7⁄Gƒmd√ô–MD{€ÖsZœ*È⁄Y≈`ÍÈ˝§•9qpªO≠"°À„‡EÑ’0{ñQØéÆè'CÍÈVsº¥ÔÔYJ†Td&'#<ãXË;©f˚òZÉ=˛cá”∫∞kQêcëo7@Ô!öYAòUqPÌÛ5»h‰r4:m˚ù^áˇEöÂÓ„ËS;NıYµ!/mì‚i©=µoºÙUÁÃYÊGG—EI∂8ïˇoaJ˜LÒ¸4ëûqÎ[7ñéLÈ0ÇçLÇ.S Áz∆=∫Æ2;ôœpö?wÃéq+≈âP–¸≤îz1QÓâ8Û%ÙÏ	ŒÁ	À√|Ë\u©Ö °·#õB0,+g†Ãé]€=ñO
øÃ≠'%Œ±Õé=ô ë… ˘Yûúdê‰¥Ö¯Té¡’MLv[íäì›v‹∑∫≠¡Ì–m-Ãänö–ª≠ƒÂ~”m%&›fS(ÓÆ∞+°= ¨]_˚á¨„±	¡o´Ns¢_ù$!63(À 7bA-ÛãgëªÆFP„g%ï ‘fP⁄L†ík‰ Ò	b¶∞ÖñÙeÄnV£ŒW≈t£CùTOÉ <&S∆™iHFuﬁTwíGtåGâ)HkÎ@˛’ã0›JV¿cèëÄÀÓ6(Õj}°&Î)ΩØ^%˙¶YÆ˙Ÿ™}j`{f˛¬NıÆÀ;Û¶*sﬂ·Fà]à®=¡‰=5œSÇG˘b"HbΩ8±Ê ∫•}˙HX˘Ì†‚Øø)Êe3t ≠ú€AÂ‚^o‚ ÛDÉlãıU†™UqÅe‹B;ÑÚ,åâÆë†Yy–zÅÀï&ÌiHK©·~ˆΩ*+ıî≈,Ñ‘A˚-qd¿^ÅÄz3T∫6_†4eoÙs≠™ﬁK◊†‹ nù^W™r*eø-MÜ˚»œÌ∂ˆ;Ìp.∆™rä§Ïóπb˚bπ†pJ¡c4këZ/∑§Ê¡ï·°U˜Ê∂ﬂü]‘¬‡ÑÌFz€OÊ·ˇÜe>bCtÓÚc¨á‹´\xb<Ãi∞%ÕÁ:Øø€~˘ˆ÷πão>obù90”rs~°Œ¨ËhQØ[vt	3i BÙÆF lE5ëá<kË`bÔÓv˚¸›ı[/u˛x˚˚3WÉòæ?ÛvÁ¬m?Ç«øŒ<G{U†Ëa2YT$‚ÆH] ß§µÎQâD%2*	:π∏ˆ±é°Àxp∂P_ª¶)1¨4$Òæãeä…≥ñCCõÿ«\?ŒÚ£ˆ Kâ(≥ÚT3^Æ‘æÓ⁄˛]À»>(∂l®GqË.kÔ∫Kç√˘Ü’¸b©˜TF8…É–⁄^	Í∑»ã–ÅHw<E€…°∂bÀ[óúé±ÛÔH?(x°PjFÒˆªeª{’ï›òè¨v∫≤≥3a…æN√˝∏÷1XJI^B`∆Ö∂Fs‡‘ ß6!@}Ø∆2Óîñnò—NQ~Ÿ¿ƒø¶ÓÑ	◊∏?ÒÒ;&5ıôBÈP?¿ÂÔæó]C
:∑†èhÔâGEívób≈'tWÀ>öÔ*OL◊tx(,}3üÊyîükÎ*¬	æs,†›íÕL¶èì5|∂æ ;≠¶ø¯&”Óˆ“K€mlÆê…%l©ûÈÜ ¥ë¶)Ã•´•n¶xKÒ=¶Fw^ƒ~ÚobW‹Øb◊ﬂ%úfb≈5rîìôá4˜	/În{vˇâwN∂÷í˚pË\ñ_ë≈˙®:˙õ+d∆K;â7'8M˛ıÏ:ñ&™Ir’v^xwÎOÓjTÕ/UÎäf;®ıädôåz—…çk7€7ﬂ‹¸Ë,{£Ìﬁ;H†vfÎ˚¨UÌ+Øˇ˚ÎwNB€NÊd]˛_	FC™£˛+√∑ji†;ñ ïÿ® !oxÚdí>I˙r≥JíÕ≥YÚ¥§§&◊eCŒ©’TˇüÌ'Ωuπ∑üX$ÒHºëïˇàÁ=ÆV¨ U±«\rÿÒ…63‡z‘l{{qv‰R∂¯ÍUº=~◊—æg÷«På∫åPn"),hDäÖ:‚çq8ñŒìÒ‹1ﬁnMvaYVÏ⁄Ò@+‹ "„wú'ÄÈ çé›f≤ë0peNØﬂsÀà¡è⁄REm≠!√ø˛ïÙí_óA~˜í≠kˇ`( k◊êS˘ü
ªéÙ|Ëç6‚7«ö¢„L◊8?&⁄±…påìH’Âbôj·U˛ò¢EÌ¸	ºòò_eúœ≥’˛±`cwà˙Ë‰Cs[[ñƒ˘S\\«¢¶6'—«§û≤à∏B‘RﬁÒ9πo∆øÑR‰nL@ºüîÒÙV˚£”[Ì« ö¬t~#÷ò∂û)ìîÈlˆ4…e G&äôRÆ/0≈UV“Ê‘í,’ñèÈ¶ÖDÆÂ`WúU%≠–Lsê≈‘Qê≈EØÒ†ßj≥Ã◊‰‡äı-Ë)1Ó áÙ$≈Œ<» 4ÉÓ/RC.<a~	lì‹Rl˝Î¬G8Å”ıDÙt=1F≤ôI–Ω÷Œñ
E◊ú≈g ´ô&¨t’ƒŒè AF3Ö%œ<∂LO˝ô«¬ÚX	∆é‰3π|ÈÅ’zP≤âô«J<˜µ“ÖáÊÎ˛|*$A√˝ùZ,}ßåŸÏï-ÊLâãw^ˇ∞}ÈÖ–¨a¡èˆÜpÜ//XÁÂ;W/¨ﬂ˝f˝÷%Ü∆≤wuﬁ˘p„ÍÔ:/ûÈ\u“lº˘|ÁÀo∑Œúe„Ò/¯ba/µ/º∞uÓ"T¬≥´›˘à’1EáπPûe *§
€æZ_˚b=
Z™]2ﬁ¢±ˆâﬂu™µÀs••©–…ÜÑ[í&âúZª6´A¡,ÛWt∞Ùj¿4ŒáKSf,Éäh4®≠Kı),>AQEOiÒÜêÃbªµ`Eõä·˛Üsπÿ…ªó	T¸Bø≈ªè)Úiñ‡ÇRB}˘fπÑ⁄?∫Rı4ä±´aªù˚bßìY\Ω l{Û˙Ì∑æ5”~Ô∫ ùûıy•Öˆ÷_)ÕSÍ˝7€ÓÊ=hsŒ∂©ow˛zÕ¿1‰ÌL˙6 Q‹ñG*Ö…|§íÚë¬Mö˝A“ùu%üá…‘Ò$Ï†≈ÀØ=Y\è≈>X9ﬁ[ñÁz˚IoE÷œ-HÏèÇ Ú˝í˛Õ©çﬁ‘!ÆÁG[F=·j´>iÕ‹KºNgÊ⁄¡J¿Çã:.kAdìòD·QÊ=>ítÖ0›1≤gò¨ˆì‘Ø˙â{T√\äk“ÚÙBÉ$
⁄Æ¢,‡ˆÛeCÉÁO>Ío“èZ>"¨⁄æÅñT+£éóÅŸ∂y2˛∫ô±ßVlÊ§Â®¿Ï¢ÂîÏê“7@UL˝)‰'÷ˆh;øÈ∫K‘Ä7ªõb:B«WÙ≤ôÎ0øB∂ÊáÀãµ&“[»ï	=ÊÉ-:%qáVim˝Ì∑F2Æ2ûÛôF4ãú ¡`^—;_\&¯ÿc"gVNüêˇ2NÍ§K‰‡ïFáGÉ¨ò0È˚áú˝TƒccÃ$ºq2î®âÚ{ê(`fk5]Ωt1Û4!4·%ØBiòN÷:sÿ˚Ó(Ò?±ßÅAjF∞âäm"Œﬁ√2èœIhÓÃPü<k…äzâ¨ÿ‘É6"ææ6ü¬ùÁ'uä„…ö%⁄úXˆ≥˝˘:ï≠ÕÆ”3≥,j°õ°qíù„çäKT#˜xßŒ÷UÎV@ã∂–¨Aà˙$—¡2”ºù±ã˙	ÃTt*ª™‡q~¬w§ÃèCœxZ¨©14€èŸ`5¥ÓàZ£∆$–4‹äùJ$ZJ¢ékØ› ¨ëàqÄù⁄HE>ÅmIaNÅ_ ÀcDß”≈rfßvT §≠ÁSÙ¨âgÄR›#èXË5¨V?n÷u"&≤N0:é”^XΩ.&ôıé¥Ï”®y•Vìõ"ªZºtâü äkxR-M^§*€
¿_˝ƒ≥1Ú^±√Z˜¯VÌâ1bLSº?åGËÙƒ?ç0â…ˇ€X°-h€HÇÆ⁄≤t7ŸfpWç·éwÉƒú¨6ÈäÓ2ÅÔà0öπwYæWèÔ∫æΩ∫k?˛≥¬1' œ:Î¥ 	mƒÙA”g#ßûvá>∏à¿±ep$Mø“DæèÆLÙç¥¶L`ßF'¥(âO$öıYyÑü®ÎY5»	%ﬁìhYπf;Qh¶´¡âc4mÄﬂàìÒ}aø{_à÷≠ìO–åDhWt3NPu‹Qw`â$lKPæG÷ö®Ÿ¯È.’’ïú4¥˚¡Nú£]wkbr¨ã‘ÌuKò⁄"c¿8Ñ#	óÏÖcæ¨ODÏó@TWoL∏êh–~ÑÇ¨œ6É¨O“ÈM8π^vNﬂA˛Aº…dïÜˇ0%òì∂å«·ÄF”!	à≈˝œÚdo"ââ´/]".pı©#dd4˘[ÕSÇá≈Ñ¡
w¬
–ç] ¥0°Kk¯íªﬂ£ûÆüíbN7/°·qÁT1ó∂~8_ Og<Ë,í<…Á
kÁ◊~KΩ®f÷ŒV
x£÷^*L√≥Œ9®ì[“j††4«±{nú†rû;≤à)‹¯8h⁄¡•˛√˜®ûáÇ–ú»f∆w‰√û*˚‹U*˙enæXÖr$5'¯T±∫–í™íö¬Zh
Òp∆í˝£ﬁ≤SrM¨Ë„C∂¡¿Hˆ¥∑KÓ>∫∫ÂlH[g˜ù9 3‘&ÚàÙ„]µx:^|æœ≤TúíÍ<⁄îÎY`Äs™∂¸ä™y◊˝w°◊X jö“Hıπ#Ÿò˝öüq◊”·»k@“ºŒƒ—ÇˇıÎ∞L<ZÛÑF&‹mmfM¶4’E4ù´§¡r£%©ˇkd`*·˚hˇû‡æ”˜ÖÕ•√¢Ã˚Ü∂`ﬂÊΩ¨µì©◊π„”‡ı`aRôg!…4ﬂPïY§Xçˆ›BMw˙èsﬂÁ¥ƒg§Ûi4 4NiÍ≤ë"œ¢6F£ÿAjD˚–,¸≠ijÉÿ5zóF•ïﬁÎ|é#–æ¥î~â}õôudq˛ÑG≥‰÷«√ƒt¡+†Wú›%Oîº1/π˙$S{
Û˜k˝{C Z√≈∂xk j˘x–©Â^øßw˜ÍﬁB◊Û@’7ÜtKe≥6Q=¨x¿|ÚÇ[ı•óB±«|M†9ô¢ö–Z–Zuw#ÃKv3ÃﬂÓÜò#ö‚U®ÇP1\Jñ˚÷’¿7ÑÖjœ tı@¶YùW√<˝CKNJÀ∏Ôáñ<0±†‘kJsn$‰øÑ&_Ü9ƒmÀt¿YZf]ÓU—Ql|õRp`Tî≥æO+
2ˆ6`ÅÇ¿°˘SÄÆ¬Ùb:àd÷¡p≈,∏ç«!¡∂jŸpÑ·mÉ§ê±–wòBÛì;Åè˙ö›Ü—â0≤¨Í´?‚ø¯Ó∆´76.ùß€*-ïŸ6úH¬]^‚X¬ÉôBZ˝ÓÌ´w⁄7ooùøºÒı7ø˝˝˙≠K,J≈éLA¸«OﬂË‹:◊æh‚m‘oR£)^…≤*°7PMÇØ2Ó5µ.„Y7‘_/–ØxyÌîÊd=8»$0º$p<Çœ(¬|«√›‰Lm2Ö yÄñí—“
+sdÿ…ctwá	Z˛C 0∆à4}¡ô˛¡˚˛Íkæër∆OG™õ(Êû&©r∂TúúƒL}±ûô% OâÇ3∫Øb"ßΩŒŸ£ßâ|vº·14cT»”ôRéÃdJô©|%_
Ú‡8Yrãc;E38¥Ãí„9 Rmà)“ì$.(TÁÁ∞0ÙÑÓı 8ûl^å£GùRõñ‘f‘y˜V˚ªﬂ∂/?◊yÌs åﬁ‰·>òöc;yã’®f¶ü(iXr∫¯ÛóXIîÌ—∫‹P"‡
øø˙JK¶‹wÛ¸'Ìón∞¨ñ,ØãT_Tâ‹ π—RIIñÍ!<4∏Àaß∫11#Do∏N_]g≥˚"H&¸Ëœü›ôs•„ŒuÇƒ: ,†pá¡êï3wMëêO9µÈ(tªéH◊É»"õ∏2¬O¨LŒ(W≤ù‘ÕﬂÏã=Ñ_µ∫Lm)ÙF c)Ì'ΩVùà€$ïò≤6.$qO 3›Ó“ºﬂ±@·çbÊ/Õù$∞7Åú(‹…·~•[‡[Á/—ŒÀäjí-~ãº∫á$ãÕÿQz≈
(bçLˆì#’çèÔ X^ÍòÙ¨E™ÙÎO™ãÿåù$UZ·CRµÊÍÅ#’Œ≠œ⁄óﬂ')öãëÍ4»è¯Î'÷MÕÖáè;I±¥÷êb√‘òü≈∂ø=◊yı+ _g4xçIµÏ;…™uŸê~x“•≠açŸy
Ê*H»÷Ù=xÑ¸œø3@í¢˛MåéY⁄ΩÖP@Å{G√5n«	ÿÆ˘!ıZó¿ô*ò“y£·»…‰r‘’	AK‰P±4d2§~Ûj≥º0€PåÉ+lÍ25«Ô`ug-ä·qΩAÊƒ]∑ “DYIÃÄfÍ—@zˆn å2ˇm¸È.¬gﬂ˛™ÛœªÌóﬁÌ¸ÒsÁ‚¬ÁùO?`ˆA”`SìtË∞F¶’E‹ı¨£2-Î0ƒq@f˛Kjv√F‹∆∞—–ÊåÂíT!«xp°Ñ†úR™&ÆΩ±;Ïª∆å[Ë¸:]ñ5ƒø#SÂÏ—·ë={G˜=√¿õÚiŒwHòwÎ≤1Ì*ÈAÒ0‘£8˙Ã#Î2Îê£7øˆFfÿ¸äÇ¨cë.>ø”˛Ï÷ÊıÁ;Ô~Mâ∫"5§ÊºJINi»M=Íl6ä¶Ÿv.N~ò¡±[ƒ≤¢@r˜îËí á¬>πìªÔÍ%G≤=„Ïo\:wO·(tx¶gú˝MXﬂX¨∞7+IèöÕçovT˙oÖmºÙUÁÃYí⁄:qp„„;lÎ`^…˜faÖ"&„'vi—“û≈E$ùHÕÂ˚yç≈¡5
ímˆHæPÏßË¢AaêB?àÑ+‡XÊ∞*˙á§L€Ô …7Z∆rL]?ÆÅ˘_æ˘k˚¬ªkJ©‘{^ÈŒìt=Xæ˙›Æ´¸É∑&∂µÁKô…ûq˙V¬ô77^Ωët	ÃKXÙI1õ2h+ùWøM\S	î÷‚Ø≤≈…|%5“üÑ˝$)¥˝]æÎ+iµ&Rs>◊3nÖÍ˛˘˜ˆ˘;Ì;Ønù9ª˘m\cª_≠!^1r3Ã="î©:’⁄√d‹ ≤\FOÀ%=aªM€nWvö;ŒW+˜à⁄∆iåè03ïDxs!~öT5îEyLGp«Ù£	I:B/èB)è–∆ônÎáîüejJµËË√(ºœdÜ¥œDZzˆåqVû¬Ù1å|+=ﬂHÂH°Ãº∆ÓÖ´X`õPP4ºêﬁp∞˘·{§O5BÑ9ïmœI<0˜∫†"“˝k«lZÓL:˛I5DjNÚ∫πæqi„.√°œ;Æ´é}I÷âe{™Öûg∏ë5ÍBL$ï©xÜô†Ω{xõ@$’rPåV7ÈöB}È"1z'éN˛ídË2‰MHÆ+ÅQdÓP¥P¥Øj∂±á¬·ÑløcfXûX®?ì£©ıúaÖÖ∑`©=¿¶˜æk#≥¸Ωô≥∆LøÒ–¨ZﬁΩ FóÎk8ôm#ª\ƒˆt≤Û"∫±Ùå$ıh‘\Øˆ—LåVΩÿác"Î£—¨ALÓZ†â&'1eÎ≤§·ëíÄ\N?Æ}Œä˙pmsÙ¢ÕvljÛƒäÏı`h≤D›&9
#zyr'*lˇÒ°¿ﬂÒƒ†EOä]›“v§‡uÎË–‹YG^G'#IjﬁéÏÂªéL˙Paí∫€Wä≈…âLpb£dá&Q¯Mﬁö4v4êä√‰ëù;^ôä+W7æ|èùé¸4§∑€W.¬óâ…ÅÅ:7 ∞k§êÎ'”“¢¢ˆv/lQöjª'¸=â∆ûu›ûu∏Uá˘ÿÖD#ú™æ€."Ví@ÃÑÓù´`WÛ€ıù4êd&'{¬xÕadÇ€Ánl˝ˆ≥W,VkÑ,ÇÏì;aòº◊…D‰ÈF€Ëä@›U<$QìDôQ÷G¢h⁄DÖŒ4”&'” √ﬂnò¸v∆ﬁ«‹≠í÷’ÖÅT`Ö\îB√N√Ö§;ÙpâÖö{ˆ2ªKÏ≈`±ÖÊãXDî“Îò◊¢y≥jç8L∞1Êe©∆Wà¯…œ,É €JÌî} ÙÑô!¬SÆEÂÊÜ¶{£fOß˜ª—¡C«àtÏ√ªÍº\}fV]ä∆Ú•Oa~gNM4∆òèΩ∆" èÕgÕ7ˆ≈ñ"|2Øà¶B‡qΩ‘Ñ≈b7—µØπ⁄}3éüàG‰˝’Ë€ïà¶=éHEáƒòOBóaÔ‰Ö{ƒŒºâπ®Œ);W7ì…\GÚ;Uu‘1ÁéÕπ/6œæ

◊ÊÖØXPjW…Îw3ûê˛ºrq˝õ´ÏÄf¯rÃX¡Ωà•Äqá1ıYµ∂Ã∑v,ÃgºLÃ/¶Ó∫∫?
ê$Çc§™1<,"R˙V8gÄÃáÑ!*cUºáÌ IÇœà‰‡√Ô¢Ä◊v≥9∞§Qz◊ó4∏«Å¡é⁄Ç∞}µH2ä·ä{~íÏc¯·ˆ2±ç?â73¸tª°·'t7¢´~∫ù≈o5¯ﬁ“¢H‹&<£BÛ‘¡øQhõ•Ìä}&f+ƒOW€!~Ç∂ƒˇ  ˇˇÏ][oG~ÁWåxr$∞K ¥¥…2I)ÿ(vÇ™>mÏç≥Í^‹]
(R≈M©HÄ6*HiAÅHÖ—"!¥<‰ü¥l.ˇ¢3;ªÎôŸôŸ±sè∫/ÿÀlvf|ÓsŒwà $Å@äG$…]åπ›˛·[tanﬂŒπ¶æ*ìÙå+dîê∏ıSNó Í(QafS∂áì€§ }]•†ÆÉhã
Fu
ˆgÑ_“!0}IPµ…w…A¶“åYºÌ´—Ü•„ß£3ÔÌ»A‘H¬â∫t(˙ñÌ¬¶µÆ´⁄,B:"©Â€µ£*˛r‘ÿ+DÙ¸ÊX∑‘C& ‡Às˘îÖvæUÛ$µ¡2æ‘é∏£ãÅÿ¬gîÃa7¥E€“Éç®sx†H¡l≈ß‹m;Fù€ÁáJ±HjsËÉ≈÷yb⁄£È‹!?Tég)¥JÔµçG…ÈMÏÌ†Khâq÷EﬁJòòÅQJGDi *‰«,CiÒÂ’Oô
>*≈¢∏±¨ﬂì*ŒÂ‹µ’è˝È∑7g÷ÊnƒÖ∏ÜùY›ü∞™∫ÄÊi5ÿƒq4b°C¥eêê‘<ö! œãó/˝Ae?ß‡'Éè œïÀBüÌnrnQ˜Z∏s}•RE	M¯x€M ®N∫]Î<X JÂ¢sK–ø?⁄ÉZ…¨ERS3.Û)ib´†‘ NrMaMØN›Ûﬂæˆoæ⁄x∞à£EéçÖ¶˙ÙÍ8J&M–â¢PxÉ˙ •…ÆLîêCÙI»ü(îä˘!P,çî¢÷•ap!?‘˚Ui∏‹K4Fw.Âk¡/”áäÖ	¡¥√0„rêq≥Œo=IÇâS¡.@á3&vGxâ'@c¥≈Ô™Ë·Î*&r≤hì≤ß;Ω¨ûYãëyÈ¡¸hdç¯Úó&á~ÜÃœì¸≈wˇ•ˇ‰Œ]9Ò›¨ø<Kßé„Çmú á‰]Kª≤Úª≈Qi|†ËÕ†‡
Ñ‘‘Ø˛ªe8u®™C<‹ô_¸õ◊°ÿB˙˚Ø%Í°ˇ¸6$´œu ï∏çñ)∆B˝¡é -\p&¿Ëƒÿ$%€ûu∫•Ò7ÛV¨'©[\Â√Q.¥À˝⁄Ö1ªâ£ˇŒëneF5ªf®ñßí∆‡†yóÌ*‡Ü:µKö—ﬁ8Ç6\Ö˚Dõ§l…«ˆ∏ «ñ«mÚ˙4·ªì⁄4Yö{Û¢ofÌ˘ÀÊ "∞Re¨((Sƒπeâwâä˛B•éb5-Ωs≈¸`Ú©V≠˙qä\dyAq[Ù@ªu¸‹ÑYÓÏ¶‡Ñe5ùÇZ˝\∫ùäÏ*”q¡ª≠¥+ßﬁµ?ﬁ˘èn„ìR£@ˇñ‡ﬂ"¨+≈˘X4ëUË˛2Cè®‰[Ìi•∆8∏ù
Ñ{eàR?~x∏∂p«ü^<ÁY·œ S	ï$»õc\j⁄•]Úå+Êı±}.úA ‰@&àg–≤Î3ëêÉÚÆp∂Ω∑„v¬˜˜≥˛≠?ë›ì¡√≈ü·=lÙ≠Ãè∫FUìæYî=% ΩﬂC‹∫Ò‰°ø4¡+WzáΩ\°XÚXîeh§–ÎäéU”pΩhŒ.Hï%‹=ñ)Ôa∑à€+Ïﬁú2o„Ñ01*Ó∆¡’H°7@†1{$3∞°´£º‚¿m'n≥å≤—3˚Ü¨ì{ "∆=OBJ≤G¬$Ô&	çàí%$<s Iàs+=å»0‘d8yVªeÒb%ó∞SÉ~=
ofãUsãNeˇıÓ˝’◊S°aWuS9bú∂·" 	•m´ì5∂á˜‰0õ∆éHﬂJ DPßœ=6îÖ≈¸∑Øâ&$ó¨CÏ4lèQ∏à/ú¿}©‘?ÿ _ıˆV  ï5ÄÚ◊≈≠◊ı¶wŒ©i&ÙÌ˝≠ﬂπ˝¡çÃoMw…îË|üaÍÂÜ´kµÄ˜tåæﬂqÍ¶ ´ ˇ∑ÖµÂÎÛ´èﬂ˚˜¶Wü·úq√Æ∫ém\—‹‡özhcıÎ≠ﬁyÊ?Ωøq}¡ø˚ìˇÊ˙«7À†Pks7¢Y‚’lÃ˛á‚~Åﬁá`¶zpän¬•·Ô(õ¬B≠™°ˆJ¶”‘w)NO…ÆÉßgxsøƒŒ^	.ÁO›˙∏¸ì»b”~Ä˚Œ√?dò„Z
Àl]L=4ﬂ±ÍvMµÿx9û≤§Çˆ„Õf√˚<ó´9U/[ñòÖ"Áµ§üó´Â≤ŸlNØ•W;aıÀìñìMVëtb'›A¨ΩÅQ∆"“√’=πü0kç˛ì]m¸Uå5ëÄÀ&€∆›ì<@Î'	Q9xäp¿s$p†‡XhLåBŸ5ã7°!Í
¯ÖÌ Àì∑‘êÉ{r¯Ã±,(:4«Åcﬂe˙iØ	ïY˝Lﬁ˝n¬∏ËÄn˝åf“–‹&zµ‹8Õ ÷¿}Ùt.|(€÷L∫≥ »Ê1QókiM'~ˇàf:qƒ”·´~Äz	\\YtÎ¶2Ÿ™w±+~q–IµaË¿¶aõú«ﬁrIU¥ó»∑˙ﬂ!U€núV[ælW1≠„]ÔhóÎî—;∞doÂ›ı`áÙ1»+„ÖKÌ¿ÎŒf^‹ˆg^	Ã€|›qì ≠[êÉ&e•bﬂ¿–π|Ä_xv ?XÍ”c7∂ÍÿcÜk–?u‰ƒR7≤Ü∑ßù[´∂ﬂù€ §Yä,R#««Ñ‰H∂XO4UOÖÕíxñßÛ¶Ó6+Æâö8	π‡dÇx˛œñÊ¯ìL6(‰mbO)|—Ñõí‰ìåïÙ”õÓ∆ \üâ<|&èªÇª≤àº:^·ààë…;IÁräÇæÅt”Lh£)!+»ãÃf1eÈûe÷$5üÜ‘És,JfÊ«HT=—99~22ùä|"ëämQX¥’j]πTòE⁄m«›Ì‘®˘@ºçøojÔ[\≠åJi+VÛ—cπÓîΩîÉ´ÌÌ⁄¸“˙“”’üØœOG˘‚hî∂∏-uﬂË˙‚–‰°ˇ   ˇˇ V2' 