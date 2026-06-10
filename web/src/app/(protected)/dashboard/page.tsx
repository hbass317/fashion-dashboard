"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!data.user) {
          router.replace("/login");
          return;
        }
        setUser(data.user);
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400 text-sm">불러오는 중...</div>
      </div>
    );
  }

  if (!user) return null;

  const ROLE_LABEL: Record<string, string> = {
    master: "마스터",
    admin: "관리자",
    editor: "에디터",
    viewer: "뷰어",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 헤더 */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center">
            <span className="text-white text-sm font-bold">F</span>
          </div>
          <span className="font-bold text-gray-900">패션 고객 대시보드</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {user.name}
            <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full font-medium">
              {ROLE_LABEL[user.role] ?? user.role}
            </span>
          </span>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">안녕하세요, {user.name}님 👋</h2>
          <p className="text-gray-500 mt-1">이랜드 리테일 패션 고객 지표 대시보드입니다.</p>
        </div>

        {/* 준비 중 안내 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">대시보드 구축 중</h3>
          <p className="text-gray-500 text-sm">
            인증 시스템 완료! 이제 고객 지표 대시보드 화면을 만들 예정입니다.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 max-w-sm mx-auto text-left">
            {[
              { label: "재구매율 고객지표", done: false },
              { label: "당월 누적 재구매율", done: false },
              { label: "금액대별 고객지표", done: false },
              { label: "구매횟수 고객지표", done: false },
              { label: "연령별 고객지표", done: false },
              { label: "아웃라이어 세그", done: false },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 text-sm text-gray-500"
              >
                <span>{item.done ? "✅" : "🔧"}</span>
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
