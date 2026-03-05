import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  fetchCycles,
  fetchRecoveries,
  fetchSleepRecords,
} from "@/lib/whoop-client";

export async function POST() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const endDate = new Date().toISOString();
    const startDate = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    // Fetch all data in parallel
    const [cycles, recoveries, sleepRecords] = await Promise.all([
      fetchCycles(user.id, startDate, endDate),
      fetchRecoveries(user.id, startDate, endDate),
      fetchSleepRecords(user.id, startDate, endDate),
    ]);

    // Index recoveries by cycle_id for easy lookup
    const recoveryByCycle = new Map(
      recoveries
        .filter((r) => r.score_state === "SCORED" && r.score)
        .map((r) => [r.cycle_id, r])
    );

    // Index sleep records by id — recoveries reference sleep_id
    // But we'll match sleep by date instead for daily metrics
    const sleepByDate = new Map<string, (typeof sleepRecords)[0]>();
    for (const s of sleepRecords) {
      if (s.nap || s.score_state !== "SCORED" || !s.score) continue;
      // Use the end date (wake time) as the "day" for this sleep
      const day = s.end.slice(0, 10); // YYYY-MM-DD
      // Keep only the longest sleep per day (ignore naps)
      const existing = sleepByDate.get(day);
      if (
        !existing ||
        s.score.stage_summary.total_in_bed_time_milli >
          (existing.score?.stage_summary.total_in_bed_time_milli || 0)
      ) {
        sleepByDate.set(day, s);
      }
    }

    let upsertedCount = 0;

    for (const cycle of cycles) {
      if (cycle.score_state !== "SCORED" || !cycle.end) continue;

      const dayStr = cycle.start.slice(0, 10);
      const date = new Date(dayStr + "T00:00:00.000Z");

      const recovery = recoveryByCycle.get(cycle.id);
      const sleep = sleepByDate.get(dayStr);

      // Compute sleep duration in minutes from stage summary
      let sleepDurationMin: number | null = null;
      let sleepEfficiency: number | null = null;

      if (sleep?.score) {
        const stages = sleep.score.stage_summary;
        const totalSleepMilli =
          stages.total_light_sleep_time_milli +
          stages.total_slow_wave_sleep_time_milli +
          stages.total_rem_sleep_time_milli;
        sleepDurationMin = totalSleepMilli / 60_000;
        sleepEfficiency = sleep.score.sleep_efficiency_percentage;
      }

      await prisma.dailyMetric.upsert({
        where: {
          userId_date: { userId: user.id, date },
        },
        update: {
          recoveryScore: recovery?.score?.recovery_score ?? null,
          sleepDurationMin,
          sleepEfficiency,
          restingHeartRate: recovery?.score?.resting_heart_rate ?? null,
          hrv: recovery?.score?.hrv_rmssd_milli ?? null,
          strain: cycle.score?.strain ?? null,
        },
        create: {
          userId: user.id,
          date,
          recoveryScore: recovery?.score?.recovery_score ?? null,
          sleepDurationMin,
          sleepEfficiency,
          restingHeartRate: recovery?.score?.resting_heart_rate ?? null,
          hrv: recovery?.score?.hrv_rmssd_milli ?? null,
          strain: cycle.score?.strain ?? null,
        },
      });
      upsertedCount++;
    }

    return NextResponse.json({
      success: true,
      synced: upsertedCount,
      cycles: cycles.length,
      recoveries: recoveries.length,
      sleepRecords: sleepRecords.length,
    });
  } catch (err) {
    console.error("Sync error:", err);
    return NextResponse.json(
      { error: "Sync failed", details: String(err) },
      { status: 500 }
    );
  }
}
