import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// GET /api/med-events — list recent medication events
export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = parseInt(
    new URL(request.url).searchParams.get("limit") || "50"
  );

  const events = await prisma.medicationEvent.findMany({
    where: { userId: user.id },
    include: { medication: { select: { name: true, doseUnit: true } } },
    orderBy: { takenAt: "desc" },
    take: Math.min(limit, 200),
  });

  return NextResponse.json(events);
}

// POST /api/med-events — log a dose
export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { medicationId, dose, takenAt, notes } = body;

  if (!medicationId || dose == null) {
    return NextResponse.json(
      { error: "medicationId and dose are required" },
      { status: 400 }
    );
  }

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

  const event = await prisma.medicationEvent.create({
    data: {
      userId: user.id,
      medicationId,
      dose: Number(dose),
      takenAt: takenAt ? new Date(takenAt) : new Date(),
      notes: notes || null,
    },
    include: { medication: { select: { name: true, doseUnit: true } } },
  });

  return NextResponse.json(event, { status: 201 });
}

// DELETE /api/med-events?id=xxx — delete an event
export async function DELETE(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const event = await prisma.medicationEvent.findFirst({
    where: { id, userId: user.id },
  });
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.medicationEvent.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
