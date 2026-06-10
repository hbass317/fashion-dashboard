import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/client";

// 이메일이 이미 가입됐는지 확인 (사내 전용 도메인 제한 환경이라 enumeration 위험 낮음)
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ exists: false });

    const normalizedEmail = email.toLowerCase().trim();

    // 도메인 제한
    const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN;
    if (allowedDomain && !normalizedEmail.endsWith(`@${allowedDomain}`)) {
      return NextResponse.json(
        { error: `@${allowedDomain} 이메일만 사용할 수 있습니다.` },
        { status: 400 }
      );
    }

    const rows = await query(
      `SELECT status FROM users WHERE LOWER(email) = $1`,
      [normalizedEmail]
    );

    if (rows.length === 0) {
      return NextResponse.json({ exists: false });
    }

    const user = rows[0] as { status: string };
    return NextResponse.json({ exists: true, status: user.status });
  } catch (err) {
    console.error("[check-email]", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
