import { NextResponse } from "next/server";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

// header row for every daily sheet
const HEADERS = [
  "เวลา",
  "บิล",
  "รหัสสินค้า",
  "ชื่อสินค้า",
  "จำนวน",
  "ราคาต่อชิ้น",
  "ราคารวม",
  "ยอดรวมทั้งบิล",
  "การชำระเงิน",
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
    const { items, total, received, change, staff, paymentMethod } = body;


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
      รหัสสินค้า: item.sku_code || "",
      ชื่อสินค้า: item.name,
      จำนวน: item.qty,
      ราคาต่อชิ้น: item.price,
      ราคารวม: item.price * item.qty,
      ยอดรวมทั้งบิล: total,
      การชำระเงิน: paymentMethod || "เงินสด",
      รับเงิน: received,
      เงินทอน: change,
    }));

    const addedRows = await sheet.addRows(rows);

    // Color alternating bills
    try {
      if (addedRows.length > 0) {
        const firstAddedRowIndex = addedRows[0].rowNumber - 1;
        const lastAddedRowIndex = addedRows[addedRows.length - 1].rowNumber - 1;

        let useGray = false;
        if (firstAddedRowIndex > 0) {
          // Load the cell JUST ABOVE the first added row to check its color
          await sheet.loadCells({
            startRowIndex: firstAddedRowIndex - 1,
            endRowIndex: firstAddedRowIndex,
            startColumnIndex: 0,
            endColumnIndex: 1,
          });
          const prevCell = sheet.getCell(firstAddedRowIndex - 1, 0);
          const prevColor = prevCell.userEnteredFormat?.backgroundColor;
          
          // If previous row is NOT gray (i.e. it's white or undefined), use gray for this bill
          if (!prevColor || (prevColor.red === 1 && prevColor.green === 1 && prevColor.blue === 1)) {
            useGray = true;
          }
        }

        if (useGray) {
          await sheet.loadCells({
            startRowIndex: firstAddedRowIndex,
            endRowIndex: lastAddedRowIndex + 1,
            startColumnIndex: 0,
            endColumnIndex: HEADERS.length,
          });
          for (let r = firstAddedRowIndex; r <= lastAddedRowIndex; r++) {
            for (let c = 0; c < HEADERS.length; c++) {
              const cell = sheet.getCell(r, c);
              cell.backgroundColorStyle = {
                rgbColor: { red: 0.96, green: 0.96, blue: 0.98 },
              };
            }
          }
          await sheet.saveUpdatedCells();
        }
      }
    } catch (err) {
      console.error("Formatting error (non-critical):", err);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
