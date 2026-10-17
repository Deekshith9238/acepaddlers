import { useState } from "react";
import { useLocation } from "wouter";
import { agentLogin, agentFirebaseLogin } from "@workspace/api-client-react";
import FirebaseSignIn, { SignInDivider } from "@/components/FirebaseSignIn";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ERRORS: Record<string, string> = {
  invalid_credentials: "That email and password don't match.",
  not_active: "This account isn't active yet. Ask Ace Paddlers to send you an invitation.",
};

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";
const labelCls = "block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1";

/**
 * The agent portal's sign-in, on its own route away from /admin.
 *
 * Kept visually distinct from the admin login on purpose: an agent is an
 * outside party, and it should be obvious at a glance which door you're at.
 */
export default function AgentLogin() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const me = await agentLogin({ email: email.trim(), password });
      localStorage.setItem("agent_token", (me as any).token);
      navigate("/agent");
    } catch (err: any) {
      setError(ERRORS[err?.data?.error] ?? "Couldn't sign you in. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  /** Same exchange as the admin console, against the agent realm. */
  const exchangeFirebase = async (idToken: string): Promise<string | null> => {
    try {
      const res: any = await agentFirebaseLogin({ idToken });
      if (res?.token) localStorage.setItem("agent_token", res.token);
      navigate("/agent");
      return null;
    } catch (err: any) {
      return err?.data?.error ?? "invalid_token";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#0b2b3a" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-white">Ace Paddlers</h1>
          <p className="text-sm mt-1" style={{ color: "#7fb3c8" }}>Agent portal</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-slate-800">Sign in</h2>
          <p className="text-sm text-slate-500 mt-1 mb-5">
            See the bookings credited to you and what they've earned.
          </p>

          <FirebaseSignIn onToken={exchangeFirebase} disabled={busy} />
          <SignInDivider label="or sign in with a password" />

          <form onSubmit={submit}>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                autoComplete="username"
                className={inputCls}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className={labelCls}>Password</label>
              <input
                type="password"
                autoComplete="current-password"
                className={inputCls}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600 mt-4">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="mt-5 w-full rounded-lg bg-cyan-600 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60">
            {busy ? "Signing in…" : "Sign in"}
          </button>

          </form>
          <p className="text-xs text-slate-400 mt-4">
            No password yet? Ace Paddlers will email you an invitation link to set one.
          </p>
        </div>
      </div>
    </div>
  );
}
