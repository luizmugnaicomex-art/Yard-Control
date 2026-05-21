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
  Globe
} from 'lucide-react';

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
}

export interface ChartLeftItem {
  week: string;
  arrivals: number;
  backlog: number;
}

export interface ChartRightItem {
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
  const [vessels, setVessels] = useState<Vessel[]>(() => JSON.parse(JSON.stringify(ORIGINAL_VESSELS)));
  const [chartLeft, setChartLeft] = useState<ChartLeftItem[]>(() => JSON.parse(JSON.stringify(ORIGINAL_CHART_LEFT)));
  const [chartRight, setChartRight] = useState<ChartRightItem[]>(() => JSON.parse(JSON.stringify(ORIGINAL_CHART_RIGHT)));
  
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
  
  // ESTADOS DE INTERFACE E EDIÇÃO
  const [isEditMode, setIsEditMode] = useState(true);
  const [activeTab, setActiveTab] = useState('yards'); // yards | vessels | charts | config
  const [widescreenMode, setWidescreenMode] = useState(true); // Trava a proporção de 16:9 de PPT
  const [slideWidth, setSlideWidth] = useState<number>(1480); // Default set wider (1480px) to prevent wrapping
  const [slideScale, setSlideScale] = useState<number>(1.0); // Content scaling zoom slider
  const [sidePanelWidth, setSidePanelWidth] = useState<number>(440); // Width of the side editor panel (Wild slider option)
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Estado para novo Navio
  const [newVesselName, setNewVesselName] = useState('');
  const [newVesselEta, setNewVesselEta] = useState('');
  const [newVesselCntrs, setNewVesselCntrs] = useState(1000);

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
    }
  };

  // HANDLERS DE EDIÇÃO DE PÁTIOS
  const handleYardChange = (key: string, field: keyof Yard, value: string) => {
    setYards(prev => {
      const updated = { ...prev };
      const numericValue = Number(value);
      const finalVal = isNaN(numericValue) ? 0 : (numericValue >= 0 ? numericValue : 0);
      
      if (updated[key]) {
        // We only edit numeric fields through UI inputs here
        updated[key] = {
          ...updated[key],
          [field]: finalVal
        };
      }
      return updated;
    });
  };

  // CÁLCULO DE OCUPAÇÃO DE PÁTIO
  const getYardOcupacao = (yard: Yard) => {
    const totalCap = yard.capacity || 1;
    const ocupado = yard.cheio + yard.vazio;
    return parseFloat(((ocupado / totalCap) * 100).toFixed(1));
  };

  // EXCLUIR NAVIO
  const deleteVessel = (id: number) => {
    setVessels(vessels.filter(v => v.id !== id));
  };

  // ADICIONAR NAVIO
  const addVessel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVesselName || !newVesselEta) return;
    const newV: Vessel = {
      id: Date.now(),
      name: newVesselName.toUpperCase(),
      eta: newVesselEta,
      cntrs: Number(newVesselCntrs) || 0
    };
    setVessels([...vessels, newV]);
    setNewVesselName('');
    setNewVesselEta('');
    setNewVesselCntrs(1000);
  };

  // ALTERAR DADO ESPECÍFICO DO GRÁFICO DA ESQUERDA (Backlog/ETA)
  const handleChartLeftChange = (index: number, field: keyof ChartLeftItem, value: string) => {
    const updated = [...chartLeft];
    const numValue = Number(value);
    const finalVal = isNaN(numValue) ? 0 : numValue;
    if (updated[index] && (field === 'backlog' || field === 'arrivals')) {
      updated[index] = {
        ...updated[index],
        [field]: finalVal
      } as ChartLeftItem;
    }
    setChartLeft(updated);
  };

  // MULTIPLICADOR EM MASSA DOS GRÁFICOS (Para simulações rápidas de estresse)
  const applyMultiplierToBacklog = (multiplier: number) => {
    setChartLeft(prev => prev.map(item => ({
      ...item,
      backlog: Math.round(item.backlog * multiplier)
    })));
  };

  // Retorna título dinâmico conforme a seleção de linguagem
  const getSlideTitle = () => {
    if (language === 'pt') return <span className="text-xl font-black">{slideTitlePT}</span>;
    if (language === 'zh') return <span className="text-2xl font-black font-sans tracking-wide">{slideTitleZH}</span>;
    return (
      <div className="flex flex-col text-left mb-1">
        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none mb-1">{slideTitlePT}</span>
        <span className="text-2xl font-black text-slate-950 dark:text-white font-sans tracking-tight leading-tight block">{slideTitleZH}</span>
      </div>
    );
  };

  const getSlideSubtitle = () => {
    if (language === 'pt') return slideSubtitlePT;
    if (language === 'zh') return slideSubtitleZH;
    return (
      <div className="flex flex-col text-left leading-normal mt-1 border-t border-gray-100 dark:border-gray-800/60 pt-1">
        <span className="text-[9.5px] text-gray-500 dark:text-gray-400 font-bold tracking-tight">{slideSubtitlePT}</span>
        <span className="text-[11.5px] text-gray-400 dark:text-gray-500 font-medium font-sans block">{slideSubtitleZH}</span>
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
            {/* Seletor de Idiomas */}
            <div className="bg-gray-100 p-1 rounded-lg flex items-center gap-1 border border-gray-200">
              <button 
                id="btn-lang-pt"
                onClick={() => setLanguage('pt')}
                className={`px-2.5 py-1 text-xs font-bold rounded flex items-center gap-1 transition-all ${language === 'pt' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-800'}`}
                title="Português"
              >
                🇧🇷 PT
              </button>
              <button 
                id="btn-lang-zh"
                onClick={() => setLanguage('zh')}
                className={`px-2.5 py-1 text-xs font-bold rounded flex items-center gap-1 transition-all ${language === 'zh' ? 'bg-white shadow text-red-600' : 'text-gray-500 hover:text-gray-800'}`}
                title="Mandarim (中文)"
              >
                🇨🇳 中文
              </button>
              <button 
                id="btn-lang-bilingual"
                onClick={() => setLanguage('bilingual')}
                className={`px-2.5 py-1 text-xs font-bold rounded flex items-center gap-1 transition-all ${language === 'bilingual' ? 'bg-white shadow text-emerald-700' : 'text-gray-500 hover:text-gray-800'}`}
                title="Bilíngue (Lado a Lado)"
              >
                🌐 PT / 中文
              </button>
            </div>

            {/* Alternar Proporção */}
            <button
              id="btn-toggle-widescreen"
              onClick={() => setWidescreenMode(!widescreenMode)}
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
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
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

      {/* BOTÃO FLUTUANTE PARA RETORNAR DO MODO APRESENTAÇÃO */}
      {!isEditMode && (
        <button
          id="btn-back-to-editor"
          onClick={() => setIsEditMode(true)}
          className="fixed bottom-6 right-6 z-50 bg-[#1e293b] text-white hover:bg-slate-800 px-4 py-3 rounded-full shadow-2xl flex items-center gap-2 font-semibold transition-all hover:scale-105 border border-slate-700 animate-bounce"
        >
          <Sliders className="w-5 h-5 text-emerald-400" />
          <span>Voltar ao Editor</span>
        </button>
      )}

      {/* ÁREA PRINCIPAL DA INTERFACE */}
      <main id="main-content-area" className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* VIEWPORT DO SLIDE (ESQUERDA) */}
        <div id="slide-viewport-container" className="flex-1 p-4 flex flex-col items-center justify-center overflow-y-auto">
          
          {/* CONTAINER DO SLIDE (COMPARTIMENTO DE TELA PPT) */}
          <div 
            id="slide-capture-area" 
            className={`
              w-full shadow-2xl rounded-2xl p-6 transition-all relative border overflow-hidden
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
              <div id="slide-header" className="flex justify-between items-start mb-4 border-b pb-3 border-dashed border-gray-200 dark:border-gray-800">
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

              {/* GRID DO PAINEL LOGÍSTICO COMPLETO */}
              <div id="slide-dashboard-grid" className={`grid grid-cols-12 gap-3 ${widescreenMode ? 'h-[calc(100%-85px)] overflow-hidden' : 'min-h-[660px]'}`}>
                
                {/* COLUNA ESQUERDA: PÁTIOS */}
                <div className="col-span-12 lg:col-span-8 flex flex-col gap-2.5">
                  
                  {/* LINHA 1 DE PÁTIOS (TECON & INTERMARITIMA) */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <YardCard yard={yards.tecon} ocupacao={getYardOcupacao(yards.tecon)} isEdit={isEditMode} theme={theme} t={t} language={language} renderLabel={renderLabel} />
                    <YardCard yard={yards.intermaritima} ocupacao={getYardOcupacao(yards.intermaritima)} isEdit={isEditMode} theme={theme} t={t} language={language} renderLabel={renderLabel} />
                  </div>

                  {/* LINHA 2 DE PÁTIOS (TPC & CLIA EMPORIO) */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <YardCard yard={yards.tpc} ocupacao={getYardOcupacao(yards.tpc)} isEdit={isEditMode} theme={theme} t={t} language={language} renderLabel={renderLabel} />
                    <YardCard yard={yards.clia} ocupacao={getYardOcupacao(yards.clia)} isEdit={isEditMode} theme={theme} t={t} language={language} renderLabel={renderLabel} />
                  </div>

                  {/* LINHA 3 DE PÁTIOS (CDEX, PONTUAL & BUFFER) */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <YardCard yard={yards.ag} ocupacao={getYardOcupacao(yards.ag)} isEdit={isEditMode} theme={theme} isSmall t={t} language={language} renderLabel={renderLabel} />
                    <YardCard yard={yards.cts} ocupacao={getYardOcupacao(yards.cts)} isEdit={isEditMode} theme={theme} isSmall t={t} language={language} renderLabel={renderLabel} />
                    <YardCard yard={yards.buffer} ocupacao={getYardOcupacao(yards.buffer)} isEdit={isEditMode} theme={theme} isSmall t={t} language={language} renderLabel={renderLabel} />
                  </div>

                </div>

                {/* COLUNA DIREITA: TABELA DE NAVIOS / ESCALA */}
                <div className="col-span-12 lg:col-span-4 flex flex-col h-full">
                  <div className={`p-3.5 rounded-xl flex-1 border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-100 shadow-sm'} flex flex-col justify-between`}>
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
                                <td className="py-2.5 font-extrabold text-gray-800 dark:text-gray-200 text-xs tracking-tight">{vessel.name}</td>
                                <td className="py-2.5 text-center text-gray-600 dark:text-gray-400 font-mono font-medium">{vessel.eta}</td>
                                <td className="py-2.5 text-right font-black text-blue-600 dark:text-blue-400 text-xs">{vessel.cntrs.toLocaleString()}</td>
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
                  <div className={`p-2.5 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 font-sans' : 'bg-white border-slate-100 shadow-sm font-sans'} flex flex-col justify-between h-[160px]`}>
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
                  <div className={`p-2.5 rounded-xl border ${theme === 'dark' ? 'bg-[#1e293b] border-slate-700 font-sans' : 'bg-white border-slate-100 shadow-sm font-sans'} flex flex-col justify-between h-[160px]`}>
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
                              {item.value > 210 && i % 4 === 0 && (
                                <text x={x} y={y - 3} fill={theme === 'dark' ? '#cbd5e1' : '#1e293b'} fontSize="6" fontWeight="black" textAnchor="middle" className="font-mono">{item.value}</text>
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
                  <div className="bg-red-50 p-3 rounded-lg border border-red-100 mb-2">
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

                  {(Object.entries(yards) as [string, Yard][]).map(([key, yard]) => (
                    <div key={key} className="p-3 border border-gray-100 rounded-lg bg-gray-50/50 hover:bg-gray-50 transition-all space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-xs text-gray-800">{yard.name}</span>
                        <span className="text-[10px] bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded uppercase">{yard.type}</span>
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
                    <span className="text-xs font-bold text-gray-700 block">Lista Cadastrada / 计划列表:</span>
                    {vessels.map(v => (
                      <div key={v.id} className="p-2 border border-gray-100 rounded flex justify-between items-center text-xs bg-white">
                        <div>
                          <p className="font-extrabold text-gray-800">{v.name}</p>
                          <p className="text-[10px] text-gray-400">ETA: {v.eta} | Qtd: {v.cntrs}</p>
                        </div>
                        <button 
                          onClick={() => deleteVessel(v.id)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded cursor-pointer animate-pulse"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: GRÁFICOS */}
              {activeTab === 'charts' && (
                <div className="space-y-4 text-slate-800">
                  <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 space-y-2">
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
                        className="py-1 bg-red-100 text-red-700 font-bold rounded text-[10px] hover:bg-red-200 transition-all cursor-pointer"
                      >
                        Aumento / 增加 +30%
                      </button>
                      <button 
                        onClick={() => applyMultiplierToBacklog(0.7)} 
                        className="py-1 bg-green-100 text-green-700 font-bold rounded text-[10px] hover:bg-green-200 transition-all cursor-pointer"
                      >
                        Redução / 减少 -30%
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-bold text-gray-700 block">Editar Picos Semanais / 编辑每周积压 (Backlog):</span>
                    {chartLeft.filter((_, idx) => [17, 18, 19, 20, 21, 22, 23, 24].includes(idx)).map((item, idx) => {
                      const realIndex = chartLeft.findIndex(i => i.week === item.week);
                      return (
                        <div key={`edit-left-${idx}`} className="flex gap-2 items-center justify-between text-xs border-b pb-1.5 border-gray-100">
                          <span className="font-black text-gray-600">{item.week}</span>
                          <div className="flex gap-1 items-center">
                            <span className="text-[10px] text-gray-400">Backlog:</span>
                            <input 
                              type="number"
                              value={item.backlog}
                              onChange={(e) => handleChartLeftChange(realIndex, 'backlog', e.target.value)}
                              className="w-16 text-center border rounded p-0.5 font-bold text-slate-800"
                            />
                          </div>
                        </div>
                      );
                    })}
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
                      onChange={(e) => setSlideTitlePT(e.target.value.toUpperCase())}
                      className="w-full text-xs font-bold border border-gray-200 rounded p-1.5 bg-white text-slate-800 focus:ring-1 focus:ring-red-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 font-bold uppercase block">Título em Mandarim / 中文标题 (ZH)</label>
                    <input 
                      type="text" 
                      value={slideTitleZH}
                      onChange={(e) => setSlideTitleZH(e.target.value)}
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
                      onChange={(e) => setSlideWidth(Number(e.target.value))}
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
                    <span className="text-[9.5px] text-gray-400 block leading-tight">Aumente para dar mais espaço à área de edição e evitar cortes ou quebras de linhas nas tabelas de dados. / 加宽侧框，防止编辑数据被折叠遮挡。</span>
                  </div>

                  {/* SLIDE CONTENT SCALE CONTROL (SLIDER) */}
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] text-gray-500 font-bold uppercase block">Zoom do Conteúdo / 内容缩放</label>
                      <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/20 px-2 py-0.5 rounded-md">{Math.round(slideScale * 100)}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.8" 
                      max="1.2" 
                      step="0.05"
                      value={slideScale}
                      onChange={(e) => setSlideScale(Number(e.target.value))}
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-600 mt-1"
                    />
                    <span className="text-[9.5px] text-gray-400 block leading-tight">Garante que todas as informações se encaixem perfeitamente sem cortes nas bordas.</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 font-bold uppercase block">Identificador do Rodapé / 页脚水印标识</label>
                    <input 
                      type="text" 
                      value={watermarkText}
                      onChange={(e) => setWatermarkText(e.target.value)}
                      className="w-full text-xs font-bold border border-gray-200 rounded p-1.5 bg-white text-slate-800 focus:ring-1 focus:ring-red-500 outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between p-2 border border-gray-155 rounded-lg bg-gray-50/55">
                    <span className="text-xs text-gray-600 font-bold">Mostrar Identificador de Rodapé / 显示页脚水印</span>
                    <input 
                      type="checkbox" 
                      checked={showWatermark}
                      onChange={(e) => setShowWatermark(e.target.checked)}
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
  yard: Yard;
  ocupacao: number;
  isEdit: boolean;
  isSmall?: boolean;
  theme: string;
  t: (key: string) => string;
  language: string;
  renderLabel: (key: string, colorClass?: string) => React.ReactNode;
}

function YardCard({ yard, ocupacao, isEdit, isSmall = false, theme, t, language, renderLabel }: YardCardProps) {
  const isEstouro = ocupacao > 100;

  let themeColor = "bg-blue-600 text-white"; 
  if (yard.type === 'WAREHOUSE') {
    themeColor = "bg-emerald-600 text-white";
  } else if (yard.type === 'BUFFER') {
    themeColor = "bg-amber-500 text-white";
  }

  return (
    <div className={`p-2.5 rounded-lg border relative transition-all ${
      theme === 'dark' 
        ? 'bg-[#1e293b] border-slate-800 text-white' 
        : 'bg-white border-slate-100 shadow-sm'
      } ${isEstouro ? 'ring-2 ring-red-500' : ''}`}
    >
      
      {/* Topo do Card */}
      <div className="flex justify-between items-start mb-1">
        <div>
          <h4 className="font-extrabold text-[12.5px] tracking-tight text-gray-900 dark:text-white uppercase leading-none">{yard.name}</h4>
          <div className="block mt-0.5">{renderLabel('activeSupplier', "text-gray-400 dark:text-gray-500 text-[8px]")}</div>
        </div>
        <span className={`text-[8.5px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${themeColor}`}>
          {yard.type}
        </span>
      </div>

      {/* Barra de Progresso / Ocupação */}
      <div className="mt-1">
        <div className="flex justify-between text-[10px] font-bold mb-0.5">
          <span className="text-gray-400">{renderLabel('usedCapacity', "text-gray-400 dark:text-gray-500")}</span>
          <span className={isEstouro ? 'text-red-500 font-black' : 'text-[#10b981] font-black'}>
            {ocupacao}% {isEstouro && (
              <span className="text-[9.5px] bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200 px-1 py-0.5 rounded ml-1 font-bold">
                {language === 'bilingual' ? '爆仓 / Estouro' : (language === 'zh' ? '爆仓' : 'Estouro')}
              </span>
            )}
          </span>
        </div>
        <div className="w-full bg-gray-100 dark:bg-slate-700 h-1 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${isEstouro ? 'bg-red-500' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`}
            style={{ width: `${Math.min(ocupacao, 100)}%` }}
          />
        </div>
      </div>

      {/* Dados Numéricos Centrais */}
      <div className="grid grid-cols-3 gap-0.5 mt-1.5 bg-gray-50/50 dark:bg-slate-800/40 p-1 rounded-md text-center">
        <div className="flex flex-col justify-between py-0.5">
          <span className="block leading-none">{renderLabel('totalCap', "text-gray-400 dark:text-gray-500")}</span>
          <span className="text-[11.5px] font-extrabold text-gray-700 dark:text-gray-200 block mt-0.5 leading-none font-mono">{yard.capacity.toLocaleString()}</span>
        </div>
        <div className="flex flex-col justify-between py-0.5 border-l border-r border-gray-100 dark:border-slate-800/60">
          <span className="block leading-none">{renderLabel('full', "text-blue-500 dark:text-blue-400")}</span>
          <span className="text-[11.5px] font-extrabold text-blue-600 dark:text-blue-400 block mt-0.5 leading-none font-mono">{yard.cheio.toLocaleString()}</span>
        </div>
        <div className="flex flex-col justify-between py-0.5">
          <span className="block leading-none">{renderLabel('empty', "text-slate-400 dark:text-slate-500")}</span>
          <span className="text-[11.5px] font-extrabold text-slate-500 dark:text-slate-400 block mt-0.5 leading-none font-mono">{yard.vazio.toLocaleString()}</span>
        </div>
      </div>

      {/* Sub-informações adicionais da parte de baixo */}
      <div className="grid grid-cols-3 gap-0.5 mt-1 text-[9px] text-gray-400 font-bold uppercase pt-0.5 leading-tight">
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
