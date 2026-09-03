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
import { BondedAreasChart } from './components/BondedAreasChart';

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
  en: string;
}

const TRANSLATIONS: { [key: string]: TranslationItem } = {
  systemTitle: {
    pt: "SISTEMA DE CONTROLE DE PÁTIOS BYD",
    zh: "BYD 堆场管控系统",
    en: "BYD YARD CONTROL SYSTEM"
  },
  slideTitle: {
    pt: "DASHBOARD OPERACIONAL & CAPACIDADE DE PÁTIOS",
    zh: "堆场运营与容量监控综合看板",
    en: "OPERATIONAL DASHBOARD & YARD CAPACITY"
  },
  slideSubtitle: {
    pt: "Monitoramento de Ocupação, Backlog Projetado e Escalas de Navios",
    zh: "堆场使用率、预测积压与船舶靠泊计划监控",
    en: "Occupancy Monitoring, Projected Backlog & Vessel Schedules"
  },
  activeSupplier: {
    pt: "FORNECEDOR BYD ATIVO",
    zh: "比亚迪合作堆场",
    en: "ACTIVE BYD SUPPLIER"
  },
  usedCapacity: {
    pt: "Capacidade Usada",
    zh: "已用容量",
    en: "Used Capacity"
  },
  totalCap: {
    pt: "Capacidade Total",
    zh: "总容量",
    en: "Total Capacity"
  },
  full: {
    pt: "Cheio (Full)",
    zh: "重箱 (Full)",
    en: "Full (Loaded)"
  },
  empty: {
    pt: "Vazio (Empty)",
    zh: "空箱 (Empty)",
    en: "Empty (Vazio)"
  },
  porto: {
    pt: "No Porto",
    zh: "在港",
    en: "In Port"
  },
  prontoColeta: {
    pt: "Pronto para Coleta",
    zh: "待提货",
    en: "Ready for Pickup"
  },
  delivered: {
    pt: "Entregue (Delivered)",
    zh: "已交付 (Delivered)",
    en: "Delivered"
  },
  overflow: {
    pt: "Estouro / Excesso",
    zh: "超容 / 爆仓",
    en: "Overflow / Exceeded"
  },
  vesselSchedule: {
    pt: "Escala de Navios Ativos (ETA)",
    zh: "活跃船舶靠泊计划 (ETA)",
    en: "Active Vessel Schedule (ETA)"
  },
  projected: {
    pt: "Projetado",
    zh: "预测",
    en: "Projected"
  },
  vessel: {
    pt: "Navio (Vessel)",
    zh: "船名 (Vessel)",
    en: "Vessel Name"
  },
  eta: {
    pt: "ETA (Chegada)",
    zh: "预计抵达 (ETA)",
    en: "ETA (Arrival)"
  },
  cntrs: {
    pt: "Contêineres",
    zh: "箱量 (CNTRs)",
    en: "Containers"
  },
  totalContainers: {
    pt: "Soma Total de Contêineres",
    zh: "集装箱总数",
    en: "Total Containers"
  },
  noVessels: {
    pt: "Nenhum navio programado.",
    zh: "暂无排期船舶。",
    en: "No scheduled vessels."
  },
  chartLeftTitle: {
    pt: "Backlog Projetado vs Capacidade de Entrega (Semanal)",
    zh: "预测积压量 vs 交付能力 (周度)",
    en: "Projected Backlog vs Delivery Capacity (Weekly)"
  },
  chartRightTitle: {
    pt: "Fluxo de Entradas Diárias vs Meta Garantida (Gc)",
    zh: "每日进箱量 vs 保证目标 (Gc)",
    en: "Daily Inflow vs Guaranteed Target (Gc)"
  },
  opHigh: {
    pt: "Operação Alta",
    zh: "高负荷运行",
    en: "High Operation"
  },
  opStable: {
    pt: "Operação Estável",
    zh: "稳定运行",
    en: "Stable Operation"
  },
  metaGc: {
    pt: "Meta Gc (140)",
    zh: "Gc 目标 (140)",
    en: "Target Gc (140)"
  },
  confidential: {
    pt: "CONFIDENCIAL BYD LOGÍSTICA",
    zh: "比亚迪物流机密",
    en: "CONFIDENTIAL BYD LOGISTICS"
  },
  nationalOperations: {
    pt: "Operações Nacionais",
    zh: "国内运营",
    en: "National Operations"
  },
  logistics: {
    pt: "Logística Integrada",
    zh: "综合物流",
    en: "Integrated Logistics"
  },
  overview: {
    pt: "Visão Geral",
    zh: "综合大盘",
    en: "Overview"
  },
  yardManagement: {
    pt: "Gestão de Pátios",
    zh: "堆场管理",
    en: "Yard Management"
  },
  bydBuffer: {
    pt: "BYD Buffer",
    zh: "智能缓冲区",
    en: "BYD Buffer"
  },
  depotsAllocation: {
    pt: "Depósitos & Alocação",
    zh: "协议堆存及流向",
    en: "Depots & Allocation"
  },
  routingPlan: {
    pt: "Plano de Direcionamento",
    zh: "流向及仓储规划",
    en: "Routing & Storage Plan"
  },
  demurrageOverdue: {
    pt: "Demurrage & Overdue",
    zh: "滞期费监控",
    en: "Demurrage & Overdue"
  },
  vesselScheduleNav: {
    pt: "Escala de Navios",
    zh: "船舶靠泊计划",
    en: "Vessel Schedule"
  },
  chartsProjections: {
    pt: "Gráficos & Projeções",
    zh: "智能运营图表",
    en: "Charts & Projections"
  },
  logisticsModule: {
    pt: "Módulo Logística",
    zh: "物流管理模块",
    en: "Logistics Module"
  },
  deliveryDashboard: {
    pt: "Painel de Entregas",
    zh: "交货监控面板",
    en: "Delivery Dashboard"
  },
  calendar: {
    pt: "Calendário",
    zh: "交付日历",
    en: "Calendar"
  },
  navMenu: {
    pt: "MÓDULOS DO PORTAL",
    zh: "导航菜单",
    en: "PORTAL MODULES"
  },
  systemActions: {
    pt: "AÇÕES DO SISTEMA",
    zh: "系统快捷控制",
    en: "SYSTEM ACTIONS"
  },
  syncGoogleSheets: {
    pt: "Sinc Google Sheets",
    zh: "同步谷歌表格",
    en: "Sync Google Sheets"
  },
  liveDataUpdate: {
    pt: "INTEGRAÇÃO PLANILHA",
    zh: "实时更新数据",
    en: "SHEET INTEGRATION"
  },
  editYard: {
    pt: "Editar Pátio",
    zh: "编辑堆场容量",
    en: "Edit Yard"
  },
  closeEditYard: {
    pt: "Fechar Edição",
    zh: "关闭编辑模式",
    en: "Close Edit Mode"
  },
  yardControl: {
    pt: "YARD MANAGEMENT",
    zh: "堆场控制",
    en: "YARD MANAGEMENT"
  },
  stockImport: {
    pt: "IMPORTAÇÃO DE ESTOQUE",
    zh: "库存数据导入",
    en: "STOCK IMPORT"
  },
  importStock: {
    pt: "Importar",
    zh: "上传库存",
    en: "Import"
  },
  downloadTemplate: {
    pt: "Modelo",
    zh: "模板",
    en: "Template"
  },
  exportPdf: {
    pt: "Relatório PDF",
    zh: "导出 PDF 报告",
    en: "PDF Report"
  },
  generatingPdf: {
    pt: "Gerando PDF...",
    zh: "正在生成 PDF...",
    en: "Generating PDF..."
  },
  pdfReady: {
    pt: "Relatório Exportado!",
    zh: "PDF 已下载",
    en: "PDF Exported!"
  },
  themeLight: {
    pt: "Claro",
    zh: "亮色",
    en: "Light"
  },
  themeDark: {
    pt: "Escuro",
    zh: "暗色",
    en: "Dark"
  },
  resetData: {
    pt: "Reset",
    zh: "重置数据",
    en: "Reset"
  },
  onlineStatus: {
    pt: "Online",
    zh: "在线",
    en: "Online"
  },
  connectingStatus: {
    pt: "Sinc",
    zh: "同步中",
    en: "Syncing"
  },
  offlineStatus: {
    pt: "Offline",
    zh: "离线",
    en: "Offline"
  },
  connectFirebase: {
    pt: "Conectar Firebase",
    zh: "连接 Firebase",
    en: "Connect Firebase"
  },
  occupancyRate: {
    pt: "Taxa de Ocupação",
    zh: "使用率",
    en: "Occupancy Rate"
  },
  totalStock: {
    pt: "Estoque Total",
    zh: "总库存量",
    en: "Total Stock"
  },
  activeYards: {
    pt: "Pátios Ativos",
    zh: "活跃堆场",
    en: "Active Yards"
  },
  status: {
    pt: "Status",
    zh: "状态",
    en: "Status"
  },
  action: {
    pt: "Ação",
    zh: "操作",
    en: "Action"
  },
  actions: {
    pt: "Ações",
    zh: "操作选项",
    en: "Actions"
  },
  save: {
    pt: "Salvar",
    zh: "保存",
    en: "Save"
  },
  cancel: {
    pt: "Cancelar",
    zh: "取消",
    en: "Cancel"
  },
  confirm: {
    pt: "Confirmar",
    zh: "确认",
    en: "Confirm"
  },
  close: {
    pt: "Fechar",
    zh: "关闭",
    en: "Close"
  },
  delete: {
    pt: "Excluir",
    zh: "删除",
    en: "Delete"
  },
  edit: {
    pt: "Editar",
    zh: "编辑",
    en: "Edit"
  },
  search: {
    pt: "Buscar",
    zh: "搜索",
    en: "Search"
  },
  filter: {
    pt: "Filtrar",
    zh: "筛选",
    en: "Filter"
  },
  all: {
    pt: "Todos",
    zh: "全部",
    en: "All"
  },
  carrier: {
    pt: "Transportadora",
    zh: "承运商/车队",
    en: "Carrier"
  },
  driver: {
    pt: "Motorista",
    zh: "司机",
    en: "Driver"
  },
  plate: {
    pt: "Placa do Caminhão",
    zh: "车牌号",
    en: "Truck Plate"
  },
  deliveryDate: {
    pt: "Data de Entrega",
    zh: "交付日期",
    en: "Delivery Date"
  },
  notes: {
    pt: "Observações",
    zh: "备注/说明",
    en: "Notes"
  },
  container: {
    pt: "Contêiner",
    zh: "集装箱",
    en: "Container"
  },
  containers: {
    pt: "Contêineres",
    zh: "集装箱清单",
    en: "Containers"
  },
  yard: {
    pt: "Pátio",
    zh: "堆场",
    en: "Yard"
  },
  yards: {
    pt: "Pátios",
    zh: "合作堆场",
    en: "Yards"
  },
  newYard: {
    pt: "Novo Pátio",
    zh: "添加堆场",
    en: "New Yard"
  },
  editYards: {
    pt: "Editar Pátios",
    zh: "编辑堆场",
    en: "Edit Yards"
  },
  manageContainers: {
    pt: "Gerenciar Contêineres",
    zh: "管理集装箱明细",
    en: "Manage Containers"
  },
  viewDetails: {
    pt: "Ver Detalhes / Gerenciar",
    zh: "查看详情 & 管理",
    en: "View Details / Manage"
  },
  deleteYard: {
    pt: "Excluir Pátio",
    zh: "删除堆场",
    en: "Delete Yard"
  },
  freeTimeDays: {
    pt: "Free Time (Dias)",
    zh: "免堆期 (天)",
    en: "Free Time (Days)"
  },
  daysOverdue: {
    pt: "Dias em Atraso",
    zh: "超期天数",
    en: "Days Overdue"
  },
  estimatedCost: {
    pt: "Custo Estimado",
    zh: "预计费用",
    en: "Estimated Cost"
  },
  criticalAction: {
    pt: "Ação Prioritária",
    zh: "优先处理",
    en: "Priority Action"
  },
  shipowner: {
    pt: "Armador",
    zh: "船东/船公司",
    en: "Shipowner"
  },
  berthingWindow: {
    pt: "Janela de Atracação",
    zh: "靠泊窗口",
    en: "Berthing Window"
  },
  discharged: {
    pt: "Descarregado",
    zh: "已卸船",
    en: "Discharged"
  },
  scheduled: {
    pt: "Agendado",
    zh: "已排期",
    en: "Scheduled"
  },
  inTransit: {
    pt: "Em Trânsito",
    zh: "在途中",
    en: "In Transit"
  },
  completed: {
    pt: "Concluído",
    zh: "已完成",
    en: "Completed"
  },
  delayed: {
    pt: "Atrasado",
    zh: "已延误",
    en: "Delayed"
  },
  pending: {
    pt: "Pendente",
    zh: "待处理",
    en: "Pending"
  },
  currentWeek: {
    pt: "Semana Atual",
    zh: "当前周",
    en: "Current Week"
  },
  startWeek: {
    pt: "Semana Inicial",
    zh: "起始周",
    en: "Start Week"
  },
  endWeek: {
    pt: "Semana Final",
    zh: "截止周",
    en: "End Week"
  },
  inboundFlow: {
    pt: "Aporte de Navios",
    zh: "进港到箱",
    en: "Inbound Flow"
  },
  drainCapacity: {
    pt: "Escoamento / Dreno",
    zh: "工厂出清能力",
    en: "Drain Capacity"
  },
  inventoryBalance: {
    pt: "Saldo de Estoque",
    zh: "库存结余走势",
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


// DADOS INICIAIS DA IMAGEM ORIGINAL (Para restauração e estado inicial)
const ORIGINAL_YARDS: YardsState = {
  tecon: { name: 'TECON', type: 'BONDED', capacity: 2000, cheio: 1643, vazio: 0, porto: 576, prontoColeta: 2253, delivered: 5535, previous_total: 1600 },
  intermaritima: { name: 'INTERMARITIMA', type: 'BONDED', capacity: 800, cheio: 735, vazio: 0, porto: 252, prontoColeta: 671, delivered: 5948, previous_total: 750 },
  tpc: { name: 'TPC', type: 'BONDED', capacity: 1200, cheio: 843, vazio: 0, porto: 698, prontoColeta: 431, delivered: 3679, previous_total: 800 },
  clia: { name: 'CLIA EMPORIO', type: 'BONDED', capacity: 300, cheio: 109, vazio: 0, porto: 48, prontoColeta: 55, delivered: 371, previous_total: 120 },
  ag: { name: 'AG - INTER CDEX', type: 'WAREHOUSE', capacity: 2200, cheio: 844, vazio: 0, porto: 0, prontoColeta: 122, delivered: 144, previous_total: 850 },
  cts: { name: 'CTS - PONTUAL', type: 'WAREHOUSE', capacity: 1200, cheio: 0, vazio: 0, porto: 0, prontoColeta: 0, delivered: 0, previous_total: 0 },
  cts_jew: { name: 'CTS - JEW', type: 'WAREHOUSE', capacity: 500, cheio: 0, vazio: 0, porto: 0, prontoColeta: 0, delivered: 0, previous_total: 0 },
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
                title={language === 'zh' ? '删除堆场' : 'Excluir Pátio'}
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
                  {language === 'zh' ? '容量' : 'Capacidade'}
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
                  {language === 'zh' ? '实重' : 'Cheios'}
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
                  {language === 'zh' ? '空箱' : 'Vazios'}
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
                    {language === 'zh' ? '港口' : 'Porto'}
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
                    {language === 'zh' ? '待收' : 'Pronto Col.'}
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
                    {language === 'zh' ? '已交付' : 'Entregue'}
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
                {language === "zh" ? "实重" : "Cheios"}
              </span>
              <span className="font-mono font-black text-xs text-slate-800 dark:text-slate-200">
                {yard.cheio || 0}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/60 p-1.5 rounded-lg border border-slate-150 dark:border-slate-800/80">
              <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-tight">
                {language === "zh" ? "空箱" : "Vazios"}
              </span>
              <span className="font-mono font-black text-xs text-slate-800 dark:text-slate-200">
                {yard.vazio || 0}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/60 p-1.5 rounded-lg border border-slate-150 dark:border-slate-800/80">
              <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-tight">
                {language === "zh" ? "容量" : "Capacidade"}
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
              ? (language === 'zh' ? '管理集装箱明细' : 'Gerenciar Contêineres')
              : (language === 'zh' ? '查看详情 & 管理' : 'Ver Detalhes / Gerenciar')}
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

  // ESTADOS DE BACKLOG DE FÁBRICA
  const [dailyDeliveryRate, setDailyDeliveryRate] = useState<number>(() => {
    const saved = localStorage.getItem('byd_daily_delivery_rate');
    return saved ? Number(saved) : 140;
  });
  const [additionalBacklog, setAdditionalBacklog] = useState<number>(() => {
    const saved = localStorage.getItem('byd_additional_backlog');
    return saved ? Number(saved) : 0;
  });
  const [showBondedChartSlide2, setShowBondedChartSlide2] = useState<boolean>(true);
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

  // ESTADOS DE CONTÊINERES (Para detalhamento por área)
  const [globalFilterQuery, setGlobalFilterQuery] = useState("");
  const [selectedYardKey, setSelectedYardKey] = useState<string | null>(null);
  const [containers, setContainers] = useState<Container[]>(() => JSON.parse(JSON.stringify(INITIAL_CONTAINERS)));
  
  // Limpeza definitiva do armazém descontinuado CTS - LOGIC (banco e estado)
  useEffect(() => {
    deleteDoc(doc(db, 'yards', 'cts_logic')).catch(() => {});
    setYards(prev => {
      if (!prev['cts_logic']) return prev;
      const next = { ...prev };
      delete next['cts_logic'];
      return next;
    });
    if (selectedYardKey === 'cts_logic') {
      setSelectedYardKey(null);
    }
  }, [selectedYardKey]);
  
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

  // NAVEGAÇÃO DE SLIDES E COMENTÁRIOS DAS NOVAS PÁGINAS
  const [currentSlide, setCurrentSlide] = useState(0); // 0: Geral, 1: Pátios, 2: Navios, 3: Gráficos
  const [chartTab, setChartTab] = useState<'drain' | 'space'>('space');
  const [yardsComment, setYardsComment] = useState("Inserir comentários sobre a capacidade e ocupação dos pátios de forma bilíngue aqui. / 在此输入关于堆场容量、占用比率的双语说明。");
  const [vesselNote1, setVesselNote1] = useState("Escala regular de navios ativa - Monitoramento detalhado das janelas de atracação. / 常规活跃船舶靠泊计划 - 详细监控和管理泊位窗口。");
  const [vesselNote2, setVesselNote2] = useState("Destaques operacionais dos navios (Ex: Prioridades de descarga BYD). / 船舶运营重点亮点 (例如：比亚迪重箱卸船优先顺序)。");
  const [chartNote1, setChartNote1] = useState("Comentários sobre o Backlog Projetado vs Capacidade de Entrega Semanal. / 预测积压量与周度交付能力的对比分析说明。");
  const [chartNote2, setChartNote2] = useState("Análise de gargalos e metas diárias garantidas (meta Gc de 140). / 关于每日进箱量与保证目标 (Gc 140) 的瓶颈分析和建议。");

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

  // CONTROLE DE EXPANSÃO / RECOLHIMENTO DE NAVIOS POR MÊS
  const [expandedVesselMonths, setExpandedVesselMonths] = useState<Record<string, boolean>>({});

  const groupVesselsByMonth = (vesselList: Vessel[], lang: string) => {
    const ptMonths = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const zhMonths = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
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
      const zhLabel = `${year}年${zhMonths[month - 1]}`;
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

  // 3. SINCRONIZADOR EM TEMPO REAL ON-SNAPSHOT DO FIRESTORE (MULTI-USER REAL-TIME SYNCHRONIZATION)
  useEffect(() => {
    setDbStatus('connecting');

    // 1. Assinatura em Tempo Real de Yards (Pátios)
    const unsubYards = onSnapshot(collection(db, 'yards'), (snapshot) => {
      if (snapshot.empty) {
        initializeYardsInDb();
      } else {
        const newYards: YardsState = {};
        snapshot.forEach((docSnap) => {
          if (docSnap.id === 'cts_logic') {
            deleteDoc(doc(db, 'yards', 'cts_logic')).catch(() => {});
            return;
          }
          newYards[docSnap.id] = docSnap.data() as Yard;
        });

        // Garantir que cts_logic nunca apareça
        delete newYards['cts_logic'];

        // Garante integridade de todos os pátios padrão
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

    // 4. Assinatura em Tempo Real de ChartLeft (Projeções e Histórico)
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

    // 6. Assinatura em Tempo Real de Contêineres (Containers)
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

    // 7. Assinatura em Tempo Real de Logística Geral
    const unsubLogistics = onSnapshot(collection(db, 'logisticsData'), (snapshot) => {
      const data: LogisticsEntry[] = [];
      snapshot.forEach(docSnap => {
        data.push({ id: docSnap.id, ...docSnap.data() } as LogisticsEntry);
      });
      setLogisticsEntries(data);
    }, (err) => {
      console.warn("Falha no listener de logisticsData:", err);
    });

    // 8. Assinatura em Tempo Real de Configurações Globais
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
  // ESTADOS EXPANDIDOS PARA GESTÃO COMPLETA DE NAVIOS (VESSELS CONTROL TOWER)
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

    setDoc(doc(db, 'bufferAreas', id), newArea).catch(e => console.warn('Falha ao criar buffer no Firestore:', e));
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
      deleteDoc(doc(db, 'bufferAreas', area.id)).catch(e => console.warn('Falha ao remover buffer no Firestore:', e));
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
            
            let areaName = `BYD Buffer ${areaPrefix} (Zona ${areaPrefix} / ${areaPrefix}区 - Ativo)`;
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
    let rawYardKey = selectedYardKey || stockSelectedYardKey;
    const activeYardKey = (rawYardKey === 'a23' || rawYardKey === 'tps') ? 'intermaritima' : rawYardKey;
    
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
      ["   - CTS - PONTUAL (Warehouse / 仓库)"],
      ["   - CTS - JEW (Warehouse / 仓库)"],
      ["   - CTS - UNI (Warehouse / 仓库)"],
      ["   - CTS - VBR (Warehouse / 仓库)"],
      ["   - LOGIC (Warehouse / 仓库)"],
      ["   - MULTILOG (Warehouse / 仓库)"],
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
          if (clean.includes('intermaritima') || clean.includes('intermar') || clean.includes('inter') || clean.includes('maritima') || clean.includes('a23') || clean.includes('tps')) return 'intermaritima';
          if (clean.includes('tpc')) return 'tpc';
          if (clean.includes('clia') || clean.includes('emporio')) return 'clia';
          if (clean.includes('ag') || clean.includes('cdex')) return 'ag';
          if (clean.includes('multilog')) return 'multilog';
          
          if (clean.includes('cts')) {
            if (clean.includes('jew')) return 'cts_jew';
            if (clean.includes('uni')) return 'cts_uni';
            if (clean.includes('vbr')) return 'cts_vbr';
            if (clean.includes('logic')) return 'logic';
            return 'cts'; // default CTS fallback to PONTUAL
          }
          if (clean.includes('pontual')) return 'cts';
          if (clean.includes('jew')) return 'cts_jew';
          if (clean.includes('uni')) return 'cts_uni';
          if (clean.includes('vbr')) return 'cts_vbr';
          if (clean.includes('logic')) return 'logic'; // Separate LOGIC warehouse

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

    if (!window.confirm(language === 'zh' ? `确定要从库存中删除集装箱 ${containerId} 吗？` : language === 'en' ? `Are you sure you want to remove container ${containerId} from stock?` : `Deseja realmente remover o contêiner ${containerId} do estoque?`)) {
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
  const addVessel = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newVesselName.trim() || !newVesselEta.trim()) {
      alert(language === 'zh' ? '请输入船名和预报到港日期（ETA）' : language === 'en' ? 'Please enter vessel name and ETA date' : 'Por favor, informe o nome do navio e a data de ETA.');
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

  // INICIAR EDIÇÃO DE UM NAVIO
  const startEditVessel = (v: Vessel) => {
    setEditingVesselId(v.id);
    setEditVesselName(v.name);
    setEditVesselEta(v.eta);
    setEditVesselCntrs(v.cntrs);
    setEditVesselCarrier(v.carrier || 'BYD CHARTER');
    setEditVesselStatus(v.status || 'SCHEDULED');
    setEditVesselTerminal(v.terminal || 'Porto de Santos');
  };

  // SALVAR EDIÇÃO DE UM NAVIO
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

  // ATUALIZAÇÃO RÁPIDA DE CAMPO DE NAVIO
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
          titleEN: "OPERATIONAL DASHBOARD & YARD CAPACITY",
          subPT: slideSubtitlePT,
          subZH: slideSubtitleZH,
          subEN: "Integrated Monitoring of Occupancy, Projected Backlog, and Vessel Schedules",
        };
      case 1:
        return {
          titlePT: "OCUPAÇÃO DETALHADA DE PÁTIOS & CAPACIDADE",
          titleZH: "BYD 合作堆场容量与占用比监控",
          titleEN: "DETAILED YARD OCCUPANCY & CAPACITY MANAGEMENT",
          subPT: "Monitoramento Detalhado de Capacidade Usada, Contêineres Cheios, Vazios e Status de Ocupação",
          subZH: "常规合作堆场使用容量、重箱及空箱占用比监控与超容预警分析",
          subEN: "Detailed Monitoring of Used Capacity, Full/Empty Containers, and Occupancy Status",
        };
      case 2:
        return {
          titlePT: "ESCALA DE NAVIOS ATIVOS & JANELAS (ETA)",
          titleZH: "活跃船舶靠泊计划与到港预测 (ETA)",
          titleEN: "ACTIVE VESSEL SCHEDULE & BERTHING WINDOWS (ETA)",
          subPT: "Programação de Chegada de Navios, Volume de Contêineres e Notas Operacionais",
          subZH: "活跃船舶到港 ETA、集装箱卸船计划、口岸放行及作业手记",
          subEN: "Vessel Arrival Schedules, Container Volumes, and Operational Highlights",
        };
      case 3:
        return {
          titlePT: "PLANO DE ESCALONAMENTO DE CAPACIDADE INBOUND & DRAIN",
          titleZH: "进港运力爬坡与出清排水计划看板",
          titleEN: "INBOUND CAPACITY RAMP-UP & DRAIN PROJECTION PLAN",
          subPT: "PROJEÇÃO DE CHEGADAS (ATA/ETA) VS ESCOAMENTO EFETIVO E EVOLUÇÃO DO SALDO DE INVENTÁRIO.",
          subZH: "预测每周船舶到港进箱量与工厂出清能力对比及库存走势分析。",
          subEN: "PROJECTION OF ARRIVALS (ATA/ETA) VS DELIVERY DRAIN AND WEEKLY INVENTORY BALANCE EVOLUTION.",
        };
      case 4:
        return {
          titlePT: "BYD BUFFER INTEGRATED HUB & TRANSPORTE RÁPIDO",
          titleZH: "比亚迪智能缓冲中转枢纽与快速移运监控",
          titleEN: "BYD BUFFER INTEGRATED HUB & RAPID TRANSFER",
          subPT: "Mapeamento em tempo real de posições, escoamento de contêineres e otimização de retirada rápida",
          subZH: "缓冲区堆位、放行流向与智能移箱优化监控",
          subEN: "Real-time slot mapping, container flow, and rapid pickup optimization",
        };
      case 5:
        return {
          titlePT: "CONTROLE OPERACIONAL DE DEPÓSITOS & ALOCAÇÃO",
          titleZH: "协议堆存容量动态配额与船东准入管理大盘",
          titleEN: "DEPOT OPERATIONAL CONTROL & CARRIER ALLOCATION",
          subPT: "Gestão integrada de capacidades diárias, portões ativos e matriz de compatibilidade com armadores principais",
          subZH: "实时动态管控协议堆场每日限额、口岸通道开闭及集装箱流向分配符合矩阵",
          subEN: "Integrated daily capacity management, active gates, and carrier compatibility matrix",
        };
      case 6:
        return {
          titlePT: "PAINEL GERAL DE DEMURRAGE & CONTROLE DE DIÁRIAS (OVERDUE)",
          titleZH: "滞期费与集装箱超期监控塔",
          titleEN: "DEMURRAGE & OVERDUE CONTAINER MONITORING TOWER",
          subPT: "Painel de controle de vencimento de free time, contêineres retidos e custos de demurrage",
          subZH: "集装箱免费期到期预警、堆场滞期超期监控及异常滞箱控制面板",
          subEN: "Free time expiration alert, retained containers, and demurrage cost management",
        };
      case 7:
        return {
          titlePT: "MÓDULO DE GESTÃO LOGÍSTICA & REGISTROS OPERACIONAIS",
          titleZH: "比亚迪外贸进出口单证及集成物流控制大盘",
          titleEN: "LOGISTICS MANAGEMENT MODULE & OPERATIONAL RECORDS",
          subPT: "Cadastro integrado de equipamentos, containers WMS e importador Sheets",
          subZH: "集装箱单证台账、WMS 状态同步与表格批量导入",
          subEN: "Integrated equipment registry, container WMS status, and Sheets importer",
        };
      case 8:
        return {
          titlePT: "PAINEL EXECUTIVO DE ENTREGAS & TRANSPORTE CD",
          titleZH: "工厂到货交货监控面板与运力控制台",
          titleEN: "EXECUTIVE DELIVERY DASHBOARD & CD TRANSPORTATION",
          subPT: "Controle de status operacionais diários, transportadores e fretes",
          subZH: "每日工厂到货状态追踪、运输承运商及运费核算监控",
          subEN: "Daily operational status tracking, transport carriers, and freight monitoring",
        };
      case 9:
        return {
          titlePT: "CALENDÁRIO MENSAL DE DISTRIBUIÇÃO & ENTREGAS",
          titleZH: "月度交付日历与班轮吞吐预测",
          titleEN: "MONTHLY DISTRIBUTION & DELIVERY CALENDAR",
          subPT: "Agrupamento inteligente por House BL e volumes consolidados semanais",
          subZH: "按提单 BL 与周度合并箱量的智能排程与交付日历",
          subEN: "Smart scheduling grouped by House BL and weekly consolidated volumes",
        };
      case 10:
        return {
          titlePT: "PLANO DIRECIONAL DE ARMAZENAGEM & FLUXOS",
          titleZH: "集装箱流向分配与多级仓储规划",
          titleEN: "CONTAINER ROUTING & STORAGE CAPACITY PLAN",
          subPT: "Alocação estratégica de contêineres entre terminais alfandegados, armazéns gerais e buffer BYD",
          subZH: "保税堆场、普通外仓及比亚迪缓冲区的多梯次集装箱智能流向与运力配额规划",
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

  // Retorna título dinâmico conforme a seleção de linguagem e o slide ativo
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
              {language === 'zh' ? '导航菜单' : (language === 'en' ? 'PORTAL MODULES' : 'MÓDULOS DO PORTAL')}
            </span>
            {[
              { index: 0, pt: "Visão Geral", zh: "综合大盘", en: "Overview", icon: <Database className="w-4 h-4" /> },
              { index: 1, pt: "Gestão de Pátios", zh: "堆场管理", en: "Yard Management", icon: <Building2 className="w-4 h-4" /> },
              { index: 4, pt: "BYD Buffer", zh: "智能缓冲区", en: "BYD Buffer", icon: <Layers className="w-4 h-4" /> },
              { index: 5, pt: "Depósitos & Alocação", zh: "协议堆存及流向", en: "Depots & Allocation", icon: <FileSpreadsheet className="w-4 h-4" /> },
              { index: 10, pt: "Plano de Direcionamento", zh: "流向及仓储规划", en: "Routing & Storage Plan", icon: <Calculator className="w-4 h-4" /> },
              { index: 6, pt: "Demurrage & Overdue", zh: "滞期费监控", en: "Demurrage & Overdue", icon: <Clock className="w-4 h-4" /> },
              { index: 2, pt: "Escala de Navios", zh: "船舶靠泊计划", en: "Vessel Schedule", icon: <Ship className="w-4 h-4" /> },
              { index: 3, pt: "Gráficos & Projeções", zh: "智能运营图表", en: "Charts & Projections", icon: <TrendingUp className="w-4 h-4" /> },
              { index: 7, pt: "Módulo Logística", zh: "物流管理模块", en: "Logistics Module", icon: <Package className="w-4 h-4" /> },
              { index: 8, pt: "Painel de Entregas", zh: "交货监控面板", en: "Delivery Dashboard", icon: <Truck className="w-4 h-4" /> },
              { index: 9, pt: "Calendário", zh: "交付日历", en: "Delivery Calendar", icon: <Calendar className="w-4 h-4" /> },
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
            {/* Language Segmented Control */}
            <div className="bg-white dark:bg-slate-900 p-0.5 rounded-lg flex items-center border border-gray-150 dark:border-slate-800 shadow-3xs">
              {[
                { id: 'pt', label: '🇧🇷 PT' },
                { id: 'zh', label: '🇨🇳 中文' },
                { id: 'en', label: '🇺🇸 EN' },
                { id: 'bilingual', label: '🌐 MULTI' }
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
                <p className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400">{tt("Sistema Integrado de Controle de Pátios, Escalas e Planejamento Operacional", "比亚迪集装箱堆场、班轮船期与运营计划一体化控制系统", "Integrated Yard, Vessel Schedule & Operational Planning Control System")}</p>
              </div>
            </div>
          </div>

          {/* MÓDULOS OPERACIONAIS (Navegação principal centralizada) */}
          <div className="flex items-center gap-1.5 flex-wrap justify-center my-0.5">
            {[
              { index: 0, pt: "Visão Geral", zh: "综合大盘", icon: <Database className="w-3.5 h-3.5" /> },
              { index: 1, pt: "Gestão de Pátios", zh: "堆场管理", icon: <Building2 className="w-3.5 h-3.5" /> },
              { index: 4, pt: "BYD Buffer", zh: "智能缓冲区", icon: <Layers className="w-3.5 h-3.5" /> },
              { index: 5, pt: "Depósitos & Alocação", zh: "协议堆存及流向", icon: <FileSpreadsheet className="w-3.5 h-3.5" /> },
              { index: 10, pt: "Plano de Direcionamento", zh: "流向及仓储规划", icon: <Calculator className="w-3.5 h-3.5" /> },
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
            <div id="ppt-language-selector-container" className="bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-md p-1 rounded-xl flex items-center gap-1 border border-slate-200 dark:border-slate-700 shadow-sm">
              {[
                { id: 'pt', label: '🇧🇷 PT', name: 'Português Brasileiro', activeClass: 'text-blue-700 dark:text-blue-300' },
                { id: 'zh', label: '🇨🇳 中文', name: '简体中文 (Chinese)', activeClass: 'text-red-600 dark:text-red-400' },
                { id: 'en', label: '🇺🇸 EN', name: 'English', activeClass: 'text-indigo-600 dark:text-indigo-400' },
                { id: 'bilingual', label: '🌐 MULTI', name: 'Multi / Bilíngue', activeClass: 'text-emerald-700 dark:text-emerald-400' }
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
              {tt("Modo Monitor", "监视大屏模式", "Monitor Mode")}
            </button>
          </div>
        </header>
      )}

      {/* BOTÕES FLUTUANTES NO MODO APRESENTAÇÃO */}
      {viewParadigm === 'ppt' && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
          <button
            id="btn-back-to-portal"
            onClick={() => setViewParadigm('website')}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-full shadow-2xl flex items-center gap-2 font-black transition-all hover:scale-105 border border-red-500 cursor-pointer"
            title="Retornar para o Inbound Portal"
          >
            <LayoutGrid className="w-5 h-5 text-white" />
            <span>{tt("Retornar ao Inbound Portal", "返回综合门户", "Return to Portal")}</span>
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
                ? (language === 'zh' ? '正在生成 PDF...' : 'Gerando PDF...')
                : (language === 'zh' ? '导出 PDF' : 'Exportar PDF')}
            </span>
          </button>

          {!isEditMode && (
            <button
              id="btn-back-to-editor"
              onClick={() => setIsEditMode(true)}
              className="bg-[#1e293b] text-white hover:bg-slate-800 px-4 py-3 rounded-full shadow-2xl flex items-center gap-2 font-semibold transition-all hover:scale-105 border border-slate-700"
            >
              <Sliders className="w-5 h-5 text-emerald-400" />
              <span>{tt("Voltar ao Editor", "返回编辑模式", "Back to Editor")}</span>
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
                  {language === 'zh' ? '比亚迪物流控制塔' : 'BYD Inbound Portal'}
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
                { id: 'pt', label: '🇧🇷 PT', name: 'Português Brasileiro' },
                { id: 'zh', label: '🇨🇳 中文', name: '简体中文 (Chinese)' },
                { id: 'en', label: '🇺🇸 EN', name: 'English' },
                { id: 'bilingual', label: '🌐 MULTI', name: 'Multi / Bilíngue' }
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
                  {language === 'zh' ? '总堆存使用率' : (language === 'en' ? 'YARDS OCCUPANCY' : 'OCUPAÇÃO DE PÁTIOS')}
                </span>
                <span className="text-xs font-black text-slate-800 dark:text-white font-mono">{globalOccupancyPercentForHeader}%</span>
              </div>
            </div>

            <div 
                id="topbar-vessels-metric-button"
                onClick={() => setCurrentSlide(2)}
                title={tt("Clique para abrir a Escala de Navios", "点击打开船舶计划控制台", "Click to open Vessel Schedule")}
                className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-3 py-1.5 rounded-xl shadow-3xs transition-all hover:scale-105 hover:border-blue-400 cursor-pointer">
              <Ship className="w-3.5 h-3.5 text-blue-500 animate-bounce-slow" />
              <div className="flex flex-col">
                <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider">
                  {language === 'zh' ? '活跃船舶到港' : (language === 'en' ? 'ACTIVE VESSELS' : 'ESCALA DE NAVIOS')}
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
                  {language === 'zh' ? '协议堆场平均流量' : (language === 'en' ? 'DEPOTS VOLUME' : 'DEPÓSITOS REGULARES')}
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

                <div 
                  id="slide0-vessels-metric-button"
                  onClick={() => setCurrentSlide(2)}
                  title={tt("Clique para abrir a Escala de Navios", "点击打开船舶计划控制台", "Click to open Vessel Schedule")}
                  className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg transition-all hover:scale-105 hover:border-blue-400 cursor-pointer">
                  <Ship className="w-3.5 h-3.5 text-blue-500" />
                  <div className="flex flex-col">
                    <span className="text-[8px] text-gray-400 font-bold uppercase">{language === 'zh' ? '活跃船舶到港' : 'Active Vessels'}</span>
                    <span className="text-xs font-black text-slate-800 dark:text-white font-mono">{totalExpectedVesselsForHeader} <span className="text-[9px] text-gray-400 font-normal">({totalExpectedContainersForHeader} CNTRs)</span></span>
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
                                  {language === 'bilingual' ? 'Pesquisa Rápida Global (BL, Container, Lote) / 全局快速检索 (提单, 集装箱号, 批次)' : 'Pesquisa Rápida Global (BL, Container, Lote)'}
                                </h4>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                  {language === 'bilingual' ? 'Digite para localizar instantaneamente em qual pátio/armazém o contêiner, BL ou lote está / 输入以实时定位集装箱、提单或批次所在的仓库/堆场' : 'Digite para localizar instantaneamente em qual pátio ou armazém o item está alocado.'}
                                </p>
                              </div>
                            </div>
                            {globalFilterQuery && (
                              <button
                                onClick={() => setGlobalFilterQuery("")}
                                className="text-[11px] font-bold text-red-600 hover:text-red-700 bg-red-50 dark:bg-red-950/40 px-2.5 py-1 rounded-lg cursor-pointer transition-all"
                              >
                                {language === 'bilingual' ? 'Limpar Filtro / 清除筛选' : 'Limpar Filtro'}
                              </button>
                            )}
                          </div>
                          
                          <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                            <input
                              type="text"
                              value={globalFilterQuery}
                              onChange={(e) => setGlobalFilterQuery(e.target.value)}
                              placeholder={language === 'bilingual' ? '🔍 Digite BL, Container ou Lote (ex: lot 442) para ver o armazém...' : '🔍 Digite BL, Nº do Container ou Lote (ex: lot 442) para localizar o armazém...'}
                              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-red-500 transition-all font-mono"
                            />
                          </div>

                          {globalFilterQuery.trim() !== '' && (() => {
                            const matchedContainers = containers.filter(c => matchContainerSearch(c, globalFilterQuery));

                            return (
                              <div className="flex flex-col gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between text-[11px] font-bold text-gray-600 dark:text-gray-400">
                                  <span>{language === 'bilingual' ? `Resultados encontrados: ${matchedContainers.length} contêiner(es) / 找到结果: ${matchedContainers.length} 个集装箱` : `Resultados encontrados: ${matchedContainers.length} contêiner(es)`}</span>
                                  <span className="text-red-600 font-mono text-[10px]">{language === 'bilingual' ? 'Clique no pátio para abrir / 点击堆场打开' : 'Clique no botão para abrir o pátio'}</span>
                                </div>
                                {matchedContainers.length === 0 ? (
                                  <div className="text-center py-4 text-xs text-gray-400 font-medium bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                                    {language === 'bilingual' ? 'Nenhum contêiner, BL ou lote encontrado com este termo. / 未找到匹配的集装箱、提单或批次。' : 'Nenhum contêiner, BL ou lote encontrado com este termo.'}
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
                                              <span className="text-gray-400">{language === 'bilingual' ? 'Lote / 批次:' : 'Lote:'}</span>
                                              <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{mc.lote || '-'}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                              <span className="text-gray-400">{language === 'bilingual' ? 'Armazém / 仓库:' : 'Warehouse / Pátio:'}</span>
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
                                            <span>{language === 'bilingual' ? `Ir para ${yardName} / 打开该堆场` : `Abrir Pátio (${yardName})`}</span>
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
                                  <span className="font-mono text-gray-700 dark:text-slate-300">{(bondedSum.totalCap).toLocaleString()} <span className="text-[9px] text-gray-400">CNTRs</span></span>
                                </div>
                                <div className="h-4 w-px bg-gray-200 dark:bg-slate-700"></div>
                                <div className="flex flex-col">
                                  <span className="text-[7.5px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">{language === 'bilingual' ? 'Ocupado / 已用' : 'Ocupado'}</span>
                                  <span className="font-mono text-gray-700 dark:text-slate-300">{(bondedSum.totalCheio).toLocaleString()} <span className="text-[9px] text-gray-400">CNTRs</span></span>
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
                                  <span className="font-mono text-gray-700 dark:text-slate-300">{(warehouseSum.totalCap).toLocaleString()} <span className="text-[9px] text-gray-400">CNTRs</span></span>
                                </div>
                                <div className="h-4 w-px bg-gray-200 dark:bg-slate-700"></div>
                                <div className="flex flex-col">
                                  <span className="text-[7.5px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">{language === 'bilingual' ? 'Ocupado / 已用' : 'Ocupado'}</span>
                                  <span className="font-mono text-gray-700 dark:text-slate-300">{(warehouseSum.totalCheio).toLocaleString()} <span className="text-[9px] text-gray-400">CNTRs</span></span>
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
                                  <span className="font-mono text-gray-700 dark:text-slate-300">{(bufferSum.totalCap).toLocaleString()} <span className="text-[9px] text-gray-400">CNTRs</span></span>
                                </div>
                                <div className="h-4 w-px bg-gray-200 dark:bg-slate-700"></div>
                                <div className="flex flex-col">
                                  <span className="text-[7.5px] text-gray-400 dark:text-gray-500 uppercase tracking-wider" title="Total no Buffer: Soma Cheio + Vazio (espaço ocupado)">{language === 'bilingual' ? 'Total Buffer (Cheio + Vazio) / 缓冲总库存(重+空)' : language === 'zh' ? '缓冲总库存 (重+空)' : 'Total Buffer (Cheio + Vazio)'}</span>
                                  <span className="font-mono text-amber-600 dark:text-amber-400 font-extrabold flex items-baseline gap-1">
                                    {(bufferSum.totalOccupied).toLocaleString()} <span className="text-[9px] text-gray-400 font-normal">CNTRs</span>
                                    <span className="text-[8px] text-gray-400 font-normal">({bufferSum.totalCheio}C + {bufferSum.totalVazio}V)</span>
                                  </span>
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
                                    {language === 'bilingual' ? 'Nenhum pátio de apoio regulador cadastrado. / 未记录缓冲/辅助堆场。' : 'Nenhum pátio de apoio cadastrado.'}
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
                                          {language === 'bilingual' ? '活跃船舶靠泊计划 (ETA)' : t('vesselSchedule')}
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
                                                  <span>{language === 'bilingual' ? 'Recolher / 折叠' : language === 'zh' ? '全部折叠' : 'Recolher'}</span>
                                                </>
                                              ) : (
                                                <>
                                                  <Maximize2 className="w-2.5 h-2.5" />
                                                  <span>{language === 'bilingual' ? 'Abrir Todos / 展开' : language === 'zh' ? '全部展开' : 'Abrir Todos'}</span>
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
                                                      {group.vessels.length} {language === 'zh' ? '艘' : 'navio(s)'}
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
                                                          {isEditMode && <th className="py-1 text-center w-8">{tt("Ação", "操作", "Action")}</th>}
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
                                        {language === 'bilingual' ? '集装箱总数 / Total:' : t('totalContainers') + ':'}
                                      </span>
                                      <span className="text-[9px] text-gray-400 font-medium">({vessels.length} {language === 'zh' ? '艘船' : 'navios'})</span>
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
                              containers={containers}
                            />
                          </div>

                        </div>

                        {/* OTHER DYNAMIC EXTRA YARDS FALLBACK */}
                        {otherYards.length > 0 && (
                          <div className="flex flex-col gap-3">
                            <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{tt("Outros Pátios Adicionais", "其他附加堆场", "Additional Yards")}</h4>
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

                    <div className="flex items-center gap-2">
                      {/* Add Yard Button */}
                      <button
                        onClick={() => setShowAddYardForm(true)}
                        className="px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer transition-all"
                        title={language === 'zh' ? '添加新堆场或仓库' : 'Adicionar Novo Pátio'}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{language === 'zh' ? '新建堆场' : 'Novo Pátio'}</span>
                      </button>

                      {/* Edit Mode Quick Toggle */}
                      <button
                        onClick={() => setIsEditMode(!isEditMode)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all border ${
                          isEditMode
                            ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                        }`}
                        title="Alternar modo de edição dos pátios"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>{isEditMode ? (language === 'zh' ? '退出编辑' : 'Concluir Edição') : (language === 'zh' ? '编辑堆场' : 'Editar Pátios')}</span>
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
                                  <th className="p-2.5 w-[100px]">{tt("Programação", "交货排程", "Schedule")}</th>
                                  <th className="p-2.5 w-[120px]">Transportadora</th>
                                  {isEditMode && <th className="p-2.5 w-[60px] text-center">{tt("Ação", "操作", "Action")}</th>}
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
                            {tt("Gestão de Escala de Navios & Janelas (ETA)", "船舶靠泊计划与到港管理控制台 (ETA)", "Active Vessel Schedule & Berthing Control")}
                          </h3>
                          <span className="text-[10px] bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            {vessels.length} {tt("Navios", "艘船舶", "Vessels")} • {vessels.reduce((acc, curr) => acc + (Number(curr.cntrs) || 0), 0).toLocaleString()} CNTRs
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                          {tt("Cadastre novos navios, edite ETAs, organize a ordem de atracação e monitore o fluxo de entrada.", "在此添加新到港船舶、编辑预报ETA船期、调整靠泊顺序并实时监控集装箱流入。", "Register new vessels, edit ETAs, adjust berthing sequence and monitor container inflows in real-time.")}
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
                          placeholder={tt("Buscar navio, ETA, armador...", "按船名、ETA、船司搜索...", "Search vessel, ETA, carrier...")}
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
                          title={tt("Visão Agrupada por Mês", "按月份分组展示", "Grouped by Month")}
                        >
                          <Calendar className="w-3 h-3" />
                          <span>{tt("Mensal", "按月", "Monthly")}</span>
                        </button>
                        <button
                          onClick={() => setVesselViewMode('list')}
                          className={`px-2.5 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                            vesselViewMode === 'list'
                              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                              : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
                          }`}
                          title={tt("Lista Contínua Cronológica", "平铺顺序列表", "Full List")}
                        >
                          <List className="w-3 h-3" />
                          <span>{tt("Lista", "列表", "List")}</span>
                        </button>
                      </div>

                      {/* TOGGLE BONDED AREAS CHART */}
                      <button
                        type="button"
                        id="btn-toggle-bonded-chart-slide2"
                        onClick={() => setShowBondedChartSlide2(!showBondedChartSlide2)}
                        className={`px-3 py-2 rounded-lg text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer border ${
                          showBondedChartSlide2
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-slate-200 dark:border-slate-700 hover:text-blue-600'
                        }`}
                        title={tt("Exibir ou ocultar gráfico de áreas alfandegadas", "显示/隐藏保税区图表", "Toggle Bonded Areas Chart")}
                      >
                        <Building2 className="w-3.5 h-3.5 text-blue-500" />
                        <span>{tt("Gráfico Áreas Alfandegadas", "各保税区图表", "Bonded Areas Chart")}</span>
                      </button>

                      {/* PRIMARY ADD VESSEL BUTTON - VERY PROMINENT */}
                      <button
                        id="btn-open-add-vessel"
                        onClick={() => setShowAddVesselForm(!showAddVesselForm)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-lg text-xs font-black shadow-md flex items-center gap-2 transition-all transform hover:scale-[1.03] active:scale-[0.98] cursor-pointer ring-2 ring-blue-400/30"
                        title={tt("Cadastrar novo navio no sistema", "在系统中登记新靠泊船舶", "Add new vessel to schedule")}
                      >
                        {showAddVesselForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        <span className="tracking-wide">{showAddVesselForm ? tt("Fechar Formulário", "收起表单", "Close Form") : tt("+ Adicionar Navio", "+ 添加新船舶", "+ Add Vessel")}</span>
                      </button>
                    </div>
                  </div>

                  {/* FORMULÁRIO DE CADASTRO DE NOVO NAVIO (EXPANSÍVEL) */}
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
                              {tt("Cadastrar Novo Navio na Escala (Inbound Arrival)", "登记新增靠泊船舶 (Inbound Arrival)", "Register New Vessel (Inbound)")}
                            </h4>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                              {tt("Preencha os dados do navio e clique em 'Salvar Navio no Sistema'", "填写船名、ETA日期及集装箱箱量后点击保存", "Fill the vessel info and click 'Save Vessel to System'")}
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
                            {tt("Nome do Navio / 船名 *", "船名 (Vessel Name) *", "Vessel Name *")}
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
                            {tt("Data ETA / 预报到港日 *", "预报到港日 (ETA Date) *", "ETA Date *")}
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
                            {tt("Volume (CNTRs) / 箱量 *", "集装箱箱量 (CNTRs) *", "Containers (CNTRs) *")}
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
                            {tt("Armador / 船公司", "船公司 (Carrier)", "Carrier / Line")}
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
                            {tt("Status Operacional", "靠泊状态 (Status)", "Status")}
                          </label>
                          <select
                            value={newVesselStatus}
                            onChange={(e) => setNewVesselStatus(e.target.value)}
                            className="w-full p-2.5 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                          >
                            <option value="SCHEDULED">{tt("AGENDADO (Scheduled)", "计划中 (Scheduled)", "SCHEDULED")}</option>
                            <option value="BERTHED">{tt("ATRACADO (Berthed)", "已靠泊 (Berthed)", "BERTHED")}</option>
                            <option value="DISCHARGED">{tt("DESCARREGADO (Discharged)", "已卸船 (Discharged)", "DISCHARGED")}</option>
                            <option value="DELAYED">{tt("ATRASADO (Delayed)", "延误 (Delayed)", "DELAYED")}</option>
                          </select>
                        </div>
                      </div>

                      {/* Botões de Ação do Formulário */}
                      <div className="flex items-center justify-end gap-2.5 mt-4 pt-3.5 border-t border-blue-200 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => setShowAddVesselForm(false)}
                          className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                        >
                          {tt("Cancelar", "取消", "Cancel")}
                        </button>
                        <button
                          type="submit"
                          id="btn-submit-add-vessel"
                          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black shadow-md flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <Check className="w-4 h-4" />
                          <span>{tt("Salvar Navio no Sistema", "保存船舶到系统", "Save Vessel to System")}</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {/* CARDS DE KPI & RESUMO DOS NAVIOS */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-200/70'} flex flex-col justify-between shadow-xs`}>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                        {tt("Total de Navios", "到港船舶总数", "Total Vessels")}
                      </span>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-xl font-black font-mono text-blue-600 dark:text-blue-400">
                          {vessels.length}
                        </span>
                        <span className="text-[11px] text-gray-500 font-medium">{tt("navios programados", "艘计划中", "vessels scheduled")}</span>
                      </div>
                    </div>

                    <div className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-200/70'} flex flex-col justify-between shadow-xs`}>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                        {tt("Volume Total Previsto", "预计集装箱总量", "Total Expected Cargo")}
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
                        {tt("Próxima Chegada (Next ETA)", "下一艘抵港船", "Next ETA")}
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
                        {tt("Média por Navio", "单船平均箱量", "Avg per Vessel")}
                      </span>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-xl font-black font-mono text-purple-600 dark:text-purple-400">
                          {vessels.length > 0 ? Math.round(vessels.reduce((acc, curr) => acc + (Number(curr.cntrs) || 0), 0) / vessels.length).toLocaleString() : 0}
                        </span>
                        <span className="text-[11px] text-gray-500 font-medium">CNTRs/navio</span>
                      </div>
                    </div>
                  </div>

                  {/* SECTION: GRÁFICO DAS ÁREAS ALFANDEGADAS (BONDED AREAS BREAKDOWN) */}
                  {showBondedChartSlide2 && (
                    <div className="w-full">
                      <BondedAreasChart
                        theme={theme}
                        language={language}
                        yards={yards}
                        containers={containers}
                        vessels={vessels}
                      />
                    </div>
                  )}

                  {/* GRID PRINCIPAL: TABELA/LISTA DE NAVIOS + NOTAS OPERACIONAIS */}
                  <div className="grid grid-cols-12 gap-4">
                    
                    {/* LADO ESQUERDO: TABELA & LISTA DE NAVIOS COM EDIÇÃO INLINE E BOTÃO ADICIONAR */}
                    <div className="col-span-12 lg:col-span-6 flex flex-col gap-4">
                      <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-200/80 shadow-sm'} flex flex-col justify-between`}>
                        
                        {/* Subheader da Tabela */}
                        <div className="flex items-center justify-between border-b pb-2 mb-3 border-gray-100 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <Ship className="w-4 h-4 text-blue-500" />
                            <h4 className="font-extrabold text-xs text-blue-800 dark:text-blue-300 uppercase tracking-tight">
                              {vesselViewMode === 'monthly' ? tt("Cronograma Agrupado por Mês", "按月划分靠泊计划", "Monthly Berthing Schedule") : tt("Escala Completa Cronológica", "按到港先后平铺列表", "Chronological Vessel Queue")}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Botão rápido adicionar navio no cabeçalho da tabela */}
                            <button
                              type="button"
                              onClick={() => setShowAddVesselForm(true)}
                              className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/80 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded cursor-pointer transition-all flex items-center gap-1 border border-emerald-200/60 dark:border-emerald-800/60 shadow-2xs"
                              title={tt("Adicionar novo navio", "添加新船舶", "Add new vessel")}
                            >
                              <Plus className="w-3 h-3" />
                              <span>{tt("Novo Navio", "新增船舶", "New Vessel")}</span>
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
                                        <span>{tt("Recolher Todos", "全部折叠", "Collapse All")}</span>
                                      </>
                                    ) : (
                                      <>
                                        <Maximize2 className="w-2.5 h-2.5" />
                                        <span>{tt("Expandir Todos", "全部展开", "Expand All")}</span>
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
                                    ? tt("Nenhum navio encontrado para a busca atual.", "未找到符合搜索条件的船舶记录。", "No vessels match your search query.")
                                    : tt("Nenhum navio cadastrado.", "暂无船舶记录。", "No vessels registered.")}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setShowAddVesselForm(true)}
                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>{tt("Adicionar Primeiro Navio", "添加第一艘船舶", "Add First Vessel")}</span>
                                </button>
                              </div>
                            );
                          }

                          // VISÃO MENSAL AGRUPADA
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
                                            {group.vessels.length} {tt("navios", "艘", "vessels")}
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
                                                <th className="py-2 px-2">{tt("Navio / 船名", "船名", "Vessel")}</th>
                                                <th className="py-2 px-2 text-center">{tt("Data ETA", "预报到港日", "ETA Date")}</th>
                                                <th className="py-2 px-2 text-center">{tt("Armador / Status", "船司/状态", "Carrier / Status")}</th>
                                                <th className="py-2 px-2 text-right">{tt("Volume", "箱量", "Containers")}</th>
                                                <th className="py-2 px-2 text-center w-28">{tt("Ações", "操作", "Actions")}</th>
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
                                                            title={tt("Salvar alterações", "保存修改", "Save changes")}
                                                          >
                                                            <Check className="w-3.5 h-3.5" />
                                                          </button>
                                                          <button
                                                            type="button"
                                                            onClick={() => setEditingVesselId(null)}
                                                            className="p-1 bg-gray-300 hover:bg-gray-400 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded cursor-pointer transition-colors"
                                                            title={tt("Cancelar", "取消", "Cancel")}
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
                                                            title={tt("Editar navio", "编辑船舶", "Edit vessel")}
                                                          >
                                                            <Edit3 className="w-3.5 h-3.5" />
                                                          </button>
                                                          <button
                                                            type="button"
                                                            onClick={() => shiftVessel(vessel.id, 'up')}
                                                            className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded cursor-pointer transition-colors"
                                                            title={tt("Mover para cima", "上移优先级", "Move up")}
                                                          >
                                                            <ArrowUp className="w-3.5 h-3.5" />
                                                          </button>
                                                          <button
                                                            type="button"
                                                            onClick={() => shiftVessel(vessel.id, 'down')}
                                                            className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded cursor-pointer transition-colors"
                                                            title={tt("Mover para baixo", "下移优先级", "Move down")}
                                                          >
                                                            <ArrowDown className="w-3.5 h-3.5" />
                                                          </button>
                                                          <button
                                                            type="button"
                                                            onClick={() => {
                                                              if (window.confirm(tt(`Remover o navio ${vessel.name} da escala?`, `确定要将船舶 ${vessel.name} 从靠泊计划中删除吗？`, `Remove vessel ${vessel.name} from schedule?`))) {
                                                                deleteVessel(vessel.id);
                                                              }
                                                            }}
                                                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded cursor-pointer transition-colors"
                                                            title={tt("Excluir navio", "删除船舶", "Delete vessel")}
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

                          // VISÃO EM LISTA CRONOLÓGICA CONTÍNUA
                          return (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="border-b border-gray-200 dark:border-slate-800 text-gray-400 font-extrabold uppercase text-[9.5px] tracking-wider">
                                    <th className="py-2 px-2.5">#</th>
                                    <th className="py-2 px-2.5">{tt("Navio / 船名", "船名", "Vessel")}</th>
                                    <th className="py-2 px-2.5 text-center">{tt("Data ETA", "预报到港日", "ETA Date")}</th>
                                    <th className="py-2 px-2.5 text-center">{tt("Armador / Status", "船司/状态", "Carrier / Status")}</th>
                                    <th className="py-2 px-2.5 text-right">{tt("Volume", "箱量", "Containers")}</th>
                                    <th className="py-2 px-2.5 text-center w-28">{tt("Ações", "操作", "Actions")}</th>
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
                                                title={tt("Salvar alterações", "保存修改", "Save changes")}
                                              >
                                                <Check className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setEditingVesselId(null)}
                                                className="p-1 bg-gray-300 hover:bg-gray-400 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded cursor-pointer transition-colors"
                                                title={tt("Cancelar", "取消", "Cancel")}
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
                                                title={tt("Editar navio", "编辑船舶", "Edit vessel")}
                                              >
                                                <Edit3 className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => shiftVessel(vessel.id, 'up')}
                                                className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded cursor-pointer transition-colors"
                                                title={tt("Mover para cima", "上移优先级", "Move up")}
                                              >
                                                <ArrowUp className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => shiftVessel(vessel.id, 'down')}
                                                className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded cursor-pointer transition-colors"
                                                title={tt("Mover para baixo", "下移优先级", "Move down")}
                                              >
                                                <ArrowDown className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  if (window.confirm(tt(`Remover o navio ${vessel.name} da escala?`, `确定要将船舶 ${vessel.name} 从靠泊计划中删除吗？`, `Remove vessel ${vessel.name} from schedule?`))) {
                                                    deleteVessel(vessel.id);
                                                  }
                                                }}
                                                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded cursor-pointer transition-colors"
                                                title={tt("Excluir navio", "删除船舶", "Delete vessel")}
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

                        {/* Rodapé da tabela com soma de contêineres */}
                        <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
                          <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                            {tt("Soma Total de Contêineres / 箱量总计", "预计抵港集装箱总计", "Total Scheduled Containers")}:
                          </span>
                          <span className="font-mono font-black text-sm text-blue-600 dark:text-blue-400">
                            {vessels.reduce((acc, curr) => acc + (Number(curr.cntrs) || 0), 0).toLocaleString()} <span className="text-xs font-normal text-gray-400">CNTRs</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* LADO DIREITO: 2 ÁREAS DE NOTAS OPERACIONAIS */}
                    <div className="col-span-12 lg:col-span-6 flex flex-col gap-4">
                      
                      {/* NOTA 1: JANELAS OPERACIONAIS DE ATRACAÇÃO */}
                      <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-200/80 shadow-sm'} flex flex-col justify-between min-h-[220px]`}>
                        <div className="flex items-center justify-between border-b pb-2 mb-2 border-gray-100 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <h4 className="font-bold text-xs text-blue-850 dark:text-blue-200 uppercase tracking-wider block">
                              {language === 'bilingual' ? '1. JANELAS OPERACIONAIS DE ATRACAÇÃO / 船期与靠泊说明' : language === 'zh' ? '1. 船期与靠泊说明' : '1. JANELAS OPERACIONAIS DE ATRACAÇÃO'}
                            </h4>
                          </div>
                          <span className="text-[10px] bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold px-2 py-0.5 rounded">
                            {isEditMode ? tt("Modo Edição Ativo", "编辑模式", "Edit Mode") : tt("Notas Ativas", "实时备注", "Active Notes")}
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
                              placeholder="Digite as observações de escala, janelas de atracação e detalhes dos navios... / 在此编写靠泊窗口与船期备忘要点..."
                              className="w-full flex-1 min-h-[140px] p-2.5 text-xs font-semibold border border-gray-200 dark:border-gray-700 dark:bg-slate-800 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none resize-none text-slate-800 dark:text-slate-100 placeholder:text-gray-400 font-sans"
                            />
                          ) : (
                            <div className="text-xs leading-relaxed font-bold text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans p-3 bg-slate-50/60 dark:bg-slate-900/60 rounded-lg border border-slate-100 dark:border-none flex-1">
                              {vesselNote1 || "Escala regular de navios ativa - Monitoramento detalhado das janelas de atracação. / 常规活跃船舶靠泊计划 - 详细监控和管理泊位窗口。"}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* NOTA 2: LOGÍSTICA DE LIBERAÇÃO E PRIORIDADE BYD */}
                      <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-200/80 shadow-sm'} flex flex-col justify-between min-h-[220px]`}>
                        <div className="flex items-center justify-between border-b pb-2 mb-2 border-gray-100 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-450" />
                            <h4 className="font-bold text-xs text-emerald-800 dark:text-emerald-200 uppercase tracking-wider block">
                              {language === 'bilingual' ? '2. LOGÍSTICA DE LIBERAÇÃO E PRIORIDADE BYD / 口岸提运与出箱优先级' : language === 'zh' ? '2. 口岸提运与出箱优先级' : '2. LOGÍSTICA DE LIBERAÇÃO E PRIORIDADE BYD'}
                            </h4>
                          </div>
                          <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded">
                            {isEditMode ? tt("Modo Edição Ativo", "编辑模式", "Edit Mode") : tt("Prioridades", "优先级", "Priorities")}
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
                              placeholder="Digite os destaques de escoamento e priorizações... / 在此编写集装箱提运和口岸放行备忘要点..."
                              className="w-full flex-1 min-h-[140px] p-2.5 text-xs font-semibold border border-gray-200 dark:border-gray-700 dark:bg-slate-800 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none resize-none text-slate-800 dark:text-slate-100 placeholder:text-gray-400 font-sans"
                            />
                          ) : (
                            <div className="text-xs leading-relaxed font-bold text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans p-3 bg-slate-50/60 dark:bg-slate-900/60 rounded-lg border border-slate-100 dark:border-none flex-1">
                              {vesselNote2 || "Destaques operacionais dos navios (Ex: Prioridades de descarga BYD). / 船舶运营重点亮点 (例如: 比亚迪重箱卸船优先顺序)。"}
                            </div>
                          )}
                        </div>
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
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className="font-extrabold text-[12px] text-gray-800 dark:text-gray-100 uppercase tracking-tight flex items-center gap-1.5">
                                  {language === 'bilingual' ? 'Simulação de Escoamento / 仿真模拟器' : 'Cargo Drain Simulation'}
                                </h3>
                                <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                  <button
                                    onClick={() => setChartTab('drain')}
                                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${chartTab === 'drain' ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                                  >
                                    {language === 'zh' ? '流速模拟' : 'Drain'}
                                  </button>
                                  <button
                                    onClick={() => setChartTab('space')}
                                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${chartTab === 'space' ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                                  >
                                    {language === 'zh' ? '空间占用' : 'Space'}
                                  </button>
                                </div>
                              </div>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-sans">
                                {chartTab === 'drain' 
                                  ? (language === 'bilingual' ? 'Ajuste os cenários e capacidades para recalcular o gráfico de backlog / 调节不同发运场景与每日交付能力，实时重算积压出清曲线' : 'Adjust scenarios and rates to dynamically recalculate the backlog burn-down.')
                                  : (language === 'bilingual' ? 'Análise visual de capacidade vs ocupação nos terminais / 各堆场/仓库容量及当前占用率的可视化分析' : 'Visual analysis of capacity vs occupancy across yards.')}
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
                        ) : (
                          <div className="flex-1 flex flex-col mt-2">
                            <div className={`p-5 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-100 shadow-sm'} flex flex-col flex-1 min-h-[400px]`}>
                              <h4 className="text-[12px] font-black text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-700/50 pb-2">
                                <Package className="w-5 h-5 text-indigo-500" />
                                {language === 'bilingual' ? 'Distribuição de Ocupação nos Pátios e CDs / 各堆场/仓库容量及当前占用率' : 'Yard & Warehouse Occupancy Distribution'}
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
                          {language === 'bilingual' ? 'HUB DE BUFFER INTEGRADO BYD / 比亚迪智能缓冲中转枢纽' : language === 'zh' ? '比亚迪智能缓冲中转枢纽' : 'HUB DE BUFFER INTEGRADO BYD'}
                        </h3>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                          {language === 'zh' ? '实时监控、空余容量管理与 2D 堆位可视化地图' : 'Mapeamento de slots, otimização de retirada rápida e indicador de capacidade'}
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
                          {language === 'zh' ? '地图视图' : 'Cards'}
                        </button>
                        <button
                          onClick={() => setBufferViewMode('list')}
                          className={`px-3 py-1.5 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all ${bufferViewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                        >
                          <List className="w-3.5 h-3.5" />
                          {language === 'zh' ? '列表视图' : 'List'}
                        </button>
                      </div>

                      {bufferViewMode === 'list' && (
                        <>
                          <input
                            type="text"
                            placeholder={tt("Buscar contêiner...", "搜索集装箱...", "Search container...")}
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
                  {bufferViewMode === 'map' ? (
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

                ) : (
                  <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg min-h-[400px]">
                    <table className="w-full text-xs text-left">
                      <thead className="text-gray-500 uppercase font-bold border-b dark:border-slate-700">
                        <tr>
                          <th className="p-2">Area</th>
                          <th className="p-2">Slot</th>
                          <th className="p-2">Contêiner</th>
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
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">CNTRs/Dia</span>
                          </div>
                        </div>

                        <div className={`p-3.5 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-150 shadow-xs'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">{language === 'zh' ? '空余可用仓位数' : 'VAGAS DIÁRIAS DISPONÍVEIS'}</span>
                            <span className="text-emerald-500 font-bold text-[10px] px-1 py-0.1 bg-emerald-50 dark:bg-emerald-950/20 rounded">Slots Livres</span>
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">{totalRemainingSlots}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">CNTRs Slots</span>
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
                    
                    <div className={`col-span-7 p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-150 shadow-sm'} flex flex-col justify-between`}>
                      <div className="space-y-3 flex-1">
                        {/* EXECUTIVE SUMMARY WIDGETS */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
                          <div className={`p-3 rounded-lg border ${theme === 'dark' ? 'bg-[#1e293b]/50 border-slate-700/50' : 'bg-white border-slate-100'} shadow-sm flex flex-col justify-between`}>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold mb-1 block">
                              {language === 'zh' ? '日常平均总吞吐量' : language === 'pt' ? 'Média Diária Total' : 'Total Daily Return Average'}
                            </span>
                            <span className="text-xl font-black text-slate-800 dark:text-white">{depots.reduce((sum, d) => sum + d.avgVolume, 0).toLocaleString()} <span className="text-xs font-bold text-slate-400">{language === 'zh' ? 'CNTRs/天' : language === 'pt' ? 'CNTRs/Dia' : 'CNTRs/Day'}</span></span>
                          </div>
                          <div className={`p-3 rounded-lg border ${theme === 'dark' ? 'bg-[#1e293b]/50 border-slate-700/50' : 'bg-white border-slate-100'} shadow-sm flex flex-col justify-between`}>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold mb-1 block">
                              {language === 'zh' ? '25天预估总吞吐量' : language === 'pt' ? 'Estimativa Total (25 Dias)' : 'Total 25-Day Estimated Return'}
                            </span>
                            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{(depots.reduce((sum, d) => sum + d.avgVolume, 0) * 25).toLocaleString()} <span className="text-xs font-bold text-emerald-600/50 dark:text-emerald-400/50">CNTRs</span></span>
                          </div>
                          <div className={`p-3 rounded-lg border ${theme === 'dark' ? 'bg-[#1e293b]/50 border-slate-700/50' : 'bg-white border-slate-100'} shadow-sm flex flex-col justify-between`}>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold mb-1 block">
                              {language === 'zh' ? '25天协议总额度上限' : language === 'pt' ? 'Limite Total Acordado (25 Dias)' : 'Total 25-Day Max Agreed Limit'}
                            </span>
                            <span className="text-xl font-black text-blue-600 dark:text-blue-400">{(depots.reduce((sum, d) => sum + d.maxCapacity, 0) * 25).toLocaleString()} <span className="text-xs font-bold text-blue-600/50 dark:text-blue-400/50">CNTRs</span></span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center border-b pb-2 border-gray-100 dark:border-slate-800">
                          <div className="flex items-center gap-1.5">
                            <Sliders className="w-4 h-4 text-slate-500" />
                            <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                              {language === 'zh' ? '空箱堆场吞吐能力与25天预测仪表盘' : language === 'pt' ? 'Capacidade de Retorno de Vazios e Previsão (25 Dias)' : 'EMPTY DEPOT RETURN CAPACITY & 25-DAY FORECASTING DASHBOARD'}
                            </h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-gray-400 font-mono font-bold mr-2">{language === 'zh' ? '100% 自动计算引擎' : language === 'pt' ? '100% CÁLCULO AUTOMÁTICO' : '100% FORMULA ENGINE'}</span>
                            <button
                              onClick={() => {
                                const newId = `depot_${Date.now()}`;
                                const newName = `NEW DEPOT ${depots.length + 1}`;
                                setDepots([...depots, { id: newId, name: newName, avgVolume: 0, maxCapacity: 0, operatingDays: 'Mon - Fri', operatingHours: '08:00 - 17:00' }]);
                                setDepotMatrix(prev => ({...prev, [newName]: { 'MSC': 'Authorized', 'Maersk': 'Authorized', 'CMA CGM': 'Authorized', 'Hapag-Lloyd': 'Authorized', 'ONE': 'Authorized', 'COSCO': 'Authorized', 'Evergreen': 'Authorized' }}));
                              }}
                              className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded transition-colors flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" /> {language === 'zh' ? '新增堆场' : language === 'pt' ? 'Novo Depósito' : 'Add New Depot'}
                            </button>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-800/60 text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-black border-b border-gray-200 dark:border-slate-800">
                                <th className="p-2 pl-2.5">{language === 'zh' ? '堆存点名称' : language === 'pt' ? 'Nome do Depósito' : 'Depot Name'}</th>
                                <th className="p-2 text-center">{language === 'zh' ? '日常平均吞吐量 (CNTRs)' : language === 'pt' ? 'Média Diária (CNTRs)' : 'Daily Avg Returns (CNTRs)'}</th>
                                <th className="p-2 text-center">{language === 'zh' ? '协议最大日限额 (CNTRs)' : language === 'pt' ? 'Limite Diário Acordado (CNTRs)' : 'Max Daily Agreed Limit (CNTRs)'}</th>
                                <th className="p-2 text-center">{language === 'zh' ? '25天预估吞吐量' : language === 'pt' ? 'Estimativa Retorno (25d)' : '25-Day Return Estimate'}</th>
                                <th className="p-2 text-center">{language === 'zh' ? '25天潜在最大量' : language === 'pt' ? 'Máximo Potencial (25d)' : '25-Day Max Potential Return'}</th>
                                <th className="p-2 text-center">{language === 'zh' ? '运营日' : language === 'pt' ? 'Dias de Operação' : 'Operating Days'}</th>
                                <th className="p-2 text-center">{language === 'zh' ? '闸口营业时间' : language === 'pt' ? 'Horário do Gate' : 'Gate Operating Hours'}</th>
                                <th className="p-2 text-center">{language === 'zh' ? '运营预警状态' : language === 'pt' ? 'Alerta Operacional' : 'Operational Alert Status'}</th>
                                <th className="p-2 text-center w-8"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-bold text-slate-850 dark:text-slate-200">
                              {depots.map((depot, idx) => {
                                const utilPercent = depot.maxCapacity > 0 ? Math.round((depot.avgVolume / depot.maxCapacity) * 100) : 0;
                                const remaining = depot.maxCapacity - depot.avgVolume;
                                const estimate25 = depot.avgVolume * 25;
                                const max25 = depot.maxCapacity * 25;
                                
                                let alertConfig = { bg: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-450 border-emerald-200 dark:border-emerald-900/30', label: language === 'zh' ? '正常 - 额度充足' : language === 'pt' ? 'NORMAL - Cota Disponível' : 'NORMAL - Quota Available' };
                                if (depot.avgVolume > depot.maxCapacity) {
                                  alertConfig = { bg: 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-450 border-rose-300 dark:border-rose-900/50', label: language === 'zh' ? '超额 - 需重新协商限制' : language === 'pt' ? 'COTA EXCEDIDA - Renegociar' : 'OVER QUOTA - Renegotiate Limit' };
                                } else if (utilPercent > 95) {
                                  alertConfig = { bg: 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-450 border-red-200 dark:border-red-900/30', label: language === 'zh' ? '瓶颈 - 日常额度已满/超出' : language === 'pt' ? 'GARGALO - Cota Máxima Atingida' : 'BOTTLENECK - Daily Quota Maxed/Exceeded' };
                                } else if (utilPercent >= 75) {
                                  alertConfig = { bg: 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-450 border-amber-200 dark:border-amber-900/30', label: language === 'zh' ? '注意 - 接近限制' : language === 'pt' ? 'ATENÇÃO - Limite Próximo' : 'ATTENTION - Approaching Limit' };
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
                                          title={`${armador} @ ${depotName}: Clique para alterar status / 点击切换状态`}
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
                        <span>{language === 'zh' ? '💡 契约限制：VBR及TEON 23 默认锁定大多数直接放行，仅接受特定预约。' : '💡 AUTH: Liberado | LOCK: Bloqueado | CONT: Requer Contrato.'}</span>
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
                          {language === 'bilingual' ? 'BONDED WAREHOUSE SPACE & ALLOCATION PLANNER / 仓储空间与流向规划' : 'BONDED WAREHOUSE SPACE & ALLOCATION PLANNER'}
                        </h3>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                          {language === 'zh' ? '动态容量规划，成本优化及实时库存数据同步' : 'Planejamento dinâmico de capacidade, otimização de custos e sincronização de estoque em tempo real.'}
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
                        <Trash2 className="w-3.5 h-3.5" /> {language === 'zh' ? '清空全部数据' : 'Limpar Tudo'}
                      </button>
                    </div>
                  </div>

                  {/* SECTION 1: SCHEDULING FORM FROM YARDS */}
                  <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-indigo-500" />
                        <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                          {language === 'zh' ? '从仓库/BL快速排程交付' : 'Agendar / Vincular Contêiner do Pátio'}
                        </h4>
                      </div>
                      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setYdScheduleMode('container')}
                          className={`px-2.5 py-1 text-[10px] font-extrabold rounded-md transition-all ${ydScheduleMode === 'container' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                        >
                          {language === 'zh' ? '按集装箱' : 'Por Contêiner'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setYdScheduleMode('bl')}
                          className={`px-2.5 py-1 text-[10px] font-extrabold rounded-md transition-all ${ydScheduleMode === 'bl' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                        >
                          {language === 'zh' ? '按 BL 提单' : 'Por BL'}
                        </button>
                      </div>
                    </div>

                    <form onSubmit={handleSaveYdContainerLogistics} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      {ydScheduleMode === 'container' ? (
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            {language === 'zh' ? '选择集装箱' : 'Contêiner do Pátio'}
                          </label>
                          <select
                            value={selectedYdContainerId}
                            onChange={(e) => handleYdContainerChange(e.target.value)}
                            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-mono font-bold"
                          >
                            <option value="">-- {language === 'zh' ? '选择集装箱' : 'Selecione um contêiner'} --</option>
                            {containers.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.id} ({yards[c.yardId]?.name || c.yardId || 'Pátio'} - {c.bl || 'Sem BL'})
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            {language === 'zh' ? '选择提单 (BL)' : 'BL (Conhecimento)'}
                          </label>
                          <select
                            value={selectedYdBl}
                            onChange={(e) => handleYdBlChange(e.target.value)}
                            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-mono font-bold"
                          >
                            <option value="">-- {language === 'zh' ? '选择提单' : 'Selecione um BL'} --</option>
                            {Array.from(new Set(containers.map(c => c.bl).filter(Boolean))).map(bl => (
                              <option key={bl} value={bl}>
                                {bl} ({containers.filter(c => c.bl === bl).length} CNTRs)
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          {language === 'zh' ? '船舶 / Navio' : 'Navio (Vessel)'}
                        </label>
                        <input
                          type="text"
                          value={ydVessel}
                          onChange={(e) => setYdVessel(e.target.value)}
                          placeholder="Ex: MSC AGADIR"
                          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          {language === 'zh' ? '仓库 / 堆场' : 'Porto Seco / Pátio'}
                        </label>
                        <input
                          type="text"
                          value={ydWarehouse}
                          onChange={(e) => setYdWarehouse(e.target.value)}
                          placeholder="Ex: TECON / LOGIC"
                          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          {language === 'zh' ? '排程交付日期' : 'Data Agendada (Entrega)'}
                        </label>
                        <input
                          type="date"
                          value={ydDeliveryDate}
                          onChange={(e) => setYdDeliveryDate(e.target.value)}
                          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-mono"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          {language === 'zh' ? '承运商 / Transportadora' : 'Transportadora'}
                        </label>
                        <select
                          value={ydCarrier}
                          onChange={(e) => setYdCarrier(e.target.value)}
                          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-bold"
                        >
                          <option value="JSL">JSL</option>
                          <option value="JULIO SIMOES">JULIO SIMOES</option>
                          <option value="TRANS REZENDE">TRANS REZENDE</option>
                          <option value="LOGISTIC BRASIL">LOGISTIC BRASIL</option>
                          <option value="OUTROS">OUTROS</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          {language === 'zh' ? '作业模式' : 'Modelo de Operação'}
                        </label>
                        <select
                          value={ydDeliveryModel}
                          onChange={(e) => setYdDeliveryModel(e.target.value)}
                          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-bold"
                        >
                          <option value="DESCARGA">DESCARGA (Descarga Direta)</option>
                          <option value="SWAP">SWAP (Troca de Carreta)</option>
                          <option value="PUT DOWN">{tt("PUT DOWN (Desova e Devolução)", "PUT DOWN (拆箱并还空)", "PUT DOWN (Unload & Return)")}</option>
                          <option value="RETURN EMPTY">{tt("RETURN EMPTY (Devolução Vazio)", "RETURN EMPTY (直接还空)", "RETURN EMPTY (Return Empty)")}</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          {language === 'zh' ? '厂区交货地点' : 'Local de Entrega na Planta'}
                        </label>
                        <select
                          value={ydOnSitePlaceOfDelivery}
                          onChange={(e) => setYdOnSitePlaceOfDelivery(e.target.value)}
                          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-bold"
                        >
                          <option value="WAREHOUSE 25">WAREHOUSE 25</option>
                          <option value="CD PLANTA">CD PLANTA (Central)</option>
                          <option value="LINHA 1">LINHA DE MONTAGEM 1</option>
                          <option value="LINHA 2">LINHA DE MONTAGEM 2</option>
                          <option value="BUFFER CENTRAL">BUFFER CENTRAL BYD</option>
                        </select>
                      </div>

                      <div className="flex items-end">
                        <button
                          type="submit"
                          className="w-full p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-lg shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 uppercase tracking-wider text-xs"
                        >
                          <Check className="w-4 h-4" />
                          {language === 'zh' ? '保存排程' : 'Confirmar e Agendar'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* SECTION 2: PAGINATED INTERACTIVE LOGISTICS TABLE */}
                  <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-100 shadow-sm'} flex flex-col gap-3`}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                      <div className="flex items-center gap-2">
                        <List className="w-4 h-4 text-red-500" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                          {language === 'zh' ? '物流记录总览' : 'Tabela Geral de Registros Logísticos'}
                        </h4>
                        <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">
                          {logisticsEntries.length} {language === 'zh' ? '条记录' : 'itens'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
                        <div className="relative flex-1 md:w-60">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder={language === 'zh' ? '搜索集装箱、BL、Navio...' : 'Buscar CNTR, BL, Navio...'}
                            value={logisticsSearch}
                            onChange={(e) => setLogisticsPageSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                          />
                        </div>

                        <select
                          value={logisticsFilterWarehouse}
                          onChange={(e) => setLogisticsFilterWarehouse(e.target.value)}
                          className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                        >
                          <option value="ALL">-- {language === 'zh' ? '全部仓库' : 'Todos os Pátios'} --</option>
                          {Array.from(new Set(logisticsEntries.map(e => e.bondedWarehouse).filter(Boolean))).map(w => (
                            <option key={w} value={w}>{w}</option>
                          ))}
                        </select>

                        <select
                          value={logisticsFilterComex}
                          onChange={(e) => setLogisticsFilterComex(e.target.value)}
                          className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                        >
                          <option value="ALL">-- {language === 'zh' ? '全部状态' : 'Status COMEX'} --</option>
                          <option value="PENDENTE">PENDENTE</option>
                          <option value="CARGO DELIVERED">CARGO DELIVERED</option>
                          <option value="CARGO CLEARED">CARGO CLEARED</option>
                        </select>
                      </div>
                    </div>

                    {/* TABLE */}
                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-700/80 rounded-lg">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                            <th className="p-2.5">Container / Equipamento</th>
                            <th className="p-2.5">BL</th>
                            <th className="p-2.5">Navio</th>
                            <th className="p-2.5">Porto Seco</th>
                            <th className="p-2.5">Transportadora</th>
                            <th className="p-2.5">Local Entrega</th>
                            <th className="p-2.5">Data Agendada</th>
                            <th className="p-2.5">Status Entrega</th>
                            <th className="p-2.5">COMEX</th>
                            <th className="p-2.5 text-right">{tt("Ações", "操作", "Actions")}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {(() => {
                            const filtered = logisticsEntries.filter(entry => {
                              const s = logisticsSearch.toLowerCase();
                              const matchSearch = !s || 
                                (entry.cntrsOriginal && entry.cntrsOriginal.toLowerCase().includes(s)) ||
                                (entry.bl && entry.bl.toLowerCase().includes(s)) ||
                                (entry.arrivalVessel && entry.arrivalVessel.toLowerCase().includes(s)) ||
                                (entry.carrier && entry.carrier.toLowerCase().includes(s));
                              const matchWh = logisticsFilterWarehouse === 'ALL' || entry.bondedWarehouse === logisticsFilterWarehouse;
                              const matchComex = logisticsFilterComex === 'ALL' || entry.statusComex === logisticsFilterComex;
                              return matchSearch && matchWh && matchComex;
                            });

                            const pageSize = 12;
                            const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
                            const currPage = Math.min(logisticsPage, totalPages);
                            const paginated = filtered.slice((currPage - 1) * pageSize, currPage * pageSize);

                            if (paginated.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={10} className="p-8 text-center text-gray-400">
                                    <Package className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                                    <p className="font-bold">{language === 'zh' ? '暂无匹配的物流数据' : 'Nenhum registro de logística encontrado.'}</p>
                                    <p className="text-[11px] mt-1">{language === 'zh' ? '点击上方“Google Sheets 同步”或从仓库快速排程交付。' : 'Importe via Google Sheets ou faça o agendamento através do formulário acima.'}</p>
                                  </td>
                                </tr>
                              );
                            }

                            return paginated.map(entry => (
                              <tr key={entry.id || entry.cntrsOriginal} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                                <td className="p-2.5 font-mono font-black text-indigo-600 dark:text-indigo-400">
                                  {entry.cntrsOriginal}
                                </td>
                                <td className="p-2.5 font-mono font-bold text-slate-700 dark:text-slate-300">
                                  {entry.bl || '-'}
                                </td>
                                <td className="p-2.5 font-medium text-slate-600 dark:text-slate-400">
                                  {entry.arrivalVessel || '-'}
                                </td>
                                <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300">
                                  {entry.bondedWarehouse || '-'}
                                </td>
                                <td className="p-2.5 text-slate-600 dark:text-slate-400">
                                  {entry.carrier || '-'}
                                </td>
                                <td className="p-2.5 text-slate-600 dark:text-slate-400">
                                  <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] font-bold">
                                    {entry.onSitePlaceOfDelivery || 'PLANTA'}
                                  </span>
                                </td>
                                <td className="p-2.5 font-mono text-slate-700 dark:text-slate-300">
                                  {String(entry.estimatedDeliveryDate || '-').slice(0, 10)}
                                </td>
                                <td className="p-2.5">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                    entry.status === 'ENTREGUE'
                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                      : entry.status === 'A CAMINHO'
                                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                      : entry.status === 'ADIADO'
                                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                  }`}>
                                    {entry.status || 'PENDENTE'}
                                  </span>
                                </td>
                                <td className="p-2.5">
                                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                    {entry.statusComex || 'PENDENTE'}
                                  </span>
                                </td>
                                <td className="p-2.5 text-right">
                                  <button
                                    onClick={() => {
                                      if (entry.id) {
                                        requestConfirmation(
                                          language === 'zh' ? '删除物流记录' : 'Excluir Registro',
                                          language === 'zh' ? `确定要删除集装箱 ${entry.cntrsOriginal} 的物流记录吗？` : `Deseja realmente remover o registro do container ${entry.cntrsOriginal}?`,
                                          async () => {
                                            await deleteDoc(doc(db, 'logisticsData', entry.id!));
                                          }
                                        );
                                      }
                                    }}
                                    className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-500 rounded transition-colors cursor-pointer"
                                    title="Excluir Registro"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>

                    {/* PAGINATION CONTROLS */}
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[10px] text-gray-400">
                        {language === 'zh' ? '第 ' + logisticsPage + ' 页' : 'Página ' + logisticsPage}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          disabled={logisticsPage <= 1}
                          onClick={() => setLogisticsPage(p => Math.max(1, p - 1))}
                          className="px-3 py-1 bg-slate-100 dark:bg-slate-800 disabled:opacity-40 text-slate-700 dark:text-slate-300 rounded font-bold text-xs cursor-pointer"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setLogisticsPage(p => p + 1)}
                          className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-bold text-xs cursor-pointer"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : currentSlide === 8 ? (
                /* SLIDE 8: PAINEL DE ENTREGAS (DELIVERY DASHBOARD) */
                <CargoReadyVsDeliveredDashboard
                  theme={theme}
                  language={language}
                  dbStatus={dbStatus}
                  containers={containers}
                  yards={yards}
                  vessels={vessels}
                  depots={depots}
                />
              ) : currentSlide === 9 ? (
                /* SLIDE 9: CALENDÁRIO DE ENTREGAS */
                <div id="slide-delivery-calendar" className={`flex flex-col gap-4 ${widescreenMode ? 'h-[calc(100%-85px)] overflow-y-auto' : 'min-h-[660px]'}`}>
                  {/* TOP HEADER */}
                  <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-100 shadow-sm'} flex flex-col md:flex-row justify-between items-start md:items-center gap-3`}>
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-100 dark:bg-indigo-950 p-2.5 rounded-xl text-indigo-600 dark:text-indigo-400">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm flex items-center gap-2 text-indigo-600 dark:text-indigo-400 tracking-tight">
                          {language === 'bilingual' ? 'DELIVERY CALENDAR / 交付排程日历' : language === 'zh' ? '交付排程日历' : 'CALENDÁRIO DE ENTREGAS'}
                        </h3>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                          {language === 'zh' ? '按月份与日期实时查看所有集装箱的派送排程、承运商分配与交付进度' : 'Visualização cronológica por data e mês das entregas programadas para a fábrica.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="month"
                        value={operationalMonth}
                        onChange={(e) => setOperationalMonth(e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono font-bold"
                      />
                      <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
                        <button
                          onClick={() => setCalendarViewMode('monthly')}
                          className={`px-2.5 py-1 text-[10px] font-extrabold rounded-md transition-all cursor-pointer ${calendarViewMode === 'monthly' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-500'}`}
                        >
                          {language === 'zh' ? '月历视图' : 'Mês'}
                        </button>
                        <button
                          onClick={() => setCalendarViewMode('shipment_info')}
                          className={`px-2.5 py-1 text-[10px] font-extrabold rounded-md transition-all cursor-pointer ${calendarViewMode === 'shipment_info' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-500'}`}
                        >
                          {language === 'zh' ? '派送批次' : 'Lotes'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* CALENDAR TILES / SHIPMENT CARDS */}
                  <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-100 shadow-sm'}`}>
                    {calendarViewMode === 'monthly' ? (
                      <div className="grid grid-cols-7 gap-2">
                        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => (
                          <div key={d} className="text-center font-black text-[10px] uppercase tracking-wider text-slate-400 py-1">
                            {d}
                          </div>
                        ))}
                        {Array.from({ length: 31 }, (_, i) => {
                          const dayNum = i + 1;
                          const dayStr = `${operationalMonth}-${String(dayNum).padStart(2, '0')}`;
                          const scheduledOnDay = logisticsEntries.filter(e => String(e.estimatedDeliveryDate).startsWith(dayStr));
                          const count = scheduledOnDay.length;
                          const isSelected = selectedDayCalendar === dayStr;

                          return (
                            <div
                              key={dayNum}
                              onClick={() => setSelectedDayCalendar(dayStr)}
                              className={`min-h-[85px] p-2 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                                isSelected
                                  ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-400'
                                  : count > 0
                                  ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 hover:border-indigo-300'
                                  : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 opacity-60'
                              }`}
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-mono text-xs font-black text-slate-700 dark:text-slate-300">{dayNum}</span>
                                {count > 0 && (
                                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                )}
                              </div>
                              {count > 0 ? (
                                <div className="mt-1">
                                  <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950 px-1.5 py-0.5 rounded block text-center truncate">
                                    {count} CNTRs
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[9px] text-gray-400 text-center">-</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {Array.from(new Set(logisticsEntries.map(e => String(e.estimatedDeliveryDate || '').slice(0, 10)).filter(Boolean)))
                          .sort()
                          .map((dateKey: string) => {
                            const dateEntries = logisticsEntries.filter(e => String(e.estimatedDeliveryDate).startsWith(dateKey));
                            const isCollapsed = !!collapsedDates[dateKey];

                            return (
                              <div key={dateKey} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                <div
                                  onClick={() => setCollapsedDates(prev => ({ ...prev, [dateKey]: !prev[dateKey] }))}
                                  className="p-3 bg-slate-100 dark:bg-slate-800/80 flex items-center justify-between cursor-pointer hover:bg-slate-200/60 transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-indigo-500" />
                                    <span className="font-mono font-black text-xs">{dateKey}</span>
                                    <span className="text-[10px] font-extrabold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                                      {dateEntries.length} entregas
                                    </span>
                                  </div>
                                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                                </div>

                                {!isCollapsed && (
                                  <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {dateEntries.map(entry => (
                                      <div key={entry.id || entry.cntrsOriginal} className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col justify-between gap-2">
                                        <div className="flex justify-between items-start">
                                          <div>
                                            <span className="font-mono font-black text-xs text-indigo-600 dark:text-indigo-400 block">
                                              {entry.cntrsOriginal}
                                            </span>
                                            <span className="text-[10px] text-gray-500 block">
                                              BL: {entry.bl || '-'}
                                            </span>
                                          </div>
                                          <span className={`px-2 py-0.5 text-[9px] font-black rounded-full uppercase ${
                                            entry.status === 'ENTREGUE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                          }`}>
                                            {entry.status || 'PENDENTE'}
                                          </span>
                                        </div>
                                        <div className="text-[10px] text-gray-500 dark:text-gray-400 flex justify-between border-t border-slate-100 dark:border-slate-800 pt-1.5">
                                          <span>{entry.carrier || 'JSL'}</span>
                                          <span className="font-bold">{entry.onSitePlaceOfDelivery || 'WH 25'}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </main>
    </div>

    {/* MODAL: GERENCIAMENTO E EDIÇÃO DE PÁTIO E CONTÊINERES */}
    {selectedYardKey && yards[selectedYardKey] && (() => {
      const yard = yards[selectedYardKey];
      const yardContainers = containers.filter(c => c.yardId === selectedYardKey);
      const isHighOcc = (getYardOcupacao(yard) || 0) >= 85;
      const isMedOcc = (getYardOcupacao(yard) || 0) >= 70;

      const filteredYardContainers = yardContainers.filter(c => {
        if (containerStatusFilter !== 'ALL' && c.status !== containerStatusFilter) return false;
        if (containerCategoryFilter !== 'ALL' && c.category !== containerCategoryFilter) return false;
        if (containerSearch.trim()) {
          const q = containerSearch.trim().toLowerCase();
          const matchId = (c.id || '').toLowerCase().includes(q);
          const matchVessel = (c.vesselName || '').toLowerCase().includes(q);
          const matchBl = (c.bl || '').toLowerCase().includes(q);
          const matchModel = (c.modelo || '').toLowerCase().includes(q);
          if (!matchId && !matchVessel && !matchBl && !matchModel) return false;
        }
        return true;
      });

      const isAllSelected = filteredYardContainers.length > 0 && filteredYardContainers.every(c => selectedContainerIds.includes(c.id));

      return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${
            theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            {/* MODAL HEADER */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/40">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${
                  yard.type === 'BONDED'
                    ? 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                    : yard.type === 'BUFFER'
                    ? 'bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400'
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                }`}>
                  {yard.type === 'BONDED' ? <Anchor className="w-6 h-6" /> : yard.type === 'BUFFER' ? <Layers className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base tracking-tight">
                      {yard.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {yard.type}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-black ${
                      isHighOcc ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' :
                      isMedOcc ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}>
                      {getYardOcupacao(yard)}% {language === 'zh' ? '占用率' : 'Ocupação'}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    {language === 'zh' ? '堆场容量编辑与实时集装箱库存清单' : 'Edição direta de capacidade e controle de estoque de contêineres.'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedYardKey(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* MODAL BODY (SCROLLABLE) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {/* SECTION 1: EDIT YARD PARAMETERS */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-amber-500" />
                    <span>{language === 'zh' ? '堆场核心参数与容量编辑' : 'Edição de Capacidade e Estoque do Pátio'}</span>
                  </h4>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    ✓ {language === 'zh' ? '实时自动保存' : 'Salvo em Tempo Real'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  <div>
                    <label className="block text-[9px] font-extrabold uppercase text-slate-500 mb-1">
                      {language === 'zh' ? '总容量 (Cap)' : 'Capacidade'}
                    </label>
                    <input
                      type="number"
                      value={yard.capacity}
                      onChange={(e) => handleYardChange(selectedYardKey, 'capacity', e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-mono font-bold text-indigo-600 dark:text-indigo-400 text-center text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-extrabold uppercase text-slate-500 mb-1">
                      {language === 'zh' ? '实重 (Cheio)' : 'Cheios'}
                    </label>
                    <input
                      type="number"
                      value={yard.cheio}
                      onChange={(e) => handleYardChange(selectedYardKey, 'cheio', e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-mono font-bold text-slate-800 dark:text-slate-100 text-center text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-extrabold uppercase text-slate-500 mb-1">
                      {language === 'zh' ? '空箱 (Vazio)' : 'Vazios'}
                    </label>
                    <input
                      type="number"
                      value={yard.vazio}
                      onChange={(e) => handleYardChange(selectedYardKey, 'vazio', e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-mono font-bold text-slate-800 dark:text-slate-100 text-center text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-extrabold uppercase text-slate-500 mb-1">
                      {language === 'zh' ? '港口 (Porto)' : 'No Porto'}
                    </label>
                    <input
                      type="number"
                      value={yard.porto || 0}
                      onChange={(e) => handleYardChange(selectedYardKey, 'porto', e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-mono font-bold text-slate-700 dark:text-slate-300 text-center text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-extrabold uppercase text-slate-500 mb-1">
                      {language === 'zh' ? '待收箱 (Pronto)' : 'Pronto Coleta'}
                    </label>
                    <input
                      type="number"
                      value={yard.prontoColeta || 0}
                      onChange={(e) => handleYardChange(selectedYardKey, 'prontoColeta', e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-mono font-bold text-slate-700 dark:text-slate-300 text-center text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-extrabold uppercase text-slate-500 mb-1">
                      {language === 'zh' ? '已交付 (Deliv)' : 'Entregues'}
                    </label>
                    <input
                      type="number"
                      value={yard.delivered || 0}
                      onChange={(e) => handleYardChange(selectedYardKey, 'delivered', e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-mono font-bold text-slate-700 dark:text-slate-300 text-center text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: ADD CONTAINER FORM */}
              <form onSubmit={handleAddContainer} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60">
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5 text-blue-500" />
                  <span>{language === 'zh' ? '登记并添加新集装箱到此堆场' : 'Cadastrar Novo Contêiner Neste Pátio'}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2">
                  <div>
                    <label className="block text-[9px] font-extrabold uppercase text-slate-500 mb-1">
                      {language === 'zh' ? '集装箱号 (ID)' : 'Identificação (ID)'}
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: MSCU1234567"
                      value={newContainerId}
                      onChange={(e) => setNewContainerId(e.target.value.toUpperCase())}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 font-mono uppercase text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-extrabold uppercase text-slate-500 mb-1">
                      {language === 'zh' ? '尺寸规格' : 'Tamanho / Dimensão'}
                    </label>
                    <select
                      value={newContainerSize}
                      onChange={(e) => setNewContainerSize(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-xs cursor-pointer"
                    >
                      <option value="40' HC">40' HC</option>
                      <option value="20' GP">20' GP</option>
                      <option value="40' OT">40' OT</option>
                      <option value="45' HC">45' HC</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-extrabold uppercase text-slate-500 mb-1">
                      {language === 'zh' ? '状态 (重/空)' : 'Status'}
                    </label>
                    <select
                      value={newContainerStatus}
                      onChange={(e) => setNewContainerStatus(e.target.value as any)}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-xs cursor-pointer font-bold"
                    >
                      <option value="CHEIO">CHEIO (重箱 / Full)</option>
                      <option value="VAZIO">VAZIO (空箱 / Empty)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-extrabold uppercase text-slate-500 mb-1">
                      {language === 'zh' ? '流转分类' : 'Categoria'}
                    </label>
                    <select
                      value={newContainerCategory}
                      onChange={(e) => setNewContainerCategory(e.target.value as any)}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-xs cursor-pointer"
                    >
                      <option value="GERAL">GERAL (通用)</option>
                      <option value="PORTO">PORTO (港口堆放)</option>
                      <option value="PRONTO_COLETA">PRONTO COLETA (待提箱)</option>
                      <option value="DELIVERED">DELIVERED (已出库/送达)</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-lg shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{language === 'zh' ? '添加集装箱' : 'Adicionar'}</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* SECTION 3: CONTAINER INVENTORY IN THIS YARD */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-slate-500" />
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 dark:text-white">
                      {language === 'zh' ? '堆场集装箱库存明细' : 'Estoque de Contêineres Cadastrados'}
                      <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                        {yardContainers.length}
                      </span>
                    </h4>
                  </div>

                  {/* BULK ACTIONS */}
                  <div className="flex items-center gap-2">
                    {selectedContainerIds.length > 0 && (
                      <button
                        type="button"
                        onClick={handleBulkDeleteContainers}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{language === 'zh' ? `批量删除 (${selectedContainerIds.length})` : `Excluir (${selectedContainerIds.length})`}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleClearYard}
                      className="px-2.5 py-1.5 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 font-bold text-[11px] flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Excluir todos os contêineres deste pátio"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{language === 'zh' ? '清空堆场' : 'Esvaziar Pátio'}</span>
                    </button>
                  </div>
                </div>

                {/* FILTERS TOOLBAR */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={language === 'zh' ? '搜索箱号、船名、BL...' : 'Buscar ID, Navio, BL...'}
                      value={containerSearch}
                      onChange={(e) => setContainerSearch(e.target.value)}
                      className="w-full p-2 pl-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                    />
                  </div>

                  <div>
                    <select
                      value={containerStatusFilter}
                      onChange={(e) => setContainerStatusFilter(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs cursor-pointer"
                    >
                      <option value="ALL">{language === 'zh' ? '所有状态 (全部)' : 'Todos os Status'}</option>
                      <option value="CHEIO">CHEIO (重箱)</option>
                      <option value="VAZIO">VAZIO (空箱)</option>
                    </select>
                  </div>

                  <div>
                    <select
                      value={containerCategoryFilter}
                      onChange={(e) => setContainerCategoryFilter(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs cursor-pointer"
                    >
                      <option value="ALL">{language === 'zh' ? '所有分类 (全部)' : 'Todas as Categorias'}</option>
                      <option value="PORTO">PORTO (港口)</option>
                      <option value="PRONTO_COLETA">PRONTO COLETA (待提)</option>
                      <option value="DELIVERED">DELIVERED (交付)</option>
                      <option value="GERAL">GERAL (通用)</option>
                    </select>
                  </div>
                </div>

                {/* INVENTORY TABLE */}
                <div className="overflow-x-auto max-h-[340px] border border-slate-200 dark:border-slate-800 rounded-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-extrabold uppercase text-[10px]">
                      <tr>
                        <th className="p-2 w-8 text-center">
                          <input
                            type="checkbox"
                            checked={isAllSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedContainerIds(filteredYardContainers.map(c => c.id));
                              } else {
                                setSelectedContainerIds([]);
                              }
                            }}
                            className="cursor-pointer"
                          />
                        </th>
                        <th className="p-2">{language === 'zh' ? '集装箱号' : 'Identificação'}</th>
                        <th className="p-2">{language === 'zh' ? '尺寸' : 'Tamanho'}</th>
                        <th className="p-2">{language === 'zh' ? '状态' : 'Status'}</th>
                        <th className="p-2">{language === 'zh' ? '流转分类' : 'Categoria'}</th>
                        <th className="p-2">{language === 'zh' ? '关联船舶' : 'Navio'}</th>
                        <th className="p-2 text-center">{language === 'zh' ? '操作' : 'Ações'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredYardContainers.map((c) => {
                        const isSelected = selectedContainerIds.includes(c.id);
                        return (
                          <tr key={c.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/60 ${isSelected ? 'bg-blue-50/60 dark:bg-blue-950/30' : ''}`}>
                            <td className="p-2 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedContainerIds([...selectedContainerIds, c.id]);
                                  } else {
                                    setSelectedContainerIds(selectedContainerIds.filter(id => id !== c.id));
                                  }
                                }}
                                className="cursor-pointer"
                              />
                            </td>
                            <td className="p-2 font-mono font-black text-slate-800 dark:text-white">
                              {c.id}
                            </td>
                            <td className="p-2 font-mono text-slate-600 dark:text-slate-300">
                              {c.size || "40' HC"}
                            </td>
                            <td className="p-2">
                              <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-extrabold ${
                                c.status === 'CHEIO'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}>
                                {c.status}
                              </span>
                            </td>
                            <td className="p-2">
                              <span className="px-2 py-0.5 rounded-md text-[9.5px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {c.category || 'GERAL'}
                              </span>
                            </td>
                            <td className="p-2 text-slate-600 dark:text-slate-300 truncate max-w-[120px]">
                              {c.vesselName || 'N/A'}
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteContainer(c)}
                                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded transition-colors cursor-pointer"
                                title="Excluir contêiner"
                              >
                                <Trash2 className="w-3.5 h-3.5 mx-auto" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredYardContainers.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400 dark:text-slate-500">
                            {language === 'zh' ? '暂无匹配的集装箱。' : 'Nenhum contêiner encontrado neste pátio com os filtros atuais.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50/70 dark:bg-slate-900/40">
              <button
                type="button"
                onClick={() => setSelectedYardKey(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs cursor-pointer shadow-sm"
              >
                {language === 'zh' ? '完成并关闭' : 'Concluir e Fechar'}
              </button>
            </div>
          </div>
        </div>
      );
    })()}

    {/* MODAL: ADICIONAR NOVO PÁTIO OU WAREHOUSE */}
    {showAddYardForm && (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl ${
          theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-sm">
                  {language === 'zh' ? '新增堆场 / 仓库' : 'Adicionar Novo Pátio / Armazém'}
                </h3>
                <p className="text-[11px] text-gray-400">
                  {language === 'zh' ? '创建新的堆场单元并配置初始容量' : 'Cadastre um novo terminal, armazém ou buffer no sistema.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAddYardForm(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>

          <form onSubmit={async (e) => {
            await addYard(e);
            setShowAddYardForm(false);
          }} className="space-y-3 text-xs">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                {language === 'zh' ? '堆场/仓库名称' : 'Nome do Pátio / Armazém'}
              </label>
              <input
                type="text"
                placeholder="Ex: CTS - NOVO TERMINAL"
                value={newYardName}
                onChange={(e) => setNewYardName(e.target.value.toUpperCase())}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  {language === 'zh' ? '堆场类型' : 'Tipo de Operação'}
                </label>
                <select
                  value={newYardType}
                  onChange={(e) => setNewYardType(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold cursor-pointer"
                >
                  <option value="BONDED">{language === 'zh' ? '保税区 (BONDED)' : 'BONDED (Terminal Alfandegado)'}</option>
                  <option value="WAREHOUSE">{language === 'zh' ? '仓库 (WAREHOUSE)' : 'WAREHOUSE (Armazém / CD)'}</option>
                  <option value="BUFFER">{language === 'zh' ? '缓冲场 (BUFFER)' : 'BUFFER (Buffer Fábrica)'}</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  {language === 'zh' ? '额定容量 (TEUs/CNTRs)' : 'Capacidade Nominal'}
                </label>
                <input
                  type="number"
                  value={newYardCapacity}
                  onChange={(e) => setNewYardCapacity(Number(e.target.value) || 0)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono font-bold text-indigo-600 dark:text-indigo-400"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  {language === 'zh' ? '初始实重 (Cheios)' : 'Cheios Iniciais'}
                </label>
                <input
                  type="number"
                  value={newYardCheio}
                  onChange={(e) => setNewYardCheio(Number(e.target.value) || 0)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  {language === 'zh' ? '初始空箱 (Vazios)' : 'Vazios Iniciais'}
                </label>
                <input
                  type="number"
                  value={newYardVazio}
                  onChange={(e) => setNewYardVazio(Number(e.target.value) || 0)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddYardForm(false)}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold cursor-pointer"
              >
                {language === 'zh' ? '取消' : 'Cancelar'}
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {language === 'zh' ? '创建并保存' : 'Criar Pátio'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* MODAL: GOOGLE SHEETS LIVE SYNC */}
    {sheetsModalOpen && (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-sm">
                  {language === 'zh' ? 'Google Sheets 在线表格同步' : 'Sincronizar com Google Sheets'}
                </h3>
                <p className="text-[11px] text-gray-400">
                  {language === 'zh' ? '连接外部发布为 CSV 的 Google 表格链接' : 'Importação e atualização automática em lote.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSheetsModalOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                {language === 'zh' ? 'Google Sheets 发布/分享链接 (URL)' : 'URL da Planilha Google Sheets'}
              </label>
              <input
                type="text"
                value={sheetsUrl}
                onChange={(e) => setSheetsUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white font-mono text-[11px]"
              />
            </div>

            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg text-[11px] text-emerald-800 dark:text-emerald-300 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> Como publicar sua planilha:
              </p>
              <p className="opacity-90">1. No Google Sheets, clique em <strong>Arquivo → Compartilhar → Publicar na Web</strong>.</p>
              <p className="opacity-90">2. Selecione formato <strong>Valores separados por vírgula (.csv)</strong> e copie o link.</p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSheetsModalOpen(false)}
                className="flex-1 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold cursor-pointer"
              >
                {language === 'zh' ? '取消' : 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={handleSyncGoogleSheets}
                className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {language === 'zh' ? '立即同步' : 'Sincronizar Agora'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* CONFIRMATION DIALOG MODAL */}
    {confirmConfig && confirmConfig.isOpen && (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                {confirmConfig.title}
              </h3>
              <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider">Ação Crítica</span>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">
            {confirmConfig.message}
          </p>

          <div className="flex items-center justify-end gap-2.5">
            <button
              onClick={() => setConfirmConfig(null)}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              {language === 'zh' ? '取消' : 'Cancelar'}
            </button>
            <button
              onClick={confirmConfig.onConfirm}
              className="px-4 py-2 rounded-xl text-xs font-extrabold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition-all cursor-pointer active:scale-95"
            >
              {language === 'zh' ? '确认执行' : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    )}

  </div>
  );
}
