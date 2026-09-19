import React, { useMemo, useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import Topbar from "../components/Topbar";
import { useThemeTokens } from "../lib/ThemeContext";
import { computeReport, reportToCsv } from "../lib/reports";
import { generateReportPdf } from "../lib/generateReportPdf";
import { downloadCsv } from "../lib/csv";
import { money } from "../lib/currency";
import { useSettings } from "../lib/SettingsContext";

const FILTERS = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "month", label: "This month" },
];

export default function ReportsPage() {
  const t = useThemeTokens();
  const { settings } = useSettings();
  const [filter, setFilter] = useState("30d");
  const report = useMemo(() => computeReport(filter), [filter]);

  function handleDownload() {
    generateReportPdf(report, filter);
  }

  function handleDownloadCsv() {
    downloadCsv(`techdesk-report-${filter}-${new Date().toISOString().slice(0, 10)}.csv`, reportToCsv(report));
  }

  const statCards = [
    { label: `Revenue (${FILTERS.find((f) => f.key === filter)?.label})`, value: `${money(report.revenue, settings)}`, sub: `Sales ${money(report.revenue, settings)} \u00b7 Repairs ${money(report.repairRevenue, settings)}` },
    { label: "Profit", value: `${money(report.profit, settings)}`, sub: "Revenue minus item cost" },
    { label: "Outstanding", value: `${money(report.outstanding, settings)}`, sub: "Unpaid sales & repairs" },
  ];

  const secondaryCards = [
    { label: "Sales", value: report.salesCount },
    { label: "Repairs", value: report.repairsCount },
    { label: "Completed", value: report.completed },
  ];

  return (
    <div className="flex-1 p-4 md:p-8">
      <Topbar
        title="Reports"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadCsv}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold ${t.pillBg}`}
            >
              <FileSpreadsheet className="w-4 h-4" /> Export CSV
            </button>
            <button
              onClick={handleDownload}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold ${t.pillBg}`}
            >
              <Download className="w-4 h-4" /> Download report
            </button>
          </div>
        }
      />

      <div className="flex items-center gap-2 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              filter === f.key
                ? t.dark
                  ? "bg-white text-black"
                  : "bg-slate-900 text-white"
                : t.pillBg
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-5">
        {statCards.map((c) => (
          <div key={c.label} className={`rounded-2xl p-5 ${t.cardBg}`}>
            <div className={`text-sm ${t.textSecondary} mb-1`}>{c.label}</div>
            <div className={`text-2xl font-bold ${t.textPrimary} mb-1`}>{c.value}</div>
            <div className={`text-xs ${t.textMuted}`}>{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-5">
        {secondaryCards.map((c) => (
          <div key={c.label} className={`rounded-2xl p-5 ${t.cardBg}`}>
            <div className={`text-sm ${t.textSecondary} mb-1`}>{c.label}</div>
            <div className={`text-3xl font-bold ${t.textPrimary}`}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className={`rounded-2xl p-6 mb-5 ${t.cardBg}`}>
        <h3 className={`font-semibold mb-4 ${t.textPrimary}`}>Daily revenue</h3>
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={report.dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.dark ? "#222" : "#eee"} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: t.dark ? "#888" : "#94a3b8" }} minTickGap={30} />
              <YAxis tick={{ fontSize: 10, fill: t.dark ? "#888" : "#94a3b8" }} />
              <Tooltip
                contentStyle={{
                  background: t.dark ? "#0d0d0d" : "#fff",
                  border: t.dark ? "1px solid #333" : "1px solid #eee",
                  fontSize: 12,
                }}
              />
              <Line type="monotone" dataKey="sales" stroke={t.dark ? "#fff" : "#0f172a"} strokeWidth={2} dot={false} name="Sales" />
              <Line type="monotone" dataKey="repairs" stroke="#94a3b8" strokeWidth={2} dot={false} name="Repairs" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className={`text-xs ${t.textMuted}`}>{report.dailyRevenue[0]?.date}</span>
          <div className="flex items-center gap-4">
            <span className={`flex items-center gap-1.5 text-xs ${t.textSecondary}`}>
              <span className={`w-2 h-2 rounded-full ${t.dark ? "bg-white" : "bg-slate-900"}`} /> Sales
            </span>
            <span className={`flex items-center gap-1.5 text-xs ${t.textSecondary}`}>
              <span className="w-2 h-2 rounded-full bg-slate-400" /> Repairs
            </span>
          </div>
          <span className={`text-xs ${t.textMuted}`}>{report.dailyRevenue[report.dailyRevenue.length - 1]?.date}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        <div className={`rounded-2xl p-6 ${t.cardBg}`}>
          <h3 className={`font-semibold mb-4 ${t.textPrimary}`}>Top products</h3>
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 text-xs font-medium ${t.textMuted} mb-2`}>
            <span>Product</span>
            <span>Qty</span>
            <span className="text-right">Revenue</span>
            <span className="text-right">Profit</span>
          </div>
          {report.topProducts.length === 0 ? (
            <div className={`text-sm py-4 ${t.textMuted}`}>No sales yet</div>
          ) : (
            report.topProducts.map((p) => (
              <div key={p.name} className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 text-sm py-2 ${t.textPrimary}`}>
                <span>{p.name}</span>
                <span>{p.qty}</span>
                <span className="text-right">{money(p.revenue, settings)}</span>
                <span className="text-right">{money(p.profit, settings)}</span>
              </div>
            ))
          )}
        </div>

        <div className={`rounded-2xl p-6 ${t.cardBg}`}>
          <h3 className={`font-semibold mb-4 ${t.textPrimary}`}>Payment methods</h3>
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 text-xs font-medium ${t.textMuted} mb-2`}>
            <span>Method</span>
            <span>Sales</span>
            <span className="text-right">Total</span>
          </div>
          {report.paymentMethods.length === 0 ? (
            <div className={`text-sm py-4 ${t.textMuted}`}>No sales yet</div>
          ) : (
            report.paymentMethods.map((m) => (
              <div key={m.method} className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 text-sm py-2 ${t.textPrimary}`}>
                <span className="font-medium">{m.method}</span>
                <span>{m.sales}</span>
                <span className="text-right">{money(m.total, settings)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className={`rounded-2xl p-6 ${t.cardBg}`}>
          <h3 className={`font-semibold mb-4 ${t.textPrimary}`}>Repair status</h3>
          <div className={`grid grid-cols-1 md:grid-cols-2 text-xs font-medium ${t.textMuted} mb-2`}>
            <span>Status</span>
            <span className="text-right">Count</span>
          </div>
          {report.repairStatus.length === 0 ? (
            <div className={`text-sm py-4 ${t.textMuted}`}>No repairs yet</div>
          ) : (
            report.repairStatus.map((s) => (
              <div key={s.status} className={`grid grid-cols-1 md:grid-cols-2 text-sm py-2 ${t.textPrimary}`}>
                <span>{s.status}</span>
                <span className="text-right">{s.count}</span>
              </div>
            ))
          )}
        </div>

        <div className={`rounded-2xl p-6 ${t.cardBg}`}>
          <h3 className={`font-semibold mb-4 ${t.textPrimary}`}>Staff performance</h3>
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 text-xs font-medium ${t.textMuted} mb-2`}>
            <span>Staff</span>
            <span>Sales</span>
            <span>Revenue</span>
            <span>Repairs</span>
          </div>
          {report.staffPerformance.map((s) => (
            <div key={s.staff} className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 text-sm py-2 ${t.textPrimary}`}>
              <span className="font-medium">{s.staff}</span>
              <span>{s.sales}</span>
              <span>{money(s.revenue, settings)}</span>
              <span>
                {s.repairs} ({s.done} done)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
