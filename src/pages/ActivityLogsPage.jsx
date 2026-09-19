import React, { useMemo, useState } from "react";
import { ShoppingCart, Wrench, Box, Users, ArrowLeftRight, Shield, Settings, ChevronDown } from "lucide-react";
import Topbar from "../components/Topbar";
import { useThemeTokens } from "../lib/ThemeContext";
import { db } from "../lib/db";

const CATEGORIES = [
  { key: "sale", label: "Sale", icon: ShoppingCart, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { key: "repair", label: "Repair", icon: Wrench, color: "text-blue-500", bg: "bg-blue-500/10" },
  { key: "inventory", label: "Inventory", icon: Box, color: "text-orange-500", bg: "bg-orange-500/10" },
  { key: "customer", label: "Customer", icon: Users, color: "text-violet-500", bg: "bg-violet-500/10" },
  { key: "transfer", label: "Transfer", icon: ArrowLeftRight, color: "text-teal-500", bg: "bg-teal-500/10" },
  { key: "auth", label: "Auth", icon: Shield, color: "text-red-500", bg: "bg-red-500/10" },
  { key: "settings", label: "Settings", icon: Settings, color: "text-slate-400", bg: "bg-slate-500/10" },
];

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} mins ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hours ago`;
  const days = Math.floor(hrs / 24);
  return `${days} days ago`;
}

function formatDateTime(iso) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
    ", " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
}

function titleFor(entry) {
  const msg = (entry.message || "").toLowerCase();
  if (entry.type === "sale") {
    if (msg.includes("deleted")) return "Sale deleted";
    if (msg.includes("edited")) return "Sale edited";
    return "Sale recorded";
  }
  const map = {
    repair: "Repair created",
    inventory: "Product added",
    customer: "Customer added",
    transfer: "Transfer",
    auth: "Auth event",
    settings: "Settings updated",
  };
  return map[entry.type] || "Activity";
}

export default function ActivityLogsPage() {
  const t = useThemeTokens();
  const [activity] = useState(() => db.getActivity());
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const counts = useMemo(() => {
    const map = Object.fromEntries(CATEGORIES.map((c) => [c.key, 0]));
    activity.forEach((a) => {
      if (map[a.type] !== undefined) map[a.type] += 1;
    });
    return map;
  }, [activity]);

  const filtered = activity.filter((a) => {
    if (category !== "all" && a.type !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        titleFor(a).toLowerCase().includes(q) ||
        a.message?.toLowerCase().includes(q) ||
        a.refId?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex-1 p-4 md:p-8">
      <Topbar title="Activity Logs" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.key}
              onClick={() => setCategory(category === c.key ? "all" : c.key)}
              className={`rounded-2xl p-4 text-left ${t.cardBg} ${category === c.key ? "ring-2 ring-blue-500" : ""}`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center mb-3 ${c.bg}`}>
                <Icon className={`w-4 h-4 ${c.color}`} />
              </div>
              <div className={`text-sm ${t.textSecondary}`}>{c.label}</div>
              <div className={`text-2xl font-bold ${t.textPrimary}`}>{counts[c.key]}</div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className={`flex-1 flex items-center gap-2 rounded-full px-4 py-3 ${t.cardBg}`}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, user, description..."
            className="bg-transparent outline-none text-sm flex-1"
          />
        </div>
        <div className="relative">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={`rounded-full pl-4 pr-9 py-3 text-sm outline-none appearance-none ${t.inputBg}`}
          >
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
          <ChevronDown className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${t.textMuted}`} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className={`rounded-2xl p-16 text-center ${t.cardBg}`}>
          <div className={`font-semibold ${t.textPrimary} mb-1`}>No activity yet</div>
          <div className={`text-sm ${t.textMuted}`}>Actions you take will appear here</div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((a) => {
            const cat = CATEGORIES.find((c) => c.key === a.type) || CATEGORIES[CATEGORIES.length - 1];
            const Icon = cat.icon;
            return (
              <div key={a.id} className={`rounded-2xl p-5 flex items-start gap-4 ${t.cardBg}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${cat.bg}`}>
                  <Icon className={`w-4 h-4 ${cat.color}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`font-semibold ${t.textPrimary}`}>{titleFor(a)}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${t.pillBg}`}>{cat.label}</span>
                    {a.refId && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${t.pillBg}`}>
                        {a.message?.match(/[A-Z]+-\d+/)?.[0] || ""}
                      </span>
                    )}
                  </div>
                  <div className={`text-sm ${t.textSecondary} mb-1`}>{a.message}</div>
                  <div className={`text-xs ${t.textMuted}`}>
                    {a.actor && a.actor !== "Admin" ? a.actor : "Admin"} &middot; {formatDateTime(a.createdAt)} &middot; {timeAgo(a.createdAt)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
