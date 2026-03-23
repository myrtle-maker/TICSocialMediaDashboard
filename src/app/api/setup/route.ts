import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Try raw SQL to create the tables
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "accounts" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
        "platform" TEXT NOT NULL,
        "platformAccountId" TEXT NOT NULL,
        "handle" TEXT NOT NULL,
        "displayName" TEXT NOT NULL,
        "profileImageUrl" TEXT,
        "bio" TEXT,
        "followers" INTEGER NOT NULL DEFAULT 0,
        "following" INTEGER NOT NULL DEFAULT 0,
        "totalPosts" INTEGER NOT NULL DEFAULT 0,
        "verified" BOOLEAN NOT NULL DEFAULT false,
        "accountType" TEXT NOT NULL DEFAULT 'business',
        "category" TEXT,
        "externalUrl" TEXT,
        "lastScrapedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "accounts_platform_handle_key" ON "accounts"("platform", "handle");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "posts" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
        "platformPostId" TEXT NOT NULL,
        "platform" TEXT NOT NULL,
        "accountId" TEXT NOT NULL,
        "contentType" TEXT NOT NULL,
        "caption" TEXT NOT NULL,
        "hashtags" TEXT[] DEFAULT '{}',
        "mentions" TEXT[] DEFAULT '{}',
        "mediaUrls" TEXT[] DEFAULT '{}',
        "thumbnailUrl" TEXT,
        "permalink" TEXT NOT NULL,
        "hookText" TEXT NOT NULL,
        "hookType" TEXT NOT NULL,
        "hookScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "likes" INTEGER NOT NULL DEFAULT 0,
        "comments" INTEGER NOT NULL DEFAULT 0,
        "shares" INTEGER NOT NULL DEFAULT 0,
        "saves" INTEGER NOT NULL DEFAULT 0,
        "views" INTEGER NOT NULL DEFAULT 0,
        "impressions" INTEGER,
        "reach" INTEGER,
        "engagementRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "viralityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "platformMeta" JSONB NOT NULL DEFAULT '{}',
        "publishedAt" TIMESTAMP(3) NOT NULL,
        "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "posts_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "posts_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "posts_platform_platformPostId_key" ON "posts"("platform", "platformPostId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "posts_platform_idx" ON "posts"("platform");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "posts_accountId_idx" ON "posts"("accountId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "posts_publishedAt_idx" ON "posts"("publishedAt");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "posts_hookType_idx" ON "posts"("hookType");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "posts_contentType_idx" ON "posts"("contentType");`);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "settings" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
        "key" TEXT NOT NULL,
        "value" TEXT NOT NULL,
        CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
      );
    `);

    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "settings_key_key" ON "settings"("key");`);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "scrape_jobs" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
        "platform" TEXT NOT NULL,
        "accountId" TEXT NOT NULL,
        "apifyRunId" TEXT NOT NULL,
        "apifyActorId" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "postsScraped" INTEGER NOT NULL DEFAULT 0,
        "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "completedAt" TIMESTAMP(3),
        "errorMessage" TEXT,
        CONSTRAINT "scrape_jobs_pkey" PRIMARY KEY ("id")
      );
    `);

    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "scrape_jobs_accountId_idx" ON "scrape_jobs"("accountId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "scrape_jobs_status_idx" ON "scrape_jobs"("status");`);

    // Verify tables exist
    const accounts = await prisma.account.findMany({ take: 1 });
    const settings = await prisma.setting.findMany({ take: 1 });

    return NextResponse.json({
      success: true,
      message: "Database tables created successfully",
      tables: ["accounts", "posts", "settings", "scrape_jobs"],
      verification: {
        accounts: "ok",
        settings: "ok",
      },
    });
  } catch (err) {
    console.error("Setup failed:", err);
    return NextResponse.json(
      {
        success: false,
        error: String(err),
      },
      { status: 500 }
    );
  }
}
