import { useState, useMemo } from "react";
import { AwsResource, CostData, ScanResult } from "../types";
import {
  VscTable,
  VscGraph,
  VscListFlat,
  VscSearch,
} from "react-icons/vsc";

interface ResultsPanelProps {
  resources: AwsResource[];
  costData: CostData | null;
  scanResult: ScanResult;
}

type Tab = "summary" | "detailed" | "costs";

export default function ResultsPanel({
  resources,
  costData,
  scanResult,
}: ResultsPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("summary");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<keyof AwsResource>("service");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Summary data grouped by service
  const summary = useMemo(() => {
    const grouped: Record<string, { count: number; cost: number }> = {};
    resources.forEach((r) => {
      if (!grouped[r.service]) grouped[r.service] = { count: 0, cost: 0 };
      grouped[r.service].count++;
      grouped[r.service].cost += r.monthly_cost || 0;
    });
    return Object.entries(grouped)
      .map(([service, data]) => ({ service, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [resources]);

  // Filtered and sorted resources
  const filteredResources = useMemo(() => {
    let filtered = resources;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = resources.filter(
        (r) =>
          r.service.toLowerCase().includes(q) ||
          r.resource_type.toLowerCase().includes(q) ||
          r.resource_id.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.status.toLowerCase().includes(q)
      );
    }
    return [...filtered].sort((a, b) => {
      const aVal = String(a[sortField] || "");
      const bVal = String(b[sortField] || "");
      return sortDir === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    });
  }, [resources, searchQuery, sortField, sortDir]);

  const handleSort = (field: keyof AwsResource) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "summary", label: "Summary", icon: <VscListFlat /> },
    { id: "detailed", label: "All Resources", icon: <VscTable /> },
    { id: "costs", label: "Cost Analysis", icon: <VscGraph /> },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="card text-center py-3">
          <p className="text-2xl font-bold text-primary-400">
            {scanResult.total_resources}
          </p>
          <p className="text-xs text-dark-400">Total Resources</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-2xl font-bold text-green-400">
            {scanResult.services_scanned}
          </p>
          <p className="text-xs text-dark-400">Services Scanned</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-2xl font-bold text-yellow-400">
            ${costData?.total_monthly_cost?.toFixed(2) || "N/A"}
          </p>
          <p className="text-xs text-dark-400">Monthly Cost</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-2xl font-bold text-blue-400">
            {scanResult.scan_duration_seconds.toFixed(1)}s
          </p>
          <p className="text-xs text-dark-400">Scan Duration</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 bg-dark-900 border border-dark-700 rounded-lg p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-all ${
              activeTab === tab.id
                ? "bg-primary-600 text-white shadow"
                : "text-dark-400 hover:text-white hover:bg-dark-700"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "summary" && (
          <div className="card h-full overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-dark-900">
                <tr className="text-left border-b border-dark-700">
                  <th className="pb-3 text-sm font-medium text-dark-300">
                    Service
                  </th>
                  <th className="pb-3 text-sm font-medium text-dark-300 text-right">
                    Resources
                  </th>
                  <th className="pb-3 text-sm font-medium text-dark-300 text-right">
                    Monthly Cost
                  </th>
                  <th className="pb-3 text-sm font-medium text-dark-300 text-right">
                    % of Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.map((row) => (
                  <tr
                    key={row.service}
                    className="border-b border-dark-800 hover:bg-dark-800/50"
                  >
                    <td className="py-3 text-sm font-medium text-white">
                      {row.service}
                    </td>
                    <td className="py-3 text-sm text-dark-200 text-right">
                      {row.count}
                    </td>
                    <td className="py-3 text-sm text-green-400 text-right">
                      ${row.cost.toFixed(2)}
                    </td>
                    <td className="py-3 text-sm text-dark-300 text-right">
                      {resources.length > 0
                        ? ((row.count / resources.length) * 100).toFixed(1)
                        : 0}
                      %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "detailed" && (
          <div className="card h-full flex flex-col overflow-hidden">
            {/* Search */}
            <div className="relative mb-3">
              <VscSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
              <input
                type="text"
                className="input-field pl-9"
                placeholder="Filter resources by service, type, ID, name, or status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-dark-900 z-10">
                  <tr className="border-b border-dark-700">
                    {[
                      { field: "service" as const, label: "Service" },
                      { field: "resource_type" as const, label: "Type" },
                      { field: "resource_id" as const, label: "Resource ID" },
                      { field: "name" as const, label: "Name" },
                      { field: "status" as const, label: "Status" },
                      { field: "monthly_cost" as const, label: "Cost" },
                    ].map(({ field, label }) => (
                      <th
                        key={field}
                        className="pb-2 pt-1 text-left font-medium text-dark-300 cursor-pointer hover:text-white select-none"
                        onClick={() => handleSort(field)}
                      >
                        {label}
                        {sortField === field && (
                          <span className="ml-1">
                            {sortDir === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredResources.map((r, i) => (
                    <tr
                      key={`${r.resource_id}-${i}`}
                      className="border-b border-dark-800/50 hover:bg-dark-800/50"
                    >
                      <td className="py-2 font-medium text-primary-300">
                        {r.service}
                      </td>
                      <td className="py-2 text-dark-200">{r.resource_type}</td>
                      <td className="py-2 text-dark-300 font-mono text-xs">
                        {r.resource_id}
                      </td>
                      <td className="py-2 text-white">{r.name || "—"}</td>
                      <td className="py-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            r.status === "running" ||
                            r.status === "active" ||
                            r.status === "available"
                              ? "bg-green-900/50 text-green-400"
                              : r.status === "stopped" ||
                                r.status === "inactive"
                              ? "bg-red-900/50 text-red-400"
                              : "bg-yellow-900/50 text-yellow-400"
                          }`}
                        >
                          {r.status || "—"}
                        </span>
                      </td>
                      <td className="py-2 text-green-400">
                        {r.monthly_cost > 0
                          ? `$${r.monthly_cost.toFixed(2)}`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredResources.length === 0 && (
                <p className="text-center text-dark-400 py-8">
                  No resources match your filter.
                </p>
              )}
            </div>
            <p className="text-xs text-dark-500 mt-2">
              Showing {filteredResources.length} of {resources.length} resources
            </p>
          </div>
        )}

        {activeTab === "costs" && costData && (
          <div className="card h-full overflow-y-auto">
            <div className="grid grid-cols-2 gap-6">
              {/* Cost by service */}
              <div>
                <h3 className="text-sm font-semibold text-dark-200 mb-3">
                  Cost by Service (Monthly)
                </h3>
                <div className="space-y-2">
                  {Object.entries(costData.cost_by_service)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 15)
                    .map(([service, cost]) => (
                      <div key={service} className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-dark-200 truncate">
                              {service}
                            </span>
                            <span className="text-green-400 font-mono">
                              ${cost.toFixed(2)}
                            </span>
                          </div>
                          <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary-500 rounded-full"
                              style={{
                                width: `${
                                  (cost / costData.total_monthly_cost) * 100
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Monthly Trend */}
              <div>
                <h3 className="text-sm font-semibold text-dark-200 mb-3">
                  Monthly Trend
                </h3>
                <div className="space-y-3">
                  {costData.monthly_trend.map((m) => (
                    <div key={m.month} className="flex items-center gap-3">
                      <span className="text-sm text-dark-300 w-20">
                        {m.month}
                      </span>
                      <div className="flex-1 h-6 bg-dark-800 rounded overflow-hidden relative">
                        <div
                          className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded"
                          style={{
                            width: `${
                              (m.cost /
                                Math.max(...costData.monthly_trend.map((x) => x.cost))) *
                              100
                            }%`,
                          }}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono text-white">
                          ${m.cost.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {costData.forecast > 0 && (
                  <div className="mt-6 p-4 bg-dark-800 rounded-lg border border-dark-600">
                    <p className="text-sm text-dark-300">
                      Forecasted Next Month
                    </p>
                    <p className="text-xl font-bold text-yellow-400">
                      ${costData.forecast.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
