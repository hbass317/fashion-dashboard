import { NextRequest, NextResponse } from "next/server";
import { verifyOtp } from "@/lib/auth/otp";
import { signJwt } from "@/lib/auth/jwt";

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();
    if (!email || !code) {
      return NextResponse.json({ error: "이메일과 인증 코드를 입력해주세요." }, { status: 400 });
    }

    const result = await verifyOtp(email.toLowerCase().trim(), code.trim(), "reset");
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const resetToken = await signJwt(
      { sub: "reset", email: email.toLowerCase().trim(), role: "viewer", purpose: "reset" },
      "15m"
    );

    return NextResponse.json({ ok: true, resetToken });
  } catch (err) {
    console.error("[reset-verify]", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
