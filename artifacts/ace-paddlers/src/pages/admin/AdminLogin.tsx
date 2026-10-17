import { useState } from "react";
import { useLocation } from "wouter";
import { useAdminLogin, adminFirebaseLogin } from "@workspace/api-client-react";
import FirebaseSignIn, { SignInDivider } from "@/components/FirebaseSignIn";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useAdminLogin();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate(
      { data: { email, password } },
      {
        onSuccess: (res) => {
          if (res.token) {
            localStorage.setItem("admin_token", res.token);
          }
          navigate("/admin");
        },
      },
    );
  };

  /**
   * Trade the Firebase token for one of our own sessions.
   *
   * Firebase has established who they are; the server decides whether that
   * person has a staff account here. A server error code comes back for the
   * button to show, rather than being thrown.
   */
  const exchangeFirebase = async (idToken: string): Promise<string | null> => {
    try {
      const res: any = await adminFirebaseLogin({ idToken });
      if (res?.token) localStorage.setItem("admin_token", res.token);
      navigate("/admin");
      return null;
    } catch (err: any) {
      return err?.data?.error ?? "invalid_token";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-xl">
        <h1 className="text-xl font-semibold text-slate-800 mb-1">Ace Paddlers Admin</h1>
        <p className="text-sm text-slate-500 mb-6">Sign in to manage content</p>

        <FirebaseSignIn onToken={exchangeFirebase} disabled={login.isPending} />
        <SignInDivider label="or sign in with a password" />

        <form onSubmit={onSubmit}>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">Email</label>
          <input
            type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">Password</label>
          <input
            type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm mb-6 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
          {login.isError && (
            <p className="text-sm text-red-600 mb-4">Invalid email or password.</p>
          )}
          <button
            type="submit" disabled={login.isPending}
            className="w-full rounded-lg bg-cyan-600 text-white py-2.5 text-sm font-semibold hover:bg-cyan-700 disabled:opacity-60">
            {login.isPending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
