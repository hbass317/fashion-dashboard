import bcrypt from "bcryptjs";

// 비밀번호 정책: 8~16자, 영문/숫자/특수문자 각 1개 이상
export function validatePassword(pw: string): string | null {
  if (pw.length < 8 || pw.length > 16) return "비밀번호는 8~16자여야 합니다.";
  if (!/[a-zA-Z]/.test(pw)) return "영문자를 1개 이상 포함해야 합니다.";
  if (!/[0-9]/.test(pw)) return "숫자를 1개 이상 포함해야 합니다.";
  if (!/[^a-zA-Z0-9]/.test(pw)) return "특수문자를 1개 이상 포함해야 합니다.";
  return null;
}

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 12);
}

export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}
