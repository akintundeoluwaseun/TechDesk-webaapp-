import React, { useState } from "react";
import { Plus, Pencil, Trash2, User, Search } from "lucide-react";
import Topbar from "../components/Topbar";
import CustomerModal from "../components/CustomerModal";
import { useThemeTokens } from "../lib/ThemeContext";
import { db } from "../lib/db";

export default function CustomersPage() {
  const t = useThemeTokens();
  const [customers, setCustomers] = useState(() => db.getCustomers());
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      !q ||
      c.name?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.address?.toLowerCase().includes(q)
    );
  });

  function refresh() {
    setCustomers(db.getCustomers());
  }

  function handleSaved() {
    setShowModal(false);
    setEditing(null);
    refresh();
  }

  function handleDelete(id) {
    db.saveCustomers(db.getCustomers().filter((c) => c.id !== id));
    refresh();
  }

  return (
    <div className="flex-1 p-4 md:p-8">
      <Topbar
        title="Customers"
        action={
          <button
            onClick={() => {
              setEditing(null);
              setShowModal(true);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold ${
              t.dark ? "bg-white text-black" : "bg-slate-900 text-white"
            }`}
          >
            <Plus className="w-4 h-4" /> Add Customer
          </button>
        }
      />

      <div className={`flex items-center gap-2 rounded-full px-4 py-3 mb-6 ${t.cardBg}`}>
        <Search className={`w-4 h-4 ${t.textMuted}`} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, phone, email or address"
          className="bg-transparent outline-none text-sm flex-1"
        />
      </div>

      {customers.length === 0 ? (
        <div className={`rounded-2xl p-16 text-center ${t.cardBg}`}>
          <div className={`font-semibold ${t.textPrimary} mb-1`}>No customers yet</div>
          <div className={`text-sm ${t.textMuted}`}>Customers will appear here</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className={`rounded-2xl p-16 text-center ${t.cardBg}`}>
          <div className={`font-semibold ${t.textPrimary} mb-1`}>No matching customers</div>
          <div className={`text-sm ${t.textMuted}`}>Try a different search</div>
        </div>
      ) : (
        <div className={`rounded-2xl overflow-hidden ${t.cardBg}`}>
          {filtered.map((c, idx) => (
            <div
              key={c.id}
              className={`flex items-center justify-between px-6 py-4 ${
                idx !== filtered.length - 1
                  ? t.dark
                    ? "border-b border-white/10"
                    : "border-b border-slate-100"
                  : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    t.dark ? "bg-white/10" : "bg-slate-100"
                  }`}
                >
                  <User className={`w-4 h-4 ${t.textSecondary}`} />
                </div>
                <div>
                  <div className={`font-semibold ${t.textPrimary}`}>{c.name}</div>
                  <div className={`text-sm ${t.textMuted}`}>
                    {[c.phone, c.email].filter(Boolean).join(" \u00b7 ")}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setEditing(c);
                    setShowModal(true);
                  }}
                  className={t.textSecondary}
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(c.id)} className="text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <CustomerModal
          customer={editing}
          onClose={() => {
            setShowModal(false);
            setEditing(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
