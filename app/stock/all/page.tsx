import { AppShell } from "@/components/AppShell";
import { TotalStockView } from "@/components/stock/TotalStockView";

export default function StockAllPage() {
  return (
    <AppShell title="สต๊อก" subtitle="สต๊อกรวมทั้งหมด">
      <TotalStockView />
    </AppShell>
  );
}
