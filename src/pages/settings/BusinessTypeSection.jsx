import React, { useState } from "react";
import { Plus, X, ChevronDown } from "lucide-react";
import { useThemeTokens } from "../../lib/ThemeContext";
import { useSettings } from "../../lib/SettingsContext";
import { BUSINESS_PRESETS } from "../../data/businessPresets";

const LABEL_FIELDS = [
  ["navRepairs", "Menu name (e.g. Repairs / Services)"],
  ["ticketSingular", "Job, singular (e.g. Repair / Service)"],
  ["ticketPlural", "Job, plural"],
  ["ticketTitle", "Printed ticket title"],
  ["itemLabel", "What you work on (e.g. Device / Vehicle / Unit)"],
  ["itemBrandLabel", "Brand/model field label"],
  ["serialLabel", "Serial field label"],
  ["idLabel", "Secondary ID field label (e.g. IMEI / VIN / Plate No.)"],
  ["problemLabel", "Problem field label"],
  ["diagnosisLabel", "Diagnosis field label"],
];

export default function BusinessTypeSection() {
  const t = useThemeTokens();
  const { settings, updateSettings } = useSettings();
  const [showCustomize, setShowCustomize] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  function applyPreset(key) {
    const preset = BUSINESS_PRESETS[key];
    if (!preset) return;
    const { label, defaultCategories, ...labels } = preset;
    updateSettings({ businessType: key, labels, categories: defaultCategories });
  }

  function setLabel(field, value) {
    updateSettings({ labels: { ...settings.labels, [field]: value } });
  }

  function addCategory() {
    const name = newCategory.trim();
    if (!name || settings.categories.includes(name)) return;
    updateSettings({ categories: [...settings.categories, name] });
    setNewCategory("");
  }

  function removeCategory(name) {
    updateSettings({ categories: settings.categories.filter((c) => c !== name) });
  }

  // No card, no heading: this renders inside SettingsModal, which supplies
  // both. Rendering its own would put a title under a title.
  return (
    <div>
      <div className="relative mb-5">
        <select
          value={settings.businessType || "general"}
          onChange={(e) => applyPreset(e.target.value)}
          className={`w-full rounded-xl px-4 py-3 text-sm font-medium outline-none appearance-none ${t.inputBg}`}
        >
          {Object.entries(BUSINESS_PRESETS).map(([key, preset]) => (
            <option key={key} value={key}>
              {preset.label}
            </option>
          ))}
        </select>
        <ChevronDown className={`w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${t.textMuted}`} />
      </div>

      <button onClick={() => setShowCustomize((s) => !s)} className={`text-sm font-medium mb-4 ${t.textSecondary} underline`}>
        {showCustomize ? "Hide custom terms" : "Customize individual terms"}
      </button>

      {showCustomize && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
          {LABEL_FIELDS.map(([field, hint]) => (
            <div key={field}>
              <label className={`text-xs font-medium block mb-1.5 ${t.textPrimary}`}>{hint}</label>
              <input
                value={settings.labels[field] || ""}
                onChange={(e) => setLabel(field, e.target.value)}
                className={`w-full rounded-xl px-3 py-2 text-sm outline-none ${t.inputBg}`}
              />
            </div>
          ))}
        </div>
      )}

      <div className={`mt-5 pt-5 ${t.dark ? "border-t border-white/10" : "border-t border-white/50"}`}>
        <h4 className={`text-sm font-semibold mb-1 ${t.textPrimary}`}>Inventory categories</h4>
        <p className={`text-xs mb-3 ${t.textMuted}`}>Shown when adding or filtering products.</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {settings.categories.map((c) => (
            <span
              key={c}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${t.pillBg}`}
            >
              {c}
              <button onClick={() => removeCategory(c)} className={t.textMuted}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCategory()}
            placeholder="Add category..."
            className={`flex-1 rounded-xl px-3 py-2 text-sm outline-none ${t.inputBg}`}
          />
          <button onClick={addCategory} className={`p-2.5 rounded-xl ${t.pillBg}`}>
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
