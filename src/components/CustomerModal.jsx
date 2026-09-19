import React, { useState } from "react";
import { X } from "lucide-react";
import { useThemeTokens } from "../lib/ThemeContext";
import { useAuth } from "../lib/AuthContext";
import { db } from "../lib/db";

export default function CustomerModal({ customer, onClose, onSaved }) {
  const t = useThemeTokens();
  const { user: authUser } = useAuth();
  const isEdit = !!customer;
  const [name, setName] = useState(customer?.name || "");
  const [phone, setPhone] = useState(customer?.phone || "");
  const [email, setEmail] = useState(customer?.email || "");
  const [notes, setNotes] = useState(customer?.notes || "");

  function handleSave() {
    if (!name) return;
    if (isEdit) {
      const customers = db.getCustomers();
      const idx = customers.findIndex((c) => c.id === customer.id);
      if (idx > -1) {
        customers[idx] = { ...customers[idx], name, phone, email, notes };
        db.saveCustomers(customers);
      }
    } else {
      const customers = db.getCustomers();
      const record = {
        id: db.uid("cust"),
        name,
        phone,
        email,
        notes,
        address: "",
        createdAt: new Date().toISOString(),
      };
      customers.push(record);
      db.saveCustomers(customers);
      db.logActivity({ type: "customer", message: `New customer "${name}" added`, refId: record.id, actor: authUser?.name });
    }
    onSaved?.();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-6 overflow-y-auto">
      <div className={`w-full max-w-md rounded-2xl mt-10 mb-10 p-6 ${t.dark ? "bg-[#1a1a2e]/80 backdrop-blur-lg border border-white/10" : "bg-white/35 backdrop-blur-lg backdrop-brightness-90 border border-white/50"}`}>
        <div className="flex items-center justify-between mb-5">
          <h2 className={`text-xl font-bold ${t.textPrimary}`}>{isEdit ? "Edit customer" : "New customer"}</h2>
          <button onClick={onClose} className={t.textMuted}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none ${t.inputBg}`}
          />
        </div>

        <div className="mb-4">
          <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>Phone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none ${t.inputBg}`}
          />
        </div>

        <div className="mb-4">
          <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none ${t.inputBg}`}
          />
        </div>

        <div className="mb-5">
          <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none resize-none ${t.inputBg}`}
          />
        </div>

        <button
          onClick={handleSave}
          className={`w-full py-3 rounded-xl font-semibold ${t.dark ? "bg-white text-black" : "bg-slate-900 text-white"}`}
        >
          Save
        </button>
      </div>
    </div>
  );
}
