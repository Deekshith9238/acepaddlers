import { useEffect, useState } from "react";
import { useLocation, useSearch, Link } from "wouter";
import { agentAcceptInvite, agentInviteStatus } from "@workspace/api-client-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

const MIN = 10;

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";
const labelCls = "block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1";

/** Accept an invitation and choose a password. */
export default function AgentSetPassword() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const token = new URLSearchParams(search).get("token") ?? "";

  const [who, setWho] = useState<{ name: string; email: string; company: string | null } | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Checked before the form is shown, so an expired link says so plainly rather
  // than failing after someone has typed a password twice.
  useEffect(() => {
    if (!token) return setInvalid(true);
    agentInviteStatus({ token })
      .then((r) => setWho(r as never))
      .catch(() => setInvalid(true));
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < MIN) return setError(`Use at least ${MIN} characters.`);
    if (password !== confirm) return setError("Those two passwords don't match.");
    setBusy(true);
    try {
      const me = await agentAcceptInvite({ token, password });
      localStorage.setItem("agent_token", (me as any).token);
      navigate("/agent");
    } catch (err: any) {
      if (err?.status === 410) setInvalid(true);
      else setError(err?.data?.error === "password_too_short" ? `Use at least ${MIN} characters.` : "Couldn't set that password.");
    } finally {
      setBusy(false);
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
          {invalid ? (
            <>
              <h2 className="text-lg font-semibold text-slate-800">This link has expired</h2>
              <p className="text-sm text-slate-500 mt-2">
                Invitation links last a week and can only be used once. Ask Ace Paddlers to send you a new one.
              </p>
              <Link href="/agent/login" className="mt-4 inline-block text-sm font-semibold text-cyan-700 no-underline hover:underline">
                Back to sign in
              </Link>
            </>
          ) : !who ? (
            <p className="text-sm text-slate-400">Checking your invitation…</p>
          ) : (
            <form onSubmit={submit}>
              <h2 className="text-lg font-semibold text-slate-800">Welcome, {who.name}</h2>
              <p className="text-sm text-slate-500 mt-1 mb-5">
                Choose a password for <span className="font-medium">{who.email}</span>.
              </p>
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>New password</label>
                  <input type="password" autoComplete="new-password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <p className="text-xs text-slate-400 mt-1">At least {MIN} characters.</p>
                </div>
                <div>
                  <label className={labelCls}>Confirm password</label>
                  <input type="password" autoComplete="new-password" className={inputCls} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                </div>
              </div>
              {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="mt-5 w-full rounded-lg bg-cyan-600 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60">
                {busy ? "Saving…" : "Set password and sign in"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
