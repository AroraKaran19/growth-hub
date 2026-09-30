import { timingSafeEqual } from "crypto";
import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

const TAG = /^(venues|venue:[a-z0-9][a-z0-9-]{1,62})$/;

const sameSecret = (given: string, expected: string) => {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || !sameSecret(request.headers.get("x-revalidate-secret") ?? "", secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { tags?: unknown } | null;
  const tags = Array.isArray(body?.tags)
    ? body.tags.filter((tag): tag is string => typeof tag === "string" && TAG.test(tag))
    : [];
  if (tags.length === 0) return NextResponse.json({ error: "No valid tags" }, { status: 400 });

  // Expire at once: "max" would hand the next visitor the stale page.
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  return NextResponse.json({ revalidated: tags });
}
