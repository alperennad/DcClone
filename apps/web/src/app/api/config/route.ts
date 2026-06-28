import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    livekitUrl: process.env.LIVEKIT_PUBLIC_URL ?? process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "ws://localhost:7880"
  });
}
