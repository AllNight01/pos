"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

export interface SearchableSelectOption {
  value: string;
  label: string;
  keywords?: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  label,
  placeholder = "เลือกข้อมูล",
  searchPlaceholder = "ค้นหา...",
  emptyText = "ไม่พบข้อมูล",
  className = "",
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) || null,
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return options;

    return options.filter((option) => {
      const haystack = `${option.label} ${option.keywords || ""}`.toLowerCase();
      return haystack.includes(keyword);
    });
  }, [options, query]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);
  }, [open]);

  return (
    <label className={`block ${className}`}>
      {label && (
        <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-400">
          {label}
        </span>
      )}

      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setOpen((prev) => !prev);
          }}
          className="flex h-14 w-full items-center justify-between gap-3 overflow-hidden rounded-[24px] border border-white/[0.08] bg-linear-to-br from-slate-900 to-[#0d1117] px-4 text-left shadow-lg shadow-black/25 transition hover:border-white/[0.14] focus:border-cyan-500/50 focus:outline-none"
        >
          <span className="min-w-0 truncate text-sm font-bold text-white">
            {selectedOption?.label || placeholder}
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-slate-500 transition ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open && (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#0b0f19] shadow-[0_24px_60px_-16px_rgba(0,0,0,0.55)]">
            <div className="border-b border-white/[0.06] p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-11 w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] pl-11 pr-4 text-sm font-medium text-white outline-none transition focus:border-cyan-500/50"
                />
              </div>
            </div>

            <div
              className="max-h-72 overflow-y-auto p-2"
              style={{ scrollbarWidth: "thin" }}
            >
              {filteredOptions.length ? (
                filteredOptions.map((option) => {
                  const active = option.value === value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onChange(option.value);
                        setQuery("");
                        setOpen(false);
                      }}
                      className={`flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${
                        active
                          ? "bg-cyan-500 text-black"
                          : "text-slate-200 hover:bg-white/[0.05]"
                      }`}
                    >
                      <span className="min-w-0 truncate">{option.label}</span>
                      {active && <Check className="h-4 w-4 shrink-0" />}
                    </button>
                  );
                })
              ) : (
                <div className="px-4 py-6 text-center text-sm font-medium text-slate-400">
                  {emptyText}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </label>
  );
}
