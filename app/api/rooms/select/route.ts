import { submitPick } from "@/lib/store";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const code = String(body.code || "").toUpperCase();
    const playerId = String(body.playerId || "");
    const factionId = String(body.factionId || "");

    const room = submitPick(code, playerId, factionId);

    return NextResponse.json({
      status: room.status,
      submittedCount: Object.keys(room.picksByPlayer).length,
      totalCount: room.players.length
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
