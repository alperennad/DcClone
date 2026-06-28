# Private LiveKit Voice Chat

A simple private voice chat app for one friend-group room: `main-room`.

## Features

- Nickname-only login, no password
- One voice-only LiveKit room
- Maximum 10 users
- Join and leave room
- Mute and unmute microphone
- Participant list with avatar initials
- Green speaking indicator
- Red muted microphone indicator
- Connection status
- Ping display when the browser exposes RTT stats
- LiveKit reconnect support

## Tech Stack

- Frontend: Next.js 15 App Router, TypeScript, Tailwind CSS
- Backend: Node.js, Express, TypeScript
- Voice: LiveKit WebRTC/SFU
- Docker services: `web`, `server`, `livekit`

## Project Structure

```text
.
├── apps/
│   └── web/                # Next.js voice-room UI
├── server/                 # Express token server
├── docker-compose.yml
├── Dockerfile
├── package.json
└── README.md
```

The older `frontend/` and `backend/` folders are left in the repo, but this app runs from `apps/web` and `server`.

## Environment

Copy the example file:

```bash
cp .env.example .env
```

For local Docker development, the defaults are:

```env
LIVEKIT_URL=ws://livekit:7880
LIVEKIT_PUBLIC_URL=ws://localhost:3000
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:3000
BACKEND_URL=http://server:4000
WEB_ORIGIN=http://localhost:3000
```

`LIVEKIT_URL` is used by the server container. `LIVEKIT_PUBLIC_URL` is used by the browser.

For a live HTTPS deployment, `LIVEKIT_PUBLIC_URL` must be a public secure websocket URL, for example:

```env
LIVEKIT_PUBLIC_URL=wss://livekit.your-domain.com
WEB_ORIGIN=https://your-app-domain.com
```

Do not use `ws://localhost:7880` in production. In a browser, `localhost` means the visitor's own machine, not your server.

For the included `docker-compose.yml`, the public `web` service proxies:

- `/` to the Next.js app
- `/rtc` to LiveKit signal websocket

For `https://dclone.ddantalyasigorta.com/`, set:

```env
LIVEKIT_PUBLIC_URL=wss://dclone.ddantalyasigorta.com
NEXT_PUBLIC_LIVEKIT_URL=wss://dclone.ddantalyasigorta.com
WEB_ORIGIN=https://dclone.ddantalyasigorta.com
```

## Local Development

Install dependencies:

```bash
npm install
```

Start LiveKit in one terminal:

```bash
docker compose up livekit
```

Start the web app and token server in another terminal:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Docker

Build and run everything:

```bash
docker compose up --build
```

Open `http://localhost:3000`.

## Useful Commands

```bash
npm install
npm run dev
docker compose up --build
```

## API

### `GET /token?name=USERNAME`

Generates a LiveKit access token for `main-room`.

- Requires `name`
- Allows audio publish and subscribe
- Rejects new users when the room already has 10 participants
