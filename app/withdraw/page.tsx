"use client"

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Product } from "@/components/PosTypes";

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

export default function WithdrawPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryMap, setInventoryMap] = useState<Record<string, InventoryEntry>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // activeStep: 1 = เบิกจากคลัง, 2 = เบิกไปขายหน้าร้าน
  const [activeStep, setActiveStep] = useState<1 | 2>(1);

  const getTodayDateStr = () => {
    const now = new Date();
    const th = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const dd = String(th.getUTCDate()).padStart(2, "0");
    const mm = String(th.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = th.getUTCFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  const getPreviousDateStr = (dateStr: string) => {
    const [d, m, y] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() - 1);
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const today = getTodayDateStr();
        const yesterday = getPreviousDateStr(today);
        const [prodRes, invRes, yestRes] = await Promise.all([
          fetch("/api/products"),
          fetch(`/api/inventory?date=${today}`),
          fetch(`/api/inventory?date=${yesterday}`)
        ]);

        let pList: Product[] = [];
        if (prodRes.ok) {
          const d = await prodRes.json();
          pList = d.products?.length > 0 ? d.products : [];
          setProducts(pList);
        }

        const initialMap: Record<string, InventoryEntry> = {};
        pList.forEach((p: Product) => {
          initialMap[p.sku_code] = { start_bal: 0, withdraw: 0, withdraw_pack: 0, withdraw_crate: 0, split_pack: 0, split_crate: 0, closing: 0 };
        });

        if (yestRes.ok) {
          const d = await yestRes.json();
          d.data.forEach((item: any) => {
            if (initialMap[item.sku_code]) {
              initialMap[item.sku_code].start_bal = item.closing || 0;
            } else {
              initialMap[item.sku_code] = { start_bal: item.closing || 0, withdraw: 0, withdraw_pack: 0, withdraw_crate: 0, split_pack: 0, split_crate: 0, closing: 0 };
            }
          });
        }

        if (invRes.ok) {
          const d = await invRes.json();
          d.data.forEach((item: any) => {
            if (initialMap[item.sku_code]) {
              initialMap[item.sku_code] = {
                ...initialMap[item.sku_code],
                start_bal: item.start_bal || initialMap[item.sku_code].start_bal || 0,
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
        const entry = inventoryMap[p.sku_code] || { start_bal: 0, withdraw: 0, withdraw_pack: 0, withdraw_crate: 0, split_pack: 0, split_crate: 0 };
        return {
          sku_code: p.sku_code,
          name: p.name,
          start_bal: entry.start_bal,
          withdraw: entry.withdraw,
          withdraw_pack: entry.withdraw_pack,
          withdraw_crate: entry.withdraw_crate,
          split_pack: entry.split_pack,
          split_crate: entry.split_crate
        };
      });

      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: getTodayDateStr(), items }),
      });

      if (res.ok) alert("บันทึกข้อมูลเรียบร้อย ✅");
      else alert("เกิดข้อผิดพลาด ❌");
    } catch (err) {
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setSaving(false);
    }
  };

  const updateItem = (sku: string, field: keyof InventoryEntry, val: number) => {
    setInventoryMap(prev => ({
      ...prev,
      [sku]: { ...(prev[sku] || { start_bal: 0, withdraw: 0, withdraw_pack: 0, withdraw_crate: 0, split_pack: 0, split_crate: 0, closing: 0 }), [field]: val }
    }));
  };

  const inventoryProducts = products.filter(p => p.is_inventory === true);
  const categories = Array.from(new Set(inventoryProducts.map(p => p.category || "อื่นๆ")));

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white">
      {/* ─── FIXED HEADER ─── */}
      <header className="sticky top-0 z-50 bg-[#0b0f19]/95 backdrop-blur-xl border-b border-white/[0.06] px-4 sm:px-8 lg:px-12 py-3">
        <div className="max-w-5xl mx-auto space-y-2.5">
          {/* Row 1: Back + Title + Save */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4 lg:gap-6">
              <Link href="/" className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-xl sm:rounded-2xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.1] transition-all text-lg sm:text-xl font-black shrink-0">
                ‹
              </Link>
              <div>
                <h1 className="text-base sm:text-xl lg:text-2xl font-black tracking-tight">📦 เบิกสินค้า</h1>
                <p className="text-[9px] sm:text-[10px] lg:text-xs text-slate-500 font-mono tracking-wider mt-0.5">{getTodayDateStr()}</p>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="px-3 py-2 sm:px-4 sm:py-2.5 lg:px-6 lg:py-3 rounded-xl sm:rounded-2xl bg-blue-600 hover:bg-blue-500 font-bold text-[10px] sm:text-xs lg:text-sm text-white transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-blue-600/25 flex items-center gap-1.5 sm:gap-2"
            >
              <span>📤</span>
              <span className="hidden sm:inline">{saving ? "กำลังบันทึก..." : "ยืนยันข้อมูล"}</span>
              <span className="sm:hidden">{saving ? "..." : "บันทึก"}</span>
            </button>
          </div>
          {/* Row 2: Step Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveStep(1)}
              className={`flex-1 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-black transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
                activeStep === 1
                  ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/30"
                  : "bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:bg-white/[0.08]"
              }`}
            >
              <span>🏭</span>
              <span>เบิกจากคลัง</span>
            </button>
            <button
              onClick={() => setActiveStep(2)}
              className={`flex-1 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-black transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
                activeStep === 2
                  ? "bg-amber-500 text-black shadow-lg shadow-amber-500/30"
                  : "bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:bg-white/[0.08]"
              }`}
            >
              <span>🏪</span>
              <span>เบิกไปขายหน้าร้าน</span>
            </button>
          </div>
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
                    <div className={`h-px flex-1 ${activeStep === 1 ? "bg-cyan-500/20" : "bg-amber-500/20"}`} />
                    <span className={`text-[10px] sm:text-xs lg:text-sm font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] ${activeStep === 1 ? "text-cyan-500" : "text-amber-500"}`}>{cat}</span>
                    <div className={`h-px flex-1 ${activeStep === 1 ? "bg-cyan-500/20" : "bg-amber-500/20"}`} />
                  </div>

                  <div className="space-y-2.5 sm:space-y-3 lg:space-y-5">
                    {inventoryProducts.filter(p => (p.category || "อื่นๆ") === cat).map((p) => {
                      const entry = inventoryMap[p.sku_code] || { start_bal: 0, withdraw: 0, withdraw_pack: 0, withdraw_crate: 0, split_pack: 0, split_crate: 0, closing: 0 };
                      const hasCrate = (p.packs_per_crate || 0) > 0;
                      const hasPack = (p.pieces_per_pack || 0) > 0;

                      if (activeStep === 1) {
                        // ── ขั้นที่ 1: เบิกจากคลัง ──
                        return (
                          <div key={p.sku_code} className="rounded-xl sm:rounded-2xl lg:rounded-3xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
                            {/* Product Header */}
                            <div className="flex items-center gap-2.5 sm:gap-3 lg:gap-5 p-3 sm:p-4 lg:p-6 border-b border-white/[0.04]">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 rounded-lg sm:rounded-xl lg:rounded-2xl bg-[#0d1117] border border-white/[0.08] flex items-center justify-center p-1 lg:p-1.5 shrink-0">
                                <img src={p.image || "/image/empty.jpg"} alt={p.name} className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).src = "/image/empty.jpg"; }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm sm:text-base lg:text-lg font-bold text-slate-100 truncate">{p.name}</p>
                                <p className="text-[9px] sm:text-[10px] lg:text-xs text-slate-500 font-mono mt-0.5">{p.sku_code}</p>
                              </div>
                              {/* ยกมา */}
                              <div className="text-right shrink-0">
                                <label className="text-[9px] sm:text-[10px] lg:text-[11px] text-slate-500 font-bold uppercase block mb-0.5 sm:mb-1">ยกมา</label>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={displayValue(entry.start_bal)}
                                  onChange={(e) => updateItem(p.sku_code, "start_bal", numericValue(e.target.value))}
                                  className="w-14 sm:w-16 lg:w-20 bg-white/[0.04] border border-white/[0.08] rounded-lg sm:rounded-xl px-1.5 sm:px-2 py-1 sm:py-1.5 lg:py-2 text-center font-bold text-sm sm:text-base lg:text-lg text-white focus:outline-none focus:border-cyan-500/50 transition-all font-mono placeholder:text-slate-800"
                                  placeholder="0"
                                />
                              </div>
                            </div>

                            {/* เบิกจากคลัง - ลัง/แพ็ค/ชิ้น */}
                            <div className="p-3 sm:p-4 lg:p-6">
                              <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
                                <span className="text-[10px] sm:text-[11px] lg:text-xs font-bold text-cyan-400 uppercase tracking-wider">เบิกจากคลัง</span>
                              </div>
                              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 lg:gap-3">
                                <InputCell label="ลัง" value={displayValue(entry.withdraw_crate)} disabled={!hasCrate} onChange={(v) => updateItem(p.sku_code, "withdraw_crate", numericValue(v))} color="cyan" />
                                <InputCell label="แพ็ค" value={displayValue(entry.withdraw_pack)} disabled={!hasPack} onChange={(v) => updateItem(p.sku_code, "withdraw_pack", numericValue(v))} color="cyan" />
                                <InputCell label="ชิ้น" value={displayValue(entry.withdraw)} onChange={(v) => updateItem(p.sku_code, "withdraw", numericValue(v))} color="cyan" />
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        // ── ขั้นที่ 2: เบิกไปขายหน้าร้าน (แกะแบ่ง) ──
                        // คำนวณจำนวนที่เบิกมาจากคลัง (ขั้นที่ 1) เพื่อแสดงให้เห็น
                        const totalFromWarehouse = entry.withdraw_crate + entry.withdraw_pack + entry.withdraw;

                        return (
                          <div key={p.sku_code} className="rounded-xl sm:rounded-2xl lg:rounded-3xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
                            {/* Product Header */}
                            <div className="flex items-center gap-2.5 sm:gap-3 lg:gap-5 p-3 sm:p-4 lg:p-6 border-b border-white/[0.04]">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 rounded-lg sm:rounded-xl lg:rounded-2xl bg-[#0d1117] border border-white/[0.08] flex items-center justify-center p-1 lg:p-1.5 shrink-0">
                                <img src={p.image || "/image/empty.jpg"} alt={p.name} className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).src = "/image/empty.jpg"; }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm sm:text-base lg:text-lg font-bold text-slate-100 truncate">{p.name}</p>
                                <p className="text-[9px] sm:text-[10px] lg:text-xs text-slate-500 font-mono mt-0.5">{p.sku_code}</p>
                              </div>
                              {/* แสดงยอดที่เบิกจากคลัง */}
                              <div className="text-right shrink-0 space-y-0.5">
                                <label className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase block">เบิกมา</label>
                                <div className="flex gap-1 flex-wrap justify-end">
                                  {entry.withdraw_crate > 0 && <span className="text-[9px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full font-bold">{entry.withdraw_crate} ลัง</span>}
                                  {entry.withdraw_pack > 0 && <span className="text-[9px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full font-bold">{entry.withdraw_pack} แพ็ค</span>}
                                  {entry.withdraw > 0 && <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">{entry.withdraw} ชิ้น</span>}
                                  {totalFromWarehouse === 0 && <span className="text-[9px] text-slate-600 font-bold">ยังไม่ได้เบิก</span>}
                                </div>
                              </div>
                            </div>

                            {/* แกะแบ่งไปขายหน้าร้าน */}
                            <div className="p-3 sm:p-4 lg:p-6">
                              <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                                <span className="text-[10px] sm:text-[11px] lg:text-xs font-bold text-amber-400 uppercase tracking-wider">แกะแบ่งไปขายหน้าร้าน</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:gap-4">
                                <div>
                                  <InputCell label="ลัง → แพ็ค" value={displayValue(entry.split_crate)} disabled={!hasCrate} onChange={(v) => updateItem(p.sku_code, "split_crate", numericValue(v))} color="amber" />
                                  {hasCrate && entry.split_crate > 0 && (
                                    <p className="text-[8px] sm:text-[10px] text-amber-500 font-bold text-center mt-0.5 sm:mt-1">= +{entry.split_crate * p.packs_per_crate!} แพ็ค</p>
                                  )}
                                </div>
                                <div>
                                  <InputCell label="แพ็ค → ชิ้น" value={displayValue(entry.split_pack)} disabled={!hasPack} onChange={(v) => updateItem(p.sku_code, "split_pack", numericValue(v))} color="amber" />
                                  {hasPack && entry.split_pack > 0 && (
                                    <p className="text-[8px] sm:text-[10px] text-amber-500 font-bold text-center mt-0.5 sm:mt-1">= +{entry.split_pack * p.pieces_per_pack!} ชิ้น</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ─── FIXED BOTTOM BUTTON (Mobile only) ─── */}
      <div className="fixed bottom-0 left-0 right-0 p-3 sm:p-4 bg-[#0b0f19]/95 backdrop-blur-xl border-t border-white/[0.06] sm:hidden safe-area-bottom z-50">
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="w-full py-3.5 rounded-xl sm:rounded-2xl bg-blue-600 hover:bg-blue-500 font-bold text-sm text-white transition-all disabled:opacity-50 active:scale-[0.98] shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
        >
          📤 {saving ? "กำลังอัปโหลด..." : "ยืนยันข้อมูลเบิกสินค้า"}
        </button>
      </div>
      <div className="h-20 sm:hidden" />
    </div>
  );
}

/* ─── Reusable Input Cell ─── */
function InputCell({ label, value, disabled, onChange, color = "blue" }: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (v: string) => void;
  color?: "cyan" | "amber" | "blue";
}) {
  const focusColors = {
    cyan: "focus:border-cyan-500/50",
    amber: "focus:border-amber-500/50",
    blue: "focus:border-blue-500/50",
  };
  return (
    <div className={`${disabled ? "opacity-20 pointer-events-none" : ""}`}>
      <label className="text-[8px] sm:text-[10px] lg:text-[11px] text-slate-500 font-bold uppercase text-center block mb-0.5 sm:mb-1 tracking-tight">{label}</label>
      <input
        type="text"
        inputMode="numeric"
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-[#0d1117] border border-white/[0.08] rounded-lg sm:rounded-xl px-1.5 sm:px-2 py-2 sm:py-2.5 lg:py-3.5 text-center font-bold text-base sm:text-lg lg:text-xl text-white focus:outline-none ${focusColors[color]} transition-all font-mono placeholder:text-slate-800`}
        placeholder="0"
      />
    </div>
  );
}
