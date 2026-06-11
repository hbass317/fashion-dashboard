"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const menus = [
  {
    group: "📊 고객 지표",
    items: [
      { label: "재구매율 고객지표", href: "/dashboard", badge: "준비중" },
      { label: "당월 누적 재구매율", href: "/dashboard/cumul" },
      { label: "금액대별 고객지표", href: "/dashboard", badge: "준비중" },
      { label: "구매횟수 고객지표", href: "/dashboard", badge: "준비중" },
      { label: "연령별 고객지표", href: "/dashboard", badge: "준비중" },
    ],
  },
  {
    group: "👥 세그먼트",
    items: [
      { label: "아웃라이어 세그", href: "/dashboard", badge: "준비중" },
      { label: "우량고객 매트릭스", href: "/dashboard", badge: "준비중" },
    ],
  },
  {
    group: "🏪 경쟁사 분석",
    items: [
      { label: "유니클로", href: "/dashboard/uniqlo" },
      { label: "탑텐 키즈", href: "/dashboard/topten" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-gray-100 min-h-screen px-3 py-6">
      <div className="flex items-center gap-2 px-2 mb-6">
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
          <span className="text-white text-xs font-bold">F</span>
        </div>
        <span className="font-bold text-sm text-gray-900">패션 고객 대시보드</span>
      </div>

      <nav className="space-y-5">
        {menus.map((group) => (
          <div key={group.group}>
            <p className="text-xs font-semibold text-gray-400 px-2 mb-1">{group.group}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href && !item.badge;
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-sm transition-colors ${
                        active
                          ? "bg-blue-50 text-blue-600 font-semibold"
                          : "text-gray-600 hover:bg-gray-50"
                      } ${item.badge ? "opacity-50 cursor-default pointer-events-none" : ""}`}
                    >
                      {item.label}
                      {item.badge && (
                        <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
