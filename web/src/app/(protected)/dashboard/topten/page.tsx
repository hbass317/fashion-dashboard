"use client";
import { useEffect, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
Chart.register(...registerables, ChartDataLabels);

/* ── 타입 ── */
interface PriceBand { p: number; t: number; rv: number; }
interface Prod { n: string; sale: number; reg: number; disc: number; rv: number; rat: number | null; cat2: string; }
interface Category {
  cat2: string; cat3: string; cnt: number;
  reg_range: [number, number]; sale_range: [number, number];
  avg_disc: number; avg_rat: number; avg_rv: number;
  reg_bands: PriceBand[]; sale_bands: PriceBand[];
  prods?: Prod[];
}
interface SummaryCat { cat: string; cnt: number; avg_disc: number; avg_rat: number; avg_rv: number; ss25_pct: number; ss26_pct: number; }
interface Summary { total: number; gender: { 여아: number; 남아: number; 공용: number }; cats: SummaryCat[]; }
interface ToptenItem { cat3: string; cnt: number; reg_range: [number, number]; sale_range: [number, number]; avg_disc: number; avg_rat: number; avg_rv: number; reg_bands: PriceBand[]; sale_bands: PriceBand[]; prods: Prod[]; }
interface ToptenData { summary: Summary; categories: Category[]; items: ToptenItem[]; }

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ?? "text-gray-900"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function StarRating({ v }: { v: number | null }) {
  if (!v) return <span className="text-gray-300 text-xs">-</span>;
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-yellow-400 text-xs">★</span>
      <span className="text-xs font-semibold text-gray-700">{v.toFixed(1)}</span>
    </span>
  );
}

function HorizontalBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ── 바 차트 (가격대별) ── */
function PriceBandChart({ regBands, saleBands }: { regBands: PriceBand[]; saleBands: PriceBand[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    // Merge all price points
    const allPrices = Array.from(new Set([...regBands.map(b => b.p), ...saleBands.map(b => b.p)])).sort((a, b) => a - b);
    const regMap = new Map(regBands.map(b => [b.p, b.t]));
    const saleMap = new Map(saleBands.map(b => [b.p, b.t]));
    const chart = new Chart(ref.current, {
      type: "bar",
      data: {
        labels: allPrices.map(p => `${(p / 10000).toFixed(1)}만`),
        datasets: [
          { label: "정가", data: allPrices.map(p => regMap.get(p) ?? 0), backgroundColor: "#93c5fd", borderRadius: 3 },
          { label: "판매가", data: allPrices.map(p => saleMap.get(p) ?? 0), backgroundColor: "#3b82f6", borderRadius: 3 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: "top", labels: { font: { size: 11 }, boxWidth: 10 } },
          datalabels: { display: false }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: "#f3f4f6" }, ticks: { font: { size: 10 } } },
          x: { grid: { display: false }, ticks: { font: { size: 10 } } }
        }
      }
    });
    return () => chart.destroy();
  }, [regBands, saleBands]);
  return <canvas ref={ref} />;
}

/* ── 도넛 ── */
function DonutChart({ labels, values, colors }: { labels: string[]; values: number[]; colors: string[] }) {
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
          }
        }
      }
    });
    return () => chart.destroy();
  }, [labels, values, colors]);
  return <canvas ref={ref} />;
}

export default function ToptenPage() {
  const [data, setData] = useState<ToptenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "category" | "products">("overview");
  const [sortCol, setSortCol] = useState<"cnt" | "avg_disc" | "avg_rat" | "avg_rv">("avg_rv");

  useEffect(() => {
    fetch("/data/topten_data.json").then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading || !data) return <div className="flex items-center justify-center h-64 text-gray-400">불러오는 중...</div>;

  const { summary, items } = data;
  const total = summary.total;
  const gender = summary.gender;
  const genderTotal = gender["여아"] + gender["남아"] + gender["공용"];

  // 전체 집계
  const avgDisc = summary.cats.reduce((s, c) => s + c.avg_disc * c.cnt, 0) / total;
  const avgRat = summary.cats.filter(c => c.avg_rat > 0).reduce((s, c) => s + c.avg_rat * c.cnt, 0) /
    summary.cats.filter(c => c.avg_rat > 0).reduce((s, c) => s + c.cnt, 0);
  const avgRv = summary.cats.reduce((s, c) => s + c.avg_rv * c.cnt, 0) / total;

  // 카테고리 정렬
  const sortedCats = [...summary.cats].sort((a, b) => b[sortCol] - a[sortCol]);

  // 모든 상품 집계
  const allProds: (Prod & { cat3: string })[] = [];
  items.forEach(item => (item.prods ?? []).forEach(p => allProds.push({ ...p, cat3: item.cat3 })));
  const dedupedProds = Array.from(
    allProds.reduce((m, p) => {
      const key = `${p.n}_${p.sale}`;
      if (!m.has(key) || (p.rv ?? 0) > (m.get(key)!.rv ?? 0)) m.set(key, p);
      return m;
    }, new Map<string, Prod & { cat3: string }>()).values()
  ).sort((a, b) => (b.rv ?? 0) - (a.rv ?? 0)).slice(0, 20);

  // 전체 가격대 집계
  const regBandMap = new Map<number, number>();
  const saleBandMap = new Map<number, number>();
  items.forEach(item => {
    (item.reg_bands ?? []).forEach(b => regBandMap.set(b.p, (regBandMap.get(b.p) ?? 0) + b.t));
    (item.sale_bands ?? []).forEach(b => saleBandMap.set(b.p, (saleBandMap.get(b.p) ?? 0) + b.t));
  });
  const regBands = Array.from(regBandMap.entries()).sort((a, b) => a[0] - b[0]).map(([p, t]) => ({ p, t, rv: 0 }));
  const saleBands = Array.from(saleBandMap.entries()).sort((a, b) => a[0] - b[0]).map(([p, t]) => ({ p, t, rv: 0 }));

  const TABS = [
    { id: "overview", label: "📊 전체 요약" },
    { id: "category", label: "📂 카테고리별" },
    { id: "products", label: "🏆 인기 상품" },
  ] as const;

  const SORT_COLS: { id: typeof sortCol; label: string }[] = [
    { id: "cnt", label: "상품수" },
    { id: "avg_disc", label: "평균 할인율" },
    { id: "avg_rat", label: "평점" },
    { id: "avg_rv", label: "평균 리뷰" },
  ];

  const CAT_COLOR: Record<string, string> = {
    "콜라보": "bg-purple-100 text-purple-700",
    "남아": "bg-blue-100 text-blue-700",
    "여아": "bg-pink-100 text-pink-700",
    "쿨에어 코튼": "bg-cyan-100 text-cyan-700",
    "가격인하": "bg-red-100 text-red-700",
  };
  const defaultColor = "bg-gray-100 text-gray-600";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 헤더 */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">🏪 탑텐 키즈 경쟁사 분석</h1>
        <p className="text-sm text-gray-400 mt-0.5">탑텐 키즈 온라인스토어 상품 데이터 분석</p>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="총 상품수" value={total.toLocaleString()} sub="분석 대상 SKU" />
        <KpiCard label="평균 할인율" value={`${avgDisc.toFixed(1)}%`} sub="정가 대비" accent="text-red-600" />
        <KpiCard label="평균 평점" value={avgRat.toFixed(2)} sub="5점 만점" accent="text-yellow-600" />
        <KpiCard label="평균 리뷰수" value={avgRv.toFixed(1)} sub="건/상품" />
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

      {tab === "overview" && (
        <div className="space-y-6">
          {/* 성별 카드 */}
          <div className="grid grid-cols-3 gap-4">
            {(["여아", "남아", "공용"] as const).map(g => (
              <div key={g} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-gray-800">{g}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${g === "여아" ? "bg-pink-100 text-pink-700" : g === "남아" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>{g}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{gender[g].toLocaleString()}<span className="text-sm font-normal text-gray-400 ml-1">개</span></p>
                <div className="mt-3 bg-gray-100 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full ${g === "여아" ? "bg-pink-400" : g === "남아" ? "bg-blue-500" : "bg-green-500"}`} style={{ width: `${(gender[g] / genderTotal * 100).toFixed(0)}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">{(gender[g] / total * 100).toFixed(1)}% 비중</p>
              </div>
            ))}
          </div>

          {/* 차트 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">성별 상품 구성</h3>
              <div className="h-56">
                <DonutChart
                  labels={["여아", "남아", "공용"]}
                  values={[gender["여아"], gender["남아"], gender["공용"]]}
                  colors={["#f472b6", "#60a5fa", "#4ade80"]}
                />
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">가격대별 상품수 (정가 vs 판매가)</h3>
              <div className="h-56">
                <PriceBandChart regBands={regBands} saleBands={saleBands} />
              </div>
            </div>
          </div>

          {/* 카테고리 TOP 5 */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">카테고리별 할인율 & 리뷰 현황 (Top 5)</h3>
            <div className="space-y-3">
              {summary.cats.sort((a, b) => b.cnt - a.cnt).slice(0, 5).map(cat => (
                <div key={cat.cat} className="flex items-center gap-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-24 text-center ${CAT_COLOR[cat.cat] ?? defaultColor}`}>{cat.cat}</span>
                  <span className="text-sm text-gray-500 w-12 text-right">{cat.cnt}개</span>
                  <div className="flex-1">
                    <HorizontalBar value={cat.cnt} max={summary.cats[0].cnt} color="bg-blue-400" />
                  </div>
                  <span className="text-sm text-red-500 font-semibold w-14 text-right">-{cat.avg_disc.toFixed(0)}%</span>
                  <span className="text-xs text-gray-400 w-16 text-right">리뷰 {cat.avg_rv.toFixed(1)}건</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "category" && (
        <div className="space-y-4">
          {/* 정렬 버튼 */}
          <div className="flex gap-2 items-center">
            <span className="text-xs text-gray-400">정렬:</span>
            {SORT_COLS.map(c => (
              <button key={c.id} onClick={() => setSortCol(c.id)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${sortCol === c.id ? "bg-blue-600 text-white font-semibold" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                {c.label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">카테고리</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">상품수</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">평균 할인율</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">평점</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">평균 리뷰</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">SS26 비중</th>
                </tr>
              </thead>
              <tbody>
                {sortedCats.map((cat, i) => (
                  <tr key={cat.cat} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CAT_COLOR[cat.cat] ?? defaultColor}`}>{cat.cat}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">{cat.cnt}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={cat.avg_disc > 40 ? "text-red-600 font-semibold" : cat.avg_disc > 20 ? "text-orange-500" : "text-gray-600"}>
                        -{cat.avg_disc.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right"><StarRating v={cat.avg_rat} /></td>
                    <td className="px-4 py-3 text-right text-gray-600">{cat.avg_rv.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{cat.ss26_pct > 0 ? `${cat.ss26_pct}%` : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "products" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 w-8">순위</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">상품명</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">분류</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">정가</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">판매가</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">할인율</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">리뷰수</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">평점</th>
              </tr>
            </thead>
            <tbody>
              {dedupedProds.map((p, i) => (
                <tr key={`${p.n}_${i}`} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                  <td className="px-4 py-3 font-bold text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{p.n}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CAT_COLOR[p.cat2] ?? defaultColor}`}>{p.cat2}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400">{p.reg.toLocaleString()}원</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">{p.sale.toLocaleString()}원</td>
                  <td className="px-4 py-3 text-right">
                    {p.disc > 0
                      ? <span className={p.disc >= 50 ? "text-red-600 font-bold" : "text-orange-500"}>-{p.disc}%</span>
                      : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">{(p.rv ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right"><StarRating v={p.rat} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
