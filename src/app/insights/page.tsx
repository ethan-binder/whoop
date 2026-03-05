import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { InsightsClient } from "./insights-client";

export default async function InsightsPage() {
  const user = await getSession();
  if (!user) redirect("/");

  const medications = await prisma.medication.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });

  return (
    <InsightsClient medications={JSON.parse(JSON.stringify(medications))} />
  );
}
