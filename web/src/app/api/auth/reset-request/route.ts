import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/client";
import { createOtp } from "@/lib/auth/otp";
import { sendResetOtp } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ ok: true }); // enumeration 방지

    const normalizedEmail = email.toLowerCase().trim();
    const rows = await query(`SELECT id FROM users WHERE LOWER(email) = $1`, [normalizedEmail]);

    // 가입된 이메일에만 발송 (응답은 동일하게 200)
    if (rows.length > 0) {
      const ip = req.headers.get("x-forwarded-for") ?? "unknown";
      const code = await createOtp(normalizedEmail, "reset", ip);
      await sendResetOtp(normalizedEmail, code);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[reset-request]", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
