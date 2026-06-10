import crypto from "crypto";
import { query } from "@/lib/db/client";

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

// 6자리 랜덤 숫자 코드 생성 + DB 저장
export async function createOtp(email: string, purpose: "signup" | "reset", ip?: string): Promise<string> {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10분

  await query(
    `INSERT INTO email_verifications (email, code_hash, purpose, expires_at, ip)
     VALUES ($1, $2, $3, $4, $5)`,
    [email.toLowerCase(), codeHash, purpose, expiresAt, ip ?? null]
  );

  return code;
}

// OTP 검증 (성공 시 consumed=true 처리)
export async function verifyOtp(
  email: string,
  code: string,
  purpose: "signup" | "reset"
): Promise<{ ok: boolean; error?: string }> {
  const rows = await query<{
    id: string; code_hash: string; expires_at: Date; consumed: boolean; attempts: number;
  }>(
    `SELECT id, code_hash, expires_at, consumed, attempts
     FROM email_verifications
     WHERE email = $1 AND purpose = $2 AND consumed = false
     ORDER BY created_at DESC LIMIT 1`,
    [email.toLowerCase(), purpose]
  );

  if (rows.length === 0) return { ok: false, error: "유효한 인증 코드가 없습니다." };

  const row = rows[0];

  // 시도 횟수 초과
  if (row.attempts >= 5) {
    await query(`UPDATE email_verifications SET consumed = true WHERE id = $1`, [row.id]);
    return { ok: false, error: "인증 시도 횟수를 초과했습니다. 코드를 다시 요청하세요." };
  }

  // 만료 체크
  if (new Date() > new Date(row.expires_at)) {
    await query(`UPDATE email_verifications SET consumed = true WHERE id = $1`, [row.id]);
    return { ok: false, error: "인증 코드가 만료되었습니다." };
  }

  // 코드 불일치
  if (hashCode(code) !== row.code_hash) {
    await query(`UPDATE email_verifications SET attempts = attempts + 1 WHERE id = $1`, [row.id]);
    return { ok: false, error: "인증 코드가 올바르지 않습니다." };
  }

  // 성공 → consumed 처리
  await query(`UPDATE email_verifications SET consumed = true WHERE id = $1`, [row.id]);
  return { ok: true };
}
