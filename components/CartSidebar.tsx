"use client";

import React from "react";
import { CartItem } from "./PosTypes";

interface CartSidebarProps {
  cart: CartItem[];
  addToCart: (i: any) => void;
  removeFromCart: (sku: string) => void;
  clearCart: () => void;
  totalPrice: number;
  openCheckout: () => void;
}

export const CartSidebar: React.FC<CartSidebarProps> = ({
  cart,
  addToCart,
  removeFromCart,
  clearCart,
  totalPrice,
  openCheckout,
}) => {
  return (
    <div className="flex flex-col h-full bg-[#0b0f19] border-l border-white/[0.04] sm:min-h-0 max-h-[90dvh] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
      <div className="p-5 sm:p-6 lg:p-8 border-b border-white/[0.04] flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white flex items-center gap-2 sm:gap-3">
          ตะกร้าสินค้า
          {cart.length > 0 && (
            <span className="bg-white/10 text-[10px] sm:text-xs px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-slate-400 font-bold tabular-nums">
              {cart.length}
            </span>
          )}
        </h2>
        <button
          onClick={clearCart}
          className="text-[10px] sm:text-xs font-black text-slate-500 hover:text-red-400 uppercase tracking-widest transition-colors"
        >
          ล้างตะกร้า
        </button>
      </div>

      <div
        className="flex-1 overflow-y-auto px-5 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6"
        style={{ scrollbarWidth: "none" }}
      >
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-3 sm:gap-4 opacity-40">
            <span className="text-4xl sm:text-6xl">🛒</span>
            <p className="text-sm sm:text-lg font-black uppercase tracking-widest text-center">
              ยังไม่มีสินค้า
              <br />
              ในตะกร้า
            </p>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.sku_code}
              className="flex gap-3 sm:gap-4 lg:gap-6 group items-center"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-xl sm:rounded-2xl bg-white/[0.02] border border-white/[0.04] p-1.5 sm:p-2 overflow-hidden shrink-0 shadow-lg shadow-black/20">
                <img
                  src={item.image || "/image/empty.jpg"}
                  alt={item.name}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/image/empty.jpg";
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm sm:text-base lg:text-lg font-black text-slate-100 truncate line-clamp-1 leading-tight">
                  {item.name}
                </p>
                <p className="text-xs sm:text-sm lg:text-base font-bold text-slate-500 tabular-nums">
                  {item.price.toLocaleString()} ฿
                </p>
                <div className="flex items-center gap-3 sm:gap-4 lg:gap-6 mt-2 sm:mt-3">
                  <button
                    onClick={() => removeFromCart(item.sku_code)}
                    className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-lg sm:rounded-xl bg-white/[0.04] text-slate-400 flex items-center justify-center hover:bg-white/[0.08] active:scale-90 transition-all text-lg sm:text-xl lg:text-2xl font-black border border-white/5"
                  >
                    -
                  </button>
                  <span className="text-base sm:text-lg lg:text-xl font-black text-white tabular-nums px-1 sm:px-2">
                    {item.qty}
                  </span>
                  <button
                    onClick={() => addToCart(item)}
                    className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-lg sm:rounded-xl bg-white/[0.04] text-slate-400 flex items-center justify-center hover:bg-white/[0.08] active:scale-90 transition-all text-lg sm:text-xl lg:text-2xl font-black border border-white/5"
                  >
                    +
                  </button>
                </div>
              </div>
              <p className="text-base sm:text-lg lg:text-xl font-black text-white tabular-nums tracking-tighter">
                {(item.price * item.qty).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </div>

      <div className="p-5 sm:p-6 lg:p-8 bg-[#0d1117] border-t border-white/[0.04] space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-black text-xs sm:text-sm uppercase tracking-widest">
            ยอดรวมทั้งหมด
          </span>
          <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tabular-nums tracking-tighter">
            {totalPrice.toLocaleString()}
            <span className="text-sm sm:text-base lg:text-lg ml-1 text-cyan-400">
              ฿
            </span>
          </span>
        </div>
        <button
          onClick={openCheckout}
          disabled={cart.length === 0}
          className="w-full py-4 sm:py-5 lg:py-6 rounded-2xl sm:rounded-[32px] bg-linear-to-r from-cyan-500 to-blue-500 font-black text-lg sm:text-xl lg:text-2xl text-white shadow-2xl shadow-cyan-500/20 active:scale-[0.98] transition-all disabled:opacity-20"
        >
          สรุปยอดชำระเงิน
        </button>
      </div>
    </div>
  );
};
