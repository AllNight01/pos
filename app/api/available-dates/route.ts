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

    // Get all sheet titles that match dd-MM-yyyy format
    const datePattern = /^\d{2}-\d{2}-\d{4}$/;
    const dates: string[] = [];

    for (const sheet of doc.sheetsByIndex) {
      if (datePattern.test(sheet.title)) {
        dates.push(sheet.title);
      }
    }

    // Sort dates newest first (parse dd-MM-yyyy for proper sorting)
    dates.sort((a, b) => {
      const [da, ma, ya] = a.split("-").map(Number);
      const [db, mb, yb] = b.split("-").map(Number);
      const dateA = new Date(ya, ma - 1, da);
      const dateB = new Date(yb, mb - 1, db);
      return dateB.getTime() - dateA.getTime();
    });

    return NextResponse.json({ success: true, dates });
  } catch (error: any) {
    console.error("Available dates error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
