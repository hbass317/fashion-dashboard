import { NextRequest, NextResponse } from "next/server";
import { verifyJwt } from "@/lib/auth/jwt";
import { validatePassword, hashPassword } from "@/lib/auth/password";
import { query } from "@/lib/db/client";

export async function POST(req: NextRequest) {
  try {
    const { resetToken, password } = await req.json();
    if (!resetToken || !password) {
      return NextResponse.json({ error: "모든 항목을 입력해주세요." }, { status: 400 });
    }

    const payload = await verifyJwt(resetToken);
    if (!payload || payload.purpose !== "reset") {
      return NextResponse.json({ error: "인증이 만료되었습니다. 처음부터 다시 시도해주세요." }, { status: 400 });
    }

    const pwError = validatePassword(password);
    if (pwError) return NextResponse.json({ error: pwError }, { status: 400 });

    const passwordHash = await hashPassword(password);
    await query(
      `UPDATE users SET password_hash = $1, updated_at = now() WHERE LOWER(email) = $2`,
      [passwordHash, payload.email]
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[reset-password]", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
