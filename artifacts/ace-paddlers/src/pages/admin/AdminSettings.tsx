import AdminLayout from "@/admin/AdminLayout";
import { useGetGoogleIntegration, useDisconnectGoogleIntegration } from "@workspace/api-client-react";

const BANNERS: Record<string, { text: string; ok: boolean }> = {
  connected: { text: "Google Calendar connected.", ok: true },
  error: { text: "Couldn't connect to Google. Please try again.", ok: false },
  no_refresh_token: { text: "Google didn't return a refresh token — remove app access in your Google account and reconnect.", ok: false },
  not_configured: { text: "Google OAuth isn't configured on the server.", ok: false },
};

function Inner() {
  const status = useGetGoogleIntegration();
  const disconnect = useDisconnectGoogleIntegration();
  const data = status.data as { configured: boolean; connected: boolean; calendarId?: string | null; connectedAt?: string | null } | undefined;

  const banner = BANNERS[new URLSearchParams(window.location.search).get("google") ?? ""];

  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">Settings</h1>

      {banner && (
        <div className="mb-6 rounded-lg px-4 py-3 text-sm"
          style={banner.ok ? { background: "#ecfdf5", color: "#047857" } : { background: "#fef2f2", color: "#b91c1c" }}>
          {banner.text}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 max-w-xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Google Calendar</h2>
            <p className="text-sm text-slate-500 mt-1">
              Confirmed bookings are added to your team's Google Calendar automatically.
            </p>
          </div>
          {data?.connected ? (
            <span className="text-xs font-bold uppercase px-2.5 py-1 rounded-full" style={{ background: "#ecfdf5", color: "#047857" }}>Connected</span>
          ) : (
            <span className="text-xs font-bold uppercase px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">Not connected</span>
          )}
        </div>

        <div className="mt-5">
          {!data ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : !data.configured ? (
            <p className="text-sm text-slate-500">
              Set <code className="text-xs bg-slate-100 px-1 rounded">GOOGLE_CLIENT_ID</code>,{" "}
              <code className="text-xs bg-slate-100 px-1 rounded">GOOGLE_CLIENT_SECRET</code> and{" "}
              <code className="text-xs bg-slate-100 px-1 rounded">GOOGLE_REDIRECT_URI</code> on the server to enable.
            </p>
          ) : data.connected ? (
            <div className="space-y-3">
              <div className="text-sm text-slate-600">
                Calendar: <span className="font-medium">{data.calendarId}</span>
                {data.connectedAt && <span className="text-slate-400"> · since {new Date(data.connectedAt).toLocaleDateString()}</span>}
              </div>
              <button
                onClick={() => disconnect.mutate(undefined as never, { onSuccess: () => status.refetch() })}
                className="rounded-lg border border-red-300 text-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-50">
                Disconnect
              </button>
            </div>
          ) : (
            <a href="/api/admin/integrations/google/connect"
              className="inline-block rounded-lg bg-cyan-600 text-white px-5 py-2.5 text-sm font-semibold no-underline hover:bg-cyan-700">
              Connect Google Calendar
            </a>
          )}
        </div>
      </div>
    </>
  );
}

export default function AdminSettings() {
  return (
    <AdminLayout>
      <Inner />
    </AdminLayout>
  );
}
