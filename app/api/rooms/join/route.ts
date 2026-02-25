import { joinRoom } from "@/lib/store";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const code = String(body.code || "").toUpperCase();
    const name = String(body.name || "").trim();
    const { room, player } = await joinRoom(code, name);

    return NextResponse.json({
      roomCode: room.code,
      playerId: player.id,
      hostId: room.hostId
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
