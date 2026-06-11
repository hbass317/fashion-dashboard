"use client";
import { useEffect, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
Chart.register(...registerables, ChartDataLabels);

/* ── 타입 ── */
interface PriceBand { p: number; t: number; }
interface Prod { n: string; v: number; a: number; tag: string; d: string; }
interface BdItem { p: number; r: number; n: number; nr: number; t: number; rv: number; prods: Prod[]; }
interface UniqloItem { g: string; c: string; t: number; avg: number; sv: number; bands: PriceBand[]; bd: BdItem[]; }

const GROUP_KO: Record<string, string> = { women: "여성", men: "남성", kids: "키즈" };
const GROUP_COLOR: Record<string, string> = { women: "bg-pink-100 text-pink-700", men: "bg-blue-100 text-blue-700", kids: "bg-green-100 text-green-700" };

function StarRating({ v }: { v: number }) {
  const pct = Math.round((v / 5) * 100);
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-yellow-400 text-xs">★</span>
      <span className="text-xs font-semibold text-gray-700">{v.toFixed(1)}</span>
    </span>
  );
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

/* ── 도넛 차트 ── */
function DonutChart({ labels, values, colors, title }: { labels: string[]; values: number[]; colors: string[]; title: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const chart = new Chart(ref.current, {
      type: "doughnut",
      data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 2, borderColor: "#fff" }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: "60%",
        plugins: {
          legend: { position: "bottom", labels: { font: { size: 11 }, boxWidth: 12 } },
          datalabels: {
            color: "#fff", font: { size: 11, weight: "bold" as const },
            formatter: (v: number) => { const t = values.reduce((a, b) => a + b, 0); return t > 0 ? (v / t * 100).toFixed(0) + "%" : ""; }
          },
          title: { display: true, text: title, font: { size: 13 }, color: "#374151" }
        }
      }
    });
    return () => chart.destroy();
  }, [labels, values, colors, title]);
  return <canvas ref={ref} />;
}

/* ── 가격대별 바 차트 ── */
function PriceBarChart({ bands }: { bands: { p: number; t: number }[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const labels = bands.map(b => `${(b.p / 10000).toFixed(1)}만`);
    const data = bands.map(b => b.t);
    const chart = new Chart(ref.current, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "상품수",
          data,
          backgroundColor: "#3b82f6",
          borderRadius: 4
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          datalabels: {
            anchor: "end", align: "top", color: "#6b7280", font: { size: 10 },
            formatter: (v: number) => v > 0 ? v : ""
          }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: "#f3f4f6" }, ticks: { font: { size: 10 } } },
          x: { grid: { display: false }, ticks: { font: { size: 10 } } }
        }
      }
    });
    return () => chart.destroy();
  }, [bands]);
  return <canvas ref={ref} />;
}

export default function UniqloPage() {
  const [data, setData] = useState<UniqloItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "category" | "products">("overview");
  const [genderFilter, setGenderFilter] = useState<"all" | "women" | "men" | "kids">("all");

  useEffect(() => {
    fetch("/data/uniqlo_data.json").then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">불러오는 중...</div>;

  /* ── 집계 ── */
  const filtered = genderFilter === "all" ? data : data.filter(d => d.g === genderFilter);

  const totalItems = data.reduce((s, d) => s + d.t, 0);
  const totalReviews = data.reduce((s, d) => s + d.sv, 0);
  const avgRating = data.reduce((s, d) => s + d.avg * d.t, 0) / totalItems;
  const totalGroups = data.length;

  // 성별 집계
  const genderGroups = ["women", "men", "kids"].map(g => {
    const items = data.filter(d => d.g === g);
    return { g, label: GROUP_KO[g], items: items.reduce((s, d) => s + d.t, 0), reviews: items.reduce((s, d) => s + d.sv, 0) };
  });

  // 전체 가격대 집계
  const bandMap = new Map<number, number>();
  data.forEach(item => item.bands.forEach(b => bandMap.set(b.p, (bandMap.get(b.p) ?? 0) + b.t)));
  const allBands = Array.from(bandMap.entries()).sort((a, b) => a[0] - b[0]).map(([p, t]) => ({ p, t }));

  // 카테고리 집계 (필터 적용)
  const catMap = new Map<string, { items: number; reviews: number; ratingSum: number; ratingCount: number }>();
  filtered.forEach(d => {
    const prev = catMap.get(d.c) ?? { items: 0, reviews: 0, ratingSum: 0, ratingCount: 0 };
    catMap.set(d.c, { items: prev.items + d.t, reviews: prev.reviews + d.sv, ratingSum: prev.ratingSum + d.avg * d.t, ratingCount: prev.ratingCount + d.t });
  });
  const categories = Array.from(catMap.entries())
    .map(([cat, v]) => ({ cat, items: v.items, reviews: v.reviews, rating: v.ratingSum / v.ratingCount }))
    .sort((a, b) => b.reviews - a.reviews);

  // 상위 상품 집계 (필터 적용)
  const prodMap = new Map<string, { name: string; v: number; rating: number; group: string; cat: string; price: number; tag: string }>();
  filtered.forEach(item => item.bd.forEach(bd => bd.prods.forEach(p => {
    const key = `${p.n}_${bd.p}`;
    const prev = prodMap.get(key);
    if (!prev || p.v > prev.v) {
      prodMap.set(key, { name: p.n, v: p.v, rating: p.a, group: item.g, cat: item.c, price: bd.p, tag: p.tag });
    }
  })));
  const topProds = Array.from(prodMap.values()).sort((a, b) => b.v - a.v).slice(0, 15);

  const TABS = [
    { id: "overview", label: "📊 전체 요약" },
    { id: "category", label: "📂 카테고리별" },
    { id: "products", label: "🏆 인기 상품" },
  ] as const;

  const GENDER_TABS = [
    { id: "all", label: "전체" },
    { id: "women", label: "여성" },
    { id: "men", label: "남성" },
    { id: "kids", label: "키즈" },
  ] as const;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">🏪 유니클로 경쟁사 분석</h1>
          <p className="text-sm text-gray-400 mt-0.5">유니클로 온라인스토어 상품 리뷰 데이터 분석</p>
        </div>
        <div className="flex gap-1">
          {GENDER_TABS.map(t => (
            <button key={t.id} onClick={() => setGenderFilter(t.id)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${genderFilter === t.id ? "bg-blue-600 text-white font-semibold" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="총 상품수" value={totalItems.toLocaleString()} sub={`${totalGroups}개 카테고리 그룹`} />
        <KpiCard label="총 리뷰수" value={totalReviews.toLocaleString()} sub="누적 리뷰" />
        <KpiCard label="평균 평점" value={avgRating.toFixed(2)} sub="5점 만점" />
        <KpiCard label="평균 리뷰/상품" value={Math.round(totalReviews / totalItems).toLocaleString()} sub="건/상품" />
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-gray-100">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors rounded-t-lg ${tab === t.id ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* 성별 카드 */}
          <div className="grid grid-cols-3 gap-4">
            {genderGroups.map(g => (
              <div key={g.g} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-gray-800">{g.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${GROUP_COLOR[g.g]}`}>{GROUP_KO[g.g]}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{g.items.toLocaleString()}<span className="text-sm font-normal text-gray-400 ml-1">개</span></p>
                <p className="text-xs text-gray-400 mt-1">리뷰 {g.reviews.toLocaleString()}건</p>
                <div className="mt-3 bg-gray-100 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${(g.items / totalItems * 100).toFixed(0)}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">{(g.items / totalItems * 100).toFixed(0)}% 비중</p>
              </div>
            ))}
          </div>

          {/* 차트 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">성별 상품 구성</h3>
              <div className="h-56">
                <DonutChart
                  labels={genderGroups.map(g => `${g.label} (${g.items})`)}
                  values={genderGroups.map(g => g.items)}
                  colors={["#ec4899", "#3b82f6", "#22c55e"]}
                  title=""
                />
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">가격대별 상품수 분포</h3>
              <div className="h-56">
                <PriceBarChart bands={allBands} />
              </div>
            </div>
          </div>

          {/* 성별 리뷰 도넛 */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">성별 리뷰수 비중</h3>
            <div className="grid grid-cols-3 gap-6">
              {genderGroups.map(g => (
                <div key={g.g} className="flex flex-col items-center">
                  <div className={`text-3xl font-bold mb-1 ${g.g === "women" ? "text-pink-500" : g.g === "men" ? "text-blue-500" : "text-green-500"}`}>
                    {(g.reviews / totalReviews * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-500">{g.label}</div>
                  <div className="text-xs text-gray-400">{g.reviews.toLocaleString()}건</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "category" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">카테고리</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">상품수</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">리뷰수</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">평점</th>
                <th className="px-4 py-3 font-semibold text-gray-600">리뷰 비중</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, i) => (
                <tr key={cat.cat} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                  <td className="px-4 py-3 font-medium text-gray-800">{cat.cat}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{cat.items.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{cat.reviews.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right"><StarRating v={cat.rating} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-blue-400" style={{ width: `${(cat.reviews / categories[0].reviews * 100).toFixed(0)}%` }} />
                      </div>
                      <span className="text-xs text-gray-400 w-10 text-right">{(cat.reviews / totalReviews * 100).toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "products" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 w-8">순위</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">상품명</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">카테고리</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">성별</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">가격</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">리뷰수</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">평점</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">재구매</th>
              </tr>
            </thead>
            <tbody>
              {topProds.map((p, i) => (
                <tr key={`${p.name}_${i}`} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                  <td className="px-4 py-3 font-bold text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.cat}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${GROUP_COLOR[p.group]}`}>{GROUP_KO[p.group]}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{p.price.toLocaleString()}원</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">{p.v.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right"><StarRating v={p.rating} /></td>
                  <td className="px-4 py-3 text-center">
                    {p.tag === "r" ? <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">재구매</span> : <span className="text-gray-300">-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
