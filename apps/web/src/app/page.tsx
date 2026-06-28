"use client";

import { useState } from "react";
import { VoiceRoom } from "@/components/voice-room";

export default function Home() {
  const [nickname, setNickname] = useState("");
  const [joinedName, setJoinedName] = useState<string | null>(null);

  if (joinedName) {
    return <VoiceRoom name={joinedName} onLeave={() => setJoinedName(null)} />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-discord-bg px-4">
      <section className="w-full max-w-md rounded-lg border border-discord-line bg-discord-panel p-6 shadow-2xl">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-discord-green">main-room</p>
          <h1 className="mt-2 text-3xl font-bold text-discord-text">Join voice</h1>
          <p className="mt-2 text-sm text-discord-muted">Nickname only. Voice only. Up to 10 friends.</p>
        </div>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const cleanName = nickname.trim();
            if (cleanName) {
              setJoinedName(cleanName.slice(0, 32));
            }
          }}
        >
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-discord-muted">Nickname</span>
            <input
              autoFocus
              maxLength={32}
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              className="h-12 w-full rounded-md border border-discord-line bg-discord-bg px-4 text-discord-text outline-none transition focus:border-discord-blurple"
              placeholder="e.g. alex"
            />
          </label>

          <button
            type="submit"
            disabled={!nickname.trim()}
            className="h-12 w-full rounded-md bg-discord-blurple font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Join room
          </button>
        </form>
      </section>
    </main>
  );
}
