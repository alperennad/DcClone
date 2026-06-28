import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const envSchema = z.object({
  LIVEKIT_URL: z.string().min(1).default("ws://localhost:7880"),
  LIVEKIT_API_KEY: z.string().min(1).default("devkey"),
  LIVEKIT_API_SECRET: z.string().min(1).default("secret"),
  PORT: z.coerce.number().default(4000),
  WEB_ORIGIN: z.string().optional()
});

export const config = envSchema.parse(process.env);
export const ROOM_NAME = "main-room";
export const MAX_PARTICIPANTS = 10;
