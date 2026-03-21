import { NextResponse } from "next/server";
import { getSpreadsheet, getTodayDateStr } from "../_lib/googleSheets";
import {
  buildSessionId,
  getAllSessions,
  getOpenSession,
  getSessionSheet,
  rowToSession,
  StockSessionRecord,
} from "../_lib/stockSession";

const STOCK_SESSION_CACHE_TTL_MS = 30 * 1000;

let stockSessionCache: {
  current: StockSessionRecord | null;
  sessions: StockSessionRecord[];
  expiresAt: number;
} | null = null;

function readSessionCache() {
  if (!stockSessionCache) return null;
  if (Date.now() > stockSessionCache.expiresAt) return null;
  return stockSessionCache;
}

function writeSessionCache(payload: {
  current: StockSessionRecord | null;
  sessions: StockSessionRecord[];
}) {
  stockSessionCache = {
    ...payload,
    expiresAt: Date.now() + STOCK_SESSION_CACHE_TTL_MS,
  };
}

function invalidateSessionCache() {
  stockSessionCache = null;
}

export async function GET() {
  const cached = readSessionCache();
  if (cached) {
    return NextResponse.json({
      success: true,
      current: cached.current,
      sessions: cached.sessions,
      cached: true,
    });
  }

  try {
    const doc = await getSpreadsheet();
    const sessions = await getAllSessions(doc);
    const current = sessions.find((session) => session.status === "open") || null;
    writeSessionCache({ current, sessions });

    return NextResponse.json({
      success: true,
      current,
      sessions,
      cached: false,
    });
  } catch (error: unknown) {
    if (stockSessionCache) {
      return NextResponse.json({
        success: true,
        current: stockSessionCache.current,
        sessions: stockSessionCache.sessions,
        cached: true,
        stale: true,
      });
    }

    const message =
      error instanceof Error ? error.message : "Unable to load stock sessions";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const label = (body.label || "").trim();

    if (!label) {
      return NextResponse.json(
        { success: false, error: "Missing session label" },
        { status: 400 },
      );
    }

    const doc = await getSpreadsheet();
    const existing = await getOpenSession(doc);
    if (existing) {
      return NextResponse.json(
        { success: false, error: "There is already an open stock session" },
        { status: 409 },
      );
    }

    const sheet = await getSessionSheet(doc);
    const session = {
      session_id: buildSessionId(),
      label,
      started_at: getTodayDateStr(),
      closed_at: "",
      status: "open",
    };

    await sheet.addRow(session);
    invalidateSessionCache();

    return NextResponse.json({
      success: true,
      session,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unable to create stock session";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const sessionId = body.session_id;
    const action = body.action;

    if (!sessionId || action !== "close") {
      return NextResponse.json(
        { success: false, error: "Invalid close request" },
        { status: 400 },
      );
    }

    const doc = await getSpreadsheet();
    const sheet = await getSessionSheet(doc);
    const rows = await sheet.getRows();
    const row = rows.find((item) => item.get("session_id") === sessionId);

    if (!row) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 },
      );
    }

    row.set("status", "closed");
    row.set("closed_at", getTodayDateStr());
    await row.save();
    invalidateSessionCache();

    return NextResponse.json({
      success: true,
      session: rowToSession(row),
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unable to close stock session";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
