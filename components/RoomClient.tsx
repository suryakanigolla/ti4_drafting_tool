"use client";

import { Faction, ModeConfig, Player, RoomStatus } from "@/types/draft";
import { useEffect, useMemo, useState } from "react";

interface RoomPayload {
  room: {
    code: string;
    hostId: string;
    status: RoomStatus;
    players: Player[];
    mode: ModeConfig;
    submittedCount: number;
    totalCount: number;
  };
  self: {
    playerId: string;
    options: Faction[];
    picked: Faction | null;
  };
}

const defaultMode: ModeConfig = {
  includeBase: true,
  includePok: false,
  includeCodex1: false,
  includeCodex2: false
};

async function postJson(url: string, payload: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error || "Request failed");
  }
  return json;
}

export function RoomClient({ initialCode }: { initialCode?: string }) {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState(initialCode || "");
  const [playerId, setPlayerId] = useState("");
  const [hostId, setHostId] = useState("");
  const [mode, setMode] = useState<ModeConfig>(defaultMode);
  const [roomState, setRoomState] = useState<RoomPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const inRoom = Boolean(roomCode && playerId);
  const isHost = hostId === playerId;

  const storageKey = useMemo(() => (roomCode ? `ti4:${roomCode}` : ""), [roomCode]);

  useEffect(() => {
    if (!inRoom) return;
    const poll = async () => {
      try {
        const response = await fetch(`/api/rooms/status?code=${roomCode}&playerId=${playerId}`);
        const json = await response.json();
        if (!response.ok) {
          throw new Error(json.error || "Could not load room status");
        }
        setRoomState(json as RoomPayload);
        setError("");
      } catch (pollError) {
        setError((pollError as Error).message);
      }
    };

    void poll();
    const interval = window.setInterval(() => {
      void poll();
    }, 1500);
    return () => window.clearInterval(interval);
  }, [inRoom, roomCode, playerId]);

  useEffect(() => {
    if (!storageKey || !playerId || !hostId) return;
    localStorage.setItem(storageKey, JSON.stringify({ playerId, hostId }));
  }, [storageKey, playerId, hostId]);

  useEffect(() => {
    if (!initialCode) return;
    const existing = localStorage.getItem(`ti4:${initialCode}`);
    if (!existing) return;
    try {
      const parsed = JSON.parse(existing) as { playerId: string; hostId: string };
      setPlayerId(parsed.playerId);
      setHostId(parsed.hostId);
      setRoomCode(initialCode);
    } catch {
      // ignore parse errors
    }
  }, [initialCode]);

  const createRoom = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await postJson("/api/rooms/create", { hostName: name, mode });
      setRoomCode(result.roomCode);
      setPlayerId(result.playerId);
      setHostId(result.hostId);
      window.history.replaceState(null, "", `/room/${result.roomCode}`);
    } catch (createError) {
      setError((createError as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await postJson("/api/rooms/join", { code: roomCode, name });
      setRoomCode(result.roomCode);
      setPlayerId(result.playerId);
      setHostId(result.hostId);
      window.history.replaceState(null, "", `/room/${result.roomCode}`);
    } catch (joinError) {
      setError((joinError as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const startDraft = async () => {
    if (!roomCode || !hostId) return;
    setLoading(true);
    setError("");
    try {
      await postJson("/api/rooms/start", { code: roomCode, hostId });
    } catch (startError) {
      setError((startError as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const submitPick = async (factionId: string) => {
    setLoading(true);
    setError("");
    try {
      await postJson("/api/rooms/select", { code: roomCode, playerId, factionId });
    } catch (submitError) {
      setError((submitError as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid">
      <h1>TI4 Faction Draft</h1>
      {!inRoom ? (
        <div className="grid grid-2">
          <section className="card grid">
            <h2>Host a Room</h2>
            <input placeholder="Host name" value={name} onChange={(e) => setName(e.target.value)} />
            <label>
              <input type="checkbox" checked={mode.includeBase} disabled readOnly /> Base Game (required)
            </label>
            <label>
              <input
                type="checkbox"
                checked={mode.includePok}
                onChange={(e) => setMode((prev) => ({ ...prev, includePok: e.target.checked }))}
              />
              Prophecy of Kings
            </label>
            <label>
              <input
                type="checkbox"
                checked={mode.includeCodex1}
                onChange={(e) => setMode((prev) => ({ ...prev, includeCodex1: e.target.checked }))}
              />
              Codex 1
            </label>
            <label>
              <input
                type="checkbox"
                checked={mode.includeCodex2}
                onChange={(e) => setMode((prev) => ({ ...prev, includeCodex2: e.target.checked }))}
              />
              Codex 2
            </label>
            <button disabled={loading || !name.trim()} onClick={createRoom}>
              Create Room
            </button>
          </section>

          <section className="card grid">
            <h2>Join a Room</h2>
            <input placeholder="Player name" value={name} onChange={(e) => setName(e.target.value)} />
            <input
              placeholder="Room code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={6}
            />
            <button disabled={loading || !name.trim() || roomCode.length < 6} onClick={joinRoom}>
              Join Room
            </button>
          </section>
        </div>
      ) : (
        <section className="card grid">
          <p>
            <strong>Room:</strong> {roomCode}
          </p>
          {roomState ? (
            <>
              <p>
                <strong>Status:</strong> {roomState.room.status}
              </p>
              <p>
                <strong>Players:</strong> {roomState.room.players.map((p) => p.name).join(", ")}
              </p>

              {roomState.room.status === "lobby" && isHost && (
                <button disabled={loading || roomState.room.players.length < 2} onClick={startDraft}>
                  Start Draft
                </button>
              )}

              {roomState.room.status === "lobby" && !isHost && <p>Waiting for host to start drafting…</p>}

              {roomState.room.status === "drafting" && (
                <>
                  <p>
                    Progress: {roomState.room.submittedCount}/{roomState.room.totalCount} submitted
                  </p>
                  {roomState.self.picked ? (
                    <p className="success">You picked: {roomState.self.picked.name}</p>
                  ) : (
                    <div className="grid grid-2">
                      {roomState.self.options.map((option) => (
                        <button key={option.id} disabled={loading} onClick={() => submitPick(option.id)}>
                          Choose {option.name}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {roomState.room.status === "closed" && (
                <div className="grid">
                  <h2>Happy Gaming</h2>
                  <p>The room is now closed because all players have made their hidden selections.</p>
                  {roomState.self.picked && <p className="success">Your faction: {roomState.self.picked.name}</p>}
                </div>
              )}
            </>
          ) : (
            <p>Loading room state…</p>
          )}
        </section>
      )}

      {error && <p className="error">{error}</p>}
    </main>
  );
}
