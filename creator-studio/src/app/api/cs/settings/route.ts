import { NextResponse } from "next/server";
import { maskSettings, readSettings, setCred, updatePrefs } from "@/lib/studio/settings";

export const runtime = "nodejs";

// GET /api/cs/settings — masked keys (raw key browser par kabhi nahi jati) + prefs
export async function GET() {
  const st = readSettings();
  return NextResponse.json(maskSettings(st));
}

// PUT /api/cs/settings — do tarah ke updates:
//   { kind: "cred", integrationId, fieldId, value }  (value null = remove)
//   { kind: "prefs", patch: { ... } }
export async function PUT(req: Request) {
  try {
    const body = await req.json();

    if (body.kind === "cred") {
      const { integrationId, fieldId, value } = body as {
        integrationId?: string; fieldId?: string; value?: string | null;
      };
      if (!integrationId || !fieldId) {
        return NextResponse.json({ error: "integrationId aur fieldId zaroori hain" }, { status: 400 });
      }
      if (value !== null && value !== undefined && typeof value !== "string") {
        return NextResponse.json({ error: "Value string honi chahiye (ya null)" }, { status: 400 });
      }
      if (value !== null && value !== undefined && value.trim().length < 4) {
        return NextResponse.json({ error: "Ye key chhoti lag rahi hai — pura token paste karo" }, { status: 400 });
      }
      maskSettings(setCred(integrationId, fieldId, value ?? null));
    } else if (body.kind === "prefs") {
      maskSettings(updatePrefs(body.patch ?? {}));
    } else {
      return NextResponse.json({ error: "Unknown kind" }, { status: 400 });
    }

    // fresh read — client ko pura masked state wapas
    return NextResponse.json(maskSettings(readSettings()));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Settings update failed" },
      { status: 400 },
    );
  }
}
