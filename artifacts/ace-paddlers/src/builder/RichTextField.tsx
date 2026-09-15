import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import type { EditorView } from "@tiptap/pm/view";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import {
  Bold, Italic, List, ListOrdered, Link as LinkIcon, ImagePlus,
  Heading2, Heading3, AlignLeft, AlignCenter, AlignRight, ZoomIn, ZoomOut, Trash2,
} from "lucide-react";
import { uploadMedia } from "@/admin/upload";

// Cycle of selectable image widths (% of the text column), from smallest to largest.
const IMAGE_WIDTHS = [25, 45, 65, 85, 100] as const;
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
  const resizeImage = (dir: 1 | -1) => {
    const i = IMAGE_WIDTHS.reduce((closest, w, idx) => (Math.abs(w - currentWidth()) < Math.abs(IMAGE_WIDTHS[closest] - currentWidth()) ? idx : closest), 0);
    const next = IMAGE_WIDTHS[Math.min(IMAGE_WIDTHS.length - 1, Math.max(0, i + dir))];
    editor.chain().focus().updateAttributes("image", { width: next }).run();
  };
  const deleteImage = () => editor.chain().focus().deleteSelection().run();
  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (!url) { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().setLink({ href: url } as never).run();
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 2, padding: 6, border: "1px solid #cbd5e1", borderBottom: "none", borderRadius: "8px 8px 0 0", background: "#f8fafc" }}>
      <ToolbarBtn title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={15} /></ToolbarBtn>
      <ToolbarBtn title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={15} /></ToolbarBtn>
      <ToolbarBtn title="Heading" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={15} /></ToolbarBtn>
      <ToolbarBtn title="Subheading" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={15} /></ToolbarBtn>
      <ToolbarBtn title="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={15} /></ToolbarBtn>
      <ToolbarBtn title="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={15} /></ToolbarBtn>
      <ToolbarBtn title="Link" active={editor.isActive("link")} onClick={setLink}><LinkIcon size={15} /></ToolbarBtn>
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
          <ToolbarBtn title="Smaller" onClick={() => resizeImage(-1)}><ZoomOut size={15} /></ToolbarBtn>
          <ToolbarBtn title="Larger" onClick={() => resizeImage(1)}><ZoomIn size={15} /></ToolbarBtn>
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
      AlignableImage.configure({ inline: false }),
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value || "",
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    onTransaction: () => forceRender((n) => n + 1),
    editorProps: {
      attributes: { style: "min-height:180px;padding:12px 14px;font-size:14px;line-height:1.6;outline:none;" },
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

  if (!editor) return null;

  return (
    <div>
      <Toolbar editor={editor} />
      <div style={{ border: "1px solid #cbd5e1", borderRadius: "0 0 8px 8px", background: "white" }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
