import { assignDraftOptions, getFactionPool } from "@/lib/draft";
import { Faction, ModeConfig, Player, Room } from "@/types/draft";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

declare global {
  // eslint-disable-next-line no-var
  var __ti4Rooms: Map<string, Room> | undefined;
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOMS_FILE = join(process.cwd(), "data", ".rooms.runtime.json");

function randomCode(len = 6): string {
  return Array.from({ length: len }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
}

function randomId(): string {
  return crypto.randomUUID();
}

function readRoomsFromDisk(): Map<string, Room> {
  try {
    const raw = readFileSync(ROOMS_FILE, "utf8");
    const parsed = JSON.parse(raw) as Record<string, Room>;
    return new Map(Object.entries(parsed));
  } catch {
    return new Map<string, Room>();
  }
}

function writeRoomsToDisk(rooms: Map<string, Room>) {
  mkdirSync(dirname(ROOMS_FILE), { recursive: true });
  const serialized = JSON.stringify(Object.fromEntries(rooms), null, 2);
  const tempFile = `${ROOMS_FILE}.tmp`;
  writeFileSync(tempFile, serialized, "utf8");
  renameSync(tempFile, ROOMS_FILE);
}

function getRooms(): Map<string, Room> {
  const rooms = readRoomsFromDisk();
  globalThis.__ti4Rooms = rooms;
  return rooms;
}

function ensureRoom(code: string, rooms: Map<string, Room>): Room {
  const room = rooms.get(code.toUpperCase());
  if (!room) {
    throw new Error("Room not found.");
  }
  return room;
}

export function createRoom(hostName: string, mode: ModeConfig) {
  const rooms = getRooms();
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
  writeRoomsToDisk(rooms);
  return { room, player: host };
}

export function joinRoom(code: string, playerName: string): { room: Room; player: Player } {
  const rooms = getRooms();
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
  writeRoomsToDisk(rooms);
  return { room, player };
}

export function getRoomStatus(code: string, playerId: string) {
  const rooms = getRooms();
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

export function startDraft(code: string, hostId: string) {
  const rooms = getRooms();
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
  writeRoomsToDisk(rooms);
  return room;
}

export function submitPick(code: string, playerId: string, factionId: string) {
  const rooms = getRooms();
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
  writeRoomsToDisk(rooms);
  return room;
}

export function listRoomPicksForDebug(code: string): Record<string, Faction> {
  const rooms = getRooms();
  return ensureRoom(code, rooms).picksByPlayer;
}
