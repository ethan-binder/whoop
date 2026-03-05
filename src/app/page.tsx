import Link from "next/link";
import { getSession } from "@/lib/session";

export default async function Home() {
  const user = await getSession();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          WHOOP Medication Tracker
        </h1>
        <p className="text-gray-500 max-w-md">
          Track your medications and supplements, then see how they correlate
          with your WHOOP recovery, sleep, and strain data.
        </p>
      </div>

      {user ? (
        <Link
          href="/dashboard"
          className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition"
        >
          Go to Dashboard
        </Link>
      ) : (
        <a
          href="/api/auth/whoop"
          className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition"
        >
          Connect WHOOP
        </a>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8 w-full max-w-2xl">
        <div className="bg-white rounded-lg p-6 border border-gray-200 text-center">
          <div className="text-2xl mb-2">💊</div>
          <h3 className="font-semibold mb-1">Log Medications</h3>
          <p className="text-sm text-gray-500">
            Track meds, supplements, doses, and timing
          </p>
        </div>
        <div className="bg-white rounded-lg p-6 border border-gray-200 text-center">
          <div className="text-2xl mb-2">📊</div>
          <h3 className="font-semibold mb-1">Sync WHOOP Data</h3>
          <p className="text-sm text-gray-500">
            Pull recovery, sleep, and strain metrics
          </p>
        </div>
        <div className="bg-white rounded-lg p-6 border border-gray-200 text-center">
          <div className="text-2xl mb-2">🔍</div>
          <h3 className="font-semibold mb-1">See Correlations</h3>
          <p className="text-sm text-gray-500">
            Compare metrics on med days vs off days
          </p>
        </div>
      </div>
    </div>
  );
}
