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
  ChevronDown
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// FIREBASE INTEGRATION
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch 
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
}

export type YardsState = {
  [key: string]: Yard;
};

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
  tecon: { name: 'TECON', type: 'BONDED', capacity: 2000, cheio: 1643, vazio: 0, porto: 576, prontoColeta: 2253, delivered: 5535 },
  intermaritima: { name: 'INTERMARITIMA', type: 'BONDED', capacity: 800, cheio: 735, vazio: 0, porto: 252, prontoColeta: 671, delivered: 5948 },
  tpc: { name: 'TPC', type: 'BONDED', capacity: 1200, cheio: 843, vazio: 0, porto: 698, prontoColeta: 431, delivered: 3679 },
  clia: { name: 'CLIA EMPORIO', type: 'BONDED', capacity: 300, cheio: 109, vazio: 0, porto: 48, prontoColeta: 55, delivered: 371 },
  ag: { name: 'AG - INTER CDEX', type: 'WAREHOUSE', capacity: 2200, cheio: 844, vazio: 0, porto: 0, prontoColeta: 122, delivered: 144 },
  cts: { name: 'CTS - PONTUAL', type: 'WAREHOUSE', capacity: 1200, cheio: 0, vazio: 0, porto: 0, prontoColeta: 0, delivered: 0 },
  buffer: { name: 'BYD BUFFER', type: 'BUFFER', capacity: 800, cheio: 500, vazio: 483, porto: 0, prontoColeta: 0, delivered: 0 },
};

const ORIGINAL_VESSELS: Vessel[] = [
  { id: 1, name: 'MSC SAVONA', eta: '17/05/2026', cntrs: 935 },
  { id: 2, name: 'MSC LA SPEZIA', eta: '22/05/2026', cntrs: 1712 },
  { id: 3, name: 'MSC MARIACRISTINA', eta: '30/05/2026', cntrs: 1799 },
  { id: 4, name: 'MSC AURIGA', eta: '05/06/2026', cntrs: 1329 },
];

const ORIGINAL_CHART_LEFT: ChartLeftItem[] = [
  { week: 'W1', arrivals: 800, backlog: 1416 },
  { week: 'W2', arrivals: 1100, backlog: 858 },
  { week: 'W3', arrivals: 900, backlog: 335 },
  { week: 'W4', arrivals: 1200, backlog: 77 },
  { week: 'W5', arrivals: 1000, backlog: 0 },
  { week: 'W6', arrivals: 950, backlog: 0 },
  { week: 'W7', arrivals: 1300, backlog: 0 },
  { week: 'W8', arrivals: 1150, backlog: 0 },
  { week: 'W9', arrivals: 1700, backlog: 624 },
  { week: 'W10', arrivals: 1400, backlog: 203 },
  { week: 'W11', arrivals: 1550, backlog: 63 },
  { week: 'W12', arrivals: 1350, backlog: 0 },
  { week: 'W13', arrivals: 1680, backlog: 571 },
  { week: 'W14', arrivals: 1100, backlog: 139 },
  { week: 'W15', arrivals: 1950, backlog: 628 },
  { week: 'W16', arrivals: 2200, backlog: 1447 },
  { week: 'W17', arrivals: 1800, backlog: 1052 },
  { week: 'W18', arrivals: 2750, backlog: 2658 },
  { week: 'W19', arrivals: 2400, backlog: 3087 },
  { week: 'W20', arrivals: 2500, backlog: 2966 },
  { week: 'W21', arrivals: 3100, backlog: 4664 },
  { week: 'W22', arrivals: 3200, backlog: 5936 },
  { week: 'W23', arrivals: 2900, backlog: 5427 },
  { week: 'W24', arrivals: 2100, backlog: 4654 },
  { week: 'W25', arrivals: 1600, backlog: 3604 },
  { week: 'W26', arrivals: 1200, backlog: 2554 },
  { week: 'W27', arrivals: 850, backlog: 1504 },
  { week: 'W28', arrivals: 500, backlog: 454 },
  { week: 'W29', arrivals: 300, backlog: 0 },
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
  const [vessels, setVessels] = useState<Vessel[]>(() => JSON.parse(JSON.stringify(ORIGINAL_VESSELS)));
  const [chartLeft, setChartLeft] = useState<ChartLeftItem[]>(() => JSON.parse(JSON.stringify(ORIGINAL_CHART_LEFT)));
  const [chartRight, setChartRight] = useState<ChartRightItem[]>(() => JSON.parse(JSON.stringify(ORIGINAL_CHART_RIGHT)));
  
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
  const [widescreenMode, setWidescreenMode] = useState(true); // Trava a proporção de 16:9 de PPT
  const [slideWidth, setSlideWidth] = useState<number>(1480); // Default set wider (1480px) to prevent wrapping
  const [slideScale, setSlideScale] = useState<number>(1.0); // Content scaling zoom slider
  const [autoFit, setAutoFit] = useState<boolean>(true); // Auto-ajustar à tela para evitar corte de informações
  const [sidePanelWidth, setSidePanelWidth] = useState<number>(440); // Width of the side editor panel (Wild slider option)
  const [isDesktop, setIsDesktop] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [dbStatus, setDbStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');

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
        chartNote2
      });
    } catch (e) {
      console.warn("Primeira inicialização de config ignorada:", e);
    }
  };

  // 3. SINCRONIZADOR EM TEMPO REAL ON-SNAPSHOT DO FIRESTORE
  useEffect(() => {
    setDbStatus('connecting');
    
    // Yards
    const unsubYards = onSnapshot(collection(db, 'yards'), (snapshot) => {
      setDbStatus('online');
      if (snapshot.empty) {
        initializeYardsInDb();
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
    const unsubVessels = onSnapshot(collection(db, 'vessels'), (snapshot) => {
      if (snapshot.empty) {
        initializeVesselsInDb();
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
    const unsubChartLeft = onSnapshot(collection(db, 'chartLeft'), (snapshot) => {
      if (snapshot.empty) {
        initializeChartLeftInDb();
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
    const unsubChartRight = onSnapshot(collection(db, 'chartRight'), (snapshot) => {
      if (snapshot.empty) {
        initializeChartRightInDb();
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
      } else {
        initializeConfigInDb();
      }
    }, (err) => {
      console.warn("Falha ao ler config global do Firestore:", err);
    });

    return () => {
      unsubYards();
      unsubVessels();
      unsubChartLeft();
      unsubChartRight();
      unsubConfig();
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

  const getColHeader = (key: string) => {
    if (!TRANSLATIONS[key]) return key;
    if (language === 'pt') return TRANSLATIONS[key].pt;
    if (language === 'zh') return TRANSLATIONS[key].zh;
    return `${TRANSLATIONS[key].zh} (${TRANSLATIONS[key].pt})`;
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

  // RESETAR PARA DADOS DA IMAGEM ORIGINAL
  const resetToOriginal = () => {
    if (window.confirm("Deseja restaurar todos os dados originais da imagem capturada?")) {
      setYards(JSON.parse(JSON.stringify(ORIGINAL_YARDS)));
      setVessels(JSON.parse(JSON.stringify(ORIGINAL_VESSELS)));
      setChartLeft(JSON.parse(JSON.stringify(ORIGINAL_CHART_LEFT)));
      setChartRight(JSON.parse(JSON.stringify(ORIGINAL_CHART_RIGHT)));
      
      const defaultYardsComment = "Inserir comentários sobre a capacidade e ocupação dos pátios de forma bilíngue aqui. / 在此输入关于堆场容量、占用比率的双语说明。";
      const defaultVesselNote1 = "Escala regular de navios activa - Monitoramento detalhado das janelas de atracação. / 常规活跃船舶靠泊计划 - 详细监控和管理泊位窗口。";
      const defaultVesselNote2 = "Destaques operacionais dos navios (Ex: Prioridades de descarga BYD). / 船舶运营重点亮点 (例如：比亚迪重箱卸船优先顺序)。";
      const defaultChartNote1 = "Comentários sobre o Backlog Projetado vs Capacidade de Entrega Semanal. / 预测积压量与周度交付能力的对比分析说明。";
      const defaultChartNote2 = "Análise de gargalos e metas diárias garantidas (meta Gc de 140). / 关于每日进箱量与保证目标 (Gc 140) 的瓶颈分析和建议。";

      setYardsComment(defaultYardsComment);
      setVesselNote1(defaultVesselNote1);
      setVesselNote2(defaultVesselNote2);
      setChartNote1(defaultChartNote1);
      setChartNote2(defaultChartNote2);

      updateGlobalDoc('yardsComment', defaultYardsComment);
      updateGlobalDoc('vesselNote1', defaultVesselNote1);
      updateGlobalDoc('vesselNote2', defaultVesselNote2);
      updateGlobalDoc('chartNote1', defaultChartNote1);
      updateGlobalDoc('chartNote2', defaultChartNote2);
    }
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
      delivered: Number(newYardDelivered) || 0
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

    try {
      await setDoc(doc(db, 'yards', docId), newY);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `yards/${docId}`);
    }
  };

  // EXCLUIR PÁTIO / WAREHOUSE
  const deleteYard = async (key: string) => {
    if (!window.confirm("Deseja realmente excluir este pátio/warehouse? / 确定要删除该堆场吗？")) return;

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
  };

  // ALTERAR DADO ESPECÍFICO DO GRÁFICO DA ESQUERDA (Backlog/ETA)
  const handleChartLeftChange = async (index: number, field: keyof ChartLeftItem, value: string) => {
    const numValue = Number(value);
    const finalVal = isNaN(numValue) ? 0 : numValue;
    
    const updated = [...chartLeft];
    if (updated[index] && (field === 'backlog' || field === 'arrivals')) {
      updated[index] = {
        ...updated[index],
        [field]: finalVal
      } as ChartLeftItem;
    }
    setChartLeft(updated);

    const docId = String(index).padStart(3, '0');
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
          titlePT: "GRÁFICOS ANALÍTICOS E FLUXO DE DESEMPENHO",
          titleZH: "BYD 堆场运营负荷与进出箱趋势分析",
          subPT: "Backlog Projetado, Capacidade de Entrega, Fluxo Diário e Metas Garantidas",
          subZH: "预测周度积压量随时间波动趋势、每日工作交付吞吐能率与目标值趋势对比",
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
            <div className="bg-[#10b981] text-white p-2 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                SlideMaker Interativo <span className="text-xs bg-red-100 text-red-800 font-semibold px-2 py-0.5 rounded-full">BYD Logistics Global</span>
              </h1>
              <p className="text-xs text-gray-500">Gere e edite dados de pátio em tempo real para seu PowerPoint (Bilingue/Mandarim)</p>
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

            {/* Alternar Proporção */}
            <button
              id="btn-toggle-widescreen"
              onClick={() => { const val = !widescreenMode; setWidescreenMode(val); updateGlobalDoc('widescreenMode', val); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                widescreenMode 
                  ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Trava o tamanho na proporção de slide 16:9 widescreen"
            >
              <FileText className="w-4 h-4" />
              {widescreenMode ? "16:9 Slide" : "Livre"}
            </button>

            {/* Alternador de Tema do slide */}
            <button
              id="btn-toggle-theme"
              onClick={() => { const val = theme === 'light' ? 'dark' : 'light'; setTheme(val); updateGlobalDoc('theme', val); }}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all"
              title="Alternar Tema do Slide"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {/* Resetar Dados */}
            <button
              id="btn-reset-data"
              onClick={resetToOriginal}
              className="px-3 py-1.5 bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>

            {/* Salvar PDF */}
            <button
              id="btn-download-pdf"
              onClick={handleDownloadPDF}
              disabled={pdfStatus === 'rendering'}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm border flex items-center gap-1.5 transition-all transform hover:-translate-y-0.5 ${
                pdfStatus === 'rendering'
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : pdfStatus === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : pdfStatus === 'error'
                  ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                  : 'bg-gradient-to-r from-red-50 to-rose-50 text-red-750 border-red-200 hover:from-red-100 hover:to-rose-100'
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
                  ? (language === 'zh' ? 'PDF 已下载' : 'PDF Exportado!')
                  : pdfStatus === 'error'
                  ? (language === 'zh' ? '错误' : 'Erro!')
                  : (language === 'zh' ? '导出 PDF' : 'Salvar PDF')}
              </span>
            </button>

            {/* Modo Apresentação */}
            <button
              id="btn-presentation-mode"
              onClick={() => setIsEditMode(false)}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-lg text-xs font-bold shadow flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
            >
              <Tv className="w-4 h-4" />
              Apresentar
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
          
          {/* SELECIONADOR DE SLIDES - ESTILO PPT SLIDEMAKER */}
          <div className="w-full max-w-[1300px] flex items-center justify-between bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-2.5 mb-2.5 shadow-md select-none transition-all">
            <div className="flex items-center gap-1.5">
              <Tv className="w-4 h-4 text-red-500 animate-pulse" />
              <span className="text-[10px] font-black text-slate-800 dark:text-gray-200 uppercase tracking-widest block">
                {language === 'bilingual' ? 'Slides da Apresentação / 演示文稿幻灯片:' : language === 'zh' ? '演示文稿幻灯片:' : 'Slides da Apresentação:'}
              </span>
            </div>
            
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { index: 0, pt: "1. Painel Geral", zh: "1. 综合大盘" },
                { index: 1, pt: "2. Pátios", zh: "2. 纯堆场数据" },
                { index: 2, pt: "3. Navios", zh: "3. 纯船舶计划" },
                { index: 3, pt: "4. Gráficos", zh: "4. 纯运营图表" },
              ].map(s => (
                <button
                  key={s.index}
                  onClick={() => setCurrentSlide(s.index)}
                  className={`px-3 py-1 text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1 border rounded-lg ${
                    currentSlide === s.index
                      ? 'bg-red-600 text-white border-red-700 shadow shadow-red-300 dark:shadow-none'
                      : 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-150 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{language === 'zh' ? s.zh : language === 'pt' ? s.pt : `${s.pt} / ${s.zh}`}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-[10.5px] text-gray-400 font-mono font-bold">
              <button 
                onClick={() => setCurrentSlide(prev => (prev - 1 + 4) % 4)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded transition-all cursor-pointer text-gray-500 dark:text-gray-400"
                title="Slide Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>{currentSlide + 1} / 4</span>
              <button 
                onClick={() => setCurrentSlide(prev => (prev + 1) % 4)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded transition-all cursor-pointer text-gray-500 dark:text-gray-400"
                title="Próximo Slide"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="text-[9px] opacity-75 hidden xl:inline ml-1">(Alt + Setas para navegar)</span>
            </div>
          </div>
          
          {/* CONTAINER DO SLIDE (COMPARTIMENTO DE TELA PPT) */}
          <div 
            id="slide-capture-area" 
            className={`
              w-full shadow-2xl rounded-2xl transition-all relative border overflow-hidden
              ${widescreenMode ? 'p-3.5' : 'p-6'}
              ${theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-[#FAFCFF] border-slate-100'}
            `}
            style={{
              maxWidth: widescreenMode ? `${slideWidth}px` : '100%',
              aspectRatio: widescreenMode ? '16/9' : 'auto',
              minHeight: widescreenMode ? '720px' : 'auto',
            }}
          >
            {/* ZOOM SCALE CONTENT WRAPPER */}
            <div 
              style={{
                transform: `scale(${slideScale})`,
                transformOrigin: 'top left',
                width: `${100 / slideScale}%`,
                height: widescreenMode ? `${100 / slideScale}%` : 'auto',
              }}
              className="flex flex-col justify-between"
            >
              {/* CABEÇALHO DO SLIDE */}
              <div id="slide-header" className={`flex justify-between items-start border-b border-dashed border-gray-200 dark:border-gray-800 ${widescreenMode ? 'mb-2 pb-1.5' : 'mb-4 pb-3'}`}>
                <div className="w-4/5">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-red-600 dark:text-red-400 mb-1 tracking-widest uppercase">
                    <span>{language === 'bilingual' ? `${TRANSLATIONS.systemTitle.pt} | ${TRANSLATIONS.systemTitle.zh}` : t('systemTitle')}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                  </div>
                  <div className="focus:ring-0 focus:outline-none w-full">
                    {getSlideTitle()}
                  </div>
                  <div>{getSlideSubtitle()}</div>
                </div>

                {/* LOGO BYD estilizado em SVG */}
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1 font-bold tracking-widest text-lg text-red-600 dark:text-red-500">
                    <span className="border-2 border-red-600 dark:border-red-500 px-1 py-0.5 rounded text-xs font-black">BYD</span>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 font-sans tracking-normal">{t('logistics')}</span>
                  </div>
                  <span className="text-[8px] text-gray-400 mt-1 uppercase font-mono tracking-wider">{t('nationalOperations')}</span>
                </div>
              </div>

              {/* CONTEÚDO CONDICIONAL CONFORME O SLIDE ATIVO */}
              {currentSlide === 0 ? (
                <div id="slide-dashboard-grid" className={`grid grid-cols-12 gap-3 ${widescreenMode ? 'h-[calc(100%-85px)] overflow-hidden' : 'min-h-[660px]'}`}>
                  
                  {/* COLUNA ESQUERDA: PÁTIOS DINÂMICOS */}
                  <div className={`col-span-12 lg:col-span-8 flex flex-col ${widescreenMode ? 'gap-1.5' : 'gap-2.5'}`}>
                    
                    {/* PALHETA DE RENDERING DE PATIOS ALFANDEGADOS (BONDED) */}
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
                          />
                        ))}
                      </div>
                    )}

                    {/* PALHETA DE RENDERING DE RECINTOS NACIONAIS & CD (WAREHOUSE) */}
                    {warehouseYards.length > 0 && (
                      <div className={`grid grid-cols-3 ${widescreenMode ? 'gap-1.5' : 'gap-2.5'}`}>
                        {warehouseYards.map(([key, yard]) => (
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
                          />
                        ))}
                      </div>
                    )}

                    {/* PALHETA DE RENDERING DE BUFFERS */}
                    {bufferYards.length > 0 && (
                      <div className={`grid grid-cols-3 ${widescreenMode ? 'gap-1.5' : 'gap-2.5'}`}>
                        {bufferYards.map(([key, yard]) => (
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
                          />
                        ))}
                      </div>
                    )}

                  </div>

                  {/* COLUNA DIREITA: TABELA DE NAVIOS / ESCALA */}
                  <div className="col-span-12 lg:col-span-4 flex flex-col h-full">
                    <div className={`p-2.5 rounded-xl flex-1 border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-100 shadow-sm'} flex flex-col justify-between`}>
                      <div>
                        <div className="flex items-center justify-between border-b pb-1.5 mb-2 border-gray-100 dark:border-slate-800">
                          <h3 className="font-extrabold text-xs flex items-center gap-2 text-[#2563eb] tracking-tight">
                            <Ship className="w-4 h-4" /> {language === 'bilingual' ? '活跃船舶靠泊计划 (ETA)' : t('vesselSchedule')}
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

                  {/* SEÇÃO INFERIOR: GRÁFICOS LADO A LADO */}
                  <div className="col-span-12 grid grid-cols-1 lg:grid-cols-2 gap-3.5 mt-1">
                    
                    {/* GRÁFICO 1: BACKLOG E CAPACIDADE */}
                    <div className={`p-2 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 font-sans' : 'bg-white border-slate-100 shadow-sm font-sans'} flex flex-col justify-between ${widescreenMode ? 'h-[200px]' : 'h-[220px]'}`}>
                      <div className="flex justify-between items-center mb-0.5">
                        <h4 className="text-[10px] font-black text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> {getChartLeftTitle()}
                        </h4>
                        <div className="flex gap-2 text-[8px] sm:text-[9px] font-bold">
                          <span className="flex items-center gap-1 text-slate-800 dark:text-slate-200"><span className="w-1.5 h-1.5 bg-slate-800 dark:bg-slate-400 inline-block rounded-sm"></span>{language === 'bilingual' ? '到港 / ATA' : 'ATA'}</span>
                          <span className="flex items-center gap-1 text-emerald-500">
                            <span className="w-1.5 h-0.5 border-t border-emerald-500 border-dashed inline-block"></span>
                            {language === 'pt' ? 'Capacidade (210/dia)' : (language === 'zh' ? '交付能力 (210/天)' : '交付 / Capacidade (210/d)')}
                          </span>
                          <span className="flex items-center gap-1 text-red-500">
                            <span className="w-1.5 h-1.5 bg-red-500 inline-block rounded-full"></span>
                            {language === 'pt' ? 'Backlog' : (language === 'zh' ? '预测积压' : '积压 / Backlog')}
                          </span>
                        </div>
                      </div>

                      <div className="relative flex-1 w-full pt-1">
                        <svg className="w-full h-full" viewBox="0 0 600 120" preserveAspectRatio="none">
                          <line x1="30" y1="100" x2="580" y2="100" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="3 3" />
                          <line x1="30" y1="65" x2="580" y2="65" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="3 3" />
                          <line x1="30" y1="30" x2="580" y2="30" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="3 3" />
                          
                          <line x1="30" y1="80" x2="580" y2="80" stroke="#10b981" strokeWidth="1" strokeDasharray="4 4" />

                          {chartLeft.map((item, i) => {
                            const x = 35 + i * (540 / (chartLeft.length - 1));
                            const barHeight = (item.arrivals / 6000) * 85;
                            const y = 100 - barHeight;
                            return (
                              <rect 
                                key={i}
                                x={x - 2.5} 
                                y={y} 
                                width="5" 
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
                            
                            const picosDesejados = ['W1', 'W2', 'W18', 'W21', 'W22', 'W23', 'W24', 'W25', 'W26', 'W27', 'W28'];
                            if (picosDesejados.includes(item.week) && item.backlog > 0) {
                              return (
                                <g key={`cl-${i}`}>
                                  <circle cx={x} cy={y} r="2.5" fill="#ef4444" stroke="#fff" strokeWidth="0.5" />
                                  <text x={x} y={y - 4} fill="#ef4444" fontSize="6.5" fontWeight="black" textAnchor="middle" className="font-mono">{item.backlog}</text>
                                </g>
                              );
                            }
                            return null;
                          })}

                          {chartLeft.map((item, i) => {
                            if (i % 2 === 0 || i === chartLeft.length - 1) {
                              const x = 35 + i * (540 / (chartLeft.length - 1));
                              return (
                                <text key={`cl-lbl-${i}`} x={x} y="112" fill="#94a3b8" fontSize="6.5" textAnchor="middle" fontWeight="bold" className="font-mono">{item.week}</text>
                              );
                            }
                            return null;
                          })}
                        </svg>
                      </div>
                    </div>

                    {/* GRÁFICO 2: ENTRADAS DIÁRIAS */}
                    <div className={`p-2 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 font-sans' : 'bg-white border-slate-100 shadow-sm font-sans'} flex flex-col justify-between ${widescreenMode ? 'h-[200px]' : 'h-[220px]'}`}>
                      <div className="flex justify-between items-center mb-0.5">
                        <h4 className="text-[10px] font-black text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Database className="w-3.5 h-3.5 text-cyan-500" /> {getChartRightTitle()}
                        </h4>
                        <div className="flex gap-1.5 text-[8px] sm:text-[9px] font-bold">
                          <span className="flex items-center gap-1 text-emerald-500"><span className="w-1.5 h-1.5 bg-[#059669] inline-block rounded-sm"></span>{language === 'bilingual' ? '高效 / High' : t('opHigh')}</span>
                          <span className="flex items-center gap-1 text-indigo-500"><span className="w-1.5 h-1.5 bg-[#6366f1] inline-block rounded-sm"></span>{language === 'bilingual' ? '稳定 / Stable' : t('opStable')}</span>
                          <span className="flex items-center gap-1 text-[#f59e0b]"><span className="w-1.5 h-0.5 border-t border-[#f59e0b] border-dashed inline-block"></span>{language === 'bilingual' ? '目标 / Gc (140)' : t('metaGc')}</span>
                        </div>
                      </div>

                      <div className="relative flex-1 w-full pt-1">
                        <svg className="w-full h-full" viewBox="0 0 600 120" preserveAspectRatio="none">
                          <line x1="30" y1="100" x2="580" y2="100" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="3 3" />
                          <line x1="30" y1="65" x2="580" y2="65" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="3 3" />
                          <line x1="30" y1="30" x2="580" y2="30" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="3 3" />

                          <line x1="30" y1="67" x2="580" y2="67" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 4" />
                          <text x="582" y="70" fill="#f59e0b" fontSize="6.5" fontWeight="bold">Gc</text>

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
                                  x={x - 1.5} 
                                  y={y} 
                                  width="3" 
                                  height={barHeight} 
                                  fill={barColor} 
                                  rx="0.5"
                                />
                                {item.value > 0 && (
                                  <text 
                                    x={x} 
                                    y={y - 3} 
                                    fill={theme === 'dark' ? '#cbd5e1' : '#1e293b'} 
                                    fontSize="5" 
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
                                <text key={`cr-lbl-${i}`} x={x} y="112" fill="#94a3b8" fontSize="6" textAnchor="middle" fontWeight="bold">{item.date}</text>
                              );
                            }
                            return null;
                          })}
                        </svg>
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
                          />
                        ))}
                      </div>
                    )}
                    {warehouseYards.length > 0 && (
                      <div className={`grid grid-cols-3 ${widescreenMode ? 'gap-1.5' : 'gap-2.5'}`}>
                        {warehouseYards.map(([key, yard]) => (
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
                          />
                        ))}
                      </div>
                    )}
                    {bufferYards.length > 0 && (
                      <div className={`grid grid-cols-3 ${widescreenMode ? 'gap-1.5' : 'gap-2.5'}`}>
                        {bufferYards.map(([key, yard]) => (
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
                    <div className={`p-3.5 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 font-sans' : 'bg-white border-slate-100 shadow-sm font-sans'} flex flex-col justify-between h-[235px]`}>
                      <div className="flex justify-between items-center mb-1">
                        <h4 className="text-[11px] font-black text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4 text-emerald-500" /> {getChartLeftTitle()}
                        </h4>
                        <div className="flex gap-2 text-[9px] font-bold">
                          <span className="flex items-center gap-1 text-slate-850 dark:text-slate-200"><span className="w-1.5 h-1.5 bg-slate-805 dark:bg-slate-400 inline-block rounded-sm"></span>{language === 'bilingual' ? '到港 / ATA' : 'ATA'}</span>
                          <span className="flex items-center gap-1 text-emerald-500">
                            <span className="w-1.5 h-0.5 border-t border-emerald-500 border-dashed inline-block"></span>
                            {language === 'pt' ? 'Capacidade (210/dia)' : (language === 'zh' ? '交付能力 (210/天)' : '交付 / Capacidade (210/d)')}
                          </span>
                          <span className="flex items-center gap-1 text-red-500">
                            <span className="w-1.5 h-1.5 bg-red-500 inline-block rounded-full"></span>
                            {language === 'pt' ? 'Backlog' : (language === 'zh' ? '预测积压' : '积压 / Backlog')}
                          </span>
                        </div>
                      </div>

                      <div className="relative flex-1 w-full pt-1.5">
                        <svg className="w-full h-full" viewBox="0 0 600 120" preserveAspectRatio="none">
                          <line x1="30" y1="100" x2="580" y2="100" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="3 3" />
                          <line x1="30" y1="65" x2="580" y2="65" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="3 3" />
                          <line x1="30" y1="30" x2="580" y2="30" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="3 3" />
                          <line x1="30" y1="80" x2="580" y2="80" stroke="#10b981" strokeWidth="1" strokeDasharray="4 4" />

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
                            const picosDesejados = ['W1', 'W2', 'W18', 'W21', 'W22', 'W23', 'W24', 'W25', 'W26', 'W27', 'W28'];
                            if (picosDesejados.includes(item.week) && item.backlog > 0) {
                              return (
                                <g key={`cl-${i}`}>
                                  <circle cx={x} cy={y} r="3" fill="#ef4444" stroke="#fff" strokeWidth="0.5" />
                                  <text x={x} y={y - 4} fill="#ef4444" fontSize="7" fontWeight="black" textAnchor="middle" className="font-mono">{item.backlog}</text>
                                </g>
                              );
                            }
                            return null;
                          })}

                          {chartLeft.map((item, i) => {
                            if (i % 2 === 0 || i === chartLeft.length - 1) {
                              const x = 35 + i * (540 / (chartLeft.length - 1));
                              return (
                                <text key={`cl-lbl-${i}`} x={x} y="112" fill="#94a3b8" fontSize="7" textAnchor="middle" fontWeight="bold" className="font-mono">{item.week}</text>
                              );
                            }
                            return null;
                          })}
                        </svg>
                      </div>
                    </div>

                    {/* Gráfico 2 Expandido */}
                    <div className={`p-3.5 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 font-sans' : 'bg-white border-slate-100 shadow-sm font-sans'} flex flex-col justify-between h-[235px]`}>
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
                        <svg className="w-full h-full" viewBox="0 0 600 120" preserveAspectRatio="none">
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
                                <text key={`cr-lbl-${i}`} x={x} y="112" fill="#94a3b8" fontSize="6.5" textAnchor="middle" fontWeight="bold">{item.date}</text>
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
                <span className="text-[9px] font-mono tracking-widest text-slate-500 dark:text-slate-400">
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
            
            {/* TABS DE SELEÇÃO */}
            <div className="flex border-b border-gray-200 bg-gray-50 text-slate-700">
              <button 
                id="tab-btn-yards"
                onClick={() => setActiveTab('yards')}
                className={`flex-1 py-3 text-[11px] font-extrabold border-b-2 text-center cursor-pointer transition-all ${activeTab === 'yards' ? 'border-red-500 text-red-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                {language === 'zh' ? '堆场' : language === 'pt' ? 'Pátios' : 'Pátios / 堆场'}
              </button>
              <button 
                id="tab-btn-vessels"
                onClick={() => setActiveTab('vessels')}
                className={`flex-1 py-3 text-[11px] font-extrabold border-b-2 text-center cursor-pointer transition-all ${activeTab === 'vessels' ? 'border-red-500 text-red-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                {language === 'zh' ? '船期' : language === 'pt' ? 'Navios' : 'Navios / 船期'}
              </button>
              <button 
                id="tab-btn-charts"
                onClick={() => setActiveTab('charts')}
                className={`flex-1 py-3 text-[11px] font-extrabold border-b-2 text-center cursor-pointer transition-all ${activeTab === 'charts' ? 'border-red-500 text-red-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                {language === 'zh' ? '图表' : language === 'pt' ? 'Gráficos' : 'Gráficos / 图表'}
              </button>
              <button 
                id="tab-btn-config"
                onClick={() => setActiveTab('config')}
                className={`flex-1 py-3 text-[11px] font-extrabold border-b-2 text-center cursor-pointer transition-all ${activeTab === 'config' ? 'border-red-500 text-red-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                {language === 'zh' ? '配置' : language === 'pt' ? 'Config.' : 'Config. / 配置'}
              </button>
            </div>

            {/* CONTEÚDO DA TAB SELECIONADA */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* TAB: PÁTIOS */}
              {activeTab === 'yards' && (
                <div className="space-y-4">
                  <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                    <p className="text-[11px] text-red-800 font-medium flex flex-col gap-1.5">
                      {language === 'zh' ? (
                        <span>请在下方配置您的实际堆场数据。系统会自动重新计算占用比例并触发超负荷“爆仓”警报！</span>
                      ) : language === 'pt' ? (
                        <span>Configure os valores reais dos seus pátios abaixo. O painel recalcula as porcentagens e status de "Estouro" automaticamente!</span>
                      ) : (
                        <>
                          <span className="font-extrabold text-[12px] text-red-950 block leading-normal">请在下方配置您的实际堆场数据。系统会自动重新计算占用比例并触发超负荷“爆仓”警报！</span>
                          <span className="text-[10.5px] block opacity-85 leading-tight">Configure os valores reais dos seus pátios abaixo. O painel recalcula as porcentagens e status de "Estouro" automaticamente!</span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* FORMULÁRIO PARA ADICIONAR NOVO PÁTIO/WAREHOUSE */}
                  <form onSubmit={addYard} className="p-3 border border-dashed border-red-200 rounded-lg bg-red-50/20 space-y-2">
                    <span className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase block flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5" /> 
                      {language === 'bilingual' ? 'Novo Pátio ou CD / 新建堆场或仓库' : language === 'zh' ? '新建堆场或仓库' : 'Novo Pátio ou CD'}
                    </span>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <input 
                          type="text" 
                          placeholder="NOME / 名称"
                          value={newYardName}
                          onChange={(e) => setNewYardName(e.target.value)}
                          className="w-full text-xs font-bold border border-gray-200 rounded p-1.5 bg-white uppercase text-slate-800"
                          required
                        />
                      </div>
                      <div>
                        <select 
                          value={newYardType}
                          onChange={(e) => setNewYardType(e.target.value)}
                          className="w-full text-xs font-bold border border-gray-200 rounded p-1.5 bg-white text-slate-850 uppercase"
                        >
                          <option value="BONDED">BONDED / 关内</option>
                          <option value="WAREHOUSE">CD & WAREHOUSE / 仓库</option>
                          <option value="BUFFER">BUFFER / 缓冲区</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-slate-800">
                      <div>
                        <label className="text-[8px] text-gray-400 font-bold uppercase block">Capacity / 容积</label>
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
                        <label className="text-[8px] text-blue-500 font-bold uppercase block">Cheio / 重箱</label>
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
                        <label className="text-[8px] text-slate-400 font-bold uppercase block">Vazio / 空箱</label>
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
                        <label className="text-[8px] text-gray-400 font-bold uppercase block">Porto / 港口</label>
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
                        <label className="text-[8px] text-blue-500 font-bold uppercase block">Coleta / 待提</label>
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
                        <label className="text-[8px] text-emerald-500 font-bold uppercase block">Deliv / 交付</label>
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

                    <button 
                      type="submit"
                      className="w-full bg-[#ef4444] hover:bg-red-700 text-white font-extrabold text-[10px] py-1.5 rounded uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      {language === 'zh' ? '添加堆场' : language === 'pt' ? 'Adicionar Pátio' : 'Adicionar Pátio / 添加'}
                    </button>
                  </form>

                  {(Object.entries(yards) as [string, Yard][]).map(([key, yard]) => (
                    <div key={key} className="p-3 border border-gray-100 rounded-lg bg-gray-50/50 hover:bg-gray-50 transition-all space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-xs text-gray-800">{yard.name}</span>
                          <span className="text-[10px] bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded uppercase">{yard.type}</span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => deleteYard(key)}
                          title="Excluir Pátio / 删除堆场"
                          className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-slate-800">
                        <div>
                          <label className="text-[9px] text-gray-400 font-bold uppercase block mb-1">Total Cap / 总容量</label>
                          <input 
                            type="number" 
                            value={yard.capacity} 
                            onChange={(e) => handleYardChange(key, 'capacity', e.target.value)}
                            className="w-full text-xs font-bold border border-gray-200 rounded p-1 bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-blue-500 font-bold uppercase block mb-1">Cheio / 重箱</label>
                          <input 
                            type="number" 
                            value={yard.cheio} 
                            onChange={(e) => handleYardChange(key, 'cheio', e.target.value)}
                            className="w-full text-xs font-bold border border-gray-200 rounded p-1 bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Vazio / 空箱</label>
                          <input 
                            type="number" 
                            value={yard.vazio} 
                            onChange={(e) => handleYardChange(key, 'vazio', e.target.value)}
                            className="w-full text-xs font-bold border border-gray-200 rounded p-1 bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-gray-400 font-bold uppercase block mb-1">Porto / 港口</label>
                          <input 
                            type="number" 
                            value={yard.porto} 
                            onChange={(e) => handleYardChange(key, 'porto', e.target.value)}
                            className="w-full text-xs font-bold border border-gray-200 rounded p-1 bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-blue-500 font-bold uppercase block mb-1">Pronto Coleta / 待提</label>
                          <input 
                            type="number" 
                            value={yard.prontoColeta} 
                            onChange={(e) => handleYardChange(key, 'prontoColeta', e.target.value)}
                            className="w-full text-xs font-bold border border-gray-200 rounded p-1 bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-emerald-500 font-bold uppercase block mb-1">Delivered / 交付</label>
                          <input 
                            type="number" 
                            value={yard.delivered} 
                            onChange={(e) => handleYardChange(key, 'delivered', e.target.value)}
                            className="w-full text-xs font-bold border border-gray-200 rounded p-1 bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
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
}

function YardCard({ yard, ocupacao, isEdit, isSmall = false, theme, t, language, renderLabel, widescreenMode = false }: YardCardProps) {
  const isRed = ocupacao >= 89;
  const isYellow = ocupacao > 65 && ocupacao < 89;

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
    <div className={`rounded-lg border relative transition-all ${
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
          <span className="text-gray-400">{renderLabel('usedCapacity', "text-gray-400 dark:text-gray-500")}</span>
          <span className={textStatusColor}>
            {ocupacao}% {isRed && (
              <span className="text-[9.5px] bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200 px-1 py-0.5 rounded ml-1 font-bold">
                {ocupacao >= 100
                  ? (language === 'bilingual' ? '爆仓 / Estouro' : (language === 'zh' ? '爆仓' : 'Estouro'))
                  : (language === 'bilingual' ? '过载 / Crítico' : (language === 'zh' ? '过载' : 'Crítico'))
                }
              </span>
            )}
            {isYellow && (
              <span className="text-[9.5px] bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200 px-1 py-0.5 rounded ml-1 font-bold">
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
        <div className="text-left truncate">
          <span className="text-gray-400">{language === 'bilingual' ? '港口/Porto' : (language === 'zh' ? '港口' : 'Porto')}:</span> <span className="text-gray-700 dark:text-gray-200 font-extrabold leading-none">{yard.porto}</span>
        </div>
        <div className="text-center truncate">
          <span className="text-gray-400">{language === 'bilingual' ? '待提/Coleta' : (language === 'zh' ? '待提' : 'Coleta')}:</span> <span className="text-blue-500 font-bold leading-none">{yard.prontoColeta}</span>
        </div>
        <div className="text-right truncate">
          <span className="text-gray-400">{language === 'bilingual' ? '已交付/DL' : (language === 'zh' ? '已交付' : 'Deliv.')}:</span> <span className="text-emerald-500 font-bold leading-none">{yard.delivered}</span>
        </div>
      </div>

    </div>
  );
}
