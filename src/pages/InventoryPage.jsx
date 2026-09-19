import React, { useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, ChevronDown, FileSpreadsheet } from "lucide-react";
import Topbar from "../components/Topbar";
import ProductModal from "../components/ProductModal";
import { useThemeTokens } from "../lib/ThemeContext";
import { useAuth } from "../lib/AuthContext";
import { db } from "../lib/db";
import { rowsToCsv, downloadCsv } from "../lib/csv";
import { money } from "../lib/currency";
import { useSettings } from "../lib/SettingsContext";

export default function InventoryPage() {
  const t = useThemeTokens();
  const { settings } = useSettings();
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState(() => db.getInventory());
  const [tab, setTab] = useState("in-stock"); // in-stock | sold-out | low-stock
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("recent");
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  function refresh() {
    setProducts(db.getInventory());
  }

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return ["All", ...Array.from(set)];
  }, [products]);

  function isLowStock(p) {
    return p.stock > 0 && p.stock <= (p.lowStockThreshold ?? 5);
  }

  function suggestedReorder(p) {
    if (!isLowStock(p)) return 0;
    const threshold = p.lowStockThreshold ?? 5;
    return Math.max(1, threshold * 2 - p.stock);
  }

  const inStockCount = products.filter((p) => p.stock > 0).length;
  const soldOutCount = products.filter((p) => p.stock <= 0).length;
  const lowStockCount = products.filter(isLowStock).length;

  const SORTS = {
    recent: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
    "name-asc": (a, b) => (a.name || "").localeCompare(b.name || ""),
    "name-desc": (a, b) => (b.name || "").localeCompare(a.name || ""),
    "price-desc": (a, b) => Number(b.price || 0) - Number(a.price || 0),
    "price-asc": (a, b) => Number(a.price || 0) - Number(b.price || 0),
    "stock-asc": (a, b) => Number(a.stock || 0) - Number(b.stock || 0),
    "stock-desc": (a, b) => Number(b.stock || 0) - Number(a.stock || 0),
  };

  const filtered = products
    .filter((p) => {
      if (tab === "in-stock" && p.stock <= 0) return false;
      if (tab === "sold-out" && p.stock > 0) return false;
      if (tab === "low-stock" && !isLowStock(p)) return false;
      if (category !== "All" && p.category !== category) return false;
      if (search && !p.name?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort(SORTS[sort] || SORTS.recent);

  function handleSaved() {
    setShowModal(false);
    setEditingProduct(null);
    refresh();
  }

  function handleDelete(id) {
    db.deleteInventoryItem(id);
    refresh();
  }

  function handleExportCsv() {
    const rows = [
      ["Name", "SKU", "Category", "Price", "Cost Price", "Stock", "Low Stock Threshold", "Suggested Reorder Qty"],
      ...filtered.map((p) => [
        p.name,
        p.sku || "",
        p.category || "",
        p.price,
        p.costPrice || "",
        p.stock,
        p.lowStockThreshold ?? 5,
        suggestedReorder(p),
      ]),
    ];
    const filenameTag = tab === "low-stock" ? "restock-list" : "inventory";
    downloadCsv(`techdesk-${filenameTag}-${new Date().toISOString().slice(0, 10)}.csv`, rowsToCsv(rows));
  }

  return (
    <div className="flex-1 p-4 md:p-8">
      <Topbar
        title="Inventory"
        subtitle={
          isAdmin
            ? `${inStockCount} in stock \u00b7 ${soldOutCount} sold out \u00b7 Total value ${money(products
                .reduce((sum, p) => sum + Number(p.price || 0) * Number(p.stock || 0), 0)
                , settings)}`
            : `${inStockCount} in stock \u00b7 ${soldOutCount} sold out`
        }
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold ${t.pillBg}`}
            >
              <FileSpreadsheet className="w-4 h-4" /> {tab === "low-stock" ? "Export restock list" : "Export CSV"}
            </button>
            <button
              onClick={() => {
                setEditingProduct(null);
                setShowModal(true);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold ${
                t.dark ? "bg-white text-black" : "bg-slate-900 text-white"
              }`}
            >
              <Plus className="w-4 h-4" /> Add Product
            </button>
          </div>
        }
      />

      <div className={`flex items-center gap-2 rounded-full px-4 py-3 mb-4 ${t.cardBg}`}>
        <Search className={`w-4 h-4 ${t.textMuted}`} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="bg-transparent outline-none text-sm flex-1"
        />
      </div>

      {/* Stock status, category and sort together -- the counts that used to
          sit on the old tab strip are kept in the option labels. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="relative">
          <select
            value={tab}
            onChange={(e) => setTab(e.target.value)}
            className={`w-full rounded-xl px-4 py-3 text-sm outline-none appearance-none ${t.inputBg}`}
          >
            <option value="all">All stock ({products.length})</option>
            <option value="in-stock">In stock ({inStockCount})</option>
            <option value="sold-out">Sold out ({soldOutCount})</option>
            <option value="low-stock">Low stock ({lowStockCount})</option>
          </select>
          <ChevronDown className={`w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${t.textMuted}`} />
        </div>

        <div className="relative">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={`w-full rounded-xl px-4 py-3 text-sm outline-none appearance-none ${t.inputBg}`}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "All" ? "All categories" : c}
              </option>
            ))}
          </select>
          <ChevronDown className={`w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${t.textMuted}`} />
        </div>

        <div className="relative">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className={`w-full rounded-xl px-4 py-3 text-sm outline-none appearance-none ${t.inputBg}`}
          >
            <option value="recent">Newest first</option>
            <option value="name-asc">Name (A–Z)</option>
            <option value="name-desc">Name (Z–A)</option>
            <option value="price-desc">Price (high to low)</option>
            <option value="price-asc">Price (low to high)</option>
            <option value="stock-asc">Stock (low to high)</option>
            <option value="stock-desc">Stock (high to low)</option>
          </select>
          <ChevronDown className={`w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${t.textMuted}`} />
        </div>
      </div>

      <div className={`rounded-2xl overflow-hidden ${t.cardBg}`}>
        <div
          className={`grid ${
            tab === "low-stock" ? "grid-cols-[2fr_1fr_1fr_1fr_1fr]" : "grid-cols-[2fr_1fr_1fr_1fr]"
          } px-6 py-4 text-sm font-semibold ${t.textSecondary} ${
            t.dark ? "border-b border-white/10" : "border-b border-slate-100"
          }`}
        >
          <span>Product</span>
          <span>Price</span>
          <span>Stock</span>
          {tab === "low-stock" && <span>Suggested Reorder</span>}
          <span className="text-right">Actions</span>
        </div>

        {filtered.length === 0 ? (
          <div className={`p-16 text-center ${t.textMuted}`}>No products found</div>
        ) : (
          filtered.map((p) => (
            <div
              key={p.id}
              className={`grid ${
                tab === "low-stock" ? "grid-cols-[2fr_1fr_1fr_1fr_1fr]" : "grid-cols-[2fr_1fr_1fr_1fr]"
              } items-center px-6 py-4 text-sm ${
                t.dark ? "border-b border-white/5 last:border-0" : "border-b border-slate-50 last:border-0"
              }`}
            >
              <div>
                <div className={`font-medium ${t.textPrimary}`}>{p.name}</div>
                <div className={`text-xs ${t.textMuted}`}>
                  {p.sku || "\u2014"} &middot; {p.category}
                </div>
              </div>
              <div className={t.textPrimary}>{money(Number(p.price), settings)}</div>
              <div className={p.stock <= (p.lowStockThreshold || 5) ? "text-orange-500 font-medium" : t.textPrimary}>
                {p.stock}
              </div>
              {tab === "low-stock" && (
                <div className="font-medium text-orange-500">+{suggestedReorder(p)}</div>
              )}
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setEditingProduct(p);
                    setShowModal(true);
                  }}
                  className={t.textSecondary}
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(p.id)} className="text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <ProductModal
          product={editingProduct}
          onClose={() => {
            setShowModal(false);
            setEditingProduct(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
