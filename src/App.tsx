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
  Upload
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

  // ESTADOS DE CONTÊINERES (Para detalhamento por área)
  const [selectedYardKey, setSelectedYardKey] = useState<string | null>(null);
  const [containers, setContainers] = useState<Container[]>(() => JSON.parse(JSON.stringify(INITIAL_CONTAINERS)));
  
  // Estados para formulário de cadastro de novo contêiner
  const [newContainerId, setNewContainerId] = useState("");
  const [newContainerSize, setNewContainerSize] = useState("40' HC");
  const [newContainerStatus, setNewContainerStatus] = useState<'CHEIO' | 'VAZIO'>('CHEIO');
  const [newContainerCategory, setNewContainerCategory] = useState<'PORTO' | 'PRONTO_COLETA' | 'DELIVERED' | 'GERAL'>('GERAL');
  const [newContainerVessel, setNewContainerVessel] = useState("N/A");
  
  // NAVEGAÇÃO DE SLIDES E COMENTÁRIOS DAS NOVAS PÁGINAS
  const [currentSlide, setCurrentSlide] = useState(0); // 0: Geral, 1: Pátios, 2: Navios, 3: Gráficos
  const [yardsComment, setYardsComment] = useState("Inserir comentários sobre a capacidade e ocupação dos pátios de forma bilíngue aqui. / 在此输入关于堆场容量、占用比率的双语说明。");
  const [vesselNote1, setVesselNote1] = useState("Escala regular de navios ativa - Monitoramento detalhado das janelas de atracação. / 常规活跃船舶靠泊计划 - 详细监控和管理泊位窗口。");
  const [vesselNote2, setVesselNote2] = useState("Destaques operacionais dos navios (Ex: Prioridades de descarga BYD). / 船舶运营重点亮点 (例如：比亚迪重箱卸船优先顺序)。");
  const [chartNote1, setChartNote1] = useState("Comentários sobre o Backlog Projetado vs Capacidade de Entrega Semanal. / 预测积压量与周度交付能力的对比分析说明。");
  const [chartNote2, setChartNote2] = useState("Análise de gargalos e metas diárias garantidas (meta Gc de 140). / 关于每日进箱量与保证目标 (Gc 140) 的瓶颈分析和建议。");
  
  // IDIOMA ATIVO: 'pt' (Português) | 'zh' (Mandarim) | 'bilingual' (Ambos)
  const [language, setLanguage] = useState<string>('bilingual');

  // CONFIGURAÇÕES VISUAIS DO SLIDE (Adaptativo com base no idioma)
  const [slideTitlePT, setSlideTitlePT] = useState("DASHBOARD OPERACIONAL & CAPACIDADE DE PÁTIOS");
  const [slideTitleZH, setSlideTitleZH] = useState("堆场运营与容量监控看板");
  const [slideSubtitlePT, setSlideSubtitlePT] = useState("Monitoramento de Ocupação, Backlog Projetado e Escalas de Navios");
  const [slideSubtitleZH, setSlideSubtitleZH] = useState("堆场使用率、预测积压与船舶靠泊计划监控");
  
  const [watermarkText, setWatermarkText] = useState("H2LUIZ-VI / luiz.vieira - 2026-05-21");
  const [showWatermark, setShowWatermark] = useState(true);
  const [theme, setTheme] = useState('light'); // 'light' ou 'dark'
  const [pdfStatus, setPdfStatus] = useState<'idle' | 'rendering' | 'success' | 'error'>('idle');
  
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
          category: data.category || "GERAL"
        });
      });
      setContainers(newContainers);
    }, (err) => {
      console.warn("Falha ao ler containers do Firestore:", err);
    });

    return () => {
      unsubYards();
      unsubVessels();
      unsubChartLeft();
      unsubChartRight();
      unsubConfig();
      unsubContainers();
    };
  }, [user]);

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
        setCurrentSlide(prev => (prev + 1) % 4);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        setCurrentSlide(prev => (prev - 1 + 4) % 4);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

      for (let s = 0; s < 4; s++) {
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
    return (
      <div className="flex flex-col text-left mb-1">
        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none mb-1">{dyn.titlePT}</span>
        <span className="text-2xl font-black text-slate-950 dark:text-white font-sans tracking-tight leading-tight block">{dyn.titleZH}</span>
      </div>
    );
  };

  const getSlideSubtitle = () => {
    const dyn = getDynamicSlideTitleAndSubtitle();
    if (currentSlide === 3) {
      return (
        <div className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wide mt-1 pl-3">
          {dyn.subPT}
        </div>
      );
    }
    if (language === 'pt') return dyn.subPT;
    if (language === 'zh') return dyn.subZH;
    return (
      <div className="flex flex-col text-left leading-normal mt-1 border-t border-gray-100 dark:border-gray-800/60 pt-1">
        <span className="text-[9.5px] text-gray-500 dark:text-gray-400 font-bold tracking-tight">{dyn.subPT}</span>
        <span className="text-[11.5px] text-gray-400 dark:text-gray-500 font-medium font-sans block">{dyn.subZH}</span>
      </div>
    );
  };

  return (
    <div id="app-root-container" className={`min-h-screen ${theme === 'dark' ? 'bg-[#111827] text-gray-100' : 'bg-[#F3F4F6] text-gray-800'} transition-colors duration-300 flex flex-col font-sans overflow-x-hidden`}>
      
      {/* BARRA DE MENU SUPERIOR DE CONTROLE (Ocultada em modo de apresentação limpo) */}
      {isEditMode && (
        <header id="control-panel-header" className="bg-white border-b border-gray-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 text-white p-2 rounded-lg">
              <Globe className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                Portal BYD Logistics <span className="text-[10px] bg-red-100 text-red-800 font-extrabold px-2 py-0.5 rounded-full tracking-wider">CONTROL TOWER</span>
              </h1>
              <p className="text-xs text-gray-500">Sistema Integrado de Controle de Pátios, Escalas e Planejamento Operacional (Bilingue/Mandarim)</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status do Banco e Login do Google */}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs mr-1 select-none">
              <span className="flex items-center gap-1">
                {dbStatus === 'online' ? (
                  <Wifi className="w-3.5 h-3.5 text-emerald-500" title="Banco Online Sincronizado" />
                ) : dbStatus === 'connecting' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" title="Conectando..." />
                ) : (
                  <WifiOff className="w-3.5 h-3.5 text-rose-400" title="Usando fallback Offline local" />
                )}
                <span className="text-[10px] font-mono font-bold uppercase text-slate-500">
                  {dbStatus === 'online' ? 'Online' : dbStatus === 'connecting' ? 'Sinc' : 'Offline'}
                </span>
              </span>

              <div className="h-4 w-px bg-slate-200 mx-1"></div>

              {user ? (
                <div id="firebase-logged-in-container" className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-bold">
                    <UserIcon className="w-3 h-3 text-emerald-600" />
                    <span>{user.displayName || user.email?.split('@')[0]}</span>
                  </div>
                  <button
                    id="btn-google-signout"
                    onClick={logoutUser}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                    title="Desconectar do Firebase"
                  >
                    <LogOut className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  id="btn-google-signin"
                  onClick={loginWithGoogle}
                  className="flex items-center gap-1 text-[10px] bg-white border border-gray-200 hover:border-red-400 text-gray-700 font-extrabold px-2 py-0.5 rounded cursor-pointer transition-colors shadow-sm"
                  title="Faça login com sua conta do Google para editar os dados online em tempo real!"
                >
                  <Lock className="w-3 h-3 text-red-500" />
                  <span>Conectar Firebase</span>
                </button>
              )}
            </div>

            {/* Seletor de Idiomas */}
            <div className="bg-gray-100 p-1 rounded-lg flex items-center gap-1 border border-gray-200">
              <button 
                id="btn-lang-pt"
                onClick={() => { setLanguage('pt'); updateGlobalDoc('language', 'pt'); }}
                className={`px-2.5 py-1 text-xs font-bold rounded flex items-center gap-1 transition-all ${language === 'pt' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-800'}`}
                title="Português"
              >
                🇧🇷 PT
              </button>
              <button 
                id="btn-lang-zh"
                onClick={() => { setLanguage('zh'); updateGlobalDoc('language', 'zh'); }}
                className={`px-2.5 py-1 text-xs font-bold rounded flex items-center gap-1 transition-all ${language === 'zh' ? 'bg-white shadow text-red-600' : 'text-gray-500 hover:text-gray-800'}`}
                title="Mandarim (中文)"
              >
                🇨🇳 中文
              </button>
              <button 
                id="btn-lang-bilingual"
                onClick={() => { setLanguage('bilingual'); updateGlobalDoc('language', 'bilingual'); }}
                className={`px-2.5 py-1 text-xs font-bold rounded flex items-center gap-1 transition-all ${language === 'bilingual' ? 'bg-white shadow text-emerald-700' : 'text-gray-500 hover:text-gray-800'}`}
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
      {!isEditMode && (
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

      {/* ÁREA PRINCIPAL DA INTERFACE */}
      <main id="main-content-area" className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* VIEWPORT DO SLIDE (ESQUERDA) */}
        <div id="slide-viewport-container" className="flex-1 px-2 py-1 flex flex-col items-center justify-start overflow-y-auto w-full">
          
          {/* NAVEGAÇÃO DE MÓDULOS - ESTILO WEBSITE CORPORATIVO */}
          <div className="w-full max-w-[1400px] flex flex-col md:flex-row md:items-center justify-between bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 mb-4 shadow-sm select-none transition-all gap-3">
            <div className="flex items-center gap-2">
              <div className="bg-red-50 dark:bg-red-950/30 p-1.5 rounded-lg text-red-600">
                <Database className="w-4 h-4 text-red-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-800 dark:text-gray-200 uppercase tracking-widest block">
                  {language === 'bilingual' ? 'Módulos Operacionais / 智能控制面板' : language === 'zh' ? '智能控制面板:' : 'Módulos Operacionais:'}
                </span>
                <span className="text-[9px] text-gray-400 font-bold uppercase">{language === 'zh' ? '实时控制台' : 'Console em tempo real'}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { index: 0, pt: "Visão Geral", zh: "综合大盘", icon: <Database className="w-3.5 h-3.5" /> },
                { index: 1, pt: "Gestão de Pátios", zh: "堆场管理", icon: <Building2 className="w-3.5 h-3.5" /> },
                { index: 2, pt: "Escala de Navios", zh: "船舶靠泊计划", icon: <Ship className="w-3.5 h-3.5" /> },
                { index: 3, pt: "Gráficos & Projeções", zh: "智能运营图表", icon: <TrendingUp className="w-3.5 h-3.5" /> },
              ].map(s => (
                <button
                  key={s.index}
                  onClick={() => setCurrentSlide(s.index)}
                  className={`px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border rounded-lg ${
                    currentSlide === s.index
                      ? 'bg-red-600 text-white border-red-700 shadow-md shadow-red-550/20 dark:shadow-none'
                      : 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {s.icon}
                  <span>{language === 'zh' ? s.zh : language === 'pt' ? s.pt : `${s.pt} / ${s.zh}`}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-[10.5px] text-gray-400 font-mono font-bold bg-slate-50 dark:bg-slate-800/55 border border-slate-250/20 px-2 py-1 rounded-lg">
              <span className="text-[9px] text-red-600 dark:text-red-400 font-black uppercase tracking-widest">{language === 'zh' ? '当前视图' : 'Visualização'}:</span>
              <span className="text-slate-750 dark:text-gray-200 font-extrabold">{currentSlide + 1} / 4</span>
            </div>
          </div>
          
          {/* CONTAINER DO WEBSITE DASHBOARD (COMPARTIMENTO FLUIDO SEM ESCALONAMENTO INTERNO) */}
          <div 
            id="slide-capture-area" 
            className={`
              w-full max-w-[1400px] shadow-lg rounded-2xl transition-all relative border overflow-visible
              ${theme === 'dark' ? 'bg-[#0f172a] border-slate-800 text-white' : 'bg-[#FAFCFF] border-slate-100 text-slate-800'}
              p-6 md:p-8
            `}
            style={pdfStatus === 'rendering' ? {
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
              {/* CABEÇALHO DO SLIDE */}
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
                                  <span className="font-mono text-gray-700 dark:text-slate-300">{(bondedSum.totalCap).toLocaleString()} <span className="text-[9px] text-gray-400">TEU</span></span>
                                </div>
                                <div className="h-4 w-px bg-gray-200 dark:bg-slate-700"></div>
                                <div className="flex flex-col">
                                  <span className="text-[7.5px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">{language === 'bilingual' ? 'Ocupado / 已用' : 'Ocupado'}</span>
                                  <span className="font-mono text-gray-700 dark:text-slate-300">{(bondedSum.totalCheio).toLocaleString()} <span className="text-[9px] text-gray-400">TEU</span></span>
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
                                  <span className="font-mono text-gray-700 dark:text-slate-300">{(warehouseSum.totalCap).toLocaleString()} <span className="text-[9px] text-gray-400">TEU</span></span>
                                </div>
                                <div className="h-4 w-px bg-gray-200 dark:bg-slate-700"></div>
                                <div className="flex flex-col">
                                  <span className="text-[7.5px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">{language === 'bilingual' ? 'Ocupado / 已用' : 'Ocupado'}</span>
                                  <span className="font-mono text-gray-700 dark:text-slate-300">{(warehouseSum.totalCheio).toLocaleString()} <span className="text-[9px] text-gray-400">TEU</span></span>
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
                                  <span className="font-mono text-gray-700 dark:text-slate-300">{(bufferSum.totalCap).toLocaleString()} <span className="text-[9px] text-gray-400">TEU</span></span>
                                </div>
                                <div className="h-4 w-px bg-gray-200 dark:bg-slate-700"></div>
                                <div className="flex flex-col">
                                  <span className="text-[7.5px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">{language === 'bilingual' ? 'Ocupado Buffer / 缓冲已用' : 'Ocupado'}</span>
                                  <span className="font-mono text-gray-700 dark:text-slate-300">{(bufferSum.totalCheio).toLocaleString()} <span className="text-[9px] text-gray-400">TEU</span></span>
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
                       <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-100 shadow-sm'} flex flex-col justify-between h-[280px]`}>
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="text-[11px] font-black text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                            <TrendingUp className="w-4 h-4 text-emerald-500" /> {getChartLeftTitle()}
                          </h4>
                          <div className="flex gap-2 text-[9px] font-bold">
                            <span className="flex items-center gap-1 text-slate-800 dark:text-slate-205"><span className="w-1.5 h-1.5 bg-slate-800 dark:bg-slate-400 inline-block rounded-sm"></span>{language === 'bilingual' ? '到港 / ATA' : 'ATA'}</span>
                            <span className="flex items-center gap-1 text-emerald-500">
                              <span className="w-1.5 h-0.5 border-t border-emerald-500 border-dashed inline-block"></span>
                              {language === 'pt' ? `Capacidade (${scenarioValue}/dia)` : (language === 'zh' ? `交付能力 (${scenarioValue}/天)` : `交付 / Capacidade (${scenarioValue}/d)`)}
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
                            
                            {/* Dynamic green dashed line connecting the actual delivery capped by max capacity (scenarioValue * 7) */}
                            <path
                              d={chartLeft.reduce((acc, item, i) => {
                                const x = 35 + i * (540 / (chartLeft.length - 1));
                                const prevBacklog = i === 0 ? 1416 : chartLeft[i-1].backlog;
                                const delivery = Math.min(scenarioValue * 7, prevBacklog + item.arrivals);
                                const y = 100 - (delivery / 6000) * 85;
                                return acc + `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                              }, '')}
                              fill="none"
                              stroke="#10b981"
                              strokeWidth="1.25"
                              strokeDasharray="4 4"
                            />

                            {chartLeft.map((item, i) => {
                              const x = 35 + i * (540 / (chartLeft.length - 1));
                              const barHeight = (item.arrivals / 6000) * 85;
                              const y = 100 - barHeight;
                              return (
                                <rect 
                                  key={i}
                                  x={x - 3} 
                                  y={y} 
                                  width="6" 
                                  height={barHeight} 
                                  fill={theme === 'dark' ? '#475569' : '#1e293b'} 
                                  rx="0.5"
                                />
                              );
                            })}

                            <path
                              d={chartLeft.reduce((acc, item, i) => {
                                const x = 35 + i * (540 / (chartLeft.length - 1));
                                const y = 100 - (item.backlog / 6000) * 85;
                                return acc + `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                              }, '')}
                              fill="none"
                              stroke="#ef4444"
                              strokeWidth="1.5"
                            />

                            {chartLeft.map((item, i) => {
                              const x = 35 + i * (540 / (chartLeft.length - 1));
                              const y = 100 - (item.backlog / 6000) * 85;
                              return (
                                <g key={`cl-${i}`}>
                                  <circle cx={x} cy={y} r="2" fill="#ef4444" stroke="#fff" strokeWidth="0.5" />
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

                            {chartLeft.map((item, i) => {
                              const x = 35 + i * (540 / (chartLeft.length - 1));
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
                  
                  {/* Cards de Pátio expandidos horizontalmente */}
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
                            onClick={() => setSelectedYardKey(key)}
                          />
                        ))}
                      </div>
                    )}
                  </div>

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
              ) : (
                /* SLIDE 4: GRÁFICOS (CHARTS ONLY) COM CAIXAS DE COMENTÁRIOS */
                <div id="slide-dashboard-grid-charts" className={`flex flex-col justify-between ${widescreenMode ? 'h-[calc(100%-85px)] overflow-hidden' : 'min-h-[660px] gap-4'}`}>
                  
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
                            {language === 'pt' ? `Capacidade (${scenarioValue}/dia)` : (language === 'zh' ? `交付能力 (${scenarioValue}/天)` : `交付 / Capacidade (${scenarioValue}/d)`)}
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
                          
                          {/* Dynamic green dashed line connecting the actual delivery capped by max capacity (scenarioValue * 7) */}
                          <path
                            d={chartLeft.reduce((acc, item, i) => {
                              const x = 35 + i * (540 / (chartLeft.length - 1));
                              const prevBacklog = i === 0 ? 1416 : chartLeft[i-1].backlog;
                              const delivery = Math.min(scenarioValue * 7, prevBacklog + item.arrivals);
                              const y = 100 - (delivery / 6000) * 85;
                              return acc + `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                            }, '')}
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="1.25"
                            strokeDasharray="4 4"
                          />

                          {chartLeft.map((item, i) => {
                            const x = 35 + i * (540 / (chartLeft.length - 1));
                            const barHeight = (item.arrivals / 6000) * 85;
                            const y = 100 - barHeight;
                            return (
                              <rect 
                                key={i}
                                x={x - 3} 
                                y={y} 
                                width="6" 
                                height={barHeight} 
                                fill={theme === 'dark' ? '#475569' : '#1e293b'} 
                                rx="0.5"
                              />
                            );
                          })}

                          <path
                            d={chartLeft.reduce((acc, item, i) => {
                              const x = 35 + i * (540 / (chartLeft.length - 1));
                              const y = 100 - (item.backlog / 6000) * 85;
                              return acc + `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                            }, '')}
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth="1.5"
                          />

                          {chartLeft.map((item, i) => {
                            const x = 35 + i * (540 / (chartLeft.length - 1));
                            const y = 100 - (item.backlog / 6000) * 85;
                            return (
                              <g key={`cl-${i}`}>
                                <circle cx={x} cy={y} r="2" fill="#ef4444" stroke="#fff" strokeWidth="0.5" />
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

                          {chartLeft.map((item, i) => {
                            const x = 35 + i * (540 / (chartLeft.length - 1));
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

                </div>
              )}
            </div> {/* END OF ZOOM SCALE WRAPPER */}

            {/* MARCA D'ÁGUA PERSONALIZADA DE SLIDE CORPORATIVO */}
            {showWatermark && (
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
                      {language === 'bilingual' ? 'Indicadores de Pátio / 堆场高层物流 KPI' : 'Logística High-Level KPIs'}
                    </span>
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-150 text-xs">
                      <div className="p-2 rounded-lg bg-white border border-slate-100 shadow-3xs flex flex-col justify-between">
                        <span className="text-[8px] text-gray-400 font-bold uppercase">{language === 'bilingual' ? 'Capacidade Total / 总容量' : 'Capacidade Total'}</span>
                        <span className="font-mono text-xs font-black text-slate-800 mt-0.5">
                          {((Object.values(yards) as Yard[]).reduce((sum, y) => sum + (Number(y?.capacity) || 0), 0)).toLocaleString()} <span className="text-[8px] text-gray-400 font-normal">TEU</span>
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-slate-100 shadow-3xs flex flex-col justify-between">
                        <span className="text-[8px] text-gray-400 font-bold uppercase">{language === 'bilingual' ? 'Ocupação Geral / 总体占用率' : 'Ocupação Geral'}</span>
                        <span className={`text-xs font-black mt-0.5 px-1 py-0.2 w-max rounded ${
                          (() => {
                            const totalCap = (Object.values(yards) as Yard[]).reduce((sum, y) => sum + (Number(y?.capacity) || 0), 0);
                            const totalCheio = (Object.values(yards) as Yard[]).reduce((sum, y) => sum + (Number(y?.cheio) || 0), 0);
                            const totalVazio = (Object.values(yards) as Yard[]).reduce((sum, y) => sum + (Number(y?.vazio) || 0), 0);
                            const util = totalCap > 0 ? Math.round(((totalCheio + totalVazio) / totalCap) * 100) : 0;
                            return util >= 89 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700';
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
                      <div className="p-2 rounded-lg bg-white border border-slate-100 shadow-3xs flex flex-col justify-between">
                        <span className="text-[8px] text-gray-400 font-bold uppercase">{language === 'bilingual' ? 'Total Cheios / 重箱总量' : 'Total Cheios'}</span>
                        <span className="font-mono text-xs font-black text-blue-600 mt-0.5">
                          {((Object.values(yards) as Yard[]).reduce((sum, y) => sum + (Number(y?.cheio) || 0), 0)).toLocaleString()} <span className="text-[8px] text-gray-400 font-normal">TEU</span>
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-slate-100 shadow-3xs flex flex-col justify-between">
                        <span className="text-[8px] text-gray-400 font-bold uppercase">{language === 'bilingual' ? 'Pronto Coleta / 待提总量' : 'Pronto Coleta'}</span>
                        <span className="font-mono text-xs font-black text-emerald-600 mt-0.5">
                          {((Object.values(yards) as Yard[]).reduce((sum, y) => sum + (Number(y?.prontoColeta) || 0), 0)).toLocaleString()} <span className="text-[8px] text-gray-400 font-normal">TEU</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-red-50 p-2.5 rounded-lg border border-red-100">
                    <p className="text-[10px] text-red-800 font-medium leading-relaxed">
                      {language === 'zh' ? (
                        <span>请在下方选择并配置各个堆场和CD的实际参数。</span>
                      ) : language === 'pt' ? (
                        <span>Escolha um pátio no seletor abaixo para atualizar seus valores de capacidade, estoque e total anterior de contêineres.</span>
                      ) : (
                        <>
                          <span className="font-extrabold text-[10.5px] text-red-950 block">请在下方选择并配置各个堆场和CD的实际参数。</span>
                          <span className="opacity-85 block mt-0.5">Escolha um pátio no seletor abaixo para atualizar seus valores de capacidade, estoque e total anterior de contêineres.</span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* SELECTOR DE PÁTIO ATIVO */}
                  <div className="space-y-1.5 font-sans">
                    <label className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider block">
                      {language === 'bilingual' ? 'Selecione o Pátio para Configurar / 选择堆场进行配置' : 'Selecionar Pátio'}
                    </label>
                    <select
                      value={activeYardKey}
                      onChange={(e) => setActiveYardKey(e.target.value)}
                      className="w-full text-xs font-bold border border-gray-200 rounded-lg p-2 bg-slate-50 text-slate-800 focus:ring-1 focus:ring-red-500 outline-hidden"
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
                      <div className="p-3 border border-red-100 rounded-xl bg-red-50/10 space-y-3 font-sans">
                        <div className="flex justify-between items-center border-b border-red-100 pb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-xs text-red-950">{yard.name}</span>
                            <span className="text-[8.5px] bg-red-600/10 text-red-700 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wide">{yard.type}</span>
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
                            className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-slate-800">
                          <div>
                            <label className="text-[9px] text-gray-500 font-black uppercase block mb-1">Capacidade / 总容量</label>
                            <input 
                              type="number" 
                              value={yard.capacity} 
                              onChange={(e) => handleYardChange(activeYardKey, 'capacity', e.target.value)}
                              className="w-full text-xs font-bold border border-gray-200 rounded p-1.5 bg-white focus:ring-1 focus:ring-red-500 outline-hidden"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-blue-600 font-black uppercase block mb-1">Cheio / 重箱 (TEU)</label>
                            <input 
                              type="number" 
                              value={yard.cheio} 
                              onChange={(e) => handleYardChange(activeYardKey, 'cheio', e.target.value)}
                              className="w-full text-xs font-bold border border-gray-200 rounded p-1.5 bg-white focus:ring-1 focus:ring-red-500 outline-hidden"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-slate-500 font-black uppercase block mb-1">Vazio / 空箱 (TEU)</label>
                            <input 
                              type="number" 
                              value={yard.vazio} 
                              onChange={(e) => handleYardChange(activeYardKey, 'vazio', e.target.value)}
                              className="w-full text-xs font-bold border border-gray-200 rounded p-1.5 bg-white focus:ring-1 focus:ring-red-500 outline-hidden"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-slate-500 font-black uppercase block mb-1">Porto / 港口 (TEU)</label>
                            <input 
                              type="number" 
                              value={yard.porto} 
                              onChange={(e) => handleYardChange(activeYardKey, 'porto', e.target.value)}
                              className="w-full text-xs font-bold border border-gray-200 rounded p-1.5 bg-white focus:ring-1 focus:ring-red-500 outline-hidden"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-amber-600 font-black uppercase block mb-1">Pronto Coleta / 待提</label>
                            <input 
                              type="number" 
                              value={yard.prontoColeta} 
                              onChange={(e) => handleYardChange(activeYardKey, 'prontoColeta', e.target.value)}
                              className="w-full text-xs font-bold border border-gray-200 rounded p-1.5 bg-white focus:ring-1 focus:ring-red-500 outline-hidden"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-emerald-600 font-black uppercase block mb-1">Delivered / 交付</label>
                            <input 
                              type="number" 
                              value={yard.delivered} 
                              onChange={(e) => handleYardChange(activeYardKey, 'delivered', e.target.value)}
                              className="w-full text-xs font-bold border border-gray-200 rounded p-1.5 bg-white focus:ring-1 focus:ring-red-500 outline-hidden"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-[9px] text-rose-600 font-black uppercase block mb-1">Prev Total / 上期总量 (TEU)</label>
                            <input 
                              type="number" 
                              value={yard.previous_total !== undefined ? yard.previous_total : 0} 
                              onChange={(e) => handleYardChange(activeYardKey, 'previous_total', e.target.value)}
                              className="w-full text-xs font-bold border border-gray-200 rounded p-1.5 bg-white focus:ring-1 focus:ring-red-500 outline-hidden"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* COLLAPSIBLE CRIAR NOVO PÁTIO */}
                  <div className="border border-gray-200 rounded-xl bg-slate-50 overflow-hidden font-sans">
                    <button
                      type="button"
                      onClick={() => setShowAddYardForm(!showAddYardForm)}
                      className="w-full p-3 bg-white text-left font-extrabold text-[10.5px] uppercase tracking-wider text-slate-700 flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5 text-red-500" />
                        {language === 'bilingual' ? 'Criar Novo Pátio / 增加新堆场' : 'Criar Novo Pátio'}
                      </span>
                      <span className="text-gray-400 font-black">{showAddYardForm ? '−' : '+'}</span>
                    </button>
                    
                    {showAddYardForm && (
                      <form onSubmit={addYard} className="p-3 border-t border-gray-200 bg-white/70 space-y-2.5 text-[10.5px]">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[8.5px] text-slate-500 font-bold uppercase block mb-0.5">Nome do Pátio / 堆场名称</label>
                            <input 
                              type="text" 
                              placeholder="NOME / 名称"
                              value={newYardName}
                              onChange={(e) => setNewYardName(e.target.value)}
                              className="w-full text-xs font-bold border border-gray-200 rounded p-1.5 bg-white uppercase text-slate-800 outline-hidden"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[8.5px] text-slate-500 font-bold uppercase block mb-0.5">Tipo / 堆场类型</label>
                            <select 
                              value={newYardType}
                              onChange={(e) => setNewYardType(e.target.value)}
                              className="w-full text-xs font-bold border border-gray-200 rounded p-1.5 bg-white text-slate-800 uppercase outline-hidden"
                            >
                              <option value="BONDED">BONDED / 关内</option>
                              <option value="WAREHOUSE">CD & WAREHOUSE / 仓库</option>
                              <option value="BUFFER">BUFFER / 缓冲区</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-slate-800">
                          <div>
                            <label className="text-[8px] text-gray-500 font-bold uppercase block mb-0.5">Capacity / 容积</label>
                            <input 
                              type="number" 
                              placeholder="2000"
                              value={newYardCapacity}
                              onChange={(e) => setNewYardCapacity(Number(e.target.value) || 0)}
                              className="w-full text-xs font-bold border border-gray-200 rounded p-1 bg-white"
                              min="0"
                            />
                          </div>
                          <div>
                            <label className="text-[8px] text-blue-500 font-bold uppercase block mb-0.5">Cheio / 重箱</label>
                            <input 
                              type="number" 
                              placeholder="500"
                              value={newYardCheio}
                              onChange={(e) => setNewYardCheio(Number(e.target.value) || 0)}
                              className="w-full text-xs font-bold border border-gray-200 rounded p-1 bg-white"
                              min="0"
                            />
                          </div>
                          <div>
                            <label className="text-[8px] text-slate-500 font-bold uppercase block mb-0.5">Vazio / 空箱</label>
                            <input 
                              type="number" 
                              placeholder="100"
                              value={newYardVazio}
                              onChange={(e) => setNewYardVazio(Number(e.target.value) || 0)}
                              className="w-full text-xs font-bold border border-gray-200 rounded p-1 bg-white"
                              min="0"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-slate-800">
                          <div>
                            <label className="text-[8px] text-gray-500 font-bold uppercase block mb-0.5">Porto / 港口</label>
                            <input 
                              type="number" 
                              placeholder="50"
                              value={newYardPorto}
                              onChange={(e) => setNewYardPorto(Number(e.target.value) || 0)}
                              className="w-full text-xs font-bold border border-gray-200 rounded p-1 bg-white"
                              min="0"
                            />
                          </div>
                          <div>
                            <label className="text-[8px] text-blue-500 font-bold uppercase block mb-0.5">Coleta / 待提</label>
                            <input 
                              type="number" 
                              placeholder="120"
                              value={newYardProntoColeta}
                              onChange={(e) => setNewYardProntoColeta(Number(e.target.value) || 0)}
                              className="w-full text-xs font-bold border border-gray-200 rounded p-1 bg-white"
                              min="0"
                            />
                          </div>
                          <div>
                            <label className="text-[8px] text-emerald-500 font-bold uppercase block mb-0.5">Deliv / 交付</label>
                            <input 
                              type="number" 
                              placeholder="80"
                              value={newYardDelivered}
                              onChange={(e) => setNewYardDelivered(Number(e.target.value) || 0)}
                              className="w-full text-xs font-bold border border-gray-200 rounded p-1 bg-white"
                              min="0"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[8px] text-rose-500 font-bold uppercase block mb-0.5">Prev Total / 上期总量 (TEU)</label>
                          <input 
                            type="number" 
                            placeholder="1000"
                            value={newYardPreviousTotal}
                            onChange={(e) => setNewYardPreviousTotal(Number(e.target.value) || 0)}
                            className="w-full text-xs font-bold border border-gray-200 rounded p-1 bg-white"
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
                <div className="space-y-4 text-slate-800 font-sans">
                  <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
                    <p className="text-[10px] text-emerald-800 font-medium leading-relaxed">
                      {language === 'zh' ? (
                        <span>在这里，您可以像在“Detalhamento de Área”中一样管理各个堆场的集装箱明细。</span>
                      ) : language === 'pt' ? (
                        <span>Gerencie o detalhamento do estoque físico por área. É o mesmo que preencher no detalhamento do painel principal, agora diretamente no controlador lateral.</span>
                      ) : (
                        <>
                          <span className="font-extrabold text-[10.5px] text-emerald-950 block">在这里，您可以像在“Detalhamento de Área”中一样管理各个堆场的集装箱明细。</span>
                          <span className="opacity-85 block mt-0.5">Gerencie o detalhamento do estoque físico por área. É o mesmo que preencher no detalhamento do painel principal, agora diretamente no controlador lateral.</span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* SELETOR DE ÁREA PARA O ESTOQUE */}
                  <div className="space-y-1.5 font-sans">
                    <label className="text-[9px] text-slate-500 font-extrabold uppercase block tracking-wider">
                      {language === 'bilingual' ? 'Selecionar Área / 选择堆场区域' : 'Selecionar Área'}
                    </label>
                    <select
                      value={stockSelectedYardKey}
                      onChange={(e) => setStockSelectedYardKey(e.target.value)}
                      className="w-full text-xs font-bold border border-gray-200 rounded-lg p-2 bg-slate-50 text-slate-800 outline-hidden"
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
                      <div className="grid grid-cols-3 gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-150 text-[10px]">
                        <div>
                          <span className="text-[8px] text-gray-400 font-extrabold uppercase block">{language === 'bilingual' ? 'Capacidade / 容量' : 'Capacidade'}</span>
                          <span className="font-mono font-bold text-gray-800">{(stockYard.capacity || 0).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-gray-400 font-extrabold uppercase block">{language === 'bilingual' ? 'Ocupação / 占用' : 'Ocupação'}</span>
                          <span className={`font-bold px-1 rounded ${
                            stockYardOcupacao >= 89 ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>{stockYardOcupacao}%</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-gray-400 font-extrabold uppercase block">{language === 'bilingual' ? 'Cheios / 重箱' : 'Cheios'}</span>
                          <span className="font-mono font-bold text-blue-600">{(stockYard.cheio || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* PESQUISA E FILTROS */}
                  <div className="space-y-1.5 bg-slate-50/50 p-2.5 rounded-lg border border-gray-150">
                    <input
                      type="text"
                      value={stockContainerSearch}
                      onChange={(e) => setStockContainerSearch(e.target.value)}
                      placeholder={language === 'bilingual' ? "Pesquisar contêiner... / 搜索箱号..." : "Pesquisar contêiner..."}
                      className="w-full text-xs font-bold border border-gray-200 rounded p-1.5 bg-white text-slate-850 outline-hidden focus:ring-1 focus:ring-emerald-500"
                    />
                    <div className="grid grid-cols-2 gap-1.5">
                      <select
                        value={stockContainerStatusFilter}
                        onChange={(e) => setStockContainerStatusFilter(e.target.value)}
                        className="text-[10px] font-bold border border-gray-200 rounded p-1 bg-white text-slate-700 outline-hidden"
                      >
                        <option value="ALL">Status: {language === 'bilingual' ? 'Todos / 全部' : 'Todos'}</option>
                        <option value="CHEIO">CHEIO / 重箱</option>
                        <option value="VAZIO">VAZIO / 空箱</option>
                      </select>
                      <select
                        value={stockContainerCategoryFilter}
                        onChange={(e) => setStockContainerCategoryFilter(e.target.value)}
                        className="text-[10px] font-bold border border-gray-200 rounded p-1 bg-white text-slate-700 outline-hidden"
                      >
                        <option value="ALL">Cat: {language === 'bilingual' ? 'Todos / 全部' : 'Todos'}</option>
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
                        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white max-h-[160px] overflow-y-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 text-[8.5px] uppercase tracking-wider text-slate-500 font-extrabold border-b border-gray-200 sticky top-0 bg-white">
                                <th className="p-1.5 pl-2">{language === 'bilingual' ? 'Contêiner / 箱号' : 'Contêiner'}</th>
                                <th className="p-1.5">{language === 'bilingual' ? 'Status / Size' : 'Status'}</th>
                                <th className="p-1.5 text-center">{language === 'bilingual' ? 'Ações / 操作' : 'Ações'}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-[10.5px]">
                              {activeContainers.map((c) => (
                                <tr key={c.id} className="hover:bg-slate-50 font-bold text-slate-850">
                                  <td className="p-1.5 pl-2 font-mono">
                                    <div className="tracking-tight">{c.id}</div>
                                    <div className="text-[8px] text-gray-400 font-sans tracking-tight">{c.category} • {c.vesselName || 'N/A'}</div>
                                  </td>
                                  <td className="p-1.5">
                                    <span className={`text-[8px] px-1 py-0.2 rounded font-extrabold uppercase ${
                                      c.status === 'CHEIO' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'
                                    }`}>{c.status}</span>
                                    <span className="text-[8px] text-slate-500 ml-1 font-mono">{c.size}</span>
                                  </td>
                                  <td className="p-1.5 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteContainer(c)}
                                      className="p-1 text-gray-400 hover:text-red-600 transition-colors rounded hover:bg-red-50 cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                              {activeContainers.length === 0 && (
                                <tr>
                                  <td colSpan={3} className="p-4 text-center text-slate-400 text-[10px]">
                                    {language === 'bilingual' ? 'Nenhum contêiner cadastrado. / 无已登记集装箱。' : 'Nenhum contêiner cadastrado.'}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* REGISTRO DE CONTÊINER NA ABA */}
                        <div className="p-3 bg-emerald-50/15 border border-emerald-100 rounded-xl space-y-2.5">
                          <h4 className="font-extrabold text-[10.5px] uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                            <Plus className="w-3.5 h-3.5" />
                            <span>{language === 'bilingual' ? 'Cadastrar Novo Contêiner / 登记新箱' : 'Cadastrar Novo Contêiner'}</span>
                          </h4>
                          <form onSubmit={handleAddContainer} className="space-y-2 text-[10px] font-sans">
                            <div>
                              <label className="text-[8px] uppercase tracking-wider text-slate-500 font-extrabold block mb-0.5">ID do Contêiner / 箱号</label>
                              <input
                                type="text"
                                required
                                value={newContainerId}
                                onChange={(e) => setNewContainerId(e.target.value)}
                                placeholder="Ex: BYDU1234567"
                                className="w-full border border-gray-200 rounded p-1.5 font-mono text-xs font-bold uppercase bg-white text-slate-800 outline-hidden focus:ring-1 focus:ring-emerald-500"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              <div>
                                <label className="text-[8px] uppercase tracking-wider text-slate-500 font-extrabold block mb-0.5">Tamanho / 尺寸</label>
                                <select
                                  value={newContainerSize}
                                  onChange={(e) => setNewContainerSize(e.target.value)}
                                  className="w-full border border-gray-200 rounded p-1 bg-white font-bold text-slate-800 outline-hidden"
                                >
                                  <option value="20' GP">20' GP</option>
                                  <option value="40' HC">40' HC</option>
                                  <option value="40' OT">40' OT</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[8px] uppercase tracking-wider text-slate-500 font-extrabold block mb-0.5">Status / 状态</label>
                                <select
                                  value={newContainerStatus}
                                  onChange={(e) => setNewContainerStatus(e.target.value as any)}
                                  className="w-full border border-gray-200 rounded p-1 bg-white font-bold text-slate-800 outline-hidden"
                                >
                                  <option value="CHEIO">CHEIO / 重箱</option>
                                  <option value="VAZIO">VAZIO / 空箱</option>
                                </select>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              <div>
                                <label className="text-[8px] uppercase tracking-wider text-slate-500 font-extrabold block mb-0.5">Categoria / 类别</label>
                                <select
                                  value={newContainerCategory}
                                  onChange={(e) => setNewContainerCategory(e.target.value as any)}
                                  className="w-full border border-gray-200 rounded p-1 bg-white font-bold text-slate-800 outline-hidden text-[9.5px]"
                                >
                                  <option value="GERAL">GERAL / 通用</option>
                                  <option value="PORTO">PORTO / 港口</option>
                                  <option value="PRONTO_COLETA">PRONTO / 待提</option>
                                  <option value="DELIVERED">DELIVERED / 交付</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[8px] uppercase tracking-wider text-slate-500 font-extrabold block mb-0.5">Navio / 船舶</label>
                                <select
                                  value={newContainerVessel}
                                  onChange={(e) => setNewContainerVessel(e.target.value)}
                                  className="w-full border border-gray-200 rounded p-1 bg-white font-bold text-slate-800 outline-hidden text-[9.5px]"
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
                              {language === 'bilingual' ? 'Adicionar Contêiner / 添加' : 'Adicionar Contêiner'}
                            </button>
                          </form>
                        </div>

                        {/* EXCEL IMPORT INTERFACE */}
                        <div className="p-3 bg-blue-50/15 border border-blue-100 rounded-xl space-y-2">
                          <h4 className="font-extrabold text-[10.5px] uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            <span>{language === 'bilingual' ? 'Planilha Excel / 导入表格' : 'Planilha Excel'}</span>
                          </h4>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              onClick={handleDownloadTemplate}
                              className="flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-1.5 rounded text-[10px] cursor-pointer"
                            >
                              <Download className="w-3 h-3" />
                              <span>{language === 'bilingual' ? 'Modelo / 模板' : 'Modelo'}</span>
                            </button>
                            <label className="flex items-center justify-center gap-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-1 px-1.5 rounded text-[10px] cursor-pointer text-center">
                              <Upload className="w-3 h-3" />
                              <span>{language === 'bilingual' ? 'Importar / 导入' : 'Importar'}</span>
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
                <div className="space-y-4 text-slate-800">
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <p className="text-[11px] text-blue-800 font-medium flex flex-col gap-1.5">
                      {language === 'zh' ? (
                        <span>在此配置显示在看板右侧表格中的预计到港船舶计划。</span>
                      ) : language === 'pt' ? (
                        <span>Configure a escala dos navios que aparecem na tabela à direita do painel.</span>
                      ) : (
                        <>
                          <span className="font-extrabold text-[12px] text-slate-900 block leading-normal">在此配置显示在看板右侧表格中的预计到港船舶计划。</span>
                          <span className="text-[10.5px] block opacity-85 leading-tight">Configure a escala dos navios que aparecem na tabela à direita do painel.</span>
                        </>
                      )}
                    </p>
                  </div>

                  <form onSubmit={addVessel} className="p-3 border border-dashed border-gray-200 rounded-lg bg-gray-50/50 space-y-2">
                    <span className="text-[10px] font-black text-gray-500 uppercase block">Novo Navio / 新到船舶</span>
                    <input 
                      type="text" 
                      placeholder="NOME DO NAVIO / 船名"
                      value={newVesselName}
                      onChange={(e) => setNewVesselName(e.target.value)}
                      className="w-full text-xs font-bold border border-gray-200 rounded p-1.5 bg-white uppercase text-slate-800"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        type="text" 
                        placeholder="ETA / 预计到港"
                        value={newVesselEta}
                        onChange={(e) => setNewVesselEta(e.target.value)}
                        className="w-full text-xs font-bold border border-gray-200 rounded p-1.5 bg-white text-slate-800"
                      />
                      <input 
                        type="number" 
                        placeholder="Qtd Cntrs / 箱量"
                        value={newVesselCntrs}
                        onChange={(e) => setNewVesselCntrs(Number(e.target.value))}
                        className="w-full text-xs font-bold border border-gray-200 rounded p-1.5 bg-white text-slate-800"
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
                      <span className="text-xs font-bold text-gray-700">Lista Cadastrada / 计划列表:</span>
                      <button
                        type="button"
                        onClick={autoSortVesselsByDate}
                        className="text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-extrabold px-2 py-1 rounded transition-all cursor-pointer flex items-center gap-1 uppercase"
                        title="Ordena os navios automaticamente com base na data do ETA / 基于预计到港日期自动排序"
                      >
                        <Sparkles className="w-3 h-3 text-[#d97706] animate-pulse" />
                        {language === 'zh' ? '按预计日期排序' : language === 'pt' ? 'Ordenar por Data' : 'Ordenar p/ Data / 自动排序'}
                      </button>
                    </div>

                    {vessels.map(v => (
                      <div key={v.id} className="p-2 border border-gray-100 rounded flex justify-between items-center text-xs bg-white">
                        <div className="flex-1">
                          <p className="font-extrabold text-gray-800">{v.name}</p>
                          <p className="text-[10px] text-gray-400 font-mono">ETA: {v.eta} | Qtd: {v.cntrs}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {/* Botões de Direção (Up/Down) */}
                          <button
                            type="button"
                            onClick={() => shiftVessel(v.id, 'up')}
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer transition-colors"
                            title="Mover para cima / 上移"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => shiftVessel(v.id, 'down')}
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer transition-colors"
                            title="Mover para baixo / 下移"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>

                          {/* Botão de Excluir */}
                          <button 
                            type="button"
                            onClick={() => deleteVessel(v.id)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded cursor-pointer transition-colors"
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
                <div className="space-y-4 text-slate-800">
                  
                  {/* COEFICIENTE DE BACKLOG */}
                  <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-105 space-y-2">
                    <p className="text-[11px] text-yellow-850 font-medium flex flex-col gap-1">
                      {language === 'zh' ? (
                        <span>通过调整下方的积压系数，模拟物流危机或快速消箱。</span>
                      ) : language === 'pt' ? (
                        <span>Simule crises logísticas ou reduções rápidas ajustando o multiplicador de backlog abaixo.</span>
                      ) : (
                        <>
                          <span className="font-extrabold text-[12px] text-amber-950 block">通过调整下方的积压系数，模拟物流危机或快速消箱。</span>
                          <span className="text-[10px] block opacity-85 leading-tight">Simule crises logísticas ou reduções rápidas ajustando o multiplicador de backlog abaixo.</span>
                        </>
                      )}
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button 
                        onClick={() => applyMultiplierToBacklog(1.3)} 
                        className="py-1 bg-red-100 text-red-700 font-bold rounded text-[10px] hover:bg-red-200 transition-all cursor-pointer font-sans"
                      >
                        Aumento / 增加 +30%
                      </button>
                      <button 
                        onClick={() => applyMultiplierToBacklog(0.7)} 
                        className="py-1 bg-green-100 text-green-700 font-bold rounded text-[10px] hover:bg-green-200 transition-all cursor-pointer font-sans"
                      >
                        Redução / 减少 -30%
                      </button>
                    </div>
                  </div>

                  {/* SEÇÃO CHART LEFT: SEMANAS / BACKLOG */}
                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-3.5">
                    <div className="flex items-center gap-1.5 border-b pb-1.5 border-slate-200">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-black text-slate-850 uppercase">
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
                      className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-2 text-[11px]"
                    >
                      <div className="font-extrabold text-[#111827] mb-1">
                        {language === 'zh' ? '➕ 添加新周数据' : '➕ Cadastrar nova semana'}
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <div className="space-y-0.5">
                          <label className="text-[9px] text-gray-400 font-bold uppercase block">Semana / 周</label>
                          <input 
                            type="text"
                            value={newWeekName}
                            onChange={(e) => setNewWeekName(e.target.value)}
                            required
                            placeholder="W30"
                            className="w-full text-center border rounded p-1 font-bold text-slate-805 bg-white text-slate-850 focus:ring-1 focus:ring-slate-400 outline-none"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[9px] text-gray-400 font-bold uppercase block">ATA / 到港</label>
                          <input 
                            type="number"
                            value={newWeekArrivals}
                            onChange={(e) => setNewWeekArrivals(Math.max(0, Number(e.target.value)))}
                            required
                            className="w-full text-center border rounded p-1 font-bold text-slate-805 bg-white text-slate-850 focus:ring-1 focus:ring-slate-400 outline-none"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[9px] text-gray-400 font-bold uppercase block">Backlog / 积压</label>
                          <input 
                            type="number"
                            value={newWeekBacklog}
                            onChange={(e) => setNewWeekBacklog(Math.max(0, Number(e.target.value)))}
                            required
                            className="w-full text-center border rounded p-1 font-bold text-slate-805 bg-white text-slate-850 focus:ring-1 focus:ring-slate-400 outline-none"
                          />
                        </div>
                      </div>
                      <button 
                        type="submit"
                        className="w-full py-1 bg-slate-800 hover:bg-slate-900 text-white rounded font-bold text-[10px] uppercase transition-all cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> {language === 'zh' ? '添加周数据' : 'Adicionar Semana'}
                      </button>
                    </form>

                    {/* Lista Sincronizada de Semanas */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">
                        {language === 'zh' ? '📚 已配置周列表 (可滚动/可编辑)' : '📚 Semanas Configuradas (Lista Editável/Rolável):'}
                      </span>
                      <div className="max-h-56 overflow-y-auto pr-1 border border-slate-200 rounded-lg p-1.5 bg-white space-y-1.5 shadow-inner">
                        {chartLeft.map((item, idx) => (
                          <div key={`edit-left-${idx}`} className="p-1.5 border border-slate-100 rounded bg-slate-50/50 flex flex-col gap-1 text-[11px]">
                            <div className="flex justify-between items-center bg-slate-200/50 px-1.5 py-0.5 rounded">
                              <span className="font-extrabold text-slate-800 font-mono">{item.week}</span>
                              <button 
                                type="button" 
                                onClick={() => handleDeleteChartLeft(idx)}
                                className="p-0.5 hover:bg-red-50 text-red-500 rounded transition-all cursor-pointer"
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
                                  className="w-16 text-center border rounded font-mono p-0.5 text-slate-800 bg-white font-bold"
                                />
                              </div>
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[9px] text-gray-400 font-bold uppercase">Backlog:</span>
                                <input 
                                  type="number"
                                  value={item.backlog}
                                  onChange={(e) => handleChartLeftChange(idx, 'backlog', e.target.value)}
                                  className="w-16 text-center border rounded font-mono p-0.5 text-slate-800 bg-white font-bold"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* SEÇÃO CHART RIGHT: ENTREGAS DIÁRIAS */}
                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-3.5">
                    <div className="flex items-center gap-1.5 border-b pb-1.5 border-slate-200">
                      <Database className="w-4 h-4 text-cyan-500" />
                      <span className="text-xs font-black text-slate-850 uppercase">
                        {language === 'zh' ? '每日出境交付数据配置 (图表2)' : language === 'pt' ? 'Configurar Entregas Diárias (Gráfico 2)' : 'Entregas Diárias (Gráfico 2)'}
                      </span>
                    </div>

                    {/* Cadastrar Nova Entrega Formulário */}
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleAddChartRight(newDeliveryDate, newDeliveryValue, newDeliveryType);
                      }}
                      className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-2 text-[11px]"
                    >
                      <div className="font-extrabold text-[#111827] mb-1">
                        {language === 'zh' ? '➕ 添加每日交付数据' : '➕ Cadastrar nova entrega'}
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <div className="space-y-0.5">
                          <label className="text-[9px] text-gray-400 font-bold uppercase block">{language === 'zh' ? '日期' : 'Data Ex.'}</label>
                          <input 
                            type="text"
                            value={newDeliveryDate}
                            onChange={(e) => setNewDeliveryDate(e.target.value)}
                            required
                            placeholder="21/05"
                            className="w-full text-center border rounded p-1 font-bold text-slate-805 bg-white text-slate-850 focus:ring-1 focus:ring-slate-400 outline-none"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[9px] text-gray-400 font-bold uppercase block">{language === 'zh' ? '交付值' : 'Qtd / Valor'}</label>
                          <input 
                            type="number"
                            value={newDeliveryValue}
                            onChange={(e) => setNewDeliveryValue(Math.max(0, Number(e.target.value)))}
                            required
                            className="w-full text-center border rounded p-1 font-bold text-slate-805 bg-white text-slate-850 focus:ring-1 focus:ring-slate-400 outline-none"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[9px] text-gray-400 font-bold uppercase block">{language === 'zh' ? '类型' : 'Tipo'}</label>
                          <select 
                            value={newDeliveryType}
                            onChange={(e) => setNewDeliveryType(e.target.value)}
                            className="w-full text-center border rounded p-1 font-bold text-slate-805 bg-white text-slate-850 focus:ring-1 focus:ring-slate-400 outline-none"
                          >
                            <option value="A">Tipo A (Stable)</option>
                            <option value="B">Tipo B (High)</option>
                            <option value="C">Tipo C (Normal)</option>
                          </select>
                        </div>
                      </div>
                      <button 
                        type="submit"
                        className="w-full py-1 bg-slate-800 hover:bg-slate-900 text-white rounded font-bold text-[10px] uppercase transition-all cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> {language === 'zh' ? '添加交付数据' : 'Adicionar Entrega'}
                      </button>
                    </form>

                    {/* Lista Sincronizada de Entregas Diárias */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">
                        {language === 'zh' ? '📚 已配置交付列表 (可滚动/可编辑)' : '📚 Entregas Cadastradas (Lista Editável/Rolável):'}
                      </span>
                      <div className="max-h-56 overflow-y-auto pr-1 border border-slate-200 rounded-lg p-1.5 bg-white space-y-1.5 shadow-inner">
                        {chartRight.map((item, idx) => (
                          <div key={`edit-right-${idx}`} className="p-1.5 border border-slate-100 rounded bg-slate-50/50 flex flex-col gap-1 text-[11px]">
                            <div className="flex justify-between items-center bg-slate-200/50 px-1.5 py-0.5 rounded">
                              <span className="font-extrabold text-indigo-900 font-mono">{item.date}</span>
                              <button 
                                type="button" 
                                onClick={() => handleDeleteChartRight(idx)}
                                className="p-0.5 hover:bg-red-50 text-red-500 rounded transition-all cursor-pointer"
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
                                  className="w-16 text-center border rounded font-mono p-0.5 text-slate-800 bg-white font-bold"
                                />
                              </div>
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[9px] text-gray-400 font-bold uppercase">{language === 'zh' ? '类型:' : 'Tipo:'}</span>
                                <select 
                                  value={item.type}
                                  onChange={(e) => handleChartRightChange(idx, 'type', e.target.value)}
                                  className="w-16 border rounded font-mono p-0.5 text-slate-850 bg-white font-bold text-center"
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

              {/* TAB: CONFIGURAÇÃO */}
              {activeTab === 'config' && (
                <div className="space-y-4 text-slate-800">
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 font-bold uppercase block">Título em PT / 葡萄牙语标题 (PT)</label>
                    <input 
                      type="text" 
                      value={slideTitlePT}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setSlideTitlePT(val);
                        updateGlobalDoc('slideTitlePT', val);
                      }}
                      className="w-full text-xs font-bold border border-gray-200 rounded p-1.5 bg-white text-slate-800 focus:ring-1 focus:ring-red-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 font-bold uppercase block">Título em Mandarim / 中文标题 (ZH)</label>
                    <input 
                      type="text" 
                      value={slideTitleZH}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSlideTitleZH(val);
                        updateGlobalDoc('slideTitleZH', val);
                      }}
                      className="w-full text-xs font-bold border border-gray-200 rounded p-1.5 bg-white text-slate-800 focus:ring-1 focus:ring-red-500 outline-none"
                    />
                  </div>

                  {/* SLIDE WIDTH CONTROL (SLIDER) */}
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] text-gray-500 font-bold uppercase block">Largura do Painel (Slide) / 看板演示宽度</label>
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
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-600 mt-1"
                    />
                    <span className="text-[9.5px] text-gray-400 block leading-tight">Escolha dimensões maiores para dar mais espaço e evitar cortes de layout.</span>
                  </div>

                  {/* SIDE PANEL WIDTH CONTROL (SLIDER) */}
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] text-gray-500 font-bold uppercase block">Largura do Painel de Edição / 侧栏编辑区宽度</label>
                      <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/20 px-2 py-0.5 rounded-md">{sidePanelWidth}px</span>
                    </div>
                    <input 
                      type="range" 
                      min="380" 
                      max="700" 
                      value={sidePanelWidth}
                      onChange={(e) => setSidePanelWidth(Number(e.target.value))}
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 mt-1"
                    />
                    <span className="text-[9.5px] text-gray-400 block leading-tight">Aumente para dar mais espaço à área de edição e evitar cortes ou quebras de linhas nas tabelas de dados. / 加宽侧框，防止编辑 data 被折叠遮挡。</span>
                  </div>

                   {/* CONFIGURAÇÃO DE AJUSTE AUTOMÁTICO DO CONTEÚDO */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between p-2.5 border border-emerald-100 rounded-lg bg-emerald-50/40 dark:bg-emerald-950/10 dark:border-emerald-900/30">
                      <div className="flex flex-col pr-2">
                        <span className="text-xs text-emerald-800 dark:text-emerald-450 font-bold">Auto-Ajustar à Tela / 自动自适应</span>
                        <span className="text-[9.5px] text-gray-400 dark:text-gray-500 leading-tight">Redimensiona o slide de forma automática para evitar cortes na tela.</span>
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
                      <label className="text-[10px] text-gray-500 font-bold uppercase block">Zoom do Conteúdo / 内容缩放</label>
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
                      className={`w-full h-1.5 rounded-lg appearance-none mt-1 ${autoFit ? 'bg-gray-100 dark:bg-slate-800 cursor-not-allowed accent-gray-400' : 'bg-gray-200 cursor-pointer accent-red-600'}`}
                    />
                    <span className="text-[9.5px] text-gray-400 block leading-tight">
                      {autoFit 
                        ? "Desative o Auto-Ajustar acima para alterar a escala de zoom manualmente."
                        : "Arraste para ajustar horizontal ou verticalmente a escala de zoom do painel."}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 font-bold uppercase block">Identificador do Rodapé / 页脚水印标识</label>
                    <input 
                      type="text" 
                      value={watermarkText}
                      onChange={(e) => {
                        const val = e.target.value;
                        setWatermarkText(val);
                        updateGlobalDoc('watermarkText', val);
                      }}
                      className="w-full text-xs font-bold border border-gray-200 rounded p-1.5 bg-white text-slate-800 focus:ring-1 focus:ring-red-500 outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between p-2 border border-gray-155 rounded-lg bg-gray-50/55">
                    <span className="text-xs text-gray-600 font-bold">Mostrar Identificador de Rodapé / 显示页脚水印</span>
                    <input 
                      type="checkbox" 
                      checked={showWatermark}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setShowWatermark(val);
                        updateGlobalDoc('showWatermark', val);
                      }}
                      className="rounded text-emerald-500 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                    />
                  </div>
                </div>
              )}

            </div>

            {/* ASSINATURA INFERIOR DO EDIT */}
            <div id="side-editor-footer" className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <span className="text-[10px] text-gray-400 font-semibold">BYD Slide Builder v2.5 (ZH Supported)</span>
              <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> CN/BR Connected
              </span>
            </div>

          </aside>
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
                  <span className="font-mono text-base font-black text-slate-700 dark:text-slate-150 mt-1">{selectedYard.capacity.toLocaleString()} <span className="text-xs text-gray-400 font-normal">TEU</span></span>
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
                    <span className="text-[10px] text-gray-400 font-bold">({(selectedYard.cheio + selectedYard.vazio).toLocaleString()} TEU)</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-[#1e293b] border dark:border-slate-800 shadow-xs flex flex-col justify-between">
                  <span className="text-[9px] text-gray-400 font-bold uppercase">{language === 'bilingual' ? 'Cheios / 重箱' : 'Cheios'}</span>
                  <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400 mt-1">{selectedYard.cheio.toLocaleString()} <span className="text-[10px] text-gray-400 font-normal">TEU</span></span>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-[#1e293b] border dark:border-slate-800 shadow-xs flex flex-col justify-between">
                  <span className="text-[9px] text-gray-400 font-bold uppercase">{language === 'bilingual' ? 'Vazios / 空箱' : 'Vazios'}</span>
                  <span className="font-mono text-sm font-bold text-gray-500 mt-1">{selectedYard.vazio.toLocaleString()} <span className="text-[10px] text-gray-400 font-normal">TEU</span></span>
                </div>
                <div className="col-span-2 md:col-span-1 p-2.5 rounded-lg bg-white dark:bg-[#1e293b] border dark:border-slate-800 shadow-xs flex flex-col justify-between">
                  <span className="text-[9px] text-gray-400 font-bold uppercase">{language === 'bilingual' ? 'Pronto Coleta / 待收箱' : 'Pronto Coleta'}</span>
                  <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-450 mt-1">{(selectedYard.prontoColeta || 0).toLocaleString()} <span className="text-[10px] text-gray-400 font-normal">TEU</span></span>
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
                    <table className="w-full text-left text-xs font-sans min-w-[500px]">
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
                          <th className="p-3 font-mono">{language === 'bilingual' ? 'Identificação / 箱号' : 'Identificação'}</th>
                          <th className="p-3 text-center">{language === 'bilingual' ? 'Tamanho / 尺寸' : 'Tamanho'}</th>
                          <th className="p-3 text-center">Status</th>
                          <th className="p-3 text-center">{language === 'bilingual' ? 'Categoria / 类别' : 'Categoria'}</th>
                          <th className="p-3">{language === 'bilingual' ? 'Navio / 船舶' : 'Navio'}</th>
                          <th className="p-3 text-right">{language === 'bilingual' ? 'Ação / 操作' : 'Ação'}</th>
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
                              <td className="p-3 font-mono font-black text-slate-900 dark:text-slate-100">{container.id}</td>
                              <td className="p-3 text-center font-mono">{container.size}</td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                  container.status === 'CHEIO' 
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' 
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                  }`}>
                                  {container.status === 'CHEIO' ? 'CHEIO / 重' : 'VAZIO / 空'}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                  container.category === 'PORTO' 
                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300' 
                                    : container.category === 'PRONTO_COLETA'
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                      : container.category === 'DELIVERED'
                                        ? 'bg-emerald-150 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                }`}>
                                  {container.category}
                                </span>
                              </td>
                              <td className="p-3 max-w-[130px] truncate text-xs font-extrabold text-slate-800 dark:text-slate-200">
                                {container.vesselName || "N/A"}
                              </td>
                              <td className="p-3 text-right">
                                <button 
                                  onClick={() => handleDeleteContainer(container)}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 p-1.5 rounded-lg transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredContainers.length === 0 && (
                          <tr>
                            <td colSpan={7} className="text-center py-8 text-gray-400">
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
