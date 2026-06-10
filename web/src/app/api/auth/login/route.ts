import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/client";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const { email, password, rememberMe } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "이메일과 비밀번호를 입력해주세요." }, { status: 400 });
    }

    const rows = await query<{
      id: string; email: string; password_hash: string; role: string; status: string; name: string;
    }>(
      `SELECT id, email, password_hash, role, status, name FROM users WHERE LOWER(email) = $1`,
      [email.toLowerCase().trim()]
    );

    // 통일된 오류 메시지 (어느 쪽이 틀렸는지 알려주지 않음)
    const INVALID_MSG = "이메일 또는 비밀번호가 올바르지 않습니다.";

    if (rows.length === 0) {
      return NextResponse.json({ error: INVALID_MSG }, { status: 401 });
    }

    const user = rows[0];
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: INVALID_MSG }, { status: 401 });
    }

    if (user.status === "pending") {
      return NextResponse.json({ error: "관리자 승인 대기 중입니다." }, { status: 403 });
    }
    if (user.status === "withdrawn") {
      return NextResponse.json({ error: INVALID_MSG }, { status: 401 });
    }

    await createSession(user, !!rememberMe);

    return NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error("[login]", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
