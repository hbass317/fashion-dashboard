import { NextResponse } from "next/server";
import { query } from "@/lib/db/client";

export async function GET() {
  try {
    await query("SELECT 1");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[health] DB 연결 실패:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
