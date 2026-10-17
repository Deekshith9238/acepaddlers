import {
  randomBytes,
  scrypt as scryptCb,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEYLEN = 64;

/** Hash a password with scrypt. Format: `scrypt$<saltHex>$<hashHex>`. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, KEYLEN);
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

/** Constant-time verify a password against a stored scrypt hash. */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, hashHex] = parts;
  const derived = await scrypt(password, salt, KEYLEN);
  const expected = Buffer.from(hashHex, "hex");
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

export const SESSION_COOKIE = "ap_admin";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

/** Sessions are stored hashed so a DB leak can't be replayed as cookies. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function sessionCookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeMs,
  };
}
