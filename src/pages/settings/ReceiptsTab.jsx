import React from "react";
import { useThemeTokens } from "../../lib/ThemeContext";
import { useSettings } from "../../lib/SettingsContext";

export default function ReceiptsTab() {
  const t = useThemeTokens();
  const { settings, updateSettings } = useSettings();

  function set(field, value) {
    updateSettings({ [field]: value });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className={`rounded-2xl p-6 ${t.cardBg}`}>
        <h3 className={`font-semibold mb-4 ${t.textPrimary}`}>Receipt text</h3>

        <div className="mb-4">
          <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>Return policy</label>
          <textarea
            value={settings.returnPolicy}
            onChange={(e) => set("returnPolicy", e.target.value)}
            placeholder="e.g. Goods sold are not returnable except faulty within 7 days."
            rows={3}
            className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none resize-none ${t.inputBg}`}
          />
        </div>

        <div>
          <label className={`text-sm font-medium block mb-1.5 ${t.textPrimary}`}>Receipt footer</label>
          <textarea
            value={settings.receiptFooter}
            onChange={(e) => set("receiptFooter", e.target.value)}
            rows={3}
            className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none resize-none ${t.inputBg}`}
          />
        </div>

        <p className={`text-xs mt-4 ${t.textMuted}`}>Changes save automatically.</p>
      </div>

      <div className={`rounded-2xl p-6 ${t.cardBg}`}>
        <h3 className={`font-semibold mb-2 ${t.textPrimary}`}>WhatsApp repair message template</h3>
        <p className={`text-xs mb-3 ${t.textMuted}`}>
          Tokens: {"{{customer_name}}"}, {"{{ticket_no}}"}, {"{{device}}"}, {"{{status}}"}, {"{{repair_cost}}"},{" "}
          {"{{amount_paid}}"}, {"{{balance}}"}, {"{{shop_name}}"}, {"{{imei}}"}, {"{{serial_no}}"}. Wrap optional blocks in{" "}
          {"{{#balance}}"}...{"{{/balance}}"}.
        </p>
        <textarea
          value={settings.whatsappTemplate}
          onChange={(e) => set("whatsappTemplate", e.target.value)}
          placeholder="Leave blank to use the default template"
          rows={6}
          className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none resize-none ${t.inputBg}`}
        />
      </div>
    </div>
  );
}
