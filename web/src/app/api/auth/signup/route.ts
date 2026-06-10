import { NextRequest, NextResponse } from "next/server";
import { verifyJwt } from "@/lib/auth/jwt";
import { validatePassword, hashPassword } from "@/lib/auth/password";
import { query } from "@/lib/db/client";
import { isMasterEmail } from "@/lib/auth/rbac";
import { createSession } from "@/lib/auth/session";
import { sendPendingNotice, sendApprovalRequest } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { signupToken, name, password } = await req.json();
    if (!signupToken || !name || !password) {
      return NextResponse.json({ error: "모든 항목을 입력해주세요." }, { status: 400 });
    }

    // signupToken 검증
    const payload = await verifyJwt(signupToken);
    if (!payload || payload.purpose !== "signup") {
      return NextResponse.json({ error: "인증이 만료되었습니다. 처음부터 다시 시도해주세요." }, { status: 400 });
    }
    const email = payload.email;

    // 이메일 중복 확인
    const existing = await query(`SELECT id FROM users WHERE LOWER(email) = $1`, [email]);
    if (existing.length > 0) {
      return NextResponse.json({ error: "이미 가입된 이메일입니다." }, { status: 400 });
    }

    // 비밀번호 정책 검사
    const pwError = validatePassword(password);
    if (pwError) return NextResponse.json({ error: pwError }, { status: 400 });

    const passwordHash = await hashPassword(password);

    // 마스터 이메일이면 바로 active+master, 아니면 pending+viewer
    const isMaster = isMasterEmail(email);
    const role = isMaster ? "master" : "viewer";
    const status = isMaster ? "active" : "pending";

    const rows = await query<{ id: string; email: string; role: string }>(
      `INSERT INTO users (email, password_hash, name, role, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, role`,
      [email, passwordHash, name.trim(), role, status]
    );
    const user = rows[0];

    if (isMaster) {
      // 마스터는 바로 세션 발급
      await createSession(user);
      return NextResponse.json({ ok: true, status: "active" });
    } else {
      // 일반 가입자: 승인 대기 안내 메일 + 관리자에게 알림
      const masters = (process.env.MASTER_ADMIN_EMAILS ?? "").split(",").map((e) => e.trim());
      await Promise.allSettled([
        sendPendingNotice(email, name.trim()),
        ...masters.map((adminEmail) => sendApprovalRequest(adminEmail, name.trim(), email)),
      ]);
      return NextResponse.json({ ok: true, status: "pending" });
    }
  } catch (err) {
    console.error("[signup]", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
