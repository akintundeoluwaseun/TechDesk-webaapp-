import React, { useRef, useState } from "react";
import { Sun, Moon, Monitor as MonitorIcon, Upload } from "lucide-react";
import { useTheme, useThemeTokens } from "../../lib/ThemeContext";
import { useSettings } from "../../lib/SettingsContext";
import { shrinkImage } from "../../lib/shrinkImage";
import BusinessTypeSection from "./BusinessTypeSection";
import SettingsModal, { SettingsRow } from "../../components/SettingsModal";
import { BUSINESS_PRESETS } from "../../data/businessPresets";
import { CURRENCIES, DEFAULT_CURRENCY, money } from "../../lib/currency";

const APPEARANCE_OPTIONS = [
  { key: "light", label: "Light", icon: Sun },
  { key: "dark", label: "Dark", icon: Moon },
  { key: "system", label: "System", icon: MonitorIcon },
];

export default function ShopTab() {
  const t = useThemeTokens();
  const { dark, toggleDark } = useTheme();
  const { settings, updateSettings } = useSettings();
  const fileRef = useRef(null);
  // Which section is open, or null. One at a time: these are separate
  // decisions and stacking them would bury the one being made.
  const [openSection, setOpenSection] = useState(null);

  function set(field, value) {
    updateSettings({ [field]: value });
  }

  function selectAppearance(mode) {
    set("appearance", mode);
    if (mode === "dark" && !dark) toggleDark();
    if (mode === "light" && dark) toggleDark();
    if (mode === "system") {
      const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
      if (prefersDark !== dark) toggleDark();
    }
  }

  const currentPresetLabel =
    BUSINESS_PRESETS[settings.businessType || "general"]?.label || "Electronics Repair";

  const currentAppearance = settings.appearance || (dark ? "dark" : "light");
  const currentAppearanceLabel =
    APPEARANCE_OPTIONS.find((o) => o.key === currentAppearance)?.label || "Light";

  function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    // Shrunk before it is stored: the logo is copied into every receipt and
    // every backup, and a photo straight off a phone would make each one
    // several megabytes.
    reader.onload = async () => set("logo", await shrinkImage(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex flex-col gap-5">
      <SettingsRow
        title="Business type"
        description="The trade you are in, the wording used throughout the app, and your inventory categories."
        value={`${currentPresetLabel} \u00b7 ${(settings.categories || []).length} categories`}
        onOpen={() => setOpenSection("businessType")}
      />

      <SettingsRow
        title="Appearance"
        description="Light, dark, or whatever this computer is set to."
        value={currentAppearanceLabel}
        onOpen={() => setOpenSection("appearance")}
      />

      <div className={`rounded-2xl p-6 ${t.cardBg}`}>
        <h3 className={`font-semibold mb-1 ${t.textPrimary}`}>Currency</h3>
        <p className={`text-sm mb-4 ${t.textSecondary}`}>
          Used everywhere money appears &mdash; sales, inventory, repairs, reports, receipts and
          the messages you send customers. Changing it re-labels existing figures; it does not
          convert them.
        </p>
        <select
          id="shop-currency"
          value={settings.currency || DEFAULT_CURRENCY}
          onChange={(e) => updateSettings({ currency: e.target.value })}
          className={`w-full sm:w-80 rounded-xl px-3 py-2.5 text-sm outline-none ${
            t.dark ? "bg-white/5 border border-white/10 text-white" : "bg-slate-50 border border-slate-200 text-slate-900"
          }`}
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.symbol}  {c.name} ({c.code})
            </option>
          ))}
        </select>
        <p className={`text-xs mt-3 ${t.textMuted}`}>
          Prices show as {money(45000, settings)}.
        </p>
      </div>

      <div className={`rounded-2xl p-6 ${t.cardBg}`}>
        <h3 className={`font-semibold mb-1 ${t.textPrimary}`}>Shop details (used on receipts)</h3>

        <div className="mt-4 mb-4">
          <label className={`text-sm font-medium block mb-2 ${t.textPrimary}`}>Shop logo</label>
          <div className="flex items-center gap-4">
            <div
              className={`w-16 h-16 rounded-xl flex items-center justify-center text-xs overflow-hidden ${
                t.dark ? "border border-white/10" : "border border-slate-200"
              } ${t.textMuted}`}
            >
              {settings.logo ? (
                <img src={settings.logo} alt="Shop logo" className="w-full h-full object-cover" />
              ) : (
                "No logo"
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium ${t.pillBg}`}
            >
              <Upload className="w-4 h-4" /> Upload image
            </button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleLogoUpload} />
          </div>
          <p className={`text-xs mt-2 ${t.textMuted}`}>PNG or JPG, max 1.5MB. Stored on this device.</p>
        </div>

        <div className="mb-4">
          <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>Shop name</label>
          <input
            value={settings.shopName}
            onChange={(e) => set("shopName", e.target.value)}
            className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none ${t.inputBg}`}
          />
        </div>

        <div className="mb-4">
          <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>Address</label>
          <input
            value={settings.address}
            onChange={(e) => set("address", e.target.value)}
            className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none ${t.inputBg}`}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>Phone</label>
            <input
              value={settings.phone}
              onChange={(e) => set("phone", e.target.value)}
              className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none ${t.inputBg}`}
            />
          </div>
          <div>
            <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>Email</label>
            <input
              value={settings.email}
              onChange={(e) => set("email", e.target.value)}
              className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none ${t.inputBg}`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>Website</label>
            <input
              value={settings.website}
              onChange={(e) => set("website", e.target.value)}
              placeholder="techdesk.ng"
              className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none ${t.inputBg}`}
            />
          </div>
          <div>
            <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>Tax / VAT ID</label>
            <input
              value={settings.taxId}
              onChange={(e) => set("taxId", e.target.value)}
              className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none ${t.inputBg}`}
            />
          </div>
        </div>

        <h4 className={`text-sm font-semibold mt-2 mb-3 ${t.textPrimary}`}>Bank details (for transfer payments)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>Bank name</label>
            <input
              value={settings.bankName}
              onChange={(e) => set("bankName", e.target.value)}
              className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none ${t.inputBg}`}
            />
          </div>
          <div>
            <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>Account number</label>
            <input
              value={settings.accountNumber}
              onChange={(e) => set("accountNumber", e.target.value)}
              className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none ${t.inputBg}`}
            />
          </div>
        </div>

        <div>
          <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>Account name</label>
          <input
            value={settings.accountName}
            onChange={(e) => set("accountName", e.target.value)}
            className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none ${t.inputBg}`}
          />
        </div>

        <p className={`text-xs mt-4 ${t.textMuted}`}>Changes save automatically.</p>
      </div>
      {openSection === "businessType" && (
        <SettingsModal
          title="Business type"
          description="TechDesk works for any repair trade, not just phones and laptops. Pick the closest fit — this changes wording throughout the app (tickets, forms, receipts), and you can fine-tune any term afterwards."
          onClose={() => setOpenSection(null)}
        >
          <BusinessTypeSection />
        </SettingsModal>
      )}

      {openSection === "appearance" && (
        <SettingsModal
          title="Appearance"
          description="Applies straight away, and to this computer only."
          onClose={() => setOpenSection(null)}
        >
          <div className="flex flex-wrap items-center gap-3">
            {APPEARANCE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = currentAppearance === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => selectAppearance(opt.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                    active ? (t.dark ? "bg-white text-black" : "bg-slate-900 text-white") : t.pillBg
                  }`}
                >
                  <Icon className="w-4 h-4" /> {opt.label}
                </button>
              );
            })}
          </div>
        </SettingsModal>
      )}

    </div>
  );
}
