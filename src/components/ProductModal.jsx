import React, { useState } from "react";
import { X } from "lucide-react";
import { useThemeTokens } from "../lib/ThemeContext";
import { useAuth } from "../lib/AuthContext";
import { useSettings } from "../lib/SettingsContext";
import { db } from "../lib/db";
import { currencySymbol } from "../lib/currency";

export default function ProductModal({ product, onClose, onSaved }) {
  const t = useThemeTokens();
  const { isAdmin, user: authUser } = useAuth();
  const { settings } = useSettings();
  const categories = settings.categories;
  const isEdit = !!product;
  const [name, setName] = useState(product?.name || "");
  const [sku, setSku] = useState(product?.sku || "");
  const [category, setCategory] = useState(product?.category || categories[0] || "Other");
  const [price, setPrice] = useState(product?.price ?? "");
  const [costPrice, setCostPrice] = useState(product?.costPrice ?? "");
  const losingMoney =
    price !== "" && costPrice !== "" && Number(costPrice) > Number(price);
  const [stock, setStock] = useState(product?.stock ?? "0");
  const [lowStockThreshold, setLowStockThreshold] = useState(product?.lowStockThreshold ?? "5");
  const [description, setDescription] = useState(product?.description || "");

  function handleSave() {
    if (!name || price === "" || stock === "") return;
    const payload = {
      name,
      sku,
      category,
      price: Number(price) || 0,
      costPrice: Number(costPrice) || 0,
      stock: Number(stock) || 0,
      lowStockThreshold: Number(lowStockThreshold) || 0,
      description,
    };
    if (isEdit) {
      db.updateInventoryItem(product.id, payload);
    } else {
      const record = db.addInventoryItem(payload);
      db.logActivity({ type: "inventory", message: `Product "${record.name}" added to inventory`, refId: record.id, actor: authUser?.name });
    }
    onSaved?.();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-6 overflow-y-auto">
      <div className={`w-full max-w-lg rounded-2xl mt-10 mb-10 p-6 ${t.dark ? "bg-[#1a1a2e]/80 backdrop-blur-lg border border-white/10" : "bg-white/35 backdrop-blur-lg backdrop-brightness-90 border border-white/50"}`}>
        <div className="flex items-center justify-between mb-5">
          <h2 className={`text-xl font-bold ${t.textPrimary}`}>{isEdit ? "Edit Product" : "Add Product"}</h2>
          <button onClick={onClose} className={t.textMuted}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>
            Product Name <span className="text-red-500">*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none ${t.inputBg}`}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>SKU</label>
            <input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="e.g. LAP-001"
              className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none ${t.inputBg}`}
            />
          </div>
          <div>
            <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none ${t.inputBg}`}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>
              Selling Price ({currencySymbol(settings)}) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none ${t.inputBg}`}
            />
          </div>
          {isAdmin && (
            <div>
              <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>Cost Price ({currencySymbol(settings)})</label>
              <input
                type="number"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none ${t.inputBg}`}
              />
              {/* Said here rather than discovered in the report: a cost above
                  the selling price is what makes profit come out negative,
                  and the usual cause is the two figures typed the wrong way
                  round. */}
              {losingMoney ? (
                <div className="text-xs mt-1.5 text-red-500">
                  You'd lose {currencySymbol(settings)}
                  {(Number(costPrice) - Number(price)).toLocaleString()} on each one. Did the two
                  prices swap places?
                </div>
              ) : (
                <div className={`text-xs mt-1.5 ${t.textMuted}`}>What you paid for it, not what you sell it for.</div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>
              Stock Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none ${t.inputBg}`}
            />
          </div>
          <div>
            <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>Low Stock Threshold</label>
            <input
              type="number"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
              className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none ${t.inputBg}`}
            />
          </div>
        </div>

        <div className="mb-6">
          <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none resize-none ${t.inputBg}`}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className={`flex-1 py-3 rounded-xl font-semibold text-sm ${t.pillBg}`}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className={`flex-1 py-3 rounded-xl font-semibold text-sm ${
              t.dark ? "bg-white text-black" : "bg-slate-900 text-white"
            }`}
          >
            {isEdit ? "Save Changes" : "Add Product"}
          </button>
        </div>
      </div>
    </div>
  );
}
