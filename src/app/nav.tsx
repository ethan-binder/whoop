import Link from "next/link";
import { getSession } from "@/lib/session";

export async function Nav() {
  const user = await getSession();

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg tracking-tight">
          WHOOP Med Tracker
        </Link>

        {user && (
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Dashboard
            </Link>
            <Link
              href="/meds"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Medications
            </Link>
            <Link
              href="/insights"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Insights
            </Link>
            <span className="text-xs text-gray-400">
              {user.firstName || user.email || "User"}
            </span>
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Logout
              </button>
            </form>
          </div>
        )}
      </div>
    </nav>
  );
}
