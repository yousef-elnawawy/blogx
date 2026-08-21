import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(
      url
    )}&omit_script=true&dnt=true`;
    const res = await fetch(oembedUrl, {
      next: { revalidate: 86400 }, // Cache for 24 hours
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Tweet not found or unavailable" }, { status: 404 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch tweet" }, { status: 500 });
  }
}
