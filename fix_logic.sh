sed -i -e '8556,8605c\
                      // Fetch Live Inventory Data\
                      const liveTecon = { \
                        inv: yards.tecon?.cheio || 0, \
                        cap: yards.tecon?.capacity || 2000 \
                      };\
                      const liveInter = { \
                        inv: yards.intermaritima?.cheio || 0, \
                        cap: yards.intermaritima?.capacity || 800 \
                      };\
                      const liveTpc = { \
                        inv: yards.tpc?.cheio || 0, \
                        cap: yards.tpc?.capacity || 1200 \
                      };\
\
                      const activePeriods = plannerPeriods.filter(p => !p.isHistoric);\
                      const totalExpectedVolume = activePeriods.reduce((sum, p) => sum + p.totalVolume, 0);\
\
                      const getProjections = (liveInv: number, allocKey: "allocTecon" | "allocInter" | "allocTpc", outflowKey: "outflowTecon" | "outflowInter" | "outflowTpc") => {\
                        let prevEnd = liveInv;\
                        let maxPeak = liveInv;\
                        const peaks: { start: number, end: number }[] = [];\
                        \
                        for (const p of activePeriods) {\
                          const pVol = Math.round(p.totalVolume * ((p as any)[allocKey] / 100));\
                          const currentOutflow = (p as any)[outflowKey];\
                          \
                          const start = prevEnd - currentOutflow;\
                          const end = start + pVol;\
                          \
                          peaks.push({ start, end });\
                          maxPeak = Math.max(maxPeak, end);\
                          prevEnd = end;\
                        }\
                        \
                        return { peaks, maxPeak };\
                      };\
\
                      const teconData = getProjections(liveTecon.inv, "allocTecon", "outflowTecon");\
                      const teconPeaks = teconData.peaks;\
                      const teconPeakOcc = teconData.maxPeak;\
                      const teconPeakOccPct = (teconPeakOcc / liveTecon.cap) * 100;\
\
                      const interData = getProjections(liveInter.inv, "allocInter", "outflowInter");\
                      const interPeaks = interData.peaks;\
                      const interPeakOcc = interData.maxPeak;\
                      const interPeakOccPct = (interPeakOcc / liveInter.cap) * 100;\
\
                      const tpcData = getProjections(liveTpc.inv, "allocTpc", "outflowTpc");\
                      const tpcPeaks = tpcData.peaks;\
                      const tpcPeakOcc = tpcData.maxPeak;\
                      const tpcPeakOccPct = (tpcPeakOcc / liveTpc.cap) * 100;' src/App.tsx
