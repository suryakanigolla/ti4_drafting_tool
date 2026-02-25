export type Source = "base" | "pok" | "codex1" | "codex2";

export interface Faction {
  id: string;
  name: string;
  source: Source;
}

export interface ModeConfig {
  includeBase: boolean;
  includePok: boolean;
  includeCodex1: boolean;
  includeCodex2: boolean;
}

export type RoomStatus = "lobby" | "drafting" | "closed";

export interface Player {
  id: string;
  name: string;
  joinedAt: number;
}

export interface Room {
  code: string;
  hostId: string;
  status: RoomStatus;
  createdAt: number;
  mode: ModeConfig;
  players: Player[];
  optionsByPlayer: Record<string, Faction[]>;
  picksByPlayer: Record<string, Faction>;
}
