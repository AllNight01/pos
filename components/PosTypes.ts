export interface Product {
  sku_code: string;
  name: string;
  price: number;
  cost?: number;
  image: string;
  category: string;
  consumable_id?: string;
  packs_per_crate?: number; // e.g. 20 packs in 1 crate
  pieces_per_pack?: number; // e.g. 50 pieces in 1 pack
  conversion_rate?: number; // Fallback or direct pieces per unit
  is_inventory?: boolean; // true = physical item you withdraw from warehouse
}

export interface CartItem extends Product {
  qty: number;
}

export interface SummaryItem {
  sku_code: string;
  name: string;
  qty: number;
  revenue: number;
  price: number;
}

export interface BillDetail {
  billId: string;
  time: string;
  total: number;
  itemCount: number;
  paymentMethod: string;
}

export interface DailySummaryData {
  date: string;
  totalBills: number;
  totalRevenue: number;
  totalCash: number;
  totalTransfer: number;
  totalItems: number;
  items: SummaryItem[];
  bills: BillDetail[];
}
