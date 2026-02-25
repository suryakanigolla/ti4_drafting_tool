import { assignDraftOptions, getFactionPool } from "@/lib/draft";
import { Faction, ModeConfig, Player, Room } from "@/types/draft";
import { head, put } from "@vercel/blob";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOMS_BLOB_PATH = "rooms/rooms.json";

function randomCode(len = 6): string {
  return Array.from({ length: len }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
}

function randomId(): string {
  return crypto.randomUUID();
}

async function readRoomsFromBlob(): Promise<Map<string, Room>> {
  try {
    const blob = await head(ROOMS_BLOB_PATH);
    const response = await fetch(blob.url, { cache: "no-store" });
    if (!response.ok) {
      return new Map<string, Room>();
    }

    const parsed = (await response.json()) as Record<string, Room>;
    return new Map(Object.entries(parsed));
  } catch {
    return new Map<string, Room>();
  }
}

async function writeRoomsToBlob(rooms: Map<string, Room>): Promise<void> {
  const serialized = JSON.stringify(Object.fromEntries(rooms), null, 2);
  await put(ROOMS_BLOB_PATH, serialized, {
    access: "private",
    addRandomSuffix: false,
    contentType: "application/json; charset=utf-8"
  });
}

async function getRooms(): Promise<Map<string, Room>> {
  return readRoomsFromBlob();
}

function ensureRoom(code: string, rooms: Map<string, Room>): Room {
  const room = rooms.get(code.toUpperCase());
  if (!room) {
    throw new Error("Room not found.");
  }
  return room;
}

export async function createRoom(hostName: string, mode: ModeConfig) {
  const rooms = await getRooms();
  const host: Player = { id: randomId(), name: hostName.trim(), joinedAt: Date.now() };

  let code = randomCode();
  while (rooms.has(code)) code = randomCode();

  const room: Room = {
    code,
    hostId: host.id,
    status: "lobby",
    createdAt: Date.now(),
    mode,
    players: [host],
    optionsByPlayer: {},
    picksByPlayer: {}
  };

  rooms.set(code, room);
  await writeRoomsToBlob(rooms);
  return { room, player: host };
}

export async function joinRoom(code: string, playerName: string): Promise<{ room: Room; player: Player }> {
  const rooms = await getRooms();
  const room = ensureRoom(code, rooms);
  if (room.status !== "lobby") {
    throw new Error("Room is not open for joining.");
  }

  const name = playerName.trim();
  if (!name) {
    throw new Error("Player name is required.");
  }

  const player: Player = { id: randomId(), name, joinedAt: Date.now() };
  room.players.push(player);
  rooms.set(room.code, room);
  await writeRoomsToBlob(rooms);
  return { room, player };
}

export async function getRoomStatus(code: string, playerId: string) {
  const rooms = await getRooms();
  const room = ensureRoom(code, rooms);
  const isMember = room.players.some((p) => p.id === playerId);
  if (!isMember) {
    throw new Error("Player not in room.");
  }

  const picked = room.picksByPlayer[playerId] ?? null;
  const options = room.optionsByPlayer[playerId] ?? [];

  return {
    room: {
      code: room.code,
      hostId: room.hostId,
      status: room.status,
      players: room.players,
      mode: room.mode,
      submittedCount: Object.keys(room.picksByPlayer).length,
      totalCount: room.players.length
    },
    self: {
      playerId,
      options,
      picked
    }
  };
}

export async function startDraft(code: string, hostId: string) {
  const rooms = await getRooms();
  const room = ensureRoom(code, rooms);
  if (room.hostId !== hostId) {
    throw new Error("Only the host can start the draft.");
  }
  if (room.status !== "lobby") {
    throw new Error("Draft already started or room closed.");
  }

  const pool = getFactionPool(room.mode);
  room.optionsByPlayer = assignDraftOptions(room.players, pool);
  room.status = "drafting";

  rooms.set(room.code, room);
  await writeRoomsToBlob(rooms);
  return room;
}

export async function submitPick(code: string, playerId: string, factionId: string) {
  const rooms = await getRooms();
  const room = ensureRoom(code, rooms);
  if (room.status !== "drafting") {
    throw new Error("Draft is not active.");
  }

  if (room.picksByPlayer[playerId]) {
    throw new Error("Pick already submitted.");
  }

  const options = room.optionsByPlayer[playerId];
  if (!options) {
    throw new Error("No options assigned for this player.");
  }

  const picked = options.find((f) => f.id === factionId);
  if (!picked) {
    throw new Error("Selected faction is not in your private options.");
  }

  room.picksByPlayer[playerId] = picked;

  if (Object.keys(room.picksByPlayer).length === room.players.length) {
    room.status = "closed";
  }

  rooms.set(room.code, room);
  await writeRoomsToBlob(rooms);
  return room;
}

export async function listRoomPicksForDebug(code: string): Promise<Record<string, Faction>> {
  const rooms = await getRooms();
  return ensureRoom(code, rooms).picksByPlayer;
}
