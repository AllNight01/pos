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

    const doc = new GoogleSpreadsheet(
      process.env.GOOGLE_SHEET_ID!,
      serviceAccountAuth,
    );
    await doc.loadInfo();

    // Look for a sheet named "สินค้า" (Products)
    const sheet = doc.sheetsByTitle["สินค้า"];
    if (!sheet) {
      return NextResponse.json(
        { success: false, error: "ไม่พบ sheet ชื่อ 'สินค้า'" },
        { status: 404 },
      );
    }

    const rows = await sheet.getRows();

    const products = rows
      .map((row, index) => {
        const skuRaw =
          row.get("รหัส SKU") ||
          row.get("รหัสสินค้า") ||
          row.get("sku_code") ||
          "";
        const name = row.get("ชื่อสินค้า") || row.get("name") || "";
        const price =
          Number(
            row.get("ราคา (บาท)") || row.get("ราคา") || row.get("price"),
          ) || 0;
        const imageRaw =
          row.get("Path รูปภาพ") || row.get("รูป") || row.get("image") || "";
        const category = row.get("หมวดหมู่") || "";

        // Skip rows without name or valid price
        if (!name || price <= 0) return null;

        // If image is just a filename, prefix with "image/"
        let image = imageRaw.trim();
        if (
          image &&
          !image.startsWith("http") &&
          !image.startsWith("image/") &&
          !image.startsWith("/")
        ) {
          image = `image/${image}`;
        }

        // Resolve SKU: handle scientific notation (e.g. 8.85029E+12)
        let skuCode = String(skuRaw).trim();
        if (skuCode && (skuCode.includes("E+") || skuCode.includes("e+"))) {
          // Try to extract barcode from image filename instead
          const match = image.match(/(\d{8,13})\.\w+$/);
          if (match) {
            skuCode = match[1];
          } else {
            // Convert scientific notation to full number
            try {
              skuCode = BigInt(Math.round(Number(skuCode))).toString();
            } catch {
              skuCode = "";
            }
          }
        }

        // Auto-generate ID if no valid sku_code
        const id = skuCode || `ITEM_${String(index + 1).padStart(3, "0")}`;

        return {
          sku_code: id,
          name: name.trim(),
          price,
          image: image || "",
          category: category.trim(),
        };
      })
      .filter(Boolean);

    return NextResponse.json({ success: true, products });
  } catch (error: any) {
    console.error("Products API error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
