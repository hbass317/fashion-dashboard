export type Role = "viewer" | "editor" | "admin" | "master";

const ROLE_RANK: Record<Role, number> = {
  viewer: 0,
  editor: 1,
  admin: 2,
  master: 3,
};

// role이 minRole 이상인지 확인
export function hasRole(role: string, minRole: Role): boolean {
  return (ROLE_RANK[role as Role] ?? -1) >= ROLE_RANK[minRole];
}

// 마스터 이메일 여부 확인
export function isMasterEmail(email: string): boolean {
  const masters = (process.env.MASTER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase());
  return masters.includes(email.toLowerCase());
}
