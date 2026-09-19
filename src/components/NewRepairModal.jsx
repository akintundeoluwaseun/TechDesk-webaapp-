import React, { useMemo, useState } from "react";
import { X, Trash2 } from "lucide-react";
import { useThemeTokens } from "../lib/ThemeContext";
import { useAuth } from "../lib/AuthContext";
import { useSettings } from "../lib/SettingsContext";
import { db } from "../lib/db";
import { currencySymbol, money } from "../lib/currency";

const STATUSES = ["received", "in progress", "awaiting parts", "completed", "delivered"];

export default function NewRepairModal({ onClose, onCompleted }) {
  const t = useThemeTokens();
  const { user: authUser } = useAuth();
  const { settings } = useSettings();
  const labels = settings.labels;
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [device, setDevice] = useState("");
  const [imei, setImei] = useState("");
  const [serial, setSerial] = useState("");
  const [problem, setProblem] = useState("");
  const [status, setStatus] = useState("received");
  const [cost, setCost] = useState("0");
  const [notes, setNotes] = useState("");

  // Parts taken off the shelf for this job. Same shape as a sale's items, so
  // one decrement serves both and the receipt can print either.
  const [parts, setParts] = useState([]);
  const [partSearch, setPartSearch] = useState("");

  const inventory = useMemo(() => db.getInventory(), []);

  const partMatches = useMemo(() => {
    const q = partSearch.trim().toLowerCase();
    if (!q) return [];
    return inventory
      .filter((p) => p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q))
      .slice(0, 6);
  }, [partSearch, inventory]);

  /** Stock left after what this form has already claimed. */
  function availableStock(productId) {
    const product = inventory.find((p) => p.id === productId);
    const claimed = parts.find((x) => x.productId === productId)?.qty || 0;
    return Math.max(0, Number(product?.stock || 0) - claimed);
  }

  function addPart(product) {
    if (availableStock(product.id) < 1) return;
    setParts((prev) => {
      const existing = prev.find((x) => x.productId === product.id);
      if (existing) {
        return prev.map((x) => (x.productId === product.id ? { ...x, qty: x.qty + 1 } : x));
      }
      return [
        ...prev,
        {
          id: db.uid("part"),
          productId: product.id,
          name: product.name,
          price: Number(product.price) || 0,
          qty: 1,
          fromInventory: true,
        },
      ];
    });
    setPartSearch("");
  }

  function setPartQty(id, qty) {
    setParts((prev) =>
      prev.map((x) => {
        if (x.id !== id) return x;
        // Never let a job claim more units than the shelf holds.
        const ceiling = Number(inventory.find((p) => p.id === x.productId)?.stock || 0);
        return { ...x, qty: Math.max(1, Math.min(ceiling, Number(qty) || 1)) };
      })
    );
  }

  const partsTotal = parts.reduce((sum, x) => sum + x.price * x.qty, 0);

  function handleSave() {
    if (!name || !device || !problem) return;
    const customer = db.findOrCreateCustomer({ name, phone });
    const repair = db.createRepair({
      customerId: customer?.id || null,
      customerName: name,
      customerPhone: phone,
      device,
      imei,
      serial,
      problem,
      status,
      repairCost: Number(cost) || 0,
      notes,
      parts,
      // Who took the job in. Sales have always recorded this; repairs did not,
      // so half the shop's work was invisible to any "who did what" question.
      actor: authUser?.name,
    });
    db.logActivity({
      type: "repair",
      message: `New ${labels.ticketSingular.toLowerCase()} ticket ${repair.ticket} created`,
      refId: repair.id,
      actor: authUser?.name,
    });
    onCompleted?.(repair);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-6 overflow-y-auto">
      <div className={`w-full max-w-lg rounded-2xl mt-10 mb-10 p-6 ${t.dark ? "bg-[#1a1a2e]/80 backdrop-blur-lg border border-white/10" : "bg-white/35 backdrop-blur-lg backdrop-brightness-90 border border-white/50"}`}>
        <div className="flex items-center justify-between mb-5">
          <h2 className={`text-xl font-bold ${t.textPrimary}`}>New {labels.ticketSingular.toLowerCase()}</h2>
          <button onClick={onClose} className={t.textMuted}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>Customer name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none ${t.inputBg}`}
            />
          </div>
          <div>
            <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08012345678"
              className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none ${t.inputBg}`}
            />
          </div>
        </div>

        <div className="mb-4">
          <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>{labels.itemLabel}</label>
          <input
            value={device}
            onChange={(e) => setDevice(e.target.value)}
            className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none ${t.inputBg}`}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>{labels.idLabel}</label>
            <input
              value={imei}
              onChange={(e) => setImei(e.target.value)}
              className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none ${t.inputBg}`}
            />
          </div>
          <div>
            <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>{labels.serialLabel}</label>
            <input
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none ${t.inputBg}`}
            />
          </div>
        </div>

        <div className="mb-4">
          <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>{labels.problemLabel}</label>
          <input
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none ${t.inputBg}`}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
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
            <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>
              {labels.ticketSingular} cost ({currencySymbol(settings)}){parts.length > 0 && <span className={`font-normal ${t.textMuted}`}> &mdash; labour</span>}
            </label>
            <input
              type="number"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none ${t.inputBg}`}
            />
            {parts.length > 0 && (
              <p className={`text-xs mt-1.5 tabular-nums ${t.textSecondary}`}>
                Customer total {money(((Number(cost) || 0) + partsTotal), settings)}
                <span className={t.textMuted}> (labour + parts)</span>
              </p>
            )}
          </div>
        </div>

        {/* Parts off the shelf. Optional: plenty of jobs are labour only, so
            this stays an empty search box until something is added rather
            than a step to click past. */}
        <div className="mb-4">
          <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>
            Parts from inventory <span className={`font-normal ${t.textMuted}`}>(optional)</span>
          </label>

          <div className="relative">
            <input
              value={partSearch}
              onChange={(e) => setPartSearch(e.target.value)}
              placeholder="Search a part by name or SKU..."
              className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none ${t.inputBg}`}
            />
            {partMatches.length > 0 && (
              <div className={`absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-10 ${t.cardBg}`}>
                {partMatches.map((product) => {
                  const left = availableStock(product.id);
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => addPart(product)}
                      disabled={left < 1}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between disabled:opacity-40 ${
                        t.dark ? "hover:bg-white/5" : "hover:bg-black/5"
                      }`}
                    >
                      <span className={t.textPrimary}>{product.name}</span>
                      <span className={`text-xs ${t.textMuted}`}>
                        {left < 1 ? "out of stock" : `${left} in stock`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {parts.length > 0 && (
            <div className={`mt-3 rounded-xl overflow-hidden ${t.insetBg}`}>
              {parts.map((item) => (
                <div key={item.id} className={`flex items-center gap-3 px-3 py-2.5 border-b last:border-b-0 ${t.divider}`}>
                  <span className={`flex-1 text-sm truncate ${t.textPrimary}`}>{item.name}</span>
                  <input
                    type="number"
                    min="1"
                    value={item.qty}
                    onChange={(e) => setPartQty(item.id, e.target.value)}
                    aria-label={`Quantity of ${item.name}`}
                    className={`w-16 rounded-lg px-2 py-1 text-sm text-center outline-none ${t.inputBg}`}
                  />
                  <span className={`text-sm tabular-nums w-24 text-right ${t.textSecondary}`}>
                    {money((item.price * item.qty), settings)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setParts((prev) => prev.filter((x) => x.id !== item.id))}
                    aria-label={`Remove ${item.name}`}
                    className={t.textMuted}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className={`text-sm font-medium ${t.textSecondary}`}>Parts total</span>
                <span className={`text-sm font-semibold tabular-nums ${t.textPrimary}`}>
                  {money(partsTotal, settings)}
                </span>
              </div>
            </div>
          )}

          {parts.length > 0 && (
            <p className={`text-xs mt-2 ${t.textMuted}`}>
              These come off your stock when the ticket is saved, and are charged on top of the
              cost above &mdash; so that cost is your labour, not the whole bill.
            </p>
          )}
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
