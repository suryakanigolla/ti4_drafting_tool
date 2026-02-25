import { createRoom } from "@/lib/store";
import { ModeConfig } from "@/types/draft";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const hostName = String(body.hostName || "").trim();
    const mode = body.mode as ModeConfig;

    if (!hostName) {
      return NextResponse.json({ error: "Host name is required." }, { status: 400 });
    }

    if (!mode?.includeBase) {
      return NextResponse.json({ error: "Base game must be enabled." }, { status: 400 });
    }

    const { room, player } = await createRoom(hostName, mode);

    return NextResponse.json({
      roomCode: room.code,
      playerId: player.id,
      hostId: room.hostId
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
