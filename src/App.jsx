import React, { useState, useEffect, Suspense, lazy } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, useThemeTokens } from "./lib/ThemeContext";
import { SettingsProvider } from "./lib/SettingsContext";
import { AuthProvider } from "./lib/AuthContext";
import { LicenseProvider, useLicense } from "./lib/LicenseContext";
import { HelpProvider, useHelp } from "./lib/HelpContext";
import { useAutoBackup } from "./lib/useAutoBackup";
import { useHqSync } from "./lib/useHqSync";
import Splash from "./components/Splash";
import Sidebar from "./components/Sidebar";
import MobileNav from "./components/MobileNav";
import MobileAppBar from "./components/MobileAppBar";
import RestrictedOverlay from "./components/RestrictedOverlay";
import ActivationModal from "./components/ActivationModal";
import TutorialModal from "./components/TutorialModal";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const SalesPage = lazy(() => import("./pages/SalesPage"));
const RepairsPage = lazy(() => import("./pages/RepairsPage"));
const InventoryPage = lazy(() => import("./pages/InventoryPage"));
const CustomersPage = lazy(() => import("./pages/CustomersPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const ActivityLogsPage = lazy(() => import("./pages/ActivityLogsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

// There is no sign-in here, so there are no roles to gate on: whoever has the
// browser tab has the shop. Kept as a component so the routes below read the
// same as the desktop app's, and so putting roles back is one file.
function Guard({ children }) {
  return children;
}

function Shell() {
  const t = useThemeTokens();
  const { restricted } = useLicense();
  const { open: helpOpen, dismiss: dismissHelp } = useHelp();
  const [showActivation, setShowActivation] = useState(false);
  useAutoBackup();
  useHqSync();

  return (
    <div className={`min-h-screen w-full flex ${t.bg}`}>
      <Sidebar onOpenActivation={() => setShowActivation(true)} />
      <MobileNav />
      <div className="flex-1 relative pb-16 md:pb-0 min-w-0">
        <MobileAppBar onOpenActivation={() => setShowActivation(true)} />
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Guard path="/"><DashboardPage /></Guard>} />
            <Route path="/sales" element={<Guard path="/sales"><SalesPage /></Guard>} />
            <Route path="/repairs" element={<Guard path="/repairs"><RepairsPage /></Guard>} />
            <Route path="/inventory" element={<Guard path="/inventory"><InventoryPage /></Guard>} />
            <Route path="/customers" element={<Guard path="/customers"><CustomersPage /></Guard>} />
            <Route path="/reports" element={<Guard path="/reports"><ReportsPage /></Guard>} />
            <Route path="/activity" element={<Guard path="/activity"><ActivityLogsPage /></Guard>} />
            <Route path="/settings" element={<Guard path="/settings"><SettingsPage /></Guard>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        {restricted && <RestrictedOverlay onClick={() => setShowActivation(true)} />}
      </div>
      {showActivation && <ActivationModal onClose={() => setShowActivation(false)} />}
      {helpOpen && <TutorialModal onClose={dismissHelp} />}
    </div>
  );
}

// No lock screen: the web app opens straight into the shop.
function Root() {
  return <Shell />;
}

export default function App() {
  const [showSplash, setShowSplash] = React.useState(true);

  return (
    <ThemeProvider>
      <SettingsProvider>
        <LicenseProvider>
          <AuthProvider>
            <HelpProvider>
              <HashRouter>
                {showSplash ? (
                  <Splash onDone={() => setShowSplash(false)} />
                ) : (
                  <Root />
                )}
              </HashRouter>
            </HelpProvider>
          </AuthProvider>
        </LicenseProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
