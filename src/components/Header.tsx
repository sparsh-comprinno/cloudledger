import { AppState } from "../types";
import { VscCloud } from "react-icons/vsc";

interface HeaderProps {
  appState: AppState;
  onReset: () => void;
}

export default function Header({ appState, onReset }: HeaderProps) {
  return (
    <header className="flex items-center justify-between pr-6 py-4 bg-dark-900 border-b border-dark-700" style={{ paddingLeft: '88px', WebkitAppRegion: 'drag' } as React.CSSProperties}>
      <div className="flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
          <VscCloud className="text-white text-xl" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">
            AWS Resource Inventory
          </h1>
          <p className="text-xs text-dark-400">
            Comprehensive cloud resource discovery & cost analysis
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              appState === "idle"
                ? "bg-dark-400"
                : appState === "scanning"
                ? "bg-yellow-400 animate-pulse"
                : appState === "completed"
                ? "bg-green-400"
                : "bg-red-400"
            }`}
          />
          <span className="text-sm text-dark-300 capitalize">{appState}</span>
        </div>

        {appState !== "idle" && (
          <button onClick={onReset} className="btn-secondary text-sm">
            New Scan
          </button>
        )}
      </div>
    </header>
  );
}
