import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// GET /api/meds — list all medications for current user
export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const meds = await prisma.medication.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(meds);
}

// POST /api/meds — create a new medication
export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, category, doseUnit } = body;

  if (!name || typeof name !== "string") {
    return NextResponse.json(
      { error: "Name is required" },
      { status: 400 }
    );
  }

  const med = await prisma.medication.create({
    data: {
      userId: user.id,
      name: name.trim(),
      category: category || "supplement",
      doseUnit: doseUnit || "mg",
    },
  });

  return NextResponse.json(med, { status: 201 });
}

// DELETE /api/meds?id=xxx — delete a medication
export async function DELETE(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  // Verify ownership
  const med = await prisma.medication.findFirst({
    where: { id, userId: user.id },
  });
  if (!med) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.medication.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
