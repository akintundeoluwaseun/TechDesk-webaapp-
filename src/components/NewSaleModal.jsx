import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Search, Plus, Minus, Trash2 } from "lucide-react";
import { useThemeTokens } from "../lib/ThemeContext";
import { useAuth } from "../lib/AuthContext";
import { db } from "../lib/db";
import { currencySymbol, money } from "../lib/currency";
import { useSettings } from "../lib/SettingsContext";

const PAYMENT_METHODS = ["Cash", "Bank Transfer", "POS", "Transfer + Cash"];

export default function NewSaleModal({ sale, onClose, onCompleted }) {
  const t = useThemeTokens();
  const { settings } = useSettings();
  const { user } = useAuth();
  const isEdit = !!sale;
  const [tab, setTab] = useState("inventory"); // inventory | manual

  const [productSearch, setProductSearch] = useState("");
  const productSearchRef = useRef(null);
  const inventory = db.getInventory();

  // manual (not-in-inventory) form
  const [manualName, setManualName] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [manualQty, setManualQty] = useState("1");
  const [manualCategory, setManualCategory] = useState("");

  const [cart, setCart] = useState(() =>
    isEdit
      ? sale.items.map((i) => ({
          id: db.uid("item"),
          productId: i.productId,
          name: i.name,
          price: i.price,
          // Editing a sale must not rewrite what it cost at the time.
          costPrice: Number(i.costPrice || 0),
          qty: i.qty,
          fromInventory: i.fromInventory,
          imei: i.imei || "",
        }))
      : []
  );

  const [customerSearch, setCustomerSearch] = useState("");
  const [custName, setCustName] = useState(isEdit ? sale.customerName || "" : "");
  const [custPhone, setCustPhone] = useState(isEdit ? sale.customerPhone || "" : "");
  const [custEmail, setCustEmail] = useState(isEdit ? sale.customerEmail || "" : "");
  const [custAddress, setCustAddress] = useState(isEdit ? sale.customerAddress || "" : "");

  const [payment, setPayment] = useState(isEdit ? sale.paymentMethod || "Cash" : "Cash");
  const [discount, setDiscount] = useState(isEdit ? String(sale.discount || 0) : "0");
  const [amountPaid, setAmountPaid] = useState(isEdit ? String(sale.amountPaid || 0) : "0");


  const filteredInventory = useMemo(() => {
    if (!productSearch) return inventory;
    const q = productSearch.toLowerCase();
    return inventory.filter((p) => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));
  }, [inventory, productSearch]);

  // when editing, the units this sale originally sold were already deducted
  // from stock, so they're still available for this cart to re-claim
  const originalQtyByProduct = useMemo(() => {
    if (!isEdit) return {};
    const map = {};
    (sale.items || []).forEach((i) => {
      if (i.fromInventory && i.productId) {
        map[i.productId] = (map[i.productId] || 0) + Number(i.qty || 0);
      }
    });
    return map;
  }, [isEdit, sale]);

  function availableStock(productId) {
    const product = inventory.find((p) => p.id === productId);
    if (!product) return 0;
    return Number(product.stock || 0) + (originalQtyByProduct[productId] || 0);
  }

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return [];
    const customers = db.getCustomers();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone.includes(customerSearch)
    );
  }, [customerSearch]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const total = Math.max(0, subtotal - (Number(discount) || 0));

  function addInventoryItem(product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      const currentQty = existing?.qty || 0;
      if (currentQty + 1 > availableStock(product.id)) return prev;
      if (existing) {
        return prev.map((i) => (i.productId === product.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [
        ...prev,
        {
          id: db.uid("item"),
          productId: product.id,
          name: product.name,
          price: product.price,
          // What it cost the shop on the day it was sold. Kept on the sale
          // because the report used to look the cost up in today's
          // inventory, so re-pricing a product silently rewrote the profit
          // on every sale of it that had already happened.
          costPrice: Number(product.costPrice || 0),
          qty: 1,
          fromInventory: true,
          imei: "",
        },
      ];
    });
  }

  function addManualItem() {
    if (!manualName || !manualPrice) return;
    setCart((prev) => [
      ...prev,
      {
        id: db.uid("item"),
        productId: null,
        name: manualName,
        price: Number(manualPrice) || 0,
        qty: Number(manualQty) || 1,
        category: manualCategory,
        fromInventory: false,
      },
    ]);
    setManualName("");
    setManualPrice("");
    setManualQty("1");
    setManualCategory("");
  }

  function updateQty(itemId, delta) {
    setCart((prev) =>
      prev.map((i) => {
        if (i.id !== itemId) return i;
        const nextQty = Math.max(1, i.qty + delta);
        if (delta > 0 && i.fromInventory && nextQty > availableStock(i.productId)) return i;
        return { ...i, qty: nextQty };
      })
    );
  }

  function updateImei(itemId, value) {
    setCart((prev) => prev.map((i) => (i.id === itemId ? { ...i, imei: value } : i)));
  }

  function removeItem(itemId) {
    setCart((prev) => prev.filter((i) => i.id !== itemId));
  }

  // Handles both a barcode scanner (which just types the SKU fast and
  // sends Enter) and a cashier typing a SKU by hand: an exact SKU match
  // adds straight to cart without needing a click, since scanning several
  // items in a row shouldn't require touching the mouse at all.
  function handleProductSearchKeyDown(e) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const q = productSearch.trim().toLowerCase();
    if (!q) return;
    const skuMatch = inventory.find((p) => p.sku && p.sku.toLowerCase() === q);
    const match = skuMatch || (filteredInventory.length === 1 ? filteredInventory[0] : null);
    if (!match) return;
    const cartQty = cart.find((i) => i.productId === match.id)?.qty || 0;
    if (cartQty >= availableStock(match.id)) return;
    addInventoryItem(match);
    setProductSearch("");
  }

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        onClose?.();
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && cart.length > 0) {
        e.preventDefault();
        completeSale();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, custName, custPhone, custEmail, custAddress, payment, discount, amountPaid]);

  function selectCustomer(c) {
    setCustName(c.name);
    setCustPhone(c.phone);
    setCustEmail(c.email);
    setCustAddress(c.address);
    setCustomerSearch("");
  }

  function completeSale() {
    if (cart.length === 0) return;
    const customer = db.findOrCreateCustomer({
      name: custName || "Walk-in",
      phone: custPhone,
      email: custEmail,
      address: custAddress,
    });

    const payload = {
      items: cart.map((i) => ({
        productId: i.productId,
        name: i.name,
        price: i.price,
        qty: i.qty,
        imei: i.imei || "",
        fromInventory: i.fromInventory,
      })),
      customerId: customer?.id || null,
      customerName: customer?.name || "Walk-in",
      customerPhone: customer?.phone || "",
      customerEmail: customer?.email || "",
      customerAddress: customer?.address || "",
      subtotal,
      discount: Number(discount) || 0,
      total,
      amountPaid: Number(amountPaid) || 0,
      paymentMethod: payment,
      paymentStatus: (Number(amountPaid) || 0) >= total && total > 0 ? "Paid" : "Pending",
    };

    if (isEdit) {
      db.reconcileInventoryForEdit(sale.items, payload.items);
      const updated = db.updateSale(sale.id, payload);
      db.logActivity({
        type: "sale",
        message: `Sale ${sale.invoice} edited`,
        refId: sale.id,
        actor: user?.name,
      });
      onCompleted?.(updated);
      return;
    }

    const record = db.createSale(payload);
    db.logActivity({ type: "sale", message: `New sale ${record.invoice} created`, refId: record.id, actor: user?.name });
    onCompleted?.(record);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-6 overflow-y-auto">
      <div className={`w-full max-w-xl rounded-2xl mt-10 mb-10 ${t.dark ? "bg-[#1a1a2e]/80 backdrop-blur-lg border border-white/10" : "bg-white/35 backdrop-blur-lg backdrop-brightness-90 border border-white/50"}`}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className={`text-xl font-bold ${t.textPrimary}`}>{isEdit ? "Edit Sale" : "New Sale"}</h2>
          <button onClick={onClose} className={t.textMuted}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6">
          <div className={`flex rounded-xl p-1 mb-5 ${t.dark ? "bg-white/5" : "bg-slate-100"}`}>
            <button
              onClick={() => setTab("inventory")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === "inventory"
                  ? t.dark
                    ? "bg-white text-black"
                    : "bg-white text-slate-900 shadow-sm"
                  : t.textSecondary
              }`}
            >
              Inventory
            </button>
            <button
              onClick={() => setTab("manual")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === "manual"
                  ? t.dark
                    ? "bg-white text-black"
                    : "bg-white text-slate-900 shadow-sm"
                  : t.textSecondary
              }`}
            >
              Not in inventory
            </button>
          </div>

          {tab === "inventory" ? (
            <div className="mb-5">
              <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 mb-3 ${t.inputBg}`}>
                <Search className={`w-4 h-4 ${t.textMuted}`} />
                <input
                  ref={productSearchRef}
                  autoFocus
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  onKeyDown={handleProductSearchKeyDown}
                  placeholder="Search products, or scan a barcode/SKU..."
                  className="bg-transparent outline-none text-sm flex-1"
                />
              </div>
              <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
                {filteredInventory.length === 0 && (
                  <div className={`text-sm text-center py-6 ${t.textMuted}`}>No products found</div>
                )}
                {filteredInventory.map((p) => {
                  const cartQty = cart.find((i) => i.productId === p.id)?.qty || 0;
                  const remaining = availableStock(p.id) - cartQty;
                  const outOfStock = remaining <= 0;
                  return (
                    <button
                      key={p.id}
                      onClick={() => addInventoryItem(p)}
                      disabled={outOfStock}
                      className={`flex items-center justify-between rounded-xl px-4 py-3 text-left ${t.cardBg} ${
                        outOfStock ? "opacity-40 cursor-not-allowed" : ""
                      }`}
                    >
                      <div>
                        <div className={`font-medium text-sm ${t.textPrimary}`}>{p.name}</div>
                        <div className={`text-xs ${t.textMuted}`}>
                          {p.sku ? `${p.sku} · ` : ""}
                          {outOfStock ? "Out of stock" : `Stock: ${remaining}`}
                        </div>
                      </div>
                      <div className={`font-semibold text-sm ${t.textPrimary}`}>
                        {money(Number(p.price), settings)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mb-5 flex flex-col gap-4">
              <p className={`text-xs ${t.textSecondary}`}>
                Sell an item that isn't in your inventory. It won't affect stock levels.
              </p>
              <div>
                <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>Item name</label>
                <input
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="e.g. Screen replacement glass"
                  className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none ${t.inputBg}`}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>Price</label>
                  <input
                    type="number"
                    value={manualPrice}
                    onChange={(e) => setManualPrice(e.target.value)}
                    placeholder="0"
                    className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none ${t.inputBg}`}
                  />
                </div>
                <div>
                  <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>Quantity</label>
                  <input
                    type="number"
                    value={manualQty}
                    onChange={(e) => setManualQty(e.target.value)}
                    placeholder="1"
                    className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none ${t.inputBg}`}
                  />
                </div>
              </div>
              <div>
                <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>Category (optional)</label>
                <input
                  value={manualCategory}
                  onChange={(e) => setManualCategory(e.target.value)}
                  placeholder="phone, laptop, accessory..."
                  className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none ${t.inputBg}`}
                />
              </div>
              <button
                onClick={addManualItem}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold ${
                  t.dark ? "bg-white text-black" : "bg-slate-900 text-white"
                }`}
              >
                <Plus className="w-4 h-4" /> Add to cart
              </button>
            </div>
          )}

          {/* Cart */}
          <div className={`rounded-xl p-4 mb-5 ${t.cardBg}`}>
            <div className={`font-semibold text-sm mb-3 ${t.textPrimary}`}>Cart ({cart.length} items)</div>
            {cart.length === 0 ? (
              <div className={`text-sm text-center py-6 ${t.textMuted}`}>No items added</div>
            ) : (
              <div className="flex flex-col gap-4">
                {cart.map((item) => (
                  <div key={item.id}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className={`text-sm font-medium ${t.textPrimary}`}>{item.name}</div>
                        <div className={`text-xs ${t.textMuted}`}>
                          {money(item.price, settings)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => updateQty(item.id, -1)} className={t.textSecondary}>
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className={`text-sm font-medium w-4 text-center ${t.textPrimary}`}>{item.qty}</span>
                        <button
                          onClick={() => updateQty(item.id, 1)}
                          disabled={item.fromInventory && item.qty >= availableStock(item.productId)}
                          className={`${t.textSecondary} ${
                            item.fromInventory && item.qty >= availableStock(item.productId)
                              ? "opacity-30 cursor-not-allowed"
                              : ""
                          }`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button onClick={() => removeItem(item.id)} className="text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {item.fromInventory && (
                      <div className="mt-2">
                        <label className={`text-xs font-medium block mb-1 ${t.textPrimary}`}>
                          IMEI / Serial number
                        </label>
                        <input
                          value={item.imei}
                          onChange={(e) => updateImei(item.id, e.target.value)}
                          placeholder="IMEI / serial number"
                          className={`w-full rounded-lg px-3 py-2 text-xs outline-none ${t.inputBg}`}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer */}
          <div className={`rounded-xl p-4 mb-5 ${t.cardBg}`}>
            <div className={`font-semibold text-sm mb-3 ${t.textPrimary}`}>Customer</div>
            <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 mb-3 ${t.inputBg}`}>
              <Search className={`w-4 h-4 ${t.textMuted}`} />
              <input
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search existing by name or phone..."
                className="bg-transparent outline-none text-sm flex-1"
              />
            </div>
            {filteredCustomers.length > 0 && (
              <div className="flex flex-col gap-1 mb-3">
                {filteredCustomers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => selectCustomer(c)}
                    className={`text-left px-3 py-2 rounded-lg text-sm ${t.dark ? "hover:bg-white/5" : "hover:bg-slate-50"}`}
                  >
                    <span className={t.textPrimary}>{c.name}</span>{" "}
                    <span className={t.textMuted}>{c.phone}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>Name</label>
                <input
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder="Walk-in"
                  className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none ${t.inputBg}`}
                />
              </div>
              <div>
                <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>Phone</label>
                <input
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  placeholder="For receipt"
                  className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none ${t.inputBg}`}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>Email</label>
                <input
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                  placeholder="Optional"
                  className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none ${t.inputBg}`}
                />
              </div>
              <div>
                <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>Address</label>
                <input
                  value={custAddress}
                  onChange={(e) => setCustAddress(e.target.value)}
                  placeholder="Optional"
                  className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none ${t.inputBg}`}
                />
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>Payment</label>
              <select
                value={payment}
                onChange={(e) => setPayment(e.target.value)}
                className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none ${t.inputBg}`}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>Discount ({currencySymbol(settings)})</label>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0"
                className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none ${t.inputBg}`}
              />
            </div>
          </div>

          <div className="mb-5">
            <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>Amount Paid ({currencySymbol(settings)})</label>
            <input
              type="number"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              placeholder="0"
              className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none ${t.inputBg}`}
            />
          </div>

          <div className={`rounded-xl p-4 mb-5 ${t.cardBg}`}>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className={t.textSecondary}>Subtotal</span>
              <span className={t.textPrimary}>{money(subtotal, settings)}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className={`font-bold ${t.textPrimary}`}>Total</span>
              <span className={`font-bold ${t.textPrimary}`}>{money(total, settings)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className={t.textSecondary}>Paid</span>
              <span className={t.textPrimary}>{money((Number(amountPaid) || 0), settings)}</span>
            </div>
          </div>

          <button
            onClick={completeSale}
            disabled={cart.length === 0}
            title="Ctrl/Cmd + Enter"
            className={`w-full py-3 rounded-xl font-semibold mb-2 disabled:opacity-50 ${
              t.dark ? "bg-white text-black" : "bg-slate-900 text-white"
            }`}
          >
            {isEdit ? "Save Changes" : "Complete Sale"}
          </button>
          <div className={`text-center text-xs mb-6 ${t.textMuted}`}>
            Ctrl/Cmd + Enter to complete &middot; Esc to close
          </div>
        </div>
      </div>
    </div>
  );
}
