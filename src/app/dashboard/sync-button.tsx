"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SyncButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const router = useRouter();

  async function handleSync() {
    setLoading(true);
    setResult(null);
    setWarnings([]);
    try {
      const res = await fetch("/api/whoop/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setResult(
          `Synced ${data.synced} days (${data.recoveries} recoveries, ${data.sleepRecords} sleep records)`
        );
        if (data.warnings) setWarnings(data.warnings);
        router.refresh();
      } else {
        setResult(`Error: ${data.error}`);
      }
    } catch {
      setResult("Sync failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-3">
        {result && <span className="text-sm text-gray-500">{result}</span>}
        <button
          onClick={handleSync}
          disabled={loading}
          className="px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition"
        >
          {loading ? "Syncing..." : "Sync Last 30 Days"}
        </button>
      </div>
      {warnings.length > 0 && (
        <div className="text-xs text-yellow-600 space-y-0.5">
          {warnings.map((w, i) => (
            <p key={i}>⚠ {w}</p>
          ))}
        </div>
      )}
    </div>
  );
}
