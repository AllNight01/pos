"use client"

import React from "react";
import { Product } from "./PosTypes";

interface InventoryModalsProps {
  showWithdrawModal: boolean;
  setShowWithdrawModal: (show: boolean) => void;
  showStockModal: boolean;
  setShowStockModal: (show: boolean) => void;
  inventoryMap: Record<string, { withdraw: number; closing: number }>;
  setInventoryMap: React.Dispatch<React.SetStateAction<Record<string, { withdraw: number; closing: number }>>>;
  products: Product[];
  saveInventory: (items: any[]) => Promise<boolean>;
  loading: boolean;
  summaryData: any; // For stock calculation
}

export const InventoryModals: React.FC<InventoryModalsProps> = ({
  showWithdrawModal,
  setShowWithdrawModal,
  showStockModal,
  setShowStockModal,
  inventoryMap,
  setInventoryMap,
  products,
  saveInventory,
  loading,
  summaryData,
}) => {
  return (
    <>
      {/* ═══ WITHDRAWAL MODAL ═══ */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowWithdrawModal(false)} />
          <div className="relative w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl bg-[#111827] border-t sm:border border-white/[0.06] shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col" style={{ animation: "slide-up .3s ease both" }}>
            <div className="px-5 pt-5 pb-3 border-b border-white/[0.04] flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">📦 บันทึกการเบิกสินค้า</h3>
              <button onClick={() => setShowWithdrawModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-colors text-slate-400">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3" style={{ scrollbarWidth: "none" }}>
              {products.map((p) => (
                <div key={p.sku_code} className="flex items-center justify-between gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-[#0b0f19] border border-white/[0.06] overflow-hidden shrink-0 flex items-center justify-center">
                      <img src={p.image || "/image/empty.jpg"} alt={p.name} className="w-full h-full object-contain p-0.5" onError={(e) => { (e.target as HTMLImageElement).src = "/image/empty.jpg"; }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{p.name}</p>
                      <p className="text-[11px] text-slate-500 uppercase font-mono tracking-tighter">{p.sku_code}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">จำนวนเบิก</span>
                    <input
                      type="number"
                      value={inventoryMap[p.sku_code]?.withdraw || ""}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setInventoryMap(prev => ({
                          ...prev,
                          [p.sku_code]: { ...(prev[p.sku_code] || { closing: 0 }), withdraw: val }
                        }));
                      }}
                      className="w-20 bg-[#0b0f19] border border-white/10 rounded-lg px-3 py-2 text-center font-bold text-white focus:outline-none focus:border-cyan-500"
                      placeholder="0"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-white/[0.04] bg-[#0d1117]/50">
              <button
                onClick={async () => {
                  const items = products.map(p => ({ sku_code: p.sku_code, name: p.name, withdraw: inventoryMap[p.sku_code]?.withdraw || 0 }));
                  if (await saveInventory(items)) setShowWithdrawModal(false);
                }}
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 font-bold text-white shadow-xl shadow-cyan-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? "กำลังบันทึก..." : "บันทึกยอดเบิกเพิ่ม"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ STOCK COUNT MODAL ═══ */}
      {showStockModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowStockModal(false)} />
          <div className="relative w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl bg-[#111827] border-t sm:border border-white/[0.06] shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col" style={{ animation: "slide-up .3s ease both" }}>
            <div className="px-5 pt-5 pb-3 border-b border-white/[0.04] flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">📊 นับสต็อกหลังขายเสร็จ</h3>
              <button onClick={() => setShowStockModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-colors text-slate-400">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3" style={{ scrollbarWidth: "none" }}>
              {products.map((p) => {
                const sold = summaryData?.items.find((i: any) => i.sku_code === p.sku_code)?.qty || 0;
                const withdraw = inventoryMap[p.sku_code]?.withdraw || 0;
                const shouldRemain = withdraw - sold;
                const actual = inventoryMap[p.sku_code]?.closing || 0;
                const diff = actual - shouldRemain;

                return (
                  <div key={p.sku_code} className="flex flex-col gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#0b0f19] border border-white/[0.06] overflow-hidden shrink-0 flex items-center justify-center">
                        <img src={p.image || "/image/empty.jpg"} alt={p.name} className="w-full h-full object-contain p-0.5" onError={(e) => { (e.target as HTMLImageElement).src = "/image/empty.jpg"; }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-white truncate">{p.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{p.sku_code}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-2 border-y border-white/[0.04]">
                      <div className="text-center">
                        <p className="text-[9px] text-slate-500 uppercase font-bold">เบิก</p>
                        <p className="text-sm font-bold text-cyan-400">{withdraw}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] text-slate-500 uppercase font-bold">ขายได้</p>
                        <p className="text-sm font-bold text-amber-400">{sold}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] text-slate-500 uppercase font-bold">ควรเหลือ</p>
                        <p className="text-sm font-bold text-slate-300">{shouldRemain}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4 mt-1">
                      <div className="flex-1">
                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">นับได้จริง</p>
                        <input
                          type="number"
                          value={inventoryMap[p.sku_code]?.closing || ""}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setInventoryMap(prev => ({
                              ...prev,
                              [p.sku_code]: { ...(prev[p.sku_code] || { withdraw: 0 }), closing: val }
                            }));
                          }}
                          className="w-full bg-[#0b0f19] border border-white/10 rounded-lg px-3 py-2 text-center font-bold text-white focus:outline-none focus:border-emerald-500"
                          placeholder="0"
                        />
                      </div>
                      <div className="text-right min-w-[60px]">
                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">ส่วนต่าง</p>
                        <p className={`text-sm font-black ${diff === 0 ? "text-slate-500" : diff > 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {diff > 0 ? `+${diff}` : diff}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t border-white/[0.04] bg-[#0d1117]/50">
              <button
                onClick={async () => {
                  const items = products.map(p => ({ sku_code: p.sku_code, name: p.name, closing: inventoryMap[p.sku_code]?.closing || 0 }));
                  if (await saveInventory(items)) setShowStockModal(false);
                }}
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-linear-to-r from-emerald-500 to-teal-500 font-bold text-white shadow-xl shadow-emerald-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? "กำลังบันทึก..." : "บันทึกสต็อกคงเหลือ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
