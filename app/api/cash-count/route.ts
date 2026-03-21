import { NextResponse } from "next/server";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

const COLUMN = {
  date: "\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48",
  startingCash: "\u0e40\u0e07\u0e34\u0e19\u0e17\u0e2d\u0e19\u0e15\u0e31\u0e49\u0e07\u0e15\u0e49\u0e19",
  cashSales: "\u0e22\u0e2d\u0e14\u0e02\u0e32\u0e22\u0e40\u0e07\u0e34\u0e19\u0e2a\u0e14",
  transferSales: "\u0e22\u0e2d\u0e14\u0e02\u0e32\u0e22\u0e42\u0e2d\u0e19",
  expectedCash: "\u0e22\u0e2d\u0e14\u0e04\u0e27\u0e23\u0e21\u0e35",
  actualCash: "\u0e19\u0e31\u0e1a\u0e40\u0e07\u0e34\u0e19\u0e08\u0e23\u0e34\u0e07",
  difference: "\u0e2a\u0e48\u0e27\u0e19\u0e15\u0e48\u0e32\u0e07",
  billCount: "\u0e08\u0e33\u0e19\u0e27\u0e19\u0e18\u0e19\u0e1a\u0e31\u0e15\u0e23",
  coinCount: "\u0e08\u0e33\u0e19\u0e27\u0e19\u0e40\u0e2b\u0e23\u0e35\u0e22\u0e0d",
} as const;

const DENOMINATION_COLUMNS = [
  { value: 1000, type: "bill", column: "\u0e18\u0e19\u0e1a\u0e31\u0e15\u0e23 1000" },
  { value: 500, type: "bill", column: "\u0e18\u0e19\u0e1a\u0e31\u0e15\u0e23 500" },
  { value: 100, type: "bill", column: "\u0e18\u0e19\u0e1a\u0e31\u0e15\u0e23 100" },
  { value: 50, type: "bill", column: "\u0e18\u0e19\u0e1a\u0e31\u0e15\u0e23 50" },
  { value: 20, type: "bill", column: "\u0e18\u0e19\u0e1a\u0e31\u0e15\u0e23 20" },
  { value: 10, type: "coin", column: "\u0e40\u0e2b\u0e23\u0e35\u0e22\u0e0d 10" },
  { value: 5, type: "coin", column: "\u0e40\u0e2b\u0e23\u0e35\u0e22\u0e0d 5" },
  { value: 2, type: "coin", column: "\u0e40\u0e2b\u0e23\u0e35\u0e22\u0e0d 2" },
  { value: 1, type: "coin", column: "\u0e40\u0e2b\u0e23\u0e35\u0e22\u0e0d 1" },
] as const;

const HEADERS = [
  COLUMN.date,
  COLUMN.startingCash,
  COLUMN.cashSales,
  COLUMN.transferSales,
  COLUMN.expectedCash,
  COLUMN.actualCash,
  COLUMN.difference,
  COLUMN.billCount,
  COLUMN.coinCount,
  ...DENOMINATION_COLUMNS.map((item) => item.column),
];

function getTodayDateStr() {
  const now = new Date();
  const th = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const dd = String(th.getUTCDate()).padStart(2, "0");
  const mm = String(th.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = th.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function toNumber(value: unknown) {
  return Number(value) || 0;
}

function normalizeCounts(input: unknown) {
  const source =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};

  const counts: Record<number, number> = {};
  for (const item of DENOMINATION_COLUMNS) {
    counts[item.value] = toNumber(source[String(item.value)]);
  }
  return counts;
}

function buildCountsFromRow(row: { get: (key: string) => unknown }) {
  const counts: Record<number, number> = {};
  for (const item of DENOMINATION_COLUMNS) {
    counts[item.value] = toNumber(row.get(item.column));
  }
  return counts;
}

async function getCashCountSheet(doc: GoogleSpreadsheet) {
  let sheet = doc.sheetsByTitle["\u0e19\u0e31\u0e1a\u0e40\u0e07\u0e34\u0e19\u0e23\u0e32\u0e22\u0e27\u0e31\u0e19"];
  if (!sheet) {
    sheet = await doc.addSheet({
      title: "\u0e19\u0e31\u0e1a\u0e40\u0e07\u0e34\u0e19\u0e23\u0e32\u0e22\u0e27\u0e31\u0e19",
      headerValues: HEADERS,
    });
  }

  await sheet.loadHeaderRow();
  const missingHeaders = HEADERS.filter((header) => !sheet.headerValues.includes(header));
  if (missingHeaders.length > 0) {
    await sheet.setHeaderRow([...sheet.headerValues, ...missingHeaders]);
  }

  return sheet;
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
    const sheet = await getCashCountSheet(doc);
    const rows = await sheet.getRows();

    const row = rows.find((item) => item.get(COLUMN.date) === date);

    if (row) {
      return NextResponse.json({
        success: true,
        data: {
          date,
          starting_cash: toNumber(row.get(COLUMN.startingCash)),
          cash_sales: toNumber(row.get(COLUMN.cashSales)),
          transfer_sales: toNumber(row.get(COLUMN.transferSales)),
          expected_cash: toNumber(row.get(COLUMN.expectedCash)),
          actual_cash: toNumber(row.get(COLUMN.actualCash)),
          difference: toNumber(row.get(COLUMN.difference)),
          bill_count: toNumber(row.get(COLUMN.billCount)),
          coin_count: toNumber(row.get(COLUMN.coinCount)),
          counts: buildCountsFromRow(row),
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        date,
        starting_cash: 0,
        cash_sales: 0,
        transfer_sales: 0,
        expected_cash: 0,
        actual_cash: 0,
        difference: 0,
        bill_count: 0,
        coin_count: 0,
        counts: Object.fromEntries(DENOMINATION_COLUMNS.map((item) => [item.value, 0])),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      date,
      starting_cash,
      cash_sales,
      transfer_sales,
      expected_cash,
      actual_cash,
      difference,
      bill_count,
      coin_count,
      counts,
    } = body;

    if (!date) {
      return NextResponse.json({ success: false, error: "Missing date" }, { status: 400 });
    }

    const normalizedCounts = normalizeCounts(counts);

    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, serviceAccountAuth);
    await doc.loadInfo();
    const sheet = await getCashCountSheet(doc);
    const rows = await sheet.getRows();

    const existingRow = rows.find((item) => item.get(COLUMN.date) === date);

    const rowData: Record<string, number | string> = {
      [COLUMN.date]: date,
      [COLUMN.startingCash]: toNumber(starting_cash),
      [COLUMN.cashSales]: toNumber(cash_sales),
      [COLUMN.transferSales]: toNumber(transfer_sales),
      [COLUMN.expectedCash]: toNumber(expected_cash),
      [COLUMN.actualCash]: toNumber(actual_cash),
      [COLUMN.difference]: toNumber(difference),
      [COLUMN.billCount]: toNumber(bill_count),
      [COLUMN.coinCount]: toNumber(coin_count),
    };

    for (const item of DENOMINATION_COLUMNS) {
      rowData[item.column] = normalizedCounts[item.value] || 0;
    }

    if (existingRow) {
      Object.entries(rowData).forEach(([key, value]) => {
        existingRow.set(key, value);
      });
      await existingRow.save();
    } else {
      await sheet.addRow(rowData);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
