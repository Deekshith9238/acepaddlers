import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle, FontFamily, FontSize, Color } from "@tiptap/extension-text-style";
import { richTextHtml } from "@/lib/richText";
import { FontPicker } from "@/builder/RichTextField";

/** Inline rich text with formatting confined to the selected words. */
export default function FactTextEditor({ value, onChange, label }: {
  value?: string; onChange: (value: string) => void; label: string;
}) {
  const [, refresh] = useState(0);
  const editor = useEditor({
    extensions: [StarterKit, TextStyle, FontFamily, FontSize, Color],
    content: richTextHtml(value),
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
    onTransaction: () => refresh((n) => n + 1),
    editorProps: { attributes: {
      class: "ace-richtext min-h-8 rounded px-1 py-1 outline-none hover:bg-white/30 focus:bg-white/60",
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
        <input type="color" aria-label="Text color" title="Text color" className="h-8 w-8 cursor-pointer" value={editor.getAttributes("textStyle").color || "#0d2d40"}
          onChange={(event) => editor.chain().focus().setColor(event.target.value).run()} />
        <button type="button" aria-label="Bold" aria-pressed={editor.isActive("bold")} className="rounded px-2 py-1 font-bold aria-pressed:bg-sky-100" onClick={() => editor.chain().focus().toggleBold().run()}>B</button>
        <button type="button" aria-label="Italic" aria-pressed={editor.isActive("italic")} className="rounded px-2 py-1 italic aria-pressed:bg-sky-100" onClick={() => editor.chain().focus().toggleItalic().run()}>I</button>
        <button type="button" aria-label="Underline" aria-pressed={editor.isActive("underline")} className="rounded px-2 py-1 underline aria-pressed:bg-sky-100" onClick={() => editor.chain().focus().toggleUnderline().run()}>U</button>
        <button type="button" className="rounded px-2 py-1" onClick={() => editor.chain().focus().unsetAllMarks().run()}>Clear</button>
      </div>
    </BubbleMenu>
  </>;
}
