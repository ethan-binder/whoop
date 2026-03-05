import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const medicationId = url.searchParams.get("medicationId");
  const startStr = url.searchParams.get("start");
  const endStr = url.searchParams.get("end");

  if (!medicationId) {
    return NextResponse.json(
      { error: "medicationId is required" },
      { status: 400 }
    );
  }

  // Default to last 30 days
  const endDate = endStr ? new Date(endStr) : new Date();
  const startDate = startStr
    ? new Date(startStr)
    : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Verify medication belongs to user
  const med = await prisma.medication.findFirst({
    where: { id: medicationId, userId: user.id },
  });
  if (!med) {
    return NextResponse.json(
      { error: "Medication not found" },
      { status: 404 }
    );
  }

  // Get all medication events in range
  const events = await prisma.medicationEvent.findMany({
    where: {
      userId: user.id,
      medicationId,
      takenAt: { gte: startDate, lte: endDate },
    },
  });

  // Get set of dates when medication was taken
  const medDates = new Set<string>();
  for (const e of events) {
    medDates.add(e.takenAt.toISOString().slice(0, 10));
  }

  // Get all daily metrics in range
  const metrics = await prisma.dailyMetric.findMany({
    where: {
      userId: user.id,
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: "asc" },
  });

  // Split metrics into "with med" and "without med"
  const withMed: typeof metrics = [];
  const withoutMed: typeof metrics = [];

  for (const m of metrics) {
    const dayStr = m.date.toISOString().slice(0, 10);
    if (medDates.has(dayStr)) {
      withMed.push(m);
    } else {
      withoutMed.push(m);
    }
  }

  // Helper to compute averages
  function avg(
    items: typeof metrics,
    key: keyof (typeof metrics)[0]
  ): number | null {
    const vals = items
      .map((i) => i[key])
      .filter((v): v is number => v != null);
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  const result = {
    medication: med,
    dateRange: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
    totalDays: metrics.length,
    daysWithMed: withMed.length,
    daysWithoutMed: withoutMed.length,
    withMed: {
      avgRecovery: avg(withMed, "recoveryScore"),
      avgSleepDuration: avg(withMed, "sleepDurationMin"),
      avgSleepEfficiency: avg(withMed, "sleepEfficiency"),
      avgRhr: avg(withMed, "restingHeartRate"),
      avgHrv: avg(withMed, "hrv"),
      avgStrain: avg(withMed, "strain"),
    },
    withoutMed: {
      avgRecovery: avg(withoutMed, "recoveryScore"),
      avgSleepDuration: avg(withoutMed, "sleepDurationMin"),
      avgSleepEfficiency: avg(withoutMed, "sleepEfficiency"),
      avgRhr: avg(withoutMed, "restingHeartRate"),
      avgHrv: avg(withoutMed, "hrv"),
      avgStrain: avg(withoutMed, "strain"),
    },
    // Daily data for charting
    daily: metrics.map((m) => ({
      date: m.date.toISOString().slice(0, 10),
      tookMed: medDates.has(m.date.toISOString().slice(0, 10)),
      recoveryScore: m.recoveryScore,
      sleepDurationMin: m.sleepDurationMin,
      hrv: m.hrv,
      restingHeartRate: m.restingHeartRate,
      strain: m.strain,
    })),
  };

  return NextResponse.json(result);
}
