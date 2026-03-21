"use client";

import React from "react";

interface CheckoutModalProps {
  showCheckout: boolean;
  setShowCheckout: (show: boolean) => void;
  totalPrice: number;
  paymentMethod: "cash" | "transfer";
  setPaymentMethod: (method: "cash" | "transfer") => void;
  receivedAmount: string;
  setReceivedAmount: (val: string) => void;
  changeAmount: number | null;
  checkoutDone: boolean;
  handleConfirmCheckout: () => void;
  handleCloseCheckout: () => void;
  loading: boolean;
}

const NUMPAD_KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9, "0", "00", "C"] as const;
const QUICK_CASH_AMOUNTS = [1000, 500, 100, 50, 20, 10, 5, 2, 1] as const;

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  showCheckout,
  setShowCheckout,
  totalPrice,
  paymentMethod,
  setPaymentMethod,
  receivedAmount,
  setReceivedAmount,
  changeAmount,
  checkoutDone,
  handleConfirmCheckout,
  handleCloseCheckout,
  loading,
}) => {
  if (!showCheckout) return null;

  const canConfirm =
    paymentMethod === "transfer" ||
    (receivedAmount && Number(receivedAmount) >= totalPrice);

  const handleNumpadPress = (key: (typeof NUMPAD_KEYS)[number]) => {
    if (key === "C") {
      setReceivedAmount("");
      return;
    }
    setReceivedAmount(receivedAmount + String(key));
  };

  const handleQuickCashSelect = (amount: number) => {
    const currentAmount = Number(receivedAmount) || 0;
    setReceivedAmount(String(currentAmount + amount));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4 lg:p-8">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
        onClick={handleCloseCheckout}
      />

      <div
        className="relative w-full overflow-hidden rounded-t-3xl border-t-2 border-white/[0.08] bg-[#0b0f19] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] sm:max-w-lg sm:rounded-[40px] sm:border-2 lg:max-w-[80dvw] lg:rounded-[50px]"
        style={{
          animation: "slide-up .4s cubic-bezier(0.16, 1, 0.3, 1) both",
          maxHeight: "100dvh",
          display: "grid",
          gridTemplateRows: checkoutDone ? "1fr" : "auto 1fr auto",
        }}
      >
        {!checkoutDone ? (
          <>
            <div className="flex items-center justify-between border-b border-white/[0.04] px-4 py-2.5 sm:px-8 sm:py-6 lg:px-10 lg:py-8">
              <h3 className="text-base font-black uppercase italic tracking-tighter text-white sm:text-2xl lg:text-3xl">
                ชำระเงิน
              </h3>
              <button
                type="button"
                onClick={handleCloseCheckout}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.04] text-base font-bold text-slate-400 transition-all hover:text-white sm:h-12 sm:w-12 sm:text-xl"
              >
                ×
              </button>
            </div>

            <div
              className="overflow-y-auto px-3 pb-2.5 sm:px-8 sm:pb-8 lg:overflow-visible lg:px-10 lg:pb-8"
              style={{ scrollbarWidth: "none", minHeight: 0 }}
            >
              <div className="space-y-2.5 sm:space-y-8 lg:hidden">
                <div className="flex items-center justify-between gap-3 sm:block">
                  <div className="sm:mb-8 sm:rounded-[40px] sm:border-2 sm:border-white/[0.1] sm:bg-linear-to-br sm:from-white/[0.04] sm:to-transparent sm:p-8 sm:text-center sm:shadow-2xl">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400 sm:mb-3 sm:text-sm sm:tracking-[0.3em]">
                      ยอดรวม
                    </p>
                    <p className="text-2xl font-black tracking-tighter text-white tabular-nums sm:text-5xl">
                      {totalPrice.toLocaleString()}
                      <span className="ml-1 text-sm text-cyan-400 sm:ml-3 sm:text-xl">
                        ฿
                      </span>
                    </p>
                  </div>

                  <div className="flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] p-1 sm:gap-4 sm:rounded-[32px] sm:border-2 sm:p-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("cash")}
                      className={`flex items-center justify-center gap-1 whitespace-nowrap rounded-lg px-3.5 py-2.5 text-sm font-black transition-all sm:flex-1 sm:gap-3 sm:rounded-[24px] sm:px-6 sm:py-5 sm:text-lg ${
                        paymentMethod === "cash"
                          ? "bg-white text-black shadow-xl"
                          : "text-slate-500"
                      }`}
                    >
                      💵 <span className="hidden sm:inline">เงินสด</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("transfer")}
                      className={`flex items-center justify-center gap-1 whitespace-nowrap rounded-lg px-3.5 py-2.5 text-sm font-black transition-all sm:flex-1 sm:gap-3 sm:rounded-[24px] sm:px-6 sm:py-5 sm:text-lg ${
                        paymentMethod === "transfer"
                          ? "bg-white text-black shadow-xl"
                          : "text-slate-500"
                      }`}
                    >
                      💳 <span className="hidden sm:inline">เงินโอน</span>
                    </button>
                  </div>
                </div>

                {paymentMethod === "cash" ? (
                  <div className="space-y-2.5 sm:space-y-8">
                    <div className="grid grid-cols-2 gap-2 sm:gap-6">
                      <AmountCard
                        label="รับเงินมา"
                        value={receivedAmount || "0"}
                        accent="text-emerald-400"
                        border="border-emerald-500/20"
                        bg="bg-[#0d1117]"
                      />
                      <AmountCard
                        label="เงินทอน"
                        value={
                          changeAmount !== null
                            ? changeAmount.toLocaleString()
                            : "0"
                        }
                        accent={
                          changeAmount !== null
                            ? "text-white"
                            : "text-slate-700"
                        }
                        border={
                          changeAmount !== null
                            ? "border-white/20"
                            : "border-white/5"
                        }
                        bg={
                          changeAmount !== null
                            ? "bg-white/[0.04]"
                            : "bg-[#0d1117]"
                        }
                      />
                    </div>

                    <div className="space-y-1.5 sm:space-y-3">
                      <button
                        type="button"
                        onClick={() => setReceivedAmount(totalPrice.toString())}
                        className="w-full whitespace-nowrap rounded-xl bg-cyan-500 py-2 text-sm font-black text-black shadow-xl shadow-cyan-500/40 transition-all active:scale-[0.98] sm:rounded-[32px] sm:py-5 sm:text-xl"
                      >
                        จ่ายพอดี ({totalPrice.toLocaleString()} ฿)
                      </button>
                      <QuickCashButtons
                        amounts={QUICK_CASH_AMOUNTS}
                        onSelect={handleQuickCashSelect}
                        mobile
                      />
                    </div>

                    <NumpadGrid onPress={handleNumpadPress} mobile />
                  </div>
                ) : (
                  <TransferPanel />
                )}
              </div>

              <div className="hidden lg:block">
                {paymentMethod === "cash" ? (
                  <div className="grid grid-cols-[minmax(0,1fr)_360px] gap-8 xl:grid-cols-[minmax(0,1fr)_400px]">
                    <div className="space-y-6">
                      <div className="rounded-[32px] border-2 border-white/[0.1] bg-linear-to-br from-white/[0.04] to-transparent p-8 shadow-2xl">
                        <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">
                          ยอดรวม
                        </p>
                        <p className="mt-4 text-7xl font-black tracking-tighter text-white tabular-nums">
                          {totalPrice.toLocaleString()}
                          <span className="ml-3 text-2xl text-cyan-400">฿</span>
                        </p>
                      </div>

                      <div className="flex gap-3 rounded-[28px] border border-white/[0.06] bg-white/[0.03] p-2">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod("cash")}
                          className="flex-1 whitespace-nowrap rounded-[22px] bg-white px-5 py-4 text-lg font-black text-black shadow-xl transition-all"
                        >
                          💵 เงินสด
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod("transfer")}
                          className="flex-1 whitespace-nowrap rounded-[22px] px-5 py-4 text-lg font-black text-slate-500 transition-all"
                        >
                          💳 เงินโอน
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <AmountPanel
                          label="รับเงินมา"
                          value={receivedAmount || "0"}
                          accent="text-emerald-300"
                          border="border-emerald-500/20"
                          bg="bg-emerald-500/10"
                        />
                        <AmountPanel
                          label="เงินทอน"
                          value={
                            changeAmount !== null
                              ? changeAmount.toLocaleString()
                              : "0"
                          }
                          accent={
                            changeAmount !== null
                              ? "text-white"
                              : "text-slate-700"
                          }
                          border="border-white/[0.08]"
                          bg="bg-white/[0.03]"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => setReceivedAmount(totalPrice.toString())}
                        className="w-full whitespace-nowrap rounded-[24px] bg-cyan-500 px-5 py-4 text-xl font-black text-black shadow-xl shadow-cyan-500/40 transition-all active:scale-[0.98]"
                      >
                        à¸ˆà¹ˆà¸²à¸¢à¸žà¸­à¸”à¸µ ({totalPrice.toLocaleString()} à¸¿)
                      </button>

                      <QuickCashButtons
                        amounts={QUICK_CASH_AMOUNTS}
                        onSelect={handleQuickCashSelect}
                      />

                      <button
                        type="button"
                        onClick={handleConfirmCheckout}
                        disabled={loading || !canConfirm}
                        className={`w-full whitespace-nowrap rounded-[28px] py-5 text-2xl font-black uppercase italic tracking-tighter text-white shadow-2xl transition-all active:scale-[0.98] ${
                          canConfirm
                            ? "bg-linear-to-r from-emerald-400 to-blue-600 shadow-blue-500/40"
                            : "bg-slate-800 opacity-30 shadow-none"
                        }`}
                      >
                        {loading ? "กำลังบันทึก..." : "ยืนยันชำระเงิน"}
                      </button>
                    </div>

                    <div className="rounded-[32px] border border-white/[0.06] bg-[#0d1117] p-5">
                      <NumpadGrid onPress={handleNumpadPress} />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-[minmax(0,1fr)_360px] gap-8 xl:grid-cols-[minmax(0,1fr)_400px]">
                    <div className="space-y-6">
                      <div className="rounded-[32px] border-2 border-white/[0.1] bg-linear-to-br from-white/[0.04] to-transparent p-8 shadow-2xl">
                        <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">
                          ยอดรวม
                        </p>
                        <p className="mt-4 text-7xl font-black tracking-tighter text-white tabular-nums">
                          {totalPrice.toLocaleString()}
                          <span className="ml-3 text-2xl text-cyan-400">฿</span>
                        </p>
                      </div>

                      <div className="flex gap-3 rounded-[28px] border border-white/[0.06] bg-white/[0.03] p-2">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod("cash")}
                          className="flex-1 whitespace-nowrap rounded-[22px] px-5 py-4 text-lg font-black text-slate-500 transition-all"
                        >
                          💵 เงินสด
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod("transfer")}
                          className="flex-1 whitespace-nowrap rounded-[22px] bg-white px-5 py-4 text-lg font-black text-black shadow-xl transition-all"
                        >
                          💳 เงินโอน
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleConfirmCheckout}
                        disabled={loading || !canConfirm}
                        className={`w-full whitespace-nowrap rounded-[28px] py-5 text-2xl font-black uppercase italic tracking-tighter text-white shadow-2xl transition-all active:scale-[0.98] ${
                          canConfirm
                            ? "bg-linear-to-r from-emerald-400 to-blue-600 shadow-blue-500/40"
                            : "bg-slate-800 opacity-30 shadow-none"
                        }`}
                      >
                        {loading ? "กำลังบันทึก..." : "ยืนยันชำระเงิน"}
                      </button>
                    </div>

                    <div className="rounded-[32px] border border-white/[0.06] bg-[#0d1117] p-8">
                      <TransferPanel compact={false} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="safe-area-bottom shrink-0 border-t-2 border-white/[0.04] bg-[#0d1117] p-3 sm:p-6 lg:hidden">
              <button
                type="button"
                onClick={handleConfirmCheckout}
                disabled={loading || !canConfirm}
                className={`w-full whitespace-nowrap rounded-2xl py-3.5 text-lg font-black uppercase italic tracking-tighter text-white shadow-2xl transition-all active:scale-[0.98] sm:rounded-[40px] sm:py-6 sm:text-2xl ${
                  canConfirm
                    ? "bg-linear-to-r from-emerald-400 to-blue-600 shadow-blue-500/40"
                    : "bg-slate-800 opacity-30 shadow-none"
                }`}
              >
                {loading ? "กำลังบันทึก..." : "ยืนยันชำระเงิน"}
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-5 p-8 text-center sm:space-y-8 sm:p-14 lg:space-y-10 lg:p-20">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-emerald-500/30 bg-emerald-500/10 shadow-2xl shadow-emerald-500/20 sm:h-28 sm:w-28 lg:h-32 lg:w-32">
              <span className="scale-150 text-4xl text-emerald-400 sm:text-6xl lg:text-7xl">
                ✓
              </span>
            </div>
            <div className="space-y-2 sm:space-y-4">
              <h2 className="text-2xl font-black italic text-white sm:text-4xl lg:text-5xl">
                ชำระเงินสำเร็จ!
              </h2>
              <p className="text-base font-bold uppercase tracking-[0.22em] text-slate-400 sm:text-lg lg:text-xl">
                ยินดีด้วย! บันทึกยอดขายเรียบร้อย
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowCheckout(false);
                handleCloseCheckout();
              }}
              className="w-full whitespace-nowrap rounded-2xl bg-white py-4 text-lg font-black text-black shadow-2xl transition-all hover:bg-slate-200 active:scale-[0.98] sm:rounded-[40px] sm:py-6 sm:text-2xl lg:py-8 lg:text-3xl"
            >
              กลับไปหน้าขาย
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

function AmountCard({
  label,
  value,
  accent,
  border,
  bg,
}: {
  label: string;
  value: string;
  accent: string;
  border: string;
  bg: string;
}) {
  return (
    <div className="space-y-0.5 sm:space-y-4">
      <label className="block text-center text-xs font-black uppercase tracking-[0.22em] text-slate-400 sm:text-sm">
        {label}
      </label>
      <div
        className={`min-h-[44px] break-all rounded-xl border-2 px-2 py-2 text-center text-xl font-black tabular-nums shadow-inner sm:min-h-[100px] sm:rounded-[32px] sm:px-4 sm:py-6 sm:text-4xl ${accent} ${border} ${bg}`}
      >
        {value}
      </div>
    </div>
  );
}

function AmountPanel({
  label,
  value,
  accent,
  border,
  bg,
}: {
  label: string;
  value: string;
  accent: string;
  border: string;
  bg: string;
}) {
  return (
    <div className={`rounded-[28px] border p-5 ${border} ${bg}`}>
      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
        {label}
      </p>
      <p
        className={`mt-4 break-all text-4xl font-black tabular-nums ${accent}`}
      >
        {value}
      </p>
    </div>
  );
}

function NumpadGrid({
  onPress,
  mobile = false,
}: {
  onPress: (key: (typeof NUMPAD_KEYS)[number]) => void;
  mobile?: boolean;
}) {
  return (
    <div className={`grid grid-cols-3 ${mobile ? "gap-1 sm:gap-4" : "gap-3"}`}>
      {NUMPAD_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onPress(key)}
          className={`${
            mobile
              ? "h-10 text-lg sm:h-20 sm:text-3xl"
              : "h-24 text-4xl xl:h-28"
          } rounded-xl border-2 font-black transition-all hover:bg-white/[0.08] active:scale-95 sm:rounded-[28px] ${
            key === "C"
              ? "border-red-500/20 bg-red-500/10 text-red-400"
              : "border-white/[0.06] bg-white/[0.04] text-white"
          }`}
        >
          {key}
        </button>
      ))}
    </div>
  );
}

function QuickCashButtons({
  amounts,
  onSelect,
  mobile = false,
}: {
  amounts: readonly number[];
  onSelect: (amount: number) => void;
  mobile?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-3 ${mobile ? "gap-1.5 sm:grid-cols-5 sm:gap-2" : "gap-2"}`}
    >
      {amounts.map((amount) => (
        <button
          key={amount}
          type="button"
          onClick={() => onSelect(amount)}
          className={`whitespace-nowrap rounded-lg border border-emerald-500/20 bg-emerald-500/10 font-black text-emerald-400 transition-all hover:bg-emerald-500/20 active:scale-95 ${
            mobile
              ? "py-2 text-sm sm:rounded-2xl sm:py-4 sm:text-base"
              : "rounded-2xl py-3 text-lg"
          }`}
        >
          {amount}
        </button>
      ))}
    </div>
  );
}

function TransferPanel({ compact = true }: { compact?: boolean }) {
  return (
    <div
      className={`text-center ${
        compact ? "space-y-4 py-6 sm:space-y-8 sm:py-12" : "space-y-6"
      }`}
    >
      <div
        className={`mx-auto flex items-center justify-center bg-white shadow-2xl ${
          compact
            ? "h-36 w-36 rounded-2xl p-5 sm:h-56 sm:w-56 sm:rounded-[40px] sm:p-8"
            : "h-64 w-64 rounded-[40px] p-8"
        }`}
      >
        <div className="space-y-2 text-center text-black">
          <div className={compact ? "text-2xl sm:text-4xl" : "text-5xl"}>
            📱
          </div>
          <p
            className={`font-black italic uppercase leading-tight ${
              compact ? "text-base sm:text-lg" : "text-xl"
            }`}
          >
            โอนเงินเข้าเครื่อง
            <br />
            SCAN QR
          </p>
        </div>
      </div>
      <p
        className={`font-bold leading-relaxed text-slate-300 ${
          compact ? "text-sm sm:text-base lg:text-lg" : "text-lg"
        }`}
      >
        กรุณาตรวจสอบยอดโอนให้เรียบร้อย
        <br />
        ก่อนกดปุ่มยืนยันด้านล่าง
      </p>
    </div>
  );
}
