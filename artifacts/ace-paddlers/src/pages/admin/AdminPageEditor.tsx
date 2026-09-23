import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { Puck, createUsePuck, useGetPuck, type Data } from "@measured/puck";
import "@measured/puck/puck.css";
// After Puck's own styles: it must win the cascade for --puck-font-family.
import "@/builder/puck-theme.css";
import { builderConfig } from "@/builder/config";
import { EDITABLE_PAGES } from "@/builder/pages";
import { PAGE_TEMPLATES, buildTourTemplate, buildDestinationTemplate } from "@/builder/templates";
import { useAdminMe, useGetAdminPage, useSavePage, useGetTour, useGetDestination } from "@workspace/api-client-react";
import { adaptTour } from "@/lib/content";
import { TripPageProvider } from "@/builder/tripPage";

type Trip = ReturnType<typeof adaptTour>;

/**
 * Trip content that only shows if the page carries the matching section.
 *
 * A trip page built by hand can quietly omit one — which is how a trip's
 * itinerary was saved, correct, and invisible on the website for weeks. The
 * editor now says so instead of leaving it to be discovered.
 */
const TRIP_SECTIONS: { type: string; label: string; describe: (t: Trip) => string | null }[] = [
  { type: "TripAbout", label: "Trip overview", describe: (t) => (t.description?.trim() ? "a description" : null) },
  { type: "TripItinerary", label: "Trip itinerary", describe: (t) => ((t.itinerary?.length ?? 0) > 0 || t.itineraryText?.trim() ? "an itinerary" : null) },
  { type: "TripHighlights", label: "Trip highlights", describe: (t) => (t.highlights?.length ? `${t.highlights.length} highlights` : null) },
  { type: "TripInclusions", label: "What's included", describe: (t) => (t.included?.length || t.excluded?.length ? "inclusions" : null) },
  { type: "TripFaq", label: "Trip FAQs", describe: (t) => (t.faqs?.length ? `${t.faqs.length} FAQs` : null) },
  { type: "TripGrades", label: "Rapid grades", describe: (t) => (t.rapidGrades?.length ? `${t.rapidGrades.length} rapid grades` : null) },
  { type: "TripActivities", label: "Trip activities", describe: (t) => (t.activities?.length ? `${t.activities.length} activities` : null) },
  { type: "TripTerms", label: "Trip terms", describe: (t) => (t.terms?.trim() ? "terms & conditions" : null) },
  { type: "TripLocation", label: "Trip location", describe: (t) => (t.shortAddress || t.detailedAddress || t.directions ? "a location" : null) },
];

/**
 * Subscribe to one slice of Puck's store at a time.
 *
 * The plain `usePuck()` hands back the whole store, so a component using it
 * re-renders on every keystroke anywhere in the editor. With twenty blocks in
 * the drawer — each rendered twice, once for the list and once for the drag
 * preview — that was forty full subscriptions to a store that changes
 * constantly, and Puck says so in the console for each one.
 */
const usePuckState = createUsePuck<typeof builderConfig>();

const EMPTY: Data = { content: [], root: {} } as Data;
// Puck's top-level drop zone id (rootAreaId:rootZone) — used to remove root sections.
const ROOT_ZONE = "root:default-zone";

type SaveState = { status: "idle" | "dirty" | "saving" | "saved"; at?: number };

/**
 * Everything the override components need, passed by context rather than by
 * closure.
 *
 * Two reasons, and both were bugs. Puck keeps `overrides` in its own store, so
 * a value closed over at mount never updates — the save indicator stayed blank
 * through every edit. Worse, an inline `header: () => <Toolbar … />` is a *new
 * component type* on every render, so React threw away the preview and rebuilt
 * the iframe each time, leaving the canvas spinning forever on a page that
 * re-rendered while loading. Module-level components plus a stable overrides
 * object fix both.
 */
interface EditorMeta {
  title: string;
  livePath: string;
  replacesBuiltIn: boolean;
  save: SaveState;
  /** "Standard trip layout" or "Custom layout · saved 17 Jul 2026". */
  layoutLabel: string;
  /** The trip this page belongs to, for the hidden-content warning. */
  trip: Trip | null;
}

const EditorContext = createContext<EditorMeta>({
  title: "",
  livePath: "/",
  replacesBuiltIn: false,
  save: { status: "idle" },
  layoutLabel: "",
  trip: null,
});

/** A block's human label ("Card grid"), not its internal type name ("Cards"). */
function blockLabel(type: string): string {
  return builderConfig.components[type as keyof typeof builderConfig.components]?.label ?? type;
}

const btn =
  // `shrink-0 whitespace-nowrap` throughout: the bar is one row and must stay
  // one row. Without it a narrow window wrapped the title and the status onto
  // a second line that the 48px header then clipped.
  "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors disabled:opacity-35 disabled:cursor-not-allowed";

/**
 * The editor's single toolbar.
 *
 * Puck draws its own header, and we used to stack ours on top of it: two bars,
 * two page titles, 100px of chrome above a canvas that was already short of
 * room. Overriding `header` replaces that bar rather than adding to it, so the
 * pieces worth keeping — the panel toggles, undo/redo — are rebuilt here from
 * the same state, and `actions` carries Puck's own Publish button through.
 */
function EditorToolbar({ actions }: { actions: React.ReactNode }) {
  const { title, livePath, layoutLabel } = useContext(EditorContext);
  const dispatch = usePuckState((s) => s.dispatch);
  const leftSideBarVisible = usePuckState((s) => s.appState.ui.leftSideBarVisible);
  const rightSideBarVisible = usePuckState((s) => s.appState.ui.rightSideBarVisible);
  const itemSelector = usePuckState((s) => s.appState.ui.itemSelector);
  const selectedType = usePuckState((s) => s.selectedItem?.type ?? null);
  const undo = usePuckState((s) => s.history.back);
  const redo = usePuckState((s) => s.history.forward);
  const hasPast = usePuckState((s) => s.history.hasPast);
  const hasFuture = usePuckState((s) => s.history.hasFuture);

  const toggle = (side: "left" | "right") =>
    dispatch({
      type: "setUi",
      ui: side === "left" ? { leftSideBarVisible: !leftSideBarVisible } : { rightSideBarVisible: !rightSideBarVisible },
    });

  const removeSelected = () => {
    if (!itemSelector) return;
    dispatch({ type: "remove", index: itemSelector.index, zone: itemSelector.zone ?? ROOT_ZONE });
    dispatch({ type: "setUi", ui: { itemSelector: null } });
  };

  // The selected block's own label, not its internal type name — "Card grid"
  // is what the person clicked on, "Cards" is an implementation detail.
  const selectedLabel = selectedType ? blockLabel(selectedType) : null;

  return (
    <header
      /* Puck lays its shell out on a named grid ("header" spanning every
         column, then left/editor/right). Replacing the default header means
         claiming that area by hand — without it the bar is confined to the
         first column, 320px wide. */
      style={{ gridArea: "header" }}
      className="h-12 min-w-0 shrink-0 bg-slate-900 text-slate-200 flex items-center gap-2 px-3">
      <Link
        href="/admin/pages"
        className={`${btn} text-cyan-300 no-underline hover:bg-white/10 hover:text-cyan-200`}>
        ← Pages
      </Link>

      <span className="w-px h-5 shrink-0 bg-white/15" />

      {/* The one part allowed to shrink — everything else is a control. */}
      <div className="flex min-w-0 items-baseline gap-2 overflow-hidden">
        <span className="truncate text-sm font-semibold text-white">{title}</span>
        <code className="hidden truncate text-[11px] text-slate-400 lg:inline">{livePath}</code>
        {layoutLabel && (
          <span
            title="Which layout this page uses"
            className="hidden shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-slate-300 xl:inline">
            {layoutLabel}
          </span>
        )}
      </div>

      <span className="w-px h-5 shrink-0 bg-white/15 ml-2" />

      <button
        type="button"
        onClick={() => toggle("left")}
        title="Show or hide the block list"
        className={`${btn} ${leftSideBarVisible ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/10"}`}>
        Blocks
      </button>
      <button
        type="button"
        onClick={() => toggle("right")}
        title="Show or hide the settings panel"
        className={`${btn} ${rightSideBarVisible ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/10"}`}>
        Settings
      </button>

      <span className="w-px h-5 shrink-0 bg-white/15" />

      <button type="button" onClick={undo} disabled={!hasPast} title="Undo" className={`${btn} text-base leading-none text-slate-200 hover:bg-white/10`}>↺</button>
      <button type="button" onClick={redo} disabled={!hasFuture} title="Redo" className={`${btn} text-base leading-none text-slate-200 hover:bg-white/10`}>↻</button>

      {/* Only once something is selected. A permanently-greyed "Delete section"
          button explains nothing; naming what will be deleted does. */}
      {selectedLabel && (
        <>
          <span className="w-px h-5 shrink-0 bg-white/15" />
          <span className="shrink-0 whitespace-nowrap text-[11px] uppercase tracking-wide text-slate-400">Selected</span>
          <span className="shrink-0 whitespace-nowrap text-[13px] font-medium text-white">{selectedLabel}</span>
          <button
            type="button"
            onClick={removeSelected}
            className={`${btn} text-red-300 hover:bg-red-500/20 hover:text-red-200`}>
            Remove
          </button>
        </>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <SaveStatus />
        <a href={livePath} target="_blank" rel="noreferrer" className={`${btn} text-slate-300 no-underline hover:bg-white/10 hover:text-white`}>
          View live ↗
        </a>
        {actions}
      </div>
    </header>
  );
}

function SaveStatus() {
  const { save } = useContext(EditorContext);
  if (save.status === "saving") return <span className="whitespace-nowrap text-xs text-slate-400">Publishing…</span>;
  if (save.status === "dirty") return <span className="whitespace-nowrap text-xs text-amber-300">Unsaved changes</span>;
  if (save.status === "saved")
    return (
      <span className="whitespace-nowrap text-xs text-emerald-400">
        Published {save.at ? new Date(save.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
      </span>
    );
  return null;
}

/**
 * A block in the left-hand list, clickable as well as draggable.
 *
 * Puck's drawer inserts by drag only. Dragging a block precisely into a long
 * page is fiddly with a trackpad and impossible to discover — people clicked
 * the blocks, nothing happened, and concluded the builder was broken. Clicking
 * now drops the block in after whatever is selected (or at the end), which is
 * where you wanted it nine times out of ten; dragging still works untouched
 * for the tenth.
 */
function DrawerItem({ children, name }: { children: React.ReactNode; name: string }) {
  // Reads the store only when clicked, so a drawer item never re-renders in
  // response to editing going on elsewhere.
  const getPuck = useGetPuck();
  const origin = useRef<{ x: number; y: number } | null>(null);

  const add = () => {
    const { appState, dispatch } = getPuck();
    const sel = appState.ui.itemSelector;
    const atRoot = sel && (!sel.zone || sel.zone === ROOT_ZONE);
    const index = atRoot ? sel.index + 1 : appState.data.content.length;

    dispatch({ type: "insert", componentType: name, destinationIndex: index, destinationZone: ROOT_ZONE });
    // Select what was just added, so its settings are already open to fill in.
    dispatch({ type: "setUi", ui: { itemSelector: { index, zone: ROOT_ZONE } } });
  };

  return (
    <div
      // A drag ends in a click too. Only treat it as a click if the pointer
      // barely moved, otherwise every drag would also insert a second copy.
      onPointerDown={(e) => { origin.current = { x: e.clientX, y: e.clientY }; }}
      onClick={(e) => {
        const o = origin.current;
        origin.current = null;
        if (!o) return;
        if (Math.hypot(e.clientX - o.x, e.clientY - o.y) > 5) return;
        add();
      }}
      title={`Add ${blockLabel(name)} — click to drop it in, or drag it where you want it`}
      className="cursor-pointer">
      {children}
    </div>
  );
}

/** What the canvas shows before anything has been added to it. */
function EmptyCanvasHint({ replacesBuiltIn }: { replacesBuiltIn: boolean }) {
  return (
    <div className="absolute inset-0 grid place-items-center pointer-events-none p-8">
      <div className="max-w-md rounded-xl border-2 border-dashed border-slate-300 bg-white/90 px-6 py-5 text-center shadow-sm">
        <p className="text-sm font-semibold text-slate-700">This page has no blocks yet</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">
          Pick a block from the left — <strong className="text-slate-700">click to add it</strong>, or drag it
          into place. Select a block to edit its wording and images on the right.
        </p>
        {replacesBuiltIn && (
          /* Publishing here swaps the page over to the builder permanently, and
             nothing else on the screen says so. Someone adding one block to
             "try it out" would take the real page down with it. */
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-800">
            This page currently uses its built-in design. Whatever you publish here replaces it — until
            then, the live page is unchanged.
          </p>
        )}
      </div>
    </div>
  );
}

function Canvas() {
  const { replacesBuiltIn, trip } = useContext(EditorContext);
  const isEmpty = usePuckState((s) => s.appState.data.content.length === 0);
  // A string, not an array: a selector returning a fresh array re-renders the
  // canvas on every store tick.
  const types = usePuckState((s) => s.appState.data.content.map((b) => b.type).join(","));

  const missing = trip
    ? TRIP_SECTIONS.filter((sec) => !types.split(",").includes(sec.type) && sec.describe(trip))
    : [];

  return (
    <div className="relative h-full flex flex-col">
      {missing.length > 0 && (
        <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-[13px] leading-relaxed text-amber-900">
          <strong className="font-semibold">Not shown on this page:</strong>{" "}
          {missing.map((m, i) => (
            <span key={m.type}>
              {i > 0 && (i === missing.length - 1 ? " and " : ", ")}
              {m.describe(trip as Trip)} (<em>{m.label}</em>)
            </span>
          ))}
          . Add {missing.length === 1 ? "that section" : "those sections"} from <strong>Live content</strong> on the
          left, or leave them off deliberately.
        </div>
      )}
      <div className="relative flex-1 min-h-0">
        <Puck.Preview />
        {isEmpty && <EmptyCanvasHint replacesBuiltIn={replacesBuiltIn} />}
      </div>
    </div>
  );
}

/**
 * Preview widths, ending with the width of the screen the editor is open on.
 *
 * Puck's own set stops at 1280, so on a wider laptop every page was composed at
 * 1280 and then looked different on the real site — grids wrapped elsewhere,
 * text broke in other places. The last entry is the one Puck opens with, so the
 * canvas matches the screen you are sitting at; the fixed widths stay for
 * checking phone and tablet.
 */
const SCREEN_W = Math.round(typeof window === "undefined" ? 1280 : window.innerWidth);
const VIEWPORTS = [
  { width: 390, label: "Phone" },
  { width: 768, label: "Tablet" },
  { width: 1280, label: "Laptop" },
  ...(SCREEN_W > 1340 ? [{ width: SCREEN_W, label: `This screen (${SCREEN_W}px)` }] : []),
];

/**
 * Defined once, at module level. Rebuilding this object per render is what
 * remounted the preview; it must keep the same identity for the life of the
 * editor.
 */
const OVERRIDES = {
  header: EditorToolbar,
  drawerItem: DrawerItem,
  preview: Canvas,
} as const;

function Editor({ slug }: { slug: string }) {
  const page = useGetAdminPage(slug, { query: { retry: false } } as never);
  const saveMutation = useSavePage();
  const [save, setSave] = useState<SaveState>({ status: "idle" });

  // Tour/destination detail pages use namespaced slugs (`tour:<slug>`,
  // `destination:<slug>`); their starter template is built from the live entity.
  const tourSlug = slug.startsWith("tour:") ? slug.slice("tour:".length) : "";
  const destSlug = slug.startsWith("destination:") ? slug.slice("destination:".length) : "";
  const tourQ = useGetTour(tourSlug, { query: { enabled: !!tourSlug, retry: false } } as never);
  const destQ = useGetDestination(destSlug, { query: { enabled: !!destSlug, retry: false } } as never);

  /**
   * Publishing is the only save, so leaving with edits in flight loses them.
   * The browser prompt is the only thing that can interrupt a tab close.
   */
  useEffect(() => {
    if (save.status !== "dirty") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [save.status]);

  // Wait until the fetches settle so Puck initialises with the saved document
  // (or a template seeded from the entity's real data).
  if (page.isLoading || (tourSlug && tourQ.isLoading) || (destSlug && destQ.isLoading)) {
    return <div className="h-full flex items-center justify-center bg-slate-100"><div className="w-10 h-10 rounded-full border-2 border-cyan-300/40 border-t-cyan-500 animate-spin" /></div>;
  }

  // Saved layout wins; otherwise seed with the page's starter template (a
  // block-built recreation of its hand-coded design) so editing starts from
  // the current page rather than a blank canvas.
  const savedData = page.data?.data as Data | undefined;
  const template = tourSlug
    ? (tourQ.data ? buildTourTemplate(adaptTour(tourQ.data)) : EMPTY)
    : destSlug
      ? (destQ.data ? buildDestinationTemplate(destQ.data) : EMPTY)
      : (PAGE_TEMPLATES[slug] ?? EMPTY);
  const hasSavedLayout = Boolean(savedData?.content && savedData.content.length > 0);
  const initial: Data = hasSavedLayout ? savedData! : template;
  const meta = EDITABLE_PAGES.find((p) => p.slug === slug);
  const title = page.data?.title ?? tourQ.data?.title ?? destQ.data?.name ?? meta?.title ?? slug;
  // Built-in pages live at their fixed route; tour/destination pages at their
  // detail route; admin-created pages serve at /p/<slug>.
  const livePath = tourSlug ? `/tours/${tourSlug}` : destSlug ? `/destinations/${destSlug}` : (meta?.path ?? `/p/${slug}`);

  const trip = tourQ.data ? adaptTour(tourQ.data) : null;
  const savedAt = page.data?.updatedAt ? new Date(page.data.updatedAt) : null;
  const layoutLabel = tourSlug
    ? savedAt
      ? `Custom layout · saved ${savedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
      : "Standard trip layout"
    : savedAt
      ? "Custom layout"
      : "Built-in design";

  const onPublish = (data: Data) => {
    setSave({ status: "saving" });
    saveMutation.mutate(
      { slug, data: { data: data as unknown as Record<string, unknown>, title, status: "published" } },
      {
        onSuccess: () => setSave({ status: "saved", at: Date.now() }),
        onError: () => setSave({ status: "dirty" }),
      },
    );
  };

  return (
    <EditorContext.Provider
      /* A fresh object each render is fine: context re-renders its consumers,
         it does not remount them. It must NOT be a useMemo down here — every
         hook in this component sits above the loading early-return, and adding
         one below it changes the hook count between renders. */
      value={{ title, livePath, replacesBuiltIn: !hasSavedLayout, save, layoutLabel, trip }}>
      {/* On a trip's page, live sections read that trip without being told. */}
      <TripPageProvider slug={tourSlug}>
      <div className="h-full flex flex-col">
        <Puck
        config={builderConfig}
        data={initial}
        onPublish={onPublish}
        /* Puck does not fire this on mount, only on a real edit — so every
           call here is something the person did, and no "is this the initial
           settle?" guard is needed. An earlier one swallowed the first edit
           on every page load, which is the one most worth warning about. */
        onChange={() => setSave((st) => (st.status === "dirty" ? st : { status: "dirty" }))}
        overrides={OVERRIDES}
        viewports={VIEWPORTS}
        />
      </div>
      </TripPageProvider>
    </EditorContext.Provider>
  );
}

export default function AdminPageEditor() {
  const { slug } = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const { data: me, isFetching } = useAdminMe({ query: { retry: false } as never });

  useEffect(() => {
    if (!isFetching && !me) navigate("/admin/login");
  }, [isFetching, me, navigate]);

  if (!me) {
    return <div className="h-full flex items-center justify-center bg-slate-100"><div className="w-10 h-10 rounded-full border-2 border-cyan-300/40 border-t-cyan-500 animate-spin" /></div>;
  }
  return <Editor key={slug} slug={slug} />;
}
