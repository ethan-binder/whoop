import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { SyncButton } from "./sync-button";

export default async function DashboardPage() {
  const user = await getSession();
  if (!user) redirect("/");

  // Get latest metrics
  const latestMetric = await prisma.dailyMetric.findFirst({
    where: { userId: user.id },
    orderBy: { date: "desc" },
  });

  // Get last 7 days average recovery
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentMetrics = await prisma.dailyMetric.findMany({
    where: {
      userId: user.id,
      date: { gte: sevenDaysAgo },
    },
    orderBy: { date: "desc" },
  });

  const avgRecovery7d =
    recentMetrics.length > 0
      ? recentMetrics
          .filter((m) => m.recoveryScore != null)
          .reduce((sum, m) => sum + (m.recoveryScore || 0), 0) /
        recentMetrics.filter((m) => m.recoveryScore != null).length
      : null;

  const totalMetrics = await prisma.dailyMetric.count({
    where: { userId: user.id },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <SyncButton />
      </div>

      {totalMetrics === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500 mb-4">
            No WHOOP data synced yet. Click &quot;Sync Last 30 Days&quot; to
            pull your data.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Latest Recovery"
            value={
              latestMetric?.recoveryScore != null
                ? `${Math.round(latestMetric.recoveryScore)}%`
                : "—"
            }
            color={getRecoveryColor(latestMetric?.recoveryScore)}
          />
          <MetricCard
            label="Last Sleep Duration"
            value={
              latestMetric?.sleepDurationMin != null
                ? formatMinutes(latestMetric.sleepDurationMin)
                : "—"
            }
          />
          <MetricCard
            label="Sleep Efficiency"
            value={
              latestMetric?.sleepEfficiency != null
                ? `${Math.round(latestMetric.sleepEfficiency)}%`
                : "—"
            }
          />
          <MetricCard
            label="7-Day Avg Recovery"
            value={avgRecovery7d != null ? `${Math.round(avgRecovery7d)}%` : "—"}
            color={getRecoveryColor(avgRecovery7d)}
          />
        </div>
      )}

      {recentMetrics.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="font-semibold">Recent Days</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">
                    Date
                  </th>
                  <th className="text-right px-4 py-2 font-medium text-gray-500">
                    Recovery
                  </th>
                  <th className="text-right px-4 py-2 font-medium text-gray-500">
                    Sleep
                  </th>
                  <th className="text-right px-4 py-2 font-medium text-gray-500">
                    Efficiency
                  </th>
                  <th className="text-right px-4 py-2 font-medium text-gray-500">
                    RHR
                  </th>
                  <th className="text-right px-4 py-2 font-medium text-gray-500">
                    HRV
                  </th>
                  <th className="text-right px-4 py-2 font-medium text-gray-500">
                    Strain
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentMetrics.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-2">
                      {m.date.toISOString().slice(0, 10)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span
                        className={`font-medium ${getRecoveryColor(m.recoveryScore)}`}
                      >
                        {m.recoveryScore != null
                          ? `${Math.round(m.recoveryScore)}%`
                          : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      {m.sleepDurationMin != null
                        ? formatMinutes(m.sleepDurationMin)
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {m.sleepEfficiency != null
                        ? `${Math.round(m.sleepEfficiency)}%`
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {m.restingHeartRate != null
                        ? Math.round(m.restingHeartRate)
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {m.hrv != null ? Math.round(m.hrv) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {m.strain != null ? m.strain.toFixed(1) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color || "text-gray-900"}`}>
        {value}
      </p>
    </div>
  );
}

function getRecoveryColor(score: number | null | undefined): string {
  if (score == null) return "text-gray-400";
  if (score >= 67) return "text-green-600";
  if (score >= 34) return "text-yellow-600";
  return "text-red-600";
}

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}h ${m}m`;
}
