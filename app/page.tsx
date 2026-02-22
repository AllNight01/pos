"use client";
import { useState, useEffect } from "react";
import productsData from "@/data/products.json";

// ── ตั้งชื่อพนักงานที่นี่ ───────────────────
const STAFF_LIST = ["อ้อม", "ปาล์ม"];

interface Product {
  sku_code: string;
  name: string;
  price: number;
  image: string;
}

interface CartItem extends Product {
  qty: number;
}

/* ── Daily Summary Types ── */
interface SummaryItem {
  sku_code: string;
  name: string;
  qty: number;
  revenue: number;
  price: number;
}

interface StaffSummary {
  name: string;
  bills: number;
  revenue: number;
}

interface BillDetail {
  billId: string;
  time: string;
  staff: string;
  total: number;
  itemCount: number;
}

interface DailySummaryData {
  date: string;
  totalBills: number;
  totalRevenue: number;
  totalItems: number;
  items: SummaryItem[];
  staffSummary: StaffSummary[];
  bills: BillDetail[];
}

export default function POSPage() {
  const [products] = useState<Product[]>(productsData);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState("");
  const [changeAmount, setChangeAmount] = useState<number | null>(null);
  const [checkoutDone, setCheckoutDone] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [staff, setStaff] = useState<string | null>(null);
  const [staffLoaded, setStaffLoaded] = useState(false);

  /* ── daily summary state ── */
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<DailySummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryTab, setSummaryTab] = useState<"items" | "bills" | "staff">(
    "items",
  );
  const [summaryDate, setSummaryDate] = useState<string>(""); // dd-MM-yyyy
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  /** Get today's date string in dd-MM-yyyy (Thai TZ) */
  const getTodayDateStr = () => {
    const now = new Date();
    const th = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const dd = String(th.getUTCDate()).padStart(2, "0");
    const mm = String(th.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = th.getUTCFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  /** Navigate to prev/next available date */
  const navigateSummaryDate = (offset: number) => {
    if (availableDates.length === 0) return;
    const currentIdx = availableDates.indexOf(summaryDate);
    // dates are sorted newest first
    const newIdx = offset < 0 ? currentIdx + 1 : currentIdx - 1;
    if (newIdx >= 0 && newIdx < availableDates.length) {
      const newDate = availableDates[newIdx];
      setSummaryDate(newDate);
      fetchSummaryForDate(newDate);
    }
  };

  /** Select a specific date from the picker */
  const selectSummaryDate = (dateStr: string) => {
    setSummaryDate(dateStr);
    setShowDatePicker(false);
    fetchSummaryForDate(dateStr);
  };

  /** Fetch available dates from sheets */
  const fetchAvailableDates = async () => {
    try {
      const res = await fetch("/api/available-dates");
      if (res.ok) {
        const data = await res.json();
        setAvailableDates(data.dates || []);
      }
    } catch {
      // silently fail
    }
  };

  // โหลดชื่อพนักงานจาก localStorage ตอนเปิดแอป
  useEffect(() => {
    const saved = localStorage.getItem("pos_staff");
    if (saved) setStaff(saved);
    setStaffLoaded(true);
  }, []);

  const selectStaff = (name: string) => {
    setStaff(name);
    localStorage.setItem("pos_staff", name);
  };

  const changeStaff = () => {
    setStaff(null);
    localStorage.removeItem("pos_staff");
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.sku_code === product.sku_code);
      if (existing) {
        return prev.map((item) =>
          item.sku_code === product.sku_code
            ? { ...item, qty: item.qty + 1 }
            : item,
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const removeFromCart = (sku_code: string) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.sku_code === sku_code ? { ...item, qty: item.qty - 1 } : item,
        )
        .filter((item) => item.qty > 0),
    );
  };

  const totalQty = cart.reduce((s, i) => s + i.qty, 0);
  const totalPrice = cart.reduce((s, i) => s + i.price * i.qty, 0);

  /* ── checkout flow ────────────────────── */
  const openCheckout = () => {
    setShowMobileCart(false);
    setReceivedAmount("");
    setChangeAmount(null);
    setCheckoutDone(false);
    setShowCheckout(true);
  };

  const closeCheckout = () => {
    setShowCheckout(false);
    if (checkoutDone) {
      setCart([]);
    }
  };

  const handleReceivedChange = (val: string) => {
    const cleaned = val.replace(/[^0-9]/g, "");
    setReceivedAmount(cleaned);
    const num = Number(cleaned);
    if (cleaned && num >= totalPrice) {
      setChangeAmount(num - totalPrice);
    } else {
      setChangeAmount(null);
    }
  };

  const handleConfirmCheckout = async () => {
    const received = Number(receivedAmount);
    if (!receivedAmount || received < totalPrice) return;
    setLoading(true);
    try {
      const received = Number(receivedAmount);
      const change = received - totalPrice;
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart,
          total: totalPrice,
          received,
          change,
          staff: staff || "",
        }),
      });
      if (res.ok) {
        setCheckoutDone(true);
      } else {
        alert("เกิดข้อผิดพลาดในการบันทึก");
      }
    } catch (err) {
      console.error(err);
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  };

  const clearCart = () => setCart([]);
  const cartItemFor = (sku: string) => cart.find((c) => c.sku_code === sku);

  /* ── daily summary ───────────────────── */
  const fetchSummaryForDate = async (dateStr: string) => {
    setSummaryLoading(true);
    try {
      const res = await fetch(`/api/daily-summary?date=${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        setSummaryData(data);
      } else {
        alert("ไม่สามารถดึงข้อมูลสรุปได้");
      }
    } catch {
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchDailySummary = () => {
    const today = getTodayDateStr();
    setSummaryDate(today);
    setSummaryTab("items");
    setShowSummary(true);
    setShowDatePicker(false);
    fetchSummaryForDate(today);
    fetchAvailableDates();
  };

  /* ── shared cart content ─────────────── */
  const CartContent = () => (
    <>
      {/* cart header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/[0.04]">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 text-cyan-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="8" cy="21" r="1" />
              <circle cx="19" cy="21" r="1" />
              <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
            </svg>
            รายการสั่งซื้อ
          </h2>
          <div className="flex items-center gap-2">
            {totalQty > 0 && (
              <>
                <span className="text-[11px] font-bold bg-cyan-500/10 text-cyan-400 px-2.5 py-1 rounded-full border border-cyan-500/20">
                  {totalQty} ชิ้น
                </span>
                <button
                  onClick={clearCart}
                  className="text-[11px] font-bold bg-red-500/10 text-red-400 px-2.5 py-1 rounded-full border border-red-500/20 hover:bg-red-500/20 transition-colors"
                >
                  ล้าง
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* cart items */}
      <div
        className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5"
        style={{ scrollbarWidth: "none" }}
      >
        {cart.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-3 py-12">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-10 h-10 opacity-30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="8" cy="21" r="1" />
              <circle cx="19" cy="21" r="1" />
              <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
            </svg>
            <span className="text-xs font-medium">ยังไม่มีสินค้าในตะกร้า</span>
          </div>
        )}

        {cart.map((item, i) => (
          <div
            key={item.sku_code}
            className="flex items-center gap-2.5 rounded-xl p-2.5 bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors"
            style={{
              animation: `slide-in-right .3s ease both`,
              animationDelay: `${i * 40}ms`,
            }}
          >
            <div className="w-10 h-10 rounded-lg bg-[#0b0f19] border border-white/[0.06] overflow-hidden shrink-0">
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-contain p-0.5"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-slate-300 truncate">
                {item.name}
              </p>
              <p className="text-[11px] text-slate-500">
                {item.price.toLocaleString()} ฿ × {item.qty}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFromCart(item.sku_code);
                }}
                className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/[0.04] border border-white/[0.06] hover:bg-red-500/15 hover:text-red-400 transition-all text-sm font-bold text-slate-400"
              >
                −
              </button>
              <span className="text-xs font-bold w-5 text-center tabular-nums">
                {item.qty}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  addToCart(item);
                }}
                className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/[0.04] border border-white/[0.06] hover:bg-cyan-500/15 hover:text-cyan-400 transition-all text-sm font-bold text-slate-400"
              >
                +
              </button>
            </div>
            <span className="text-xs font-bold text-white tabular-nums w-14 text-right">
              {(item.price * item.qty).toLocaleString()} ฿
            </span>
          </div>
        ))}
      </div>

      {/* cart footer */}
      <div className="border-t border-white/[0.04] p-4 space-y-3">
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-500">
            <span>จำนวนสินค้า</span>
            <span className="text-slate-300 font-semibold tabular-nums">
              {totalQty} ชิ้น
            </span>
          </div>
          <div className="flex justify-between items-end">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">
              รวมทั้งหมด
            </span>
            <span className="text-2xl sm:text-3xl font-black tabular-nums bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
              {totalPrice.toLocaleString()}
              <span className="text-sm ml-0.5 text-cyan-400/80">฿</span>
            </span>
          </div>
        </div>
        <button
          onClick={openCheckout}
          disabled={cart.length === 0}
          className="w-full rounded-xl py-3.5 font-bold text-sm tracking-wide
            bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400
            disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600
            text-white shadow-lg shadow-cyan-500/20 transition-all duration-300 active:scale-[0.97]
            flex items-center justify-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
          ยืนยันชำระเงิน
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-[100dvh] bg-[#0b0f19] text-slate-100 flex flex-col">
      {/* ═══ STAFF SELECTION SCREEN ═══ */}
      {staffLoaded && !staff && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-[#0b0f19]">
          <div
            className="w-full max-w-sm space-y-6 text-center"
            style={{ animation: "fade-in-up .4s ease both" }}
          >
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-xl shadow-cyan-500/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-8 h-8 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">เลือกพนักงาน</h2>
              <p className="text-sm text-slate-500 mt-1">
                เลือกครั้งเดียว จำไว้ในเครื่องนี้
              </p>
            </div>
            <div className="space-y-3">
              {STAFF_LIST.map((name) => (
                <button
                  key={name}
                  onClick={() => selectStaff(name)}
                  className="w-full rounded-2xl py-4 font-bold text-base
                    bg-white/[0.04] border border-white/[0.06] text-white
                    hover:bg-cyan-500/10 hover:border-cyan-500/30 hover:text-cyan-300
                    active:scale-[0.97] transition-all"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ HEADER ═══ */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#0b0f19]/80 border-b border-white/[0.04] px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4 sm:w-5 sm:h-5 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
              Quick
            </span>
            <span className="text-white">POS</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {/* ── Daily Summary Button ── */}
          <button
            onClick={fetchDailySummary}
            className="flex items-center gap-1.5 text-xs font-semibold bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20 hover:bg-amber-500/20 transition-colors text-amber-400"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 3v18h18" />
              <path d="M18 17V9" />
              <path d="M13 17V5" />
              <path d="M8 17v-3" />
            </svg>
            <span className="hidden sm:inline">สรุปรายวัน</span>
          </button>
          {staff && (
            <button
              onClick={changeStaff}
              className="flex items-center gap-1.5 text-xs font-semibold bg-white/[0.04] px-3 py-1.5 rounded-full border border-white/[0.06] hover:bg-white/[0.08] transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-3.5 h-3.5 text-cyan-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
              <span className="text-slate-300">{staff}</span>
            </button>
          )}
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-mono bg-white/[0.03] px-3 py-1.5 rounded-full border border-white/[0.06]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ONLINE
          </div>
        </div>
      </header>

      {/* ═══ MAIN ═══ */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── product grid ─────────────── */}
        <main
          className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 pb-24 lg:pb-6"
          style={{ scrollbarWidth: "none" }}
        >
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3 lg:gap-4">
            {products.map((p, i) => {
              const inCart = cartItemFor(p.sku_code);
              return (
                <button
                  key={p.sku_code}
                  onClick={() => addToCart(p)}
                  className="group relative flex flex-col rounded-xl sm:rounded-2xl overflow-hidden
                    bg-[#111827] border border-white/[0.04]
                    hover:border-cyan-500/30 hover:shadow-[0_0_24px_-4px_rgba(34,211,238,0.15)]
                    active:scale-[0.97] transition-all duration-200 text-left"
                  style={{
                    animation: `fade-in-up .4s ease both`,
                    animationDelay: `${i * 20}ms`,
                  }}
                >
                  {/* qty badge */}
                  {inCart && (
                    <span className="absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 z-10 min-w-[20px] sm:min-w-[24px] h-5 sm:h-6 px-1 sm:px-1.5 flex items-center justify-center rounded-full bg-cyan-500 text-[10px] sm:text-[11px] font-bold text-white shadow-lg shadow-cyan-500/30">
                      {inCart.qty}
                    </span>
                  )}

                  {/* image */}
                  <div className="relative aspect-square w-full bg-[#0d1117] overflow-hidden">
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-full h-full object-contain p-2 sm:p-4
                        group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>

                  {/* info */}
                  <div className="p-2 sm:p-3 flex flex-col gap-0.5 sm:gap-1">
                    <h3 className="text-[11px] sm:text-[13px] font-semibold leading-snug text-slate-300 line-clamp-2 group-hover:text-white transition-colors">
                      {p.name}
                    </h3>
                    <p className="text-sm sm:text-lg font-extrabold text-white flex items-baseline gap-0.5">
                      {p.price.toLocaleString()}
                      <span className="text-[10px] sm:text-[11px] font-medium text-cyan-400">
                        ฿
                      </span>
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </main>

        {/* ── desktop cart sidebar ─────────────── */}
        <aside className="w-[340px] shrink-0 hidden lg:flex flex-col border-l border-white/[0.04] bg-[#0d1117]/60 backdrop-blur-xl">
          <CartContent />
        </aside>
      </div>

      {/* ── mobile bottom bar ─────────────── */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 safe-area-bottom">
        <div className="bg-[#0b0f19]/95 backdrop-blur-xl border-t border-white/[0.06] px-4 py-3">
          <div className="flex items-center gap-3">
            {/* cart summary — tap to open drawer */}
            <button
              onClick={() => setShowMobileCart(true)}
              className="flex-1 flex items-center gap-3 min-w-0"
            >
              <div className="relative">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6 text-slate-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="8" cy="21" r="1" />
                  <circle cx="19" cy="21" r="1" />
                  <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                </svg>
                {totalQty > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-cyan-500 text-[10px] font-bold text-white">
                    {totalQty}
                  </span>
                )}
              </div>
              <div className="text-left min-w-0">
                <p className="text-[11px] text-slate-500">
                  {totalQty > 0 ? `${totalQty} รายการ` : "ตะกร้าว่าง"}
                </p>
                <p className="text-base font-black tabular-nums text-white">
                  {totalPrice.toLocaleString()}{" "}
                  <span className="text-xs text-cyan-400">฿</span>
                </p>
              </div>
            </button>

            {/* checkout button */}
            <button
              onClick={openCheckout}
              disabled={cart.length === 0}
              className="shrink-0 rounded-xl px-6 py-3 font-bold text-sm
                bg-gradient-to-r from-cyan-500 to-blue-500 text-white
                disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600
                shadow-lg shadow-cyan-500/25 active:scale-[0.97] transition-all"
            >
              ชำระเงิน
            </button>
          </div>
        </div>
      </div>

      {/* ═══ MOBILE CART DRAWER ═══ */}
      {showMobileCart && (
        <div className="lg:hidden fixed inset-0 z-45 flex flex-col justify-end">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowMobileCart(false)}
          />

          {/* drawer */}
          <div
            className="relative bg-[#0d1117] border-t border-white/[0.06] rounded-t-3xl max-h-[80dvh] flex flex-col"
            style={{ animation: "slide-up .3s ease both" }}
          >
            {/* drag handle */}
            <div className="flex justify-center py-2.5">
              <div className="w-10 h-1 rounded-full bg-white/10" />
            </div>
            <CartContent />
          </div>
        </div>
      )}

      {/* ═══ CHECKOUT MODAL ═══ */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeCheckout}
          />

          <div
            className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-[#111827] border-t sm:border border-white/[0.06] shadow-2xl overflow-hidden max-h-[95dvh] overflow-y-auto"
            style={{
              animation: "slide-up .3s ease both",
              scrollbarWidth: "none",
            }}
          >
            {checkoutDone ? (
              <div className="p-6 sm:p-8 flex flex-col items-center gap-5 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-8 h-8 text-emerald-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    บันทึกเรียบร้อย!
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">
                    ยอดขายถูกบันทึกแล้ว
                  </p>
                </div>

                <div className="w-full rounded-2xl bg-[#0b0f19] border border-white/[0.06] p-5 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">ยอดรวม</span>
                    <span className="text-white font-bold tabular-nums">
                      {totalPrice.toLocaleString()} ฿
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">รับเงิน</span>
                    <span className="text-white font-bold tabular-nums">
                      {Number(receivedAmount).toLocaleString()} ฿
                    </span>
                  </div>
                  <div className="border-t border-white/[0.06] pt-3 flex justify-between items-end">
                    <span className="text-sm text-slate-400 font-bold">
                      เงินทอน
                    </span>
                    <span className="text-3xl font-black text-emerald-400 tabular-nums">
                      {(Number(receivedAmount) - totalPrice).toLocaleString()}
                      <span className="text-sm ml-0.5">฿</span>
                    </span>
                  </div>
                </div>

                <button
                  onClick={closeCheckout}
                  className="w-full rounded-xl py-3.5 font-bold text-sm
                    bg-gradient-to-r from-cyan-500 to-blue-500 text-white
                    shadow-lg shadow-cyan-500/20 active:scale-[0.97] transition-all"
                >
                  เสร็จสิ้น
                </button>
              </div>
            ) : (
              <div className="p-4 sm:p-5 space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    ชำระเงิน
                  </h3>
                  <button
                    onClick={closeCheckout}
                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-colors text-slate-400"
                  >
                    ✕
                  </button>
                </div>

                {/* total + received inline on mobile */}
                <div className="flex gap-2">
                  <div className="flex-1 rounded-xl sm:rounded-2xl bg-[#0b0f19] border border-white/[0.06] p-2.5 sm:p-3.5">
                    <div className="text-[10px] sm:text-[11px] text-slate-500 uppercase tracking-wider font-bold mb-0.5">
                      ยอดชำระ
                    </div>
                    <div className="text-xl sm:text-3xl font-black tabular-nums bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
                      {totalPrice.toLocaleString()}
                      <span className="text-xs sm:text-lg ml-0.5 text-cyan-400/80">
                        ฿
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 rounded-xl sm:rounded-2xl bg-[#0b0f19] border border-white/[0.08] p-2.5 sm:p-3.5">
                    <div className="text-[10px] sm:text-[11px] text-slate-500 uppercase tracking-wider font-bold mb-0.5">
                      รับเงิน
                    </div>
                    <div className="flex items-baseline">
                      <span
                        className={`text-xl sm:text-3xl font-black tabular-nums ${receivedAmount ? "text-white" : "text-slate-700"}`}
                      >
                        {receivedAmount
                          ? Number(receivedAmount).toLocaleString()
                          : "0"}
                      </span>
                      <span className="text-xs sm:text-sm ml-0.5 text-slate-500">
                        ฿
                      </span>
                    </div>
                  </div>
                </div>

                {/* change preview or insufficient */}
                {changeAmount !== null ? (
                  <div
                    className="rounded-lg sm:rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 p-2 sm:p-3 flex items-center justify-between"
                    style={{ animation: "fade-in-up .15s ease both" }}
                  >
                    <span className="text-xs sm:text-sm font-bold text-emerald-400/80">
                      เงินทอน
                    </span>
                    <span className="text-lg sm:text-xl font-black text-emerald-400 tabular-nums">
                      {changeAmount.toLocaleString()}
                      <span className="text-xs sm:text-sm ml-0.5">฿</span>
                    </span>
                  </div>
                ) : receivedAmount && Number(receivedAmount) < totalPrice ? (
                  <p className="text-[11px] text-red-400 font-semibold flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-red-400" />
                    ขาดอีก{" "}
                    {(totalPrice - Number(receivedAmount)).toLocaleString()} ฿
                  </p>
                ) : null}

                {/* ── Quick pay buttons ── */}
                <div className="space-y-1.5">
                  {/* Exact amount */}
                  <button
                    onClick={() => handleReceivedChange(String(totalPrice))}
                    className="w-full rounded-lg sm:rounded-xl py-2 sm:py-2.5 text-xs sm:text-sm font-bold
                      bg-emerald-500/10 text-emerald-400 border border-emerald-500/20
                      hover:bg-emerald-500/20 active:scale-[0.97] transition-all
                      flex items-center justify-center gap-1.5"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    จ่ายพอดี {totalPrice.toLocaleString()} ฿
                  </button>

                  {/* Banknotes + coins */}
                  <div>
                    <p className="text-[10px] text-slate-600 uppercase tracking-wider font-bold mb-1.5">
                      แบงค์ / เหรียญ
                    </p>
                    <div className="grid grid-cols-4 gap-1">
                      {[1000, 500, 100, 50, 20, 10, 5, 1].map((denom) => (
                        <button
                          key={denom}
                          onClick={() => {
                            const current = Number(receivedAmount) || 0;
                            handleReceivedChange(String(current + denom));
                          }}
                          className={`rounded-lg py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold select-none transition-all active:scale-[0.92] duration-100 border
                            ${
                              denom >= 100
                                ? "bg-violet-500/10 text-violet-300 border-violet-500/20 active:bg-violet-500/25"
                                : denom >= 20
                                  ? "bg-blue-500/10 text-blue-300 border-blue-500/20 active:bg-blue-500/25"
                                  : "bg-slate-500/10 text-slate-300 border-slate-500/20 active:bg-slate-500/25"
                            }`}
                        >
                          +{denom >= 1000 ? `${denom / 1000}K` : denom}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── NUMPAD ── */}
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  {[
                    "1",
                    "2",
                    "3",
                    "4",
                    "5",
                    "6",
                    "7",
                    "8",
                    "9",
                    "C",
                    "0",
                    "⌫",
                  ].map((key) => (
                    <button
                      key={key}
                      onClick={() => {
                        if (key === "C") {
                          handleReceivedChange("");
                        } else if (key === "⌫") {
                          handleReceivedChange(receivedAmount.slice(0, -1));
                        } else {
                          handleReceivedChange(receivedAmount + key);
                        }
                      }}
                      className={`rounded-lg sm:rounded-xl py-2.5 sm:py-3 text-lg sm:text-xl font-bold select-none transition-all active:scale-[0.92] duration-100
                        ${
                          key === "C"
                            ? "bg-red-500/10 text-red-400 border border-red-500/20 active:bg-red-500/25"
                            : key === "⌫"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 active:bg-amber-500/25"
                              : "bg-white/[0.04] text-white border border-white/[0.06] active:bg-white/[0.1]"
                        }`}
                    >
                      {key}
                    </button>
                  ))}
                </div>

                {/* action buttons */}
                <div className="flex gap-2 sm:gap-3 pt-0.5">
                  <button
                    onClick={closeCheckout}
                    className="flex-1 rounded-lg sm:rounded-xl py-3 sm:py-3.5 font-bold text-xs sm:text-sm bg-white/[0.04] border border-white/[0.06] text-slate-400 hover:bg-white/[0.08] transition-all"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleConfirmCheckout}
                    disabled={
                      !receivedAmount ||
                      Number(receivedAmount) < totalPrice ||
                      loading
                    }
                    className="flex-1 rounded-lg sm:rounded-xl py-3 sm:py-3.5 font-bold text-xs sm:text-sm
                      bg-gradient-to-r from-cyan-500 to-blue-500 text-white
                      hover:from-cyan-400 hover:to-blue-400
                      disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600
                      shadow-lg shadow-cyan-500/20 transition-all active:scale-[0.97]
                      flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg
                          className="animate-spin w-4 h-4"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z"
                          />
                        </svg>
                        บันทึก...
                      </>
                    ) : (
                      "ยืนยัน"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ DAILY SUMMARY MODAL ═══ */}
      {showSummary && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSummary(false)}
          />

          <div
            className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-[#111827] border-t sm:border border-white/[0.06] shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col"
            style={{ animation: "slide-up .3s ease both" }}
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-3 border-b border-white/[0.04] shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5 text-amber-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 3v18h18" />
                    <path d="M18 17V9" />
                    <path d="M13 17V5" />
                    <path d="M8 17v-3" />
                  </svg>
                  สรุปยอดขายรายวัน
                </h3>
                <button
                  onClick={() => setShowSummary(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-colors text-slate-400"
                >
                  ✕
                </button>
              </div>
              {/* Date navigator */}
              <div className="relative mb-3">
                <div className="flex items-center justify-between bg-white/[0.03] rounded-xl px-2 py-1.5 border border-white/[0.04]">
                  <button
                    onClick={() => navigateSummaryDate(-1)}
                    disabled={
                      summaryLoading ||
                      availableDates.indexOf(summaryDate) >=
                        availableDates.length - 1
                    }
                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-colors text-slate-400 disabled:opacity-30"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg hover:bg-white/[0.04] transition-colors"
                  >
                    <span className="text-sm font-bold text-white tabular-nums">
                      📅 {summaryDate}
                    </span>
                    {summaryDate === getTodayDateStr() && (
                      <span className="text-[10px] bg-cyan-500/15 text-cyan-400 font-bold px-1.5 py-0.5 rounded">
                        วันนี้
                      </span>
                    )}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`w-3.5 h-3.5 text-slate-500 transition-transform ${showDatePicker ? "rotate-180" : ""}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  <button
                    onClick={() => navigateSummaryDate(1)}
                    disabled={
                      summaryLoading || availableDates.indexOf(summaryDate) <= 0
                    }
                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-colors text-slate-400 disabled:opacity-30"
                  >
                    ›
                  </button>
                </div>

                {/* Date dropdown */}
                {showDatePicker && availableDates.length > 0 && (
                  <div
                    className="absolute top-full left-0 right-0 mt-1 rounded-xl bg-[#0d1117] border border-white/[0.08] shadow-2xl shadow-black/50 overflow-hidden z-10"
                    style={{ animation: "fade-in-up .15s ease both" }}
                  >
                    <div
                      className="max-h-[200px] overflow-y-auto"
                      style={{ scrollbarWidth: "none" }}
                    >
                      {availableDates.map((date) => (
                        <button
                          key={date}
                          onClick={() => selectSummaryDate(date)}
                          className={`w-full px-4 py-2.5 text-left text-sm font-semibold transition-colors flex items-center justify-between
                            ${
                              date === summaryDate
                                ? "bg-cyan-500/10 text-cyan-300 border-l-2 border-cyan-400"
                                : "text-slate-400 hover:bg-white/[0.04] hover:text-white border-l-2 border-transparent"
                            }`}
                        >
                          <span className="tabular-nums">{date}</span>
                          {date === getTodayDateStr() && (
                            <span className="text-[10px] bg-cyan-500/15 text-cyan-400 font-bold px-1.5 py-0.5 rounded">
                              วันนี้
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Hero revenue + overview cards */}
              {summaryData && !summaryLoading && (
                <div className="mb-3 space-y-2">
                  {/* ── Overview stats row ── */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-gradient-to-br from-cyan-500/[0.08] to-blue-500/[0.06] border border-cyan-500/20 p-3 text-center">
                      <p className="text-[10px] text-cyan-400/70 uppercase tracking-wider font-bold">
                        ยอดขาย
                      </p>
                      <p className="text-xl font-black text-cyan-300 tabular-nums mt-0.5">
                        {summaryData.totalRevenue.toLocaleString()}
                        <span className="text-[10px] ml-0.5 text-cyan-400/60">
                          ฿
                        </span>
                      </p>
                    </div>
                    <div className="rounded-xl bg-violet-500/[0.08] border border-violet-500/20 p-3 text-center">
                      <p className="text-[10px] text-violet-400/70 uppercase tracking-wider font-bold">
                        บิล
                      </p>
                      <p className="text-xl font-black text-violet-300 tabular-nums mt-0.5">
                        {summaryData.totalBills}
                        <span className="text-[10px] ml-0.5 text-violet-400/60">
                          บิล
                        </span>
                      </p>
                    </div>
                    <div className="rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20 p-3 text-center">
                      <p className="text-[10px] text-emerald-400/70 uppercase tracking-wider font-bold">
                        สินค้า
                      </p>
                      <p className="text-xl font-black text-emerald-300 tabular-nums mt-0.5">
                        {summaryData.totalItems}
                        <span className="text-[10px] ml-0.5 text-emerald-400/60">
                          ชิ้น
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tabs */}
              {!summaryLoading && summaryData && (
                <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1 border border-white/[0.04]">
                  {[
                    { key: "items" as const, label: "🏆 สินค้าขายดี" },
                    { key: "bills" as const, label: "🧾 รายบิล" },
                    { key: "staff" as const, label: "👤 พนักงาน" },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setSummaryTab(tab.key)}
                      className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                        summaryTab === tab.key
                          ? "bg-white/[0.08] text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Content */}
            <div
              className="flex-1 overflow-y-auto px-5 py-3"
              style={{ scrollbarWidth: "none" }}
            >
              {summaryLoading && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <svg
                    className="animate-spin w-8 h-8 text-amber-400"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z"
                    />
                  </svg>
                  <span className="text-sm text-slate-500 font-medium">
                    กำลังโหลดข้อมูล...
                  </span>
                </div>
              )}

              {!summaryLoading &&
                summaryData &&
                summaryData.totalBills === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-600">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-12 h-12 opacity-30"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 3v18h18" />
                      <path d="M18 17V9" />
                      <path d="M13 17V5" />
                      <path d="M8 17v-3" />
                    </svg>
                    <span className="text-sm font-medium">
                      ยังไม่มียอดขายวันนี้
                    </span>
                  </div>
                )}

              {/* ── TAB: Items ── */}
              {!summaryLoading &&
                summaryData &&
                summaryTab === "items" &&
                summaryData.items.length > 0 && (
                  <div className="space-y-1.5">
                    {summaryData.items.map((item, i) => {
                      const maxRevenue = summaryData.items[0]?.revenue || 1;
                      const barWidth = (item.revenue / maxRevenue) * 100;
                      const productMatch = products.find(
                        (p) => p.sku_code === item.sku_code,
                      );
                      return (
                        <div
                          key={item.sku_code || item.name}
                          className="relative rounded-xl p-3 bg-white/[0.02] border border-white/[0.04] overflow-hidden"
                          style={{
                            animation: `fade-in-up .3s ease both`,
                            animationDelay: `${i * 30}ms`,
                          }}
                        >
                          {/* bar bg */}
                          <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500/[0.06] to-transparent"
                            style={{ width: `${barWidth}%` }}
                          />
                          <div className="relative flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-[11px] font-black text-slate-600 w-5 text-center tabular-nums shrink-0">
                                {i + 1}
                              </span>
                              {productMatch && (
                                <div className="w-9 h-9 rounded-lg bg-[#0b0f19] border border-white/[0.06] overflow-hidden shrink-0">
                                  <img
                                    src={productMatch.image}
                                    alt={item.name}
                                    className="w-full h-full object-contain p-0.5"
                                  />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-[12px] font-semibold text-slate-300 truncate">
                                  {item.name}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                  ราคา {item.price.toLocaleString()} ฿
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[11px] font-bold bg-cyan-500/15 text-cyan-300 px-2 py-0.5 rounded-md border border-cyan-500/20 tabular-nums">
                                ×{item.qty}
                              </span>
                              <span className="text-sm font-bold text-amber-300 tabular-nums min-w-[60px] text-right">
                                {item.revenue.toLocaleString()} ฿
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

              {/* ── TAB: Bills ── */}
              {!summaryLoading &&
                summaryData &&
                summaryTab === "bills" &&
                summaryData.bills.length > 0 && (
                  <div className="space-y-1.5">
                    {summaryData.bills.map((bill, i) => (
                      <div
                        key={bill.billId}
                        className="rounded-xl p-3 bg-white/[0.02] border border-white/[0.04] flex items-center justify-between gap-3"
                        style={{
                          animation: `fade-in-up .3s ease both`,
                          animationDelay: `${i * 30}ms`,
                        }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-violet-500/[0.1] border border-violet-500/20 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold text-violet-400">
                              #{bill.billId.slice(-4)}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12px] font-semibold text-slate-300">
                              🕐 {bill.time}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {bill.staff && `👤 ${bill.staff} · `}
                              {bill.itemCount} ชิ้น
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-white tabular-nums shrink-0">
                          {bill.total.toLocaleString()} ฿
                        </span>
                      </div>
                    ))}
                  </div>
                )}

              {/* ── TAB: Staff ── */}
              {!summaryLoading &&
                summaryData &&
                summaryTab === "staff" &&
                summaryData.staffSummary.length > 0 && (
                  <div className="space-y-2">
                    {summaryData.staffSummary.map((s, i) => {
                      const maxRev = summaryData.staffSummary.reduce(
                        (m, x) => Math.max(m, x.revenue),
                        1,
                      );
                      const barWidth = (s.revenue / maxRev) * 100;
                      return (
                        <div
                          key={s.name}
                          className="relative rounded-xl p-4 bg-white/[0.02] border border-white/[0.04] overflow-hidden"
                          style={{
                            animation: `fade-in-up .3s ease both`,
                            animationDelay: `${i * 50}ms`,
                          }}
                        >
                          <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500/[0.06] to-transparent"
                            style={{ width: `${barWidth}%` }}
                          />
                          <div className="relative flex items-center justify-between">
                            <div>
                              <p className="text-sm font-bold text-white flex items-center gap-1.5">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="w-4 h-4 text-cyan-400"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                  <circle cx="9" cy="7" r="4" />
                                </svg>
                                {s.name}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {s.bills} บิล
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-black text-cyan-300 tabular-nums">
                                {s.revenue.toLocaleString()}
                                <span className="text-[10px] ml-0.5 text-cyan-400/60">
                                  ฿
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

              {!summaryLoading &&
                summaryData &&
                summaryTab === "staff" &&
                summaryData.staffSummary.length === 0 &&
                summaryData.totalBills > 0 && (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-600">
                    <span className="text-sm font-medium">
                      ไม่มีข้อมูลพนักงาน
                    </span>
                  </div>
                )}
            </div>

            {/* Footer */}
            <div className="border-t border-white/[0.04] p-4 shrink-0">
              <button
                onClick={() => setShowSummary(false)}
                className="w-full rounded-xl py-3 font-bold text-sm bg-white/[0.04] border border-white/[0.06] text-slate-400 hover:bg-white/[0.08] transition-all active:scale-[0.97]"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
