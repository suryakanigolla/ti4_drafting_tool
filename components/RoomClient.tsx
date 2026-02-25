"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
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
  const [hostName, setHostName] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joinCodeInput, setJoinCodeInput] = useState(initialCode || "");
  const [roomCode, setRoomCode] = useState(initialCode || "");
  const [playerId, setPlayerId] = useState("");
  const [hostId, setHostId] = useState("");
  const [mode, setMode] = useState<ModeConfig>(defaultMode);
  const [roomState, setRoomState] = useState<RoomPayload | null>(null);
  const [error, setError] = useState("");
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setJoinCodeInput(initialCode);
    } catch {
      // ignore parse errors
    }
  }, [initialCode]);

  const createRoom = async () => {
    setIsCreatingRoom(true);
    setError("");
    try {
      const result = await postJson("/api/rooms/create", { hostName, mode });
      setRoomCode(result.roomCode);
      setPlayerId(result.playerId);
      setHostId(result.hostId);
      window.history.replaceState(null, "", `/room/${result.roomCode}`);
    } catch (createError) {
      setError((createError as Error).message);
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const joinRoom = async () => {
    setIsJoiningRoom(true);
    setError("");
    try {
      const result = await postJson("/api/rooms/join", { code: joinCodeInput, name: joinName });
      setRoomCode(result.roomCode);
      setPlayerId(result.playerId);
      setHostId(result.hostId);
      window.history.replaceState(null, "", `/room/${result.roomCode}`);
    } catch (joinError) {
      setError((joinError as Error).message);
    } finally {
      setIsJoiningRoom(false);
    }
  };

  const startDraft = async () => {
    if (!roomCode || !hostId) return;
    setIsSubmitting(true);
    setError("");
    try {
      await postJson("/api/rooms/start", { code: roomCode, hostId });
    } catch (startError) {
      setError((startError as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitPick = async (factionId: string) => {
    setIsSubmitting(true);
    setError("");
    try {
      await postJson("/api/rooms/select", { code: roomCode, playerId, factionId });
    } catch (submitError) {
      setError((submitError as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="page-shell">
      <div className="hero glass-panel fade-in-up">
        <p className="hero__eyebrow">Twilight Imperium 4</p>
        <h1 className="hero__title">Faction Draft Room</h1>
        <p className="hero__subtitle">Host a room, invite your table, and run fast hidden faction picks.</p>
      </div>

      {!inRoom ? (
        <div className="panel-grid fade-in-up">
          <Card>
            <CardHeader>
              <CardTitle>Host a Room</CardTitle>
              <CardDescription>Customize the faction pool and generate a room code instantly.</CardDescription>
            </CardHeader>
            <CardContent className="stack">
              <Input placeholder="Host name" value={hostName} onChange={(e) => setHostName(e.target.value)} />

              <div className="settings-list">
                <label className="checkbox-row">
                  <Checkbox type="checkbox" checked={mode.includeBase} disabled readOnly />
                  <span>Base Game (required)</span>
                </label>
                <label className="checkbox-row">
                  <Checkbox
                    checked={mode.includePok}
                    onChange={(e) => setMode((prev) => ({ ...prev, includePok: e.target.checked }))}
                  />
                  <span>Prophecy of Kings</span>
                </label>
                <label className="checkbox-row">
                  <Checkbox
                    checked={mode.includeCodex1}
                    onChange={(e) => setMode((prev) => ({ ...prev, includeCodex1: e.target.checked }))}
                  />
                  <span>Codex 1</span>
                </label>
                <label className="checkbox-row">
                  <Checkbox
                    checked={mode.includeCodex2}
                    onChange={(e) => setMode((prev) => ({ ...prev, includeCodex2: e.target.checked }))}
                  />
                  <span>Codex 2</span>
                </label>
              </div>

              <Button disabled={!hostName.trim()} loading={isCreatingRoom} onClick={createRoom}>
                {isCreatingRoom ? "Creating Room..." : "Create Room"}
              </Button>
            </CardContent>
          </Card>

          <Card className={isJoiningRoom ? "is-joining" : ""}>
            <CardHeader>
              <CardTitle>Join a Room</CardTitle>
              <CardDescription>Enter your name and room code to jump into the draft lobby.</CardDescription>
            </CardHeader>
            <CardContent className="stack">
              <Input placeholder="Player name" value={joinName} onChange={(e) => setJoinName(e.target.value)} />
              <Input
                placeholder="Room code"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                maxLength={6}
              />
              <Button
                variant="secondary"
                disabled={!joinName.trim() || joinCodeInput.length < 6}
                loading={isJoiningRoom}
                onClick={joinRoom}
              >
                {isJoiningRoom ? "Joining Room..." : "Join Room"}
              </Button>
              {isJoiningRoom ? (
                <div className="join-status" role="status" aria-live="polite">
                  <Spinner />
                  <span>Syncing seat and room data...</span>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="fade-in-up">
          <CardHeader>
            <div className="room-headline">
              <CardTitle>Room {roomCode}</CardTitle>
              <Badge>{roomState?.room.status ?? "connecting"}</Badge>
            </div>
            <CardDescription>
              {roomState ? `Players: ${roomState.room.players.map((p) => p.name).join(", ")}` : "Loading room state..."}
            </CardDescription>
          </CardHeader>
          <CardContent className="stack">
            {roomState ? (
              <>
                {roomState.room.status === "lobby" && isHost ? (
                  <Button
                    disabled={roomState.room.players.length < 2}
                    loading={isSubmitting}
                    onClick={startDraft}
                  >
                    {isSubmitting ? "Starting Draft..." : "Start Draft"}
                  </Button>
                ) : null}

                {roomState.room.status === "lobby" && !isHost ? (
                  <p className="muted-pulse">Waiting for host to start drafting...</p>
                ) : null}

                {roomState.room.status === "drafting" ? (
                  <>
                    <p>
                      Progress: {roomState.room.submittedCount}/{roomState.room.totalCount} submitted
                    </p>
                    {roomState.self.picked ? (
                      <p className="success">You picked: {roomState.self.picked.name}</p>
                    ) : (
                      <div className="panel-grid options-grid">
                        {roomState.self.options.map((option, index) => (
                          <Button
                            key={option.id}
                            variant="outline"
                            className="fade-in-up"
                            style={{ animationDelay: `${index * 80}ms` }}
                            disabled={isSubmitting}
                            onClick={() => submitPick(option.id)}
                          >
                            Choose {option.name}
                          </Button>
                        ))}
                      </div>
                    )}
                  </>
                ) : null}

                {roomState.room.status === "closed" ? (
                  <div className="stack">
                    <h3>Happy Gaming</h3>
                    <p>The room is now closed because all players have made their hidden selections.</p>
                    {roomState.self.picked ? <p className="success">Your faction: {roomState.self.picked.name}</p> : null}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="join-status" role="status" aria-live="polite">
                <Spinner />
                <span>Loading room state...</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {error ? <p className="error">{error}</p> : null}
    </main>
  );
}
