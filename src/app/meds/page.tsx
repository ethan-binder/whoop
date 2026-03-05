import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { MedsClient } from "./meds-client";

export default async function MedsPage() {
  const user = await getSession();
  if (!user) redirect("/");

  const medications = await prisma.medication.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });

  const recentEvents = await prisma.medicationEvent.findMany({
    where: { userId: user.id },
    include: { medication: { select: { name: true, doseUnit: true } } },
    orderBy: { takenAt: "desc" },
    take: 30,
  });

  return (
    <MedsClient
      initialMeds={JSON.parse(JSON.stringify(medications))}
      initialEvents={JSON.parse(JSON.stringify(recentEvents))}
    />
  );
}
