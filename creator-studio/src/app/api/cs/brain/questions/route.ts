import { NextRequest, NextResponse } from "next/server";
import { mutateBrain, newId, questionSignature } from "@/lib/studio/brain";
import type { ProblemArea } from "@/lib/studio/brain-types";

export const runtime = "nodejs";

const VALID_AREAS: ProblemArea[] = ["thumbnail", "title", "topic", "hook", "seo", "length"];

// POST /api/cs/brain/questions — agent/user ne naya research question raise kiya
// body: { areas: ProblemArea[], videoId?: string, text?: string }
// Same areas wala question pehle se hai to repeat count badhta hai (source video add hota hai)
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { areas?: string[]; videoId?: string; text?: string }
    | null;
  if (!body || !Array.isArray(body.areas) || body.areas.length === 0) {
    return NextResponse.json({ error: "areas (non-empty array) required" }, { status: 400 });
  }
  const areas = body.areas.filter((a): a is ProblemArea => VALID_AREAS.includes(a as ProblemArea));
  if (areas.length === 0) {
    return NextResponse.json({ error: "No valid areas in request" }, { status: 400 });
  }

  const question = mutateBrain((st) => {
    const sig = questionSignature(areas);
    let q = st.questions.find((x) => x.status !== "done" && questionSignature(x.areas) === sig);

    if (q) {
      // repeat — same question dobara utha, source video add karo
      if (body.videoId && !q.sourceVideoIds.includes(body.videoId)) {
        q.sourceVideoIds.push(body.videoId);
      }
      q.createdAt = new Date().toISOString();
      return q;
    }

    q = {
      id: newId(),
      text: body.text?.trim() || defaultText(areas),
      areas,
      sourceVideoIds: body.videoId ? [body.videoId] : [],
      problem: body.videoId
        ? "Ye video ke metrics + findings se agent ne ye problem pakdi hai. Detail is video ke page par hai."
        : "User-raised question — problem detail abhi khali hai.",
      why: "Is area par research hoga to agle videos ka performance improve hoga.",
      topics: defaultTopics(areas),
      links: [],
      status: "open",
      createdAt: new Date().toISOString(),
    };
    st.questions.unshift(q);
    return q;
  });

  return NextResponse.json({ question });
}

function defaultText(areas: ProblemArea[]): string {
  const map: Record<ProblemArea, string> = {
    thumbnail: "Thumbnail",
    title: "Title",
    topic: "Topic & Audience",
    hook: "Hook / Intro",
    seo: "SEO & Timing",
    length: "Video Length",
  };
  return `${areas.map((a) => map[a] ?? a).join(" & ")} par research karni hai`;
}

function defaultTopics(areas: ProblemArea[]): string[] {
  const base: Partial<Record<ProblemArea, string[]>> = {
    thumbnail: ["Mobile-first thumbnail rules", "Contrast aur text size best practices"],
    title: ["Curiosity + keyword first 40 characters", "Clickbait vs honest curiosity"],
    topic: ["Audience profile per video", "Competitor gap research"],
    hook: ["First 15 sec hook patterns", "Pattern interrupt frequency"],
    seo: ["Best posting windows", "Description keyword placement"],
    length: ["Ideal length per format", "Retention drop sections"],
  };
  return areas.flatMap((a) => base[a] ?? ["Is area ke proven best practices"]);
}
