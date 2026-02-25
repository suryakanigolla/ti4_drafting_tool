import { startDraft } from "@/lib/store";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const code = String(body.code || "").toUpperCase();
    const hostId = String(body.hostId || "");
    const room = startDraft(code, hostId);

    return NextResponse.json({ status: room.status });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
