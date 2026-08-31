const fs = require("fs");
let code = fs.readFileSync("src/App.tsx", "utf8");

// 1. Replace YardCard interface and component
const oldYardCardStart = "interface YardCardProps {";
const oldYardCardEnd = "export default function App() {";

const newYardCardCode = `interface YardCardProps {
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
      className={\`rounded-xl border transition-all select-none relative overflow-hidden flex flex-col justify-between \${
        isEdit
          ? "p-3 border-amber-500/80 bg-amber-50/15 dark:bg-amber-950/20 shadow-md ring-1 ring-amber-400/50"
          : \`\${theme === "dark" ? "bg-[#1e293b] border-slate-700 hover:border-slate-500 shadow-sm" : "bg-white border-slate-200/90 hover:border-slate-300 shadow-xs hover:shadow-md"} cursor-pointer p-3\`
      } \${isSmall ? "min-h-[140px]" : "min-h-[160px]"}\`}
    >
      <div>
        {/* HEADER */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={\`p-1.5 rounded-lg shrink-0 \${
              yard.type === "BONDED"
                ? "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400"
                : yard.type === "BUFFER"
                ? "bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400"
                : "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
            }\`}>
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
            <span className={\`px-2 py-0.5 rounded-full font-mono text-[10px] font-black tracking-tight \${
              isHighOcc
                ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                : isMedOcc
                ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
            }\`}>
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
            className={\`h-full transition-all duration-500 \${
              isHighOcc
                ? "bg-rose-500"
                : isMedOcc
                ? "bg-amber-500"
                : "bg-emerald-500"
            }\`}
            style={{ width: \`\${Math.min(100, Math.max(0, ocupacao))}%\` }}
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
          className={\`w-full py-1 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer \${
            isEdit
              ? "bg-amber-500 hover:bg-amber-600 text-white shadow-xs"
              : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
          }\`}
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

`;

const startIdx = code.indexOf(oldYardCardStart);
const endIdx = code.indexOf(oldYardCardEnd);
if (startIdx !== -1 && endIdx !== -1) {
  code = code.slice(0, startIdx) + newYardCardCode + code.slice(endIdx);
  console.log("Successfully replaced YardCard component!");
} else {
  console.error("Could not find YardCard slice!");
}

// 2. Update YardCard calls with yardKey, onYardChange, onDeleteYard
code = code.replace(/<YardCard\s+key=\{key\}\s+yard=\{yardItem\}\s+ocupacao=\{getYardOcupacao\(yardItem\)\}\s+isEdit=\{isEditMode\}\s+theme=\{theme\}\s+t=\{t\}\s+language=\{language\}\s+renderLabel=\{renderLabel\}\s+widescreenMode=\{widescreenMode\}\s+onClick=\{\(\) => setSelectedYardKey\(key\)\}\s*\/>/g, 
  `<YardCard 
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
  />`
);

code = code.replace(/<YardCard\s+key=\{key\}\s+yard=\{yard\}\s+ocupacao=\{getYardOcupacao\(yard\)\}\s+isEdit=\{isEditMode\}\s+theme=\{theme\}\s+t=\{t\}\s+language=\{language\}\s+renderLabel=\{renderLabel\}\s+widescreenMode=\{widescreenMode\}\s+onClick=\{\(\) => setSelectedYardKey\(key\)\}\s*\/>/g,
  `<YardCard 
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
  />`
);

code = code.replace(/<YardCard\s+key=\{key\}\s+yard=\{yard\}\s+ocupacao=\{getYardOcupacao\(yard\)\}\s+isEdit=\{isEditMode\}\s+theme=\{theme\}\s+isSmall\s+t=\{t\}\s+language=\{language\}\s+renderLabel=\{renderLabel\}\s+widescreenMode=\{widescreenMode\}\s+onClick=\{\(\) => \{\s+if \(yard\.type === .BUFFER.\) \{\s+setCurrentSlide\(4\);\s+\} else \{\s+setSelectedYardKey\(key\);\s+\}\s+\}\}\s*\/>/g,
  `<YardCard 
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
  />`
);

// 3. Update Slide 1 toolbar
const oldSlide1Toolbar = `<div className="flex items-center gap-1.5">
                      {/* Toggle Buttons */}
                      <button
                        onClick={() => setYardsViewMode('cards')}`;

const newSlide1Toolbar = `<div className="flex items-center gap-2">
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
                        className={\`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all border \${
                          isEditMode
                            ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                        }\`}
                        title="Alternar modo de edição dos pátios"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>{isEditMode ? (language === 'zh' ? '退出编辑' : 'Concluir Edição') : (language === 'zh' ? '编辑堆场' : 'Editar Pátios')}</span>
                      </button>

                      <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5"></div>

                      {/* Toggle Buttons */}
                      <button
                        onClick={() => setYardsViewMode('cards')}`;

if (code.includes(oldSlide1Toolbar)) {
  code = code.replace(oldSlide1Toolbar, newSlide1Toolbar);
  console.log("Successfully updated Slide 1 toolbar!");
} else {
  console.log("Slide 1 toolbar pattern not matched directly.");
}

// 4. Add the Modals right before sheetsModalOpen
const modalInjectionPoint = "{/* MODAL: GOOGLE SHEETS LIVE SYNC */}";
const newModalsCode = `{/* MODAL: GERENCIAMENTO E EDIÇÃO DE PÁTIO E CONTÊINERES */}
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
          <div className={\`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden \${
            theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
          }\`}>
            {/* MODAL HEADER */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/40">
              <div className="flex items-center gap-3">
                <div className={\`p-2.5 rounded-xl \${
                  yard.type === 'BONDED'
                    ? 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                    : yard.type === 'BUFFER'
                    ? 'bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400'
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                }\`}>
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
                    <span className={\`px-2 py-0.5 rounded-full font-mono text-[10px] font-black \${
                      isHighOcc ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' :
                      isMedOcc ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    }\`}>
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
                        <span>{language === 'zh' ? \`批量删除 (\${selectedContainerIds.length})\` : \`Excluir (\${selectedContainerIds.length})\`}</span>
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
                          <tr key={c.id} className={\`hover:bg-slate-50 dark:hover:bg-slate-800/60 \${isSelected ? 'bg-blue-50/60 dark:bg-blue-950/30' : ''}\`}>
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
                              <span className={\`px-2 py-0.5 rounded-full text-[9.5px] font-extrabold \${
                                c.status === 'CHEIO'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }\`}>
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
        <div className={\`w-full max-w-lg rounded-2xl border p-6 shadow-2xl \${
          theme === 'dark' ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
        }\`}>
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

    `;

if (code.includes(modalInjectionPoint)) {
  code = code.replace(modalInjectionPoint, newModalsCode + modalInjectionPoint);
  console.log("Successfully injected Yard modals!");
} else {
  console.error("Could not find modalInjectionPoint!");
}

fs.writeFileSync("src/App.tsx", code, "utf8");
console.log("src/App.tsx updated successfully!");
