"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { DailySummaryData } from "@/components/PosTypes";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

function getTodayDateStr() {
  const now = new Date();
  const th = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const dd = String(th.getUTCDate()).padStart(2, "0");
  const mm = String(th.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = th.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function formatNumber(value: number) {
  return value.toLocaleString();
}

function getDiffTone(diff: number) {
  if (diff > 0) {
    return "text-emerald-300";
  }
  if (diff < 0) {
    return "text-red-300";
  }
  return "text-slate-200";
}

export default function SummaryPage() {
  const [summaryDate, setSummaryDate] = useState(getTodayDateStr());
  const [summaryData, setSummaryData] = useState<DailySummaryData | null>(null);
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSummary = async (date: string) => {
    setLoading(true);
    try {
      const [summaryRes, datesRes] = await Promise.all([
        fetch(`/api/daily-summary?date=${date}`),
        fetch("/api/available-dates"),
      ]);

      if (summaryRes.ok) {
        setSummaryData(await summaryRes.json());
      } else {
        setSummaryData(null);
      }

      if (datesRes.ok) {
        const data = await datesRes.json();
        setDates(data.dates || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary(summaryDate);
  }, [summaryDate]);

  const topItems = useMemo(
    () => summaryData?.items.slice(0, 8) || [],
    [summaryData],
  );
  const recentBills = useMemo(
    () => summaryData?.bills.slice(0, 8) || [],
    [summaryData],
  );
  const stockHighlights = useMemo(() => {
    if (!summaryData?.stockItems.length) {
      return [];
    }
    return [...summaryData.stockItems]
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
      .slice(0, 6);
  }, [summaryData]);

  const hasData = Boolean(
    summaryData &&
    (summaryData.totalBills > 0 ||
      summaryData.items.length > 0 ||
      summaryData.stockItems.length > 0),
  );

  return (
    <AppShell title="สรุปยอด" subtitle={`รายวัน • ${summaryDate}`}>
      <div className="space-y-5">
        <section className="overflow-hidden rounded-[36px] border border-white/[0.06] bg-linear-to-br from-cyan-500/10 via-white/[0.04] to-transparent shadow-2xl shadow-black/25">
          <div className="grid gap-6 p-5 lg:p-7 2xl:grid-cols-[minmax(0,1.2fr)_320px]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200">
                Daily Sales Summary
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white lg:text-4xl">
                ภาพรวมยอดขายและสต๊อกในวันเดียว
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 lg:text-base">
                ดูยอดขายรวม เงินสด เงินโอน จำนวนบิล สินค้าขายดี
                และสรุปส่วนต่างสต๊อก ของวันเดียวกันได้ในหน้าเดียว
                เหมาะสำหรับเช็กภาพรวมก่อนปิดรอบ
              </p>
            </div>

            <div className="rounded-[28px] border border-white/[0.06] bg-[#0d1117]/90 p-4 shadow-xl shadow-black/20">
              <SearchableSelect
                label="เลือกวันที่"
                value={summaryDate}
                onChange={setSummaryDate}
                options={[summaryDate, ...dates.filter((date) => date !== summaryDate)].map((date) => ({
                  value: date,
                  label: date,
                  keywords: date,
                }))}
                placeholder="เลือกวันที่"
                searchPlaceholder="ค้นหาวันที่..."
              />

              <div className="mt-4 grid grid-cols-2 gap-3">
                <QuickStat
                  label="จำนวนบิล"
                  value={summaryData?.totalBills || 0}
                  unit="ใบ"
                  accent="text-amber-300"
                />
                <QuickStat
                  label="จำนวนชิ้น"
                  value={summaryData?.totalItems || 0}
                  unit="ชิ้น"
                  accent="text-violet-300"
                />
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="rounded-[32px] border border-white/[0.06] bg-white/[0.03] p-10 text-center text-slate-400">
            กำลังโหลดข้อมูลสรุปยอด...
          </div>
        ) : !hasData ? (
          <div className="rounded-[32px] border border-dashed border-white/[0.08] bg-white/[0.02] p-12 text-center text-slate-400">
            ยังไม่มีข้อมูลสรุปสำหรับวันที่เลือก
          </div>
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-6">
              <SummaryMetricCard
                label="ยอดขายรวม"
                value={summaryData?.totalRevenue || 0}
                unit="฿"
                accent="text-cyan-300"
              />
              <SummaryMetricCard
                label="เงินสด"
                value={summaryData?.totalCash || 0}
                unit="฿"
                accent="text-emerald-300"
              />
              <SummaryMetricCard
                label="เงินโอน"
                value={summaryData?.totalTransfer || 0}
                unit="฿"
                accent="text-sky-300"
              />
              <SummaryMetricCard
                label="จำนวนบิล"
                value={summaryData?.totalBills || 0}
                unit="ใบ"
                accent="text-amber-300"
              />
              <SummaryMetricCard
                label="จำนวนชิ้น"
                value={summaryData?.totalItems || 0}
                unit="ชิ้น"
                accent="text-violet-300"
              />
              <SummaryMetricCard
                label="ส่วนต่างสต๊อกรวม"
                value={summaryData?.stockTotals.totalDiff || 0}
                unit="ชิ้น"
                accent={getDiffTone(summaryData?.stockTotals.totalDiff || 0)}
              />
            </section>

            <section className="grid gap-5 2xl:grid-cols-[minmax(0,1.1fr)_0.9fr]">
              <div className="rounded-[32px] border border-white/[0.06] bg-white/[0.03] p-4 shadow-xl shadow-black/20 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                      Best Sellers
                    </p>
                    <h3 className="mt-2 text-xl font-black text-white">
                      สินค้าขายดีของวัน
                    </h3>
                  </div>
                  <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-slate-300">
                    {topItems.length} รายการ
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {topItems.length ? (
                    topItems.map((item, index) => (
                      <div
                        key={item.sku_code || item.name}
                        className="rounded-[24px] border border-white/[0.06] bg-[#0d1117] p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                              อันดับ {index + 1}
                            </p>
                            <h4 className="mt-2 truncate text-lg font-black text-white">
                              {item.name}
                            </h4>
                            <p className="mt-1 truncate text-sm text-slate-400">
                              {item.sku_code || "ไม่มี SKU"} •{" "}
                              {formatNumber(item.price)} ฿/ชิ้น
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-black text-cyan-300">
                              {formatNumber(item.revenue)} ฿
                            </p>
                            <p className="mt-1 text-sm font-bold text-slate-400">
                              ขาย {formatNumber(item.qty)} ชิ้น
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400">
                      ยังไม่มีรายการขายในวันที่เลือก
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-5">
                <section className="rounded-[32px] border border-white/[0.06] bg-white/[0.03] p-4 shadow-xl shadow-black/20 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                        Bills
                      </p>
                      <h3 className="mt-2 text-xl font-black text-white">
                        รายการบิลล่าสุด
                      </h3>
                    </div>
                    <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-slate-300">
                      {recentBills.length} บิล
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {recentBills.length ? (
                      recentBills.map((bill) => (
                        <div
                          key={bill.billId}
                          className="rounded-[24px] border border-white/[0.06] bg-[#0d1117] p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-lg font-black text-white">
                                {bill.time}
                              </p>
                              <p className="mt-1 text-sm text-slate-400">
                                {bill.paymentMethod} •{" "}
                                {formatNumber(bill.itemCount)} ชิ้น • ID:
                                {bill.billId}
                              </p>
                            </div>
                            <span className="text-lg font-black text-white">
                              {formatNumber(bill.total)} ฿
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400">
                        ยังไม่มีบิลในวันที่เลือก
                      </p>
                    )}
                  </div>
                </section>

                <section className="rounded-[32px] border border-white/[0.06] bg-white/[0.03] p-4 shadow-xl shadow-black/20 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                        Stock Check
                      </p>
                      <h3 className="mt-2 text-xl font-black text-white">
                        จุดที่ควรเช็กสต๊อก
                      </h3>
                    </div>
                    <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-slate-300">
                      {stockHighlights.length} รายการ
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {stockHighlights.length ? (
                      stockHighlights.map((item) => (
                        <div
                          key={item.sku_code || item.name}
                          className="rounded-[24px] border border-white/[0.06] bg-[#0d1117] p-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <h4 className="truncate font-black text-white">
                                {item.name}
                              </h4>
                              <p className="mt-1 truncate text-sm text-slate-400">
                                ควรเหลือ {formatNumber(item.shouldRemain)} •
                                นับจริง {formatNumber(item.actual)}
                              </p>
                            </div>
                            <span
                              className={`text-lg font-black ${getDiffTone(item.diff)}`}
                            >
                              {item.diff > 0 ? "+" : ""}
                              {formatNumber(item.diff)}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400">
                        ยังไม่มีข้อมูลสต๊อกของวันที่เลือก
                      </p>
                    )}
                  </div>
                </section>
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

function SummaryMetricCard({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: number;
  unit: string;
  accent: string;
}) {
  return (
    <div className="rounded-[28px] border border-white/[0.06] bg-white/[0.03] p-4 shadow-lg shadow-black/20">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
        {label}
      </p>
      <p
        className={`mt-3 text-3xl font-black tabular-nums sm:text-4xl ${accent}`}
      >
        {formatNumber(value)}
        <span className="ml-2 text-sm text-slate-400">{unit}</span>
      </p>
    </div>
  );
}

function QuickStat({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: number;
  unit: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0b0f19] px-4 py-3">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-black tabular-nums ${accent}`}>
        {formatNumber(value)}
        <span className="ml-2 text-xs text-slate-500">{unit}</span>
      </p>
    </div>
  );
}

