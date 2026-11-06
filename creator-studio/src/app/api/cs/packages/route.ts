import { NextResponse } from "next/server";
import { readIndex } from "@/lib/studio/store";

export const runtime = "nodejs";

export async function GET() {
  const idx = readIndex();
  const packages = idx.packages;
  // naya model: 1 uploaded zip/file = 1 skill. Version = us skill ke uploads.
  const stats = {
    packages: packages.length,
    skills: packages.length,
    enabledSkills: packages.filter((p) => p.enabled).length,
    versions: packages.reduce((n, p) => n + (p.uploads?.length ?? 1), 0),
  };
  return NextResponse.json({ packages, stats });
}
