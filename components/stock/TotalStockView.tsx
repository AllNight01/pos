"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  StockOverviewData,
  StockOverviewItem,
  StockSession,
} from "@/components/PosTypes";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui/SearchableSelect";

interface StockSessionResponse {
  current: StockSession | null;
  sessions: StockSession[];
}

function formatNumber(value: number) {
  return value.toLocaleString();
}

function getBalanceTone(totalBalance: number) {
  if (totalBalance <= 0) {
    return "border-red-500/20 bg-red-500/10 text-red-200";
  }
  if (totalBalance <= 5) {
    return "border-amber-500/20 bg-amber-500/10 text-amber-200";
  }
  return "border-emerald-500/20 bg-emerald-500/10 text-emerald-200";
}

function getSessionStatusLabel(
  selectedSessionId: string,
  activeSessionLabel: string,
) {
  if (selectedSessionId === "all") {
    return "กำลังแสดงข้อมูลรวมทุกรอบ";
  }
  if (activeSessionLabel) {
    return `กำลังแสดงข้อมูลของ ${activeSessionLabel}`;
  }
  return "ยังไม่มีรอบสต๊อกให้เลือก";
}

export function TotalStockView() {
  const [overview, setOverview] = useState<StockOverviewData | null>(null);
  const [sessions, setSessions] = useState<StockSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeSessionLabel, setActiveSessionLabel] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("all");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const sessionRes = await fetch("/api/stock-session");
        if (!sessionRes.ok) {
          setOverview(null);
          return;
        }

        const sessionData = (await sessionRes.json()) as StockSessionResponse;
        const availableSessions = sessionData.sessions || [];
        setSessions(availableSessions);

        const fallbackSession =
          selectedSessionId === "all"
            ? null
            : availableSessions.find(
                (session) => session.session_id === selectedSessionId,
              ) ||
              sessionData.current ||
              availableSessions[0] ||
              null;

        const overviewUrl =
          selectedSessionId === "all"
            ? "/api/stock-overview?session_id=all"
            : fallbackSession?.session_id
              ? `/api/stock-overview?session_id=${encodeURIComponent(fallbackSession.session_id)}`
              : "/api/stock-overview";
        const overviewRes = await fetch(overviewUrl);

        if (!overviewRes.ok) {
          setOverview(null);
          return;
        }

        const data = (await overviewRes.json()) as StockOverviewData;
        setOverview(data);
        setActiveSessionLabel(
          selectedSessionId === "all" ? "ทุกรอบ" : fallbackSession?.label || "",
        );

        if (
          selectedSessionId !== "all" &&
          fallbackSession?.session_id &&
          fallbackSession.session_id !== selectedSessionId
        ) {
          setSelectedSessionId(fallbackSession.session_id);
        }
      } catch (error) {
        console.error(error);
        setOverview(null);
        setActiveSessionLabel("");
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedSessionId]);

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const items =
      overview?.items.map((item) => ({
        ...item,
        totalBalance: item.warehouseBalance + item.storefrontBalance,
      })) || [];

    const visibleItems = keyword
      ? items.filter((item) => {
          const haystack = `${item.name} ${item.sku_code}`.toLowerCase();
          return haystack.includes(keyword);
        })
      : items;

    return visibleItems.sort((a, b) => {
      if (b.totalBalance !== a.totalBalance) {
        return b.totalBalance - a.totalBalance;
      }
      return a.name.localeCompare(b.name);
    });
  }, [overview, query]);

  const totals = useMemo(() => {
    const totalWarehouse = overview?.totals.warehouseBalance || 0;
    const totalStorefront = overview?.totals.storefrontBalance || 0;
    const totalCombined = totalWarehouse + totalStorefront;
    const lowStockCount = filteredItems.filter(
      (item) => item.totalBalance > 0 && item.totalBalance <= 5,
    ).length;
    const outOfStockCount = filteredItems.filter(
      (item) => item.totalBalance <= 0,
    ).length;

    return {
      totalWarehouse,
      totalStorefront,
      totalCombined,
      totalSkus: filteredItems.length,
      lowStockCount,
      outOfStockCount,
    };
  }, [filteredItems, overview]);

  const featuredItems = filteredItems.slice(0, 6);
  const sessionOptions: SearchableSelectOption[] = [
    { value: "all", label: "ทุกรอบ", keywords: "ทั้งหมด all" },
    ...sessions.map((session) => ({
      value: session.session_id,
      label: session.label,
      keywords: `${session.started_at} ${session.closed_at}`,
    })),
  ];

  if (loading) {
    return (
      <div className="rounded-[32px] border border-white/[0.06] bg-white/[0.03] p-10 text-center text-slate-400">
        กำลังโหลดภาพรวมสต๊อก...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[36px] border border-white/[0.06] bg-linear-to-br from-cyan-500/10 via-white/[0.04] to-transparent shadow-2xl shadow-black/30">
        <div className="grid gap-6 p-5 lg:p-7 2xl:grid-cols-[minmax(0,1.25fr)_360px]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200">
              Stock Overview
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white lg:text-4xl">
              ดูสต๊อกทุกจุดในหน้าเดียว
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 lg:text-base">
              รวมจำนวนคงเหลือจากคลังและหน้าร้านไว้ด้วยกัน ช่วยให้เช็กจำนวนรวม
              สินค้าที่เหลืออยู่จริงได้เร็วขึ้น และเลือกดูแยกตามรอบสต๊อกได้ทันที
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <div className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-100">
                {getSessionStatusLabel(selectedSessionId, activeSessionLabel)}
              </div>
              <div className="rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-300">
                สินค้าที่แสดง {formatNumber(filteredItems.length)} SKU
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/[0.06] bg-[#0d1117]/90 p-4 shadow-xl shadow-black/20">
            <div className="grid gap-4">
              <SearchableSelect
                label="เลือกรอบ"
                value={selectedSessionId}
                onChange={setSelectedSessionId}
                options={sessionOptions}
                placeholder="เลือกรอบสต๊อก"
                searchPlaceholder="ค้นหารอบขาย..."
              />

              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                  ค้นหาสินค้า
                </span>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ค้นหาจากชื่อสินค้า หรือ SKU"
                  className="w-full rounded-2xl border border-white/[0.08] bg-[#0b0f19] px-4 py-3 text-white outline-none transition focus:border-cyan-500/50"
                />
              </label>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        <MetricCard
          label="สต๊อกรวมทั้งหมด"
          value={totals.totalCombined}
          accent="text-cyan-300"
        />
        <MetricCard
          label="คงเหลือในคลัง"
          value={totals.totalWarehouse}
          accent="text-sky-300"
        />
        <MetricCard
          label="คงเหลือหน้าร้าน"
          value={totals.totalStorefront}
          accent="text-emerald-300"
        />
        <MetricCard
          label="สินค้าใกล้หมด"
          value={totals.lowStockCount}
          accent="text-amber-300"
        />
        <MetricCard
          label="สินค้าหมดสต๊อก"
          value={totals.outOfStockCount}
          accent="text-rose-300"
        />
      </section>

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className="text-xl font-black text-white">
                รายการสต๊อกทั้งหมด
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                เรียงตามจำนวนรวมมากไปน้อย เพื่อดูตัวที่ต้องเฝ้าระวังได้ง่ายขึ้น
              </p>
            </div>
            <div className="hidden rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm font-bold text-slate-300 lg:block">
              {formatNumber(totals.totalSkus)} รายการ
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="rounded-[32px] border border-dashed border-white/[0.08] bg-white/[0.02] px-6 py-12 text-center text-slate-400">
              ไม่พบสินค้าที่ตรงกับการค้นหา
            </div>
          ) : (
            <div className="grid gap-3 xl:grid-cols-2">
              {filteredItems.map((item) => (
                <StockBalanceCard
                  key={item.sku_code || item.name}
                  item={item}
                />
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4 2xl:sticky 2xl:top-6">
          <div className="rounded-[32px] border border-white/[0.06] bg-white/[0.03] p-5 shadow-xl shadow-black/20">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
              ภาพรวมเร็ว
            </p>
            <div className="mt-4 space-y-3">
              {[
                {
                  label: "รวมคงเหลือ",
                  value: totals.totalCombined,
                  tone: "text-white",
                },
                {
                  label: "เฉลี่ยต่อ SKU",
                  value:
                    totals.totalSkus > 0
                      ? Math.round(totals.totalCombined / totals.totalSkus)
                      : 0,
                  tone: "text-cyan-300",
                },
                {
                  label: "คลังมากกว่า",
                  value: Math.max(
                    totals.totalWarehouse - totals.totalStorefront,
                    0,
                  ),
                  tone: "text-sky-300",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-[#0d1117] px-4 py-3"
                >
                  <span className="text-sm font-bold text-slate-400">
                    {item.label}
                  </span>
                  <span
                    className={`text-lg font-black tabular-nums ${item.tone}`}
                  >
                    {formatNumber(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-white/[0.06] bg-white/[0.03] p-5 shadow-xl shadow-black/20">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                  เด่นสุดตอนนี้
                </p>
                <h4 className="mt-2 text-lg font-black text-white">
                  สินค้าสต๊อกสูง
                </h4>
              </div>
              <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-slate-300">
                Top 6
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {featuredItems.length ? (
                featuredItems.map((item, index) => (
                  <div
                    key={`${item.sku_code}-${index}`}
                    className="rounded-2xl border border-white/[0.06] bg-[#0d1117] px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-black text-white">
                          {item.name}
                        </p>
                        <p className="mt-1 truncate text-xs uppercase tracking-[0.18em] text-slate-400">
                          {item.sku_code || "ไม่มี SKU"}
                        </p>
                      </div>
                      <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-sm font-black text-cyan-200">
                        {formatNumber(item.totalBalance)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">
                  ยังไม่มีข้อมูลสินค้าให้แสดง
                </p>
              )}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
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
      </p>
    </div>
  );
}

function StockBalanceCard({
  item,
}: {
  item: StockOverviewItem & { totalBalance: number };
}) {
  const maxSegment = Math.max(item.totalBalance, 1);
  const warehouseWidth = (item.warehouseBalance / maxSegment) * 100;
  const storefrontWidth = (item.storefrontBalance / maxSegment) * 100;

  return (
    <article className="rounded-[28px] border border-white/[0.06] bg-white/[0.03] p-4 shadow-xl shadow-black/20">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h4 className="truncate text-lg font-black text-white">
            {item.name}
          </h4>
          <p className="mt-1 truncate text-xs uppercase tracking-[0.18em] text-slate-400">
            {item.sku_code || "ไม่มี SKU"}
          </p>
        </div>
        <div
          className={`rounded-2xl border px-3 py-2 text-right ${getBalanceTone(item.totalBalance)}`}
        >
          <p className="text-[11px] font-black uppercase tracking-[0.18em] opacity-80">
            รวม
          </p>
          <p className="text-xl font-black tabular-nums">
            {formatNumber(item.totalBalance)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniMetric
          label="คลัง"
          value={item.warehouseBalance}
          tone="text-sky-300"
        />
        <MiniMetric
          label="หน้าร้าน"
          value={item.storefrontBalance}
          tone="text-emerald-300"
        />
        <MiniMetric
          label="ขายวันนี้"
          value={item.soldToday}
          tone="text-amber-300"
        />
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
          <span>สัดส่วนคงเหลือ</span>
          <span>{formatNumber(item.totalBalance)} ชิ้น</span>
        </div>
        <div className="rounded-full bg-[#0d1117] p-1">
          <div className="flex h-3 overflow-hidden rounded-full">
            <div
              className="bg-linear-to-r from-sky-400 to-cyan-500"
              style={{ width: `${warehouseWidth}%` }}
            />
            <div
              className="bg-linear-to-r from-emerald-400 to-lime-500"
              style={{ width: `${storefrontWidth}%` }}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

function MiniMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0d1117] px-3 py-3 text-center">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className={`mt-2 text-lg font-black tabular-nums ${tone}`}>
        {formatNumber(value)}
      </p>
    </div>
  );
}
