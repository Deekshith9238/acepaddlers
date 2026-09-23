import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, GripVertical } from "lucide-react";
import FactTextEditor from "./FactTextEditor";
import { C } from "@/data/constants";
import { richTextPlain } from "@/lib/richText";

export interface FactRow {
  width?: number;
  label?: string;
  value?: string;
}

type FactColumn = { id: string; fact: FactRow };
type History = { facts: FactColumn[]; undo: FactColumn[][]; redo: FactColumn[][] };

/** Editable counterpart of the public facts band, with saved column order. */
export default function FactsGrid({ rows, onChange }: { rows: FactRow[]; onChange: (rows: FactRow[]) => void }) {
  const nextId = useRef(0);
  const resize = useRef<{ id: string; x: number; width: number } | null>(null);
  const [resizeWidth, setResizeWidth] = useState<{ id: string; width: number } | null>(null);
  const draggedId = useRef<string | null>(null);
  const lastRows = useRef(rows);
  const [history, setHistory] = useState<History>(() => ({
    facts: rows.map((fact) => ({ id: `fact-${nextId.current++}`, fact })),
    undo: [],
    redo: [],
  }));
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const { facts } = history;

  // A save/refetch can replace the input. Local edits echo the exact array we
  // emitted, so those must not reset column identities or editing history.
  useEffect(() => {
    if (rows === lastRows.current) return;
    lastRows.current = rows;
    setHistory({
      facts: rows.map((fact) => ({ id: `fact-${nextId.current++}`, fact })),
      undo: [],
      redo: [],
    });
    setSelected(new Set());
  }, [rows]);

  const publish = useCallback((next: History) => {
    const output = next.facts.map(({ fact }) => fact);
    lastRows.current = output;
    setHistory(next);
    onChange(output);
  }, [onChange]);

  const change = useCallback((next: FactColumn[]) => {
    publish({ facts: next, undo: [...history.undo, facts].slice(-20), redo: [] });
  }, [facts, history.undo, publish]);

  const undo = () => {
    const previous = history.undo.at(-1);
    if (previous) publish({ facts: previous, undo: history.undo.slice(0, -1), redo: [...history.redo, facts] });
  };
  const redo = () => {
    const next = history.redo.at(-1);
    if (next) publish({ facts: next, undo: [...history.undo, facts], redo: history.redo.slice(0, -1) });
  };

  const edit = (id: string, key: "label" | "value", value: string) => {
    change(facts.map((column) => column.id === id
      ? { ...column, fact: { ...column.fact, [key]: value } }
      : column));
  };
  const move = (id: string, target: number) => {
    const source = facts.findIndex((column) => column.id === id);
    if (source < 0 || target < 0 || target >= facts.length || source === target) return;
    const next = [...facts];
    const [column] = next.splice(source, 1);
    next.splice(target, 0, column);
    change(next);
  };

  const selectedCount = facts.filter(({ id }) => selected.has(id)).length;
  const btn = "rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40";

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button type="button" className={btn} onClick={() => change([...facts, { id: `fact-${nextId.current++}`, fact: { label: "", value: "" } }])}>+ Add fact</button>
        <button type="button" className={btn} disabled={selectedCount === 0} onClick={() => {
          change(facts.filter(({ id }) => !selected.has(id)));
          setSelected(new Set());
        }}>
          Remove selected{selectedCount > 1 ? ` (${selectedCount})` : ""}
        </button>
        <button type="button" className={btn} onClick={undo} disabled={!history.undo.length}>Undo</button>
        <button type="button" className={btn} onClick={redo} disabled={!history.redo.length}>Redo</button>
        <span className="ml-auto text-xs text-slate-400">Drag the handles to reorder · select text to format · drag column edges to resize</span>
      </div>
      {facts.length === 0 ? (
        <p className="rounded-xl border border-slate-200 p-6 text-sm text-slate-400">No facts yet — “+ Add fact” starts one.</p>
      ) : (
        <div className="flex flex-wrap gap-x-8 gap-y-6 rounded-xl px-6 py-6 md:py-8"
          style={{ backgroundColor: C.muted,  }}>
          {facts.map(({ id, fact }, index) => {
            const name = richTextPlain(fact.label) || `Fact ${index + 1}`;
            return (
              <div key={id} className="relative min-w-0 rounded-md"
                style={{ flex: (resizeWidth?.id === id ? resizeWidth.width : fact.width) ? `0 0 min(100%, ${resizeWidth?.id === id ? resizeWidth.width : fact.width}px)` : "1 1 192px" }}
                onDragOver={(event) => { if (draggedId.current) event.preventDefault(); }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (draggedId.current) move(draggedId.current, index);
                  draggedId.current = null;
                }}>
                <div className="mb-2 flex items-center gap-2 text-slate-500">
                  <input type="checkbox" aria-label={`Select ${name}`} checked={selected.has(id)}
                    onChange={() => setSelected((current) => {
                      const next = new Set(current);
                      if (next.has(id)) next.delete(id); else next.add(id);
                      return next;
                    })} />
                  <span draggable className="cursor-grab rounded p-1 active:cursor-grabbing" title={`Drag ${name} to reorder`}
                    onDragStart={(event) => {
                      draggedId.current = id;
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", id);
                    }}
                    onDragEnd={() => { draggedId.current = null; }}>
                    <GripVertical className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <button type="button" className="ml-auto rounded p-1 hover:bg-white/60 disabled:opacity-30"
                    aria-label={`Move ${name} left`} disabled={index === 0} onClick={() => move(id, index - 1)}>
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" className="rounded p-1 hover:bg-white/60 disabled:opacity-30"
                    aria-label={`Move ${name} right`} disabled={index === facts.length - 1} onClick={() => move(id, index + 1)}>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <div className="mb-1 text-xs uppercase tracking-wide" style={{ color: "#5a8ea8" }}>
                  <FactTextEditor label={`Fact ${index + 1} label`} value={fact.label} onChange={(value) => edit(id, "label", value)} />
                </div>
                <div className="text-base font-semibold leading-relaxed" style={{ color: C.text }}>
                  <FactTextEditor label={`Fact ${index + 1} value`} value={fact.value} onChange={(value) => edit(id, "value", value)} />
                </div>
                <button type="button" role="separator" aria-label={`Resize ${name}`} aria-orientation="vertical"
                  aria-valuemin={140} aria-valuemax={800} aria-valuenow={Math.round(resizeWidth?.id === id ? resizeWidth.width : fact.width ?? 192)}
                  className="absolute -right-4 top-0 h-full w-3 touch-none cursor-col-resize rounded border-r-2 border-sky-300 hover:border-sky-600 focus:border-sky-600 focus:outline-none"
                  onPointerDown={(event) => {
                    const width = event.currentTarget.parentElement!.getBoundingClientRect().width;
                    resize.current = { id, x: event.clientX, width };
                    event.currentTarget.setPointerCapture(event.pointerId);
                    event.preventDefault();
                  }}
                  onPointerMove={(event) => {
                    if (resize.current?.id === id) setResizeWidth({ id, width: Math.max(140, Math.min(800, resize.current.width + event.clientX - resize.current.x)) });
                  }}
                  onPointerUp={(event) => {
                    if (!resize.current) return;
                    const width = Math.round(Math.max(140, Math.min(800, resize.current.width + event.clientX - resize.current.x)));
                    resize.current = null;
                    setResizeWidth(null);
                    change(facts.map((column) => column.id === id ? { ...column, fact: { ...column.fact, width } } : column));
                  }}
                  onPointerCancel={() => { resize.current = null; setResizeWidth(null); }}
                  onKeyDown={(event) => {
                    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
                    event.preventDefault();
                    const width = Math.max(140, Math.min(800, (fact.width ?? event.currentTarget.parentElement!.getBoundingClientRect().width) + (event.key === "ArrowRight" ? 20 : -20)));
                    change(facts.map((column) => column.id === id ? { ...column, fact: { ...column.fact, width } } : column));
                  }} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
