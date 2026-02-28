"use client"

import { useState, useEffect } from "react";
import { Product, CartItem, DailySummaryData } from "@/components/PosTypes";
import { PosHeader } from "@/components/PosHeader";
import { ProductCard } from "@/components/ProductCard";
import { CartSidebar } from "@/components/CartSidebar";
import { CheckoutModal } from "@/components/CheckoutModal";
import { SummaryModal } from "@/components/SummaryModal";

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState("");
  const [changeAmount, setChangeAmount] = useState<number | null>(null);
  const [checkoutDone, setCheckoutDone] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer">("cash");

  /* ── daily summary state ── */
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<DailySummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryTab, setSummaryTab] = useState<"items" | "bills">("items");
  const [summaryDate, setSummaryDate] = useState<string>(""); 
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const getTodayDateStr = () => {
    const now = new Date();
    const th = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const dd = String(th.getUTCDate()).padStart(2, "0");
    const mm = String(th.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = th.getUTCFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  const navigateSummaryDate = (offset: number) => {
    if (availableDates.length === 0) return;
    const currentIdx = availableDates.indexOf(summaryDate);
    const newIdx = offset < 0 ? currentIdx + 1 : currentIdx - 1;
    if (newIdx >= 0 && newIdx < availableDates.length) {
      const newDate = availableDates[newIdx];
      setSummaryDate(newDate);
      fetchSummaryForDate(newDate);
    }
  };

  const selectSummaryDate = (dateStr: string) => {
    setSummaryDate(dateStr);
    setShowDatePicker(false);
    fetchSummaryForDate(dateStr);
  };

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await fetch("/api/products");
        if (res.ok) {
          const data = await res.json();
          if (data.products?.length > 0) setProducts(data.products);
        }
      } catch (err) {
        console.error("Failed to load products:", err);
      } finally {
        setProductsLoading(false);
      }
    };
    loadProducts();
  }, []);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.sku_code === product.sku_code);
      if (existing) return prev.map((item) => item.sku_code === product.sku_code ? { ...item, qty: item.qty + 1 } : item);
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const removeFromCart = (sku_code: string) => {
    setCart((prev) => prev.map((item) => item.sku_code === sku_code ? { ...item, qty: item.qty - 1 } : item).filter((item) => item.qty > 0));
  };

  const totalPrice = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const openCheckout = () => {
    setReceivedAmount("");
    setChangeAmount(null);
    setCheckoutDone(false);
    setPaymentMethod("cash");
    setShowCheckout(true);
    setShowMobileCart(false);
  };

  const handleReceivedChange = (val: string) => {
    const cleaned = val.replace(/[^0-9]/g, "");
    setReceivedAmount(cleaned);
    const num = Number(cleaned);
    setChangeAmount(cleaned && num >= totalPrice ? num - totalPrice : null);
  };

  const handleConfirmCheckout = async () => {
    const received = Number(receivedAmount);
    if (paymentMethod === "cash" && (!receivedAmount || received < totalPrice)) return;
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart,
          total: totalPrice,
          received: paymentMethod === "transfer" ? totalPrice : received,
          change: paymentMethod === "transfer" ? 0 : (received - totalPrice),
          staff: "Admin",
          paymentMethod: paymentMethod === "cash" ? "เงินสด" : "โอน",
        }),
      });
      if (res.ok) setCheckoutDone(true);
      else alert("เกิดข้อผิดพลาดในการบันทึก");
    } catch (err) {
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  };

  const fetchSummaryForDate = async (dateStr: string) => {
    setSummaryLoading(true);
    try {
      const res = await fetch(`/api/daily-summary?date=${dateStr}`);
      if (res.ok) setSummaryData(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchDailySummary = () => {
    const today = getTodayDateStr();
    setSummaryDate(today);
    setSummaryTab("items");
    setShowSummary(true);
    fetchSummaryForDate(today);
    // fetch available dates
    fetch("/api/available-dates").then(r => r.json()).then(d => setAvailableDates(d.dates || []));
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white flex flex-col font-sans">
      <PosHeader onSummary={fetchDailySummary} />

      <main className="flex-1 flex overflow-hidden">
        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-8 max-h-[85dvh]" style={{ scrollbarWidth: "none" }}>
          {productsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
               {[...Array(10)].map((_, i) => <div key={i} className="aspect-[3/4] rounded-2xl sm:rounded-[32px] bg-white/[0.02] animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
              {products
                .filter(p => p.price > 0)
                .map((p) => (
                <ProductCard key={p.sku_code} product={p} onClick={addToCart} />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Cart (Desktop Only) */}
        <div className="hidden lg:block w-[360px] xl:w-[400px] border-l border-white/[0.04] bg-[#0d1117]">
          <CartSidebar
            cart={cart}
            addToCart={addToCart}
            removeFromCart={removeFromCart}
            clearCart={() => setCart([])}
            totalPrice={totalPrice}
            openCheckout={openCheckout}
          />
        </div>
      </main>

      {/* Mobile Cart Bar - Floating */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-6 inset-x-4 sm:inset-x-6 z-40">
           <button 
             onClick={() => setShowMobileCart(true)}
             className="w-full bg-linear-to-r from-cyan-400 to-blue-600 text-white p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-[32px] shadow-[0_20px_60px_-15px_rgba(6,182,212,0.5)] flex items-center justify-between font-black text-lg sm:text-xl lg:text-2xl active:scale-95 transition-all outline-none"
           >
              <div className="flex items-center gap-3 sm:gap-4">
                <span className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 flex items-center justify-center text-xs sm:text-sm tabular-nums">{cart.length}</span>
                <span className="tracking-tight uppercase text-sm sm:text-base lg:text-lg">รายการสินค้า</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-mono text-lg sm:text-xl">{totalPrice.toLocaleString()}</span>
                <span className="text-xs sm:text-sm opacity-80 uppercase">฿</span>
              </div>
           </button>
        </div>
      )}

      {/* Mobile Cart Sheet */}
      {showMobileCart && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setShowMobileCart(false)} />
          <div className="absolute inset-x-0 bottom-0 h-[92vh] rounded-t-[40px] sm:rounded-t-[50px] overflow-hidden bg-[#0b0f19] border-t border-white/10 flex flex-col shadow-2xl">
             <div className="w-10 h-1.5 sm:w-12 bg-white/10 rounded-full mx-auto mt-3 sm:mt-4 mb-1 sm:mb-2 shrink-0" />
             <CartSidebar
                cart={cart}
                addToCart={addToCart}
                removeFromCart={removeFromCart}
                clearCart={() => setCart([])}
                totalPrice={totalPrice}
                openCheckout={openCheckout}
              />
          </div>
        </div>
      )}

      <CheckoutModal
        showCheckout={showCheckout}
        setShowCheckout={setShowCheckout}
        cart={cart}
        totalPrice={totalPrice}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        receivedAmount={receivedAmount}
        setReceivedAmount={handleReceivedChange}
        changeAmount={changeAmount}
        checkoutDone={checkoutDone}
        handleConfirmCheckout={handleConfirmCheckout}
        handleCloseCheckout={() => {
          setShowCheckout(false);
          if (checkoutDone) setCart([]);
        }}
        loading={loading}
      />

      <SummaryModal
        showSummary={showSummary}
        setShowSummary={setShowSummary}
        summaryData={summaryData}
        summaryLoading={summaryLoading}
        summaryTab={summaryTab}
        setSummaryTab={setSummaryTab}
        summaryDate={summaryDate}
        availableDates={availableDates}
        navigateSummaryDate={navigateSummaryDate}
        showDatePicker={showDatePicker}
        setShowDatePicker={setShowDatePicker}
        selectSummaryDate={selectSummaryDate}
        getTodayDateStr={getTodayDateStr}
        products={products}
      />
    </div>
  );
}
