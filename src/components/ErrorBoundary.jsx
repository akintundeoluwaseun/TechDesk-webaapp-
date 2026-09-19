import React from "react";
import { AlertTriangle } from "lucide-react";

// Catches render/lifecycle errors anywhere below it so one bad component
// can't blank the whole screen mid-sale -- shows a restart button instead.
// Deliberately doesn't use theme tokens: if the crash was in ThemeProvider
// itself, this still has to render something usable.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("TechDesk crashed:", error, info);
  }

  handleRestart = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 p-6 text-center shadow-lg">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <h1 className="text-lg font-bold text-slate-900 mb-1">Something went wrong</h1>
          <p className="text-sm text-slate-500 mb-5">
            TechDesk hit an unexpected error. Your saved data is safe on this device -- restarting the app should
            fix it.
          </p>
          <button
            onClick={this.handleRestart}
            className="w-full py-3 rounded-xl font-semibold bg-slate-900 text-white"
          >
            Restart
          </button>
        </div>
      </div>
    );
  }
}
