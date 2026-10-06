import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle, FontFamily, FontSize, Color, LineHeight } from "@tiptap/extension-text-style";
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Link as LinkIcon, List, ListOrdered } from "lucide-react";
import { richTextHtml } from "@/lib/richText";
import { FontPicker, LineSpacingPicker } from "@/builder/RichTextField";

const ALIGNS = [
  { value: "left", label: "Align left", Icon: AlignLeft },
  { value: "center", label: "Align centre", Icon: AlignCenter },
  { value: "right", label: "Align right", Icon: AlignRight },
  { value: "justify", label: "Justify", Icon: AlignJustify },
] as const;

/**
 * Inline rich text for short fields (a fact, a FAQ question): the toolbar
 * floats over the selected words, so a grid of small boxes stays readable.
 * It offers what the full editor does for text — font, size, colour, spacing,
 * alignment, lists and links — without pictures.
 */
export default function FactTextEditor({ value, onChange, label, className }: {
  value?: string; onChange: (value: string) => void; label: string; className?: string;
}) {
  const [, refresh] = useState(0);
  const editor = useEditor({
    extensions: [
      // StarterKit 3 already carries Link and Underline.
      StarterKit.configure({ link: { openOnClick: false } }),
      TextStyle, FontFamily, FontSize, Color, LineHeight,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: richTextHtml(value),
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
    onTransaction: () => refresh((n) => n + 1),
    editorProps: { attributes: {
      class: className ?? "ace-richtext min-h-8 rounded px-1 py-1 outline-none hover:bg-white/30 focus:bg-white/60",
      role: "textbox", "aria-label": label, "aria-multiline": "true",
    } },
  });
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      const html = richTextHtml(value);
      if (html !== editor.getHTML()) editor.commands.setContent(html, { emitUpdate: false });
    }
  }, [editor, value]);
  if (!editor) return null;

  const btn = "rounded px-2 py-1 aria-pressed:bg-sky-100";
  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (!url) editor.chain().focus().unsetLink().run();
    else editor.chain().focus().setLink({ href: url }).run();
  };

  return <>
    <EditorContent editor={editor} />
    <BubbleMenu editor={editor} options={{ placement: "top", offset: 8 }}>
      <div role="toolbar" aria-label="Text formatting" className="flex max-w-[calc(100vw-24px)] flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-white p-2 text-xs font-normal normal-case tracking-normal text-slate-700 shadow-xl"
        onMouseDown={(event) => { if (!(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLSelectElement)) event.preventDefault(); }}>
        <FontPicker editor={editor} />
        <select aria-label="Font size" className="h-8 rounded border border-slate-300 bg-white" value={editor.getAttributes("textStyle").fontSize || ""}
          onChange={(event) => event.target.value ? editor.chain().focus().setFontSize(event.target.value).run() : editor.chain().focus().unsetFontSize().run()}>
          <option value="">Size</option>
          {[10,12,14,16,18,20,24,28,32,40,48,64].map((size) => <option key={size} value={`${size}px`}>{size}</option>)}
        </select>
        <LineSpacingPicker editor={editor} className="h-8 rounded border border-slate-300 bg-white" />
        <input type="color" aria-label="Text color" title="Text color" className="h-8 w-8 cursor-pointer" value={editor.getAttributes("textStyle").color || "#0d2d40"}
          onChange={(event) => editor.chain().focus().setColor(event.target.value).run()} />
        <button type="button" aria-label="Bold" aria-pressed={editor.isActive("bold")} className={`${btn} font-bold`} onClick={() => editor.chain().focus().toggleBold().run()}>B</button>
        <button type="button" aria-label="Italic" aria-pressed={editor.isActive("italic")} className={`${btn} italic`} onClick={() => editor.chain().focus().toggleItalic().run()}>I</button>
        <button type="button" aria-label="Underline" aria-pressed={editor.isActive("underline")} className={`${btn} underline`} onClick={() => editor.chain().focus().toggleUnderline().run()}>U</button>
        <button type="button" aria-label="Strikethrough" aria-pressed={editor.isActive("strike")} className={`${btn} line-through`} onClick={() => editor.chain().focus().toggleStrike().run()}>S</button>
        <span className="mx-0.5 h-5 w-px bg-slate-200" />
        {ALIGNS.map(({ value, label, Icon }) => (
          <button key={value} type="button" aria-label={label} title={label} aria-pressed={editor.isActive({ textAlign: value })} className={btn}
            onClick={() => editor.chain().focus().setTextAlign(value).run()}><Icon size={14} /></button>
        ))}
        <span className="mx-0.5 h-5 w-px bg-slate-200" />
        <button type="button" aria-label="Bullet list" title="Bullet list" aria-pressed={editor.isActive("bulletList")} className={btn} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={14} /></button>
        <button type="button" aria-label="Numbered list" title="Numbered list" aria-pressed={editor.isActive("orderedList")} className={btn} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={14} /></button>
        <button type="button" aria-label="Link" title="Link" aria-pressed={editor.isActive("link")} className={btn} onClick={setLink}><LinkIcon size={14} /></button>
        <button type="button" className="rounded px-2 py-1" onClick={() => editor.chain().focus().unsetAllMarks().unsetTextAlign().run()}>Clear</button>
      </div>
    </BubbleMenu>
  </>;
}
