import { NextResponse } from "next/server";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

const HEADERS = [
  "วันที่", 
  "รหัสสินค้า", 
  "ชื่อสินค้า", 
  "ยอดยกมา", 
  "เบิก_ชิ้น", 
  "เบิก_แพ็ค", 
  "เบิก_ลัง", 
  "แกะ_แพ็ค", 
  "แกะ_ลัง", 
  "นับจริง"
];

async function getInventorySheet(doc: GoogleSpreadsheet) {
  let sheet = doc.sheetsByTitle["สต็อกรายวัน"];
  if (!sheet) {
    sheet = await doc.addSheet({
      title: "สต็อกรายวัน",
      headerValues: HEADERS,
    });
  }
  return sheet;
}

function getTodayDateStr() {
  const now = new Date();
  const th = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const dd = String(th.getUTCDate()).padStart(2, "0");
  const mm = String(th.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = th.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const date = url.searchParams.get("date") || getTodayDateStr();

    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, serviceAccountAuth);
    await doc.loadInfo();
    const sheet = await getInventorySheet(doc);
    const rows = await sheet.getRows();

    const dailyData = rows
      .filter((row) => row.get("วันที่") === date)
      .map((row) => ({
        sku_code: row.get("รหัสสินค้า"),
        name: row.get("ชื่อสินค้า"),
        start_bal: Number(row.get("ยอดยกมา")) || 0,
        withdraw: Number(row.get("เบิก_ชิ้น")) || 0,
        withdraw_pack: Number(row.get("เบิก_แพ็ค")) || 0,
        withdraw_crate: Number(row.get("เบิก_ลัง")) || 0,
        split_pack: Number(row.get("แกะ_แพ็ค")) || 0,
        split_crate: Number(row.get("แกะ_ลัง")) || 0,
        closing: Number(row.get("นับจริง")) || 0,
      }));

    return NextResponse.json({ success: true, data: dailyData });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { date, items } = body; 

    if (!date || !items || !Array.isArray(items)) {
      return NextResponse.json({ success: false, error: "Invalid data" }, { status: 400 });
    }

    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, serviceAccountAuth);
    await doc.loadInfo();
    const sheet = await getInventorySheet(doc);
    const rows = await sheet.getRows();

    for (const item of items) {
      const existingRow = rows.find(
        (row) => row.get("วันที่") === date && row.get("รหัสสินค้า") === item.sku_code
      );

      // Use a dynamic row data object to only update provided fields
      const rowData: any = {
        "วันที่": date,
        "รหัสสินค้า": item.sku_code,
        "ชื่อสินค้า": item.name,
      };

      // Only add to rowData if field is present in request
      if (item.start_bal !== undefined) rowData["ยอดยกมา"] = item.start_bal;
      if (item.withdraw !== undefined) rowData["เบิก_ชิ้น"] = item.withdraw;
      if (item.withdraw_pack !== undefined) rowData["เบิก_แพ็ค"] = item.withdraw_pack;
      if (item.withdraw_crate !== undefined) rowData["เบิก_ลัง"] = item.withdraw_crate;
      if (item.split_pack !== undefined) rowData["แกะ_แพ็ค"] = item.split_pack;
      if (item.split_crate !== undefined) rowData["แกะ_ลัง"] = item.split_crate;
      if (item.closing !== undefined) rowData["นับจริง"] = item.closing;

      if (existingRow) {
        // Update only the provided fields in the existing row
        Object.entries(rowData).forEach(([key, val]) => {
          if (key !== "วันที่" && key !== "รหัสสินค้า" && key !== "ชื่อสินค้า") {
            existingRow.set(key, val);
          }
        });
        await existingRow.save();
      } else {
        // For new rows, fill missing fields with 0
        const newRowData = {
          "วันที่": date,
          "รหัสสินค้า": item.sku_code,
          "ชื่อสินค้า": item.name,
          "ยอดยกมา": item.start_bal || 0,
          "เบิก_ชิ้น": item.withdraw || 0,
          "เบิก_แพ็ค": item.withdraw_pack || 0,
          "เบิก_ลัง": item.withdraw_crate || 0,
          "แกะ_แพ็ค": item.split_pack || 0,
          "แกะ_ลัง": item.split_crate || 0,
          "นับจริง": item.closing || 0,
        };
        await sheet.addRow(newRowData);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
