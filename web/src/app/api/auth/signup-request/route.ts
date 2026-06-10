import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/client";
import { createOtp } from "@/lib/auth/otp";
import { sendSignupOtp } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "이메일을 입력해주세요." }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 도메인 제한
    const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN;
    if (allowedDomain && !normalizedEmail.endsWith(`@${allowedDomain}`)) {
      return NextResponse.json(
        { error: `@${allowedDomain} 이메일만 가입할 수 있습니다.` },
        { status: 400 }
      );
    }

    // 이미 가입된 이메일이어도 200 반환 (enumeration 방지)
    const existing = await query(
      `SELECT id FROM users WHERE LOWER(email) = $1`,
      [normalizedEmail]
    );
    if (existing.length > 0) {
      return NextResponse.json({ ok: true }); // 메일 발송 안 함
    }

    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    const code = await createOtp(normalizedEmail, "signup", ip);
    await sendSignupOtp(normalizedEmail, code);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[signup-request]", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
