import { useEffect, useRef } from "react";
import { ScanProgress } from "../types";

interface ProgressPanelProps {
  progress: ScanProgress;
  logs: string[];
}

export default function ProgressPanel({ progress, logs }: ProgressPanelProps) {
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="flex-1 flex flex-col gap-4 overflow-hidden">
      {/* Progress Stats */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-dark-300">
              Scanning Services
            </h3>
            <p className="text-lg font-bold text-white">
              {progress.current_service}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary-400">
              {progress.resources_found}
            </p>
            <p className="text-xs text-dark-400">resources found</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative">
          <div className="w-full h-3 bg-dark-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-dark-400">
              {progress.services_scanned} / {progress.total_services} services
            </span>
            <span className="text-xs text-dark-400">
              {progress.percentage.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Scan Log */}
      <div className="card flex-1 flex flex-col overflow-hidden">
        <h3 className="text-sm font-medium text-dark-300 mb-3">Scan Log</h3>
        <div className="flex-1 overflow-y-auto bg-dark-950 rounded-lg p-3 font-mono text-xs space-y-1">
          {logs.map((log, i) => (
            <div
              key={i}
              className={`${
                log.includes("ERROR") || log.includes("⚠")
                  ? "text-red-400"
                  : log.includes("✓") || log.includes("✅")
                  ? "text-green-400"
                  : "text-dark-300"
              }`}
            >
              <span className="text-dark-600 mr-2">
                [{new Date().toLocaleTimeString()}]
              </span>
              {log}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}
