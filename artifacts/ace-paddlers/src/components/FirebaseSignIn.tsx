import { useEffect, useState } from "react";
import {
  EXCHANGE_ERRORS,
  consumeRedirectResult,
  emailIdToken,
  firebaseErrorMessage,
  googleIdToken,
  googleRedirect,
  loadFirebaseConfig,
  redirectViable,
} from "@/lib/firebase";

/* eslint-disable @typescript-eslint/no-explicit-any */

function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" className="w-4 h-4 shrink-0" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 009 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 010-3.44V4.95H.96a9 9 0 000 8.1l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 00.96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

/**
 * Firebase sign-in, shared by the admin console and the agent portal.
 *
 * It only ever produces a Firebase ID token and hands it to `onToken`, which
 * exchanges it for one of our own sessions. The caller decides which realm that
 * is — this component knows nothing about admins or agents.
 */
export default function FirebaseSignIn({
  onToken,
  disabled,
}: {
  /** Exchange the ID token for a session. Return a server error code to show. */
  onToken: (idToken: string) => Promise<string | null>;
  disabled?: boolean;
}) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [mode, setMode] = useState<"buttons" | "email">("buttons");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offerRedirect, setOfferRedirect] = useState(false);
  const [canRedirect, setCanRedirect] = useState(false);

  useEffect(() => {
    loadFirebaseConfig().then((c) => setEnabled(c.enabled));
    redirectViable().then(setCanRedirect);
  }, []);

  // Coming back from a redirect sign-in: finish the exchange we started before
  // the browser left the page.
  useEffect(() => {
    let cancelled = false;
    consumeRedirectResult().then(async (outcome) => {
      if (!outcome || cancelled) return;
      if ("error" in outcome) {
        setError(EXCHANGE_ERRORS[outcome.error] ?? outcome.error);
        return;
      }
      setBusy(true);
      const code = await onToken(outcome.idToken).catch(() => "invalid_token");
      if (!cancelled && code) setError(EXCHANGE_ERRORS[code] ?? "Couldn't sign you in.");
      if (!cancelled) setBusy(false);
    });
    return () => { cancelled = true; };
    // Runs once on mount; onToken is stable for the life of the login screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Nothing is rendered until we know whether Firebase is switched on, so the
  // form never flickers a button that then disappears.
  if (enabled !== true) return null;

  const run = async (getToken: () => Promise<string | null>) => {
    setError(null);
    setBusy(true);
    try {
      const idToken = await getToken();
      // Null means a redirect is under way and the page is about to unload;
      // there is nothing to exchange yet.
      if (!idToken) return;
      const code = await onToken(idToken);
      if (code) setError(EXCHANGE_ERRORS[code] ?? "Couldn't sign you in.");
    } catch (err: any) {
      const code = String(err?.code ?? "");
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        // Not worth an error, but silence looks like a dead button.
        setOfferRedirect(true);
      } else {
        console.error("firebase sign-in failed", err?.code, err?.message, err);
        const msg = firebaseErrorMessage(err);
        if (msg) setError(msg);
        setOfferRedirect(true);
      }
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";
  const labelCls = "block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1";

  return (
    <div>
      <button
        type="button"
        disabled={busy || disabled}
        onClick={() => run(googleIdToken)}
        className="w-full flex items-center justify-center gap-2.5 rounded-lg border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
        <GoogleMark />
        {busy ? "Signing in…" : "Continue with Google"}
      </button>

      {mode === "buttons" ? (
        <button
          type="button"
          disabled={busy || disabled}
          onClick={() => setMode("email")}
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
          Continue with email
        </button>
      ) : (
        <div className="mt-3 rounded-lg border border-slate-200 p-3">
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" autoComplete="username" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Password</label>
              <input type="password" autoComplete="current-password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              disabled={busy || disabled || !email || !password}
              onClick={() => run(() => emailIdToken(email.trim(), password))}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60">
              {busy ? "Signing in…" : "Sign in"}
            </button>
            <button type="button" onClick={() => { setMode("buttons"); setError(null); }} className="text-sm text-slate-500 hover:underline">
              Back
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

      {/* Only where a redirect can actually finish, or after the popup has
          visibly failed. Offering it unconditionally sent people down a route
          that completes at Google and returns with nothing whenever
          `authDomain` is a different site — a worse outcome than the popup
          error it was meant to rescue. */}
      {(canRedirect || offerRedirect) && (
        <p className="text-xs text-slate-500 mt-3">
          {offerRedirect ? "Popup didn't finish? " : "Trouble with the popup? "}
          <button
            type="button"
            disabled={busy || disabled}
            onClick={() => run(googleRedirect)}
            className="font-semibold text-cyan-700 hover:underline disabled:opacity-60">
            Sign in without a popup
          </button>
        </p>
      )}

    </div>
  );
}

/** Divider between Firebase sign-in and a local password form. */
export function SignInDivider({ label = "or" }: { label?: string }) {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    loadFirebaseConfig().then((c) => setEnabled(c.enabled));
  }, []);
  if (!enabled) return null;
  return (
    <div className="flex items-center gap-3 my-5">
      <span className="h-px flex-1 bg-slate-200" />
      <span className="text-xs uppercase tracking-wide text-slate-400">{label}</span>
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  );
}
