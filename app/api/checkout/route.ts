import { NextResponse } from "next/server";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

// header row for every daily sheet
const HEADERS = [
  "เวลา",
  "บิล",
  "พนักงาน",
  "รหัสสินค้า",
  "ชื่อสินค้า",
  "จำนวน",
  "ราคาต่อชิ้น",
  "ราคารวม",
  "ยอดรวมทั้งบิล",
  "รับเงิน",
  "เงินทอน",
];

/**
 * Get or create a worksheet named after today's date (dd-MM-yyyy)
 * and make sure the header row exists.
 */
async function getDailySheet(doc: GoogleSpreadsheet) {
  const now = new Date();
  // Thai timezone UTC+7
  const th = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const dd = String(th.getUTCDate()).padStart(2, "0");
  const mm = String(th.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = th.getUTCFullYear();
  const sheetTitle = `${dd}-${mm}-${yyyy}`;

  // try to find existing sheet
  let sheet = doc.sheetsByTitle[sheetTitle];

  if (!sheet) {
    // create new sheet with headers
    sheet = await doc.addSheet({
      title: sheetTitle,
      headerValues: HEADERS,
    });
  }

  return { sheet, sheetTitle };
}

/** Simple bill-id: HHmmss */
function billId() {
  const now = new Date();
  const th = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const hh = String(th.getUTCHours()).padStart(2, "0");
  const mm = String(th.getUTCMinutes()).padStart(2, "0");
  const ss = String(th.getUTCSeconds()).padStart(2, "0");
  return `${hh}${mm}${ss}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items, total, received, change, staff } = body;

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

    const { sheet } = await getDailySheet(doc);
    const bill = billId();

    // timestamp
    const now = new Date();
    const th = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const timeStr = th.toISOString().slice(11, 19); // HH:mm:ss

    // build rows matching HEADERS
    const rows = items.map((item: any) => ({
      เวลา: timeStr,
      บิล: bill,
      พนักงาน: staff || "",
      รหัสสินค้า: item.sku_code || "",
      ชื่อสินค้า: item.name,
      จำนวน: item.qty,
      ราคาต่อชิ้น: item.price,
      ราคารวม: item.price * item.qty,
      ยอดรวมทั้งบิล: total,
      รับเงิน: received,
      เงินทอน: change,
    }));

    await sheet.addRows(rows);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
