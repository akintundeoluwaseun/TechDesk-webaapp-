import React, { useState } from "react";
import { Plus, Search, FileText, MessageCircle, Trash2, ChevronRight } from "lucide-react";
import Topbar from "../components/Topbar";
import NewRepairModal from "../components/NewRepairModal";
import { useThemeTokens } from "../lib/ThemeContext";
import { useSettings } from "../lib/SettingsContext";
import { db } from "../lib/db";
import { generateRepairTicketPdf, generateBlankRepairFormPdf } from "../lib/generateRepairPdf";
import { openWhatsApp, repairMessage } from "../lib/share";

const STATUSES = ["received", "in progress", "awaiting parts", "completed", "delivered"];
const PAYMENTS = ["Unpaid", "Paid", "Partial"];

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function RepairsPage() {
  const t = useThemeTokens();
  const { settings } = useSettings();
  const labels = settings.labels;
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [repairs, setRepairs] = useState(() => db.getRepairs());
  const [expanded, setExpanded] = useState(null);

  function refresh() {
    setRepairs(db.getRepairs());
  }

  const filtered = repairs.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.ticket?.toLowerCase().includes(q) ||
      r.customerName?.toLowerCase().includes(q) ||
      r.customerPhone?.includes(q) ||
      r.device?.toLowerCase().includes(q) ||
      r.problem?.toLowerCase().includes(q)
    );
  });

  function handleCompleted() {
    setShowModal(false);
    refresh();
  }

  function updateField(id, field, value) {
    db.updateRepair(id, { [field]: value });
    refresh();
  }

  function handleDelete(id) {
    db.deleteRepair(id);
    refresh();
  }

  function sendWhatsApp(repair) {
    openWhatsApp(repair.customerPhone, repairMessage(repair, settings));
  }

  return (
    <div className="flex-1 p-4 md:p-8">
      <Topbar
        title={labels.navRepairs}
        action={
          <div className="flex items-center gap-3">
            <button
              onClick={() => generateBlankRepairFormPdf()}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold ${t.pillBg}`}
            >
              <FileText className="w-4 h-4" /> Ticket
            </button>
            <button
              onClick={() => setShowModal(true)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold ${
                t.dark ? "bg-white text-black" : "bg-slate-900 text-white"
              }`}
            >
              <Plus className="w-4 h-4" /> New {labels.ticketSingular}
            </button>
          </div>
        }
      />

      <div className={`flex items-center gap-2 rounded-full px-4 py-3 mb-6 ${t.cardBg}`}>
        <Search className={`w-4 h-4 ${t.textMuted}`} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ticket, customer, phone, ${labels.itemLabel.toLowerCase()} or ${labels.problemLabel.toLowerCase()}`}
          className="bg-transparent outline-none text-sm flex-1"
        />
      </div>

      {filtered.length === 0 ? (
        <div className={`rounded-2xl p-16 text-center ${t.cardBg}`}>
          <div className={`font-semibold ${t.textPrimary} mb-1`}>No {labels.ticketPlural.toLowerCase()} yet</div>
          <div className={`text-sm ${t.textMuted}`}>{labels.ticketPlural} will appear here</div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((r) => {
            const isOpen = expanded === r.id;
            return (
              <div key={r.id} className={`rounded-2xl p-6 ${t.cardBg}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`font-bold text-sm ${t.textPrimary}`}>{r.ticket}</span>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${t.pillBg}`}>
                      {r.status}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        r.paymentStatus === "Paid"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {r.paymentStatus?.toLowerCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <button onClick={() => generateRepairTicketPdf(r)} className={t.textSecondary} title="Print">
                      <FileText className="w-[18px] h-[18px]" />
                    </button>
                    <button onClick={() => sendWhatsApp(r)} className="text-emerald-500" title="WhatsApp">
                      <MessageCircle className="w-[18px] h-[18px]" />
                    </button>
                    <button onClick={() => handleDelete(r.id)} className="text-red-500" title="Delete">
                      <Trash2 className="w-[18px] h-[18px]" />
                    </button>
                    <button
                      onClick={() => setExpanded(isOpen ? null : r.id)}
                      className={`${t.textMuted} transition-transform ${isOpen ? "rotate-90" : ""}`}
                    >
                      <ChevronRight className="w-[18px] h-[18px]" />
                    </button>
                  </div>
                </div>

                <div className={`mt-2 font-medium ${t.textPrimary}`}>
                  {r.device} &mdash; {r.problem}
                </div>
                <div className={`text-sm mt-1 ${t.textMuted}`}>
                  {r.customerName} &middot; {r.customerPhone} &middot; {formatTime(r.createdAt)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className={`text-xs font-medium block mb-1.5 ${t.textPrimary}`}>{labels.ticketSingular} status</label>
                    <select
                      value={r.status}
                      onChange={(e) => updateField(r.id, "status", e.target.value)}
                      className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none ${t.inputBg}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={`text-xs font-medium block mb-1.5 ${t.textPrimary}`}>Payment</label>
                    <select
                      value={r.paymentStatus}
                      onChange={(e) => updateField(r.id, "paymentStatus", e.target.value)}
                      className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none ${t.inputBg}`}
                    >
                      {PAYMENTS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {isOpen && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
                    <div className={t.textSecondary}>
                      IMEI: <span className={t.textPrimary}>{r.imei || "N/A"}</span>
                    </div>
                    <div className={t.textSecondary}>
                      Serial: <span className={t.textPrimary}>{r.serial || "N/A"}</span>
                    </div>
                    <div className={`col-span-2 ${t.textSecondary}`}>
                      Notes: <span className={t.textPrimary}>{r.notes || "\u2014"}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && <NewRepairModal onClose={() => setShowModal(false)} onCompleted={handleCompleted} />}
    </div>
  );
}
