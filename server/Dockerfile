FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY server/package*.json ./server/
RUN npm install --workspace server

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY package*.json ./
COPY server ./server
RUN npm run build --workspace server

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY server/package*.json ./server/
RUN npm install --omit=dev --workspace server
COPY --from=builder /app/server/dist ./server/dist
WORKDIR /app/server
EXPOSE 4000
CMD ["npm", "run", "start"]
