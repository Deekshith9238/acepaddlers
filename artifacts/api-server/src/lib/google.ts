import { eq } from "drizzle-orm";
import { db, settings } from "@workspace/db";

const SETTINGS_KEY = "google_calendar";
const SCOPE = "https://www.googleapis.com/auth/calendar.events";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  calendarId: string;
}

/** OAuth app config from env, or null when not configured. */
export function googleEnv(): GoogleConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, redirectUri, calendarId: process.env.GOOGLE_CALENDAR_ID || "primary" };
}

export interface GoogleConnection {
  refreshToken: string;
  calendarId: string;
  connectedAt: string;
}

export async function getConnection(): Promise<GoogleConnection | null> {
  const [row] = await db.select().from(settings).where(eq(settings.key, SETTINGS_KEY)).limit(1);
  return (row?.value as GoogleConnection | undefined) ?? null;
}

export async function saveConnection(conn: GoogleConnection): Promise<void> {
  await db
    .insert(settings)
    .values({ key: SETTINGS_KEY, value: conn, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value: conn, updatedAt: new Date() } });
}

export async function clearConnection(): Promise<void> {
  await db.delete(settings).where(eq(settings.key, SETTINGS_KEY));
}

export function buildAuthUrl(cfg: GoogleConfig): string {
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeCode(cfg: GoogleConfig, code: string): Promise<{ refresh_token?: string }> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: cfg.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`token_exchange_failed: ${await res.text()}`);
  return res.json() as Promise<{ refresh_token?: string }>;
}

export async function refreshAccessToken(cfg: GoogleConfig, refreshToken: string): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`token_refresh_failed: ${await res.text()}`);
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}
