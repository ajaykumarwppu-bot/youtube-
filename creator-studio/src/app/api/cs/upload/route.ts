import { NextRequest, NextResponse } from "next/server";
import { readIndex, writeIndex } from "@/lib/studio/store";
import { addPackageVersion, registerSingleFile, registerZipPackage } from "@/lib/studio/extract";

export const runtime = "nodejs";

// POST /api/cs/upload — skills upload
// - form field "packageId" ke saath  => existing skill me NAYA VERSION add hota hai (version control)
// - bina packageId                   => NAYA skill banta hai (zip extract / single file)
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file field required" }, { status: 400 });
    }
    const packageId = form.get("packageId");
    const buf = Buffer.from(await file.arrayBuffer());

    // version upload — existing skill ke andar
    if (typeof packageId === "string" && packageId.trim()) {
      const pkg = addPackageVersion(packageId.trim(), buf, file.name);
      return NextResponse.json({ package: pkg, updatedVersion: true });
    }

    // naya skill
    const looksZip =
      /\.zip$/i.test(file.name) ||
      file.type === "application/zip" ||
      file.type === "application/x-zip-compressed";
    const pkg = looksZip
      ? registerZipPackage(buf, file.name)
      : registerSingleFile(buf, file.name);

    const idx = readIndex();
    idx.packages.unshift(pkg); // naya skill sabse upar
    writeIndex(idx);
    return NextResponse.json({ package: pkg });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
