"use client"

import React from "react";
import { Product } from "./PosTypes";

interface ProductCardProps {
  product: Product;
  onClick: (p: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product: p, onClick }) => {
  return (
    <button
      key={p.sku_code}
      onClick={() => onClick(p)}
      className="group relative flex flex-col items-stretch text-left focus:outline-none w-full"
    >
      <div className="relative flex flex-col h-full rounded-2xl sm:rounded-[32px] bg-[#111827] border-2 border-white/[0.04] overflow-hidden transition-all duration-300 group-hover:border-white/[0.1] group-hover:shadow-2xl group-active:scale-[0.96]">
        {/* image */}
        <div className="relative aspect-square w-full bg-[#0d1117] overflow-hidden flex items-center justify-center">
          <img
            src={p.image || "/image/empty.jpg"}
            alt={p.name}
            className="w-full h-full object-contain p-3 sm:p-4 lg:p-6 group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/image/empty.jpg";
            }}
          />
        </div>

        {/* info */}
        <div className="p-3 sm:p-4 lg:p-6 flex-1 flex flex-col gap-1.5 sm:gap-2 min-w-0">
          <div className="flex flex-col gap-0.5 sm:gap-1">
            <p className="text-sm sm:text-base lg:text-xl font-black text-slate-100 line-clamp-2 leading-tight min-h-[2.2rem] sm:min-h-[2.5rem] lg:min-h-[3rem]">
              {p.name}
            </p>
            <p className="text-[9px] sm:text-[10px] lg:text-xs font-bold text-slate-500 uppercase tracking-widest truncate opacity-60 font-mono">
              {p.sku_code}
            </p>
          </div>
          <div className="mt-auto pt-2 sm:pt-3 lg:pt-4 flex items-baseline gap-1">
            <span className="text-lg sm:text-xl lg:text-3xl font-black text-white tabular-nums tracking-tighter">
              {p.price.toLocaleString()}
            </span>
            <span className="text-xs sm:text-sm font-black text-cyan-400">
              ฿
            </span>
          </div>
        </div>

        {/* Quick add hint */}
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-cyan-500 shadow-xl flex items-center justify-center scale-0 group-hover:scale-100 sm:group-hover:scale-110 transition-all duration-300">
          <span className="text-white text-lg sm:text-xl font-bold">+</span>
        </div>
      </div>
    </button>
  );
};
