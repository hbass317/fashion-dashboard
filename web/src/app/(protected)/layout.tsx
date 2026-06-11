"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";

interface User { id: string; email: string; name: string; role: string; }

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then(r => r.json())
      .then(data => {
        if (!data.user) { router.replace("/login"); return; }
        setUser(data.user);
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-400 text-sm">불러오는 중...</div>
    </div>
  );
  if (!user) return null;

  const ROLE_LABEL: Record<string, string> = { master: "마스터", admin: "관리자", editor: "에디터", viewer: "뷰어" };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* 상단 헤더 */}
        <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-end gap-4 shrink-0">
          <span className="text-sm text-gray-500">
            {user.name}
            <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full font-medium">
              {ROLE_LABEL[user.role] ?? user.role}
            </span>
          </span>
          <button
            onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); router.replace("/login"); }}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            로그아웃
          </button>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
