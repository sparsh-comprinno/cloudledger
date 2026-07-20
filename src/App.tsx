import { useState, useCallback, useEffect } from "react";
import {
  AwsCredentials,
  AwsResource,
  ScanProgress,
  ScanResult,
  CostData,
  AppState,
} from "./types";
import CredentialsForm from "./components/CredentialsForm";
import ProgressPanel from "./components/ProgressPanel";
import ResultsPanel from "./components/ResultsPanel";
import Header from "./components/Header";
import ExportBar from "./components/ExportBar";
import UpdateBanner from "./components/UpdateBanner";

declare global {
  interface Window {
    electronAPI: {
      startScan: (credentials: AwsCredentials) => Promise<ScanResult>;
      exportInventory: (data: { format: string; resources: AwsResource[]; costData: CostData | null }) => Promise<string>;
      onScanProgress: (callback: (progress: ScanProgress) => void) => () => void;
      onUpdateAvailable: (callback: (info: { version: string }) => void) => () => void;
      onUpdateDownloaded: (callback: (info: { version: string }) => void) => () => void;
      installUpdate: () => void;
    };
  }
}

function App() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [progress, setProgress] = useState<ScanProgress>({
    current_service: "",
    services_scanned: 0,
    total_services: 85,
    resources_found: 0,
    percentage: 0,
    log_message: "",
  });
  const [logs, setLogs] = useState<string[]>([]);
  const [resources, setResources] = useState<AwsResource[]>([]);
  const [costData, setCostData] = useState<CostData | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string>("");
  const [updateAvailable, setUpdateAvailable] = useState<string | null>(null);
  const [updateReady, setUpdateReady] = useState<string | null>(null);

  // Listen for auto-update events
  useEffect(() => {
    const unlistenAvailable = window.electronAPI?.onUpdateAvailable?.((info) => {
      setUpdateAvailable(info.version);
    });
    const unlistenDownloaded = window.electronAPI?.onUpdateDownloaded?.((info) => {
      setUpdateReady(info.version);
    });
    return () => {
      unlistenAvailable?.();
      unlistenDownloaded?.();
    };
  }, []);

  const startScan = useCallback(async (credentials: AwsCredentials) => {
    setAppState("scanning");
    setLogs([]);
    setResources([]);
    setCostData(null);
    setScanResult(null);
    setError("");

    const unlisten = window.electronAPI.onScanProgress((prog) => {
      setProgress(prog);
      if (prog.log_message) {
        setLogs((prev) => [...prev, prog.log_message]);
      }
    });

    try {
      const result = await window.electronAPI.startScan(credentials);
      setResources(result.resources);
      setCostData(result.cost_data);
      setScanResult(result);
      setAppState("completed");
    } catch (err) {
      setError(String(err));
      setAppState("error");
    } finally {
      unlisten();
    }
  }, []);

  const handleExport = useCallback(
    async (format: string) => {
      try {
        const filePath = await window.electronAPI.exportInventory({
          format,
          resources,
          costData,
        });
        setLogs((prev) => [...prev, `✅ Exported to: ${filePath}`]);
      } catch (err) {
        setError(`Export failed: ${String(err)}`);
      }
    },
    [resources, costData]
  );

  const handleReset = useCallback(() => {
    setAppState("idle");
    setProgress({
      current_service: "",
      services_scanned: 0,
      total_services: 85,
      resources_found: 0,
      percentage: 0,
      log_message: "",
    });
    setLogs([]);
    setResources([]);
    setCostData(null);
    setScanResult(null);
    setError("");
  }, []);

  return (
    <div className="h-screen flex flex-col bg-dark-950 text-white overflow-hidden">
      {/* Auto-update banner */}
      {(updateAvailable || updateReady) && (
        <UpdateBanner
          version={updateReady || updateAvailable || ""}
          ready={!!updateReady}
          onInstall={() => window.electronAPI.installUpdate()}
        />
      )}

      <Header appState={appState} onReset={handleReset} />

      <div className="flex-1 flex flex-col overflow-hidden px-4 pb-4 gap-4">
        {appState === "idle" && <CredentialsForm onSubmit={startScan} />}

        {appState === "scanning" && (
          <ProgressPanel progress={progress} logs={logs} />
        )}

        {(appState === "completed" || appState === "error") && (
          <>
            {error && (
              <div className="card border-red-800 bg-red-950/30">
                <p className="text-red-400 font-medium">⚠️ {error}</p>
              </div>
            )}
            {scanResult && (
              <ResultsPanel
                resources={resources}
                costData={costData}
                scanResult={scanResult}
              />
            )}
          </>
        )}
      </div>

      {appState === "completed" && resources.length > 0 && (
        <ExportBar onExport={handleExport} />
      )}
    </div>
  );
}

export default App;
