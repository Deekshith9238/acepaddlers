import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import type { EditorView } from "@tiptap/pm/view";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle, FontFamily, FontSize, Color } from "@tiptap/extension-text-style";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered, Link as LinkIcon, ImagePlus,
  Heading2, Heading3, AlignLeft, AlignCenter, AlignRight, AlignJustify, ZoomIn, ZoomOut, Trash2,
} from "lucide-react";
import { uploadMedia } from "@/admin/upload";
import { FONT_OPTIONS, fontStack, loadFontFamilies, loadFontsUsedIn } from "@/lib/typography";
import { richTextHtml } from "@/lib/richText";

const DEFAULT_WIDTH: Record<"left" | "center" | "right", number> = { left: 45, center: 100, right: 45 };

/** Editable image node: floats left/right or sits centered as a block, so
 *  inserted images can be arranged around text like in a word processor.
 *  `width` (% of the column) is independently resizable via the toolbar. */
const AlignableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: "center",
        parseHTML: (el) => el.getAttribute("data-align") || "center",
        renderHTML: (attrs) => ({ "data-align": attrs.align }),
      },
      width: {
        default: null,
        parseHTML: (el) => {
          const w = el.getAttribute("data-width");
          return w ? Number(w) : null;
        },
        renderHTML: (attrs) => (attrs.width ? { "data-width": attrs.width } : {}),
      },
    };
  },
  renderHTML({ HTMLAttributes }) {
    const align = (HTMLAttributes["data-align"] ?? "center") as "left" | "center" | "right";
    const width = Number(HTMLAttributes["data-width"]) || DEFAULT_WIDTH[align];
    const wrap =
      align === "left" ? `float:left;margin:0 20px 12px 0;`
      : align === "right" ? `float:right;margin:0 0 12px 20px;`
      : `display:block;margin:16px auto;`;
    return ["img", { ...HTMLAttributes, style: `${wrap}width:${width}%;max-width:100%;border-radius:12px;` }];
  },
});

// Font choices: the site's own two theme fonts, a few system faces, then the
// curated Google Fonts (loaded on demand, here and on the live page).
const FONTS: { label: string; value: string }[] = [
  { label: "Default font", value: "" },
  { label: "Headings font", value: "var(--app-font-serif)" },
  { label: "Body font", value: "var(--app-font-sans)" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Monospace", value: "ui-monospace, monospace" },
  ...FONT_OPTIONS.map((f) => ({ label: f.family, value: fontStack(f.family) })),
];

/** Font dropdown that shows every font in its own face (a native <select>
 *  can't style its options on macOS, so this is a small custom list). */
function FontPicker({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = (editor.getAttributes("textStyle").fontFamily as string) ?? "";
  const label = FONTS.find((f) => f.value === current)?.label ?? (current ? current.split(",")[0].replace(/['"]/g, "") : "Default font");
  useEffect(() => {
    if (!open) return;
    loadFontFamilies(FONT_OPTIONS.map((f) => f.family));
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const pick = (value: string) => {
    if (value) editor.chain().focus().setFontFamily(value).run();
    else editor.chain().focus().unsetFontFamily().run();
    setOpen(false);
  };
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" title="Font" onMouseDown={(e) => e.preventDefault()} onClick={() => setOpen((o) => !o)}
        style={{ ...selectStyle, width: 150, textAlign: "left", fontFamily: current || undefined, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", cursor: "pointer" }}>
        {label} ▾
      </button>
      {open && (
        <div style={{ position: "absolute", zIndex: 50, top: 32, left: 0, width: 220, maxHeight: 320, overflowY: "auto", background: "white", border: "1px solid #cbd5e1", borderRadius: 8, boxShadow: "0 8px 24px rgba(15,23,42,0.15)", padding: 4 }}>
          {FONTS.map((f) => (
            <button key={f.label} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(f.value)}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 10px", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 16, fontFamily: f.value || undefined, background: f.value === current ? "#e0f2fe" : "transparent", color: "#0f172a" }}>
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
const SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px", "40px"];

const selectStyle: React.CSSProperties = {
  height: 30, border: "1px solid #cbd5e1", borderRadius: 6, background: "white",
  fontSize: 12, color: "#334155", padding: "0 4px",
};
const Divider = () => <div style={{ width: 1, background: "#cbd5e1", margin: "4px 4px" }} />;

const ToolbarBtn = ({ active, onClick, title, children }: { active?: boolean; onClick: () => void; title: string; children: React.ReactNode }) => (
  <button type="button" title={title} onClick={onClick}
    style={{
      padding: "6px 8px", borderRadius: 6, border: "1px solid transparent",
      background: active ? "#e0f2fe" : "transparent",
      color: active ? "#0369a1" : "#475569",
      display: "flex", alignItems: "center", cursor: "pointer",
    }}>
    {children}
  </button>
);

async function insertImageFile(editor: Editor, file: File) {
  const m = await uploadMedia(file);
  if (m.url) editor.chain().focus().setImage({ src: m.url } as never).run();
}

/** Used by drop/paste handlers, which receive the raw ProseMirror view
 *  rather than the Editor wrapper — insert the image node directly. */
async function insertImageFileAtView(view: EditorView, file: File, pos?: number) {
  const m = await uploadMedia(file);
  if (!m.url) return;
  const node = view.state.schema.nodes.image.create({ src: m.url, align: "center" });
  const insertPos = pos ?? view.state.selection.from;
  view.dispatch(view.state.tr.insert(insertPos, node));
}

function Toolbar({ editor }: { editor: Editor }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const imageSelected = editor.isActive("image");

  const pickImage = () => fileRef.current?.click();
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setBusy(true);
    try { await insertImageFile(editor, f); } finally { setBusy(false); }
  };
  const setImageAlign = (align: "left" | "center" | "right") =>
    editor.chain().focus().updateAttributes("image", { align }).run();
  const currentWidth = (): number => {
    const attrs = editor.getAttributes("image");
    return attrs.width ?? DEFAULT_WIDTH[(attrs.align ?? "center") as "left" | "center" | "right"];
  };
  const setImageWidth = (width: number) =>
    editor.chain().updateAttributes("image", { width: Math.min(100, Math.max(10, Math.round(width))) }).run();
  const deleteImage = () => editor.chain().focus().deleteSelection().run();
  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (!url) { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().setLink({ href: url } as never).run();
  };

  return (
    <div style={{ position: "sticky", top: 0, zIndex: 20, display: "flex", flexWrap: "wrap", gap: 2, padding: 6, border: "1px solid #cbd5e1", borderBottom: "none", borderRadius: "8px 8px 0 0", background: "#f8fafc" }}>
      <FontPicker editor={editor} />
      <select
        title="Font size"
        style={selectStyle}
        value={(editor.getAttributes("textStyle").fontSize as string) ?? ""}
        onChange={(e) => (e.target.value ? editor.chain().focus().setFontSize(e.target.value).run() : editor.chain().focus().unsetFontSize().run())}>
        <option value="">Size</option>
        {SIZES.map((sz) => <option key={sz} value={sz}>{parseInt(sz, 10)}</option>)}
      </select>
      <label title="Text colour" style={{ display: "flex", alignItems: "center", gap: 2, padding: "0 4px", cursor: "pointer" }}>
        <input
          type="color"
          value={(editor.getAttributes("textStyle").color as string) || "#0d2d40"}
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          style={{ width: 24, height: 24, border: "none", background: "none", padding: 0, cursor: "pointer" }}
        />
        <button type="button" title="Reset colour" onClick={() => editor.chain().focus().unsetColor().run()}
          style={{ fontSize: 11, color: "#64748b", border: "none", background: "none", cursor: "pointer" }}>✕</button>
      </label>
      <Divider />
      <ToolbarBtn title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={15} /></ToolbarBtn>
      <ToolbarBtn title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={15} /></ToolbarBtn>
      <ToolbarBtn title="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon size={15} /></ToolbarBtn>
      <ToolbarBtn title="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={15} /></ToolbarBtn>
      <ToolbarBtn title="Heading" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={15} /></ToolbarBtn>
      <ToolbarBtn title="Subheading" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={15} /></ToolbarBtn>
      <ToolbarBtn title="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={15} /></ToolbarBtn>
      <ToolbarBtn title="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={15} /></ToolbarBtn>
      <ToolbarBtn title="Link" active={editor.isActive("link")} onClick={setLink}><LinkIcon size={15} /></ToolbarBtn>
      {!imageSelected && (
        <>
          <Divider />
          <ToolbarBtn title="Align left" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}><AlignLeft size={15} /></ToolbarBtn>
          <ToolbarBtn title="Align centre" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}><AlignCenter size={15} /></ToolbarBtn>
          <ToolbarBtn title="Align right" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}><AlignRight size={15} /></ToolbarBtn>
          <ToolbarBtn title="Justify" active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()}><AlignJustify size={15} /></ToolbarBtn>
        </>
      )}
      <div style={{ width: 1, background: "#cbd5e1", margin: "4px 4px" }} />
      <ToolbarBtn title="Insert image" onClick={pickImage}><ImagePlus size={15} />{busy ? "…" : ""}</ToolbarBtn>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onFile} />
      {imageSelected && (
        <>
          <div style={{ width: 1, background: "#cbd5e1", margin: "4px 4px" }} />
          <ToolbarBtn title="Float left (wrap text)" active={editor.getAttributes("image").align === "left"} onClick={() => setImageAlign("left")}><AlignLeft size={15} /></ToolbarBtn>
          <ToolbarBtn title="Center" active={editor.getAttributes("image").align === "center"} onClick={() => setImageAlign("center")}><AlignCenter size={15} /></ToolbarBtn>
          <ToolbarBtn title="Float right (wrap text)" active={editor.getAttributes("image").align === "right"} onClick={() => setImageAlign("right")}><AlignRight size={15} /></ToolbarBtn>
          <div style={{ width: 1, background: "#cbd5e1", margin: "4px 4px" }} />
          <ToolbarBtn title="Smaller" onClick={() => setImageWidth(currentWidth() - 10)}><ZoomOut size={15} /></ToolbarBtn>
          <label title="Image width" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#475569", padding: "0 4px" }}>
            <input type="range" min={10} max={100} step={1} value={currentWidth()} onChange={(e) => setImageWidth(Number(e.target.value))} style={{ width: 110 }} />
            <span style={{ width: 34 }}>{currentWidth()}%</span>
          </label>
          <ToolbarBtn title="Larger" onClick={() => setImageWidth(currentWidth() + 10)}><ZoomIn size={15} /></ToolbarBtn>
          <ToolbarBtn title="Delete image" onClick={deleteImage}><Trash2 size={15} color="#dc2626" /></ToolbarBtn>
        </>
      )}
    </div>
  );
}

/** Word-like rich text field for the page builder: formatting toolbar, inline
 *  images insertable via the toolbar, drag-and-drop from the desktop, or
 *  paste — with left/center/right arrangement once an image is selected.
 *  Stores HTML in `value`; RichText's render() sanitizes it before display. */
export default function RichTextField({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  // Selecting an image (no document change, only a cursor/selection move)
  // doesn't fire onUpdate, so without this the toolbar's "image selected"
  // buttons (align/resize/delete) never appear even though the underlying
  // TipTap selection is real. onTransaction covers both content AND
  // selection-only changes, forcing the toolbar to re-read editor state.
  const [, forceRender] = useState(0);
  const editor = useEditor({
    extensions: [
      StarterKit,
      // Font, size and colour are stored as inline styles on a <span>; the
      // RichText block's sanitizer already keeps `style`, so they reach the page.
      TextStyle,
      FontFamily,
      FontSize,
      Color,
      AlignableImage.configure({ inline: false }),
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value || "",
    onCreate: () => loadFontsUsedIn(value ?? ""),
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    onTransaction: () => forceRender((n) => n + 1),
    editorProps: {
      attributes: { class: "ace-richtext", style: "min-height:180px;padding:12px 14px;font-size:14px;line-height:1.6;outline:none;" },
      handleDrop: (view, event) => {
        const file = event.dataTransfer?.files?.[0];
        if (!file || !file.type.startsWith("image/")) return false;
        event.preventDefault();
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        insertImageFileAtView(view, file, pos).catch(() => {});
        return true;
      },
      handlePaste: (view, event) => {
        const file = [...(event.clipboardData?.items ?? [])].find((i) => i.type.startsWith("image/"))?.getAsFile();
        if (!file) return false;
        event.preventDefault();
        insertImageFileAtView(view, file).catch(() => {});
        return true;
      },
    },
  });

  // Keep the editor's document in sync if the stored value changes externally
  // (e.g. switching between array items), without fighting the user's typing.
  const lastExternal = useRef(value);
  useEffect(() => {
    if (editor && value !== lastExternal.current && value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false } as never);
    }
    lastExternal.current = value;
  }, [value, editor]);

  const [preview, setPreview] = useState(false);
  if (!editor) return null;

  const tab = (on: boolean): React.CSSProperties => ({
    padding: "4px 12px", fontSize: 12, fontWeight: 600, border: "1px solid #cbd5e1", borderBottom: "none",
    borderRadius: "6px 6px 0 0", cursor: "pointer", background: on ? "#f8fafc" : "white", color: on ? "#0f172a" : "#64748b",
  });
  return (
    <div>
      <div style={{ display: "flex", gap: 4 }}>
        <button type="button" style={tab(!preview)} onClick={() => setPreview(false)}>Edit</button>
        <button type="button" style={tab(preview)} onClick={() => setPreview(true)}>Preview</button>
      </div>
      {preview ? (
        <div style={{ border: "1px solid #cbd5e1", borderRadius: "0 8px 8px 8px", background: "white", padding: "16px 18px", minHeight: 180, overflow: "auto" }}>
          <div className="ace-richtext leading-relaxed text-base" style={{ color: "#2e5a74", fontFamily: "var(--app-font-sans)" }}
            dangerouslySetInnerHTML={{ __html: richTextHtml(editor.getHTML()) }} />
        </div>
      ) : (
        <>
          <Toolbar editor={editor} />
          <div style={{ border: "1px solid #cbd5e1", borderRadius: "0 0 8px 8px", background: "white" }}>
            <EditorContent editor={editor} />
          </div>
        </>
      )}
    </div>
  );
}
