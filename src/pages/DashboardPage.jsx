import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  Wrench,
  Box,
  CheckCircle2,
  Plus,
  UserPlus,
  ArrowUpRight,
  ChevronRight,
} from "lucide-react";
import Topbar from "../components/Topbar";
import { useThemeTokens } from "../lib/ThemeContext";
import { useSettings } from "../lib/SettingsContext";
import { db } from "../lib/db";
import { money } from "../lib/currency";
import { useAuth } from "../lib/AuthContext";

function isToday(iso) {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

export default function DashboardPage() {
  const t = useThemeTokens();
  const { user } = useAuth();
  const { settings } = useSettings();
  const labels = settings.labels;
  const navigate = useNavigate();

  const { sales, repairs, inventory } = useMemo(
    () => ({ sales: db.getSales(), repairs: db.getRepairs(), inventory: db.getInventory() }),
    []
  );

  const salesToday = sales.filter((s) => isToday(s.createdAt));
  const salesTodayTotal = salesToday.reduce((sum, s) => sum + Number(s.total || 0), 0);
  const inRepair = repairs.filter((r) => r.status !== "completed" && r.status !== "delivered").length;
  const completedToday = repairs.filter(
    (r) => (r.status === "completed" || r.status === "delivered") && isToday(r.createdAt)
  ).length;
  const lowStock = inventory.filter((p) => p.stock <= (p.lowStockThreshold || 5)).length;

  const stats = [
    {
      label: "Sales Today",
      value: `${money(salesTodayTotal, settings)}`,
      sub: `${salesToday.length} transactions`,
      icon: ShoppingCart,
      iconBg: t.dark ? "bg-white/5" : "bg-blue-100",
      iconColor: t.dark ? "text-white" : "text-blue-600",
      onClick: () => navigate("/sales"),
    },
    {
      label: `In ${labels.ticketSingular}`,
      value: String(inRepair),
      sub: "View all",
      icon: Wrench,
      iconBg: t.dark ? "bg-white/5" : "bg-emerald-100",
      iconColor: t.dark ? "text-white" : "text-emerald-600",
      onClick: () => navigate("/repairs"),
    },
    {
      label: "Completed",
      value: String(completedToday),
      sub: "Today",
      icon: CheckCircle2,
      iconBg: t.dark ? "bg-white/5" : "bg-violet-100",
      iconColor: t.dark ? "text-white" : "text-violet-600",
      onClick: () => navigate("/repairs"),
    },
    {
      label: "Low Stock",
      value: String(lowStock),
      sub: "View items",
      icon: Box,
      iconBg: t.dark ? "bg-white/5" : "bg-orange-100",
      iconColor: t.dark ? "text-white" : "text-orange-500",
      onClick: () => navigate("/inventory"),
    },
  ];

  const quickActions = [
    { label: "New Sale (POS)", sub: "Create new sale", icon: ShoppingCart, path: "/sales" },
    { label: `New ${labels.ticketSingular}`, sub: `Create ${labels.ticketSingular.toLowerCase()} ticket`, icon: Wrench, path: "/repairs" },
    { label: "Add Product", sub: "Add to inventory", icon: Plus, path: "/inventory" },
    { label: "Add Customer", sub: "Add new customer", icon: UserPlus, path: "/customers" },
  ];

  const recentRepairs = repairs.slice(0, 3);
  const recentSales = sales.slice(0, 3);

  return (
    <div className="flex-1 p-4 md:p-8">
      <Topbar title="Dashboard" subtitle={`Welcome back, ${user?.name || "there"} \u{1F44B}`} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <button key={s.label} onClick={s.onClick} className={`rounded-2xl p-3.5 md:p-5 relative text-left ${t.cardBg}`}>
              <ArrowUpRight className={`absolute top-3.5 right-3.5 md:top-5 md:right-5 w-3.5 h-3.5 md:w-4 md:h-4 ${t.textMuted}`} />
              <div className={`w-9 h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center mb-2.5 md:mb-4 ${s.iconBg}`}>
                <Icon className={`w-5 h-5 ${s.iconColor}`} />
              </div>
              <div className={`text-sm ${t.textSecondary} mb-1`}>{s.label}</div>
              <div className={`text-xl md:text-3xl font-bold ${t.textPrimary} mb-0.5 md:mb-1 truncate`}>{s.value}</div>
              <div className={`text-sm ${t.textMuted}`}>{s.sub}</div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        <div className={`rounded-2xl p-4 md:p-6 ${t.cardBg}`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={`font-semibold ${t.textPrimary}`}>Recent {labels.ticketPlural}</h3>
            <button onClick={() => navigate("/repairs")} className={`text-xs font-medium px-3 py-1.5 rounded-full ${t.pillBg}`}>
              View all
            </button>
          </div>
          {recentRepairs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${t.dark ? "bg-white/5" : "bg-slate-100"}`}>
                <Wrench className={`w-6 h-6 ${t.textMuted}`} />
              </div>
              <div className={`font-semibold ${t.textPrimary} mb-1`}>No {labels.ticketPlural.toLowerCase()} yet</div>
              <div className={`text-sm ${t.textMuted}`}>{labels.ticketPlural} will appear here</div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {recentRepairs.map((r) => (
                <button
                  key={r.id}
                  onClick={() => navigate("/repairs")}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-left ${
                    t.dark ? "hover:bg-white/5" : "hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <div className={`text-sm font-medium ${t.textPrimary}`}>{r.ticket} &middot; {r.device}</div>
                    <div className={`text-xs ${t.textMuted}`}>{r.customerName}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${t.pillBg}`}>{r.status}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={`rounded-2xl p-4 md:p-6 ${t.cardBg}`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={`font-semibold ${t.textPrimary}`}>Recent Sales</h3>
            <button onClick={() => navigate("/sales")} className={`text-xs font-medium px-3 py-1.5 rounded-full ${t.pillBg}`}>
              View all
            </button>
          </div>
          {recentSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${t.dark ? "bg-white/5" : "bg-slate-100"}`}>
                <ShoppingCart className={`w-6 h-6 ${t.textMuted}`} />
              </div>
              <div className={`font-semibold ${t.textPrimary} mb-1`}>No sales yet</div>
              <div className={`text-sm ${t.textMuted}`}>Sales will appear here</div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {recentSales.map((s) => (
                <button
                  key={s.id}
                  onClick={() => navigate("/sales")}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-left ${
                    t.dark ? "hover:bg-white/5" : "hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <div className={`text-sm font-medium ${t.textPrimary}`}>{s.invoice}</div>
                    <div className={`text-xs ${t.textMuted}`}>{s.customerName}</div>
                  </div>
                  <span className={`text-sm font-semibold ${t.textPrimary}`}>{money(Number(s.total), settings)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={`rounded-2xl p-4 md:p-6 ${t.cardBg}`}>
        <h3 className={`font-semibold ${t.textPrimary} mb-5`}>Quick Actions</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((qa) => {
            const Icon = qa.icon;
            return (
              <button
                key={qa.label}
                onClick={() => navigate(qa.path)}
                className={`flex flex-col items-start gap-3 rounded-2xl p-4 text-left transition-colors ${
                  t.dark ? "bg-white/5 border border-white/10 hover:bg-white/10" : "bg-slate-50 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.dark ? "bg-white/5" : "bg-blue-100"}`}>
                    <Icon className={`w-5 h-5 ${t.dark ? "text-white" : "text-blue-600"}`} />
                  </div>
                  <ChevronRight className={`w-4 h-4 ${t.textMuted}`} />
                </div>
                <div>
                  <div className={`font-semibold text-sm ${t.textPrimary}`}>{qa.label}</div>
                  <div className={`text-xs ${t.textMuted}`}>{qa.sub}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
