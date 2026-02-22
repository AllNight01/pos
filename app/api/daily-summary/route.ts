import { NextResponse } from "next/server";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

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

export async function GET(req: Request) {
  try {
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const doc = new GoogleSpreadsheet(
      process.env.GOOGLE_SHEET_ID!,
      serviceAccountAuth,
    );
    await doc.loadInfo();

    // Accept ?date=dd-MM-yyyy or default to today (Thai timezone UTC+7)
    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date");
    let sheetTitle: string;
    if (dateParam && /^\d{2}-\d{2}-\d{4}$/.test(dateParam)) {
      sheetTitle = dateParam;
    } else {
      const now = new Date();
      const th = new Date(now.getTime() + 7 * 60 * 60 * 1000);
      const dd = String(th.getUTCDate()).padStart(2, "0");
      const mm = String(th.getUTCMonth() + 1).padStart(2, "0");
      const yyyy = th.getUTCFullYear();
      sheetTitle = `${dd}-${mm}-${yyyy}`;
    }

    const sheet = doc.sheetsByTitle[sheetTitle];

    if (!sheet) {
      // No sheet for today — no sales yet
      return NextResponse.json({
        success: true,
        date: sheetTitle,
        totalBills: 0,
        totalRevenue: 0,
        totalItems: 0,
        items: [],
        staffSummary: [],
        bills: [],
      });
    }

    // Load all rows
    const rows = await sheet.getRows();

    // Aggregate by product
    const itemMap = new Map<string, SummaryItem>();
    // Aggregate by staff
    const staffMap = new Map<string, { bills: Set<string>; revenue: number }>();
    // Aggregate by bill
    const billMap = new Map<
      string,
      { time: string; staff: string; total: number; itemCount: number }
    >();

    const billIds = new Set<string>();

    for (const row of rows) {
      const billId = row.get("บิล") || "";
      const staffName = row.get("พนักงาน") || "";
      const skuCode = row.get("รหัสสินค้า") || "";
      const productName = row.get("ชื่อสินค้า") || "";
      const qty = Number(row.get("จำนวน")) || 0;
      const pricePerUnit = Number(row.get("ราคาต่อชิ้น")) || 0;
      const lineTotal = Number(row.get("ราคารวม")) || 0;
      const billTotal = Number(row.get("ยอดรวมทั้งบิล")) || 0;
      const time = row.get("เวลา") || "";

      billIds.add(billId);

      // Product aggregation
      const key = skuCode || productName;
      if (itemMap.has(key)) {
        const existing = itemMap.get(key)!;
        existing.qty += qty;
        existing.revenue += lineTotal;
      } else {
        itemMap.set(key, {
          sku_code: skuCode,
          name: productName,
          qty,
          revenue: lineTotal,
          price: pricePerUnit,
        });
      }

      // Staff aggregation
      if (staffName) {
        if (!staffMap.has(staffName)) {
          staffMap.set(staffName, { bills: new Set(), revenue: 0 });
        }
        const s = staffMap.get(staffName)!;
        if (!s.bills.has(billId)) {
          s.revenue += billTotal;
        }
        s.bills.add(billId);
      }

      // Bill aggregation
      if (!billMap.has(billId)) {
        billMap.set(billId, {
          time,
          staff: staffName,
          total: billTotal,
          itemCount: qty,
        });
      } else {
        billMap.get(billId)!.itemCount += qty;
      }
    }

    // Convert maps to arrays
    const items: SummaryItem[] = Array.from(itemMap.values()).sort(
      (a, b) => b.revenue - a.revenue,
    );

    const staffSummary: StaffSummary[] = Array.from(staffMap.entries()).map(
      ([name, data]) => ({
        name,
        bills: data.bills.size,
        revenue: data.revenue,
      }),
    );

    const bills: BillDetail[] = Array.from(billMap.entries())
      .map(([billId, data]) => ({
        billId,
        time: data.time,
        staff: data.staff,
        total: data.total,
        itemCount: data.itemCount,
      }))
      .sort((a, b) => b.time.localeCompare(a.time)); // newest first

    const totalRevenue = bills.reduce((sum, b) => sum + b.total, 0);
    const totalItems = items.reduce((sum, i) => sum + i.qty, 0);

    return NextResponse.json({
      success: true,
      date: sheetTitle,
      totalBills: billIds.size,
      totalRevenue,
      totalItems,
      items,
      staffSummary,
      bills,
    });
  } catch (error: any) {
    console.error("Daily summary error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
