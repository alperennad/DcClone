import cors from "cors";
import express from "express";
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { config, MAX_PARTICIPANTS, ROOM_NAME } from "./config.js";

const app = express();
const roomService = new RoomServiceClient(
  toHttpUrl(config.LIVEKIT_URL),
  config.LIVEKIT_API_KEY,
  config.LIVEKIT_API_SECRET
);

app.use(
  cors({
    origin: config.WEB_ORIGIN ?? true
  })
);

app.get("/health", (_req, res) => {
  res.json({ ok: true, room: ROOM_NAME });
});

app.get("/token", async (req, res) => {
  const rawName = typeof req.query.name === "string" ? req.query.name : "";
  const name = rawName.trim().slice(0, 32);

  if (!name) {
    res.status(400).json({ error: "Nickname is required." });
    return;
  }

  try {
    const participants = await roomService.listParticipants(ROOM_NAME).catch(() => []);
    const alreadyJoined = participants.some((participant) => participant.identity === name);

    if (!alreadyJoined && participants.length >= MAX_PARTICIPANTS) {
      res.status(403).json({ error: "Room is full. Maximum 10 users are allowed." });
      return;
    }

    const token = new AccessToken(config.LIVEKIT_API_KEY, config.LIVEKIT_API_SECRET, {
      identity: name,
      name,
      ttl: "2h"
    });

    token.addGrant({
      room: ROOM_NAME,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: false
    });

    res.json({ token: await token.toJwt(), room: ROOM_NAME });
  } catch (error) {
    console.error("Failed to create LiveKit token", error);
    res.status(500).json({ error: "Could not create token." });
  }
});

app.listen(config.PORT, () => {
  console.log(`Token server listening on http://localhost:${config.PORT}`);
});

function toHttpUrl(url: string) {
  if (url.startsWith("ws://")) {
    return `http://${url.slice("ws://".length)}`;
  }

  if (url.startsWith("wss://")) {
    return `https://${url.slice("wss://".length)}`;
  }

  return url;
}
