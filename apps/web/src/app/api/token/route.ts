import { NextRequest, NextResponse } from "next/server";

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:4000";

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name") ?? "";
  const response = await fetch(`${backendUrl}/token?name=${encodeURIComponent(name)}`, {
    cache: "no-store"
  });
  const payload = await response.json();

  return NextResponse.json(payload, { status: response.status });
}
