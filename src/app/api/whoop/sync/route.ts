import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  fetchCycles,
  fetchRecoveryForCycle,
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

    // Fetch cycles and sleep in parallel
    const [cyclesResult, sleepResult] = await Promise.all([
      fetchCycles(user.id, startDate, endDate),
      fetchSleepRecords(user.id, startDate, endDate),
    ]);

    const cycles = cyclesResult.data;
    const sleepRecords = sleepResult.data;
    const warnings: string[] = [];

    if (!cyclesResult.ok) warnings.push(`Cycles: ${cyclesResult.error}`);
    if (!sleepResult.ok) warnings.push(`Sleep: ${sleepResult.error}`);

    console.log(`[SYNC] Cycles: ${cycles.length}, Sleep: ${sleepRecords.length}`);

    if (cycles.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        warnings,
        message: "No cycle data available to sync",
      });
    }

    // Index sleep records by date
    const sleepByDate = new Map<string, (typeof sleepRecords)[0]>();
    for (const s of sleepRecords) {
      if (s.nap || s.score_state !== "SCORED" || !s.score) continue;
      const day = s.end.slice(0, 10);
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
    let recoveryCount = 0;
    let recoveryFailCount = 0;

    for (const cycle of cycles) {
      if (cycle.score_state !== "SCORED" || !cycle.end) continue;

      const dayStr = cycle.start.slice(0, 10);
      const date = new Date(dayStr + "T00:00:00.000Z");

      // Fetch recovery per-cycle
      const recovery = await fetchRecoveryForCycle(user.id, cycle.id);
      if (recovery?.score) {
        recoveryCount++;
      } else {
        recoveryFailCount++;
      }

      const sleep = sleepByDate.get(dayStr);

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

    if (recoveryFailCount > 0 && recoveryCount === 0) {
      warnings.push(`Recovery: all ${recoveryFailCount} cycles returned no recovery data`);
    }

    console.log(`[SYNC] Done: ${upsertedCount} days synced, ${recoveryCount} recoveries, ${recoveryFailCount} recovery failures`);

    return NextResponse.json({
      success: true,
      synced: upsertedCount,
      cycles: cycles.length,
      recoveries: recoveryCount,
      sleepRecords: sleepRecords.length,
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  } catch (err) {
    console.error("Sync error:", err);
    return NextResponse.json(
      { error: "Sync failed", details: String(err) },
      { status: 500 }
    );
  }
}
