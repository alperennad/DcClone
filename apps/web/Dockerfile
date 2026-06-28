FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
RUN npm install --workspace apps/web

FROM node:22-alpine AS builder
WORKDIR /app
ARG NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880
ENV NEXT_PUBLIC_LIVEKIT_URL=$NEXT_PUBLIC_LIVEKIT_URL
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY package*.json ./
COPY apps/web ./apps/web
WORKDIR /app/apps/web
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
WORKDIR /app/apps/web
EXPOSE 3000
CMD ["node", "server.js"]
