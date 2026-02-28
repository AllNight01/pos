import { NextResponse } from "next/server";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

export async function GET() {
  try {
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, serviceAccountAuth);
    await doc.loadInfo();

    const sheet = doc.sheetsByTitle["สินค้า"];
    if (!sheet) {
      return NextResponse.json({ success: false, error: "ไม่พบ sheet 'สินค้า'" }, { status: 404 });
    }

    const rows = await sheet.getRows();

    const products = rows.map((row, index) => {
      const skuRaw = row.get("รหัส SKU") || row.get("sku_code") || "";
      const name = (row.get("ชื่อสินค้า") || row.get("name") || "").trim();
      const price = Number(row.get("ราคาขาย (บาท)") || row.get("price")) || 0;
      const cost = Number(row.get("ราคาทุน (บาท)") || row.get("cost")) || 0;
      const category = (row.get("หมวดหมู่") || "").trim();
      const imageRaw = (row.get("Path รูปภาพ") || row.get("image") || "").trim();
      
      // Multi-tier inventory fields
      const consumableId = (row.get("ตัดวัสดุ") || "").trim();
      const packsPerCrate = Number(row.get("จำนวนแพ็คต่อลัง")) || 0;
      const piecesPerPack = Number(row.get("จำนวนชิ้นต่อแพ็ค") || row.get("จำนวนต่อหน่วยใหญ่")) || 0;

      // Read is_inventory directly from Excel
      const isInventoryRaw = (row.get("is_inventory") || "").toString().trim().toUpperCase();
      const isInventory = isInventoryRaw === "TRUE" || isInventoryRaw === "1" || isInventoryRaw === "YES";

      if (!name) return null;

      let image = imageRaw;
      if (image && !image.startsWith("http") && !image.startsWith("/") && !image.startsWith("image/")) {
        image = `image/${image}`;
      }

      // Fix SKU stability: If no SKU, use name as fallback
      let skuCode = String(skuRaw).trim();
      if (skuCode && (skuCode.includes("E+") || skuCode.includes("e+"))) {
        try {
          skuCode = BigInt(Math.round(Number(skuCode))).toString();
        } catch {
          skuCode = "";
        }
      }

      // If no SKU, use name-based ID instead of index-based
      const nameHandle = name.replace(/\s+/g, "_").replace(/[^\w\u0E00-\u0E7F]/g, "").slice(0, 20);
      const id = skuCode || `ITEM_${nameHandle || String(index + 1).padStart(3, "0")}`;

      // Fallback mapping for items to consumables if Excel columns are missing
      const fallbackMapping: Record<string, string> = {
        "น้ำแข็งแก้วใหญ่": "แก้วใหญ่",
        "น้ำแข็งแก้วเล็ก": "แก้วเล็ก",
        "น้ำแข็งถุงใหญ่": "ถุงใหญ่",
        "น้ำแข็งถุงเล็ก": "ถุงเล็ก",
        "โค้ก 330มล": "แก้วใหญ่",
        "เป๊ปซี่ 345มล": "แก้วใหญ่",
        "สไปรท์ 330มล": "แก้วใหญ่",
        "แฟนต้า 330มล น้ำเขียว": "แก้วใหญ่",
        "แฟนต้า 330มล น้ำแดง": "แก้วใหญ่",
        "แฟนต้า 330มล น้ำส้ม": "แก้วใหญ่",
        "แฟนต้า 330มล องุ่นป๊อบ": "แก้วใหญ่",
        "แก้วเล็ก": "แก้วเล็ก",
        "แก้วใหญ่": "แก้วใหญ่",
        "ถุงใหญ่": "ถุงใหญ่",
        "ถุงเล็ก": "ถุงเล็ก",
      };

      const finalConsumableId = consumableId || fallbackMapping[name] || "";

      return {
        sku_code: id,
        name,
        price,
        cost,
        image: image || "",
        category,
        consumable_id: finalConsumableId,
        packs_per_crate: packsPerCrate,
        pieces_per_pack: piecesPerPack,
        conversion_rate: piecesPerPack,
        is_inventory: isInventory,
      };
    }).filter(Boolean);

    return NextResponse.json({ success: true, products });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
