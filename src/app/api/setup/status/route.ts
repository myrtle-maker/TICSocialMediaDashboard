import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const accountCount = await prisma.account.count();

    const tokenSetting = await prisma.setting.findUnique({
      where: { key: "apifyApiToken" },
    });

    const hasApiToken = !!(tokenSetting?.value && tokenSetting.value.length > 0);

    return NextResponse.json({
      needsSetup: accountCount === 0,
      accountCount,
      hasApiToken,
    });
  } catch (err) {
    console.error("Setup status check failed:", err);
    // If DB isn't connected, setup is definitely needed
    return NextResponse.json({
      needsSetup: true,
      accountCount: 0,
      hasApiToken: false,
    });
  }
}
