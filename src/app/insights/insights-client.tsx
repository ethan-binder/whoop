"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

interface Medication {
  id: string;
  name: string;
  category: string;
  doseUnit: string;
}

interface InsightData {
  medication: Medication;
  dateRange: { start: string; end: string };
  totalDays: number;
  daysWithMed: number;
  daysWithoutMed: number;
  withMed: MetricAverages;
  withoutMed: MetricAverages;
  daily: DailyPoint[];
}

interface MetricAverages {
  avgRecovery: number | null;
  avgSleepDuration: number | null;
  avgSleepEfficiency: number | null;
  avgRhr: number | null;
  avgHrv: number | null;
  avgStrain: number | null;
}

interface DailyPoint {
  date: string;
  tookMed: boolean;
  recoveryScore: number | null;
  sleepDurationMin: number | null;
  hrv: number | null;
  restingHeartRate: number | null;
  strain: number | null;
}

export function InsightsClient({
  medications,
}: {
  medications: Medication[];
}) {
  const [selectedMed, setSelectedMed] = useState("");
  const [days, setDays] = useState("30");
  const [data, setData] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchInsights() {
    if (!selectedMed) return;
    setLoading(true);
    const end = new Date().toISOString();
    const start = new Date(
      Date.now() - parseInt(days) * 24 * 60 * 60 * 1000
    ).toISOString();

    const res = await fetch(
      `/api/insights?medicationId=${selectedMed}&start=${start}&end=${end}`
    );
    if (res.ok) {
      setData(await res.json());
    }
    setLoading(false);
  }

  const comparisonData = data
    ? [
        {
          metric: "Recovery %",
          "With Med": data.withMed.avgRecovery
            ? Math.round(data.withMed.avgRecovery * 10) / 10
            : 0,
          "Without Med": data.withoutMed.avgRecovery
            ? Math.round(data.withoutMed.avgRecovery * 10) / 10
            : 0,
        },
        {
          metric: "Sleep Eff %",
          "With Med": data.withMed.avgSleepEfficiency
            ? Math.round(data.withMed.avgSleepEfficiency * 10) / 10
            : 0,
          "Without Med": data.withoutMed.avgSleepEfficiency
            ? Math.round(data.withoutMed.avgSleepEfficiency * 10) / 10
            : 0,
        },
        {
          metric: "HRV (ms)",
          "With Med": data.withMed.avgHrv
            ? Math.round(data.withMed.avgHrv * 10) / 10
            : 0,
          "Without Med": data.withoutMed.avgHrv
            ? Math.round(data.withoutMed.avgHrv * 10) / 10
            : 0,
        },
        {
          metric: "RHR (bpm)",
          "With Med": data.withMed.avgRhr
            ? Math.round(data.withMed.avgRhr * 10) / 10
            : 0,
          "Without Med": data.withoutMed.avgRhr
            ? Math.round(data.withoutMed.avgRhr * 10) / 10
            : 0,
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Insights</h1>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
        This is a directional analysis only. It compares simple averages on days
        you took a medication vs days you did not. This is not medical advice and
        does not account for confounding factors.
      </div>

      {medications.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          Add medications first on the Medications page, then sync your WHOOP
          data.
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Medication
                </label>
                <select
                  value={selectedMed}
                  onChange={(e) => setSelectedMed(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-1.5 text-sm"
                >
                  <option value="">Select...</option>
                  {medications.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Date Range
                </label>
                <select
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-1.5 text-sm"
                >
                  <option value="14">Last 14 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="60">Last 60 days</option>
                  <option value="90">Last 90 days</option>
                </select>
              </div>
              <button
                onClick={fetchInsights}
                disabled={!selectedMed || loading}
                className="px-4 py-1.5 bg-black text-white text-sm rounded hover:bg-gray-800 disabled:opacity-50 transition"
              >
                {loading ? "Loading..." : "Analyze"}
              </button>
            </div>
          </div>

          {data && (
            <>
              {/* Summary table */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h2 className="font-semibold">
                    {data.medication.name} — Comparison
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    {data.daysWithMed} days with · {data.daysWithoutMed} days
                    without · {data.totalDays} total days with data
                  </p>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-gray-500">
                        Metric
                      </th>
                      <th className="text-right px-4 py-2 font-medium text-gray-500">
                        With Med
                      </th>
                      <th className="text-right px-4 py-2 font-medium text-gray-500">
                        Without Med
                      </th>
                      <th className="text-right px-4 py-2 font-medium text-gray-500">
                        Diff
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <CompRow
                      label="Avg Recovery"
                      a={data.withMed.avgRecovery}
                      b={data.withoutMed.avgRecovery}
                      unit="%"
                      higherBetter
                    />
                    <CompRow
                      label="Avg Sleep Duration"
                      a={
                        data.withMed.avgSleepDuration
                          ? Math.round(data.withMed.avgSleepDuration)
                          : null
                      }
                      b={
                        data.withoutMed.avgSleepDuration
                          ? Math.round(data.withoutMed.avgSleepDuration)
                          : null
                      }
                      unit=" min"
                      higherBetter
                    />
                    <CompRow
                      label="Avg Sleep Efficiency"
                      a={data.withMed.avgSleepEfficiency}
                      b={data.withoutMed.avgSleepEfficiency}
                      unit="%"
                      higherBetter
                    />
                    <CompRow
                      label="Avg RHR"
                      a={data.withMed.avgRhr}
                      b={data.withoutMed.avgRhr}
                      unit=" bpm"
                      higherBetter={false}
                    />
                    <CompRow
                      label="Avg HRV"
                      a={data.withMed.avgHrv}
                      b={data.withoutMed.avgHrv}
                      unit=" ms"
                      higherBetter
                    />
                    <CompRow
                      label="Avg Strain"
                      a={data.withMed.avgStrain}
                      b={data.withoutMed.avgStrain}
                      unit=""
                    />
                  </tbody>
                </table>
              </div>

              {/* Bar chart comparison */}
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <h2 className="font-semibold mb-4">Side-by-Side Comparison</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="metric" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="With Med" fill="#2563eb" />
                    <Bar dataKey="Without Med" fill="#9ca3af" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Daily recovery chart */}
              {data.daily.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                  <h2 className="font-semibold mb-4">
                    Daily Recovery Timeline
                  </h2>
                  <p className="text-xs text-gray-400 mb-3">
                    Blue dots = took {data.medication.name}
                  </p>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={data.daily}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v) => v.slice(5)}
                      />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="recoveryScore"
                        stroke="#2563eb"
                        strokeWidth={2}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        dot={((props: any) => {
                          const { cx, cy, payload } = props;
                          if (payload.recoveryScore == null || cx == null || cy == null) return null;
                          return (
                            <circle
                              cx={cx}
                              cy={cy}
                              r={payload.tookMed ? 5 : 3}
                              fill={payload.tookMed ? "#2563eb" : "#9ca3af"}
                              stroke="white"
                              strokeWidth={1}
                            />
                          );
                        }) as any}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function CompRow({
  label,
  a,
  b,
  unit,
  higherBetter,
}: {
  label: string;
  a: number | null;
  b: number | null;
  unit: string;
  higherBetter?: boolean;
}) {
  const fmt = (v: number | null) =>
    v != null ? `${Math.round(v * 10) / 10}${unit}` : "—";

  let diffColor = "text-gray-400";
  let diffStr = "—";
  if (a != null && b != null) {
    const diff = a - b;
    const sign = diff > 0 ? "+" : "";
    diffStr = `${sign}${Math.round(diff * 10) / 10}${unit}`;

    if (higherBetter !== undefined) {
      const good = higherBetter ? diff > 0 : diff < 0;
      diffColor = Math.abs(diff) < 0.5 ? "text-gray-400" : good ? "text-green-600" : "text-red-500";
    }
  }

  return (
    <tr>
      <td className="px-4 py-2">{label}</td>
      <td className="px-4 py-2 text-right font-medium">{fmt(a)}</td>
      <td className="px-4 py-2 text-right font-medium">{fmt(b)}</td>
      <td className={`px-4 py-2 text-right font-medium ${diffColor}`}>
        {diffStr}
      </td>
    </tr>
  );
}
