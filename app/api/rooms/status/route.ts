import { getRoomStatus } from "@/lib/store";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const code = String(request.nextUrl.searchParams.get("code") || "").toUpperCase();
    const playerId = String(request.nextUrl.searchParams.get("playerId") || "");

    if (!code || !playerId) {
      return NextResponse.json({ error: "code and playerId are required." }, { status: 400 });
    }

    return NextResponse.json(await getRoomStatus(code, playerId));
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
