sed -i -e '8866,8873c\
                                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1.5 text-center shadow-sm min-w-[60px]">\
                                              <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-tighter mb-0.5">P{p.id} Start Inv.</span>\
                                              <span className="block text-xs font-black text-slate-700 dark:text-slate-300">{fac.peaks[idx]?.start || 0}</span>\
                                            </div>\
                                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1.5 text-center shadow-sm min-w-[60px]">\
                                              <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-tighter mb-0.5">P{p.id} End Inv.</span>\
                                              <span className="block text-xs font-black text-slate-700 dark:text-slate-300">{fac.peaks[idx]?.end || 0}</span>\
                                            </div>' src/App.tsx
