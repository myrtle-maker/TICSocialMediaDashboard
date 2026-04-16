import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { notify, fileUploadedBlocks } from "@/lib/slack";
import { inAppNotify } from "@/lib/in-app-notify";

const ALLOWED_EXTS = [".pdf", ".md", ".markdown"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function guessContentType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "md" || ext === "markdown") return "text/markdown";
  return "application/octet-stream";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "");
  if (!ALLOWED_EXTS.includes(ext)) {
    return NextResponse.json(
      { error: "Only .pdf and .md files are allowed" },
      { status: 422 }
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "File must be under 10 MB" },
      { status: 422 }
    );
  }

  try {
    const guide = await prisma.strategyGuide.findUnique({ where: { id } });
    if (!guide) {
      return NextResponse.json({ error: "Guide not found" }, { status: 404 });
    }

    // Upload to Vercel Blob (private — files may contain sensitive data)
    const blob = await put(`strategy-guides/${id}/${Date.now()}-${file.name}`, file, {
      access: "private",
      contentType: guessContentType(file.name),
    });

    const existing = (guide.files as object[]) ?? [];
    const newFile = {
      id: crypto.randomUUID(),
      name: file.name,
      url: blob.url,
      contentType: guessContentType(file.name),
      size: file.size,
      uploadedAt: new Date().toISOString(),
    };

    const updated = await prisma.strategyGuide.update({
      where: { id },
      data: { files: [...existing, newFile] },
    });

    notify("fileUploaded", fileUploadedBlocks(newFile.name, guide.title));
    inAppNotify("fileUploaded", "File uploaded", `"${newFile.name}" added to ${guide.title}`, "/strategy");
    return NextResponse.json({ guide: updated, file: newFile }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
