import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  GoogleAuthProvider,
  getAuth,
  getRedirectResult,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type Auth,
} from "firebase/auth";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface FirebaseConfig {
  enabled: boolean;
  apiKey: string | null;
  authDomain: string | null;
  projectId: string | null;
}

let configPromise: Promise<FirebaseConfig> | null = null;
let app: FirebaseApp | null = null;
let auth: Auth | null = null;

/**
 * The Firebase config is fetched at runtime rather than baked into the bundle.
 *
 * One build then works across local, staging and production, and turning
 * Firebase sign-in on or off is a server setting rather than a rebuild. Cached
 * for the life of the page: it cannot change under us mid-session.
 */
export function loadFirebaseConfig(): Promise<FirebaseConfig> {
  configPromise ??= fetch("/api/auth/firebase-config")
    .then((r) => (r.ok ? r.json() : { enabled: false, apiKey: null, authDomain: null, projectId: null }))
    .catch(() => ({ enabled: false, apiKey: null, authDomain: null, projectId: null }));
  return configPromise;
}

async function getFirebaseAuth(): Promise<Auth> {
  const cfg = await loadFirebaseConfig();
  if (!cfg.enabled || !cfg.apiKey || !cfg.projectId) throw new Error("firebase_not_configured");
  if (!auth) {
    app ??= initializeApp({
      apiKey: cfg.apiKey,
      authDomain: cfg.authDomain ?? `${cfg.projectId}.firebaseapp.com`,
      projectId: cfg.projectId,
    });
    auth = getAuth(app);
  }
  return auth;
}

/**
 * The token is the only thing that leaves this module — our server verifies it
 * and issues its own session, so the Firebase session is never what authorises
 * a request.
 */
function googleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  // Always ask which account, rather than silently reusing the one Chrome
  // happens to be signed into — staff and agents often have two.
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

/** Errors that mean "the popup couldn't run here", not "the user said no". */
const POPUP_UNAVAILABLE = new Set([
  "auth/popup-blocked",
  "auth/operation-not-supported-in-this-environment",
  "auth/web-storage-unsupported",
  "auth/internal-error",
]);

const REDIRECT_FLAG = "firebase_redirect_pending";

/**
 * Is a redirect sign-in able to finish in this browser?
 *
 * The redirect has no opener window, so the SDK has to leave the result in
 * storage at `authDomain` and read it back through the hidden iframe it embeds
 * in our page. When `authDomain` is a different site, that iframe's storage is
 * partitioned away from the one the redirect wrote to, and the result is simply
 * gone — the user comes back signed in at Google and signed out here.
 *
 * Same-origin (our `/__/auth/*` proxy) there is no third party and it works.
 */
export async function redirectViable(): Promise<boolean> {
  const cfg = await loadFirebaseConfig();
  return Boolean(cfg.authDomain) && cfg.authDomain === window.location.host;
}

/**
 * Sign in with Google and hand back the ID token.
 *
 * A popup is used because it is the only flow that survives a cross-site
 * `authDomain`: the handler talks straight back to the window that opened it,
 * so nothing depends on third-party storage. We fall back to a redirect only
 * where a redirect can actually finish — otherwise it would trade a visible
 * error for a silent dead end, which is exactly what it used to do.
 */
export async function googleIdToken(): Promise<string | null> {
  const a = await getFirebaseAuth();
  try {
    const cred = await signInWithPopup(a, googleProvider());
    return cred.user.getIdToken();
  } catch (err: any) {
    const code = String(err?.code ?? "");
    if (!POPUP_UNAVAILABLE.has(code) || !(await redirectViable())) throw err;
    sessionStorage.setItem(REDIRECT_FLAG, "1");
    await signInWithRedirect(a, googleProvider());
    return null;
  }
}

/** Google sign-in via a full-page redirect, for when a popup won't do. */
export async function googleRedirect(): Promise<null> {
  const a = await getFirebaseAuth();
  sessionStorage.setItem(REDIRECT_FLAG, "1");
  await signInWithRedirect(a, googleProvider());
  return null;
}

/**
 * The outcome of a redirect sign-in we started before the page unloaded.
 *
 * `null` on an ordinary page load. Coming back from a redirect with nothing to
 * show is not "nothing happened" — it is a failure, and reporting it as one is
 * the difference between a diagnosable message and a button that appears to do
 * nothing at all.
 */
export type RedirectOutcome = { idToken: string } | { error: string } | null;

export async function consumeRedirectResult(): Promise<RedirectOutcome> {
  if (sessionStorage.getItem(REDIRECT_FLAG) !== "1") return null;
  sessionStorage.removeItem(REDIRECT_FLAG);
  try {
    const a = await getFirebaseAuth();
    const cred = await getRedirectResult(a);
    if (cred) return { idToken: await cred.user.getIdToken() };
    return { error: (await redirectViable()) ? "redirect_empty" : "redirect_partitioned" };
  } catch (err: any) {
    return { error: firebaseErrorMessage(err) || "redirect_empty" };
  }
}

/** Sign in with a Firebase email/password account and hand back the ID token. */
export async function emailIdToken(email: string, password: string): Promise<string> {
  const a = await getFirebaseAuth();
  const cred = await signInWithEmailAndPassword(a, email, password);
  return cred.user.getIdToken();
}

/**
 * Drop the Firebase session.
 *
 * Worth doing on sign-out even though our own session is what matters: leaving
 * it behind means the next "Continue with Google" silently reuses the previous
 * person's account on a shared machine.
 */
export async function firebaseSignOut(): Promise<void> {
  if (!auth) return;
  await signOut(auth).catch(() => {});
}

/** Turn Firebase's own error codes into something worth reading. */
export function firebaseErrorMessage(err: any): string {
  const code = String(err?.code ?? "");
  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in window. Allow popups for this site and try again.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "That email and password don't match.";
    case "auth/invalid-email":
      return "That doesn't look like an email address.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a few minutes and try again.";
    case "auth/unauthorized-domain":
      return "This domain isn't authorised in Firebase. Add it under Authentication → Settings → Authorized domains.";
    case "auth/operation-not-allowed":
      return "That sign-in method isn't enabled in Firebase.";
    case "auth/admin-restricted-operation":
      /**
       * Firebase is set to block account creation, and Google sign-in has to
       * create the Firebase record the first time a person uses it — there is
       * no way to pre-create a Google-provider user by hand. So this is not
       * about who is allowed in here; our own tables decide that, and they
       * decide it after Firebase has finished.
       */
      return "Google sign-in can't complete because Firebase is set to block new accounts. An administrator needs to allow sign-up under Authentication \u2192 Settings \u2192 User actions.";
    case "auth/web-storage-unsupported":
    case "auth/internal-error":
      // Almost always the browser refusing the storage or the opener link the
      // sign-in window needs, rather than anything wrong at Firebase.
      return "Your browser blocked the sign-in window. Allow popups and third-party cookies for this site, then try again.";
    default:
      // Name the code. An unrecognised failure that all looks the same from the
      // outside is unsupportable — this is the one line that turns "it doesn't
      // work" into something anyone can look up.
      return code
        ? `Couldn't sign you in with Firebase (${code}).`
        : "Couldn't sign you in with Firebase.";
  }
}

/** What our own server says after it has verified the token. */
export const EXCHANGE_ERRORS: Record<string, string> = {
  no_account: "That account isn't set up here. Ask an administrator to add you first.",
  invalid_token: "Your sign-in couldn't be verified. Make sure your email address is verified, then try again.",
  firebase_not_configured: "Firebase sign-in isn't configured on this server.",
  redirect_partitioned:
    "Google sent you back, but this browser blocks the cross-site storage the no-popup flow needs. Use \u201cContinue with Google\u201d and allow the popup instead.",
  redirect_empty: "Google sent you back without completing the sign-in. Try again.",
};
