"use client";

import { Mic, MicOff, PhoneOff, Signal } from "lucide-react";
import {
  ConnectionState,
  LocalParticipant,
  Participant,
  RemoteParticipant,
  Room,
  RoomEvent,
  Track
} from "livekit-client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ParticipantView = {
  identity: string;
  name: string;
  isSpeaking: boolean;
  isMuted: boolean;
  isLocal: boolean;
};

type VoiceRoomProps = {
  name: string;
  onLeave: () => void;
};

export function VoiceRoom({ name, onLeave }: VoiceRoomProps) {
  const roomRef = useRef<Room | null>(null);
  const [participants, setParticipants] = useState<ParticipantView[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ping, setPing] = useState<string>("N/A");

  const refreshParticipants = useCallback(() => {
    const room = roomRef.current;
    if (!room) {
      setParticipants([]);
      return;
    }

    const list = [room.localParticipant, ...Array.from(room.remoteParticipants.values())].map(toParticipantView);
    setParticipants(list);
    setIsMuted(room.localParticipant.isMicrophoneEnabled === false);
  }, []);

  const leaveRoom = useCallback(async () => {
    const room = roomRef.current;
    roomRef.current = null;
    if (room) {
      await room.localParticipant.setMicrophoneEnabled(false).catch(() => undefined);
      room.disconnect();
    }
    onLeave();
  }, [onLeave]);

  useEffect(() => {
    let cancelled = false;
    const room = new Room({
      adaptiveStream: false,
      dynacast: true,
      reconnectPolicy: {
        nextRetryDelayInMs: (context) => Math.min(1000 * 2 ** context.retryCount, 10000)
      }
    });

    roomRef.current = room;

    const update = () => refreshParticipants();
    const updateState = (state: ConnectionState) => setConnectionState(state);

    room
      .on(RoomEvent.ParticipantConnected, update)
      .on(RoomEvent.ParticipantDisconnected, update)
      .on(RoomEvent.TrackMuted, update)
      .on(RoomEvent.TrackUnmuted, update)
      .on(RoomEvent.ActiveSpeakersChanged, update)
      .on(RoomEvent.LocalTrackPublished, update)
      .on(RoomEvent.LocalTrackUnpublished, update)
      .on(RoomEvent.ConnectionStateChanged, updateState)
      .on(RoomEvent.Reconnecting, () => setConnectionState(ConnectionState.Reconnecting))
      .on(RoomEvent.Reconnected, () => setConnectionState(ConnectionState.Connected))
      .on(RoomEvent.Disconnected, () => setConnectionState(ConnectionState.Disconnected));

    async function connect() {
      try {
        setError(null);
        const [tokenResponse, configResponse] = await Promise.all([
          fetch(`/api/token?name=${encodeURIComponent(name)}`),
          fetch("/api/config")
        ]);
        const payload = (await tokenResponse.json()) as { token?: string; error?: string };
        const runtimeConfig = (await configResponse.json()) as { livekitUrl?: string };

        if (!tokenResponse.ok || !payload.token) {
          throw new Error(payload.error ?? "Could not join room.");
        }

        if (!runtimeConfig.livekitUrl) {
          throw new Error("LiveKit URL is not configured.");
        }

        await room.connect(runtimeConfig.livekitUrl, payload.token, { autoSubscribe: true });
        await room.localParticipant.setMicrophoneEnabled(true);

        if (!cancelled) {
          setConnectionState(room.state);
          refreshParticipants();
        }
      } catch (connectError) {
        if (!cancelled) {
          setError(connectError instanceof Error ? connectError.message : "Could not join room.");
          setConnectionState(ConnectionState.Disconnected);
        }
      }
    }

    connect();

    return () => {
      cancelled = true;
      room.disconnect();
      roomRef.current = null;
    };
  }, [name, refreshParticipants]);

  useEffect(() => {
    const interval = window.setInterval(async () => {
      const report = await readPing(roomRef.current);
      setPing(report);
    }, 2000);

    return () => window.clearInterval(interval);
  }, []);

  const toggleMute = async () => {
    const room = roomRef.current;
    if (!room) {
      return;
    }

    const nextEnabled = !room.localParticipant.isMicrophoneEnabled;
    await room.localParticipant.setMicrophoneEnabled(nextEnabled);
    refreshParticipants();
  };

  const statusText = useMemo(() => formatConnectionState(connectionState), [connectionState]);

  return (
    <main className="min-h-screen bg-discord-bg text-discord-text">
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[260px_1fr]">
        <aside className="border-b border-discord-line bg-[#15171c] p-4 md:border-b-0 md:border-r">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-discord-muted">Voice channel</p>
            <h1 className="mt-2 text-2xl font-bold">main-room</h1>
          </div>

          <div className="rounded-md bg-discord-raised p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-discord-muted">Status</span>
              <span className={connectionState === ConnectionState.Connected ? "text-discord-green" : "text-yellow-300"}>
                {statusText}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-discord-muted">
                <Signal size={16} />
                Ping
              </span>
              <span>{ping}</span>
            </div>
          </div>
        </aside>

        <section className="flex min-h-screen flex-col">
          <header className="flex h-16 items-center justify-between border-b border-discord-line bg-discord-panel px-4">
            <div>
              <p className="text-sm font-semibold">Connected as {name}</p>
              <p className="text-xs text-discord-muted">{participants.length}/10 participants</p>
            </div>
            <button
              onClick={leaveRoom}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-discord-red px-4 text-sm font-semibold text-white transition hover:brightness-110"
            >
              <PhoneOff size={18} />
              Leave
            </button>
          </header>

          <div className="flex-1 p-4 md:p-6">
            {error ? (
              <div className="rounded-md border border-discord-red bg-discord-red/10 p-4 text-sm text-red-100">{error}</div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {participants.map((participant) => (
                <ParticipantCard key={participant.identity} participant={participant} />
              ))}
            </div>
          </div>

          <footer className="flex items-center justify-center border-t border-discord-line bg-discord-panel p-4">
            <button
              onClick={toggleMute}
              disabled={connectionState !== ConnectionState.Connected}
              className={`inline-flex h-12 items-center gap-3 rounded-md px-5 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                isMuted ? "bg-discord-red" : "bg-discord-raised hover:bg-[#2c303a]"
              }`}
            >
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              {isMuted ? "Unmute" : "Mute"}
            </button>
          </footer>
        </section>
      </div>
    </main>
  );
}

function ParticipantCard({ participant }: { participant: ParticipantView }) {
  return (
    <article className="rounded-lg border border-discord-line bg-discord-panel p-4">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 bg-discord-raised text-lg font-bold ${
            participant.isSpeaking ? "border-discord-green shadow-[0_0_0_4px_rgba(35,165,89,0.18)]" : "border-discord-line"
          }`}
        >
          {initials(participant.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate font-semibold">{participant.name}</h2>
            {participant.isLocal ? <span className="text-xs text-discord-muted">(you)</span> : null}
          </div>
          <p className="text-sm text-discord-muted">{participant.isSpeaking ? "Speaking" : "Listening"}</p>
        </div>
        {participant.isMuted ? <MicOff className="text-discord-red" size={20} aria-label="Muted" /> : <Mic size={20} />}
      </div>
    </article>
  );
}

function toParticipantView(participant: LocalParticipant | RemoteParticipant): ParticipantView {
  const micPublication = participant.getTrackPublication(Track.Source.Microphone);

  return {
    identity: participant.identity,
    name: participant.name || participant.identity,
    isSpeaking: participant.isSpeaking,
    isMuted: micPublication?.isMuted ?? !participant.isMicrophoneEnabled,
    isLocal: participant instanceof LocalParticipant
  };
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatConnectionState(state: ConnectionState) {
  if (state === ConnectionState.Connected) return "Connected";
  if (state === ConnectionState.Reconnecting) return "Reconnecting";
  if (state === ConnectionState.Connecting) return "Connecting";
  return "Disconnected";
}

async function readPing(room: Room | null) {
  if (!room || room.state !== ConnectionState.Connected) {
    return "N/A";
  }

  const maybeRtt = (room.engine as unknown as { client?: { rtt?: number }; rtt?: number }).client?.rtt;
  const rtt = maybeRtt ?? (room.engine as unknown as { rtt?: number }).rtt;
  if (typeof rtt === "number" && Number.isFinite(rtt)) {
    return `${Math.round(rtt * 1000)} ms`;
  }

  try {
    const stats = await room.localParticipant.getTrackPublication(Track.Source.Microphone)?.track?.sender?.getStats();
    const candidate = stats ? Array.from(stats.values()).find((item) => item.type === "candidate-pair" && item.currentRoundTripTime) : undefined;
    return candidate?.currentRoundTripTime ? `${Math.round(candidate.currentRoundTripTime * 1000)} ms` : "N/A";
  } catch {
    return "N/A";
  }
}
