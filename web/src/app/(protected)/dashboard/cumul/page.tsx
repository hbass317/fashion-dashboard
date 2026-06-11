"use client";
import { useState, useEffect, useRef } from "react";
import type { Chart as ChartType } from "chart.js";

// 숫자 포맷 유틸
function fmtMoney(v: number) { return Math.floor(v / 100000000) + "억"; }
function fmtCount(v: number) { return v != null ? v.toLocaleString("ko-KR") : "-"; }
function fmtPct(v: number) { return v != null ? v.toFixed(1) + "%" : "-"; }
function fmtPrice(v: number) { return v != null ? v.toLocaleString("ko-KR") + "원" : "-"; }

const CD_COLOR: Record<string, string> = {
  "여성": "#ec4899", "라이프": "#3b82f6", "아동": "#10b981", "기타/클로징": "#f59e0b",
};

type CumulRecord = {
  구분: string; cd그룹: string; 브랜드명: string | null;
  총구매자수: number; 일회구매자수: number; 이회이상구매자수: number;
  "이회이상구매자비중(%)": number; 전체매출: number; 회원매출: number;
  "회원매출비중(%)": number; 객단가: number; 일회구매자객단가: number;
  이회이상구매자객단가: number;
};

type CumulPeriod = {
  year: number; period: string; type: string;
  retail_buyer_growth?: number; retail_member_sales_growth?: number;
  records: CumulRecord[];
};

type CumulData = Record<string, CumulPeriod>;

export default function CumulPage() {
  const [data, setData] = useState<CumulData | null>(null);
  const [period, setPeriod] = useState("");
  const [tab, setTab] = useState<"전체" | "CD별" | "브랜드별">("전체");
  const donutBuyerRef = useRef<HTMLCanvasElement>(null);
  const donutSalesRef = useRef<HTMLCanvasElement>(null);
  const barCdRef = useRef<HTMLCanvasElement>(null);
  const chartInstances = useRef<Record<string, ChartType>>({});

  useEffect(() => {
    fetch("/data/cumul_data.json").then(r => r.json()).then((d: CumulData) => {
      setData(d);
      // 가장 최신 기간 선택
      const keys = Object.keys(d);
      setPeriod(keys[0]);
    });
  }, []);

  useEffect(() => {
    if (!data || !period || tab !== "전체") return;
    const pd = data[period];
    const overall = pd.records.find(r => r.구분 === "전체");
    if (!overall) return;

    // Chart.js 동적 import
    import("chart.js/auto").then(({ default: Chart }) => {
      import("chartjs-plugin-datalabels").then(({ default: ChartDataLabels }) => {
        Chart.register(ChartDataLabels);

        // 기존 차트 제거
        Object.values(chartInstances.current).forEach(c => c.destroy());
        chartInstances.current = {};

        // 구매자 구성 도넛
        if (donutBuyerRef.current) {
          chartInstances.current.buyer = new Chart(donutBuyerRef.current, {
            type: "doughnut",
            data: {
              labels: ["1회 구매자", "재구매자"],
              datasets: [{ data: [overall.일회구매자수, overall.이회이상구매자수], backgroundColor: ["#e5e7eb", "#3b82f6"], borderWidth: 0 }]
            },
            options: {
              plugins: { legend: { position: "bottom" }, datalabels: { color: "#fff", font: { weight: "bold" }, formatter: (v: number) => { const total = overall.총구매자수; return total > 0 ? (v / total * 100).toFixed(1) + "%" : ""; } } },
              cutout: "65%",
            }
          });
        }

        // 매출 구성 도넛
        if (donutSalesRef.current) {
          chartInstances.current.sales = new Chart(donutSalesRef.current, {
            type: "doughnut",
            data: {
              labels: ["1회 구매자 매출", "재구매자 매출"],
              datasets: [{ data: [overall["이회이상구매자비중(%)"] ? overall.전체매출 - overall.회원매출 : 0, overall.회원매출], backgroundColor: ["#e5e7eb", "#10b981"], borderWidth: 0 }]
            },
            options: { plugins: { legend: { position: "bottom" }, datalabels: { display: false } }, cutout: "65%" }
          });
        }

        // CD별 바 차트
        if (barCdRef.current) {
          const cdRecords = pd.records.filter(r => r.구분.startsWith("CD그룹_"));
          chartInstances.current.cd = new Chart(barCdRef.current, {
            type: "bar",
            data: {
              labels: cdRecords.map(r => r.cd그룹),
              datasets: [{
                label: "재구매율(%)",
                data: cdRecords.map(r => r["이회이상구매자비중(%)"]),
                backgroundColor: cdRecords.map(r => CD_COLOR[r.cd그룹] || "#94a3b8"),
                borderRadius: 4,
              }]
            },
            options: {
              plugins: { legend: { display: false }, datalabels: { anchor: "end", align: "top", font: { weight: "bold", size: 11 }, formatter: (v: number) => v.toFixed(1) + "%" } },
              scales: { y: { beginAtZero: true, max: 50 } }
            }
          });
        }
      });
    });

    return () => { Object.values(chartInstances.current).forEach(c => c.destroy()); chartInstances.current = {}; };
  }, [data, period, tab]);

  if (!data || !period) return <div className="flex items-center justify-center h-64 text-gray-400">데이터 로딩 중...</div>;

  const pd = data[period];
  const overall = pd.records.find(r => r.구분 === "전체");
  const cdRecords = pd.records.filter(r => r.구분.startsWith("CD그룹_"));
  const brandRecords = pd.records.filter(r => r.브랜드명);
  const periods = Object.keys(data);

  // 비교 기간 (전년 동기)
  const compareKey = periods.find(k => k !== period && data[k].period === pd.period);
  const compareOverall = compareKey ? data[compareKey].records.find(r => r.구분 === "전체") : null;

  function delta(curr: number, prev: number | undefined, higherBetter = true) {
    if (!prev) return null;
    const diff = curr - prev;
    const pct = (diff / Math.abs(prev) * 100).toFixed(1);
    const positive = diff > 0;
    const good = higherBetter ? positive : !positive;
    return (
      <span className={`text-xs ml-1 ${good ? "text-emerald-500" : "text-red-500"}`}>
        {positive ? "▲" : "▼"}{Math.abs(Number(pct))}%
      </span>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">당월 누적 재구매율</h1>
        <select
          value={period}
          onChange={e => setPeriod(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
        >
          {periods.map(k => <option key={k} value={k}>{data[k].year}년 {data[k].period}</option>)}
        </select>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(["전체", "CD별", "브랜드별"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── 전체 탭 ── */}
      {tab === "전체" && overall && (
        <div className="space-y-4">
          {/* 리테일 증감율 배너 */}
          {(pd.retail_buyer_growth !== undefined || pd.retail_member_sales_growth !== undefined) && (
            <div className="bg-blue-50 rounded-xl px-4 py-3 flex gap-6 text-sm">
              {pd.retail_buyer_growth !== undefined && (
                <span>리테일 전점 고객수 증감율: <strong className={pd.retail_buyer_growth >= 0 ? "text-emerald-600" : "text-red-500"}>{pd.retail_buyer_growth >= 0 ? "+" : ""}{pd.retail_buyer_growth}%</strong></span>
              )}
              {pd.retail_member_sales_growth !== undefined && (
                <span>리테일 전점 회원매출 증감율: <strong className={pd.retail_member_sales_growth >= 0 ? "text-emerald-600" : "text-red-500"}>{pd.retail_member_sales_growth >= 0 ? "+" : ""}{pd.retail_member_sales_growth}%</strong></span>
              )}
            </div>
          )}

          {/* KPI 카드 */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "총 구매자수", value: fmtCount(overall.총구매자수), prev: compareOverall?.총구매자수 },
              { label: "재구매자수", value: fmtCount(overall.이회이상구매자수), prev: compareOverall?.이회이상구매자수 },
              { label: "재구매율", value: fmtPct(overall["이회이상구매자비중(%)"]), prev: compareOverall?.["이회이상구매자비중(%)"], isPct: true },
              { label: "전체매출", value: fmtMoney(overall.전체매출), prev: compareOverall?.전체매출 },
              { label: "회원매출", value: fmtMoney(overall.회원매출), prev: compareOverall?.회원매출, sub: fmtPct(overall["회원매출비중(%)"]) },
              { label: "객단가", value: fmtPrice(overall.객단가), prev: compareOverall?.객단가 },
              { label: "1회 구매자 객단가", value: fmtPrice(overall.일회구매자객단가), prev: compareOverall?.일회구매자객단가 },
              { label: "재구매자 객단가", value: fmtPrice(overall.이회이상구매자객단가), prev: compareOverall?.이회이상구매자객단가 },
            ].map(kpi => (
              <div key={kpi.label} className="bg-white rounded-2xl border border-gray-100 p-4">
                <p className="text-xs text-gray-500 mb-1">{kpi.label}</p>
                <p className="text-xl font-bold text-gray-900">
                  {kpi.value}
                  {kpi.prev !== undefined && delta(parseFloat(kpi.value), kpi.prev)}
                </p>
                {kpi.sub && <p className="text-xs text-gray-400 mt-0.5">{kpi.sub}</p>}
                {compareOverall && (
                  <p className="text-xs text-gray-400 mt-1">전년: {kpi.label === "재구매율" ? fmtPct(kpi.prev as number) : kpi.label.includes("매출") && !kpi.label.includes("비중") ? fmtMoney(kpi.prev as number) : kpi.label.includes("객단가") ? fmtPrice(kpi.prev as number) : fmtCount(kpi.prev as number)}</p>
                )}
              </div>
            ))}
          </div>

          {/* 차트 영역 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">구매자 구성</p>
              <canvas ref={donutBuyerRef} height={180} />
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">매출 구성</p>
              <canvas ref={donutSalesRef} height={180} />
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">CD별 재구매율</p>
              <canvas ref={barCdRef} height={180} />
            </div>
          </div>
        </div>
      )}

      {/* ── CD별 탭 ── */}
      {tab === "CD별" && (
        <div className="grid grid-cols-2 gap-4">
          {cdRecords.map(cd => (
            <div key={cd.cd그룹} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full" style={{ background: CD_COLOR[cd.cd그룹] || "#94a3b8" }} />
                <h3 className="font-semibold text-gray-900">{cd.cd그룹}</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "총 구매자수", value: fmtCount(cd.총구매자수) },
                  { label: "재구매율", value: fmtPct(cd["이회이상구매자비중(%)"]) },
                  { label: "전체매출", value: fmtMoney(cd.전체매출) },
                  { label: "객단가", value: fmtPrice(cd.객단가) },
                ].map(item => (
                  <div key={item.label}>
                    <p className="text-xs text-gray-400">{item.label}</p>
                    <p className="font-bold text-gray-900">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 브랜드별 탭 ── */}
      {tab === "브랜드별" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs">
                <th className="px-4 py-3 text-left font-medium">브랜드</th>
                <th className="px-4 py-3 text-left font-medium">CD</th>
                <th className="px-3 py-3 text-right font-medium">총구매자</th>
                <th className="px-3 py-3 text-right font-medium">재구매자</th>
                <th className="px-3 py-3 text-right font-medium">재구매율</th>
                <th className="px-3 py-3 text-right font-medium">전체매출</th>
                <th className="px-3 py-3 text-right font-medium">객단가</th>
              </tr>
            </thead>
            <tbody>
              {brandRecords
                .sort((a, b) => b["이회이상구매자비중(%)"] - a["이회이상구매자비중(%)"])
                .map((r, i) => (
                  <tr key={r.브랜드명} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{r.브랜드명}</td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ background: CD_COLOR[r.cd그룹] || "#94a3b8" }}>
                        {r.cd그룹}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-700">{fmtCount(r.총구매자수)}</td>
                    <td className="px-3 py-2.5 text-right text-gray-700">{fmtCount(r.이회이상구매자수)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold" style={{ color: CD_COLOR[r.cd그룹] || "#374151" }}>
                      {fmtPct(r["이회이상구매자비중(%)"])}
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-700">{fmtMoney(r.전체매출)}</td>
                    <td className="px-3 py-2.5 text-right text-gray-700">{fmtPrice(r.객단가)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
