import React from "react";
import { useSearchParams } from "react-router-dom";
import Topbar from "../components/Topbar";
import { useThemeTokens } from "../lib/ThemeContext";
import ShopTab from "./settings/ShopTab";
import ReceiptsTab from "./settings/ReceiptsTab";
import DeviceTab from "./settings/DeviceTab";
import ConnectHqTab from "./settings/ConnectHqTab";
import DeveloperTab from "./settings/DeveloperTab";

const TABS = [
  { key: "shop", label: "Shop", Component: ShopTab },
  { key: "receipts", label: "Receipts", Component: ReceiptsTab },
  { key: "device", label: "Device", Component: DeviceTab },
  { key: "hq", label: "Connect to HQ", Component: ConnectHqTab },
  { key: "developer", label: "Developer", Component: DeveloperTab },
];

export default function SettingsPage() {
  const t = useThemeTokens();
  // The tab lives in the URL so search can land on one directly -- a result
  // for "Connect to HQ" that dropped you on Shop to go hunting for it would
  // not be much of a result. It also makes Back step between tabs, which is
  // what the button appears to promise.
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab");
  const tab = TABS.some((x) => x.key === requested) ? requested : "shop";
  const Active = TABS.find((x) => x.key === tab)?.Component || ShopTab;

  function selectTab(key) {
    // replace: clicking through five tabs should not mean five taps of Back
    // to leave Settings.
    setParams(key === "shop" ? {} : { tab: key }, { replace: true });
  }

  return (
    <div className="flex-1 p-4 md:p-8">
      <Topbar title="Settings" />

      {/* Six tabs don't fit a phone, so the strip scrolls sideways. */}
      <div className="-mx-4 md:mx-0 px-4 md:px-0 mb-6 overflow-x-auto">
      <div className={`inline-flex rounded-xl p-1 ${t.dark ? "bg-white/5" : "bg-slate-100"}`}>
        {TABS.map((x) => (
          <button
            key={x.key}
            onClick={() => selectTab(x.key)}
            className={`px-4 md:px-5 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              tab === x.key
                ? t.dark
                  ? "bg-white text-black"
                  : "bg-white text-slate-900 shadow-sm"
                : t.textSecondary
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>
      </div>

      <Active />
    </div>
  );
}
