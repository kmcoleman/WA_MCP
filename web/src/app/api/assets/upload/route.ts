import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { buildLocalPath } from "@/lib/assets";

const ALLOWED_KEYS = [
  "featuredImage",
  "gpxRoute",
  "gpxTrack",
  "pdfRouteSheet",
] as const;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const targetDir = formData.get("targetDir");

    if (!targetDir || typeof targetDir !== "string") {
      return NextResponse.json(
        { error: "targetDir is required" },
        { status: 400 }
      );
    }

    const localDir = buildLocalPath(targetDir);

    await mkdir(localDir, { recursive: true });

    const uploaded: string[] = [];

    for (const key of ALLOWED_KEYS) {
      const file = formData.get(key);
      if (!file || !(file instanceof File)) continue;

      const rename = formData.get(`${key}:rename`);
      const fileName =
        rename && typeof rename === "string" ? rename : file.name;
      const buffer = Buffer.from(await file.arrayBuffer());
      const filePath = path.join(localDir, fileName);
      await writeFile(filePath, buffer);
      uploaded.push(fileName);
    }

    if (uploaded.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    return NextResponse.json({ uploaded });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Upload failed: ${message}` },
      { status: 500 }
    );
  }
}
