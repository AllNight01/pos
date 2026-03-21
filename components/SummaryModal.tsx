"use client";

import React from "react";
import { DailySummaryData, Product, StockSummaryItem } from "./PosTypes";

interface SummaryModalProps {
  showSummary: boolean;
  setShowSummary: (show: boolean) => void;
  summaryData: DailySummaryData | null;
  summaryLoading: boolean;
  summaryTab: "items" | "bills" | "stock";
  setSummaryTab: (tab: "items" | "bills" | "stock") => void;
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
  import("xlsx")
    .then((XLSX) => {
      const wb = XLSX.utils.book_new();

      const overviewData = [
        ["สรุปประจำวัน", summaryDate],
        [],
        ["จำนวนบิลทั้งหมด", summaryData.totalBills],
        ["ยอดขายรวม (฿)", summaryData.totalRevenue],
        ["เงินสด (฿)", summaryData.totalCash || 0],
        ["เงินโอน (฿)", summaryData.totalTransfer || 0],
        ["จำนวนชิ้นที่ขาย", summaryData.totalItems],
        ["จำนวนสินค้าสต๊อก", summaryData.stockTotals.totalProducts],
        ["ส่วนต่างสต๊อกรวม", summaryData.stockTotals.totalDiff],
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(overviewData);
      ws1["!cols"] = [{ wch: 24 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, ws1, "ภาพรวม");

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
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
      ];
      XLSX.utils.book_append_sheet(wb, ws2, "ยอดขายรายสินค้า");

      const billHeaders = [
        "เลขบิล",
        "เวลา",
        "จำนวนสินค้า",
        "ยอดเงิน (฿)",
        "การชำระเงิน",
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
        { wch: 14 },
        { wch: 12 },
      ];
      XLSX.utils.book_append_sheet(wb, ws3, "รายการบิล");

      const stockHeaders = [
        "ลำดับ",
        "ชื่อสินค้า",
        "รหัส SKU",
        "ยกมา",
        "เบิกชิ้น",
        "ขาย",
        "ควรเหลือ",
        "นับจริง",
        "ส่วนต่าง",
        "คงเหลือแพ็ค",
        "คงเหลือลัง",
      ];
      const stockRows = summaryData.stockItems.map((item, i) => [
        i + 1,
        item.name,
        item.sku_code,
        item.start_bal,
        item.withdraw,
        item.sold,
        item.shouldRemain,
        item.actual,
        item.diff,
        item.remainPacks,
        item.remainCrates,
      ]);
      const ws4 = XLSX.utils.aoa_to_sheet([stockHeaders, ...stockRows]);
      ws4["!cols"] = [
        { wch: 6 },
        { wch: 30 },
        { wch: 20 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 12 },
        { wch: 12 },
        { wch: 10 },
        { wch: 12 },
        { wch: 12 },
      ];
      XLSX.utils.book_append_sheet(wb, ws4, "สรุปสต๊อก");

      XLSX.writeFile(wb, `summary_${summaryDate}.xlsx`);
    })
    .catch(() => {
      alert("ไม่สามารถ export ได้ กรุณาลองใหม่");
    });
}

function formatSignedNumber(value: number) {
  if (value > 0) {
    return `+${value.toLocaleString()}`;
  }
  return value.toLocaleString();
}

function getDiffTone(diff: number) {
  if (diff > 0) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }
  if (diff < 0) {
    return "border-red-500/20 bg-red-500/10 text-red-300";
  }
  return "border-white/[0.08] bg-white/[0.03] text-slate-300";
}

function getPaymentLabel(paymentMethod: string) {
  return paymentMethod === "โอน" ? "เงินโอน" : "เงินสด";
}

function StockSummaryCard({
  item,
  image,
}: {
  item: StockSummaryItem;
  image?: string;
}) {
  return (
    <div className="rounded-[28px] border border-white/[0.06] bg-white/[0.03] p-4 shadow-lg shadow-black/20">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0f19]">
            <img
              src={image || "/image/empty.jpg"}
              alt={item.name}
              className="h-full w-full object-contain p-1"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/image/empty.jpg";
              }}
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-black text-white">
              {item.name}
            </p>
            <p className="mt-1 truncate text-xs uppercase tracking-[0.18em] text-slate-400">
              {item.sku_code || "ไม่มี SKU"}
            </p>
          </div>
        </div>
        <div
          className={`rounded-2xl border px-3 py-2 text-right ${getDiffTone(item.diff)}`}
        >
          <p className="text-[11px] font-black uppercase tracking-[0.18em] opacity-80">
            ส่วนต่าง
          </p>
          <p className="text-lg font-black tabular-nums">
            {formatSignedNumber(item.diff)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        <Metric label="ยกมา" value={item.start_bal} />
        <Metric label="เบิก" value={item.withdraw} color="text-cyan-300" />
        <Metric label="ขาย" value={item.sold} color="text-amber-300" />
        <Metric label="ควรเหลือ" value={item.shouldRemain} color="text-white" />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {item.remainPacks > 0 && (
            <span className="rounded-full border border-fuchsia-500/20 bg-fuchsia-500/10 px-3 py-1 text-xs font-bold text-fuchsia-300">
              เหลือแพ็ค {item.remainPacks}
            </span>
          )}
          {item.remainCrates > 0 && (
            <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-bold text-sky-300">
              เหลือลัง {item.remainCrates}
            </span>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            นับจริง
          </p>
          <p className="text-2xl font-black text-white tabular-nums">
            {item.actual.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  color = "text-slate-200",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0d1117] px-3 py-3 text-center">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className={`mt-2 text-lg font-black tabular-nums ${color}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
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
  if (!showSummary) {
    return null;
  }

  const hasSalesData = Boolean(
    summaryData && (summaryData.totalBills > 0 || summaryData.items.length > 0),
  );
  const hasStockData = Boolean(
    summaryData && summaryData.stockItems.length > 0,
  );
  const isEmpty = !summaryLoading && !hasSalesData && !hasStockData;
  const highlightValue =
    summaryTab === "stock"
      ? summaryData?.stockTotals.totalDiff || 0
      : summaryData?.totalRevenue || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4 lg:p-6">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
        onClick={() => setShowSummary(false)}
      />

      <div
        className="relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[40px] border-t-2 border-white/[0.08] bg-[#0b0f19] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] sm:rounded-[40px] sm:border-2 lg:max-w-[94vw] lg:rounded-[50px] 2xl:max-w-7xl"
        style={{ animation: "slide-up .4s cubic-bezier(0.16, 1, 0.3, 1) both" }}
      >
        <div className="shrink-0 border-b border-white/[0.04] px-4 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6 lg:px-8 lg:pb-6 lg:pt-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200">
                Summary Workspace
              </p>
              <h3 className="mt-2 text-2xl font-black tracking-tight text-white lg:text-3xl">
                สรุปยอดและสต๊อกประจำวัน
              </h3>
            </div>

            <div className="flex items-center gap-2">
              {summaryData &&
                !summaryLoading &&
                (hasSalesData || hasStockData) && (
                  <button
                    type="button"
                    onClick={() => exportToExcel(summaryData, summaryDate)}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-lg text-emerald-400 transition-all hover:bg-emerald-500/20"
                    title="Export Excel"
                  >
                    ⇩
                  </button>
                )}
              <button
                type="button"
                onClick={() => setShowSummary(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.04] text-lg font-bold text-slate-400 transition-all hover:bg-white/[0.08] hover:text-white"
              >
                ×
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="relative">
              <div className="flex items-center justify-between rounded-[28px] border border-white/[0.06] bg-white/[0.03] p-2">
                <button
                  type="button"
                  onClick={() => navigateSummaryDate(-1)}
                  disabled={
                    summaryLoading ||
                    availableDates.indexOf(summaryDate) >=
                      availableDates.length - 1
                  }
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.04] text-xl font-black text-white transition-all disabled:opacity-20"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="flex items-center gap-3 rounded-2xl px-4 py-2 transition-all hover:bg-white/[0.04]"
                >
                  <span className="text-lg font-black text-white tabular-nums sm:text-xl">
                    {summaryDate}
                  </span>
                  {summaryDate === getTodayDateStr() && (
                    <span className="rounded-full bg-cyan-500 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-black">
                      วันนี้
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => navigateSummaryDate(1)}
                  disabled={
                    summaryLoading || availableDates.indexOf(summaryDate) <= 0
                  }
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.04] text-xl font-black text-white transition-all disabled:opacity-20"
                >
                  ›
                </button>
              </div>

              {showDatePicker && availableDates.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-3 overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#0d1117] shadow-2xl">
                  <div
                    className="max-h-[280px] overflow-y-auto"
                    style={{ scrollbarWidth: "none" }}
                  >
                    {availableDates.map((date) => (
                      <button
                        key={date}
                        type="button"
                        onClick={() => selectSummaryDate(date)}
                        className={`flex w-full items-center justify-between whitespace-nowrap border-b border-white/[0.04] px-5 py-4 text-left text-base font-black transition-all ${
                          date === summaryDate
                            ? "bg-cyan-500 text-black"
                            : "text-slate-300 hover:bg-white/[0.04] hover:text-white"
                        }`}
                      >
                        <span className="tabular-nums">{date}</span>
                        {date === getTodayDateStr() && (
                          <span className="text-xs uppercase tracking-[0.18em] opacity-80">
                            Today
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-[28px] border border-cyan-500/20 bg-linear-to-br from-cyan-500/12 to-blue-500/10 p-4 text-center">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">
                {summaryTab === "stock" ? "ส่วนต่างรวม" : "ยอดขายรวม"}
              </p>
              <p className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
                {highlightValue.toLocaleString()}
                <span className="ml-2 text-base text-cyan-300">
                  {summaryTab === "stock" ? "ชิ้น" : "฿"}
                </span>
              </p>
            </div>
          </div>

          {!summaryLoading && summaryData && (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {summaryTab === "stock" ? (
                  <>
                    <SummaryStatCard
                      label="จำนวนสินค้าในรายงาน"
                      value={summaryData.stockTotals.totalProducts}
                      accent="text-white"
                    />
                    <SummaryStatCard
                      label="สินค้าขาด"
                      value={summaryData.stockTotals.shortageCount}
                      accent="text-red-300"
                    />
                    <SummaryStatCard
                      label="สินค้าเกิน"
                      value={summaryData.stockTotals.overCount}
                      accent="text-emerald-300"
                    />
                    <SummaryStatCard
                      label="นับแล้ว"
                      value={summaryData.stockTotals.countedProducts}
                      accent="text-cyan-300"
                    />
                  </>
                ) : (
                  <>
                    <SummaryStatCard
                      label="เงินสด"
                      value={summaryData.totalCash || 0}
                      accent="text-emerald-300"
                    />
                    <SummaryStatCard
                      label="เงินโอน"
                      value={summaryData.totalTransfer || 0}
                      accent="text-sky-300"
                    />
                    <SummaryStatCard
                      label="จำนวนบิล"
                      value={summaryData.totalBills}
                      accent="text-amber-300"
                    />
                    <SummaryStatCard
                      label="จำนวนชิ้น"
                      value={summaryData.totalItems}
                      accent="text-violet-300"
                    />
                  </>
                )}
              </div>

              <div className="mt-4 flex gap-2 rounded-[24px] border border-white/[0.06] bg-white/[0.03] p-2">
                {[
                  { key: "items" as const, label: "สินค้าขายดี" },
                  { key: "bills" as const, label: "รายการบิล" },
                  { key: "stock" as const, label: "สรุปสต๊อก" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setSummaryTab(tab.key)}
                    className={`flex-1 whitespace-nowrap rounded-2xl px-3 py-3 text-sm font-black transition-all sm:text-base ${
                      summaryTab === tab.key
                        ? "bg-white text-black shadow-xl"
                        : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3 sm:px-6 sm:pb-6 lg:px-8 lg:pb-8"
          style={{ scrollbarWidth: "none" }}
        >
          {summaryLoading ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-500/20 border-t-cyan-500" />
              <span className="text-lg font-black uppercase tracking-[0.2em] text-slate-500">
                Loading Data
              </span>
            </div>
          ) : isEmpty ? (
            <div className="rounded-[32px] border border-dashed border-white/[0.08] bg-white/[0.02] px-6 py-16 text-center text-slate-400">
              ยังไม่มีข้อมูลสำหรับวันที่เลือก
            </div>
          ) : summaryTab === "items" ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {summaryData?.items.map((item, index) => {
                const productMatch = products.find(
                  (product) => product.sku_code === item.sku_code,
                );
                return (
                  <div
                    key={item.sku_code || item.name}
                    className="rounded-[28px] border border-white/[0.06] bg-white/[0.03] p-4 shadow-lg shadow-black/20"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0f19]">
                          <img
                            src={productMatch?.image || "/image/empty.jpg"}
                            alt={item.name}
                            className="h-full w-full object-contain p-1"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "/image/empty.jpg";
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                            อันดับ {index + 1}
                          </p>
                          <h4 className="mt-1 truncate text-lg font-black text-white">
                            {item.name}
                          </h4>
                          <p className="mt-1 truncate text-sm text-slate-400">
                            {item.sku_code || "ไม่มี SKU"} •{" "}
                            {item.price.toLocaleString()} ฿/ชิ้น
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-cyan-300">
                          {item.revenue.toLocaleString()} ฿
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-400">
                          ขาย {item.qty.toLocaleString()} ชิ้น
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : summaryTab === "bills" ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {summaryData?.bills.map((bill) => (
                <div
                  key={bill.billId}
                  className="rounded-[28px] border border-white/[0.06] bg-white/[0.03] p-4 shadow-lg shadow-black/20"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-black text-white">
                        {bill.time}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        ID:{bill.billId} • {bill.itemCount.toLocaleString()}{" "}
                        ชิ้น
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-white">
                        {bill.total.toLocaleString()} ฿
                      </p>
                      <span className="mt-2 inline-flex rounded-full border border-white/[0.08] bg-[#0d1117] px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-slate-300">
                        {getPaymentLabel(bill.paymentMethod)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-3 xl:grid-cols-2">
              {summaryData?.stockItems.length ? (
                summaryData.stockItems.map((item) => {
                  const productMatch = products.find(
                    (product) => product.sku_code === item.sku_code,
                  );
                  return (
                    <StockSummaryCard
                      key={item.sku_code || item.name}
                      item={item}
                      image={productMatch?.image}
                    />
                  );
                })
              ) : (
                <div className="rounded-[32px] border border-dashed border-white/[0.08] bg-white/[0.02] px-6 py-14 text-center text-slate-400 xl:col-span-2">
                  ยังไม่มีข้อมูลสต๊อกสำหรับวันที่เลือก
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function SummaryStatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.03] p-4">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
        {label}
      </p>
      <p className={`mt-3 text-3xl font-black tabular-nums ${accent}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}
