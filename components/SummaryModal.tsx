"use client";

import React from "react";
import { DailySummaryData, Product } from "./PosTypes";

interface SummaryModalProps {
  showSummary: boolean;
  setShowSummary: (show: boolean) => void;
  summaryData: DailySummaryData | null;
  summaryLoading: boolean;
  summaryTab: "items" | "bills";
  setSummaryTab: (tab: "items" | "bills") => void;
  summaryDate: string;
  availableDates: string[];
  navigateSummaryDate: (offset: number) => void;
  showDatePicker: boolean;
  setShowDatePicker: (show: boolean) => void;
  selectSummaryDate: (date: string) => void;
  getTodayDateStr: () => string;
  products: Product[];
}

function exportToExcel(summaryData: DailySummaryData, summaryDate: string) {
  // Dynamic import of xlsx
  import("xlsx")
    .then((XLSX) => {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Summary overview
      const overviewData = [
        ["สรุปยอดขายประจำวัน", summaryDate],
        [],
        ["จำนวนบิลทั้งหมด", summaryData.totalBills],
        ["ยอดขายรวม (฿)", summaryData.totalRevenue],
        ["ยอดเงินสด (฿)", summaryData.totalCash || 0],
        ["ยอดเงินโอน (฿)", summaryData.totalTransfer || 0],
        ["จำนวนชิ้นทั้งหมด", summaryData.totalItems],
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(overviewData);
      ws1["!cols"] = [{ wch: 25 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, ws1, "สรุปภาพรวม");

      // Sheet 2: Sales by item
      const itemHeaders = [
        "ลำดับ",
        "ชื่อสินค้า",
        "รหัส SKU",
        "ราคาต่อชิ้น (฿)",
        "จำนวนที่ขาย",
        "ยอดรวม (฿)",
      ];
      const itemRows = summaryData.items.map((item, i) => [
        i + 1,
        item.name,
        item.sku_code,
        item.price,
        item.qty,
        item.revenue,
      ]);
      const ws2 = XLSX.utils.aoa_to_sheet([itemHeaders, ...itemRows]);
      ws2["!cols"] = [
        { wch: 6 },
        { wch: 30 },
        { wch: 20 },
        { wch: 15 },
        { wch: 12 },
        { wch: 12 },
      ];
      XLSX.utils.book_append_sheet(wb, ws2, "รายการสินค้า");

      // Sheet 3: Bills
      const billHeaders = [
        "เลขบิล",
        "เวลา",
        "จำนวนสินค้า",
        "ยอดเงิน (฿)",
        "วิธีชำระ",
      ];
      const billRows = summaryData.bills.map((bill) => [
        bill.billId,
        bill.time,
        bill.itemCount,
        bill.total,
        bill.paymentMethod,
      ]);
      const ws3 = XLSX.utils.aoa_to_sheet([billHeaders, ...billRows]);
      ws3["!cols"] = [
        { wch: 12 },
        { wch: 10 },
        { wch: 12 },
        { wch: 12 },
        { wch: 10 },
      ];
      XLSX.utils.book_append_sheet(wb, ws3, "รายการบิล");

      // Download
      XLSX.writeFile(wb, `สรุปยอดขาย_${summaryDate}.xlsx`);
    })
    .catch(() => {
      alert("ไม่สามารถ export ได้ กรุณาลองใหม่");
    });
}

export const SummaryModal: React.FC<SummaryModalProps> = ({
  showSummary,
  setShowSummary,
  summaryData,
  summaryLoading,
  summaryTab,
  setSummaryTab,
  summaryDate,
  availableDates,
  navigateSummaryDate,
  showDatePicker,
  setShowDatePicker,
  selectSummaryDate,
  getTodayDateStr,
  products,
}) => {
  if (!showSummary) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 lg:p-8">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
        onClick={() => setShowSummary(false)}
      />

      <div
        className="relative w-full sm:max-w-lg lg:max-w-xl rounded-t-[40px] sm:rounded-[40px] lg:rounded-[50px] bg-[#0b0f19] border-t-2 sm:border-2 border-white/[0.08] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] overflow-hidden max-h-[94dvh] flex flex-col"
        style={{ animation: "slide-up .4s cubic-bezier(0.16, 1, 0.3, 1) both" }}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 lg:px-8 pt-6 sm:pt-8 lg:pt-10 pb-4 sm:pb-5 lg:pb-6 border-b border-white/[0.04] shrink-0">
          <div className="flex items-center justify-between mb-5 sm:mb-6 lg:mb-8">
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-white flex items-center gap-2 sm:gap-3 italic tracking-tighter uppercase">
              📈 สรุปยอดขาย
            </h3>
            <div className="flex items-center gap-2">
              {/* Export Button */}
              {summaryData && !summaryLoading && summaryData.totalBills > 0 && (
                <button
                  onClick={() => exportToExcel(summaryData, summaryDate)}
                  className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-full flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all text-emerald-400 text-lg sm:text-xl"
                  title="Export Excel"
                >
                  📥
                </button>
              )}
              <button
                onClick={() => setShowSummary(false)}
                className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-full flex items-center justify-center bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all text-slate-400 font-bold"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Date navigator */}
          <div className="relative mb-4 sm:mb-5 lg:mb-6">
            <div className="flex items-center justify-between bg-white/[0.02] rounded-2xl sm:rounded-[32px] p-1.5 sm:p-2 border-2 border-white/[0.06]">
              <button
                onClick={() => navigateSummaryDate(-1)}
                disabled={
                  summaryLoading ||
                  availableDates.indexOf(summaryDate) >=
                    availableDates.length - 1
                }
                className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center bg-white/[0.04] text-white text-lg sm:text-xl lg:text-2xl font-black disabled:opacity-5 active:scale-90 transition-all"
              >
                ‹
              </button>
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl hover:bg-white/[0.04] transition-all"
              >
                <span className="text-base sm:text-xl lg:text-2xl font-black text-white font-mono tracking-wider tabular-nums">
                  {summaryDate}
                </span>
                {summaryDate === getTodayDateStr() && (
                  <span className="bg-cyan-500 text-black text-[8px] sm:text-[10px] font-black px-2 sm:px-3 py-0.5 sm:py-1 rounded-full uppercase tracking-widest italic">
                    วันนี้
                  </span>
                )}
              </button>
              <button
                onClick={() => navigateSummaryDate(1)}
                disabled={
                  summaryLoading || availableDates.indexOf(summaryDate) <= 0
                }
                className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center bg-white/[0.04] text-white text-lg sm:text-xl lg:text-2xl font-black disabled:opacity-5 active:scale-90 transition-all"
              >
                ›
              </button>
            </div>

            {/* Date dropdown */}
            {showDatePicker && availableDates.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 sm:mt-4 rounded-2xl sm:rounded-[32px] bg-[#0d1117] border-2 border-white/[0.1] shadow-2xl z-20 overflow-hidden">
                <div
                  className="max-h-[250px] sm:max-h-[300px] overflow-y-auto"
                  style={{ scrollbarWidth: "none" }}
                >
                  {availableDates.map((date) => (
                    <button
                      key={date}
                      onClick={() => selectSummaryDate(date)}
                      className={`w-full px-5 sm:px-8 py-3.5 sm:py-5 text-left text-base sm:text-xl font-black transition-all flex items-center justify-between border-b border-white/5
                        ${date === summaryDate ? "bg-cyan-500 text-black" : "text-slate-400 hover:bg-white/[0.04] hover:text-white"}`}
                    >
                      <span className="tabular-nums font-mono">{date}</span>
                      {date === getTodayDateStr() && (
                        <span className="text-[9px] sm:text-[10px] font-black uppercase italic tracking-widest opacity-80">
                          Today
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Revenue Summaries */}
          {summaryData && !summaryLoading && (
            <div className="mb-4 sm:mb-5 lg:mb-6 space-y-3 sm:space-y-4">
              <div className="rounded-3xl sm:rounded-[40px] bg-linear-to-br from-cyan-400/20 to-blue-600/10 border-2 border-cyan-500/20 p-5 sm:p-7 lg:p-10 text-center shadow-xl">
                <p className="text-[9px] sm:text-[10px] text-cyan-400 uppercase tracking-[0.4em] font-black mb-1 sm:mb-2 italic">
                  Gross Revenue
                </p>
                <p className="text-3xl sm:text-4xl lg:text-6xl font-black text-white tabular-nums tracking-tighter">
                  {summaryData.totalRevenue.toLocaleString()}
                  <span className="text-sm sm:text-lg lg:text-xl ml-1 sm:ml-2 text-cyan-400 font-bold uppercase">
                    ฿
                  </span>
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div className="rounded-2xl sm:rounded-[32px] bg-emerald-500/10 border-2 border-emerald-500/10 p-4 sm:p-5 lg:p-6 flex flex-col items-center shadow-lg">
                  <p className="text-[9px] sm:text-[10px] text-emerald-400 uppercase font-black tracking-widest mb-1 italic">
                    💵 CASH
                  </p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-black text-emerald-200 tabular-nums">
                    {(summaryData.totalCash || 0).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-2xl sm:rounded-[32px] bg-cyan-500/10 border-2 border-cyan-500/10 p-4 sm:p-5 lg:p-6 flex flex-col items-center shadow-lg">
                  <p className="text-[9px] sm:text-[10px] text-cyan-400 uppercase font-black tracking-widest mb-1 italic">
                    📱 TRANSFER
                  </p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-black text-cyan-200 tabular-nums">
                    {(summaryData.totalTransfer || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab Switcher */}
          {!summaryLoading && summaryData && (
            <div className="flex gap-1.5 sm:gap-2 bg-white/[0.03] rounded-xl sm:rounded-[24px] p-1.5 sm:p-2 border-2 border-white/[0.06]">
              {[
                { key: "items" as const, label: "🏆 ขายดี" },
                { key: "bills" as const, label: "🧾 บิลวันนี้" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSummaryTab(tab.key)}
                  className={`flex-1 rounded-lg sm:rounded-2xl py-3 sm:py-4 lg:py-5 text-sm sm:text-base lg:text-lg font-black transition-all ${
                    summaryTab === tab.key
                      ? "bg-white text-black shadow-2xl scale-[1.02] italic"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content Area */}
        <div
          className="flex-1 overflow-y-auto px-5 sm:px-6 lg:px-8 py-3 sm:py-4 space-y-2.5 sm:space-y-4"
          style={{ scrollbarWidth: "none" }}
        >
          {summaryLoading ? (
            <div className="flex flex-col items-center justify-center py-14 sm:py-20 gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
              <span className="text-base sm:text-xl font-black text-slate-500 italic uppercase">
                Loading Data...
              </span>
            </div>
          ) : !summaryData || summaryData.totalBills === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 sm:py-24 gap-4 sm:gap-6 text-slate-700 opacity-40 italic">
              <span className="text-6xl sm:text-8xl">📭</span>
              <span className="text-lg sm:text-2xl font-black uppercase tracking-tighter">
                No Sales Recorded
              </span>
            </div>
          ) : summaryTab === "items" ? (
            <div className="space-y-2.5 sm:space-y-4">
              {summaryData.items.map((item, i) => {
                const maxRevenue = summaryData.items[0]?.revenue || 1;
                const barWidth = (item.revenue / maxRevenue) * 100;
                const productMatch = products.find(
                  (p) => p.sku_code === item.sku_code,
                );
                return (
                  <div
                    key={item.sku_code || item.name}
                    className="relative rounded-2xl sm:rounded-[32px] p-4 sm:p-5 lg:p-6 bg-white/[0.02] border-2 border-white/[0.04] overflow-hidden shadow-lg"
                  >
                    <div
                      className="absolute inset-y-0 left-0 bg-linear-to-r from-cyan-500/[0.08] to-transparent"
                      style={{ width: `${barWidth}%` }}
                    />
                    <div className="relative flex items-center justify-between gap-3 sm:gap-6">
                      <div className="flex items-center gap-3 sm:gap-4 lg:gap-6 min-w-0">
                        <span className="text-base sm:text-xl font-black text-slate-700 w-6 sm:w-8 text-center shrink-0">
                          #{i + 1}
                        </span>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 rounded-xl sm:rounded-2xl bg-[#0b0f19] border-2 border-white/[0.08] overflow-hidden shrink-0 flex items-center justify-center shadow-xl">
                          <img
                            src={productMatch?.image || "/image/empty.jpg"}
                            alt={item.name}
                            className="w-full h-full object-contain p-0.5 sm:p-1"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "/image/empty.jpg";
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm sm:text-base lg:text-xl font-black text-slate-100 truncate italic leading-tight">
                            {item.name}
                          </p>
                          <p className="text-[10px] sm:text-xs lg:text-sm font-bold text-slate-500 mt-0.5 sm:mt-1 uppercase tracking-widest">
                            {item.price.toLocaleString()} ฿
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 sm:gap-2 shrink-0">
                        <span className="text-base sm:text-lg lg:text-2xl font-black text-white tabular-nums tracking-tighter">
                          {item.revenue.toLocaleString()} ฿
                        </span>
                        <span className="text-[9px] sm:text-[10px] lg:text-xs font-black bg-cyan-500 text-black px-2 sm:px-3 py-0.5 sm:py-1 rounded-full italic tabular-nums">
                          ×{item.qty}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2.5 sm:space-y-4">
              {summaryData.bills.map((bill) => (
                <div
                  key={bill.billId}
                  className="rounded-2xl sm:rounded-[32px] p-4 sm:p-5 lg:p-6 bg-white/[0.02] border-2 border-white/[0.04] flex items-center justify-between gap-3 sm:gap-6 shadow-md"
                >
                  <div className="flex items-center gap-3 sm:gap-4 lg:gap-6 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 rounded-full bg-violet-500/10 border-2 border-violet-500/20 flex items-center justify-center shrink-0">
                      <span className="text-[9px] sm:text-[10px] lg:text-xs font-black text-violet-400">
                        ID:{bill.billId.slice(-4)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-base sm:text-xl lg:text-2xl font-black text-slate-100 italic font-mono uppercase tracking-tighter">
                        {bill.time}
                      </p>
                      <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
                        {bill.paymentMethod === "โอน" ? (
                          <span className="bg-cyan-500 text-black text-[8px] sm:text-[10px] font-black px-2 sm:px-3 py-0.5 sm:py-1 rounded-full uppercase tracking-widest italic leading-none">
                            TRANSFER
                          </span>
                        ) : (
                          <span className="bg-emerald-500 text-black text-[8px] sm:text-[10px] font-black px-2 sm:px-3 py-0.5 sm:py-1 rounded-full uppercase tracking-widest italic leading-none">
                            CASH
                          </span>
                        )}
                        <span className="text-[9px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest opacity-60">
                          / {bill.itemCount} Items
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-lg sm:text-2xl lg:text-3xl font-black text-white tabular-nums tracking-tighter shadow-sm">
                    {bill.total.toLocaleString()} ฿
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>


      </div>
    </div>
  );
};
