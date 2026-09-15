import { X509Certificate, createVerify, timingSafeEqual } from "node:crypto";
import { logger } from "./logger";

/**
 * Verification of Firebase ID tokens, without the Firebase Admin SDK.
 *
 * Only the project id is needed to *verify* a token — the signing keys are
 * Google's and are public. Pulling in the Admin SDK would mean shipping a
 * service-account private key for no benefit, which is a much larger secret to
 * look after than the one thing we actually need.
 *
 * Firebase tells us "this person controls this email address". It never tells
 * us who is allowed in — that is what our own tables are for, and no code path
 * here creates an account.
 */

const CERT_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

export function firebaseProjectId(): string | null {
  return process.env.FIREBASE_PROJECT_ID?.trim() || null;
}

export function firebaseConfigured(): boolean {
  return Boolean(firebaseProjectId());
}

/** The public web config, safe to ship to the browser — it identifies the
 *  project, it does not authorise anything. */
export function firebaseWebConfig(requestHost?: string, secure = false): {
  apiKey: string;
  authDomain: string;
  projectId: string;
} | null {
  const projectId = firebaseProjectId();
  const apiKey = process.env.FIREBASE_API_KEY?.trim();
  if (!projectId || !apiKey) return null;
  return {
    apiKey,
    /**
     * Our own host wherever we can, because we proxy `/__/auth/*` to Firebase
     * and a same-origin handshake is the only one Chrome's third-party storage
     * partitioning leaves intact — cross-origin, both the popup and the
     * redirect complete at Google and then arrive home with nothing.
     *
     * Only over HTTPS, though: the SDK always builds `https://<authDomain>`,
     * so handing it a plain-http dev host would point it at a URL that does
     * not exist. Plain http falls back to Firebase's own domain.
     */
    authDomain:
      process.env.FIREBASE_AUTH_DOMAIN?.trim() ||
      (secure && requestHost ? requestHost : `${projectId}.firebaseapp.com`),
    projectId,
  };
}

type CertMap = Record<string, string>;
let certCache: { certs: CertMap; expiresAt: number } | null = null;

/**
 * Google's signing certificates, cached for exactly as long as they say.
 *
 * Honouring their `max-age` rather than picking our own interval matters: keys
 * rotate, and a stale cache would reject every freshly-issued token.
 */
async function fetchCerts(): Promise<CertMap> {
  if (certCache && certCache.expiresAt > Date.now()) return certCache.certs;

  const res = await fetch(CERT_URL);
  if (!res.ok) throw new Error(`firebase certs: HTTP ${res.status}`);
  const certs = (await res.json()) as CertMap;

  const cc = res.headers.get("cache-control") ?? "";
  const maxAge = Number(/max-age=(\d+)/.exec(cc)?.[1] ?? 3600);
  certCache = { certs, expiresAt: Date.now() + maxAge * 1000 };
  return certs;
}

function b64urlToBuffer(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function b64urlToJson<T>(s: string): T {
  return JSON.parse(b64urlToBuffer(s).toString("utf8")) as T;
}

export interface FirebaseIdentity {
  uid: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  /** e.g. "google.com" or "password". */
  provider: string;
}

export class FirebaseAuthError extends Error {
  constructor(readonly code: string, message?: string) {
    super(message ?? code);
  }
}

interface FirebaseClaims {
  iss: string;
  aud: string;
  sub: string;
  exp: number;
  iat: number;
  auth_time?: number;
  email?: string;
  email_verified?: boolean;
  name?: string;
  firebase?: { sign_in_provider?: string };
}

/**
 * Verify a Firebase ID token and return who it says the caller is.
 *
 * Every claim Google documents is checked, not just the signature: a valid
 * signature on a token minted for a *different* project would otherwise be
 * accepted.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<FirebaseIdentity> {
  const projectId = firebaseProjectId();
  if (!projectId) throw new FirebaseAuthError("not_configured");

  const parts = idToken.split(".");
  if (parts.length !== 3) throw new FirebaseAuthError("malformed_token");
  const [headerB64, payloadB64, signatureB64] = parts;

  let header: { alg?: string; kid?: string };
  let claims: FirebaseClaims;
  try {
    header = b64urlToJson(headerB64);
    claims = b64urlToJson(payloadB64);
  } catch {
    throw new FirebaseAuthError("malformed_token");
  }

  // Reject anything that isn't RS256 outright. Trusting the token's own `alg`
  // is how "alg: none" and HMAC-confusion attacks get in.
  if (header.alg !== "RS256") throw new FirebaseAuthError("bad_algorithm");
  if (!header.kid) throw new FirebaseAuthError("no_key_id");

  const certs = await fetchCerts();
  const pem = certs[header.kid];
  if (!pem) throw new FirebaseAuthError("unknown_key");

  const publicKey = new X509Certificate(pem).publicKey;
  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${headerB64}.${payloadB64}`);
  if (!verifier.verify(publicKey, b64urlToBuffer(signatureB64))) {
    throw new FirebaseAuthError("bad_signature");
  }

  const now = Math.floor(Date.now() / 1000);
  // A minute of leeway for clock drift between us and Google.
  const SKEW = 60;
  if (typeof claims.exp !== "number" || claims.exp + SKEW < now) throw new FirebaseAuthError("token_expired");
  if (typeof claims.iat !== "number" || claims.iat - SKEW > now) throw new FirebaseAuthError("token_not_yet_valid");
  if (claims.auth_time && claims.auth_time - SKEW > now) throw new FirebaseAuthError("token_not_yet_valid");

  // Constant-time so the audience check can't be probed character by character.
  const audOk =
    typeof claims.aud === "string" &&
    claims.aud.length === projectId.length &&
    timingSafeEqual(Buffer.from(claims.aud), Buffer.from(projectId));
  if (!audOk) throw new FirebaseAuthError("wrong_project");
  if (claims.iss !== `https://securetoken.google.com/${projectId}`) throw new FirebaseAuthError("wrong_issuer");
  if (!claims.sub) throw new FirebaseAuthError("no_subject");

  const email = claims.email?.trim().toLowerCase();
  if (!email) throw new FirebaseAuthError("no_email");

  /**
   * An unverified email is not an identity.
   *
   * Firebase will happily mint a token for an email/password account created
   * with someone else's address. Without this check, anyone could register
   * `owner@acepaddlers.com` in Firebase and sign straight in as the owner.
   * Google sign-in always carries a verified address.
   */
  if (claims.email_verified !== true) throw new FirebaseAuthError("email_not_verified");

  return {
    uid: claims.sub,
    email,
    emailVerified: true,
    name: claims.name?.trim() || null,
    provider: claims.firebase?.sign_in_provider ?? "unknown",
  };
}

/** Verify, logging the reason on failure without leaking it to the caller. */
export async function verifyOrNull(idToken: string): Promise<FirebaseIdentity | null> {
  try {
    return await verifyFirebaseIdToken(idToken);
  } catch (e) {
    logger.warn({ code: (e as FirebaseAuthError).code ?? "unknown" }, "firebase id token rejected");
    return null;
  }
}
