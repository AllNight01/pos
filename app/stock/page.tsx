"use client"

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Product, DailySummaryData } from "@/components/PosTypes";

interface InventoryEntry {
  start_bal: number;
  withdraw: number;
  withdraw_pack: number;
  withdraw_crate: number;
  split_pack: number;
  split_crate: number;
  closing: number;
}

const numericValue = (v: string) => {
  const n = parseInt(v.replace(/[^0-9]/g, ""), 10);
  return isNaN(n) ? 0 : n;
};

const displayValue = (n: number) => (n === 0 ? "" : String(n));

export default function StockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryMap, setInventoryMap] = useState<Record<string, InventoryEntry>>({});
  const [summaryData, setSummaryData] = useState<DailySummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const getTodayDateStr = () => {
    const now = new Date();
    const th = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const dd = String(th.getUTCDate()).padStart(2, "0");
    const mm = String(th.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = th.getUTCFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const today = getTodayDateStr();
        const [prodRes, invRes, sumRes] = await Promise.all([
          fetch("/api/products"),
          fetch(`/api/inventory?date=${today}`),
          fetch(`/api/daily-summary?date=${today}`)
        ]);

        if (prodRes.ok) {
          const d = await prodRes.json();
          const pList: Product[] = d.products?.length > 0 ? d.products : [];
          setProducts(pList);

          const initialMap: Record<string, InventoryEntry> = {};
          pList.forEach((p: Product) => {
            initialMap[p.sku_code] = { start_bal: 0, withdraw: 0, withdraw_pack: 0, withdraw_crate: 0, split_pack: 0, split_crate: 0, closing: 0 };
          });

          if (invRes.ok) {
            const invData = await invRes.json();
            invData.data.forEach((item: any) => {
              if (initialMap[item.sku_code]) {
                initialMap[item.sku_code] = {
                  ...initialMap[item.sku_code],
                  start_bal: item.start_bal || 0,
                  withdraw: item.withdraw || 0,
                  withdraw_pack: item.withdraw_pack || 0,
                  withdraw_crate: item.withdraw_crate || 0,
                  split_pack: item.split_pack || 0,
                  split_crate: item.split_crate || 0,
                  closing: item.closing || 0
                };
              } else {
                initialMap[item.sku_code] = item;
              }
            });
          }
          setInventoryMap(initialMap);
        }

        if (sumRes.ok) setSummaryData(await sumRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const items = products.map(p => {
        const entry = inventoryMap[p.sku_code] || { start_bal: 0, closing: 0 };
        return {
          sku_code: p.sku_code,
          name: p.name,
          start_bal: entry.start_bal,
          closing: entry.closing
        };
      });

      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: getTodayDateStr(), items }),
      });

      if (res.ok) alert("บันทึกยอดสต็อกเรียบร้อย ✅");
      else alert("เกิดข้อผิดพลาด ❌");
    } catch (err) {
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setSaving(false);
    }
  };

  const inventoryProducts = products.filter(p => p.is_inventory === true);
  const categories = Array.from(new Set(inventoryProducts.map(p => p.category || "อื่นๆ")));

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white">
      {/* ─── STICKY HEADER ─── */}
      <header className="sticky top-0 z-50 bg-[#0b0f19]/95 backdrop-blur-xl border-b border-white/[0.06] px-4 sm:px-8 lg:px-12 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4 lg:gap-6">
            <Link href="/" className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-xl sm:rounded-2xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.1] transition-all text-lg sm:text-xl font-black shrink-0">
              ‹
            </Link>
            <div>
              <h1 className="text-base sm:text-xl lg:text-2xl font-black tracking-tight">📉 นับสต็อก</h1>
              <p className="text-[9px] sm:text-[10px] lg:text-xs text-slate-500 font-mono tracking-wider mt-0.5">{getTodayDateStr()}</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-3 py-2 sm:px-4 sm:py-2.5 lg:px-6 lg:py-3 rounded-xl sm:rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-bold text-[10px] sm:text-xs lg:text-sm text-white transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-emerald-600/25 flex items-center gap-1.5 sm:gap-2"
          >
            <span>📤</span>
            <span className="hidden sm:inline">{saving ? "กำลังบันทึก..." : "ยืนยันยอดสต็อก"}</span>
            <span className="sm:hidden">{saving ? "..." : "บันทึก"}</span>
          </button>
        </div>
      </header>

      {/* ─── CONTENT ─── */}
      <main className="px-3 sm:px-6 lg:px-12 pb-8">
        <div className="max-w-5xl mx-auto">
          {loading ? (
            <div className="py-20 text-center text-slate-500 text-base font-semibold">กำลังโหลดข้อมูล...</div>
          ) : (
            <div className="space-y-6 sm:space-y-8 lg:space-y-10">
              {categories.map(cat => (
                <section key={cat}>
                  {/* Category Header */}
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 lg:mb-6">
                    <div className="h-px flex-1 bg-emerald-500/20" />
                    <span className="text-[10px] sm:text-xs lg:text-sm font-black text-emerald-500 uppercase tracking-[0.15em] sm:tracking-[0.2em]">{cat}</span>
                    <div className="h-px flex-1 bg-emerald-500/20" />
                  </div>

                  <div className="space-y-2.5 sm:space-y-3 lg:space-y-4">
                    {inventoryProducts.filter(p => (p.category || "อื่นๆ") === cat).map((p) => {
                      const entry = inventoryMap[p.sku_code] || { start_bal: 0, withdraw: 0, withdraw_pack: 0, withdraw_crate: 0, split_pack: 0, split_crate: 0, closing: 0 };

                      const packsInCrate = p.packs_per_crate || 0;
                      const piecesInPack = p.pieces_per_pack || 0;

                      const soldDirect = summaryData?.items.find(i => i.sku_code === p.sku_code)?.qty || 0;

                      const totalOut = soldDirect;
                      const readyToSellGain = (entry.split_pack * piecesInPack) + entry.withdraw;
                      const shouldRemainReady = entry.start_bal + readyToSellGain - totalOut;

                      const remainCrates = entry.withdraw_crate - entry.split_crate;
                      const remainPacks = entry.withdraw_pack + (entry.split_crate * packsInCrate) - entry.split_pack;

                      const actual = entry.closing || 0;
                      const diff = actual - shouldRemainReady;

                      return (
                        <div key={p.sku_code} className="rounded-xl sm:rounded-2xl lg:rounded-3xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
                          {/* ─── MOBILE LAYOUT ─── */}
                          <div className="sm:hidden">
                            {/* Product Info Row */}
                            <div className="flex items-center gap-2.5 p-3 border-b border-white/[0.04]">
                              <div className="w-9 h-9 rounded-lg bg-[#0d1117] border border-white/[0.08] flex items-center justify-center p-0.5 shrink-0">
                                <img src={p.image || "/image/empty.jpg"} alt={p.name} className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).src = "/image/empty.jpg"; }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-100 truncate">{p.name}</p>
                                <div className="flex gap-1.5 mt-0.5 flex-wrap">
                                  {remainCrates > 0 && <span className="text-[8px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full font-bold">ลัง: {remainCrates}</span>}
                                  {remainPacks > 0 && <span className="text-[8px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full font-bold">แพ็ค: {remainPacks}</span>}
                                </div>
                              </div>
                            </div>

                            {/* Stats Row */}
                            <div className="grid grid-cols-3 border-b border-white/[0.04]">
                              <StatCell label="มีทั้งหมด" value={entry.start_bal + readyToSellGain} />
                              <StatCell label="ขายไป" value={soldDirect} color="text-amber-400" />
                              <StatCell label="ควรเหลือ" value={shouldRemainReady} color="text-cyan-400" />
                            </div>

                            {/* Count Input Row */}
                            <div className="flex items-center gap-2.5 p-3">
                              <div className="flex-1">
                                <label className="text-[9px] text-slate-400 font-bold uppercase mb-1 block">🔢 นับจริง</label>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={displayValue(entry.closing)}
                                  onChange={(e) => {
                                    const val = numericValue(e.target.value);
                                    setInventoryMap(prev => ({
                                      ...prev,
                                      [p.sku_code]: { ...prev[p.sku_code], closing: val }
                                    }));
                                  }}
                                  className="w-full bg-[#0d1117] border-2 border-white/[0.08] rounded-xl px-3 py-2.5 text-center font-bold text-xl text-white focus:outline-none focus:border-emerald-500/50 transition-all font-mono placeholder:text-slate-800"
                                  placeholder="0"
                                />
                              </div>
                              <div className="w-16 text-center">
                                <label className="text-[9px] text-slate-400 font-bold uppercase mb-1 block">ส่วนต่าง</label>
                                <div className={`text-xl font-black py-2.5 rounded-xl border-2 transition-all font-mono ${
                                  diff === 0 ? "bg-white/[0.02] border-white/[0.06] text-slate-700"
                                  : diff > 0 ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                  : "bg-red-500/10 border-red-500/30 text-red-400"
                                }`}>
                                  {actual === 0 && entry.closing === 0 ? "–" : diff > 0 ? `+${diff}` : diff}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* ─── DESKTOP LAYOUT ─── */}
                          <div className="hidden sm:block p-4 lg:p-6">
                            <div className="flex items-center gap-3 lg:gap-5 mb-3 lg:mb-5">
                              <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl bg-[#0d1117] border border-white/[0.08] flex items-center justify-center p-1 lg:p-1.5 shrink-0">
                                <img src={p.image || "/image/empty.jpg"} alt={p.name} className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).src = "/image/empty.jpg"; }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-base lg:text-lg font-bold text-slate-100">{p.name}</h3>
                                <div className="flex gap-2 mt-1 items-center">
                                  <span className="text-[10px] lg:text-xs text-slate-500 font-mono">{p.sku_code}</span>
                                  {remainCrates > 0 && <span className="text-[9px] lg:text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 lg:px-2 py-0.5 rounded-full font-bold">ลัง: {remainCrates}</span>}
                                  {remainPacks > 0 && <span className="text-[9px] lg:text-[10px] bg-purple-500/20 text-purple-400 px-1.5 lg:px-2 py-0.5 rounded-full font-bold">แพ็ค: {remainPacks}</span>}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-end gap-3 lg:gap-6">
                              {/* Stats */}
                              <div className="grid grid-cols-3 gap-2 lg:gap-3 flex-1">
                                <StatBox label="มีทั้งหมด" value={entry.start_bal + readyToSellGain} />
                                <StatBox label="ขายไป" value={soldDirect} color="text-amber-400" />
                                <StatBox label="ควรเหลือ" value={shouldRemainReady} color="text-cyan-400" bg="bg-cyan-500/10 border-cyan-500/20" />
                              </div>

                              {/* Count Input */}
                              <div className="w-28 lg:w-40">
                                <label className="text-[10px] lg:text-[11px] text-slate-400 font-bold uppercase mb-1 lg:mb-1.5 block text-center">🔢 นับจริง</label>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={displayValue(entry.closing)}
                                  onChange={(e) => {
                                    const val = numericValue(e.target.value);
                                    setInventoryMap(prev => ({
                                      ...prev,
                                      [p.sku_code]: { ...prev[p.sku_code], closing: val }
                                    }));
                                  }}
                                  className="w-full bg-[#0d1117] border-2 border-white/[0.08] rounded-xl px-3 lg:px-4 py-2.5 lg:py-3 text-center font-bold text-xl lg:text-2xl text-white focus:outline-none focus:border-emerald-500/50 transition-all font-mono placeholder:text-slate-800"
                                  placeholder="0"
                                />
                              </div>

                              {/* Diff */}
                              <div className="w-16 lg:w-24 text-center">
                                <label className="text-[10px] lg:text-[11px] text-slate-400 font-bold uppercase mb-1 lg:mb-1.5 block">ส่วนต่าง</label>
                                <div className={`text-xl lg:text-2xl font-black py-2.5 lg:py-3 rounded-xl border-2 transition-all font-mono ${
                                  diff === 0 ? "bg-white/[0.02] border-white/[0.06] text-slate-700"
                                  : diff > 0 ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                  : "bg-red-500/10 border-red-500/30 text-red-400"
                                }`}>
                                  {actual === 0 && entry.closing === 0 ? "–" : diff > 0 ? `+${diff}` : diff}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ─── FIXED BOTTOM BUTTON (Mobile only) ─── */}
      <div className="sticky bottom-0 p-3 sm:p-4 bg-[#0b0f19]/95 backdrop-blur-xl border-t border-white/[0.06] sm:hidden safe-area-bottom z-50">
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="w-full py-3.5 rounded-xl sm:rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-bold text-sm text-white transition-all disabled:opacity-50 active:scale-[0.98] shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
        >
          📤 {saving ? "กำลังอัปโหลด..." : "ยืนยันยอดสต็อก"}
        </button>
      </div>
      <div className="h-20 sm:hidden" />
    </div>
  );
}

/* ─── Stat Cell (Mobile - compact inline) ─── */
function StatCell({ label, value, color = "text-white" }: { label: string; value: number; color?: string }) {
  return (
    <div className="py-2 sm:py-3 text-center border-r border-white/[0.04] last:border-0">
      <p className="text-[8px] sm:text-[9px] text-slate-500 font-bold uppercase mb-0.5 tracking-tight">{label}</p>
      <p className={`text-base sm:text-lg font-black font-mono ${color}`}>{value}</p>
    </div>
  );
}

/* ─── Stat Box (Desktop - boxed) ─── */
function StatBox({ label, value, color = "text-white", bg = "bg-white/[0.03] border-white/[0.06]" }: {
  label: string; value: number; color?: string; bg?: string;
}) {
  return (
    <div className={`p-2.5 lg:p-4 rounded-lg lg:rounded-xl border text-center ${bg}`}>
      <p className="text-[9px] lg:text-[10px] text-slate-500 font-bold uppercase mb-0.5 lg:mb-1 tracking-wider">{label}</p>
      <p className={`text-lg lg:text-xl font-black font-mono ${color}`}>{value}</p>
    </div>
  );
}
