"use client"

import React, { useState, useEffect } from "react";
import Link from "next/link";

const DENOMINATIONS = [
  { value: 1000, label: "1,000", type: "bill", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  { value: 500, label: "500", type: "bill", color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
  { value: 100, label: "100", type: "bill", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  { value: 50, label: "50", type: "bill", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  { value: 20, label: "20", type: "bill", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  { value: 10, label: "10", type: "coin", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  { value: 5, label: "5", type: "coin", color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20" },
  { value: 2, label: "2", type: "coin", color: "text-slate-400", bg: "bg-slate-500/10 border-slate-500/20" },
  { value: 1, label: "1", type: "coin", color: "text-slate-400", bg: "bg-slate-500/10 border-slate-500/20" },
];

const numericValue = (v: string) => {
  const n = parseInt(v.replace(/[^0-9]/g, ""), 10);
  return isNaN(n) ? 0 : n;
};

export default function CashCountPage() {
  const [startingCash, setStartingCash] = useState(0);
  const [cashSales, setCashSales] = useState(0);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const getTodayDateStr = () => {
    const now = new Date();
    const th = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const dd = String(th.getUTCDate()).padStart(2, "0");
    const mm = String(th.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = th.getUTCFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  const today = getTodayDateStr();
  const actualCash = DENOMINATIONS.reduce((sum, d) => sum + (counts[d.value] || 0) * d.value, 0);
  const expectedCash = startingCash + cashSales;
  const difference = actualCash - expectedCash;

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [cashRes, summaryRes] = await Promise.all([
          fetch(`/api/cash-count?date=${today}`),
          fetch(`/api/daily-summary?date=${today}`),
        ]);

        let salesCash = 0;
        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          salesCash = summaryData.totalCash || 0;
        }
        setCashSales(salesCash);

        if (cashRes.ok) {
          const cashData = await cashRes.json();
          if (cashData.data) {
            setStartingCash(cashData.data.starting_cash || 0);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [today]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/cash-count", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: today,
          starting_cash: startingCash,
          cash_sales: cashSales,
          expected_cash: expectedCash,
          actual_cash: actualCash,
          difference: difference,
        }),
      });
      if (res.ok) setSaved(true);
      else alert("เกิดข้อผิดพลาด ❌");
    } catch {
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setSaving(false);
    }
  };

  const updateCount = (value: number, count: number) => {
    setCounts(prev => ({ ...prev, [value]: count }));
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white">
      {/* ─── HEADER ─── */}
      <header className="sticky top-0 z-50 bg-[#0b0f19]/95 backdrop-blur-xl border-b border-white/[0.06] px-4 sm:px-8 lg:px-12 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/"
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.1] transition-all text-lg sm:text-xl font-black shrink-0"
            >
              ‹
            </Link>
            <div>
              <h1 className="text-lg sm:text-2xl font-black tracking-tight">
                💰 นับเงินสด
              </h1>
              <p className="text-[10px] sm:text-xs text-slate-500 font-mono tracking-wider mt-0.5">
                {today}
              </p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-2.5 sm:px-6 sm:py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 font-bold text-xs sm:text-sm text-white transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-amber-600/25 flex items-center gap-2"
          >
            <span>📤</span>
            <span className="hidden sm:inline">
              {saving ? "กำลังบันทึก..." : "บันทึกยอดเงิน"}
            </span>
            <span className="sm:hidden">{saving ? "..." : "บันทึก"}</span>
          </button>
        </div>
      </header>

      {/* ─── CONTENT ─── */}
      <main className="px-4 sm:px-8 lg:px-12 pb-32 sm:pb-8">
        <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
          {loading ? (
            <div className="py-20 text-center text-slate-500 text-base font-semibold">
              กำลังโหลดข้อมูล...
            </div>
          ) : (
            <>
              {/* Success toast */}
              {saved && (
                <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 px-5 py-3 flex items-center gap-3">
                  <span className="text-xl">✅</span>
                  <p className="text-emerald-400 font-bold text-sm">
                    บันทึกยอดเงินเรียบร้อยแล้ว!
                  </p>
                </div>
              )}

              {/* ─── เงินทอนตั้งต้น ─── */}
              <div className="rounded-2xl sm:rounded-3xl bg-white/[0.03] border border-white/[0.06] p-4 sm:p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.6)]" />
                    <span className="text-xs sm:text-sm font-black text-violet-400 uppercase tracking-wider">
                      เงินทอนตั้งต้น
                    </span>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={startingCash === 0 ? "" : String(startingCash)}
                    onChange={(e) => setStartingCash(numericValue(e.target.value))}
                    className="w-32 sm:w-40 bg-[#0d1117] border-2 border-white/[0.08] rounded-xl px-4 py-2.5 text-center font-black text-xl sm:text-2xl text-white focus:outline-none focus:border-violet-500/50 transition-all font-mono placeholder:text-slate-800"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* ─── ยอดขายเงินสดวันนี้ (Auto) ─── */}
              <div className="rounded-2xl sm:rounded-3xl bg-emerald-500/[0.04] border border-emerald-500/[0.15] p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.6)]" />
                    <span className="text-xs sm:text-sm font-black text-emerald-400 uppercase tracking-wider">
                      ยอดขายเงินสด
                    </span>
                  </div>
                  <span className="text-xl sm:text-2xl font-black text-emerald-300 font-mono tabular-nums">
                    {cashSales.toLocaleString()} <span className="text-sm text-emerald-500">฿</span>
                  </span>
                </div>
              </div>

              {/* ─── ยอดควรมี ─── */}
              <div className="rounded-2xl sm:rounded-3xl bg-cyan-500/[0.04] border border-cyan-500/[0.15] p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.6)]" />
                      <span className="text-xs sm:text-sm font-black text-cyan-400 uppercase tracking-wider">
                        ยอดควรมี
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 ml-4">= ตั้งต้น + ขายเงินสด</p>
                  </div>
                  <span className="text-xl sm:text-2xl font-black text-cyan-300 font-mono tabular-nums">
                    {expectedCash.toLocaleString()} <span className="text-sm text-cyan-500">฿</span>
                  </span>
                </div>
              </div>

              {/* ─── นับเงิน ─── */}
              <div className="rounded-2xl sm:rounded-3xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-white/[0.04] flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]" />
                  <span className="text-xs sm:text-sm font-black text-amber-400 uppercase tracking-wider">
                    นับเงินจริง
                  </span>
                  <span className="ml-auto text-lg sm:text-xl font-black text-white font-mono tabular-nums">
                    {actualCash.toLocaleString()} <span className="text-xs text-amber-500">฿</span>
                  </span>
                </div>

                {/* Banknotes */}
                <div className="px-3 sm:px-5 py-2 sm:py-3 border-b border-white/[0.04]">
                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">💴 ธนบัตร</p>
                  <div className="space-y-1.5 sm:space-y-2">
                    {DENOMINATIONS.filter(d => d.type === "bill").map(d => (
                      <DenomRow key={d.value} denom={d} count={counts[d.value] || 0} onChange={(c) => updateCount(d.value, c)} />
                    ))}
                  </div>
                </div>

                {/* Coins */}
                <div className="px-3 sm:px-5 py-2 sm:py-3">
                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">🪙 เหรียญ</p>
                  <div className="space-y-1.5 sm:space-y-2">
                    {DENOMINATIONS.filter(d => d.type === "coin").map(d => (
                      <DenomRow key={d.value} denom={d} count={counts[d.value] || 0} onChange={(c) => updateCount(d.value, c)} />
                    ))}
                  </div>
                </div>
              </div>

              {/* ─── ส่วนต่าง (Result) ─── */}
              <div
                className={`rounded-2xl sm:rounded-3xl border-2 p-4 sm:p-6 transition-all ${
                  actualCash === 0
                    ? "bg-white/[0.02] border-white/[0.06]"
                    : difference === 0
                    ? "bg-emerald-500/[0.06] border-emerald-500/30"
                    : difference > 0
                    ? "bg-emerald-500/[0.06] border-emerald-500/30"
                    : "bg-red-500/[0.06] border-red-500/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        actualCash === 0
                          ? "bg-slate-600"
                          : difference >= 0
                          ? "bg-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.6)]"
                          : "bg-red-500 shadow-[0_0_10px_rgba(248,113,113,0.6)]"
                      }`}
                    />
                    <span
                      className={`text-xs sm:text-sm font-black uppercase tracking-wider ${
                        actualCash === 0
                          ? "text-slate-500"
                          : difference >= 0
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      ส่วนต่าง
                    </span>
                  </div>
                  {actualCash === 0 ? (
                    <span className="text-2xl font-black text-slate-700 font-mono">–</span>
                  ) : (
                    <span
                      className={`text-2xl sm:text-3xl font-black font-mono tabular-nums ${
                        difference >= 0 ? "text-emerald-300" : "text-red-400"
                      }`}
                    >
                      {difference > 0 ? "+" : ""}
                      {difference.toLocaleString()} ฿
                    </span>
                  )}
                </div>
                {actualCash > 0 && (
                  <p className="text-center text-xs text-slate-500 mt-2">
                    {difference === 0
                      ? "✅ เงินพอดี ไม่มีส่วนต่าง"
                      : difference > 0
                      ? `💚 เงินเกิน ${difference.toLocaleString()} บาท`
                      : `❌ เงินขาด ${Math.abs(difference).toLocaleString()} บาท`}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {/* ─── STICKY BOTTOM BUTTON (Mobile only) ─── */}
      <div className="sticky bottom-0 p-4 bg-[#0b0f19]/95 backdrop-blur-xl border-t border-white/[0.06] sm:hidden safe-area-bottom z-50">
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="w-full py-4 rounded-2xl bg-amber-600 hover:bg-amber-500 font-bold text-base text-white transition-all disabled:opacity-50 active:scale-[0.98] shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2"
        >
          💰 {saving ? "กำลังบันทึก..." : "ยืนยันยอดเงินสด"}
        </button>
      </div>
    </div>
  );
}

/* ─── Denomination Row ─── */
function DenomRow({ denom, count, onChange }: {
  denom: { value: number; label: string; color: string; bg: string };
  count: number;
  onChange: (count: number) => void;
}) {
  const total = count * denom.value;
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {/* Denomination label */}
      <div className={`w-14 sm:w-16 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border text-center font-black text-sm sm:text-base ${denom.bg} ${denom.color}`}>
        {denom.label}
      </div>
      {/* × */}
      <span className="text-slate-600 font-bold text-xs">×</span>
      {/* Count input */}
      <input
        type="text"
        inputMode="numeric"
        value={count === 0 ? "" : String(count)}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/[^0-9]/g, ""), 10);
          onChange(isNaN(n) ? 0 : n);
        }}
        className="w-14 sm:w-16 bg-[#0d1117] border border-white/[0.08] rounded-lg sm:rounded-xl px-2 py-1.5 sm:py-2 text-center font-bold text-base sm:text-lg text-white focus:outline-none focus:border-amber-500/50 transition-all font-mono placeholder:text-slate-800"
        placeholder="0"
      />
      {/* = */}
      <span className="text-slate-600 font-bold text-xs">=</span>
      {/* Total */}
      <span className={`flex-1 text-right text-sm sm:text-base font-black font-mono tabular-nums ${total > 0 ? "text-white" : "text-slate-700"}`}>
        {total > 0 ? total.toLocaleString() : "–"}
      </span>
    </div>
  );
}
