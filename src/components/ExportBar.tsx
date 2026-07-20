import { VscFilePdf, VscJson, VscTable, VscFile } from "react-icons/vsc";

interface ExportBarProps {
  onExport: (format: string) => void;
}

export default function ExportBar({ onExport }: ExportBarProps) {
  return (
    <div className="flex items-center justify-between px-6 py-3 bg-dark-900 border-t border-dark-700">
      <p className="text-sm text-dark-400">
        Export your inventory report
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onExport("xlsx")}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <VscFile className="text-emerald-400" />
          Excel (.xlsx)
        </button>
        <button
          onClick={() => onExport("csv")}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <VscTable className="text-green-400" />
          CSV
        </button>
        <button
          onClick={() => onExport("json")}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <VscJson className="text-yellow-400" />
          JSON
        </button>
        <button
          onClick={() => onExport("pdf")}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <VscFilePdf className="text-red-400" />
          PDF
        </button>
      </div>
    </div>
  );
}
