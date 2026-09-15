import { useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";
export const labelCls = "block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1";

export function rupees(n: number, currency = "INR"): string {
  const v = Number(n || 0).toLocaleString("en-IN");
  return currency === "INR" ? `₹${v}` : `${currency} ${v}`;
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/**
 * Handles both shapes the API returns: a departure's date-only "2026-09-07"
 * and a timestamp like "2026-09-05T06:33:36.160Z". Appending a time to the
 * latter produced an invalid date, which fell through to printing the raw ISO.
 */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00` : iso);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * A block of the booking that reads as plain text until someone asks to change
 * it, then becomes an editor with its own Save and Discard.
 *
 * This is the shape Vacation Labs uses, and the reason is not decoration: a
 * booking is mostly a record of something that already happened. Presenting it
 * as one large form invites accidental edits to a field nobody meant to touch,
 * and makes "who changed the phone number" impossible to reason about. Scoping
 * the edit to one block means one save touches one thing.
 */
export function EditableSection({
  title,
  icon,
  children,
  editor,
  onSave,
  onDiscard,
  saving,
  error,
  canEdit = true,
  editLabel = "Edit",
  compact = false,
}: {
  title: React.ReactNode;
  icon?: React.ReactNode;
  /** Read-only view. */
  children: React.ReactNode;
  /** Editor, given a `close` it should call after a successful save. */
  editor: (close: () => void) => React.ReactNode;
  onSave: (close: () => void) => void;
  /**
   * Throw away this section's in-progress edit. Required, because the draft
   * lives on the parent: without it, Discard would only hide the editor and
   * reopening would hand back the text the user just rejected — and the next
   * Save would quietly persist it.
   */
  onDiscard?: () => void;
  saving?: boolean;
  error?: string | null;
  canEdit?: boolean;
  editLabel?: string;
  /** Right-rail styling: no card chrome, tighter spacing. */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const discard = () => {
    onDiscard?.();
    setOpen(false);
  };

  const header = (
    <div className="flex items-start justify-between gap-3">
      <h3 className={compact ? "text-sm font-semibold text-slate-700 flex items-center gap-1.5" : "text-base font-semibold text-slate-800 flex items-center gap-2"}>
        {icon}
        {title}
      </h3>
      {canEdit && !open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="shrink-0 rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">
          {editLabel}
        </button>
      )}
      {open && (
        <div className="shrink-0 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSave(close)}
            disabled={saving}
            className="rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={discard}
            className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">
            Discard
          </button>
        </div>
      )}
    </div>
  );

  const body = (
    <div className={compact ? "mt-1.5" : "mt-3"}>
      {open ? editor(close) : children}
      {error && open && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );

  if (compact) {
    return (
      <div className="py-3 border-b border-slate-100 last:border-0">
        {header}
        {body}
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-5">
      {header}
      {body}
    </div>
  );
}

/** Read-only value with the muted em-dash placeholder used throughout. */
export function Value({ children }: { children: React.ReactNode }) {
  const empty = children === null || children === undefined || children === "";
  return <div className={`text-sm ${empty ? "text-slate-300" : "text-slate-700"} whitespace-pre-wrap`}>{empty ? "—" : children}</div>;
}

export const STATUS_STYLES: Record<string, { bg: string; fg: string; label: string }> = {
  pending: { bg: "#fef3c7", fg: "#92400e", label: "Pending confirmation" },
  confirmed: { bg: "#d1fae5", fg: "#065f46", label: "Confirmed" },
  completed: { bg: "#e0e7ff", fg: "#3730a3", label: "Completed" },
  cancelled: { bg: "#fee2e2", fg: "#991b1b", label: "Cancelled" },
  cart_abandoned: { bg: "#e2e8f0", fg: "#475569", label: "Cart abandoned" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { bg: "#e2e8f0", fg: "#475569", label: status };
  return (
    <span className="rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide" style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  );
}

export function Pill({ tone, children }: { tone: "warn" | "info" | "danger"; children: React.ReactNode }) {
  const styles = {
    warn: { background: "#fef3c7", color: "#92400e" },
    info: { background: "#e0f2fe", color: "#075985" },
    danger: { background: "#fee2e2", color: "#991b1b" },
  }[tone];
  return (
    <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={styles}>
      {children}
    </span>
  );
}
