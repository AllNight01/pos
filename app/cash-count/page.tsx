"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import type { StockSession } from "@/components/PosTypes";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

const DENOMINATIONS = [
  { value: 1000, label: "1,000", type: "bill", accent: "text-fuchsia-300" },
  { value: 500, label: "500", type: "bill", accent: "text-violet-300" },
  { value: 100, label: "100", type: "bill", accent: "text-rose-300" },
  { value: 50, label: "50", type: "bill", accent: "text-sky-300" },
  { value: 20, label: "20", type: "bill", accent: "text-emerald-300" },
  { value: 10, label: "10", type: "coin", accent: "text-amber-300" },
  { value: 5, label: "5", type: "coin", accent: "text-cyan-300" },
  { value: 2, label: "2", type: "coin", accent: "text-slate-300" },
  { value: 1, label: "1", type: "coin", accent: "text-slate-300" },
] as const;

function getTodayDateStr() {
  const now = new Date();
  const th = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const dd = String(th.getUTCDate()).padStart(2, "0");
  const mm = String(th.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = th.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function toInputDate(dateStr: string) {
  const [dd, mm, yyyy] = dateStr.split("-");
  if (!dd || !mm || !yyyy) return "";
  return `${yyyy}-${mm}-${dd}`;
}

function fromInputDate(dateStr: string) {
  const [yyyy, mm, dd] = dateStr.split("-");
  if (!dd || !mm || !yyyy) return getTodayDateStr();
  return `${dd}-${mm}-${yyyy}`;
}

function numericValue(value: string) {
  const cleaned = value.replace(/[^0-9]/g, "");
  return cleaned ? Number(cleaned) : 0;
}

function sessionToDate(session: StockSession) {
  return session.started_at || getTodayDateStr();
}

export default function CashCountPage() {
  const [sessions, setSessions] = useState<StockSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [activeSessionLabel, setActiveSessionLabel] = useState("");
  const [selectedDate, setSelectedDate] = useState(getTodayDateStr());
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [startingCash, setStartingCash] = useState(0);
  const [cashSales, setCashSales] = useState(0);
  const [transferSales, setTransferSales] = useState(0);
  const [transferSalesSuggested, setTransferSalesSuggested] = useState(0);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const actualCash = useMemo(
    () =>
      DENOMINATIONS.reduce(
        (sum, denom) => sum + (counts[denom.value] || 0) * denom.value,
        0,
      ),
    [counts],
  );

  const expectedCash = startingCash + cashSales;
  const difference = actualCash - expectedCash;

  const billCount = useMemo(
    () =>
      DENOMINATIONS.filter((denom) => denom.type === "bill").reduce(
        (sum, denom) => sum + (counts[denom.value] || 0),
        0,
      ),
    [counts],
  );

  const coinCount = useMemo(
    () =>
      DENOMINATIONS.filter((denom) => denom.type === "coin").reduce(
        (sum, denom) => sum + (counts[denom.value] || 0),
        0,
      ),
    [counts],
  );

  const loadData = async (date: string, sessionId?: string) => {
    setLoading(true);
    setSaved(false);
    setCounts({});

    try {
      const [cashRes, summaryRes, datesRes, sessionRes] = await Promise.all([
        fetch(`/api/cash-count?date=${date}`),
        fetch(
          sessionId
            ? `/api/daily-summary?date=${date}&session_id=${encodeURIComponent(sessionId)}`
            : `/api/daily-summary?date=${date}`,
        ),
        fetch("/api/available-dates"),
        fetch("/api/stock-session"),
      ]);

      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();
        const availableSessions = (sessionData.sessions || []) as StockSession[];
        setSessions(availableSessions);

        const matchedSession = availableSessions.find(
          (session) => session.session_id === sessionId,
        );
        setActiveSessionLabel(matchedSession?.label || "");
      }

      let salesCash = 0;
      let salesTransfer = 0;
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        salesCash = summaryData.totalCash || 0;
        salesTransfer = summaryData.totalTransfer || 0;
      }

      setCashSales(salesCash);
      setTransferSalesSuggested(salesTransfer);
      setTransferSales(salesTransfer);

      if (datesRes.ok) {
        const data = await datesRes.json();
        setAvailableDates(data.dates || []);
      }

      if (cashRes.ok) {
        const cashData = await cashRes.json();
        if (cashData.data) {
          setStartingCash(cashData.data.starting_cash || 0);
          setCounts(cashData.data.counts || {});
          if ((cashData.data.transfer_sales || 0) > 0) {
            setTransferSales(cashData.data.transfer_sales || 0);
          }
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedDate, selectedSessionId || undefined);
  }, [selectedDate, selectedSessionId]);

  const handleSessionChange = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    const matchedSession = sessions.find((session) => session.session_id === sessionId);
    setActiveSessionLabel(matchedSession?.label || "");
    if (matchedSession?.started_at) {
      setSelectedDate(sessionToDate(matchedSession));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/cash-count", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          starting_cash: startingCash,
          cash_sales: cashSales,
          transfer_sales: transferSales,
          bill_count: billCount,
          coin_count: coinCount,
          counts,
          expected_cash: expectedCash,
          actual_cash: actualCash,
          difference,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "บันทึกยอดเงินไม่สำเร็จ");
      } else {
        setSaved(true);
      }
    } finally {
      setSaving(false);
    }
  };

  const updateCount = (value: number, count: number) => {
    setCounts((prev) => ({ ...prev, [value]: count }));
  };

  const saveButton = (
    <button
      type="button"
      onClick={handleSave}
      disabled={saving || loading}
      className="w-full whitespace-nowrap rounded-2xl bg-linear-to-r from-amber-500 to-orange-500 px-5 py-3.5 text-base font-black text-white shadow-lg shadow-amber-500/20 transition active:scale-[0.98] disabled:opacity-40 sm:w-auto"
    >
      {saving ? "กำลังบันทึก..." : "บันทึกยอดเงิน"}
    </button>
  );

  return (
    <AppShell
      title="นับเงิน"
      subtitle={`รายวัน • ${selectedDate}${activeSessionLabel ? ` • ${activeSessionLabel}` : ""}`}
      actions={<div className="hidden sm:block">{saveButton}</div>}
    >
      <div className="space-y-5 pb-24 sm:pb-0">
        <section className="rounded-[32px] border border-white/[0.06] bg-white/[0.03] p-5 shadow-xl shadow-black/20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                Cash Count Filter
              </p>
              <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
                เลือกวันที่และรอบขาย
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">
                ดูยอดเงินสด ยอดโอน และผลนับเงินจริงโดยอ้างอิงตามวันที่หรือรอบขายที่ต้องการ
                เพื่อเช็กเงินสดได้แม่นยำขึ้นในแต่ละรอบ
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[720px]">
              <SearchableSelect
                label="เลือกรอบขาย"
                value={selectedSessionId}
                onChange={handleSessionChange}
                options={[{ value: "", label: "ทุกรอบของวันที่เลือก", keywords: "all ทุกรอบ" }, ...sessions.map((session) => ({
                  value: session.session_id,
                  label: session.label,
                  keywords: `${session.started_at} ${session.closed_at}`.trim(),
                }))]}
                placeholder="เลือกรอบขาย"
                searchPlaceholder="ค้นหารอบขาย..."
              />

              <SearchableSelect
                label="เลือกวันที่"
                value={selectedDate}
                onChange={setSelectedDate}
                options={[selectedDate, ...availableDates.filter((date) => date !== selectedDate)].map((date) => ({
                  value: date,
                  label: date,
                  keywords: date,
                }))}
                placeholder="เลือกวันที่"
                searchPlaceholder="ค้นหาวันที่..."
              />

              <div className="sm:col-span-2">
                <input
                  type="date"
                  value={toInputDate(selectedDate)}
                  onChange={(e) => setSelectedDate(fromInputDate(e.target.value))}
                  className="w-full rounded-2xl border border-white/[0.08] bg-[#0d1117] px-4 py-3 text-white outline-none"
                />
              </div>
            </div>
          </div>
        </section>

        {saved && (
          <div className="rounded-[28px] border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-base font-bold text-emerald-100">
            บันทึกยอดเงินเรียบร้อยแล้ว
          </div>
        )}

        {loading ? (
          <div className="rounded-[32px] border border-white/[0.06] bg-white/[0.03] p-10 text-center text-slate-500">
            กำลังโหลดข้อมูล...
          </div>
        ) : (
          <>
            <div className="grid gap-4 xl:grid-cols-2">
              <section className="rounded-[32px] border border-white/[0.06] bg-white/[0.03] p-5 shadow-xl shadow-black/20">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                  Daily Cash Setup
                </p>
                <div className="mt-5 space-y-4">
                  <StatField
                    label="เงินทอนตั้งต้น"
                    value={startingCash}
                    editable
                    onChange={(value) => setStartingCash(numericValue(value))}
                    accent="text-violet-300"
                  />
                  <StatField
                    label="ยอดขายเงินสด"
                    value={cashSales}
                    accent="text-emerald-300"
                  />

                  <div className="rounded-[24px] border border-cyan-500/15 bg-cyan-500/10 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-200">
                          ยอดขายโอน
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">
                          ปรับยอดโอนได้เองตามสลิปจริง โดยระบบจะใส่ยอดที่ดึงจากสรุปยอดให้เป็นค่าเริ่มต้น
                        </p>
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={transferSales === 0 ? "" : String(transferSales)}
                        onChange={(e) =>
                          setTransferSales(numericValue(e.target.value))
                        }
                        className="w-full rounded-2xl border border-white/[0.08] bg-[#0d1117] px-4 py-3 text-center text-xl font-black text-white outline-none transition focus:border-cyan-500/50 sm:w-40"
                        placeholder="0"
                      />
                    </div>

                    <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-white/[0.05] bg-black/20 px-4 py-3 text-base sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-slate-300">ยอดโอนจากข้อมูลสรุปยอด</span>
                      <button
                        type="button"
                        onClick={() => setTransferSales(transferSalesSuggested)}
                        className="whitespace-nowrap text-left font-black text-cyan-200 transition hover:text-cyan-100 sm:text-right"
                      >
                        ใช้ {transferSalesSuggested.toLocaleString()} ฿
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[32px] border border-white/[0.06] bg-white/[0.03] p-5 shadow-xl shadow-black/20">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                  Cash Summary
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Metric label="ยอดควรมี" value={expectedCash} accent="text-sky-300" suffix="฿" />
                  <Metric label="นับเงินจริง" value={actualCash} accent="text-amber-300" suffix="฿" />
                  <Metric label="ยอดโอนที่กรอก" value={transferSales} accent="text-cyan-300" suffix="฿" />
                  <Metric
                    label="ส่วนต่างเงินสด"
                    value={difference}
                    accent={difference >= 0 ? "text-emerald-300" : "text-rose-300"}
                    signed
                    suffix="฿"
                  />
                </div>
              </section>
            </div>

            <section className="rounded-[32px] border border-white/[0.06] bg-white/[0.03] p-5 shadow-xl shadow-black/20 xl:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                    นับเงินจริง
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white">
                    กรอกจำนวนธนบัตรและเหรียญ
                  </h2>
                </div>
                <p className="text-xl font-black text-white xl:hidden">
                  {actualCash.toLocaleString()} <span className="text-base text-slate-400">฿</span>
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2 xl:gap-5">
                <div className="space-y-3">
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">
                    ธนบัตร
                  </p>
                  {DENOMINATIONS.filter((denom) => denom.type === "bill").map((denom) => (
                    <DenomRow
                      key={denom.value}
                      denom={denom}
                      count={counts[denom.value] || 0}
                      onChange={(count) => updateCount(denom.value, count)}
                    />
                  ))}
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">
                    เหรียญ
                  </p>
                  {DENOMINATIONS.filter((denom) => denom.type === "coin").map((denom) => (
                    <DenomRow
                      key={denom.value}
                      denom={denom}
                      count={counts[denom.value] || 0}
                      onChange={(count) => updateCount(denom.value, count)}
                    />
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.08] bg-[#0b0f19]/95 px-4 py-3 backdrop-blur-2xl sm:hidden">
          {saveButton}
        </div>
      </div>
    </AppShell>
  );
}

function StatField({
  label,
  value,
  editable = false,
  onChange,
  accent,
}: {
  label: string;
  value: number;
  editable?: boolean;
  onChange?: (value: string) => void;
  accent: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/[0.05] bg-black/20 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
          {label}
        </p>
        {editable ? (
          <input
            type="text"
            inputMode="numeric"
            value={value === 0 ? "" : String(value)}
            onChange={(e) => onChange?.(e.target.value)}
            className={`w-full rounded-2xl border border-white/[0.08] bg-[#0d1117] px-4 py-3 text-center text-xl font-black outline-none transition focus:border-white/20 ${accent} sm:w-40`}
            placeholder="0"
          />
        ) : (
          <span className={`text-2xl font-black ${accent}`}>
            {value.toLocaleString()} ฿
          </span>
        )}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
  suffix,
  signed = false,
}: {
  label: string;
  value: number;
  accent: string;
  suffix: string;
  signed?: boolean;
}) {
  return (
    <div className="rounded-[24px] border border-white/[0.05] bg-black/20 p-4">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
        {label}
      </p>
      <p className={`mt-3 text-3xl font-black ${accent}`}>
        {signed && value > 0 ? "+" : ""}
        {value.toLocaleString()}
        <span className="ml-2 text-base text-slate-400">{suffix}</span>
      </p>
    </div>
  );
}

function DenomRow({
  denom,
  count,
  onChange,
}: {
  denom: { value: number; label: string; accent: string };
  count: number;
  onChange: (count: number) => void;
}) {
  const total = count * denom.value;

  return (
    <div className="rounded-[24px] border border-white/[0.05] bg-black/20 px-4 py-3">
      <div className="grid grid-cols-[64px_20px_minmax(0,104px)_20px_minmax(0,1fr)] items-center gap-2 sm:gap-3">
        <div className={`w-16 text-center text-lg font-black ${denom.accent}`}>
          {denom.label}
        </div>
        <span className="text-center text-slate-600">x</span>
        <input
          type="text"
          inputMode="numeric"
          value={count === 0 ? "" : String(count)}
          onChange={(e) => onChange(numericValue(e.target.value))}
          className="w-full rounded-2xl border border-white/[0.08] bg-[#0d1117] px-3 py-2 text-center text-lg font-black text-white outline-none transition focus:border-amber-500/40 xl:text-xl"
          placeholder="0"
        />
        <span className="text-center text-slate-600">=</span>
        <div className="ml-auto text-right">
          <p className="text-sm text-slate-400">รวม</p>
          <p className="text-lg font-black text-white xl:text-xl">
            {total.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

