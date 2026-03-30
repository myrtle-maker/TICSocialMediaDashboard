import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const subscribers = await prisma.emailSubscriber.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ subscribers });
  } catch (err) {
    console.error("Failed to fetch email subscribers:", err);
    return NextResponse.json(
      { subscribers: [], error: "Failed to fetch subscribers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "email is required" },
        { status: 400 }
      );
    }

    const trimmed = email.trim().toLowerCase();

    if (!EMAIL_RE.test(trimmed)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Check if already exists
    const existing = await prisma.emailSubscriber.findUnique({
      where: { email: trimmed },
    });

    if (existing) {
      // If soft-deleted, reactivate
      if (!existing.active) {
        const reactivated = await prisma.emailSubscriber.update({
          where: { id: existing.id },
          data: { active: true, name: name?.trim() || existing.name },
        });
        return NextResponse.json({ subscriber: reactivated }, { status: 201 });
      }
      return NextResponse.json(
        { error: "Email already subscribed" },
        { status: 400 }
      );
    }

    const subscriber = await prisma.emailSubscriber.create({
      data: {
        email: trimmed,
        name: name?.trim() || null,
      },
    });

    return NextResponse.json({ subscriber }, { status: 201 });
  } catch (err) {
    console.error("Failed to add email subscriber:", err);
    return NextResponse.json(
      { error: "Failed to add subscriber" },
      { status: 500 }
    );
  }
}
