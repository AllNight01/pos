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

    // Get all sheet titles, filter those formatted as dd-mm-yyyy
    const dates = doc.sheetsByIndex
      .map((s) => s.title)
      .filter((title) => /^\d{2}-\d{2}-\d{4}$/.test(title))
      .sort((a, b) => {
        // Sort newest first: dd-mm-yyyy
        const [d1, m1, y1] = a.split("-").map(Number);
        const [d2, m2, y2] = b.split("-").map(Number);
        return new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime();
      });

    return NextResponse.json({ success: true, dates });
  } catch (error: any) {
    console.error("Available dates error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
