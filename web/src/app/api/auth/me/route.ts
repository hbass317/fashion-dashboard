import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { query } from "@/lib/db/client";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  const rows = await query<{ id: string; email: string; name: string; role: string; status: string }>(
    `SELECT id, email, name, role, status FROM users WHERE id = $1`,
    [session.sub]
  );

  if (rows.length === 0) {
    return NextResponse.json({ user: null }, { headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(
    { user: rows[0] },
    { headers: { "Cache-Control": "no-store" } }
  );
}
